import { createHash } from "node:crypto";
import type { RationalTime } from "../../../../../../contracts/generated/typescript/common/rational-time.v1.js";
import type { ApprovedStoryPlanV2 } from "../../../../../../contracts/generated/typescript/editorial/approved-story-plan.v2.js";
import type { DecisionRecordV1 } from "../../../../../../contracts/generated/typescript/editorial/decision-record.v1.js";
import type { DirectionCardV1 } from "../../../../../../contracts/generated/typescript/editorial/direction-card.v1.js";
import type { DurationFeasibilityV1 } from "../../../../../../contracts/generated/typescript/editorial/duration-feasibility.v1.js";
import type { SkillEvaluationV1 } from "../../../../../../contracts/generated/typescript/editorial/skill-evaluation.v1.js";
import type { StoryProposalV2 } from "../../../../../../contracts/generated/typescript/editorial/story-proposal.v2.js";
import type { CoverageMatrix, CreativeContractV2, MaterialEvidencePackV1, VersionedObjectRef } from "../../public.js";
import { isStrictComparableDateTime } from "../date-time.js";

export type { ApprovedStoryPlanV2, DecisionRecordV1, DirectionCardV1, StoryProposalV2 };
export const STORY_EVALUATOR_VERSION = "story-evaluator-v2";
export const STORY_POLICY_VERSION = "story-policy-v1";
export const STORY_APPROVAL_VERSION = "story-approval-v2";

const canonicalValue = (value: unknown): unknown => Array.isArray(value) ? value.map(canonicalValue) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value as Record<string, unknown>).filter((key) => (value as Record<string, unknown>)[key] !== undefined).sort().map((key) => [key, canonicalValue((value as Record<string, unknown>)[key])])) : value;
export const canonicalEditorialObject = (value: unknown): string => JSON.stringify(canonicalValue(value));
export const editorialObjectDigest = (value: unknown): string => createHash("sha256").update(canonicalEditorialObject(value)).digest("hex");
const exactRef = (left: VersionedObjectRef, right: VersionedObjectRef): boolean => left.object_id === right.object_id && left.object_version === right.object_version && left.digest === right.digest;
const unique = (values: readonly string[]): string[] => [...new Set(values)].sort();
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const round = (value: number): number => Math.round(value * 1_000_000) / 1_000_000;
const fraction = (value: RationalTime, label: string): readonly [bigint, bigint] => {
  if (!Number.isSafeInteger(value.value) || !Number.isSafeInteger(value.timescale) || value.value < 0 || value.timescale < 1) throw new Error(`${label} RationalTime is invalid`);
  return [BigInt(value.value), BigInt(value.timescale)];
};
const addFraction = (left: readonly [bigint, bigint], right: readonly [bigint, bigint]): readonly [bigint, bigint] => [left[0] * right[1] + right[0] * left[1], left[1] * right[1]];
const sumTime = (values: readonly RationalTime[]): readonly [bigint, bigint] => values.reduce<readonly [bigint, bigint]>((sum, value) => addFraction(sum, fraction(value, "story duration")), [0n, 1n]);
const equalFraction = (left: readonly [bigint, bigint], right: readonly [bigint, bigint]): boolean => left[0] * right[1] === right[0] * left[1];

function requireRef(value: VersionedObjectRef, label: string): void {
  if (!value?.object_id || !Number.isSafeInteger(value.object_version) || value.object_version < 1 || !/^[0-9a-f]{64}$/.test(value.digest)) throw new Error(`${label} reference is invalid`);
}
function validateCurrentContext(contract: CreativeContractV2, pack: MaterialEvidencePackV1, duration: DurationFeasibilityV1, contractRef: VersionedObjectRef, packRef: VersionedObjectRef, durationRef: VersionedObjectRef): void {
  requireRef(contractRef, "Contract"); requireRef(packRef, "Material Evidence Pack"); requireRef(durationRef, "duration feasibility");
  if (contract.status !== "approved" || contract.contract_id !== contractRef.object_id || contract.object_version !== contractRef.object_version || editorialObjectDigest(contract) !== contractRef.digest) throw new Error("story Contract is stale or rebound");
  if (pack.status !== "sufficient" || pack.pack_id !== packRef.object_id || pack.object_version !== packRef.object_version || editorialObjectDigest(pack) !== packRef.digest || pack.project_id !== contract.project_id || !exactRef(pack.contract_ref, contractRef)) throw new Error("story Material Evidence Pack is stale or rebound");
  if (pack.policy_snapshot.policy_version !== "knowledge-v1" || !exactRef(pack.policy_snapshot.privacy_policy_ref, contract.privacy_policy_ref) || !exactRef(pack.policy_snapshot.rights_policy_ref, contract.rights_policy_ref)) throw new Error("story policy snapshot is stale or rebound");
  if (duration.result !== "feasible" || duration.feasibility_id !== durationRef.object_id || duration.object_version !== durationRef.object_version || editorialObjectDigest(duration) !== durationRef.digest || !exactRef(duration.contract_ref, contractRef) || !exactRef(duration.material_pack_ref, packRef) || duration.provenance.policy_version !== "duration-policy-v1") throw new Error("story duration feasibility is stale or rebound");
}

