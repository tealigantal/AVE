import { strict as assert } from "node:assert";
import { execFile } from "node:child_process";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { delimiter, resolve } from "node:path";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createLocalWorkerJobPort } from "../../packages/platform/worker-client/src/public.js";

const run = promisify(execFile);
const mediaPaths = (process.env.AVE_REAL_MEDIA_PATHS ?? "").split(delimiter).map((value) => value.trim()).filter(Boolean);
const subtitlePath = process.env.AVE_REAL_SUBTITLE_PATH;
const projectRoot = process.env.AVE_REAL_REVIEW_PROJECT;
const dialogueIndex = Number(process.env.AVE_REAL_DIALOGUE_INDEX ?? "0");
const externalMusicPath = process.env.AVE_REAL_MUSIC_PATH;
const attributionPath = process.env.AVE_REAL_ATTRIBUTION_PATH;
const clipSeconds = Number(process.env.AVE_REAL_REVIEW_CLIP_SECONDS ?? "2");
if (mediaPaths.length < 2 || !subtitlePath || !projectRoot) throw new Error("AVE_REAL_MEDIA_PATHS, AVE_REAL_SUBTITLE_PATH and AVE_REAL_REVIEW_PROJECT are required");
if (!Number.isInteger(dialogueIndex) || dialogueIndex < 0 || dialogueIndex >= 2) throw new Error("AVE_REAL_DIALOGUE_INDEX must select one of the first two media files");
if (!Number.isInteger(clipSeconds) || clipSeconds < 1 || clipSeconds > 15) throw new Error("AVE_REAL_REVIEW_CLIP_SECONDS must be an integer from 1 through 15");
let targetExists = true;
try { await access(projectRoot); } catch { targetExists = false; }
assert.equal(targetExists, false, "review project target already exists");

type Stream = Readonly<{ index?: number; codec_type?: string; time_base?: string; duration_ts?: string | number }>;
type Imported = Readonly<{ asset_id: string; location_ref: string; probe: { streams?: readonly Stream[]; timing?: { streams?: Record<string, Stream> } } }>;
const streamFor = (media: Imported, kind: string): Stream => {
  const stream = Object.entries(media.probe.timing?.streams ?? {}).find(([index, candidate]) => media.probe.streams?.find((raw, rawIndex) => String(raw.index ?? rawIndex) === index)?.codec_type === kind && candidate.time_base && candidate.duration_ts !== undefined)?.[1];
  if (!stream) throw new Error(`media has no usable ${kind} stream: ${media.location_ref}`);
  return stream;
};
const scaleFor = (stream: Stream): bigint => {
  const match = String(stream.time_base).match(/^1\/(\d+)$/);
  if (!match) throw new Error(`unsupported time base: ${stream.time_base}`);
  return BigInt(match[1]);
};
const durationFor = (stream: Stream): bigint => BigInt(String(stream.duration_ts));
const hasAudio = (media: Imported): boolean => (media.probe.streams ?? Object.values(media.probe.timing?.streams ?? {})).some((stream) => stream.codec_type === "audio");
const captionText = (raw: string): string => raw.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !/^\d+$/.test(line) && !/-->/.test(line)) ?? "AVE 基础 Vlog 工具真实验收";
const reviveProxyMap = (value: any): any => {
  const time = (point: any) => ({ value: BigInt(String(point.value)), timescale: BigInt(String(point.timescale)) });
  return { schema_version: 1, original_timebase: BigInt(String(value.original_timebase)), proxy_timebase: BigInt(String(value.proxy_timebase)), segments: (value.segments ?? []).map((segment: any) => ({ original_start: time(segment.original_start), original_end: time(segment.original_end), proxy_start: time(segment.proxy_start), proxy_end: time(segment.proxy_end) })), ...(value.audio ? { audio: { original_sample_rate: BigInt(String(value.audio.original_sample_rate)), proxy_sample_rate: BigInt(String(value.audio.proxy_sample_rate)) } } : {}) };
};

