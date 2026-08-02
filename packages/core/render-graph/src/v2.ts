import type { RenderGraph, RenderNode, RenderTarget } from "./public.js";
import { capabilityDecision, timelineRenderCapabilities, validateGraph } from "./public.js";
import { createHash } from "node:crypto";
import { canonicalSerialize } from "./canonical.js";

export type ResolverDecision = Readonly<{ schema_version: 1; node_id: string; capability: string; outcome: "execute" | "fallback" | "bake" | "block"; detail?: string }>;
export type RenderDiagnostic = Readonly<{ schema_version: 1; code: string; node_id?: string; message: string; severity: "info" | "warning" | "error" | "blocker" }>;
export type CapabilitySnapshot = Readonly<{ schema_version: 1; adapter_id: "worker-media"; adapter_version: "v2"; capabilities: readonly string[] }>;
export type SemanticGraphManifest = Readonly<{ schema_version: 2; timeline_version: number; nodes: readonly RenderNode[]; edges: RenderGraph["edges"] }>;
export type ExecutionPlan = Readonly<{ schema_version: 2; plan_id: string; target: RenderTarget; semantic_graph_payload: string; semantic_graph_hash: string; adapter_id: "worker-media"; adapter_version: "v2"; capability_snapshot: CapabilitySnapshot; decisions: readonly ResolverDecision[]; cache_key_payload: string; cache_key: string; diagnostics: readonly RenderDiagnostic[] }>;
export type OutputManifest = Readonly<{ schema_version: 2; render_id: string; target: RenderTarget; semantic_graph_hash: string; execution_plan_id: string; cache_key: string; output_hash: string; worker_version: string; backend_version: string; diagnostics: ExecutionPlan["diagnostics"] }>;

export function semanticGraphManifest(graph: RenderGraph): SemanticGraphManifest {
  const nodes = graph.nodes.map((node) => {
    if (node.kind === "source") return { ...node, capability: "source.asset", parameters: Object.fromEntries(Object.entries(node.parameters ?? {}).filter(([key]) => !["source_ref", "source_kind", "fallback", "source_start_pts", "source_end_pts", "source_timescale", "selected_object_ref"].includes(key))) };
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
export function resolveExecutionPlan(graph: RenderGraph, target: RenderTarget): ExecutionPlan {
  const diagnostics: RenderDiagnostic[] = validateGraph(graph, timelineRenderCapabilities, target).filter((issue) => issue.code !== "UNSUPPORTED_CAPABILITY").map((issue) => ({ schema_version: 1, code: issue.code, ...(issue.node_id ? { node_id: issue.node_id } : {}), message: issue.message, severity: "blocker" }));
  const decisions: ResolverDecision[] = graph.nodes.map((node) => {
    if (node.kind === "unsupported") return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "block", detail: String(node.parameters?.blocker_code ?? "UNSUPPORTED_CAPABILITY") };
    const capability = timelineRenderCapabilities.get(node.capability); const decision = capability ? capabilityDecision(capability, target) : { supported: false, fallback: undefined, bake: undefined, blocker: `unknown capability: ${node.capability}` };
    if (decision.supported) return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "execute" }; if (decision.fallback) return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "fallback", detail: decision.fallback }; if (decision.bake) return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "bake", detail: decision.bake }; return { schema_version: 1, node_id: node.node_id, capability: node.capability, outcome: "block", detail: decision.blocker };
  });
  for (const decision of decisions.filter((item) => item.outcome === "block")) diagnostics.push({ schema_version: 1, code: decision.detail && /^[A-Z][A-Z0-9_]+$/.test(decision.detail) ? decision.detail : "UNSUPPORTED_CAPABILITY", node_id: decision.node_id, message: decision.detail ?? "resolver blocked node", severity: "blocker" });
  const semantic = semanticGraphPayload(graph); const semanticGraphHash = createHash("sha256").update(semantic).digest("hex");
  const inputIdentities = [...(graph.source_refs ?? [])].sort((left, right) => left.asset_ref.localeCompare(right.asset_ref)).map((source) => ({ asset_ref: source.asset_ref, original_object_ref: source.original_object_ref ?? null, proxy_object_ref: source.proxy_object_ref ?? null, source_timescale: source.source_timescale, original_timescale: source.original_timescale ?? null, proxy_timescale: source.proxy_timescale ?? null, proxy_map: source.proxy_map ?? null }));
  const cacheKeyPayload = canonicalSerialize({ canonicalizer: "ave-c14n-v1", semantic_graph_hash: semanticGraphHash, target, profile: graph.profile ?? {}, range: graph.range ?? null, adapter_id: "worker-media", adapter_version: "v2", input_identities: inputIdentities });
  const cacheKey = createHash("sha256").update(cacheKeyPayload).digest("hex"); const planId = `plan-${target}-${cacheKey.slice(0, 24)}`;
  return { schema_version: 2, plan_id: planId, target, semantic_graph_payload: semantic, semantic_graph_hash: semanticGraphHash, adapter_id: "worker-media", adapter_version: "v2", capability_snapshot: { schema_version: 1, adapter_id: "worker-media", adapter_version: "v2", capabilities: [...new Set(graph.nodes.map((node) => node.capability))].sort() }, decisions, cache_key_payload: cacheKeyPayload, cache_key: cacheKey, diagnostics };
}
