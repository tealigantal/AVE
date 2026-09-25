import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { createLocalWorkerJobPort } from "../../packages/platform/worker-client/src/public.js";
import { mediaSampleRequestV1Validator, mediaSampleResultV1Validator, mediaSceneResultV1Validator } from "../../packages/platform/contract-runtime/src/public.js";
import { createOpenAICompatibleProvider, createDeepSeekProvider, createQwenProvider, ModelGatewayError, modelCacheKey, runModel, validateModelInput, type ModelInput, type ModelRequest } from "../../packages/platform/model-gateway/src/public.js";
import type { MediaSampleResultV1 } from "../../contracts/generated/typescript/worker/media-sample-result.v1.js";
import type { MediaSceneResultV1 } from "../../contracts/generated/typescript/worker/media-scene-result.v1.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { registerMediaAsset } from "../../packages/platform/project-storage/src/public.js";
import { creationDigest } from "../../packages/platform/contract-runtime/src/public.js";

// Actual encoded motion/audio and actual Worker extraction. HTTP only captures
// bytes locally; this test makes no model-understanding or real-user claim.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-sampling-")), run = promisify(execFile), worker = createLocalWorkerJobPort();
const hash = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const time = (value: number, timescale = 1000) => ({ schema_version: 1, value, timescale });
let job = 0;
const request = async (path: string, stream: number, samples: any[], changes: any = {}) => {
  const output = resolve(root, `output-${++job}`); await mkdir(output);
  return { schema_version: 1, task_type: "media.sample.v1", input_path: path, source_digest: hash(await readFile(path)), stream_index: stream, samples, output_dir: output, max_frame_edge: 64,  timeout_seconds: 30, ...changes };
};
const submit = async (input: any) => {
  assert.ok(mediaSampleRequestV1Validator(input), JSON.stringify(mediaSampleRequestV1Validator.errors));
  const result = await worker.submit("media.sample.v1", input, { jobId: `sampling-${++job}`, idempotent: false }) as any;
  assert.equal(result.status, "succeeded", JSON.stringify(result.diagnostics));
  for (const output of result.outputs) {
    assert.ok(mediaSampleResultV1Validator(output), JSON.stringify(mediaSampleResultV1Validator.errors));
    const sample = output as MediaSampleResultV1;
    assert.equal(hash(await readFile(sample.path)), sample.content_digest);
  }
  return result.outputs;
};
const rejects = async (input: any, code: string) => {
  await assert.rejects(submit(input), new RegExp(code));
  assert.deepEqual(await readdir(input.output_dir), [], "failed batch publishes no surviving samples");
};
try {
  const video = resolve(root, "vfr.mp4"), audio = resolve(root, "tone.wav");
  await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=size=96x64:rate=10:duration=3", "-vf", "select='eq(n,0)+eq(n,1)+eq(n,4)+eq(n,7)+eq(n,12)+eq(n,18)+eq(n,25)',setpts=PTS+2/TB", "-fps_mode", "vfr", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-video_track_timescale", "1000", video]);
  await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=2", "-c:a", "pcm_s16le", audio]);
  const sceneScan = async (path: string) => {
    const result = await worker.submit("media.scene_scan.v1", { schema_version: 1, task_type: "media.scene_scan.v1", input_path: path, source_digest: hash(await readFile(path)), stream_index: 0, threshold: 100, timeout_seconds: 30 }, { idempotent: false }) as any;
    assert.equal(result.status, "succeeded", JSON.stringify(result.diagnostics)); assert.ok(mediaSceneResultV1Validator(result.outputs[0])); return result.outputs[0] as MediaSceneResultV1;
  };
  const decodedFrames = async (path: string) => JSON.parse((await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_frames", "-show_entries", "frame=pts,duration,pkt_duration", "-of", "json", path])).stdout).frames as { pts: number; duration?: number; pkt_duration?: number }[];
  // This fixture has one H.264 access unit per packet. MP4 edit-list handling
  // can mark its encoded tail packet discard; encoding seven frames does not
  // prove seven display frames. Keep default demuxing and independently check
  // every non-discarded packet against actual decoded coverage. Packet order
  // is DTS order, so compare by PTS. This is not a general packet/frame rule.
  const vfrPackets = JSON.parse((await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_packets", "-show_entries", "packet=pts,flags", "-of", "json", video])).stdout).packets as { pts: number; flags: string }[];
  const packetPts = (packets: typeof vfrPackets) => packets.map((packet) => packet.pts).sort((a, b) => a - b);
  assert.deepEqual(packetPts(vfrPackets), [2000, 2100, 2400, 2700, 3200, 3800, 4500]);
  const vfrDecoded = await decodedFrames(video);
  assert.deepEqual(vfrDecoded.map((frame) => frame.pts), packetPts(vfrPackets.filter((packet) => !packet.flags.includes("D"))), "decode every playable packet of this fixture without manufacturing discarded coverage");
  const vfrScan = await sceneScan(video);
  assert.equal(vfrScan.start_pts, 2000); assert.equal(vfrScan.frames.length, vfrDecoded.length); assert.equal(vfrScan.spans.length, 1, "no measured cut must not become fixed divisions");
  assert.deepEqual(vfrScan.frames.map((frame) => frame.pts), vfrDecoded.map((frame) => frame.pts));
  const vfrTail = vfrDecoded.at(-1)!;
  const vfrTailDuration = vfrTail.duration ?? vfrTail.pkt_duration;
  assert.equal(vfrTailDuration, 100);
  assert.equal(vfrScan.end_pts, vfrTail.pts + vfrTailDuration!); assert.equal(vfrScan.frames.at(-1)!.end_pts, vfrScan.end_pts);
  const input = await request(video, 0, [{ sample_id: "late", kind: "frame", start: time(2150), end: time(3000) }, { sample_id: "early", kind: "frame", start: time(2000), end: time(2500) }]);
  const frames = await submit(input);
  assert.deepEqual(frames.map((item: any) => item.detail.source_pts), [2400, 2000]);
  assert.deepEqual(frames[0].actual_start, time(12, 5)); assert.deepEqual(frames[0].actual_end, time(27, 10));
  assert.equal(frames[0].detail.frame_index, 2); assert.equal(frames[0].detail.width, 64); assert.notEqual(frames[0].content_digest, frames[1].content_digest);
  await rejects(await request(video, 0, input.samples, { source_digest: "0".repeat(64) }), "MEDIA_SAMPLE_SOURCE_MISMATCH");
  await rejects(await request(video, 9, input.samples), "MEDIA_SAMPLE_STREAM_MISSING");
  await rejects(await request(video, 0, [{ sample_id: "empty", kind: "frame", start: time(2200), end: time(2300) }]), "MEDIA_SAMPLE_FRAME_UNAVAILABLE");
  await rejects(await request(video, 0, [{ sample_id: "partial", kind: "frame", start: time(2400), end: time(2600) }]), "MEDIA_SAMPLE_FRAME_COVERAGE_UNPROVEN");
  // Failure after the first real image was written must remove that image.
  await rejects(await request(video, 0, [input.samples[0], { sample_id: "absent", kind: "frame", start: time(9000), end: time(10000) }]), "MEDIA_SAMPLE_FRAME_UNAVAILABLE");
  const firstBytes = await readFile(frames[0].path);
  await assert.rejects(submit(input), /File exists|file exists/);
  assert.deepEqual(await readFile(frames[0].path), firstBytes, "collision never overwrites existing sample");
  const sound = (await submit(await request(audio, 0, [{ sample_id: "sound", kind: "audio", start: time(250), end: time(750) }])))[0];
  assert.equal(sound.detail.sample_count, 24000); assert.equal(sound.detail.sample_rate, 48000); assert.deepEqual(sound.actual_start, time(1, 4));
  await rejects(await request(audio, 0, [{ sample_id: "too-long", kind: "audio", start: time(1500), end: time(2500) }]), "MEDIA_SAMPLE_AUDIO_COVERAGE_UNPROVEN");
  await rejects(await request(audio, 0, [{ sample_id: "fraction", kind: "audio", start: time(1, 7), end: time(1, 2) }]), "MEDIA_SAMPLE_AUDIO_TIME_NOT_ALIGNED");
  await rejects(await request(audio, 0, input.samples), "MEDIA_SAMPLE_STREAM_KIND_MISMATCH");
  const coarse = resolve(root, "coarse.mkv");
  await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=44100:duration=1", "-af", "asetpts=PTS+0.001/TB", "-c:a", "pcm_s16le", coarse]);
  await rejects(await request(coarse, 0, [{ sample_id: "off-grid", kind: "audio", start: time(45, 44100), end: time(90, 44100) }]), "MEDIA_SAMPLE_AUDIO_TIME_NOT_ALIGNED");

  // Non-unit numerator timebase: AVI at 30000/1001, selected without seconds/fps rounding.
  const rational = resolve(root, "rational.avi");
  await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=size=64x64:rate=30000/1001:duration=1", "-c:v", "mpeg4", rational]);
  const rationalSample = (await submit(await request(rational, 0, [{ sample_id: "rational", kind: "frame", start: time(100), end: time(500) }])))[0];
  assert.deepEqual(rationalSample.detail.source_time_base, { numerator: 1001, denominator: 30000 });
  assert.equal(rationalSample.detail.source_pts, 3); assert.deepEqual(rationalSample.actual_start, time(1001, 10000));
  const rationalScan = await sceneScan(rational), rationalDecoded = await decodedFrames(rational);
  assert.deepEqual(rationalScan.time_base, { numerator: 1001, denominator: 30000 });
  assert.equal(rationalScan.frames.length, 30); assert.equal(rationalScan.start_pts, 0); assert.equal(rationalScan.end_pts, 30);
  assert.deepEqual(rationalScan.frames.map((frame) => frame.pts), rationalDecoded.map((frame) => frame.pts));

  const media = await Promise.all([frames[0], sound].map(async (item: any) => ({ sample_id: item.sample_id, mime_type: item.detail.mime_type, data_base64: (await readFile(item.path)).toString("base64"), content_digest: item.content_digest })));
  const modelInput: ModelInput = { context: { instruction: "Describe only the attached samples", samples: [frames[0].sample_id, sound.sample_id] }, media };
  const measured = validateModelInput(modelInput); assert.equal(measured[0].width, 64); assert.equal(measured[1].sample_count, 24000);
  const modelRequest: ModelRequest = { request_id: "observation-wire", provider: "fixture", model: "fixture-multimodal", prompt_version: "sample-test", privacy_class: "internal", input: modelInput,  structured_output: true };
  let sends = 0, sent = "", transport: any;
  const providerConfig = { api_key: "fixture", base_url: "https://fixture.invalid", provider: "fixture", audio_input: "base64" as const, models: [{ model: "fixture-multimodal", media_types: ["image/png", "audio/wav"] as const }], fetch_impl: async (_url: RequestInfo | URL, init?: RequestInit) => { sends++; sent = init!.body as string; return new Response(JSON.stringify({ choices: [{ message: { content: "{}" }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 1, total_tokens: 11 } })); } };
  await runModel({ ...modelRequest, dispatch: async (send, prepared) => { transport = prepared; return send().response; } }, createOpenAICompatibleProvider(providerConfig));
  assert.equal(sends, 1); assert.equal(hash(sent), transport.wire_digest); assert.equal(Buffer.byteLength(sent), transport.input_bytes);
  const blocks = JSON.parse(sent).messages[0].content;
  assert.equal(blocks[2].type, "image_url"); assert.equal(blocks[2].image_url.url, `data:image/png;base64,${media[0].data_base64}`);
  assert.equal(blocks[4].type, "input_audio"); assert.equal(blocks[4].input_audio.data, media[1].data_base64); assert.equal(sent.includes(root), false);
  const gatewayCode = (expected: string) => (error: any) => error instanceof ModelGatewayError && error.code === expected;
  await assert.rejects(runModel(modelRequest, createOpenAICompatibleProvider({ ...providerConfig, models: undefined })), gatewayCode("MODEL_MEDIA_UNSUPPORTED"));
  await assert.rejects(runModel(modelRequest, createOpenAICompatibleProvider({ ...providerConfig, models: [{ model: "different", media_types: [] }] })), gatewayCode("MODEL_CONFIGURATION_INVALID"));
  await assert.rejects(runModel(modelRequest, createOpenAICompatibleProvider({ ...providerConfig, models: [{ model: modelRequest.model, media_types: ["image/png"] }] })), gatewayCode("MODEL_MEDIA_UNSUPPORTED"));
  await assert.rejects(runModel({ ...modelRequest, input: { ...modelInput, media: [{ ...media[0], content_digest: "0".repeat(64) }] } }, createOpenAICompatibleProvider(providerConfig)), gatewayCode("MODEL_INPUT_INVALID"));
  await assert.rejects(runModel({ ...modelRequest, input: { context: {}, media: [{ ...media[0], url: "https://private.invalid" } as any] } }, createOpenAICompatibleProvider(providerConfig)), gatewayCode("MODEL_INPUT_INVALID"));
  assert.equal(sends, 1, "unsupported media, identity, or encoding never reaches HTTP");
  assert.notEqual(modelCacheKey(modelRequest), modelCacheKey({ ...modelRequest, input: { ...modelInput, media: media.slice(1) } }));
  await assert.rejects(runModel({ ...modelRequest, provider: "deepseek" }, createDeepSeekProvider(providerConfig)), gatewayCode("MODEL_MEDIA_UNSUPPORTED"));
  assert.equal(sends, 1);
  await runModel({ ...modelRequest, provider: "qwen" }, createQwenProvider(providerConfig));
  assert.equal(JSON.parse(sent).messages[0].content[4].input_audio.data, `data:audio/wav;base64,${media[1].data_base64}`);

  const credential = {}, host = new ProjectHostSession({ now: () => Date.parse("2026-09-24T01:00:00Z"), creationRequestChannels: [{ credential, actor_id: "user-1" }], provider: "fixture", model: "fixture-multimodal", modelProvider: createOpenAICompatibleProvider(providerConfig), creationModelPolicy: {   max_attempts: 1, timeout_ms: 30000 } });
  try {
    await host.create(resolve(root, "host")); host.initializeTimeline([]);
    const session = (host as any).session, asset = `asset:sha256:${input.source_digest}`;
    registerMediaAsset(session, session.manifest.project_id, { asset_id: asset, algorithm: "sha256", digest: input.source_digest, byte_length: (await readFile(video)).length, stream_facts: {} });
    const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
    for (const [index, attachment] of media.entries()) {
      const requestId = `denied-media-${index}`, body: ModelInput = { context: {}, media: [attachment] };
      host.beginCreationRequest(credential, { ...authorization, request_id: requestId, asset_ids: [asset], provider: "fixture", model: "fixture-multimodal", allowed_data: ["request"] });
      const ticket = (host as any).prepareCreationRun(requestId, creationDigest(body), null);
      await assert.rejects((host as any).runCreationModel(ticket, body, ["request"], null, () => {}), (error: any) => error.code === "REQUEST_DATA_DENIED");
      assert.equal(host.readCreationRequest(requestId).model_calls.length, 0); assert.equal(host.readCreationRequest(requestId).drafts.length, 0);
    }
    assert.equal(sends, 2, "Host infers every attachment permission without trusting a caller field list");
  } finally { await host.close(); }

  // Exercise protocol diagnostics when both the original operation and cleanup fail.
  const broken = await request(video, 0, [input.samples[0], { sample_id: "missing", kind: "frame", start: time(9000), end: time(10000) }]);
  const faultScript = String.raw`
import json, sys, shutil
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch
from threading import Event
sys.path.insert(0, str(Path('apps/worker-host/src').resolve()))
from worker_host.runtime.engine import WorkerRuntime, HANDLERS
from worker_host.adapters.ffmpeg import CommandCancelled
payload = json.loads(sys.argv[1])
events = []
runtime = WorkerRuntime(events.append)
unlink = Path.unlink
def fail_unlink(path, *args, **kwargs):
    if str(path.parent) == payload['output_dir'] and path.name == 'late.png':
        raise OSError(5, 'sample unlink fixture')
    return unlink(path, *args, **kwargs)
with patch.object(Path, 'unlink', fail_unlink):
    runtime.run_job('sample-fault', 'sample-fault', payload, Event())
assert events[-1]['status'] == 'failed'
assert any(d['code'] == 'MEDIA_SAMPLE_FRAME_UNAVAILABLE' for d in events[-1]['diagnostics'])
assert any('sample unlink fixture' in d['message'] for d in events[-1]['diagnostics'])
cancel_payload = dict(payload, output_dir=payload['output_dir'] + '-cancel', samples=[payload['samples'][0], dict(payload['samples'][0], sample_id='second')])
Path(cancel_payload['output_dir']).mkdir()
original = HANDLERS['media.sample.v1']
def cancel_after_sample(payload, context):
    def progress(value):
        context.progress(value)
        context.cancelled.set()
    return original(payload, replace(context, progress=progress))
HANDLERS['media.sample.v1'] = cancel_after_sample
runtime.run_job('cancel-real-sample', 'cancel-real-sample', cancel_payload, Event())
assert events[-1]['status'] == 'cancelled'
assert list(Path(cancel_payload['output_dir']).iterdir()) == []
HANDLERS['media.sample.v1'] = original
for mode in ['failure', 'cancel']:
    paths = []
    def handler(payload, context):
        if mode == 'cancel':
            raise CommandCancelled('cancel fixture')
        raise ValueError('MEDIA_SAMPLE_FAULT: handler fixture')
    def fail_rmtree(path, *args, **kwargs):
        paths.append(path)
        raise OSError(5, 'workspace cleanup fixture')
    HANDLERS['fixture.fail'] = handler
    with patch('worker_host.adapters.filesystem.shutil.rmtree', fail_rmtree):
        runtime.run_job(mode, mode, {'task_type': 'fixture.fail'}, Event())
    assert events[-1]['status'] == 'failed'
    assert any(d['code'] == ('CANCELLED' if mode == 'cancel' else 'MEDIA_SAMPLE_FAULT') for d in events[-1]['diagnostics'])
    assert any('workspace cleanup fixture' in d['message'] for d in events[-1]['diagnostics'])
    for path in paths:
        shutil.rmtree(path)
print('specific original and cleanup failure diagnostics retained')
`;
  const faults = await run("python", ["-c", faultScript, JSON.stringify(broken)]); assert.match(faults.stdout, /failure diagnostics retained/);
  console.log("Stage3 actual PTS frame/audio extraction, failure cleanup, and bounded multimodal wire passed (local HTTP fixture only)");
} finally {
  await worker.close();
  await rm(root, { recursive: true, force: true });
}
