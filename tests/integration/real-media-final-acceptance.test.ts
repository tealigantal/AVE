import assert from "node:assert/strict";
import { readFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { delimiter, resolve } from "node:path";
import { tmpdir } from "node:os";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { readLatestRenderResult, openProject } from "../../packages/platform/project-storage/src/public.js";
import { createLocalWorkerJobPort } from "../../packages/platform/worker-client/src/public.js";

type ProbeStream = Readonly<{ codec_type?: string; time_base?: string; duration_ts?: number | string }>;
type ImportedMedia = Readonly<{ asset_id: string; location_ref: string; probe: { streams?: readonly ProbeStream[]; timing?: { streams?: Record<string, ProbeStream> } } }>;

function pathsFromEnvironment(): readonly string[] {
  return (process.env.AVE_REAL_MEDIA_PATHS ?? "").split(delimiter).map((value) => value.trim()).filter(Boolean);
}

function streamFor(media: ImportedMedia, kind: string): ProbeStream {
  const stream = Object.entries(media.probe.timing?.streams ?? {}).find(([index, candidate]) => media.probe.streams?.find((original, originalIndex) => String(originalIndex) === index || String((original as any).index) === index)?.codec_type === kind && candidate.time_base && candidate.duration_ts !== undefined)?.[1];
  if (!stream) throw new Error(`BLOCKED: imported media has no usable ${kind} stream: ${media.location_ref}`);
  return stream;
}

function timescale(stream: ProbeStream, path: string): bigint {
  const match = String(stream.time_base).match(/^(\d+)\/(\d+)$/);
  if (!match || match[1] !== "1") throw new Error(`BLOCKED: unsupported non-unit media time base ${stream.time_base}: ${path}`);
  const value = BigInt(match[2]);
  if (value <= 0n) throw new Error(`BLOCKED: invalid media time base: ${path}`);
  return value;
}

function duration(stream: ProbeStream, path: string): bigint {
  const value = BigInt(String(stream.duration_ts));
  if (value <= 0n) throw new Error(`BLOCKED: media duration is not positive: ${path}`);
  return value;
}

function captionText(raw: string): string {
  const line = raw.split(/\r?\n/).map((value) => value.trim()).find((value) => value && !/^\d+$/.test(value) && !/^\d{2}:\d{2}:\d{2}[,.]\d{3}\s+-->/.test(value));
  if (!line) throw new Error("BLOCKED: subtitle fixture has no readable caption text");
  return line;
}

function reviveProxyMap(value: any): any {
  const time = (point: any) => ({ value: BigInt(String(point.value)), timescale: BigInt(String(point.timescale)) });
  return { schema_version: 1, original_timebase: BigInt(String(value.original_timebase)), proxy_timebase: BigInt(String(value.proxy_timebase)), segments: (value.segments ?? []).map((segment: any) => ({ original_start: time(segment.original_start), original_end: time(segment.original_end), proxy_start: time(segment.proxy_start), proxy_end: time(segment.proxy_end) })), ...(value.audio ? { audio: { original_sample_rate: BigInt(String(value.audio.original_sample_rate)), proxy_sample_rate: BigInt(String(value.audio.proxy_sample_rate)) } } : {}) };
}

const mediaPaths = pathsFromEnvironment();
const subtitlePath = process.env.AVE_REAL_SUBTITLE_PATH;
if (mediaPaths.length < 2 || !subtitlePath) {
  console.error("BLOCKED: real-media-final-acceptance requires AVE_REAL_MEDIA_PATHS and AVE_REAL_SUBTITLE_PATH");
  process.exit(2);
}

const preservedRoot = process.env.AVE_REAL_ACCEPTANCE_OUTPUT_DIR ? resolve(process.env.AVE_REAL_ACCEPTANCE_OUTPUT_DIR) : undefined;
const root = preservedRoot ?? await mkdtemp(resolve(tmpdir(), "ave-real-final-"));
if (preservedRoot) await mkdir(root, { recursive: true });
const host = new ProjectHostSession();
try {
  await host.create(root);
  const imported = (await host.importMedia(mediaPaths)) as ImportedMedia[];
  assert.equal(imported.length, mediaPaths.length);
  assert.ok(host.listJobs().every((job: any) => job.state === "SUCCEEDED"));

  const mediaInfo = imported.map((media) => {
    const video = streamFor(media, "video");
    return { media, video, scale: timescale(video, media.location_ref), duration: duration(video, media.location_ref) };
  });
  const timelineScale = mediaInfo[0].scale;
  let timelineCursor = 0n;
  const videoClips = mediaInfo.map(({ media, scale, duration: sourceDuration }, index) => {
    const selectedDuration = sourceDuration < scale * 5n ? sourceDuration : scale * 5n;
    const timelineDuration = selectedDuration * timelineScale / scale;
    const clip = { clip_id: `real-video-${index}`, source: { asset_id: media.asset_id as any, start_pts: 0n, end_pts: selectedDuration, timescale: scale }, timeline_start: timelineCursor, timeline_duration: timelineDuration, media_kind: "video" as const };
    timelineCursor += timelineDuration;
    return clip;
  });
  const first = mediaInfo[0];
  const firstAudio = streamFor(first.media, "audio");
  const audioDuration = duration(firstAudio, first.media.location_ref);
  const audioScale = timescale(firstAudio, first.media.location_ref);
  const audioSourceDuration = audioDuration < audioScale * 5n ? audioDuration : audioScale * 5n;
  const subtitle = captionText(await readFile(subtitlePath, "utf8"));
  const worker = createLocalWorkerJobPort();
  const sourcesWithProxy = await Promise.all(mediaInfo.map(async ({ media, scale }, index) => {
    const proxyResult = await worker.submit("media.proxy.v1", { input_path: media.location_ref, output_dir: resolve(root, "proxies", String(index)) });
    const proxyOutput = (proxyResult as any).outputs?.find((candidate: any) => candidate.kind === "proxy");
    assert.ok(proxyOutput?.path, `proxy output missing for ${media.location_ref}`);
    assert.ok(proxyOutput.proxy_map?.segments?.length >= 1, `proxy map missing for ${media.location_ref}`);
    const proxyMap = reviveProxyMap(proxyOutput.proxy_map);
    return { asset_ref: media.asset_id, original_ref: media.location_ref, proxy_ref: proxyOutput.path, source_timescale: scale, proxy_timescale: proxyMap.proxy_timebase, proxy_map: proxyMap };
  }));
  const audioClip = { clip_id: "real-audio-1", source: { asset_id: first.media.asset_id as any, start_pts: 0n, end_pts: audioSourceDuration, timescale: audioScale }, timeline_start: 0n, timeline_duration: audioSourceDuration * timelineScale / audioScale, media_kind: "audio" as const };
  await host.initializeTimeline([{ track_id: "real-video", kind: "video", clips: [] }, { track_id: "real-audio", kind: "audio", clips: [] }]);
  host.applyTimelineCommands([...videoClips.map((clip) => ({ type: "add_clip" as const, track_id: "real-video", clip })), { type: "add_clip" as const, track_id: "real-audio", clip: audioClip }], 0);
  host.applyTimelineCommand({ type: "trim_source", track_id: "real-video", clip_id: videoClips[0].clip_id, source: { ...videoClips[0].source, end_pts: videoClips[0].source.end_pts - 1n } }, 1);
  host.applyTimelineCommand({ type: "move_clip", track_id: "real-video", clip_id: videoClips[1].clip_id, timeline_start: videoClips[1].timeline_start + timelineScale }, 2);
  host.undoTimeline();
  host.redoTimeline();
  host.applyTimelineCommand({ type: "add_caption", track_id: "real-video", caption: { caption_id: "real-caption-1", text: subtitle, timeline_start: 0n, timeline_duration: timelineScale * 2n, language: "und" } }, 5);
  const timeline = host.readTimelineSnapshot() as any;
  const rendered = await host.renderTimeline({ sources: sourcesWithProxy, profile: { name: "real-final", width: 640, height: 360 }, qcRequirements: { subtitle_bounds: { satisfied: true, evidence: [subtitle] } } });
  assert.equal(rendered.status.qc, "passed", JSON.stringify({ status: rendered.status, qc_issues: host.listQcIssues() }));
  assert.ok((rendered.preview as any).outputs?.some((candidate: any) => candidate.kind === "render"));
  assert.ok((rendered.master as any).outputs?.some((candidate: any) => candidate.kind === "render"));
  for (const format of ["otio", "fcpxml", "edl"] as const) assert.deepEqual(host.validateTimelineExport(format, host.exportTimeline(format)), []);
  const projectId = host.status().project;
  await host.close();
  const reopenedSession = await openProject(root);
  const persistedMaster = readLatestRenderResult(reopenedSession, projectId, "master") as any;
  assert.ok(persistedMaster?.output_hash && persistedMaster?.graph_hash);
  assert.equal(persistedMaster.timeline_version, 6);
  await reopenedSession.close();
  await host.open(root);
  assert.equal(host.status().project, projectId);
  assert.equal((host.readTimelineSnapshot() as any).tracks.length, 2);
  assert.equal(host.listMedia().length, mediaPaths.length);
  console.log(`real media final acceptance passed (${mediaPaths.length} files, Preview/Master/QC, close/reopen, adapters)`);
} finally {
  await host.close();
  if (typeof global.gc === "function") global.gc();
  if (!preservedRoot) await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}
