import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { resolve } from "node:path";
import type { RenderSegmentPlanV1 } from "../../../../contracts/generated/typescript/render/render-segment-plan.v1.js";
import { canonicalSerialize, renderGraphPayload, resolveExecutionPlan, type ExecutionPlan, type RenderGraph } from "../../../core/render-graph/src/public.js";
import { readRenderSegmentCheckpoint, registerRenderSegmentCheckpoint } from "../../project-storage/src/public.js";
import type { WorkerJobPort } from "../../worker-client/src/public.js";

type WorkerReply = { status: string; outputs?: any[]; metrics?: any; diagnostics?: unknown };
type Options = {
  session: any;
  projectId: string;
  graph: RenderGraph;
  execution: ExecutionPlan;
  worker: WorkerJobPort;
  outputDirectory: string;
  signal: AbortSignal;
  assertCurrent: () => void;
  verifySources: () => Promise<void>;
  makePlans: (ffmpegHash: string) => readonly RenderSegmentPlanV1[];
  onProgress?: (fraction: number) => void;
};

const hashFile = async (path: string) => { const hash = createHash("sha256"); for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) hash.update(chunk); return hash.digest("hex"); };
type SegmentSourceIdentity = RenderSegmentPlanV1["source"];
/** Split only at global frame boundaries; changing one interval never renames later ranges. */
export function buildRenderSegmentPlans(projectId: string, graph: RenderGraph, execution: ExecutionPlan, ffmpegHash: string, sourceIdentity: (asset: string, kind: "original" | "proxy") => SegmentSourceIdentity): readonly RenderSegmentPlanV1[] {
  const invalid = (): never => { throw new Error("RENDER_SEGMENT_PLAN_INVALID"); };
  const integer = (value: unknown): number => {
    if (typeof value !== "string" || !/^[0-9]+n$/.test(value)) return invalid();
    const parsed = Number(value.slice(0, -1));
    return Number.isSafeInteger(parsed) ? parsed : invalid();
  };
  const graphHash = createHash("sha256").update(renderGraphPayload(graph)).digest("hex");
  const plans: RenderSegmentPlanV1[] = [];
  for (const node of graph.nodes.filter(item => item.kind === "source")) {
    const p = node.parameters ?? {}, start = integer(p.timeline_start), duration = integer(p.timeline_duration);
    if (!duration || !Number.isSafeInteger((start + duration) * 1600) || typeof p.asset_ref !== "string" || typeof p.clip_id !== "string" || p.source_kind !== "original" && p.source_kind !== "proxy" || typeof p.has_audio !== "boolean") invalid();
    const source = sourceIdentity(p.asset_ref as string, p.source_kind as "original" | "proxy");
    for (let offset = 0; offset < duration; offset += 300) {
      const frameStart = start + offset, frameEnd = Math.min(start + duration, frameStart + 300);
      const base: Omit<RenderSegmentPlanV1, "segment_id"> = { schema_version: 1, project_id: projectId, execution_plan_id: execution.plan_id, execution_cache_key: execution.cache_key, semantic_graph_hash: execution.semantic_graph_hash, graph_hash: graphHash, target: execution.target, execution_policy: "bounded-linear-v1", worker_version: "ave-worker-host-r18", ffmpeg_sha256: ffmpegHash, source, segment_index: frameStart, clip_id: p.clip_id as string, clip_frame_offset: offset, frame_start: frameStart, frame_end: frameEnd, sample_start: frameStart * 1600, sample_end: frameEnd * 1600, has_audio: p.has_audio as boolean, dependency_ids: [] };
      plans.push({ ...base, segment_id: `segment-${execution.target}-${createHash("sha256").update(canonicalSerialize(base)).digest("hex").slice(0, 24)}` });
    }
  }
  return validateSegmentCoverage(graph, execution, plans);
}
const success = (result: WorkerReply, phase: string): WorkerReply => {
  if (result?.status !== "succeeded") throw new Error(`RENDER_SEGMENT_${phase}_FAILED:${canonicalSerialize(result?.diagnostics ?? null)}`);
  return result;
};

