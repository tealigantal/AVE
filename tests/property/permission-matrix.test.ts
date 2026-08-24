import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { assertStage2PermissionDecisionV1, assertStage2PermissionPolicySnapshotV1, assertStage2PermissionRequestV1 } from "../../packages/platform/contract-runtime/src/public.js";
import { editorialObjectDigest } from "../../packages/core/editorial-core/src/public.js";
import { STAGE2_PERMISSION_ROWS, createBuiltInStage2PermissionPolicySnapshot, createStage2PermissionDecision, evaluateStage2Permission, permissionRefKey, permissionRequestFingerprint, stage2PermissionEffectDigest, type Stage2PermissionActorKind, type Stage2PermissionRequestV1, type Stage2PermissionRow, type Stage2PermissionTypedRef } from "../../packages/features/permission-enforcement/src/public.js";

const actors: readonly Stage2PermissionActorKind[] = ["renderer_ui", "model_gateway", "worker_host", "feature_core", "project_host", "human_user"];
const digest = (value: string): string => createHash("sha256").update(value).digest("hex");
const snapshot = createBuiltInStage2PermissionPolicySnapshot(), policyRef = { object_id: snapshot.snapshot_id, object_version: snapshot.object_version, digest: editorialObjectDigest(snapshot) };
const reference = (objectType: Stage2PermissionTypedRef["object_type"]): Stage2PermissionTypedRef => ({ object_type: objectType, object_id: `${objectType}-1`, object_version: 1, digest: digest(objectType) });
const refsFor = (row: Stage2PermissionRow): readonly [Stage2PermissionTypedRef, Stage2PermissionTypedRef[]] => [reference(row.subject_types[0]!), row.required_context_types.map(reference)];
const scopeFor = (row: Stage2PermissionRow, subject: Stage2PermissionTypedRef, contexts: readonly Stage2PermissionTypedRef[]): string[] => row.affected_scope_mode === "none" ? [] : row.affected_scope_mode === "exact_subject" ? [permissionRefKey(subject)] : [subject, ...contexts].map(permissionRefKey).sort();
const requestFor = (row: Stage2PermissionRow, actorKind: Stage2PermissionActorKind): Stage2PermissionRequestV1 => {
  const [subject, contexts] = refsFor(row);
  return { schema_version: 1, request_id: `${row.action}:${actorKind}`, actor: { actor_id: actorKind === "human_user" ? "reviewer-1" : actorKind, actor_kind: actorKind }, action: row.action, subject_ref: subject, context_refs: contexts, policy_snapshot_ref: policyRef, effect_digest: stage2PermissionEffectDigest(row.action, { subject, contexts }), requested_data_fields: [...row.allowed_data_fields], affected_scope: scopeFor(row, subject, contexts), reason: "exercise the exact permission row", requested_at: "2026-08-24T02:00:00Z" };
};
const authorityFor = (request: Stage2PermissionRequestV1) => ({ current_ref_keys: new Set([request.subject_ref, ...request.context_refs].map(permissionRefKey)), authoritative_scope: [...request.affected_scope], protected_refs: [] as string[], now_ms: Date.parse("2026-08-24T02:00:00Z") });
assertStage2PermissionPolicySnapshotV1(snapshot);
assert.equal(STAGE2_PERMISSION_ROWS.length, 28);
assert.equal(new Set(STAGE2_PERMISSION_ROWS.map((row) => row.action)).size, STAGE2_PERMISSION_ROWS.length);

for (const row of STAGE2_PERMISSION_ROWS) {
  for (const actorKind of actors) {
    const request = requestFor(row, actorKind), evaluation = evaluateStage2Permission(request, snapshot, authorityFor(request));
    const expected = row.allowed_autonomous_actor_kinds.includes(actorKind) ? "allowed_autonomous" : row.exact_approval_actor_kinds.includes(actorKind) ? "exact_human_approval_required" : "forbidden";
    assert.equal(evaluation.classification, expected, `${row.action}/${actorKind}`);
  }
}

const approvalRow = STAGE2_PERMISSION_ROWS.find((row) => row.action === "story_plan.approve")!;
const approvalBase = requestFor(approvalRow, "human_user"), approvalFingerprint = permissionRequestFingerprint(approvalBase);
const approval = { approval_id: "approval-story-1", actor_id: approvalBase.actor.actor_id, actor_kind: "human_user" as const, request_fingerprint: approvalFingerprint, subject_ref: approvalBase.subject_ref, context_refs: approvalBase.context_refs, policy_snapshot_ref: approvalBase.policy_snapshot_ref, effect_digest: approvalBase.effect_digest, affected_scope: approvalBase.affected_scope, review_digest: approvalBase.effect_digest, approved_at: "2026-08-24T01:59:00Z", expires_at: "2026-08-24T02:30:00Z" };
const approvedRequest: Stage2PermissionRequestV1 = { ...approvalBase, approval }, approvedEvaluation = evaluateStage2Permission(approvedRequest, snapshot, authorityFor(approvedRequest));
assert.equal(approvedEvaluation.classification, "exact_human_approved");
const decision = createStage2PermissionDecision(approvedRequest, snapshot, approvedEvaluation); assertStage2PermissionDecisionV1(decision); assert.equal(decision.classification, "exact_human_approved"); assert.equal(decision.actor.actor_kind, "human_user"); assert.equal("commands" in decision, false);
const renewedApproval = { ...approval, approval_id: "approval-story-2", approved_at: "2026-08-24T01:59:30Z", expires_at: "2026-08-24T02:45:00Z" };
const renewedRequest: Stage2PermissionRequestV1 = { ...approvalBase, approval: renewedApproval };
const renewedDecision = createStage2PermissionDecision(renewedRequest, snapshot, evaluateStage2Permission(renewedRequest, snapshot, authorityFor(renewedRequest)));
assert.notEqual(renewedDecision.input_fingerprint, decision.input_fingerprint, "a renewed exact approval must create a distinct authorization event fingerprint");
assert.equal(renewedApproval.request_fingerprint, approval.request_fingerprint, "renewal must retain the stable semantic request fingerprint");

