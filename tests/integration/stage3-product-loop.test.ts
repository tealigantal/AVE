import { fixtureSkillExchange } from "../fixtures/stage3/skill-planning.js";
import assert from "node:assert/strict";
import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";
import { readCreationDraftExecution, readCreationRender, hasCreationRenderFailure, readCreationState, readCreationLearningAttempt } from "../../packages/platform/project-storage/src/public.js";


// Controlled provider follows the production v3 measured-receipt/final exchange; observations and learning are unchanged.
function planningFixtureExchange(context: any, decision: any): any {
  const shots = decision.shots.map(({ source_window, ...shot }: any) => ({ ...shot, source_choice: { kind: "custom_window", source_window } }));
  const query_id = context.planning_exchange.assigned_query_id;
  assert.equal(typeof query_id, "string");
  if (context.planning_exchange.phase === "measure-only") {
    const original = context.request.original_text, revision = context.request.revisions.at(-1);
    const ticksPerSecond = Number(context.timeline.sequence.timebase.timescale) / Number(context.timeline.sequence.timebase.value);
    let duration_constraint;
    if (original === "做一个2-3秒的视频") {
      if (revision.revision === 3) duration_constraint = { kind: "minimum", minimum_ticks: 2 * ticksPerSecond, maximum_ticks: null, reason: "The current revision sets a two-second lower bound." };
      else if ([5, 6].includes(revision.revision)) duration_constraint = { kind: "exact", minimum_ticks: 45, maximum_ticks: 45, reason: "This local edit retains the current 45-tick work." };
      else if (revision.revision === 7) duration_constraint = { kind: "range", minimum_ticks: 54, maximum_ticks: 66, reason: "The current revision requests approximately two seconds." };
      else duration_constraint = { kind: "range", minimum_ticks: 2 * ticksPerSecond, maximum_ticks: 3 * ticksPerSecond, reason: "The request explicitly gives a two-to-three-second range." };
    } else if (original === "总时长至少2秒") duration_constraint = { kind: "minimum", minimum_ticks: 2 * ticksPerSecond, maximum_ticks: null, reason: "The request explicitly sets a two-second lower bound." };
    else if (["做一个1秒视频", "做一个1秒的视频"].includes(original)) duration_constraint = { kind: "range", minimum_ticks: Math.ceil(ticksPerSecond * 0.8), maximum_ticks: Math.floor(ticksPerSecond * 1.2), reason: "The request asks for approximately one second." };
    else if (original === "做一个vlog") duration_constraint = { kind: "none", minimum_ticks: null, maximum_ticks: null, reason: "This request does not set a whole-work duration." };
    else throw new Error(`Add an explicit fixture duration interpretation for ${original}`);
    return fixtureSkillExchange(context, { exchange_version: 3, kind: "measure_selection", query_id, target_duration_ticks: decision.target_duration_ticks, duration_constraint, selection: shots.map((shot: any) => ({ selection_id: shot.shot_id, source_choice: shot.source_choice, timing: shot.timing })) }, decision);
  }
  assert.equal(context.planning_exchange.round, 2, "Full-body evaluation/measurement and final are exactly two calls, without retry");
  assert.equal(context.planning_exchange.exchanges.length, 1);
  const receipt = context.planning_exchange.feasible_receipts.at(-1);
  // Deliberately preserve the infeasible-final negative case; never fabricate a feasible receipt.
  const measured_query_id = receipt ? receipt.query_id : context.planning_exchange.exchanges[0].exchange.query_id;
  const measurement_receipt_digest = receipt ? receipt.measurement_receipt_digest : "0".repeat(64);
  assert.equal(context.planning_exchange.exchanges[0].exchange.query_id, measured_query_id);
  const { decision_version, target_duration_ticks, shots: originalShots, ...creative } = decision;
  return fixtureSkillExchange(context, { exchange_version: 3, kind: "final", measured_query_id, measurement_receipt_digest, creative: { ...creative, shots: originalShots.map(({ source_window, source_choice, timing, ...shot }: any) => shot) } }, decision);
}

