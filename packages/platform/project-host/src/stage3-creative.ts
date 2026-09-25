import type { CreationPlanV1 } from "../../../../contracts/generated/typescript/editorial/creation-plan.v1.js";
import type { Timeline, ColorContext } from "../../../core/timeline-core/src/public.js";
import type { CreationSourceSpan, CreationSourceObservation } from "../../../core/edit-ir/src/public.js";
import { assertCreationPlanV1, creationDigest, CreationError, creationDecisionSchema } from "../../contract-runtime/src/public.js";
export { creationDecisionSchema } from "../../contract-runtime/src/public.js";
import type { CreationTicket } from "./stage3-request.js";

export type CreationObservationReference = Readonly<{ run_id: string; digest: string }>;
export type CreationGenerationInput = Readonly<{ request_id: string; expected_revision: number; observation_refs: readonly CreationObservationReference[]; profile_query: Readonly<{ contexts: readonly string[]; except_principle_ids: readonly string[] }> | null }>;
type StreamBounds = Readonly<{ index: number; start: bigint; end: bigint; numerator: bigint; denominator: bigint }>;
export type CreationMediaFacts = Readonly<{ video: (StreamBounds & { width: number; height: number }) | null; audio: StreamBounds | null; color_context: ColorContext | null; probe_digest: string }>;
export type ResolvedCreationSpan = Readonly<{ compile: CreationSourceSpan; context: unknown }>;
const fail = (code: string, message: string): never => { throw new CreationError(code, message); };
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
      result.transcript.forEach((segment: any, index: number) => add(`observation:${value.ticket.run_id}:${sample.sample_id}:${index}`, "transcript", segment.start, segment.end, segment.text, result.uncertain));
    }
    const scales = [integer(span.start.timescale, "CREATION_OBSERVATION_TIME_INVALID"), integer(span.end.timescale, "CREATION_OBSERVATION_TIME_INVALID"), ...observations.map(item => item.timescale)];
    if (scales.some(scale => scale <= 0n)) fail("CREATION_OBSERVATION_TIME_INVALID", "positive source timebase required");
    const scale = scales.reduce((a, b) => a / gcd(a, b) * b), start = integer(span.start.value, "CREATION_OBSERVATION_TIME_INVALID") * (scale / scales[0]!), end = integer(span.end.value, "CREATION_OBSERVATION_TIME_INVALID") * (scale / scales[1]!);
    const covers = (stream: StreamBounds | null) => stream !== null && start * stream.denominator >= stream.start * stream.numerator * scale && end * stream.denominator <= stream.end * stream.numerator * scale;
    if (start < 0n || end <= start || !covers(facts!.video)) fail("CREATION_OBSERVATION_OUTSIDE_MEDIA", "candidate exceeds the actual video stream");
    const audio = covers(facts!.audio);
    if (facts!.audio && !audio) fail("CREATION_EMBEDDED_AUDIO_RANGE_INVALID", "candidate exceeds embedded audio coverage");
    const compile: CreationSourceSpan = { span_id: span.span_id, asset_id: span.asset_id, start_pts: start, end_pts: end, timescale: scale, has_video: true, has_audio: audio, observations, ...(facts!.color_context ? { color_context: facts!.color_context } : {}) };
    return { compile, context: { span_id: span.span_id, asset_id: span.asset_id, editable_start: span.start, editable_end: span.end, has_audio: audio, observations: observations.map(item => ({ ...item, start_pts: item.start_pts.toString(), end_pts: item.end_pts.toString(), timescale: item.timescale.toString() })) } };
  });
}

export const CREATION_DECISION_FIELDS: readonly string[] = Object.keys(creationDecisionSchema.properties);
/** Identity is Host-owned. Reject model identity fields; never repair a claimed envelope. */
export function bindCreationDecision(value: unknown, ticket: CreationTicket): CreationPlanV1 {
  const decision = object(value, "CREATION_DECISION_INVALID"); keys(decision, CREATION_DECISION_FIELDS, "CREATION_DECISION_FIELDS_INVALID");
  const plan = { ...structuredClone(decision), schema_version: 1, plan_id: `plan:${ticket.run_id}`, request_id: ticket.request_id, revision: ticket.revision, base_timeline_version: ticket.base_timeline_version, input_digest: ticket.input_digest };
  assertCreationPlanV1(plan); return plan;
}

