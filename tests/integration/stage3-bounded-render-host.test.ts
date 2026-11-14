import { fixtureSkillExchange } from "../fixtures/stage3/skill-planning.js";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { fstatSync, readFileSync } from "node:fs";
import syncFs from "node:fs";
import fs from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession, ResourceGate } from "../../packages/platform/project-host/src/public.js";
import { registerCreationHandlers } from "../../apps/desktop/src/main/ipc/creation.handlers.js";
import { ProjectSessionManager } from "../../apps/desktop/src/main/project-session-manager.js";
import { readCreationState, registerCreationState, readCreationRender, readObjectSync, readCreationWorkspaceSnapshot, listAssetLocationsForAssets, setAssetLocationPermission } from "../../packages/platform/project-storage/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";


// Controlled provider follows the production v3 measured-receipt/final exchange; observations and learning are unchanged.
function planningFixtureExchange(context: any, decision: any): any {
  const shots = decision.shots.map(({ source_window, ...shot }: any) => ({ ...shot, source_choice: { kind: "custom_window", source_window } }));
  const query_id = context.planning_exchange.assigned_query_id;
  assert.equal(typeof query_id, "string");
  if (context.planning_exchange.phase === "measure-only") return fixtureSkillExchange(context, { exchange_version: 3, kind: "measure_selection", query_id, target_duration_ticks: decision.target_duration_ticks, duration_constraint: { kind: "none", minimum_ticks: null, maximum_ticks: null, reason: "The fixture request does not set a whole-work duration." }, selection: shots.map((shot: any) => ({ selection_id: shot.shot_id, source_choice: shot.source_choice, timing: shot.timing })) }, decision);
  assert.equal(context.planning_exchange.round, 2, "Full-body evaluation/measurement and final are exactly two calls, without retry");
  assert.equal(context.planning_exchange.exchanges.length, 1);
  const receipt = context.planning_exchange.feasible_receipts.at(-1);
  assert.ok(receipt, "A final requires an actual feasible measurement receipt");
  const { query_id: measured_query_id, measurement_receipt_digest } = receipt;
  assert.equal(typeof measured_query_id, "string");
  assert.equal(context.planning_exchange.exchanges[0].exchange.query_id, measured_query_id);
  const { decision_version, target_duration_ticks, shots: originalShots, ...creative } = decision;
  return fixtureSkillExchange(context, { exchange_version: 3, kind: "final", measured_query_id, measurement_receipt_digest, creative: { ...creative, shots: originalShots.map(({ source_window, source_choice, timing, ...shot }: any) => shot) } }, decision);
}

// Actual encoded motion/audio -> actual dual render/QC. Model responses are local fixtures.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-render-")), projectRoot = resolve(root, "project"), credential = {};
let currentTime = Date.parse("2026-09-24T01:00:00Z");
const now = () => currentTime;
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
let decisions = 0;
let staticComposition = false;
let mixedCanvas = false;
let boundedGain = 0;
const provider = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  const content = JSON.parse(init!.body as string).messages[0].content;
  if (Array.isArray(content)) {
    const observation = JSON.parse(content[0].text);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ samples: observation.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: "Controlled synthetic sample", uncertain: false, transcript: [] })) }) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
  }
  const body = JSON.parse(content), observations = body.source_spans;
  if (body.planning_exchange.round === 1) decisions++;
  const firstLength = mixedCanvas ? 60 : [45, 60, 45, 36][decisions - 1]!;
  const decision = { decision_version: 1, target_duration_ticks: firstLength + 30, thesis: "Two moving test patterns", shots: observations.map((item: any, index: number) => ({ shot_id: `shot-${index}`, timing: { kind: "exact" }, source_window: { span_id: item.span_id, asset_id: item.asset_id, start: time(0), end: time(index ? 30 : firstLength) }, purpose: "Observed moving pattern", embedded_gain_db: boundedGain, reframe: staticComposition ? { mode: "static_transform", scale: 1.5, x: -24, y: -16 } : null, color: null })), audio: [], captions: [], preserve_refs: [], applied_principle_ids: [], feedback_interpretation: body.request.original_text, change_summary: "Unequal observed pattern cuts" };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(planningFixtureExchange(body, decision)) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const priorLowResource = process.env.AVE_LOW_RESOURCE;
