import type { Stage2PermissionDecisionV1 } from "../../../../contracts/generated/typescript/editorial/stage2-permission-decision.v1.js";
import type { Stage2PermissionPolicySnapshotV1 } from "../../../../contracts/generated/typescript/editorial/stage2-permission-policy-snapshot.v1.js";
import type { Stage2PermissionRequestV1 } from "../../../../contracts/generated/typescript/editorial/stage2-permission-request.v1.js";
import { editorialObjectDigest, isStrictComparableDateTime } from "../../../core/editorial-core/src/public.js";

export const featureId = "permission-enforcement" as const;
export const STAGE2_PERMISSION_SOURCE_VERSION = "permission-enforcement-v3";
export const STAGE2_PERMISSION_POLICY_VERSION = "stage2-permission-policy-v3";
export const STAGE2_PERMISSION_SNAPSHOT_ID = "stage2-permission-policy";
export const STAGE2_PERMISSION_SNAPSHOT_CREATED_AT = "2026-08-24T00:00:00Z";

export type { Stage2PermissionDecisionV1, Stage2PermissionPolicySnapshotV1, Stage2PermissionRequestV1 };
export type Stage2PermissionActorKind = Stage2PermissionRequestV1["actor"]["actor_kind"];
export type Stage2PermissionAction = Stage2PermissionRequestV1["action"];
export type Stage2PermissionTypedRef = Stage2PermissionRequestV1["subject_ref"];
export type Stage2PermissionRow = Stage2PermissionPolicySnapshotV1["rows"][number];
export type Stage2PermissionEvaluation = Readonly<{
  classification: "allowed_autonomous" | "exact_human_approved" | "exact_human_approval_required" | "forbidden";
  approval_requirement: "none" | "exact_human";
  reason_code: string;
  failure_result: Stage2PermissionRow["failure_result"];
  allowed_data_fields: readonly string[];
}>;

const ALL_OBJECT_TYPES: readonly Stage2PermissionTypedRef["object_type"][] = ["evidence_object", "creative_contract", "material_evidence_pack", "creative_skill_definition", "skill_evaluation", "duration_blueprint", "duration_feasibility", "direction_card", "story_proposal_v2", "approved_story_plan_v2", "decision_record", "editorial_edit_intent", "capability_snapshot", "permission_decision", "feedback_diagnosis", "intelligence_edit_execution"];
const EXECUTION_KEYS = new Set(["command", "commands", "backend", "shell", "ffmpeg", "render_graph", "rendergraph", "execution_plan", "commit_plan", "script", "argv", "network", "url", "path", "sqlite", "role", "capability", "permission", "provenance"]);
const row = (action: Stage2PermissionAction, autonomous: readonly Stage2PermissionActorKind[], exactApproval: readonly Stage2PermissionActorKind[], subjectTypes: readonly Stage2PermissionTypedRef["object_type"][], requiredContextTypes: readonly Stage2PermissionTypedRef["object_type"][], allowedContextTypes: readonly Stage2PermissionTypedRef["object_type"][], data: readonly string[], scope: Stage2PermissionRow["affected_scope_mode"], failure: Stage2PermissionRow["failure_result"], reason: string): Stage2PermissionRow => ({ action, allowed_autonomous_actor_kinds: [...autonomous], exact_approval_actor_kinds: [...exactApproval], subject_types: [...subjectTypes], required_context_types: [...requiredContextTypes], allowed_context_types: [...allowedContextTypes], allowed_data_fields: [...data].sort(), affected_scope_mode: scope, failure_result: failure, reason_code: reason });
const host = ["project_host"] as const, human = ["human_user"] as const, queryActors = host;