export function creationTimelineContext(timeline: Timeline): unknown {
  const sidecar = (value: any) => value ? { semantic_id: value.semantic_id, labels: value.labels, evidence_refs: value.evidence_refs } : undefined;
  const pick = (value: any, fields: readonly string[]) => Object.fromEntries(fields.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
  const context = { version: timeline.version, sequence: timeline.sequence ? pick(timeline.sequence, ["sequence_id", "timebase"]) : null,
    tracks: timeline.tracks.map(track => ({ ...pick(track, ["track_id", "kind", "enabled", "locked", "muted", "solo", "opacity", "z_index", "locks"]),
      clips: track.clips.map(clip => ({ ...pick(clip, ["clip_id", "source", "timeline_start", "timeline_duration", "media_kind", "gain_db", "link_group_id", "static_reframe", "boundary_fades"]),
        grade: clip.grade ? pick(clip.grade, ["grade_id", "exposure", "brightness", "contrast", "saturation", "gamma", "context"]) : null,
        unsupported_semantics: Boolean(clip.grade?.lut_path || clip.grade?.brightness !== undefined || clip.grade?.gamma !== undefined || clip.effects?.length || clip.automation_curves?.length || clip.mask || clip.time_map || clip.speed || clip.keyframes?.length || clip.transform || clip.compound_clip_ids?.length || clip.nested_sequence_id),
        semantic_sidecar: sidecar(clip.semantic_sidecar) })),
      captions: track.captions?.map(caption => ({ ...pick(caption, ["caption_id", "text", "timeline_start", "timeline_duration", "language", "words"]), semantic_sidecar: sidecar(caption.semantic_sidecar) })) })) };
  return JSON.parse(JSON.stringify(context, (_key, value) => typeof value === "bigint" ? value.toString() : value));
}

/** Narrow only unsupported source capabilities, preserving the complete current plan shape. */
export function creationOutputSchema(evidence: readonly ResolvedCreationSpan[], principleIds: readonly string[], timebase: Readonly<{ value: bigint; timescale: bigint }>): unknown {
  const schema = structuredClone(creationDecisionSchema) as any;
  if (timebase.value <= 0n || timebase.timescale <= 0n || timebase.value > BigInt(Number.MAX_SAFE_INTEGER) || timebase.timescale > BigInt(Number.MAX_SAFE_INTEGER)) fail("CREATION_TIMEBASE_UNSUPPORTED", "generation requires an exactly representable positive Timeline timebase");
  // This is provenance, not free-form editing advice: cold start has no learned IDs.
  schema.properties.applied_principle_ids = {
    ...schema.properties.applied_principle_ids,
    description: "IDs of learned principles actually supplied in this request profile. Never invent IDs for general editing rules. With no profile return [].",
    ...(principleIds.length ? { items: { type: "string", enum: [...principleIds] } } : { maxItems: 0 }),
  };
  schema.properties.shots.description = "Ordered selected video cuts. Source spans are available ranges, NOT mandatory whole shots. Sparse frame observations identify sampling positions, NOT maximum permitted clip lengths: a video subrange may extend around a relevant observed frame inside its editable span. Do not invent unobserved scene details. Select meaningful subranges to satisfy the requested final duration; concatenate selected durations to obtain final Timeline duration.";
  const relativeOffset = "Relative to the START of shot_id in the NEW Timeline, not absolute Timeline time and not source time. Zero starts with that shot; negative values are allowed for J-cuts. The resulting interval must remain inside the complete output.";
  schema.properties.audio.items.properties.offset.description = relativeOffset;
  schema.properties.captions.items.properties.offset.description = relativeOffset;
  schema.properties.audio.description = "Optional independent audio edits. Shots already include source audio at embedded_gain_db; do not duplicate it unless deliberately mixing. Independent source duration plus shot-relative offset must fit the full output; fade_in + fade_out must not exceed this audio duration.";
  schema.properties.captions.description = "Editorial captions must fit entirely inside their referenced shot: offset >= 0 and offset + duration <= that shot's duration. Verbatim captions must use exact full transcript text and exact mapped source times through the selected audible audio anchor. Do not guess or round transcript timings to satisfy integer ticks. Omit captions unsupported by the source or exact Timeline timebase; retain the original audio. Preserve required caption content and its shot-relative mapping.";
  const sourceSchema = (kind: "video" | "audio") => ({
    ...schema.properties.shots.items.properties.source,
    description: "Select one provided span and a subrange INSIDE its editable_start/editable_end. Source-absolute times need not align to the Timeline origin: the selected duration and caption offsets relative to the audible source anchor must be exact Timeline ticks. Prefer the supplied editable bounds' simple units when suitable; equivalent exact fractions remain valid. A cut crossing a span boundary requires separate shots with corresponding span IDs.",
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
      const constraints = [...bounds(span.timescale), ...(span.timescale === timebase.timescale ? [] : bounds(timebase.timescale))];
      return {
      properties: {
        span_id: { const: span.span_id }, asset_id: { const: span.asset_id },
      },
      ...(constraints.length ? { allOf: constraints } : {}),
    }; }),
  });
  schema.properties.shots.items.properties.source = sourceSchema("video");
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
  else schema.properties.shots.items.allOf = [{ if: { properties: { source: { properties: { span_id: { enum: ids } } } } }, then: {}, else: { properties: { color: { type: "null" } } } }];
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
