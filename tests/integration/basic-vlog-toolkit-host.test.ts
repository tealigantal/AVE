import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "ave-basic-vlog-host-"));
const media = resolve(root, "media");
const video = resolve(media, "landscape.mp4"), proxy = resolve(media, "landscape-proxy.mp4"), dialogue = resolve(media, "dialogue.wav"), music = resolve(media, "music.wav");

try {
  await mkdir(media, { recursive: true });
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=240x90:rate=30:duration=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", video]);
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", video, "-vf", "scale=120:46", "-c:v", "libx264", "-an", proxy]);
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "aevalsrc=0.02*sin(2*PI*220*t)+if(between(t\\,1\\,2)\\,0.8*sin(2*PI*1000*t)\\,0):s=48000:d=4", dialogue]);
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-af", "volume=0.2", music]);

  const host = new ProjectHostSession(); await host.create(root);
  const [importedVideo, importedDialogue, importedMusic] = await host.importMedia([video, dialogue, music]) as Array<{ asset_id: any }>;
  const videoAsset = importedVideo.asset_id;
  const dialogueAsset = importedDialogue.asset_id;
  const musicAsset = importedMusic.asset_id;
  host.initializeTimeline([{ track_id: "video", kind: "video", clips: [] }, { track_id: "dialogue", kind: "audio", clips: [], audio_routing: [] }, { track_id: "music", kind: "audio", clips: [], audio_routing: [] }]);
  host.applyTimelineCommand({ type: "add_clip", track_id: "video", clip: { clip_id: "video-clip", source: sourceRange(videoAsset, 0n, 120n, 30n), timeline_start: 0n, timeline_duration: 120n } }, 0);
  host.applyTimelineCommand({ type: "add_clip", track_id: "dialogue", clip: { clip_id: "dialogue-clip", media_kind: "audio", source: sourceRange(dialogueAsset, 0n, 192000n, 48000n), timeline_start: 0n, timeline_duration: 120n } }, 1);
  host.applyTimelineCommand({ type: "set_track_properties", track_id: "dialogue", properties: { audio_routing: [{ routing_id: "dialogue-routing", source_clip_id: "dialogue-clip", bus: "dialogue" }] } }, 2);
  host.applyTimelineCommand({ type: "add_clip", track_id: "music", clip: { clip_id: "music-clip", media_kind: "audio", source: sourceRange(musicAsset, 0n, 192000n, 48000n), timeline_start: 0n, timeline_duration: 120n } }, 3);
  host.applyTimelineCommand({ type: "set_track_properties", track_id: "music", properties: { audio_routing: [{ routing_id: "music-routing", source_clip_id: "music-clip", bus: "music" }] } }, 4);
  host.applyTimelineCommand({ type: "set_static_reframe", track_id: "video", clip_id: "video-clip", reframe: { schema_version: 1, mode: "blurred_background", focal_x: 0.65, focal_y: 0.5 } }, 5);
  host.applyTimelineCommand({ type: "set_clip_boundary_fades", track_id: "video", clip_id: "video-clip", fades: { schema_version: 1, video_fade_in: { value: 6n, timescale: 30n }, video_fade_out: { value: 6n, timescale: 30n } } }, 6);
  host.applyTimelineCommand({ type: "set_clip_boundary_fades", track_id: "music", clip_id: "music-clip", fades: { schema_version: 1, audio_fade_in: { value: 9600n, timescale: 48000n }, audio_fade_out: { value: 9600n, timescale: 48000n } } }, 7);
  host.applyTimelineCommand({ type: "set_master_loudness", normalization: { schema_version: 1, enabled: true, target_lufs: -14, true_peak_db: -1, tolerance_lufs: 1 } }, 8);
  host.applyTimelineCommand({ type: "set_dialogue_music_ducking", ducking: { schema_version: 1, enabled: true, threshold_db: -30, ratio: 8, attack_ms: 20, release_ms: 350, max_reduction_db: 12 } }, 9);

  const renderOptions = {
    sources: [
      { asset_ref: videoAsset, original_ref: video, proxy_ref: proxy, source_timescale: 30n, proxy_timescale: 30n, proxy_map: { schema_version: 1, original_timebase: 30n, proxy_timebase: 30n, segments: [{ original_start: { value: 0n, timescale: 30n }, original_end: { value: 120n, timescale: 30n }, proxy_start: { value: 0n, timescale: 30n }, proxy_end: { value: 120n, timescale: 30n } }] }, has_audio: false },
      { asset_ref: dialogueAsset, original_ref: dialogue, proxy_ref: dialogue, source_timescale: 48000n, has_audio: true },
      { asset_ref: musicAsset, original_ref: music, proxy_ref: music, source_timescale: 48000n, has_audio: true },
    ],
    profile: { name: "basic-vlog-vertical", width: 90, height: 160 },
  } as const;
  const rendered = await host.renderTimeline(renderOptions);
  assert.equal(rendered.status.qc, "passed", JSON.stringify(host.latestRender()));
  assert.equal((rendered.preview as any).metrics.audio_normalization.status, "normalized");
  assert.equal((rendered.master as any).metrics.audio_normalization.within_tolerance, true);
  assert.equal((rendered.master as any).metrics.ducking_status, "applied");
  const manifests = host.listRenderManifests() as any[];
  const plans = manifests.filter((item) => item.manifest_type === "execution_plan").map((item) => item.value);
  assert.equal(plans.length, 2);
  assert.equal(plans.every((item) => item.adapter_version === "v4" && item.capability_snapshot.adapter_version === "v4"), true, "enabled Ducking must publish only corrected adapter identities");
  assert.equal(plans[0].semantic_graph_hash, plans[1].semantic_graph_hash);
  assert.notEqual(plans[0].cache_key, plans[1].cache_key);
  const outputs = manifests.filter((item) => item.manifest_type === "output_manifest").map((item) => item.value);
  assert.equal(outputs.length, 2);
  assert.equal(outputs.every((item) => item.worker_version.startsWith("ave-worker-host-r14")), true);
  assert.equal(outputs.every((item) => item.audio_normalization.status === "normalized"), true);
  const masterPath = (rendered.master as any).outputs.find((item: any) => item.kind === "render").path;
  const probed = JSON.parse((await run("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", masterPath])).stdout) as any;
  const videoStream = probed.streams.find((item: any) => item.codec_type === "video");
  assert.deepEqual({ width: videoStream.width, height: videoStream.height }, { width: 90, height: 160 });
  assert.ok(probed.streams.some((item: any) => item.codec_type === "audio"));
  assert.ok(Math.abs(Number(probed.format.duration) - 4) <= 0.08);
  const completedResults = host.listRenderResults().length;
  await assert.rejects(host.renderTimeline({ ...renderOptions, outputDirectory: resolve(root, "renders-qc-blocked"), qcRequirements: { privacy: { satisfied: false, message: "synthetic QC blocker" } } }), /RENDER_QC_BLOCKED:PRIVACY_REQUIREMENT/);
  assert.equal(host.listRenderResults().length, completedResults, "QC-blocked render must not publish Preview/Master results");
  const afterBlocked = host.listRenderManifests() as any[];
  assert.equal(afterBlocked.filter((item) => item.manifest_type === "output_manifest").length, 2, "QC-blocked render must not publish output manifests");
  assert.equal(afterBlocked.some((item) => item.manifest_type === "blocker_manifest"), true, "QC failure must persist a blocker manifest");
  await host.close();

  const reopened = new ProjectHostSession(); await reopened.open(root);
  const timeline = reopened.readTimelineSnapshot() as any;
  assert.equal(reopened.status().timeline, "v10");
  assert.equal(timeline.tracks[0].clips[0].static_reframe.mode, "blurred_background");
  assert.equal(timeline.tracks[2].clips[0].boundary_fades.audio_fade_out.value, 9600n);
  assert.equal(timeline.master_loudness.target_lufs, -14);
  assert.equal(timeline.dialogue_music_ducking.max_reduction_db, 12);
  await reopened.close();
} finally {
  if (typeof global.gc === "function") global.gc();
  let removed = false;
  for (let attempt = 0; attempt < 12 && !removed; attempt += 1) {
    try { await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); removed = true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EBUSY") throw error; await new Promise((resolve) => setTimeout(resolve, 250)); if (typeof global.gc === "function") global.gc(); }
  }
  if (!removed) console.warn("basic Vlog temporary project remains locked by Windows Node SQLite; the OS temp directory will reclaim it after process exit");
}

console.log("Project Host basic Vlog toolkit acceptance passed: commit/reopen, shared semantics, original Master, atomic manifests and encoded output");
