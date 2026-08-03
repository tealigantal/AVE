import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-timeline-host-"));
const asset = `asset:sha256:${"b".repeat(64)}` as any;
try {
  const host = new ProjectHostSession(); await host.create(root);
  host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]);
  const clip = { clip_id: "clip-1", source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n };
  assert.equal(host.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip }, 0).timeline, "v1");
  assert.throws(() => host.applyTimelineCommand({ type: "move_clip", track_id: "v1", clip_id: "clip-1", timeline_start: 10n }, 0), /version conflict/);
  host.applyTimelineCommand({ type: "add_track", track: { track_id: "v2", kind: "video", z_index: 1, clips: [] } }, 1);
  host.applyTimelineCommand({ type: "add_sequence", sequence: { sequence_id: "nested-1", tracks: [{ track_id: "nested-v1", kind: "video", clips: [] }] } }, 2);
  host.applyTimelineCommand({ type: "add_clip", track_id: "v2", clip: { clip_id: "nested-clip", kind: "nested", nested_sequence_id: "nested-1", source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n } }, 3);
  await host.close();
  const reopened = new ProjectHostSession(); await reopened.open(root);
  assert.equal(reopened.status().timeline, "v4");
  const restored = reopened.readTimelineSnapshot() as any;
  assert.equal(restored.sequences[0].sequence_id, "nested-1");
  assert.equal(restored.tracks.find((track: any) => track.track_id === "v2").clips[0].nested_sequence_id, "nested-1");
  await reopened.close();
} finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("timeline host command check passed");
