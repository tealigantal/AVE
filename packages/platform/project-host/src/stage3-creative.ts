import type { MediaSceneResultV1 } from "../../../../contracts/generated/typescript/worker/media-scene-result.v1.js";
import type { CreationObservationV1 } from "../../../../contracts/generated/typescript/editorial/creation-observation.v1.js";
import { createHash } from "node:crypto";
import type { CreationFeedbackGoals } from "./stage3-feedback-goals.js";
import type { CreationPlanV1 } from "../../../../contracts/generated/typescript/editorial/creation-plan.v1.js";
import { effectiveGradeSettings, type Timeline, type ColorContext } from "../../../core/timeline-core/src/public.js";
import { creationStaticTransform, assertCreationStaticTransform, type CreationSourceSpan, type CreationSourceObservation } from "../../../core/edit-ir/src/public.js";
import { resolveRejectedCreationPlanningFinal, assertCreationDecisionV1, compileCreationDecisionV1, creationDigest, CreationError, creationDecisionSchema } from "../../contract-runtime/src/public.js";
export { creationDecisionSchema } from "../../contract-runtime/src/public.js";
import type { CreationTicket } from "./stage3-request.js";

export type CreationObservationReference = Readonly<{ run_id: string; digest: string }>;
export type CreationGenerationInput = Readonly<{ request_id: string; expected_revision: number; observation_refs: readonly CreationObservationReference[]; profile_query: Readonly<{ contexts: readonly string[]; except_principle_ids: readonly string[] }> | null }>;
type StreamBounds = Readonly<{ index: number; start: bigint; end: bigint; numerator: bigint; denominator: bigint }>;
export type CreationMediaFacts = Readonly<{ video: (StreamBounds & { width: number; height: number }) | null; audio: StreamBounds | null; color_context: ColorContext | null; probe_digest: string }>;
export type ResolvedCreationSpan = Readonly<{ compile: CreationSourceSpan; context: unknown }>;
export type CreationDurationFraction = Readonly<{ value: string; timescale: string }>;
export type CreationDurationTarget = Readonly<{ revision: number; raw_text: string; matched_text: string; minimum: CreationDurationFraction | null; maximum: CreationDurationFraction | null }>;
const fail = (code: string, message: string): never => { throw new CreationError(code, message); };
const durationFraction = (value: bigint, timescale: bigint): CreationDurationFraction => {
  if (timescale <= 0n || value < 0n) fail("CREATION_DURATION_INVALID", "duration requires nonnegative exact value and positive timescale");
  let a = value, b = timescale;
  while (b) { const remainder = a % b; a = b; b = remainder; }
  return { value: String(value / a), timescale: String(timescale / a) };
};
const compareDuration = (left: CreationDurationFraction, right: CreationDurationFraction) => BigInt(left.value) * BigInt(right.timescale) - BigInt(right.value) * BigInt(left.timescale);
const addDuration = (left: CreationDurationFraction, right: CreationDurationFraction) => durationFraction(BigInt(left.value) * BigInt(right.timescale) + BigInt(right.value) * BigInt(left.timescale), BigInt(left.timescale) * BigInt(right.timescale));

/** Deliberately bounded recognition of explicit whole-work durations, not a
 * semantic interpretation of subjective pacing, clip timings or approximate goals. */
export function resolveCreationDurationTarget(revisions: readonly Readonly<{ raw_text: string; revision: number }>[]): CreationDurationTarget | null {
  const unit = "(?:分钟|秒钟|秒|分|minutes?|mins?\\b|seconds?|secs?\\b|s\\b)", number = "\\d+(?:\\.\\d+)?";
  const range = new RegExp(`(${number})\\s*(${unit})?\\s*(?:-|–|—|~|～|至|到|to\\b|and\\b)\\s*(${number})\\s*(${unit})`, "i");
  const single = new RegExp(`(${number})\\s*(${unit})`, "i");
  const seconds = (text: string, units: string) => {
    const [whole, decimal = ""] = text.split(".");
    return durationFraction(BigInt(whole! + decimal) * (/^(?:分|minute|min)/i.test(units) ? 60n : 1n), 10n ** BigInt(decimal.length));
  };
  let target: CreationDurationTarget | null = null;
  for (const revision of revisions) {
    let current: CreationDurationTarget | null = null;
    const clauses = revision.raw_text.split(/[，,。；;！!？?\n]/).flatMap(clause => {
      // Explicit replacement verbs separate old/new numeric targets even when
      // the creator omits punctuation. Do not discard a negation at the split.
      const cuts = [...clause.matchAll(/改成|改为|改到|改至|最终|覆盖|取代|替代|取消|废弃|而是/gu)]
        .map(match => match.index).filter(index => {
          const prefix = clause.slice(0, index);
          // Splitting must not erase a local subject or an earlier negation.
          return index > 0 && /\d/.test(prefix) && !/不要|不用|无需|不必|不是|不需要|字幕|镜头|片段|开头|结尾|源片|原片|素材|caption|subtitle|shot|clip|source|footage/i.test(prefix);
        });
      return [0, ...cuts].map((start, index, starts) => clause.slice(start, starts[index + 1] ?? clause.length));
    });
    for (const clause of clauses) {
      const matched = range.exec(clause) ?? single.exec(clause);
      if (!matched) continue;
      const before = clause.slice(0, matched.index), after = clause.slice(matched.index + matched[0].length);
      // A number cited as the old/replaced request is evidence of history, not
      // another current exact target. Explicitly re-adopting it is different.
      const historical = /刚才|之前|此前|原先|原来|上一版|上次|曾经|旧(?:的)?(?:要求|目标)|previous|earlier|original\s+(?:request|target)/i.test(before);
      const adopting = [...before.matchAll(/沿用|恢复|回到|保留|维持|仍然?(?:按|用|做|保持)|继续(?:按|用|做|保持)|(?:按|照)(?:照)?(?:刚才|之前|此前|原先)|keep|retain|restore|revert\s+to|go\s+back\s+to/gi)].at(-1)?.index ?? -1;
      const replacing = [...before.matchAll(/覆盖|取代|替代|取消|废弃|override|replace|cancel|discard/gi)].at(-1)?.index ?? -1;
      if (historical && adopting < 0 || replacing >= 0 && replacing > adopting) continue;
      // Scope the number to its nearest target, not any mention of source media.
      // "Use this footage to make a 24 second story" is an output requirement.
      const localScopes = [...before.matchAll(/字幕|镜头|片段|开头|结尾|源片|原片|素材|时间码|caption|subtitle|shot|clip|source|footage|intro|outro/gi)];
      const wholeScopes = [...before.matchAll(/全片|整片|成片|视频|影片|作品|片子|总时长|最终时长|video|film|vlog|final cut|total duration|runtime/gi)];
      const sourceToWork = /(?:用|根据|使用|把)[^，,。；;]*?(?:素材|源片|原片)[^，,。；;]*?(?:做|制作|剪成|剪到)|(?:use|using)[^,;]*?(?:source|footage)[^,;]*?(?:make|create|produce)/i.test(before);
      const lastLocal = localScopes.at(-1)?.index ?? -1, lastWhole = wholeScopes.at(-1)?.index ?? -1;
      if (lastLocal > lastWhole && !sourceToWork) continue;

      if (/约|大概|左右|差不多|about|around|roughly|approximately|\d/i.test(before) || /^\s*(?:左右|上下|多|余)/.test(after)) continue;
      if (/(?:第|[.\-−])\s*$/.test(before) || /不是|不再|不需要|不必|不用|无需|不要(?!超过)|not\s+(?:exactly\s+)?|instead of/i.test(before)) continue;
      // Strict inequalities and relative deltas require a richer interpretation;
      // never quietly turn them into an exact/inclusive whole-work duration.
      if (/(?:增加|减少|加长|缩短)(?!到|至)|more than|less than|under|over/i.test(before) && !/no (?:more|less) than/i.test(before)) continue;
      if (/超过|多于|少于|短于|长于/.test(before) && !/不超过|不要超过|不少于|不短于|不长于/.test(before)) continue;
      const scoped = adopting >= 0 || /全片|整片|成片|视频|影片|作品|片子|总时长|最终时长|剪成|剪到|改成|改为|改到|改至|延长到|缩短到|控制在|(?:只|仅)做|最终(?:只|仅)?做|做(?:成|一)|制作|video|film|vlog|final cut|total duration|runtime|make|cut (?:to|into)|change to/i.test(before)
        || /^\s*(?:的)?\s*(?:(?:日常|观察|旅行|轻快|纪录|短)|[a-z-]+\s+){0,5}(?:视频|短片|成片|影片|作品|片子|video\b|film\b|vlog\b)/i.test(after)
        || /^\s*(?:至少|不少于|不低于|不超过|至多|最多|精确|正好|at least|no less than|at most|no more than|exactly|between)\s*$/i.test(before);
      if (!scoped) continue;
      let minimum: CreationDurationFraction | null, maximum: CreationDurationFraction | null;
      if (matched.length === 5) {
        minimum = seconds(matched[1]!, matched[2] ?? matched[4]!); maximum = seconds(matched[3]!, matched[4]!);
      } else {
        const value = seconds(matched[1]!, matched[2]!);
        const lower = /至少|不少于|不低于|不短于|不小于|at least|no less than|minimum/i.test(before) || /^\s*(?:以上)/.test(after);
        const upper = /不超过|不要超过|不长于|不大于|至多|最多|at most|no more than|maximum/i.test(before) || /^\s*(?:以内|以下)/.test(after);
        if (lower && upper) fail("CREATION_DURATION_TARGET_INVALID", `ambiguous duration requirement at revision ${revision.revision}`);
        minimum = upper ? null : value; maximum = lower ? null : value;
      }
      if ([minimum, maximum].some(value => value !== null && BigInt(value.value) <= 0n) || minimum && maximum && compareDuration(minimum, maximum) > 0n) fail("CREATION_DURATION_TARGET_INVALID", `invalid duration requirement at revision ${revision.revision}`);
      // Complementary bounds in one message compose; a later message replaces
      // the previous explicit target. Vague/local feedback leaves it intact.
      if (current && ((minimum === null && current.maximum === null) || (maximum === null && current.minimum === null))) {
        minimum ??= current.minimum; maximum ??= current.maximum;
      }
      if (minimum && maximum && compareDuration(minimum, maximum) > 0n) fail("CREATION_DURATION_TARGET_INVALID", `conflicting duration bounds at revision ${revision.revision}`);
      current = { revision: revision.revision, raw_text: revision.raw_text, matched_text: current ? `${current.matched_text}; ${clause.trim()}` : clause.trim(), minimum, maximum };
    }
    if (current) target = current;
  }
  return target;
}

