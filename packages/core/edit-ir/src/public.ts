import { AssetId, sourceRange } from "../../media-identity/src/public.js";
import { Timeline, TimelineCommand } from "../../timeline-core/src/public.js";
import type { ApprovedStoryPlanV2 } from "../../../../contracts/generated/typescript/editorial/approved-story-plan.v2.js";
import type { EditorialEditIntentV1 } from "../../../../contracts/generated/typescript/editorial/editorial-edit-intent.v1.js";
import type { FeedbackDiagnosisV2 } from "../../../../contracts/generated/typescript/editorial/feedback-diagnosis.v2.js";

export type EditProducer = "manual" | "model" | "assembly" | "rough-cut" | "preset" | "system";
export type EditActor = Readonly<{ actor_id: string; producer: EditProducer }>;
export type EditTarget = Readonly<{ track_id?: string; clip_id?: string; sequence_id?: string }>;
export type EditPrecondition =
  | Readonly<{ kind: "timeline_version"; version: number }>
  | Readonly<{ kind: "track_exists"; track_id: string }>
  | Readonly<{ kind: "clip_exists"; track_id: string; clip_id: string }>
  | Readonly<{ kind: "track_unlocked"; track_id: string }>
  | Readonly<{ kind: "range_unlocked"; track_id: string; start: bigint; end: bigint }>;
export type EditProvenance = Readonly<{ source_id: string; source_version?: string | number; correlation_id?: string }>;
export type CommandEditIntent = Readonly<{
  intent_id: string;
  base_version: number;
  actor: EditActor;
  targets: readonly EditTarget[];
  commands: readonly TimelineCommand[];
  semantic_refs: readonly string[];
  preconditions: readonly EditPrecondition[];
  protected_refs: readonly string[];
  provenance: EditProvenance;
  reason: string;
  expected_effects: readonly string[];
}>;
export type CommandEditIR = Readonly<CommandEditIntent & { schema_version: 2; edit_ir_id: string; affected_ranges: readonly Readonly<{ track_id: string; start: bigint; end: bigint }>[] }>;

export const SEMANTIC_INTENT_COMPILER_ID = "semantic-intent-select-evidence";
export const SEMANTIC_INTENT_COMPILER_VERSION = 2;
export const FEEDBACK_REVISION_COMPILER_ID = "feedback-revision-inward-trim";
export const FEEDBACK_REVISION_COMPILER_VERSION = 1;
export type ApprovedSemanticEvidence = Readonly<{
  evidence_id: string;
  evidence_version: number;
  object_hash: string;
  asset_id: AssetId;
  start_pts: number | bigint;
  end_pts: number | bigint;
  timescale: number | bigint;
  review_status: "approved";
}>;
export type SemanticIntentCompiledEffect = Readonly<{
  compiler_id: typeof SEMANTIC_INTENT_COMPILER_ID | typeof FEEDBACK_REVISION_COMPILER_ID;
  compiler_version: number;
  intent_ref: Readonly<{ object_id: string; object_version: number; digest: string }>;
  story_ref: Readonly<{ object_id: string; object_version: number; digest: string }>;
  decision_refs: readonly Readonly<{ object_id: string; object_version: number; digest: string }>[];
  evidence_refs: readonly Readonly<{ object_id: string; object_version: number; digest: string }>[];
  contract_ref: Readonly<{ object_id: string; object_version: number; digest: string }>;
  capability_snapshot_ref: Readonly<{ object_id: string; object_version: number; digest: string }>;
  feedback_diagnosis_ref?: Readonly<{ object_id: string; object_version: number; digest: string }>;
  base_execution_ref?: Readonly<{ object_id: string; object_version: number; digest: string }>;
  base_timeline_version: number;
  track_id: string;
  affected_scope: readonly string[];
  clips: readonly Readonly<{ operation_id: string; beat_id: string; evidence_id: string; clip_id: string; asset_id: AssetId; source_start_pts: string; source_end_pts: string; source_timescale: string; timeline_start: string; timeline_duration: string }>[];
}>;
export type SemanticIntentCompilation = Readonly<{ command_intent: CommandEditIntent; effect: SemanticIntentCompiledEffect }>;
export type SemanticFirstCutDestinationViolation = Readonly<
  | { kind: "render_active_content"; track_id: string }
  | { kind: "non_neutral_track_state"; track_id: string; field: "muted" | "solo" | "opacity" | "blend_mode" | "transitions" | "effects" | "keyframes" | "automation_curves" | "audio_routing" | "locks" }
  | { kind: "non_neutral_timeline_state"; field: "master_loudness" | "dialogue_music_ducking" }
