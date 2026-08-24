import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { commitTimeline, createProject, openProject, listCreativeContractVersions, listMaterialEvidencePacks, readCreativeContractVersion, readEvidence, readLatestTimeline, readMaterialEvidencePack, registerCreativeContractVersion, registerEvidence, registerMaterialEvidencePack } from "../../packages/platform/project-storage/src/project-storage.mjs";

const root = await mkdtemp(resolve(tmpdir(), "ave-creative-context-storage-"));
const legacyRoot = await mkdtemp(resolve(tmpdir(), "ave-creative-context-v20-"));
const digest = (character) => character.repeat(64);
try {
  const session = await createProject(root);
  const projectId = session.manifest.project_id;
  const contract = { schema_version: 2, contract_id: "contract-storage", project_id: projectId, object_version: 1, status: "review", creator_goal: "Storage test", audience: ["creator"], platforms: ["local"], target_duration: { schema_version: 1, value: 30, timescale: 1 }, requirements: [], voice_and_identity: { desired_traits: [], forbidden_misrepresentation: [] }, privacy_policy_ref: { object_id: "privacy", object_version: 1, digest: digest("a") }, rights_policy_ref: { object_id: "rights", object_version: 1, digest: digest("b") }, approval_policy: { mode: "explicit_user", actor_kind: "user" }, protected_refs: [], allowed_transformations: [], forbidden_outcomes: [], created_at: "2026-08-23T00:00:00.000Z", provenance: { producer: "user", source_id: "storage-test", policy_version: "v1", input_refs: [], unresolved_assumptions: [] } };
  const first = registerCreativeContractVersion(session, projectId, contract);
  assert.equal(first.content_digest, first.object_hash);
  assert.equal(registerCreativeContractVersion(session, projectId, contract).object_hash, first.object_hash);
  assert.throws(() => registerCreativeContractVersion(session, projectId, { ...contract, creator_goal: "conflict" }), /version conflict/);
  const pack = { schema_version: 1, pack_id: "pack-storage", project_id: projectId, object_version: 1, status: "insufficient", contract_ref: { object_id: contract.contract_id, object_version: 1, digest: first.object_hash }, evidence_refs: [{ evidence_id: "evidence-storage", evidence_type: "asr", evidence_version: 1, asset_id: `asset:sha256:${digest("d")}`, range: { start: { schema_version: 1, value: 0, timescale: 1 }, end: { schema_version: 1, value: 1, timescale: 1 } }, review_status: "approved", content_digest: digest("e") }], moment_refs: [], event_refs: [], coverage_matrix_ref: { object_id: "coverage-storage", object_version: 1, digest: digest("f") }, sufficiency: { covered_requirement_ids: [], missing_requirement_ids: ["req-missing"], conflicting_requirement_ids: [] }, availability: [{ asset_id: `asset:sha256:${digest("d")}`, original_identity: `asset:sha256:${digest("d")}`, permission_state: "authorized", verified_at: "2026-08-23T00:00:00.000Z" }], policy_snapshot: { policy_version: "v1", privacy_policy_ref: contract.privacy_policy_ref, rights_policy_ref: contract.rights_policy_ref }, input_fingerprint: digest("1"), created_at: "2026-08-23T00:01:00.000Z", provenance: { producer: "project-host", source_version: "1", policy_version: "v1", input_refs: [], unresolved_assumptions: [] } };
  const storedPack = registerMaterialEvidencePack(session, projectId, pack);
  assert.equal(registerMaterialEvidencePack(session, projectId, pack).object_hash, storedPack.object_hash);
  assert.throws(() => registerMaterialEvidencePack(session, projectId, { ...pack, pack_id: "other", created_at: "2026-08-23T00:02:00.000Z" }), /input fingerprint conflict/);
  assert.equal(listCreativeContractVersions(session, projectId, contract.contract_id).length, 1);
  assert.equal(listMaterialEvidencePacks(session, projectId).length, 1);
  await session.close();
  const reopened = await openProject(root);
  assert.equal(readCreativeContractVersion(reopened, projectId, contract.contract_id, 1).object_hash, first.object_hash);
  assert.equal(readMaterialEvidencePack(reopened, projectId, pack.pack_id, 1).object_hash, storedPack.object_hash);
  assert.equal(reopened.db.prepare("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = 21").get().count, 1);
  await reopened.close();
  const legacy = await createProject(legacyRoot);
  const legacyProjectId = legacy.manifest.project_id;
  commitTimeline(legacy, legacyProjectId, { version: 0, tracks: [] }, { type: "legacy-v20-timeline" }, 0);
  registerEvidence(legacy, legacyProjectId, { evidence_id: "asr:legacy-v20", analysis_type: "asr", asset_id: `asset:sha256:${digest("9")}`, start_pts: 0, end_pts: 10, text: "legacy evidence survives" });
  const legacyObjectRefs = legacy.db.prepare("SELECT COUNT(*) AS count FROM object_refs").get().count;
  legacy.db.exec("DROP TABLE material_evidence_packs; DROP TABLE creative_contract_heads; DROP TABLE creative_contract_versions; DELETE FROM schema_migrations WHERE version = 21;");
  await legacy.close();
  const migrated = await openProject(legacyRoot);
  assert.equal(migrated.db.prepare("SELECT COUNT(*) AS count FROM schema_migrations WHERE version = 21").get().count, 1);
  assert.equal(migrated.db.prepare("SELECT COUNT(*) AS count FROM projects WHERE project_id = ?").get(legacyProjectId).count, 1, "v20 project data must survive migration 0021");
  assert.ok(readLatestTimeline(migrated, legacyProjectId));
  assert.equal(readEvidence(migrated, "asr:legacy-v20").content, "legacy evidence survives");
  assert.equal(migrated.db.prepare("SELECT COUNT(*) AS count FROM object_refs").get().count, legacyObjectRefs);
  assert.equal(migrated.db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name IN ('creative_contract_versions', 'creative_contract_heads', 'material_evidence_packs')").get().count, 3);
  await migrated.close();
} finally {
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  await rm(legacyRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
console.log("creative context storage migration, idempotency and reopen checks passed");
