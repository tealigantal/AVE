import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fixtureSkillExchange } from "../fixtures/stage3/skill-planning.js";
import { splitVideoClipAtPlayhead } from "../../apps/desktop/src/renderer/features/p4-timeline-commands.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import { readTimelineAnnotationMessages, readObjectSync, registerTimelineAnnotationMessage, registerTimelineAnnotationProcessingEvent } from "../../packages/platform/project-storage/src/public.js";
import type { Timeline } from "../../packages/core/timeline-core/src/public.js";

function planningFixtureExchange(context: any, decision: any): any {
  const shots = decision.shots.map(({ source_window, ...shot }: any) => ({ ...shot, source_choice: { kind: "custom_window", source_window } }));
  const query_id = context.planning_exchange.assigned_query_id;
  if (context.planning_exchange.phase === "measure-only") return fixtureSkillExchange(context, {
    exchange_version: 3, kind: "measure_selection", query_id,
    target_duration_ticks: decision.target_duration_ticks,
    duration_constraint: grayscaleMode === "off" ? {kind:"none",minimum_ticks:null,maximum_ticks:null,reason:"No whole-work duration is specified in this fixture request."} : {kind:"range",minimum_ticks:75,maximum_ticks:105,reason:"The annotation requests approximately three seconds."},
    selection: shots.map((shot: any) => ({ selection_id: shot.shot_id, source_choice: shot.source_choice, timing: shot.timing })),
  }, decision);
  const receipt = context.planning_exchange.feasible_receipts.at(-1);
  assert.ok(receipt, "a final requires a feasible measurement receipt");
  const { query_id: measured_query_id, measurement_receipt_digest } = receipt;
  const { decision_version, target_duration_ticks, shots: originalShots, ...creative } = decision;
  return fixtureSkillExchange(context, {
    exchange_version: 3, kind: "final", measured_query_id, measurement_receipt_digest,
    creative: { ...creative, shots: originalShots.map(({ source_window, source_choice, timing, ...shot }: any) => shot) },
  }, decision);
}

