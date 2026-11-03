import type { Timeline, Track, Clip, Caption, SemanticSidecar, TimelineCommand } from "../../../core/timeline-core/src/public.js";
import { createHash } from "node:crypto";
import { canonicalSerialize } from "../../../core/render-graph/src/public.js";

const styleKeys = ["layout_version", "font_family", "font_size_ratio", "font_color", "bold", "safe_y_ratio", "workbench_kind"];
const metadataKeys = ["workbench_role", "p4_workbench_previous_transform"];
const transformKeys = ["x", "y", "position_mode", "scale_x", "scale_y", "rotation", "anchor_x", "anchor_y", "opacity", "flip_x", "flip_y", "crop_left", "crop_top", "crop_right", "crop_bottom", "fit"];
function pick<T extends object>(value: T, keys: readonly string[]): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => keys.includes(key) && item !== undefined).map(([key, item]) => [key, structuredClone(item)])) as Partial<T>;
}
function visibleMetadata(value: Readonly<Record<string, string>> = {}) {
  const result: Record<string, string> = {};
  if (value.workbench_role !== undefined && !["picture-in-picture", "captions", "text", "music", "sfx", "narration"].includes(value.workbench_role)) throw new Error("CREATION_WORKBENCH_ROLE_INVALID");
  if (["picture-in-picture", "captions", "text", "music", "sfx", "narration"].includes(value.workbench_role!)) result.workbench_role = value.workbench_role!;
  if (value.p4_workbench_previous_transform !== undefined) {
    // The reversible PiP marker is geometry, never a general metadata channel.
    const raw = value.p4_workbench_previous_transform;
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new Error("CREATION_PIP_TRANSFORM_INVALID"); }
    if (parsed !== null && (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.entries(parsed).some(([key, item]) => !transformKeys.includes(key) || !(typeof item === "number" && Number.isFinite(item) || typeof item === "boolean" || key === "position_mode" && ["normalized", "canvas_pixels"].includes(String(item)) || key === "fit" && ["fit", "fill", "stretch", "original"].includes(String(item)))))) throw new Error("CREATION_PIP_TRANSFORM_INVALID");
    result.p4_workbench_previous_transform = JSON.stringify(parsed);
  }
  return result;
}

type PrivateReferences = Map<string, { kind: string; identity: string; value: unknown }>;
const referenceKey = "_ave_host_ref";
function reference(kind: string, identity: string, value: unknown, refs: PrivateReferences): string {
  const token = "ave-host:" + createHash("sha256").update(canonicalSerialize({ kind, identity, value })).digest("hex");
  refs.set(token, { kind, identity, value: structuredClone(value) });
  return token;
}
function projectDictionary(value: Readonly<Record<string, any>>, keys: readonly string[], kind: string, identity: string, refs: PrivateReferences): Record<string, any> {
  const hidden = Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
  return { ...pick(value, keys), ...(Object.keys(hidden).length ? { [referenceKey]: reference(kind, identity, hidden, refs) } : {}) };
}
function effect<T extends { effect_id: string; parameters?: Readonly<Record<string, string | number | boolean>> }>(value: T, refs: PrivateReferences): T {
  return { ...value, ...(value.parameters ? { parameters: projectDictionary(value.parameters, [], "parameters", value.effect_id, refs) } : {}) };
}
function resolveProjected(value: any, refs: PrivateReferences, field = ""): any {
  if (Array.isArray(value)) return value.map(item => resolveProjected(item, refs));
  if (field === "lut_path") {
    const bound = refs.get(value);
    if (!bound || bound.kind !== "lut_path") throw new Error("CREATION_PROJECTED_PRIVATE_FIELDS_DENIED");
    return structuredClone(bound.value);
  }
  if (!value || typeof value !== "object") return value;
  if (field === "grade" && value.lut_path !== undefined) {
    const bound = refs.get(value.lut_path);
    if (!bound || bound.identity !== value.grade_id + ":" + value.lut_sha256) throw new Error("CREATION_PROJECTED_PRIVATE_FIELDS_DENIED");
  }
  const keys = field === "metadata" ? metadataKeys : field === "style" ? styleKeys : field === "parameters" ? [] : null;
  if (keys && Object.keys(value).some(key => key !== referenceKey && !keys.includes(key))) throw new Error("CREATION_PROJECTED_PRIVATE_FIELDS_DENIED");
  if (field === "metadata") value = { ...value, ...visibleMetadata(value) };
  let hidden: Record<string, unknown> = {};
  if (Object.hasOwn(value, referenceKey)) {
    const bound = refs.get(value[referenceKey]);
    if (!keys || !bound || bound.kind !== field) throw new Error("CREATION_PROJECTED_PRIVATE_FIELDS_DENIED");
    hidden = structuredClone(bound.value) as Record<string, unknown>;
  }
  return { ...hidden, ...Object.fromEntries(Object.entries(value).filter(([key]) => key !== referenceKey).map(([key, item]) => [key, resolveProjected(item, refs, key)])) };
}

