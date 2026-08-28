export const featureId = "feedback" as const;
import type { CompareResult, ReactionTiming } from "../../../core/editorial-core/src/public.js";
import { editorialObjectDigest, isStrictComparableDateTime, type VersionedObjectRef } from "../../../core/editorial-core/src/public.js";
import type { FeedbackDiagnosisV2 } from "../../../../contracts/generated/typescript/editorial/feedback-diagnosis.v2.js";
import type { EditorialEditIntentV1 } from "../../../../contracts/generated/typescript/editorial/editorial-edit-intent.v1.js";
export type FeedbackCommand = Readonly<{ type: string; payload: unknown }>;
export type FeedbackQuery = Readonly<{ type: string; parameters?: Readonly<Record<string, unknown>> }>;
export type FeedbackFeatureDescriptor = Readonly<{ feature_id: typeof featureId; label: "feedback"; owner: "project-host"; layers: readonly ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] }>;
export const descriptor: FeedbackFeatureDescriptor = Object.freeze({ feature_id: featureId, label: "feedback", owner: "project-host", layers: ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] as const });
export function validateCompare(result: CompareResult): void { if (result.left_version === result.right_version) throw new Error("compare requires two different versions"); if (!result.reason.trim()) throw new Error("compare reason is required"); }
export function validateReactionTiming(reaction: ReactionTiming, compare: CompareResult): void { validateCompare(compare); if (reaction.compare_id !== compare.compare_id) throw new Error("reaction compare mismatch"); if (reaction.timeline_pts < 0n) throw new Error("reaction time must not be negative"); }

export const FEEDBACK_DIAGNOSIS_VERSION = "feedback-diagnosis-v2";
export const FEEDBACK_POLICY_VERSION = "feedback-policy-v1";

type SourceRangeInput = Readonly<{ asset_id: string; start: Readonly<{ schema_version: 1; value: number; timescale: number }>; end: Readonly<{ schema_version: 1; value: number; timescale: number }> }>;
export type FeedbackRevisionDiagnosisInput = Readonly<{
  diagnosis_id: string;
  feedback_text: string;
  base_execution_ref: VersionedObjectRef;
  base_timeline_ref: Readonly<{ version: number; digest: string }>;
  target: Readonly<{ track_id: string; clip_id: string; original_source: SourceRangeInput; proposed_source: SourceRangeInput }>;
  authority_refs: FeedbackDiagnosisV2["authority_refs"];
  reason: string;
  alternatives: readonly string[];
  confidence: Readonly<{ score: number; basis: readonly string[] }>;
  created_at: string;
}>;

const exactRef = (left: VersionedObjectRef, right: VersionedObjectRef): boolean => left.object_id === right.object_id && left.object_version === right.object_version && left.digest === right.digest;
const sameRefIdentity = (left: VersionedObjectRef, right: VersionedObjectRef): boolean => left.object_id === right.object_id && left.object_version === right.object_version;
const validRef = (value: VersionedObjectRef): boolean => Boolean(value?.object_id && Number.isSafeInteger(value.object_version) && value.object_version >= 1 && /^[0-9a-f]{64}$/.test(value.digest));
const validTime = (value: Readonly<{ schema_version: 1; value: number; timescale: number }>): boolean => value?.schema_version === 1 && Number.isSafeInteger(value.value) && value.value >= 0 && Number.isSafeInteger(value.timescale) && value.timescale > 0;
const compareTime = (left: Readonly<{ value: number; timescale: number }>, right: Readonly<{ value: number; timescale: number }>): number => { const difference = BigInt(left.value) * BigInt(right.timescale) - BigInt(right.value) * BigInt(left.timescale); return difference < 0n ? -1 : difference > 0n ? 1 : 0; };
const sameStrings = (values: readonly string[]): boolean => values.every((value) => typeof value === "string" && value.trim().length > 0) && new Set(values).size === values.length;

