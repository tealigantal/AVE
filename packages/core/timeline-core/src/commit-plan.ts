import type { AffectedRange, Clip, CommitPlan, Sequence, Timeline, TimelineCommand, Track } from "./public.js";
import { applyCommand, simulateCommands } from "./public.js";

export type CommitPlanMetadata = Readonly<{ affected_ranges?: readonly AffectedRange[]; required_locks?: readonly string[]; semantic_refs?: readonly string[] }>;
export function commitPlanPayload(plan: Omit<CommitPlan, "plan_hash">): string { const { plan_hash: _ignored, ...payload } = plan as CommitPlan; return JSON.stringify(payload, (_, value) => typeof value === "bigint" ? `${value}n` : value); }
const clipRange = (trackId: string, clip: Clip): AffectedRange => ({ track_id: trackId, start: clip.timeline_start, end: clip.timeline_start + clip.timeline_duration });
function trackExtent(track: Track): AffectedRange {
  const spans = [
    ...track.clips.map((clip) => [clip.timeline_start, clip.timeline_start + clip.timeline_duration] as const),
    ...(track.gaps ?? []).map((gap) => [gap.timeline_start, gap.timeline_start + gap.timeline_duration] as const),
    ...(track.captions ?? []).map((caption) => [caption.timeline_start, caption.timeline_start + caption.timeline_duration] as const),
    ...(track.transitions ?? []).map((transition) => [transition.timeline_start, transition.timeline_start + transition.timeline_duration] as const),
    ...(track.locks ?? []).map((lock) => [lock.start, lock.end] as const)
  ];
  return spans.length ? { track_id: track.track_id, start: spans.reduce((minimum, span) => span[0] < minimum ? span[0] : minimum, spans[0][0]), end: spans.reduce((maximum, span) => span[1] > maximum ? span[1] : maximum, spans[0][1]) } : { track_id: track.track_id, start: 0n, end: 0n };
}
const findTrack = (timeline: Timeline, trackId: string): Track | undefined => timeline.tracks.find((track) => track.track_id === trackId);
const findClip = (timeline: Timeline, trackId: string, clipId: string): Clip | undefined => findTrack(timeline, trackId)?.clips.find((clip) => clip.clip_id === clipId);
const findSequence = (timeline: Timeline, sequenceId: string): Sequence | undefined => timeline.sequence?.sequence_id === sequenceId ? timeline.sequence : timeline.sequences?.find((sequence) => sequence.sequence_id === sequenceId);
function mergeRanges(ranges: readonly AffectedRange[]): readonly AffectedRange[] {
  const byTrack = new Map<string, AffectedRange[]>(); for (const range of ranges) byTrack.set(range.track_id, [...(byTrack.get(range.track_id) ?? []), range]);
  return [...byTrack.entries()].flatMap(([trackId, values]) => {
    const sorted = [...values].sort((left, right) => left.start < right.start ? -1 : left.start > right.start ? 1 : 0); const merged: AffectedRange[] = [];
    for (const value of sorted) { const previous = merged.at(-1); if (previous && value.start <= previous.end) merged[merged.length - 1] = { track_id: trackId, start: previous.start, end: value.end > previous.end ? value.end : previous.end }; else merged.push(value); }
    return merged;
  });
}
function commandRanges(before: Timeline, after: Timeline, command: TimelineCommand): readonly AffectedRange[] {
  if (command.type === "restore_timeline") return [...before.tracks.map(trackExtent), ...after.tracks.map(trackExtent)];
  if (command.type === "add_track") return [trackExtent(command.track)];
  if (command.type === "remove_track") { const track = findTrack(before, command.track_id); return track ? [trackExtent(track)] : []; }
  if (command.type === "add_sequence" || command.type === "remove_sequence") { const sequence = command.type === "add_sequence" ? command.sequence : findSequence(before, command.sequence_id); return sequence?.tracks.map(trackExtent) ?? []; }
  const trackId = command.track_id;
  const beforeTrack = findTrack(before, trackId), afterTrack = findTrack(after, trackId);
  if (command.type === "reorder_track" || command.type === "set_track_properties" || command.type === "restore_track") return [...(beforeTrack ? [trackExtent(beforeTrack)] : []), ...(afterTrack ? [trackExtent(afterTrack)] : [])];
  if (command.type === "add_clip") return [clipRange(trackId, command.clip)];
  if (command.type === "remove_clip") { const clip = findClip(before, trackId, command.clip_id); return clip ? [clipRange(trackId, clip)] : []; }
  if (command.type === "replace_clip") { const old = findClip(before, trackId, command.clip_id); return [...(old ? [clipRange(trackId, old)] : []), clipRange(trackId, command.clip)]; }
  if (["move_clip", "slide_clip", "trim_source", "slip_clip", "set_gain", "set_speed", "set_transform"].includes(command.type)) { const clipId = "clip_id" in command ? command.clip_id : ""; const old = findClip(before, trackId, clipId), next = findClip(after, trackId, clipId); return [...(old ? [clipRange(trackId, old)] : []), ...(next ? [clipRange(trackId, next)] : [])]; }
  if (command.type === "roll_cut") { const ids = [command.left_clip_id, command.right_clip_id]; return ids.flatMap((id) => { const old = findClip(before, trackId, id), next = findClip(after, trackId, id); return [...(old ? [clipRange(trackId, old)] : []), ...(next ? [clipRange(trackId, next)] : [])]; }); }
  if (command.type === "ripple_delete") { const removed = findClip(before, trackId, command.clip_id); if (!removed || !beforeTrack) return []; const extent = trackExtent(beforeTrack); return [{ track_id: trackId, start: removed.timeline_start, end: extent.end }]; }
  if (command.type === "add_caption") return [{ track_id: trackId, start: command.caption.timeline_start, end: command.caption.timeline_start + command.caption.timeline_duration }];
  if (command.type === "add_transition") return [{ track_id: trackId, start: command.transition.timeline_start, end: command.transition.timeline_start + command.transition.timeline_duration }];
  if (command.type === "lock_range") return [{ track_id: trackId, start: command.lock.start, end: command.lock.end }];
  if (command.type === "unlock_range") { const lock = beforeTrack?.locks?.find((candidate) => candidate.lock_id === command.lock_id); return lock ? [{ track_id: trackId, start: lock.start, end: lock.end }] : []; }
  if (command.type === "set_effect") { const clip = findClip(after, trackId, command.effect.clip_id); return clip ? [clipRange(trackId, clip)] : []; }
  if (command.type === "set_keyframe") { const clip = findClip(after, trackId, command.keyframe.target_id); return clip ? [clipRange(trackId, clip)] : []; }
  if (command.type === "set_automation_curve") { const clip = findClip(after, trackId, command.curve.target_id); return clip ? [clipRange(trackId, clip)] : afterTrack ? [trackExtent(afterTrack)] : []; }
  if (command.type === "clear_automation_curve") { const curve = beforeTrack?.automation_curves?.find((candidate) => candidate.curve_id === command.curve_id); const clip = curve ? findClip(before, trackId, curve.target_id) : undefined; return clip ? [clipRange(trackId, clip)] : beforeTrack ? [trackExtent(beforeTrack)] : []; }
  return [];
}
function rangesFor(base: Timeline, commands: readonly TimelineCommand[]): readonly AffectedRange[] { let current = base; const ranges: AffectedRange[] = []; for (const command of commands) { const next = applyCommand(current, command); ranges.push(...commandRanges(current, next, command)); current = next; } return mergeRanges(ranges); }
export function createCommitPlan(base: Timeline, commands: readonly TimelineCommand[], metadata: CommitPlanMetadata = {}, planHash = "unhashed"): { plan: CommitPlan; timeline: Timeline } { const timeline = simulateCommands(base, commands, base.version + 1); return { plan: { base_version: base.version, commands: [...commands], affected_ranges: metadata.affected_ranges ?? rangesFor(base, commands), required_locks: metadata.required_locks ?? [], semantic_refs: metadata.semantic_refs ?? [], expected_final_version: timeline.version, validation: { ok: true, errors: [] }, plan_hash: planHash }, timeline }; }
