import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-rough-host-")); const asset = `asset:sha256:${"b".repeat(64)}`;
try { const host = new ProjectHostSession(); await host.create(root); host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [{ clip_id: "clip-1", source: sourceRange(asset as any, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }]); assert.equal(host.applyRoughCutPatch({ schema_version: 1, patch_id: "patch-1", base_version: 0, operations: [{ operation: "replace", clip_id: "clip-1", source_start_pts: 5n, source_end_pts: 20n }] }, "v1").timeline, "v1"); assert.throws(() => host.applyRoughCutPatch({ schema_version: 1, patch_id: "bad", base_version: 0, operations: [{ operation: "remove", clip_id: "clip-1" }] }, "v1"), /conflict/); await host.close(); } finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("rough cut host check passed");
