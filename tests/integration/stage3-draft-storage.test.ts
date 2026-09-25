import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createCommitPlan, type Timeline } from "../../packages/core/timeline-core/src/public.js";
import { commitTimelinePlan, creationStateArtifact, readCreationState, registerCreationState } from "../../packages/platform/project-storage/src/public.js";
import { assertCreationCommit, beginCreation, cancelCreation, creationDigest, CreationError, saveCreationDraft, selectCreationDraft, startCreationRun, type CreationState, type DraftVersion } from "../../packages/platform/project-host/src/stage3-request.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-stage3-storage-"));
let host: ProjectHostSession | undefined;
const now = "2026-09-18T01:00:00Z";
try {
  host = new ProjectHostSession(); await host.create(root);
  host.initializeTimeline([{ track_id: "main", kind: "video", clips: [] }]);
  const session = (host as any).session, project = session.manifest.project_id;
  const fixture = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")) as CreationState;
  const initial = beginCreation({ ...fixture.authorization, project_id: project }, 0, now);
  const first = registerCreationState(session, project, initial, null);
  assert.equal(registerCreationState(session, project, initial, null).object_hash, first.object_hash);
  const running = startCreationRun(initial, "run-1", 0, "1".repeat(64), null, now);
  const current = registerCreationState(session, project, running, first.object_hash);
  const ticket = running.active_run!;
  const base = host.readTimelineSnapshot() as Timeline;
  const prepared = createCommitPlan(base, [{ type: "set_track_properties", track_id: "main", properties: { enabled: false } }]);
  const draft: DraftVersion = { draft_id: "draft-1", parent_draft_id: null, timeline_version: 1, base_timeline_version: 0, request_id: ticket.request_id, revision: 1, source: { kind: "model", run_id: ticket.run_id, profile: null }, effect_digest: creationDigest(prepared.plan.commands), input_digest: ticket.input_digest, edit_ir_id: "test-ir" };
  const saved = saveCreationDraft(running, ticket, draft, 0, null, now);
  const irArtifact = { object_ref_id: `${project}:edit-ir:test-ir`, object_type: "edit_ir", relation_key: "test-ir", version: 1, value: { edit_ir_id: "test-ir", base_version: 0, commands: prepared.plan.commands } };
  const artifacts = [creationStateArtifact(saved), irArtifact];
  const guard = { request_id: ticket.request_id, expected_hash: current.object_hash, validate: (state: CreationState) => assertCreationCommit(state, ticket, 0, null, now) };
  const snapshot = () => JSON.stringify({ versions: session.db.prepare("SELECT * FROM timeline_versions").all(), commands: session.db.prepare("SELECT * FROM timeline_commands").all(), events: session.db.prepare("SELECT * FROM project_events").all(), refs: session.db.prepare("SELECT * FROM object_refs").all() });
  const beforeFailure = snapshot();
  assert.throws(() => registerCreationState(session, project, { ...running, sequence: running.sequence + 1, authorization: { ...running.authorization, model: "unauthorized" }, active_run: null, status: "received" }, current.object_hash), /new request required to change authorization/);
  assert.throws(() => registerCreationState(session, project, saved, current.object_hash), /only an atomic Timeline commit may append a draft/);
  assert.throws(() => commitTimelinePlan(session, project, prepared.timeline, prepared.plan, null, [creationStateArtifact(saved)], guard), /REQUEST_DRAFT_BINDING_INVALID/);
  assert.equal(snapshot(), beforeFailure);
  session.db.exec("CREATE TEMP TRIGGER fail_stage3 BEFORE INSERT ON timeline_versions WHEN NEW.timeline_version=1 BEGIN SELECT RAISE(ABORT, 'INJECTED_DRAFT_DISK_FAILURE'); END");
  assert.throws(() => commitTimelinePlan(session, project, prepared.timeline, prepared.plan, null, artifacts, guard), /INJECTED_DRAFT_DISK_FAILURE/);
  assert.equal(snapshot(), beforeFailure, "failed persistence must not leave Timeline, draft, command or event");
  assert.equal(readCreationState(session, project, ticket.request_id).object_hash, current.object_hash);
  session.db.exec("DROP TRIGGER fail_stage3");
  // Explicitly removed injected fault; this is a new verification, not a retry-until-green.
  commitTimelinePlan(session, project, prepared.timeline, prepared.plan, null, artifacts, guard);
  assert.equal((host.readTimelineSnapshot() as Timeline).version, 1);
  const committed = readCreationState(session, project, ticket.request_id);
  const viewed = selectCreationDraft(committed.value, draft.draft_id, "viewed");
  registerCreationState(session, project, viewed, committed.object_hash);
  await host.close(); host = new ProjectHostSession(); await host.open(root);
  const reopened = readCreationState((host as any).session, project, ticket.request_id);
  assert.equal(reopened.value.viewed_draft_id, draft.draft_id);
  assert.equal(reopened.value.adopted_draft_id, null);
  assert.deepEqual(reopened.value.drafts, saved.drafts);
  assert.equal((host.readTimelineSnapshot() as Timeline).version, 1);

  const session2 = (host as any).session;
  const cancelled = cancelCreation(reopened.value);
  registerCreationState(session2, project, cancelled, reopened.object_hash);
  const beforeStale = JSON.stringify(session2.db.prepare("SELECT * FROM project_events").all());
  assert.throws(() => commitTimelinePlan(session2, project, prepared.timeline, prepared.plan, null, [creationStateArtifact(saved)], guard), /REQUEST_STATE_STALE/);
  assert.equal(JSON.stringify(session2.db.prepare("SELECT * FROM project_events").all()), beforeStale);
  assert.throws(() => assertCreationCommit(cancelled, ticket, 1, null, now), (error: unknown) => error instanceof CreationError && error.code === "REQUEST_CANCELLED");
  console.log("Stage3 atomic draft persistence, failure rollback, cancellation and real SQLite reopen passed (fixtures only)");
} finally {
  await host?.close();
  if (typeof global.gc === "function") global.gc();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
