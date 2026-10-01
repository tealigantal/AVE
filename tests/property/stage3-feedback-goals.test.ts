import assert from "node:assert/strict";
import type { CreationPlanV1 } from "../../contracts/generated/typescript/editorial/creation-plan.v1.js";
import type { Timeline } from "../../packages/core/timeline-core/src/public.js";
import { resolveCreationFeedbackGoals, creationPacingBudget, assertCreationFeedbackGoals, assertCreationPreservedAudio } from "../../packages/platform/project-host/src/stage3-feedback-goals.js";

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
const reselected = structuredClone(plan); reselected.shots[0]!.source.start.value = 30;
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
const changedRange = structuredClone(picturePlan); changedRange.shots[0]!.source.end.value -= 1;
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
