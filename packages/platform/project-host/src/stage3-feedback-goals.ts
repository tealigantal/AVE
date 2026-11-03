import type { CreationPlanV1 } from "../../../../contracts/generated/typescript/editorial/creation-plan.v1.js";
import { effectiveGradeSettings, type Timeline } from "../../../core/timeline-core/src/public.js";
import { CreationError } from "../../contract-runtime/src/public.js";
import { isDeepStrictEqual } from "node:util";

type Revision = Readonly<{ revision: number; raw_text: string }>;
export type CreationColorAnnotation = Readonly<{ body: string; resolution: Readonly<{ status: string; timeline_version: number; track_id: string | null; clip_id: string | null }> }>;
export type CreationFeedbackGoals = Readonly<{
  relative_pacing: Readonly<{ revision: number; matched_text: string; kind: "longer-mean-with-preserved-minimum" | "referenced-shots-longer" }> | null;
  grayscale: Readonly<{ revision: number; matched_text: string; operation: "apply" | "preserve"; scope?: Readonly<{ kind: "whole-work" }> | Readonly<{ kind: "clips"; base_timeline_version: number; clip_ids: readonly string[] }> }> | null;
  shot_count: Readonly<{ minimum: number; exact: number | null; revision: number; matched_text: string }> | null;
  selection_or_order_change: Readonly<{ revision: number; matched_text: string }> | null;
  preservation: Readonly<{ revision: number; source_ranges_and_order: boolean; audio: boolean; color_fields: readonly ("exposure" | "contrast" | "saturation")[]; matched_text: readonly string[] }> | null;
}>;
const fail = (code: string, detail: string): never => { throw new CreationError(code, detail); };
const grayscaleClauses = (text: string): string[] => text.split(/[，,。；;！!？?\n]|并且|并|同时|但是|但|然后|而|且/).filter(clause => {
  const match = /灰度|黑白|grayscale|black\s*(?:and|&)\s*white|desaturat(?:e|ion)/i.exec(clause);
  return Boolean(match && currentScope(clause.slice(0, match.index)) && !/不要|不用|无需|不必|不需要|禁止|避免|去掉|移除|删除|取消|remove\s+|clear\s+|not\s+|don't\s+|do not\s+/i.test(clause.slice(0, match.index)));
});
const requestsGrayscale = (text: string): boolean => grayscaleClauses(text).length > 0;
const preservesGrayscale = (text: string): boolean => /^(?:请)?(?:保持|保留|维持)/.test(text.trim()) && !/改为|改成|应用|添加/.test(text);
const currentScope = (prefix: string): boolean => {
  const history = [...prefix.matchAll(/平时|通常|以前|过去|习惯|喜欢|偏好|used to|usually|prefer/gi)].at(-1)?.index ?? -1;
  const current = [...prefix.matchAll(/这次|本次|当前|现在|改成|分成|做成|this time|current|make/gi)].at(-1)?.index ?? -1;
  return history <= current;
};
const numberWord = (text: string): number => {
  if (/^\d+$/.test(text)) return Number(text);
  const digits: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (text === "十") return 10;
  if (digits[text]) return digits[text];
  const tens = /^([一二三四五六七八九]?)十([一二三四五六七八九]?)$/.exec(text);
  if (tens) return (tens[1] ? digits[tens[1]]! : 1) * 10 + (tens[2] ? digits[tens[2]]! : 0);
  return fail("CREATION_SHOT_GOAL_INVALID", "unsupported explicit shot count");
};

/** Bounded recognition of explicit requests, not a general NLP or aesthetic judge.
 * Counts persist until replaced; a change relative to the current work applies
 * only to the latest feedback, never again to later audio/caption-only edits. */
export function resolveCreationFeedbackGoals(revisions: readonly Revision[]): CreationFeedbackGoals {
  let relative_pacing: CreationFeedbackGoals["relative_pacing"] = null;
  let shot_count: CreationFeedbackGoals["shot_count"] = null;
  let selection_or_order_change: CreationFeedbackGoals["selection_or_order_change"] = null;
  let grayscale: CreationFeedbackGoals["grayscale"] = null;
  const grayClauses: string[] = [];
  let sourceRanges = false, sourceOrder = false, audio = false;
  const colorFields = new Set<"exposure" | "contrast" | "saturation">(), preservedText: string[] = [];
  for (const revision of revisions) {
    for (const clause of revision.raw_text.split(/[，,。；;！!？?\n]/)) {
      const count = /(?:至少|不少于|分成|恰好|仅用|只用|exactly\s+|at least\s+)(\d+|[一二两三四五六七八九十]{1,3})\s*(?:个)?(?:连续|短|长)?(?:镜头|片段|shots?|clips?)/i.exec(clause);
      if (!count || /不要|不用|无需|不必|并非|不是|not\s+/i.test(clause.slice(0, count.index))) continue;
      const prefix = clause.slice(0, count.index);
      if (!currentScope(prefix)) continue;
      const value = numberWord(count[1]!);
      if (!Number.isSafeInteger(value) || value < 1) fail("CREATION_SHOT_GOAL_INVALID", "explicit shot count must be a positive safe integer");
      shot_count = { minimum: value, exact: /^(?:至少|不少于|at least)/i.test(count[0]) ? null : value, revision: revision.revision, matched_text: count[0] };
    }
  }
  const latest = revisions.at(-1);
  if (latest) for (const clause of latest.raw_text.split(/[，,。；;！!？?\n]/)) {
    for (const grayClause of grayscaleClauses(clause)) {
      grayClauses.push(grayClause.trim());
      if (grayClauses.some(preservesGrayscale) && !grayClauses.every(preservesGrayscale)) fail("CREATION_COLOR_SCOPE_REQUIRED", "请将应用灰度与保留灰度分为明确的片段批注。");
      grayscale = { revision: latest.revision, matched_text: grayClauses.join("; "), operation: grayClauses.every(preservesGrayscale) ? "preserve" : "apply" };
    }
    const pacing = /(?:(?:每(?:一)?个|所有)(?:镜头|片段)(?:都|要|需要)?(?:更舒展|更长)|(?:整体(?:节奏)?|节奏整体)(?:更舒展|更慢|放慢))/.exec(clause);
    if (pacing && currentScope(clause.slice(0,pacing.index)) && !/不要|不用|无需|不必|不是|并非|没有要求|禁止/.test(clause.slice(0,pacing.index))) relative_pacing = {revision:latest.revision,matched_text:pacing[0],kind:pacing[0].includes("更长")?"referenced-shots-longer":"longer-mean-with-preserved-minimum"};
    // A trailing predicate governs an explicit field list, e.g. "源片范围、
    // 顺序、音轨和总时长不变". Do not borrow fields across another edit verb
    // or a negation: "改曝光并让对比度不变" only preserves contrast.
    const trailingClause = clause.split(/并(?!非)|同时|但|然后|而|且/).at(-1)!;
    const trailing = /^(.+?)(?:全部|都|仍然|仍)?不变\s*$/.exec(trailingClause);
    if (trailing) {
      const subject = trailing[1]!.replace(/^(?:请|让|使|其他|其余|原有|现有|当前|这次|本次|现在)+/, "");
      if (currentScope(trailingClause) && !/不要|不用|无需|不必|不需要|并非|不是|不能|改为|改成|提高|降低|增加|减少|恢复|重新|删掉|删除/.test(subject)) {
        const ranges = /(?:原片|原画面|素材|源片|画面)范围/.test(subject);
        const order = /(?:^|[、和及与 ])(?:镜头|片段)?顺序(?:$|[、和及与 ])/.test(subject);
        const sound = /音轨|原声|声音|音频/.test(subject);
        sourceRanges ||= ranges; sourceOrder ||= order; audio ||= sound;
        const allColor = /色彩|调色/.test(subject);
        let color = false;
        for (const [word, field] of [["曝光", "exposure"], ["对比度", "contrast"], ["饱和度", "saturation"]] as const) {
          if (allColor || subject.includes(word)) { colorFields.add(field); color = true; }
        }
        if (ranges || order || color || sound) preservedText.push(subject.trim());
      }
    }
    const change = /重新(?:选材(?:和|并|及|与)?(?:排序)?|排序|排列镜头)|重选(?:素材|镜头)|重排(?:镜头|顺序)|(?:reselect|reorder)\s+(?:the\s+)?(?:shots|clips|footage)/i.exec(clause);
    if (change && currentScope(clause.slice(0, change.index)) && !/不要|不用|无需|不必|禁止|没有要求|不(?:要)?再|do not|don't|no need/i.test(clause.slice(0, change.index))) selection_or_order_change = { revision: latest.revision, matched_text: change[0] };
    // Only explicit preservation in this revision is enforceable here. These
    // bounded Chinese forms do not turn historical preferences into edit locks.
    for (const preserve of clause.matchAll(/(?:保持|维持|不改(?:变)?|不要改变)/g)) {
      const prefix = clause.slice(0, preserve.index);
      if (!currentScope(prefix) || /不(?:用|必|需要|要)$|无需$/.test(prefix)) continue;
      // Bind fields to this preservation verb, not every field mentioned in
      // the clause: "change exposure and keep contrast" must allow exposure.
      const subject = /(曝光|对比度|饱和度|色彩|调色)(?:都|仍然|仍|继续)?$/.exec(prefix)?.[1];
      const object = clause.slice(preserve.index + preserve[0].length).split(/并|同时|但是|但|然后|而|且|改成|改为|提高|降低|增加|减少|恢复|重新调整/, 1)[0]!;
      const preserved = subject ?? object;
      const ranges = /(?:原片|原画面|素材|源片|画面)范围/.test(preserved), order = /镜头顺序|片段顺序|范围[、和及与 ]顺序/.test(preserved);
      const sound = /音轨|原声|声音|音频/.test(preserved);
      sourceRanges ||= ranges; sourceOrder ||= order; audio ||= sound;
      const allColor = /色彩|调色/.test(preserved);
      let color = false;
      for (const [word, field] of [["曝光", "exposure"], ["对比度", "contrast"], ["饱和度", "saturation"]] as const) {
        if (allColor || preserved.includes(word)) { colorFields.add(field); color = true; }
      }
      if (ranges || order || color || sound) preservedText.push(preserved.trim());
    }
  }
  const preservation = latest && (audio || colorFields.size > 0 || sourceRanges && sourceOrder) ? { revision: latest.revision, source_ranges_and_order: sourceRanges && sourceOrder, audio, color_fields: [...colorFields], matched_text: preservedText } : null;
  return { shot_count, selection_or_order_change, preservation, relative_pacing, grayscale };
}

/** Resolve bounded targets from Host-validated anchors or an explicit ordinal.
 * Unqualified multi-shot wording is not authority to recolor the whole work. */
export function bindCreationGrayscaleScope(goals: CreationFeedbackGoals, base: Timeline, revision: Revision & { viewed_timeline_version: number | null }, annotations: readonly CreationColorAnnotation[] = []): CreationFeedbackGoals {
  const notes = annotations.filter(note => requestsGrayscale(note.body));
  if (!goals.grayscale && !notes.length) return goals;
  const reject = (detail: string): never => fail("CREATION_COLOR_SCOPE_REQUIRED", detail);
  const tracks = base.tracks.filter(track => track.kind === "video" && track.enabled !== false);
  const clips = tracks.flatMap(track => track.clips).sort((a, b) => a.timeline_start < b.timeline_start ? -1 : a.timeline_start > b.timeline_start ? 1 : 0);
  const text = revision.raw_text;
  if (/除了|除外|排除|except/i.test(text)) return reject("灰度范围含例外条件，请用片段选择和批注明确目标。");
  const whole = /(?:整部(?:作品|视频|短片)|所有(?:镜头|片段)|每(?:一)?个(?:镜头|片段)|whole\s+(?:work|video)|all\s+(?:shots|clips))/i.test(goals.grayscale?.matched_text ?? "");
  const anchorIds = notes.map(note => {
    const r = note.resolution;
    if (!["current", "mapped"].includes(r.status) || r.timeline_version !== base.version || !r.clip_id || !tracks.some(track => track.track_id === r.track_id && track.clips.some(clip => clip.clip_id === r.clip_id))) return reject("灰度批注无法定位到当前画面片段，请重新选择镜头并定位批注。");
    return r.clip_id;
  });
  const ordinalPattern = /第(\d+|[一二两三四五六七八九十]{1,3})(?:个)?(?:镜头|片段)|(?:镜头|片段)\s*(\d+)|\b(first|second|third)\s+(?:shot|clip)\b/gi;
  const grayParts = (goals.grayscale?.matched_text ?? "").split(";");
  if (grayParts.some(part => [...part.matchAll(ordinalPattern)].length > 1)) return reject("一句灰度要求包含多个镜头指代，请分别选定片段并添加批注。");
  const ordinalMatches = [...(goals.grayscale?.matched_text ?? "").matchAll(ordinalPattern)];
  if (whole && [...text.matchAll(ordinalPattern)].length) return reject("全局灰度要求含局部镜头条件，请用片段批注明确哪些镜头需要改变。");
  if (whole && (anchorIds.length || ordinalMatches.length)) return reject("整部作品与局部灰度目标冲突，请明确本次调整范围。");
  const gray = goals.grayscale ?? { revision: revision.revision, matched_text: notes.map(note => note.body).join("; "), operation: notes.flatMap(note => grayscaleClauses(note.body)).every(preservesGrayscale) ? "preserve" as const : "apply" as const };
  if (notes.flatMap(note => grayscaleClauses(note.body)).some(clause => preservesGrayscale(clause) !== (gray.operation === "preserve"))) return reject("应用灰度与保留灰度的指令不一致，请分次提交明确目标。");
  if (whole && gray.operation === "apply") return { ...goals, grayscale: { ...gray, scope: { kind: "whole-work" } } };
  let ordinalIds: string[] = [];
  if (ordinalMatches.length) {
    if (revision.viewed_timeline_version !== base.version || tracks.filter(track => track.clips.length).length !== 1 || clips.some((clip, index) => index > 0 && clips[index - 1]!.timeline_start + clips[index - 1]!.timeline_duration > clip.timeline_start)) return reject("镜头序号不能唯一对应当前作品，请在当前版本选择片段后重试。");
    ordinalIds = ordinalMatches.map(match => {
      const number = match[3] ? ["first", "second", "third"].indexOf(match[3].toLowerCase()) + 1 : numberWord(match[1] ?? match[2]!);
      return clips[number - 1]?.clip_id ?? reject("指定的镜头序号不存在，请选择当前作品中的片段。");
    });
  }
  if (ordinalIds.length && anchorIds.length && (ordinalIds.some(id => !anchorIds.includes(id)) || anchorIds.some(id => !ordinalIds.includes(id)))) return reject("文字镜头序号与批注定位不一致，请重新选择目标。");
  const ids = [...new Set(whole ? clips.map(clip => clip.clip_id) : anchorIds.length ? anchorIds : ordinalIds)];
  if (!ids.length) {
    if (annotations.length || /批注|annotation/i.test(text)) return reject("灰度要求缺少可解析的片段批注，请重新定位目标。");
    if (clips.length !== 1 || revision.viewed_timeline_version !== base.version) return reject("请指定要改为灰度的镜头，或明确要求整部作品改为灰度。");
    ids.push(clips[0]!.clip_id);
  }
  if (gray.operation === "preserve" && ids.some(id => effectiveCreationClipColor(base, clips.find(clip => clip.clip_id === id)!).saturation !== 0)) return reject("指定镜头当前并非灰度，不能将保留要求解释为新增效果。");
  return { ...goals, grayscale: { ...gray, scope: { kind: "clips", base_timeline_version: base.version, clip_ids: ids } } };
}

export function creationPacingBudget(base: Timeline, goals: CreationFeedbackGoals, protectedRefs: readonly string[] = [], executionGrid = base.sequence?.timebase, protectedBase: Timeline = base) {
  if (!goals.relative_pacing) return null;
  if (goals.relative_pacing.kind === "referenced-shots-longer") fail("CREATION_PACING_MAPPING_REQUIRED", "lengthening each referenced shot requires an explicit unambiguous per-shot mapping; a whole-work mean is not a substitute");
  const clips = base.tracks.filter(track => track.kind === "video" && track.enabled !== false).flatMap(track => track.clips);
  if (!clips.length || !base.sequence?.timebase || !executionGrid || clips.some(clip => typeof clip.timeline_duration !== "bigint" || clip.timeline_duration <= 0n)) fail("CREATION_PACING_BASE_REQUIRED", "relative shot pacing needs the actual viewed work and positive exact shot durations");
  const total = clips.reduce((sum, clip) => sum + clip.timeline_duration, 0n), count = BigInt(clips.length), referenceGrid=base.sequence!.timebase!;
  const shortest=clips.reduce((value,clip)=>clip.timeline_duration<value?clip.timeline_duration:value,clips[0]!.timeline_duration);
  const minimumNumerator=shortest*referenceGrid.value*executionGrid!.timescale, minimumDenominator=referenceGrid.timescale*executionGrid!.value;
  const minimum = (minimumNumerator+minimumDenominator-1n)/minimumDenominator;
  if (goals.preservation?.source_ranges_and_order) fail("CREATION_PACING_PRESERVATION_CONFLICT", "keeping every source range and its order cannot also increase the work's mean shot duration");
  const protectedGrid=protectedBase.sequence?.timebase ?? fail("CREATION_PACING_BASE_REQUIRED", "current protected work needs its exact Timeline grid");
  const conflicts = protectedBase.tracks.filter(track=>track.kind === "video" && track.enabled !== false).flatMap(track=>track.clips).filter(clip => clip.timeline_duration * protectedGrid.value * executionGrid!.timescale < minimum * protectedGrid.timescale * executionGrid!.value && (goals.preservation?.source_ranges_and_order || protectedRefs.includes(clip.clip_id)));
  if (conflicts.length) fail("CREATION_PACING_PRESERVATION_CONFLICT", `the relative longer-shot target conflicts with preserved clips: ${conflicts.map(clip=>clip.clip_id).join(",")}`);
  return { kind: goals.relative_pacing.kind, revision: goals.relative_pacing.revision, matched_text: goals.relative_pacing.matched_text, base_timeline_version: base.version, base_shot_count: clips.length,
    reference_timebase: {value:String(referenceGrid.value),timescale:String(referenceGrid.timescale)}, execution_timebase:{value:String(executionGrid!.value),timescale:String(executionGrid!.timescale)}, base_total_ticks: String(total), base_mean_ticks: { numerator:String(total), denominator:String(count) }, minimum_shot_ticks: String(minimum),
    interpretation: "For the whole-work request to feel more spacious, the output mean shot duration must strictly exceed the viewed reference mean, and no shot may be shorter than the reference shortest shot. This is a relative mechanical check, not an aesthetic score or a requirement that every shot exceed the old mean." };
}

/** Compare actual compiled audio semantics, not model explanations or IDs.
 * Rational source and Timeline positions are normalized without rounding.
 * Captions, picture transforms/grades and editorial labels do not affect sound. */
export function assertCreationPreservedAudio(base: Timeline, candidate: Timeline, goals: CreationFeedbackGoals, audioAssetIds: ReadonlySet<string>): void {
  if (!goals.preservation?.audio) return;
  const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item);
  const project = (timeline: Timeline) => {
    const grid = timeline.sequence?.timebase ?? fail("CREATION_TIMEBASE_REQUIRED", "audio preservation needs the bound Timeline timebase");
    const time = (ticks: bigint) => startKey("time", ticks * grid.value, grid.timescale);
    const fade = (value: { value: bigint; timescale: bigint } | undefined) => value ? startKey("fade", value.value, value.timescale) : startKey("fade", 0n, 1n);
    return {
      master_loudness: timeline.master_loudness ?? null, dialogue_music_ducking: timeline.dialogue_music_ducking ?? null,
      tracks: timeline.tracks.map(track => ({ ...track, clips: track.clips.filter(clip => track.kind === "audio" || audioAssetIds.has(clip.source.asset_id)) })).filter(track => track.clips.length > 0).map(track => ({
        track_id: track.track_id, kind: track.kind, enabled: track.enabled !== false, muted: track.muted === true, solo: track.solo === true,
        effects: (track.effects ?? []).filter(effect => track.kind !== "video" || effect.kind !== "grayscale"), keyframes: track.keyframes ?? [], automation: track.automation_curves ?? [], transitions: track.transitions ?? [],
        clips: track.clips.map(clip => ({
          start: clip.kind === "image" ? `image:${clip.source.asset_id}` : startKey(clip.source.asset_id, clip.source.start_pts, clip.source.timescale), end: clip.kind === "image" ? `display:${clip.timeline_duration}` : startKey(clip.source.asset_id, clip.source.end_pts, clip.source.timescale),
          timeline_start: time(clip.timeline_start), timeline_duration: time(clip.timeline_duration), gain_db: clip.gain_db ?? 0,
          fade_in: fade(clip.boundary_fades?.audio_fade_in), fade_out: fade(clip.boundary_fades?.audio_fade_out),
          speed: clip.speed ?? null, time_map: clip.time_map ?? null, effects: clip.effects ?? [], keyframes: clip.keyframes ?? [], automation: clip.automation_curves ?? [],
          compound_clip_ids: clip.compound_clip_ids ?? [], nested_sequence_id: clip.nested_sequence_id ?? null,
          routing: (track.audio_routing ?? []).filter(route => route.source_clip_id === clip.clip_id).map(route => ({ bus: route.bus, gain_db: route.gain_db ?? 0, muted: route.muted === true })).sort((a, b) => canonical(a).localeCompare(canonical(b))),
        })).sort((a, b) => canonical(a).localeCompare(canonical(b))),
      })).sort((a, b) => a.track_id.localeCompare(b.track_id)),
    };
  };
  const before = project(base), after = project(candidate);
  if (before.tracks.length === 0) {
    // A first draft may introduce the selected video's embedded source audio.
    // There is no existing track semantics to lock, but retain any project-level
    // mix settings that already existed on the empty Timeline.
    const mix = (value: typeof before) => ({ master_loudness: value.master_loudness, dialogue_music_ducking: value.dialogue_music_ducking });
    if (canonical(mix(before)) !== canonical(mix(after))) fail("CREATION_PRESERVATION_GOAL_UNMET", `revision ${goals.preservation.revision}: project-level audio mix settings were changed`);
    return;
  }
  if (canonical(before) !== canonical(after)) fail("CREATION_PRESERVATION_GOAL_UNMET", `revision ${goals.preservation.revision}: requested audio source ranges, timing, gain, fades or routing were changed`);
}

const startKey = (asset: string, value: bigint, timescale: bigint): string => {
  if (value < 0n || timescale <= 0n) fail("CREATION_SOURCE_GOAL_INVALID", "source positions need valid exact nonnegative time");
  let a = value, b = timescale;
  while (b !== 0n) { const remainder = a % b; a = b; b = remainder; }
  return `${asset}:${value / a}/${timescale / a}`;
};

/** Validate before model-run success registration and before Timeline commit.
 * Shortening endpoints, changing timebase/IDs, or an explanation cannot satisfy
 * an explicit request to choose/reorder source moments. */
export function assertCreationFeedbackGoals(plan: CreationPlanV1, base: Timeline, goals: CreationFeedbackGoals, pacingReference: Timeline = base): void {
  const pacing = creationPacingBudget(pacingReference, goals, [], base.sequence?.timebase, base);
  if (pacing) {
    const grid=base.sequence!.timebase!;
    let totalNumerator=0n,totalDenominator=1n;
    for (const shot of plan.shots) {
      const a="kind" in shot.source ? {value:0,timescale:1}:shot.source.start,b="kind" in shot.source ? {value:shot.duration_ticks!,timescale:1}:shot.source.end;
      const numerator=(BigInt(b.value)*BigInt(a.timescale)-BigInt(a.value)*BigInt(b.timescale))* ("kind" in shot.source ? 1n : grid.timescale);
      const denominator=BigInt(a.timescale)*BigInt(b.timescale)*("kind" in shot.source ? 1n : grid.value);
      if (numerator < BigInt(pacing.minimum_shot_ticks)*denominator) fail("CREATION_PACING_GOAL_UNMET", `revision ${pacing.revision}: shot ${shot.shot_id} is shorter than the viewed work's shortest shot (${pacing.minimum_shot_ticks} minimum Timeline ticks)`);
      totalNumerator=totalNumerator*denominator+numerator*totalDenominator;totalDenominator*=denominator;
    }
    const referenceGrid=pacingReference.sequence!.timebase!, referenceTotal=BigInt(pacing.base_total_ticks), referenceCount=BigInt(pacing.base_shot_count);
    if (!plan.shots.length || totalNumerator*grid.value*referenceCount*referenceGrid.timescale <= referenceTotal*referenceGrid.value*BigInt(plan.shots.length)*totalDenominator*grid.timescale) fail("CREATION_PACING_GOAL_UNMET", `revision ${pacing.revision}: mean shot duration did not increase over the actual viewed reference`);
  }
  const count = goals.shot_count;
  if (count && (plan.shots.length < count.minimum || count.exact !== null && plan.shots.length !== count.exact)) fail("CREATION_SHOT_GOAL_UNMET", `revision ${count.revision} requires ${count.exact === null ? "at least" : "exactly"} ${count.minimum} shots; got ${plan.shots.length}`);
  if (goals.grayscale) {
    const scope = goals.grayscale.scope;
    if (!scope) fail("CREATION_COLOR_SCOPE_REQUIRED", "grayscale targets must be bound by Host before generation");
    if (scope!.kind === "clips") {
      if (scope!.base_timeline_version !== base.version) fail("CREATION_COLOR_SCOPE_REQUIRED", "grayscale target version changed");
      const clips = base.tracks.filter(track => track.kind === "video" && track.enabled !== false).flatMap(track => track.clips).sort((a, b) => a.timeline_start < b.timeline_start ? -1 : a.timeline_start > b.timeline_start ? 1 : 0);
      if (clips.length !== plan.shots.length || plan.shots.some((shot, index) => {
        const clip = clips[index]!;
        return shot.shot_id !== clip.clip_id || shot.source.asset_id !== clip.source.asset_id || ("kind" in shot.source ? clip.kind !== "image" || BigInt(shot.duration_ticks!) !== clip.timeline_duration : clip.kind === "image" || BigInt(shot.source.start.value) * clip.source.timescale !== clip.source.start_pts * BigInt(shot.source.start.timescale) || BigInt(shot.source.end.value) * clip.source.timescale !== clip.source.end_pts * BigInt(shot.source.end.timescale));
      })) fail("CREATION_COLOR_SCOPE_CHANGED", "局部灰度修改须保留当前镜头身份、源片范围、数量与顺序。");
      for (const [index, shot] of plan.shots.entries()) {
        if (scope!.clip_ids.includes(shot.shot_id)) continue;
        const before = effectiveCreationClipColor(base, clips[index]!);
        const after = effectiveGradeSettings(shot.color ?? undefined);
        if (["exposure", "contrast", "saturation"].some(field => before[field as keyof typeof before] !== after[field as keyof typeof after])) fail("CREATION_COLOR_SCOPE_CHANGED", `非目标镜头 ${shot.shot_id} 的色彩发生变化。`);
      }
    }
    const invalid = plan.shots.filter(shot => {
      if (scope!.kind !== "whole-work" && !scope!.clip_ids.includes(shot.shot_id)) return false;
      const prior = base.tracks?.flatMap(track => track.clips).find(clip => clip.clip_id === shot.shot_id);
      const expected = goals.grayscale!.operation === "preserve" && prior ? effectiveCreationClipColor(base, prior) : effectiveGradeSettings({ exposure: 0, contrast: 1, saturation: 0 });
      return !shot.color || shot.color.exposure === undefined || shot.color.contrast === undefined || shot.color.saturation === undefined || !isDeepStrictEqual(effectiveGradeSettings(shot.color), expected);
    });
    if (invalid.length) fail("CREATION_COLOR_GOAL_UNMET", `revision ${goals.grayscale.revision} requires saturation 0 with neutral exposure/contrast; ${invalid.length} shot(s) omitted or changed the requested color operation`);
  }
  if (!goals.selection_or_order_change && !goals.preservation) return;
  const clips = base.tracks.filter(track => track.kind === "video" && track.enabled !== false).flatMap(track => track.clips).sort((left, right) => left.timeline_start < right.timeline_start ? -1 : left.timeline_start > right.timeline_start ? 1 : 0);
  const before = clips.map(clip => clip.kind === "image" ? `image:${clip.source.asset_id}` : startKey(clip.source.asset_id, clip.source.start_pts, clip.source.timescale));
  const after = plan.shots.map(shot => "kind" in shot.source ? `image:${shot.source.asset_id}` : startKey(shot.source.asset_id, BigInt(shot.source.start.value), BigInt(shot.source.start.timescale)));
  if (goals.selection_or_order_change && JSON.stringify(before) === JSON.stringify(after)) fail("CREATION_SELECTION_GOAL_UNMET", `revision ${goals.selection_or_order_change.revision} requires source reselection or reordering; only changing durations is insufficient`);
  const preservation = goals.preservation;
  if (!preservation) return;
  const reject = (detail: string): never => fail("CREATION_PRESERVATION_GOAL_UNMET", `revision ${preservation.revision}: ${detail}`);
  if (preservation.source_ranges_and_order) {
    const oldRanges = clips.map((clip, index) => [before[index], clip.kind === "image" ? `display:${clip.timeline_duration}` : startKey(clip.source.asset_id, clip.source.end_pts, clip.source.timescale)]);
    const newRanges = plan.shots.map((shot, index) => [after[index], "kind" in shot.source ? `display:${shot.duration_ticks}` : startKey(shot.source.asset_id, BigInt(shot.source.end.value), BigInt(shot.source.end.timescale))]);
    if (JSON.stringify(oldRanges) !== JSON.stringify(newRanges)) reject("requested source ranges and order were changed");
  }
  if (preservation.color_fields.length === 0) return;
  for (const [index, shot] of plan.shots.entries()) {
    // Match source moments, never generated shot IDs. With a locked sequence,
    // repeated source moments have an unambiguous positional predecessor.
    const predecessors = preservation.source_ranges_and_order ? [clips[index]!] : clips.filter((_, oldIndex) => before[oldIndex] === after[index]);
    const oldColors = predecessors.map(clip => ({ ...effectiveGradeSettings(clip.grade), ...(base.tracks.some(track => track.effects?.some(effect => effect.clip_id === clip.clip_id && effect.kind === "grayscale" && effect.enabled !== false)) ? { saturation: 0 } : {}) }));
    if (oldColors.length === 0 || preservation.color_fields.some(field => oldColors.some(color => color[field] !== oldColors[0]![field]))) reject(`shot ${shot.shot_id} has no unambiguous prior color to preserve`);
    const candidate = effectiveGradeSettings(shot.color ?? undefined);
    for (const field of preservation.color_fields) if (candidate[field] !== oldColors[0]![field]) reject(`shot ${shot.shot_id} changed preserved ${field} from ${oldColors[0]![field]} to ${candidate[field]}`);
  }
}

function effectiveCreationClipColor(timeline: Timeline, clip: Timeline["tracks"][number]["clips"][number]) {
  return { ...effectiveGradeSettings(clip.grade), ...(timeline.tracks.some(track => track.effects?.some(effect => effect.clip_id === clip.clip_id && effect.kind === "grayscale" && effect.enabled !== false)) ? { saturation: 0 } : {}) };
}

/** Check executed color, not only a model field or explanation. */
export function assertCreationGrayscaleExecution(base: Timeline, candidate: Timeline, goals: CreationFeedbackGoals): void {
  const scope = goals.grayscale?.scope;
  if (!scope || scope.kind !== "clips") return;
  // Local grayscale does not grant unrelated sound, geometry or caption edits.
  const unchangedContent = (timeline: Timeline) => ({
    ...timeline, version: 0,
    sequence: timeline.sequence ? { ...timeline.sequence, tracks: undefined } : undefined,
    tracks: timeline.tracks.map(track => ({
      ...track,
      captions: track.captions?.map(caption => ({ ...caption, semantic_sidecar: undefined })),
      effects: (track.effects ?? []).filter(effect => !scope.clip_ids.includes(effect.clip_id)),
      clips: track.clips.map(clip => ({
        ...clip, kind: clip.kind ?? "video", gain_db: clip.gain_db ?? 0,
        source: { asset_id: clip.source.asset_id, start: startKey("start", clip.source.start_pts, clip.source.timescale), end: startKey("end", clip.source.end_pts, clip.source.timescale) },
        grade: scope.clip_ids.includes(clip.clip_id) ? undefined : clip.grade,
        semantic_sidecar: undefined,
      })).sort((a, b) => a.clip_id.localeCompare(b.clip_id)),
    })).sort((a, b) => a.track_id.localeCompare(b.track_id)),
  });
  const normalize = (timeline: Timeline) => JSON.parse(JSON.stringify(unchangedContent(timeline), (_key, value) => typeof value === "bigint" ? String(value) : value));
  const beforeContent = normalize(base), afterContent = normalize(candidate);
  const changedPath = (before: any, after: any, path: string): string => {
    if (isDeepStrictEqual(before, after)) return "";
    if (before && after && typeof before === "object" && typeof after === "object") for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      const changed = changedPath(before[key], after[key], `${path}.${key}`); if (changed) return changed;
    }
    return path;
  };
  if (goals.grayscale?.operation !== "preserve" && !isDeepStrictEqual(beforeContent, afterContent)) fail("CREATION_COLOR_SCOPE_CHANGED", `局部灰度修改不能同时改变其他画面、声音、字幕或轨道内容：${changedPath(beforeContent, afterContent, "timeline")}`);
  for (const track of base.tracks.filter(track => track.kind === "video" && track.enabled !== false)) for (const clip of track.clips) {
    const nextTrack = candidate.tracks.find(item => item.track_id === track.track_id);
    const next = nextTrack?.clips.find(item => item.clip_id === clip.clip_id);
    if (!next || next.timeline_start !== clip.timeline_start || next.timeline_duration !== clip.timeline_duration) fail("CREATION_COLOR_SCOPE_CHANGED", "局部灰度修改改变了镜头位置或时长。");
    const before = effectiveCreationClipColor(base, clip), after = effectiveCreationClipColor(candidate, next!);
    const expected = scope.clip_ids.includes(clip.clip_id) && goals.grayscale?.operation !== "preserve" ? effectiveGradeSettings({ exposure: 0, contrast: 1, saturation: 0 }) : before;
    if (JSON.stringify(after) !== JSON.stringify(expected)) fail("CREATION_COLOR_SCOPE_CHANGED", `镜头 ${clip.clip_id} 的实际色彩与绑定范围不符。`);
    if (!scope.clip_ids.includes(clip.clip_id) || goals.grayscale?.operation === "preserve") {
      const effects = (value: Timeline["tracks"][number]) => (value.effects ?? []).filter(effect => effect.clip_id === clip.clip_id);
      if (JSON.stringify(effects(track)) !== JSON.stringify(effects(nextTrack!))) fail("CREATION_COLOR_SCOPE_CHANGED", `非目标镜头 ${clip.clip_id} 的效果发生变化。`);
    }
  }
}
