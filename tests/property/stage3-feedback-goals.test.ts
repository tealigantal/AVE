// Legacy helper behavior only: new Host runs use model-advisory-v1 and do not invoke these inferred-goal gates; historical replay is verified separately.
import { temporal } from "../fixtures/stage3/temporal-source.js";
import assert from "node:assert/strict";
import type { CreationPlanV1 } from "../../contracts/generated/typescript/editorial/creation-plan.v1.js";
import type { Timeline } from "../../packages/core/timeline-core/src/public.js";
import { resolveCreationFeedbackGoals, bindCreationGrayscaleScope, creationPacingBudget, assertCreationFeedbackGoals, assertCreationGrayscaleExecution, assertCreationPreservedAudio, assertCreationAudioIntentTimeline, creationExplicitAmbientEvidence, assertCreationExplicitAmbientTimeline } from "../../packages/platform/project-host/src/stage3-feedback-goals.js";
import { creationOutputSchema } from "../../packages/platform/project-host/src/stage3-creative.js";
import { assessCreationAmbientTimeline } from "../../packages/platform/contract-runtime/src/public.js";

const grayscaleRevision = { revision: 1, raw_text: "将整部作品改为灰度", viewed_timeline_version: 0 };
const grayscaleGoals = bindCreationGrayscaleScope(resolveCreationFeedbackGoals([grayscaleRevision]), { version: 0, tracks: [] } as unknown as Timeline, grayscaleRevision);
const capturedNoColorOutput = { shots: [{ shot_id: "shot_1", color: null }] } as unknown as CreationPlanV1;
assert.equal(grayscaleGoals.grayscale?.revision, 1);
assert.throws(() => assertCreationFeedbackGoals(capturedNoColorOutput, {} as Timeline, grayscaleGoals), { code: "CREATION_COLOR_GOAL_UNMET" }, "a saved annotation result with no grayscale grade must be rejected before an empty edit intent is committed");
const grayscaleOutput = { shots: [{ shot_id: "shot_1", color: { saturation: 0 } }] } as unknown as CreationPlanV1;
assert.throws(() => assertCreationFeedbackGoals(grayscaleOutput, {} as Timeline, grayscaleGoals), { code: "CREATION_COLOR_GOAL_UNMET" }, "grayscale cannot alter unspecified exposure or contrast");
const neutralGrayscaleOutput = { shots: [{ shot_id: "shot_1", color: { exposure: 0, contrast: 1, saturation: 0 } }] } as unknown as CreationPlanV1;
assert.doesNotThrow(() => assertCreationFeedbackGoals(neutralGrayscaleOutput, {} as Timeline, grayscaleGoals));
const generatedColorSchema: any = creationOutputSchema([], [], { value: 1n, timescale: 30n }, null, grayscaleGoals);
const allowedGrade = generatedColorSchema.properties.shots.items.properties.color.anyOf.find((branch: any) => branch.type === "object");
assert.equal(allowedGrade?.properties.saturation.const, 0, "explicit grayscale request enables only saturation=0 when no color analysis exists");
assert.equal(allowedGrade?.properties.exposure.const, 0);
assert.equal(allowedGrade?.properties.contrast.const, 1);
const noColorGoal = resolveCreationFeedbackGoals([{ revision: 1, raw_text: "保持镜头颜色" }]);
const closedColorSchema: any = creationOutputSchema([], [], { value: 1n, timescale: 30n }, null, noColorGoal);
assert.deepEqual(closedColorSchema.properties.shots.items.properties.color, { type: "null" }, "color remains unavailable without an explicit color goal or visual context");