function sidecar(value: SemanticSidecar, refs: PrivateReferences): SemanticSidecar {
  const metadata = { ...projectDictionary(value.metadata ?? {}, metadataKeys, "metadata", value.semantic_id, refs), ...visibleMetadata(value.metadata) };
  return { semantic_id: value.semantic_id, labels: [...value.labels], evidence_refs: [...value.evidence_refs], ...(Object.keys(metadata).length ? { metadata } : {}) };
}
function caption(value: Caption, refs: PrivateReferences): Caption {
  return { ...pick(value, ["caption_id", "text", "timeline_start", "timeline_duration", "language", "words"]), ...(value.style ? { style: projectDictionary(value.style, styleKeys, "style", value.caption_id, refs) } : {}), ...(value.semantic_sidecar ? { semantic_sidecar: sidecar(value.semantic_sidecar, refs) } : {}) } as Caption;
}
function clip(value: Clip, refs: PrivateReferences): Clip {
  return { ...pick(value, ["clip_id", "source", "timeline_start", "timeline_duration", "media_kind", "kind", "speed", "time_map", "transform", "static_reframe", "boundary_fades", "mask", "gain_db", "effects", "keyframes", "automation_curves", "compound_clip_ids", "nested_sequence_id", "link_group_id"]), ...(value.effects ? { effects: value.effects.map(item => effect(item, refs)) } : {}), ...(value.grade ? { grade: { ...pick(value.grade, ["grade_id", "context", "exposure", "brightness", "contrast", "saturation", "gamma", "lut_sha256"]), ...(value.grade.lut_path ? { lut_path: reference("lut_path", value.grade.grade_id + ":" + value.grade.lut_sha256, value.grade.lut_path, refs) } : {}) } } : {}), ...(value.semantic_sidecar ? { semantic_sidecar: sidecar(value.semantic_sidecar, refs) } : {}) } as Clip;
}
function track(value: Track, refs: PrivateReferences): Track {
  return { ...pick(value, ["track_id", "kind", "z_index", "enabled", "locked", "muted", "solo", "opacity", "blend_mode", "gaps", "transitions", "effects", "keyframes", "automation_curves", "audio_routing", "locks"]), clips: value.clips.map(item => clip(item, refs)), ...(value.effects ? { effects: value.effects.map(item => effect(item, refs)) } : {}), ...(value.transitions ? { transitions: value.transitions.map(item => ({ ...item, ...(item.parameters ? { parameters: projectDictionary(item.parameters, [], "parameters", item.transition_id, refs) } : {}) })) } : {}), ...(value.captions ? { captions: value.captions.map(item => caption(item, refs)) } : {}), ...(value.semantic_sidecar ? { semantic_sidecar: sidecar(value.semantic_sidecar, refs) } : {}) } as Track;
}
/** Complete typed editing semantics; private paths and opaque metadata stay in Host. */
export function projectCreationTimeline(value: Timeline | null, refs: PrivateReferences = new Map()): Timeline | null {
  if (!value) return null;
  const sequence = (item: NonNullable<Timeline["sequence"]>) => ({ ...pick(item, ["sequence_id", "parent_sequence_id", "timebase", "duration"]), tracks: item.tracks.map(value => track(value, refs)), ...(item.semantic_sidecar ? { semantic_sidecar: sidecar(item.semantic_sidecar, refs) } : {}) }) as NonNullable<Timeline["sequence"]>;
  return { version: value.version, tracks: value.tracks.map(item => track(item, refs)), ...(value.sequence ? { sequence: sequence(value.sequence) } : {}), ...(value.sequences ? { sequences: value.sequences.map(sequence) } : {}), ...pick(value, ["master_loudness", "dialogue_music_ducking"]), ...(value.semantic_sidecar ? { semantic_sidecar: sidecar(value.semantic_sidecar, refs) } : {}) };
}

