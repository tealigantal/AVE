import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-review-host-"));
try { const host = new ProjectHostSession(); await host.create(root); assert.equal("registerFeedbackDiagnosis" in host, false, "FeedbackDiagnosis v1 Host route must be absent"); host.registerCompare({ schema_version: 1, compare_id: "compare-1", left_version: 1, right_version: 2, selection: "right", reason: "节奏更好" }); assert.equal((host.readReviewArtifact("compare-1") as { artifact_type: string }).artifact_type, "compare"); assert.throws(() => host.registerCompare({ schema_version: 1, compare_id: "bad-compare", left_version: 1, right_version: 1, selection: "left", reason: "相同" }), /different/); await host.close(); } finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("review artifact check passed");