const revisions = [{ revision: 1, raw_text: "做一个24秒作品，至少四个镜头。" }, { revision: 2, raw_text: "改成12秒，至少四个短镜头，重新选材和排序。" }];
const goals = resolveCreationFeedbackGoals(revisions);
assert.equal(goals.shot_count?.minimum, 4);
assert.equal(goals.shot_count?.exact, null);
assert.equal(goals.selection_or_order_change?.revision, 2);
const base = { tracks: [{ kind: "video", clips: [0, 6, 12, 18].map((start, index) => ({ timeline_start: BigInt(index * 180), source: { asset_id: "asset:a", start_pts: BigInt(start * 24), timescale: 24n } })) }] } as unknown as Timeline;
const plan = { shots: [0, 6, 12, 18].map((start, index) => ({ shot_id: `new-id-${index}`, source: { asset_id: "asset:a", start: { schema_version: 1, value: start * 30, timescale: 30 }, end: { schema_version: 1, value: (start + 3) * 30, timescale: 30 }, span_id: `span-${index}` } })) } as unknown as CreationPlanV1;
assert.throws(() => assertCreationFeedbackGoals(plan, base, goals), { code: "CREATION_SELECTION_GOAL_UNMET" }, "Different IDs/timescales and shorter endpoints cannot pass actual reselection");
const reordered = structuredClone(plan); [reordered.shots[0], reordered.shots[1]] = [reordered.shots[1]!, reordered.shots[0]!];
assert.doesNotThrow(() => assertCreationFeedbackGoals(reordered, base, goals));
const reselected = structuredClone(plan); temporal(reselected.shots[0]!.source).start.value = 30;
assert.doesNotThrow(() => assertCreationFeedbackGoals(reselected, base, goals));
const insufficient = structuredClone(reordered); insufficient.shots.pop();
assert.throws(() => assertCreationFeedbackGoals(insufficient, base, goals), { code: "CREATION_SHOT_GOAL_UNMET" });
const audioOnly = resolveCreationFeedbackGoals([...revisions, { revision: 3, raw_text: "两个片段都降低12dB。保持画面不变，不要重新选材和排序。" }]);
assert.equal(audioOnly.selection_or_order_change, null); assert.equal(audioOnly.shot_count?.minimum, 4);
assert.doesNotThrow(() => assertCreationFeedbackGoals(plan, base, audioOnly));
const exact = resolveCreationFeedbackGoals([{ revision: 1, raw_text: "做8秒作品，分成两个连续片段。" }]);
assert.equal(exact.shot_count?.exact, 2);
assert.throws(() => assertCreationFeedbackGoals(plan, base, exact), { code: "CREATION_SHOT_GOAL_UNMET" });
assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "at least 12 shots" }]).shot_count?.minimum, 12);
assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "至少二十四个镜头" }]).shot_count?.minimum, 24);
assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "不要至少四个镜头的模板" }]).shot_count, null);
assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "我平时喜欢至少四个镜头" }]).shot_count, null, "A historical preference alone cannot impose the current count");
assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "以前只用两个镜头，这次至少四个镜头" }]).shot_count?.minimum, 4);
assert.throws(() => resolveCreationFeedbackGoals([{ revision: 1, raw_text: "至少0个镜头" }]), { code: "CREATION_SHOT_GOAL_INVALID" });
const pictureBase = structuredClone(base);
for (const clip of pictureBase.tracks[0]!.clips) Object.assign(clip.source, { end_pts: clip.source.start_pts + 72n });
const immutablePictureBase = structuredClone(pictureBase);
const picturePlan = structuredClone(plan);
for (const shot of picturePlan.shots) shot.color = { exposure: 0.3, contrast: 1, saturation: 1 };
const pictureGoals = resolveCreationFeedbackGoals([{ revision: 1, raw_text: "两个镜头曝光提高0.3。保持原片范围、镜头顺序和总时长不变，不改对比度、饱和度或构图。" }]);
assert.deepEqual(pictureGoals.preservation?.color_fields, ["contrast", "saturation"]);
assert.equal(pictureGoals.preservation?.source_ranges_and_order, true);
assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "保持原片范围、顺序和现在的曝光不变。" }]).preservation?.source_ranges_and_order, true);
assert.doesNotThrow(() => assertCreationFeedbackGoals(picturePlan, pictureBase, pictureGoals), "An absent grade is neutral, so changing only exposure preserves contrast and saturation");
const flattened = structuredClone(picturePlan); flattened.shots[0]!.color!.contrast = 0;
assert.throws(() => assertCreationFeedbackGoals(flattened, pictureBase, pictureGoals), { code: "CREATION_PRESERVATION_GOAL_UNMET" }, "Explicit contrast zero is not a neutral default");
const changedRange = structuredClone(picturePlan); temporal(changedRange.shots[0]!.source).end.value -= 1;
assert.throws(() => assertCreationFeedbackGoals(changedRange, pictureBase, pictureGoals), { code: "CREATION_PRESERVATION_GOAL_UNMET" });
const keepColor = resolveCreationFeedbackGoals([{ revision: 1, raw_text: "同期声降低12dB，不要改变色彩。" }]);
assert.deepEqual(keepColor.preservation?.color_fields, ["exposure", "contrast", "saturation"]);
assert.throws(() => assertCreationFeedbackGoals(picturePlan, pictureBase, keepColor), { code: "CREATION_PRESERVATION_GOAL_UNMET" });
const neutralPlan = structuredClone(plan); for (const shot of neutralPlan.shots) shot.color = null;
assert.doesNotThrow(() => assertCreationFeedbackGoals(neutralPlan, pictureBase, keepColor));
const currentOnly = resolveCreationFeedbackGoals([{ revision: 1, raw_text: "不要改变色彩。" }, { revision: 2, raw_text: "现在把对比度恢复到1。" }]);
assert.equal(currentOnly.preservation, null, "Old preservation does not block a later explicit color correction");
assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "不要保持色彩，重新调色。" }]).preservation, null);
assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "以前我喜欢不改色彩" }]).preservation, null);
assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "以前重新选材和排序" }]).selection_or_order_change, null);
assert.deepEqual(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "仅将曝光改为0.3并保持对比度和饱和度" }]).preservation?.color_fields, ["contrast", "saturation"]);
assert.deepEqual(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "保持曝光不变，对比度改为1并保持饱和度" }]).preservation?.color_fields, ["exposure", "saturation"]);
assert.deepEqual(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "曝光保持0.3并把对比度恢复为1，饱和度保持1" }]).preservation?.color_fields, ["exposure", "saturation"]);
assert.deepEqual(pictureBase, immutablePictureBase, "Goal checks never repair a candidate or rewrite the old Timeline");
const captionCorrection = "删掉“每一步都通往成长”和“远方总有新的答案”这两句不同镜头上的字幕，都太像总结了。保护这两个相关画面；其他镜头、源片范围、顺序、音轨和总时长不变。这次只是具体字幕修正，不是长期偏好。";
const captionGoals = resolveCreationFeedbackGoals([...revisions, { revision: 3, raw_text: "请真正重新选材并改变镜头排序" }, { revision: 4, raw_text: captionCorrection }]);
assert.equal(captionGoals.selection_or_order_change, null, "Historical reselection is not an outstanding action for current caption-only feedback");
assert.equal(captionGoals.preservation?.source_ranges_and_order, true, "Real A feedback's trailing predicate binds the explicit source range/order list");
assert.equal(captionGoals.preservation?.revision, 4);
assert.equal(captionGoals.preservation?.audio, true);
assert.doesNotThrow(() => assertCreationFeedbackGoals(picturePlan, pictureBase, captionGoals));
assert.throws(() => assertCreationFeedbackGoals(changedRange, pictureBase, captionGoals), { code: "CREATION_PRESERVATION_GOAL_UNMET" });
assert.throws(() => assertCreationFeedbackGoals(reordered, pictureBase, captionGoals), { code: "CREATION_PRESERVATION_GOAL_UNMET" });
for (const raw_text of ["不要让源片范围、顺序不变", "不用源片范围、顺序不变", "以前我喜欢源片范围、顺序不变", "不是源片范围、顺序不变", "并非源片范围、顺序不变"]) assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text }]).preservation, null);
assert.deepEqual(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "曝光提高0.3并让对比度和饱和度不变" }]).preservation?.color_fields, ["contrast", "saturation"]);
const audioBase = { sequence: { timebase: { value: 1n, timescale: 30n } }, tracks: [{ track_id: "video-main", kind: "video", clips: [{ clip_id: "v", source: { asset_id: "asset:a", start_pts: 0n, end_pts: 60n, timescale: 30n }, timeline_start: 0n, timeline_duration: 60n, gain_db: 0 }] }, { track_id: "audio-music", kind: "audio", clips: [{ clip_id: "a", source: { asset_id: "asset:b", start_pts: 0n, end_pts: 30n, timescale: 30n }, timeline_start: 15n, timeline_duration: 30n, gain_db: -9 }], audio_routing: [{ routing_id: "r", source_clip_id: "a", bus: "music" }] }] } as unknown as Timeline;
const emptyAudioBase = { sequence: audioBase.sequence, tracks: [] } as unknown as Timeline;
const firstDraftWithEmbeddedAudio = { sequence: audioBase.sequence, tracks: [{ track_id: "video-main", kind: "video", clips: [{ clip_id: "first-shot", semantic_sidecar:{semantic_id:"first-shot",labels:[],evidence_refs:["span:a"]}, source: { asset_id: "asset:a", start_pts: 0n, end_pts: 60n, timescale: 30n }, timeline_start: 0n, timeline_duration: 60n, gain_db: 0 }] }] } as unknown as Timeline;
// The following intent-proof checks exist solely for replaying historical
// source-evidence records; new planning must not require this structure.
const intentContext={audio_requirement_projection:"source-evidence-v1",source_spans:[{span_id:"span:a",asset_id:"asset:a",has_audio:true,observations:[{kind:"transcript",evidence_id:"utterance",start_pts:"10",end_pts:"20",timescale:"30",uncertain:false}]}]};
const intentQuery={audio_intent:{status:"required",requirements:[{kind:"speech",evidence_ids:["utterance"]}]}};
assert.doesNotThrow(()=>assertCreationAudioIntentTimeline(intentContext,intentQuery,firstDraftWithEmbeddedAudio));
for (const mutate of [
  (timeline:any)=>{timeline.tracks[0].muted=true;},
  (timeline:any)=>{timeline.tracks[0].enabled=false;},
  (timeline:any)=>{timeline.tracks[0].clips[0].gain_db=-96;},
  (timeline:any)=>{timeline.tracks[0].audio_routing=[{source_clip_id:"first-shot",muted:true}];},
  (timeline:any)=>{timeline.tracks[0].clips[0].source.end_pts=15n;},
  (timeline:any)=>{timeline.tracks[0].clips[0].semantic_sidecar.evidence_refs=["span:other"];},
  (timeline:any)=>{timeline.tracks.push({track_id:"other",kind:"audio",solo:true,clips:[]});},
]) { const changed=structuredClone(firstDraftWithEmbeddedAudio);mutate(changed);assert.throws(()=>assertCreationAudioIntentTimeline(intentContext,intentQuery,changed),{code:"CREATION_AUDIO_REQUIREMENT_UNMET"}); }
const firstDraftWithIndependentAudio=structuredClone(firstDraftWithEmbeddedAudio) as any;
firstDraftWithIndependentAudio.tracks[0].clips[0].gain_db=-96;
firstDraftWithIndependentAudio.tracks.push({track_id:"audio-dialogue",kind:"audio",clips:[{clip_id:"dialogue",semantic_sidecar:{semantic_id:"dialogue",labels:[],evidence_refs:["span:a"]},source:{asset_id:"asset:a",start_pts:0n,end_pts:30n,timescale:30n},timeline_start:0n,timeline_duration:30n,gain_db:-6}],audio_routing:[{source_clip_id:"dialogue",bus:"dialogue"}]});
assert.doesNotThrow(()=>assertCreationAudioIntentTimeline(intentContext,intentQuery,firstDraftWithIndependentAudio));
firstDraftWithIndependentAudio.tracks[1].audio_routing[0].muted=true;
assert.throws(()=>assertCreationAudioIntentTimeline(intentContext,intentQuery,firstDraftWithIndependentAudio),{code:"CREATION_AUDIO_REQUIREMENT_UNMET"});
const multipleTimelineContext=structuredClone(intentContext);multipleTimelineContext.source_spans[0].observations.push({kind:"transcript",evidence_id:"late",start_pts:"50",end_pts:"70",timescale:"30",uncertain:false});
const multipleTimelineQuery={audio_intent:{status:"required",requirements:[{kind:"speech",evidence_ids:["utterance","late"]}]}};
assert.throws(()=>assertCreationAudioIntentTimeline(multipleTimelineContext,multipleTimelineQuery,firstDraftWithEmbeddedAudio),{code:"CREATION_AUDIO_REQUIREMENT_UNMET"});
const ambientTimelineContext=structuredClone(intentContext) as any;ambientTimelineContext.source_spans[0].observations=[{kind:"audio",evidence_id:"ambient",start_pts:"50",end_pts:"70",timescale:"30",uncertain:false}];
assert.throws(()=>assertCreationAudioIntentTimeline(ambientTimelineContext,{audio_intent:{status:"required",requirements:[{kind:"ambient",evidence_ids:["ambient"]}]}},firstDraftWithEmbeddedAudio),{code:"CREATION_AUDIO_REQUIREMENT_UNMET"});
assert.doesNotThrow(()=>assertCreationAudioIntentTimeline({}, {}, firstDraftWithEmbeddedAudio), "historical roots do not acquire new obligations");
const eventTimelineContext=structuredClone(intentContext) as any;eventTimelineContext.audio_requirement_projection="source-evidence-v2";
eventTimelineContext.source_spans[0].observations=[{kind:"audio_event",event_kind:"ambient",evidence_id:"wind",start_pts:"10",end_pts:"20",timescale:"30",uncertain:false,signal:{nonzero:true}}];
const eventTimelineQuery={audio_intent:{status:"required",requirements:[{kind:"ambient",evidence_ids:["wind"]}]}};
assert.doesNotThrow(()=>assertCreationAudioIntentTimeline(eventTimelineContext,eventTimelineQuery,firstDraftWithEmbeddedAudio));
for(const mutate of [(t:any)=>{t.tracks[0].muted=true;},(t:any)=>{t.tracks[0].clips[0].source.end_pts=15n;},(t:any)=>{t.tracks[0].clips[0].timeline_duration=15n;},(t:any)=>{t.tracks[0].clips[0].semantic_sidecar.evidence_refs=["other"];},(t:any)=>{t.tracks.push({track_id:"other",kind:"audio",solo:true,clips:[]});},(t:any)=>{t.tracks[0].clips[0].time_map={segments:[{kind:"hold"}]};},(t:any)=>{t.tracks[0].clips[0].speed={numerator:2,denominator:1};},(t:any)=>{t.tracks[0].clips[0].boundary_fades={schema_version:1,audio_fade_in:{value:2n,timescale:1n}};}]) {
 const changed=structuredClone(firstDraftWithEmbeddedAudio);mutate(changed);assert.throws(()=>assertCreationAudioIntentTimeline(eventTimelineContext,eventTimelineQuery,changed),{code:"CREATION_AUDIO_REQUIREMENT_UNMET"});
}
const alternateScale=structuredClone(firstDraftWithEmbeddedAudio) as any;alternateScale.tracks[0].clips[0].source={asset_id:"asset:a",start_pts:0n,end_pts:96000n,timescale:48000n};
assert.doesNotThrow(()=>assertCreationAudioIntentTimeline(eventTimelineContext,eventTimelineQuery,alternateScale),"equivalent source duration with a different timebase remains valid");
const explicitSource = `asset:sha256:${"a".repeat(64)}`;
const explicitContext = structuredClone(eventTimelineContext) as any;
explicitContext.source_spans[0].asset_id = explicitSource;
explicitContext.source_spans[0].observations[0].signal = { method:"pcm16-sample-v1", source_digest:"a".repeat(64), sample_id:"sample", stream_index:0, sample_digest:"b".repeat(64), pcm_digest:"c".repeat(64), sample_rate:48000, channels:1, sample_count:16000, nonzero:true };
const explicitTimeline = structuredClone(firstDraftWithEmbeddedAudio) as any;
explicitTimeline.tracks[0].clips[0].source.asset_id = explicitSource;
assert.deepEqual(creationExplicitAmbientEvidence(explicitContext), ["wind"]);
assert.doesNotThrow(()=>assertCreationExplicitAmbientTimeline(explicitContext,explicitTimeline));
assert.deepEqual(assessCreationAmbientTimeline(explicitContext,explicitTimeline), {status:"verified"});
assert.deepEqual(assessCreationAmbientTimeline({},explicitTimeline), {status:"unverified",reason:"no-sound-analysis"});
const missingAmbient = structuredClone(explicitContext); missingAmbient.source_spans[0].observations = [];
assert.deepEqual(assessCreationAmbientTimeline(missingAmbient,explicitTimeline), {status:"unverified",reason:"no-verified-ambient-event"});
const mutedAmbient = structuredClone(explicitTimeline); mutedAmbient.tracks[0].muted = true;
assert.deepEqual(assessCreationAmbientTimeline(explicitContext,mutedAmbient), {status:"unverified",reason:"event-not-covered"});
const corruptAmbient = structuredClone(explicitContext); corruptAmbient.source_spans[0].observations[0].signal.pcm_digest = "bad";
assert.throws(()=>assessCreationAmbientTimeline(corruptAmbient,explicitTimeline), {code:"CREATION_AUDIO_EVIDENCE_INSUFFICIENT"});
for (const mutate of [(c:any)=>{c.source_spans[0].observations[0].uncertain=true;},(c:any)=>{c.source_spans[0].observations[0].event_kind="music";},(c:any)=>{c.source_spans[0].observations[0].signal.nonzero=false;}]) {
  const changed=structuredClone(explicitContext);mutate(changed);
  assert.throws(()=>assertCreationExplicitAmbientTimeline(changed,explicitTimeline),{code:"CREATION_AUDIO_REQUIREMENT_UNMET"});
}
for (const mutate of [(c:any)=>{c.source_spans[0].observations[0].signal.source_digest="d".repeat(64);},(c:any)=>{c.source_spans[0].observations[0].signal.sample_count=1;},(c:any)=>{c.source_spans[0].observations[0].start_pts="-1";}]) {
  const changed=structuredClone(explicitContext);mutate(changed);
  assert.throws(()=>creationExplicitAmbientEvidence(changed),{code:"CREATION_AUDIO_EVIDENCE_INSUFFICIENT"});
}
for (const mutate of [(t:any)=>{t.tracks[0].muted=true;},(t:any)=>{t.tracks[0].clips[0].source.end_pts=15n;},(t:any)=>{t.tracks[0].clips[0].semantic_sidecar.evidence_refs=["other"];},(t:any)=>{t.tracks[0].clips[0].speed={numerator:2,denominator:1};},(t:any)=>{t.tracks[0].clips[0].boundary_fades={schema_version:1,audio_fade_in:{value:2n,timescale:1n}};}]) {
  const changed=structuredClone(explicitTimeline);mutate(changed);
  assert.throws(()=>assertCreationExplicitAmbientTimeline(explicitContext,changed),{code:"CREATION_AUDIO_REQUIREMENT_UNMET"});
}
assert.throws(()=>creationExplicitAmbientEvidence(intentContext),{code:"CREATION_AUDIO_EVIDENCE_INSUFFICIENT"});
assert.doesNotThrow(() => assertCreationPreservedAudio(emptyAudioBase, firstDraftWithEmbeddedAudio, captionGoals, new Set(["asset:a"])), "A preserved original sound may enter a first draft through its selected video's embedded audio");
for (const mutate of [
  (t: any) => { t.tracks[0].clips[0].gain_db = -96; },
  (t: any) => { t.tracks[1].clips[0].gain_db = -96; },
  (t: any) => { t.tracks[1].clips[0].source.start_pts = 1n; },
  (t: any) => { t.tracks[1].clips[0].timeline_start = 16n; },
  (t: any) => { t.tracks[1].clips[0].timeline_duration = 29n; },
  (t: any) => { t.tracks[1].clips[0].boundary_fades = { schema_version: 1, audio_fade_in: { value: 1n, timescale: 10n } }; },
  (t: any) => { t.tracks[1].audio_routing[0].muted = true; },
  (t: any) => { t.tracks[1].muted = true; },
  (t: any) => { t.tracks.pop(); },
]) { const changed = structuredClone(audioBase); mutate(changed); assert.throws(() => assertCreationPreservedAudio(audioBase, changed, captionGoals, new Set(["asset:a", "asset:b"])), { code: "CREATION_PRESERVATION_GOAL_UNMET" }); }
const captionOnly = structuredClone(audioBase) as any;
captionOnly.tracks[0].captions = []; captionOnly.tracks[0].clips[0].grade = { exposure: 0.3, contrast: 1, saturation: 1 };
captionOnly.tracks[0].clips[0].source.end_pts = 120n; captionOnly.tracks[0].clips[0].source.timescale = 60n;
assert.doesNotThrow(() => assertCreationPreservedAudio(audioBase, captionOnly, captionGoals, new Set(["asset:a", "asset:b"])), "Caption/picture changes and exact equivalent source units cannot change audio semantics");
const silentPictureChange = structuredClone(audioBase) as any; silentPictureChange.tracks[0].clips[0].source.end_pts = 45n;
assert.doesNotThrow(() => assertCreationPreservedAudio(audioBase, silentPictureChange, captionGoals, new Set(["asset:b"])), "Verified absence of an embedded audio stream is not a sound lock on silent picture material");
assert.equal(resolveCreationFeedbackGoals([{ revision: 1, raw_text: "音轨不变" }, { revision: 2, raw_text: "本次原声降低12dB" }]).preservation, null);
console.log("Stage3 explicit feedback goals: unchanged-source rejection, rational identity, counts, negation and later local revisions passed");