/** Non-temporal editing binds the actual current work, including manual cuts.
 * Numeric requirements in the current revision always take precedence. */
export function resolveBoundCreationDurationTarget(revisions: readonly Readonly<{ raw_text: string; revision: number }>[], base: Timeline): CreationDurationTarget | null {
  const latest = revisions.at(-1);
  if (!latest) return null;
  const explicit = resolveCreationDurationTarget([latest]);
  if (explicit) return explicit;
  // A clear whole-work relative correction supersedes an older exact number.
  // Bind only its strict direction; do not invent how many seconds the user meant.
  let relative: "shorter" | "longer" | null = null;
  for (const clause of latest.raw_text.split(/[，,。；;！!？?\n]/)) {
    if (/\d|镜头|片段|字幕|开头|结尾|源片|原片|素材|shot|clip|caption|subtitle|intro|outro|source|footage/i.test(clause)) continue;
    const scoped = /成片|整片|全片|视频|作品|片子|总时长|video|film|vlog|whole|total duration|make it/i.test(clause) || /^\s*(?:再|更)?(?:短|长)(?:一点|一些|些|点)/.test(clause);
    if (!scoped || /不要|别|不必|无需|不用|don't|do not|not\s/i.test(clause)) continue;
    const shorter = /(?:缩短|短)(?:一点|一些|些|点)|\bshorter\b/i.test(clause), longer = /(?:加长|延长|长)(?:一点|一些|些|点)|\blonger\b/i.test(clause);
    if (shorter && longer) fail("CREATION_DURATION_TARGET_INVALID", "conflicting relative duration correction");
    if (shorter || longer) relative = shorter ? "shorter" : "longer";
  }
  if (relative) {
    const actual = creationDurationSummary(base).output_duration, tick = base.sequence!.timebase!;
    if (BigInt(actual.value) <= 0n) return null; // First-request "a shorter video" has no actual work to compare.
    const bound = durationFraction(BigInt(actual.value) * tick.timescale + (relative === "shorter" ? -1n : 1n) * tick.value * BigInt(actual.timescale), BigInt(actual.timescale) * tick.timescale);
    if (BigInt(bound.value) <= 0n) fail("CREATION_DURATION_TARGET_INVALID", "the current work cannot be shortened by a Timeline tick");
    return { revision: latest.revision, raw_text: latest.raw_text, matched_text: latest.raw_text, minimum: relative === "longer" ? bound : null, maximum: relative === "shorter" ? bound : null };
  }
  const affirmed = (expression: RegExp) => latest.raw_text.split(/[，,。；;！!？?\n]/).some(clause => {
    const match = expression.exec(clause);
    return match !== null && !/(?:不要|不需要|不必|无需|不用|别|不|don't|do not|no need to)\s*$/i.test(clause.slice(0, match.index));
  });
  const keep = affirmed(/(?:保持|保留|维持)(?:当前|现有|现在|这一版|此版|本版|原有|原)?(?:的)?(?:总时长|时长|长度)(?:不变)?|(?:总时长|时长|长度)(?:保持)?不变|不(?:改变|调整|修改)(?:当前|现有|总)?时长|(?:keep|preserve|maintain)\s+(?:the\s+)?(?:(?:current|existing|same)\s+)?(?:total\s+)?(?:duration|length)|(?:duration|length)\s+(?:stays?\s+)?unchanged/i);
  const localOnly = affirmed(/(?:只|仅|仅仅)(?:修改|更改|调整|编辑|改动|改|调)(?:一下|这个|这些|当前|现有|的|下)?(?:字幕|音量)|\bonly\s+(?:change|edit|adjust|update)\s+(?:the\s+)?(?:captions?|subtitles?|volume|audio gain)\b/i);
  if (!keep && !localOnly) return resolveCreationDurationTarget(revisions);
  const actual = creationDurationSummary(base).output_duration;
  if (BigInt(actual.value) <= 0n) fail("CREATION_DURATION_TARGET_INVALID", "keeping the current duration requires a nonempty bound Timeline");
  return { revision: latest.revision, raw_text: latest.raw_text, matched_text: `保持绑定作品实际时长 (${actual.value}/${actual.timescale} 秒): ${latest.raw_text}`, minimum: actual, maximum: actual };
}

function creationDurationSummary(timeline: Timeline) {
  const timebase = timeline.sequence?.timebase;
  if (!timebase || timebase.value <= 0n || timebase.timescale <= 0n) fail("CREATION_TIMEBASE_UNSUPPORTED", "duration checking requires an explicit positive Timeline timebase");
  const solo = timeline.tracks.some(track => track.enabled !== false && track.solo === true);
  const active = timeline.tracks.filter(track => track.enabled !== false && (!solo || track.solo === true) && !(track.kind === "audio" && track.muted === true));
  const ends = active.flatMap(track => [...track.clips, ...(track.gaps ?? []), ...(track.captions ?? [])].map(item => item.timeline_start + item.timeline_duration));
  const output = ends.reduce((maximum, end) => end > maximum ? end : maximum, 0n);
  const sum = active.filter(track => track.kind === "video").flatMap(track => track.clips).reduce((total, clip) => total + clip.timeline_duration, 0n);
  return { output_duration: durationFraction(output * timebase!.value, timebase!.timescale), selected_video_duration: durationFraction(sum * timebase!.value, timebase!.timescale) };
}

export function assertCreationDurationTarget(timeline: Timeline, target: CreationDurationTarget | null): void {
  if (!target) return;
  const actual = creationDurationSummary(timeline).output_duration;
  if (target.minimum && compareDuration(actual, target.minimum) < 0n || target.maximum && compareDuration(actual, target.maximum) > 0n) {
    fail("CREATION_DURATION_TARGET_UNMET", `revision ${target.revision} requires ${target.matched_text}; actual output duration is ${actual.value}/${actual.timescale} seconds`);
  }
}

/** Convert the user's complete-work bounds to feasible integer Timeline ticks.
 * This is a budget, never an allocation of creative cuts or a repair of output. */
export function creationDurationBudgetContext(target: CreationDurationTarget | null, timebase: Readonly<{ value: bigint; timescale: bigint }>) {
  if (!target) return null;
  if (timebase.value <= 0n || timebase.timescale <= 0n) fail("CREATION_TIMEBASE_UNSUPPORTED", "duration budgeting requires a positive Timeline timebase");
  const ticks = (duration: CreationDurationFraction, roundUp: boolean) => {
    const numerator = BigInt(duration.value) * timebase.timescale, denominator = BigInt(duration.timescale) * timebase.value;
    return (numerator + (roundUp ? denominator - 1n : 0n)) / denominator;
  };
  const minimum = target.minimum ? ticks(target.minimum, true) : 1n;
  const maximum = target.maximum ? ticks(target.maximum, false) : null;
  if (maximum !== null && (maximum < minimum || maximum < 1n)) fail("CREATION_DURATION_TARGET_INEXACT", "the requested duration contains no positive whole Timeline tick");
  return { minimum_total_ticks: String(minimum), maximum_total_ticks: maximum === null ? null : String(maximum),
    exact_total_ticks: maximum === minimum ? String(minimum) : null,
    timeline_tick_seconds: { value: String(timebase.value), timescale: String(timebase.timescale) },
    self_check: "Set target_duration_ticks inside these bounds. It is the total for the whole work, never per shot. Exact shots consume their unchanged window durations. Weighted source windows are capacities, NOT final cut lengths; choose positive relative rhythm weights and adequate observed motion windows. Host calculates the precise allocation and source endpoints. Do not pretend source frame counts are Timeline ticks. Captions and independent audio must fit the resolved work. Prose duration claims do not override the typed target or windows. Insufficient capacity and invalid exact edits fail without output repair or retry." };
}

/** Merge overlapping source ranges before summing: observations are not extra footage. */
export function creationSourceAvailabilityContext(evidence: readonly ResolvedCreationSpan[]) {
  const assets = [...new Set(evidence.map(item => item.compile.asset_id))].map(asset_id => {
    const ranges = evidence.filter(item => item.compile.asset_id === asset_id && item.compile.has_video).map(({ compile: span }) => ({ start: durationFraction(span.start_pts, span.timescale), end: durationFraction(span.end_pts, span.timescale) })).sort((a, b) => { const compared = compareDuration(a.start, b.start); return compared < 0n ? -1 : compared > 0n ? 1 : 0; });
    const intervals: typeof ranges = [];
    for (const range of ranges) {
      const prior = intervals.at(-1);
      if (prior && compareDuration(range.start, prior.end) <= 0n) { if (compareDuration(range.end, prior.end) > 0n) prior.end = range.end; }
      else intervals.push({ ...range });
    }
    const available_duration = intervals.reduce((total, interval) => addDuration(total, durationFraction(BigInt(interval.end.value) * BigInt(interval.start.timescale) - BigInt(interval.start.value) * BigInt(interval.end.timescale), BigInt(interval.end.timescale) * BigInt(interval.start.timescale))), durationFraction(0n, 1n));
    return { asset_id, intervals, available_duration };
  });
  return { assets, total_unique_video_duration: assets.reduce((total, asset) => addDuration(total, asset.available_duration), durationFraction(0n, 1n)), meaning: "Available source intervals, not mandatory cuts or proof of narrative suitability. Reusing a source interval does not add unique footage." };
}
const object = (value: unknown, code: string): Record<string, any> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code, "an object is required");
  return value as Record<string, any>;
};
const keys = (value: Record<string, unknown>, expected: readonly string[], code: string) => {
  if (Object.keys(value).length !== expected.length || Object.keys(value).some(key => !expected.includes(key))) fail(code, "input fields differ from the current contract");
};
const integer = (value: unknown, code: string): bigint => {
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return BigInt(value);
  return fail(code, "exact integer media time is required");
};

