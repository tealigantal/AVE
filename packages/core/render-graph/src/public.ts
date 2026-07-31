import type { Clip, Timeline } from "../../timeline-core/src/public.js";
import { mapOriginalToProxy, type ProxyMap } from "../../timebase/src/public.js";

export type RenderTarget = "preview" | "master";
export type RenderNodeKind = "source" | "trim" | "speed" | "transform" | "audio" | "transition" | "caption" | "effect" | "composite" | "sink";
export type RenderScalar = string | number | boolean;
export type RenderSourceRef = Readonly<{ asset_ref: string; original_ref?: string; proxy_ref?: string; source_timescale: bigint; original_timescale?: bigint; proxy_timescale?: bigint; proxy_map?: ProxyMap; original_object_ref?: string; proxy_object_ref?: string }>;
export type RenderRange = Readonly<{ start_pts: bigint; end_pts: bigint; timescale: bigint }>;
export type RenderProfile = Readonly<{ name: string; width?: number; height?: number; fps?: number; video_codec?: string; audio_codec?: string; container?: string }>;
export type RenderNode = Readonly<{ node_id: string; kind: RenderNodeKind; capability: string; parameters?: Readonly<Record<string, RenderScalar>> }>;
export type RenderEdge = Readonly<{ from: string; to: string }>;
export type RenderCapability = Readonly<{ name: string; preview: boolean; master: boolean; fallback?: string; bake?: string; blocker?: string }>;
export type CapabilityDecision = Readonly<{ capability: string; target: RenderTarget; supported: boolean; fallback?: string; bake?: string; blocker?: string }>;
export type RenderGraph = Readonly<{ schema_version: 1; graph_id: string; timeline_version?: number; target?: RenderTarget; nodes: readonly RenderNode[]; edges: readonly RenderEdge[]; source_refs?: readonly RenderSourceRef[]; profile?: RenderProfile; range?: RenderRange }>;
export type RenderIssue = Readonly<{ code: "DUPLICATE_NODE" | "MISSING_NODE" | "CYCLE" | "UNSUPPORTED_CAPABILITY" | "NO_SOURCE" | "NO_SINK" | "MISSING_SOURCE_REF" | "MASTER_ORIGINAL_REQUIRED"; node_id?: string; message: string }>;

const pts = (value: bigint): string => `${value}n`;
const sourceFor = (source: RenderSourceRef, target: RenderTarget): { source_ref: string; source_kind: "original" | "proxy"; fallback?: string } => { if (target === "master") { if (!source.original_ref) throw new Error(`MASTER_ORIGINAL_REQUIRED:${source.asset_ref}`); return { source_ref: source.original_ref, source_kind: "original" }; } if (source.proxy_ref) return { source_ref: source.proxy_ref, source_kind: "proxy" }; if (source.original_ref) return { source_ref: source.original_ref, source_kind: "original", fallback: "proxy_missing_original_fallback" }; throw new Error(`RENDER_SOURCE_MISSING:${source.asset_ref}`); };
export function capabilityDecision(capability: RenderCapability, target: RenderTarget): CapabilityDecision { const supported = capability[target]; return { capability: capability.name, target, supported, fallback: capability.fallback, bake: capability.bake, blocker: supported ? undefined : capability.blocker ?? `capability unavailable for ${target}: ${capability.name}` }; }

export const timelineRenderCapabilities: ReadonlyMap<string, RenderCapability> = new Map([
  ["source.original", { name: "source.original", preview: true, master: true }],
  ["source.proxy", { name: "source.proxy", preview: true, master: false, fallback: "source.original", blocker: "master requires original source" }],
  ["timeline.trim", { name: "timeline.trim", preview: true, master: true }],
  ["timeline.speed", { name: "timeline.speed", preview: true, master: true, bake: "speed_filter" }],
  ["timeline.transform", { name: "timeline.transform", preview: true, master: true, bake: "scale_pad" }],
  ["timeline.audio", { name: "timeline.audio", preview: true, master: true }],
  ["timeline.transition", { name: "timeline.transition", preview: true, master: true, bake: "xfade" }],
  ["timeline.caption", { name: "timeline.caption", preview: true, master: true, bake: "drawtext" }],
  ["timeline.effect", { name: "timeline.effect", preview: true, master: true, bake: "filter" }],
  ["timeline.composite", { name: "timeline.composite", preview: true, master: true }],
  ["sink.mp4", { name: "sink.mp4", preview: true, master: true }]
]);

