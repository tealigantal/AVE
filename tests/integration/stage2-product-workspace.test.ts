import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { approveEvidence, readEvidenceObject, registerCreativeContractVersion, registerEvidence, registerRender } from "../../packages/platform/project-storage/src/public.js";
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

  await host.close();
  const lockedRoot = await mkdtemp(resolve(tmpdir(), "ave-stage2-locked-targets-"));
  const lockedHost = new ProjectHostSession();
  try {
    await lockedHost.create(lockedRoot);
    const safeAsset = `asset:sha256:${"c".repeat(64)}` as AssetId;
    await lockedHost.initializeTimeline([
      { track_id: "locked-track", kind: "video", locked: true, clips: [{ clip_id: "locked-clip", source: sourceRange(safeAsset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] },
      { track_id: "range-track", kind: "video", locks: [{ lock_id: "range-lock", start: 5n, end: 20n, owner: "user" }], clips: [{ clip_id: "range-clip", source: sourceRange(safeAsset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] },
      { track_id: "open-track", kind: "video", clips: [{ clip_id: "open-clip", source: sourceRange(safeAsset, 0n, 30n, 30n), timeline_start: 30n, timeline_duration: 30n }] },
    ]);
    const lockedWorkspace = await lockedHost.readStage2Workspace() as any;
    assert.deepEqual(lockedWorkspace.timeline.editable_targets.map((item: any) => item.clip_id), ["open-clip"]);
    assert.deepEqual(lockedWorkspace.timeline.unavailable_editable_targets, [
      { track_id: "locked-track", clip_id: "locked-clip", reason: "track_locked" },
      { track_id: "range-track", clip_id: "range-clip", reason: "range_locked" },
    ]);
  } finally {
    await lockedHost.close();
    await rm(lockedRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }

  await host.open(root);

  const projectId = host.status().project;
  const expectedDigest = versioned.workspace_digest;
  await host.close();
  await host.open(root);
  const reopened = await host.readStage2Workspace() as any;
  assert.equal(reopened.project_id, projectId);
  assert.equal(reopened.workspace_digest, expectedDigest);
  assert.deepEqual(reopened.timeline, versioned.timeline);

  const evidenceCandidate = { evidence_id: "workspace-digest-evidence", analysis_type: "scene", asset_id: asset, start_pts: 0, end_pts: 30, timescale: 30, evidence_version: 1, review_status: "candidate", label: "visible candidate Evidence" };
  registerEvidence((host as any).session, projectId, evidenceCandidate);
  const candidateRow = readEvidenceObject((host as any).session, evidenceCandidate.evidence_id) as any, candidateWorkspace = await host.readStage2Workspace() as any;
  assert.equal(candidateWorkspace.evidence.find((item: any) => item.object_id === evidenceCandidate.evidence_id)?.status, "candidate"); assert.notEqual(candidateWorkspace.workspace_digest, reopened.workspace_digest, "registering visible Evidence must invalidate the prior workspace token");
  approveEvidence((host as any).session, projectId, evidenceCandidate.evidence_id, candidateRow.object_hash, { approval_id: "storage-fixture-approval", actor_id: "storage-fixture-user", approved_at: "2026-08-27T00:00:00Z", reason: "prove visible Evidence status identity" });
  const approvedEvidenceWorkspace = await host.readStage2Workspace() as any; assert.equal(approvedEvidenceWorkspace.evidence.find((item: any) => item.object_id === evidenceCandidate.evidence_id)?.status, "approved"); assert.notEqual(approvedEvidenceWorkspace.workspace_digest, candidateWorkspace.workspace_digest, "approving visible Evidence must invalidate its candidate token"); assert.deepEqual(await host.readStage2Workspace(), approvedEvidenceWorkspace, "stable Evidence identity ordering must make repeated workspace reads deterministic");
  await host.close(); await host.open(root); assert.deepEqual(await host.readStage2Workspace(), approvedEvidenceWorkspace, "the complete Evidence-bound workspace and digest must survive reopen exactly");

  const renderHeaderPath = resolve(root, "render-header-only.mp4"); await writeFile(renderHeaderPath, Buffer.from("header-only render"));
  registerRender((host as any).session, projectId, { render_id: "render-header-only", original_path: renderHeaderPath, proxy_path: renderHeaderPath, preview_path: renderHeaderPath, master_path: renderHeaderPath, qc_report: { schema_version: 1, render_id: "render-header-only", status: "passed", issues: [] } });
  const renderHeaderWorkspace = await host.readStage2Workspace() as any; assert.equal(renderHeaderWorkspace.review.render.render_id, "render-header-only"); assert.equal(renderHeaderWorkspace.review.render_results.length, 0); assert.notEqual(renderHeaderWorkspace.workspace_digest, approvedEvidenceWorkspace.workspace_digest, "a visible Render header without Render Results must invalidate the prior workspace token");

  const previewBytes = Buffer.from("bound current preview bytes"), previewPath = resolve(root, "preview.mp4"), previewHash = createHash("sha256").update(previewBytes).digest("hex"), boundDigest = "b".repeat(64);
  await writeFile(previewPath, previewBytes);
  registerRender((host as any).session, projectId, { render_id: "render-bound-preview", original_path: previewPath, proxy_path: previewPath, preview_path: previewPath, master_path: previewPath, qc_report: { schema_version: 1, render_id: "render-bound-preview", status: "passed", issues: [] } });
  const boundWorkspace = { workspace_digest: boundDigest, timeline: { version: 1 }, review: { render: { render_id: "render-bound-preview", timeline_version: 1, binding_status: "current", bound_execution_id: "execution-bound-preview" }, render_results: [{ render_id: "render-bound-preview", target: "preview", timeline_version: 1, output_hash: previewHash }] } };
  (host as any).readStage2Workspace = async () => boundWorkspace;
  const currentPreview = await host.readCurrentStage2Preview(boundDigest) as any; assert.deepEqual(Buffer.from(currentPreview.bytes), previewBytes);
  await writeFile(previewPath, Buffer.from("corrupted current preview bytes"));
  await assert.rejects(() => host.readCurrentStage2Preview(boundDigest), /PRODUCT_PREVIEW_HASH_MISMATCH/);
  await writeFile(previewPath, previewBytes);
  const assertPostReadRebind = async (afterWorkspace: any) => { let readCount = 0; (host as any).readStage2Workspace = async () => readCount++ === 0 ? boundWorkspace : afterWorkspace; await assert.rejects(() => host.readCurrentStage2Preview(boundDigest), /PRODUCT_WORKSPACE_STALE/); assert.equal(readCount, 2); };
  await assertPostReadRebind({ ...boundWorkspace, workspace_digest: "c".repeat(64) });
  await assertPostReadRebind({ ...boundWorkspace, review: { ...boundWorkspace.review, render: { ...boundWorkspace.review.render, render_id: "render-rebound-after-read" } } });
  await assertPostReadRebind({ ...boundWorkspace, review: { ...boundWorkspace.review, render_results: [{ ...boundWorkspace.review.render_results[0], output_hash: "d".repeat(64) }] } });
} finally {
  await host.close();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

const ambiguousRoot = await mkdtemp(resolve(tmpdir(), "ave-stage2-contract-authority-"));
const ambiguousHost = new ProjectHostSession();
try {
  await ambiguousHost.create(ambiguousRoot);
  const session = (ambiguousHost as any).session, projectId = session.manifest.project_id;
  registerCreativeContractVersion(session, projectId, { schema_version: 2, project_id: projectId, contract_id: "contract-a", object_version: 1, status: "review", created_at: "2026-08-25T00:00:00Z" });
  registerCreativeContractVersion(session, projectId, { schema_version: 2, project_id: projectId, contract_id: "contract-b", object_version: 1, status: "review", created_at: "2026-08-25T00:00:01Z" });
  await assert.rejects(() => ambiguousHost.readStage2Workspace(), /PRODUCT_CONTRACT_AUTHORITY_AMBIGUOUS/);
} finally {
  await ambiguousHost.close();
  await rm(ambiguousRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

console.log("Stage 2 Product workspace Host snapshot check passed");