const root = await mkdtemp(resolve(tmpdir(), "ave-annotation-host-"));
const projectRoot = resolve(root, "project"), videoPath = resolve(root, "source.mp4");
const credential = {}, otherCredential = {}, now = () => Date.parse("2026-10-09T12:00:00.000Z");
let modelCalls = 0;
let failGeneration = false;
let seenAnnotationContext: any = null;
let grayscaleMode: "off" | "all" | "target" = "off";
let seenColorScope: any;
let seenTargetIds: string[] = [];
let reduceGraySound = false;
const provider = createQwenProvider({
  api_key: "fixture-only",
  models: [{ model: "fixture", media_types: ["image/png", "audio/wav"] }],
  fetch_impl: async (_url, init) => {
    modelCalls += 1;
    const content = JSON.parse(init!.body as string).messages[0].content;
    if (Array.isArray(content)) {
      const observation = JSON.parse(content[0].text);
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ samples: observation.samples.map((sample: any) => ({ sample_id: sample.sample_id, description: "Synthetic observed frame", uncertain: false, transcript: [] })) }) }, finish_reason: "stop" }], usage: { prompt_tokens: 40, completion_tokens: 30, total_tokens: 70 } }));
    }
    const body = JSON.parse(content), sourceSpans = body.source_spans;
    seenAnnotationContext = body.request.timeline_annotation_batch;
    if (failGeneration) return new Response(JSON.stringify({ error: { message: "fixture generation failure" } }), { status: 503 });
    const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
    const firstLength = 45;
    const decision = {
      decision_version: 1, target_duration_ticks: firstLength, thesis: "One observed movement",
      shots: sourceSpans.map((item: any, index: number) => ({ shot_id: `shot-${index}`, timing: { kind: "exact" }, source_window: { span_id: item.span_id, asset_id: item.asset_id, start: time(0), end: time(index ? 30 : firstLength) }, purpose: "Show the observed movement", embedded_gain_db: -6, reframe: null, color: null })),
      audio: [], captions: [], preserve_refs: body.request.revisions.at(-1).preserve_refs,
      applied_principle_ids: [], feedback_interpretation: body.request.original_text, change_summary: "Use the observed movement once.",
    };
    if (grayscaleMode !== "off") {
      seenColorScope = body.feedback_goals.grayscale;
      seenTargetIds = (body.request.timeline_annotation_batch?.annotations ?? []).map((note: any) => note.resolution?.clip_id).filter((id: unknown): id is string => typeof id === "string");
      const clips = body.timeline.tracks.find((track: any) => track.kind === "video").clips;
      decision.target_duration_ticks = clips.reduce((sum: number, clip: any) => sum + Number(clip.timeline_duration), 0);
      decision.shots = clips.map((clip: any) => ({ shot_id: clip.clip_id, timing: {kind:"exact"}, source_window:{span_id:sourceSpans.find((span:any)=>span.asset_id===clip.source.asset_id).span_id,asset_id:clip.source.asset_id,start:{schema_version:1,value:Number(clip.source.start_pts),timescale:Number(clip.source.timescale)},end:{schema_version:1,value:Number(clip.source.end_pts),timescale:Number(clip.source.timescale)}},purpose:"Retain this exact clip",embedded_gain_db:(clip.gain_db ?? 0) - (reduceGraySound && seenTargetIds.includes(clip.clip_id) ? 6 : 0),reframe:null,color:grayscaleMode === "all" || seenTargetIds.includes(clip.clip_id) ? {exposure:0,contrast:1,saturation:0} : null }));
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(planningFixtureExchange(body, decision)) }, finish_reason: "stop" }], usage: { prompt_tokens: 90, completion_tokens: 50, total_tokens: 140 } }));
  },
});
const host = new ProjectHostSession({
  now,
  creationRequestChannels: [{ credential, actor_id: "user-1" }, { credential: otherCredential, actor_id: "user-2" }],
  provider: "qwen", model: "fixture", modelProvider: provider,
  creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 16, timeout_seconds: 30 },
  creationModelPolicy: { max_attempts: 1, timeout_ms: 30000 },
});
const contains = (error: any, code: string): boolean => Boolean(error?.code === code || error?.message?.includes(code) || error?.cause && contains(error.cause, code) || error?.errors?.some((item: unknown) => contains(item, code)));
const rejects = (code: string) => (error: unknown) => contains(error, code);

