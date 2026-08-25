import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { sourceRange, type AssetId } from "../../packages/core/media-identity/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ave-stage2-workspace-"));
const host = new ProjectHostSession();
try {
  await host.create(root);
  const initial = await host.readStage2Workspace() as any;
  assert.equal(initial.schema_version, 1);
  assert.equal(initial.project_id, host.status().project);
  assert.equal(initial.timeline, null);
  assert.equal(initial.contract, null);
  for (const key of ["contracts", "evidence", "material_packs", "directions", "stories", "approved_plans", "decisions", "intents", "feedback", "executions"] as const) assert.deepEqual(initial[key], []);
  assert.match(initial.workspace_digest, /^[0-9a-f]{64}$/);

  const unsafeStart = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
  const asset = `asset:sha256:${"a".repeat(64)}` as AssetId;
  await host.initializeTimeline([{ track_id: "video-main", kind: "video", clips: [{ clip_id: "unsafe-range", source: sourceRange(asset, unsafeStart, unsafeStart + 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }]);
  const versioned = await host.readStage2Workspace() as any;
  assert.deepEqual(versioned.timeline, { version: 0, track_count: 1, clip_count: 1, editable_targets: [], unavailable_editable_targets: [{ track_id: "video-main", clip_id: "unsafe-range", reason: "rational_time_out_of_safe_number_range" }] });
  assert.doesNotMatch(JSON.stringify(versioned), /900719925474099[23]/, "unsafe RationalTime must not be rounded into the Product workspace");
  assert.notEqual(versioned.workspace_digest, initial.workspace_digest);
  assert.doesNotMatch(JSON.stringify(versioned), /project\.sqlite|output_path|location_ref|[A-Z]:\\/i);

  const projectId = host.status().project;
  const expectedDigest = versioned.workspace_digest;
  await host.close();
  await host.open(root);
  const reopened = await host.readStage2Workspace() as any;
  assert.equal(reopened.project_id, projectId);
  assert.equal(reopened.workspace_digest, expectedDigest);
  assert.deepEqual(reopened.timeline, versioned.timeline);
} finally {
  await host.close();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

console.log("Stage 2 Product workspace Host snapshot check passed");