export type DirectionCardInput = Readonly<{
  direction_id: string; title: string; thesis: string; contract_ref: VersionedObjectRef; material_pack_ref: VersionedObjectRef;
  skill_evaluation_refs: readonly VersionedObjectRef[]; duration_feasibility_ref: VersionedObjectRef; expected_benefits: readonly string[];
  risks: readonly string[]; alternatives: readonly VersionedObjectRef[]; confidence: Readonly<{ score: number; basis: readonly string[] }>; created_at: string;
}>;
export function createDirectionCard(input: DirectionCardInput, contract: CreativeContractV2, pack: MaterialEvidencePackV1, evaluations: readonly SkillEvaluationV1[], duration: DurationFeasibilityV1): DirectionCardV1 {
  if (!input.direction_id.trim() || !input.title.trim() || !input.thesis.trim() || input.expected_benefits.length === 0 || input.expected_benefits.some((value) => !value.trim()) || input.confidence.basis.length === 0 || !isStrictComparableDateTime(input.created_at)) throw new Error("direction card input is invalid");
  validateCurrentContext(contract, pack, duration, input.contract_ref, input.material_pack_ref, input.duration_feasibility_ref);
  if (input.skill_evaluation_refs.length === 0 || input.skill_evaluation_refs.length !== evaluations.length) throw new Error("direction skill evaluations are incomplete");
  input.skill_evaluation_refs.forEach((reference, index) => { const evaluation = evaluations[index]; requireRef(reference, "skill evaluation"); if (!evaluation || evaluation.evaluation_id !== reference.object_id || evaluation.object_version !== reference.object_version || editorialObjectDigest(evaluation) !== reference.digest || evaluation.result !== "applicable" || !exactRef(evaluation.contract_ref, input.contract_ref) || !exactRef(evaluation.material_pack_ref, input.material_pack_ref)) throw new Error("direction skill evaluation is stale or rebound"); });
  const fingerprint = editorialObjectDigest({ ...input, evaluator_version: STORY_EVALUATOR_VERSION, policy_version: STORY_POLICY_VERSION });
  return { schema_version: 1, direction_id: input.direction_id, object_version: 1, status: "candidate", title: input.title, thesis: input.thesis, contract_ref: input.contract_ref, material_pack_ref: input.material_pack_ref, skill_evaluation_refs: [...input.skill_evaluation_refs], duration_feasibility_ref: input.duration_feasibility_ref, expected_benefits: unique(input.expected_benefits), risks: unique(input.risks), alternatives: [...input.alternatives], confidence: { score: clamp(input.confidence.score), basis: unique(input.confidence.basis) }, input_fingerprint: fingerprint, created_at: input.created_at, provenance: { producer: "project-host", source_version: STORY_EVALUATOR_VERSION, policy_version: STORY_POLICY_VERSION, input_refs: [input.contract_ref.digest, input.material_pack_ref.digest, ...input.skill_evaluation_refs.map((ref) => ref.digest), input.duration_feasibility_ref.digest] } };
}

