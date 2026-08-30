import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { safeMediaRows } from "../../apps/desktop/src/main/ipc/project-media-projection.js";
import { assertCanonicalStage2Timeline, ensureCanonicalStage2Timeline } from "../../apps/desktop/src/main/stage2-timeline.js";
import { createCanonicalStage2Project, openCanonicalStage2Project } from "../../apps/desktop/src/main/project-lifecycle.js";
import { createPersistentJob, openProject, readPersistentJob, startPersistentJob } from "../../packages/platform/project-storage/src/public.js";

const projectionBase = { asset_location_id: "location-safe", asset_id: "asset-safe", location_type: "original", verified_at: "2026-08-27T00:00:00.000Z", metadata: { arbitrary_private_value: "omit-me", permission_decision: { actor_id: "private-actor", approval_id: "private-approval" }, probe: { timing: { streams: { v0: { codec_type: "video", time_base: "1/90000", duration_ts: 180000, width: 1920, height: 1080, private_probe_value: "omit-me" } } } } } };
for (const permissionState of ["authorized", "denied"] as const) {
  const projected = safeMediaRows([{ ...projectionBase, metadata: { ...projectionBase.metadata, permission_state: permissionState } }])[0] as any;
  assert.deepEqual(Object.keys(projected).sort(), ["asset_id", "asset_location_id", "location_type", "metadata", "permission_state", "verified_at"]); assert.equal(projected.permission_state, permissionState); assert.deepEqual(Object.keys(projected.metadata), ["probe"]); assert.deepEqual(projected.metadata.probe.timing.streams.v0, { codec_type: "video", time_base: "1/90000", duration_ts: 180000, width: 1920, height: 1080 }); assert.equal(JSON.stringify(projected).includes("private"), false); assert.equal(JSON.stringify(projected).includes("approval"), false);
}
const absentPermissionProjection = safeMediaRows([projectionBase])[0] as any; assert.equal(Object.prototype.hasOwnProperty.call(absentPermissionProjection, "permission_state"), true); assert.equal(absentPermissionProjection.permission_state, undefined);
const visibleMediaRows = safeMediaRows([
  projectionBase,
  { ...projectionBase, asset_location_id: "proxy-safe", location_type: "proxy" },
  { ...projectionBase, asset_location_id: "immutable-internal", location_type: "immutable_original", metadata: { internal_secret: "must-not-project" } },
  { ...projectionBase, asset_location_id: "future-internal", location_type: "future_internal", metadata: { internal_secret: "must-not-project" } },
]) as any[];
assert.deepEqual(visibleMediaRows.map((row) => row.location_type), ["original", "proxy"], "the desktop Media Panel must fail closed to user-visible Original and Proxy rows");
assert.equal(JSON.stringify(visibleMediaRows).includes("internal"), false);

