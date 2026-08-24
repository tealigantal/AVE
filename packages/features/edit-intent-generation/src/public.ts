import type { RationalTime } from "../../../../contracts/generated/typescript/common/rational-time.v1.js";
import type { ApprovedStoryPlanV2 } from "../../../../contracts/generated/typescript/editorial/approved-story-plan.v2.js";
import type { DecisionRecordV1 } from "../../../../contracts/generated/typescript/editorial/decision-record.v1.js";
import type { EditorialEditIntentV1 } from "../../../../contracts/generated/typescript/editorial/editorial-edit-intent.v1.js";
import { editorialObjectDigest, isStrictComparableDateTime, type VersionedObjectRef } from "../../../core/editorial-core/src/public.js";

export const featureId = "edit-intent-generation" as const;
export const EDITORIAL_INTENT_GENERATOR_VERSION = "edit-intent-generator-v1";
export const EDITORIAL_INTENT_POLICY_VERSION = "story-policy-v1";
const EXECUTION_PARAMETER_KEYS = new Set(["command", "commands", "backend", "shell", "ffmpeg", "render_graph", "rendergraph", "execution_plan", "commit_plan", "script", "argv"]);
const OPERATION_CAPABILITIES: Readonly<Record<EditorialIntentOperation["kind"], readonly string[]>> = {
  select_evidence: ["semantic-evidence-selection"],
  set_pacing: ["semantic-pacing"],
  trim_semantic_range: ["semantic-trim"],
  reorder_story_beat: ["semantic-reorder"],
  place_title: ["semantic-title-placement"],
  set_audio_emphasis: ["semantic-audio-emphasis"],
};
const OPERATION_PARAMETER_KEYS: Readonly<Record<EditorialIntentOperation["kind"], ReadonlySet<string>>> = {
  select_evidence: new Set(["priority", "preserve_audio"]),
  set_pacing: new Set(["pacing"]),
  trim_semantic_range: new Set(["boundary_strategy"]),
  reorder_story_beat: new Set(["placement"]),
  place_title: new Set(["text", "style"]),
  set_audio_emphasis: new Set(["emphasis", "gain_db"]),
};
export type { EditorialEditIntentV1 };
export type EditorialIntentOperation = EditorialEditIntentV1["operations"][number];
export type EditorialEditIntentInput = Readonly<{
  intent_id: string; base_timeline_version: number; approved_story_ref: VersionedObjectRef; decision_refs: readonly VersionedObjectRef[];
  contract_ref: VersionedObjectRef; capability_snapshot_ref: VersionedObjectRef; available_capabilities: ReadonlySet<string>;
  operations: readonly EditorialIntentOperation[]; preconditions: readonly string[]; protected_refs: readonly string[]; reason: string;
  alternatives: readonly string[]; risks: readonly string[]; confidence: Readonly<{ score: number; basis: readonly string[] }>;
  actor: Readonly<{ actor_id: string; actor_kind: "user" | "policy" | "model" }>; created_at: string;
}>;

