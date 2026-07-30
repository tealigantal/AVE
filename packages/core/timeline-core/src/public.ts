import { SourceRange } from "../../media-identity/src/public.js";

export type Clip = Readonly<{ clip_id: string; source: SourceRange; timeline_start: bigint; timeline_duration: bigint }>;
export type Track = Readonly<{ track_id: string; kind: "video" | "audio"; clips: readonly Clip[] }>;
export type Timeline = Readonly<{ version: number; tracks: readonly Track[] }>;
export type TimelineCommand =
  | Readonly<{ type: "add_clip"; track_id: string; clip: Clip }>
  | Readonly<{ type: "remove_clip"; track_id: string; clip_id: string }>
  | Readonly<{ type: "move_clip"; track_id: string; clip_id: string; timeline_start: bigint }>
  | Readonly<{ type: "trim_source"; track_id: string; clip_id: string; source: SourceRange }>;

function locate(timeline: Timeline, trackId: string, clipId: string): [Track, number] { const track = timeline.tracks.find((candidate) => candidate.track_id === trackId); if (!track) throw new Error("track not found"); const index = track.clips.findIndex((clip) => clip.clip_id === clipId); if (index < 0) throw new Error("clip not found"); return [track, index]; }
function replaceTrack(timeline: Timeline, track: Track): Timeline { return { version: timeline.version + 1, tracks: timeline.tracks.map((candidate) => candidate.track_id === track.track_id ? track : candidate) }; }
export function applyCommand(timeline: Timeline, command: TimelineCommand): Timeline {
  const track = timeline.tracks.find((candidate) => candidate.track_id === command.track_id); if (!track) throw new Error("track not found");
  if (command.type === "add_clip") { if (track.clips.some((clip) => clip.clip_id === command.clip.clip_id)) throw new Error("duplicate clip"); return replaceTrack(timeline, { ...track, clips: [...track.clips, command.clip] }); }
  const [, index] = locate(timeline, command.track_id, command.clip_id); const clips = [...track.clips];
  if (command.type === "remove_clip") clips.splice(index, 1); else if (command.type === "move_clip") clips[index] = { ...clips[index], timeline_start: command.timeline_start }; else clips[index] = { ...clips[index], source: command.source };
  return replaceTrack(timeline, { ...track, clips });
}
export function inverseCommand(before: Timeline, command: TimelineCommand): TimelineCommand { const track = before.tracks.find((candidate) => candidate.track_id === command.track_id); if (!track) throw new Error("track not found"); if (command.type === "add_clip") return { type: "remove_clip", track_id: command.track_id, clip_id: command.clip.clip_id }; const [, index] = locate(before, command.track_id, command.clip_id); const old = track.clips[index]; if (command.type === "remove_clip") return { type: "add_clip", track_id: command.track_id, clip: old }; if (command.type === "move_clip") return { type: "move_clip", track_id: command.track_id, clip_id: command.clip_id, timeline_start: old.timeline_start }; return { type: "trim_source", track_id: command.track_id, clip_id: command.clip_id, source: old.source }; }
