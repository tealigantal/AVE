import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { AssetId } from "../../packages/core/media-identity/src/public.js";
import type { TimelineCommand } from "../../packages/core/timeline-core/src/public.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

type Manifest = Readonly<{ schema_version: 1; originals: readonly Readonly<{ path: string; attribution?: string }>[] }>;
type Imported = Readonly<{ asset_id: string; location_ref: string; probe: { streams?: readonly Readonly<{ codec_type?: string; time_base?: string; duration_ts?: string | number; width?: number; height?: number }>[] } }>;
type FrameStats = Readonly<{ bbox: readonly [number, number, number, number]; center: readonly [number, number]; width: number; height: number; mean_luma: number }>;
type FrameTiming = Readonly<{ frame_count: number; r_frame_rate: string; time_base: string; timestamp_step: string; step_seconds: number }>;
type TrajectoryPoint = Readonly<{ frame: number; center_x: number; center_y: number }>;
type TrajectoryPhase = Readonly<{ name: string; frame_count: number; first_y: number; last_y: number; y_range: number; minimum_step: number; maximum_step: number; reverse_steps_over_quarter_pixel: number }>;

const run = promisify(execFile);
const manifestPath = process.env.AVE_REAL_MEDIA_MANIFEST;
const projectRoot = process.env.AVE_TRANSFORM_AUTOMATION_REVIEW_ROOT;
if (!manifestPath) throw new Error("TRANSFORM_AUTOMATION_REAL_MEDIA_MANIFEST_REQUIRED: set AVE_REAL_MEDIA_MANIFEST to an authorized repository-external JSON manifest");
if (!projectRoot) throw new Error("TRANSFORM_AUTOMATION_REVIEW_ROOT_REQUIRED: set AVE_TRANSFORM_AUTOMATION_REVIEW_ROOT to a fresh repository-external directory");
let projectRootExists = true;
try { await access(projectRoot); } catch { projectRootExists = false; }
assert.equal(projectRootExists, false, "transform automation review root must not already exist");
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes.toString("utf8")) as Manifest;
if (manifest.schema_version !== 1 || !manifest.originals[0]?.path) throw new Error("TRANSFORM_AUTOMATION_REAL_MEDIA_MANIFEST_INVALID");

async function frameStats(path: string, time: number, width: number, height: number): Promise<FrameStats> {
  const frame = await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", String(time), "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"], { encoding: "buffer", maxBuffer: width * height * 4 });
  const points: Array<readonly [number, number, number]> = [];
  for (let index = 0; index < width * height; index += 1) {
    const red = frame.stdout[index * 3], green = frame.stdout[index * 3 + 1], blue = frame.stdout[index * 3 + 2];
    const luma = (red + green + blue) / 3;
    if (Math.max(red, green, blue) > 18) points.push([index % width, Math.floor(index / width), luma]);
  }
  if (points.length < 100) throw new Error("TRANSFORM_AUTOMATION_REAL_MEDIA_CONTRAST_INSUFFICIENT");
  const left = Math.min(...points.map(([x]) => x)), right = Math.max(...points.map(([x]) => x));
  const top = Math.min(...points.map(([, y]) => y)), bottom = Math.max(...points.map(([, y]) => y));
  return { bbox: [left, top, right, bottom], center: [(left + right) / 2, (top + bottom) / 2], width: right - left + 1, height: bottom - top + 1, mean_luma: points.reduce((sum, point) => sum + point[2], 0) / points.length };
}

async function meanVolume(path: string): Promise<number> {
  const result = await run("ffmpeg", ["-hide_banner", "-nostats", "-i", path, "-af", "volumedetect", "-vn", "-f", "null", "NUL"]);
  const match = result.stderr.match(/mean_volume:\s*(-?[\d.]+) dB/);
  if (!match) throw new Error("TRANSFORM_AUTOMATION_AUDIO_MEASUREMENT_MISSING");
  return Number(match[1]);
}

