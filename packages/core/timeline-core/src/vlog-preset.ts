import type { ClipBoundaryFades, DialogueMusicDucking, MasterLoudnessNormalization, StaticReframe, TimelineCommand } from "./public.js";

export type BasicVlogPresetSelection = Readonly<{
  schema_version: 1;
  preset_id: "basic_vertical_vlog";
  preset_version: 1;
  track_id: string;
  clip_id: string;
  reframe: StaticReframe;
  loudness: MasterLoudnessNormalization;
  ducking: DialogueMusicDucking;
  fades: ClipBoundaryFades;
}>;

export function compileBasicVlogPreset(selection: BasicVlogPresetSelection): readonly TimelineCommand[] {
  if (selection.schema_version !== 1 || selection.preset_id !== "basic_vertical_vlog" || selection.preset_version !== 1 || !selection.track_id || !selection.clip_id) throw new Error("BASIC_VLOG_PRESET_INVALID");
  return [
    { type: "set_static_reframe", track_id: selection.track_id, clip_id: selection.clip_id, reframe: selection.reframe },
    { type: "set_clip_boundary_fades", track_id: selection.track_id, clip_id: selection.clip_id, fades: selection.fades },
    { type: "set_master_loudness", normalization: selection.loudness },
    { type: "set_dialogue_music_ducking", ducking: selection.ducking },
  ];
}
