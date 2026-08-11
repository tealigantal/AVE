import { strict as assert } from "node:assert";
import { sourceRange, assetIdFromFingerprint } from "../../packages/core/media-identity/src/public.js";
import { applyCommand, compileBasicVlogPreset, evaluateAutomationCurve, inverseCommand, mapTimelineToSource, validateAutomationCurve, validateGrade, validateMask, validateTimeMap, validateTimeline, type AutomationCurve, type Timeline, type TimelineCommand } from "../../packages/core/timeline-core/src/public.js";
import "./preset-core.test.js";

const asset = assetIdFromFingerprint({ algorithm: "sha256", digest: "d".repeat(64), byte_length: 100n });
const clip = (id: string, start: bigint): any => ({ clip_id: id, source: sourceRange(asset, start, start + 10n, 30n), timeline_start: start, timeline_duration: 10n });
const initial: Timeline = { version: 0, sequence: { sequence_id: "sequence-1", tracks: [] }, tracks: [{ track_id: "v1", kind: "video", clips: [clip("clip-1", 0n), clip("clip-2", 10n), clip("clip-3", 20n)] }, { track_id: "a1", kind: "audio", clips: [] }] };
const snapshot = (value: unknown): string => JSON.stringify(value, (_, item) => typeof item === "bigint" ? `${item}n` : item);
const contentSnapshot = (timeline: Timeline): string => snapshot({ ...timeline, version: 0 });
function roundTrip(before: Timeline, command: TimelineCommand): Timeline { const changed = applyCommand(before, command); const restored = applyCommand(changed, inverseCommand(before, command)); assert.equal(contentSnapshot(restored), contentSnapshot(before), `inverse failed for ${command.type}`); return changed; }

const coverage: readonly TimelineCommand[] = [
  { type: "add_clip", track_id: "v1", clip: clip("clip-new", 30n) },
  { type: "remove_clip", track_id: "v1", clip_id: "clip-3" },
  { type: "replace_clip", track_id: "v1", clip_id: "clip-1", clip: clip("clip-1", 0n) },
  { type: "move_clip", track_id: "v1", clip_id: "clip-1", timeline_start: 0n },
  { type: "trim_source", track_id: "v1", clip_id: "clip-1", source: sourceRange(asset, 1n, 11n, 30n) },
  { type: "roll_cut", track_id: "v1", left_clip_id: "clip-1", right_clip_id: "clip-2", boundary: 10n },
  { type: "ripple_delete", track_id: "v1", clip_id: "clip-2" },
  { type: "slip_clip", track_id: "v1", clip_id: "clip-1", source_start_pts: 2n, source_end_pts: 12n },
  { type: "slide_clip", track_id: "v1", clip_id: "clip-1", timeline_start: 0n },
  { type: "set_gain", track_id: "v1", clip_id: "clip-1", gain_db: -3 },
  { type: "add_caption", track_id: "v1", caption: { caption_id: "caption-1", text: "字幕", timeline_start: 0n, timeline_duration: 5n } },
  { type: "add_transition", track_id: "v1", transition: { transition_id: "transition-1", kind: "dissolve", from_clip_id: "clip-1", to_clip_id: "clip-2", timeline_start: 9n, timeline_duration: 1n } },
  { type: "set_effect", track_id: "v1", effect: { effect_id: "effect-1", clip_id: "clip-1", kind: "blur", enabled: true } },
  { type: "set_keyframe", track_id: "v1", keyframe: { keyframe_id: "keyframe-1", target_id: "clip-1", property: "opacity", time: 1n, value: 0.5 } },
  { type: "set_speed", track_id: "v1", clip_id: "clip-1", speed: { numerator: 2n, denominator: 1n } },
  { type: "set_transform", track_id: "v1", clip_id: "clip-1", transform: { scale_x: 1.1, scale_y: 1.1 } },
  { type: "set_static_reframe", track_id: "v1", clip_id: "clip-1", reframe: { schema_version: 1, mode: "crop_fill", focal_x: 0.6, focal_y: 0.4 } },
  { type: "set_clip_boundary_fades", track_id: "v1", clip_id: "clip-1", fades: { schema_version: 1, video_fade_in: { value: 3n, timescale: 30n }, audio_fade_out: { value: 3n, timescale: 30n } } },
  { type: "set_master_loudness", normalization: { schema_version: 1, enabled: true, target_lufs: -14, true_peak_db: -1, tolerance_lufs: 1 } },
  { type: "set_dialogue_music_ducking", ducking: { schema_version: 1, enabled: true, threshold_db: -30, ratio: 8, attack_ms: 20, release_ms: 350, max_reduction_db: 12 } },
  { type: "lock_range", track_id: "v1", lock: { lock_id: "lock-1", start: 0n, end: 10n, owner: "test" } },
  { type: "unlock_range", track_id: "v1", lock_id: "lock-1" }
];
for (const command of coverage) { if (command.type === "unlock_range") { const locked = applyCommand(initial, coverage.find((candidate) => candidate.type === "lock_range")!); const changed = roundTrip(locked, command); assert.equal(validateTimeline(changed).ok, true, `validation failed for ${command.type}`); } else { const changed = roundTrip(initial, command); assert.equal(validateTimeline(changed).ok, true, `validation failed for ${command.type}`); } }

