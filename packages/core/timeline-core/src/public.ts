import type { AssetId, SourceRange } from "../../media-identity/src/public.js";
import type { RationalTime } from "../../timebase/src/public.js";
import { validateAutomationCurve, type AutomationCurve } from "./automation.js";
import { validateTimeMap, type TimeMap } from "./time-map.js";
export { mapTimelineToSource, validateTimeMap, type TimeMap, type TimeMapMode, type TimeMapSegment } from "./time-map.js";
import { validateGrade, type Grade } from "./color.js";
export { validateGrade, type ColorContext, type Grade } from "./color.js";
import { validateMask, type Mask } from "./mask.js";
export { validateMask, type Mask, type MaskShape, type TrackingSample } from "./mask.js";
export { evaluateAutomationCurve, validateAutomationCurve, type AutomationCurve, type AutomationKeyframe, type AutomationValue, type Interpolation, type Tangent } from "./automation.js";

export type Speed = Readonly<{ numerator: bigint; denominator: bigint }>;
export type Transform = Readonly<{ x?: number; y?: number; scale_x?: number; scale_y?: number; rotation?: number; anchor_x?: number; anchor_y?: number; opacity?: number; flip_x?: boolean; flip_y?: boolean; crop_left?: number; crop_top?: number; crop_right?: number; crop_bottom?: number; fit?: "fit" | "fill" | "stretch" | "original" }>;
export type BlendMode = "normal" | "multiply" | "screen" | "overlay" | "add" | "subtract" | "difference" | "darken" | "lighten" | "color_dodge" | "color_burn";
export type ClipKind = "media" | "image" | "graphic" | "text" | "generator" | "adjustment" | "compound" | "nested";
export type SemanticSidecar = Readonly<{ semantic_id: string; labels: readonly string[]; evidence_refs: readonly string[]; metadata?: Readonly<Record<string, string>> }>;
export type Gap = Readonly<{ gap_id: string; timeline_start: bigint; timeline_duration: bigint }>;
export type WordTiming = Readonly<{ text: string; timeline_start: bigint; timeline_duration: bigint }>;
export type Caption = Readonly<{ caption_id: string; text: string; timeline_start: bigint; timeline_duration: bigint; language?: string; words?: readonly WordTiming[]; style?: Readonly<Record<string, string | number | boolean>>; semantic_sidecar?: SemanticSidecar }>;
export type Effect = Readonly<{ effect_id: string; clip_id: string; kind: string; parameters?: Readonly<Record<string, string | number | boolean>>; enabled?: boolean }>;
export type Keyframe = Readonly<{ keyframe_id: string; target_id: string; property: string; time: bigint; value: string | number | boolean }>;
export type Transition = Readonly<{ transition_id: string; kind: string; from_clip_id: string; to_clip_id: string; timeline_start: bigint; timeline_duration: bigint; parameters?: Readonly<Record<string, string | number | boolean>> }>;
export type AudioRouting = Readonly<{ routing_id: string; source_clip_id: string; bus: string; gain_db?: number; muted?: boolean }>;
export type TimelineLock = Readonly<{ lock_id: string; start: bigint; end: bigint; owner: string }>;

export type Clip = Readonly<{ clip_id: string; source: SourceRange; timeline_start: bigint; timeline_duration: bigint; media_kind?: "video" | "audio"; kind?: ClipKind; speed?: Speed; time_map?: TimeMap; transform?: Transform; grade?: Grade; mask?: Mask; gain_db?: number; effects?: readonly Effect[]; keyframes?: readonly Keyframe[]; automation_curves?: readonly AutomationCurve[]; compound_clip_ids?: readonly string[]; nested_sequence_id?: string; link_group_id?: string; semantic_sidecar?: SemanticSidecar }>;
export type Track = Readonly<{ track_id: string; kind: "video" | "audio"; clips: readonly Clip[]; z_index?: number; enabled?: boolean; locked?: boolean; muted?: boolean; solo?: boolean; opacity?: number; blend_mode?: BlendMode; gaps?: readonly Gap[]; transitions?: readonly Transition[]; captions?: readonly Caption[]; effects?: readonly Effect[]; keyframes?: readonly Keyframe[]; automation_curves?: readonly AutomationCurve[]; audio_routing?: readonly AudioRouting[]; locks?: readonly TimelineLock[]; semantic_sidecar?: SemanticSidecar }>;
export type VideoTrack = Track & Readonly<{ kind: "video" }>;
export type AudioTrack = Track & Readonly<{ kind: "audio" }>;
export type Sequence = Readonly<{ sequence_id: string; parent_sequence_id?: string; timebase?: RationalTime; duration?: RationalTime; tracks: readonly Track[]; semantic_sidecar?: SemanticSidecar }>;
export type Timeline = Readonly<{ version: number; tracks: readonly Track[]; sequence?: Sequence; sequences?: readonly Sequence[]; semantic_sidecar?: SemanticSidecar }>;