const fixture = resolve("tests/fixtures/generated/p0-vfr.mp4");
const root = await mkdtemp(resolve(tmpdir(), "ave-workbench-host-"));
const nonCanonicalRoot = await mkdtemp(resolve(tmpdir(), "ave-workbench-noncanonical-"));
const host = new ProjectHostSession();
const nonCanonicalHost = new ProjectHostSession();
try {
  assert.throws(() => assertCanonicalStage2Timeline({ tracks: [{ track_id: "video-reference", kind: "video", enabled: false, clips: [] }, { track_id: "video-main", kind: "video", clips: [] }] }), /PRODUCT_TIMELINE_TOPOLOGY_UNSUPPORTED/, "implicit enabled and neutral output fields are not the current topology");
  const forgedOutputTimeline = { tracks: [{ track_id: "video-reference", kind: "video", enabled: false, clips: [] }, { track_id: "video-main", kind: "video", enabled: true, locked: false, muted: false, solo: false, opacity: 1, blend_mode: "normal", clips: [{ clip_id: "forged" }], gaps: [], transitions: [], captions: [], effects: [], keyframes: [], automation_curves: [], audio_routing: [], locks: [] }] };
  await assert.rejects(() => ensureCanonicalStage2Timeline({ readTimelineSnapshot: () => forgedOutputTimeline, readStage2Workspace: async () => ({ executions: [], review: { current_execution_id: null } }) } as any), /PRODUCT_TIMELINE_OUTPUT_AUTHORITY_UNAVAILABLE/);
  const unrelatedExecutionTimeline = { ...forgedOutputTimeline, tracks: [forgedOutputTimeline.tracks[0], { ...forgedOutputTimeline.tracks[1], clips: [{ clip_id: "semantic:unrelated:clip", semantic_sidecar: { metadata: { intent_id: "intent-unrelated" } } }] }] };
  const lineageWorkspace = { review: { current_execution_id: "execution-current" }, executions: [{ execution_id: "execution-current", intent_ref: { object_id: "intent-current" } }, { execution_id: "execution-unrelated", intent_ref: { object_id: "intent-unrelated" } }] };
  await assert.rejects(() => ensureCanonicalStage2Timeline({ readTimelineSnapshot: () => unrelatedExecutionTimeline, readStage2Workspace: async () => lineageWorkspace } as any), /PRODUCT_TIMELINE_OUTPUT_AUTHORITY_UNAVAILABLE/, "an unrelated historical execution must not authorize current output clips");
  const danglingLineageWorkspace = { review: { current_execution_id: "execution-current" }, executions: [{ execution_id: "execution-current", intent_ref: { object_id: "intent-current" }, base_execution_ref: { object_id: "execution-missing" } }] };
  const currentOnlyTimeline = { ...unrelatedExecutionTimeline, tracks: [unrelatedExecutionTimeline.tracks[0], { ...unrelatedExecutionTimeline.tracks[1], clips: [{ clip_id: "semantic:current:clip", semantic_sidecar: { metadata: { intent_id: "intent-current" } } }] }] };
  await assert.rejects(() => ensureCanonicalStage2Timeline({ readTimelineSnapshot: () => currentOnlyTimeline, readStage2Workspace: async () => danglingLineageWorkspace } as any), /PRODUCT_TIMELINE_OUTPUT_AUTHORITY_UNAVAILABLE/, "a dangling base execution reference must fail closed");
  const lineageOutputTimeline = { ...unrelatedExecutionTimeline, tracks: [unrelatedExecutionTimeline.tracks[0], { ...unrelatedExecutionTimeline.tracks[1], clips: [{ clip_id: "semantic:base:clip", semantic_sidecar: { metadata: { intent_id: "intent-base" } } }, { clip_id: "semantic:current:clip", semantic_sidecar: { metadata: { intent_id: "intent-current" } } }] }] };
  const validLineageWorkspace = { review: { current_execution_id: "execution-current" }, executions: [{ execution_id: "execution-current", intent_ref: { object_id: "intent-current" }, base_execution_ref: { object_id: "execution-base" } }, { execution_id: "execution-base", intent_ref: { object_id: "intent-base" } }] };
  assert.deepEqual(await ensureCanonicalStage2Timeline({ readTimelineSnapshot: () => lineageOutputTimeline, readStage2Workspace: async () => validLineageWorkspace, status: () => ({ project: "lineage-current" }) } as any), { project: "lineage-current" });
  await createCanonicalStage2Project(host, root);
  assert.equal("listStoryPlans" in host, false);
  assert.deepEqual(host.listReviewArtifacts(), []);
  assert.deepEqual(host.listDeliveryRecords(), []);
  assert.deepEqual(host.listExports(), []);
  assert.equal(host.latestRender(), null);
  assert.equal(await host.readLatestPreview(), null);
  const imported = await host.importMedia([fixture]);
  assert.equal(imported.length, 1);
  assert.match(String((imported[0] as { asset_id: string }).asset_id), /^asset:sha256:[0-9a-f]{64}$/);
  assert.equal(host.listMedia().length, 1);
  const jobs = host.listJobs();
  assert.equal(jobs.length, 2);
  assert.ok(jobs.every((job: any) => job.state === "SUCCEEDED"));
  const media = imported[0] as any;
  const video = Object.values(media.probe.timing.streams).find((stream: any) => stream.time_base && stream.duration_ts) as any;
  const timeBase = String(video.time_base).match(/^(\d+)\/(\d+)$/);
  assert.ok(timeBase);
  const initialTimeline = host.readTimelineSnapshot() as any; assert.equal(initialTimeline.version, 0); assert.deepEqual(initialTimeline.tracks.map((track: any) => [track.track_id, track.enabled, track.clips.length]), [["video-reference", false, 0], ["video-main", true, 0]]); const initialOutput = initialTimeline.tracks[1]; assert.equal(initialOutput.locked, false); assert.equal(initialOutput.muted, false); assert.equal(initialOutput.opacity, 1); assert.equal(initialOutput.blend_mode, "normal"); for (const key of ["gaps", "transitions", "captions", "effects", "keyframes", "automation_curves", "audio_routing", "locks"]) assert.deepEqual(initialOutput[key], []);
  const source = { asset_id: media.asset_id, start_pts: 0n, end_pts: BigInt(video.duration_ts), timescale: BigInt(timeBase![2]) };
  host.applyTimelineCommand({ type: "add_clip", track_id: "video-reference", clip: { clip_id: "clip-workbench", source, timeline_start: 0n, timeline_duration: source.end_pts, media_kind: "video" } }, 0);
  host.applyTimelineCommand({ type: "move_clip", track_id: "video-reference", clip_id: "clip-workbench", timeline_start: 2n }, 1);
  host.applyTimelineCommand({ type: "trim_source", track_id: "video-reference", clip_id: "clip-workbench", source: { ...source, end_pts: source.end_pts - 1n } }, 2);
  const timeline = host.readTimelineSnapshot() as any;
  assert.equal(timeline.version, 3);
  assert.equal(timeline.tracks[0].enabled, false); assert.equal(timeline.tracks[0].clips[0].timeline_start, 2n);
  assert.equal(timeline.tracks[0].clips[0].source.end_pts, source.end_pts - 1n); assert.equal(timeline.tracks[1].enabled, true); assert.equal(timeline.tracks[1].clips.length, 0);
  const diff = host.readTimelineDiff() as any;
  assert.deepEqual(diff.added_clip_ids, []);
  assert.deepEqual(diff.removed_clip_ids, []);
  assert.deepEqual(diff.changed_clip_ids, ["clip-workbench"]);
  const projectId = host.status().project;
  await host.close();
  await openCanonicalStage2Project(host, root);
  assert.equal(host.listMedia().length, 1);
  assert.equal(host.listJobs().length, 2);
  assert.equal((host.readTimelineSnapshot() as any).version, 3);
  assert.deepEqual((host.readTimelineSnapshot() as any).tracks.map((track: any) => [track.track_id, track.enabled, track.clips.length]), [["video-reference", false, 1], ["video-main", true, 0]]);
  assert.equal(host.status().project, projectId);
  await nonCanonicalHost.create(nonCanonicalRoot);
  await nonCanonicalHost.initializeTimeline([{ track_id: "video-main", kind: "video", clips: [] }]);
  const nonCanonicalBefore = nonCanonicalHost.readTimelineSnapshot();
  await assert.rejects(() => ensureCanonicalStage2Timeline(nonCanonicalHost), /PRODUCT_TIMELINE_TOPOLOGY_UNSUPPORTED/);
  assert.deepEqual(nonCanonicalHost.readTimelineSnapshot(), nonCanonicalBefore, "a non-canonical current project must fail without conversion or mutation");
  const nonCanonicalSession = (nonCanonicalHost as any).session, nonCanonicalProjectId = nonCanonicalHost.status().project;
  createPersistentJob(nonCanonicalSession, nonCanonicalProjectId, { job_id: "noncanonical-running", task_type: "test", idempotency_key: "noncanonical-running", input_hash: "a".repeat(64), input: {}, state: "PENDING" }); startPersistentJob(nonCanonicalSession, "noncanonical-running");
  await nonCanonicalHost.close();
  await assert.rejects(() => openCanonicalStage2Project(nonCanonicalHost, nonCanonicalRoot), /PRODUCT_TIMELINE_TOPOLOGY_UNSUPPORTED/);
  assert.equal(nonCanonicalHost.status().project, "not-open", "failed desktop open must close the rejected session");
  const rejectedSession = await openProject(nonCanonicalRoot); try { assert.equal((readPersistentJob(rejectedSession, "noncanonical-running") as any).state, "RUNNING", "topology rejection must precede Job recovery writes"); } finally { await rejectedSession.close(); }
} finally {
  await host.close();
  await nonCanonicalHost.close();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(nonCanonicalRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
console.log("desktop workbench Host media/job persistence check passed");
