import assert from "node:assert/strict";
import { classifyObservationAudioWord, intersectObservationAudioEvent } from "../../packages/platform/project-host/src/observation-audio-boundary.js";
import { planObservationAudioChunks, type ObservationAudioChunkConfiguration } from "../../packages/platform/contract-runtime/src/observation-audio-chunks.mjs";

const wire = (value: number, timescale: number) => ({ schema_version: 1 as const, value, timescale });
for (const rate of [8000, 16000, 44100, 48000]) {
  const config: ObservationAudioChunkConfiguration = { start_sample: 19, end_sample: 19 + rate * 4, sample_rate: rate, channels: 1, context_samples: rate / 2, max_core_samples: rate, max_duration_seconds: 3, max_base64_bytes: 1_000_000, wav_header_bytes: 4096 };
  const chunks = [...planObservationAudioChunks(config)], left = chunks[0]!, right = chunks[1]!, cut = left.core_end_sample;
  const word = { start: wire(cut - 20, rate), end: wire(cut + 20, rate), uncertain: false }, original = structuredClone(word);
  const a = classifyObservationAudioWord(left, rate, word), b = classifyObservationAudioWord(right, rate, word);
  assert.deepEqual(a, { core_owned: false, crosses_boundary: true, uncertain: true });
  assert.deepEqual(b, { core_owned: true, crosses_boundary: true, uncertain: true }, "half-open ownership resolves midpoint on the exact cut to the right core");
  assert.deepEqual(word, original, "attribution does not mutate or discard the original model evidence");
  const leftWord = { start: wire(cut - 20, rate), end: wire(cut, rate), uncertain: false };
  assert.deepEqual(classifyObservationAudioWord(left, rate, leftWord), { core_owned: true, crosses_boundary: false, uncertain: false });
  assert.equal(classifyObservationAudioWord(right, rate, leftWord).core_owned, false, "overlap context is never misrepresented as owned evidence");
  const event = { source_event_id: "model-call-1:event-4", ...word }, first = intersectObservationAudioEvent(left, rate, event), second = intersectObservationAudioEvent(right, rate, event);
  assert.equal(first.source_event_id, event.source_event_id); assert.deepEqual(first.source_start, word.start); assert.deepEqual(first.source_end, word.end);
  assert.deepEqual(first.core_range, { start: word.start, end: wire(cut, rate) });
  assert.deepEqual(second.core_range, { start: wire(cut, rate), end: word.end });
  assert.equal(first.uncertain, true); assert.equal(second.uncertain, true);
  assert.equal(intersectObservationAudioEvent(right, rate, { source_event_id: "context-only", ...leftWord }).core_range, null);
  assert.equal(classifyObservationAudioWord(left, rate, { ...leftWord, uncertain: true }).uncertain, true);
  assert.throws(() => classifyObservationAudioWord(left, rate, { start: wire(left.input_start_sample - 1, rate), end: wire(cut, rate), uncertain: false }), /AUDIO_CHUNK_BOUNDARY_INVALID/);
  assert.throws(() => classifyObservationAudioWord(left, rate, { start: wire(cut, rate), end: wire(cut, rate), uncertain: false }), /AUDIO_CHUNK_BOUNDARY_INVALID/);
  assert.throws(() => intersectObservationAudioEvent(left, rate, { source_event_id: "", ...word }), /AUDIO_CHUNK_BOUNDARY_INVALID/);
}
// Very large exact sample coordinates and differing RationalTime scales never
// pass through floating seconds or lose the midpoint tie.
const start = Number.MAX_SAFE_INTEGER - 1000, rate = 48000;
const big = { index: 0, input_start_sample: start, core_start_sample: start, core_end_sample: start + 400, input_end_sample: start + 500 };
const near = { start: wire(start + 398, rate), end: wire(start + 402, rate), uncertain: false };
assert.deepEqual(classifyObservationAudioWord(big, rate, near), { core_owned: false, crosses_boundary: true, uncertain: true });
const mixedScale = { start: wire(1, 2), end: wire(3, 4), uncertain: false }, seconds = { index: 0, input_start_sample: 0, core_start_sample: 0, core_end_sample: 30000, input_end_sample: 48000 };
assert.deepEqual(classifyObservationAudioWord(seconds, rate, mixedScale), { core_owned: false, crosses_boundary: true, uncertain: true });
console.log("Observation audio core ownership and uncertain boundary evidence passed");