export type DirectionSelectionInput = Readonly<{ decision_id: string; selected_direction_id: string; actor_id: string; actor_kind: "user" | "policy"; reason: string; selected_at: string; review_digest: string }>;
export function selectDirectionCard(candidates: readonly DirectionCardV1[], input: DirectionSelectionInput, contract: CreativeContractV2): Readonly<{ decision: DecisionRecordV1; direction: DirectionCardV1 }> {
  if (candidates.length < 2) throw new Error("direction selection requires comparable candidates");
  const selected = candidates.find((candidate) => candidate.direction_id === input.selected_direction_id);
  if (!selected || candidates.some((candidate) => candidate.status !== "candidate") || !input.decision_id.trim() || !input.actor_id.trim() || !input.reason.trim() || !isStrictComparableDateTime(input.selected_at)) throw new Error("direction selection input is invalid");
  if (input.actor_kind !== "user" || contract.approval_policy.mode !== "explicit_user" || contract.status !== "approved" || contract.contract_id !== selected.contract_ref.object_id || contract.object_version !== selected.contract_ref.object_version || editorialObjectDigest(contract) !== selected.contract_ref.digest || contract.approval_policy.actor_kind !== input.actor_kind) throw new Error("direction selection actor or Contract authority is invalid");
  const context = canonicalEditorialObject({ contract_ref: selected.contract_ref, material_pack_ref: selected.material_pack_ref, skill_evaluation_refs: selected.skill_evaluation_refs, duration_feasibility_ref: selected.duration_feasibility_ref });
  if (candidates.some((candidate) => canonicalEditorialObject({ contract_ref: candidate.contract_ref, material_pack_ref: candidate.material_pack_ref, skill_evaluation_refs: candidate.skill_evaluation_refs, duration_feasibility_ref: candidate.duration_feasibility_ref }) !== context)) throw new Error("direction candidates are not comparable");
  const refs = candidates.map((candidate) => ({ object_id: candidate.direction_id, object_version: candidate.object_version, digest: editorialObjectDigest(candidate) })), selectedRef = refs.find((reference) => reference.object_id === selected.direction_id)!;
  if (input.review_digest !== selectedRef.digest) throw new Error("direction selection review digest mismatch");
  const decision: DecisionRecordV1 = { schema_version: 1, decision_id: input.decision_id, object_version: 1, decision_type: "direction_selection", subject_ref: selected.contract_ref, candidate_refs: refs, selected_refs: [selectedRef], rejected_refs: refs.filter((reference) => reference.object_id !== selected.direction_id), evidence_refs: [selected.material_pack_ref, selected.duration_feasibility_ref], constraints: ["candidates share one exact Creative Context"], reason: input.reason, confidence: selected.confidence, authority: { evaluator_version: STORY_EVALUATOR_VERSION, policy_version: STORY_POLICY_VERSION }, actor: { actor_id: input.actor_id, actor_kind: input.actor_kind }, status: "approved", created_at: input.selected_at, decided_at: input.selected_at };
  const decisionRef = { object_id: decision.decision_id, object_version: 1, digest: editorialObjectDigest(decision) };
  const direction: DirectionCardV1 = { ...selected, object_version: selected.object_version + 1, status: "selected", alternatives: refs.filter((reference) => reference.object_id !== selected.direction_id), selection_decision_ref: decisionRef, input_fingerprint: editorialObjectDigest({ candidate_ref: selectedRef, decision_ref: decisionRef, evaluator_version: STORY_EVALUATOR_VERSION, policy_version: STORY_POLICY_VERSION }), created_at: input.selected_at, provenance: { ...selected.provenance, input_refs: [...selected.provenance.input_refs, selectedRef.digest, decisionRef.digest] } };
  return { decision, direction };
}

