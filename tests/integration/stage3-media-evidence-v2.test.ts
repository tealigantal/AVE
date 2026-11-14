import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { mediaProbeRequestV2Validator, mediaProbeResultV2Validator, mediaSceneRequestV2Validator, mediaSceneResultV2Validator } from "../../packages/platform/contract-runtime/src/public.js";
import { readProbeEvidence, readSceneEvidence, readSceneSpans } from "../../packages/platform/project-host/src/media-evidence.js";
import { createLocalWorkerJobPort } from "../../packages/platform/worker-client/src/public.js";

const run = promisify(execFile), root = await mkdtemp(resolve(tmpdir(), "ave-media-evidence-v2-")), worker = createLocalWorkerJobPort();
const hash = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const control = { assertCurrent() {} };
try {
  const source = resolve(root, "source.mp4"), output = resolve(root, "output"); await mkdir(output);
  await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=size=96x64:rate=10:duration=2", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", source]);
  const sourceDigest = hash(await readFile(source));
  const sceneRequest = { schema_version: 2, task_type: "media.scene_scan.v2", input_path: source, source_digest: sourceDigest, stream_index: 0, threshold: 12, timeout_seconds: 30, output_dir: output };
  const probeRequest = { schema_version: 2, task_type: "media.probe.v2", input_path: source, source_digest: sourceDigest, timeout_seconds: 30, output_dir: output };
  assert.ok(mediaSceneRequestV2Validator(sceneRequest)); assert.ok(mediaProbeRequestV2Validator(probeRequest));
  const independent=JSON.parse((await run("ffprobe",["-v","error","-show_streams","-show_frames","-show_packets","-of","json",source])).stdout);
  const independentFrames=independent.packets_and_frames.filter((row:any)=>row.type==="frame"&&row.stream_index===0);
  const ffmpegVersion=(await run("ffmpeg",["-version"])).stdout.split(/\r?\n/)[0];
  const nextScene = await worker.submit<any, any>("media.scene_scan.v2", sceneRequest, { timeoutMs: 30000 });
  assert.equal(nextScene.status, "succeeded", JSON.stringify(nextScene.diagnostics)); const scene = nextScene.outputs[0];
  assert.equal(mediaSceneResultV2Validator(scene), true);
  const expected = { source_digest: sourceDigest, stream_index: 0, time_base: {numerator:1,denominator:10240}, threshold: 12, ffmpeg_version: ffmpegVersion! };
  const frames = []; for await (const frame of readSceneEvidence(scene, output, expected, control)) frames.push(frame);
  assert.deepEqual(frames.map(row=>row.pts),independentFrames.map((row:any)=>row.pts)); assert.equal(frames.at(-1)!.end_pts,20480); assert.equal(scene.receipt.frame_count,20);
  const spans = []; for await (const span of readSceneSpans(scene, output, expected, control)) spans.push(span);
  assert.equal(spans.length,scene.span_count);assert.equal(spans[0]!.start_pts,0);assert.equal(spans.at(-1)!.end_pts,20480);
  const nextProbe = await worker.submit<any, any>("media.probe.v2", probeRequest, { timeoutMs: 30000 });
  assert.equal(nextProbe.status, "succeeded", JSON.stringify(nextProbe.diagnostics)); const probe = nextProbe.outputs[0];
  assert.equal(mediaProbeResultV2Validator(probe), true);
  const rows = []; for await (const row of readProbeEvidence(probe, output, sourceDigest, control)) rows.push(row);
  const probeMetadata = JSON.parse(probe.metadata_json);
  for(const stream of independent.streams) {
    for(const kind of ["frame","packet"]) {
      const field=kind==="frame"?"best_effort_timestamp":"pts";
      const expected=independent.packets_and_frames.filter((row:any)=>row.type===kind&&row.stream_index===stream.index&&row[field]!==undefined).map((row:any)=>row[field]);
      assert.deepEqual(rows.filter(row=>row.kind===kind&&row.stream_index===stream.index&&row[field]!==undefined).map(row=>row[field]),expected);
    }
    assert.equal(probeMetadata.timing_summary.streams[String(stream.index)].frame_count,independent.packets_and_frames.filter((row:any)=>row.type==="frame"&&row.stream_index===stream.index).length);
  }
  await assert.rejects(async () => { for await (const _ of readProbeEvidence({ ...probe, metadata_json: "{}" }, output, sourceDigest, control)) {} }, /MEDIA_EVIDENCE_INVALID/);
  const forgedMetadata = structuredClone(probeMetadata); forgedMetadata.timing_summary.streams["0"].frame_count++;
  const forgedJson = JSON.stringify(forgedMetadata), encodedRecords = (await readFile(probe.path, "utf8")).trimEnd().split("\n").map(line => JSON.parse(line));
  encodedRecords.at(-1).metadata_sha256 = hash(Buffer.from(forgedJson));
  const forgedBytes = Buffer.from(encodedRecords.map(row => JSON.stringify(row)).join("\n") + "\n"), forgedPath = resolve(output, "forged-probe.ndjson");
  await writeFile(forgedPath, forgedBytes);
  const forged = { ...probe, path: forgedPath, metadata_json: forgedJson, byte_length: forgedBytes.length, sha256: hash(forgedBytes) };
  await assert.rejects(async () => { for await (const _ of readProbeEvidence(forged, output, sourceDigest, control)) {} }, /summary differs/);
  let allowed = true;
  const iterator = readSceneEvidence(scene, output, expected, { assertCurrent() { if (!allowed) throw new Error("AUTH_REVOKED"); } });
  assert.equal((await iterator.next()).done, false); allowed = false; await assert.rejects(iterator.next(), /AUTH_REVOKED/);
  const original = await readFile(scene.path); await writeFile(scene.path, Buffer.from("tampered"));
  await assert.rejects(async () => { for await (const _ of readSceneEvidence(scene, output, expected, control)) {} }, /MEDIA_EVIDENCE_INVALID/);
  await writeFile(scene.path, original);
  await assert.rejects(async () => { for await (const _ of readSceneEvidence(scene, root, expected, control)) {} }, /MEDIA_EVIDENCE_INVALID/);
  const before = new Set(await readdir(output));
  const denied = await worker.submit<any, any>("media.probe.v2", { ...probeRequest, source_digest: "0".repeat(64) }, { timeoutMs: 30000 });
  assert.equal(denied.status, "failed"); assert.deepEqual(new Set(await readdir(output)), before);
  const unsupported = resolve(root, "animated.gif"), gifSignature = Buffer.from("GIF89a\0\0\0\0\0\0", "binary"); await writeFile(unsupported, gifSignature);
  for (const [task, input] of [["media.probe.v2", { ...probeRequest, input_path: unsupported, source_digest: hash(gifSignature) }], ["media.scene_scan.v2", { ...sceneRequest, input_path: unsupported, source_digest: hash(gifSignature) }]] as const) {
    const result = await worker.submit<any, any>(task, input, { timeoutMs: 30000 }); assert.equal(result.status, "failed");
    assert.ok(result.diagnostics.length>0, "corrupt GIF must fail with diagnostics");
  }
  assert.deepEqual(new Set(await readdir(output)), before);
  const cancellationScript = `
import sys,hashlib
from pathlib import Path
from threading import Event
sys.path.insert(0,str(Path('apps/worker-host/src').resolve()))
from worker_host.handlers.context import HandlerContext
from worker_host.handlers import media_scene_scan_v2,media_probe_v2
from worker_host.adapters.ffmpeg import CommandCancelled
source=Path(sys.argv[1]); root=Path(sys.argv[2]); digest=hashlib.sha256(source.read_bytes()).hexdigest()
for task,handler in [('media.scene_scan.v2',media_scene_scan_v2.handle),('media.probe.v2',media_probe_v2.handle)]:
    workspace=root/(task+'-workspace'); workspace.mkdir(); staging=root/(task+'-staging'); staging.mkdir(); event=Event()
    payload={'schema_version':2,'task_type':task,'input_path':str(source),'source_digest':digest,'timeout_seconds':30,'output_dir':str(staging)}
    if task=='media.scene_scan.v2': payload.update(stream_index=0,threshold=12)
    context=HandlerContext('test-cancel',workspace,event,30,lambda _:event.set())
    try: handler(payload,context)
    except CommandCancelled: pass
    else: raise AssertionError('cancellation was ignored')
    assert not list(staging.iterdir()) and not list(workspace.iterdir())
print('v2 cancellation cleanup verified')
`;
  assert.match((await run("python", ["-c", cancellationScript, source, root])).stdout, /v2 cancellation cleanup verified/);
  console.log("Scene/probe v2 synthetic Worker and bounded Host readers passed against independent ffprobe");
} finally {
  await worker.close(); await rm(root, { recursive: true, force: true });
}
