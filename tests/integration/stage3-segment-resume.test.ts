import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream, statSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, open, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { canonicalSerialize, renderGraphPayload, resolveExecutionPlan, type RenderGraph } from "../../packages/core/render-graph/src/public.js";
import { validateSegmentCoverage } from "../../packages/platform/project-host/src/render-segment-coordinator.js";
import { createLocalWorkerJobPort } from "../../packages/platform/worker-client/src/public.js";
import { createProject, openProject, readRenderSegmentCheckpoint, registerRenderSegmentCheckpoint } from "../../packages/platform/project-storage/src/public.js";
import type { RenderSegmentPlanV1 } from "../../contracts/generated/typescript/render/render-segment-plan.v1.js";

// This is a controlled Worker -> Host-owned storage integration test. It does
// not enable the blocked production resolver or claim a completed render.
const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "ave-segment-resume-"));
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
  assert.deepEqual(blocked.diagnostics, [], "verified linear fixture is eligible");
  assert.ok(blocked.decisions.every(item => item.outcome === "execute"));
  const unsupported: RenderGraph = { ...graph, nodes: [...graph.nodes, { node_id: "caption", kind: "caption", capability: "timeline.caption" }] };
  assert.ok(resolveExecutionPlan(unsupported, "master", policy).diagnostics.some(item => item.code === "BOUNDED_LINEAR_UNSUPPORTED"), "captions are never silently dropped");
  const silent: RenderGraph = { ...graph, nodes: graph.nodes.map(node => node.kind === "source" ? { ...node, parameters: { ...sourceParameters, has_audio: false } } : node), source_refs: [{ asset_ref: asset, original_object_ref: hash, source_timescale: 30n, has_audio: false }] };
  assert.deepEqual(resolveExecutionPlan(silent, "master", policy).diagnostics, [], "simple silent clips remain eligible");
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
  const identity = await worker.submit<any, any>("render.executor-identity.v1", {}, { timeoutMs: 120000 });
  assert.equal(identity.status, "succeeded", JSON.stringify(identity.diagnostics));
  assert.equal(identity.outputs[0].ffmpeg_sha256, executableHash, "Worker must fingerprint its actual executable");
  assert.equal(identity.outputs[0].worker_version, "ave-worker-host-r18");
  const submit = async (segment: ReturnType<typeof makePlan>) => {
    worker ??= client();
    const result = await worker.submit<any, any>("render.segment.v1", { graph: wireGraph, execution_plan: execution, segment_plan: segment, output_dir: staging }, { timeoutMs: 120000, absoluteTimeoutMs: 360000, idempotent: false });
    assert.equal(result.status, "succeeded", JSON.stringify(result.diagnostics));
    const paths = Object.fromEntries(result.outputs.map((item: any) => [item.kind.replace("render_segment_", ""), item.path]));
    return registerRenderSegmentCheckpoint(session, projectId, segment, result.metrics.segment_result, execution, wireGraph, paths, guard);
  };
  const firstPlan = makePlan(0, 300), secondPlan = makePlan(300, 330);
  assert.deepEqual(validateSegmentCoverage(graph, execution, [secondPlan, firstPlan]).map(segment => segment.segment_id), [firstPlan.segment_id, secondPlan.segment_id]);
  const first = await submit(firstPlan);
  assert.equal(first.result.frame_count, 300);
  await worker!.close(); worker = undefined;
  await session.close(); session = await openProject(project);
  const restored = await readRenderSegmentCheckpoint(session, projectId, firstPlan, execution, wireGraph, guard);
  assert.equal(restored.result.video.hash, first.result.video.hash, "restart must reuse the verified first segment without dispatch");
  assert.equal(worker, undefined, "reading a checkpoint must not start a Worker");
  authorized = false;
  await assert.rejects(() => readRenderSegmentCheckpoint(session, projectId, firstPlan, execution, wireGraph, guard), /TEST_SOURCE_AUTHORITY_STALE/);
  authorized = true;
  assert.equal(await readRenderSegmentCheckpoint(session, projectId, makePlan(0, 300, "0".repeat(64)), execution, wireGraph, guard), null, "changed executor identity must not reuse old media");
  const second = await submit(secondPlan);
  assert.equal(second.result.frame_count, 30);
  assert.equal(second.result.sample_count, 48000);
  assert.equal(session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='render_segment'").get().n, 2);
  assert.equal(session.db.prepare("SELECT count(*) n FROM render_bundles").get().n, 0, "segment completion must not publish a render");
  const splitA = makePlan(0, 150), splitB = makePlan(150, 300), stableLater = makePlan(300, 330);
  assert.equal(stableLater.segment_id, secondPlan.segment_id, "splitting an earlier range must not change a later segment identity");
  assert.deepEqual(validateSegmentCoverage(graph, execution, [stableLater, splitB, splitA]).map(segment => segment.segment_id), [splitA.segment_id, splitB.segment_id, stableLater.segment_id]);
  assert.throws(() => validateSegmentCoverage(graph, execution, [firstPlan, splitB, stableLater]), /RENDER_SEGMENT_COVERAGE_INVALID/, "overlapping ranges cannot be assembled");
  assert.throws(() => validateSegmentCoverage(graph, execution, [splitA, stableLater]), /RENDER_SEGMENT_COVERAGE_INVALID/, "gaps cannot be assembled");
  assert.throws(() => validateSegmentCoverage(graph, execution, [splitA, splitB]), /RENDER_SEGMENT_COVERAGE_INVALID/, "missing tails cannot be assembled");
  assert.throws(() => validateSegmentCoverage(graph, execution, [splitA, splitB, makePlan(300, 330, "0".repeat(64))]), /RENDER_SEGMENT_COVERAGE_INVALID/, "different encoder identities cannot be assembled");
  const changedAuthority = { ...splitB, source: { ...splitB.source, authorization_hash: "0".repeat(64) } };
  { const { segment_id: _old, ...identity } = changedAuthority; changedAuthority.segment_id = `segment-master-${hashText(canonicalSerialize(identity)).slice(0, 24)}`; }
  assert.throws(() => validateSegmentCoverage(graph, execution, [splitA, changedAuthority, stableLater]), /RENDER_SEGMENT_COVERAGE_INVALID/, "the same source cannot mix authorization identities");
  const savedSplitA = await submit(splitA), savedSplitB = await submit(splitB);
  assert.equal((await readRenderSegmentCheckpoint(session, projectId, stableLater, execution, wireGraph, guard)).result.video.hash, second.result.video.hash, "resized earlier ranges must leave a previously verified later checkpoint reusable");
  const row = (checkpoint: any) => ({ schema_version: 1, plan: checkpoint.plan, result: checkpoint.result, video_path: checkpoint.outputs.video.path, audio_path: checkpoint.outputs.audio?.path ?? null });
  const selectedRows = [row(savedSplitA), row(savedSplitB), row(second)];
  let manifestNumber = 0;
  const manifest = async (rows: any[]) => {
    const content = rows.map(item => canonicalSerialize(item) + "\n").join("");
    const path = resolve(root, `segments-${++manifestNumber}.jsonl`);
    await writeFile(path, content);
    return { manifest_path: path, manifest_sha256: hashText(content), manifest_byte_length: Buffer.byteLength(content), segment_count: rows.length };
  };
  const assemblyInput = (manifestInfo: any, output: string) => ({ project_id: projectId, graph: wireGraph, execution_plan: execution, ...manifestInfo, object_store_root: resolve(project, "objects", "sha256"), ffmpeg_sha256: executableHash, output_dir: output });
  const assembled = await worker!.submit<any, any>("render.segment.assemble.v1", assemblyInput(await manifest(selectedRows), resolve(root, "assembled-output")), { timeoutMs: 120000, absoluteTimeoutMs: 360000 });
  assert.equal(assembled.status, "succeeded", JSON.stringify(assembled.diagnostics));
  assert.equal(assembled.outputs[0].source_kind, "original");
  const baseline = await worker!.submit<any, any>("render.timeline.v1", { graph: wireGraph, execution_plan: execution, output_dir: resolve(root, "baseline-output") }, { timeoutMs: 120000, absoluteTimeoutMs: 360000 });
  assert.equal(baseline.status, "succeeded", JSON.stringify(baseline.diagnostics));
  assert.equal(await decodedHash(assembled.outputs[0].path, true), await decodedHash(baseline.outputs[0].path, true), "assembled output must preserve every encoded frame and its timestamp");
  assert.equal(await decodedHash(assembled.outputs[0].path, false), await decodedHash(baseline.outputs[0].path, false), "assembled output must preserve every decoded audio sample");
  const failAssembly = async (rows: any[], reason: RegExp, alter: (value: any) => void = () => {}) => {
    const output = resolve(root, `failed-assembly-${manifestNumber + 1}`), input = assemblyInput(await manifest(rows), output);
    alter(input);
    const failed = await worker!.submit<any, any>("render.segment.assemble.v1", input, { timeoutMs: 120000, absoluteTimeoutMs: 360000 });
    assert.equal(failed.status, "failed");
    assert.match(JSON.stringify(failed.diagnostics), reason);
    assert.deepEqual(failed.outputs, []);
    assert.deepEqual(await readdir(output).catch(() => []), [], "invalid assembly cannot publish an output");
  };
  await failAssembly([row(first), row(savedSplitB), row(second)], /RENDER_SEGMENT_COVERAGE_INVALID/);
  await failAssembly([row(savedSplitA), row(second)], /RENDER_SEGMENT_COVERAGE_INVALID/);
  await failAssembly([row(savedSplitA), row(savedSplitB)], /RENDER_SEGMENT_COVERAGE_INVALID/);
  await failAssembly(selectedRows, /RENDER_SEGMENT_MANIFEST_CHANGED/, input => { input.manifest_sha256 = "0".repeat(64); });
  const foreignRows = structuredClone(selectedRows); foreignRows[0].video_path = source;
  await failAssembly(foreignRows, /RENDER_SEGMENT_OBJECT_INVALID/);
  const proxy = resolve(root, "preview-proxy.mp4");
  await run("ffmpeg", ["-v", "error", "-i", source, "-vf", "scale=32:32", "-c:v", "libx264", "-threads", "1", "-pix_fmt", "yuv420p", "-c:a", "copy", proxy]);
  const proxyHash = await hashFile(proxy), proxyStat = statSync(proxy, { bigint: true });
  const proxyGuard = () => { guard(); const value = statSync(proxy, { bigint: true }); if (value.dev !== proxyStat.dev || value.ino !== proxyStat.ino || value.size !== proxyStat.size || value.mtimeNs !== proxyStat.mtimeNs || value.ctimeNs !== proxyStat.ctimeNs) throw new Error("TEST_PROXY_AUTHORITY_STALE"); };
  const previewGraph: any = structuredClone(graph);
  previewGraph.target = "preview"; previewGraph.profile = { name: "preview", width: 32, height: 32, fps: 30 };
  previewGraph.nodes[0].capability = "source.proxy";
  Object.assign(previewGraph.nodes[0].parameters, { source_ref: proxy, source_kind: "proxy", selected_object_ref: proxyHash });
  previewGraph.source_refs[0].proxy_object_ref = proxyHash;
  const previewBlocked = resolveExecutionPlan(previewGraph, "preview", policy);
  assert.deepEqual(previewBlocked.diagnostics, []);
  const previewExecution = JSON.parse(canonicalSerialize({ ...previewBlocked, diagnostics: [] })), previewWire = JSON.parse(renderGraphPayload(previewGraph));
  assert.equal(previewExecution.semantic_graph_hash, execution.semantic_graph_hash, "Preview and Master must share target-neutral semantics");
  const previewPlan = (start: number, end: number): RenderSegmentPlanV1 => {
    const seed: Omit<RenderSegmentPlanV1, "segment_id"> = { ...makePlan(start, end), execution_plan_id: previewExecution.plan_id, execution_cache_key: previewExecution.cache_key, semantic_graph_hash: previewExecution.semantic_graph_hash, graph_hash: hashText(canonicalSerialize(previewWire)), target: "preview", source: { asset_ref: asset, source_kind: "proxy", selected_hash: proxyHash, original_hash: hash, authorization_hash: hashText("controlled current permission") } };
    const { segment_id: _untrusted, ...identity } = seed as RenderSegmentPlanV1;
    return { ...identity, segment_id: `segment-preview-${hashText(canonicalSerialize(identity)).slice(0, 24)}` };
  };
  const previewCheckpoints: any[] = [];
  for (const plan of [previewPlan(0, 300), previewPlan(300, 330)]) {
    const produced: any = await worker!.submit<any, any>("render.segment.v1", { graph: previewWire, execution_plan: previewExecution, segment_plan: plan, output_dir: staging }, { timeoutMs: 120000, absoluteTimeoutMs: 360000 });
    assert.equal(produced.status, "succeeded", JSON.stringify(produced.diagnostics));
    const paths = Object.fromEntries(produced.outputs.map((item: any) => [item.kind.replace("render_segment_", ""), item.path]));
    previewCheckpoints.push(await registerRenderSegmentCheckpoint(session, projectId, plan, produced.metrics.segment_result, previewExecution, previewWire, paths, proxyGuard));
  }
  const previewInput = { ...assemblyInput(await manifest(previewCheckpoints.map(row)), resolve(root, "preview-assembled-output")), graph: previewWire, execution_plan: previewExecution };
  const previewAssembled = await worker!.submit<any, any>("render.segment.assemble.v1", previewInput, { timeoutMs: 120000, absoluteTimeoutMs: 360000 });
  assert.equal(previewAssembled.status, "succeeded", JSON.stringify(previewAssembled.diagnostics));
  assert.equal(previewAssembled.outputs[0].source_kind, "proxy");
  const previewBaseline = await worker!.submit<any, any>("render.timeline.v1", { graph: previewWire, execution_plan: previewExecution, output_dir: resolve(root, "preview-baseline-output") }, { timeoutMs: 120000, absoluteTimeoutMs: 360000 });
  assert.equal(previewBaseline.status, "succeeded", JSON.stringify(previewBaseline.diagnostics));
  assert.equal(await decodedHash(previewAssembled.outputs[0].path, true), await decodedHash(previewBaseline.outputs[0].path, true));
  assert.equal(await decodedHash(previewAssembled.outputs[0].path, false), await decodedHash(previewBaseline.outputs[0].path, false));
  const corruptedSegment = await open(savedSplitA.outputs.video.path, "r+");
  let originalSplitByte = 0;
  try { const buffer = Buffer.alloc(1); await corruptedSegment.read(buffer, 0, 1, 0); originalSplitByte = buffer[0]!; buffer[0] = originalSplitByte ^ 0xff; await corruptedSegment.write(buffer, 0, 1, 0); } finally { await corruptedSegment.close(); }
  await failAssembly(selectedRows, /RENDER_SEGMENT_CACHE_CORRUPT/);
  const repairedSegment = await open(savedSplitA.outputs.video.path, "r+");
  try { await repairedSegment.write(Buffer.from([originalSplitByte]), 0, 1, 0); } finally { await repairedSegment.close(); }
  const cancelOutput = resolve(root, "cancelled-assembly"), cancel = new AbortController();
  const cancelInput = assemblyInput(await manifest(selectedRows), cancelOutput);
  try {
    const cancelled = await worker!.submit<any, any>("render.segment.assemble.v1", cancelInput, { timeoutMs: 120000, absoluteTimeoutMs: 360000, signal: cancel.signal, onProgress: value => { if (value >= 0.1) cancel.abort(); } });
    assert.equal(cancelled.status, "cancelled");
  } catch (error) { assert.match(String(error), /CANCELLED/); }
  assert.equal(worker!.terminationUnconfirmed, false, "cancellation must drain the actual producer");
  assert.deepEqual(await readdir(cancelOutput).catch(() => []), [], "cancelled assembly must not publish an output");
  const damaged = await open(first.outputs.video.path, "r+");
  let originalByte = 0;
  try { const buffer = Buffer.alloc(1); await damaged.read(buffer, 0, 1, 0); originalByte = buffer[0]!; buffer[0] = originalByte ^ 0xff; await damaged.write(buffer, 0, 1, 0); } finally { await damaged.close(); }
  await assert.rejects(() => readRenderSegmentCheckpoint(session, projectId, firstPlan, execution, wireGraph, guard), /RENDER_SEGMENT_CACHE_CORRUPT/);
  const repair = await open(first.outputs.video.path, "r+");
  try { await repair.write(Buffer.from([originalByte]), 0, 1, 0); } finally { await repair.close(); }
  assert.ok(await readRenderSegmentCheckpoint(session, projectId, firstPlan, execution, wireGraph, guard));
  const changedSourceOutput = resolve(root, "changed-source-assembly"), changedSourceInput = assemblyInput(await manifest(selectedRows), changedSourceOutput);
  let sourceChanged = false;
  const changedSourceResult = await worker!.submit<any, any>("render.segment.assemble.v1", changedSourceInput, { timeoutMs: 120000, absoluteTimeoutMs: 360000, onProgress: value => { if (!sourceChanged && value >= 0.1) { sourceChanged = true; writeFileSync(source, Buffer.from("changed source")); } } });
  assert.equal(sourceChanged, true);
  assert.equal(changedSourceResult.status, "failed");
  assert.match(JSON.stringify(changedSourceResult.diagnostics), /RENDER_SEGMENT_SOURCE_IDENTITY_MISMATCH/);
  assert.deepEqual(await readdir(changedSourceOutput).catch(() => []), [], "changed source must prevent assembly publication");
  await assert.rejects(() => readRenderSegmentCheckpoint(session, projectId, firstPlan, execution, wireGraph, guard), /TEST_SOURCE_AUTHORITY_STALE/);
  console.log("isolated segment Worker/storage restart, source guard and executor identity passed");
} finally {
  if (worker) await worker.close();
  if (session?.db?.isOpen) await session.close();
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