>;

const exactVersionedRef = (left: Readonly<{ object_id: string; object_version: number; digest: string }>, right: Readonly<{ object_id: string; object_version: number; digest: string }>): boolean => left.object_id === right.object_id && left.object_version === right.object_version && left.digest === right.digest;
function safePositiveBigInt(value: number | bigint, label: string): bigint {
  if (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0) || typeof value === "bigint" && value < 0n) throw new Error(`SEMANTIC_EVIDENCE_INVALID:${label}`);
  return BigInt(value);
}
function exactTimelineUnits(duration: bigint, sourceTimescale: bigint, tickValue: bigint, timelineTimescale: bigint): bigint {
  const numerator = duration * timelineTimescale, denominator = sourceTimescale * tickValue;
  if (denominator <= 0n || numerator <= 0n || numerator % denominator !== 0n) throw new Error("SEMANTIC_TIMEBASE_NOT_EXACT");
  return numerator / denominator;
}
type ExactFraction = Readonly<{ numerator: bigint; denominator: bigint }>;
const addExactFraction = (left: ExactFraction, right: ExactFraction): ExactFraction => ({ numerator: left.numerator * right.denominator + right.numerator * left.denominator, denominator: left.denominator * right.denominator });
const equalExactFraction = (left: ExactFraction, right: ExactFraction): boolean => left.numerator * right.denominator === right.numerator * left.denominator;
const exactSourceRangesOverlap = (left: Readonly<{ start: bigint; end: bigint; timescale: bigint }>, right: Readonly<{ start: bigint; end: bigint; timescale: bigint }>): boolean => left.start * right.timescale < right.end * left.timescale && right.start * left.timescale < left.end * right.timescale;