const host = new ProjectHostSession();
let worker: ReturnType<typeof createLocalWorkerJobPort> | undefined;
try {
  await host.create(projectRoot);
  if (attributionPath) await copyFile(attributionPath, resolve(projectRoot, "SOURCE-ATTRIBUTION.md"));
  const generated = resolve(projectRoot, "generated");
  await mkdir(generated, { recursive: true });
  const musicPath = externalMusicPath ?? resolve(generated, "review-music.wav");
  if (!externalMusicPath) {
    await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `sine=frequency=440:sample_rate=48000:duration=${clipSeconds * 2}`, "-af", "volume=0.16", musicPath]);
  }
  const imported = await host.importMedia([...mediaPaths.slice(0, 2), musicPath]) as Imported[];
  const videoMedia = imported.slice(0, 2);
  const musicMedia = imported[2];
  const videoInfo = videoMedia.map((media) => { const video = streamFor(media, "video"); return { media, scale: scaleFor(video), duration: durationFor(video) }; });
  const timelineScale = videoInfo[0].scale;
  let cursor = 0n;
  const videoClips = videoInfo.map(({ media, scale, duration }, index) => {
    const selectionLimit = scale * BigInt(clipSeconds);
    const selected = duration < selectionLimit ? duration : selectionLimit;
    const timelineDuration = selected * timelineScale / scale;
    const clip = { clip_id: `review-video-${index}`, source: { asset_id: media.asset_id as any, start_pts: 0n, end_pts: selected, timescale: scale }, timeline_start: cursor, timeline_duration: timelineDuration, media_kind: "video" as const };
    cursor += timelineDuration;
    return clip;
  });
  const dialogueMedia = videoMedia[dialogueIndex];
  const firstAudio = streamFor(dialogueMedia, "audio");
  const audioScale = scaleFor(firstAudio);
  const dialogueTimelineDuration = videoClips[0].timeline_duration;
  const dialogueSourceDuration = dialogueTimelineDuration * audioScale / timelineScale;
  assert.ok(dialogueSourceDuration <= durationFor(firstAudio));
  const musicStream = streamFor(musicMedia, "audio");
  const musicScale = scaleFor(musicStream);
  const musicSourceDuration = cursor * musicScale / timelineScale;
  assert.ok(musicSourceDuration <= durationFor(musicStream));

  worker = createLocalWorkerJobPort();
  const proxySources = await Promise.all(videoInfo.map(async ({ media, scale }, index) => {
    const result = await worker!.submit("media.proxy.v1", { input_path: media.location_ref, output_dir: resolve(projectRoot, "proxies", String(index)) });
    const output = (result as any).outputs?.find((item: any) => item.kind === "proxy");
    assert.ok(output?.path && output.proxy_map?.segments?.length);
    const proxyMap = reviveProxyMap(output.proxy_map);
    return { asset_ref: media.asset_id, original_ref: media.location_ref, proxy_ref: output.path, source_timescale: scale, proxy_timescale: proxyMap.proxy_timebase, proxy_map: proxyMap, has_audio: hasAudio(media) };
  }));

  await host.initializeTimeline([
    { track_id: "review-video", kind: "video", muted: true, clips: [] },
    { track_id: "review-dialogue", kind: "audio", clips: [], audio_routing: [] },
    { track_id: "review-music", kind: "audio", clips: [], audio_routing: [] },
  ]);
  host.applyTimelineCommands([
    ...videoClips.map((clip) => ({ type: "add_clip" as const, track_id: "review-video", clip })),
    { type: "add_clip", track_id: "review-dialogue", clip: { clip_id: "review-dialogue-0", media_kind: "audio", source: { asset_id: dialogueMedia.asset_id as any, start_pts: 0n, end_pts: dialogueSourceDuration, timescale: audioScale }, timeline_start: 0n, timeline_duration: dialogueTimelineDuration } } as const,
    { type: "set_track_properties", track_id: "review-dialogue", properties: { audio_routing: [{ routing_id: "review-dialogue-routing", source_clip_id: "review-dialogue-0", bus: "dialogue" }] } } as const,
    { type: "add_clip", track_id: "review-music", clip: { clip_id: "review-music-0", media_kind: "audio", source: { asset_id: musicMedia.asset_id as any, start_pts: 0n, end_pts: musicSourceDuration, timescale: musicScale }, timeline_start: 0n, timeline_duration: cursor } } as const,
    { type: "set_track_properties", track_id: "review-music", properties: { audio_routing: [{ routing_id: "review-music-routing", source_clip_id: "review-music-0", bus: "music" }] } } as const,
    { type: "set_clip_boundary_fades", track_id: "review-music", clip_id: "review-music-0", fades: { schema_version: 1, audio_fade_in: { value: musicScale * 2n / 5n, timescale: musicScale }, audio_fade_out: { value: musicScale * 2n / 5n, timescale: musicScale } } } as const,
    { type: "add_caption", track_id: "review-video", caption: { caption_id: "review-caption", text: captionText(await readFile(subtitlePath, "utf8")), timeline_start: 0n, timeline_duration: cursor, language: "zh" } } as const,
  ], 0);
  const fadeTicks = Number(timelineScale * 2n / 5n);
  const presetApplication = host.applyCreativeSkill({
    schema_version: 1,
    application_id: "basic-vlog-real-review-application",
    skill_id: "skill.basic_vlog_review",
    skill_version: 1,
    base_timeline_version: 1,
    composition_policy: "ordered",
    selections: [
      { schema_version: 1, selection_id: "review-first-shot", preset_id: "basic_vertical_vlog", preset_version: 1, bindings: { track_id: "review-video", clip_id: "review-video-0" }, parameters: { reframe_mode: "blurred_background", focal_x: 0.5, focal_y: 0.5, fade_timescale: Number(timelineScale), video_fade_in: fadeTicks, target_lufs: -14, true_peak_db: -1, tolerance_lufs: 1, threshold_db: -35, ratio: 12, attack_ms: 20, release_ms: 350, max_reduction_db: 15 } },
      { schema_version: 1, selection_id: "review-second-shot", preset_id: "basic_vertical_vlog", preset_version: 1, bindings: { track_id: "review-video", clip_id: "review-video-1" }, parameters: { reframe_mode: "contain", focal_x: 0.5, focal_y: 0.5, fade_timescale: Number(timelineScale), video_fade_out: fadeTicks, target_lufs: -14, true_peak_db: -1, tolerance_lufs: 1, threshold_db: -35, ratio: 12, attack_ms: 20, release_ms: 350, max_reduction_db: 15 } }
    ]
  }, { aspect_ratio: "9:16" });
  assert.equal(presetApplication.status, "applied");
  assert.equal(presetApplication.definition_pins.every((pin) => pin.preset_id === "basic_vertical_vlog"), true);
  const unavailableVersion = host.resolveCreativeSkill({ schema_version: 1, application_id: "review-blocked-version", skill_id: "skill.basic_vlog_review", skill_version: 1, base_timeline_version: 2, composition_policy: "ordered", selections: [{ schema_version: 1, selection_id: "missing-version", preset_id: "basic_vertical_vlog", preset_version: 99, parameters: {}, bindings: { track_id: "review-video", clip_id: "review-video-0" } }] }, { aspect_ratio: "9:16" });
  const missingAspect = host.resolveCreativeSkill({ schema_version: 1, application_id: "review-blocked-aspect", skill_id: "skill.basic_vlog_review", skill_version: 1, base_timeline_version: 2, composition_policy: "ordered", selections: [{ schema_version: 1, selection_id: "missing-aspect", preset_id: "basic_vertical_vlog", preset_version: 1, parameters: {}, bindings: { track_id: "review-video", clip_id: "review-video-0" } }] });
  assert.equal(unavailableVersion.status, "blocked");
  assert.equal(missingAspect.status, "blocked");

  const render = await host.renderTimeline({
    sources: [...proxySources, { asset_ref: musicMedia.asset_id, original_ref: musicPath, proxy_ref: musicPath, source_timescale: musicScale, has_audio: hasAudio(musicMedia) }],
    outputDirectory: resolve(projectRoot, "renders"),
    profile: { name: "basic-vlog-real-review", width: 360, height: 640 },
  });
  assert.equal(render.status.qc, "passed");
  const previewOutput = (render.preview as any).outputs.find((item: any) => item.kind === "render");
  const masterOutput = (render.master as any).outputs.find((item: any) => item.kind === "render");
  assert.ok(previewOutput?.path && masterOutput?.path);
  const applicationOutputManifests = (host.listRenderManifests() as any[]).filter((item) => item.manifest_type === "output_manifest");
  assert.equal(applicationOutputManifests.length, 2);
  assert.equal(applicationOutputManifests.every((manifest) => manifest.value.preset_application_link?.application_id === presetApplication.application_id), true, "formal Preview and Master outputs must link the applied Preset provenance");
  assert.equal(applicationOutputManifests.every((manifest) => manifest.value.preset_application_link?.actual_preview_plan_id === previewOutput.execution_plan_id && manifest.value.preset_application_link?.actual_master_plan_id === masterOutput.execution_plan_id), true, "Preset provenance must name the actual formal render plans");
  assert.equal(applicationOutputManifests.every((manifest) => manifest.value.preset_application_link?.candidate_preview_plan_id === presetApplication.render_validation?.preview_plan_id && manifest.value.preset_application_link?.candidate_master_plan_id === presetApplication.render_validation?.master_plan_id), true, "formal output must preserve the candidate-plan linkage without confusing it with actual plan identity");
  assert.equal(applicationOutputManifests.every((manifest) => manifest.value.preset_application_link?.verified_semantic_links === presetApplication.render_validation?.semantic_links.length), true);
  assert.equal(applicationOutputManifests.every((manifest) => manifest.value.preset_application_link?.candidate_source_identity_hash === presetApplication.render_validation?.source_identity_hash), true);
  assert.equal(applicationOutputManifests.every((manifest) => /^[0-9a-f]{64}$/.test(manifest.value.preset_application_link?.actual_source_identity_hash ?? "")), true);
  assert.equal(applicationOutputManifests.every((manifest) => manifest.value.preset_application_link?.actual_source_identity_hash !== manifest.value.preset_application_link?.candidate_source_identity_hash), true, "actual Proxy-backed source identity must remain distinct from the Original-only candidate identity");
  await copyFile(previewOutput.path, resolve(projectRoot, "renders", "preview.mp4"));
  await copyFile(masterOutput.path, resolve(projectRoot, "renders", "master.mp4"));
  const masterMetrics = (render.master as any).metrics;
  const review = {
    project_root: projectRoot,
    source_media: mediaPaths.slice(0, 2),
    dialogue_source: dialogueMedia.location_ref,
    music_source: musicPath,
    preview: resolve(projectRoot, "renders", "preview.mp4"),
    master: resolve(projectRoot, "renders", "master.mp4"),
    timeline_version: (host.readTimelineSnapshot() as any).version,
    qc: render.status.qc,
    audio_normalization: masterMetrics.audio_normalization,
    ducking_status: masterMetrics.ducking_status,
    render_results: host.listRenderResults().length,
    render_manifests: host.listRenderManifests().length,
    preset_application: presetApplication,
    preset_application_link: applicationOutputManifests[0].value.preset_application_link,
    blocker_examples: resolve(projectRoot, "BLOCKER-EXAMPLES.json"),
    review_points: ["9:16 blurred background then contain composition", "video fade-in and fade-out", "narration ducks real Music and Music recovers", "Master reaches configured loudness and true-peak bounds", "Chinese caption remains readable"],
  };
  await writeFile(resolve(projectRoot, "REVIEW.json"), `${JSON.stringify(review, (_key, value) => typeof value === "bigint" ? `${value}n` : value, 2)}\n`, "utf8");
  await writeFile(resolve(projectRoot, "BLOCKER-EXAMPLES.json"), `${JSON.stringify({ unavailable_version: unavailableVersion, missing_aspect_ratio: missingAspect }, (_key, value) => typeof value === "bigint" ? `${value}n` : value, 2)}\n`, "utf8");
  await writeFile(resolve(projectRoot, "README-审阅.txt"), `请审阅：\r\n1. renders\\preview.mp4\r\n2. renders\\master.mp4\r\n3. BLOCKER-EXAMPLES.json\r\n4. SOURCE-ATTRIBUTION.md\r\n\r\n重点：9:16 构图、开头/结尾淡入淡出、旁白时真实音乐压低及其后恢复、中文字幕、整体响度，以及阻断说明和署名是否清楚。\r\n`, "utf8");
  const projectId = host.status().project;
  await host.close();
  await host.open(projectRoot);
  assert.equal(host.status().project, projectId);
  assert.equal(host.listMedia().length, 3);
  assert.equal(host.listRenderResults().length, 2);
  assert.equal(host.listPresetApplications().length, 1);
  assert.equal((host.listRenderManifests() as any[]).filter((item) => item.manifest_type === "execution_plan").length, 2);
  assert.equal((host.listRenderManifests() as any[]).filter((item) => item.manifest_type === "output_manifest").length, 2);
  console.log(`basic Vlog real review project passed: ${projectRoot}`);
} finally {
  await worker?.close();
  await host.close();
}
