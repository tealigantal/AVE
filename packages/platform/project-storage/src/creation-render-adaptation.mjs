import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { creationDigest, creationRenderAdaptationV1Validator, creationRenderPlanMatchesGeneration, creationRenderV2Validator } from "../../contract-runtime/src/public.mjs";

const invalid = () => { throw new Error("CREATION_RENDER_ADAPTATION_REBOUND"); };
const canonicalValue = value => {
  if (typeof value === "bigint") return { $ave_bigint: value.toString(10) };
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
  if (value === undefined || typeof value === "number" && !Number.isFinite(value)) return invalid();
  return value;
};
const canonical = value => JSON.stringify(canonicalValue(value));
const equal = (left, right) => canonical(left) === canonical(right);
const hash = value => createHash("sha256").update(value).digest("hex");
const storedTime = value => {
  if (typeof value === "bigint") return `${value}n`;
  if (Array.isArray(value)) return value.map(storedTime);
  if (value && typeof value === "object") {
    if (Object.keys(value).length === 1 && typeof value.$ave_bigint === "string" && /^-?\d+$/.test(value.$ave_bigint)) return `${value.$ave_bigint}n`;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, storedTime(item)]));
  }
  return value;
};
const tick = value => { const text = typeof value === "bigint" ? `${value}n` : value; if (typeof text !== "string" || !/^-?\d+n$/.test(text)) return invalid(); return BigInt(text.slice(0, -1)); };
const point = value => { const numerator = tick(value?.value), denominator = tick(value?.timescale); if (denominator <= 0n) return invalid(); return [numerator, denominator]; };
const difference = (left, right) => [left[0] * right[1] - right[0] * left[1], left[1] * right[1]];
const rationalEqual = (left, right) => left[0] * right[1] === right[0] * left[1];
function verifyTimeMap(map, originalHasAudio, kind) {
  if (map.schema_version !== 1 || !Array.isArray(map.segments) || map.segments.length !== 1 || tick(map.original_timebase) <= 0n || tick(map.proxy_timebase) <= 0n) invalid();
  const segment = map.segments[0], start = point(segment.original_start), end = point(segment.original_end), proxyStart = point(segment.proxy_start), proxyEnd = point(segment.proxy_end);
  const originalDuration = difference(end, start), proxyDuration = difference(proxyEnd, proxyStart);
  if (originalDuration[0] <= 0n || !rationalEqual(originalDuration, proxyDuration) || kind === "image" && (originalHasAudio || map.audio) || kind === "video" && (Boolean(map.audio) !== originalHasAudio || map.audio && (tick(map.audio.original_sample_rate) <= 0n || tick(map.audio.original_sample_rate) !== tick(map.audio.proxy_sample_rate)))) invalid();
  return { start, end, proxyStart };
}
function verifyMappedPoint(mapping, semanticValue, semanticScale, selectedValue, selectedScale) {
  const original = point({ value: semanticValue, timescale: semanticScale }), selected = point({ value: selectedValue, timescale: selectedScale });
  const offset = difference(original, mapping.start), remaining = difference(mapping.end, original), proxyOffset = difference(selected, mapping.proxyStart);
  if (offset[0] < 0n || remaining[0] < 0n || !rationalEqual(offset, proxyOffset)) invalid();
}

// The target-neutral projection is kept byte-compatible with the RenderGraph
// canonical contract and tested against graphs produced by the actual core.
function semanticPayload(graph) {
  const nodes = graph.nodes.map(node => {
    if (node.kind === "source") return { ...node, capability: "source.asset", parameters: Object.fromEntries(Object.entries(node.parameters ?? {}).filter(([key]) => !["source_ref", "source_kind", "fallback", "source_start_pts", "source_end_pts", "source_timescale", "selected_object_ref", "selected_width", "selected_height"].includes(key))) };
    if (node.kind === "trim") return { ...node, parameters: Object.fromEntries(Object.entries(node.parameters ?? {}).filter(([key]) => key.startsWith("semantic_"))) };
    if (node.kind === "audio") return { ...node, parameters: Object.fromEntries(Object.entries(node.parameters ?? {}).filter(([key]) => !["source_start_pts", "source_end_pts", "source_timescale"].includes(key))) };
    if (node.kind === "time_map") { const parameters = node.parameters ?? {}; return { ...node, parameters: { ...Object.fromEntries(Object.entries(parameters).filter(([key]) => !["segments_json", "semantic_segments_json"].includes(key))), segments_json: parameters.semantic_segments_json ?? parameters.segments_json ?? "[]" } }; }
    if (node.kind === "sink") return { ...node, parameters: {} };
    return node;
  });
  return canonical({ schema_version: 2, timeline_version: graph.timeline_version ?? 0, nodes, edges: graph.edges });
}

