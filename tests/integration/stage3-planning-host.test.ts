import { fixtureSkillExchange } from "../fixtures/stage3/skill-planning.js";
import { strict as assert } from "node:assert";
import { readFileSync, rmSync } from "node:fs";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { listModelRuns, readObjectSync, readCreationDraftExecution, putObjectSync } from "../../packages/platform/project-storage/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";
import type { CreationState } from "../../packages/platform/project-host/src/stage3-request.js";
import type { CreationGenerationInput } from "../../packages/platform/project-host/src/stage3-creative.js";

// Encoded synthetic sources + actual probe/Host/SQLite/compiler; HTTP is a local fixture.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-planning-")), run = promisify(execFile), credential = {};
const now = () => Date.parse("2026-09-23T01:00:00Z"), profile = new ProfileRepository(resolve(root, "profile"), "user-1", credential, now);
let host: ProjectHostSession | undefined, sends = 0, requestBody: any, returnedDecision: any, mutateDecision: ((decision: any) => void) | undefined;
let activeId = "";
let planMode: "direct" | "measure" | "wrong-query-id" | "exhaust" | "invalid" | "revise" | "forget" | "persist" | "catalog" | "pacing-bad" | "pacing-good" = "direct";
let afterSend: (() => void) | undefined;
const finalReply = (decision: any, control: any) => {
  const { decision_version: _version, target_duration_ticks: _target, shots, ...fields } = decision;
  const receipt=control.feasible_receipts.at(-1);
  return fixtureSkillExchange(requestBody, { exchange_version:3, kind:"final", measured_query_id:receipt?.query_id ?? control.exchanges.at(-1)?.exchange.query_id ?? "unmeasured", measurement_receipt_digest:receipt?.measurement_receipt_digest ?? "0".repeat(64), creative:{...fields,shots:shots.map(({source_window:_window,source_choice:_choice,timing:_timing,...shot}:any)=>shot)} }, decision);
};
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
const provider = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture-model", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  const content = JSON.parse(init!.body as string).messages[0].content;
  if (Array.isArray(content)) {
    const observation = JSON.parse(content[0].text);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ samples: observation.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: "Controlled synthetic sample", uncertain: false, transcript: [] })) }) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
  }
  sends += 1; requestBody = JSON.parse(content);
  assert.ok(requestBody.creative_brief);assert.equal(requestBody.creative_brief.includes("measured_query_id"),false);assert.equal(requestBody.creative_brief.includes("kind=final"),false);
  const observations = requestBody.source_spans, source = (index: number, end: number) => ({ span_id: observations[index].span_id, asset_id: observations[index].asset_id, start: time(0), end: time(end) });
  const decision = { decision_version: 1, target_duration_ticks: 75, thesis: "Synthetic red followed by blue", shots: [{ shot_id: "red-shot", timing: { kind: "exact" }, source_window: source(0, 45), purpose: "red", embedded_gain_db: -12, reframe: null, color: null }, { shot_id: "blue-shot", timing: { kind: "exact" }, source_window: source(1, 30), purpose: "blue", embedded_gain_db: -12, reframe: null, color: null }],
    audio: [{ audio_id: "tone", source: source(1, 30), shot_id: "blue-shot", offset: time(0), role: "music", gain_db: -9, fade_in: time(0), fade_out: time(0), purpose: "synthetic tone" }],
    captions: [{ caption_id: "label", shot_id: "red-shot", offset: time(0), duration: time(30), text: "Red test frame", kind: "editorial", evidence_ids: [observations[0].observations[0].evidence_id], audio_anchor: null }],
    preserve_refs: requestBody.request.revisions.at(-1).preserve_refs, applied_principle_ids: [], feedback_interpretation: requestBody.request.revisions.at(-1).raw_text, change_summary: "Create controlled unequal two-source draft" };
  mutateDecision?.(decision); returnedDecision = structuredClone(decision); afterSend?.();
  const round = requestBody.planning_exchange.round;
  if (planMode === "catalog") {
    const shots = [...decision.shots,{...decision.shots[0]!,shot_id:"third-shot"}].map(({ source_window, ...shot }, index) => ({ ...shot, source_choice: { kind: "catalog_option", option_id: observations[index % observations.length].observations.find((item: any)=>item.kind === "visual" && item.source_window !== null).option_id }, timing: { kind: "weighted", weight: 1 } }));
    const exchange = requestBody.planning_exchange.phase === "measure-only" ? { exchange_version: 3, kind: "measure_selection", query_id: requestBody.planning_exchange.assigned_query_id, target_duration_ticks:90, selection: shots.map(shot=>({selection_id:shot.shot_id,source_choice:shot.source_choice,timing:shot.timing})) } : finalReply({...decision,target_duration_ticks:90,shots},requestBody.planning_exchange);
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(fixtureSkillExchange(requestBody, exchange, decision))},finish_reason:"stop"}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}));
  }
  if (planMode === "pacing-bad" || planMode === "pacing-good") {
    const shots=decision.shots.map(({source_window,...shot},index)=>({...shot,source_choice:{kind:"custom_window",source_window:{...source_window,end:time(planMode==="pacing-good"?45:index===0?29:61)}}}));
    const exchange=requestBody.planning_exchange.phase === "measure-only"?{exchange_version:3,kind:"measure_selection",query_id:requestBody.planning_exchange.assigned_query_id,target_duration_ticks:90,selection:shots.map(shot=>({selection_id:shot.shot_id,source_choice:shot.source_choice,timing:shot.timing}))}:finalReply({...decision,target_duration_ticks:90,shots},requestBody.planning_exchange);
    return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(fixtureSkillExchange(requestBody, exchange, decision))},finish_reason:"stop"}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}));
  }
  if (planMode !== "direct" && (round === 1 || planMode === "exhaust")) {
    const query = { exchange_version: 3, kind: "measure_selection", query_id: requestBody.planning_exchange.assigned_query_id, target_duration_ticks: 75, selection: decision.shots.map((shot, index) => ({ selection_id: shot.shot_id, source_choice: { kind: "custom_window", source_window: { ...shot.source_window, end: time(planMode === "exhaust" ? 15 : index === 0 ? 45 : 30) } }, timing: planMode === "exhaust" ? { kind: "weighted", weight: 1 } : shot.timing })) };
    if (planMode === "wrong-query-id") query.query_id = "invented-or-reused";
    if (planMode === "invalid") query.selection[0]!.source_choice.source_window.end = time(3000);
    if (planMode === "forget") await profile.forgetSources(credential, ["unrelated-test-source"]);
    if (planMode === "revise") host!.reviseCreationRequest(credential, requestBody.request.current_revision.request_id ?? activeId, 1, { raw_text: "new current request", viewed_timeline_version: (host!.readTimelineSnapshot() as any).version, preserve_refs: [] });
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(fixtureSkillExchange(requestBody, query, decision)) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
  }
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(finalReply(decision,requestBody.planning_exchange)) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const options = { now, profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "user-1" }], provider: "qwen", model: "fixture-model", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 },
  creationModelPolicy: {   max_attempts: 1 as const, timeout_ms: 30000 } };
