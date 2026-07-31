import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-assembly-timeline-")); const asset = `asset:sha256:${"a".repeat(64)}`;
try { const host = new ProjectHostSession(); await host.create(root); host.registerEvidence({ evidence_id: "obs-1", analysis_type: "asr", asset_id: asset, start_pts: 0, end_pts: 10, text: "证据" }); host.registerApprovedStoryPlan({ schema_version: 1, plan_id: "plan-1", proposal_id: "p-1", approved_by: "u-1", approved_at: "2026-07-30T00:00:00.000Z", beats: [{ beat_id: "beat-1", evidence_ids: ["obs-1"], purpose: "开场" }] }); host.registerAssemblyCut({ schema_version: 1, assembly_id: "assembly-1", approved_plan_id: "plan-1", clips: [{ clip_id: "clip-1", beat_id: "beat-1", evidence_ids: ["obs-1"], asset_id: asset, start_pts: 0, end_pts: 10 }], status: "candidate" }); host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]); assert.equal(host.compileAssemblyToTimeline("assembly-1", "v1", 0).timeline, "v1"); assert.throws(() => host.compileAssemblyToTimeline("assembly-1", "v1", 0), /version conflict/); await host.close(); } finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 250)); await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); }
console.log("assembly timeline compile check passed");