let current = initial;
const generated: TimelineCommand[] = [];
for (let index = 0; index < 250; index += 1) {
  const phase = index % 12;
  const command: TimelineCommand = phase === 0 ? { type: "set_gain", track_id: "v1", clip_id: "clip-1", gain_db: -(index % 7) } : phase === 1 ? { type: "set_speed", track_id: "v1", clip_id: "clip-1", speed: { numerator: BigInt((index % 3) + 1), denominator: 1n } } : phase === 2 ? { type: "set_transform", track_id: "v1", clip_id: "clip-1", transform: { rotation: index % 360 } } : phase === 3 ? { type: "trim_source", track_id: "v1", clip_id: "clip-1", source: sourceRange(asset, BigInt(index % 10), BigInt(index % 10) + 10n, 30n) } : phase === 4 ? { type: "slide_clip", track_id: "v1", clip_id: "clip-1", timeline_start: 0n } : phase === 5 ? { type: "set_effect", track_id: "v1", effect: { effect_id: "effect-random", clip_id: "clip-1", kind: "color", parameters: { amount: index % 5 } } } : phase === 6 ? { type: "set_keyframe", track_id: "v1", keyframe: { keyframe_id: "keyframe-random", target_id: "clip-1", property: "opacity", time: BigInt(index % 10), value: index % 2 === 0 } } : phase === 7 ? { type: "add_caption", track_id: "v1", caption: { caption_id: `caption-${index}`, text: `字幕 ${index}`, timeline_start: 0n, timeline_duration: 1n } } : phase === 8 ? { type: "add_transition", track_id: "v1", transition: { transition_id: `transition-${index}`, kind: "cut", from_clip_id: "clip-1", to_clip_id: "clip-2", timeline_start: 9n, timeline_duration: 1n } } : phase === 9 ? { type: "lock_range", track_id: "v1", lock: { lock_id: `lock-${index}`, start: 0n, end: 10n, owner: "random" } } : phase === 10 ? { type: "unlock_range", track_id: "v1", lock_id: `lock-${index - 1}` } : { type: "roll_cut", track_id: "v1", left_clip_id: "clip-1", right_clip_id: "clip-2", boundary: 10n };
  const before = current; current = applyCommand(current, command); generated.push(command); assert.equal(validateTimeline(current).ok, true); const restored = applyCommand(current, inverseCommand(before, command)); assert.equal(contentSnapshot(restored), contentSnapshot(before));
}
let replay = initial; for (const command of generated) replay = applyCommand(replay, command); assert.equal(snapshot(replay), snapshot(current)); assert.equal(current.version, initial.version + generated.length);
const beforeFailure = snapshot(current); assert.throws(() => applyCommand(current, { type: "add_clip", track_id: "v1", clip: clip("clip-1", 30n) }), /duplicate clip/); assert.equal(snapshot(current), beforeFailure);
assert.throws(() => applyCommand(current, { type: "move_clip", track_id: "v1", clip_id: "clip-1", timeline_start: -1n }), /negative/); assert.equal(snapshot(current), beforeFailure);
assert.throws(() => applyCommand(initial, { type: "set_static_reframe", track_id: "v1", clip_id: "clip-1", reframe: { schema_version: 1, mode: "crop_fill", focal_x: 1.1, focal_y: 0.5 } }), /STATIC_REFRAME_INVALID/);
assert.throws(() => applyCommand(initial, { type: "set_clip_boundary_fades", track_id: "v1", clip_id: "clip-1", fades: { schema_version: 1, video_fade_in: { value: 11n, timescale: 30n } } }), /CLIP_FADE_TOO_LONG/);
assert.throws(() => applyCommand(initial, { type: "set_clip_boundary_fades", track_id: "v1", clip_id: "clip-1", fades: { schema_version: 1, video_fade_in: { value: 6n, timescale: 30n }, video_fade_out: { value: 6n, timescale: 30n } } }), /CLIP_FADE_SUM_TOO_LONG/);
const mixedTimescale: Timeline = { ...initial, tracks: [initial.tracks[0], { track_id: "a-mixed", kind: "audio", clips: [{ clip_id: "audio-mixed", media_kind: "audio", source: sourceRange(asset, 0n, 16000n, 48000n), timeline_start: 0n, timeline_duration: 10n }] }] };
assert.equal(validateTimeline(applyCommand(mixedTimescale, { type: "set_clip_boundary_fades", track_id: "v1", clip_id: "clip-1", fades: { schema_version: 1, video_fade_in: { value: 3n, timescale: 30n } } })).ok, true, "mixed source timescales must not change the authoritative Timeline tick");
assert.throws(() => applyCommand(initial, { type: "set_master_loudness", normalization: { schema_version: 1, enabled: true, target_lufs: -3, true_peak_db: -1, tolerance_lufs: 1 } }), /MASTER_LOUDNESS_INVALID/);
assert.throws(() => applyCommand(initial, { type: "set_dialogue_music_ducking", ducking: { schema_version: 1, enabled: true, threshold_db: -30, ratio: 30, attack_ms: 20, release_ms: 350, max_reduction_db: 12 } }), /DUCKING_INVALID/);
const presetCommands = compileBasicVlogPreset({ schema_version: 1, preset_id: "basic_vertical_vlog", preset_version: 1, track_id: "v1", clip_id: "clip-1", reframe: { schema_version: 1, mode: "blurred_background", focal_x: 0.5, focal_y: 0.5 }, loudness: { schema_version: 1, enabled: true, target_lufs: -14, true_peak_db: -1, tolerance_lufs: 1 }, ducking: { schema_version: 1, enabled: true, threshold_db: -30, ratio: 8, attack_ms: 20, release_ms: 350, max_reduction_db: 12 }, fades: { schema_version: 1, video_fade_in: { value: 3n, timescale: 30n }, audio_fade_out: { value: 3n, timescale: 30n } } });
assert.deepEqual(presetCommands.map((command) => command.type), ["set_static_reframe", "set_clip_boundary_fades", "set_master_loudness", "set_dialogue_music_ducking"]);
assert.equal(presetCommands.reduce((timeline, command) => applyCommand(timeline, command), initial).dialogue_music_ducking?.enabled, true);