export type TimelineCommand =
  | Readonly<{ type: "add_track"; track: Track; index?: number }>
  | Readonly<{ type: "remove_track"; track_id: string }>
  | Readonly<{ type: "set_track_properties"; track_id: string; properties: Omit<Partial<Track>, "track_id" | "kind" | "clips"> }>
  | Readonly<{ type: "reorder_track"; track_id: string; index: number }>
  | Readonly<{ type: "add_sequence"; sequence: Sequence }>
  | Readonly<{ type: "remove_sequence"; sequence_id: string }>
  | Readonly<{ type: "set_automation_curve"; track_id: string; curve: AutomationCurve }>
  | Readonly<{ type: "clear_automation_curve"; track_id: string; curve_id: string }>
  | Readonly<{ type: "restore_timeline"; timeline: Timeline }>
  | Readonly<{ type: "add_clip"; track_id: string; clip: Clip }>
  | Readonly<{ type: "remove_clip"; track_id: string; clip_id: string }>
  | Readonly<{ type: "replace_clip"; track_id: string; clip_id: string; clip: Clip }>
  | Readonly<{ type: "move_clip"; track_id: string; clip_id: string; timeline_start: bigint }>
  | Readonly<{ type: "trim_source"; track_id: string; clip_id: string; source: SourceRange }>
  | Readonly<{ type: "roll_cut"; track_id: string; left_clip_id: string; right_clip_id: string; boundary: bigint }>
  | Readonly<{ type: "ripple_delete"; track_id: string; clip_id: string }>
  | Readonly<{ type: "slip_clip"; track_id: string; clip_id: string; source?: SourceRange; source_start_pts?: bigint; source_end_pts?: bigint }>
  | Readonly<{ type: "slide_clip"; track_id: string; clip_id: string; timeline_start: bigint }>
  | Readonly<{ type: "set_gain"; track_id: string; clip_id: string; gain_db: number }>
  | Readonly<{ type: "add_caption"; track_id: string; caption: Caption }>
  | Readonly<{ type: "add_transition"; track_id: string; transition: Transition }>
  | Readonly<{ type: "set_effect"; track_id: string; effect: Effect }>
  | Readonly<{ type: "set_keyframe"; track_id: string; keyframe: Keyframe }>
  | Readonly<{ type: "set_speed"; track_id: string; clip_id: string; speed: Speed }>
  | Readonly<{ type: "set_transform"; track_id: string; clip_id: string; transform: Transform }>
  | Readonly<{ type: "lock_range"; track_id: string; lock: TimelineLock }>
  | Readonly<{ type: "unlock_range"; track_id: string; lock_id: string }>
  | Readonly<{ type: "restore_track"; track_id: string; track: Track }>;

export type AffectedRange = Readonly<{ track_id: string; start: bigint; end: bigint }>;
export type CommitValidation = Readonly<{ ok: boolean; errors: readonly string[] }>;
export type CommitPlan = Readonly<{ base_version: number; commands: readonly TimelineCommand[]; affected_ranges: readonly AffectedRange[]; required_locks: readonly string[]; semantic_refs: readonly string[]; expected_final_version: number; validation: CommitValidation; plan_hash: string }>;
export type TimelineValidationCode = "MEDIA_REF" | "SOURCE_RANGE" | "OVERLAP" | "TRANSITION" | "LOCK" | "CAPTION" | "AUDIO_ROUTING" | "DUPLICATE_ID" | "VERSION" | "TRACK_COMPATIBILITY" | "SEQUENCE" | "CYCLE" | "COMPOUND" | "TIME_MAP" | "TIMEBASE" | "AUTOMATION" | "MASK" | "COLOR";
export type TimelineValidationIssue = Readonly<{ code: TimelineValidationCode; message: string; id?: string }>;