/** Host-owned intermediate execution. This does not perform QC or publish a bundle.
 * Callers must hold and repeatedly verify project, source and permission authority.
 * A blocked resolver is always rejected; no production bypass is provided. */
export async function coordinateRenderSegments(options: Options): Promise<WorkerReply> {
  const { session, projectId, graph, execution, worker, signal, assertCurrent, verifySources } = options;
  const check = () => { if (signal.aborted) throw signal.reason ?? new Error("RENDER_SEGMENT_CANCELLED"); assertCurrent(); };
  const verify = async () => { check(); await verifySources(); check(); };
  if (session.manifest?.project_id !== projectId || execution.diagnostics.length || execution.execution_policy?.mode !== "bounded-linear-v1") throw new Error("RENDER_SEGMENT_EXECUTION_BLOCKED");
  await verify();
  const identityReply = success(await worker.submit<unknown, WorkerReply>("render.executor-identity.v1", {}, { signal }), "IDENTITY");
  check();
  const identity = identityReply.outputs?.length === 1 ? identityReply.outputs[0] : undefined;
  if (identity?.kind !== "render_executor_identity" || identity.worker_version !== "ave-worker-host-r18" || !/^[0-9a-f]{64}$/.test(identity.ffmpeg_sha256 ?? "") || typeof identity.ffmpeg_version !== "string" || !identity.ffmpeg_version) throw new Error("RENDER_SEGMENT_EXECUTOR_INVALID");
  const plans = validateSegmentCoverage(graph, execution, options.makePlans(identity.ffmpeg_sha256));
  if (plans.some(plan => plan.project_id !== projectId || plan.ffmpeg_sha256 !== identity.ffmpeg_sha256)) throw new Error("RENDER_SEGMENT_EXECUTOR_INVALID");
  const wireGraph = JSON.parse(renderGraphPayload(graph));
  const wireExecution = JSON.parse(canonicalSerialize(execution));
  const outputDir = resolve(options.outputDirectory);
  const manifestPath = resolve(outputDir, `segments-${randomUUID()}.jsonl`);
  const manifest = await open(manifestPath, "wx", 0o600);
  const digest = createHash("sha256");
  let byteLength = 0, completed = 0;
  const total = plans.at(-1)!.frame_end;
  let result: WorkerReply;
  try {
    for (const plan of plans) {
      await verify();
      let checkpoint = await readRenderSegmentCheckpoint(session, projectId, plan, wireExecution, wireGraph, check);
      if (!checkpoint) {
        const reply = success(await worker.submit<unknown, WorkerReply>("render.segment.v1", { graph: wireGraph, execution_plan: wireExecution, segment_plan: plan, output_dir: outputDir }, { signal, idempotent: false, onProgress: fraction => options.onProgress?.(0.65 * (completed + (plan.frame_end - plan.frame_start) * fraction) / total) }), "WORKER");
        await verify();
        const result = reply.metrics?.segment_result;
        const outputs = reply.outputs ?? [];
        const kinds = plan.has_audio ? ["video", "audio"] : ["video"];
        if (outputs.length !== kinds.length) throw new Error("RENDER_SEGMENT_OUTPUT_INVALID");
        const paths: Record<string, string> = {};
        for (const kind of kinds) {
          const output = outputs.find(item => item.kind === `render_segment_${kind}`);
          const expected = result?.[kind];
          const extension = kind === "video" ? "nut" : "f32le";
          if (!output || !expected || output.hash !== expected.hash || output.byte_length !== expected.byte_length || resolve(output.path) !== resolve(outputDir, `${plan.segment_id}-${kind}-${expected.hash}.${extension}`) || !(await lstat(output.path)).isFile()) throw new Error("RENDER_SEGMENT_OUTPUT_INVALID");
          paths[kind] = output.path;
        }
        checkpoint = await registerRenderSegmentCheckpoint(session, projectId, plan, result, wireExecution, wireGraph, paths, check);
      }
      await verify();
      const line = Buffer.from(`${canonicalSerialize({ schema_version: 1, plan: checkpoint.plan, result: checkpoint.result, video_path: checkpoint.outputs.video.path, audio_path: checkpoint.outputs.audio?.path ?? null })}\n`);
      if (line.length > 131072 || !Number.isSafeInteger(byteLength + line.length)) throw new Error("RENDER_SEGMENT_MANIFEST_INVALID");
      let offset = 0;
      while (offset < line.length) { check(); const written = await manifest.write(line, offset, line.length - offset); if (written.bytesWritten <= 0) throw new Error("RENDER_SEGMENT_MANIFEST_WRITE_FAILED"); offset += written.bytesWritten; }
      digest.update(line); byteLength += line.length;
      completed = plan.frame_end;
      options.onProgress?.(0.65 * completed / total);
    }
    await manifest.sync();
  } finally { await manifest.close(); }
  await verify();
  result = success(await worker.submit<unknown, WorkerReply>("render.segment.assemble.v1", { project_id: projectId, graph: wireGraph, execution_plan: wireExecution, manifest_path: manifestPath, manifest_sha256: digest.digest("hex"), manifest_byte_length: byteLength, segment_count: plans.length, object_store_root: resolve(session.projectDirectory, "objects", "sha256"), ffmpeg_sha256: identity.ffmpeg_sha256, output_dir: outputDir }, { signal, idempotent: false, onProgress: fraction => options.onProgress?.(0.65 + 0.35 * fraction) }), "ASSEMBLY");
  await verify();
  const output = result.outputs?.length === 1 ? result.outputs[0] : undefined;
  const metrics = result.metrics;
  if (output?.kind !== "render" || output.target !== execution.target || output.execution_plan_id !== execution.plan_id || output.semantic_graph_hash !== execution.semantic_graph_hash || output.cache_key !== execution.cache_key || !/^[0-9a-f]{64}$/.test(output.hash ?? "") || resolve(output.path) !== resolve(outputDir, `${execution.plan_id}-${execution.target}-${execution.cache_key.slice(0, 16)}-${output.hash}.mp4`) || metrics?.worker_version !== identity.worker_version || metrics.execution_plan_id !== execution.plan_id || metrics.semantic_graph_hash !== execution.semantic_graph_hash || metrics.cache_key !== execution.cache_key || metrics.output_hash !== output.hash || metrics.ffmpeg_version !== identity.ffmpeg_version) throw new Error("RENDER_SEGMENT_ASSEMBLY_OUTPUT_INVALID");
  const before = await lstat(output.path, { bigint: true });
  if (!before.isFile() || await hashFile(output.path) !== output.hash) throw new Error("RENDER_SEGMENT_ASSEMBLY_OUTPUT_INVALID");
  const after = await lstat(output.path, { bigint: true });
  if (!after.isFile() || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs) throw new Error("RENDER_SEGMENT_ASSEMBLY_OUTPUT_INVALID");
  await verify();
  return result;
}

