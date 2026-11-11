import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject, readRenderSegmentCheckpoint, registerRenderSegmentCheckpoint } from "../../packages/platform/project-storage/src/project-storage.mjs";
import { renderSegmentResultV1Validator } from "../../packages/platform/contract-runtime/src/public.mjs";

const canonicalValue = value => Array.isArray(value) ? value.map(canonicalValue) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])])) : value;
const canonical = value => JSON.stringify(canonicalValue(value));
const digest = value => createHash("sha256").update(value).digest("hex");
const root = await mkdtemp(resolve(tmpdir(), "ave-render-segment-"));
let session;
try {
  session = await createProject(root);
  const projectId = session.manifest.project_id;
  const originalHash = digest("authorized original"), assetRef = `asset:sha256:${originalHash}`;
  const graph = {
    schema_version: 1, graph_id: "segment-test", timeline_version: 1, target: "master", profile: { name: "master", width: 2, height: 2, fps: 30 },
    nodes: [
      { node_id: "clip-test-source", kind: "source", capability: "source.original", parameters: { asset_ref: assetRef, source_ref: "/immutable/original", source_kind: "original", selected_object_ref: originalHash, clip_id: "clip-test", timeline_start: "0n", timeline_duration: "1n", timeline_timescale: "30n", has_audio: true } },
      { node_id: "clip-test-trim", kind: "trim", capability: "timeline.trim", parameters: {} },
      { node_id: "clip-test-audio", kind: "audio", capability: "timeline.audio", parameters: { gain_db: 0 } },
      { node_id: "composite", kind: "composite", capability: "timeline.composite" },
      { node_id: "sink", kind: "sink", capability: "sink.mp4" },
    ], edges: [], source_refs: [{ asset_ref: assetRef, original_object_ref: originalHash, source_timescale: "30n", has_audio: true }],
  };
  const semanticNodes = graph.nodes.map(node => {
    const p = node.parameters ?? {};
    if (node.kind === "source") return { ...node, capability: "source.asset", parameters: Object.fromEntries(Object.entries(p).filter(([key]) => !["source_ref", "source_kind", "fallback", "source_start_pts", "source_end_pts", "source_timescale", "selected_object_ref", "selected_width", "selected_height"].includes(key))) };
    if (node.kind === "trim") return { ...node, parameters: {} };
    if (node.kind === "audio") return { ...node, parameters: p };
    if (node.kind === "sink") return { ...node, parameters: {} };
    return node;
  });
  const semantic = canonical({ schema_version: 2, timeline_version: 1, nodes: semanticNodes, edges: [] }), semanticHash = digest(semantic);
  const policy = { schema_version: 1, mode: "bounded-linear-v1" };
  const inputIdentities = [{ asset_ref: assetRef, original_object_ref: originalHash, proxy_object_ref: null, source_timescale: "30n", original_timescale: null, proxy_timescale: null, proxy_map: null, original_width: null, original_height: null, proxy_width: null, proxy_height: null, has_audio: true }];
  const cachePayload = canonical({ canonicalizer: "ave-c14n-v1", semantic_graph_hash: semanticHash, target: "master", profile: graph.profile, range: null, adapter_id: "worker-media", adapter_version: "v8", execution_policy: policy, input_identities: inputIdentities });
  const cacheKey = digest(cachePayload), planId = `plan-master-${cacheKey.slice(0, 24)}`;
  const executionPlan = { schema_version: 2, plan_id: planId, target: "master", semantic_graph_payload: semantic, semantic_graph_hash: semanticHash, adapter_id: "worker-media", adapter_version: "v8", execution_policy: policy, capability_snapshot: { schema_version: 1, adapter_id: "worker-media", adapter_version: "v8", capabilities: [...new Set(graph.nodes.map(node => node.capability))].sort() }, decisions: graph.nodes.map(node => ({ schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "execute" })), cache_key_payload: cachePayload, cache_key: cacheKey, diagnostics: [] };
  const makePlan = (authorization = digest("grant")) => {
    const identity = { schema_version: 1, project_id: projectId, execution_plan_id: planId, execution_cache_key: cacheKey, semantic_graph_hash: semanticHash, graph_hash: digest(canonical(graph)), target: "master", execution_policy: "bounded-linear-v1", worker_version: "ave-worker-host-r18", ffmpeg_sha256: digest("ffmpeg"), source: { asset_ref: assetRef, source_kind: "original", selected_hash: originalHash, original_hash: originalHash, authorization_hash: authorization }, segment_index: 0, clip_id: "clip-test", clip_frame_offset: 0, frame_start: 0, frame_end: 1, sample_start: 0, sample_end: 1600, has_audio: true, dependency_ids: [] };
    return { ...identity, segment_id: `segment-master-${digest(canonical(identity)).slice(0, 24)}` };
  };
  const video = Buffer.from("test lossless video"), audio = Buffer.alloc(1600 * 8, 0x41);
  const paths = { video: resolve(root, "video.nut"), audio: resolve(root, "audio.f32le") };
  await writeFile(paths.video, video); await writeFile(paths.audio, audio);
  const makeResult = (plan, videoHash = digest(video), videoLength = video.length) => ({ schema_version: 1, segment_id: plan.segment_id, execution_plan_id: planId, status: "complete", frame_count: 1, sample_count: 1600, video: { hash: videoHash, byte_length: videoLength }, audio: { hash: digest(audio), byte_length: audio.length }, worker_version: "ave-worker-host-r18", ffmpeg_sha256: plan.ffmpeg_sha256, diagnostics: [] });
  const plan = makePlan(), result = makeResult(plan), authorized = () => {};
  assert.equal(renderSegmentResultV1Validator({ ...result, video: null }), false, "a complete segment must contain verified video");
  assert.equal(renderSegmentResultV1Validator({ ...result, status: "cancelled" }), false, "cancelled segments cannot carry completed media");
  assert.equal(renderSegmentResultV1Validator({ ...result, status: "failed", frame_count: 0, sample_count: 0, video: null, audio: null, diagnostics: [] }), false, "failed segments require a diagnostic");
  assert.equal(renderSegmentResultV1Validator({ ...result, status: "failed", frame_count: 0, sample_count: 0, video: null, audio: null, diagnostics: [{ code: "OUT_OF_MEMORY", message: "resource exhausted" }] }), true);
  const saved = await registerRenderSegmentCheckpoint(session, projectId, plan, result, executionPlan, graph, paths, authorized);
  assert.equal(saved.outputs.video.hash, result.video.hash);
  assert.deepEqual(await readFile(saved.outputs.audio.path), audio);
  assert.equal(session.db.prepare("SELECT count(*) n FROM render_bundles").get().n, 0, "a checkpoint cannot publish a render bundle");
  assert.equal(session.db.prepare("SELECT count(*) n FROM object_refs WHERE object_type='render_segment'").get().n, 1);
  assert.deepEqual((await registerRenderSegmentCheckpoint(session, projectId, plan, result, executionPlan, graph, {}, authorized)).result, result, "verified retries reuse immutable checkpoint bytes");
  await assert.rejects(() => readRenderSegmentCheckpoint(session, projectId, plan, executionPlan, graph, () => { throw new Error("PERMISSION_REVOKED"); }), /PERMISSION_REVOKED/);
  await assert.rejects(() => readRenderSegmentCheckpoint(session, `${projectId}-foreign`, plan, executionPlan, graph, authorized), /RENDER_SEGMENT_PROJECT_MISMATCH/);
  await assert.rejects(() => registerRenderSegmentCheckpoint(session, `${projectId}-foreign`, plan, result, executionPlan, graph, paths, authorized), /RENDER_SEGMENT_PROJECT_MISMATCH/);
  await session.close(); session = await openProject(root);
  const restored = await readRenderSegmentCheckpoint(session, projectId, plan, executionPlan, graph, authorized);
  assert.deepEqual(restored.result, result, "complete checkpoint must survive restart");
  const malformed = structuredClone(plan); malformed.frame_end = 2;
  { const { segment_id: _old, ...identity } = malformed; malformed.segment_id = `segment-master-${digest(canonical(identity)).slice(0, 24)}`; }
  await assert.rejects(() => readRenderSegmentCheckpoint(session, projectId, malformed, executionPlan, graph, authorized), /RENDER_SEGMENT_PLAN_INVALID/);
  const foreignGraph = structuredClone(graph); foreignGraph.nodes[0].parameters.clip_id = "other";
  await assert.rejects(() => readRenderSegmentCheckpoint(session, projectId, plan, executionPlan, foreignGraph, authorized), /RENDER_SEGMENT_PLAN_INVALID/);
  const blockedExecution = structuredClone(executionPlan); blockedExecution.decisions[0].outcome = "block";
  await assert.rejects(() => readRenderSegmentCheckpoint(session, projectId, plan, blockedExecution, graph, authorized), /RENDER_SEGMENT_PLAN_INVALID/, "blocked or incomplete resolver decisions cannot reuse a checkpoint");
  const reboundGraph = structuredClone(graph); reboundGraph.nodes[2].parameters.gain_db = 6;
  const reboundPlan = { ...plan, graph_hash: digest(canonical(reboundGraph)) };
  { const { segment_id: _old, ...identity } = reboundPlan; reboundPlan.segment_id = `segment-master-${digest(canonical(identity)).slice(0, 24)}`; }
  await assert.rejects(() => readRenderSegmentCheckpoint(session, projectId, reboundPlan, executionPlan, reboundGraph, authorized), /RENDER_SEGMENT_PLAN_INVALID/, "re-signing a different graph cannot bypass the semantic manifest");
  const conflicted = { ...result, frame_count: 0 };
  await assert.rejects(() => registerRenderSegmentCheckpoint(session, projectId, plan, conflicted, executionPlan, graph, paths, authorized), /RENDER_SEGMENT_PLAN_INVALID/);
  await writeFile(restored.outputs.video.path, Buffer.alloc(video.length, 0x52));
  await assert.rejects(() => readRenderSegmentCheckpoint(session, projectId, plan, executionPlan, graph, authorized), /RENDER_SEGMENT_CACHE_CORRUPT/);
  await writeFile(restored.outputs.video.path, video);
  let guardCalls = 0, transactionGuardCalls = 0;
  const rollbackPlan = makePlan(digest("revoked grant")), rollbackResult = makeResult(rollbackPlan);
  const revokeInTransaction = () => { guardCalls++; if (session.db.isTransaction && ++transactionGuardCalls === 2) throw new Error("PERMISSION_REVOKED_IN_TRANSACTION"); };
  await assert.rejects(() => registerRenderSegmentCheckpoint(session, projectId, rollbackPlan, rollbackResult, executionPlan, graph, paths, revokeInTransaction), /PERMISSION_REVOKED_IN_TRANSACTION/);
  assert.ok(guardCalls > 2);
  assert.equal(session.db.prepare("SELECT count(*) n FROM object_refs WHERE relation_key=?").get(rollbackPlan.segment_id).n, 0, "revocation rolls back all checkpoint rows");
  assert.equal(session.db.prepare("SELECT count(*) n FROM render_bundles").get().n, 0);
  // Exercise fixed-size streaming without constructing the large file in JS
  // memory. This is storage behavior only, not a claim that these bytes are a
  // decodable segment or that the user journey passed.
  const largePath = resolve(root, "large-segment.nut"), largeChunk = Buffer.alloc(1024 * 1024, 0x6b), largeHash = createHash("sha256"), largeFile = await open(largePath, "wx");
  try { for (let index = 0; index < 96; index++) { await largeFile.write(largeChunk); largeHash.update(largeChunk); } } finally { await largeFile.close(); }
  const largePlan = makePlan(digest("large authorized grant")), largeResult = makeResult(largePlan, largeHash.digest("hex"), 96 * largeChunk.length);
  global.gc?.(); const startingBuffers = process.memoryUsage().arrayBuffers; let peakBuffers = startingBuffers;
  const timer = setInterval(() => { peakBuffers = Math.max(peakBuffers, process.memoryUsage().arrayBuffers); }, 5);
  try {
    const large = await registerRenderSegmentCheckpoint(session, projectId, largePlan, largeResult, executionPlan, graph, { video: largePath, audio: paths.audio }, authorized);
    assert.equal(large.outputs.video.byte_length, 96 * largeChunk.length);
    assert.ok(await readRenderSegmentCheckpoint(session, projectId, largePlan, executionPlan, graph, authorized));
  } finally { clearInterval(timer); }
  if (global.gc) assert.ok(peakBuffers - startingBuffers < 64 * 1024 * 1024, `large checkpoint buffers grew by ${peakBuffers - startingBuffers} bytes`);
  console.log("render segment persistence: immutable restart, identities, revocation, corruption and transaction rollback passed");
} finally {
  if (session?.db?.isOpen) await session.close();
  await rm(root, { recursive: true, force: true });
}