const pacingGoals=resolveCreationFeedbackGoals([{revision:2,raw_text:"当前这版改成30秒，至少四个镜头，每个镜头更舒展，优先海岸景色。虽然我以前喜欢紧凑节奏，当前明确要求优先。"}]);
assert.equal(pacingGoals.relative_pacing?.kind,"longer-mean-with-preserved-minimum");
const pacingBase={version:1,sequence:{timebase:{value:1n,timescale:30n}},tracks:[{kind:"video",clips:[90,100,100,120,130].map((d,i)=>({clip_id:`base-${i}`,timeline_duration:BigInt(d)}))}]} as unknown as Timeline;
assert.equal(creationPacingBudget(pacingBase,pacingGoals)!.minimum_shot_ticks,"90");
const timedPlan=(durations:number[]): CreationPlanV1 =>({...plan,shots:durations.map((d,i)=>({...plan.shots[0]!,shot_id:`paced-${i}`,source:{...plan.shots[0]!.source,start:{schema_version:1,value:0,timescale:30},end:{schema_version:1,value:d,timescale:30}}}))});
const fragmented=timedPlan([93,130,120,92,78,75,132,57,41,61,21]);
assert.throws(()=>assertCreationFeedbackGoals(fragmented,pacingBase,pacingGoals),{code:"CREATION_PACING_GOAL_UNMET"},"Actual B 900 total ticks do not establish a longer duration for every shot");
assert.doesNotThrow(()=>assertCreationFeedbackGoals(timedPlan([112,112,112,112,113,113,113,113]),pacingBase,pacingGoals));
for(const raw_text of ["以前我喜欢每个镜头更舒展","不要每个镜头更长","只把其中一个镜头拉长","慢节奏海边版本"]){assert.equal(resolveCreationFeedbackGoals([{revision:2,raw_text}]).relative_pacing,null,"do not invent a numerical aesthetic threshold for vague, local or historical wording");}
assert.equal(resolveCreationFeedbackGoals([{revision:2,raw_text:"每个镜头更长"},{revision:3,raw_text:"仅删字幕"}]).relative_pacing,null,"relative changes are not repeated on later local edits");
const oldClock={version:1,sequence:{timebase:{value:1n,timescale:24n}},tracks:[{kind:"video",clips:[{clip_id:"old-a",timeline_duration:24n},{clip_id:"old-b",timeline_duration:48n}]}]} as unknown as Timeline;
const currentClock={version:4,sequence:{timebase:{value:1n,timescale:30n}},tracks:[{kind:"video",clips:[{clip_id:"current-a",timeline_duration:15n}]}]} as unknown as Timeline;
const relative=resolveCreationFeedbackGoals([{revision:4,raw_text:"每个镜头更舒展"}]);
assert.equal(creationPacingBudget(oldClock,relative,[],currentClock.sequence!.timebase,currentClock)!.minimum_shot_ticks,"30");
assert.throws(()=>assertCreationFeedbackGoals(timedPlan([45]),currentClock,relative,oldClock),{code:"CREATION_PACING_GOAL_UNMET"});
assert.doesNotThrow(()=>assertCreationFeedbackGoals(timedPlan([46]),currentClock,relative,oldClock));
assert.throws(()=>creationPacingBudget(oldClock,relative,["current-a"],currentClock.sequence!.timebase,currentClock),{code:"CREATION_PACING_PRESERVATION_CONFLICT"},"protection checks current clip identities against a viewed historical pacing threshold");

