import { fixtureSkillExchange, fixtureSkillEffects } from "../fixtures/stage3/skill-planning.js";
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
const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-generation-")), run = promisify(execFile), credential = {};
const now = () => Date.parse("2026-09-23T01:00:00Z"), profile = new ProfileRepository(resolve(root, "profile"), "user-1", credential, now);
let host: ProjectHostSession | undefined, sends = 0, requestBody: any, returnedDecision: any, mutateDecision: ((decision: any) => void) | undefined;
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
  assert.equal(JSON.stringify(requestBody).includes("ambient_requirement_update"), false, "local typed actions must never enter any physical planning round");
  assert.equal(requestBody.creative_skills.projection_version,"effect-bindings-v3","new Host requests bind the strengthened projection version");
  if(requestBody.creative_skills.stage==="confirm")assert.deepEqual(requestBody.creative_skills.allowed_effect_bindings.map((item:any)=>item.definition_ref.object_id),requestBody.creative_skills.evaluations.filter((item:any)=>item.result==="applicable"&&item.disposition==="edit_proposed").map((item:any)=>item.skill_id));
  const observations = requestBody.source_spans, source = (index: number, end: number) => ({ span_id: observations[index].span_id, asset_id: observations[index].asset_id, start: time(0), end: time(end) });
  const decision = { decision_version: 1, target_duration_ticks: 75, thesis: "Synthetic red followed by blue", shots: [{ shot_id: "red-shot", timing: { kind: "exact" }, source_window: source(0, 45), purpose: "red", embedded_gain_db: -12, reframe: null, color: null }, { shot_id: "blue-shot", timing: { kind: "exact" }, source_window: source(1, 30), purpose: "blue", embedded_gain_db: -12, reframe: null, color: null }],
    audio: [{ audio_id: "tone", source: source(1, 30), shot_id: "blue-shot", offset: time(0), role: "music", gain_db: -9, fade_in: time(0), fade_out: time(0), purpose: "synthetic tone" }],
    captions: [{ caption_id: "label", shot_id: "red-shot", offset: time(0), duration: time(30), text: "Red test frame", kind: "editorial", evidence_ids: [observations[0].observations[0].evidence_id], audio_anchor: null }],
    preserve_refs: requestBody.request.revisions.at(-1).preserve_refs, applied_principle_ids: [], feedback_interpretation: requestBody.request.revisions.at(-1).raw_text, change_summary: "Create controlled unequal two-source draft" };
  mutateDecision?.(decision); returnedDecision = structuredClone(decision); if(requestBody.creative_skills?.stage === "confirm") returnedDecision.skill_effects = fixtureSkillEffects(requestBody, decision); afterSend?.();
  const choices = decision.shots.map(({ source_window, ...shot }: any) => ({ ...shot, source_choice: { kind: "custom_window", source_window } }));
  const duration_constraint = requestBody.request.current_revision.raw_text === "我改主意了，最终只做12秒，至少四个镜头，突出脚步和人物动作。这条插话覆盖刚才15秒要求，仍然只是本次要求。"
    ? { kind: "range", minimum_ticks: 330, maximum_ticks: 390, reason: "The current request replaces the earlier duration with approximately twelve seconds." }
    : { kind: "none", minimum_ticks: null, maximum_ticks: null, reason: "The controlled request has no current whole-work duration." };
  const exchange = requestBody.planning_exchange.phase === "measure-only" ? { exchange_version: 3, kind: "measure_selection", query_id: requestBody.planning_exchange.assigned_query_id, target_duration_ticks: decision.target_duration_ticks, duration_constraint, selection: choices.map((shot: any) => ({ selection_id: shot.shot_id, source_choice: shot.source_choice, timing: shot.timing })) } : finalReply(decision, requestBody.planning_exchange);
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(fixtureSkillExchange(requestBody, exchange, decision)) }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const options = { now, profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "user-1" }], provider: "qwen", model: "fixture-model", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 },
  creationModelPolicy: {   max_attempts: 1 as const, timeout_ms: 30000 } };