// Engineering fixture: real codecs, Host, SQLite and render; model output is controlled.
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-product-loop-")), credential = {};
const now = () => Date.parse("2026-09-27T01:00:00Z");
const profile = new ProfileRepository(resolve(root, "profile"), "test-profile", credential, now);
let generationAttempts = 0, observationCalls = 0, learningCalls = 0, fixtureChoiceOffset = 0;
let physicalPlanningCalls = 0;
let cancelLearning = false, learningEntered!: () => void;
let insufficientCapacity = false;
let visualAnchorFixture: "none" | "outside" | "trimmed-away" | "valid" = "none";
let visualAnchorChoice = 0;
let wrongDuration = false, durationFollowup = false, mixedGridFixture = false, clearWrongDurationOnce = false;
let schemaFaultsRemaining = 0, cancelAfterSchema = false, malformedJsonOnce = false, emitMalformedJson = false;
let invalidFinalCaptionOnce = false;
let latestGenerationContext: any;
let latestProviderText!: string;
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
const provider = createQwenProvider({ api_key: "fixture", models: [{ model: "fixture", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  const content = JSON.parse(init!.body as string).messages[0].content;
  let output: unknown;
  if (Array.isArray(content)) {
    observationCalls++;
    const input = JSON.parse(content[0].text);
    output = { samples: input.samples.map((item: any) => ({ sample_id: item.sample_id, description: "Explicit synthetic engineering fixture", uncertain: false, transcript: [] })) };
  } else {
    const input = JSON.parse(content);
    if (input.learning_event) {
      learningCalls++;
      if (cancelLearning) {
        learningEntered();
        await new Promise((_resolve, reject) => { const signal = init!.signal!; const abort = () => reject(signal.reason); signal.addEventListener("abort", abort, { once: true }); if (signal.aborted) abort(); });
      }
      output = input.learning_event.data_type === "selection"
        ? { principles: [{ dimension: "pacing", statement: "Explicit adoption engineering fixture only", contexts: ["test-adoption"], exceptions: [], evidence_refs: [input.learning_event.facts[0].fact_id] }], no_inference_reason: null }
        : { principles: [], no_inference_reason: "One request is not evidence of a lasting preference." };
    } else {
    physicalPlanningCalls++;
    if (input.planning_exchange.round === 1) generationAttempts++;
    assert.match(input.task, /JSON/, "JSON response mode requires an explicit JSON instruction");
    latestGenerationContext = input;
    for (const span of input.source_spans) {
      assert.deepEqual(Object.keys(span.source_coverage), ["restriction"], "raw stream bounds stay outside the generation selection context");
      assert.ok(span.editable_start && span.editable_end, "Wire retains exact source bounds");
      for (const sample of span.observations.filter((item: any) => item.kind === "visual")) {
        assert.ok(sample.sample_at); assert.equal(typeof sample.description, "string");
        for (const field of ["start_pts", "end_pts", "timescale"]) assert.equal(Object.hasOwn(sample, field), false);
        assert.equal(typeof sample.option_id, "string"); assert.match(sample.maximum_duration_ticks, /^\d+$/); if (sample.source_window === null) assert.equal(sample.maximum_duration_ticks, "0"); else { assert.equal(sample.source_window.span_id, span.span_id); assert.equal(sample.source_window.asset_id, span.asset_id); }
      }
    }
    const editableWindow = (span: any) => ({ span_id: span.span_id, asset_id: span.asset_id, start: span.editable_start, end: span.editable_end });
    const spans = (generationAttempts - fixtureChoiceOffset) % 2 ? input.source_spans : [...input.source_spans].reverse();
    output = { decision_version: 1, target_duration_ticks: wrongDuration ? 30 : 75, thesis: "Controlled output", shots: spans.map((item: any, index: number) => ({ shot_id: `shot-${index}`, timing: wrongDuration ? { kind: "exact" } : { kind: "weighted", weight: index ? 2 : 3 }, source_window: wrongDuration ? { ...editableWindow(item), end: time(15) } : editableWindow(item), purpose: "Selected controlled interval", embedded_gain_db: -6, reframe: null, color: null })), audio: [], captions: [], preserve_refs: input.request.revisions.at(-1).preserve_refs, applied_principle_ids: [], feedback_interpretation: input.request.revisions.at(-1).raw_text, change_summary: "Actual source cuts" };
    if (clearWrongDurationOnce && input.planning_exchange.round === 1) { wrongDuration=false; clearWrongDurationOnce=false; }
    if (visualAnchorFixture !== "none") {
      const options = input.source_spans[0].observations.filter((item: any) => item.kind === "visual" && item.source_window !== null && Number(item.maximum_duration_ticks) >= 30);
      const option = options[visualAnchorFixture === "valid" ? visualAnchorChoice : 0];
      if (visualAnchorFixture !== "valid") assert.equal(option.source_window.start.value, 0);
      const source_window = visualAnchorFixture === "valid" ? option.source_window : { ...option.source_window, start: time(6), end: time(visualAnchorFixture === "outside" ? 39 : 60) };
      output = { ...(output as any), target_duration_ticks: 30, shots: [{ ...(output as any).shots[0], source_window, timing: { kind: "weighted", weight: 1 } }] };
    }
    if (insufficientCapacity) output = { ...(output as any), target_duration_ticks: 75, shots: (output as any).shots.map((shot: any) => ({ ...shot, timing: { kind: "weighted", weight: 1000 }, source_window: { ...shot.source_window, start: time(0), end: time(15) } })) };
    if (durationFollowup) {
      const target = input.request.revisions.at(-1).revision === 7 ? 60 : 45;
      const clips = input.timeline.tracks.filter((track: any) => track.kind === "video").flatMap((track: any) => track.clips);
      const shots = clips.map((clip: any) => ({ shot_id: clip.clip_id, timing: { kind: "exact" }, source_window: { span_id: input.source_spans.find((span: any) => span.asset_id === clip.source.asset_id).span_id, asset_id: clip.source.asset_id, start: { schema_version: 1, value: Number(clip.source.start_pts), timescale: Number(clip.source.timescale) }, end: { schema_version: 1, value: Number(clip.source.end_pts), timescale: Number(clip.source.timescale) } }, purpose: "Retain creator-selected source", embedded_gain_db: clip.gain_db, reframe: null, color: null }));
      if (target > clips.reduce((sum: number, clip: any) => sum + Number(clip.timeline_duration), 0)) {
        const extra = input.source_spans.find((span: any) => span.asset_id !== clips[0].source.asset_id);
        shots.push({ shot_id: "new-after-preserved", timing: { kind: "weighted", weight: 1 }, source_window: editableWindow(extra), purpose: "Extend only after preserved content", embedded_gain_db: -6, reframe: null, color: null });
      }
      const captionEvidence = input.source_spans.find((span: any) => span.asset_id === clips[0].source.asset_id).observations.find((observation: any) => observation.kind === "visual").evidence_id;
      output = { ...(output as any), target_duration_ticks: target, shots, captions: [{ caption_id: "duration-followup-caption", shot_id: shots[0].shot_id, offset: time(0), duration: time(15), text: `Caption revision ${input.request.revisions.length}`, kind: "editorial", evidence_ids: [captionEvidence], audio_anchor: null }] };
    }
    if (mixedGridFixture) {
      const span = input.source_spans[0];
      output = { ...(output as any), target_duration_ticks: 24000, shots: [1, 3].map((weight, index) => ({ shot_id: `grid-${index}`, timing: { kind: "weighted", weight }, source_window: editableWindow(span), purpose: "Explicit synthetic mixed-grid cut", embedded_gain_db: 0, reframe: null, color: null })), audio: [], captions: [] };
    }
    output = planningFixtureExchange(input, output);
    if (invalidFinalCaptionOnce && (output as any).kind === "final") {
      invalidFinalCaptionOnce = false;
      const first = (output as any).creative.shots[0];
      const visual = input.source_spans.flatMap((span: any) => span.observations).find((item: any) => item.kind === "visual");
      (output as any).creative.captions = [{ caption_id: "out-of-range", shot_id: first.shot_id, offset: time(1000), duration: time(15), text: "synthetic", kind: "editorial", evidence_ids: [visual.evidence_id], audio_anchor: null }];
    }
    if (malformedJsonOnce && input.planning_exchange.round === 1) { malformedJsonOnce=false; emitMalformedJson=true; }
    if (schemaFaultsRemaining > 0 && input.planning_exchange.round === 1) { schemaFaultsRemaining--; (output as any).selection = "invalid selection"; if (cancelAfterSchema) { cancelAfterSchema=false; host.cancelCreationRequest(credential,"schema-cancel"); } }
    }
  }
  latestProviderText = emitMalformedJson ? "{invalid" : JSON.stringify(output); emitMalformedJson=false;
  return new Response(JSON.stringify({ choices: [{ message: { content: latestProviderText }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const host = new ProjectHostSession({ now, profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "fixture-user" }], provider: "qwen", model: "fixture", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: { max_attempts: 1, timeout_ms: 30000 } });
const code = (expected: string) => (error: any) => error.code === expected;
try {
  const paths = [resolve(root, "a.mp4"), resolve(root, "b.mp4")];
  for (const [index, path] of paths.entries()) await promisify(execFile)("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=3", "-f", "lavfi", "-i", `sine=frequency=${440 + index * 150}:sample_rate=48000:duration=${index ? 2.95 : 3}`, "-vf", `hue=h=${index * 50},setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-t", "3", path]);
  const project = resolve(root, "project");
  await host.create(project); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = await host.importMedia(paths) as any[];
  const duplicatePath = resolve(root, "a-copy.mp4"); await copyFile(paths[0]!, duplicatePath);
  const duplicateOriginal = (await host.importMedia([duplicatePath]))[0] as any;
  assert.equal(duplicateOriginal.asset_id, imported[0].asset_id); assert.notEqual(duplicateOriginal.asset_location_id, imported[0].asset_location_id);
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  Object.assign(authorization, { request_id: "product", original_text: "做一个2-3秒的视频", expires_at: "2027-01-01T00:00:00Z", asset_ids: imported.map(item => item.asset_id), original_locations: [duplicateOriginal, imported[1]].map(item => ({ asset_id: item.asset_id, asset_location_id: item.asset_location_id })), provider: "qwen", model: "fixture", allowed_data: ["request", "timeline", "evidence", "frames", "audio", "transcript", "feedback"] });
  host.beginCreationRequest(credential, authorization);
  const produce = (revision: number) => host.produceCreation(credential, { request_id: "product", expected_revision: revision, profile_query: null });
  const [first, duplicate] = await Promise.all([produce(1), produce(1)]);
  assert.deepEqual(duplicate, first); assert.equal(generationAttempts, 1); assert.equal(physicalPlanningCalls, 2, "one logical generation is two physical planner calls: full-body evaluation/measurement and final"); assert.equal(observationCalls, 1);
  assert.equal(latestGenerationContext.source_spans.some((span: any) => span.source_coverage.restriction === "embedded-audio-intersection"), true, "real encoded shorter AAC audio exposes an explicit usable intersection instead of rejecting valid cuts");
  assert.ok(first.render_id);
  const original = host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: first.draft_id });
  assert.equal(original.version, first.timeline_version);
  assert.equal(host.readCreationDraftMaster(credential, { request_id: "product", draft_id: first.draft_id, render_id: first.render_id }).bytes.length > 0, true);
  await produce(1); assert.equal(generationAttempts, 1, "completed production resumes without repeating a paid generation");
  const ui = { forms: { message: "未发送的真实文本" }, selected_request_id: "product", selected_draft_id: first.draft_id, selected_clip_id: "", library_open: false, panel_open: true, panel_tab: "chat" };
  host.saveCreationUi(credential, { expected_version: 0, value: ui });
  assert.throws(() => host.saveCreationUi(credential, { expected_version: 0, value: ui }), code("CREATION_UI_STALE"));
  assert.throws(() => host.readCreationUi({}), code("REQUEST_CHANNEL_DENIED"));
  await profile.configure(credential, { source_project_ids: [(host as any).session.manifest.project_id], data_types: ["feedback"], retention_until: "2027-01-01T00:00:00Z", external_provider: "qwen", enabled: true });
  host.reviseCreationRequest(credential, "product", 1, { raw_text: "保留总时长，换个顺序", viewed_timeline_version: first.timeline_version, preserve_refs: [] });
  cancelLearning = true;
  const enteredLearning = new Promise<void>(resolve => { learningEntered = resolve; });
  const interruptedProduction = produce(2), interruptedFailure = assert.rejects(interruptedProduction, (error: any) => error.code === "MODEL_CANCELLED" || error.code === "REQUEST_PROJECT_CLOSED");
  await enteredLearning;
  const committedBeforeClose = host.readCreationRequest("product").latest_draft_id!;
  const oldLearning = (await host.readCreationWorkspace(credential, { profile_query: null })).requests.find(item => item.authorization.request_id === "product")!.learning[0]!;
  const productionMap = (host as any).creationProductions as Map<string, any>, productionEntry = productionMap.get("product"); assert.ok(productionEntry);
  let releaseDiagnosticTail!: () => void, enterDiagnosticTail!: () => void;
  const diagnosticTail = new Promise<void>(resolve => { releaseDiagnosticTail = resolve; }), diagnosticTailEntered = new Promise<void>(resolve => { enterDiagnosticTail = resolve; });
  const fullProduction = productionEntry.promise.finally(async () => { enterDiagnosticTail(); await diagnosticTail; });
  const fullProductionFailure = assert.rejects(fullProduction, (error: any) => error.code === "MODEL_CANCELLED" && error.cause?.code === "REQUEST_PROJECT_CLOSED");
  productionMap.set("product", { ...productionEntry, promise: fullProduction });
  let closeCompleted = false, cancelledProductionRef: any, cancelledProductionBytes!: Buffer;
  const closing = host.close().then(() => { closeCompleted = true; });
  try {
    await diagnosticTailEntered; await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(closeCompleted, false, "Close must wait for the full production tail, not just inner model completion");
    const activeSession = (host as any).session; assert.ok(activeSession); assert.equal(activeSession.db.prepare("SELECT 1 AS alive").get().alive, 1, "SQLite stays open until production failure persistence and tail finish");
    cancelledProductionRef = activeSession.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key='product'").get(); assert.ok(cancelledProductionRef);
    cancelledProductionBytes = await readFile(resolve(project, "objects/sha256", cancelledProductionRef.object_hash.slice(0, 2), cancelledProductionRef.object_hash));
    const cancellation = JSON.parse(cancelledProductionBytes.toString()); assert.equal(cancellation.input_revision, 2); assert.equal(cancellation.error.code, "MODEL_CANCELLED"); assert.equal(cancellation.error.cause.code, "REQUEST_PROJECT_CLOSED");
  } finally { releaseDiagnosticTail(); }
  await Promise.all([closing, interruptedFailure, fullProductionFailure]);
  if (productionMap.get("product")?.promise === fullProduction) productionMap.delete("product");
  cancelLearning = false;
  await host.open(project);
  assert.ok((host as any).session.db.prepare("SELECT 1 FROM object_refs WHERE object_type='creation_production_failure' AND object_hash=?").get(cancelledProductionRef.object_hash));
  assert.deepEqual(await readFile(resolve(project, "objects/sha256", cancelledProductionRef.object_hash.slice(0, 2), cancelledProductionRef.object_hash)), cancelledProductionBytes, "Reopen preserves the exact diagnostic completed before database release");
  const beforeResume = host.readCreationRequest("product"), learningCallsBeforeResume = beforeResume.model_calls.length;
  const oldCall = beforeResume.model_calls.find(call => call.run_id === oldLearning.run_id)!;
  assert.equal(oldCall.settlement!.status, "cancelled");
  const beforeResumeJobs = host.listJobs().length;
  const registerLearning = profile.learn.bind(profile);
  (profile as any).learn = async () => { throw new Error("INJECTED_PROFILE_REGISTRATION_FAILURE"); };
  try {
    const partial = await produce(2);
    assert.equal(partial.draft_id, committedBeforeClose); assert.ok(partial.render_id);
    assert.equal(partial.warning?.phase, "authorized-feedback-learning"); assert.ok(partial.warning?.failure_id);
    const recorded = (host as any).session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND object_ref_id=?").get(`${(host as any).session.manifest.project_id}:creation-production-failure:${partial.warning!.failure_id}`);
    assert.ok(recorded, "partial outcome must link its durable failure record");
    const raw = await readFile(resolve(project,"objects/sha256",recorded.object_hash.slice(0,2),recorded.object_hash));
    const failure = JSON.parse(raw.toString()); assert.equal(failure.phase,"authorized-feedback-learning"); assert.match(failure.error.message,/INJECTED_PROFILE_REGISTRATION_FAILURE/);
  }
  finally { (profile as any).learn = registerLearning; }
  assert.equal(host.readCreationRequest("product").status, "watchable", "learning failure must not hide an already verified render");
  const callsBeforeRegistrationResume = learningCalls;
  const second = await produce(2);
  assert.equal(learningCalls, callsBeforeRegistrationResume, "saved extraction registration recovery must not resend learning");
  assert.equal(host.readCreationRequest("product").status, "watchable", "completed registration recovery restores verified product readiness");
  assert.equal(second.draft_id, committedBeforeClose, "explicit resume keeps the already committed draft");
  assert.equal(generationAttempts, 2, "learning resume cannot call generation"); assert.equal(observationCalls, 1);
  assert.equal(host.listJobs().length, beforeResumeJobs, "learning resume reuses both encoded outputs without new Worker jobs");
  const resumedState = host.readCreationRequest("product");
  assert.equal(resumedState.model_calls.length, learningCallsBeforeResume + 1);
  assert.deepEqual(resumedState.model_calls.find(call => call.run_id === oldLearning.run_id), oldCall, "cancelled paid call remains immutable");
  const learned = (await host.readCreationWorkspace(credential, { profile_query: null })).requests.find(item => item.authorization.request_id === "product")!.learning;
  assert.equal(learned.length, 2); assert.notEqual(learned[0]!.operation_id, learned[1]!.operation_id);
  assert.equal(learned.filter(item => item.extraction !== null).length, 1);
  assert.equal(learningCalls, 2, "authorized feedback is learned after its committed draft without a fabricated intent revision");
  assert.equal(host.readCreationRequest("product").revisions.length, 2);
  assert.equal(host.readCreationRequest("product").status, "watchable", "learning cannot erase verified playback readiness");
  await produce(2); assert.equal(learningCalls, 2, "completed automatic learning retains its original selection and is not resent");
  assert.equal(observationCalls, 1, "same authorized media observations are reused after intent change");
  const next = host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: second.draft_id });
  assert.notEqual(next.tracks[0]!.clips[0]!.source.asset_id, original.tracks[0]!.clips[0]!.source.asset_id);
  const selected = [{ draft_id: first.draft_id, clip_id: original.tracks[0]!.clips[0]!.clip_id }, { draft_id: second.draft_id, clip_id: next.tracks[0]!.clips[0]!.clip_id }];
  const combined = await host.combineCreationDrafts(credential, { request_id: "product", expected_revision: 2, expected_timeline_version: next.version, parent_draft_id: second.draft_id, operation_id: "combine-1", raw_text: "组合两版的开头", selections: selected, preserve_refs: [] });
  const merged = host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: combined.draft_id });
  assert.deepEqual(merged.tracks[0]!.clips.map(item => item.source), [original.tracks[0]!.clips[0]!.source, next.tracks[0]!.clips[0]!.source]);
  assert.deepEqual(merged.tracks[0]!.clips.map(item => item.timeline_start), [0n, 45n]);
  const receipt = readCreationDraftExecution((host as any).session, (host as any).session.manifest.project_id, combined.draft_id);
  assert.deepEqual(JSON.parse(receipt.value.source.input_json).composition.map((item: any) => ({ draft_id: item.draft_id, clip_id: item.clip_id })), selected);
  await host.close(); await host.open(project);
  assert.deepEqual(host.readCreationUi(credential), { version: 1, value: ui });
  assert.deepEqual(host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: combined.draft_id }), merged);
  host.reviseCreationRequest(credential, "product", 2, { raw_text: "总时长至少2秒", viewed_timeline_version: merged.version, preserve_refs: [] });
  wrongDuration = true;
  await assert.rejects(produce(3), (error: any) => error.code === "MODEL_OUTPUT_INVALID" && error.cause?.code === "CREATION_DURATION_TARGET_UNMET");
  fixtureChoiceOffset += 1; // The extra failed correction must not alter later fixture source ordering.
  assert.equal((host.readTimelineSnapshot() as any).version, merged.version, "hard target failure commits no incorrect draft");
  assert.equal(host.readCreationRequest("product").active_run, null);
  const failureRef = (host as any).session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' ORDER BY rowid DESC LIMIT 1").get();
  const diagnostic = JSON.parse(await readFile(resolve(project, "objects/sha256", failureRef.object_hash.slice(0, 2), failureRef.object_hash), "utf8"));
  assert.equal(diagnostic.error.code, "MODEL_OUTPUT_INVALID"); assert.equal(diagnostic.error.cause.code, "CREATION_DURATION_TARGET_UNMET");
  assert.equal(diagnostic.phase, "generation-and-commit"); assert.equal(diagnostic.input_revision, 3);
  assert.deepEqual(diagnostic.committed_draft_ids, []); assert.ok(diagnostic.error.stack); assert.equal(diagnostic.calls.length, 2);
  assert.equal(diagnostic.error.output_diagnostic.payload, latestProviderText!);
  assert.equal(diagnostic.error.output_diagnostic.sha256, createHash("sha256").update(latestProviderText!).digest("hex"));
  assert.equal(diagnostic.error.output_diagnostic.utf8_bytes, Buffer.byteLength(latestProviderText!));
  assert.equal(JSON.parse(diagnostic.error.output_diagnostic.payload).kind, "measure_selection");
  assert.equal(JSON.parse(diagnostic.error.output_diagnostic.payload).target_duration_ticks, 30, "rejected raw measurement target remains recoverable without fabricating a successful run");
  const failedCall = diagnostic.calls[0];
  assert.equal(failedCall.settlement.status, "failed"); assert.equal(failedCall.settlement.usage.output, 100);
  assert.match(failedCall.input_digest, /^[a-f0-9]{64}$/);
  assert.equal((host as any).session.db.prepare("SELECT COUNT(*) AS count FROM model_runs WHERE model_run_id = ?").get(failedCall.run_id).count, 0, "rejected provider output cannot register a successful model run");
  const savedBeforeReopen = JSON.stringify(diagnostic);
  await host.close(); await host.open(project);
  assert.equal((host.readTimelineSnapshot() as any).version, merged.version);
  assert.equal(JSON.stringify(JSON.parse(await readFile(resolve(project, "objects/sha256", failureRef.object_hash.slice(0, 2), failureRef.object_hash), "utf8"))), savedBeforeReopen);


  const restoreInput = { request_id: "product", expected_revision: 3, expected_timeline_version: merged.version, source_draft_id: first.draft_id, parent_draft_id: combined.draft_id, operation_id: "restore-first", raw_text: "Restore first cut", preserve_refs: [] };
  const restored = await host.restoreCreationDraft(credential, restoreInput);
  const restoredTimeline = host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: restored.draft_id });
  assert.deepEqual(restoredTimeline.tracks, original.tracks, "undo creates a new editable Timeline with the exact historical content");
  assert.equal(restoredTimeline.version, merged.version + 1);
  assert.equal(host.readCreationRequest("product").adopted_draft_id, null);
  await host.close(); await host.open(project);
  assert.deepEqual(host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: restored.draft_id }), restoredTimeline);
  const baseManual = { request_id: "product", expected_revision: 3, expected_timeline_version: restoredTimeline.version, parent_draft_id: restored.draft_id, operation_id: "caption-add", raw_text: "Add a manually authored caption", preserve_refs: [] };
  const caption = { caption_id: "manual-note", text: "Old note", timeline_start: 0n, timeline_duration: 15n, style: { font_size_ratio: 0.06 } };
  const added = await host.editCreationDraft(credential, { ...baseManual, commands: [{ type: "add_caption", track_id: original.tracks[0]!.track_id, caption }] });
  const editCaption = { ...baseManual, expected_timeline_version: added.edit_ref.timeline_version, parent_draft_id: added.draft_id, operation_id: "caption-replace", track_id: original.tracks[0]!.track_id, caption_id: caption.caption_id, text: "New creator words" };
  const changed = await host.editCreationCaption(credential, editCaption);
  const changedTimeline = host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: changed.draft_id });
  assert.deepEqual(changedTimeline.tracks[0]!.captions, [{ ...caption, text: "New creator words", style: { ...caption.style, layout_version: 1 } }]);
  await assert.rejects(host.editCreationCaption(credential, { ...editCaption, operation_id: "protected-caption", expected_timeline_version: changed.edit_ref.timeline_version, parent_draft_id: changed.draft_id, preserve_refs: [caption.caption_id], text: null }), /CREATION_PRESERVATION_REFERENCE_INVALID:manual-note/);
  assert.equal((host.readTimelineSnapshot() as any).version, changedTimeline.version, "protected caption deletion commits nothing");
  const removed = await host.editCreationCaption(credential, { ...editCaption, operation_id: "caption-remove", expected_timeline_version: changed.edit_ref.timeline_version, parent_draft_id: changed.draft_id, text: null });
  assert.deepEqual(host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: removed.draft_id }).tracks[0]!.captions, []);
  const replayRestore = await host.restoreCreationDraft(credential, restoreInput);
  assert.equal(replayRestore.draft_id, restored.draft_id);
  assert.equal(replayRestore.edit_ref.timeline_version, restored.edit_ref.timeline_version);
  assert.equal((host.readTimelineSnapshot() as any).version, removed.edit_ref.timeline_version, "historical restore replay cannot overwrite later work");
  const db = (host as any).session.db;
  db.exec("CREATE TEMP TRIGGER fail_ui BEFORE INSERT ON object_refs WHEN NEW.object_type='creation_ui' BEGIN SELECT RAISE(ABORT, 'INJECTED_UI_WRITE_FAILURE'); END");
  assert.throws(() => host.saveCreationUi(credential, { expected_version: 1, value: { ...ui, forms: { message: "failed write" } } }), /INJECTED_UI_WRITE_FAILURE/);
  assert.deepEqual(host.readCreationUi(credential), { version: 1, value: ui });
  db.exec("DROP TRIGGER fail_ui");
  host.reviseCreationRequest(credential, "product", 3, { raw_text: "Make a 2-3 second cut", viewed_timeline_version: removed.edit_ref.timeline_version, preserve_refs: [] });
  wrongDuration = false;
  const hold = (host as any).holdCreationSources.bind(host);
  (host as any).holdCreationSources = async (...args: any[]) => {
    await hold(...args);
    const handle = args[3][0].prepared.file_handle, close = handle.close.bind(handle);
    handle.close = async () => { await close(); throw new Error("INJECTED_SOURCE_CLOSE_ACK_FAILURE"); };
  };
  await assert.rejects(produce(4), (error: any) => error instanceof AggregateError && error.errors.some((cause: Error) => cause.message === "INJECTED_SOURCE_CLOSE_ACK_FAILURE"));
  (host as any).holdCreationSources = hold;
  const terminal = host.readCreationRequest("product");
  assert.equal(terminal.status, "failed", "postcommit resource failure is terminal without hiding its committed draft");
  assert.equal(terminal.drafts.at(-1)!.timeline_version, removed.edit_ref.timeline_version + 1);
  assert.equal(terminal.active_run, null);
  const beforeShort = host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: terminal.latest_draft_id! });
  const selectedClip = beforeShort.tracks[0]!.clips[0]!;
  const shortened = await host.combineCreationDrafts(credential, { request_id: "product", expected_revision: 4, expected_timeline_version: beforeShort.version, parent_draft_id: terminal.latest_draft_id!, operation_id: "manual-shorter", raw_text: "只保留这个镜头", selections: [{ draft_id: terminal.latest_draft_id!, clip_id: selectedClip.clip_id }], preserve_refs: [] });
  const shortenedTimeline = host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: shortened.draft_id });
  assert.equal(shortenedTimeline.tracks[0]!.clips[0]!.timeline_duration, 45n);
  durationFollowup = true;
  let current = { draft_id: shortened.draft_id, timeline_version: shortenedTimeline.version };
  for (const [expectedRevision, raw_text] of [[4, "只修改字幕"], [5, "保护镜头，保持当前总时长不变"]] as const) {
    host.reviseCreationRequest(credential, "product", expectedRevision, { raw_text, viewed_timeline_version: current.timeline_version, preserve_refs: [selectedClip.clip_id] });
    current = await produce(expectedRevision + 1);
    assert.equal(latestGenerationContext.planning_exchange.exchanges[0].exchange.duration_constraint.minimum_ticks, 45, "the model fixture retains the manual 1.5-second work for this local edit");
    assert.equal(host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: current.draft_id }).tracks[0]!.clips[0]!.timeline_duration, 45n);
  }
  host.reviseCreationRequest(credential, "product", 6, { raw_text: "总时长改到2秒，保护原有镜头", viewed_timeline_version: current.timeline_version, preserve_refs: [selectedClip.clip_id] });
  current = await produce(7);
  assert.deepEqual([latestGenerationContext.planning_exchange.exchanges[0].exchange.duration_constraint.minimum_ticks, latestGenerationContext.planning_exchange.exchanges[0].exchange.duration_constraint.maximum_ticks], [54, 66], "the new approximate duration overrides the earlier work duration");
  const expanded = host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: current.draft_id });
  assert.deepEqual(expanded.tracks[0]!.clips.map(clip => clip.timeline_duration), [45n, 15n]);
  await host.close(); await host.open(project);
  assert.deepEqual(host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: current.draft_id }), expanded);
  // A separate real encoded source has 1/30000 source units and 1/24000
  // Timeline ticks. Unequal weights deliberately yield off-source-unit ends.
  durationFollowup = false; insufficientCapacity = true;
  host.beginCreationRequest(credential, { ...authorization, request_id: "capacity-recovery" });
  const retryCapacity = () => host.produceCreation(credential, { request_id: "capacity-recovery", expected_revision: 1, profile_query: null });
  const capacityBase = (host.readTimelineSnapshot() as any).version, beforeCapacityCalls = generationAttempts;
  await assert.rejects(retryCapacity(), (error: any) => error.code === "MODEL_OUTPUT_INVALID" && error.cause?.code === "CREATION_PLANNING_BUDGET_EXCEEDED");
  assert.equal(generationAttempts, beforeCapacityCalls + 1, "capacity failure never automatically retries");
  assert.equal((host.readTimelineSnapshot() as any).version, capacityBase);
  assert.equal(host.readCreationRequest("capacity-recovery").drafts.length, 0);
  const failedCapacityCall = host.readCreationRequest("capacity-recovery").model_calls.at(-1)!;
  assert.equal((host as any).session.db.prepare("SELECT COUNT(*) AS count FROM model_runs WHERE model_run_id=?").get(failedCapacityCall.run_id).count, 0);
  const capacityFailureRow = (host as any).session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key='capacity-recovery'").get();
  const capacityFailurePath = resolve(project, "objects/sha256", capacityFailureRow.object_hash.slice(0,2), capacityFailureRow.object_hash), capacityFailureBytes = await readFile(capacityFailurePath);
  const capacityFailure = JSON.parse(capacityFailureBytes.toString());
  const observationsBeforeCapacityRetry = observationCalls;
  insufficientCapacity = false;
  await retryCapacity();
  assert.equal(generationAttempts, beforeCapacityCalls + 2); assert.equal(observationCalls, observationsBeforeCapacityRetry, "explicit continuation reuses exact saved observation, not perception/model sends");
  assert.equal(latestGenerationContext.previous_generation_failure, null, "An infeasible v2 final is not converted into a legacy rejected-decision diagnosis");
  assert.equal(capacityFailure.error.planning_diagnostic.rounds.length, 2);
  assert.equal(capacityFailure.error.planning_diagnostic.rounds[0].measurement.total_capacity_ticks, "30");
  assert.equal(capacityFailure.error.planning_diagnostic.rounds[0].measurement.deficit_ticks, "45");
  assert.equal(capacityFailure.error.planning_diagnostic.rounds[0].measurement.capacity_feasible, false);
  assert.deepEqual(latestGenerationContext.observation_refs, capacityFailure.error.creation_generation_binding.observation_refs);
  assert.equal(host.readCreationRequest("capacity-recovery").model_calls.at(-1)!.input_digest, failedCapacityCall.input_digest, "No unsupported legacy diagnosis is invented for the unchanged v2 root");
  assert.notEqual(host.readCreationRequest("capacity-recovery").model_calls.at(-1)!.run_id, failedCapacityCall.run_id, "Explicit continuation is a separate bounded planning run, never automatic retry");
  assert.deepEqual(await readFile(capacityFailurePath), capacityFailureBytes, "old failure remains unchanged");
  for (const failureKind of ["outside", "trimmed-away"] as const) {
    visualAnchorFixture = failureKind;
    const requestId = `visual-anchor-${failureKind}`;
    host.beginCreationRequest(credential, { ...authorization, request_id: requestId, original_text: "做一个1秒视频" });
    const retry = () => host.produceCreation(credential, { request_id: requestId, expected_revision: 1, profile_query: null });
    const baseVersion = (host.readTimelineSnapshot() as any).version; const beforeCalls: number = generationAttempts;
    await assert.rejects(retry(), (error: any) => error.code === "MODEL_OUTPUT_INVALID" && error.cause?.message?.startsWith("CREATION_SOURCE_UNOBSERVED:") === true);
    const failed = host.readCreationRequest(requestId), failedRun = failed.model_calls.at(-1)!;
    assert.equal(generationAttempts, beforeCalls + 1); assert.equal(failed.drafts.length, 0); assert.equal((host.readTimelineSnapshot() as any).version, baseVersion);
    assert.equal((host as any).session.db.prepare("SELECT COUNT(*) AS count FROM model_runs WHERE model_run_id=?").get(failedRun.run_id).count, 0, "Core-invalid candidate is not a successful model run");
    const failureRow = (host as any).session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key=?").get(requestId);
    const path = resolve(project, "objects/sha256", failureRow.object_hash.slice(0,2), failureRow.object_hash), bytes = await readFile(path), artifact = JSON.parse(bytes.toString());
    assert.match(artifact.error.cause.message, /^CREATION_SOURCE_UNOBSERVED:/); assert.equal(artifact.error.output_diagnostic.payload, latestProviderText);
    const beforeObservation: number = observationCalls;
    visualAnchorFixture = "valid"; await retry();
    assert.equal(generationAttempts, beforeCalls + 2); assert.equal(observationCalls, beforeObservation, "explicit new planner uses the unchanged real observation receipt");
    assert.deepEqual(await readFile(path), bytes);
    assert.equal(latestGenerationContext.previous_generation_failure.code, "CREATION_SOURCE_UNOBSERVED");
    assert.equal(latestGenerationContext.previous_generation_failure.previous_output_sha256, artifact.error.output_diagnostic.sha256);
    assert.equal(latestGenerationContext.previous_generation_failure.shots[0].reason, failureKind === "outside" ? "declared-window-has-no-visual-anchor" : "allocation-excluded-declared-visual-anchor");
    assert.ok(latestGenerationContext.previous_generation_failure.shots[0].nearby_observed_anchor_options.length > 0);
    assert.notEqual(host.readCreationRequest(requestId).model_calls.at(-1)!.input_digest, failedRun.input_digest, "bound source diagnostics create a new input identity");
    if (failureKind === "outside") {
      // Repeat the exact completed plan against the same existing work. A
      // successful model response is still not a new edit or draft.
      const timelineBeforeNoEdit = host.readTimelineSnapshot() as any, stateBeforeNoEdit = host.readCreationRequest(requestId);
      const recordsBeforeNoEdit = (host as any).session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key=?").all(requestId) as any[];
      host.reviseCreationRequest(credential, requestId, 1, { raw_text: "检查现有作品", viewed_timeline_version: timelineBeforeNoEdit.version, preserve_refs: [] });
      await assert.rejects(host.produceCreation(credential, { request_id: requestId, expected_revision: 2, profile_query: null }), (error: any) => error.code === "CREATION_NO_EDIT" && /未生成新版本/.test(error.message));
      const noEditState = host.readCreationRequest(requestId), noEditRun = noEditState.model_calls.at(-1)!;
      assert.deepEqual(host.readTimelineSnapshot(), timelineBeforeNoEdit, "no-op preserves the entire timeline and version");
      assert.equal(noEditState.drafts.length, stateBeforeNoEdit.drafts.length, "no-op cannot create a draft");
      const savedRun = (host as any).session.db.prepare("SELECT input_object_hash,output_object_hash FROM model_runs WHERE model_run_id=?").get(noEditRun.run_id);
      assert.ok(savedRun?.input_object_hash && savedRun?.output_object_hash, "completed model planning input and output remain registered");
      for (const hash of [savedRun.input_object_hash, savedRun.output_object_hash]) assert.ok((await readFile(resolve(project, "objects/sha256", hash.slice(0,2), hash))).length > 0);
      const afterRows = (host as any).session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key=?").all(requestId) as any[];
      const newRows = afterRows.filter(row => !recordsBeforeNoEdit.some(old => old.object_hash === row.object_hash));
      assert.equal(newRows.length, 1);
      const noEditFailure = JSON.parse(await readFile(resolve(project, "objects/sha256", newRows[0].object_hash.slice(0,2), newRows[0].object_hash), "utf8"));
      assert.equal(noEditFailure.error.code, "CREATION_NO_EDIT"); assert.deepEqual(noEditFailure.committed_draft_ids, []);
    }
    visualAnchorChoice++; // A different valid selected moment avoids an unrelated no-op edit in the shared fixture project.
  }
  visualAnchorFixture = "none";
  durationFollowup = false; mixedGridFixture = true;
  const mixedPath = resolve(root, "mixed-source.mp4"), mixedProject = resolve(root, "mixed-project");
  await promisify(execFile)("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30000/1001:d=3", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "3", "-c:a", "aac", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-video_track_timescale", "30000", mixedPath]);
  await host.close(); await host.create(mixedProject);
  host.initializeTimeline([], { sequence_id: "mixed", timebase: { value: 1n, timescale: 24000n }, tracks: [] });
  const mixedAssets = await host.importMedia([mixedPath]) as any[];
  host.beginCreationRequest(credential, { ...authorization, request_id: "mixed-grid", original_text: "做一个1秒的视频", asset_ids: mixedAssets.map(item => item.asset_id), original_locations: mixedAssets.map(item => ({ asset_id: item.asset_id, asset_location_id: item.asset_location_id })) });
  const mixedProduce = () => host.produceCreation(credential, { request_id: "mixed-grid", expected_revision: 1, profile_query: null });
  const actualRenderFixed = (host as any).renderFixedTimeline.bind(host);
  (host as any).renderFixedTimeline = async () => { throw new Error("INJECTED_RENDER_FAILURE_AFTER_COMMIT"); };
  const incompleteRender = await mixedProduce();
  assert.ok(incompleteRender.draft_id); assert.equal(incompleteRender.render_id, null);
  assert.equal(incompleteRender.warning?.phase, "preview-master-render"); assert.ok(incompleteRender.warning?.failure_id);
  const incompleteTimeline = host.readCreationDraftTimeline(credential, {request_id:"mixed-grid",draft_id:incompleteRender.draft_id});
  assert.equal(incompleteTimeline.version, incompleteRender.timeline_version);
  (host as any).renderFixedTimeline = actualRenderFixed;
  const failedMixed = host.readCreationRequest("mixed-grid"), failedRenderOperation = `produce-render:${failedMixed.latest_draft_id}`;
  assert.equal(failedMixed.status, "failed");
  assert.equal(failedMixed.drafts.length, 1, "render failure retains its exact committed draft");
  assert.equal(failedMixed.latest_draft_id, incompleteRender.draft_id);
  assert.equal(hasCreationRenderFailure((host as any).session, (host as any).session.manifest.project_id, failedRenderOperation), true);
  await assert.rejects(host.renderCreationDraft(credential, { request_id: "mixed-grid", draft_id: failedMixed.latest_draft_id!, operation_id: failedRenderOperation }), code("CREATION_RENDER_ATTEMPT_FAILED"), "old failed operation remains rejected");
  const callsBeforeResume = { generationAttempts, observationCalls };
  const [mixedDraft, concurrentResume] = await Promise.all([mixedProduce(), mixedProduce()]);
  assert.deepEqual(concurrentResume, mixedDraft, "concurrent resume shares one actual render attempt");
  assert.deepEqual({ generationAttempts, observationCalls }, callsBeforeResume, "corrected rendering never resends model work");
  assert.equal(mixedDraft.draft_id, failedMixed.latest_draft_id);
  assert.equal(mixedDraft.timeline_version, failedMixed.drafts[0]!.timeline_version);
  const mixedTimeline = host.readCreationDraftTimeline(credential, { request_id: "mixed-grid", draft_id: mixedDraft.draft_id });
  const mixedWorkspace = await host.readCreationWorkspace(credential, { profile_query: null });
  const correctedRenderOperation = mixedWorkspace.requests.find(item => item.authorization.request_id === "mixed-grid")!.drafts[0]!.renders.at(-1)!.operation_id;
  assert.notEqual(correctedRenderOperation, failedRenderOperation);
  assert.equal(hasCreationRenderFailure((host as any).session, (host as any).session.manifest.project_id, failedRenderOperation), true, "successful correction preserves the failed attempt");
  const silentReceipt = readCreationRender((host as any).session, (host as any).session.manifest.project_id, correctedRenderOperation);
  for (const target of ["preview", "master"] as const) {
    const report = silentReceipt.value[target].qc_report;
    assert.equal(report.status, "passed");
    assert.ok(report.issues.some((issue: any) => issue.code === "SILENCE" && !issue.blocker && issue.evidence.some((item: string) => item.includes("strict_digital_zero=true"))), "actual source-zero evidence survives Host render publication");
  }

  assert.deepEqual(mixedTimeline.tracks[0]!.clips.map(clip => clip.timeline_duration), [6001n, 17999n]);
  assert.equal(mixedTimeline.tracks[0]!.clips[0]!.source.end_pts * 30000n % mixedTimeline.tracks[0]!.clips[0]!.source.timescale !== 0n, true, "end remains exact despite not being an integer at the original source representation");
  assert.ok(mixedDraft.render_id);
  assert.ok(host.readCreationDraftMaster(credential, { request_id: "mixed-grid", draft_id: mixedDraft.draft_id, render_id: mixedDraft.render_id }).bytes.length > 0);
  // A different authorized outer request cannot relabel a forgotten, actual
  // adoption transition as new evidence. No generation or learning is resent.
  const selectionSession = (host as any).session, selectionProject = selectionSession.manifest.project_id;
  await profile.configure(credential, { source_project_ids: [selectionProject], data_types: ["selection"], retention_until: "2027-01-01T00:00:00Z", external_provider: "qwen", enabled: true });
  host.selectCreationVersion(credential, "mixed-grid", mixedDraft.draft_id, "adopted");
  const adoptedState = readCreationState(selectionSession, selectionProject, "mixed-grid");
  const adoption = { data_type: "selection" as const, state_ref: { request_id: "mixed-grid", sequence: adoptedState.value.sequence, digest: adoptedState.object_hash } };
  const learnedAdoption = await host.learnCreationExperience(credential, { request_id: "mixed-grid", expected_revision: 1, operation_id: "learn-adoption", selection: adoption, correction: null });
  await profile.forgetPrinciples(credential, learnedAdoption.registration.principle_ids);
  host.beginCreationRequest(credential, { ...authorization, request_id: "rewrapped-adoption", asset_ids: mixedAssets.map(item => item.asset_id), original_locations: mixedAssets.map(item => ({ asset_id: item.asset_id, asset_location_id: item.asset_location_id })) });
  const beforeReplayCalls = { generationAttempts, observationCalls, learningCalls }, beforeReplayProfile = await profile.control();
  await assert.rejects(host.learnCreationExperience(credential, { request_id: "rewrapped-adoption", expected_revision: 1, operation_id: "new-wrapper-old-adoption", selection: adoption, correction: null }), code("PROFILE_EVENT_EXCLUDED"));
  assert.deepEqual({ generationAttempts, observationCalls, learningCalls }, beforeReplayCalls);
  assert.deepEqual(await profile.control(), beforeReplayProfile);
  assert.equal(readCreationLearningAttempt(selectionSession, selectionProject, "new-wrapper-old-adoption"), null);
  await host.close(); await host.open(mixedProject);
  assert.deepEqual(host.readCreationDraftTimeline(credential, { request_id: "mixed-grid", draft_id: mixedDraft.draft_id }), mixedTimeline);
  // First malformed structured response gets one correction inside the same
  // five-send production budget; the old response remains a failed physical call.
  await host.close(); const correctionProject=resolve(root,"schema-correction-project"); await host.create(correctionProject);
  host.initializeTimeline([], {sequence_id:"main",timebase:{value:1n,timescale:30n},tracks:[]});
  const correctionAssets=await host.importMedia(paths) as any[]; mixedGridFixture=false; schemaFaultsRemaining=1;
  host.beginCreationRequest(credential,{...authorization,request_id:"schema-correction",original_text:"做一个vlog",asset_ids:correctionAssets.map(x=>x.asset_id),original_locations:correctionAssets.map(x=>({asset_id:x.asset_id,asset_location_id:x.asset_location_id}))});
  const correctionCallsBefore=physicalPlanningCalls;
  const corrected=await host.produceCreation(credential,{request_id:"schema-correction",expected_revision:1,profile_query:null});
  assert.ok(corrected.draft_id); assert.ok(corrected.render_id); assert.equal(physicalPlanningCalls-correctionCallsBefore,3);
  assert.equal(latestGenerationContext.previous_generation_failure.code,"CREATION_PLANNING_EXCHANGE_INVALID");
  const correctionState=host.readCreationRequest("schema-correction"), correctionPlanner=correctionState.model_calls.slice(-3);
  assert.equal(correctionState.model_calls.length,4,"one observation plus three bounded planning calls");
  assert.equal(correctionPlanner.length,3); assert.equal(correctionPlanner[0].settlement?.status,"failed"); assert.equal(correctionPlanner[1].settlement?.status,"response"); assert.equal(correctionPlanner[2].settlement?.status,"response");
  const correctionFailure=(host as any).session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key='schema-correction'").get(); assert.ok(correctionFailure);
  const correctionRecord=JSON.parse(await readFile(resolve(correctionProject,"objects/sha256",correctionFailure.object_hash.slice(0,2),correctionFailure.object_hash),"utf8"));
  assert.equal(correctionRecord.error.cause.code,"CREATION_PLANNING_EXCHANGE_INVALID"); assert.equal(correctionRecord.error.output_diagnostic.sha256,latestGenerationContext.previous_generation_failure.previous_output_sha256);
  // A malformed optional caption in a final response must trigger one bound
  // correction and remain visible after the saved project is reopened.
  host.beginCreationRequest(credential,{...authorization,request_id:"caption-correction",original_text:"做一个vlog",asset_ids:correctionAssets.map(x=>x.asset_id),original_locations:correctionAssets.map(x=>({asset_id:x.asset_id,asset_location_id:x.asset_location_id}))});
  invalidFinalCaptionOnce=true; const beforeCaption=physicalPlanningCalls;
  const captionRecovered=await host.produceCreation(credential,{request_id:"caption-correction",expected_revision:1,profile_query:null});
  assert.ok(captionRecovered.draft_id); assert.equal(physicalPlanningCalls-beforeCaption,4);
  assert.equal(latestGenerationContext.previous_generation_failure.code,"CREATION_CAPTION_RANGE_INVALID");
  await host.close(); await host.open(correctionProject);
  const captionWorkspace=await host.readCreationWorkspace(credential,{profile_query:null});
  assert.deepEqual(captionWorkspace.requests.find(request=>request.authorization.request_id==="caption-correction")!.drafts.find(draft=>draft.draft_id===captionRecovered.draft_id)!.planning_warning,{kind:"caption"});
  // A second malformed response is not retried again, and no invalid draft
  // is committed. The failed physical calls and both diagnostics remain.
  const initialTimeline = host.readTimelineSnapshot();
  host.beginCreationRequest(credential,{...authorization,request_id:"schema-twice",original_text:"做一个vlog",asset_ids:correctionAssets.map(x=>x.asset_id),original_locations:correctionAssets.map(x=>({asset_id:x.asset_id,asset_location_id:x.asset_location_id}))});
  schemaFaultsRemaining=2; const callsBeforeTwice=physicalPlanningCalls;
  await assert.rejects(host.produceCreation(credential,{request_id:"schema-twice",expected_revision:1,profile_query:null}),(error:any)=>error.code==="MODEL_OUTPUT_INVALID"&&error.cause?.code==="CREATION_PLANNING_EXCHANGE_INVALID");
  assert.equal(physicalPlanningCalls-callsBeforeTwice,2,"one corrective run, never a third malformed retry");
  const twice=host.readCreationRequest("schema-twice"); assert.equal(twice.drafts.length,0); assert.equal(twice.active_run,null); assert.deepEqual(host.readTimelineSnapshot(),initialTimeline);
  const twiceErrors=(host as any).session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key='schema-twice'").all(); assert.equal(twiceErrors.length,2);
  assert.equal(twice.model_calls.filter(call=>call.settlement?.status==="failed" && call.settlement.reason_code==="CREATION_PLANNING_EXCHANGE_INVALID").length,2);
  // A corrected run with two infeasible measurements ends before a final send.
  host.beginCreationRequest(credential,{...authorization,request_id:"schema-budget",original_text:"做一个vlog",asset_ids:correctionAssets.map(x=>x.asset_id),original_locations:correctionAssets.map(x=>({asset_id:x.asset_id,asset_location_id:x.asset_location_id}))});
  schemaFaultsRemaining=1; insufficientCapacity=true; const beforeBudget=physicalPlanningCalls;
  await assert.rejects(host.produceCreation(credential,{request_id:"schema-budget",expected_revision:1,profile_query:null}));
  insufficientCapacity=false; assert.equal(physicalPlanningCalls-beforeBudget,3,"two infeasible measurements end the corrected run without a final send");
  const budgetState=host.readCreationRequest("schema-budget"); assert.equal(budgetState.drafts.length,0); assert.deepEqual(host.readTimelineSnapshot(),initialTimeline);
  // Cancellation while the first bad response is returning precludes correction.
  host.beginCreationRequest(credential,{...authorization,request_id:"schema-cancel",original_text:"做一个vlog",asset_ids:correctionAssets.map(x=>x.asset_id),original_locations:correctionAssets.map(x=>({asset_id:x.asset_id,asset_location_id:x.asset_location_id}))});
  schemaFaultsRemaining=1; cancelAfterSchema=true; const beforeCancel=physicalPlanningCalls;
  await assert.rejects(host.produceCreation(credential,{request_id:"schema-cancel",expected_revision:1,profile_query:null}));
  assert.equal(physicalPlanningCalls-beforeCancel,1,"cancellation prevents a corrective send"); assert.equal(host.readCreationRequest("schema-cancel").drafts.length,0); assert.deepEqual(host.readTimelineSnapshot(),initialTimeline);
  // Invalid JSON receives the same single bounded correction as an invalid
  // object; the original bytes and physical call remain auditable.
  host.beginCreationRequest(credential,{...authorization,request_id:"schema-json",original_text:"做一个vlog",asset_ids:correctionAssets.map(x=>x.asset_id),original_locations:correctionAssets.map(x=>({asset_id:x.asset_id,asset_location_id:x.asset_location_id}))});
  malformedJsonOnce=true; const beforeJson=physicalPlanningCalls;
  const jsonRecovered=await host.produceCreation(credential,{request_id:"schema-json",expected_revision:1,profile_query:null});
  assert.ok(jsonRecovered.draft_id); assert.ok(jsonRecovered.render_id); assert.equal(physicalPlanningCalls-beforeJson,3);
  assert.equal(latestGenerationContext.previous_generation_failure.code,"CREATION_PLANNING_EXCHANGE_INVALID");
  const jsonFailure=(host as any).session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key='schema-json'").get(); assert.ok(jsonFailure);
  const jsonRecord=JSON.parse(await readFile(resolve(correctionProject,"objects/sha256",jsonFailure.object_hash.slice(0,2),jsonFailure.object_hash),"utf8"));
  assert.equal(jsonRecord.error.message,"model output is not valid JSON"); assert.equal(jsonRecord.error.output_diagnostic.payload,"{invalid");
  // A wrong target is corrected by the model using the actual hard budget;
  // the rejected first call never commits a too-short version.
  await host.close(); await host.create(resolve(root,"duration-correction-project"));
  host.initializeTimeline([], {sequence_id:"main",timebase:{value:1n,timescale:30n},tracks:[]});
  const durationAssets=await host.importMedia(paths) as any[];
  host.beginCreationRequest(credential,{...authorization,request_id:"duration-correction",original_text:"总时长至少2秒",asset_ids:durationAssets.map(x=>x.asset_id),original_locations:durationAssets.map(x=>({asset_id:x.asset_id,asset_location_id:x.asset_location_id}))});
  wrongDuration=true; clearWrongDurationOnce=true; const beforeDurationCorrection=physicalPlanningCalls;
  const durationCorrected=await host.produceCreation(credential,{request_id:"duration-correction",expected_revision:1,profile_query:null});
  assert.ok(durationCorrected.draft_id); assert.ok(durationCorrected.render_id); assert.equal(physicalPlanningCalls-beforeDurationCorrection,3);
  assert.equal(latestGenerationContext.previous_generation_failure.code,"CREATION_DURATION_TARGET_UNMET");
  const durationState=host.readCreationRequest("duration-correction"); assert.equal(durationState.drafts.length,1);
  assert.equal(durationState.model_calls.filter(call=>call.settlement?.status==="failed"&&call.settlement.reason_code==="CREATION_DURATION_TARGET_UNMET").length,1);
  console.log("Stage3 product loop: one-request real pipeline, deduplication, revision reuse, exact duration rejection, composition lineage and local UI reopen passed (controlled model fixture)");
} finally { await host.close(); await profile.close(); await rm(root, { recursive: true, force: true }); }
