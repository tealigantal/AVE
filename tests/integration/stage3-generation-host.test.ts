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
  const observations = requestBody.source_spans, source = (index: number, end: number) => ({ span_id: observations[index].span_id, asset_id: observations[index].asset_id, start: time(0), end: time(end) });
  const decision = { decision_version: 1, target_duration_ticks: 75, thesis: "Synthetic red followed by blue", shots: [{ shot_id: "red-shot", timing: { kind: "exact" }, source_window: source(0, 45), purpose: "red", embedded_gain_db: -12, reframe: null, color: null }, { shot_id: "blue-shot", timing: { kind: "exact" }, source_window: source(1, 30), purpose: "blue", embedded_gain_db: -12, reframe: null, color: null }],
    audio: [{ audio_id: "tone", source: source(1, 30), shot_id: "blue-shot", offset: time(0), role: "music", gain_db: -9, fade_in: time(0), fade_out: time(0), purpose: "synthetic tone" }],
    captions: [{ caption_id: "label", shot_id: "red-shot", offset: time(0), duration: time(30), text: "Red test frame", kind: "editorial", evidence_ids: [observations[0].observations[0].evidence_id], audio_anchor: null }],
    preserve_refs: requestBody.request.revisions.at(-1).preserve_refs, applied_principle_ids: [], feedback_interpretation: requestBody.request.revisions.at(-1).raw_text, change_summary: "Create controlled unequal two-source draft" };
  mutateDecision?.(decision); returnedDecision = structuredClone(decision); if(requestBody.creative_skills?.stage === "confirm") returnedDecision.skill_effects = fixtureSkillEffects(requestBody, decision); afterSend?.();
  const choices = decision.shots.map(({ source_window, ...shot }: any) => ({ ...shot, source_choice: { kind: "custom_window", source_window } }));
  const exchange = requestBody.planning_exchange.phase === "measure-only" ? { exchange_version: 3, kind: "measure_selection", query_id: requestBody.planning_exchange.assigned_query_id, target_duration_ticks: decision.target_duration_ticks, selection: choices.map((shot: any) => ({ selection_id: shot.shot_id, source_choice: shot.source_choice, timing: shot.timing })) } : finalReply(decision, requestBody.planning_exchange);
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
  Object.assign(authorization, { provider: "qwen", model: "fixture-model", asset_ids: imported.map(item => item.asset_id), allowed_data: ["request", "timeline", "evidence", "frames", "audio"] });
  const begin = async (id: string) => {
    const state = host!.beginCreationRequest(credential, { ...authorization, request_id: id });
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
  await begin("main");
  const beforeDuplicate = sends, beforeDuplicateCalls = host.readCreationRequest("main").model_calls.length;
  await assert.rejects(host.generateCreationDraft(credential, { ...input("main"), observation_refs: [...references.get("main")!, ...alternativeReferences.get("main")!] }), errorCode("CREATION_SPAN_DUPLICATE"));
  await assert.rejects(host.generateCreationDraft(credential, { ...input("main"), evidence_refs: [] } as any), errorCode("CREATION_INPUT_INVALID"));
  assert.equal(sends, beforeDuplicate); assert.equal(host.readCreationRequest("main").model_calls.length, beforeDuplicateCalls);
  // Another request chooses a second imported location for the same content.
  // Its grant cannot make this request's explicit source selection ambiguous.
  const duplicatePath = resolve(root, "red-copy.mp4"); await cp(paths[0]!, duplicatePath);
  const duplicate = (await host.importMedia([duplicatePath]))[0] as any;
  assert.equal(duplicate.asset_id, imported[0].asset_id); assert.notEqual(duplicate.asset_location_id, imported[0].asset_location_id);
  host.beginCreationRequest(credential, { ...authorization, request_id: "other-location" });
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
  assert.deepEqual((requestBody.planning_exchange.response_schema.oneOf ?? [requestBody.planning_exchange.response_schema]).find((item: any) => item.properties.kind.const === "final").properties.creative.properties.shots.items.properties.reframe.anyOf.map((item: any) => item.properties?.mode?.const ?? item.type), ["object", "static_transform", "null"]);
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
    if (task === "media.probe.v1") probeSends += 1;
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
  // A real Host request must reject merely shorter old cuts when the user
  // explicitly requires new selection/order. The next authorized correction
  // is a separate revision; the rejected run never becomes a success/cache.
  host.applyTimelineCommand({ type: "set_track_properties", track_id: "video-main", properties: { opacity: 1 } } as any, 3);
  await begin("selection-goal");
  const goalBase = host.readTimelineSnapshot() as any;
  host.reviseCreationRequest(credential, "selection-goal", 1, { raw_text: "分成两个片段，重新选材和排序", viewed_timeline_version: goalBase.version, preserve_refs: [] });
  const reopenedSession = (host as any).session, goalRuns = listModelRuns(reopenedSession, projectId).length;
  mutateDecision = decision => { decision.shots.forEach((shot: any) => { shot.source_window.end = time(15); }); decision.target_duration_ticks = 30; };
  await assert.rejects(host.generateCreationDraft(credential, input("selection-goal", 2)), error => {
    assert.equal((error as any).code, "MODEL_OUTPUT_INVALID");
    assert.equal((error as any).cause.code, "CREATION_SELECTION_GOAL_UNMET"); return true;
  });
  assert.equal(requestBody.feedback_goals.shot_count.exact, 2);
  assert.equal(requestBody.feedback_goals.selection_or_order_change.revision, 2);
  assert.equal((requestBody.planning_exchange.response_schema.oneOf ?? [requestBody.planning_exchange.response_schema]).find((item: any) => item.properties.kind.const === "final").properties.creative.properties.shots.minItems, 2); assert.equal((requestBody.planning_exchange.response_schema.oneOf ?? [requestBody.planning_exchange.response_schema]).find((item: any) => item.properties.kind.const === "final").properties.creative.properties.shots.maxItems, 2);
  assert.equal(listModelRuns(reopenedSession, projectId).length, goalRuns);
  assert.deepEqual(host.readTimelineSnapshot(), goalBase); assert.equal(host.readCreationRequest("selection-goal").drafts.length, 0);
  host.reviseCreationRequest(credential, "selection-goal", 2, { raw_text: "重新排序镜头，分成两个片段", viewed_timeline_version: goalBase.version, preserve_refs: [] });
  mutateDecision = decision => { decision.shots.reverse(); decision.shots.forEach((shot: any) => { shot.source_window.end = time(30); }); decision.target_duration_ticks = 60; };
  const reordered = await host.generateCreationDraft(credential, input("selection-goal", 3)); mutateDecision = undefined;
  assert.equal(reordered.state.drafts.length, 1); assert.equal(listModelRuns(reopenedSession, projectId).length, goalRuns + 1);
  assert.deepEqual((host.readTimelineSnapshot() as any).tracks[0].clips.sort((a: any, b: any) => Number(a.timeline_start - b.timeline_start)).map((clip: any) => clip.source.asset_id), [...goalBase.tracks[0].clips].reverse().map((clip: any) => clip.source.asset_id));
  await host.close(); await host.open(resolve(root, "project"));
  assert.equal(host.readCreationRequest("selection-goal").drafts.length, 1);
  // C-style exposure-only edit: null grade executes neutral contrast 1. A
  // model's contrast 0 must fail before successful run registration/commit.
  await begin("color-goal");
  const colorBase = host.readTimelineSnapshot() as any, colorSession = (host as any).session;
  host.reviseCreationRequest(credential, "color-goal", 1, { raw_text: "曝光改为0.3，保持对比度和饱和度，保持原片范围和镜头顺序", viewed_timeline_version: colorBase.version, preserve_refs: [] });
  const colorRuns = listModelRuns(colorSession, projectId).length;
  const colorDecision = (decision: any, contrast: number) => { decision.shots.reverse(); decision.shots.forEach((shot: any) => { shot.source_window.end = time(30); shot.color = { exposure: 0.3, contrast, saturation: 1 }; }); decision.target_duration_ticks = 60; };
  mutateDecision = decision => colorDecision(decision, 0);
  await assert.rejects(host.generateCreationDraft(credential, input("color-goal", 2)), error => {
    assert.equal((error as any).code, "MODEL_OUTPUT_INVALID"); assert.equal((error as any).cause.code, "CREATION_PRESERVATION_GOAL_UNMET"); return true;
  });
  assert.ok(requestBody.timeline.tracks[0].clips.every((clip: any) => clip.grade === null && clip.effective_color.contrast === 1));
  assert.deepEqual(host.readTimelineSnapshot(), colorBase); assert.equal(listModelRuns(colorSession, projectId).length, colorRuns);
  assert.equal(host.readCreationRequest("color-goal").drafts.length, 0);
  host.reviseCreationRequest(credential, "color-goal", 2, { raw_text: "仍仅曝光改为0.3，保持对比度和饱和度，保持原片范围和镜头顺序", viewed_timeline_version: colorBase.version, preserve_refs: [] });
  mutateDecision = decision => colorDecision(decision, 1);
  const colorChanged = await host.generateCreationDraft(credential, input("color-goal", 3)); mutateDecision = undefined;
  assert.equal(colorChanged.state.drafts.length, 1); assert.equal(listModelRuns(colorSession, projectId).length, colorRuns + 1);
  assert.ok((host.readTimelineSnapshot() as any).tracks[0].clips.every((clip: any) => clip.grade.exposure === 0.3 && clip.grade.contrast === 1 && clip.grade.saturation === 1));
  // A-style caption correction supersedes an old relative reselection request.
  // The malicious candidate is in media bounds, so the preservation gate,
  // rather than the source-window bounds check, must reject its new selection.
  await begin("caption-preservation");
  const captionBase = host.readTimelineSnapshot() as any, captionRuns = listModelRuns(colorSession, projectId).length;
  host.reviseCreationRequest(credential, "caption-preservation", 1, { raw_text: "请真正重新选材并改变镜头排序", viewed_timeline_version: captionBase.version, preserve_refs: [] });
  const captionText = "删掉两句不同镜头上的字幕。其他镜头、源片范围、顺序、音轨和总时长不变。这次只是具体字幕修正，不是长期偏好。";
  host.reviseCreationRequest(credential, "caption-preservation", 2, { raw_text: captionText, viewed_timeline_version: captionBase.version, preserve_refs: [] });
  const captionDecision = (decision: any) => { colorDecision(decision, 1); decision.captions = []; };
  mutateDecision = decision => { captionDecision(decision); decision.shots[1].source_window.start = time(15); decision.shots[1].source_window.end = time(45); };
  const beforeCaptionSends = sends;
  await assert.rejects(host.generateCreationDraft(credential, input("caption-preservation", 3)), error => {
    assert.equal((error as any).code, "MODEL_OUTPUT_INVALID"); assert.equal((error as any).cause.code, "CREATION_PRESERVATION_GOAL_UNMET"); return true;
  });
  assert.equal(sends, beforeCaptionSends + 2, "A rejected current-preservation edit never retries automatically");
  assert.equal(requestBody.request.current_revision.raw_text, captionText);
  assert.equal(requestBody.request.current_revision.revision, 3);
  assert.equal(requestBody.request.revisions.at(-2).raw_text, "请真正重新选材并改变镜头排序", "Original history remains unmodified but is explicitly historical");
  assert.equal(requestBody.feedback_goals.selection_or_order_change, null);
  assert.equal(requestBody.feedback_goals.preservation.source_ranges_and_order, true);
  assert.deepEqual(host.readTimelineSnapshot(), captionBase); assert.equal(listModelRuns(colorSession, projectId).length, captionRuns);
  assert.equal(host.readCreationRequest("caption-preservation").drafts.length, 0);
  assert.equal(requestBody.feedback_goals.preservation.audio, true);
  for (const alterAudio of [
    (decision: any) => { decision.shots[1].embedded_gain_db = -96; },
    (decision: any) => { decision.audio[0].gain_db = -96; },
    (decision: any) => { decision.audio = []; },
  ]) {
    mutateDecision = decision => { captionDecision(decision); alterAudio(decision); };
    const countBefore = sends;
    await assert.rejects(host.generateCreationDraft(credential, input("caption-preservation", 3)), error => {
      assert.equal((error as any).code, "MODEL_OUTPUT_INVALID"); assert.equal((error as any).cause.code, "CREATION_PRESERVATION_GOAL_UNMET"); assert.match((error as any).cause.message, /audio/); return true;
    });
    assert.equal(sends, countBefore + 2); assert.equal(listModelRuns(colorSession, projectId).length, captionRuns);
    assert.deepEqual(host.readTimelineSnapshot(), captionBase); assert.equal(host.readCreationRequest("caption-preservation").drafts.length, 0);
  }
  mutateDecision = captionDecision;
  const captionChanged = await host.generateCreationDraft(credential, input("caption-preservation", 3)); mutateDecision = undefined;
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
  assert.equal(requestBody.duration_budget.exact_total_ticks, "360");
  assert.equal(sends, interruptSends + 1); assert.equal(listModelRuns(colorSession, projectId).length, interruptRuns);
  assert.deepEqual(host.readTimelineSnapshot(), interruptBase); assert.equal(host.readCreationRequest("interrupt-duration").drafts.length, 0);
  mutateDecision = decision => interruptDecision(decision, 4);
  const interrupted = await host.generateCreationDraft(credential, input("interrupt-duration", 3)); mutateDecision = undefined;
  assert.equal(interrupted.state.drafts.length, 1);
  assert.equal((host.readTimelineSnapshot() as any).tracks[0].clips.reduce((sum: bigint, clip: any) => sum + clip.timeline_duration, 0n), 360n);
  console.log("Stage3 public generation: encoded synthetic sources, actual evidence/PTS resolution, model dispatch, atomic unequal-cut drafts, revision, identity denial, manual race and close/reopen passed (HTTP fixtures; no real-model claim)");
} finally { await host?.close(); await profile.close(); if (typeof global.gc === "function") global.gc(); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
