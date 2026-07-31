import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-reaction-host-"));
try { const host = new ProjectHostSession(); await host.create(root); host.registerCompare({ schema_version: 1, compare_id: "compare-1", left_version: 1, right_version: 2, selection: "right", reason: "节奏更好" }); host.registerReactionTiming({ schema_version: 1, reaction_id: "reaction-1", compare_id: "compare-1", timeline_pts: 12n, reaction: "保留右侧" }); assert.throws(() => host.registerReactionTiming({ schema_version: 1, reaction_id: "bad", compare_id: "missing", timeline_pts: 0n, reaction: "无" }), /not found/); assert.throws(() => host.registerReactionTiming({ schema_version: 1, reaction_id: "bad-time", compare_id: "compare-1", timeline_pts: -1n, reaction: "无" }), /negative/); await host.close(); } finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("reaction timing host check passed");