function locate(timeline: Timeline, trackId: string, clipId: string): [Track, number] { const track = timeline.tracks.find((candidate) => candidate.track_id === trackId); if (!track) throw new Error("track not found"); const index = track.clips.findIndex((clip) => clip.clip_id === clipId); if (index < 0) throw new Error("clip not found"); return [track, index]; }
function clipEnd(clip: Clip): bigint { return clip.timeline_start + clip.timeline_duration; }
function positiveRange(start: bigint, end: bigint, label: string): void { if (start < 0n || end <= start) throw new Error(`${label} range is invalid`); }
function validateCommandInput(command: TimelineCommand): void { if (command.type === "add_clip" || command.type === "replace_clip") { positiveRange(command.clip.source.start_pts, command.clip.source.end_pts, "source"); positiveRange(command.clip.timeline_start, command.clip.timeline_start + command.clip.timeline_duration, "timeline"); if (command.clip.speed && command.clip.time_map) throw new Error("TIME_MAP_SPEED_CONFLICT"); } if (command.type === "trim_source" || command.type === "slip_clip") { const source = command.type === "trim_source" ? command.source : command.source ?? (command.source_start_pts !== undefined && command.source_end_pts !== undefined ? { asset_id: "asset:sha256:" + "0".repeat(64) as AssetId, start_pts: command.source_start_pts, end_pts: command.source_end_pts, timescale: 1n } : undefined); if (source) positiveRange(source.start_pts, source.end_pts, "source"); else throw new Error("slip source range is required"); } if (command.type === "set_speed" && (command.speed.numerator <= 0n || command.speed.denominator <= 0n)) throw new Error("speed must be positive"); }
function replaceTrack(timeline: Timeline, track: Track): Timeline { const tracks = timeline.tracks.map((candidate) => candidate.track_id === track.track_id ? track : candidate); const sequence = timeline.sequence ? { ...timeline.sequence, tracks: timeline.sequence.tracks.map((candidate) => candidate.track_id === track.track_id ? track : candidate) } : undefined; return sequence ? { ...timeline, version: timeline.version + 1, tracks, sequence } : { ...timeline, version: timeline.version + 1, tracks }; }
function updateClip(track: Track, index: number, clip: Clip): Track { const clips = [...track.clips]; clips[index] = clip; return { ...track, clips }; }
function addUnique<T extends { [key: string]: unknown }>(items: readonly T[] | undefined, item: T, key: string): readonly T[] { const values = [...(items ?? [])]; if (values.some((value) => value[key] === item[key])) throw new Error(`duplicate ${key}`); values.push(item); return values; }