/** A v2 Original receipt binds both targets to the saved Original sources. */
export function assertCreationRenderOriginal({ receipt, generation, bundle, grants }) {
  if (!creationRenderV2Validator(receipt) || receipt.adaptation_ref !== null || !generation || !bundle || !Array.isArray(generation.source_refs) || !Array.isArray(grants)) invalid();
  const originals = new Map(generation.source_refs.map(source => [source.asset_ref, source]));
  if (!originals.size || originals.size !== generation.source_refs.length || creationDigest(generation.source_refs) !== receipt.source_identity_digest || generation.semantic_graph_hash !== receipt.semantic_graph_hash) invalid();
  for (const source of originals.values()) if (!grants.some(row => row.value.project_id === receipt.project_id && row.value.request_id === receipt.request_id && row.value.asset_id === source.asset_ref && row.value.immutable_location_id === source.original_object_ref)) invalid();
  for (const target of ["preview", "master"]) {
    const result = bundle.results.find(item => item.target === target), graph = result?.render_graph;
    const plan = bundle.manifests.find(item => item.manifest_type === "execution_plan" && item.value.target === target)?.value;
    if (!graph || graph.target !== target || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !Array.isArray(graph.source_refs) || !plan || !creationRenderPlanMatchesGeneration(plan, generation[`${target}_plan_id`]) || plan.semantic_graph_hash !== receipt.semantic_graph_hash || plan.diagnostics.length || result.graph_hash !== hash(canonical(graph)) || plan.semantic_graph_payload !== semanticPayload(graph)) invalid();
    if (!equal(graph.profile, generation.render_profile)) invalid();
    const { creation_binding: _binding, stage2_execution_binding: _stage2, ...resultProfile } = result.profile ?? {};
    if (!equal(resultProfile, graph.profile)) invalid();
    const refs = graph.source_refs;
    if (!refs.length || refs.length > originals.size || new Set(refs.map(ref => ref.asset_ref)).size !== refs.length || graph.nodes.some(node => node.kind === "source" && !refs.some(ref => ref.asset_ref === node.parameters?.asset_ref))) invalid();
    const ordered = [...refs].sort((a, b) => a.asset_ref.localeCompare(b.asset_ref));
    const allOriginals = [...originals.values()].sort((a, b) => a.asset_ref.localeCompare(b.asset_ref));
    if (!equal(storedTime(result.original_refs), storedTime(allOriginals.map(ref => ({ asset_ref: ref.asset_ref, ref: ref.original_ref, object_ref: ref.original_object_ref })))) || !equal(result.proxy_refs, [])) invalid();
    for (const ref of refs) {
      const original = originals.get(ref.asset_ref);
      if (!original || ref.proxy_ref || ref.proxy_object_ref || ref.proxy_map) invalid();
      for (const key of ["asset_ref", "original_ref", "original_object_ref", "source_timescale", "original_timescale", "original_width", "original_height", "has_audio"]) if (!equal(storedTime(ref[key] ?? null), storedTime(original[key] ?? null))) invalid();
      const nodes = graph.nodes.filter(node => node.kind === "source" && node.parameters?.asset_ref === ref.asset_ref);
      if (!nodes.length) invalid();
      for (const node of nodes) {
        const p = node.parameters;
        if (node.capability !== "source.original" || p.source_kind !== "original" || p.source_ref !== ref.original_ref || p.selected_object_ref !== ref.original_object_ref || p.selected_width !== ref.original_width || p.selected_height !== ref.original_height || (p.fallback && !(target === "preview" && p.fallback === "proxy_missing_original_fallback"))) invalid();
        if (!rationalEqual(point({ value: p.semantic_source_start_pts, timescale: p.semantic_source_timescale }), point({ value: p.source_start_pts, timescale: p.source_timescale })) || !rationalEqual(point({ value: p.semantic_source_end_pts, timescale: p.semantic_source_timescale }), point({ value: p.source_end_pts, timescale: p.source_timescale }))) invalid();
        if (typeof node.node_id !== "string" || !node.node_id.endsWith("-source")) invalid();
        const prefix = node.node_id.slice(0, -"source".length), trim = graph.nodes.find(item => item.node_id === `${prefix}trim`), audio = graph.nodes.find(item => item.node_id === `${prefix}audio`);
        if (!trim || trim.kind !== "trim" || !audio || audio.kind !== "audio") invalid();
        for (const [key, sourceKey] of [["start_pts", "source_start_pts"], ["end_pts", "source_end_pts"], ["timescale", "source_timescale"], ["semantic_start_pts", "semantic_source_start_pts"], ["semantic_end_pts", "semantic_source_end_pts"], ["semantic_timescale", "semantic_source_timescale"]]) if (trim.parameters?.[key] !== p[sourceKey]) invalid();
        for (const key of ["source_start_pts", "source_end_pts", "source_timescale", "semantic_source_start_pts", "semantic_source_end_pts", "semantic_source_timescale"]) if (audio.parameters?.[key] !== p[key]) invalid();
      }
    }
    const inputIdentities = ordered.map(source => ({ asset_ref: source.asset_ref, original_object_ref: source.original_object_ref ?? null, proxy_object_ref: source.proxy_object_ref ?? null, source_timescale: source.source_timescale, original_timescale: source.original_timescale ?? null, proxy_timescale: source.proxy_timescale ?? null, proxy_map: source.proxy_map ?? null, original_width: source.original_width ?? null, original_height: source.original_height ?? null, proxy_width: source.proxy_width ?? null, proxy_height: source.proxy_height ?? null, has_audio: source.has_audio ?? null }));
    const payload = canonical({ canonicalizer: "ave-c14n-v1", semantic_graph_hash: receipt.semantic_graph_hash, target, profile: graph.profile ?? {}, range: graph.range ?? null, adapter_id: plan.adapter_id, adapter_version: plan.adapter_version, execution_policy: plan.execution_policy, input_identities: inputIdentities });
    if (payload !== plan.cache_key_payload || receipt[target].plan_id !== plan.plan_id || receipt[target].cache_key !== plan.cache_key) invalid();
  }
}

