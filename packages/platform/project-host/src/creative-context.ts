import type { CreativeContractV2, MaterialEvidencePackV1 } from "../../../core/editorial-core/src/public.js";

function canonicalCreativeValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("creative context contains non-finite number"); return Object.is(value, -0) ? 0 : value; }
  if (Array.isArray(value)) return value.map(canonicalCreativeValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value as Record<string, unknown>).filter((key) => (value as Record<string, unknown>)[key] !== undefined).sort().map((key) => [key, canonicalCreativeValue((value as Record<string, unknown>)[key])]));
  throw new Error(`creative context contains unsupported value: ${typeof value}`);
}

export function canonicalCreativeContext(value: unknown): string { return JSON.stringify(canonicalCreativeValue(value)); }

export function createCreativeContractDraft(input: Omit<CreativeContractV2, "schema_version" | "object_version" | "status" | "approval"> & Readonly<{ object_version?: number }>): CreativeContractV2 {
  if ("schema_version" in input || "status" in input || "approval" in input) throw new Error("older or pre-lifecycled Creative Contract input is not accepted");
  return { ...input, schema_version: 2, object_version: input.object_version ?? 1, status: "draft" };
}

function assertUnique(values: readonly string[], label: string): void { if (new Set(values).size !== values.length) throw new Error(`${label} must be unique`); }
function assertDigest(value: string, label: string): void { if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(`${label} digest is invalid`); }

export function validateCreativeContractV2(contract: CreativeContractV2): void {
  if (contract.schema_version !== 2 || contract.object_version < 1 || !contract.creator_goal.trim() || contract.audience.length === 0 || contract.platforms.length === 0 || contract.target_duration.timescale < 1 || contract.target_duration.value <= 0) throw new Error("creative contract required fields are unresolved");
  assertUnique(contract.requirements.map((requirement) => requirement.requirement_id), "creative requirement IDs");
  if (contract.requirements.some((requirement) => !requirement.statement.trim() || requirement.priority < 0 || requirement.priority > 100)) throw new Error("creative contract requirement is invalid");
  assertDigest(contract.privacy_policy_ref.digest, "privacy policy");
  assertDigest(contract.rights_policy_ref.digest, "rights policy");
  const policyActor = contract.approval_policy.mode === "explicit_user" ? "user" : "policy";
  if (contract.approval_policy.actor_kind !== policyActor) throw new Error("creative contract approval policy mode and actor kind conflict");
  if (contract.status === "approved") {
    if (!contract.approval?.actor_id || contract.approval.actor_kind !== contract.approval_policy.actor_kind) throw new Error("approved creative contract lacks matching approval actor");
    assertDigest(contract.approval.review_digest, "approval review");
    if (contract.provenance.unresolved_assumptions.length) throw new Error("approved creative contract has unresolved assumptions");
  }
  if (contract.status !== "approved" && contract.approval) throw new Error("unapproved creative contract cannot carry approval");
}

function rationalLess(left: Readonly<{ value: number; timescale: number }>, right: Readonly<{ value: number; timescale: number }>): boolean { return BigInt(left.value) * BigInt(right.timescale) < BigInt(right.value) * BigInt(left.timescale); }

export function validateMaterialEvidencePack(pack: MaterialEvidencePackV1, contract: CreativeContractV2): void {
  if (contract.status !== "approved" || pack.project_id !== contract.project_id || pack.contract_ref.object_id !== contract.contract_id || pack.contract_ref.object_version !== contract.object_version) throw new Error("material pack contract reference is stale or unapproved");
  assertDigest(pack.contract_ref.digest, "material pack contract");
  assertDigest(pack.coverage_matrix_ref.digest, "coverage matrix");
  assertDigest(pack.input_fingerprint, "material pack input");
  const createdAt = Date.parse(pack.created_at), expiresAt = pack.expires_at === undefined ? null : Date.parse(pack.expires_at);
  if (!Number.isFinite(createdAt) || (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= createdAt))) throw new Error("material pack expiry is invalid");
  assertUnique(pack.evidence_refs.map((reference) => reference.evidence_id), "material evidence IDs");
  for (const reference of pack.evidence_refs) {
    assertDigest(reference.content_digest, `evidence ${reference.evidence_id}`);
    if (reference.review_status !== "approved" || reference.range.start.timescale < 1 || reference.range.end.timescale < 1 || !rationalLess(reference.range.start, reference.range.end)) throw new Error(`evidence ${reference.evidence_id} is not approved with a valid RationalTime range`);
  }
  const availability = new Map(pack.availability.map((item) => [item.asset_id, item]));
  if (pack.evidence_refs.some((reference) => availability.get(reference.asset_id)?.permission_state !== "authorized" || availability.get(reference.asset_id)?.original_identity !== reference.asset_id)) throw new Error("material pack evidence is unavailable or unauthorized");
  const covered = new Set(pack.sufficiency.covered_requirement_ids), missing = new Set(pack.sufficiency.missing_requirement_ids), conflicting = new Set(pack.sufficiency.conflicting_requirement_ids);
  if ([...covered].some((id) => missing.has(id) || conflicting.has(id)) || [...missing].some((id) => conflicting.has(id))) throw new Error("material sufficiency sets conflict");
  const hard = contract.requirements.filter((requirement) => requirement.kind === "hard").map((requirement) => requirement.requirement_id);
  const hardBlocked = hard.filter((id) => !covered.has(id) || missing.has(id) || conflicting.has(id));
  if (pack.status === "sufficient" && hardBlocked.length) throw new Error(`sufficient material pack does not cover hard requirements: ${hardBlocked.join(",")}`);
  if (pack.status === "sufficient" && (missing.size || conflicting.size)) throw new Error("sufficient material pack carries blockers");
  if (pack.status === "insufficient" && missing.size === 0 && conflicting.size === 0) throw new Error("insufficient material pack lacks diagnostics");
}
