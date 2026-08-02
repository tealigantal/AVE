import type { RenderGraph, RenderNode, RenderTarget } from "./public.js";
import { capabilityDecision, timelineRenderCapabilities, validateGraph } from "./public.js";

export type ResolverDecision = Readonly<{ node_id: string; capability: string; outcome: "execute" | "fallback" | "bake" | "block"; detail?: string }>;
export type SemanticGraphManifest = Readonly<{ schema_version: 2; timeline_version: number; nodes: readonly RenderNode[]; edges: RenderGraph["edges"] }>;
export type ExecutionPlan = Readonly<{ schema_version: 2; plan_id: string; target: RenderTarget; semantic_graph_payload: string; adapter_id: "worker-media"; adapter_version: "v1"; capability_snapshot: readonly string[]; decisions: readonly ResolverDecision[]; cache_key_payload: string; diagnostics: readonly Readonly<{ code: string; node_id?: string; message: string }>[] }>;
export type OutputManifest = Readonly<{ schema_version: 2; render_id: string; target: RenderTarget; semantic_graph_hash: string; execution_plan_id: string; output_hash: string; worker_version: string; backend_version: string; diagnostics: ExecutionPlan["diagnostics"] }>;

const canonical = (value: unknown): string => JSON.stringify(value, (_, item) => typeof item === "bigint" ? `${item}n` : item);
export function semanticGraphManifest(graph: RenderGraph): SemanticGraphManifest {
  const nodes = graph.nodes.map((node) => {
    if (node.kind === "source") return { ...node, capability: "source.asset", parameters: Object.fromEntries(Object.entries(node.parameters ?? {}).filter(([key]) => !["source_ref", "source_kind", "fallback", "source_start_pts", "source_end_pts", "source_timescale"].includes(key))) };
    // Source trim values are adapter-timebase coordinates.  The clip's timeline
    // placement remains on the source node, so excluding this projection keeps
    // Preview proxies and Master originals on one semantic graph.
    if (node.kind === "trim") return { ...node, parameters: {} };
    if (node.kind === "sink") return { ...node, parameters: {} };
    return node;
  });
  return { schema_version: 2, timeline_version: graph.timeline_version ?? 0, nodes, edges: graph.edges };
}
export function semanticGraphPayload(graph: RenderGraph): string { return canonical(semanticGraphManifest(graph)); }
export function resolveExecutionPlan(graph: RenderGraph, target: RenderTarget): ExecutionPlan { const diagnostics: Array<{ code: string; node_id?: string; message: string }> = validateGraph(graph, timelineRenderCapabilities, target).map((issue) => ({ code: issue.code, node_id: issue.node_id, message: issue.message })); const decisions: ResolverDecision[] = graph.nodes.map((node) => { const capability = timelineRenderCapabilities.get(node.capability); const decision = capability ? capabilityDecision(capability, target) : { supported: false, fallback: undefined, bake: undefined, blocker: `unknown capability: ${node.capability}` }; if (decision.supported) return { node_id: node.node_id, capability: node.capability, outcome: "execute" }; if (decision.fallback) return { node_id: node.node_id, capability: node.capability, outcome: "fallback", detail: decision.fallback }; if (decision.bake) return { node_id: node.node_id, capability: node.capability, outcome: "bake", detail: decision.bake }; return { node_id: node.node_id, capability: node.capability, outcome: "block", detail: decision.blocker }; }); for (const decision of decisions.filter((item) => item.outcome === "block")) diagnostics.push({ code: "RESOLVER_BLOCKED", node_id: decision.node_id, message: decision.detail ?? "resolver blocked node" }); const semantic = semanticGraphPayload(graph); const profile = canonical(graph.profile ?? {}); return { schema_version: 2, plan_id: `${target}-v${graph.timeline_version ?? 0}`, target, semantic_graph_payload: semantic, adapter_id: "worker-media", adapter_version: "v1", capability_snapshot: [...new Set(graph.nodes.map((node) => node.capability))].sort(), decisions, cache_key_payload: canonical({ semantic, target, profile, adapter: "worker-media@v1" }), diagnostics }; }