export function parseCreationGenerationInput(value: unknown): CreationGenerationInput {
  const input = object(value, "CREATION_INPUT_INVALID");
  keys(input, ["request_id", "expected_revision", "observation_refs", "profile_query"], "CREATION_INPUT_INVALID");
  if (typeof input.request_id !== "string" || !input.request_id.trim() || !Number.isSafeInteger(input.expected_revision) || input.expected_revision < 1 || !Array.isArray(input.observation_refs) || input.observation_refs.length === 0) fail("CREATION_INPUT_INVALID", "request, revision and explicit observation selection are required");
  const seen = new Set<string>();
  for (const entry of input.observation_refs) {
    const ref = object(entry, "CREATION_OBSERVATION_REFERENCE_INVALID"); keys(ref, ["run_id", "digest"], "CREATION_OBSERVATION_REFERENCE_INVALID");
    if (typeof ref.run_id !== "string" || !ref.run_id.trim() || typeof ref.digest !== "string" || !/^[a-f0-9]{64}$/.test(ref.digest) || seen.has(ref.run_id)) fail("CREATION_OBSERVATION_REFERENCE_INVALID", "observation identities must be exact and unique");
    seen.add(ref.run_id);
  }
  if (input.profile_query !== null) {
    const query = object(input.profile_query, "PROFILE_QUERY_INVALID"); keys(query, ["contexts", "except_principle_ids"], "PROFILE_QUERY_INVALID");
    if (!Array.isArray(query.contexts) || query.contexts.length === 0 || !Array.isArray(query.except_principle_ids) || [...query.contexts, ...query.except_principle_ids].some(item => typeof item !== "string" || !item.trim())) fail("PROFILE_QUERY_INVALID", "explicit profile contexts and exception IDs are required");
  }
  return structuredClone(input) as CreationGenerationInput;
}

/** The supported render route selects one video/audio stream; never validate a different track. */
export function creationMediaFacts(probeValue: unknown): CreationMediaFacts {
  const probe = object(probeValue, "CREATION_PROBE_INVALID");
  if (!Array.isArray(probe.streams)) fail("CREATION_PROBE_INVALID", "actual probe streams are missing");
  const timing = object(probe.timing?.streams, "CREATION_PROBE_INVALID");
  const read = (kind: "video" | "audio"): StreamBounds | null => {
    const streams = probe.streams.filter((item: any) => item?.codec_type === kind);
    if (streams.length > 1) fail("CREATION_STREAM_AMBIGUOUS", `explicit ${kind} stream selection is not supported by the current renderer`);
    if (!streams.length) return null;
    const stream = streams[0], sample = timing[String(stream.index)];
    if (!Number.isSafeInteger(stream.index) || stream.index < 0 || !sample || sample.time_base !== stream.time_base) fail("CREATION_PROBE_INVALID", "probe and timing stream identities differ");
    const match = typeof stream.time_base === "string" ? /^(\d+)\/(\d+)$/.exec(stream.time_base) : null;
    if (!match || BigInt(match[1]) <= 0n || BigInt(match[2]) <= 0n) return fail("CREATION_TIMEBASE_INVALID", "positive rational source timebase required");
    const decoded = sample.decoded_audio_bounds;
    let start: bigint;
    if (kind === "audio" && stream.start_pts === undefined && decoded?.method === "decoded-contiguous-samples-v1") {
      start = integer(decoded.start_pts, "CREATION_MEDIA_BOUNDS_REQUIRED");
      const end = integer(decoded.end_pts, "CREATION_MEDIA_BOUNDS_REQUIRED"), rate = integer(decoded.sample_rate, "CREATION_MEDIA_BOUNDS_REQUIRED"), samples = integer(decoded.sample_count, "CREATION_MEDIA_BOUNDS_REQUIRED");
      if (end <= start || rate <= 0n || samples <= 0n || String(rate) !== String(stream.sample_rate) || !Array.isArray(sample.frame_pts) || sample.frame_pts.length !== decoded.frame_count || integer(sample.frame_pts[0], "CREATION_MEDIA_BOUNDS_REQUIRED") !== start || (end - start) * BigInt(match[1]) * rate !== samples * BigInt(match[2]) || integer(stream.duration_ts, "CREATION_MEDIA_BOUNDS_REQUIRED") !== end - start) fail("CREATION_MEDIA_BOUNDS_REQUIRED", "decoded audio samples do not certify the declared interval");
    } else start = integer(stream.start_pts, "CREATION_MEDIA_BOUNDS_REQUIRED");
    const duration = integer(stream.duration_ts, "CREATION_MEDIA_BOUNDS_REQUIRED");
    if (duration <= 0n || integer(sample.duration_ts, "CREATION_MEDIA_BOUNDS_REQUIRED") !== duration) fail("CREATION_MEDIA_BOUNDS_REQUIRED", "stream duration is missing or inconsistent");
    return { index: stream.index, start, end: start + duration, numerator: BigInt(match[1]), denominator: BigInt(match[2]) };
  };
  const video = read("video"), audio = read("audio");
  if (!video && !audio) fail("CREATION_STREAM_MISSING", "no supported media stream");
  const dimensions = video ? probe.streams.find((item: any) => item.index === video.index) : null;
  if (video && (!Number.isSafeInteger(dimensions.width) || dimensions.width <= 0 || !Number.isSafeInteger(dimensions.height) || dimensions.height <= 0)) fail("CREATION_VIDEO_GEOMETRY_INVALID", "actual video dimensions required");
  const depths: Readonly<Record<string, 8 | 10>> = { yuv420p: 8, yuv422p: 8, yuv444p: 8, yuv420p10le: 10, yuv422p10le: 10, yuv444p10le: 10 };
  const depth = dimensions ? depths[dimensions.pix_fmt] : undefined;
  const range = dimensions?.color_range === "tv" ? "limited" : dimensions?.color_range === "pc" ? "full" : null;
  const rec709 = dimensions?.color_primaries === "bt709" && dimensions?.color_transfer === "bt709" && dimensions?.color_space === "bt709";
  const color_context: ColorContext | null = rec709 && depth === 8 && range === "limited" ? { input_space: "rec709", working_space: "rec709", output_space: "rec709", bit_depth: depth, range } : null;
  return { video: video ? { ...video, width: dimensions.width, height: dimensions.height } : null, audio, color_context, probe_digest: creationDigest(probe) };
}