function applyCommandUnchecked(timeline: Timeline, command: TimelineCommand): Timeline {
  if (command.type === "restore_timeline") return { ...command.timeline, version: timeline.version + 1 };
  if (command.type === "add_track") {
    if (timeline.tracks.some((track) => track.track_id === command.track.track_id)) throw new Error("duplicate track");
    const index = command.index ?? timeline.tracks.length;
    if (!Number.isInteger(index) || index < 0 || index > timeline.tracks.length) throw new Error("track index is invalid");
    const tracks = [...timeline.tracks]; tracks.splice(index, 0, command.track);
    const sequence = timeline.sequence ? { ...timeline.sequence, tracks } : undefined;
    return sequence ? { ...timeline, version: timeline.version + 1, tracks, sequence } : { ...timeline, version: timeline.version + 1, tracks };
  }
  if (command.type === "remove_track") {
    const index = timeline.tracks.findIndex((track) => track.track_id === command.track_id);
    if (index < 0) throw new Error("track not found");
    const tracks = timeline.tracks.filter((track) => track.track_id !== command.track_id);
    const sequence = timeline.sequence ? { ...timeline.sequence, tracks } : undefined;
    return sequence ? { ...timeline, version: timeline.version + 1, tracks, sequence } : { ...timeline, version: timeline.version + 1, tracks };
  }
  if (command.type === "set_track_properties") {
    const track = timeline.tracks.find((candidate) => candidate.track_id === command.track_id);
    if (!track) throw new Error("track not found");
    return replaceTrack(timeline, { ...track, ...command.properties });
  }
  if (command.type === "reorder_track") {
    const from = timeline.tracks.findIndex((track) => track.track_id === command.track_id);
    if (from < 0) throw new Error("track not found");
    if (!Number.isInteger(command.index) || command.index < 0 || command.index >= timeline.tracks.length) throw new Error("track index is invalid");
    const tracks = [...timeline.tracks]; const [track] = tracks.splice(from, 1); tracks.splice(command.index, 0, track);
    const sequence = timeline.sequence ? { ...timeline.sequence, tracks } : undefined;
    return sequence ? { ...timeline, version: timeline.version + 1, tracks, sequence } : { ...timeline, version: timeline.version + 1, tracks };
  }
  if (command.type === "add_sequence") {
    const sequences = [...(timeline.sequences ?? [])];
    if (!command.sequence.sequence_id || sequences.some((sequence) => sequence.sequence_id === command.sequence.sequence_id) || timeline.sequence?.sequence_id === command.sequence.sequence_id) throw new Error("duplicate sequence");
    if (command.sequence.parent_sequence_id && !sequences.some((sequence) => sequence.sequence_id === command.sequence.parent_sequence_id) && timeline.sequence?.sequence_id !== command.sequence.parent_sequence_id) throw new Error("sequence parent not found");
    return { ...timeline, version: timeline.version + 1, sequences: [...sequences, command.sequence] };
  }
  if (command.type === "remove_sequence") {
    const sequences = timeline.sequences ?? [];
    if (!sequences.some((sequence) => sequence.sequence_id === command.sequence_id)) throw new Error("sequence not found");
    if (timeline.tracks.some((track) => track.clips.some((clip) => clip.nested_sequence_id === command.sequence_id)) || sequences.some((sequence) => sequence.parent_sequence_id === command.sequence_id || sequence.tracks.some((track) => track.clips.some((clip) => clip.nested_sequence_id === command.sequence_id)))) throw new Error("sequence is still referenced");
    return { ...timeline, version: timeline.version + 1, sequences: sequences.filter((sequence) => sequence.sequence_id !== command.sequence_id) };
  }
  if (command.type === "set_automation_curve") {
    const track = timeline.tracks.find((candidate) => candidate.track_id === command.track_id); if (!track) throw new Error("track not found");
    const errors = validateAutomationCurve(command.curve); if (errors.length) throw new Error(`AUTOMATION_CURVE_INVALID:${errors.join(",")}`);
    if (command.curve.target_id !== track.track_id && !track.clips.some((clip) => clip.clip_id === command.curve.target_id)) throw new Error("automation target not found");
    return replaceTrack(timeline, { ...track, automation_curves: [...(track.automation_curves ?? []).filter((curve) => curve.curve_id !== command.curve.curve_id), command.curve] });
  }
  if (command.type === "clear_automation_curve") {
    const track = timeline.tracks.find((candidate) => candidate.track_id === command.track_id); if (!track) throw new Error("track not found"); if (!(track.automation_curves ?? []).some((curve) => curve.curve_id === command.curve_id)) throw new Error("automation curve not found");
    return replaceTrack(timeline, { ...track, automation_curves: (track.automation_curves ?? []).filter((curve) => curve.curve_id !== command.curve_id) });
  }
  validateCommandInput(command);
  if (command.type === "restore_track") return replaceTrack(timeline, command.track);
  const [track, index] = command.type === "add_clip" || command.type === "add_caption" || command.type === "add_transition" || command.type === "set_effect" || command.type === "set_keyframe" || command.type === "lock_range" || command.type === "unlock_range" || command.type === "roll_cut" ? [timeline.tracks.find((candidate) => candidate.track_id === command.track_id), -1] as const : locate(timeline, command.track_id, "clip_id" in command ? command.clip_id : "");
  if (!track) throw new Error("track not found");
  if (command.type === "add_clip") { if (track.clips.some((clip) => clip.clip_id === command.clip.clip_id)) throw new Error("duplicate clip"); return replaceTrack(timeline, { ...track, clips: [...track.clips, command.clip] }); }
  if (command.type === "remove_clip") { const clips = [...track.clips]; clips.splice(index, 1); return replaceTrack(timeline, { ...track, clips }); }
  if (command.type === "replace_clip") { if (command.clip.clip_id !== command.clip_id && timeline.tracks.some((candidate) => candidate.clips.some((clip) => clip.clip_id === command.clip.clip_id))) throw new Error("duplicate clip"); return replaceTrack(timeline, updateClip(track, index, command.clip)); }
  if (command.type === "move_clip" || command.type === "slide_clip") { if (command.timeline_start < 0n) throw new Error("timeline start must not be negative"); return replaceTrack(timeline, updateClip(track, index, { ...track.clips[index], timeline_start: command.timeline_start })); }
  if (command.type === "trim_source") return replaceTrack(timeline, updateClip(track, index, { ...track.clips[index], source: command.source, timeline_duration: command.source.end_pts - command.source.start_pts }));
  if (command.type === "slip_clip") { const old = track.clips[index]; const source = command.source ?? { ...old.source, start_pts: command.source_start_pts!, end_pts: command.source_end_pts! }; if (source.end_pts - source.start_pts !== old.source.end_pts - old.source.start_pts) throw new Error("slip must preserve source duration"); return replaceTrack(timeline, updateClip(track, index, { ...old, source })); }
  if (command.type === "roll_cut") { const leftIndex = track.clips.findIndex((clip) => clip.clip_id === command.left_clip_id); const rightIndex = track.clips.findIndex((clip) => clip.clip_id === command.right_clip_id); if (leftIndex < 0 || rightIndex < 0 || leftIndex === rightIndex) throw new Error("roll clips not found"); const left = track.clips[leftIndex]; const right = track.clips[rightIndex]; positiveRange(left.timeline_start, command.boundary, "left roll"); positiveRange(command.boundary, clipEnd(right), "right roll"); const clips = [...track.clips]; clips[leftIndex] = { ...left, timeline_duration: command.boundary - left.timeline_start }; clips[rightIndex] = { ...right, timeline_start: command.boundary, timeline_duration: clipEnd(right) - command.boundary }; return replaceTrack(timeline, { ...track, clips }); }
  if (command.type === "ripple_delete") { const removed = track.clips[index]; const end = clipEnd(removed); const clips = track.clips.filter((_, candidateIndex) => candidateIndex !== index).map((clip) => clip.timeline_start >= end ? { ...clip, timeline_start: clip.timeline_start - removed.timeline_duration } : clip); return replaceTrack(timeline, { ...track, clips }); }
  if (command.type === "set_gain") return replaceTrack(timeline, updateClip(track, index, { ...track.clips[index], gain_db: command.gain_db }));
  if (command.type === "set_speed") { if (track.clips[index].time_map) throw new Error("TIME_MAP_SPEED_CONFLICT"); return replaceTrack(timeline, updateClip(track, index, { ...track.clips[index], speed: command.speed })); }
  if (command.type === "set_transform") return replaceTrack(timeline, updateClip(track, index, { ...track.clips[index], transform: command.transform }));
  if (command.type === "add_caption") return replaceTrack(timeline, { ...track, captions: addUnique(track.captions, command.caption, "caption_id") });
  if (command.type === "add_transition") return replaceTrack(timeline, { ...track, transitions: addUnique(track.transitions, command.transition, "transition_id") });
  if (command.type === "set_effect") return replaceTrack(timeline, { ...track, effects: [...(track.effects ?? []).filter((effect) => effect.effect_id !== command.effect.effect_id), command.effect] });
  if (command.type === "set_keyframe") return replaceTrack(timeline, { ...track, keyframes: [...(track.keyframes ?? []).filter((keyframe) => keyframe.keyframe_id !== command.keyframe.keyframe_id), command.keyframe] });
  if (command.type === "lock_range") return replaceTrack(timeline, { ...track, locks: addUnique(track.locks, command.lock, "lock_id") });
  const locks = track.locks ?? []; if (!locks.some((lock) => lock.lock_id === command.lock_id)) throw new Error("lock not found"); return replaceTrack(timeline, { ...track, locks: locks.filter((lock) => lock.lock_id !== command.lock_id) });
}