for (const mutation of [
  { ...approval, actor_id: "impersonator" },
  { ...approval, request_fingerprint: digest("rebound") },
  { ...approval, subject_ref: { ...approval.subject_ref, digest: digest("subject-rebound") } },
  { ...approval, context_refs: [] },
  { ...approval, policy_snapshot_ref: { ...approval.policy_snapshot_ref, digest: digest("policy-rebound") } },
  { ...approval, effect_digest: digest("effect-rebound") },
  { ...approval, affected_scope: ["other"] },
  { ...approval, review_digest: digest("review-rebound") },
  { ...approval, approved_at: "2026-08-24T02:01:00Z" },
  { ...approval, expires_at: "2026-08-24T01:59:59Z" },
]) assert.equal(evaluateStage2Permission({ ...approvalBase, approval: mutation as typeof approval }, snapshot, authorityFor(approvalBase)).classification, "forbidden");

const autonomousRow = STAGE2_PERMISSION_ROWS.find((row) => row.action === "direction_card.generate")!, autonomous = requestFor(autonomousRow, "project_host");
assertStage2PermissionRequestV1(autonomous);
const reordered = { requested_at: autonomous.requested_at, reason: autonomous.reason, affected_scope: autonomous.affected_scope, requested_data_fields: autonomous.requested_data_fields, effect_digest: autonomous.effect_digest, policy_snapshot_ref: autonomous.policy_snapshot_ref, context_refs: autonomous.context_refs, subject_ref: autonomous.subject_ref, action: autonomous.action, actor: autonomous.actor, request_id: autonomous.request_id, schema_version: autonomous.schema_version } as Stage2PermissionRequestV1;
assert.equal(permissionRequestFingerprint(autonomous), permissionRequestFingerprint(reordered));
assert.equal(permissionRequestFingerprint(autonomous), permissionRequestFingerprint({ ...autonomous, context_refs: [...autonomous.context_refs].reverse(), requested_data_fields: [...autonomous.requested_data_fields].reverse(), affected_scope: [...autonomous.affected_scope].reverse() }));
assert.equal(evaluateStage2Permission({ ...autonomous, requested_data_fields: [...autonomous.requested_data_fields, "commands"] }, snapshot, authorityFor(autonomous)).reason_code, "DATA_FIELD_FORBIDDEN");
assert.equal(evaluateStage2Permission(autonomous, snapshot, { ...authorityFor(autonomous), current_ref_keys: new Set() }).reason_code, "INPUT_STALE");
assert.equal(evaluateStage2Permission({ ...autonomous, affected_scope: ["rebound"] }, snapshot, authorityFor(autonomous)).reason_code, "AFFECTED_SCOPE_REBOUND");
assert.equal(evaluateStage2Permission(autonomous, snapshot, { ...authorityFor(autonomous), protected_refs: [autonomous.affected_scope[0]!] }).reason_code, "PROTECTED_REF_FORBIDDEN");
const unknown = { ...autonomous, action: "unknown.action" } as unknown as Stage2PermissionRequestV1; assert.equal(evaluateStage2Permission(unknown, snapshot, authorityFor(unknown)).reason_code, "UNKNOWN_ACTION");
const direct = requestFor(STAGE2_PERMISSION_ROWS.find((row) => row.action === "project_state.direct_mutation")!, "human_user"); assert.equal(evaluateStage2Permission(direct, snapshot, authorityFor(direct)).classification, "forbidden");

assert.throws(() => assertStage2PermissionRequestV1({ ...autonomous, actor: { ...autonomous.actor, role: "project_host" }, commands: ["delete"] }), /CONTRACT_STAGE2_PERMISSION_REQUEST_V1_INVALID/);
assert.throws(() => permissionRequestFingerprint({ ...autonomous, actor: { ...autonomous.actor, role: "project_host" } } as unknown as Stage2PermissionRequestV1), /PERMISSION_REQUEST_INVALID|PERMISSION_EXECUTION_PAYLOAD_FORBIDDEN/);
assert.throws(() => createStage2PermissionDecision(approvalBase, snapshot, evaluateStage2Permission(approvalBase, snapshot, authorityFor(approvalBase))), /PERMISSION_DENIED/);
console.log("Stage 2 permission actor/action matrix, exact approval and malicious-input property checks passed");