/** Verify the complete v2 binding; no model or filesystem input is trusted by
 * identity alone. The caller supplies database-verified cache and grant rows. */
export function assertCreationRenderAdaptation({ projectDirectory, adaptation, receipt, generation, bundle, caches, grants }) {
  if (!creationRenderAdaptationV1Validator(adaptation) || !creationRenderV2Validator(receipt) || !generation || !bundle || !Array.isArray(caches) || !Array.isArray(grants)) invalid();
  for (const key of ["project_id", "request_id", "draft_id", "operation_id", "timeline_digest", "source_identity_digest", "semantic_graph_hash"]) if (adaptation[key] !== receipt[key]) invalid();
  if (!equal(adaptation.execution_ref, receipt.execution_ref) || generation.semantic_graph_hash !== receipt.semantic_graph_hash || creationDigest(generation.source_refs) !== receipt.source_identity_digest || !equal(adaptation.master_profile, generation.render_profile)) invalid();
  const masterProfile = adaptation.master_profile, previewProfile = adaptation.preview_profile;
  if (![masterProfile.width, masterProfile.height, previewProfile.width, previewProfile.height].every(value => Number.isSafeInteger(value) && value > 0) || Math.max(previewProfile.width, previewProfile.height) > 960 || BigInt(previewProfile.width) * BigInt(masterProfile.height) !== BigInt(previewProfile.height) * BigInt(masterProfile.width)) invalid();
  const profileOptions = ({ name, width, height, ...rest }) => rest;
  if (!equal(profileOptions(masterProfile), profileOptions(previewProfile))) invalid();
  const originals = new Map(generation.source_refs.map(source => [source.asset_ref, source]));
  if (originals.size !== generation.source_refs.length || new Set(adaptation.proxies.map(proxy => proxy.asset_ref)).size !== adaptation.proxies.length) invalid();
  for (const source of originals.values()) if (!grants.some(row => row.value.project_id === receipt.project_id && row.value.request_id === receipt.request_id && row.value.asset_id === source.asset_ref && row.value.immutable_location_id === source.original_object_ref)) invalid();
  const proxies = new Map(adaptation.proxies.map(proxy => [proxy.asset_ref, proxy]));
  for (const proxy of adaptation.proxies) {
    const original = originals.get(proxy.asset_ref), cache = caches.find(row => row.object_ref_id === proxy.proxy_object_ref), grant = grants.find(row => row.object_hash === proxy.material_digest);
    if (!original || original.original_object_ref !== proxy.original_object_ref || proxy.asset_ref !== `asset:sha256:${proxy.original_digest}` || !cache || cache.object_hash !== proxy.proxy_digest || !grant || grant.value.project_id !== receipt.project_id || grant.value.request_id !== receipt.request_id || grant.value.asset_id !== proxy.asset_ref || grant.value.immutable_location_id !== proxy.original_object_ref) invalid();
    const metadata = cache.metadata;
    for (const key of ["asset_ref", "original_object_ref", "original_digest", "material_digest", "proxy_digest", "byte_length", "width", "height", "kind", "policy", "producer_version", "proxy_map"]) if (!equal(metadata?.[key], proxy[key])) invalid();
    if (proxy.policy !== (proxy.kind === "image" ? "still-png-lanczos-v1" : "h264-preserved-timestamps-v1") || proxy.kind === "image" && typeof metadata.alpha !== "boolean" || proxy.kind === "video" && (!Number.isSafeInteger(metadata.frame_count) || metadata.frame_count < 1)) invalid();
    verifyTimeMap(proxy.proxy_map, original.has_audio, proxy.kind);
    const identity = creationDigest({ asset_ref: proxy.asset_ref, original_object_ref: proxy.original_object_ref, material_digest: proxy.material_digest, proxy_digest: proxy.proxy_digest, width: proxy.width, height: proxy.height, policy: proxy.policy, producer_version: proxy.producer_version, proxy_map: proxy.proxy_map, ...(proxy.kind === "image" ? { alpha: metadata.alpha } : { frame_count: metadata.frame_count }) });
    if (metadata.object_ref_id !== proxy.proxy_object_ref || metadata.object_type !== "creation_preview_proxy" || metadata.relation_key !== identity || metadata.object_ref_id !== `${receipt.project_id}:creation-preview-proxy:${identity}` || metadata.version !== 1) invalid();
  }
  for (const target of ["preview", "master"]) {
    const result = bundle.results.find(item => item.target === target), graph = result?.render_graph;
    const plan = bundle.manifests.find(item => item.manifest_type === "execution_plan" && item.value.target === target)?.value;
    if (!graph || graph.target !== target || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !Array.isArray(graph.source_refs) || !creationRenderPlanMatchesGeneration(plan, adaptation[`${target}_plan_id`]) || plan.semantic_graph_hash !== receipt.semantic_graph_hash || plan.diagnostics.length || !equal(graph.profile, adaptation[`${target}_profile`]) || result.graph_hash !== hash(canonical(graph)) || plan.semantic_graph_payload !== semanticPayload(graph)) invalid();
    // Initial adapter admits the simple raster path only. More complex
    // geometry needs explicit, independently verified coordinate conversion.
    if (graph.nodes.some(node => !["source", "trim", "audio", "composite", "sink"].includes(node.kind))) invalid();
    const refs = graph.source_refs;
    if (refs.length !== originals.size || new Set(refs.map(ref => ref.asset_ref)).size !== refs.length) invalid();
    const orderedRefs = [...refs].sort((left, right) => left.asset_ref.localeCompare(right.asset_ref));
    const expectedOriginals = orderedRefs.map(ref => ({ asset_ref: ref.asset_ref, ref: ref.original_ref, object_ref: ref.original_object_ref }));
    const expectedProxies = orderedRefs.filter(ref => ref.proxy_ref || ref.proxy_object_ref).map(ref => ({ asset_ref: ref.asset_ref, ref: ref.proxy_ref, object_ref: ref.proxy_object_ref, proxy_map: ref.proxy_map }));
    if (!equal(storedTime(result.original_refs), storedTime(expectedOriginals)) || !equal(storedTime(result.proxy_refs), storedTime(expectedProxies))) invalid();
    const { creation_binding: _binding, stage2_execution_binding: _stage2, ...resultProfile } = result.profile ?? {};
    if (!equal(resultProfile, graph.profile)) invalid();
    for (const ref of refs) {
      const original = originals.get(ref.asset_ref), proxy = proxies.get(ref.asset_ref);
      if (!original) invalid();
      for (const key of ["asset_ref", "original_ref", "original_object_ref", "source_timescale", "original_timescale", "original_width", "original_height", "has_audio"]) if (!equal(storedTime(ref[key] ?? null), storedTime(original[key] ?? null))) invalid();
      if (proxy) {
        if (ref.proxy_object_ref !== proxy.proxy_object_ref || ref.proxy_ref !== resolve(projectDirectory, "objects", "sha256", proxy.proxy_digest.slice(0, 2), proxy.proxy_digest) || !equal(storedTime(ref.proxy_map), proxy.proxy_map) || !equal(storedTime(ref.proxy_timescale), proxy.proxy_map.proxy_timebase) || ref.proxy_width !== proxy.width || ref.proxy_height !== proxy.height) invalid();
      } else if (ref.proxy_ref || ref.proxy_object_ref || ref.proxy_map) invalid();
      const nodes = graph.nodes.filter(node => node.kind === "source" && node.parameters?.asset_ref === ref.asset_ref);
      if (!nodes.length) invalid();
      for (const node of nodes) {
        const selected = target === "preview" && proxy ? "proxy" : "original", p = node.parameters;
        if (target === "preview" && !proxy && p.track_kind !== "audio") invalid();
        const permittedAudioOriginal = target === "preview" && !proxy && p.track_kind === "audio" && p.fallback === "proxy_missing_original_fallback";
        if (node.capability !== `source.${selected}` || p.source_kind !== selected || p.source_ref !== ref[`${selected}_ref`] || p.selected_object_ref !== ref[`${selected}_object_ref`] || p.selected_width !== ref[`${selected}_width`] || p.selected_height !== ref[`${selected}_height`] || p.fallback && !permittedAudioOriginal) invalid();
        if (selected === "proxy") {
          const mapping = verifyTimeMap(proxy.proxy_map, original.has_audio, proxy.kind);
          verifyMappedPoint(mapping, p.semantic_source_start_pts, p.semantic_source_timescale, p.source_start_pts, p.source_timescale);
          verifyMappedPoint(mapping, p.semantic_source_end_pts, p.semantic_source_timescale, p.source_end_pts, p.source_timescale);
        } else {
          if (!rationalEqual(point({ value: p.semantic_source_start_pts, timescale: p.semantic_source_timescale }), point({ value: p.source_start_pts, timescale: p.source_timescale })) || !rationalEqual(point({ value: p.semantic_source_end_pts, timescale: p.semantic_source_timescale }), point({ value: p.source_end_pts, timescale: p.source_timescale }))) invalid();
        }
        if (typeof node.node_id !== "string" || !node.node_id.endsWith("-source")) invalid();
        const prefix = node.node_id.slice(0, -"source".length), trim = graph.nodes.find(item => item.node_id === `${prefix}trim`), audio = graph.nodes.find(item => item.node_id === `${prefix}audio`);
        if (!trim || trim.kind !== "trim" || !audio || audio.kind !== "audio") invalid();
        for (const [key, sourceKey] of [["start_pts", "source_start_pts"], ["end_pts", "source_end_pts"], ["timescale", "source_timescale"], ["semantic_start_pts", "semantic_source_start_pts"], ["semantic_end_pts", "semantic_source_end_pts"], ["semantic_timescale", "semantic_source_timescale"]]) if (trim.parameters?.[key] !== p[sourceKey]) invalid();
        for (const key of ["source_start_pts", "source_end_pts", "source_timescale", "semantic_source_start_pts", "semantic_source_end_pts", "semantic_source_timescale"]) if (audio.parameters?.[key] !== p[key]) invalid();
      }
    }
    const inputIdentities = [...refs].sort((a, b) => a.asset_ref.localeCompare(b.asset_ref)).map(source => ({ asset_ref: source.asset_ref, original_object_ref: source.original_object_ref ?? null, proxy_object_ref: source.proxy_object_ref ?? null, source_timescale: source.source_timescale, original_timescale: source.original_timescale ?? null, proxy_timescale: source.proxy_timescale ?? null, proxy_map: source.proxy_map ?? null, original_width: source.original_width ?? null, original_height: source.original_height ?? null, proxy_width: source.proxy_width ?? null, proxy_height: source.proxy_height ?? null, has_audio: source.has_audio ?? null }));
    const payload = canonical({ canonicalizer: "ave-c14n-v1", semantic_graph_hash: receipt.semantic_graph_hash, target, profile: graph.profile ?? {}, range: graph.range ?? null, adapter_id: plan.adapter_id, adapter_version: plan.adapter_version, execution_policy: plan.execution_policy, input_identities: inputIdentities });
    if (payload !== plan.cache_key_payload || receipt[target].plan_id !== plan.plan_id || receipt[target].cache_key !== plan.cache_key) invalid();
  }
}
