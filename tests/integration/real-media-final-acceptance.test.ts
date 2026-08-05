import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { delimiter, resolve } from "node:path";
import { tmpdir } from "node:os";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { buildTimelineRenderGraph, canonicalSerialize, renderGraphPayload, resolveExecutionPlan } from "../../packages/core/render-graph/src/public.js";
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

const root = await mkdtemp(resolve(tmpdir(), "ave-real-final-"));
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
    const selectedDuration = sourceDuration < scale ? sourceDuration : scale;
    const timelineDuration = selectedDuration * timelineScale / scale;
    const clip = { clip_id: `real-video-${index}`, source: { asset_id: media.asset_id as any, start_pts: 0n, end_pts: selectedDuration, timescale: scale }, timeline_start: timelineCursor, timeline_duration: timelineDuration, media_kind: "video" as const };
    timelineCursor += timelineDuration;
    return clip;
  });
  const first = mediaInfo[0];
  const firstAudio = streamFor(first.media, "audio");
  const audioDuration = duration(firstAudio, first.media.location_ref);
  const audioScale = timescale(firstAudio, first.media.location_ref);
  const audioSourceDuration = timelineCursor * audioScale / timelineScale;
  assert.ok(audioSourceDuration <= audioDuration, "first real audio stream is too short to cover the acceptance timeline");
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
  const audioClip = { clip_id: "real-audio-1", source: { asset_id: first.media.asset_id as any, start_pts: 0n, end_pts: audioSourceDuration, timescale: audioScale }, timeline_start: 0n, timeline_duration: timelineCursor, media_kind: "audio" as const };
  await host.initializeTimeline([{ track_id: "real-video", kind: "video", clips: [] }, { track_id: "real-audio", kind: "audio", clips: [] }]);
  host.applyTimelineCommands([...videoClips.map((clip) => ({ type: "add_clip" as const, track_id: "real-video", clip })), { type: "add_clip" as const, track_id: "real-audio", clip: audioClip }], 0);
  host.applyTimelineCommand({ type: "trim_source", track_id: "real-video", clip_id: videoClips[0].clip_id, source: { ...videoClips[0].source, end_pts: videoClips[0].source.end_pts - 1n } }, 1);
  host.applyTimelineCommand({ type: "move_clip", track_id: "real-video", clip_id: videoClips[1].clip_id, timeline_start: videoClips[1].timeline_start + timelineScale }, 2);
  host.undoTimeline();
  host.redoTimeline();
  host.undoTimeline();
  host.applyTimelineCommand({ type: "add_caption", track_id: "real-video", caption: { caption_id: "real-caption-1", text: subtitle, timeline_start: 0n, timeline_duration: timelineScale * 2n, language: "und" } }, 6);
  const timeline = host.readTimelineSnapshot() as any;
  const sources = new Map(sourcesWithProxy.map((source) => [source.asset_ref, source]));
  const renders = [] as any[];
  for (const target of ["preview", "master"] as const) {
    const graph = buildTimelineRenderGraph(timeline, sources, target, { name: `real-${target}`, width: 640, height: 360 });
    const plan = resolveExecutionPlan(graph, target);
    if (process.env.AVE_IDENTITY_DEBUG_DIR) {
      await mkdir(process.env.AVE_IDENTITY_DEBUG_DIR, { recursive: true });
      await writeFile(resolve(process.env.AVE_IDENTITY_DEBUG_DIR, `${target}-graph.json`), renderGraphPayload(graph));
      await writeFile(resolve(process.env.AVE_IDENTITY_DEBUG_DIR, `${target}-plan.json`), canonicalSerialize(plan));
    }
    const result = await worker.submit("render.timeline.v1", { graph: JSON.parse(renderGraphPayload(graph)), execution_plan: JSON.parse(canonicalSerialize(plan)), output_dir: resolve(root, "renders") });
    const output = (result as any).outputs?.find((candidate: any) => candidate.kind === "render");
    assert.ok(output?.path, `${target} render output missing: ${JSON.stringify(result)}`);
    renders.push({ target, output, result });
  }
  const master = renders.find((render) => render.target === "master");
  const qc = await worker.submit("qc.master.v1", { master_path: master.output.path, source_kind: "original", source_identity: { source_kind: "original", asset_id: first.media.asset_id }, require_audio: true, qc_requirements: { subtitle_bounds: { satisfied: true, evidence: [subtitle] } } });
  const qcReport = (qc as any).outputs?.find((candidate: any) => candidate.kind === "qc")?.report;
  assert.equal(qcReport?.status, "passed", JSON.stringify(qcReport));
  for (const format of ["otio", "fcpxml", "edl"] as const) assert.deepEqual(host.validateTimelineExport(format, host.exportTimeline(format)), []);
  const projectId = host.status().project;
  await host.close();
  await host.open(root);
  assert.equal(host.status().project, projectId);
  assert.equal((host.readTimelineSnapshot() as any).tracks.length, 2);
  assert.equal(host.listMedia().length, mediaPaths.length);
  console.log(`real media final acceptance passed (${mediaPaths.length} files, Preview/Master/QC, close/reopen, adapters)`);
} finally {
  await host.close();
  if (typeof global.gc === "function") global.gc();
  await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}
