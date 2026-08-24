import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, listEditorialArtifactEdges, readEditorialArtifact, registerEditorialArtifact } from "../../packages/platform/project-storage/src/project-storage.mjs";

const root = await mkdtemp(resolve(tmpdir(), "ave-story-storage-"));
let session;
try {
  session = await createProject(root); const projectId = session.manifest.project_id, fixed = (value) => value.repeat(64);
  const snapshot = { schema_version: 1, snapshot_id: "snapshot-storage", object_version: 1, capabilities: ["semantic-evidence-selection"], created_at: "2026-08-24T00:00:00Z", producer: "project-host", source_version: "edit-intent-generator-v1", policy_version: "story-policy-v1", input_fingerprint: fixed("e") };
  const first = registerEditorialArtifact(session, projectId, "capability_snapshot", snapshot), retry = registerEditorialArtifact(session, projectId, "capability_snapshot", snapshot); assert.equal(first.object_hash, retry.object_hash); assert.deepEqual(readEditorialArtifact(session, projectId, "capability_snapshot", snapshot.snapshot_id, 1).value, snapshot); assert.deepEqual(listEditorialArtifactEdges(session, projectId, "capability_snapshot", snapshot.snapshot_id, 1), []); const before = session.db.prepare("SELECT COUNT(*) count FROM object_refs").get().count;
  assert.throws(() => registerEditorialArtifact(session, projectId, "capability_snapshot", { ...snapshot, capabilities: [] }), /input fingerprint conflict/); assert.equal(session.db.prepare("SELECT COUNT(*) count FROM object_refs").get().count, before);
  const missingDirection = { schema_version: 1, direction_id: "missing-target", object_version: 1, status: "candidate", title: "direction", thesis: "thesis", contract_ref: { object_id: "contract", object_version: 1, digest: fixed("a") }, material_pack_ref: { object_id: "pack", object_version: 1, digest: fixed("b") }, skill_evaluation_refs: [{ object_id: "evaluation", object_version: 1, digest: fixed("c") }], duration_feasibility_ref: { object_id: "duration", object_version: 1, digest: fixed("d") }, expected_benefits: ["benefit"], risks: [], alternatives: [], confidence: { score: 1, basis: ["basis"] }, input_fingerprint: fixed("f"), created_at: "2026-08-24T00:00:00Z", provenance: { producer: "project-host", source_version: "story-evaluator-v2", policy_version: "story-policy-v1", input_refs: [fixed("a")] } };
  assert.throws(() => registerEditorialArtifact(session, projectId, "direction_card", missingDirection), /target is missing or rebound/); assert.equal(session.db.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
} finally { await session?.close(); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
console.log("Story intelligence storage idempotency, target integrity and conflict checks passed");