/** Renderer-only normalization against the immutable parent; receipts retain the full executed commands. */
export function restoreCreationPrivateFields(base: Timeline, commands: readonly TimelineCommand[]): readonly TimelineCommand[] {
  const clips = new Map(base.tracks.flatMap(item => item.clips.map(value => [value.clip_id, value] as const)));
  const captions = new Map(base.tracks.flatMap(item => (item.captions ?? []).map(value => [value.caption_id, value] as const)));
  const refs: PrivateReferences = new Map();
  projectCreationTimeline(base, refs);
  const restoreSidecar = (next: SemanticSidecar | undefined, old: SemanticSidecar | undefined) => {
    if (!old?.metadata) return next;
    const hidden = Object.fromEntries(Object.entries(old.metadata).filter(([key]) => !metadataKeys.includes(key)));
    if (!Object.keys(hidden).length) return next;
    return { ...(next ?? old), metadata: { ...hidden, ...next?.metadata } };
  };
  const restoreCaption = (next: Caption): Caption => {
    const old = captions.get(next.caption_id);
    if (!old) return next;
    const hiddenStyle = Object.fromEntries(Object.entries(old.style ?? {}).filter(([key]) => !styleKeys.includes(key)));
    const semantic = restoreSidecar(next.semantic_sidecar, old.semantic_sidecar);
    return { ...next, ...(Object.keys(hiddenStyle).length ? { style: { ...hiddenStyle, ...next.style } } : {}), ...(semantic ? { semantic_sidecar: semantic } : {}) };
  };
  const restoreClip = (next: Clip): Clip => {
    const old = clips.get(next.clip_id);
    if (!old) return next;
    const semantic = restoreSidecar(next.semantic_sidecar, old.semantic_sidecar);
    return { ...next, ...(next.grade && old.grade?.grade_id === next.grade.grade_id && old.grade.lut_sha256 === next.grade.lut_sha256 && old.grade.lut_path ? { grade: { ...next.grade, lut_path: old.grade.lut_path } } : {}), ...(semantic ? { semantic_sidecar: semantic } : {}) };
  };
  const restoreTrack = (next: Track): Track => {
    const old = base.tracks.find(item => item.track_id === next.track_id);
    const semantic = restoreSidecar(next.semantic_sidecar, old?.semantic_sidecar);
    return { ...next, clips: next.clips.map(restoreClip), ...(next.captions ? { captions: next.captions.map(restoreCaption) } : {}), ...(semantic ? { semantic_sidecar: semantic } : {}) };
  };
  return (resolveProjected(commands, refs) as TimelineCommand[]).map(command => {
    switch (command.type) {
      case "restore_track": case "add_track": return { ...command, track: restoreTrack(command.track) };
      case "replace_clip": case "add_clip": return { ...command, clip: restoreClip(command.clip) };
      case "set_track_properties": {
        const old = base.tracks.find(item => item.track_id === command.track_id);
        const semantic = command.properties.semantic_sidecar ? restoreSidecar(command.properties.semantic_sidecar, old?.semantic_sidecar) : undefined;
        return { ...command, properties: { ...command.properties, ...(command.properties.captions ? { captions: command.properties.captions.map(restoreCaption) } : {}), ...(semantic ? { semantic_sidecar: semantic } : {}) } };
      }
      case "restore_timeline": throw new Error("CREATION_PROJECTED_RESTORE_REQUIRES_DRAFT");
      default: return command;
    }
  });
}