export const STAGE2_PERMISSION_ROWS: readonly Stage2PermissionRow[] = [
  row("evidence.register", host, [], ["evidence_object"], [], [], ["evidence"], "exact_subject", "no_authoritative_artifact", "HOST_VALIDATED_EVIDENCE_CANDIDATE"),
  row("evidence.approve", [], human, ["evidence_object"], [], [], ["reason", "review_digest"], "exact_subject", "zero_project_mutation", "EXACT_HUMAN_APPROVAL_REQUIRED"),
  row("creative_contract.register_draft", host, [], ["creative_contract"], [], [], ["contract"], "exact_subject", "no_authoritative_artifact", "HOST_VALIDATED_DRAFT"),
  row("creative_contract.approve", [], human, ["creative_contract"], [], [], ["reason", "review_digest"], "exact_subject", "zero_project_mutation", "EXACT_HUMAN_APPROVAL_REQUIRED"),
  row("creative_contract.reject", [], human, ["creative_contract"], [], [], ["reason", "review_digest"], "exact_subject", "zero_project_mutation", "EXACT_HUMAN_APPROVAL_REQUIRED"),
  row("creative_context.query", queryActors, [], ["evidence_object", "creative_contract", "material_evidence_pack"], [], ["evidence_object", "creative_contract", "material_evidence_pack"], ["digest", "lifecycle_status", "object_id", "object_version", "stale_reasons"], "none", "denied_no_state_change", "BOUNDED_PROJECT_QUERY"),
  row("material_permission.record", [], human, ["creative_contract"], [], [], ["asset_id", "location_identity", "policy_ref", "reason"], "exact_subject", "zero_project_mutation", "EXACT_HUMAN_APPROVAL_REQUIRED"),
  row("material_evidence_pack.assemble", host, [], ["creative_contract"], [], ["creative_contract"], ["availability", "coverage_matrix_ref", "evidence_refs", "policy_snapshot"], "exact_subject_and_context", "no_authoritative_artifact", "HOST_DERIVED_CONTEXT"),
  row("creative_skill_definition.pin", host, [], ["creative_skill_definition"], [], [], ["definition_ref"], "exact_subject", "no_authoritative_artifact", "TRUSTED_CATALOG_ONLY"),
  row("creative_skill_definition.withdraw", host, [], ["creative_skill_definition"], [], [], ["availability", "reason"], "exact_subject", "last_valid_state_retained", "HOST_CATALOG_CONTROL"),
  row("creative_skill_knowledge.query", queryActors, [], ["creative_skill_definition", "skill_evaluation"], [], ["creative_contract", "material_evidence_pack"], ["digest", "lifecycle_status", "object_id", "object_version", "scores", "stale_reasons"], "none", "denied_no_state_change", "BOUNDED_PROJECT_QUERY"),
  row("skill_evaluation.evaluate", host, [], ["creative_skill_definition"], ["creative_contract", "material_evidence_pack"], ["creative_contract", "material_evidence_pack"], ["diagnostics", "input_refs", "scores"], "exact_subject_and_context", "candidate_discarded", "HOST_DETERMINISTIC_EVALUATION"),
  row("duration_blueprint.pin", host, [], ["duration_blueprint"], [], [], ["blueprint_ref"], "exact_subject", "no_authoritative_artifact", "TRUSTED_CATALOG_ONLY"),
  row("duration_knowledge.query", queryActors, [], ["duration_blueprint", "duration_feasibility"], [], ["creative_contract", "material_evidence_pack"], ["digest", "lifecycle_status", "object_id", "object_version", "result", "stale_reasons"], "none", "denied_no_state_change", "BOUNDED_PROJECT_QUERY"),
  row("duration_feasibility.evaluate", host, [], ["duration_blueprint"], ["creative_contract", "material_evidence_pack"], ["creative_contract", "material_evidence_pack"], ["diagnostics", "input_refs", "result"], "exact_subject_and_context", "candidate_discarded", "HOST_DETERMINISTIC_EVALUATION"),
  row("direction_card.generate", host, [], ["creative_contract"], ["material_evidence_pack", "duration_feasibility"], ["material_evidence_pack", "skill_evaluation", "duration_feasibility"], ["audit_metadata", "bounded_context", "candidate"], "exact_subject_and_context", "candidate_discarded", "HOST_DERIVED_CANDIDATE"),
  row("direction_card.select", [], human, ["direction_card"], ["creative_contract"], ["creative_contract", "material_evidence_pack", "duration_feasibility"], ["alternatives", "reason", "review_digest", "selected_ref"], "exact_subject", "zero_project_mutation", "EXACT_HUMAN_APPROVAL_REQUIRED"),
  row("story_proposal.generate", host, [], ["direction_card"], ["creative_contract", "material_evidence_pack", "duration_feasibility"], ["creative_contract", "material_evidence_pack", "skill_evaluation", "duration_feasibility"], ["audit_metadata", "bounded_context", "candidate"], "exact_subject_and_context", "candidate_discarded", "HOST_DERIVED_CANDIDATE"),
  row("story_plan.approve", [], human, ["story_proposal_v2"], ["creative_contract"], ["creative_contract", "direction_card", "material_evidence_pack", "duration_feasibility"], ["alternatives", "reason", "review_digest", "selected_ref"], "exact_subject", "zero_project_mutation", "EXACT_HUMAN_APPROVAL_REQUIRED"),
  row("story_artifact.query", queryActors, [], ["direction_card", "story_proposal_v2", "approved_story_plan_v2", "decision_record", "editorial_edit_intent"], [], ALL_OBJECT_TYPES, ["comparison_fields", "digest", "lifecycle_status", "object_id", "object_version", "stale_reasons"], "none", "denied_no_state_change", "BOUNDED_PROJECT_QUERY"),
  row("feedback_diagnosis.query", queryActors, [], ["feedback_diagnosis"], [], ALL_OBJECT_TYPES, ["diagnosis", "digest", "lifecycle_status", "object_id", "object_version", "stale_reasons"], "none", "denied_no_state_change", "BOUNDED_FEEDBACK_QUERY"),
  row("feedback_revision.generate", host, [], ["feedback_diagnosis"], ["intelligence_edit_execution"], ["intelligence_edit_execution", "approved_story_plan_v2", "decision_record", "evidence_object", "creative_contract", "capability_snapshot"], ["diagnosis", "intent", "preview_effect", "reason"], "exact_subject_and_context", "candidate_discarded", "HOST_DERIVED_FEEDBACK_REVISION"),
  row("feedback_revision.reject", [], human, ["editorial_edit_intent"], ["feedback_diagnosis"], ["feedback_diagnosis", "intelligence_edit_execution", "creative_contract", "approved_story_plan_v2"], ["reason", "review_digest"], "exact_subject", "zero_project_mutation", "EXACT_HUMAN_REJECTION_REQUIRED"),
  row("editorial_edit_intent.generate", host, [], ["approved_story_plan_v2"], ["decision_record"], ["creative_contract", "decision_record", "capability_snapshot"], ["alternatives", "approved_story_ref", "decision_refs", "operations", "reason", "risks"], "exact_subject_and_context", "candidate_discarded", "HOST_DERIVED_SEMANTIC_PROPOSAL"),
  row("editorial_edit_intent.approve", [], human, ["editorial_edit_intent"], ["creative_contract"], ["creative_contract", "approved_story_plan_v2", "decision_record", "capability_snapshot", "feedback_diagnosis", "intelligence_edit_execution"], ["expected_effects", "reason", "review_digest"], "exact_subject", "zero_project_mutation", "EXACT_HUMAN_APPROVAL_REQUIRED"),
  row("editorial_edit_intent.execute", [], human, ["editorial_edit_intent"], ["creative_contract", "approved_story_plan_v2", "decision_record", "capability_snapshot", "permission_decision"], ["creative_contract", "approved_story_plan_v2", "decision_record", "capability_snapshot", "permission_decision", "evidence_object", "feedback_diagnosis", "intelligence_edit_execution"], ["base_timeline_version", "compiled_effect_digest", "reason", "review_digest", "source_identity_digest"], "exact_subject", "zero_project_mutation", "EXACT_HUMAN_EXECUTION_APPROVAL_REQUIRED"),
  row("permission_decision.query", queryActors, [], ["permission_decision"], [], [], ["action", "classification", "digest", "failure_result", "lifecycle_status", "object_id", "object_version", "reason_code", "scope", "stale_reasons"], "none", "denied_no_state_change", "BOUNDED_PERMISSION_QUERY"),
  row("project_state.direct_mutation", [], [], ALL_OBJECT_TYPES, [], ALL_OBJECT_TYPES, [], "none", "zero_project_mutation", "DIRECT_MUTATION_FORBIDDEN"),
].sort((left, right) => left.action.localeCompare(right.action));

