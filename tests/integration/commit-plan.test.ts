import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";

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
console.log("atomic commit plan failure check passed");