export function resolveCreationObservation(rowValue: unknown, reference: CreationObservationReference, projectId: string, requestId: string, authorizedAssetIds: readonly string[], factsByAsset: ReadonlyMap<string, CreationMediaFacts>): readonly ResolvedCreationSpan[] {
  const row = object(rowValue, "CREATION_OBSERVATION_UNAVAILABLE"), value = object(row.value, "CREATION_OBSERVATION_UNAVAILABLE");
  if (row.object_hash !== reference.digest || value.project_id !== projectId || value.ticket?.run_id !== reference.run_id || value.ticket?.request_id !== requestId) fail("CREATION_OBSERVATION_STALE", "selected observation belongs to another request or version");
  const gcd = (a: bigint, b: bigint): bigint => b === 0n ? a : gcd(b, a % b);
  return value.spans.map((span: any) => {
    const facts = factsByAsset.get(span.asset_id);
    if (!facts || !authorizedAssetIds.includes(span.asset_id)) fail("CREATION_SOURCE_DENIED", "observation source is unauthorized");
    const samples = value.samples.filter((item: any) => item.span_id === span.span_id);
    const observations: CreationSourceObservation[] = [];
    const add = (id: string, kind: CreationSourceObservation["kind"], start: any, end: any, text: string, uncertain: boolean) => {
      const a = integer(start.timescale, "CREATION_OBSERVATION_TIME_INVALID"), b = integer(end.timescale, "CREATION_OBSERVATION_TIME_INVALID");
      if (a <= 0n || b <= 0n) fail("CREATION_OBSERVATION_TIME_INVALID", "positive observation timebase required");
      const scale = a / gcd(a, b) * b;
      observations.push({ evidence_id: id, kind, start_pts: integer(start.value, "CREATION_OBSERVATION_TIME_INVALID") * (scale / a), end_pts: integer(end.value, "CREATION_OBSERVATION_TIME_INVALID") * (scale / b), timescale: scale, text, uncertain });
    };
    for (const item of samples) {
      const sample = item.sample, result = row.output.samples.find((entry: any) => entry.sample_id === sample.sample_id);
      if (!result) fail("CREATION_OBSERVATION_OUTPUT_INVALID", "saved sample has no bound model observation");
      const id = sample.detail.kind === "frame" ? `observation:${value.ticket.run_id}:${sample.sample_id}:0` : `sample:${value.ticket.run_id}:${sample.sample_id}`;
      add(id, sample.detail.kind === "frame" ? "visual" : "audio", sample.actual_start, sample.actual_end, result.description, result.uncertain);
      result.transcript.forEach((segment: any, index: number) => add(`observation:${value.ticket.run_id}:${sample.sample_id}:${index}`, "transcript", segment.start, segment.end, segment.text, segment.uncertain ?? result.uncertain));
    }
    const scales = [integer(span.start.timescale, "CREATION_OBSERVATION_TIME_INVALID"), integer(span.end.timescale, "CREATION_OBSERVATION_TIME_INVALID"), ...observations.map(item => item.timescale)];
    if (scales.some(scale => scale <= 0n)) fail("CREATION_OBSERVATION_TIME_INVALID", "positive source timebase required");
    let scale = scales.reduce((a, b) => a / gcd(a, b) * b), observedStart = integer(span.start.value, "CREATION_OBSERVATION_TIME_INVALID") * (scale / scales[0]!), observedEnd = integer(span.end.value, "CREATION_OBSERVATION_TIME_INVALID") * (scale / scales[1]!);
    const covers = (stream: StreamBounds | null) => stream !== null && observedStart * stream.denominator >= stream.start * stream.numerator * scale && observedEnd * stream.denominator <= stream.end * stream.numerator * scale;
    if (observedStart < 0n || observedEnd <= observedStart || facts!.video === null) fail("CREATION_OBSERVATION_OUTSIDE_MEDIA", "candidate has no actual video stream");
    const video = facts!.video!, videoRestricted = !covers(video);
    const audio = facts!.audio, restricted = audio !== null && !covers(audio);
    const expanded = [videoRestricted ? video.denominator : scale, restricted ? audio!.denominator : scale].reduce((a, b) => a / gcd(a, b) * b, scale);
    observedStart *= expanded / scale; observedEnd *= expanded / scale; scale = expanded;
    const videoStart = videoRestricted ? video.start * video.numerator * (scale / video.denominator) : observedStart;
    const videoEnd = videoRestricted ? video.end * video.numerator * (scale / video.denominator) : observedEnd;
    const coveredStart = videoStart > observedStart ? videoStart : observedStart;
    const coveredEnd = videoEnd < observedEnd ? videoEnd : observedEnd;
    if (coveredEnd <= coveredStart) fail("CREATION_OBSERVATION_OUTSIDE_MEDIA", "candidate has no positive exact video coverage intersection");
    const audioStart = restricted ? audio.start * audio.numerator * (scale / audio.denominator) : null;
    const audioEnd = restricted ? audio.end * audio.numerator * (scale / audio.denominator) : null;
    const start = audioStart !== null && audioStart > coveredStart ? audioStart : coveredStart;
    const end = audioEnd !== null && audioEnd < coveredEnd ? audioEnd : coveredEnd;
    if (end <= start) fail("CREATION_EMBEDDED_AUDIO_RANGE_INVALID", "candidate has no positive audiovisual intersection; silent tail filling is not authorized");
    const wire = (value: bigint, unitScale = scale) => {
      const divisor = gcd(value < 0n ? -value : value, unitScale), numerator = value / divisor, denominator = unitScale / divisor;
      if (numerator > BigInt(Number.MAX_SAFE_INTEGER) || numerator < BigInt(Number.MIN_SAFE_INTEGER) || denominator > BigInt(Number.MAX_SAFE_INTEGER)) fail("CREATION_TIME_UNREPRESENTABLE", "source coverage cannot be expressed as safe RationalTime");
      return { schema_version: 1 as const, value: Number(numerator), timescale: Number(denominator) };
    };
    const editableStart = start === observedStart ? span.start : wire(start), editableEnd = end === observedEnd ? span.end : wire(end);
    const compile: CreationSourceSpan = { span_id: span.span_id, asset_id: span.asset_id, start_pts: start, end_pts: end, timescale: scale, has_video: true, has_audio: audio !== null, observations, video_geometry: { width: facts!.video!.width, height: facts!.video!.height }, ...(facts!.color_context ? { color_context: facts!.color_context } : {}) };
    return { compile, context: { span_id: span.span_id, asset_id: span.asset_id, editable_start: editableStart, editable_end: editableEnd, editable_duration: durationFraction(end - start, scale), has_audio: audio !== null,
      // Raw probe/observation bounds remain in their saved receipts. Only editable bounds authorize model selections.
      source_coverage: { restriction: videoRestricted ? restricted ? "video-and-audio-intersection" : "video-container-intersection" : restricted ? "embedded-audio-intersection" : "none" },
      render_capabilities: { static_transform: { mode: "static_transform", scale: { minimum: 1, maximum: 2 }, placement: "even-integer top-left pixels on the existing 4:2:0 overlay grid (x and y multiples of 2); width-floor(width*scale) <= x <= 0; height-floor(height*scale) <= y <= 0", unchanged_native_canvas: true }, native_canvas: { width: facts!.video!.width, height: facts!.video!.height }, static_reframe_modes: BigInt(facts!.video!.width) * 16n === BigInt(facts!.video!.height) * 9n ? ["crop_fill", "contain", "blurred_background"] : [], unavailable_reason: BigInt(facts!.video!.width) * 16n === BigInt(facts!.video!.height) * 9n ? null : "STATIC_REFRAME_9_16_PROFILE_REQUIRED" },
      observations: observations.map(item => item.kind === "visual"
        ? { kind: item.kind, evidence_id: item.evidence_id, sample_at: wire(item.start_pts, item.timescale), description: item.text, uncertain: item.uncertain }
        : { ...item, start_pts: item.start_pts.toString(), end_pts: item.end_pts.toString(), timescale: item.timescale.toString() }) } };
  });
}

export const CREATION_EDIT_GRID_RULES = "For newly selected weighted windows, prefer the optional millisecond_source_window clock: timescale=1000 and value in milliseconds (one second is 1000/1000). Keep both values inside its given bounds; do not multiply milliseconds by the native source timescale. This is available motion capacity, not a selected cut. The original source_window remains authoritative and permits finer precision. Host computes the actual end from allocated Timeline ticks; do not calculate a source-frame count as a Timeline duration. Sparse one-frame evidence is not a one-frame window. Exact timing retains the complete original source range; copy retained/protected ranges and supplied transcript anchors without converting or rounding them. Neither mode implies freeze, repetition or speed changes.";

/** Exact edit grids are mechanical context, never prescribed creative cuts. */
export function creationEditGridContext(evidence: readonly ResolvedCreationSpan[], timebase: Readonly<{ value: bigint; timescale: bigint }>) {
  const gcd = (a: bigint, b: bigint): bigint => b ? gcd(b, a % b) : a;
  return evidence.map(({ compile: span, context }) => {
    const source = object(context, "CREATION_SOURCE_CONTEXT_INVALID");
    const scale = span.timescale / gcd(span.timescale, timebase.timescale) * timebase.timescale;
    const first = span.start_pts * (scale / span.timescale), last = span.end_pts * (scale / span.timescale), tick = timebase.value * (scale / timebase.timescale);
    // A simpler optional clock for newly selected windows. Inward rounding
    // narrows this convenience interval; it never rounds a candidate or changes
    // the authoritative source interval, retained cuts or transcript anchors.
    const firstMs = (span.start_pts * 1000n + span.timescale - 1n) / span.timescale, lastMs = span.end_pts * 1000n / span.timescale;
    const millisecondWindow = lastMs > firstMs && lastMs <= BigInt(Number.MAX_SAFE_INTEGER)
      ? { span_id: span.span_id, asset_id: span.asset_id, start: { schema_version: 1, value: Number(firstMs), timescale: 1000 }, end: { schema_version: 1, value: Number(lastMs), timescale: 1000 } } : null;
    return { span_id: span.span_id, source_window: { span_id: span.span_id, asset_id: span.asset_id, start: source.editable_start, end: source.editable_end }, millisecond_source_window: millisecondWindow, source_timescale: String(scale), source_units_per_timeline_tick: String(tick), maximum_duration_ticks: String((last - first) / tick) };
  });
}

/** Model-selectable motion windows whose first allocated tick is observed.
 * These are choices, not repaired proposals or prescribed story selections. */
