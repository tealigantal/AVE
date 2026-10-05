import assert from "node:assert/strict";
import { readdir, readFile, stat, mkdtemp, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "/opt/ave/app/packages/platform/project-host/src/public.js";
const run = promisify(execFile), sha = bytes => createHash("sha256").update(bytes).digest("hex");
const expected = JSON.parse(await readFile("/ave-p2-tests/authorised-source-identities.json", "utf8")).sources;
const sizes = new Set(expected.map(item => item.byte_length)), selected = new Map();
async function visit(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = `${path}/${entry.name}`;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await visit(file);
    else if (entry.isFile() && sizes.has((await stat(file)).size)) {
      const hash = sha(await readFile(file)); if (expected.some(item => item.sha256 === hash) && !selected.has(hash)) selected.set(hash, file);
    }
  }
}
await visit("/workspace/uploads");
assert.equal(selected.size, 9, "Only the exact nine previously authorised identities participate");
const root = await mkdtemp("/tmp/ave-p2-real-"), host = new ProjectHostSession(), controller = new AbortController();
const control = { signal: controller.signal, assertCurrent() {} }, report = { scope: "new compiled image + exact previously authorised sources + full decode/ranges; no UI/listening or human acceptance", sources: [], result: "running" };
try {
  await host.create(`${root}/project`);
  for (const item of expected) {
    const path = selected.get(item.sha256), imported = await host.importMedia([path]); assert.equal(imported.length, 1);
    const asset_id = `asset:sha256:${item.sha256}`, operation_id = randomUUID(), receipt = await host.prepareMediaBrowse(1, { asset_id, operation_id }, control);
    const response = await host.mediaBrowseResponse(1, receipt.reference, "GET", undefined, control), chunks = [];
    for await (const chunk of response.body) chunks.push(Buffer.from(chunk));
    const encoded = Buffer.concat(chunks); assert.equal(sha(encoded), receipt.content_digest);
    const output = `${root}/${receipt.reference}.${receipt.kind === "image" ? "png" : "mp4"}`; await writeFile(output, encoded);
    const observation = { ...item, derived: { kind: receipt.kind, digest: receipt.content_digest, byte_length: receipt.byte_length, audio_status: receipt.audio_status, policy: receipt.policy, tool_identity: receipt.tool_identity, time_mapping: receipt.time_mapping }, strict: { result: "not-run" } };
    if (receipt.kind !== "image") {
      const sourceFacts = JSON.parse((await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", path])).stdout);
      const facts = JSON.parse((await run("ffprobe", ["-v", "error", "-show_streams", "-show_format", "-of", "json", output])).stdout);
      observation.source_duration = sourceFacts.format.duration; observation.derived_duration = facts.format.duration;
      observation.source_streams = sourceFacts.streams.map(s => ({ index: s.index, codec_type: s.codec_type, time_base: s.time_base, start_pts: s.start_pts, duration_ts: s.duration_ts }));
      assert(Math.abs(Number(facts.format.duration) - Number(sourceFacts.format.duration)) < 0.1, "Full source duration preserved within browsing encode rounding");
      await run("ffmpeg", ["-v", "error", "-xerror", "-i", output, "-map", "0", "-f", "null", "-"], { timeout: 90000 });
      await run("ffmpeg", ["-v", "error", "-xerror", "-ss", String(Math.max(0, Number(facts.format.duration) - 2)), "-i", output, "-map", "0", "-f", "null", "-"], { timeout: 90000 });
    }
    try { const strict = await host.readMediaAnalysis(asset_id); observation.strict = { result: "passed", audio_present: Boolean(strict.audio), limit_seconds: strict.preview_limit_seconds }; }
    catch (error) { observation.strict = { result: "failed", code: error.code ?? String(error).split(":")[0], message: String(error).replaceAll(path, "[authorised-source]") }; }
    const waveform = await host.mediaBrowseWaveform(1, { reference: receipt.reference }, control); observation.waveform = { result: waveform.error ? "failed" : waveform.bytes ? "passed" : "not-applicable", error: waveform.error };
    await host.releaseMediaBrowse(1, { operation_id }); assert.equal(sha(await readFile(path)), item.sha256); report.sources.push(observation);
  }
  report.result = "passed";
} finally { await host.close(); }
console.log(JSON.stringify(report, null, 2));
