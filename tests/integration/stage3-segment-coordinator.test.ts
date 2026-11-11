import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, statSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, open, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { canonicalSerialize, renderGraphPayload, resolveExecutionPlan, type RenderGraph } from "../../packages/core/render-graph/src/public.js";
import { createLocalWorkerJobPort } from "../../packages/platform/worker-client/src/public.js";
import { createProject, openProject, readRenderSegmentCheckpoint, registerRenderSegmentCheckpoint } from "../../packages/platform/project-storage/src/public.js";
import { coordinateRenderSegments } from "../../packages/platform/project-host/src/render-segment-coordinator.js";
import type { RenderSegmentPlanV1 } from "../../contracts/generated/typescript/render/render-segment-plan.v1.js";

// This is a controlled Worker -> Host-owned storage integration test. It does
// not enable the blocked production resolver or claim a completed render.
const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "ave-segment-coordinator-"));
const project = resolve(root, "project"), staging = resolve(root, "worker-staging"), source = resolve(root, "source.mp4");
let session: any;
let worker: ReturnType<typeof createLocalWorkerJobPort> | undefined;
const hashText = (value: string) => createHash("sha256").update(value).digest("hex");
const hashFile = async (path: string) => { const hash = createHash("sha256"); for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) hash.update(chunk); return hash.digest("hex"); };
const decodedHash = (path: string, video: boolean): Promise<string> => new Promise((resolveHash, reject) => {
  const hash = createHash("sha256"), args = video ? ["-v", "error", "-i", path, "-map", "0:v:0", "-f", "framemd5", "-"] : ["-v", "error", "-i", path, "-map", "0:a:0", "-f", "f32le", "-acodec", "pcm_f32le", "-"];
  const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] }); let error = "";
  child.stdout.on("data", chunk => hash.update(chunk)); child.stderr.on("data", chunk => { error = (error + String(chunk)).slice(-4096); });
  child.once("error", reject); child.once("close", code => code === 0 ? resolveHash(hash.digest("hex")) : reject(new Error(`decode failed: ${error}`)));
});
try {
  await mkdir(project); await mkdir(staging);
  await run("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=64x64:r=30:d=11", "-f", "lavfi", "-i", "sine=frequency=517:sample_rate=44100:duration=11", "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", "-c:a", "aac", source]);
  const hash = await hashFile(source), asset = `asset:sha256:${hash}`;
  const where = await run(process.platform === "win32" ? "where.exe" : "which", ["ffmpeg"]);
  const executable = where.stdout.trim().split(/\r?\n/)[0]!;
  const executableHash = await hashFile(executable);
  session = await createProject(project);
  const projectId: string = session.manifest.project_id;
  const sourceParameters = { asset_ref: asset, source_ref: source, source_kind: "original", selected_object_ref: hash, track_kind: "video", track_id: "video", clip_id: "clip", has_audio: true, source_start_pts: "0n", source_end_pts: "330n", source_timescale: "30n", semantic_source_start_pts: "0n", semantic_source_end_pts: "330n", semantic_source_timescale: "30n", timeline_start: "0n", timeline_duration: "330n", timeline_timescale: "30n", timeline_total_duration: "330n" };
  const graph: RenderGraph = { schema_version: 1 as const, graph_id: "isolated-segments", timeline_version: 1, target: "master" as const, profile: { name: "master", width: 64, height: 64, fps: 30 }, nodes: [
    { node_id: "clip-clip-source", kind: "source" as const, capability: "source.original", parameters: sourceParameters },
    { node_id: "clip-clip-trim", kind: "trim" as const, capability: "timeline.trim", parameters: {} },
    { node_id: "clip-clip-audio", kind: "audio" as const, capability: "timeline.audio", parameters: { track_id: "video", clip_id: "clip", gain_db: 0, enabled: true, muted: false } },
    { node_id: "composite", kind: "composite" as const, capability: "timeline.composite" }, { node_id: "sink", kind: "sink" as const, capability: "sink.mp4" },
  ], edges: [], source_refs: [{ asset_ref: asset, original_object_ref: hash, source_timescale: 30n, has_audio: true }] };
  const policy = { schema_version: 1 as const, mode: "bounded-linear-v1" as const };
  const blocked = resolveExecutionPlan(graph, "master", policy);
  assert.deepEqual(blocked.diagnostics, []);
  assert.ok(blocked.decisions.every(item => item.outcome === "execute"));
  // Exercise the Worker and storage boundary without publishing a bundle.
  const execution = JSON.parse(canonicalSerialize({ ...blocked, diagnostics: [] }));
  const wireGraph = JSON.parse(renderGraphPayload(graph));
  const makePlan = (start: number, end: number, ffmpegHash = executableHash): RenderSegmentPlanV1 => {
    const identity: Omit<RenderSegmentPlanV1, "segment_id"> = { schema_version: 1, project_id: projectId, execution_plan_id: execution.plan_id, execution_cache_key: execution.cache_key, semantic_graph_hash: execution.semantic_graph_hash, graph_hash: hashText(canonicalSerialize(wireGraph)), target: "master", execution_policy: "bounded-linear-v1", worker_version: "ave-worker-host-r18", ffmpeg_sha256: ffmpegHash, source: { asset_ref: asset, source_kind: "original", selected_hash: hash, original_hash: hash, authorization_hash: hashText("controlled current permission") }, segment_index: start, clip_id: "clip", clip_frame_offset: start, frame_start: start, frame_end: end, sample_start: start * 1600, sample_end: end * 1600, has_audio: true, dependency_ids: [] };
    return { ...identity, segment_id: `segment-master-${hashText(canonicalSerialize(identity)).slice(0, 24)}` };
  };
  const before = statSync(source, { bigint: true });
  let authorized = true;
  const guard = () => {
    const current = statSync(source, { bigint: true });
    if (!authorized || current.dev !== before.dev || current.ino !== before.ino || current.size !== before.size || current.mtimeNs !== before.mtimeNs || current.ctimeNs !== before.ctimeNs) throw new Error("TEST_SOURCE_AUTHORITY_STALE");
  };
  const client = () => createLocalWorkerJobPort({ command: process.platform === "win32" ? "python" : "python3", args: [resolve("apps/worker-host/src/worker_host/main.py")], cwd: resolve(".") });
  worker = client();

  let calls: string[] = [];
  const trackingWorker = { submit: async <I, O>(task: string, input: I, control?: any): Promise<O> => { calls.push(task); return worker!.submit<I, O>(task, input, control); } };
  const verifySources = async () => { guard(); if (await hashFile(source) !== hash) throw new Error("TEST_SOURCE_HASH_CHANGED"); guard(); };
  const common = { session, projectId, graph, execution, worker: trackingWorker, outputDirectory: staging, assertCurrent: guard, verifySources, makePlans: (ffmpegHash: string) => [makePlan(0, 300, ffmpegHash), makePlan(300, 330, ffmpegHash)] };
  await assert.rejects(() => coordinateRenderSegments({ ...common, execution: { ...blocked, diagnostics: [{ schema_version: 1, code: "FIXTURE_BLOCKED", message: "fixture", severity: "blocker" }] }, signal: new AbortController().signal }), /RENDER_SEGMENT_EXECUTION_BLOCKED/);
  const cancel = new AbortController();
  await assert.rejects(() => coordinateRenderSegments({ ...common, signal: cancel.signal, onProgress: () => { if (session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='render_segment'").get().n === 1) cancel.abort(new Error("TEST_CANCELLED")); } }), /TEST_CANCELLED/);
  assert.equal(session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='render_segment'").get().n, 1);
  await worker!.close(); worker = undefined;
  await session.close(); session = await openProject(project); worker = client(); calls = [];
  const completed = await coordinateRenderSegments({ ...common, session, signal: new AbortController().signal });
  assert.equal(completed.status, "succeeded");
  assert.equal(calls.filter(task => task === "render.segment.v1").length, 1, "restart reuses the verified first segment");
  assert.equal(session.db.prepare("SELECT count(*) n FROM render_bundles").get().n, 0, "coordinator does not publish or bypass QC");
  authorized = false;
  await assert.rejects(() => coordinateRenderSegments({ ...common, session, signal: new AbortController().signal }), /TEST_SOURCE_AUTHORITY_STALE/);
  authorized = true;
  const saved = await readRenderSegmentCheckpoint(session, projectId, makePlan(0, 300), execution, wireGraph, guard);
  writeFileSync(saved.outputs.video.path, "tampered");
  await assert.rejects(() => coordinateRenderSegments({ ...common, session, signal: new AbortController().signal }), /RENDER_SEGMENT_CACHE_CORRUPT/);
  console.log("segment coordinator integration passed");
} finally {
  await worker?.close();
  await session?.close();
  await rm(root, { recursive: true, force: true });
}