try {
  await promisify(execFile)("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", videoPath]);
  await host.create(projectRoot);
  host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = await host.importMedia([videoPath]) as any[];
  const projectId = (host as any).session.manifest.project_id as string;
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  Object.assign(authorization, {
    request_id: "annotation-request", asset_ids: [imported[0].asset_id], provider: "qwen", model: "fixture",
    allowed_data: ["request", "timeline", "evidence", "frames"],
  });
  host.beginCreationRequest(credential, authorization);
  await host.prepareCreationMaterial(credential, { operation_id: "annotation-material", request_id: authorization.request_id, asset_id: imported[0].asset_id, asset_location_id: imported[0].asset_location_id });
  const observation = await host.observeCreationMaterial(credential, { request_id: authorization.request_id, expected_revision: 1, material_operation_ids: ["annotation-material"], include_audio: false });
  const generated = await host.generateCreationDraft(credential, { request_id: authorization.request_id, expected_revision: 1, observation_refs: [observation.ref], profile_query: null });
  const base = host.readTimelineSnapshot() as Timeline;
  const videoTrack = base.tracks.find(track => track.kind === "video")!;
  const clip = videoTrack.clips.at(-1)!;
  const tick = clip.timeline_start + clip.timeline_duration / 2n;
  const annotation = {
    schema_version: 1,
    annotation_id: randomUUID(),
    anchor: { track_id: videoTrack.track_id, clip_id: clip.clip_id, start: { schema_version: 1, value: Number(tick), timescale: 30 }, end: null },
    body: "保留此镜头的动作节奏",
  };
  const input = {
    schema_version: 1, operation_id: randomUUID(), message_id: randomUUID(), project_id: projectId,
    request_id: authorization.request_id, draft_id: generated.draft_id, expected_revision: 1,
    timeline_version: base.version, annotations: [annotation],
  };
  const callsBeforeAnnotation = modelCalls;
  const saveHistorical = (message: any, eventType: string) => {
    const session = (host as any).session;
    const eventId = Number(session.db.prepare("SELECT COALESCE(MAX(event_id),0) AS event_id FROM project_events").get().event_id) + 1;
    const stored = { ...message, conversation_revision: eventId, created_at: new Date(now()).toISOString() };
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?,?,?,?)").run(projectId, eventType, JSON.stringify(stored), stored.created_at);
    return stored;
  };
  const first = { message: saveHistorical(input, "conversation.timeline_annotation.created"), replayed: false };
  assert.equal(modelCalls, callsBeforeAnnotation, "annotation submission must not call the model");
  assert.deepEqual(host.readTimelineSnapshot(), base, "annotation submission must not change Timeline or RenderGraph inputs");
  const previewInput = {
    ...input,
    schema_version: 2,
    operation_id: randomUUID(),
    message_id: randomUUID(),
    annotations: [{
      schema_version: 2,
      annotation_id: randomUUID(),
      anchor: { surface: "preview", track_id: videoTrack.track_id, clip_id: clip.clip_id, start: { schema_version: 1, value: Number(tick), timescale: 30 }, end: null, preview_point: { x: 0.27, y: 0.73 } },
      body: "画面左下需要留意。",
    }],
  };
  const previewMessage = { message: saveHistorical(previewInput, "conversation.timeline_annotation.v2.created"), replayed: false };
  assert.equal(previewMessage.message.schema_version, 2);
  assert.deepEqual(previewMessage.message.annotations[0]!.anchor.preview_point, { x: 0.27, y: 0.73 });

  const moved = await host.editCreationDraft(credential, {
    operation_id: "annotation-move-clip", request_id: authorization.request_id, expected_revision: 1,
    expected_timeline_version: base.version, parent_draft_id: generated.draft_id, raw_text: "将最后一段后移，保留批注来源。",
    commands: [{ type: "move_clip", track_id: videoTrack.track_id, clip_id: clip.clip_id, timeline_start: clip.timeline_start + 12n }], preserve_refs: [],
  });
  let current = host.readTimelineSnapshot() as Timeline;
  const workspace = await host.readCreationWorkspace(credential, { profile_query: null });
  const selected = workspace.requests.find(request => request.authorization.request_id === authorization.request_id)!;
  const projectedMessage = selected.timeline_annotations[0]!;
  assert.equal(projectedMessage.conversation_revision, first.message.conversation_revision);
  assert.equal(projectedMessage.annotations[0]!.anchor_resolution.status, "mapped");
  assert.equal(BigInt(projectedMessage.annotations[0]!.anchor_resolution.start_ticks!), tick + 12n);
  assert.ok(selected.revisions[0]!.conversation_revision < first.message.conversation_revision);
  const projectedPreview = selected.timeline_annotations.find(message => message.schema_version === 2)!;
  assert.equal(projectedPreview.annotations[0]!.anchor_resolution.status, "mapped");
  assert.ok("preview_point" in projectedPreview.annotations[0]!.anchor);
  assert.deepEqual(projectedPreview.annotations[0]!.anchor.preview_point, { x: 0.27, y: 0.73 });
  assert.deepEqual(current.tracks.find(track => track.track_id === videoTrack.track_id)!.clips.find(item => item.clip_id === clip.clip_id)!.source, clip.source);

  const movedClip = current.tracks.find(track => track.track_id === videoTrack.track_id)!.clips.find(item => item.clip_id === clip.clip_id)!;
  const splitAt = movedClip.timeline_start + 30n;
  const split = await host.editCreationDraft(credential, {
    operation_id: "annotation-split-clip", request_id: authorization.request_id, expected_revision: 1,
    expected_timeline_version: current.version, parent_draft_id: moved.draft_id, raw_text: "在批注后方显式分割镜头。",
    commands: splitVideoClipAtPlayhead(current, clip.clip_id, splitAt, "annotation-split-right"), preserve_refs: [],
  });
  let latestDraftId = split.draft_id;
  current = host.readTimelineSnapshot() as Timeline;
  const splitWorkspace = await host.readCreationWorkspace(credential, { profile_query: null });
  const splitMessage = splitWorkspace.requests.find(request => request.authorization.request_id === authorization.request_id)!.timeline_annotations[0]!;
  assert.equal(splitMessage.annotations[0]!.anchor_resolution.status, "mapped", "a unique source-lineage split retains the annotated side");
  assert.equal(BigInt(splitMessage.annotations[0]!.anchor_resolution.start_ticks!), tick + 12n);

  const splitTrack = current.tracks.find(track => track.track_id === videoTrack.track_id)!;
  const withoutAnchoredSide = { ...splitTrack, clips: splitTrack.clips.filter(item => item.clip_id !== clip.clip_id) };
  const deleted = await host.editCreationDraft(credential, {
    operation_id: "annotation-delete-clip", request_id: authorization.request_id, expected_revision: 1,
    expected_timeline_version: current.version, parent_draft_id: latestDraftId, raw_text: "移除带批注的来源片段。",
    commands: [{ type: "restore_track", track_id: splitTrack.track_id, track: withoutAnchoredSide }], preserve_refs: [],
  });
  latestDraftId = deleted.draft_id;
  current = host.readTimelineSnapshot() as Timeline;
  const deletedWorkspace = await host.readCreationWorkspace(credential, { profile_query: null });
  const deletedMessage = deletedWorkspace.requests.find(request => request.authorization.request_id === authorization.request_id)!.timeline_annotations[0]!;
  assert.equal(deletedMessage.annotations[0]!.anchor_resolution.status, "unresolved", "deleted source lineage remains visible without a fabricated location");
  assert.equal(deletedMessage.annotations[0]!.anchor_resolution.start_ticks, null);
  const deletedPreview = deletedWorkspace.requests.find(request => request.authorization.request_id === authorization.request_id)!.timeline_annotations.find(message => message.schema_version === 2)!;
  assert.equal(deletedPreview.annotations[0]!.anchor_resolution.status, "unresolved");
  assert.ok("preview_point" in deletedPreview.annotations[0]!.anchor);
  assert.deepEqual(deletedPreview.annotations[0]!.anchor.preview_point, { x: 0.27, y: 0.73 });

  const replay = await host.sendTimelineAnnotationMessage(credential, input);
  assert.equal(replay.replayed, true, "a lost success response replays after a later Timeline edit");
  assert.deepEqual(replay.message, first.message);
  assert.equal(replay.processing, null, "historical messages replay without inventing a processing task");

  const staleLegacy = structuredClone(input);
  staleLegacy.operation_id = randomUUID(); staleLegacy.message_id = randomUUID(); staleLegacy.annotations[0].annotation_id = randomUUID();
  await assert.rejects(host.sendTimelineAnnotationMessage(credential, staleLegacy), rejects("TIMELINE_ANNOTATION_CURRENT_SUBMIT_REQUIRED"));

  await assert.rejects(host.sendTimelineAnnotationMessage(otherCredential, input), rejects("REQUEST_ACTOR_DENIED"));
  const trackNow = current.tracks.find(track => track.kind === "video")!;
  const clipNow = trackNow.clips.at(-1);
  const taskTick = clipNow ? clipNow.timeline_start + clipNow.timeline_duration / 2n : 0n;
  const makeBatch = (timelineVersion: number, draftId: string, body: string) => ({
    schema_version: 3, operation_id: randomUUID(), message_id: randomUUID(), project_id: projectId,
    request_id: authorization.request_id, draft_id: draftId, expected_revision: 1, timeline_version: timelineVersion,
    request_text: "继续精修同一作品，并按批注调整节奏。", preserve_refs: [], profile_query: null,
    annotations: [{ schema_version: 2, annotation_id: randomUUID(), anchor: { surface: "timeline", track_id: trackNow.track_id, clip_id: clipNow?.clip_id ?? null, start: { schema_version: 1, value: Number(taskTick), timescale: 30 }, end: null, preview_point: null }, body }],
  });
  const staleBatch = makeBatch(base.version, generated.draft_id, "旧版本的时间锚点不能进入当前任务");
  await assert.rejects(host.sendTimelineAnnotationMessage(credential, staleBatch), rejects("TIMELINE_ANNOTATION_TIMELINE_STALE"));
  assert.throws(() => host.supersedeFailedTimelineAnnotation(otherCredential, { request_id: authorization.request_id, operation_id: staleBatch.operation_id }), rejects("REQUEST_ACTOR_DENIED"));
  const reopenedFailed = await host.supersedeFailedTimelineAnnotation(credential, { request_id: authorization.request_id, operation_id: staleBatch.operation_id });
  assert.equal(reopenedFailed.processing.status, "superseded", "a stale failed batch can be explicitly reopened while its original message remains durable");
  assert.equal((await host.supersedeFailedTimelineAnnotation(credential, { request_id: authorization.request_id, operation_id: staleBatch.operation_id })).replayed, true);
  assert.equal((await host.readCreationWorkspace(credential, { profile_query: null })).requests.find(request => request.authorization.request_id === authorization.request_id)!.timeline_annotations.find(message => message.operation_id === staleBatch.operation_id)!.processing?.status, "superseded");
  await assert.rejects(host.sendTimelineAnnotationMessage(credential, staleBatch), rejects("TIMELINE_ANNOTATION_OPERATION_SUPERSEDED"));
  const beforeTask = host.readTimelineSnapshot() as Timeline;
  const batch = makeBatch(current.version, latestDraftId, "保留这一镜的动作节奏，并让转场更自然。");
  const callsBeforeFailedTask = modelCalls;
  failGeneration = true;
  await assert.rejects(host.sendTimelineAnnotationMessage(credential, batch));
  failGeneration = false;
  assert.deepEqual(host.readTimelineSnapshot(), beforeTask, "model failure must not create a Timeline commit");
  let failedWorkspace = await host.readCreationWorkspace(credential, { profile_query: null });
  let failedRequest = failedWorkspace.requests.find(request => request.authorization.request_id === authorization.request_id)!;
  const failedMessage = failedRequest.timeline_annotations.find(message => message.operation_id === batch.operation_id)!;
  assert.equal(failedMessage.processing?.status, "failed");
  assert.ok(failedMessage.processing?.failure?.message);
  assert.equal(failedRequest.revisions.length, 2, "the one combined message advances the request exactly once, even when generation fails");
  assert.ok(modelCalls > callsBeforeFailedTask);

  const completed = await host.sendTimelineAnnotationMessage(credential, batch);
  assert.equal(completed.replayed, true, "retry resumes the same durable operation");
  assert.ok(completed.processing);
  assert.equal(completed.processing.status, "resolved");
  assert.equal(completed.processing.result?.draft_id, host.readCreationRequest(authorization.request_id).latest_draft_id);
  assert.ok(completed.processing.result!.timeline_version > batch.timeline_version, "the result names the committed Timeline version");
  assert.equal(seenAnnotationContext?.annotations?.[0]?.body, batch.annotations[0]!.body, "the model receives the exact bounded annotation body as structured context");
  assert.equal(seenAnnotationContext?.target_revision, 2);
  const callsAfterCompletion = modelCalls;
  const resolvedReplay = await host.sendTimelineAnnotationMessage(credential, batch);
  assert.ok(resolvedReplay.processing);
  assert.equal(resolvedReplay.processing.status, "resolved");
  assert.equal(modelCalls, callsAfterCompletion, "a resolved operation never resends generation");

  const reopenedWorkspace = await host.readCreationWorkspace(credential, { profile_query: null });
  const reopenedRequest = reopenedWorkspace.requests.find(request => request.authorization.request_id === authorization.request_id)!;
  assert.equal(reopenedRequest.revisions.length, 2);
  assert.ok(reopenedRequest.revisions[0]!.conversation_revision < first.message.conversation_revision);
  assert.ok(reopenedRequest.revisions[1]!.conversation_revision > first.message.conversation_revision);
  const reopenedPreview = reopenedRequest.timeline_annotations.find(message => message.schema_version === 2)!;
  assert.ok("preview_point" in reopenedPreview.annotations[0]!.anchor);
  assert.deepEqual(reopenedPreview.annotations[0]!.anchor.preview_point, { x: 0.27, y: 0.73 });
  assert.equal(reopenedRequest.timeline_annotations.find(message => message.operation_id === batch.operation_id)!.processing?.status, "resolved");
  assert.equal(readTimelineAnnotationMessages((host as any).session, projectId, authorization.request_id).length, 4);

  // Real two-clip, untagged source; only the selected first clip may become gray.
  const beforeDuplicate = host.readTimelineSnapshot() as Timeline;
  const grayTrack = beforeDuplicate.tracks.find(track => track.kind === "video")!;
  const firstClip = grayTrack.clips[0]!;
  const duplicated = await host.editCreationDraft(credential, {
    operation_id:"scope-duplicate",request_id:authorization.request_id,expected_revision:2,
    expected_timeline_version:beforeDuplicate.version,parent_draft_id:completed.processing.result!.draft_id,
    raw_text:"复制镜头用于范围验证",preserve_refs:[],commands:[{type:"add_clip",track_id:grayTrack.track_id,clip:{...firstClip,clip_id:"scope-second",timeline_start:firstClip.timeline_start+firstClip.timeline_duration}}],
  });
  const colorBase=host.readTimelineSnapshot() as Timeline;
  const grayBatch={schema_version:3,operation_id:randomUUID(),message_id:randomUUID(),project_id:projectId,request_id:authorization.request_id,draft_id:duplicated.draft_id,expected_revision:2,timeline_version:colorBase.version,request_text:"按批注调整，保持当前3秒时长，其余镜头保持不变。",preserve_refs:[],profile_query:null,annotations:[{schema_version:2,annotation_id:randomUUID(),anchor:{surface:"timeline",track_id:grayTrack.track_id,clip_id:firstClip.clip_id,start:{schema_version:1,value:Number(firstClip.timeline_start),timescale:30},end:null,preview_point:null},body:"调整范围：仅当前片段。请将这个镜头改为灰度。"}]};
  grayscaleMode="target";
  const localDone=await host.sendTimelineAnnotationMessage(credential,grayBatch);
  assert.equal(localDone.processing?.status,"resolved");
  assert.equal(seenColorScope,null,"natural-language color intent is not converted into a Host hard gate");
  assert.deepEqual(seenTargetIds,[firstClip.clip_id],"the model receives the exact annotation target");
  const colorResult=host.readTimelineSnapshot() as Timeline;
  assert.equal(colorResult.version,colorBase.version+1);
  const resultTrack=colorResult.tracks.find(track=>track.track_id===grayTrack.track_id)!;
  assert.equal(resultTrack.clips.length,2);
  assert.deepEqual(resultTrack.effects?.map(effect=>effect.clip_id),[firstClip.clip_id]);
  assert.deepEqual(resultTrack.clips[1]!.source,colorBase.tracks.find(track=>track.track_id===grayTrack.track_id)!.clips[1]!.source);
  assert.equal(resultTrack.clips[1]!.grade,undefined);
  const rendered=await host.renderCreationDraft(credential,{operation_id:"scoped-gray-render",request_id:authorization.request_id,draft_id:localDone.processing!.result!.draft_id});
  const measurements: Record<string,number[]> = {};
  for(const target of ["preview","master"] as const){
    assert.equal((rendered.receipt[target].qc_report as {status:string}).status,"passed");
    const path=resolve(root,`scoped-${target}.mp4`);await writeFile(path,readObjectSync(projectRoot,rendered.receipt[target].output_hash));
    const spreads:number[]=[];
    for(const sample of [0.5,2]){const {stdout}=await promisify(execFile)("ffmpeg",["-v","error","-ss",String(sample),"-i",path,"-vf","scale=64:64","-frames:v","1","-f","rawvideo","-pix_fmt","rgb24","pipe:1"],{encoding:"buffer",maxBuffer:1024*1024});assert.equal(stdout.length,64*64*3);let spread=0;for(let i=0;i<stdout.length;i+=3)spread+=Math.max(stdout[i]!,stdout[i+1]!,stdout[i+2]!)-Math.min(stdout[i]!,stdout[i+1]!,stdout[i+2]!);spreads.push(spread/(64*64));}
    assert.ok(spreads[0]!<=2,`${target} selected clip decodes grayscale: ${spreads[0]}`);assert.ok(spreads[1]!>8,`${target} other clip stays colored: ${spreads[1]}`);measurements[target]=spreads;
  }
  await host.close();await host.open(projectRoot);assert.deepEqual(host.readTimelineSnapshot(),colorResult);
  const finalWorkspace=await host.readCreationWorkspace(credential,{profile_query:null});assert.equal(finalWorkspace.requests.find(request=>request.authorization.request_id===authorization.request_id)!.timeline_annotations.find(message=>message.operation_id===grayBatch.operation_id)!.processing?.status,"resolved");
  reduceGraySound=true;
  const preserveBatch={...grayBatch,operation_id:randomUUID(),message_id:randomUUID(),expected_revision:3,timeline_version:colorResult.version,draft_id:localDone.processing!.result!.draft_id,request_text:"保持第一个镜头灰度，将原片声音降低6dB，保持当前3秒时长。",annotations:[{...grayBatch.annotations[0]!,annotation_id:randomUUID(),body:"保持当前镜头灰度"}]};
  const preserved=await host.sendTimelineAnnotationMessage(credential,preserveBatch);
  assert.equal(preserved.processing?.status,"resolved");
  const audioResult=host.readTimelineSnapshot() as Timeline;
  const audioTrack=audioResult.tracks.find(track=>track.track_id===grayTrack.track_id)!;
  assert.equal(audioTrack.clips.find(clip=>clip.clip_id===firstClip.clip_id)!.gain_db,(firstClip.gain_db ?? 0)-6);
  assert.deepEqual(audioTrack.effects,resultTrack.effects,"preserve-gray follow-up retains the original registered effect");

  // A failed generation advances the request but retains its older current draft.
  // Editing/reopening must not confuse those independent identities.
  reduceGraySound=false;
  const recoveryBatch={...preserveBatch,operation_id:randomUUID(),message_id:randomUUID(),expected_revision:4,timeline_version:audioResult.version,draft_id:preserved.processing!.result!.draft_id,request_text:"按批注调整对应画面，保持当前3秒时长。",annotations:preserveBatch.annotations.map(note=>({...note,annotation_id:randomUUID(),body:"这个画面改为灰度，保留原画幅和声音。"}))};
  failGeneration=true;
  await assert.rejects(host.sendTimelineAnnotationMessage(credential,recoveryBatch));
  failGeneration=false;
  assert.deepEqual(host.readTimelineSnapshot(),audioResult);
  assert.equal(host.readCreationRequest(authorization.request_id).revisions.length,5);
  assert.equal(host.readCreationRequest(authorization.request_id).drafts.find(d=>d.draft_id===recoveryBatch.draft_id)!.revision,4);
  host.supersedeFailedTimelineAnnotation(credential,{request_id:authorization.request_id,operation_id:recoveryBatch.operation_id});
  await host.close();await host.open(projectRoot);
  const edited={...recoveryBatch,operation_id:randomUUID(),message_id:randomUUID(),expected_revision:5,request_text:"将整部作品改为灰度，保持原片声音和当前3秒时长不变。",annotations:recoveryBatch.annotations.map(note=>({...note,annotation_id:randomUUID()}))};
  const callsBeforeRejectedBindings=modelCalls;
  for(const draft_id of [generated.draft_id,"foreign-draft"]){
    await assert.rejects(host.sendTimelineAnnotationMessage(credential,{...edited,operation_id:randomUUID(),message_id:randomUUID(),draft_id,annotations:edited.annotations.map(note=>({...note,annotation_id:randomUUID()}))}),rejects("TIMELINE_ANNOTATION_DRAFT_MISMATCH"));
  }
  assert.equal(modelCalls,callsBeforeRejectedBindings,"old/foreign drafts never reach the provider");
  assert.equal(host.readCreationRequest(authorization.request_id).revisions.length,5);
  assert.deepEqual(host.readTimelineSnapshot(),audioResult);
  grayscaleMode="all";
  // Crash after processing was persisted but before the revision: later events
  // must not sever ownership when the same operation resumes.
  registerTimelineAnnotationMessage((host as any).session,projectId,edited,new Date(now()).toISOString());
  registerTimelineAnnotationProcessingEvent((host as any).session,projectId,{schema_version:1,operation_id:edited.operation_id,request_id:edited.request_id,target_revision:6,status:"processing",updated_at:new Date(now()).toISOString()});
  await host.close();await host.open(projectRoot);
  host.saveCreationUi(credential,{expected_version:0,value:{forms:{},selected_request_id:authorization.request_id,selected_draft_id:edited.draft_id,selected_clip_id:"",library_open:false,panel_open:false,panel_tab:""}});
  const recovered=await host.sendTimelineAnnotationMessage(credential,edited);
  assert.equal(recovered.replayed,true,"pre-revision interruption resumes the original durable operation");
  assert.equal(recovered.processing?.status,"resolved");
  assert.equal(host.readCreationRequest(authorization.request_id).revisions.length,6);
  assert.equal((host.readTimelineSnapshot() as Timeline).version,audioResult.version+1,"reopened edited request commits exactly once");
  assert.equal(seenColorScope,null);
  assert.equal(seenAnnotationContext.annotations[0].body,edited.annotations[0]!.body);
  const callsAfterRecovery=modelCalls;
  assert.equal((await host.sendTimelineAnnotationMessage(credential,edited)).replayed,true);
  assert.equal(modelCalls,callsAfterRecovery,"recovered receipt replay never resends the model");
  await assert.rejects(host.sendTimelineAnnotationMessage(credential,{...edited,operation_id:randomUUID(),message_id:randomUUID(),annotations:edited.annotations.map(note=>({...note,annotation_id:randomUUID()}))}),rejects("TIMELINE_ANNOTATION_OPERATION_CONFLICT"));
  assert.equal(modelCalls,callsAfterRecovery,"identical text cannot steal another operation's revision");
  await assert.rejects(host.sendTimelineAnnotationMessage(credential,recoveryBatch),rejects("TIMELINE_ANNOTATION_OPERATION_SUPERSEDED"));
  console.log("Failed generation -> edit -> reopen -> exact current older draft -> whole-work plus agreeing anchor -> one commit passed");
  console.log("Scoped grayscale Host annotation: wrong whole-work output denied, same-operation retry commits one target, Preview/Master decoded [target,other] spreads, reopen",JSON.stringify(measurements));
} finally {
  await host.close().catch(() => {});
  await rm(root, { recursive: true, force: true });
}