/** Verify a complete selection before assembling any segment media.
 * Each plan still requires Host authorization and immutable file verification;
 * this function only proves identities and exact, non-overlapping coverage. */
export function validateSegmentCoverage(graph: RenderGraph, execution: ExecutionPlan, segments: readonly RenderSegmentPlanV1[]): readonly RenderSegmentPlanV1[] {
  const invalid = (): never => { throw new Error("RENDER_SEGMENT_COVERAGE_INVALID"); };
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const ticks = (value: unknown): bigint => {
    if (typeof value === "string" && /^\d+n$/.test(value)) return BigInt(value.slice(0, -1));
    if (typeof value === "bigint" && value >= 0n) return value;
    return invalid();
  };
  if (!segments.length || segments.some(segment => !segment || !segment.source || typeof segment.source !== "object" || ![segment.segment_index, segment.clip_frame_offset, segment.frame_start, segment.frame_end, segment.sample_start, segment.sample_end].every(Number.isSafeInteger)) || graph.range || graph.target !== execution.target || execution.execution_policy?.mode !== "bounded-linear-v1" || execution.adapter_id !== "worker-media" || execution.adapter_version !== "v8" || execution.diagnostics.length || !graph.profile || graph.profile.fps !== 30 || graph.nodes.some(node => !node || !["source", "trim", "audio", "composite", "sink"].includes(node.kind))) return invalid();
  const expected = resolveExecutionPlan(graph, execution.target, execution.execution_policy);
  if (canonicalSerialize(expected) !== canonicalSerialize(execution)) return invalid();
  const sources = graph.nodes.filter(node => node.kind === "source").sort((a, b) => ticks(a.parameters?.timeline_start) < ticks(b.parameters?.timeline_start) ? -1 : 1);
  if (!sources.length || new Set(sources.map(node => node.parameters?.clip_id)).size !== sources.length) return invalid();
  let duration = 0n;
  const clips = new Map<string, { start: bigint; end: bigint; asset: string; kind: string; audio: boolean }>();
  for (const source of sources) {
    const p = source.parameters ?? {}, start = ticks(p.timeline_start), length = ticks(p.timeline_duration);
    if (start !== duration || length <= 0n || ticks(p.timeline_timescale) !== 30n || typeof p.clip_id !== "string" || typeof p.asset_ref !== "string" || !["original", "proxy"].includes(String(p.source_kind)) || typeof (p.has_audio ?? true) !== "boolean") return invalid();
    duration += length;
    clips.set(p.clip_id, { start, end: duration, asset: p.asset_ref, kind: String(p.source_kind), audio: (p.has_audio ?? true) as boolean });
  }
  if (sources.some(source => ticks(source.parameters?.timeline_total_duration) !== duration)) return invalid();
  const expectedGraphHash = hash(canonicalSerialize(graph)), ordered = [...segments].sort((a, b) => a.frame_start - b.frame_start || a.frame_end - b.frame_end);
  let cursor = 0n;
  const projectId = ordered[0]!.project_id, ffmpegHash = ordered[0]!.ffmpeg_sha256;
  const sourceIdentities = new Map<string, string>();
  for (const segment of ordered) {
    if (!segment || segment.schema_version !== 1 || segment.project_id !== projectId || segment.target !== execution.target || segment.execution_plan_id !== execution.plan_id || segment.execution_cache_key !== execution.cache_key || segment.semantic_graph_hash !== execution.semantic_graph_hash || segment.graph_hash !== expectedGraphHash || segment.execution_policy !== "bounded-linear-v1" || segment.worker_version !== "ave-worker-host-r18" || segment.ffmpeg_sha256 !== ffmpegHash || !/^[0-9a-f]{64}$/.test(ffmpegHash) || !Array.isArray(segment.dependency_ids) || segment.dependency_ids.length || ![segment.segment_index, segment.clip_frame_offset, segment.frame_start, segment.frame_end, segment.sample_start, segment.sample_end].every(Number.isSafeInteger)) return invalid();
    const { segment_id: segmentId, ...identity } = segment;
    if (segmentId !== `segment-${segment.target}-${hash(canonicalSerialize(identity)).slice(0, 24)}`) return invalid();
    const clip = clips.get(segment.clip_id), start = BigInt(segment.frame_start), end = BigInt(segment.frame_end);
    if (!clip || start !== cursor || end <= start || end - start > 300n || segment.segment_index !== segment.frame_start || start < clip.start || end > clip.end || BigInt(segment.clip_frame_offset) !== start - clip.start || BigInt(segment.sample_start) !== start * 1600n || BigInt(segment.sample_end) !== end * 1600n || segment.source.asset_ref !== clip.asset || segment.source.source_kind !== clip.kind || segment.has_audio !== clip.audio) return invalid();
    const original = /^asset:sha256:([0-9a-f]{64})$/.exec(segment.source.asset_ref);
    if (!original || original[1] !== segment.source.original_hash || !/^[0-9a-f]{64}$/.test(segment.source.selected_hash) || !/^[0-9a-f]{64}$/.test(segment.source.authorization_hash) || segment.source.source_kind === "original" && segment.source.selected_hash !== segment.source.original_hash || segment.target === "master" && segment.source.source_kind !== "original") return invalid();
    const sourceIdentity = canonicalSerialize(segment.source), prior = sourceIdentities.get(segment.source.asset_ref);
    if (prior !== undefined && prior !== sourceIdentity) return invalid();
    sourceIdentities.set(segment.source.asset_ref, sourceIdentity);
    cursor = end;
  }
  if (cursor !== duration) return invalid();
  return ordered;
}
