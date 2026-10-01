import type { Timeline } from "./public.js";

// Validate the persisted boundary before typed semantic validators perform
// arithmetic or iterate arrays. No coercion, omitted-field defaults or mutation.
type Check = (value: unknown, path: string) => void;
const invalid = (path: string, expected: string): never => { throw new Error(`TIMELINE_STRUCTURE_INVALID:${path}:${expected}`); };
const text: Check = (value, path) => { if (typeof value !== "string") invalid(path, "string"); };
const id: Check = (value, path) => { text(value, path); if (!(value as string).trim()) invalid(path, "nonempty string"); };
const number: Check = (value, path) => { if (typeof value !== "number" || !Number.isFinite(value)) invalid(path, "finite number"); };
const integer: Check = (value, path) => { if (!Number.isSafeInteger(value)) invalid(path, "safe integer"); };
const bool: Check = (value, path) => { if (typeof value !== "boolean") invalid(path, "boolean"); };
const tick: Check = (value, path) => { if (typeof value !== "bigint") invalid(path, "bigint"); };
const choice = (...values: readonly unknown[]): Check => (value, path) => { if (!values.includes(value)) invalid(path, "registered value"); };
const list = (item: Check): Check => (value, path) => { if (!Array.isArray(value)) invalid(path, "array"); (value as unknown[]).forEach((entry, index) => item(entry, `${path}/${index}`)); };
function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(path, "object");
  return value as Record<string, unknown>;
}
const fields = (required: Readonly<Record<string, Check>>, optional: Readonly<Record<string, Check>> = {}): Check => (value, path) => {
  const object = record(value, path);
  for (const [key, check] of Object.entries(required)) check(object[key], `${path}/${key}`);
  for (const key of Object.keys(object)) {
    if (Object.hasOwn(required, key)) continue;
    if (!Object.hasOwn(optional, key)) invalid(`${path}/${key}`, "known field");
    optional[key]!(object[key], `${path}/${key}`);
  }
};
const dictionary = (item: Check): Check => (value, path) => { for (const [key, entry] of Object.entries(record(value, path))) item(entry, `${path}/${key}`); };
const scalar: Check = (value, path) => { if (typeof value === "number") number(value, path); else if (typeof value !== "string" && typeof value !== "boolean") invalid(path, "scalar"); };
const automationValue: Check = (value, path) => { if (Array.isArray(value)) list(number)(value, path); else scalar(value, path); };
const rational = fields({ value: tick, timescale: tick });
const sidecar = fields({ semantic_id: id, labels: list(text), evidence_refs: list(text) }, { metadata: dictionary(text) });
const range = { timeline_start: tick, timeline_duration: tick };
const effect = fields({ effect_id: id, clip_id: id, kind: id }, { parameters: dictionary(scalar), enabled: bool });
const keyframe = fields({ keyframe_id: id, target_id: id, property: id, time: tick, value: scalar });
const tangent = fields({ time: number, value: number });
const automation = fields({ curve_id: id, target_id: id, property_path: id, value_kind: choice("number", "boolean", "string", "vector", "color", "rectangle"), keyframes: list(fields({ keyframe_id: id, time: tick, value: automationValue }, { interpolation: choice("hold", "linear", "bezier"), in_tangent: tangent, out_tangent: tangent })) });
const transform = fields({}, {
  x: number, y: number, scale_x: number, scale_y: number, rotation: number,
  anchor_x: number, anchor_y: number, opacity: number, flip_x: bool, flip_y: bool,
  crop_left: number, crop_top: number, crop_right: number, crop_bottom: number,
  fit: choice("fit", "fill", "stretch", "original"),
});
const grade = fields({ grade_id: id, context: fields({ input_space: choice("rec709", "srgb", "rec2020"), working_space: choice("rec709", "srgb", "rec2020"), output_space: choice("rec709", "srgb", "rec2020"), bit_depth: choice(8, 10), range: choice("limited", "full") }) }, { exposure: number, brightness: number, contrast: number, saturation: number, gamma: number, lut_path: text, lut_sha256: text });
const geometry = { x: number, y: number, width: number, height: number };
const mask = fields({ mask_id: id, shape: choice("rectangle", "ellipse"), mode: choice("blur", "mosaic", "alpha"), ...geometry, lost_frame_policy: choice("block", "hold") }, { feather: number, tracking_samples: list(fields({ time: tick, ...geometry, confidence: number }, { corrected: bool })) });
const clip = fields({ clip_id: id, source: fields({ asset_id: id, start_pts: tick, end_pts: tick, timescale: tick }), ...range }, {
  media_kind: choice("video", "audio"), kind: choice("media", "image", "graphic", "text", "generator", "adjustment", "compound", "nested"),
  speed: fields({ numerator: tick, denominator: tick }),
  time_map: fields({ map_id: id, pitch_policy: choice("preserve", "change"), segments: list(fields({ segment_id: id, timeline_start: tick, timeline_end: tick, source_start: tick, source_end: tick, mode: choice("speed", "hold", "reverse") }, { speed_numerator: tick, speed_denominator: tick })) }),
  transform, static_reframe: fields({ schema_version: choice(1), mode: choice("crop_fill", "contain", "blurred_background"), focal_x: number, focal_y: number }),
  boundary_fades: fields({ schema_version: choice(1) }, { video_fade_in: rational, video_fade_out: rational, audio_fade_in: rational, audio_fade_out: rational }),
  grade, mask, gain_db: number, effects: list(effect), keyframes: list(keyframe), automation_curves: list(automation),
  compound_clip_ids: list(id), nested_sequence_id: id, link_group_id: id, semantic_sidecar: sidecar,
});
const track = fields({ track_id: id, kind: choice("video", "audio"), clips: list(clip) }, {
  z_index: integer, enabled: bool, locked: bool, muted: bool, solo: bool, opacity: number,
  blend_mode: choice("normal", "multiply", "screen", "overlay", "add", "subtract", "difference", "darken", "lighten", "color_dodge", "color_burn"),
  gaps: list(fields({ gap_id: id, ...range })),
  transitions: list(fields({ transition_id: id, kind: id, from_clip_id: id, to_clip_id: id, ...range }, { parameters: dictionary(scalar) })),
  captions: list(fields({ caption_id: id, text, ...range }, { language: text, words: list(fields({ text, ...range })), style: dictionary(scalar), semantic_sidecar: sidecar })),
  effects: list(effect), keyframes: list(keyframe), automation_curves: list(automation),
  audio_routing: list(fields({ routing_id: id, source_clip_id: id, bus: choice("dialogue", "narration", "music", "embedded") }, { gain_db: number, muted: bool })),
  locks: list(fields({ lock_id: id, start: tick, end: tick, owner: id })), semantic_sidecar: sidecar,
});
const sequence = fields({ sequence_id: id, tracks: list(track) }, { parent_sequence_id: id, timebase: rational, duration: rational, semantic_sidecar: sidecar });
const timeline = fields({ version: integer, tracks: list(track) }, {
  sequence, sequences: list(sequence), semantic_sidecar: sidecar,
  master_loudness: fields({ schema_version: choice(1), enabled: bool, target_lufs: number, true_peak_db: number, tolerance_lufs: number }),
  dialogue_music_ducking: fields({ schema_version: choice(1), enabled: bool, threshold_db: number, ratio: number, attack_ms: number, release_ms: number, max_reduction_db: number }),
});

export function assertTimelineStructure(value: unknown): asserts value is Timeline { timeline(value, "timeline"); }
