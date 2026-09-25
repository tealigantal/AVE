import { strict as assert } from "node:assert";
import { reviewCreationInElectron } from "../fixtures/stage3/electron-review.js";
import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";

// Actual encoded motion/audio -> actual dual render/QC. Model responses are local fixtures.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-desktop-workspace-")), projectRoot = resolve(root, "project"), credential = {}, now = () => Date.parse("2026-09-24T01:00:00Z");
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
let decisions = 0, modelCalls = 0, blockGeneration = false;
let reached!: () => void, release!: () => void;
const atProvider = new Promise<void>(resolve => { reached = resolve; }), releaseProvider = new Promise<void>(resolve => { release = resolve; });
const provider = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  modelCalls += 1;
  const content = JSON.parse(init!.body as string).messages[0].content;
  if (Array.isArray(content)) {
    const observation = JSON.parse(content[0].text);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ samples: observation.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: "Controlled synthetic sample", uncertain: false, transcript: [] })) }) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
  }
  const body = JSON.parse(content), observations = body.source_spans;
  if (blockGeneration) { reached(); await releaseProvider; }
  const firstLength = 45; decisions += 1;
  const decision = { thesis: "Two moving test patterns", shots: observations.map((item: any, index: number) => ({ shot_id: `shot-${index}`, source: { span_id: item.span_id, asset_id: item.asset_id, start: time(0), end: time(index ? 30 : firstLength) }, purpose: "Observed moving pattern", embedded_gain_db: -6, reframe: null, color: null })), audio: [], captions: [], preserve_refs: body.request.revisions.at(-1).preserve_refs, applied_principle_ids: [], feedback_interpretation: body.request.original_text, change_summary: "Unequal observed pattern cuts" };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(decision) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const host = new ProjectHostSession({ now, creationRequestChannels: [{ credential, actor_id: "desktop-user" }], provider: "qwen", model: "fixture", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: {   max_attempts: 1, timeout_ms: 30000 } });
try {
  const files = [resolve(root, "moving-a.mp4"), resolve(root, "moving-b.mp4"), resolve(root, "manual.wav"), resolve(root, "denied.wav")];
  for (const [index, path] of files.entries()) {
    const audio = ["-f", "lavfi", "-i", `sine=frequency=${330 + index * 150}:sample_rate=48000:duration=3`];
    const args = index < 2 ? ["-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=3", ...audio, "-vf", `hue=h=${index * 50},setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"] : [...audio, "-c:a", "pcm_s16le"];
    await promisify(execFile)("ffmpeg", ["-v", "error", ...args, "-t", "3", path]);
  }
  await host.create(projectRoot); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = await host.importMedia(files) as any[];
  let session = (host as any).session;
  const projectId = session.manifest.project_id;
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  Object.assign(authorization, { request_id: "manual-request", asset_ids: imported.slice(0, 3).map(item => item.asset_id), provider: "qwen", model: "fixture", allowed_data: ["request", "timeline", "evidence", "frames", "audio"] });
  host.beginCreationRequest(credential, authorization);
  for (const source of imported.slice(0, 3)) await host.prepareCreationMaterial(credential, { operation_id: source.asset_id, request_id: authorization.request_id, asset_id: source.asset_id, asset_location_id: source.asset_location_id });
  const observation = await host.observeCreationMaterial(credential, { request_id: authorization.request_id, expected_revision: 1, material_operation_ids: imported.slice(0, 2).map(source => source.asset_id), include_audio: true });
  const first = await host.generateCreationDraft(credential, { request_id: authorization.request_id, expected_revision: 1, observation_refs: [observation.ref], profile_query: null });
  const rendered = await host.renderCreationDraft(credential, { operation_id: "initial-desktop-render", request_id: authorization.request_id, draft_id: first.draft_id });
  assert.equal((rendered.receipt.preview.qc_report as any).status, "passed");
  assert.equal((rendered.receipt.master.qc_report as any).status, "passed");
  assert.equal(modelCalls, 2, "fixture model observation and generation are explicit engineering setup");
  await host.close();
  await reviewCreationInElectron(projectRoot, resolve(root, "review"), { duration: 2.5 });
  console.log(`CREATION_DESKTOP_ENGINEERING_ROOT=${root}`);
} finally { await host.close(); }
console.log("Current Desktop engineering journey passed with actual encoded fixtures, local model replies and test-only native response; no real-media or human acceptance claimed");