export function semanticFirstCutDestinationViolation(timeline: Timeline, outputTrackId: string): SemanticFirstCutDestinationViolation | null {
  const occupied = timeline.tracks.find((track) => track.enabled !== false && (track.clips.length > 0 || (track.gaps?.length ?? 0) > 0 || (track.captions?.length ?? 0) > 0));
  if (occupied) return { kind: "render_active_content", track_id: occupied.track_id };
  const solo = timeline.tracks.find((track) => track.enabled !== false && track.solo === true);
  if (solo) return { kind: "non_neutral_track_state", track_id: solo.track_id, field: "solo" };
  if (timeline.master_loudness?.enabled === true) return { kind: "non_neutral_timeline_state", field: "master_loudness" };
  if (timeline.dialogue_music_ducking?.enabled === true) return { kind: "non_neutral_timeline_state", field: "dialogue_music_ducking" };
  const output = timeline.tracks.find((track) => track.track_id === outputTrackId);
  if (!output) return null;
  if (output.muted === true) return { kind: "non_neutral_track_state", track_id: output.track_id, field: "muted" };
  if (output.opacity !== undefined && output.opacity !== 1) return { kind: "non_neutral_track_state", track_id: output.track_id, field: "opacity" };
  if (output.blend_mode !== undefined && output.blend_mode !== "normal") return { kind: "non_neutral_track_state", track_id: output.track_id, field: "blend_mode" };
  for (const field of ["transitions", "effects", "keyframes", "automation_curves", "audio_routing", "locks"] as const) if ((output[field]?.length ?? 0) > 0) return { kind: "non_neutral_track_state", track_id: output.track_id, field };
  return null;
}
export function compileApprovedEditorialIntent(input: Readonly<{ intent: EditorialEditIntentV1; intent_digest: string; plan: ApprovedStoryPlanV2; plan_digest: string; evidence: readonly ApprovedSemanticEvidence[]; timeline: Timeline }>): SemanticIntentCompilation {
  const { intent, plan, timeline } = input;
  if (!/^[0-9a-f]{64}$/.test(input.intent_digest) || intent.base_timeline_version !== timeline.version) throw new Error(`SEMANTIC_TIMELINE_STALE:${intent.base_timeline_version}:${timeline.version}`);
  if (intent.status !== "candidate" && intent.status !== "approved") throw new Error(`SEMANTIC_INTENT_STATUS_INVALID:${intent.status}`);
  if (plan.status !== "approved" || !exactVersionedRef(intent.approved_story_ref, { object_id: plan.plan_id, object_version: plan.object_version, digest: input.plan_digest })) throw new Error("SEMANTIC_STORY_REF_REBOUND");
  const unsupported = intent.operations.find((operation) => operation.kind !== "select_evidence" || operation.unsupported_policy !== "block" || operation.required_capabilities.length !== 1 || operation.required_capabilities[0] !== "semantic-evidence-selection");
  if (unsupported) throw new Error(`SEMANTIC_OPERATION_UNSUPPORTED:${unsupported.kind}:${unsupported.operation_id}`);
  const ranged = intent.operations.find((operation) => operation.range !== undefined);
  if (ranged) throw new Error(`SEMANTIC_OPERATION_RANGE_UNSUPPORTED:${ranged.operation_id}`);
  const audioParameterized = intent.operations.find((operation) => Object.prototype.hasOwnProperty.call(operation.parameter_values, "preserve_audio"));
  if (audioParameterized) throw new Error(`SEMANTIC_OPERATION_PARAMETER_UNSUPPORTED:preserve_audio:${audioParameterized.operation_id}`);
  const tracks = timeline.tracks.filter((track) => track.kind === "video" && track.enabled !== false);
  if (tracks.length !== 1) throw new Error(`SEMANTIC_VIDEO_TRACK_AMBIGUOUS:${tracks.length}`);
  const track = tracks[0]!;
  if (track.locked === true) throw new Error(`SEMANTIC_TRACK_LOCKED:${track.track_id}`);
  const destinationViolation = semanticFirstCutDestinationViolation(timeline, track.track_id);
  if (destinationViolation?.kind === "render_active_content") throw new Error(`SEMANTIC_DESTINATION_TIMELINE_NOT_EMPTY:${destinationViolation.track_id}`);
  if (destinationViolation?.kind === "non_neutral_timeline_state") throw new Error(`SEMANTIC_DESTINATION_TIMELINE_NOT_NEUTRAL:${destinationViolation.field}`);
  if (destinationViolation) throw new Error(`SEMANTIC_DESTINATION_TRACK_NOT_NEUTRAL:${destinationViolation.track_id}:${destinationViolation.field}`);
  const evidenceById = new Map(input.evidence.map((item) => [item.evidence_id, item]));
  if (evidenceById.size !== input.evidence.length) throw new Error("SEMANTIC_EVIDENCE_DUPLICATE");
  const seenBeatIds = new Set<string>();
  const duplicateBeat = plan.beats.find((beat) => seenBeatIds.has(beat.beat_id) || (seenBeatIds.add(beat.beat_id), false));
  if (duplicateBeat) throw new Error(`SEMANTIC_STORY_BEAT_DUPLICATE:${duplicateBeat.beat_id}`);
  const approvedDuration = { numerator: safePositiveBigInt(plan.duration_budget.value, "story:duration-budget"), denominator: safePositiveBigInt(plan.duration_budget.timescale, "story:duration-timescale") };
  const plannedDuration = plan.beats.reduce<ExactFraction>((total, beat) => {
    const duration = { numerator: safePositiveBigInt(beat.target_duration.value, `${beat.beat_id}:target-duration`), denominator: safePositiveBigInt(beat.target_duration.timescale, `${beat.beat_id}:target-timescale`) };
    if (duration.numerator <= 0n || duration.denominator <= 0n) throw new Error(`SEMANTIC_STORY_DURATION_INVALID:${beat.beat_id}`);
    return addExactFraction(total, duration);
  }, { numerator: 0n, denominator: 1n });
  if (approvedDuration.numerator <= 0n || approvedDuration.denominator <= 0n || !equalExactFraction(plannedDuration, approvedDuration)) throw new Error("SEMANTIC_STORY_DURATION_BUDGET_MISMATCH");
  const beatOrder = new Map(plan.beats.map((beat, index) => [beat.beat_id, index]));
  const operationOrder = new Map(intent.operations.map((operation, index) => [operation.operation_id, index]));
  if (operationOrder.size !== intent.operations.length) throw new Error("SEMANTIC_OPERATION_DUPLICATE");
  const resolved = intent.operations.map((operation) => {
    const beatRefs = operation.target_refs.filter((reference) => reference.startsWith("beat:"));
    const evidenceRefs = operation.target_refs.filter((reference) => reference.startsWith("evidence:"));
    if (operation.target_refs.length !== 2 || beatRefs.length !== 1 || evidenceRefs.length !== 1) throw new Error(`SEMANTIC_TARGET_SHAPE_INVALID:${operation.operation_id}`);
    const beatId = beatRefs[0]!.slice(5), evidenceId = evidenceRefs[0]!.slice(9), beat = plan.beats.find((candidate) => candidate.beat_id === beatId), evidence = evidenceById.get(evidenceId);
    if (!beat || beatOrder.get(beatId) === undefined) throw new Error(`SEMANTIC_BEAT_MISSING:${beatId}`);
    const storyEvidenceRef = beat.evidence_refs.find((reference) => reference.object_id === evidenceId), intentEvidenceRef = intent.evidence_refs.find((reference) => reference.object_id === evidenceId);
    if (!evidence || evidence.review_status !== "approved" || !storyEvidenceRef || !intentEvidenceRef || !exactVersionedRef(storyEvidenceRef, intentEvidenceRef) || evidence.evidence_version !== intentEvidenceRef.object_version || evidence.object_hash !== intentEvidenceRef.digest) throw new Error(`SEMANTIC_EVIDENCE_REBOUND:${evidenceId}`);
    const start = safePositiveBigInt(evidence.start_pts, `${evidenceId}:start`), end = safePositiveBigInt(evidence.end_pts, `${evidenceId}:end`), timescale = safePositiveBigInt(evidence.timescale, `${evidenceId}:timescale`);
    if (end <= start || timescale <= 0n) throw new Error(`SEMANTIC_EVIDENCE_RANGE_INVALID:${evidenceId}`);
    const beatDuration = safePositiveBigInt(beat.target_duration.value, `${beatId}:target-duration`), beatTimescale = safePositiveBigInt(beat.target_duration.timescale, `${beatId}:target-timescale`);
    if (beatDuration <= 0n || beatTimescale <= 0n) throw new Error(`SEMANTIC_STORY_DURATION_INVALID:${beatId}`);
    return { operation, beatId, evidenceId, evidence, start, end, timescale, beatDuration, beatTimescale, beatIndex: beatOrder.get(beatId)!, operationIndex: operationOrder.get(operation.operation_id)! };
  }).sort((left, right) => left.beatIndex - right.beatIndex || left.operationIndex - right.operationIndex || left.operation.operation_id.localeCompare(right.operation.operation_id));
  if (new Set(resolved.map((item) => item.evidenceId)).size !== resolved.length) throw new Error("SEMANTIC_EVIDENCE_REUSED");
  for (let leftIndex = 0; leftIndex < resolved.length; leftIndex += 1) for (let rightIndex = leftIndex + 1; rightIndex < resolved.length; rightIndex += 1) {
    const left = resolved[leftIndex]!, right = resolved[rightIndex]!;
    if (left.evidence.asset_id === right.evidence.asset_id && exactSourceRangesOverlap(left, right)) throw new Error(`SEMANTIC_EVIDENCE_SOURCE_OVERLAP:${left.evidenceId}:${right.evidenceId}`);
  }
  const selectedByBeat = new Map<string, ExactFraction>();
  for (const item of resolved) selectedByBeat.set(item.beatId, addExactFraction(selectedByBeat.get(item.beatId) ?? { numerator: 0n, denominator: 1n }, { numerator: item.end - item.start, denominator: item.timescale }));
  for (const beat of plan.beats) {
    const selectedDuration = selectedByBeat.get(beat.beat_id);
    if (!selectedDuration) throw new Error(`SEMANTIC_STORY_BEAT_UNCOVERED:${beat.beat_id}`);
    const targetDuration = { numerator: safePositiveBigInt(beat.target_duration.value, `${beat.beat_id}:target-duration`), denominator: safePositiveBigInt(beat.target_duration.timescale, `${beat.beat_id}:target-timescale`) };
    if (targetDuration.numerator <= 0n || targetDuration.denominator <= 0n || !equalExactFraction(selectedDuration, targetDuration)) throw new Error(`SEMANTIC_STORY_DURATION_MISMATCH:${beat.beat_id}`);
  }
  const first = resolved[0]; if (!first) throw new Error("SEMANTIC_INTENT_EMPTY");
  const tickValue = timeline.sequence?.timebase?.value ?? 1n;
  const timelineTimescale = timeline.sequence?.timebase?.timescale ?? timeline.tracks.flatMap((candidate) => candidate.clips)[0]?.source.timescale ?? first.timescale;
  let timelineStart = track.clips.reduce((maximum, clip) => clip.timeline_start + clip.timeline_duration > maximum ? clip.timeline_start + clip.timeline_duration : maximum, 0n);
  const commands: TimelineCommand[] = [], clips: SemanticIntentCompiledEffect["clips"][number][] = [];
  for (const item of resolved) {
    const duration = exactTimelineUnits(item.end - item.start, item.timescale, tickValue, timelineTimescale), clipId = `semantic:${intent.intent_id}:${item.operation.operation_id}`;
    if (track.clips.some((clip) => clip.clip_id === clipId)) throw new Error(`SEMANTIC_CLIP_ID_CONFLICT:${clipId}`);
    commands.push({ type: "add_clip", track_id: track.track_id, clip: { clip_id: clipId, source: sourceRange(item.evidence.asset_id, item.start, item.end, item.timescale), timeline_start: timelineStart, timeline_duration: duration, media_kind: "video", semantic_sidecar: { semantic_id: item.operation.operation_id, labels: ["approved-story-evidence", `beat:${item.beatId}`], evidence_refs: [item.evidenceId, item.evidence.object_hash], metadata: { intent_id: intent.intent_id, story_plan_id: plan.plan_id } } } });
    clips.push({ operation_id: item.operation.operation_id, beat_id: item.beatId, evidence_id: item.evidenceId, clip_id: clipId, asset_id: item.evidence.asset_id, source_start_pts: item.start.toString(), source_end_pts: item.end.toString(), source_timescale: item.timescale.toString(), timeline_start: timelineStart.toString(), timeline_duration: duration.toString() });
    timelineStart += duration;
  }
  const affectedScope = [...new Set(intent.operations.flatMap((operation) => operation.target_refs))].sort();
  const semanticRefs = [input.intent_digest, intent.approved_story_ref.digest, ...intent.decision_refs.map((reference) => reference.digest), ...resolved.map((item) => item.evidence.object_hash), intent.contract_ref.digest, intent.capability_snapshot_ref.digest];
  const commandIntent: CommandEditIntent = { intent_id: `execute:${intent.intent_id}`, base_version: timeline.version, actor: { actor_id: "project-host", producer: "system" }, targets: clips.map((clip) => ({ track_id: track.track_id, clip_id: clip.clip_id })), commands, semantic_refs: semanticRefs, preconditions: [{ kind: "timeline_version", version: timeline.version }, { kind: "track_exists", track_id: track.track_id }, { kind: "track_unlocked", track_id: track.track_id }, ...clips.map((clip) => ({ kind: "range_unlocked" as const, track_id: track.track_id, start: BigInt(clip.timeline_start), end: BigInt(clip.timeline_start) + BigInt(clip.timeline_duration) }))], protected_refs: [...intent.protected_refs], provenance: { source_id: intent.intent_id, source_version: intent.object_version, correlation_id: input.intent_digest }, reason: intent.reason, expected_effects: intent.operations.map((operation) => operation.expected_effect) };
  const effect: SemanticIntentCompiledEffect = { compiler_id: SEMANTIC_INTENT_COMPILER_ID, compiler_version: SEMANTIC_INTENT_COMPILER_VERSION, intent_ref: { object_id: intent.intent_id, object_version: intent.object_version, digest: input.intent_digest }, story_ref: { ...intent.approved_story_ref }, decision_refs: intent.decision_refs.map((reference) => ({ ...reference })), evidence_refs: resolved.map((item) => ({ object_id: item.evidenceId, object_version: item.evidence.evidence_version, digest: item.evidence.object_hash })), contract_ref: { ...intent.contract_ref }, capability_snapshot_ref: { ...intent.capability_snapshot_ref }, base_timeline_version: timeline.version, track_id: track.track_id, affected_scope: affectedScope, clips };
  return { command_intent: commandIntent, effect };
}