// Mean and minimum are separate; a short old shot need not exceed the old mean.
assert.doesNotThrow(()=>assertCreationFeedbackGoals(timedPlan([160,125,125,115,95,95,95,90]),pacingBase,pacingGoals));
assert.throws(()=>assertCreationFeedbackGoals(timedPlan(Array(9).fill(100)),pacingBase,pacingGoals),{code:"CREATION_PACING_GOAL_UNMET"},"900 ticks with mean100 does not exceed reference108");
assert.throws(()=>assertCreationFeedbackGoals(timedPlan([200,200,200,222,78]),pacingBase,pacingGoals),{code:"CREATION_PACING_GOAL_UNMET"},"a higher mean cannot conceal a new short flash");
assert.throws(()=>creationPacingBudget(pacingBase,resolveCreationFeedbackGoals([{revision:2,raw_text:"每个镜头更长"}])),{code:"CREATION_PACING_MAPPING_REQUIRED"},"literal per-shot lengthening must not borrow the old whole-work mean");
const preservePacing=resolveCreationFeedbackGoals([{revision:2,raw_text:"每个镜头更舒展，源片范围和顺序不变"}]);
assert.throws(()=>creationPacingBudget(pacingBase,preservePacing),{code:"CREATION_PACING_PRESERVATION_CONFLICT"});

