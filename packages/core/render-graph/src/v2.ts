import type { RenderGraph, RenderNode, RenderScalar, RenderTarget } from "./public.js";
import { capabilityDecision, timelineRenderCapabilities, validateGraph } from "./public.js";
import { createHash } from "node:crypto";
import { canonicalSerialize } from "./canonical.js";
import type { RenderOutputManifestV2 } from "../../../../contracts/generated/typescript/render/render-output-manifest.v2.js";

export type ResolverDecision = Readonly<{ schema_version: 1; node_id: string; capability: string; outcome: "execute" | "fallback" | "bake" | "block"; detail?: string }>;
export type RenderDiagnostic = Readonly<{ schema_version: 1; code: string; node_id?: string; message: string; severity: "info" | "warning" | "error" | "blocker" }>;
export type WorkerMediaAdapterVersion = "v5" | "v6" | "v7" | "v8";
export type RenderExecutionPolicy = Readonly<{ schema_version: 1; mode: "standard-v1" | "bounded-linear-v1" }>;
export type CapabilitySnapshot = Readonly<{ schema_version: 1; adapter_id: "worker-media"; adapter_version: WorkerMediaAdapterVersion; capabilities: readonly string[] }>;
export type SemanticGraphManifest = Readonly<{ schema_version: 2; timeline_version: number; nodes: readonly RenderNode[]; edges: RenderGraph["edges"] }>;
export type ExecutionPlan = Readonly<{ schema_version: 2; plan_id: string; target: RenderTarget; semantic_graph_payload: string; semantic_graph_hash: string; adapter_id: "worker-media"; adapter_version: WorkerMediaAdapterVersion; execution_policy?: RenderExecutionPolicy; capability_snapshot: CapabilitySnapshot; decisions: readonly ResolverDecision[]; cache_key_payload: string; cache_key: string; diagnostics: readonly RenderDiagnostic[] }>;
export type AudioNormalizationMeasurement = Readonly<{ status: "disabled" | "no_audio" }> | Readonly<{ status: "normalized"; input_integrated_lufs: number; input_true_peak_db: number; output_integrated_lufs: number; output_true_peak_db: number; target_lufs: number; true_peak_ceiling_db: number; tolerance_lufs: number; within_tolerance: boolean }>;
export type OutputManifest = Readonly<{ schema_version: 2; render_id: string; target: RenderTarget; semantic_graph_hash: string; execution_plan_id: string; cache_key: string; output_hash: string; worker_version: string; backend_version: string; diagnostics: ExecutionPlan["diagnostics"]; preset_application_link?: Readonly<NonNullable<RenderOutputManifestV2["preset_application_link"]>>; audio_normalization?: AudioNormalizationMeasurement }>;

export function semanticGraphManifest(graph: RenderGraph): SemanticGraphManifest {
  const nodes = graph.nodes.map((node) => {
    if (node.kind === "source") return { ...node, capability: "source.asset", parameters: Object.fromEntries(Object.entries(node.parameters ?? {}).filter(([key]) => !["source_ref", "source_kind", "fallback", "source_start_pts", "source_end_pts", "source_timescale", "selected_object_ref", "selected_width", "selected_height"].includes(key))) };
    // Adapter-specific trim coordinates differ for proxy and original. The
    // target-neutral original coordinates remain on the source node as
    // semantic_source_* fields and therefore still invalidate semantic hashes.
    if (node.kind === "trim") return { ...node, parameters: Object.fromEntries(Object.entries(node.parameters ?? {}).filter(([key]) => key.startsWith("semantic_"))) };
    if (node.kind === "audio") return { ...node, parameters: Object.fromEntries(Object.entries(node.parameters ?? {}).filter(([key]) => !["source_start_pts", "source_end_pts", "source_timescale"].includes(key))) };
    if (node.kind === "time_map") { const parameters = node.parameters ?? {}; return { ...node, parameters: { ...Object.fromEntries(Object.entries(parameters).filter(([key]) => !["segments_json", "semantic_segments_json"].includes(key))), segments_json: parameters.semantic_segments_json ?? parameters.segments_json ?? "[]" } }; }
    if (node.kind === "sink") return { ...node, parameters: {} };
    return node;
  });
  return { schema_version: 2, timeline_version: graph.timeline_version ?? 0, nodes, edges: graph.edges };
}
export function semanticGraphPayload(graph: RenderGraph): string { return canonicalSerialize(semanticGraphManifest(graph)); }
const WORKER_MEDIA_ADAPTER_VERSION: WorkerMediaAdapterVersion = "v8";