function rationalToUnits(value: Readonly<{ schema_version: 1; value: number; timescale: number }>, timescale: bigint, label: string): bigint {
  if (value.schema_version !== 1 || !Number.isSafeInteger(value.value) || value.value < 0 || !Number.isSafeInteger(value.timescale) || value.timescale <= 0) throw new Error(`FEEDBACK_TRIM_TIME_INVALID:${label}`);
  const numerator = BigInt(value.value) * timescale, denominator = BigInt(value.timescale);
  if (numerator % denominator !== 0n) throw new Error(`FEEDBACK_TRIM_TIMEBASE_NOT_EXACT:${label}`);
  return numerator / denominator;
}

export function compileFeedbackRevision(input: Readonly<{ intent: EditorialEditIntentV1; intent_digest: string; plan: ApprovedStoryPlanV2; plan_digest: string; evidence: readonly ApprovedSemanticEvidence[]; timeline: Timeline; timeline_digest: string; diagnosis: FeedbackDiagnosisV2; diagnosis_digest: string; base_execution_digest: string }>): SemanticIntentCompilation {
  const { intent, plan, timeline, diagnosis } = input;
  if (!/^[0-9a-f]{64}$/.test(input.intent_digest) || !/^[0-9a-f]{64}$/.test(input.diagnosis_digest) || !/^[0-9a-f]{64}$/.test(input.base_execution_digest) || !/^[0-9a-f]{64}$/.test(input.timeline_digest)) throw new Error("FEEDBACK_REVISION_DIGEST_INVALID");
  if (intent.status !== "candidate" && intent.status !== "approved" || intent.base_timeline_version !== timeline.version || diagnosis.base_timeline_ref.version !== timeline.version || diagnosis.base_timeline_ref.digest !== input.timeline_digest) throw new Error("FEEDBACK_REVISION_TIMELINE_STALE");
  if (!intent.feedback_diagnosis_ref || !exactVersionedRef(intent.feedback_diagnosis_ref, { object_id: diagnosis.diagnosis_id, object_version: diagnosis.object_version, digest: input.diagnosis_digest }) || diagnosis.base_execution_ref.digest !== input.base_execution_digest) throw new Error("FEEDBACK_REVISION_DIAGNOSIS_REBOUND");
  if (plan.status !== "approved" || !exactVersionedRef(intent.approved_story_ref, { object_id: plan.plan_id, object_version: plan.object_version, digest: input.plan_digest }) || !exactVersionedRef(diagnosis.authority_refs.approved_story_ref, intent.approved_story_ref) || !exactVersionedRef(diagnosis.authority_refs.contract_ref, intent.contract_ref) || !exactVersionedRef(diagnosis.authority_refs.capability_snapshot_ref, intent.capability_snapshot_ref)) throw new Error("FEEDBACK_REVISION_AUTHORITY_REBOUND");
  if (intent.operations.length !== 1) throw new Error("FEEDBACK_REVISION_NOT_LOCAL");
  const operation = intent.operations[0]!;
  if (operation.kind !== "trim_semantic_range" || operation.unsupported_policy !== "block" || operation.required_capabilities.length !== 1 || operation.required_capabilities[0] !== "semantic-trim" || operation.parameter_values.boundary_strategy !== "inward" || operation.target_refs.length !== 1 || operation.target_refs[0] !== `clip:${diagnosis.target.clip_id}` || !operation.range) throw new Error("FEEDBACK_REVISION_OPERATION_UNSUPPORTED");
  const tracks = timeline.tracks.filter((track) => track.clips.some((clip) => clip.clip_id === diagnosis.target.clip_id));
  if (tracks.length !== 1 || tracks[0]!.track_id !== diagnosis.target.track_id || tracks[0]!.kind !== "video") throw new Error("FEEDBACK_REVISION_TARGET_AMBIGUOUS");
  const track = tracks[0]!;
  if (track.locked === true || intent.protected_refs.includes(`clip:${diagnosis.target.clip_id}`) || intent.protected_refs.includes(diagnosis.target.clip_id)) throw new Error("FEEDBACK_REVISION_TARGET_PROTECTED");
  const clip = track.clips.find((candidate) => candidate.clip_id === diagnosis.target.clip_id)!;
  const original = diagnosis.target.original_source, proposed = diagnosis.target.proposed_source;
  if (original.asset_id !== clip.source.asset_id || proposed.asset_id !== clip.source.asset_id) throw new Error("FEEDBACK_REVISION_ASSET_REBOUND");
  const originalStart = rationalToUnits(original.start, clip.source.timescale, "original-start"), originalEnd = rationalToUnits(original.end, clip.source.timescale, "original-end"), proposedStart = rationalToUnits(proposed.start, clip.source.timescale, "proposed-start"), proposedEnd = rationalToUnits(proposed.end, clip.source.timescale, "proposed-end");
  if (originalStart !== clip.source.start_pts || originalEnd !== clip.source.end_pts || proposedStart < originalStart || proposedEnd > originalEnd || proposedEnd <= proposedStart || proposedStart === originalStart && proposedEnd === originalEnd) throw new Error("FEEDBACK_REVISION_RANGE_REBOUND_OR_WIDENED");
  const operationStart = rationalToUnits(operation.range.start, clip.source.timescale, "operation-start"), operationEnd = rationalToUnits(operation.range.end, clip.source.timescale, "operation-end");
  if (operationStart !== proposedStart || operationEnd !== proposedEnd) throw new Error("FEEDBACK_REVISION_OPERATION_RANGE_REBOUND");
  const firstTimelineClip = timeline.tracks.flatMap((candidate) => candidate.clips)[0];
  const tickValue = timeline.sequence?.timebase?.value ?? 1n;
  const tickTimescale = timeline.sequence?.timebase?.timescale ?? firstTimelineClip?.source.timescale ?? clip.source.timescale;
  if (tickValue <= 0n || tickTimescale <= 0n || tickValue * clip.source.timescale !== tickTimescale) throw new Error("FEEDBACK_TRIM_TIMEBASE_UNSUPPORTED");
  const sourceDuration = clip.source.end_pts - clip.source.start_pts;
  const unitSpeed = !clip.speed || clip.speed.numerator > 0n && clip.speed.numerator === clip.speed.denominator;
  const exactUnitMapping = clip.timeline_duration * tickValue * clip.source.timescale === sourceDuration * tickTimescale;
  if (clip.time_map || !unitSpeed || !exactUnitMapping) throw new Error("FEEDBACK_TRIM_RETIME_UNSUPPORTED");
  const evidenceById = new Map(input.evidence.map((item) => [item.evidence_id, item]));
  for (const reference of diagnosis.authority_refs.evidence_refs) { const evidence = evidenceById.get(reference.object_id); if (!evidence || evidence.evidence_version !== reference.object_version || evidence.object_hash !== reference.digest || evidence.review_status !== "approved") throw new Error(`FEEDBACK_REVISION_EVIDENCE_REBOUND:${reference.object_id}`); }
  const command: TimelineCommand = { type: "trim_source", track_id: track.track_id, clip_id: clip.clip_id, source: sourceRange(clip.source.asset_id, proposedStart, proposedEnd, clip.source.timescale) };
  const clipEffect: SemanticIntentCompiledEffect["clips"][number] = { operation_id: operation.operation_id, beat_id: clip.semantic_sidecar?.labels.find((label) => label.startsWith("beat:"))?.slice(5) ?? "feedback", evidence_id: diagnosis.authority_refs.evidence_refs[0]!.object_id, clip_id: clip.clip_id, asset_id: clip.source.asset_id, source_start_pts: proposedStart.toString(), source_end_pts: proposedEnd.toString(), source_timescale: clip.source.timescale.toString(), timeline_start: clip.timeline_start.toString(), timeline_duration: (proposedEnd - proposedStart).toString() };
  const semanticRefs = [input.intent_digest, input.diagnosis_digest, input.base_execution_digest, input.timeline_digest, intent.approved_story_ref.digest, ...intent.decision_refs.map((reference) => reference.digest), ...diagnosis.authority_refs.evidence_refs.map((reference) => reference.digest), intent.contract_ref.digest, intent.capability_snapshot_ref.digest];
  const commandIntent: CommandEditIntent = { intent_id: `execute:${intent.intent_id}`, base_version: timeline.version, actor: { actor_id: "project-host", producer: "system" }, targets: [{ track_id: track.track_id, clip_id: clip.clip_id }], commands: [command], semantic_refs: semanticRefs, preconditions: [{ kind: "timeline_version", version: timeline.version }, { kind: "track_exists", track_id: track.track_id }, { kind: "track_unlocked", track_id: track.track_id }, { kind: "clip_exists", track_id: track.track_id, clip_id: clip.clip_id }, { kind: "range_unlocked", track_id: track.track_id, start: clip.timeline_start, end: clip.timeline_start + clip.timeline_duration }], protected_refs: [...intent.protected_refs], provenance: { source_id: intent.intent_id, source_version: intent.object_version, correlation_id: input.diagnosis_digest }, reason: intent.reason, expected_effects: [operation.expected_effect] };
  const effect: SemanticIntentCompiledEffect = { compiler_id: FEEDBACK_REVISION_COMPILER_ID, compiler_version: FEEDBACK_REVISION_COMPILER_VERSION, intent_ref: { object_id: intent.intent_id, object_version: intent.object_version, digest: input.intent_digest }, story_ref: { ...intent.approved_story_ref }, decision_refs: intent.decision_refs.map((reference) => ({ ...reference })), evidence_refs: diagnosis.authority_refs.evidence_refs.map((reference) => ({ ...reference })), contract_ref: { ...intent.contract_ref }, capability_snapshot_ref: { ...intent.capability_snapshot_ref }, feedback_diagnosis_ref: { ...intent.feedback_diagnosis_ref }, base_execution_ref: { ...diagnosis.base_execution_ref }, base_timeline_version: timeline.version, track_id: track.track_id, affected_scope: [...diagnosis.affected_scope], clips: [clipEffect] };
  return { command_intent: commandIntent, effect };
}