for(const raw_text of ["整体更舒展","整体节奏放慢","节奏整体更慢"]){assert.equal(resolveCreationFeedbackGoals([{revision:3,raw_text}]).relative_pacing?.kind,"longer-mean-with-preserved-minimum");}
const fractionalShortest={version:1,sequence:{timebase:{value:1n,timescale:24n}},tracks:[{kind:"video",clips:[{clip_id:"a",timeline_duration:25n},{clip_id:"b",timeline_duration:48n}]}]} as unknown as Timeline;
assert.equal(creationPacingBudget(fractionalShortest,relative,[],currentClock.sequence!.timebase,currentClock)!.minimum_shot_ticks,"32","reference minimum converts upward exactly; no fractional shortening");

for (const text of ["去掉灰度效果", "移除黑白效果", "remove grayscale"]) assert.equal(resolveCreationFeedbackGoals([{ revision: 2, raw_text: text }]).grayscale, null);
const retainedGraySchema: any = creationOutputSchema([], [], { value: 1n, timescale: 30n }, null, noColorGoal, true);
assert.equal(retainedGraySchema.properties.shots.items.properties.color.anyOf[0].properties.saturation.const, 0);
const mixedColorSchema: any = creationOutputSchema([{compile:{span_id:"tagged",observations:[],color_context:{input_space:"rec709"}},context:{render_capabilities:{static_reframe_modes:[]}}}] as any, [], {value:1n,timescale:30n}, null, noColorGoal, true);
assert.equal(mixedColorSchema.properties.shots.items.properties.color.anyOf.find((branch: any) => branch.type === "object").properties.exposure.const, undefined, "retaining grayscale must not constrain tagged source grades");
assert.equal(mixedColorSchema.properties.shots.items.allOf[0].else.properties.color.anyOf[0].properties.saturation.const, 0);