const nestedSequence = { sequence_id: "nested-sequence", tracks: [{ track_id: "nested-v1", kind: "video" as const, clips: [clip("nested-source", 0n)] }] };
const structural = applyCommand(initial, { type: "add_track", track: { track_id: "v2", kind: "video", z_index: 1, enabled: true, clips: [] } });
const reordered = applyCommand(structural, { type: "reorder_track", track_id: "v2", index: 0 });
assert.equal(reordered.tracks[0].track_id, "v2");
const withSequence = applyCommand(reordered, { type: "add_sequence", sequence: nestedSequence });
const withNestedClip = applyCommand(withSequence, { type: "add_clip", track_id: "v2", clip: { ...clip("nested-clip", 0n), kind: "nested", nested_sequence_id: "nested-sequence" } });
assert.equal(validateTimeline(withNestedClip).ok, true, "nested sequence must validate");
assert.throws(() => applyCommand(withNestedClip, { type: "remove_sequence", sequence_id: "nested-sequence" }), /still referenced/);
const invalidCycle: Timeline = { ...initial, sequences: [{ sequence_id: "a", parent_sequence_id: "b", tracks: [] }, { sequence_id: "b", parent_sequence_id: "a", tracks: [] }] };
assert.equal(validateTimeline(invalidCycle).errors.some((error) => error.startsWith("CYCLE:")), true, "sequence cycle must block");
const nestedCycle: Timeline = { ...initial, sequence: undefined, tracks: [], sequences: [{ sequence_id: "a", tracks: [{ track_id: "a-v", kind: "video", clips: [{ ...clip("a-nested", 0n), kind: "nested", nested_sequence_id: "b" }] }] }, { sequence_id: "b", tracks: [{ track_id: "b-v", kind: "video", clips: [{ ...clip("b-nested", 0n), kind: "nested", nested_sequence_id: "a" }] }] }] };
assert.equal(validateTimeline(nestedCycle).errors.some((error) => error.startsWith("CYCLE:")), true, "nested sequence cycle must block");
const missingCompound: Timeline = { ...initial, tracks: [{ ...initial.tracks[0], clips: [{ ...clip("compound", 30n), kind: "compound", compound_clip_ids: ["missing"] }] }, initial.tracks[1]] };
assert.equal(validateTimeline(missingCompound).errors.some((error) => error.startsWith("COMPOUND:")), true, "compound children must exist in the same track");
const timeMapConflict: Timeline = { ...initial, tracks: [{ ...initial.tracks[0], clips: [{ ...initial.tracks[0].clips[0], speed: { numerator: 2n, denominator: 1n }, time_map: { map_id: "conflict", pitch_policy: "preserve", segments: [{ segment_id: "speed", timeline_start: 0n, timeline_end: 10n, source_start: 0n, source_end: 10n, mode: "speed", speed_numerator: 1n, speed_denominator: 1n }] } }] }, initial.tracks[1]] };
assert.equal(validateTimeline(timeMapConflict).errors.some((error) => error.includes("TIME_MAP_SPEED_CONFLICT")), true);
for (let index = 1; index <= 200; index += 1) {
  const numerator = BigInt(index % 7 + 1); const denominator = BigInt(index % 5 + 1); const firstUnit = BigInt(index % 23 + 1); const secondUnit = BigInt(index % 17 + 1);
  const firstTimeline = firstUnit * denominator; const firstSource = firstUnit * numerator; const secondTimeline = secondUnit * denominator; const secondSource = secondUnit * numerator;
  const map = { map_id: `property-map-${index}`, pitch_policy: "preserve" as const, segments: [{ segment_id: `first-${index}`, timeline_start: 0n, timeline_end: firstTimeline, source_start: 0n, source_end: firstSource, mode: "speed" as const, speed_numerator: numerator, speed_denominator: denominator }, { segment_id: `second-${index}`, timeline_start: firstTimeline, timeline_end: firstTimeline + secondTimeline, source_start: firstSource, source_end: firstSource + secondSource, mode: "speed" as const, speed_numerator: numerator, speed_denominator: denominator }] };
  assert.deepEqual(validateTimeMap(map), [], `generated valid map ${index}`);
  assert.equal(mapTimelineToSource(map, firstTimeline), firstSource, `half-open boundary ${index}`);
  assert.equal(mapTimelineToSource(map, firstTimeline + secondTimeline), firstSource + secondSource, `final endpoint ${index}`);
}
const opacityCurve: AutomationCurve = { curve_id: "curve-opacity", target_id: "clip-1", property_path: "transform.opacity", value_kind: "number", keyframes: [{ keyframe_id: "kf-0", time: 0n, value: 0, interpolation: "bezier", out_tangent: { time: 1, value: 1 } }, { keyframe_id: "kf-1", time: 10n, value: 1, in_tangent: { time: 1, value: 1 } }] };
assert.deepEqual(validateAutomationCurve(opacityCurve), []);
assert.equal(evaluateAutomationCurve(opacityCurve, 0n), 0);
assert.equal(typeof evaluateAutomationCurve(opacityCurve, 5n), "number");
const hugeCurve: AutomationCurve = { ...opacityCurve, keyframes: [{ ...opacityCurve.keyframes[0], time: 10n ** 80n }, { ...opacityCurve.keyframes[1], time: 3n * 10n ** 80n }] };
assert.equal(evaluateAutomationCurve(hugeCurve, 2n * 10n ** 80n), 0.5, "BigInt interpolation must not convert absolute time to Number");
assert.match(validateAutomationCurve({ ...opacityCurve, before: "clamp" } as any).join(","), /boundary policies are not supported/);
assert.match(validateAutomationCurve({ ...opacityCurve, value_kind: "boolean", keyframes: [{ keyframe_id: "bad-bool", time: 0n, value: true, interpolation: "linear" }] }).join(","), /require hold interpolation/);
const withCurve = applyCommand(initial, { type: "set_automation_curve", track_id: "v1", curve: opacityCurve });
assert.equal(withCurve.tracks[0].automation_curves?.[0].curve_id, "curve-opacity");
assert.throws(() => applyCommand(initial, { type: "set_automation_curve", track_id: "v1", curve: { ...opacityCurve, target_id: "missing" } }), /target not found/);
const trackedMask = { mask_id: "mask-1", shape: "rectangle" as const, mode: "mosaic" as const, x: 0.1, y: 0.1, width: 0.2, height: 0.2, lost_frame_policy: "block" as const, tracking_samples: [{ time: 0n, x: 0.1, y: 0.1, width: 0.2, height: 0.2, confidence: 1, corrected: true }] };
assert.deepEqual(validateMask(trackedMask), []);
assert.match(validateMask({ ...trackedMask, tracking_samples: [{ ...trackedMask.tracking_samples[0], confidence: 0.2 }] }).join(","), /low tracking confidence/);
assert.match(validateMask({ ...trackedMask, feather: -0.1 }).join(","), /feather/);
assert.match(validateGrade({ grade_id: "bad-gamma", gamma: 10.1, context: { input_space: "rec709", working_space: "rec709", output_space: "rec709", bit_depth: 8, range: "limited" } }).join(","), /gamma/);
console.log(`timeline core property check passed (${generated.length} commands, ${coverage.length} command kinds)`);