export function creationWeightedAnchorContext(evidence: readonly ResolvedCreationSpan[], timebase: Readonly<{ value: bigint; timescale: bigint }>) {
  const wire = (value: bigint, scale: bigint) => {
    const fraction = durationFraction(value, scale);
    if (BigInt(fraction.value) > BigInt(Number.MAX_SAFE_INTEGER) || BigInt(fraction.timescale) > BigInt(Number.MAX_SAFE_INTEGER)) fail("CREATION_TIME_UNREPRESENTABLE", "visual anchor cannot be represented by safe RationalTime");
    return { schema_version: 1 as const, value: Number(fraction.value), timescale: Number(fraction.timescale) };
  };
  const windowTimes = (start: bigint, startScale: bigint, end: bigint, endScale: bigint) => {
    const first = wire(start, startScale), last = wire(end, endScale);
    let a = BigInt(first.timescale), b = BigInt(last.timescale);
    while (b) { const remainder = a % b; a = b; b = remainder; }
    const common = BigInt(first.timescale) / a * BigInt(last.timescale);
    const firstValue = BigInt(first.value) * (common / BigInt(first.timescale)), lastValue = BigInt(last.value) * (common / BigInt(last.timescale));
    // Prefer one exact clock for a selectable window, avoiding independently
    // reduced endpoints that look alike but have different denominators. If a
    // safe common clock is impossible, retain both exact fractions explicitly;
    // do not remove a previously valid arbitrary-RationalTime choice.
    if ([common, firstValue, lastValue].every(value => value <= BigInt(Number.MAX_SAFE_INTEGER))) return { start: { ...first, value: Number(firstValue), timescale: Number(common) }, end: { ...last, value: Number(lastValue), timescale: Number(common) }, representation: "shared-exact-timescale" as const };
    return { start: first, end: last, representation: "independent-exact-timescales" as const };
  };
  return evidence.map(({ compile: span }) => ({ span_id: span.span_id, options: span.observations.filter(item => item.kind === "visual").map(item => {
    const inside = item.start_pts * span.timescale >= span.start_pts * item.timescale && item.start_pts * span.timescale < span.end_pts * item.timescale;
    const remainingNumerator = (span.end_pts * item.timescale - item.start_pts * span.timescale) * timebase.timescale;
    const remainingDenominator = span.timescale * item.timescale * timebase.value;
    const capacity = inside ? remainingNumerator / remainingDenominator : 0n;
    const reason = !inside ? "sample-point-outside-editable-window" : capacity < 1n ? "less-than-one-timeline-tick-remains" : null;
    const times = reason === null ? windowTimes(item.start_pts, item.timescale, span.end_pts, span.timescale) : null;
    return { evidence_id: item.evidence_id, uncertain: item.uncertain, unavailable_reason: reason,
      source_window: times ? { span_id: span.span_id, asset_id: span.asset_id, start: times.start, end: times.end } : null,
      time_representation: times?.representation ?? null,
      maximum_duration_ticks: reason === null ? capacity.toString() : "0", timing_kind: "weighted" as const };
  }) }));
}

/** Mechanical options for every transcript, not a selected caption or story.
 * An exact source anchor avoids asking the model to round audio/source phase. */
export function creationVerbatimCaptionContext(evidence: readonly ResolvedCreationSpan[], timebase: Readonly<{ value: bigint; timescale: bigint }>) {
  if (timebase.value <= 0n || timebase.timescale <= 0n) fail("CREATION_TIMEBASE_UNSUPPORTED", "caption mapping requires a positive Timeline timebase");
  return evidence.flatMap(({ compile: span }) => span.observations.filter(item => item.kind === "transcript").map(item => {
    const numerator = (item.end_pts - item.start_pts) * timebase.timescale, denominator = item.timescale * timebase.value;
    const inBounds = item.start_pts * span.timescale >= span.start_pts * item.timescale && item.end_pts * span.timescale <= span.end_pts * item.timescale;
    const exact = numerator > 0n && numerator % denominator === 0n;
    const durationTicks = exact ? numerator / denominator : null;
    const duration = durationFraction(item.end_pts - item.start_pts, item.timescale);
    const wire = (value: bigint, scale: bigint) => {
      const fraction = durationFraction(value, scale);
      if (BigInt(fraction.value) > BigInt(Number.MAX_SAFE_INTEGER) || BigInt(fraction.timescale) > BigInt(Number.MAX_SAFE_INTEGER)) fail("CREATION_TIME_UNREPRESENTABLE", "caption evidence cannot be represented by safe RationalTime");
      return { schema_version: 1 as const, value: Number(fraction.value), timescale: Number(fraction.timescale) };
    };
    const reason = !span.has_audio ? "no-embedded-audio" : item.uncertain ? "uncertain-transcript" : !inBounds ? "outside-editable-window" : !exact ? "duration-not-whole-timeline-ticks" : null;
    const exactDuration = wire(BigInt(duration.value), BigInt(duration.timescale));
    const options: Array<{ source_window: { span_id: string; asset_id: string; start: ReturnType<typeof wire>; end: ReturnType<typeof wire> }; timing: { kind: "exact" }; caption_offset: ReturnType<typeof wire>; caption_duration: ReturnType<typeof wire>; padding_ticks: { before: string; after: string }; duration_ticks: string; visual_evidence_ids: string[] }> = [];
    const unavailable: Array<{ visual_evidence_id: string; reason: string }> = [];
    const visuals = span.observations.filter(observation => observation.kind === "visual");
    for (const visual of visuals) {
      if (reason !== null || !span.has_video) { unavailable.push({ visual_evidence_id: visual.evidence_id, reason: reason ?? "no-video-stream" }); continue; }
      // The decoded sample's start is the observed frame point. Contain that
      // point with a strict right boundary; do not require a final decoded
      // frame's end to extend past an audio-trimmed editable window.
      const unit = item.timescale * visual.timescale * timebase.value;
      const beforeDistance = (item.start_pts * visual.timescale - visual.start_pts * item.timescale) * timebase.timescale;
      const afterDistance = (visual.start_pts * item.timescale - item.end_pts * visual.timescale) * timebase.timescale;
      const before = beforeDistance > 0n ? (beforeDistance + unit - 1n) / unit : 0n;
      const after = afterDistance >= 0n ? afterDistance / unit + 1n : 0n;
      const scale = item.timescale * timebase.timescale;
      const start = item.start_pts * timebase.timescale - before * timebase.value * item.timescale;
      const end = item.end_pts * timebase.timescale + after * timebase.value * item.timescale;
      if (start * span.timescale < span.start_pts * scale || end * span.timescale > span.end_pts * scale) { unavailable.push({ visual_evidence_id: visual.evidence_id, reason: "integer-padding-outside-editable-window" }); continue; }
      const source_window = { span_id: span.span_id, asset_id: span.asset_id, start: wire(start, scale), end: wire(end, scale) };
      const duplicate = options.find(option => creationDigest(option.source_window) === creationDigest(source_window));
      if (duplicate) { duplicate.visual_evidence_ids.push(visual.evidence_id); continue; }
      options.push({ source_window, timing: { kind: "exact" }, caption_offset: wire(before * timebase.value, timebase.timescale), caption_duration: exactDuration, padding_ticks: { before: String(before), after: String(after) }, duration_ticks: String(before + durationTicks! + after), visual_evidence_ids: [visual.evidence_id] });
    }
    options.sort((a, b) => { const left = BigInt(a.padding_ticks.before) + BigInt(a.padding_ticks.after), right = BigInt(b.padding_ticks.before) + BigInt(b.padding_ticks.after); return left < right ? -1 : left > right ? 1 : 0; });
    return { evidence_id: item.evidence_id, span_id: span.span_id, asset_id: span.asset_id, text: item.text, uncertain: item.uncertain,
      available: reason === null, unavailable_reason: reason, duration_ticks: durationTicks === null ? null : String(durationTicks), exact_duration: exactDuration,
      exact_embedded_anchor_unavailable_reason: options.length ? null : reason ?? (visuals.length ? "no-in-bounds-integer-padding" : "no-visual-samples"),
      exact_embedded_anchor_options: options, unavailable_anchor_candidates: unavailable,
      mapping: "Optional complete-transcript exact anchors, ordered by least added integer-tick padding; no caption or story has been selected. Each contains a real visual sample point and the full transcript, entirely inside editable audiovisual bounds. If selected, use its exact source_window/timing and reference that audible shot ID as audio_anchor and shot_id, with the supplied caption_offset and caption_duration. A different anchor is legal only if the complete transcript maps to exact Timeline ticks through its selected source start. Weighted timing does not guarantee complete transcript coverage. Never round or shorten the transcript." };
  }));
}

export const CREATION_DECISION_FIELDS: readonly string[] = Object.keys(creationDecisionSchema.properties);
/** Validate the complete declared capacity, not only the shorter allocated cut.
 * A forged window must never become acceptable merely because weighting trims it. */