export function applyCommand(timeline: Timeline, command: TimelineCommand): Timeline { const next = applyCommandUnchecked(timeline, command); assertValidTimeline(next); return next; }

export function inverseCommand(before: Timeline, command: TimelineCommand): TimelineCommand {
  if (command.type === "restore_timeline") return { type: "restore_timeline", timeline: before };
  if (command.type === "add_track" || command.type === "remove_track" || command.type === "set_track_properties" || command.type === "reorder_track" || command.type === "add_sequence" || command.type === "remove_sequence" || command.type === "set_automation_curve" || command.type === "clear_automation_curve") return { type: "restore_timeline", timeline: before };
  const trackId = command.track_id; const track = before.tracks.find((candidate) => candidate.track_id === trackId); if (!track) throw new Error("track not found"); if (command.type === "add_clip") return { type: "remove_clip", track_id: trackId, clip_id: command.clip.clip_id }; if (command.type === "remove_clip") return { type: "add_clip", track_id: trackId, clip: track.clips.find((clip) => clip.clip_id === command.clip_id)! }; if (command.type === "move_clip" || command.type === "slide_clip") { const clip = track.clips.find((candidate) => candidate.clip_id === command.clip_id)!; return { type: "move_clip", track_id: trackId, clip_id: command.clip_id, timeline_start: clip.timeline_start }; } if (command.type === "trim_source") { const clip = track.clips.find((candidate) => candidate.clip_id === command.clip_id)!; return { type: "trim_source", track_id: trackId, clip_id: command.clip_id, source: clip.source }; } return { type: "restore_track", track_id: trackId, track };
}