const unique = (values: readonly string[]): string[] => [...new Set(values)].sort();
const exactRef = (left: VersionedObjectRef, right: VersionedObjectRef): boolean => left.object_id === right.object_id && left.object_version === right.object_version && left.digest === right.digest;
function validateRef(value: VersionedObjectRef, label: string): void { if (!value?.object_id || !Number.isSafeInteger(value.object_version) || value.object_version < 1 || !/^[0-9a-f]{64}$/.test(value.digest)) throw new Error(`${label} reference is invalid`); }
function compareTime(left: RationalTime, right: RationalTime): number {
  if (!Number.isSafeInteger(left.value) || !Number.isSafeInteger(left.timescale) || left.value < 0 || left.timescale < 1 || !Number.isSafeInteger(right.value) || !Number.isSafeInteger(right.timescale) || right.value < 0 || right.timescale < 1) throw new Error("editorial intent range is invalid");
  const difference = BigInt(left.value) * BigInt(right.timescale) - BigInt(right.value) * BigInt(left.timescale);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

export function generateEditorialEditIntent(plan: ApprovedStoryPlanV2, decisions: readonly DecisionRecordV1[], input: EditorialEditIntentInput): EditorialEditIntentV1 {
  if (plan.status !== "approved" || plan.plan_id !== input.approved_story_ref.object_id || plan.object_version !== input.approved_story_ref.object_version || editorialObjectDigest(plan) !== input.approved_story_ref.digest) throw new Error("editorial intent Story Plan is stale or rebound");
  if (!exactRef(plan.contract_ref, input.contract_ref)) throw new Error("editorial intent Contract is rebound");
  validateRef(input.capability_snapshot_ref, "capability snapshot");
  if (!input.intent_id.trim() || !Number.isSafeInteger(input.base_timeline_version) || input.base_timeline_version < 0 || input.operations.length === 0 || input.preconditions.length === 0 || !input.reason.trim() || !input.actor.actor_id.trim() || input.confidence.basis.length === 0 || !isStrictComparableDateTime(input.created_at)) throw new Error("editorial intent input is invalid");
  if (input.decision_refs.length === 0 || input.decision_refs.length !== decisions.length) throw new Error("editorial intent decisions are incomplete");
  input.decision_refs.forEach((reference, index) => { const decision = decisions[index]; validateRef(reference, "decision"); if (!decision || decision.decision_id !== reference.object_id || decision.object_version !== reference.object_version || editorialObjectDigest(decision) !== reference.digest || !["approved", "overridden"].includes(decision.status)) throw new Error("editorial intent decision is stale or rebound"); });
  if (!input.decision_refs.some((reference) => exactRef(reference, plan.decision_ref))) throw new Error("editorial intent omits the Story Plan approval decision");
  if (decisions.some((decision) => !exactRef(decision.subject_ref, plan.contract_ref) || !decision.selected_refs.some((reference) => exactRef(reference, plan.proposal_ref) || exactRef(reference, plan.direction_ref)))) throw new Error("editorial intent decision is unrelated to the approved Story Plan");
  const validTargets = new Set<string>(plan.beats.flatMap((beat) => [`beat:${beat.beat_id}`, ...beat.evidence_refs.map((reference) => `evidence:${reference.object_id}`)]));
  const operationIds = new Set<string>();
  let hasProposalOnlyGap = false;
  const normalizedOperations: EditorialIntentOperation[] = [];
  for (const operation of input.operations) {
    if (!operation.operation_id.trim() || operationIds.has(operation.operation_id) || operation.target_refs.length === 0 || operation.target_refs.some((reference) => !validTargets.has(reference)) || operation.target_refs.some((reference) => input.protected_refs.includes(reference)) || !operation.expected_effect.trim()) throw new Error("editorial intent operation is invalid or targets a protected reference");
    operationIds.add(operation.operation_id);
    if (operation.range && compareTime(operation.range.start, operation.range.end) >= 0) throw new Error("editorial intent range must have positive duration");
    const requiredCapabilities = OPERATION_CAPABILITIES[operation.kind];
    const unsupported = requiredCapabilities.filter((capability) => !input.available_capabilities.has(capability));
    if (unsupported.length && operation.unsupported_policy === "block") throw new Error(`editorial intent capability is unavailable: ${unsupported.join(",")}`);
    if (unsupported.length) hasProposalOnlyGap = true;
    if (Object.keys(operation.parameter_values).some((key) => EXECUTION_PARAMETER_KEYS.has(key) || !OPERATION_PARAMETER_KEYS[operation.kind].has(key))) throw new Error("editorial intent parameters contain execution authority or an unregistered parameter");
    for (const value of Object.values(operation.parameter_values)) if (!["string", "number", "boolean"].includes(typeof value) || typeof value === "number" && !Number.isFinite(value)) throw new Error("editorial intent parameters must be finite scalar values");
    normalizedOperations.push({ ...operation, target_refs: unique(operation.target_refs), parameter_values: { ...operation.parameter_values }, required_capabilities: [...requiredCapabilities] });
  }
  const evidenceRefs = [...new Map(plan.beats.flatMap((beat) => beat.evidence_refs).map((reference) => [reference.object_id, reference])).values()];
  const normalizedInput = { intent_id: input.intent_id, base_timeline_version: input.base_timeline_version, approved_story_ref: input.approved_story_ref, decision_refs: input.decision_refs, contract_ref: input.contract_ref, capability_snapshot_ref: input.capability_snapshot_ref, available_capabilities: [...input.available_capabilities].sort(), operations: normalizedOperations, preconditions: unique(input.preconditions), protected_refs: unique(input.protected_refs), reason: input.reason, alternatives: unique(input.alternatives), risks: unique(input.risks), confidence: { score: Math.max(0, Math.min(1, input.confidence.score)), basis: unique(input.confidence.basis) }, actor: input.actor, created_at: input.created_at, generator_version: EDITORIAL_INTENT_GENERATOR_VERSION, policy_version: EDITORIAL_INTENT_POLICY_VERSION };
  const fingerprint = editorialObjectDigest(normalizedInput);
  return { schema_version: 1, intent_id: input.intent_id, object_version: 1, status: "candidate", base_timeline_version: input.base_timeline_version, approved_story_ref: input.approved_story_ref, decision_refs: [...input.decision_refs], evidence_refs: evidenceRefs, contract_ref: input.contract_ref, capability_snapshot_ref: input.capability_snapshot_ref, operations: normalizedOperations, preconditions: normalizedInput.preconditions, protected_refs: normalizedInput.protected_refs, reason: input.reason, alternatives: normalizedInput.alternatives, risks: unique([...input.risks, ...(hasProposalOnlyGap ? ["one or more operations are proposal-only under the current capability snapshot"] : [])]), confidence: normalizedInput.confidence, actor: { ...input.actor }, input_fingerprint: fingerprint, created_at: input.created_at, provenance: { producer: "project-host", source_version: EDITORIAL_INTENT_GENERATOR_VERSION, policy_version: EDITORIAL_INTENT_POLICY_VERSION, input_refs: [input.approved_story_ref.digest, ...input.decision_refs.map((reference) => reference.digest), input.contract_ref.digest, input.capability_snapshot_ref.digest, `timeline@${input.base_timeline_version}`] } };
}
