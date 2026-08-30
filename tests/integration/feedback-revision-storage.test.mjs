import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject, registerFeedbackDiagnosis } from "../../packages/platform/project-storage/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-feedback-storage-"));
let session;
try {
  session = await createProject(root); const projectId = session.manifest.project_id;
  assert.equal(session.db.prepare("SELECT format_version FROM project_format").get().format_version, 2);
  assert.ok(session.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'feedback_diagnoses'").get());
  const diagnosis = { schema_version: 2, diagnosis_id: "missing-execution", object_version: 1, status: "reviewed", category: "pacing", feedback: { text: "trim", digest: "a".repeat(64) }, base_execution_ref: { object_id: "missing", object_version: 1, digest: "b".repeat(64) }, base_timeline_ref: { version: 1, digest: "c".repeat(64) }, target: { track_id: "v1", clip_id: "clip-1", original_source: { asset_id: `asset:sha256:${"d".repeat(64)}`, start: { schema_version: 1, value: 0, timescale: 30 }, end: { schema_version: 1, value: 60, timescale: 30 } }, proposed_source: { asset_id: `asset:sha256:${"d".repeat(64)}`, start: { schema_version: 1, value: 0, timescale: 30 }, end: { schema_version: 1, value: 30, timescale: 30 } }, operation: "trim_semantic_range" }, authority_refs: { approved_story_ref: { object_id: "plan", object_version: 1, digest: "e".repeat(64) }, decision_refs: [{ object_id: "decision", object_version: 1, digest: "f".repeat(64) }], evidence_refs: [{ object_id: "evidence", object_version: 1, digest: "1".repeat(64) }], contract_ref: { object_id: "contract", object_version: 1, digest: "2".repeat(64) }, capability_snapshot_ref: { object_id: "capability", object_version: 1, digest: "3".repeat(64) } }, affected_scope: ["clip:clip-1"], reason: "bounded trim", alternatives: ["retain"], confidence: { score: 1, basis: ["exact"] }, input_fingerprint: "4".repeat(64), created_at: "2026-08-24T04:00:00Z", provenance: { producer: "project-host", source_version: "feedback-diagnosis-v2", policy_version: "feedback-policy-v1", input_refs: ["missing@1", "timeline@1"] } };
  const before = { diagnoses: session.db.prepare("SELECT COUNT(*) count FROM feedback_diagnoses").get().count, refs: session.db.prepare("SELECT COUNT(*) count FROM object_refs").get().count, events: session.db.prepare("SELECT COUNT(*) count FROM project_events").get().count };
  assert.throws(() => registerFeedbackDiagnosis(session, projectId, diagnosis), /execution is missing or rebound/);
  assert.deepEqual({ diagnoses: session.db.prepare("SELECT COUNT(*) count FROM feedback_diagnoses").get().count, refs: session.db.prepare("SELECT COUNT(*) count FROM object_refs").get().count, events: session.db.prepare("SELECT COUNT(*) count FROM project_events").get().count }, before, "failed feedback persistence must write nothing");
  await session.close(); session = undefined;
  session = await openProject(root); assert.equal(session.db.prepare("SELECT format_version FROM project_format").get().format_version, 2); assert.ok(session.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'feedback_diagnosis_edges'").get());
} finally { await session?.close().catch(() => undefined); await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }

console.log("Feedback diagnosis v2 baseline, fail-closed zero-write and reopen checks passed");