export function assertCreationDecisionSourceWindows(value: unknown, evidence: readonly ResolvedCreationSpan[]): void {
  keys(object(value, "CREATION_DECISION_INVALID"), CREATION_DECISION_FIELDS.filter(key => key !== "skill_effects" || Object.hasOwn(value as object, key)), "CREATION_DECISION_FIELDS_INVALID");
  assertCreationDecisionV1(value);
  const spans = new Map(evidence.map(item => [item.compile.span_id, item.compile]));
  for (const shot of value.shots) {
    const window = shot.source_window, span = spans.get(window.span_id);
    if (!span || !span.has_video || span.asset_id !== window.asset_id) fail("CREATION_SOURCE_DENIED", "declared source window is not bound to an authorized video span");
    const start = integer(window.start.value, "CREATION_DECISION_TIME_UNSAFE"), startScale = integer(window.start.timescale, "CREATION_DECISION_TIME_UNSAFE"), end = integer(window.end.value, "CREATION_DECISION_TIME_UNSAFE"), endScale = integer(window.end.timescale, "CREATION_DECISION_TIME_UNSAFE");
    if (startScale <= 0n || endScale <= 0n || end * startScale <= start * endScale || start * span!.timescale < span!.start_pts * startScale || end * span!.timescale > span!.end_pts * endScale) fail("CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA", "the complete declared source window exceeds its authorized evidence interval");
  }
}
/** Match the actual current render route; no model edit can choose a new canvas. */
export function assertCreationDecisionRenderCapabilities(value: unknown, evidence: readonly ResolvedCreationSpan[]): void {
  assertCreationDecisionV1(value);
  const spans = new Map(evidence.map(span => [span.compile.span_id, span]));
  for (const shot of value.shots) {
    if (shot.reframe === null) continue;
    const span = spans.get(shot.source_window.span_id);
    if (!span || span.compile.asset_id !== shot.source_window.asset_id) fail("CREATION_SOURCE_DENIED", "reframe source is not authorized");
    if (shot.reframe.mode === "static_transform") { assertCreationStaticTransform(shot.reframe, span!.compile.video_geometry); continue; }
    const capabilities = object(object(span!.context, "CREATION_SOURCE_CONTEXT_INVALID").render_capabilities, "CREATION_SOURCE_CONTEXT_INVALID");
    if (!Array.isArray(capabilities.static_reframe_modes) || !capabilities.static_reframe_modes.includes(shot.reframe.mode)) fail("CREATION_REFRAME_UNSUPPORTED", "STATIC_REFRAME_9_16_PROFILE_REQUIRED: the selected source canvas cannot execute this reframe; the output has not been changed");
  }
}
/** Identity is Host-owned. Reject model identity fields; never repair a claimed envelope. */
export function bindCreationDecision(value: unknown, ticket: CreationTicket, timebase: Readonly<{ value: bigint; timescale: bigint }>, durationBudget: ReturnType<typeof creationDurationBudgetContext> = null): CreationPlanV1 {
  const decision = object(value, "CREATION_DECISION_INVALID"); keys(decision, CREATION_DECISION_FIELDS.filter(key => key !== "skill_effects" || Object.hasOwn(decision, key)), "CREATION_DECISION_FIELDS_INVALID");
  return compileCreationDecisionV1(decision, { plan_id: `plan:${ticket.run_id}`, request_id: ticket.request_id, revision: ticket.revision, base_timeline_version: ticket.base_timeline_version, input_digest: ticket.input_digest }, timebase, durationBudget);
}

export function creationTimelineContext(timeline: Timeline): unknown {
  const sidecar = (value: any) => value ? { semantic_id: value.semantic_id, labels: value.labels, evidence_refs: value.evidence_refs } : undefined;
  const pick = (value: any, fields: readonly string[]) => Object.fromEntries(fields.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
  const context = { version: timeline.version, color_semantics: { renderer: "FFmpeg eq via current Worker color node", neutral: effectiveGradeSettings(), exposure: "Additive brightness adjustment, not photographic EV stops; render_brightness = exposure + brightness", unchanged: "Use each clip effective_color as its current executed settings; contrast 1 and saturation 1 are neutral. Contrast 0 removes tonal contrast. Raw grade remains authoritative; effective values do not authorize changing LUTs or other unsupported operations." }, duration_summary: creationDurationSummary(timeline), sequence: timeline.sequence ? pick(timeline.sequence, ["sequence_id", "timebase"]) : null,
    tracks: timeline.tracks.map(track => ({ ...pick(track, ["track_id", "kind", "enabled", "locked", "muted", "solo", "opacity", "z_index", "locks"]),
      clips: track.clips.map(clip => ({ ...pick(clip, ["clip_id", "source", "timeline_start", "timeline_duration", "media_kind", "gain_db", "link_group_id", "static_reframe", "transform", "boundary_fades"]),
        reframe: clip.transform ? creationStaticTransform(clip.transform) : clip.static_reframe ? pick(clip.static_reframe, ["mode", "focal_x", "focal_y"]) : null,
        effective_color: effectiveGradeSettings(clip.grade),
        grade: clip.grade ? pick(clip.grade, ["grade_id", "exposure", "brightness", "contrast", "saturation", "gamma", "context"]) : null,
        unsupported_semantics: Boolean(clip.grade?.lut_path || clip.grade?.brightness !== undefined || clip.grade?.gamma !== undefined || clip.effects?.length || clip.automation_curves?.length || clip.mask || clip.time_map || clip.speed || clip.keyframes?.length || clip.transform && !creationStaticTransform(clip.transform) || clip.compound_clip_ids?.length || clip.nested_sequence_id),
        semantic_sidecar: sidecar(clip.semantic_sidecar) })),
      captions: track.captions?.map(caption => ({ ...pick(caption, ["caption_id", "text", "timeline_start", "timeline_duration", "language", "words"]), semantic_sidecar: sidecar(caption.semantic_sidecar) })) })) };
  return JSON.parse(JSON.stringify(context, (_key, value) => typeof value === "bigint" ? value.toString() : value));
}

/** Narrow current proposal capabilities and hard target without inventing creative cuts. */
export function creationOutputSchema(evidence: readonly ResolvedCreationSpan[], principleIds: readonly string[], timebase: Readonly<{ value: bigint; timescale: bigint }>, durationBudget: ReturnType<typeof creationDurationBudgetContext> = null, feedbackGoals?: CreationFeedbackGoals): unknown {
  const schema = structuredClone(creationDecisionSchema) as any;
  if (timebase.value <= 0n || timebase.timescale <= 0n || timebase.value > BigInt(Number.MAX_SAFE_INTEGER) || timebase.timescale > BigInt(Number.MAX_SAFE_INTEGER)) fail("CREATION_TIMEBASE_UNSUPPORTED", "generation requires an exactly representable positive Timeline timebase");
  if (durationBudget) {
    const minimum = BigInt(durationBudget.minimum_total_ticks), maximum = durationBudget.maximum_total_ticks === null ? null : BigInt(durationBudget.maximum_total_ticks);
    if (minimum > BigInt(Number.MAX_SAFE_INTEGER) || maximum !== null && maximum > BigInt(Number.MAX_SAFE_INTEGER)) fail("CREATION_TIMEBASE_UNSUPPORTED", "duration budget exceeds the model contract integer boundary");
    schema.properties.target_duration_ticks = { ...schema.properties.target_duration_ticks, minimum: Number(minimum), ...(maximum === null ? {} : { maximum: Number(maximum) }), ...(durationBudget.exact_total_ticks === null ? {} : { const: Number(durationBudget.exact_total_ticks) }) };
  }
  if (feedbackGoals?.shot_count) {
    schema.properties.shots.minItems = feedbackGoals.shot_count.minimum;
    if (feedbackGoals.shot_count.exact !== null) schema.properties.shots.maxItems = feedbackGoals.shot_count.exact;
  }
  // This is provenance, not free-form editing advice: cold start has no learned IDs.
  schema.properties.applied_principle_ids = {
    ...schema.properties.applied_principle_ids,
    description: "IDs of learned principles actually supplied in this request profile. Never invent IDs for general editing rules. With no profile return [].",
    ...(principleIds.length ? { items: { type: "string", enum: [...principleIds] } } : { maxItems: 0 }),
  };
  schema.properties.shots.description = "Ordered creative selections. source_window defines the allowed motion interval, not a finished cut. For weighted timing, Host uses the declared relative weight and complete target_duration_ticks to allocate integer Timeline ticks, keeping this window start and deriving its end without exceeding the window. At least one tick per weighted shot, then capped proportional allocation with largest remainders and stable shot-order ties. Choose windows spacious enough for the intended pacing and observed content. For exact timing, the whole window is the intended unchanged cut and must already be exact Timeline ticks; it is never rounded or trimmed. Use exact for protected/retained shots. Do not invent scene details. Host rejects unavailable total duration or invalid captions/audio; it does not repair output.";
  const relativeOffset = "Relative to the START of shot_id in the NEW Timeline, not absolute Timeline time and not source time. Zero starts with that shot; negative values are allowed for J-cuts. The resulting interval must remain inside the complete output.";
  schema.properties.audio.items.properties.offset.description = relativeOffset;
  schema.properties.captions.items.properties.offset.description = relativeOffset;
  schema.properties.audio.description = "Optional independent audio edits. Shots already include source audio at embedded_gain_db; do not duplicate it unless deliberately mixing. Independent source duration plus shot-relative offset must fit the full output; fade_in + fade_out must not exceed this audio duration.";
  schema.properties.captions.description = "Editorial captions must fit entirely inside their referenced shot: offset >= 0 and offset + duration <= that shot's duration. Verbatim captions must use exact full transcript text and exact mapped source times through the selected audible audio anchor. Do not guess or round transcript timings to satisfy integer ticks. Omit captions unsupported by the source or exact Timeline timebase; retain the original audio. Preserve required caption content and its shot-relative mapping.";
  const anchorScales = new Map(creationWeightedAnchorContext(evidence, timebase).map(item => [item.span_id, item.options.flatMap(option => option.source_window ? [BigInt(option.source_window.start.timescale), BigInt(option.source_window.end.timescale)] : [])]));
  const sourceSchema = (kind: "video" | "audio") => ({
    ...schema.properties.shots.items.properties.source_window,
    description: kind === "video" ? "Select one provided span and a source_window entirely INSIDE its editable_start/editable_end. Weighted windows are available motion capacity and need not have integer Timeline duration; Host derives an exact end inside the window using the declared weight. Exact timing retains the whole window and requires an integer Timeline duration. Absolute source starts need not align with the Timeline origin. Prefer supplied source units. A window crossing a span boundary requires separate shots with corresponding span IDs." : "Select one provided audio span and the exact actual audio source interval within its bounds. This independent audio range is never weighted or trimmed; duration and Timeline offsets must be exact Timeline ticks. Absolute source phase is independent of the Timeline origin.",
    anyOf: evidence.filter(item => kind === "video" ? item.compile.has_video : item.compile.has_audio).map(({ compile: span }) => {
      const bounds = (scale: bigint) => {
        const first = (span.start_pts * scale + span.timescale - 1n) / span.timescale;
        const last = span.end_pts * scale / span.timescale;
        if (last > BigInt(Number.MAX_SAFE_INTEGER) || scale > BigInt(Number.MAX_SAFE_INTEGER)) return [];
        return ["start", "end"].map(field => ({
          if: { properties: { [field]: { properties: { timescale: { const: Number(scale) } } } } },
          then: { properties: { [field]: { properties: { value: { minimum: Number(first), maximum: Number(last) } } } } },
        }));
      };
      const constraints = [...new Set([span.timescale, timebase.timescale, 1000n, ...(anchorScales.get(span.span_id) ?? [])])].flatMap(bounds);
      return {
      properties: {
        span_id: { const: span.span_id }, asset_id: { const: span.asset_id },
      },
      ...(constraints.length ? { allOf: constraints } : {}),
    }; }),
  });
  schema.properties.shots.items.properties.source_window = sourceSchema("video");
  if (evidence.some(item => item.compile.has_audio)) schema.properties.audio.items.properties.source = sourceSchema("audio");
  else schema.properties.audio.maxItems = 0;
  const transcripts = evidence.flatMap(item => item.compile.observations).filter(item => item.kind === "transcript" && !item.uncertain && (item.end_pts - item.start_pts) * timebase.timescale % (item.timescale * timebase.value) === 0n);
  schema.properties.captions.items.allOf = [{
    if: { properties: { kind: { const: "verbatim" } } },
    then: transcripts.length ? { anyOf: transcripts.map(item => ({ properties: {
      text: { const: item.text }, evidence_ids: { contains: { const: item.evidence_id } },
    } })) } : false,
  }];
  const ids = evidence.filter(item => item.compile.color_context).map(item => item.compile.span_id);
  if (!ids.length) schema.properties.shots.items.properties.color = { type: "null" };
  else schema.properties.shots.items.allOf = [{ if: { properties: { source_window: { properties: { span_id: { enum: ids } } } } }, then: {}, else: { properties: { color: { type: "null" } } } }];
  const reframeIds = evidence.filter(item => {
    const capabilities = object(object(item.context, "CREATION_SOURCE_CONTEXT_INVALID").render_capabilities, "CREATION_SOURCE_CONTEXT_INVALID");
    if (!Array.isArray(capabilities.static_reframe_modes)) fail("CREATION_SOURCE_CONTEXT_INVALID", "actual render capabilities are required");
    return capabilities.static_reframe_modes.length > 0;
  }).map(item => item.compile.span_id);
  // Native static transforms apply to every source canvas; the older reframe
  // family remains restricted to its existing portrait render route.
  const nativeTransform = { anyOf: schema.properties.shots.items.properties.reframe.anyOf.filter((variant: any) => variant.type === "null" || variant.properties?.mode?.const === "static_transform") };
  if (!reframeIds.length) schema.properties.shots.items.properties.reframe = nativeTransform;
  else schema.properties.shots.items.allOf = [...(schema.properties.shots.items.allOf ?? []), { if: { properties: { source_window: { properties: { span_id: { enum: reframeIds } } } } }, then: {}, else: { properties: { reframe: nativeTransform } } }];
  // One self-contained definition for repeated source alternatives. This is
  // the same exact schema constraint, not a reduced authorization projection.
  schema.$defs ??= {};
  const videoSource = schema.properties.shots.items.properties.source_window;
  schema.$defs.creationVideoSourceBounds = { anyOf: videoSource.anyOf };
  delete videoSource.anyOf;
  videoSource.allOf = [{ $ref: "#/$defs/creationVideoSourceBounds" }];
  if (evidence.some(item => item.compile.has_audio)) {
    const audioSource = schema.properties.audio.items.properties.source;
    const same = creationDigest(audioSource.anyOf) === creationDigest(schema.$defs.creationVideoSourceBounds.anyOf);
    if (!same) schema.$defs.creationAudioSourceBounds = { anyOf: audioSource.anyOf };
    delete audioSource.anyOf;
    audioSource.allOf = [{ $ref: same ? "#/$defs/creationVideoSourceBounds" : "#/$defs/creationAudioSourceBounds" }];
  }
  return schema;
}

/** Abort local waiting even when a dependency ignores cancellation; consume its late result. */
export function awaitCreationDependency<T>(pending: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const settle = (action: () => void) => { if (finished) return; finished = true; signal.removeEventListener("abort", abort); action(); };
    const abort = () => settle(() => reject(signal.reason));
    pending.then(value => settle(() => resolve(value)), error => settle(() => reject(error)));
    signal.addEventListener("abort", abort, { once: true }); if (signal.aborted) abort();
  });
}