// Mirror the bounded-linear Worker's conservative admission boundary before
// creating a generation/Timeline commit. The Worker independently rechecks it.
function boundedLinearUnsupported(graph: RenderGraph): boolean {
  const kinds = new Set(["source", "trim", "audio", "composite", "sink"]);
  if (graph.range || graph.nodes.some(node => !kinds.has(node.kind)) || graph.nodes.filter(node => node.kind === "composite").length !== 1 || graph.nodes.filter(node => node.kind === "sink").length !== 1) return true;
  const profile = graph.profile;
  if (!profile || profile.fps !== 30 || !Number.isSafeInteger(profile.width) || !Number.isSafeInteger(profile.height) || profile.width! <= 0 || profile.height! <= 0 || profile.width! % 2 || profile.height! % 2) return true;
  const parse = (value: unknown): bigint | null => typeof value === "string" && /^[0-9]+n$/.test(value) ? BigInt(value.slice(0, -1)) : null;
  const sources = graph.nodes.filter(node => node.kind === "source");
  if (!sources.length) return true;
  const prefixes = sources.map(node => node.node_id.endsWith("-source") ? `${node.node_id.slice(0, -7)}-` : "");
  if (prefixes.some((prefix, index) => !prefix || prefixes.some((other, i) => i !== index && other.startsWith(prefix)))) return true;
  const sorted = [...sources].sort((a, b) => { const left = parse(a.parameters?.timeline_start), right = parse(b.parameters?.timeline_start); return left === null || right === null ? 0 : left < right ? -1 : left > right ? 1 : 0; });
  let cursor = 0n, track: RenderScalar | undefined;
  for (const source of sorted) {
    const p = source.parameters ?? {}, duration = parse(p.timeline_duration);
    if ((p.track_kind ?? "video") !== "video" || (p.track_enabled ?? true) !== true || (p.track_muted ?? false) !== false || (p.track_solo ?? false) !== false || (p.track_opacity ?? 1) !== 1 || (p.track_blend_mode ?? "normal") !== "normal" || !["media", "image"].includes(String(p.clip_kind ?? "media")) || typeof (p.has_audio ?? true) !== "boolean" || (p.audio_enabled ?? true) !== true || p.clip_kind === "image" && p.has_audio !== false || parse(p.timeline_timescale) !== 30n || parse(p.timeline_start) !== cursor || duration === null || duration <= 0n) return true;
    if (track === undefined) track = p.track_id;
    if (!track || p.track_id !== track) return true;
    const prefix = `${source.node_id.slice(0, -7)}-`;
    const children = graph.nodes.filter(node => node.node_id.startsWith(prefix) && node !== source);
    if (children.filter(node => node.kind === "trim").length !== 1 || children.filter(node => node.kind === "audio").length !== 1) return true;
    const audio = children.find(node => node.kind === "audio")?.parameters ?? {};
    if ((audio.audio_role ?? "embedded") !== "embedded" || (audio.gain_db ?? 0) !== 0 || (audio.muted ?? false) !== false || (audio.solo ?? false) !== false || (audio.enabled ?? true) !== true) return true;
    cursor += duration;
  }
  return sources.some(source => parse(source.parameters?.timeline_total_duration) !== cursor) || graph.nodes.some(node => ["source", "trim", "audio"].includes(node.kind) && !prefixes.some(prefix => node.node_id.startsWith(prefix)));
}

