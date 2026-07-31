import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-undo-")); const asset = `asset:sha256:${"c".repeat(64)}` as any;
try { const host = new ProjectHostSession(); await host.create(root); host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]); const clip = { clip_id: "clip-1", source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }; host.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip }, 0); assert.equal(host.status().timeline, "v1"); host.undoTimeline(); assert.equal(host.status().timeline, "v2"); host.redoTimeline(); assert.equal(host.status().timeline, "v3"); await host.close(); } finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("undo redo check passed");