// Two identical source moments still have distinct clip identities and positions.
const scopedBase = { version: 7, sequence: { timebase: { value: 1n, timescale: 30n } }, tracks: [{ track_id: "video-main", kind: "video", clips: [0, 1].map(i => ({ clip_id: `clip-${i}`, source: { asset_id: "asset:a", start_pts: 0n, end_pts: 30n, timescale: 30n }, timeline_start: BigInt(i * 30), timeline_duration: 30n })) }] } as unknown as Timeline;
const localRevision = { revision: 2, raw_text: "只将第一个镜头改为灰度，其余镜头保持不变。", viewed_timeline_version: 7 };
const localGoals = bindCreationGrayscaleScope(resolveCreationFeedbackGoals([localRevision]), scopedBase, localRevision);
assert.deepEqual(localGoals.grayscale?.scope, { kind: "clips", base_timeline_version: 7, clip_ids: ["clip-0"] });
const scopedPlan = { shots: scopedBase.tracks[0]!.clips.map((clip, i) => ({ shot_id: clip.clip_id, source: { asset_id: "asset:a", span_id: "span-a", start: {schema_version:1,value:0,timescale:60}, end:{schema_version:1,value:60,timescale:60} }, color: i ? null : { exposure:0, contrast:1, saturation:0 } })) } as unknown as CreationPlanV1;
assert.doesNotThrow(() => assertCreationFeedbackGoals(scopedPlan, scopedBase, localGoals));
for (const mutate of [
  (p: any) => { p.shots[1].color = p.shots[0].color; },
  (p: any) => { p.shots.reverse(); },
  (p: any) => { p.shots[0].shot_id = "invented"; },
  (p: any) => { p.shots[0].source.end.value = 30; },
  (p: any) => { p.shots.pop(); },
]) { const invalid = structuredClone(scopedPlan); mutate(invalid); assert.throws(() => assertCreationFeedbackGoals(invalid, scopedBase, localGoals), { code: "CREATION_COLOR_SCOPE_CHANGED" }); }
const grayCandidate: any = structuredClone(scopedBase); grayCandidate.tracks[0]!.effects = [{ effect_id:"gray-0",clip_id:"clip-0",kind:"grayscale",enabled:true }];
assert.doesNotThrow(() => assertCreationGrayscaleExecution(scopedBase, grayCandidate, localGoals));
const wrongExecution = structuredClone(grayCandidate); wrongExecution.tracks[0]!.effects!.push({effect_id:"gray-1",clip_id:"clip-1",kind:"grayscale",enabled:true});
assert.throws(() => assertCreationGrayscaleExecution(scopedBase, wrongExecution, localGoals), {code:"CREATION_COLOR_SCOPE_CHANGED"});
assert.doesNotThrow(() => assertCreationPreservedAudio(scopedBase, grayCandidate, resolveCreationFeedbackGoals([{revision:2,raw_text:"保持原片声音不变"}]), new Set(["asset:a"])), "a registered visual grayscale effect must not be mistaken for an audio edit");
const note = { body:"调整范围：仅当前片段。将当前镜头改为灰度", resolution:{status:"mapped",timeline_version:7,track_id:"video-main",clip_id:"clip-1"} };
const selectedRevision = {revision:2,raw_text:"按批注调整",viewed_timeline_version:7};
const selectedGoals = bindCreationGrayscaleScope(resolveCreationFeedbackGoals([selectedRevision]),scopedBase,selectedRevision,[note]);
assert.deepEqual(selectedGoals.grayscale?.scope,{kind:"clips",base_timeline_version:7,clip_ids:["clip-1"]},"annotation-only color goal uses the resolved current clip");
for(const raw_text of ["只改当前镜头为灰度","将镜头改为灰度","只把第三个镜头改为灰度","按批注改为灰度"]){const r={...localRevision,raw_text};assert.throws(()=>bindCreationGrayscaleScope(resolveCreationFeedbackGoals([r]),scopedBase,r),{code:"CREATION_COLOR_SCOPE_REQUIRED"});}
for(const resolution of [{...note.resolution,status:"unresolved"},{...note.resolution,timeline_version:6},{...note.resolution,clip_id:null},{...note.resolution,track_id:"audio-main"}])assert.throws(()=>bindCreationGrayscaleScope(resolveCreationFeedbackGoals([selectedRevision]),scopedBase,selectedRevision,[{...note,resolution}]),{code:"CREATION_COLOR_SCOPE_REQUIRED"});
assert.throws(()=>bindCreationGrayscaleScope(resolveCreationFeedbackGoals([localRevision]),scopedBase,localRevision,[note]),{code:"CREATION_COLOR_SCOPE_REQUIRED"},"ordinal and anchor disagree");
const staleRevision={...localRevision,viewed_timeline_version:6};assert.throws(()=>bindCreationGrayscaleScope(resolveCreationFeedbackGoals([staleRevision]),scopedBase,staleRevision),{code:"CREATION_COLOR_SCOPE_REQUIRED"});
const overlap:any=structuredClone(scopedBase);overlap.tracks[0]!.clips[1]!.timeline_start=0n;assert.throws(()=>bindCreationGrayscaleScope(resolveCreationFeedbackGoals([localRevision]),overlap,localRevision),{code:"CREATION_COLOR_SCOPE_REQUIRED"});
const localMixedSchema:any=creationOutputSchema([{compile:{span_id:"tagged",observations:[],color_context:{input_space:"rec709"}},context:{render_capabilities:{static_reframe_modes:[]}}}] as any,[],{value:1n,timescale:30n},null,localGoals);
assert.equal(localMixedSchema.properties.shots.items.properties.color.anyOf.find((b:any)=>b.type==="object").properties.exposure.const,undefined,"local grayscale must not force unrelated tagged clips to neutral grades");
console.log("Scoped grayscale: explicit ordinals, validated annotations, conflicts, unchanged other clips, executed color and original audio passed");