export function buildTimelineRenderGraph(timeline: Timeline, sources: ReadonlyMap<string, RenderSourceRef>, target: RenderTarget, profile: RenderProfile = { name: target }, range?: RenderRange): RenderGraph {
  const nodes: RenderNode[] = []; const edges: RenderEdge[] = []; const sourceRefs: RenderSourceRef[] = []; const compositeInputs: string[] = [];
  const clips = timeline.tracks.flatMap((track) => track.clips.map((clip) => ({ track, clip }))).sort((left, right) => left.clip.timeline_start < right.clip.timeline_start ? -1 : left.clip.timeline_start > right.clip.timeline_start ? 1 : 0);
  for (let index = 0; index < clips.length; index += 1) {
    const { track, clip } = clips[index]; const source = sources.get(clip.source.asset_id); if (!source) throw new Error(`RENDER_SOURCE_MISSING:${clip.source.asset_id}`); const selected = sourceFor(source, target); sourceRefs.push(source);
    let sourceStart = clip.source.start_pts; let sourceEnd = clip.source.end_pts; let sourceTimescale = clip.source.timescale;
    if (target === "preview" && selected.source_kind === "proxy" && source.proxy_ref !== source.original_ref) {
      if (!source.proxy_map) throw new Error(`PROXY_MAP_REQUIRED:${source.asset_ref}`);
      const mappedStart = mapOriginalToProxy(source.proxy_map, { value: clip.source.start_pts, timescale: clip.source.timescale });
      const mappedEnd = mapOriginalToProxy(source.proxy_map, { value: clip.source.end_pts, timescale: clip.source.timescale });
      sourceTimescale = source.proxy_timescale ?? source.proxy_map.proxy_timebase; sourceStart = (mappedStart.value * sourceTimescale) / mappedStart.timescale; sourceEnd = (mappedEnd.value * sourceTimescale) / mappedEnd.timescale;
    }
    const base = `clip-${clip.clip_id}-${index}`; const sourceId = `${base}-source`; const trimId = `${base}-trim`; let previous = sourceId;
    nodes.push({ node_id: sourceId, kind: "source", capability: selected.source_kind === "original" ? "source.original" : "source.proxy", parameters: { asset_ref: source.asset_ref, source_ref: selected.source_ref, source_kind: selected.source_kind, track_kind: track.kind, source_start_pts: pts(sourceStart), source_end_pts: pts(sourceEnd), source_timescale: pts(sourceTimescale), timeline_start: pts(clip.timeline_start), timeline_duration: pts(clip.timeline_duration), ...(selected.fallback ? { fallback: selected.fallback } : {}) } });
    nodes.push({ node_id: trimId, kind: "trim", capability: "timeline.trim", parameters: { start_pts: pts(sourceStart), end_pts: pts(sourceEnd), timescale: pts(sourceTimescale) } }); edges.push({ from: sourceId, to: trimId }); previous = trimId;
    if (clip.speed) { const nodeId = `${base}-speed`; nodes.push({ node_id: nodeId, kind: "speed", capability: "timeline.speed", parameters: { numerator: pts(clip.speed.numerator), denominator: pts(clip.speed.denominator) } }); edges.push({ from: previous, to: nodeId }); previous = nodeId; }
    if (clip.transform) { const nodeId = `${base}-transform`; nodes.push({ node_id: nodeId, kind: "transform", capability: "timeline.transform", parameters: Object.fromEntries(Object.entries(clip.transform).map(([key, value]) => [key, value])) }); edges.push({ from: previous, to: nodeId }); previous = nodeId; }
    const audioId = `${base}-audio`; nodes.push({ node_id: audioId, kind: "audio", capability: "timeline.audio", parameters: { track_kind: track.kind, gain_db: clip.gain_db ?? 0 } }); edges.push({ from: previous, to: audioId }); previous = audioId;
    for (const effect of [...(track.effects ?? []), ...(clip.effects ?? [])].filter((effect) => effect.clip_id === clip.clip_id)) { const nodeId = `${base}-effect-${effect.effect_id}`; nodes.push({ node_id: nodeId, kind: "effect", capability: "timeline.effect", parameters: { effect_id: effect.effect_id, effect_kind: effect.kind, ...(effect.enabled === undefined ? {} : { enabled: effect.enabled }), ...effect.parameters } }); edges.push({ from: previous, to: nodeId }); previous = nodeId; }
    compositeInputs.push(previous);
  }
  const timelineTimescale = clips[0]?.clip.source.timescale ?? 1n;
  for (const track of timeline.tracks) for (const caption of track.captions ?? []) { const nodeId = `caption-${caption.caption_id}`; nodes.push({ node_id: nodeId, kind: "caption", capability: "timeline.caption", parameters: { caption_id: caption.caption_id, text: caption.text, start_pts: pts(caption.timeline_start), duration: pts(caption.timeline_duration), timescale: pts(timelineTimescale), ...(caption.language ? { language: caption.language } : {}) } }); }
  const compositeId = "composite"; nodes.push({ node_id: compositeId, kind: "composite", capability: "timeline.composite", parameters: { input_count: compositeInputs.length } }); for (const input of compositeInputs) edges.push({ from: input, to: compositeId });
  let finalNode = compositeId;
  for (const track of timeline.tracks) for (const transition of track.transitions ?? []) { const nodeId = `transition-${transition.transition_id}`; nodes.push({ node_id: nodeId, kind: "transition", capability: "timeline.transition", parameters: { transition_id: transition.transition_id, transition_kind: transition.kind, from_clip_id: transition.from_clip_id, to_clip_id: transition.to_clip_id, start_pts: pts(transition.timeline_start), duration: pts(transition.timeline_duration), ...(transition.parameters ?? {}) } }); edges.push({ from: finalNode, to: nodeId }); finalNode = nodeId; }
  for (const track of timeline.tracks) for (const caption of track.captions ?? []) { const nodeId = `caption-${caption.caption_id}`; const existing = nodes.find((node) => node.node_id === nodeId); if (existing) { edges.push({ from: finalNode, to: nodeId }); finalNode = nodeId; } }
  const sinkId = "sink"; nodes.push({ node_id: sinkId, kind: "sink", capability: "sink.mp4", parameters: { target } }); edges.push({ from: finalNode, to: sinkId });
  return { schema_version: 1, graph_id: `${target}-timeline-v${timeline.version}`, timeline_version: timeline.version, target, nodes, edges, source_refs: sourceRefs, profile, range };
}

