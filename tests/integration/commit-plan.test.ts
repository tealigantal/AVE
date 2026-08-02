import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { applyCommand, createCommitPlan, type AffectedRange, type AutomationCurve, type Timeline, type TimelineCommand } from "../../packages/core/timeline-core/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-commit-plan-"));
const asset = `asset:sha256:${"c".repeat(64)}` as any;
let host: ProjectHostSession | undefined;
try {
  const sessionHost = new ProjectHostSession(); host = sessionHost; await sessionHost.create(root); sessionHost.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]);
  const clip1 = { clip_id: "clip-1", source: sourceRange(asset, 0n, 10n, 30n), timeline_start: 0n, timeline_duration: 10n };
  const clip2 = { clip_id: "clip-2", source: sourceRange(asset, 10n, 20n, 30n), timeline_start: 10n, timeline_duration: 10n };
  const commands = [
    { type: "add_clip" as const, track_id: "v1", clip: clip1 },
    { type: "add_clip" as const, track_id: "v1", clip: clip2 },
    { type: "add_clip" as const, track_id: "v1", clip: clip1 }
  ];
  assert.throws(() => sessionHost.applyTimelineCommands(commands, 0, ["manual-batch"]), /duplicate clip/);
  assert.equal(sessionHost.status().timeline, "v0");
  const db = (sessionHost as any).session.db;
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM timeline_versions").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM timeline_commands").get().count, 1);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM project_events WHERE event_type = 'timeline.commit_plan.committed'").get().count, 0);
  await sessionHost.close(); host = undefined;
} finally { if (host) await host.close(); if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 100)); await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); }

const clip = (clip_id: string, timeline_start: bigint) => ({ clip_id, source: sourceRange(asset, timeline_start, timeline_start + 10n, 30n), timeline_start, timeline_duration: 10n });
const base: Timeline = { version: 0, sequence: { sequence_id: "main", tracks: [] }, tracks: [{ track_id: "v1", kind: "video", clips: [clip("c1", 0n), clip("c2", 10n), clip("c3", 20n)] }, { track_id: "a1", kind: "audio", clips: [] }] };
const key = (range: AffectedRange): string => `${range.track_id}:${range.start}-${range.end}`;
function assertRanges(timeline: Timeline, command: TimelineCommand, expected: readonly string[]): Timeline { const result = createCommitPlan(timeline, [command]); assert.deepEqual(result.plan.affected_ranges.map(key).sort(), [...expected].sort(), command.type); return result.timeline; }
const curve: AutomationCurve = { curve_id: "curve", target_id: "c1", property_path: "transform.opacity", value_kind: "number", keyframes: [{ keyframe_id: "curve-kf", time: 0n, value: 1 }] };

assertRanges(base, { type: "add_clip", track_id: "v1", clip: clip("c4", 30n) }, ["v1:30-40"]);
assertRanges(base, { type: "remove_clip", track_id: "v1", clip_id: "c2" }, ["v1:10-20"]);
assertRanges(base, { type: "replace_clip", track_id: "v1", clip_id: "c1", clip: { ...clip("c1", 0n), timeline_duration: 5n } }, ["v1:0-10"]);
assertRanges(base, { type: "move_clip", track_id: "v1", clip_id: "c1", timeline_start: 30n }, ["v1:0-10", "v1:30-40"]);
assertRanges(base, { type: "trim_source", track_id: "v1", clip_id: "c1", source: sourceRange(asset, 0n, 5n, 30n) }, ["v1:0-10"]);
assertRanges(base, { type: "roll_cut", track_id: "v1", left_clip_id: "c1", right_clip_id: "c2", boundary: 8n }, ["v1:0-20"]);
assertRanges(base, { type: "ripple_delete", track_id: "v1", clip_id: "c2" }, ["v1:10-30"]);
assertRanges(base, { type: "slip_clip", track_id: "v1", clip_id: "c1", source_start_pts: 1n, source_end_pts: 11n }, ["v1:0-10"]);
assertRanges(base, { type: "slide_clip", track_id: "v1", clip_id: "c1", timeline_start: 30n }, ["v1:0-10", "v1:30-40"]);
for (const command of [{ type: "set_gain", track_id: "v1", clip_id: "c1", gain_db: -3 }, { type: "set_speed", track_id: "v1", clip_id: "c1", speed: { numerator: 2n, denominator: 1n } }, { type: "set_transform", track_id: "v1", clip_id: "c1", transform: { opacity: 0.5 } }] as const) assertRanges(base, command, ["v1:0-10"]);
assertRanges(base, { type: "add_caption", track_id: "v1", caption: { caption_id: "caption", text: "x", timeline_start: 3n, timeline_duration: 2n } }, ["v1:3-5"]);
assertRanges(base, { type: "add_transition", track_id: "v1", transition: { transition_id: "transition", kind: "dissolve", from_clip_id: "c1", to_clip_id: "c2", timeline_start: 9n, timeline_duration: 1n } }, ["v1:9-10"]);
assertRanges(base, { type: "set_effect", track_id: "v1", effect: { effect_id: "effect", clip_id: "c1", kind: "blur" } }, ["v1:0-10"]);
assertRanges(base, { type: "set_keyframe", track_id: "v1", keyframe: { keyframe_id: "keyframe", target_id: "c1", property: "opacity", time: 2n, value: 0.5 } }, ["v1:0-10"]);
const locked = assertRanges(base, { type: "lock_range", track_id: "v1", lock: { lock_id: "lock", start: 2n, end: 5n, owner: "test" } }, ["v1:2-5"]);
assertRanges(locked, { type: "unlock_range", track_id: "v1", lock_id: "lock" }, ["v1:2-5"]);
assertRanges(base, { type: "add_track", track: { track_id: "v2", kind: "video", clips: [clip("v2-c1", 40n)] } }, ["v2:40-50"]);
assertRanges(base, { type: "remove_track", track_id: "v1" }, ["v1:0-30"]);
assertRanges(base, { type: "reorder_track", track_id: "v1", index: 1 }, ["v1:0-30"]);
assertRanges(base, { type: "set_track_properties", track_id: "v1", properties: { opacity: 0.5 } }, ["v1:0-30"]);
const sequence = { sequence_id: "nested", tracks: [{ track_id: "nested-v", kind: "video" as const, clips: [clip("nested-c", 4n)] }] };
const withSequence = assertRanges(base, { type: "add_sequence", sequence }, ["nested-v:4-14"]);
assertRanges(withSequence, { type: "remove_sequence", sequence_id: "nested" }, ["nested-v:4-14"]);
const withCurve = assertRanges(base, { type: "set_automation_curve", track_id: "v1", curve }, ["v1:0-10"]);
assertRanges(withCurve, { type: "clear_automation_curve", track_id: "v1", curve_id: "curve" }, ["v1:0-10"]);
const restoredTarget: Timeline = { ...base, version: 99, tracks: [{ ...base.tracks[0], clips: [clip("c1", 5n), clip("c2", 15n), clip("c3", 25n)] }, base.tracks[1]] };
assertRanges(base, { type: "restore_timeline", timeline: restoredTarget }, ["a1:0-0", "v1:0-35"]);
const restoredTrack = applyCommand(base, { type: "set_track_properties", track_id: "v1", properties: { opacity: 0.25 } }).tracks[0];
assertRanges(base, { type: "restore_track", track_id: "v1", track: restoredTrack }, ["v1:0-30"]);
console.log("atomic commit plan and affected-range checks passed");