export function createBuiltInStage2PermissionPolicySnapshot(): Stage2PermissionPolicySnapshotV1 {
  const base = { schema_version: 1 as const, snapshot_id: STAGE2_PERMISSION_SNAPSHOT_ID, object_version: 3, policy_version: STAGE2_PERMISSION_POLICY_VERSION, status: "approved" as const, rows: STAGE2_PERMISSION_ROWS.map((item) => ({ ...item, allowed_autonomous_actor_kinds: [...item.allowed_autonomous_actor_kinds], exact_approval_actor_kinds: [...item.exact_approval_actor_kinds], subject_types: [...item.subject_types], required_context_types: [...item.required_context_types], allowed_context_types: [...item.allowed_context_types], allowed_data_fields: [...item.allowed_data_fields] })), created_at: STAGE2_PERMISSION_SNAPSHOT_CREATED_AT, provenance: { producer: "project-host" as const, source_version: STAGE2_PERMISSION_SOURCE_VERSION, policy_version: STAGE2_PERMISSION_POLICY_VERSION, input_refs: [] as string[] } };
  return { ...base, input_fingerprint: editorialObjectDigest(base) };
}

export const permissionRefKey = (reference: Stage2PermissionTypedRef): string => `${reference.object_type}:${reference.object_id}@${reference.object_version}#${reference.digest}`;
export const stage2PermissionEffectDigest = (action: Stage2PermissionAction, effect: unknown): string => editorialObjectDigest({ action, effect });
const canonicalRefs = (references: readonly Stage2PermissionTypedRef[]): string[] => references.map(permissionRefKey).sort();
const sameStrings = (left: readonly string[], right: readonly string[]): boolean => left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
const sameRef = (left: Stage2PermissionTypedRef, right: Stage2PermissionTypedRef): boolean => permissionRefKey(left) === permissionRefKey(right);
const sameRefs = (left: readonly Stage2PermissionTypedRef[], right: readonly Stage2PermissionTypedRef[]): boolean => sameStrings(canonicalRefs(left), canonicalRefs(right));