const errorCode = (expected: string) => (error: any) => error.code === expected || error.cause?.code === expected || error.message?.startsWith(expected + ":");
const bounded = async <T>(pending: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([pending, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error("generation did not settle after cancellation")), 3000); })]); }
  finally { clearTimeout(timer); }
};
try {
  const paths = [resolve(root, "red.mp4"), resolve(root, "blue.mp4")];
  for (const [index, color] of ["red", "blue"].entries()) await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", `color=c=${color}:s=64x64:r=30:d=3`, "-f", "lavfi", "-i", `sine=frequency=${440 + index * 220}:sample_rate=48000:duration=3`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-vf", "setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709", "-c:a", "aac", "-t", "3", paths[index]!]);
  host = new ProjectHostSession(options); await host.create(resolve(root, "project")); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const session = (host as any).session, projectId = session.manifest.project_id;
  const imported = await host.importMedia(paths) as any[], references = new Map<string, CreationGenerationInput["observation_refs"]>();
  const alternativeReferences = new Map<string, CreationGenerationInput["observation_refs"]>();
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = (JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")) as CreationState).authorization;
  Object.assign(authorization, { provider: "qwen", model: "fixture-model", asset_ids: imported.map(item => item.asset_id), original_locations: imported.map(item => ({ asset_id: item.asset_id, asset_location_id: item.asset_location_id })), allowed_data: ["request", "timeline", "evidence", "frames", "audio"] });
  const begin = async (id: string, ambient?: { version: 1; value: "require" | "clear" }, allowedData?: CreationState["authorization"]["allowed_data"]) => {
    const state = host!.beginCreationRequest(credential, { ...authorization, request_id: id, ...(allowedData ? { allowed_data: allowedData } : {}), ...(ambient ? { ambient_requirement_update: ambient } : {}) });
    for (const item of imported) await host!.prepareCreationMaterial(credential, { operation_id: `${id}:${item.asset_id}`, request_id: id, asset_id: item.asset_id, asset_location_id: item.asset_location_id });
    const observation = await host!.observeCreationMaterial(credential, { request_id: id, expected_revision: 1, material_operation_ids: imported.map(item => `${id}:${item.asset_id}`), include_audio: true });
    references.set(id, [observation.ref]);
    if (id === "main") {
      const second = await host!.observeCreationMaterial(credential, { request_id: id, expected_revision: 1, material_operation_ids: imported.map(item => `${id}:${item.asset_id}`), include_audio: true });
      alternativeReferences.set(id, [second.ref]);
      assert.deepEqual(second.value.spans, observation.value.spans, "two complete observations can share source spans but remain distinct model inputs");
    }
    return state;
  };
  const input = (id: string, revision = 1): CreationGenerationInput => ({ request_id: id, expected_revision: revision, observation_refs: references.get(id)!, profile_query: { contexts: ["private-empty-profile-context"], except_principle_ids: [] } });
  mutateDecision = decision => { decision.shots[0].color = { exposure: 0.1, contrast: 1, saturation: 1 }; };
  await begin("main", { version: 1, value: "clear" });
  const beforeDuplicate = sends, beforeDuplicateCalls = host.readCreationRequest("main").model_calls.length;
  await assert.rejects(host.generateCreationDraft(credential, { ...input("main"), observation_refs: [...references.get("main")!, ...alternativeReferences.get("main")!] }), errorCode("CREATION_SPAN_DUPLICATE"));
  await assert.rejects(host.generateCreationDraft(credential, { ...input("main"), evidence_refs: [] } as any), errorCode("CREATION_INPUT_INVALID"));
  assert.equal(sends, beforeDuplicate); assert.equal(host.readCreationRequest("main").model_calls.length, beforeDuplicateCalls);
  // Another request chooses a second imported location for the same content.
  // Its grant cannot make this request's explicit source selection ambiguous.
  const duplicatePath = resolve(root, "red-copy.mp4"); await cp(paths[0]!, duplicatePath);
  const duplicate = (await host.importMedia([duplicatePath]))[0] as any;
  assert.equal(duplicate.asset_id, imported[0].asset_id); assert.notEqual(duplicate.asset_location_id, imported[0].asset_location_id);
  host.beginCreationRequest(credential, { ...authorization, request_id: "other-location", original_locations: [{ asset_id: duplicate.asset_id, asset_location_id: duplicate.asset_location_id }, { asset_id: imported[1].asset_id, asset_location_id: imported[1].asset_location_id }] });
  await host.prepareCreationMaterial(credential, { operation_id: "other-location:red", request_id: "other-location", asset_id: duplicate.asset_id, asset_location_id: duplicate.asset_location_id });
  const first = await host.generateCreationDraft(credential, input("main"));
  const timeline = host.readTimelineSnapshot() as any;
  assert.equal(timeline.version, 1); assert.deepEqual(timeline.tracks.find((item: any) => item.kind === "video").clips.map((clip: any) => clip.timeline_duration), [45n, 30n]);
  assert.equal(first.state.adopted_draft_id, null); assert.equal(first.state.viewed_draft_id, null);
  const finalSchema = (requestBody.planning_exchange.response_schema.oneOf ?? [requestBody.planning_exchange.response_schema]).find((item: any) => item.properties.kind.const === "final").properties.creative;
  assert.equal(finalSchema.additionalProperties, false); assert.equal(finalSchema.properties.shots.items.required.includes("source_choice"), false); assert.equal(finalSchema.properties.shots.items.required.includes("timing"), false);
  assert.ok(requestBody.planning_exchange.response_schema.$defs.planning_source_window.allOf, "exact free-window source bounds remain in the one referenced definition");
  assert.equal(timeline.tracks[0].clips[0].grade.context.bit_depth, 8, "actual tagged probe permits executable color decisions");
  assert.equal(finalSchema.properties.applied_principle_ids.maxItems, 0, "cold start cannot cite invented learned provenance");
  assert.equal(requestBody.profile, null); assert.equal(JSON.stringify(requestBody).includes("private-empty-profile-context"), false);
  assert.equal(JSON.stringify(requestBody).includes(root.replaceAll("\\", "\\\\")), false, "local source paths never enter model input");
  const runs = listModelRuns(session, projectId); assert.equal(runs.length, 3); const generationRun = runs.find((item: any) => item.model_run_id === first.model_run_id)!;
  assert.deepEqual(JSON.parse(readObjectSync(session.projectDirectory, generationRun.output_object_hash).toString()), returnedDecision);
  assert.equal(session.db.prepare("SELECT count(*) AS n FROM object_refs WHERE object_type='creation_draft_execution'").get().n, 1);
  await begin("explicit-ambient", { version: 1, value: "require" });
  // Its production assertion runs at the end so this additional successful
  // draft does not alter the Timeline used by the existing checks below.
  const generation = readCreationDraftExecution(session, projectId, first.draft_id), swapped = { ...generation.value, source: { ...generation.value.source, observation_refs: alternativeReferences.get("main")! } };
  const swappedBytes = Buffer.from(JSON.stringify(swapped)), swappedObject = putObjectSync(session.projectDirectory, swappedBytes);
  session.db.exec("BEGIN IMMEDIATE");
  const workerBefore = (host as any).workerPort, submitBefore = workerBefore.submit.bind(workerBefore); let renderWorkers = 0;
  workerBefore.submit = (...args: any[]) => { renderWorkers += 1; return submitBefore(...args); };
  try {
    session.db.prepare("INSERT INTO object_store(object_hash,object_path,byte_length,created_at) VALUES (?,?,?,?)").run(swappedObject.hash, swappedObject.path, swappedBytes.length, new Date(now()).toISOString());
    session.db.prepare("UPDATE object_refs SET object_hash=? WHERE object_type='creation_draft_execution' AND relation_key=?").run(swappedObject.hash, first.draft_id);
    assert.throws(() => readCreationDraftExecution(session, projectId, first.draft_id), /CREATION_GENERATION_INPUT_REBOUND/);
    await assert.rejects(host.renderCreationDraft(credential, { operation_id: "tampered-generation", request_id: "main", draft_id: first.draft_id }), /CREATION_GENERATION_INPUT_REBOUND/);
    assert.equal(renderWorkers, 0, "a substituted observation receipt cannot start rendering");
  } finally { workerBefore.submit = submitBefore; session.db.exec("ROLLBACK"); rmSync(swappedObject.path); }

  host.reviseCreationRequest(credential, "main", 1, { raw_text: "Tighten red and change caption; preserve blue", viewed_timeline_version: 1, preserve_refs: ["blue-shot"] });
  mutateDecision = decision => { decision.shots[0].source_window.end = time(30); decision.target_duration_ticks = 60; decision.shots[0].color = { exposure: 0.1, contrast: 1, saturation: 1 }; decision.captions[0].text = "Revised red"; };
  const originalGate = profile.withSnapshot.bind(profile);
  (profile as any).withSnapshot = async (snapshot: any, action: any) => { const result = await originalGate(snapshot, action); if (host!.readCreationRequest("main").drafts.length === 2) host!.cancelCreationRequest(credential, "main"); return result; };
  const committedThenCancelled = await host.generateCreationDraft(credential, input("main", 2)); mutateDecision = undefined;
  (profile as any).withSnapshot = originalGate;
  assert.equal(committedThenCancelled.state.status, "cancelled"); assert.equal(committedThenCancelled.draft_id, committedThenCancelled.state.latest_draft_id, "cancellation after atomic commit cannot report no committed draft");
  const second = host.readTimelineSnapshot() as any; assert.equal(second.version, 2);
  assert.equal(second.tracks.find((item: any) => item.kind === "video").clips[1].timeline_start, 30n);
  assert.equal(second.tracks.find((item: any) => item.kind === "video").captions[0].text, "Revised red");
  assert.deepEqual(second.tracks.find((item: any) => item.kind === "video").captions[0].style, { layout_version: 1 });

  await begin("invented-principle");
  mutateDecision = decision => { decision.applied_principle_ids = ["principle:invented-general-rule"]; };
  await assert.rejects(host.generateCreationDraft(credential, input("invented-principle")), errorCode("CREATION_PRINCIPLE_UNKNOWN"));
  mutateDecision = undefined;
  assert.equal((host.readTimelineSnapshot() as any).version, 2);
  assert.equal(host.readCreationRequest("invented-principle").drafts.length, 0, "invalid provenance cannot publish a cold-start draft");

  await begin("unsupported-reframe");
  const runsBeforeReframe = listModelRuns(session, projectId).length;
  mutateDecision = decision => { decision.shots[0].reframe = { mode: "crop_fill", focal_x: 0.5, focal_y: 0.8 }; };
  await assert.rejects(host.generateCreationDraft(credential, input("unsupported-reframe")), errorCode("CREATION_REFRAME_UNSUPPORTED")); mutateDecision = undefined;
  assert.deepEqual((requestBody.planning_exchange.response_schema.oneOf ?? [requestBody.planning_exchange.response_schema]).find((item: any) => item.properties.kind.const === "final").properties.creative.properties.shots.items.properties.reframe.anyOf.map((item: any) => item.properties?.mode?.const ?? item.type), ["object", "static_transform", "manual_static_transform", "null"]);
  assert.ok(requestBody.source_spans.every((span: any) => JSON.stringify([...span.render_capabilities.static_reframe_modes].sort()) === JSON.stringify(["contain", "crop_fill", "blurred_background"].sort())));
  assert.equal(listModelRuns(session, projectId).length, runsBeforeReframe, "unexecutable reframe is rejected before successful model registration");
  assert.equal((host.readTimelineSnapshot() as any).version, 2); assert.equal(host.readCreationRequest("unsupported-reframe").drafts.length, 0);
  await begin("forged"); mutateDecision = decision => { decision.input_digest = "0".repeat(64); };
  await assert.rejects(host.generateCreationDraft(credential, input("forged")), errorCode("CREATION_PLANNING_EXCHANGE_INVALID")); mutateDecision = undefined;
  assert.equal((host.readTimelineSnapshot() as any).version, 2); assert.equal(host.readCreationRequest("forged").drafts.length, 0);

  await begin("manual"); afterSend = () => { host!.applyTimelineCommand({ type: "set_track_properties", track_id: "video-main", properties: { opacity: 0.9 } } as any, 2); };
  await assert.rejects(host.generateCreationDraft(credential, input("manual")), errorCode("REQUEST_BASE_STALE")); afterSend = undefined;
  assert.equal((host.readTimelineSnapshot() as any).version, 3); assert.equal(host.readCreationRequest("manual").drafts.length, 0);

  await begin("preparation"); const originalSnapshot = profile.snapshot.bind(profile); let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), reached = new Promise<void>(resolve => { entered = resolve; });
  (profile as any).snapshot = async (query: any) => { const value = await originalSnapshot(query); entered(); await gate; return value; };
  const before = sends, preparing = host.generateCreationDraft(credential, input("preparation"));
  const rejected = assert.rejects(preparing, errorCode("REQUEST_PROJECT_CLOSED")); await bounded(Promise.race([reached, preparing.then(()=>{throw new Error("generation settled before snapshot gate");},cause=>{throw cause;})]));
  await assert.rejects(host.generateCreationDraft(credential, input("preparation")), errorCode("REQUEST_RUN_ACTIVE"));
  await bounded(Promise.all([host.close(), rejected])); release(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(sends, before); (profile as any).snapshot = originalSnapshot;
  await host.open(resolve(root, "project")); assert.equal((host.readTimelineSnapshot() as any).version, 3);
  assert.equal(host.readCreationRequest("main").drafts.length, 2); assert.equal(host.readCreationRequest("preparation").drafts.length, 0);

  await begin("uncooperative-probe"); const worker = (host as any).workerPort, originalSubmit = worker.submit.bind(worker);
  let resolveFingerprint!: (value: any) => void, inspected!: () => void, probeSends = 0, cancellationSignal: AbortSignal | undefined;
  const fingerprintEntered = new Promise<void>(resolve => { inspected = resolve; });
  worker.submit = (task: string, value: any, control: any) => {
    if (task === "media.fingerprint.v1") { cancellationSignal = control.signal; inspected(); return new Promise(resolve => { resolveFingerprint = resolve; }); }
    if (task === "media.probe.v2") probeSends += 1;
    return originalSubmit(task, value, control);
  };
  const beforeProbe = sends, inspecting = host.generateCreationDraft(credential, input("uncooperative-probe"));
  const inspectionRejected = assert.rejects(inspecting, errorCode("REQUEST_PROJECT_CLOSED")); await bounded(fingerprintEntered);
  await bounded(Promise.all([host.close(), inspectionRejected])); assert.equal(cancellationSignal?.aborted, true);
  resolveFingerprint({ outputs: [{ kind: "media.fingerprint", algorithm: "sha256", digest: "f".repeat(64), byte_length: 1 }] });
  await new Promise(resolve => setImmediate(resolve)); worker.submit = originalSubmit;
  assert.equal(probeSends, 0, "late fingerprint must not start probe after project close"); assert.equal(sends, beforeProbe);
  await host.open(resolve(root, "project")); assert.equal((host.readTimelineSnapshot() as any).version, 3);
  assert.equal(host.readCreationRequest("uncooperative-probe").drafts.length, 0);
  // A creative goal that the model cannot fulfill is disclosed and remains
  // reviewable; it is not promoted to a text-pattern execution gate.
  host.applyTimelineCommand({ type: "set_track_properties", track_id: "video-main", properties: { opacity: 1 } } as any, 3);
  await begin("selection-goal");
  const goalBase = host.readTimelineSnapshot() as any;
  host.reviseCreationRequest(credential, "selection-goal", 1, { raw_text: "分成两个片段，重新选材和排序", viewed_timeline_version: goalBase.version, preserve_refs: [] });
  const reopenedSession = (host as any).session, goalRuns = listModelRuns(reopenedSession, projectId).length;
  mutateDecision = decision => { decision.shots.forEach((shot: any) => { shot.source_window.end = time(15); }); decision.target_duration_ticks = 30; decision.audio=[]; decision.captions=[]; decision.feedback_interpretation="Reselection could not be established; the existing sources were shortened."; decision.change_summary="Two shortened cuts; requested reselection remains unfulfilled."; };
  const incompleteSelection = await host.generateCreationDraft(credential, input("selection-goal", 2));
  assert.equal(requestBody.feedback_interpretation_policy,"model-advisory-v1");
  assert.equal(requestBody.feedback_goals.shot_count,null);assert.equal(requestBody.feedback_goals.selection_or_order_change,null);
  const incompleteWorkspace=await host.readCreationWorkspace(credential,{profile_query:null});
  assert.match(incompleteWorkspace.requests.find(item=>item.authorization.request_id==="selection-goal")!.drafts.find(item=>item.draft_id===incompleteSelection.draft_id)!.feedback_note!.summary,/unfulfilled/);
  assert.equal(listModelRuns(reopenedSession, projectId).length, goalRuns+1);
  const correctedBase=host.readTimelineSnapshot() as any;
  host.reviseCreationRequest(credential, "selection-goal", 2, { raw_text: "重新排序镜头，分成两个片段", viewed_timeline_version: correctedBase.version, preserve_refs: [] });
  mutateDecision = decision => { decision.shots.reverse(); decision.shots.forEach((shot: any) => { shot.source_window.end = time(30); }); decision.target_duration_ticks = 60; };
  const reordered = await host.generateCreationDraft(credential, input("selection-goal", 3)); mutateDecision = undefined;
  assert.equal(reordered.state.drafts.length, 2); assert.equal(listModelRuns(reopenedSession, projectId).length, goalRuns + 2);
  assert.deepEqual((host.readTimelineSnapshot() as any).tracks[0].clips.sort((a: any, b: any) => Number(a.timeline_start - b.timeline_start)).map((clip: any) => clip.source.asset_id), [...goalBase.tracks[0].clips].reverse().map((clip: any) => clip.source.asset_id));
  await host.close(); await host.open(resolve(root, "project"));
  assert.equal(host.readCreationRequest("selection-goal").drafts.length, 2);
  // Natural-language color preferences are interpreted by the model. An
  // incomplete but executable edit is reviewable and identifies its shortfall.
  await begin("color-goal");
  const colorBase = host.readTimelineSnapshot() as any, colorSession = (host as any).session;
  host.reviseCreationRequest(credential, "color-goal", 1, { raw_text: "曝光改为0.3，保持对比度和饱和度，保持原片范围和镜头顺序", viewed_timeline_version: colorBase.version, preserve_refs: [] });
  const colorRuns = listModelRuns(colorSession, projectId).length;
  const colorDecision = (decision: any, contrast: number) => { decision.shots.reverse(); decision.shots.forEach((shot: any) => { shot.source_window.end = time(30); shot.color = { exposure: 0.3, contrast, saturation: 1 }; }); decision.target_duration_ticks = 60; };
  mutateDecision = decision => { colorDecision(decision, 0); decision.change_summary = "Exposure changed; contrast was not preserved."; };
  const colorIncomplete = await host.generateCreationDraft(credential, input("color-goal", 2));
  assert.equal(requestBody.feedback_interpretation_policy, "model-advisory-v1");
  assert.ok(requestBody.timeline.tracks[0].clips.every((clip: any) => clip.grade === null && clip.effective_color.contrast === 1));
  assert.ok((host.readTimelineSnapshot() as any).tracks[0].clips.every((clip: any) => clip.grade.contrast === 0));
  const colorWorkspace = await host.readCreationWorkspace(credential, {profile_query:null});
  assert.match(colorWorkspace.requests.find(item => item.authorization.request_id === "color-goal")!.drafts.find(item => item.draft_id === colorIncomplete.draft_id)!.feedback_note!.summary, /not preserved/);
  const colorRetryBase = host.readTimelineSnapshot() as any;
  host.reviseCreationRequest(credential, "color-goal", 2, { raw_text: "仍仅曝光改为0.3，保持对比度和饱和度，保持原片范围和镜头顺序", viewed_timeline_version: colorRetryBase.version, preserve_refs: [] });
  mutateDecision = decision => colorDecision(decision, 1);
  const colorChanged = await host.generateCreationDraft(credential, input("color-goal", 3)); mutateDecision = undefined;
  assert.equal(colorChanged.state.drafts.length, 2); assert.equal(listModelRuns(colorSession, projectId).length, colorRuns + 2);
  assert.ok((host.readTimelineSnapshot() as any).tracks[0].clips.every((clip: any) => clip.grade.exposure === 0.3 && clip.grade.contrast === 1 && clip.grade.saturation === 1));
  // The viewed clip identities are available to the model; ordinary text does
  // not become a Host-generated ordinal or color-scope proof.
  await begin("local-grayscale");
  const localBase=host.readTimelineSnapshot() as any;
  const localClips=[...localBase.tracks[0].clips].sort((a:any,b:any)=>Number(a.timeline_start-b.timeline_start));
  host.reviseCreationRequest(credential,"local-grayscale",1,{raw_text:"只将第一个镜头改为灰度，其余镜头保持不变",viewed_timeline_version:localBase.version,preserve_refs:[]});
  const localDecision=(decision:any)=>{
    const old=decision.shots; decision.target_duration_ticks=60;
    decision.shots=localClips.map((clip:any,index:number)=>({...old.find((shot:any)=>shot.shot_id===clip.clip_id),source_window:{...old.find((shot:any)=>shot.shot_id===clip.clip_id).source_window,end:time(30)},color:index===0?{exposure:0,contrast:1,saturation:0}:{exposure:0.3,contrast:1,saturation:1}}));
  };
  mutateDecision=localDecision;
  const localChanged=await host.generateCreationDraft(credential,input("local-grayscale",2));mutateDecision=undefined;
  assert.equal(localChanged.state.drafts.length,1);
  assert.equal(requestBody.feedback_goals.grayscale,null);
  assert.equal(requestBody.viewed_timeline.version,localBase.version);
  assert.deepEqual(requestBody.viewed_timeline.tracks[0].clips.map((clip:any)=>clip.clip_id),localClips.map((clip:any)=>clip.clip_id));
  const localResult=host.readTimelineSnapshot() as any;
  assert.equal(localResult.tracks[0].clips.find((clip:any)=>clip.clip_id===localClips[0].clip_id).grade.saturation,0);
  assert.deepEqual(localResult.tracks[0].clips.find((clip:any)=>clip.clip_id===localClips[1].clip_id).grade,localClips[1].grade);
  // Historical revisions remain visible to the model but are not promoted to
  // guessed preservation or reselection gates for the current revision.
  await begin("caption-preservation");
  const captionBase = host.readTimelineSnapshot() as any, captionRuns = listModelRuns(colorSession, projectId).length;
  host.reviseCreationRequest(credential, "caption-preservation", 1, { raw_text: "请真正重新选材并改变镜头排序", viewed_timeline_version: captionBase.version, preserve_refs: [] });
  const captionText = "删掉两句不同镜头上的字幕。其他镜头、源片范围、顺序、音轨和总时长不变。这次只是具体字幕修正，不是长期偏好。";
  host.reviseCreationRequest(credential, "caption-preservation", 2, { raw_text: captionText, viewed_timeline_version: captionBase.version, preserve_refs: [] });
  const captionDecision = (decision: any) => { colorDecision(decision, 1); decision.captions = []; };
  mutateDecision = captionDecision;
  const beforeCaptionSends = sends;
  const captionChanged = await host.generateCreationDraft(credential, input("caption-preservation", 3)); mutateDecision = undefined;
  assert.equal(sends, beforeCaptionSends + 2);
  assert.equal(requestBody.request.current_revision.raw_text, captionText);
  assert.equal(requestBody.request.current_revision.revision, 3);
  assert.equal(requestBody.request.revisions.at(-2).raw_text, "请真正重新选材并改变镜头排序");
  assert.equal(requestBody.feedback_goals.selection_or_order_change, null);
  assert.equal(requestBody.feedback_goals.preservation, null);
  assert.equal(captionChanged.state.drafts.length, 1); assert.equal(listModelRuns(colorSession, projectId).length, captionRuns + 1);
  const captionTimeline = host.readTimelineSnapshot() as any;
  assert.deepEqual(captionTimeline.tracks[0].clips.map((clip: any) => clip.source), captionBase.tracks[0].clips.map((clip: any) => clip.source));
  assert.equal(captionTimeline.tracks.flatMap((track: any) => track.captions ?? []).length, 0);
  // Real A interruption wording: the superseded 15 seconds is history, not
  // a second hard target overriding the current 12-second instruction.
  await begin("interrupt-duration");
  const interruptBase = host.readTimelineSnapshot() as any, interruptRuns = listModelRuns(colorSession, projectId).length;
  host.reviseCreationRequest(credential, "interrupt-duration", 1, { raw_text: "先改成15秒的徒步动作故事，至少四个镜头，只是本次要求，不记录长期偏好。", viewed_timeline_version: interruptBase.version, preserve_refs: [] });
  const interruptText = "我改主意了，最终只做12秒，至少四个镜头，突出脚步和人物动作。这条插话覆盖刚才15秒要求，仍然只是本次要求。";
  host.reviseCreationRequest(credential, "interrupt-duration", 2, { raw_text: interruptText, viewed_timeline_version: interruptBase.version, preserve_refs: [] });
  const interruptDecision = (decision: any, count: number) => { const templates = structuredClone(decision.shots); decision.target_duration_ticks = count * 90; decision.shots = Array.from({ length: count }, (_, index) => ({ ...templates[index % 2], shot_id: `interrupt-${index}`, source_window: { ...templates[index % 2].source_window, end: time(90) } })); decision.audio = []; decision.captions = []; };
  mutateDecision = decision => interruptDecision(decision, 5);
  const interruptSends = sends;
  await assert.rejects(host.generateCreationDraft(credential, input("interrupt-duration", 3)), error => {
    assert.equal((error as any).code, "MODEL_OUTPUT_INVALID"); assert.equal((error as any).cause.code, "CREATION_DURATION_TARGET_UNMET"); return true;
  });
  assert.equal(requestBody.request.current_revision.raw_text, interruptText);
  assert.equal(requestBody.duration_interpretation_policy, "model-ticks-v1");
  assert.equal(sends, interruptSends + 1); assert.equal(listModelRuns(colorSession, projectId).length, interruptRuns);
  assert.deepEqual(host.readTimelineSnapshot(), interruptBase); assert.equal(host.readCreationRequest("interrupt-duration").drafts.length, 0);
  mutateDecision = decision => interruptDecision(decision, 4);
  const interrupted = await host.generateCreationDraft(credential, input("interrupt-duration", 3)); mutateDecision = undefined;
  assert.equal(interrupted.state.drafts.length, 1);
  assert.equal((host.readTimelineSnapshot() as any).tracks[0].clips.reduce((sum: bigint, clip: any) => sum + clip.timeline_duration, 0n), 360n);
  // Local profile snapshot is authorized for learning, not for this request.
  const source = { source_project_id: "historical-project", source_event_id: "feedback-1", content_digest: "a".repeat(64), correction_digest: null, data_type: "feedback" as const, evidence_refs: ["feedback-1"] };
  await profile.configure(credential, { source_project_ids: [source.source_project_id], data_types: ["feedback"], retention_until: "2027-01-01T00:00:00Z", external_provider: "qwen", enabled: true });
  const permit = await profile.prepareLearning(source, "qwen", null);
  await profile.learn(permit, { principles: [{ principle_id: "principle-1", source_project_id: source.source_project_id, source_event_id: source.source_event_id, source_digest: source.content_digest, data_type: "feedback", dimension: "caption", statement: "Fixture preference", contexts: ["private-empty-profile-context"], exceptions: [], status: "hypothesis", evidence_refs: source.evidence_refs, created_at: "2026-09-23T00:00:00Z" }], no_inference_reason: null });
  await begin("profile-denied", { version: 1, value: "require" });
  const profileCalls = host.readCreationRequest("profile-denied").model_calls.length, profileSends = sends;
  await assert.rejects(host.generateCreationDraft(credential, input("profile-denied")), errorCode("REQUEST_PROFILE_DATA_DENIED"));
  assert.equal(host.readCreationRequest("profile-denied").model_calls.length, profileCalls);
  assert.equal(sends, profileSends);
  assert.equal(host.readCreationRequest("profile-denied").drafts.length, 0);
  assert.equal(host.readCreationRequest("profile-denied").authorization.allowed_data.includes("profile"), false);
  await begin("multiple-denied", undefined, ["request", "evidence", "frames", "audio"]);
  await assert.rejects(host.generateCreationDraft(credential, input("multiple-denied")), errorCode("REQUEST_DATA_DENIED"));
  await assert.rejects(host.generateCreationDraft(credential, { ...input("multiple-denied"), profile_query: null }), errorCode("REQUEST_DATA_DENIED"));
  const ambientDraft = await host.generateCreationDraft(credential, { ...input("explicit-ambient"), profile_query: null });
  assert.ok(ambientDraft.draft_id, "missing ambient classification no longer discards an otherwise valid draft");
  const ambientWorkspace = await host.readCreationWorkspace(credential, { profile_query: null });
  assert.deepEqual(ambientWorkspace.requests.find(item => item.authorization.request_id === "explicit-ambient")!.drafts.find(item => item.draft_id === ambientDraft.draft_id)!.ambient_warning, {reason:"no-sound-analysis"});
  await host.close(); await host.open(resolve(root,"project"));
  const reopenedAmbient = await host.readCreationWorkspace(credential, { profile_query: null });
  assert.deepEqual(reopenedAmbient.requests.find(item => item.authorization.request_id === "explicit-ambient")!.drafts.find(item => item.draft_id === ambientDraft.draft_id)!.ambient_warning, {reason:"no-sound-analysis"});
  console.log("Stage3 public generation: encoded synthetic sources, actual evidence/PTS resolution, model dispatch, atomic unequal-cut drafts, revision, identity denial, manual race and close/reopen passed (HTTP fixtures; no real-model claim)");
} finally { await host?.close(); await profile.close(); if (typeof global.gc === "function") global.gc(); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
