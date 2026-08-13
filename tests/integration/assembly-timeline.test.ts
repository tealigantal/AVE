import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-assembly-timeline-"));
const media = resolve(root, "assembly-source.mp4");
let host: ProjectHostSession | undefined;
try {
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=red:s=64x64:r=30000/1001:d=1", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", media]);
  host = new ProjectHostSession();
  await host.create(root);
  const [imported] = await host.importMedia([media]) as Array<{ asset_id: string }>;
  const asset = imported.asset_id;
  host.registerEvidence({ evidence_id: "obs-1", analysis_type: "asr", asset_id: asset, start_pts: 0, end_pts: 10, text: "证据" });
  host.registerApprovedStoryPlan({ schema_version: 1, plan_id: "plan-1", proposal_id: "p-1", approved_by: "u-1", approved_at: "2026-07-30T00:00:00.000Z", beats: [{ beat_id: "beat-1", evidence_ids: ["obs-1"], purpose: "开场" }] });
  host.registerAssemblyCut({ schema_version: 1, assembly_id: "assembly-1", approved_plan_id: "plan-1", clips: [{ clip_id: "clip-1", beat_id: "beat-1", evidence_ids: ["obs-1"], asset_id: asset, start_pts: 0, end_pts: 10 }], status: "candidate" });
  host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]);
  assert.equal(host.compileAssemblyToTimeline("assembly-1", "v1", 0).timeline, "v1");
  assert.throws(() => host!.compileAssemblyToTimeline("assembly-1", "v1", 0), /version conflict/);
  await host.close();
  host = undefined;
} finally {
  await host?.close().catch(() => undefined);
  if (typeof global.gc === "function") global.gc();
  await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
  await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
}
console.log("assembly timeline compile check passed");