export type StoryBeatCandidate = StoryProposalV2["beats"][number];
export type StoryProposalInput = Readonly<{
  proposal_id: string; direction_ref: VersionedObjectRef; contract_ref: VersionedObjectRef; material_pack_ref: VersionedObjectRef;
  skill_evaluation_refs: readonly VersionedObjectRef[]; duration_feasibility_ref: VersionedObjectRef; thesis: string; audience_promise: string;
  beats: readonly StoryBeatCandidate[]; risks: readonly string[]; alternatives: readonly VersionedObjectRef[]; created_at: string;
}>;
function validateCurve(curve: readonly DurationFeasibilityV1["emotional_curve"][number][]): void {
  if (curve.length < 2 || curve[0]?.position !== 0 || curve.at(-1)?.position !== 1 || curve.some((point, index) => !point.phase || point.intensity < 0 || point.intensity > 1 || point.position < 0 || point.position > 1 || index > 0 && point.position <= curve[index - 1]!.position)) throw new Error("story emotional curve is invalid");
}
export function evaluateStoryProposal(input: StoryProposalInput, direction: DirectionCardV1, contract: CreativeContractV2, pack: MaterialEvidencePackV1, coverage: CoverageMatrix, evaluations: readonly SkillEvaluationV1[], duration: DurationFeasibilityV1): StoryProposalV2 {
  if (!input.proposal_id.trim() || !input.thesis.trim() || !input.audience_promise.trim() || input.beats.length === 0 || !isStrictComparableDateTime(input.created_at)) throw new Error("story proposal input is invalid");
  validateCurrentContext(contract, pack, duration, input.contract_ref, input.material_pack_ref, input.duration_feasibility_ref);
  if (coverage.matrix_id !== pack.coverage_matrix_ref.object_id || pack.coverage_matrix_ref.object_version !== 1 || editorialObjectDigest(coverage) !== pack.coverage_matrix_ref.digest) throw new Error("story coverage matrix is stale or rebound");
  if (direction.status !== "selected" || direction.direction_id !== input.direction_ref.object_id || direction.object_version !== input.direction_ref.object_version || editorialObjectDigest(direction) !== input.direction_ref.digest || !exactRef(direction.contract_ref, input.contract_ref) || !exactRef(direction.material_pack_ref, input.material_pack_ref) || !exactRef(direction.duration_feasibility_ref, input.duration_feasibility_ref)) throw new Error("story direction is stale or rebound");
  if (input.skill_evaluation_refs.length !== evaluations.length || input.skill_evaluation_refs.some((reference, index) => !exactRef(reference, direction.skill_evaluation_refs[index]!) || evaluations[index]?.evaluation_id !== reference.object_id || editorialObjectDigest(evaluations[index]) !== reference.digest)) throw new Error("story skill evaluation is stale or rebound");
  validateCurve(duration.emotional_curve);
  const availableEvidence = new Map(pack.evidence_refs.map((evidence) => [evidence.evidence_id, evidence]));
  const coverageRows = new Map(coverage.rows.map((row) => [row.requirement_id, row]));
  const beatIds = new Set<string>();
  for (const beat of input.beats) {
    if (!beat.beat_id.trim() || beatIds.has(beat.beat_id) || !beat.role.trim() || !beat.purpose.trim() || !beat.entry_state.trim() || !beat.exit_state.trim() || !beat.desired_emotion.trim() || !beat.reason.trim() || beat.evidence_refs.length === 0 || beat.confidence.basis.length === 0) throw new Error("story beat is invalid");
    beatIds.add(beat.beat_id); fraction(beat.target_duration, "story beat duration");
    for (const reference of [...beat.evidence_refs, ...beat.alternative_evidence_refs]) { const evidence = availableEvidence.get(reference.object_id); if (!evidence || evidence.evidence_version !== reference.object_version || evidence.content_digest !== reference.digest) throw new Error("story evidence is unavailable or rebound"); }
    for (const requirementId of beat.coverage_requirement_ids) { const row = coverageRows.get(requirementId), beatEvidence = new Set(beat.evidence_refs.map((reference) => reference.object_id)); if (!row || row.status !== "covered" || !row.evidence_ids.some((evidenceId) => beatEvidence.has(evidenceId))) throw new Error("story beat evidence does not cover its claimed requirement"); }
  }
  const requiredCoverage = contract.requirements.filter((requirement) => requirement.kind === "hard").map((requirement) => requirement.requirement_id);
  const proposedCoverage = unique(input.beats.flatMap((beat) => beat.coverage_requirement_ids));
  const coveredHard = requiredCoverage.filter((id) => proposedCoverage.includes(id)).length;
  const coverageScore = requiredCoverage.length ? coveredHard / requiredCoverage.length : 1;
  const packCoverage = new Set(pack.sufficiency.covered_requirement_ids);
  if (coverageScore !== 1 || proposedCoverage.some((requirementId) => !packCoverage.has(requirementId))) throw new Error("story hard coverage is incomplete or rebound");
  const target = fraction(duration.target_duration, "story target duration"), planned = sumTime(input.beats.map((beat) => beat.target_duration));
  if (!equalFraction(target, planned)) throw new Error("story duration must exactly match the feasible target");
  const durationScore = 1;
  const continuityScore = input.beats.length < 2 ? 1 : input.beats.slice(1).reduce((score, beat, index) => score + (input.beats[index]!.exit_state === beat.entry_state ? 1 : beat.continuity_constraints.length > 0 ? 0.75 : 0.4), 0) / (input.beats.length - 1);
  const evidenceScore = input.beats.reduce((sum, beat) => sum + clamp(beat.confidence.score), 0) / input.beats.length;
  const dimensions = { evidence_coverage: round(coverageScore), duration_fit: round(durationScore), continuity: round(continuityScore), evidence_confidence: round(evidenceScore) };
  const total = round(dimensions.evidence_coverage * 0.35 + dimensions.duration_fit * 0.25 + dimensions.continuity * 0.2 + dimensions.evidence_confidence * 0.2);
  const fingerprint = editorialObjectDigest({ ...input, evaluator_version: STORY_EVALUATOR_VERSION, policy_version: STORY_POLICY_VERSION });
  return { schema_version: 2, proposal_id: input.proposal_id, object_version: 1, status: "candidate", direction_ref: input.direction_ref, contract_ref: input.contract_ref, material_pack_ref: input.material_pack_ref, skill_evaluation_refs: [...input.skill_evaluation_refs], duration_feasibility_ref: input.duration_feasibility_ref, thesis: input.thesis, audience_promise: input.audience_promise, beats: input.beats.map((beat) => ({ ...beat, evidence_refs: [...beat.evidence_refs], alternative_evidence_refs: [...beat.alternative_evidence_refs], coverage_requirement_ids: unique(beat.coverage_requirement_ids), continuity_constraints: unique(beat.continuity_constraints), confidence: { score: clamp(beat.confidence.score), basis: unique(beat.confidence.basis) }, risks: unique(beat.risks), unresolved_assumptions: unique(beat.unresolved_assumptions) })), duration_budget: duration.target_duration, emotional_curve: duration.emotional_curve.map((point) => ({ ...point })), coverage_requirement_ids: proposedCoverage, risks: unique(input.risks), alternatives: [...input.alternatives], evaluation: { total_score: total, dimensions, confidence: { score: round((evidenceScore + coverageScore) / 2), basis: ["deterministic evidence coverage, duration fit, continuity and evidence confidence"] } }, input_fingerprint: fingerprint, created_at: input.created_at, provenance: { producer: "project-host", source_version: STORY_EVALUATOR_VERSION, policy_version: STORY_POLICY_VERSION, input_refs: [input.direction_ref.digest, input.contract_ref.digest, input.material_pack_ref.digest, ...input.skill_evaluation_refs.map((ref) => ref.digest), input.duration_feasibility_ref.digest] } };
}