export function validateTimelineDetailed(timeline: Timeline): readonly TimelineValidationIssue[] {
  const issues: TimelineValidationIssue[] = [];
  if (!Number.isInteger(timeline.version) || timeline.version < 0) issues.push({ code: "VERSION", message: "timeline version must be a non-negative integer" });
  const ids = new Set<string>();
  const addId = (id: string, kind: string): void => { if (!id || ids.has(id)) issues.push({ code: "DUPLICATE_ID", id, message: `duplicate or empty ${kind} id: ${id}` }); ids.add(id); };
  const validAsset = (asset: string): boolean => /^asset:sha256:[0-9a-f]{64}$/.test(asset);
  const sequences = timeline.sequences ?? [];
  const sequenceById = new Map(sequences.map((sequence) => [sequence.sequence_id, sequence]));
  if (timeline.sequence) sequenceById.set(timeline.sequence.sequence_id, timeline.sequence);
  for (const sequence of sequenceById.values()) { addId(sequence.sequence_id, "sequence"); if (sequence.parent_sequence_id && !sequenceById.has(sequence.parent_sequence_id)) issues.push({ code: "SEQUENCE", id: sequence.sequence_id, message: `sequence parent not found: ${sequence.parent_sequence_id}` }); if (sequence.timebase && (sequence.timebase.value <= 0n || sequence.timebase.timescale <= 0n)) issues.push({ code: "TIMEBASE", id: sequence.sequence_id, message: "sequence timebase value and timescale must be positive" }); }

  const sequenceEdges = new Map<string, string[]>();
  for (const sequence of sequenceById.values()) {
    const edges = sequence.parent_sequence_id ? [sequence.parent_sequence_id] : [];
    const tracks = timeline.sequence?.sequence_id === sequence.sequence_id && sequence.tracks.length === 0 ? timeline.tracks : sequence.tracks;
    for (const track of tracks) for (const clip of track.clips) if (clip.nested_sequence_id) edges.push(clip.nested_sequence_id);
    sequenceEdges.set(sequence.sequence_id, edges);
  }
  const sequenceVisit = new Set<string>(), sequenceActive = new Set<string>();
  const visitSequence = (id: string): void => { if (sequenceActive.has(id)) { issues.push({ code: "CYCLE", id, message: `sequence cycle: ${id}` }); return; } if (sequenceVisit.has(id)) return; sequenceActive.add(id); for (const next of sequenceEdges.get(id) ?? []) if (sequenceById.has(next)) visitSequence(next); sequenceActive.delete(id); sequenceVisit.add(id); };
  for (const id of sequenceById.keys()) visitSequence(id);

  const allTracks = [...timeline.tracks, ...sequences.flatMap((sequence) => sequence.tracks)];
  for (const track of allTracks) {
    addId(track.track_id, "track");
    if (track.z_index !== undefined && !Number.isInteger(track.z_index)) issues.push({ code: "TRACK_COMPATIBILITY", id: track.track_id, message: "track z_index must be an integer" });
    if (track.opacity !== undefined && (!Number.isFinite(track.opacity) || track.opacity < 0 || track.opacity > 1)) issues.push({ code: "TRACK_COMPATIBILITY", id: track.track_id, message: "track opacity must be in [0, 1]" });
    for (const key of ["enabled", "locked", "muted", "solo"] as const) if (track[key] !== undefined && typeof track[key] !== "boolean") issues.push({ code: "TRACK_COMPATIBILITY", id: track.track_id, message: `${key} must be boolean` });
    const clipIds = new Set(track.clips.map((clip) => clip.clip_id));
    const sortedClips = [...track.clips].sort((left, right) => left.timeline_start < right.timeline_start ? -1 : left.timeline_start > right.timeline_start ? 1 : 0);
    const clipEnds: Array<{ clip: Clip; end: bigint }> = [];
    for (const clip of track.clips) {
      addId(clip.clip_id, "clip");
      if (!validAsset(clip.source.asset_id)) issues.push({ code: "MEDIA_REF", id: clip.clip_id, message: `invalid media ref: ${clip.source.asset_id}` });
      if (clip.source.timescale <= 0n || clip.source.start_pts < 0n || clip.source.end_pts <= clip.source.start_pts) issues.push({ code: "SOURCE_RANGE", id: clip.clip_id, message: `invalid source range: ${clip.clip_id}` });
      if (clip.timeline_start < 0n || clip.timeline_duration <= 0n) issues.push({ code: "SOURCE_RANGE", id: clip.clip_id, message: `invalid timeline range: ${clip.clip_id}` });
      if (clip.media_kind && clip.media_kind !== track.kind) issues.push({ code: "TRACK_COMPATIBILITY", id: clip.clip_id, message: `clip media kind does not match ${track.kind} track` });
      if (clip.speed && clip.time_map) issues.push({ code: "TIME_MAP", id: clip.clip_id, message: "TIME_MAP_SPEED_CONFLICT" });
      if (clip.time_map) {
        const errors = validateTimeMap(clip.time_map); for (const message of errors) issues.push({ code: "TIME_MAP", id: clip.clip_id, message });
        if (clip.time_map.segments[0]?.timeline_start !== 0n || clip.time_map.segments.at(-1)?.timeline_end !== clip.timeline_duration) issues.push({ code: "TIME_MAP", id: clip.clip_id, message: "time map must cover the complete clip-local timeline range" });
        for (const segment of clip.time_map.segments) if (segment.source_start < clip.source.start_pts || segment.source_end > clip.source.end_pts) issues.push({ code: "TIME_MAP", id: clip.clip_id, message: "time map source range exceeds clip source" });
      }
      if (clip.kind === "nested" && (!clip.nested_sequence_id || !sequenceById.has(clip.nested_sequence_id))) issues.push({ code: "SEQUENCE", id: clip.clip_id, message: "nested clip requires an existing sequence" });
      if (clip.kind === "compound" && (!clip.compound_clip_ids?.length || clip.compound_clip_ids.includes(clip.clip_id) || clip.compound_clip_ids.some((id) => !clipIds.has(id)))) issues.push({ code: "COMPOUND", id: clip.clip_id, message: "compound clip needs existing, non-self children in the same sequence track" });
      if (clip.grade) { addId(clip.grade.grade_id, "grade"); for (const message of validateGrade(clip.grade)) issues.push({ code: "COLOR", id: clip.grade.grade_id, message }); }
      if (clip.mask) { addId(clip.mask.mask_id, "mask"); for (const message of validateMask(clip.mask)) issues.push({ code: "MASK", id: clip.mask.mask_id, message }); }
      for (const effect of clip.effects ?? []) { addId(effect.effect_id, "effect"); if (effect.clip_id !== clip.clip_id) issues.push({ code: "TRACK_COMPATIBILITY", id: effect.effect_id, message: "clip effect target mismatch" }); }
      for (const keyframe of clip.keyframes ?? []) { addId(keyframe.keyframe_id, "keyframe"); if (keyframe.target_id !== clip.clip_id || keyframe.time < 0n || keyframe.time > clip.timeline_duration) issues.push({ code: "SOURCE_RANGE", id: keyframe.keyframe_id, message: "invalid clip keyframe" }); }
      for (const curve of clip.automation_curves ?? []) { addId(curve.curve_id, "automation curve"); for (const message of validateAutomationCurve(curve)) issues.push({ code: "AUTOMATION", id: curve.curve_id, message }); if (curve.target_id !== clip.clip_id) issues.push({ code: "AUTOMATION", id: curve.curve_id, message: "clip automation target mismatch" }); }
      const end = clipEnd(clip); for (const prior of clipEnds) if (clip.timeline_start < prior.end && prior.clip.timeline_start < end) issues.push({ code: "OVERLAP", id: clip.clip_id, message: `clips overlap: ${prior.clip.clip_id}, ${clip.clip_id}` }); clipEnds.push({ clip, end });
    }
    for (const gap of track.gaps ?? []) { addId(gap.gap_id, "gap"); if (gap.timeline_start < 0n || gap.timeline_duration <= 0n) issues.push({ code: "SOURCE_RANGE", id: gap.gap_id, message: `invalid gap range: ${gap.gap_id}` }); }
    for (const caption of track.captions ?? []) { addId(caption.caption_id, "caption"); if (!caption.text.trim() || caption.timeline_start < 0n || caption.timeline_duration <= 0n) issues.push({ code: "CAPTION", id: caption.caption_id, message: `invalid caption: ${caption.caption_id}` }); if (track.kind !== "video") issues.push({ code: "TRACK_COMPATIBILITY", id: caption.caption_id, message: "caption must be on video track" }); }
    for (const transition of track.transitions ?? []) {
      addId(transition.transition_id, "transition"); const fromIndex = sortedClips.findIndex((clip) => clip.clip_id === transition.from_clip_id), toIndex = sortedClips.findIndex((clip) => clip.clip_id === transition.to_clip_id); const from = sortedClips[fromIndex], to = sortedClips[toIndex];
      if (!from || !to || fromIndex + 1 !== toIndex || transition.timeline_duration <= 0n || transition.timeline_duration >= from.timeline_duration || transition.timeline_duration >= to.timeline_duration || to.timeline_start !== clipEnd(from) || transition.timeline_start !== clipEnd(from) - transition.timeline_duration) issues.push({ code: "TRANSITION", id: transition.transition_id, message: `invalid transition adjacency, range, or handles: ${transition.transition_id}` });
    }
    for (const effect of track.effects ?? []) { addId(effect.effect_id, "effect"); if (!clipIds.has(effect.clip_id)) issues.push({ code: "TRACK_COMPATIBILITY", id: effect.effect_id, message: `effect clip not found: ${effect.clip_id}` }); }
    for (const keyframe of track.keyframes ?? []) { addId(keyframe.keyframe_id, "keyframe"); if (keyframe.time < 0n || !clipIds.has(keyframe.target_id)) issues.push({ code: "SOURCE_RANGE", id: keyframe.keyframe_id, message: `invalid keyframe: ${keyframe.keyframe_id}` }); }
    for (const curve of track.automation_curves ?? []) { addId(curve.curve_id, "automation curve"); for (const message of validateAutomationCurve(curve)) issues.push({ code: "AUTOMATION", id: curve.curve_id, message }); if (curve.target_id !== track.track_id && !clipIds.has(curve.target_id)) issues.push({ code: "AUTOMATION", id: curve.curve_id, message: "automation target not found" }); }
    for (const routing of track.audio_routing ?? []) { addId(routing.routing_id, "routing"); if (track.kind !== "audio" || !clipIds.has(routing.source_clip_id) || routing.gain_db !== undefined && !Number.isFinite(routing.gain_db)) issues.push({ code: "AUDIO_ROUTING", id: routing.routing_id, message: `invalid audio routing: ${routing.routing_id}` }); }
    for (const lock of track.locks ?? []) { addId(lock.lock_id, "lock"); if (lock.start < 0n || lock.end <= lock.start || !lock.owner) issues.push({ code: "LOCK", id: lock.lock_id, message: `invalid lock: ${lock.lock_id}` }); }
  }
  return issues;
}
export function validateTimeline(timeline: Timeline): CommitValidation { const issues = validateTimelineDetailed(timeline); return { ok: issues.length === 0, errors: issues.map((issue) => `${issue.code}: ${issue.message}`) }; }
export function assertValidTimeline(timeline: Timeline): void { const result = validateTimeline(timeline); if (!result.ok) throw new Error(`timeline validation failed: ${result.errors.join(", ")}`); }
export function simulateCommands(base: Timeline, commands: readonly TimelineCommand[], expectedFinalVersion = base.version + 1): Timeline { let current = base; for (const command of commands) current = applyCommand(current, command); const finalTimeline = { ...current, version: expectedFinalVersion }; assertValidTimeline(finalTimeline); return finalTimeline; }

export { commitPlanPayload, createCommitPlan } from "./commit-plan.js";