function assertExactKeys(value: unknown, expected: readonly string[], label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || !sameStrings(Object.keys(value as object), expected)) throw new Error(`PERMISSION_REQUEST_INVALID:${label}`);
}
function assertNoExecutionShape(value: unknown): void {
  if (Array.isArray(value)) { value.forEach(assertNoExecutionShape); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) { if (EXECUTION_KEYS.has(key.toLowerCase())) throw new Error(`PERMISSION_EXECUTION_PAYLOAD_FORBIDDEN:${key}`); assertNoExecutionShape(item); }
}
function assertRequestShape(request: Stage2PermissionRequestV1): void {
  const top = ["schema_version", "request_id", "actor", "action", "subject_ref", "context_refs", "policy_snapshot_ref", "effect_digest", "requested_data_fields", "affected_scope", "reason", "requested_at", ...(request.approval ? ["approval"] : [])];
  assertExactKeys(request, top, "top-level fields");
  assertExactKeys(request.actor, ["actor_id", "actor_kind"], "actor fields");
  assertExactKeys(request.subject_ref, ["object_type", "object_id", "object_version", "digest"], "subject fields");
  assertExactKeys(request.policy_snapshot_ref, ["object_id", "object_version", "digest"], "policy snapshot fields");
  request.context_refs.forEach((reference) => assertExactKeys(reference, ["object_type", "object_id", "object_version", "digest"], "context fields"));
  if (request.approval) {
    assertExactKeys(request.approval, ["approval_id", "actor_id", "actor_kind", "request_fingerprint", "subject_ref", "context_refs", "policy_snapshot_ref", "effect_digest", "affected_scope", "review_digest", "approved_at", "expires_at"], "approval fields");
    assertExactKeys(request.approval.subject_ref, ["object_type", "object_id", "object_version", "digest"], "approval subject fields");
    assertExactKeys(request.approval.policy_snapshot_ref, ["object_id", "object_version", "digest"], "approval policy snapshot fields");
    request.approval.context_refs.forEach((reference) => assertExactKeys(reference, ["object_type", "object_id", "object_version", "digest"], "approval context fields"));
  }
  assertNoExecutionShape(request);
  const allRefs = [request.subject_ref, ...request.context_refs];
  if (request.schema_version !== 1 || !request.request_id.trim() || !request.actor.actor_id.trim() || !request.reason.trim() || !isStrictComparableDateTime(request.requested_at) || !/^[0-9a-f]{64}$/.test(request.effect_digest) || new Set(canonicalRefs(allRefs)).size !== allRefs.length || new Set(request.requested_data_fields).size !== request.requested_data_fields.length || new Set(request.affected_scope).size !== request.affected_scope.length) throw new Error("PERMISSION_REQUEST_INVALID:identity or duplicate values");
}