export function resolveExecutionPlan(graph: RenderGraph, target: RenderTarget, executionPolicy: RenderExecutionPolicy = { schema_version: 1, mode: "standard-v1" }): ExecutionPlan {
  if (Object.keys(executionPolicy).sort().join(",") !== "mode,schema_version" || executionPolicy.schema_version !== 1 || !["standard-v1", "bounded-linear-v1"].includes(executionPolicy.mode)) throw new Error("RENDER_EXECUTION_POLICY_INVALID");
  const diagnostics: RenderDiagnostic[] = validateGraph(graph, timelineRenderCapabilities, target).filter((issue) => issue.code !== "UNSUPPORTED_CAPABILITY").map((issue) => ({ schema_version: 1, code: issue.code, ...(issue.node_id ? { node_id: issue.node_id } : {}), message: issue.message, severity: "blocker" }));
  if (executionPolicy.mode === "bounded-linear-v1" && boundedLinearUnsupported(graph)) diagnostics.push({ schema_version: 1, code: "BOUNDED_LINEAR_UNSUPPORTED", message: "This graph requires operations not yet supported by bounded linear rendering.", severity: "blocker" });
  const decisions: ResolverDecision[] = graph.nodes.map((node) => {
    if (node.kind === "unsupported") return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "block", detail: String(node.parameters?.blocker_code ?? "UNSUPPORTED_CAPABILITY") };
    if (node.kind === "transition" && node.parameters?.explicit_overlap !== true) return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "block", detail: "TRANSITION_SOURCE_HANDLES_REQUIRED" };
    if (node.kind === "transition" && !["dissolve", "cross_dissolve", "fade", "whip", "zoom", "luma"].includes(String(node.parameters?.transition_kind ?? ""))) return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "block", detail: "TRANSITION_KIND_RENDER_UNSUPPORTED" };
    if (node.kind === "time_map" && (node.parameters?.pitch_policy ?? "preserve") !== "preserve") return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "block", detail: "TIME_MAP_PITCH_POLICY_UNSUPPORTED" };
    if (node.kind === "color") {
      const parameters = node.parameters ?? {};
      const supportedContext = (parameters.input_space ?? "rec709") === "rec709" && (parameters.working_space ?? "rec709") === "rec709" && (parameters.output_space ?? "rec709") === "rec709" && (parameters.bit_depth ?? 8) === 8 && (parameters.range ?? "limited") === "limited";
      if (!supportedContext) return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "block", detail: "COLOR_CONTEXT_RENDER_UNSUPPORTED" };
    }
    const capability = timelineRenderCapabilities.get(node.capability); const decision = capability ? capabilityDecision(capability, target) : { supported: false, fallback: undefined, bake: undefined, blocker: `unknown capability: ${node.capability}` };
    if (decision.supported) return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "execute" }; if (decision.fallback) return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "fallback", detail: decision.fallback }; if (decision.bake) return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "bake", detail: decision.bake }; return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "block", detail: decision.blocker };
  });
  for (const decision of decisions.filter((item) => item.outcome === "block")) diagnostics.push({ schema_version: 1, code: decision.detail && /^[A-Z][A-Z0-9_]+$/.test(decision.detail) ? decision.detail : "UNSUPPORTED_CAPABILITY", node_id: decision.node_id, message: decision.detail ?? "resolver blocked node", severity: "blocker" });
  const semantic = semanticGraphPayload(graph); const semanticGraphHash = createHash("sha256").update(semantic).digest("hex");
  const adapterVersion = WORKER_MEDIA_ADAPTER_VERSION;
  const inputIdentities = [...(graph.source_refs ?? [])].sort((left, right) => left.asset_ref.localeCompare(right.asset_ref)).map((source) => ({ asset_ref: source.asset_ref, original_object_ref: source.original_object_ref ?? null, proxy_object_ref: source.proxy_object_ref ?? null, source_timescale: source.source_timescale, original_timescale: source.original_timescale ?? null, proxy_timescale: source.proxy_timescale ?? null, proxy_map: source.proxy_map ?? null, original_width: source.original_width ?? null, original_height: source.original_height ?? null, proxy_width: source.proxy_width ?? null, proxy_height: source.proxy_height ?? null, has_audio: source.has_audio ?? null }));
  const cacheKeyPayload = canonicalSerialize({ canonicalizer: "ave-c14n-v1", semantic_graph_hash: semanticGraphHash, target, profile: graph.profile ?? {}, range: graph.range ?? null, adapter_id: "worker-media", adapter_version: adapterVersion, execution_policy: executionPolicy, input_identities: inputIdentities });
  const cacheKey = createHash("sha256").update(cacheKeyPayload).digest("hex"); const planId = `plan-${target}-${cacheKey.slice(0, 24)}`;
  return { schema_version: 2, plan_id: planId, target, semantic_graph_payload: semantic, semantic_graph_hash: semanticGraphHash, adapter_id: "worker-media", adapter_version: adapterVersion, execution_policy: executionPolicy, capability_snapshot: { schema_version: 1, adapter_id: "worker-media", adapter_version: adapterVersion, capabilities: [...new Set(graph.nodes.map((node) => node.capability))].sort() }, decisions, cache_key_payload: cacheKeyPayload, cache_key: cacheKey, diagnostics };
}