for (const [raw_text, expected] of [["只将第一个镜头改为灰度并保持第二个镜头原样","clip-0"],["第一个镜头不要改动但第二个镜头改为灰度","clip-1"]]) { const r={...localRevision,raw_text:raw_text!}; assert.deepEqual(bindCreationGrayscaleScope(resolveCreationFeedbackGoals([r]),scopedBase,r).grayscale?.scope,{kind:"clips",base_timeline_version:7,clip_ids:[expected]}); }
for (const mutate of [(t:any)=>{t.tracks[0].clips[1].gain_db=-20},(t:any)=>{t.tracks[0].clips[1].transform={scale_x:2,scale_y:2}},(t:any)=>{t.tracks[0].captions=[{caption_id:"unexpected"}]}]){const changed=structuredClone(grayCandidate);mutate(changed);assert.throws(()=>assertCreationGrayscaleExecution(scopedBase,changed,localGoals),{code:"CREATION_COLOR_SCOPE_CHANGED"});}

for(const raw_text of ["将整部作品改为灰度，但第二个镜头保持彩色","所有镜头改成黑白，第二个镜头不要变"]){const r={...localRevision,raw_text};assert.throws(()=>bindCreationGrayscaleScope(resolveCreationFeedbackGoals([r]),scopedBase,r),{code:"CREATION_COLOR_SCOPE_REQUIRED"});}