export function permissionRequestFingerprint(request: Stage2PermissionRequestV1): string {
  assertRequestShape(request);
  const { approval: _approval, request_id: _requestId, requested_at: _requestedAt, ...approvalFree } = request;
  return editorialObjectDigest({ ...approvalFree, context_refs: [...request.context_refs].sort((left, right) => permissionRefKey(left).localeCompare(permissionRefKey(right))), requested_data_fields: [...request.requested_data_fields].sort(), affected_scope: [...request.affected_scope].sort() });
}

export function evaluateStage2Permission(request: Stage2PermissionRequestV1, snapshot: Stage2PermissionPolicySnapshotV1, authority: Readonly<{ current_ref_keys: ReadonlySet<string>; authoritative_scope: readonly string[]; protected_refs: readonly string[]; now_ms: number }>): Stage2PermissionEvaluation {
  assertRequestShape(request);
  const expectedSnapshot = createBuiltInStage2PermissionPolicySnapshot();
  if (editorialObjectDigest(snapshot) !== editorialObjectDigest(expectedSnapshot) || snapshot.input_fingerprint !== expectedSnapshot.input_fingerprint) throw new Error("PERMISSION_POLICY_SNAPSHOT_INVALID");
  const expectedPolicyRef = { object_id: snapshot.snapshot_id, object_version: snapshot.object_version, digest: editorialObjectDigest(snapshot) };
  if (request.policy_snapshot_ref.object_id !== expectedPolicyRef.object_id || request.policy_snapshot_ref.object_version !== expectedPolicyRef.object_version || request.policy_snapshot_ref.digest !== expectedPolicyRef.digest) throw new Error("PERMISSION_POLICY_SNAPSHOT_REBOUND");
  const selected = snapshot.rows.find((item) => item.action === request.action);
  const forbidden = (reason: string, failure: Stage2PermissionRow["failure_result"] = "denied_no_state_change"): Stage2PermissionEvaluation => ({ classification: "forbidden", approval_requirement: "none", reason_code: reason, failure_result: failure, allowed_data_fields: [] });
  if (!selected) return forbidden("UNKNOWN_ACTION", "zero_project_mutation");
  if (!selected.subject_types.includes(request.subject_ref.object_type)) return forbidden("SUBJECT_TYPE_FORBIDDEN", selected.failure_result);
  const contextTypes = request.context_refs.map((reference) => reference.object_type);
  if (selected.required_context_types.some((type) => !contextTypes.includes(type)) || contextTypes.some((type) => !selected.allowed_context_types.includes(type))) return forbidden("CONTEXT_SCOPE_FORBIDDEN", selected.failure_result);
  if ([request.subject_ref, ...request.context_refs].some((reference) => !authority.current_ref_keys.has(permissionRefKey(reference)))) return forbidden("INPUT_STALE", selected.failure_result);
  if (request.requested_data_fields.some((field) => !selected.allowed_data_fields.includes(field))) return forbidden("DATA_FIELD_FORBIDDEN", selected.failure_result);
  if (!sameStrings(request.affected_scope, authority.authoritative_scope)) return forbidden("AFFECTED_SCOPE_REBOUND", selected.failure_result);
  if (request.affected_scope.some((scope) => authority.protected_refs.includes(scope))) return forbidden("PROTECTED_REF_FORBIDDEN", selected.failure_result);
  if (selected.allowed_autonomous_actor_kinds.includes(request.actor.actor_kind)) {
    if (request.approval) return forbidden("UNEXPECTED_APPROVAL", selected.failure_result);
    return { classification: "allowed_autonomous", approval_requirement: "none", reason_code: selected.reason_code, failure_result: selected.failure_result, allowed_data_fields: [...request.requested_data_fields].sort() };
  }
  if (!selected.exact_approval_actor_kinds.includes(request.actor.actor_kind)) return forbidden("ACTOR_ACTION_FORBIDDEN", selected.failure_result);
  if (!request.approval) return { classification: "exact_human_approval_required", approval_requirement: "exact_human", reason_code: "APPROVAL_REQUIRED", failure_result: selected.failure_result, allowed_data_fields: [...request.requested_data_fields].sort() };
  const approval = request.approval, requestFingerprint = permissionRequestFingerprint(request), requestedAt = Date.parse(request.requested_at), approvedAt = Date.parse(approval.approved_at), expiresAt = Date.parse(approval.expires_at);
  if (approval.actor_kind !== "human_user" || approval.actor_id !== request.actor.actor_id || approval.request_fingerprint !== requestFingerprint || !sameRef(approval.subject_ref, request.subject_ref) || !sameRefs(approval.context_refs, request.context_refs) || approval.policy_snapshot_ref.object_id !== expectedPolicyRef.object_id || approval.policy_snapshot_ref.object_version !== expectedPolicyRef.object_version || approval.policy_snapshot_ref.digest !== expectedPolicyRef.digest || approval.effect_digest !== request.effect_digest || !sameStrings(approval.affected_scope, request.affected_scope) || approval.review_digest !== request.effect_digest) return forbidden("APPROVAL_REBOUND", selected.failure_result);
  if (!isStrictComparableDateTime(approval.approved_at) || !isStrictComparableDateTime(approval.expires_at) || !Number.isFinite(requestedAt) || !Number.isFinite(approvedAt) || !Number.isFinite(expiresAt) || !Number.isFinite(authority.now_ms) || approvedAt > authority.now_ms || authority.now_ms > expiresAt) return forbidden("APPROVAL_STALE", selected.failure_result);
  return { classification: "exact_human_approved", approval_requirement: "exact_human", reason_code: selected.reason_code, failure_result: selected.failure_result, allowed_data_fields: [...request.requested_data_fields].sort() };
}