/** Numeric feasibility, not a shot selection or a model-output repair. */
export function creationCapacityContext(evidence: readonly ResolvedCreationSpan[], timebase: Readonly<{ value: bigint; timescale: bigint }>, budget: Pick<NonNullable<ReturnType<typeof creationDurationBudgetContext>>, "minimum_total_ticks" | "maximum_total_ticks" | "exact_total_ticks"> | null) {
  const spans = creationEditGridContext(evidence, timebase).map(item => {
    const window = item.millisecond_source_window;
    const capacity = window ? BigInt(window.end.value - window.start.value) * timebase.timescale / (1000n * timebase.value) : null;
    return { span_id: item.span_id, full_source_capacity_ticks: item.maximum_duration_ticks, millisecond_window_capacity_ticks: capacity?.toString() ?? null };
  });
  const target = budget?.exact_total_ticks ?? budget?.minimum_total_ticks ?? null;
  const capacities = spans.map(item => BigInt(item.full_source_capacity_ticks)).sort((a, b) => a === b ? 0 : a > b ? -1 : 1);
  let sum = 0n, count = 0;
  for (const capacity of capacities) { if (target === null || sum >= BigInt(target)) break; sum += capacity; count++; }
  return { required_minimum_total_ticks: target, minimum_distinct_full_windows: target === null || sum < BigInt(target) ? null : count,
    invariant: "sum(floor(each selected source_window duration / Timeline tick)) must cover target_duration_ticks; increasing weights never increases source capacity. Narrower windows have less capacity. Choose enough actual windows; a minimum shot count is not an exact shot count.", spans };
}

/** Only numeric diagnostics from a fully bound failed run may enter a new run.
 * Opaque older failures remain local evidence, never guessed back into context. */
