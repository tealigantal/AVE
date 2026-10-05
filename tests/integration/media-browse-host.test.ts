import assert from "node:assert/strict";
import { execFile as exec } from "node:child_process";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const run = promisify(exec), root = await mkdtemp(resolve(tmpdir(), "ave-browse-")), host = new ProjectHostSession();
const controller = new AbortController(), control = { signal: controller.signal, assertCurrent() { if (controller.signal.aborted) throw controller.signal.reason; } };
const bytes = async (body: any) => { const chunks: Buffer[] = []; if (body) for await (const chunk of body) chunks.push(Buffer.from(chunk)); return Buffer.concat(chunks); };
try {
  const video = resolve(root, "full.mp4"), audio = resolve(root, "full.wav"), image = resolve(root, "full.png"), silent = resolve(root, "silent.mp4"), gap = resolve(root, "gap.m4a");
  await run(process.env.AVE_FFMPEG ?? "ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=size=64x48:rate=12", "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000", "-t", "18", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", video]);
  await run(process.env.AVE_FFMPEG ?? "ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=sample_rate=48000", "-t", "18", audio]);
  await run(process.env.AVE_FFMPEG ?? "ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=red:size=32x24", "-frames:v", "1", image]);
  await run(process.env.AVE_FFMPEG ?? "ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=size=64x48:rate=12", "-t", "18", "-an", "-c:v", "libx264", silent]);
  await run(process.env.AVE_FFMPEG ?? "ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=sample_rate=48000:duration=2", "-af", "aselect=not(between(t\\,0.5\\,0.9))", "-c:a", "aac", gap]);
  await host.create(resolve(root, "project")); await host.importMedia([video, audio, image, silent, gap]);
  const sources = (host.listMedia() as any[]).filter(row => row.location_type === "original");
  for (const source of sources) {
    const operation_id = randomUUID(), receipt = await host.prepareMediaBrowse(1, { asset_id: source.asset_id, operation_id }, control);
    assert(!JSON.stringify(receipt).includes(root)); assert.equal(receipt.time_mapping, "blocked");
    const waveform = await host.mediaBrowseWaveform(1, { reference: receipt.reference }, control);
    assert.equal(waveform.error, null); if (receipt.audio_status === "present") assert(waveform.bytes && waveform.bytes.length > 0); else assert.equal(waveform.bytes, null);
    const head = await host.mediaBrowseResponse(1, receipt.reference, "HEAD", undefined, control); assert.equal(head.status, 200); assert.equal(head.body, null); assert.equal(Number(head.headers["Content-Length"]), receipt.byte_length);
    const response = await host.mediaBrowseResponse(1, receipt.reference, "GET", undefined, control), encoded = await bytes(response.body);
    assert.equal(createHash("sha256").update(encoded).digest("hex"), receipt.content_digest);
    const suffix = await host.mediaBrowseResponse(1, receipt.reference, "GET", "bytes=-17", control); assert.equal(suffix.status, 206); assert.deepEqual(await bytes(suffix.body), encoded.subarray(-17));
    const range = await host.mediaBrowseResponse(1, receipt.reference, "GET", "bytes=0-9", control); assert.deepEqual(await bytes(range.body), encoded.subarray(0, 10));
    for (const invalid of ["bytes=999999999-", "bytes=4-2", "bytes=0-1,2-3", "bytes=-0", "items=0-1"]) { const r = await host.mediaBrowseResponse(1, receipt.reference, "GET", invalid, control); assert.equal(r.status, 416); }
    await assert.rejects(host.mediaBrowseResponse(2, receipt.reference, "GET", undefined, control), /REFERENCE_EXPIRED/);
    const output = resolve(root, `decoded-${receipt.reference}${receipt.kind === "image" ? ".png" : ".mp4"}`); await writeFile(output, encoded);
    if (receipt.kind !== "image") {
      const probe = JSON.parse((await run(process.env.AVE_FFPROBE ?? "ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", output])).stdout);
      if (source.location_ref !== gap) assert(Number(probe.format.duration) >= 17.9, "browsing must include the tail after 15 seconds");
      assert.equal(probe.streams.some((stream: any) => stream.codec_type === "audio"), receipt.audio_status === "present");
      await run(process.env.AVE_FFMPEG ?? "ffmpeg", ["-v", "error", "-xerror", "-ss", source.location_ref === gap ? "1" : "16", "-i", output, "-f", "null", "-"]);
    }
    await host.releaseMediaBrowse(1, { operation_id }); await assert.rejects(host.mediaBrowseResponse(1, receipt.reference, "GET", undefined, control), /REFERENCE_EXPIRED/);
    assert.equal(createHash("sha256").update(await readFile(source.location_ref)).digest("hex"), source.asset_id.slice("asset:sha256:".length));
    if (source.location_ref === gap) await assert.rejects(host.readMediaAnalysis(source.asset_id), /MEDIA_SAMPLE_AUDIO_GAP/, "browsable audio with a real internal gap must still fail strict measurement");
  }
  const cancelled = randomUUID(); await host.releaseMediaBrowse(1, { operation_id: cancelled }); await assert.rejects(host.prepareMediaBrowse(1, { asset_id: sources[0].asset_id, operation_id: cancelled }, control), /CANCELLED/);
  // Real conversion, controlled late delivery: cancellation must drain and publish no token.
  const options = (host as any).mediaBrowsing.options, originalWorker = options.worker;
  let reached!: () => void, deliver!: () => void;
  const conversionFinished = new Promise<void>(accept => { reached = accept; }), late = new Promise<void>(accept => { deliver = accept; });
  options.worker = { submit: async (...args: any[]) => { const result = await originalWorker.submit(...args); if (args[0] === "media.browse.v1") { reached(); await late; } return result; } };
  const lateOperation = randomUUID(), preparation = host.prepareMediaBrowse(1, { asset_id: sources[0].asset_id, operation_id: lateOperation }, control);
  const rejected = assert.rejects(preparation, /MEDIA_BROWSE_CANCELLED/); await conversionFinished;
  const release = host.releaseMediaBrowse(1, { operation_id: lateOperation }); deliver(); await rejected; await release; options.worker = originalWorker;
  // A failed waveform is visible separately and cannot turn playable audio into no-audio.
  const waveOperation = randomUUID(), waveReceipt = await host.prepareMediaBrowse(1, { asset_id: sources[1].asset_id, operation_id: waveOperation }, control);
  options.worker = { submit: async (...args: any[]) => args[0] === "media.waveform.v1" ? { status: "failed", outputs: [], diagnostics: [{ code: "CONTROLLED_WAVEFORM_FAILURE" }] } : originalWorker.submit(...args) };
  const failedWave = await host.mediaBrowseWaveform(1, { reference: waveReceipt.reference }, control); assert.equal(failedWave.error, "MEDIA_BROWSE_WAVEFORM_FAILED"); assert.equal(waveReceipt.audio_status, "present");
  assert((host.listMediaBrowseHistory(waveOperation) as any[]).some(item => item.status === "waveform_failed" && item.error.includes("CONTROLLED_WAVEFORM_FAILURE")));
  await assert.rejects(host.reportMediaBrowsePlayback(2, { reference: waveReceipt.reference, error_code: 3 }), /REFERENCE_EXPIRED/);
  await host.reportMediaBrowsePlayback(1, { reference: waveReceipt.reference, error_code: 3 });
  const failuresBeforeClose = host.listMediaBrowseHistory(waveOperation);
  options.worker = originalWorker;
  const stillPlayable = await host.mediaBrowseResponse(1, waveReceipt.reference, "GET", "bytes=0-15", control); assert.equal((await bytes(stillPlayable.body)).length, 16);
  const unopened = await host.mediaBrowseResponse(1, waveReceipt.reference, "GET", undefined, control); unopened.body?.on("error", () => undefined);
  await Promise.all([host.releaseMediaBrowse(1, { operation_id: waveOperation }), host.releaseMediaBrowse(1, { operation_id: waveOperation })]);
  const ownerOperation = randomUUID(), otherOperation = randomUUID();
  const own = await host.prepareMediaBrowse(1, { asset_id: sources[2].asset_id, operation_id: ownerOperation }, control), other = await host.prepareMediaBrowse(2, { asset_id: sources[2].asset_id, operation_id: otherOperation }, control);
  await host.releaseMediaBrowseOwner(1); await assert.rejects(host.mediaBrowseResponse(1, own.reference, "HEAD", undefined, control), /REFERENCE_EXPIRED/);
  assert.equal((await host.mediaBrowseResponse(2, other.reference, "HEAD", undefined, control)).status, 200); await host.releaseMediaBrowseOwner(2);
  const stale = await host.prepareMediaBrowse(1, { asset_id: sources[0].asset_id, operation_id: randomUUID() }, control); await host.close();
  await host.open(resolve(root, "project")); await assert.rejects(host.mediaBrowseResponse(1, stale.reference, "GET", undefined, control), /REFERENCE_EXPIRED/);
  assert.deepEqual(host.listMediaBrowseHistory(waveOperation), failuresBeforeClose, "Waveform and playback causes persist after reopen without rewriting historical records");
  const changed = await host.prepareMediaBrowse(1, { asset_id: sources[2].asset_id, operation_id: randomUUID() }, control); await writeFile(sources[2].location_ref, "changed bytes"); await assert.rejects(host.mediaBrowseResponse(1, changed.reference, "GET", undefined, control));
  console.log("Full image/video/audio browsing, tail decode, range, cancellation, reopen and source change passed");
} finally { await host.close(); await rm(root, { recursive: true, force: true }); }
