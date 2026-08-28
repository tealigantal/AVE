import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { registerMediaHandlers } from "../../apps/desktop/src/main/ipc/media.handlers.js";
import { safeMediaRows } from "../../apps/desktop/src/main/ipc/project-media-projection.js";

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
const host = new ProjectHostSession();
try {
  await host.create(root);
  const commands = new Map(), systems = new Map(); let legacyDialogCalls = 0, legacyRenderCalls = 0;
  const originalReadStage2Workspace = host.readStage2Workspace.bind(host), originalRender = host.render.bind(host);
  (host as any).readStage2Workspace = async () => ({ contract: { status: "approved" }, executions: [], intents: [] }); (host as any).render = async () => { legacyRenderCalls += 1; return host.status(); };
  registerMediaHandlers(commands, systems, { host } as any, async () => { legacyDialogCalls += 1; return { canceled: false, filePaths: [fixture] } as any; });
  await assert.rejects(() => commands.get("project.render")({ payload: {} } as any, {} as any), /PRODUCT_LEGACY_RENDER_FORBIDDEN/); assert.equal(legacyDialogCalls, 0); assert.equal(legacyRenderCalls, 0);
  (host as any).readStage2Workspace = originalReadStage2Workspace; (host as any).render = originalRender;
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
  await host.initializeTimeline([{ track_id: "video-main", kind: "video", clips: [] }]);
  const source = { asset_id: media.asset_id, start_pts: 0n, end_pts: BigInt(video.duration_ts), timescale: BigInt(timeBase![2]) };
  host.applyTimelineCommand({ type: "add_clip", track_id: "video-main", clip: { clip_id: "clip-workbench", source, timeline_start: 0n, timeline_duration: source.end_pts, media_kind: "video" } }, 0);
  host.applyTimelineCommand({ type: "move_clip", track_id: "video-main", clip_id: "clip-workbench", timeline_start: 2n }, 1);
  host.applyTimelineCommand({ type: "trim_source", track_id: "video-main", clip_id: "clip-workbench", source: { ...source, end_pts: source.end_pts - 1n } }, 2);
  const timeline = host.readTimelineSnapshot() as any;
  assert.equal(timeline.version, 3);
  assert.equal(timeline.tracks[0].clips[0].timeline_start, 2n);
  assert.equal(timeline.tracks[0].clips[0].source.end_pts, source.end_pts - 1n);
  const diff = host.readTimelineDiff() as any;
  assert.deepEqual(diff.added_clip_ids, []);
  assert.deepEqual(diff.removed_clip_ids, []);
  assert.deepEqual(diff.changed_clip_ids, ["clip-workbench"]);
  const projectId = host.status().project;
  await host.close();
  await host.open(root);
  assert.equal(host.listMedia().length, 1);
  assert.equal(host.listJobs().length, 2);
  assert.equal((host.readTimelineSnapshot() as any).version, 3);
  assert.equal(host.status().project, projectId);
} finally {
  await host.close();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
console.log("desktop workbench Host media/job persistence check passed");