export function creationGenerationFailureContext(failure: unknown, binding: unknown, evidence: readonly ResolvedCreationSpan[], timebase: Readonly<{ value: bigint; timescale: bigint }>) {
  const record = object(failure, "CREATION_FAILURE_RECORD_INVALID");
  const error = record.error;
  if (!error || creationDigest(error.creation_generation_binding ?? null) !== creationDigest(binding) || error.code !== "MODEL_OUTPUT_INVALID") return null;
  const capacityFailure = error.cause?.code === "CREATION_DECISION_CAPACITY_INSUFFICIENT";
  const visualFailure = typeof error.cause?.message === "string" && /^CREATION_SOURCE_UNOBSERVED:.+:video$/.test(error.cause.message);
  if (!capacityFailure && !visualFailure) return null;
  const diagnostic = error.output_diagnostic;
  if (diagnostic?.representation !== "provider-text" || typeof diagnostic.payload !== "string" || Buffer.byteLength(diagnostic.payload) !== diagnostic.utf8_bytes || createHash("sha256").update(diagnostic.payload).digest("hex") !== diagnostic.sha256) fail("CREATION_FAILURE_DIAGNOSTIC_INVALID", "bound rejected output must retain exact original bytes");
  const parsed = JSON.parse(diagnostic.payload);
  let decision: unknown;
  if (parsed?.exchange_version === 2 || parsed?.exchange_version === 3) {
    const planning = error.planning_diagnostic;
    if (!planning || creationDigest(planning.root_input?.context?.generation_binding ?? null) !== creationDigest(binding) || creationDigest(planning.root_input.context.source_spans) !== creationDigest(evidence.map(item => item.context))) return null;
    decision = resolveRejectedCreationPlanningFinal(parsed, planning);
  } else {
    decision = parsed && "exchange_version" in parsed ? resolveRejectedCreationPlanningFinal(parsed, null) : parsed;
  }
  assertCreationDecisionV1(decision);
  assertCreationDecisionSourceWindows(decision, evidence);
  if (visualFailure) {
    const identity = object(binding, "CREATION_FAILURE_BINDING_INVALID");
    // Re-run the same exact allocator, solely to explain the rejected candidate.
    // These diagnostic ranges are never accepted or substituted into a new output.
    const plan = compileCreationDecisionV1(decision, { plan_id: `diagnostic:${diagnostic.sha256}`, request_id: identity.request_id,
      revision: identity.revision, base_timeline_version: identity.base_timeline_version, input_digest: creationDigest(binding) }, timebase, null);
    const options = creationWeightedAnchorContext(evidence, timebase);
    const overlaps = (range: any, sample: CreationSourceSpan["observations"][number]) =>
      sample.start_pts * BigInt(range.end.timescale) < BigInt(range.end.value) * sample.timescale &&
      sample.end_pts * BigInt(range.start.timescale) > BigInt(range.start.value) * sample.timescale;
    const failures = plan.shots.flatMap((shot, index) => {
      const span = evidence.find(item => item.compile.span_id === shot.source.span_id)!.compile;
      const visual = span.observations.filter(sample => sample.kind === "visual");
      if (visual.some(sample => overlaps(shot.source, sample))) return [];
      const declared = decision.shots[index]!.source_window;
      const declaredAnchors = visual.filter(sample => overlaps(declared, sample)).map(sample => sample.evidence_id);
      const sorted = [...visual].sort((a, b) => { const delta = a.start_pts * b.timescale - b.start_pts * a.timescale; return delta < 0n ? -1 : delta > 0n ? 1 : 0; });
      const before = sorted.filter(sample => sample.start_pts * BigInt(shot.source.start.timescale) <= BigInt(shot.source.start.value) * sample.timescale).at(-1);
      const after = sorted.find(sample => sample.start_pts * BigInt(shot.source.start.timescale) > BigInt(shot.source.start.value) * sample.timescale);
      const nearbyIds = new Set([before?.evidence_id, after?.evidence_id].filter((id): id is string => id !== undefined));
      return [{ shot_id: shot.shot_id, span_id: shot.source.span_id, declared_source_window: declared, allocated_source_range: shot.source,
        reason: declaredAnchors.length ? "allocation-excluded-declared-visual-anchor" : "declared-window-has-no-visual-anchor",
        declared_visual_evidence_ids: declaredAnchors,
        nearby_observed_anchor_options: options.find(item => item.span_id === span.span_id)!.options.filter(option => nearbyIds.has(option.evidence_id)) }];
    });
    if (!failures.length) fail("CREATION_FAILURE_DIAGNOSTIC_INVALID", "saved visual-grounding failure is not reproduced by its bound evidence and exact allocator");
    return { code: "CREATION_SOURCE_UNOBSERVED", previous_output_sha256: diagnostic.sha256, previous_target_ticks: String(decision.target_duration_ticks),
      rule: "Every allocated video source interval must overlap an actual visual observation. A visual sample inside a declared window can still fall outside the shorter allocated prefix. Nearby options are evidence-backed alternatives, not selected edits; choose material and order for the current request.", shots: failures };
  }
  const shots = decision.shots.map((shot: any) => {
    const start = shot.source_window.start, end = shot.source_window.end;
    const capacity = (BigInt(end.value) * BigInt(start.timescale) - BigInt(start.value) * BigInt(end.timescale)) * timebase.timescale / (BigInt(start.timescale) * BigInt(end.timescale) * timebase.value);
    return { shot_id: shot.shot_id, span_id: shot.source_window.span_id, kind: shot.timing.kind, capacity_ticks: capacity.toString(), relative_weight: shot.timing.kind === "weighted" ? shot.timing.weight : null };
  });
  const total = shots.reduce((sum: bigint, shot: any) => sum + BigInt(shot.capacity_ticks), 0n);
  return { code: "CREATION_DECISION_CAPACITY_INSUFFICIENT", previous_output_sha256: diagnostic.sha256, previous_target_ticks: String(decision.target_duration_ticks), previous_total_capacity_ticks: total.toString(), deficit_ticks: (BigInt(decision.target_duration_ticks) > total ? BigInt(decision.target_duration_ticks) - total : 0n).toString(), shots };
}

export const CREATION_TEMPORAL_SAMPLING_POLICY = Object.freeze({ version: "editable-temporal-coverage-v2", maximum_unobserved_gap_seconds: 10 });

/** Sample real decoded intervals, independent of story labels and evaluation answers. */
export function creationTemporalFrameIndices(scan: MediaSceneResultV1, range: MediaSceneResultV1["spans"][number], facts: CreationMediaFacts): number[] {
  if (!facts.video) fail("CREATION_OBSERVATION_VIDEO_REQUIRED", "temporal coverage needs verified video bounds");
  const n = BigInt(scan.time_base.numerator), d = BigInt(scan.time_base.denominator);
  const streams = [facts.video!, ...(facts.audio ? [facts.audio] : [])];
  const eligible: number[] = [];
  for (let index = range.first_frame_index; index <= range.last_frame_index; index++) {
    const frame = scan.frames[index]!;
    if (streams.every(stream => BigInt(frame.pts) * n * stream.denominator < stream.end * stream.numerator * d && BigInt(frame.end_pts) * n * stream.denominator > stream.start * stream.numerator * d)) eligible.push(index);
  }
  if (!eligible.length) fail("CREATION_OBSERVATION_EDITABLE_FRAME_REQUIRED", "scene has no actual frame intersecting editable audiovisual coverage");
  const selected = new Set([eligible[0]!, eligible[Math.floor((eligible.length - 1) / 2)]!, eligible.at(-1)!]);
  let last = eligible[0]!;
  for (let ordinal = 1; ordinal < eligible.length; ordinal++) {
    const index = eligible[ordinal]!;
    if ((BigInt(scan.frames[index]!.pts) - BigInt(scan.frames[last]!.end_pts)) * n > BigInt(CREATION_TEMPORAL_SAMPLING_POLICY.maximum_unobserved_gap_seconds) * d) {
      const previous = eligible[ordinal - 1]!;
      if (previous === last) fail("CREATION_OBSERVATION_TEMPORAL_GAP_UNRESOLVABLE", "decoded intervals cannot certify bounded temporal coverage");
      selected.add(previous); last = previous;
    }
  }
  return [...selected].sort((a, b) => a - b);
}

export function creationObservationNeedsTemporalCoverage(value: CreationObservationV1, factsByAsset: ReadonlyMap<string, CreationMediaFacts>): boolean {
  const equal = (time: { value: number; timescale: number }, pts: number, scan: MediaSceneResultV1) => BigInt(time.value) * BigInt(scan.time_base.denominator) === BigInt(pts) * BigInt(scan.time_base.numerator) * BigInt(time.timescale);
  for (const material of value.materials) {
    const facts = factsByAsset.get(material.asset_id);
    if (!facts) fail("CREATION_SOURCE_DENIED", "temporal coverage source facts unavailable");
    const spans = value.spans.filter(span => span.asset_id === material.asset_id);
    for (const range of material.scan.spans) {
      const span = spans.find(item => equal(item.start, range.start_pts, material.scan) && equal(item.end, range.end_pts, material.scan));
      if (!span) fail("CREATION_OBSERVATION_SCAN_REBOUND", "saved scene span no longer matches its scan");
      const indices = creationTemporalFrameIndices(material.scan, range, facts!);
      const streams = [facts!.video!, ...(facts!.audio ? [facts!.audio] : [])];
      const samples = value.samples.filter(item => item.span_id === span!.span_id && item.sample.detail.kind === "frame" && streams.every(stream => BigInt(item.sample.actual_start.value) * stream.denominator < stream.end * stream.numerator * BigInt(item.sample.actual_start.timescale) && BigInt(item.sample.actual_end.value) * stream.denominator > stream.start * stream.numerator * BigInt(item.sample.actual_end.timescale)))
        .map(item => item.sample).sort((a, b) => { const difference = BigInt(a.actual_start.value) * BigInt(b.actual_start.timescale) - BigInt(b.actual_start.value) * BigInt(a.actual_start.timescale); return difference < 0n ? -1 : difference > 0n ? 1 : 0; });
      const clock = (pts: number) => ({ value: BigInt(pts) * BigInt(material.scan.time_base.numerator), timescale: BigInt(material.scan.time_base.denominator) });
      let cursor = clock(material.scan.frames[indices[0]!]!.pts);
      const gap = (end: { value: bigint; timescale: bigint }) => (end.value * cursor.timescale - cursor.value * end.timescale) > BigInt(CREATION_TEMPORAL_SAMPLING_POLICY.maximum_unobserved_gap_seconds) * end.timescale * cursor.timescale;
      for (const sample of samples) {
        const start = { value: BigInt(sample.actual_start.value), timescale: BigInt(sample.actual_start.timescale) }, end = { value: BigInt(sample.actual_end.value), timescale: BigInt(sample.actual_end.timescale) };
        if (gap(start)) return true;
        if (end.value * cursor.timescale > cursor.value * end.timescale) cursor = end;
      }
      if (!samples.length || gap(clock(material.scan.frames[indices.at(-1)!]!.end_pts))) return true;
    }
  }
  return false;
}