export function renderGraphPayload(graph: RenderGraph): string { return JSON.stringify(graph, (_, value) => typeof value === "bigint" ? `${value}n` : value); }
export function validateGraph(graph: RenderGraph, capabilities: ReadonlyMap<string, RenderCapability>, target: RenderTarget): readonly RenderIssue[] { const issues: RenderIssue[] = []; const ids = new Set<string>(); const edges = new Map<string, string[]>(); for (const node of graph.nodes) { if (ids.has(node.node_id)) issues.push({ code: "DUPLICATE_NODE", node_id: node.node_id, message: "node id must be unique" }); ids.add(node.node_id); const capability = capabilities.get(node.capability); if (!capability || !capability[target]) issues.push({ code: "UNSUPPORTED_CAPABILITY", node_id: node.node_id, message: `capability unavailable for ${target}: ${node.capability}` }); if (node.kind === "source" && !node.parameters?.source_ref) issues.push({ code: "MISSING_SOURCE_REF", node_id: node.node_id, message: "source node needs explicit source_ref" }); } if (!graph.nodes.some((node) => node.kind === "source")) issues.push({ code: "NO_SOURCE", message: "graph needs a source" }); if (!graph.nodes.some((node) => node.kind === "sink")) issues.push({ code: "NO_SINK", message: "graph needs a sink" }); for (const edge of graph.edges) { if (!ids.has(edge.from)) issues.push({ code: "MISSING_NODE", node_id: edge.from, message: "edge source missing" }); if (!ids.has(edge.to)) issues.push({ code: "MISSING_NODE", node_id: edge.to, message: "edge target missing" }); edges.set(edge.from, [...(edges.get(edge.from) ?? []), edge.to]); } const visit = new Set<string>(); const active = new Set<string>(); const walk = (id: string) => { if (active.has(id)) { issues.push({ code: "CYCLE", node_id: id, message: "render graph contains a cycle" }); return; } if (visit.has(id)) return; active.add(id); for (const next of edges.get(id) ?? []) walk(next); active.delete(id); visit.add(id); }; for (const id of ids) walk(id); if (target === "master") for (const node of graph.nodes.filter((node) => node.kind === "source")) if (node.parameters?.source_kind !== "original") issues.push({ code: "MASTER_ORIGINAL_REQUIRED", node_id: node.node_id, message: "master graph source must be original" }); return issues; }
export function basicGraph(graph_id: string, sourceCapability = "source.original", sinkCapability = "sink.mp4"): RenderGraph { return { schema_version: 1, graph_id, nodes: [{ node_id: "source", kind: "source", capability: sourceCapability, parameters: { source_ref: "explicit-source", source_kind: sourceCapability === "source.proxy" ? "proxy" : "original" } }, { node_id: "sink", kind: "sink", capability: sinkCapability }], edges: [{ from: "source", to: "sink" }] }; }
