import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-stage2-workspace-"));
const host = new ProjectHostSession();
try {
  await host.create(root);
  const initial = host.readStage2Workspace() as any;
  assert.equal(initial.schema_version, 1);
  assert.equal(initial.project_id, host.status().project);
  assert.equal(initial.timeline, null);
  assert.equal(initial.contract, null);
  for (const key of ["contracts", "evidence", "material_packs", "directions", "stories", "approved_plans", "decisions", "intents", "feedback", "executions"] as const) assert.deepEqual(initial[key], []);
  assert.match(initial.workspace_digest, /^[0-9a-f]{64}$/);

  await host.initializeTimeline([{ track_id: "video-main", kind: "video", clips: [] }]);
  const versioned = host.readStage2Workspace() as any;
  assert.deepEqual(versioned.timeline, { version: 0, track_count: 1, clip_count: 0, editable_targets: [] });
  assert.notEqual(versioned.workspace_digest, initial.workspace_digest);
  assert.doesNotMatch(JSON.stringify(versioned), /project\.sqlite|output_path|location_ref|[A-Z]:\\/i);

  const projectId = host.status().project;
  const expectedDigest = versioned.workspace_digest;
  await host.close();
  await host.open(root);
  const reopened = host.readStage2Workspace() as any;
  assert.equal(reopened.project_id, projectId);
  assert.equal(reopened.workspace_digest, expectedDigest);
  assert.deepEqual(reopened.timeline, versioned.timeline);
} finally {
  await host.close();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

console.log("Stage 2 Product workspace Host snapshot check passed");