function allStringReferences(value: unknown, references = new Set<string>()): ReadonlySet<string> {
  if (typeof value === "string") references.add(value);
  else if (Array.isArray(value)) for (const item of value) allStringReferences(item, references);
  else if (value && typeof value === "object") for (const item of Object.values(value)) allStringReferences(item, references);
  return references;
}

export function resolveCommandEditIntent(intent: CommandEditIntent, timeline: Timeline): Omit<CommandEditIR, "affected_ranges"> {
  if (!intent.intent_id || !intent.actor.actor_id || !intent.provenance.source_id || !intent.reason.trim() || intent.commands.length === 0 || intent.expected_effects.length === 0) throw new Error("EDIT_INTENT_INVALID");
  if (timeline.version !== intent.base_version) throw new Error(`EDIT_VERSION_CONFLICT:${intent.base_version}:${timeline.version}`);
  const track = (trackId: string) => timeline.tracks.find((candidate) => candidate.track_id === trackId);
  for (const precondition of intent.preconditions) {
    if (precondition.kind === "timeline_version" && timeline.version !== precondition.version) throw new Error("EDIT_PRECONDITION_VERSION");
    if (precondition.kind === "track_exists" && !track(precondition.track_id)) throw new Error("EDIT_PRECONDITION_TRACK");
    if (precondition.kind === "clip_exists" && !track(precondition.track_id)?.clips.some((clip) => clip.clip_id === precondition.clip_id)) throw new Error("EDIT_PRECONDITION_CLIP");
    if (precondition.kind === "track_unlocked" && track(precondition.track_id)?.locked === true) throw new Error("EDIT_PRECONDITION_TRACK_LOCKED");
    if (precondition.kind === "range_unlocked" && track(precondition.track_id)?.locks?.some((lock) => precondition.start < lock.end && lock.start < precondition.end)) throw new Error("EDIT_PRECONDITION_RANGE_LOCKED");
  }
  const touched = allStringReferences(intent.commands);
  const protectedReference = intent.protected_refs.find((reference) => touched.has(reference));
  if (protectedReference) throw new Error(`EDIT_PROTECTED_REFERENCE:${protectedReference}`);
  return { ...intent, schema_version: 2, edit_ir_id: intent.intent_id };
}
