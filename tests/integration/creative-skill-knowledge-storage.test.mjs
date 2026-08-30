import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { builtInCreativeSkillDefinitions } from "../../packages/core/editorial-core/src/public.ts";
import { createProject, openProject, registerCreativeContractVersion, readCreativeContractVersion, registerEvidence, readEvidenceObject, registerMaterialEvidencePack, readMaterialEvidencePack, registerMediaAsset, readMediaAsset, registerCreativeSkillDefinition, readCreativeSkillDefinition, listCreativeSkillDefinitions, readCreativeSkillDefinitionControl, registerSkillEvaluation, readSkillEvaluation, readSkillEvaluationByInput, listSkillEvaluations } from "../../packages/platform/project-storage/src/public.ts";

const root = await mkdtemp(resolve(tmpdir(), "ave-creative-skill-storage-"));
const deleteRoot = await mkdtemp(resolve(tmpdir(), "ave-creative-skill-delete-"));
let session;
let deleteSession;
try {
  session = await createProject(root);
  const projectId = session.manifest.project_id;
  assert.equal(session.db.prepare("SELECT format_version FROM project_format").get().format_version, 2);
  const digest = (character) => character.repeat(64);
  const assetId = `asset:sha256:${digest("d")}`;
  registerMediaAsset(session, projectId, { asset_id: assetId, algorithm: "sha256", digest: digest("d"), byte_length: 10, stream_facts: { duration_pts: 48000, timescale: 48000 } });
  registerEvidence(session, projectId, { evidence_id: "asr:migration", analysis_type: "asr", asset_id: assetId, start_pts: 0, end_pts: 48000, text: "migration evidence" });
  const priorContract = { schema_version: 2, contract_id: "contract-migration", project_id: projectId, object_version: 1, status: "approved", approval: { review_digest: digest("a"), actor_id: "user", approved_at: "2026-08-24T00:00:00Z" } };
  const storedContract = registerCreativeContractVersion(session, projectId, priorContract);
  const priorPack = { schema_version: 1, pack_id: "pack-migration", project_id: projectId, object_version: 1, status: "sufficient", contract_ref: { object_id: priorContract.contract_id, object_version: 1, digest: storedContract.object_hash }, evidence_refs: [], coverage_matrix_ref: { object_id: "coverage-migration", object_version: 1, digest: digest("c") }, sufficiency: { covered_requirement_ids: [], missing_requirement_ids: [], conflicting_requirement_ids: [] }, availability: [], policy_snapshot: { policy_version: "knowledge-v1", privacy_policy_ref: { object_id: "privacy", object_version: 1, digest: digest("e") }, rights_policy_ref: { object_id: "rights", object_version: 1, digest: digest("f") } }, input_fingerprint: digest("b"), created_at: "2026-08-24T00:01:00Z", provenance: { producer: "project-host", source_version: "creative-context-v1", policy_version: "knowledge-v1", input_refs: [], unresolved_assumptions: [] } };
  const storedPack = registerMaterialEvidencePack(session, projectId, priorPack);
  const priorObjectRefCount = session.db.prepare("SELECT COUNT(*) AS count FROM object_refs").get().count;
  await session.close();
  session = undefined;

  session = await openProject(root);
  assert.equal(session.db.prepare("SELECT format_version FROM project_format").get().format_version, 2);
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM projects WHERE project_id = ?").get(projectId).count, 1, "current project data must survive reopen");
  assert.equal(readMediaAsset(session, projectId, assetId).digest, digest("d"));
  assert.equal(readEvidenceObject(session, "asr:migration").value.text, "migration evidence");
  assert.equal(readCreativeContractVersion(session, projectId, priorContract.contract_id, 1).object_hash, storedContract.object_hash);
  assert.equal(readMaterialEvidencePack(session, projectId, priorPack.pack_id, 1).object_hash, storedPack.object_hash);
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM object_refs").get().count, priorObjectRefCount, "reopen must preserve current object refs");
  const definition = builtInCreativeSkillDefinitions[0];
  const pinned = registerCreativeSkillDefinition(session, projectId, definition);
  assert.equal(pinned.definition_digest, definition.definition_digest);
  assert.equal(registerCreativeSkillDefinition(session, projectId, definition).object_hash, pinned.object_hash);
  assert.throws(() => registerCreativeSkillDefinition(session, projectId, { ...definition, goal: "conflicting content" }), /version conflict/);
  assert.equal(readCreativeSkillDefinition(session, projectId, definition.skill_id, definition.skill_version).object_hash, pinned.object_hash);
  assert.equal(listCreativeSkillDefinitions(session, projectId).length, 1);

  const evaluation = { schema_version: 1, evaluation_id: "evaluation-storage", project_id: projectId, object_version: 1, definition_ref: { object_id: definition.skill_id, object_version: definition.skill_version, digest: definition.definition_digest }, contract_ref: { object_id: "contract-storage", object_version: 1, digest: digest("a") }, material_pack_ref: { object_id: "pack-storage", object_version: 1, digest: digest("b") }, input_fingerprint: digest("c"), context_tags: ["personal-story"], result: "applicable", required_evidence: ["reaction"], available_evidence: ["asr:1"], parameter_values: { intensity: "moderate" }, matched_rule_ids: ["reaction-first"], conflict_ids: [], score: 1, confidence: 1, confidence_basis: "1 of 1 required evidence groups is satisfied by approved Evidence.", reason: "Evidence and context match.", risks: [], alternatives: [], output_kinds: ["direction_proposal"], evaluated_at: "2026-08-24T00:04:00.000Z", provenance: { producer: "project-host", evaluator_version: "skill-evaluator-v1", policy_version: "knowledge-v1", input_refs: [digest("a"), digest("b")], unresolved_assumptions: [] } };
  const stored = registerSkillEvaluation(session, projectId, evaluation);
  assert.equal(registerSkillEvaluation(session, projectId, evaluation).object_hash, stored.object_hash);
  assert.throws(() => registerSkillEvaluation(session, projectId, { ...evaluation, evaluation_id: "different-id", reason: "conflicting input identity" }), /input fingerprint conflict/);
  assert.equal(readSkillEvaluation(session, projectId, evaluation.evaluation_id, 1).object_hash, stored.object_hash);
  assert.equal(readSkillEvaluationByInput(session, projectId, evaluation.input_fingerprint).object_hash, stored.object_hash);
  assert.equal(listSkillEvaluations(session, projectId).length, 1);
  await session.close();
  session = undefined;

  session = await openProject(root);
  assert.equal(readCreativeSkillDefinition(session, projectId, definition.skill_id, 1).object_hash, pinned.object_hash);
  assert.equal(readCreativeSkillDefinitionControl(session, projectId, definition.skill_id, 1).availability, "active");
  assert.equal(readSkillEvaluation(session, projectId, evaluation.evaluation_id, 1).object_hash, stored.object_hash);
  assert.equal(session.db.prepare("SELECT COUNT(*) AS count FROM object_refs WHERE object_type IN ('creative_skill_definition','skill_evaluation')").get().count, 2);
  assert.equal(session.db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  await session.close();
  session = undefined;

  deleteSession = await createProject(deleteRoot);
  const deleteProjectId = deleteSession.manifest.project_id;
  registerCreativeSkillDefinition(deleteSession, deleteProjectId, definition);
  assert.equal(readCreativeSkillDefinitionControl(deleteSession, deleteProjectId, definition.skill_id, 1).availability, "active");
  deleteSession.db.prepare("DELETE FROM creative_skill_definitions WHERE project_id = ? AND skill_id = ? AND skill_version = 1").run(deleteProjectId, definition.skill_id);
  assert.equal(deleteSession.db.prepare("SELECT COUNT(*) AS count FROM creative_skill_definition_controls WHERE project_id = ?").get(deleteProjectId).count, 0);
  assert.equal(deleteSession.db.prepare("SELECT COUNT(*) AS count FROM creative_skill_definitions WHERE project_id = ?").get(deleteProjectId).count, 0);
  assert.equal(deleteSession.db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  await deleteSession.close();
  deleteSession = undefined;
} finally {
  await session?.close().catch(() => undefined);
  await deleteSession?.close().catch(() => undefined);
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  await rm(deleteRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
console.log("creative skill knowledge v2 baseline, idempotency, object refs and reopen checks passed");
