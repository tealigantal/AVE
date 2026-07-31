import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { openProject, readLatestRenderResult } from "../../packages/platform/project-storage/src/public.js";
import { buildTimelineRenderGraph } from "../../packages/core/render-graph/src/public.js";

const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-timeline-render-"));
const media = resolve(root, "media");
const red = resolve(media, "red.mp4");
const blue = resolve(media, "blue.mp4");
const redProxy = resolve(media, "red-proxy.mp4");
const blueProxy = resolve(media, "blue-proxy.mp4");
const assetA = `asset:sha256:${"a".repeat(64)}` as any;
const assetB = `asset:sha256:${"b".repeat(64)}` as any;

async function makeVideo(path: string, color: string): Promise<void> {
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=${color}:s=64x64:r=30:d=1`, "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", path]);
}
async function makeProxy(input: string, output: string): Promise<void> {
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vf", "scale=32:32", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", output]);
}

try {
  await mkdir(media, { recursive: true });
  await makeVideo(red, "red"); await makeVideo(blue, "blue");
  await makeProxy(red, redProxy); await makeProxy(blue, blueProxy);
  const host = new ProjectHostSession();
  await host.create(root);
  host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [] }]);
  host.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip: { clip_id: "clip-b", source: sourceRange(assetB, 0n, 15n, 30n), timeline_start: 0n, timeline_duration: 15n } }, 0);
  host.applyTimelineCommand({ type: "add_clip", track_id: "v1", clip: { clip_id: "clip-a", source: sourceRange(assetA, 0n, 15n, 30n), timeline_start: 15n, timeline_duration: 15n } }, 1);
  const rendered = await host.renderTimeline({ sources: [{ asset_ref: assetA, original_ref: red, proxy_ref: redProxy, source_timescale: 30n }, { asset_ref: assetB, original_ref: blue, proxy_ref: blueProxy, source_timescale: 30n }], profile: { name: "r11-proxymap-render", width: 64, height: 64 } });
  assert.equal(rendered.status.qc, "passed", JSON.stringify(host.latestRender()));
  await host.close();
  const session = await openProject(root);
  const result = readLatestRenderResult(session, session.manifest.project_id, "master") as any;
  assert.equal(result.timeline_version, 2);
  assert.equal(result.original_refs.length, 2);
  assert.equal(result.proxy_refs.length, 2);
  assert.equal(result.proxy_refs.every((reference: any) => reference.proxy_map?.schema_version === 1), true);
  assert.match(result.graph_hash, /^[0-9a-f]{64}$/);
  assert.match(result.output_hash, /^[0-9a-f]{64}$/);
  assert.match(result.worker_version, /^ave-worker-host-r10/);
  session.db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;");
  await session.close();
  const firstFrame = await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", result.output_path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"], { encoding: "buffer" });
  const [r, g, b] = [...firstFrame.stdout.subarray(0, 3)];
  assert.ok(b > r && b > g, `swapped Clip B must render first, got rgb(${r},${g},${b})`);
  const acceptanceTimeline = { version: 2, tracks: [{ track_id: "v1", kind: "video" as const, clips: [{ clip_id: "clip-b", source: sourceRange(assetB, 0n, 15n, 30n), timeline_start: 0n, timeline_duration: 15n }, { clip_id: "clip-a", source: sourceRange(assetA, 0n, 15n, 30n), timeline_start: 15n, timeline_duration: 15n }] }] };
  assert.throws(() => buildTimelineRenderGraph(acceptanceTimeline, new Map([[assetA, { asset_ref: assetA, proxy_ref: red, source_timescale: 30n }], [assetB, { asset_ref: assetB, original_ref: blue, source_timescale: 30n }]]), "master"), /MASTER_ORIGINAL_REQUIRED/);
  assert.throws(() => buildTimelineRenderGraph(acceptanceTimeline, new Map([[assetA, { asset_ref: assetA, original_ref: red, proxy_ref: blue, source_timescale: 30n }], [assetB, { asset_ref: assetB, original_ref: blue, proxy_ref: red, source_timescale: 30n }]]), "preview"), /PROXY_MAP_REQUIRED/);
} finally {
  if (typeof global.gc === "function") global.gc();
  let removed = false;
  for (let attempt = 0; attempt < 12 && !removed; attempt += 1) {
    try { await rm(root, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }); removed = true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EBUSY") throw error; await new Promise((resolve) => setTimeout(resolve, 250)); if (typeof global.gc === "function") global.gc(); }
  }
  if (!removed) console.warn("timeline render temporary project remains locked; Windows will reclaim it from the temp directory");
}
console.log("timeline render acceptance passed");
