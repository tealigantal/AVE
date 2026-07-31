import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-timeline-redo-"));
const asset = `asset:sha256:${"e".repeat(64)}` as any;
let host: ProjectHostSession | undefined;
try {
  host = new ProjectHostSession(); await host.create(root); host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]);
  const clip = { clip_id: "clip-redo", source: sourceRange(asset, 0n, 10n, 30n), timeline_start: 0n, timeline_duration: 10n };
  host.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip }, 0); host.undoTimeline(); await host.close(); host = undefined;
  const reopened = new ProjectHostSession(); host = reopened; await reopened.open(root); assert.equal(reopened.status().timeline, "v2"); assert.equal(reopened.redoTimeline().timeline, "v3"); reopened.undoTimeline(); const secondClip = { clip_id: "clip-new-edit", source: sourceRange(asset, 10n, 20n, 30n), timeline_start: 10n, timeline_duration: 10n }; reopened.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip: secondClip }, 4); assert.throws(() => reopened.redoTimeline(), /nothing to redo/); await reopened.close(); host = undefined;
} finally { if (host) await host.close(); if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 100)); await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); }
console.log("persistent timeline redo check passed");