process.env.AVE_LOW_RESOURCE = "1";
const options = { now, creationRequestChannels: [{ credential, actor_id: "user-1" }], provider: "qwen", model: "fixture", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: { max_attempts: 1 as const, timeout_ms: 30000 } };
let host = new ProjectHostSession({ ...options, resourceGate: new ResourceGate(true) });
const contains = (error: any, code: string): boolean => Boolean(error?.code === code || error?.message?.includes(code) || error?.cause && contains(error.cause, code) || error?.errors?.some((item: unknown) => contains(item, code)));
const rejects = (code: string) => (error: unknown) => contains(error, code);
try {
  const files = [resolve(root, "moving-a.mp4"), resolve(root, "moving-b.mp4")];
  for (const [index, path] of files.entries()) await promisify(execFile)("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=3", "-f", "lavfi", "-i", `sine=frequency=${440 + index * 220}:sample_rate=48000:duration=3`, "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", "-c:a", "aac", "-t", "3", path]);
  await host.create(projectRoot);
  host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = await host.importMedia(files) as any[];
  const session = (host as any).session;
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  Object.assign(authorization, { asset_ids: imported.map(item => item.asset_id), provider: "qwen", model: "fixture", allowed_data: ["request", "timeline", "evidence", "frames", "audio"] });
  const generate = async (id: string) => {
    host.beginCreationRequest(credential, { ...authorization, request_id: id });
    for (const source of imported) await host.prepareCreationMaterial(credential, { operation_id: `${id}:${source.asset_id}`, request_id: id, asset_id: source.asset_id, asset_location_id: source.asset_location_id });
    const observation = await host.observeCreationMaterial(credential, { request_id: id, expected_revision: 1, material_operation_ids: imported.map(source => `${id}:${source.asset_id}`), include_audio: true });
    return host.generateCreationDraft(credential, { request_id: id, expected_revision: 1, observation_refs: [observation.ref], profile_query: null });
  };
  const draft = await generate("bounded-first");
  const project = session.manifest.project_id;
  const originalSubmit = (host as any).workerPort.submit.bind((host as any).workerPort);
  let segmentCalls = 0;
  (host as any).workerPort.submit = (task: string, input: any, control: any) => {
    if (task === "render.segment.v1" && ++segmentCalls === 2) throw new Error("FIXTURE_INTERRUPTED");
    return originalSubmit(task, input, control);
  };
  await assert.rejects(host.renderCreationDraft(credential, { request_id: "bounded-first", draft_id: draft.draft_id, operation_id: "interrupted" }), rejects("FIXTURE_INTERRUPTED"));
  assert.equal(session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='render_segment'").get().n, 1, "only a finished segment survives interruption");
  assert.equal(readCreationRender(session, project, "interrupted"), null, "interruption cannot publish a receipt");
  await host.close(); host = new ProjectHostSession({ ...options, resourceGate: new ResourceGate(true) }); await host.open(projectRoot);
  const reopened = (host as any).session, actualSubmit = (host as any).workerPort.submit.bind((host as any).workerPort), tasks: string[] = [], qcInputs: any[] = [];
  (host as any).workerPort.submit = (task: string, input: any, control: any) => { tasks.push(task); if (task === "qc.master.v1") qcInputs.push(input); return actualSubmit(task, input, control); };
  const location = (listAssetLocationsForAssets(reopened, project, [imported[0].asset_id]) as any[]).find(item => item.asset_location_id === imported[0].asset_location_id), permission = location.metadata.permission_decision;
  setAssetLocationPermission(reopened, project, imported[0].asset_id, imported[0].asset_location_id, { ...permission, permission_state: "denied" });
  try { await assert.rejects(host.renderCreationDraft(credential, { request_id: "bounded-first", draft_id: draft.draft_id, operation_id: "revoked" })); }
  finally { setAssetLocationPermission(reopened, project, imported[0].asset_id, imported[0].asset_location_id, permission); }
  assert.equal(readCreationRender(reopened, project, "revoked"), null, "revoked material cannot publish");
  const cached = reopened.db.prepare("SELECT s.object_path FROM object_refs r JOIN object_store s ON s.object_hash=r.object_hash WHERE r.object_type='render_segment_media' AND r.object_ref_id LIKE '%:video' LIMIT 1").get();
  assert.ok(cached);
  const savedBytes = await readFile(cached.object_path);
  try {
    await writeFile(cached.object_path, Buffer.alloc(savedBytes.length));
    await assert.rejects(host.renderCreationDraft(credential, { request_id: "bounded-first", draft_id: draft.draft_id, operation_id: "corrupt" }), rejects("RENDER_SEGMENT_CACHE_CORRUPT"));
  } finally { await writeFile(cached.object_path, savedBytes); }
  assert.equal(readCreationRender(reopened, project, "corrupt"), null, "corrupt checkpoint cannot publish");
  tasks.length = 0;
  const completed = await host.renderCreationDraft(credential, { request_id: "bounded-first", draft_id: draft.draft_id, operation_id: "resumed" });
  assert.equal(completed.receipt.schema_version, 2);
  assert.equal((completed.receipt.preview.qc_report as any).status, "passed");
  assert.equal((completed.receipt.master.qc_report as any).status, "passed");
  assert.equal(tasks.filter(task => task === "render.segment.v1").length, 3, "first of four target-specific segments is reused after reopen");
  assert.equal(tasks.filter(task => task === "render.segment.assemble.v1").length, 2);
  assert.equal(tasks.filter(task => task === "qc.master.v1").length, 2);
  assert.deepEqual(qcInputs.map(item => item.source_identity.render_graph_source_kind).sort(), ["original", "proxy"]);
  assert.ok(readCreationRender(reopened, project, "resumed"));
  const previousReceipt = readCreationRender(reopened, project, "resumed").object_hash;
  let cancelled = false;
  (host as any).workerPort.submit = (task: string, input: any, control: any) => actualSubmit(task, input, task === "render.segment.assemble.v1" ? { ...control, onProgress: (value: number) => { control?.onProgress?.(value); if (!cancelled && value > 0) { cancelled = true; host.cancelCreationRequest(credential, "bounded-first"); } } } : control);
  await assert.rejects(host.renderCreationDraft(credential, { request_id: "bounded-first", draft_id: draft.draft_id, operation_id: "cancelled" }));
  assert.equal(cancelled, true, "the user cancelled an active assembly producer");
  assert.equal(readCreationRender(reopened, project, "cancelled"), null);
  assert.equal(readCreationRender(reopened, project, "resumed").object_hash, previousReceipt, "cancellation preserves the successful historical receipt");
  console.log("bounded Stage3 Host: interrupted checkpoints resume after reopen and both targets pass QC");
} finally {
  try { await host.close(); } finally {
    if (priorLowResource === undefined) delete process.env.AVE_LOW_RESOURCE; else process.env.AVE_LOW_RESOURCE = priorLowResource;
    await rm(root, { recursive: true, force: true });
  }
}
