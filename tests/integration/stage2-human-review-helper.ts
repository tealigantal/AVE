import { createHash } from "node:crypto";
import type { ProjectHostSession, ProjectHostOptions } from "../../packages/platform/project-host/src/public.js";
import { permissionRefKey, stage2PermissionEffectDigest, type Stage2PermissionAction, type Stage2PermissionTypedRef } from "../../packages/features/permission-enforcement/src/public.js";
import { editorialObjectDigest } from "../../packages/core/editorial-core/src/public.js";

export function createStage2HumanReview(actorId = "user-1", now = "2026-08-24T00:00:30.000Z") {
  const credential = {}; let nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("test review time is invalid");
  const options: ProjectHostOptions = { stage2HumanReviewChannels: [{ credential, actor_id: actorId }], now: () => nowMs };
  const issue = (host: ProjectHostSession, approvalId: string, action: Stage2PermissionAction, subject: Stage2PermissionTypedRef, contexts: readonly Stage2PermissionTypedRef[], requestedDataFields: readonly string[], affectedScope: readonly string[], effect: unknown, reason: string) => host.registerStage2HumanApproval(credential, { approval_id: approvalId, action, subject_ref: subject, context_refs: contexts, requested_data_fields: requestedDataFields, affected_scope: affectedScope, effect_digest: stage2PermissionEffectDigest(action, effect), reason, expires_at: "2099-08-24T00:00:00.000Z" });
  return {
    credential,
    options,
    advance(milliseconds: number) { if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) throw new Error("test review time advance is invalid"); nowMs += milliseconds; },
    issue,
    issueDigest(host: ProjectHostSession, approvalId: string, action: Stage2PermissionAction, subject: Stage2PermissionTypedRef, contexts: readonly Stage2PermissionTypedRef[], requestedDataFields: readonly string[], affectedScope: readonly string[], effectDigest: string, reason: string) {
      return host.registerStage2HumanApproval(credential, { approval_id: approvalId, action, subject_ref: subject, context_refs: contexts, requested_data_fields: requestedDataFields, affected_scope: affectedScope, effect_digest: effectDigest, reason, expires_at: "2099-08-24T00:00:00.000Z" });
    },
    async approveEvidence(host: ProjectHostSession, approvalId: string, evidence: Readonly<Record<string, unknown>>, reason = "approve exact Evidence candidate") {
      const candidate: Record<string, unknown> = { ...evidence, evidence_version: Number.isSafeInteger(evidence.evidence_version) ? Number(evidence.evidence_version) : 1, review_status: "candidate" }, evidenceId = String(candidate.evidence_id), evidenceVersion = Number(candidate.evidence_version), reviewDigest = editorialObjectDigest(candidate), subject: Stage2PermissionTypedRef = { object_type: "evidence_object", object_id: evidenceId, object_version: evidenceVersion, digest: reviewDigest };
      await issue(host, approvalId, "evidence.approve", subject, [], ["reason", "review_digest"], [permissionRefKey(subject)], { evidence_id: evidenceId, evidence_version: evidenceVersion, review_digest: reviewDigest, outcome: "approved", reason }, reason);
      return host.approveEvidence({ evidence_id: evidenceId, evidence_version: evidenceVersion, review_digest: reviewDigest, approval_id: approvalId, reason });
    },
    async approveContract(host: ProjectHostSession, approvalId: string, contractId: string, objectVersion: number, reviewDigest: string) {
      const subject: Stage2PermissionTypedRef = { object_type: "creative_contract", object_id: contractId, object_version: objectVersion, digest: reviewDigest };
      await issue(host, approvalId, "creative_contract.approve", subject, [], ["reason", "review_digest"], [permissionRefKey(subject)], { contract_id: contractId, object_version: objectVersion, review_digest: reviewDigest, outcome: "approved" }, "approve exact Creative Contract review");
      return { contract_id: contractId, object_version: objectVersion, review_digest: reviewDigest, approval_id: approvalId } as const;
    },
    async rejectContract(host: ProjectHostSession, approvalId: string, decisionId: string, contractId: string, objectVersion: number, objectDigest: string, reason: string) {
      const subject: Stage2PermissionTypedRef = { object_type: "creative_contract", object_id: contractId, object_version: objectVersion, digest: objectDigest };
      await issue(host, approvalId, "creative_contract.reject", subject, [], ["reason", "review_digest"], [permissionRefKey(subject)], { decision_id: decisionId, contract_id: contractId, object_version: objectVersion, object_digest: objectDigest, outcome: "rejected", reason }, reason);
      return { decision_id: decisionId, contract_id: contractId, object_version: objectVersion, object_digest: objectDigest, approval_id: approvalId, reason } as const;
    },
    async materialPermission(host: ProjectHostSession, approvalId: string, input: Readonly<{ contract_ref: Readonly<{ object_id: string; object_version: number; digest: string }>; asset_id: string; asset_location_id: string; location_ref: string; verified_at: string; permission_state: "authorized" | "denied"; policy_ref: Readonly<{ object_id: string; object_version: number; digest: string }> }>) {
      const subject: Stage2PermissionTypedRef = { object_type: "creative_contract", ...input.contract_ref }, locationIdentity = createHash("sha256").update([input.asset_location_id, input.location_ref, input.verified_at].join("\0")).digest("hex");
      await issue(host, approvalId, "material_permission.record", subject, [], ["asset_id", "location_identity", "policy_ref", "reason"], [permissionRefKey(subject)], { asset_id: input.asset_id, asset_location_id: input.asset_location_id, location_identity: locationIdentity, permission_state: input.permission_state, policy_ref: input.policy_ref }, `record exact material permission ${input.permission_state}`);
      return { asset_id: input.asset_id as any, asset_location_id: input.asset_location_id, permission_state: input.permission_state, contract_ref: input.contract_ref, approval_id: approvalId, policy_ref: input.policy_ref } as const;
    },
  };
}
