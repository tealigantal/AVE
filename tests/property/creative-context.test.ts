import assert from "node:assert/strict";
import type { CreativeContract, CreativeContractV2, MaterialEvidencePackV1 } from "../../packages/core/editorial-core/src/public.js";
import { canonicalCreativeContext, upgradeCreativeContractV1, validateCreativeContractV2, validateMaterialEvidencePack } from "../../packages/platform/project-host/src/public.js";
import { assertCreativeContractV1, assertCreativeContractV2, assertMaterialEvidencePackV1, parseContractJson } from "../../packages/platform/contract-runtime/src/public.js";
import type { AssetId } from "../../packages/core/media-identity/src/public.js";

const digest = (character: string) => character.repeat(64);
const v1: CreativeContract = { schema_version: 1, contract_id: "contract-1", status: "review", requirements: [{ requirement_id: "req-hard", kind: "hard", statement: "Use approved evidence" }] };
assertCreativeContractV1(v1);
const upgraded = upgradeCreativeContractV1(v1, {
  project_id: "project-1",
  creator_goal: "Create a truthful recap",
  audience: ["friends"],
  platforms: ["youtube"],
  target_duration: { schema_version: 1, value: 60, timescale: 1 },
  voice_and_identity: { desired_traits: ["warm"], forbidden_misrepresentation: ["invented fact"] },
  privacy_policy_ref: { object_id: "privacy", object_version: 1, digest: digest("a") },
  rights_policy_ref: { object_id: "rights", object_version: 1, digest: digest("b") },
  approval_policy: { mode: "explicit_user", actor_kind: "user" },
  protected_refs: [], allowed_transformations: ["trim"], forbidden_outcomes: ["fabrication"],
  created_at: "2026-08-23T00:00:00.000Z",
  provenance: { producer: "adapter", source_id: "v1-adapter", source_version: "1", policy_version: "local-v1", input_refs: ["contract-1:v1"], unresolved_assumptions: [] },
});
assert.equal(upgraded.schema_version, 2);
assert.equal(upgraded.status, "draft");
assert.equal(upgraded.requirements[0]?.priority, 100);
assertCreativeContractV2(upgraded);
assert.equal(parseContractJson(JSON.stringify(upgraded), 2).schema_version, 2);
validateCreativeContractV2(upgraded);
assert.throws(() => assertCreativeContractV2({ ...upgraded, approval_policy: { mode: "explicit_user", actor_kind: "policy" } }), /must be equal to constant/);
assert.throws(() => validateCreativeContractV2({ ...upgraded, approval_policy: { mode: "explicit_user", actor_kind: "policy" } }), /mode and actor kind conflict/);
assert.equal(canonicalCreativeContext({ b: 2, a: 1 }), canonicalCreativeContext({ a: 1, b: 2 }));

const approved: CreativeContractV2 = { ...upgraded, object_version: 2, status: "approved", supersedes_ref: { object_id: upgraded.contract_id, object_version: 1, digest: digest("c") }, approval: { actor_id: "user-1", actor_kind: "user", approved_at: "2026-08-23T00:01:00.000Z", review_digest: digest("c") } };
validateCreativeContractV2(approved);
assert.throws(() => validateCreativeContractV2({ ...approved, approval: { ...approved.approval!, actor_kind: "policy" } }), /matching approval actor/);
assert.throws(() => validateCreativeContractV2({ ...approved, provenance: { ...approved.provenance, unresolved_assumptions: ["unknown audience"] } }), /unresolved assumptions/);

const asset = `asset:sha256:${digest("d")}` as AssetId;
const pack: MaterialEvidencePackV1 = {
  schema_version: 1, pack_id: "pack-1", project_id: "project-1", object_version: 1, status: "sufficient",
  contract_ref: { object_id: "contract-1", object_version: 2, digest: digest("e") },
  evidence_refs: [{ evidence_id: "asr:1", evidence_type: "asr", evidence_version: 1, asset_id: asset, range: { start: { schema_version: 1, value: 0, timescale: 48000 }, end: { schema_version: 1, value: 48000, timescale: 48000 } }, review_status: "approved", content_digest: digest("f") }],
  moment_refs: [], event_refs: [], coverage_matrix_ref: { object_id: "coverage-1", object_version: 1, digest: digest("1") },
  sufficiency: { covered_requirement_ids: ["req-hard"], missing_requirement_ids: [], conflicting_requirement_ids: [] },
  availability: [{ asset_id: asset, original_identity: asset, permission_state: "authorized", verified_at: "2026-08-23T00:00:00.000Z" }],
  policy_snapshot: { policy_version: "local-v1", privacy_policy_ref: approved.privacy_policy_ref, rights_policy_ref: approved.rights_policy_ref },
  input_fingerprint: digest("2"), created_at: "2026-08-23T00:02:00.000Z",
  provenance: { producer: "project-host", source_version: "creative-context-v1", policy_version: "local-v1", input_refs: ["asr:1"], unresolved_assumptions: [] },
};
assertMaterialEvidencePackV1(pack);
validateMaterialEvidencePack(pack, approved);
assert.throws(() => validateMaterialEvidencePack({ ...pack, sufficiency: { covered_requirement_ids: [], missing_requirement_ids: ["req-hard"], conflicting_requirement_ids: [] } }, approved), /does not cover hard requirements/);
assert.throws(() => validateMaterialEvidencePack({ ...pack, availability: [{ ...pack.availability[0]!, permission_state: "denied" }] }, approved), /unavailable or unauthorized/);
assert.throws(() => validateMaterialEvidencePack({ ...pack, evidence_refs: [{ ...pack.evidence_refs[0]!, range: { start: { schema_version: 1, value: 10, timescale: 1 }, end: { schema_version: 1, value: 9, timescale: 1 } } }] }, approved), /valid RationalTime range/);
assert.throws(() => validateMaterialEvidencePack({ ...pack, expires_at: pack.created_at }, approved), /expiry is invalid/);
console.log("creative context contract and sufficiency property checks passed");