export function validateFeedbackDiagnosisV2(value: FeedbackDiagnosisV2): void {
  const refs = [value.base_execution_ref, value.authority_refs.approved_story_ref, ...value.authority_refs.decision_refs, ...value.authority_refs.evidence_refs, value.authority_refs.contract_ref, value.authority_refs.capability_snapshot_ref];
  if (value.schema_version !== 2 || value.object_version !== 1 || value.status !== "reviewed" || value.category !== "pacing" || !value.diagnosis_id.trim() || !value.feedback.text.trim() || value.feedback.digest !== editorialObjectDigest({ text: value.feedback.text }) || !refs.every(validRef) || !Number.isSafeInteger(value.base_timeline_ref.version) || value.base_timeline_ref.version < 1 || !/^[0-9a-f]{64}$/.test(value.base_timeline_ref.digest) || !value.target.track_id.trim() || !value.target.clip_id.trim() || value.target.operation !== "trim_semantic_range" || !sameStrings(value.affected_scope) || value.affected_scope.length !== 1 || value.affected_scope[0] !== `clip:${value.target.clip_id}` || !value.reason.trim() || !sameStrings(value.alternatives) || !Number.isFinite(value.confidence.score) || value.confidence.score < 0 || value.confidence.score > 1 || !sameStrings(value.confidence.basis) || !isStrictComparableDateTime(value.created_at)) throw new Error("FEEDBACK_DIAGNOSIS_INVALID");
  const original = value.target.original_source, proposed = value.target.proposed_source;
  if (original.asset_id !== proposed.asset_id || !/^asset:sha256:[0-9a-f]{64}$/.test(original.asset_id) || !validTime(original.start) || !validTime(original.end) || !validTime(proposed.start) || !validTime(proposed.end) || compareTime(original.start, original.end) >= 0 || compareTime(proposed.start, proposed.end) >= 0 || compareTime(proposed.start, original.start) < 0 || compareTime(proposed.end, original.end) > 0 || compareTime(proposed.start, original.start) === 0 && compareTime(proposed.end, original.end) === 0) throw new Error("FEEDBACK_TRIM_NOT_STRICT_INWARD");
  const fingerprintBase = { diagnosis_id: value.diagnosis_id, feedback: value.feedback, base_execution_ref: value.base_execution_ref, base_timeline_ref: value.base_timeline_ref, target: value.target, authority_refs: value.authority_refs, affected_scope: value.affected_scope, reason: value.reason, alternatives: value.alternatives, confidence: value.confidence, created_at: value.created_at, source_version: FEEDBACK_DIAGNOSIS_VERSION, policy_version: FEEDBACK_POLICY_VERSION };
  if (value.input_fingerprint !== editorialObjectDigest(fingerprintBase)) throw new Error("FEEDBACK_DIAGNOSIS_FINGERPRINT_REBOUND");
}

export function diagnoseFeedbackRevision(input: FeedbackRevisionDiagnosisInput): FeedbackDiagnosisV2 {
  if (!input.feedback_text.trim() || !input.diagnosis_id.trim() || !input.reason.trim() || !sameStrings(input.alternatives) || !sameStrings(input.confidence.basis) || !Number.isFinite(input.confidence.score) || !isStrictComparableDateTime(input.created_at)) throw new Error("FEEDBACK_DIAGNOSIS_INPUT_INVALID");
  const feedback = { text: input.feedback_text, digest: editorialObjectDigest({ text: input.feedback_text }) };
  const base = { diagnosis_id: input.diagnosis_id, feedback, base_execution_ref: input.base_execution_ref, base_timeline_ref: input.base_timeline_ref, target: { ...input.target, operation: "trim_semantic_range" as const }, authority_refs: input.authority_refs, affected_scope: [`clip:${input.target.clip_id}`], reason: input.reason, alternatives: [...input.alternatives], confidence: { score: input.confidence.score, basis: [...input.confidence.basis] }, created_at: input.created_at, source_version: FEEDBACK_DIAGNOSIS_VERSION, policy_version: FEEDBACK_POLICY_VERSION };
  const value: FeedbackDiagnosisV2 = { schema_version: 2, diagnosis_id: input.diagnosis_id, object_version: 1, status: "reviewed", category: "pacing", feedback, base_execution_ref: input.base_execution_ref, base_timeline_ref: input.base_timeline_ref, target: base.target, authority_refs: input.authority_refs, affected_scope: base.affected_scope, reason: input.reason, alternatives: base.alternatives, confidence: base.confidence, input_fingerprint: editorialObjectDigest(base), created_at: input.created_at, provenance: { producer: "project-host", source_version: FEEDBACK_DIAGNOSIS_VERSION, policy_version: FEEDBACK_POLICY_VERSION, input_refs: [`${input.base_execution_ref.object_id}@${input.base_execution_ref.object_version}`, `timeline@${input.base_timeline_ref.version}`] } };
  validateFeedbackDiagnosisV2(value);
  return value;
}

