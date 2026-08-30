import assert from "node:assert/strict";
import { createFeedbackRevisionIntent, diagnoseFeedbackRevision, validateFeedbackDiagnosisV2 } from "../../packages/features/feedback/src/public.js";
import { assertEditorialEditIntentV1, assertFeedbackDiagnosisV2 } from "../../packages/platform/contract-runtime/src/public.js";
import { editorialObjectDigest } from "../../packages/core/editorial-core/src/public.js";
import type { EditorialEditIntentV1 } from "../../contracts/generated/typescript/editorial/editorial-edit-intent.v1.js";

const fixed = (character: string) => character.repeat(64);
const authority = {
  approved_story_ref: { object_id: "plan-1", object_version: 1, digest: fixed("a") },
  decision_refs: [{ object_id: "decision-1", object_version: 1, digest: fixed("b") }],
  evidence_refs: [{ object_id: "evidence-1", object_version: 1, digest: fixed("c") }],
  contract_ref: { object_id: "contract-1", object_version: 2, digest: fixed("d") },
  capability_snapshot_ref: { object_id: "capability-1", object_version: 1, digest: fixed("e") },
};
const diagnosisInput = {
  diagnosis_id: "diagnosis-feedback-1",
  feedback_text: "把已接受的开场镜头从尾部收短一秒",
  base_execution_ref: { object_id: "execution-first-cut", object_version: 1, digest: fixed("f") },
  base_timeline_ref: { version: 1, digest: fixed("1") },
  target: {
    track_id: "v1", clip_id: "semantic:intent-first-cut:select-hook",
    original_source: { asset_id: `asset:sha256:${fixed("2")}`, start: { schema_version: 1 as const, value: 0, timescale: 30 }, end: { schema_version: 1 as const, value: 90, timescale: 30 } },
    proposed_source: { asset_id: `asset:sha256:${fixed("2")}`, start: { schema_version: 1 as const, value: 0, timescale: 30 }, end: { schema_version: 1 as const, value: 60, timescale: 30 } },
    trim_duration: { schema_version: 1 as const, value: 1, timescale: 1 },
  },
  authority_refs: authority,
  reason: "用户明确要求收紧一个现有镜头",
  alternatives: ["保留已接受版本"],
  confidence: { score: 1, basis: ["反馈目标和向内范围均唯一"] },
  created_at: "2026-08-24T04:00:00Z",
};
const diagnosis = diagnoseFeedbackRevision(diagnosisInput);
assertFeedbackDiagnosisV2(diagnosis); validateFeedbackDiagnosisV2(diagnosis);
assert.deepEqual(diagnoseFeedbackRevision(diagnosisInput), diagnosis, "identical input must diagnose deterministically");
assert.equal(diagnosis.feedback.digest, editorialObjectDigest({ text: diagnosisInput.feedback_text }));
assert.deepEqual(diagnosis.affected_scope, [`clip:${diagnosisInput.target.clip_id}`]);

const baseIntent: EditorialEditIntentV1 = { schema_version: 1, intent_id: "intent-first-cut", object_version: 1, status: "candidate", base_timeline_version: 0, approved_story_ref: authority.approved_story_ref, decision_refs: authority.decision_refs, evidence_refs: authority.evidence_refs, contract_ref: authority.contract_ref, capability_snapshot_ref: authority.capability_snapshot_ref, operations: [{ operation_id: "select-hook", kind: "select_evidence", target_refs: ["beat:hook", "evidence:evidence-1"], parameter_values: {}, expected_effect: "place hook", required_capabilities: ["semantic-evidence-selection"], unsupported_policy: "block" }], preconditions: ["timeline current"], protected_refs: [], reason: "first cut", alternatives: [], risks: [], confidence: { score: 1, basis: ["approved evidence"] }, actor: { actor_id: "project-host", actor_kind: "policy" }, input_fingerprint: fixed("3"), created_at: "2026-08-24T03:00:00Z", provenance: { producer: "project-host", source_version: "intent", policy_version: "intent", input_refs: [fixed("4")] } };
const intent = createFeedbackRevisionIntent(diagnosis, baseIntent, { intent_id: "intent-feedback-1", created_at: diagnosis.created_at });
assertEditorialEditIntentV1(intent);
assert.equal(intent.operations.length, 1); assert.equal(intent.operations[0]?.kind, "trim_semantic_range"); assert.deepEqual(intent.operations[0]?.trim_duration, diagnosisInput.target.trim_duration); assert.deepEqual(intent.operations[0]?.required_capabilities, ["semantic-trim"]); assert.equal(intent.feedback_diagnosis_ref?.digest, editorialObjectDigest(diagnosis));

assert.throws(() => diagnoseFeedbackRevision({ ...diagnosisInput, feedback_text: "" }), /FEEDBACK_DIAGNOSIS_INPUT_INVALID/);
assert.throws(() => diagnoseFeedbackRevision({ ...diagnosisInput, target: { ...diagnosisInput.target, proposed_source: { ...diagnosisInput.target.proposed_source, end: { schema_version: 1 as const, value: 120, timescale: 30 } } } }), /FEEDBACK_TRIM_NOT_STRICT_INWARD/);
assert.throws(() => createFeedbackRevisionIntent(diagnosis, { ...baseIntent, contract_ref: { ...baseIntent.contract_ref, digest: fixed("9") } }, { intent_id: "rebound", created_at: diagnosis.created_at }), /FEEDBACK_REVISION_CONTRACT_REBOUND/);

console.log("Current Feedback Diagnosis determinism and strict inward trim checks passed");
