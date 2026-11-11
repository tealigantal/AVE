import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import { listModelRuns, readCreationDraftExecution, listAssetLocationsForAssets, setAssetLocationPermission } from "../../packages/platform/project-storage/src/public.js";
import { fixtureSkillExchange } from "../fixtures/stage3/skill-planning.js";

// Real Host, Worker and persistence; all provider traffic is an in-process fixture.
const root = await mkdtemp(resolve(tmpdir(), "ave-resume-host-")), credential = {};
const now = () => Date.parse("2026-09-23T01:00:00Z"), ffmpeg = promisify(execFile);
let refuseSecond = true, firstCalls = 0, secondCalls = 0, authorityCalls = 0;
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
const provider = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture-model", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  const content = JSON.parse(init!.body as string).messages[0].content;
  if (Array.isArray(content)) {
    const value = JSON.parse(content[0].text);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ samples: value.samples.map((item: any) => ({ sample_id: item.sample_id, description: "Synthetic source", uncertain: false, transcript: [] })) }) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
  }
  const input = JSON.parse(content), control = input.planning_exchange;
  if (control.round === 1) firstCalls++; else secondCalls++;
  if (control.round === 2 && refuseSecond) throw new Error("fixture guard refused before network");
  const spans = input.source_spans, source = (i: number, end: number) => ({ span_id: spans[i].span_id, asset_id: spans[i].asset_id, start: time(0), end: time(end) });
  const decision = { decision_version: 1, target_duration_ticks: 75, thesis: "Fixture", shots: [{ shot_id: "one", timing: { kind: "exact" }, source_window: source(0, 45), purpose: "one", embedded_gain_db: -12, reframe: null, color: null }, { shot_id: "two", timing: { kind: "exact" }, source_window: source(1, 30), purpose: "two", embedded_gain_db: -12, reframe: null, color: null }], audio: [], captions: [], preserve_refs: input.request.revisions.at(-1).preserve_refs, applied_principle_ids: [], feedback_interpretation: input.request.revisions.at(-1).raw_text, change_summary: "Fixture cut" };
  const { decision_version: _version, target_duration_ticks: _target, shots, ...creative } = decision;
  const exchange = control.round === 1
    ? { exchange_version: 3, kind: "measure_selection", query_id: control.assigned_query_id, target_duration_ticks: 75, selection: shots.map(shot => ({ selection_id: shot.shot_id, source_choice: { kind: "custom_window", source_window: shot.source_window }, timing: shot.timing })) }
    : { exchange_version: 3, kind: "final", measured_query_id: control.feasible_receipts.at(-1).query_id, measurement_receipt_digest: control.feasible_receipts.at(-1).measurement_receipt_digest, creative: { ...creative, shots: shots.map(({ source_window: _source, timing: _timing, ...shot }) => shot) } };
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(fixtureSkillExchange(input, exchange, decision)) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const trustedPlanningDispatch = { digest: "a".repeat(64), async resumeDispatch(_transport: unknown, send: () => Promise<Response>) { authorityCalls++; return send(); } };
const options = { now, creationRequestChannels: [{ credential, actor_id: "fixture-user" }], provider: "qwen", model: "fixture-model", modelProvider: provider, trustedPlanningDispatch, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: { max_attempts: 1 as const, timeout_ms: 30000 } };
let host: ProjectHostSession | undefined;
try {
  const paths = [resolve(root, "one.mp4"), resolve(root, "two.mp4")];
  for (const [i, path] of paths.entries()) await ffmpeg("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `testsrc2=s=64x64:r=30:d=3`, "-f", "lavfi", "-i", `sine=frequency=${440 + i * 150}:duration=3`, "-vf", `hue=h=${i * 50},setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-t", "3", path]);
  const project = resolve(root, "project");
  host = new ProjectHostSession(options); await host.create(project); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  let session = (host as any).session;
  const projectId = session.manifest.project_id, imported = await host.importMedia(paths) as any[];
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  host.beginCreationRequest(credential, { ...authorization, request_id: "resume", provider: "qwen", model: "fixture-model", asset_ids: imported.map(item => item.asset_id), allowed_data: ["request", "timeline", "evidence", "frames", "audio"] });
  const produce = () => host!.produceCreation(credential, { request_id: "resume", expected_revision: 1, profile_query: null });
  await assert.rejects(produce());
  assert.equal(firstCalls, 1); assert.equal(secondCalls, 1); assert.equal(authorityCalls, 0);
  const failed = host.readCreationRequest("resume"), oldCalls = structuredClone(failed.model_calls), failedPlanner = oldCalls.filter(call => call.input_digest === oldCalls.at(-1)!.input_digest);
  assert.deepEqual(failedPlanner.map(call => call.settlement?.status), ["response", "failed"]);
  (host as any).trustedPlanningDispatch = null;
  await assert.rejects(produce(), (error: any) => error?.code === "CREATION_RESUME_AUTHORITY_REQUIRED");
  assert.equal(firstCalls, 1); assert.equal(secondCalls, 1);
  (host as any).trustedPlanningDispatch = trustedPlanningDispatch;
  const original = (listAssetLocationsForAssets(session, projectId, [imported[0].asset_id]) as any[]).find(item => item.asset_location_id === imported[0].asset_location_id);
  setAssetLocationPermission(session, projectId, original.asset_id, original.asset_location_id, { ...original.metadata.permission_decision, permission_state: "denied" });
  await assert.rejects(produce());
  assert.equal(firstCalls, 1); assert.equal(secondCalls, 1, "a revoked source cannot dispatch a continuation");
  setAssetLocationPermission(session, projectId, original.asset_id, original.asset_location_id, original.metadata.permission_decision);
  refuseSecond = false;
  const [result, concurrent] = await Promise.all([produce(), produce()]);
  assert.deepEqual(concurrent, result);
  assert.equal(firstCalls, 1, "the successful first wire is never sent again");
  assert.equal(secondCalls, 2); assert.equal(authorityCalls, 1);
  const state = host.readCreationRequest("resume");
  assert.deepEqual(state.model_calls.slice(0, oldCalls.length), oldCalls, "historical calls and failure settlements remain immutable");
  const source = state.drafts.at(-1)!.source;
  assert.equal(source.kind, "model");
  if (source.kind !== "model") throw new Error("model draft required");
  const model = listModelRuns(session, projectId).find((item: any) => item.model_run_id === source.run_id);
  assert.equal(model.metadata.audit.planning.continuation.prior_round_call_refs[0].call_id, failedPlanner[0].call_id);
  assert.equal(model.metadata.audit.planning.rounds.length, 2);
  assert.ok(readCreationDraftExecution(session, projectId, result.draft_id));
  const altered = structuredClone(model.metadata), raw = altered.audit.planning.rounds[0].provider_output;
  raw.payload = JSON.stringify(JSON.parse(raw.payload), null, 2);
  raw.utf8_bytes = Buffer.byteLength(raw.payload); raw.sha256 = createHash("sha256").update(raw.payload).digest("hex");
  session.db.exec("BEGIN IMMEDIATE");
  try {
    session.db.prepare("UPDATE model_runs SET metadata_json=? WHERE model_run_id=?").run(JSON.stringify(altered), source.run_id);
    assert.throws(() => readCreationDraftExecution(session, projectId, result.draft_id), (error: any) => error?.code === "CREATION_PLANNING_PROOF_INVALID");
  } finally { session.db.exec("ROLLBACK"); }
  await host.close(); host = new ProjectHostSession(options); await host.open(project); session = (host as any).session;
  assert.ok(readCreationDraftExecution(session, projectId, result.draft_id), "persisted cross-run proof verifies after reopen");
  console.log("Planning continuation preserves old calls and resumes only the next exact wire (local fixture)");
} finally { await host?.close(); if (typeof global.gc === "function") global.gc(); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
