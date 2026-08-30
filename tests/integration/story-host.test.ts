import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-story-host-"));
try { const host = new ProjectHostSession(); await host.create(root); assert.equal("registerApprovedStoryPlan" in host, false); assert.equal("readApprovedStoryPlan" in host, false); assert.equal("proposeStory" in host, false); assert.equal(typeof host.proposeStoryV2, "function"); assert.equal(typeof host.approveStoryCandidates, "function"); await host.close(); } finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("Story Host exposes only current Story authority");