async function frameTiming(path: string): Promise<FrameTiming> {
  const result = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_frames", "-show_streams", "-show_entries", "stream=r_frame_rate,time_base:frame=best_effort_timestamp", "-of", "json", path]);
  const parsed = JSON.parse(String(result.stdout)) as { streams?: readonly Readonly<{ r_frame_rate?: string; time_base?: string }>[]; frames?: readonly Readonly<{ best_effort_timestamp?: number | string }>[] };
  const stream = parsed.streams?.[0], frames = parsed.frames ?? [];
  if (!stream?.r_frame_rate || !stream.time_base || frames.length < 2 || frames.some((frame) => frame.best_effort_timestamp === undefined)) throw new Error("TRANSFORM_AUTOMATION_FRAME_TIMING_MISSING");
  const timestamps = frames.map((frame) => BigInt(String(frame.best_effort_timestamp)));
  const steps = timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]);
  assert.equal(new Set(steps.map(String)).size, 1, `encoded video timestamps must have one cadence: ${steps.map(String).join(",")}`);
  const timeBase = stream.time_base.match(/^(\d+)\/(\d+)$/);
  if (!timeBase) throw new Error("TRANSFORM_AUTOMATION_FRAME_TIME_BASE_INVALID");
  return { frame_count: frames.length, r_frame_rate: stream.r_frame_rate, time_base: stream.time_base, timestamp_step: String(steps[0]), step_seconds: Number(steps[0]) * Number(timeBase[1]) / Number(timeBase[2]) };
}

async function frameTrajectory(path: string, width: number, height: number): Promise<readonly TrajectoryPoint[]> {
  const frameBytes = width * height;
  const result = await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", path, "-vf", "format=gray", "-an", "-f", "rawvideo", "pipe:1"], { encoding: "buffer", maxBuffer: frameBytes * 1500 });
  const decoded = result.stdout as Buffer;
  if (decoded.length === 0 || decoded.length % frameBytes !== 0) throw new Error("TRANSFORM_AUTOMATION_FRAME_TRAJECTORY_MISSING");
  const points: TrajectoryPoint[] = [];
  for (let frame = 0; frame < decoded.length / frameBytes; frame += 1) {
    let totalWeight = 0, weightedX = 0, weightedY = 0;
    const offset = frame * frameBytes;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const luma = decoded[offset + y * width + x];
        if (luma <= 8) continue;
        const weight = luma - 8;
        totalWeight += weight;
        weightedX += weight * x;
        weightedY += weight * y;
      }
    }
    if (totalWeight === 0) throw new Error(`TRANSFORM_AUTOMATION_FRAME_TRAJECTORY_EMPTY:${frame}`);
    points.push({ frame, center_x: weightedX / totalWeight, center_y: weightedY / totalWeight });
  }
  return points;
}

async function frameHashes(path: string): Promise<readonly string[]> {
  const result = await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", path, "-an", "-f", "framemd5", "-"]);
  const hashes = String(result.stdout).split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => line.split(",").at(-1)?.trim() ?? "");
  if (hashes.length === 0 || hashes.some((hash) => !hash)) throw new Error("TRANSFORM_AUTOMATION_FRAME_HASHES_MISSING");
  return hashes;
}

function phaseFrameContent(hashes: readonly string[], firstFrame: number, lastFrame: number, edgeFrames: number): Readonly<{ frame_count: number; unique_frames: number; adjacent_duplicates: number; two_frame_duplicates: number; maximum_duplicate_run: number; core_frame_count: number; core_adjacent_duplicates: number; core_two_frame_duplicates: number }> {
  const phase = hashes.slice(firstFrame, lastFrame + 1);
  let adjacentDuplicates = 0, twoFrameDuplicates = 0, duplicateRun = 0, maximumDuplicateRun = 0;
  for (let index = 1; index < phase.length; index += 1) {
    if (phase[index] === phase[index - 1]) {
      adjacentDuplicates += 1;
      duplicateRun += 1;
      maximumDuplicateRun = Math.max(maximumDuplicateRun, duplicateRun);
    } else duplicateRun = 0;
    if (index >= 2 && phase[index] === phase[index - 2]) twoFrameDuplicates += 1;
  }
  const core = phase.slice(edgeFrames, phase.length - edgeFrames);
  const coreAdjacentDuplicates = core.slice(1).filter((hash, index) => hash === core[index]).length;
  const coreTwoFrameDuplicates = core.slice(2).filter((hash, index) => hash === core[index]).length;
  return { frame_count: phase.length, unique_frames: new Set(phase).size, adjacent_duplicates: adjacentDuplicates, two_frame_duplicates: twoFrameDuplicates, maximum_duplicate_run: maximumDuplicateRun, core_frame_count: core.length, core_adjacent_duplicates: coreAdjacentDuplicates, core_two_frame_duplicates: coreTwoFrameDuplicates };
}

