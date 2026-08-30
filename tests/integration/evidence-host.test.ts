import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-evidence-host-")); const asset = `asset:sha256:${"d".repeat(64)}`;
try { const host = new ProjectHostSession(); await host.create(root); host.registerEvidence({ evidence_id: "asr:1", analysis_type: "asr", asset_id: asset, start_pts: 0, end_pts: 12, text: "采访证据" }); const projected = host.readEvidence("asr:1") as any; assert.equal(projected.object_id, "asr:1"); assert.equal(projected.lifecycle_status, "candidate"); assert.equal("text" in projected || "content" in projected || "value" in projected, false, "public Evidence query must not expose transcript content"); assert.throws(() => host.registerEvidence({ evidence_id: "bad", analysis_type: "ocr", asset_id: asset, start_pts: 4, end_pts: 4, text: "非法" }), /invalid evidence range/); await host.close(); const reopened = new ProjectHostSession(); await reopened.open(root); assert.equal((reopened.readEvidence("asr:1") as any).object_id, "asr:1"); await reopened.close(); } finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("evidence host api check passed");