export function createStage2PermissionDecision(request: Stage2PermissionRequestV1, snapshot: Stage2PermissionPolicySnapshotV1, evaluation: Stage2PermissionEvaluation): Stage2PermissionDecisionV1 {
  if (!["allowed_autonomous", "exact_human_approved"].includes(evaluation.classification)) throw new Error(`PERMISSION_DENIED:${evaluation.reason_code}`);
  const policyDigest = editorialObjectDigest(snapshot), semanticFingerprint = permissionRequestFingerprint(request), inputFingerprint = request.approval ? editorialObjectDigest({ semantic_request_fingerprint: semanticFingerprint, approval_id: request.approval.approval_id, approved_at: request.approval.approved_at }) : semanticFingerprint;
  return {
    schema_version: 1,
    decision_id: `permission:${request.request_id}`,
    object_version: 1,
    status: "approved",
    classification: evaluation.classification as "allowed_autonomous" | "exact_human_approved",
    action: request.action,
    actor: { ...request.actor },
    subject_ref: { ...request.subject_ref },
    context_refs: request.context_refs.map((reference) => ({ ...reference })),
    policy_snapshot_ref: { object_id: snapshot.snapshot_id, object_version: snapshot.object_version, digest: policyDigest },
    effect_digest: request.effect_digest,
    approval_requirement: evaluation.approval_requirement,
    ...(request.approval ? { approval: { ...request.approval, subject_ref: { ...request.approval.subject_ref }, context_refs: request.approval.context_refs.map((reference) => ({ ...reference })), affected_scope: [...request.approval.affected_scope] } } : {}),
    allowed_data_fields: [...evaluation.allowed_data_fields],
    affected_scope: [...request.affected_scope].sort(),
    failure_result: evaluation.failure_result,
    reason_code: evaluation.reason_code,
    request_reason: request.reason,
    input_fingerprint: inputFingerprint,
    created_at: request.requested_at,
    provenance: { producer: "project-host", source_version: STAGE2_PERMISSION_SOURCE_VERSION, policy_version: STAGE2_PERMISSION_POLICY_VERSION, input_refs: [policyDigest, request.subject_ref.digest, ...request.context_refs.map((reference) => reference.digest)] },
  };
}
