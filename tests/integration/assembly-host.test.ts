import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../apps/desktop/src/project-host.js";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-assembly-host-")); const asset = `asset:sha256:${"f".repeat(64)}`;
try { const host = new ProjectHostSession(); await host.create(root); host.registerEvidence({ evidence_id: "obs-1", analysis_type: "asr", asset_id: asset, start_pts: 0, end_pts: 10, text: "证据" }); host.registerApprovedStoryPlan({ schema_version: 1, plan_id: "plan-1", proposal_id: "proposal-1", approved_by: "user-1", approved_at: "2026-07-30T00:00:00.000Z", beats: [{ beat_id: "beat-1", evidence_ids: ["obs-1"], purpose: "开场" }] }); const cut = { schema_version: 1, assembly_id: "assembly-1", approved_plan_id: "plan-1", clips: [{ clip_id: "clip-1", beat_id: "beat-1", evidence_ids: ["obs-1"], asset_id: asset, start_pts: 0, end_pts: 10 }], status: "candidate" }; host.registerAssemblyCut(cut); assert.equal((host.readAssemblyCut("assembly-1") as { status: string }).status, "validated"); assert.throws(() => host.registerAssemblyCut({ ...cut, assembly_id: "bad", clips: [{ ...cut.clips[0], beat_id: "missing" }] }), /unknown beat/); await host.close(); } finally { if (typeof global.gc === "function") global.gc(); await new Promise((resolve) => setTimeout(resolve, 50)); await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
console.log("assembly host gate check passed");