export function createFeedbackRevisionIntent(diagnosis: FeedbackDiagnosisV2, baseIntent: EditorialEditIntentV1, input: Readonly<{ intent_id: string; created_at: string }>): EditorialEditIntentV1 {
  validateFeedbackDiagnosisV2(diagnosis);
  if (!input.intent_id.trim() || !isStrictComparableDateTime(input.created_at)) throw new Error("FEEDBACK_REVISION_IDENTITY_INVALID");
  if (!exactRef(baseIntent.approved_story_ref, diagnosis.authority_refs.approved_story_ref)) throw new Error("FEEDBACK_REVISION_STORY_REBOUND");
  if (!exactRef(baseIntent.contract_ref, diagnosis.authority_refs.contract_ref)) throw new Error("FEEDBACK_REVISION_CONTRACT_REBOUND");
  if (!exactRef(baseIntent.capability_snapshot_ref, diagnosis.authority_refs.capability_snapshot_ref)) throw new Error("FEEDBACK_REVISION_CAPABILITY_REBOUND");
  if (baseIntent.decision_refs.length !== diagnosis.authority_refs.decision_refs.length || baseIntent.decision_refs.some((reference, index) => !exactRef(reference, diagnosis.authority_refs.decision_refs[index]!))) throw new Error("FEEDBACK_REVISION_DECISION_REBOUND");
  if (diagnosis.authority_refs.evidence_refs.some((reference) => !baseIntent.evidence_refs.some((candidate) => sameRefIdentity(candidate, reference)))) throw new Error("FEEDBACK_REVISION_EVIDENCE_REBOUND");
  const diagnosisRef = { object_id: diagnosis.diagnosis_id, object_version: diagnosis.object_version, digest: editorialObjectDigest(diagnosis) };
  const operation = { operation_id: `trim:${diagnosis.diagnosis_id}`, kind: "trim_semantic_range" as const, target_refs: [`clip:${diagnosis.target.clip_id}`], range: { start: diagnosis.target.proposed_source.start, end: diagnosis.target.proposed_source.end }, parameter_values: { boundary_strategy: "inward" }, expected_effect: diagnosis.reason, required_capabilities: ["semantic-trim"], unsupported_policy: "block" as const };
  const fingerprintBase = { intent_id: input.intent_id, diagnosis_ref: diagnosisRef, base_timeline_version: diagnosis.base_timeline_ref.version, operation, authority_refs: diagnosis.authority_refs, created_at: input.created_at };
  return { schema_version: 1, intent_id: input.intent_id, object_version: 1, status: "candidate", base_timeline_version: diagnosis.base_timeline_ref.version, approved_story_ref: diagnosis.authority_refs.approved_story_ref, decision_refs: [...diagnosis.authority_refs.decision_refs], evidence_refs: [...diagnosis.authority_refs.evidence_refs], contract_ref: diagnosis.authority_refs.contract_ref, capability_snapshot_ref: diagnosis.authority_refs.capability_snapshot_ref, feedback_diagnosis_ref: diagnosisRef, operations: [operation], preconditions: [`timeline@${diagnosis.base_timeline_ref.version}:${diagnosis.base_timeline_ref.digest}`, `execution@${diagnosis.base_execution_ref.object_id}:${diagnosis.base_execution_ref.digest}`], protected_refs: [...baseIntent.protected_refs], reason: diagnosis.reason, alternatives: [...diagnosis.alternatives], risks: ["feedback revision is limited to one strict inward source trim"], confidence: { ...diagnosis.confidence, basis: [...diagnosis.confidence.basis] }, actor: { actor_id: "project-host", actor_kind: "policy" }, input_fingerprint: editorialObjectDigest(fingerprintBase), created_at: input.created_at, provenance: { producer: "project-host", source_version: FEEDBACK_DIAGNOSIS_VERSION, policy_version: FEEDBACK_POLICY_VERSION, input_refs: [diagnosisRef.digest, diagnosis.base_execution_ref.digest, diagnosis.base_timeline_ref.digest] } };
}

export type { FeedbackDiagnosisV2 };