const keepGrayRevision={...localRevision,raw_text:"保持第一个镜头灰度，将声音降低6dB"};
const keepGrayGoals=bindCreationGrayscaleScope(resolveCreationFeedbackGoals([keepGrayRevision]),grayCandidate,keepGrayRevision);
assert.equal(keepGrayGoals.grayscale?.operation,"preserve");
const grayAudio=structuredClone(grayCandidate);grayAudio.tracks[0].clips[0].gain_db=-6;
assert.doesNotThrow(()=>assertCreationGrayscaleExecution(grayCandidate,grayAudio,keepGrayGoals),"preserving existing grayscale does not veto explicitly requested sound changes");
assert.throws(()=>bindCreationGrayscaleScope(resolveCreationFeedbackGoals([keepGrayRevision]),scopedBase,keepGrayRevision),{code:"CREATION_COLOR_SCOPE_REQUIRED"});

// A point annotation can explain the same whole-work change without restricting it.
const wholeRevision={...localRevision,raw_text:"将整部作品的所有视频画面改为灰度，保留原画幅和声音。"};
const agreeingNotes=[{...note,body:"这个画面改为灰度，保留原画幅和声音。"},{...note,body:"这一整段视频改为灰度，时长、原声和配乐保持不变。"}];
assert.deepEqual(bindCreationGrayscaleScope(resolveCreationFeedbackGoals([wholeRevision]),scopedBase,wholeRevision,agreeingNotes).grayscale?.scope,{kind:"whole-work"});
for(const resolution of [{...note.resolution,status:"unresolved"},{...note.resolution,timeline_version:6},{...note.resolution,clip_id:"foreign"}])assert.throws(()=>bindCreationGrayscaleScope(resolveCreationFeedbackGoals([wholeRevision]),scopedBase,wholeRevision,[{...agreeingNotes[0]!,resolution}]),{code:"CREATION_COLOR_SCOPE_REQUIRED"});
assert.deepEqual(bindCreationGrayscaleScope(resolveCreationFeedbackGoals([wholeRevision]),scopedBase,wholeRevision,[agreeingNotes[0]!,{...note,body:"只把当前片段声音降低6dB"}]).grayscale?.scope,{kind:"whole-work"},"a local audio instruction does not restrict the whole-work color scope");
for(const body of ["保持当前镜头灰度","当前镜头不要改为灰度","这个镜头保持彩色","除了这个镜头，其余改为灰度","只把当前片段改为灰度","调整范围：仅当前片段。将当前镜头改为灰度"]){
  assert.throws(()=>bindCreationGrayscaleScope(resolveCreationFeedbackGoals([wholeRevision]),scopedBase,wholeRevision,[{...note,body}]),{code:"CREATION_COLOR_SCOPE_REQUIRED"},body);
}