function trajectoryPhase(points: readonly TrajectoryPoint[], name: string, firstFrame: number, lastFrame: number, direction: "hold" | "down" | "up"): TrajectoryPhase {
  const phase = points.filter((point) => point.frame >= firstFrame && point.frame <= lastFrame);
  if (phase.length !== lastFrame - firstFrame + 1) throw new Error(`TRANSFORM_AUTOMATION_TRAJECTORY_PHASE_MISSING:${name}`);
  const steps = phase.slice(1).map((point, index) => point.center_y - phase[index].center_y);
  const reverseSteps = direction === "down" ? steps.filter((step) => step < -0.25) : direction === "up" ? steps.filter((step) => step > 0.25) : [];
  const yValues = phase.map((point) => point.center_y);
  return { name, frame_count: phase.length, first_y: phase[0].center_y, last_y: phase[phase.length - 1].center_y, y_range: Math.max(...yValues) - Math.min(...yValues), minimum_step: steps.length ? Math.min(...steps) : 0, maximum_step: steps.length ? Math.max(...steps) : 0, reverse_steps_over_quarter_pixel: reverseSteps.length };
}

const host = new ProjectHostSession();
try {
  await host.create(projectRoot);
  const [media] = await host.importMedia([manifest.originals[0].path]) as readonly Imported[];
  const video = media.probe.streams?.find((stream) => stream.codec_type === "video");
  const audio = media.probe.streams?.find((stream) => stream.codec_type === "audio");
  const timeBase = video?.time_base?.match(/^1\/(\d+)$/);
  const audioTimeBase = audio?.time_base?.match(/^1\/(\d+)$/);
  if (!video || !audio || !timeBase || !audioTimeBase || !video.duration_ts || !audio.duration_ts || !video.width || !video.height) throw new Error("TRANSFORM_AUTOMATION_REAL_MEDIA_AV_TIMING_REQUIRED");
  const timescale = BigInt(timeBase[1]);
  const audioTimescale = BigInt(audioTimeBase[1]);
  const duration = timescale * 12n;
  const sourceVideoDuration = BigInt(String(video.duration_ts));
  const audioDuration = audioTimescale * 5n;
  if (sourceVideoDuration < timescale * 2n || BigInt(String(audio.duration_ts)) < audioDuration) throw new Error("TRANSFORM_AUTOMATION_REAL_MEDIA_DURATION_INSUFFICIENT");
  const profile = { name: "registered-transform-automation-real", width: 640, height: 360, fps: 120 } as const;
  const initialScale = Math.min(0.55, 240 / video.width, 140 / video.height);
  const bottomScaleX = initialScale, bottomScaleY = initialScale;
  const asset = media.asset_id as AssetId;
  host.initializeTimeline([{ track_id: "main", kind: "video", muted: true, clips: [] }, { track_id: "sound", kind: "audio", clips: [], audio_routing: [] }]);
  const curve = (index: number, property_path: string, top: number, bottom: number): TimelineCommand => {
    const points = [
      { suffix: "top-start", second: 0n, value: top },
      { suffix: "descent-start", second: 1n, value: top },
      { suffix: "bottom-arrival", second: 5n, value: bottom },
      { suffix: "ascent-start", second: 6n, value: bottom },
      { suffix: "top-return", second: 10n, value: top },
      { suffix: "top-end", second: 12n, value: top }
    ];
    return { type: "set_automation_curve", track_id: "main", curve: { curve_id: `real-transform-${index}`, target_id: "real-clip", property_path, value_kind: "number", keyframes: points.map((point, pointIndex) => ({ keyframe_id: `real-transform-${index}-${point.suffix}`, time: timescale * point.second, value: point.value, ...(pointIndex < points.length - 1 ? { interpolation: pointIndex === 1 || pointIndex === 3 ? "bezier" as const : "linear" as const } : {}), ...(pointIndex === 1 || pointIndex === 3 ? { out_tangent: { time: 1, value: 0 } } : {}), ...(pointIndex === 2 || pointIndex === 4 ? { in_tangent: { time: 1, value: 0 } } : {}) })) } };
  };
  const commands: TimelineCommand[] = [
    { type: "add_clip", track_id: "main", clip: { clip_id: "real-clip", media_kind: "video", source: { asset_id: asset, start_pts: 0n, end_pts: sourceVideoDuration, timescale }, timeline_start: 0n, timeline_duration: duration, time_map: { map_id: "real-transform-freeze", pitch_policy: "preserve", segments: [{ segment_id: "real-transform-held-frame", timeline_start: 0n, timeline_end: duration, source_start: timescale, source_end: timescale, mode: "hold" }] } } },
    { type: "add_clip", track_id: "sound", clip: { clip_id: "real-sound", media_kind: "audio", source: { asset_id: asset, start_pts: 0n, end_pts: audioDuration, timescale: audioTimescale }, timeline_start: 0n, timeline_duration: timescale * 5n } },
    curve(0, "transform.x", 280, 360),
    curve(1, "transform.y", 80, 260),
    curve(2, "transform.scale_x", initialScale, bottomScaleX),
    curve(3, "transform.scale_y", initialScale, bottomScaleY),
    curve(4, "transform.rotation", 0, 0),
    curve(5, "transform.anchor_x", 0.5, 0.5),
    curve(6, "transform.anchor_y", 0.5, 0.5),
    curve(7, "transform.opacity", 1, 1)
  ];
  host.executeEdit({ intent_id: "wp-kf-002-real-transform", base_version: 0, actor: { actor_id: "wp-kf-002-acceptance", producer: "manual" }, targets: [{ track_id: "main", clip_id: "real-clip" }, { track_id: "sound", clip_id: "real-sound" }], commands, semantic_refs: ["ACC-035"], preconditions: [{ kind: "timeline_version", version: 0 }], protected_refs: [], provenance: { source_id: "WP-KF-002", source_version: 1 }, reason: "commit the registered transform automation acceptance slice", expected_effects: ["position changes over clip-local time while scale, rotation, anchor and opacity remain stable for the smooth-motion visual sample", "authorized source audio remains audible"] });
  const committed = host.readTimelineSnapshot() as any;
  assert.equal(committed.version, 1);
  assert.equal(committed.tracks[0].automation_curves.length, 8);
  const authorityCounts = () => {
    const db = (host as any).session.db;
    const count = (table: string): number => Number(db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count);
    return { timeline_versions: count("timeline_versions"), timeline_commands: count("timeline_commands"), project_events: count("project_events"), render_results: host.listRenderResults().length, render_manifests: host.listRenderManifests().length, render_bundles: count("render_bundles") };
  };
  const stableAuthority = authorityCounts();
  const invalidTangent = curve(8, "transform.x", 160, 200) as any;
  invalidTangent.curve.keyframes[0].interpolation = "bezier";
  invalidTangent.curve.keyframes[0].out_tangent = { time: 0, value: 1 };
  const wrongValueKind = curve(8, "transform.x", 160, 200) as any;
  wrongValueKind.curve.value_kind = "boolean";
  const overshoot = curve(8, "transform.opacity", 0.5, 0.5) as any;
  overshoot.curve.keyframes[0].interpolation = "bezier";
  overshoot.curve.keyframes[0].out_tangent = { time: 0.1, value: 1 };
  overshoot.curve.keyframes[1].in_tangent = { time: 0.1, value: -1 };
  const unknownInterpolation = curve(8, "transform.x", 160, 200) as any;
  unknownInterpolation.curve.keyframes[0].interpolation = "spline";
  const audioTarget = { ...(curve(8, "transform.x", 0, 10) as any), track_id: "sound", curve: { ...(curve(8, "transform.x", 0, 10) as any).curve, target_id: "real-sound" } };
  for (const [command, pattern] of [
    [curve(8, "transform.opacity", 1, 1.2), /out of range/],
    [curve(8, "transform.opacity", 1, 0.8), /duplicate automation target and property path/],
    [curve(8, "unknown.transform", 0, 1), /not registered/],
    [invalidTangent, /positive time/],
    [wrongValueKind, /value kind|value_kind/],
    [overshoot, /bezier segment is out of range/],
    [unknownInterpolation, /interpolation is not registered/],
    [audioTarget, /AUTOMATION_TARGET_INVALID/]
  ] as const) assert.throws(() => host.applyTimelineCommand(command as TimelineCommand, 1), pattern);
  assert.equal((host.readTimelineSnapshot() as any).version, 1, "rejected commands must not mutate Timeline version");
  assert.deepEqual(authorityCounts(), stableAuthority, "invalid automation must not publish Timeline, command, event, render, manifest, or bundle rows");

  const rendered = await host.renderTimeline({ sources: [{ asset_ref: media.asset_id, original_ref: media.location_ref, source_timescale: timescale }], outputDirectory: resolve(projectRoot, "renders"), profile, qcRequirements: { planned_freeze: true, planned_silence: true } });
  assert.equal(rendered.status.qc, "passed");
  const previewOutput = (rendered.preview as any).outputs.find((item: any) => item.kind === "render");
  const masterOutput = (rendered.master as any).outputs.find((item: any) => item.kind === "render");
  assert.ok(previewOutput?.path && masterOutput?.path);
  assert.ok(await meanVolume(masterOutput.path) > -60, "authorized source audio must remain measurably audible");
  const [previewTiming, masterTiming] = await Promise.all([frameTiming(previewOutput.path), frameTiming(masterOutput.path)]);
  const expectedFrames = profile.fps * 12;
  for (const timing of [previewTiming, masterTiming]) {
    assert.ok(timing.frame_count >= expectedFrames - 1 && timing.frame_count <= expectedFrames, `encoded output may omit at most one final stationary frame: ${JSON.stringify(timing)}`);
    assert.equal(timing.r_frame_rate, `${profile.fps}/1`, JSON.stringify(timing));
    assert.ok(Math.abs(timing.step_seconds - 1 / profile.fps) < 1e-9, JSON.stringify(timing));
  }
  assert.deepEqual(previewTiming, masterTiming);
  const [masterTrajectory, masterFrameHashes] = await Promise.all([frameTrajectory(masterOutput.path, profile.width, profile.height), frameHashes(masterOutput.path)]);
  assert.equal(masterTrajectory.length, masterTiming.frame_count);
  assert.equal(masterFrameHashes.length, masterTiming.frame_count);
  const trajectory = {
    top_hold_start: trajectoryPhase(masterTrajectory, "top_hold_start", 0, profile.fps - 1, "hold"),
    descent: trajectoryPhase(masterTrajectory, "descent", profile.fps, profile.fps * 5 - 1, "down"),
    bottom_hold: trajectoryPhase(masterTrajectory, "bottom_hold", profile.fps * 5, profile.fps * 6 - 1, "hold"),
    ascent: trajectoryPhase(masterTrajectory, "ascent", profile.fps * 6, profile.fps * 10 - 1, "up"),
    top_hold_end: trajectoryPhase(masterTrajectory, "top_hold_end", profile.fps * 10, masterTiming.frame_count - 1, "hold")
  };
  assert.ok(trajectory.top_hold_start.y_range <= 0.25 && trajectory.bottom_hold.y_range <= 0.25 && trajectory.top_hold_end.y_range <= 0.25, JSON.stringify(trajectory));
  assert.equal(trajectory.descent.reverse_steps_over_quarter_pixel, 0, JSON.stringify(trajectory));
  assert.equal(trajectory.ascent.reverse_steps_over_quarter_pixel, 0, JSON.stringify(trajectory));
  const frameContent = {
    descent: phaseFrameContent(masterFrameHashes, profile.fps, profile.fps * 5 - 1, Math.ceil(profile.fps * 0.3)),
    ascent: phaseFrameContent(masterFrameHashes, profile.fps * 6, profile.fps * 10 - 1, Math.ceil(profile.fps * 0.3))
  };
  for (const [name, phase] of Object.entries(frameContent)) {
    assert.ok(phase.unique_frames >= Math.floor(phase.frame_count * 0.95), `${name} must contain at least 95% distinct decoded frames: ${JSON.stringify(phase)}`);
    assert.ok(phase.maximum_duplicate_run <= Math.ceil(profile.fps * 0.3), `${name} may rasterize identically only inside the 0.3-second zero-velocity edge easing window: ${JSON.stringify(phase)}`);
    assert.equal(phase.core_adjacent_duplicates, 0, `${name} movement core must not contain adjacent decoded-frame duplicates: ${JSON.stringify(phase)}`);
    assert.equal(phase.core_two_frame_duplicates, 0, `${name} movement core must not repeat at the 30fps-equivalent cadence: ${JSON.stringify(phase)}`);
  }
  const cleanPlans = (host.listRenderManifests() as any[]).filter((item) => item.manifest_type === "execution_plan" && item.value.diagnostics.length === 0).map((item) => item.value);
  assert.equal(cleanPlans.length, 2);
  assert.equal(cleanPlans[0].semantic_graph_hash, cleanPlans[1].semantic_graph_hash);
  assert.ok(cleanPlans.every((plan) => plan.decisions.filter((decision: any) => decision.capability === "timeline.automation").length === 8));
  const masterResults = (host.listRenderResults() as any[]).filter((item) => item.target === "master");
  assert.ok(masterResults.every((item) => item.original_refs?.some((reference: any) => reference.asset_ref === media.asset_id && reference.object_ref)), "Master must retain verified Original provenance");

  const [previewStart, previewBottom, previewReturned, start, bottom, returned] = await Promise.all([
    frameStats(previewOutput.path, 0.5, profile.width, profile.height),
    frameStats(previewOutput.path, 5.5, profile.width, profile.height),
    frameStats(previewOutput.path, 10.5, profile.width, profile.height),
    frameStats(masterOutput.path, 0.5, profile.width, profile.height),
    frameStats(masterOutput.path, 5.5, profile.width, profile.height),
    frameStats(masterOutput.path, 10.5, profile.width, profile.height)
  ]);
  assert.ok(bottom.center[0] > start.center[0] + 40 && Math.abs(returned.center[0] - start.center[0]) <= 3, JSON.stringify({ start, bottom, returned }));
  assert.ok(bottom.center[1] > start.center[1] + 100 && bottom.center[1] > returned.center[1] + 100 && Math.abs(returned.center[1] - start.center[1]) <= 3, JSON.stringify({ start, bottom, returned }));
  assert.ok(Math.abs(bottom.width * bottom.height - start.width * start.height) <= start.width * start.height * 0.08 && Math.abs(returned.width * returned.height - start.width * start.height) <= start.width * start.height * 0.08, JSON.stringify({ start, bottom, returned }));
  assert.ok(Math.abs(bottom.mean_luma - start.mean_luma) <= 3 && Math.abs(returned.mean_luma - start.mean_luma) <= 3, JSON.stringify({ start, bottom, returned }));
  for (const [previewStats, masterStats] of [[previewStart, start], [previewBottom, bottom], [previewReturned, returned]] as const) {
    assert.ok(Math.abs(previewStats.center[0] - masterStats.center[0]) <= 2 && Math.abs(previewStats.center[1] - masterStats.center[1]) <= 2, JSON.stringify({ previewStats, masterStats }));
    assert.ok(Math.abs(previewStats.width - masterStats.width) <= 2 && Math.abs(previewStats.height - masterStats.height) <= 2, JSON.stringify({ previewStats, masterStats }));
    assert.ok(Math.abs(previewStats.mean_luma - masterStats.mean_luma) <= 3, JSON.stringify({ previewStats, masterStats }));
  }

  const stableRenderAuthority = authorityCounts();
  await assert.rejects(host.renderTimeline({ sources: [], outputDirectory: resolve(projectRoot, "missing-source"), profile }), /RENDER_SOURCE_MISSING/);
  assert.equal((host.readTimelineSnapshot() as any).version, 1);
  assert.deepEqual(authorityCounts(), stableRenderAuthority, "missing source must not publish any authoritative render artifact");
  const publicationBlocker = resolve(projectRoot, "publication-blocker");
  await writeFile(publicationBlocker, "this file intentionally occupies the requested output directory\n");
  await assert.rejects(host.renderTimeline({ sources: [{ asset_ref: media.asset_id, original_ref: media.location_ref, source_timescale: timescale }], outputDirectory: publicationBlocker, profile, qcRequirements: { planned_freeze: true, planned_silence: true } }), /WORKER_(JOB|HANDLER)_FAILED|ENOTDIR|EEXIST|WinError 183|not a directory/i);
  const afterPublicationFailure = authorityCounts();
  assert.equal(afterPublicationFailure.timeline_versions, stableRenderAuthority.timeline_versions);
  assert.equal(afterPublicationFailure.timeline_commands, stableRenderAuthority.timeline_commands);
  assert.equal(afterPublicationFailure.render_results, stableRenderAuthority.render_results);
  assert.equal(afterPublicationFailure.render_manifests, stableRenderAuthority.render_manifests);
  assert.equal(afterPublicationFailure.render_bundles, stableRenderAuthority.render_bundles, "Worker/publication failure must not create a successful or blocked render bundle");
  const renderCountAfterFailures = host.listRenderResults().length;
  const projectId = host.status().project;
  await host.close();
  await host.open(projectRoot);
  assert.equal(host.status().project, projectId);
  const reopened = host.readTimelineSnapshot() as any;
  assert.equal(reopened.version, 1);
  assert.deepEqual(reopened.tracks[0].automation_curves, committed.tracks[0].automation_curves, "close/reopen must preserve every curve field");
  assert.equal(host.listRenderResults().length, renderCountAfterFailures);
  const rerendered = await host.renderTimeline({ sources: [{ asset_ref: media.asset_id, original_ref: media.location_ref, source_timescale: timescale }], outputDirectory: resolve(projectRoot, "rerender"), profile, qcRequirements: { planned_freeze: true, planned_silence: true } });
  const rerenderedMaster = (rerendered.master as any).outputs.find((item: any) => item.kind === "render");
  assert.equal(rerenderedMaster.hash, masterOutput.hash, "reopen rerender must be deterministic");
  const semanticHashes = new Set((host.listRenderManifests() as any[]).filter((item) => item.manifest_type === "execution_plan" && item.value.diagnostics.length === 0).map((item) => item.value.semantic_graph_hash));
  assert.deepEqual([...semanticHashes], [cleanPlans[0].semantic_graph_hash]);

  const review = { schema_version: 1, work_package: "WP-KF-002", acceptance_id: "ACC-035", manifest_sha256: createHash("sha256").update(manifestBytes).digest("hex"), attribution: manifest.originals[0].attribution ?? null, source_asset_id: media.asset_id, timeline_version: 1, semantic_graph_hash: cleanPlans[0].semantic_graph_hash, preview_sha256: previewOutput.hash, master_sha256: masterOutput.hash, rerender_master_sha256: rerenderedMaster.hash, qc: rendered.status.qc, measurements: { frame_timing: { preview: previewTiming, master: masterTiming }, frame_content: frameContent, trajectory, preview: { top_start: previewStart, bottom: previewBottom, top_returned: previewReturned }, master: { top_start: start, bottom, top_returned: returned } }, failure_closure: { invalid_commands: 8, timeline_event_rows_unchanged: true, missing_source_artifacts_unchanged: true, publication_failure_artifacts_unchanged: true }, human_acceptance: "pending", review_questions: ["Does the twelve-second position-only motion hold at the top, ease into a smooth descent, hold at the bottom, ease into a smooth ascent and hold again without twitching?", "Does the moving card keep stable scale, rotation, anchor and opacity throughout this smoothness review?", "Does the 120 fps motion feel materially smoother than the rejected 30 fps and 60 fps artifacts?", "Does Preview convey the same position semantics as verified-Original Master?"] };
  await writeFile(resolve(projectRoot, "TRANSFORM-AUTOMATION-REVIEW.json"), JSON.stringify(review, null, 2) + "\n");
  await writeFile(resolve(projectRoot, "REVIEW.md"), "# WP-KF-002 Transform Automation Review\n\nReview the full twelve-second encoded Preview and verified-Original Master in `renders/`. The intended sequence is: top hold (0-1s), smooth descent (1-5s), bottom hold (5-6s), smooth ascent (6-10s), top hold (10-12s). This visual sample isolates position motion at 120 fps while scale, rotation, anchor and opacity remain stable, so any perceived twitch or cadence step is attributable to position execution. Combined and per-property transform behavior is covered separately by Worker media-correctness tests. Confirm there is no twitching during either moving phase and that Preview and Master feel equivalent. Machine timing, decoded-frame content and trajectory measurements are recorded in `TRANSFORM-AUTOMATION-REVIEW.json`; human acceptance remains authoritative.\n");
  console.log(`transform automation real-media precheck passed; human review pending: ${projectRoot}`);
} finally {
  await host.close();
}
