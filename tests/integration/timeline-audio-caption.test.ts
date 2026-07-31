import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { buildTimelineRenderGraph, renderGraphPayload } from "../../packages/core/render-graph/src/public.js";
import { createLocalWorkerJobPort } from "../../packages/platform/worker-client/src/public.js";

const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "ave-audio-caption-"));
const media = resolve(root, "media");
const source = resolve(media, "source.mp4");
const asset = `asset:sha256:${"c".repeat(64)}` as any;

try {
  await mkdir(media, { recursive: true });
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=purple:s=64x64:r=30:d=1", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=1", "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", source]);
  const videoRange = sourceRange(asset, 0n, 30n, 30n);
  const timeline = { version: 0, tracks: [{ track_id: "video", kind: "video" as const, clips: [{ clip_id: "video-1", source: videoRange, timeline_start: 0n, timeline_duration: 30n, media_kind: "video" as const }], captions: [{ caption_id: "caption-1", text: "AVE caption", timeline_start: 5n, timeline_duration: 15n, language: "en" }] }, { track_id: "audio", kind: "audio" as const, clips: [{ clip_id: "audio-1", source: videoRange, timeline_start: 0n, timeline_duration: 30n, media_kind: "audio" as const }] }] };
  const graph = buildTimelineRenderGraph(timeline, new Map([[asset, { asset_ref: asset, original_ref: source, source_timescale: 30n }]]), "master", { name: "audio-caption", width: 64, height: 64 });
  const worker = createLocalWorkerJobPort();
  const rendered = await worker.submit("render.timeline.v1", { graph: JSON.parse(renderGraphPayload(graph)), output_dir: resolve(root, "renders") });
  const output = (rendered as any).outputs?.find((candidate: any) => candidate.kind === "render");
  assert.ok(output?.path);
  const filter = (rendered as any).metrics?.filter_complex ?? "";
  assert.match(String(filter), /drawtext=.*text='AVE caption'/);
  assert.match(String(filter), /\[\d+:a\][^;]*asettb/);
  const qc = await worker.submit("qc.master.v1", { master_path: output.path, source_kind: "original", source_identity: { source_kind: "original", asset_id: asset }, require_audio: true });
  assert.equal((qc as any).outputs?.find((candidate: any) => candidate.kind === "qc")?.report?.status, "passed");
  console.log("timeline audio/caption render acceptance passed");
} finally {
  if (typeof global.gc === "function") global.gc();
  await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}