export const rankStoryProposals = (proposals: readonly StoryProposalV2[]): readonly StoryProposalV2[] => [...proposals].sort((left, right) => right.evaluation.total_score - left.evaluation.total_score || left.proposal_id.localeCompare(right.proposal_id));
export type StoryApprovalInput = Readonly<{ decision_id: string; plan_id: string; selected_proposal_id: string; actor_id: string; actor_kind: "user" | "policy"; reason: string; approved_at: string; review_digest: string }>;
export function approveStoryProposalV2(proposals: readonly StoryProposalV2[], input: StoryApprovalInput, contract: CreativeContractV2): Readonly<{ decision: DecisionRecordV1; plan: ApprovedStoryPlanV2 }> {
  if (proposals.length < 2) throw new Error("story approval requires comparable proposals");
  const ranked = rankStoryProposals(proposals), selected = proposals.find((proposal) => proposal.proposal_id === input.selected_proposal_id);
  if (!selected || selected.status !== "candidate" || !input.decision_id.trim() || !input.plan_id.trim() || !input.actor_id.trim() || !input.reason.trim() || !/^[0-9a-f]{64}$/.test(input.review_digest) || !isStrictComparableDateTime(input.approved_at)) throw new Error("story approval input is invalid");
  const contextKey = canonicalEditorialObject({ direction_ref: selected.direction_ref, contract_ref: selected.contract_ref, material_pack_ref: selected.material_pack_ref, duration_feasibility_ref: selected.duration_feasibility_ref });
  if (proposals.some((proposal) => canonicalEditorialObject({ direction_ref: proposal.direction_ref, contract_ref: proposal.contract_ref, material_pack_ref: proposal.material_pack_ref, duration_feasibility_ref: proposal.duration_feasibility_ref }) !== contextKey)) throw new Error("story candidates are not comparable");
  const refs = proposals.map((proposal) => ({ object_id: proposal.proposal_id, object_version: proposal.object_version, digest: editorialObjectDigest(proposal) }));
  const selectedRef = refs.find((reference) => reference.object_id === selected.proposal_id)!;
  if (input.review_digest !== selectedRef.digest) throw new Error("story approval review digest mismatch");
  if (input.actor_kind !== "user" || contract.approval_policy.mode !== "explicit_user" || contract.status !== "approved" || contract.contract_id !== selected.contract_ref.object_id || contract.object_version !== selected.contract_ref.object_version || editorialObjectDigest(contract) !== selected.contract_ref.digest || contract.approval_policy.actor_kind !== input.actor_kind) throw new Error("story approval actor or Contract authority is invalid");
  if (selected.evaluation.dimensions.evidence_coverage !== 1 || selected.evaluation.dimensions.duration_fit !== 1 || selected.beats.some((beat) => beat.unresolved_assumptions.length > 0) || !equalFraction(sumTime(selected.beats.map((beat) => beat.target_duration)), fraction(selected.duration_budget, "story duration budget"))) throw new Error("story candidate fails approval hard gates");
  const isOverride = ranked[0]?.proposal_id !== selected.proposal_id;
  const decision: DecisionRecordV1 = { schema_version: 1, decision_id: input.decision_id, object_version: 1, decision_type: isOverride ? "override" : "story_approval", subject_ref: selected.contract_ref, candidate_refs: refs, selected_refs: [selectedRef], rejected_refs: refs.filter((reference) => reference.object_id !== selected.proposal_id), evidence_refs: [selected.material_pack_ref, selected.duration_feasibility_ref], constraints: ["candidates share exact Direction, Contract, Material Evidence Pack and Duration Feasibility references"], reason: input.reason, confidence: { score: selected.evaluation.total_score, basis: [isOverride ? "explicit actor override of deterministic ranking" : "selected highest-scoring comparable story candidate"] }, authority: { evaluator_version: STORY_EVALUATOR_VERSION, policy_version: STORY_POLICY_VERSION }, actor: { actor_id: input.actor_id, actor_kind: input.actor_kind }, status: isOverride ? "overridden" : "approved", created_at: input.approved_at, decided_at: input.approved_at };
  const decisionRef = { object_id: decision.decision_id, object_version: 1, digest: editorialObjectDigest(decision) };
  const plan: ApprovedStoryPlanV2 = { schema_version: 2, plan_id: input.plan_id, object_version: 1, status: "approved", proposal_ref: selectedRef, direction_ref: selected.direction_ref, contract_ref: selected.contract_ref, material_pack_ref: selected.material_pack_ref, duration_feasibility_ref: selected.duration_feasibility_ref, thesis: selected.thesis, audience_promise: selected.audience_promise, beats: selected.beats.map((beat) => ({ beat_id: beat.beat_id, role: beat.role, purpose: beat.purpose, target_duration: beat.target_duration, evidence_refs: [...beat.evidence_refs], coverage_requirement_ids: [...beat.coverage_requirement_ids], entry_state: beat.entry_state, exit_state: beat.exit_state, desired_emotion: beat.desired_emotion })), duration_budget: selected.duration_budget, emotional_curve: selected.emotional_curve.map((point) => ({ ...point })), decision_ref: decisionRef, approval: { actor_id: input.actor_id, actor_kind: input.actor_kind, approved_at: input.approved_at, review_digest: input.review_digest }, created_at: input.approved_at, provenance: { producer: "project-host", source_version: STORY_APPROVAL_VERSION, policy_version: STORY_POLICY_VERSION, input_refs: [selectedRef.digest, decisionRef.digest] } };
  return { decision, plan };
}