const errorCode = (expected: string) => (error: any) => error.code === expected || error.cause?.code === expected || error.message?.startsWith(expected + ":");
try {
  const paths = [resolve(root, "red.mp4"), resolve(root, "blue.mp4")];
  for (const [index, color] of ["red", "blue"].entries()) await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `color=c=${color}:s=64x64:r=30:d=3`, "-f", "lavfi", "-i", `sine=frequency=${440 + index * 220}:sample_rate=48000:duration=3`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-vf", "setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709", "-c:a", "aac", "-t", "3", paths[index]!]);
  host = new ProjectHostSession(options); await host.create(resolve(root, "project")); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  let session = (host as any).session;
  const projectId = session.manifest.project_id, imported = await host.importMedia(paths) as any[];
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = (JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")) as CreationState).authorization;
  Object.assign(authorization, { provider: "qwen", model: "fixture-model", asset_ids: imported.map(item => item.asset_id), allowed_data: ["request", "timeline", "evidence", "frames", "audio"] });
  const begin = async (id: string): Promise<CreationGenerationInput> => {
    activeId = id; host!.beginCreationRequest(credential, { ...authorization, request_id: id });
    for (const item of imported) await host!.prepareCreationMaterial(credential, { operation_id: `${id}:${item.asset_id}`, request_id: id, asset_id: item.asset_id, asset_location_id: item.asset_location_id });
    const observation = await host!.observeCreationMaterial(credential, { request_id: id, expected_revision: 1, material_operation_ids: imported.map(item => `${id}:${item.asset_id}`), include_audio: true });
    return { request_id: id, expected_revision: 1, observation_refs: [observation.ref], profile_query: { contexts: ["fixture-only"], except_principle_ids: [] } };
  };
  planMode = "measure";
  const firstInput = await begin("measured"), before = sends;
  const first = await host.generateCreationDraft(credential, firstInput);
  assert.equal(sends - before, 2, "one complete-rule measurement then final, no observation re-send");
  assert.equal(first.state.drafts.length, 1); assert.equal((host.readTimelineSnapshot() as any).version, 1);
  const model = listModelRuns(session, projectId).find((item: any) => item.model_run_id === first.model_run_id)!;
  assert.equal(model.metadata.audit.planning.rounds.length, 2);
  assert.equal(model.metadata.audit.planning.rounds[0].measurement.deficit_ticks, "0");
  assert.equal(model.metadata.audit.planning.rounds[0].measurement.capacity_feasible, true);
  assert.equal(first.state.model_calls.filter(call => call.run_id === first.model_run_id).length, 2);
  const execution = readCreationDraftExecution(session, projectId, first.draft_id); assert.ok(execution);
  // Tampering an otherwise immutable audit cannot be justified by self-consistent hashes.
  const metadata = structuredClone(model.metadata); metadata.audit.planning.rounds[1].transport.wire_digest = "0".repeat(64);
  session.db.exec("BEGIN IMMEDIATE");
  try { session.db.prepare("UPDATE model_runs SET metadata_json=? WHERE model_run_id=?").run(JSON.stringify(metadata), first.model_run_id); assert.throws(() => readCreationDraftExecution(session, projectId, first.draft_id), errorCode("CREATION_PLANNING_PROOF_INVALID")); }
  finally { session.db.exec("ROLLBACK"); }
  await host.close(); host = new ProjectHostSession(options); await host.open(resolve(root, "project")); session = (host as any).session;
  assert.ok(readCreationDraftExecution(session, projectId, first.draft_id), "reopen reconstructs both physical exchanges");
  for (const [mode, code, expectedSends] of [["wrong-query-id", "CREATION_PLANNING_QUERY_ID_MISMATCH", 1], ["invalid", "CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA", 1], ["exhaust", "CREATION_PLANNING_BUDGET_EXCEEDED", 1], ["revise", "REQUEST_REVISION_STALE", 1], ["forget", "PROFILE_SNAPSHOT_STALE", 1]] as const) {
    const input = await begin(mode); planMode = mode; const count = sends, version: number = (host.readTimelineSnapshot() as any).version, runs = listModelRuns(session, projectId).length;
    await assert.rejects(host.generateCreationDraft(credential, input), errorCode(code));
    assert.equal(sends - count, expectedSends); assert.equal((host.readTimelineSnapshot() as any).version, version); assert.equal(listModelRuns(session, projectId).length, runs); assert.equal(host.readCreationRequest(mode).drafts.length, 0);
    assert.equal((host as any).creationModelOperations.size, 0, "failed planning releases its controller/run resources");
  }
  const persistenceInput = await begin("persistence"); planMode = "measure";
  const savedPersist = (host as any).persistCreationTransition.bind(host); let rejectedSettlement = false;
  (host as any).persistCreationTransition = (current: any, next: any) => {
    if (!rejectedSettlement && next.model_calls.some((call: any) => call.settlement?.status === "response" && !current.model_calls.find((old: any) => old.call_id === call.call_id)?.settlement)) { rejectedSettlement = true; throw new Error("controlled planning settlement persistence failure"); }
    return savedPersist(current, next);
  };
  const persistenceBefore = sends, persistenceVersion = (host.readTimelineSnapshot() as any).version;
  try {
    await assert.rejects(host.generateCreationDraft(credential, persistenceInput), (error: any) => {
      assert.ok(error.planning_diagnostic.pending.provider_output.payload);
      assert.match(error.cause.message, /controlled planning settlement persistence failure/); return true;
    });
  } finally { (host as any).persistCreationTransition = savedPersist; }
  assert.equal(sends - persistenceBefore, 1); assert.equal((host.readTimelineSnapshot() as any).version, persistenceVersion); assert.equal(host.readCreationRequest("persistence").drafts.length, 0);
  const input = await begin("bad-final"); planMode = "measure"; mutateDecision = value => { value.shots[0].embedded_gain_db = 99; };
  // Measurement windows remain valid because the fixture explicitly selects legal windows;
  // only the final sound decoration is invalid, and must not cause a third send.
  const count = sends;
  await assert.rejects(host.generateCreationDraft(credential, input), errorCode("CREATION_PLANNING_EXCHANGE_INVALID"));
  assert.equal(sends - count, 2); assert.equal(host.readCreationRequest("bad-final").drafts.length, 0); mutateDecision = undefined;
  planMode = "direct"; const directInput = await begin("direct"), directBefore = sends;
  await assert.rejects(host.generateCreationDraft(credential, directInput), errorCode("CREATIVE_SKILL_FAILURE")); assert.equal(sends - directBefore, 1); assert.equal(host.readCreationRequest("direct").drafts.length,0);
  planMode = "catalog"; const catalogInput=await begin("catalog"), catalogBefore=sends;
  const catalogResult=await host.generateCreationDraft(credential,catalogInput);assert.equal(sends-catalogBefore,2);
  const catalogExecution=readCreationDraftExecution(session,projectId,catalogResult.draft_id);assert.ok(catalogExecution);
  const catalogTimeline=host.readTimelineSnapshot() as any;assert.equal(catalogTimeline.tracks.filter((track:any)=>track.kind==="video").flatMap((track:any)=>track.clips).reduce((sum:bigint,clip:any)=>sum+clip.timeline_duration,0n),90n);
  await host.close(); host=new ProjectHostSession(options);await host.open(resolve(root,"project"));session=(host as any).session;
  assert.ok(readCreationDraftExecution(session,projectId,catalogResult.draft_id),"catalog references reconstruct into the unchanged exact decision and execution after reopen");
  const noViewInput=await begin("no-view-pacing");host.reviseCreationRequest(credential,"no-view-pacing",1,{raw_text:"每个镜头更长",viewed_timeline_version:null,preserve_refs:[]});const noViewSends=sends;
  await assert.rejects(host.generateCreationDraft(credential,{...noViewInput,expected_revision:2}),errorCode("CREATION_PACING_REFERENCE_REQUIRED"));assert.equal(sends,noViewSends,"no viewed reference never silently borrows the current commit base or dispatches");
  const pacedInput=await begin("viewed-pacing");
  host.reviseCreationRequest(credential,"viewed-pacing",1,{raw_text:"正在看的原版本做成3秒，每个镜头更舒展。",viewed_timeline_version:1,preserve_refs:[]});
  planMode="pacing-bad";const paceBefore=sends, paceRuns=listModelRuns(session,projectId).length;
  await assert.rejects(host.generateCreationDraft(credential,{...pacedInput,expected_revision:2}),errorCode("CREATION_PACING_GOAL_UNMET"));
  assert.equal(sends-paceBefore,1);assert.equal(host.readCreationRequest("viewed-pacing").drafts.length,0);assert.equal(listModelRuns(session,projectId).length,paceRuns);
  assert.equal(requestBody.timeline.version,2);assert.equal(requestBody.pacing_reference.version,1);assert.equal(requestBody.pacing_budget.minimum_shot_ticks,"30","viewed v1 shortest30 is preserved separately from its mean37.5");
  assert.ok(requestBody.pacing_reference.snapshot_sha256);assert.equal((host.readTimelineSnapshot() as any).version,2);
  host.reviseCreationRequest(credential,"viewed-pacing",2,{raw_text:"仍以正在看的原版本做成3秒，每个镜头更舒展。",viewed_timeline_version:1,preserve_refs:[]});
  planMode="pacing-good";const paced=await host.generateCreationDraft(credential,{...pacedInput,expected_revision:3});assert.equal(paced.state.drafts.length,1);
  assert.ok(readCreationDraftExecution(session,projectId,paced.draft_id));
  console.log("Real Host planning dispatch/ledger/reopen/invalid-final/stale revision and no intermediate commit passed", root);
} finally { await host?.close(); await profile.close(); if (typeof global.gc === "function") global.gc(); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
