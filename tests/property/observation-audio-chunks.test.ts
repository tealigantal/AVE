import assert from "node:assert/strict";
import { observationAudioChunkRequests, planObservationAudioChunks, validateObservationAudioChunkResult, validateObservationAudioChunks, type ObservationAudioChunkConfiguration } from "../../packages/platform/contract-runtime/src/observation-audio-chunks.mjs";

const base: ObservationAudioChunkConfiguration = { start_sample: 123, end_sample: 123 + 48000 * 612, sample_rate: 48000, channels: 2, context_samples: 48000, max_core_samples: 48000 * 300, max_duration_seconds: 300, max_base64_bytes: 10_000_000, wav_header_bytes: 4096 };
const chunks = [...planObservationAudioChunks(base)];
assert.ok(chunks.length > 2);
assert.equal(validateObservationAudioChunks(base, chunks), true);
assert.equal(chunks[0]!.core_start_sample, base.start_sample);
assert.equal(chunks.at(-1)!.core_end_sample, base.end_sample);
for (const [index, chunk] of chunks.entries()) {
  assert.equal(chunk.index, index);
  if (index) assert.equal(chunk.core_start_sample, chunks[index - 1]!.core_end_sample);
  assert.equal(chunk.input_start_sample, Math.max(base.start_sample, chunk.core_start_sample - base.context_samples));
  assert.equal(chunk.input_end_sample, Math.min(base.end_sample, chunk.core_end_sample + base.context_samples));
  const count = chunk.input_end_sample - chunk.input_start_sample;
  assert.ok(count <= base.sample_rate * base.max_duration_seconds);
  assert.ok(4 * Math.ceil((base.wav_header_bytes + count * base.channels * 2) / 3) < base.max_base64_bytes);
}
const clone = () => chunks.map(chunk => ({ ...chunk }));
for (const mutate of [
  (value: ReturnType<typeof clone>) => { value[1]!.core_start_sample++; },
  (value: ReturnType<typeof clone>) => { value[1]!.core_start_sample--; },
  (value: ReturnType<typeof clone>) => { value[1]!.input_start_sample++; },
  (value: ReturnType<typeof clone>) => { value[1]!.input_end_sample--; },
  (value: ReturnType<typeof clone>) => { value[0]!.index = 8; },
  (value: ReturnType<typeof clone>) => { value.pop(); },
  (value: ReturnType<typeof clone>) => { value.push({ ...value.at(-1)! }); },
]) { const copy = clone(); mutate(copy); assert.throws(() => validateObservationAudioChunks(base, copy), /AUDIO_CHUNK_PLAN_INVALID/); }
for (const change of [
  { end_sample: base.start_sample }, { sample_rate: 0 }, { channels: -1 }, { context_samples: 99_000_000 },
  { max_base64_bytes: 4096 }, { start_sample: Number.MAX_SAFE_INTEGER + 1 }, { max_duration_seconds: 0 },
]) assert.throws(() => [...planObservationAudioChunks({ ...base, ...change })], /AUDIO_CHUNK_PLAN_INVALID/);
// Even very long intervals remain lazy and preserve exact integer coordinates.
const huge = { ...base, start_sample: Number.MAX_SAFE_INTEGER - 5_000_000, end_sample: Number.MAX_SAFE_INTEGER };
const iterator = planObservationAudioChunks(huge); const first = iterator.next().value!;
assert.equal(first.core_start_sample, huge.start_sample); assert.equal(iterator.next().value!.core_start_sample, first.core_end_sample);
// A short input needs no artificial context outside its actual bounds.
const short = { ...base, start_sample: 0, end_sample: 10, context_samples: 1000, max_duration_seconds: 1, max_base64_bytes: 8000 };
assert.equal(validateObservationAudioChunks(short, planObservationAudioChunks(short)), true);
// Exercise various sample grids and channel counts, including exact final tails.
for (const rate of [8000, 16000, 44100, 48000]) for (const channels of [1, 2, 6]) {
  const config = { ...base, start_sample: 19, end_sample: 19 + rate * 73 + 11, sample_rate: rate, channels, context_samples: Math.floor(rate / 2) };
  assert.equal(validateObservationAudioChunks(config, planObservationAudioChunks(config)), true);
}
const request = observationAudioChunkRequests(base, "audio-fixture").next().value!;
const digest = "e".repeat(64), count = request.chunk.input_end_sample - request.chunk.input_start_sample;
const result: any = { schema_version: 1, sample_id: request.sample.sample_id, source_digest: digest, stream_index: 2, content_digest: "f".repeat(64), policy_version: "source-pts-sampling-v1", byte_length: 78 + count * base.channels * 2, requested_start: request.sample.start, actual_start: request.sample.start, requested_end: request.sample.end, actual_end: request.sample.end, detail: { kind: "audio", mime_type: "audio/wav", sample_rate: base.sample_rate, channels: base.channels, sample_count: count } };
assert.equal(validateObservationAudioChunkResult(base, "audio-fixture", request.chunk, result, digest, 2), true);
for (const mutate of [
  (v: any) => { v.sample_id = "another-0"; }, (v: any) => { v.source_digest = "0".repeat(64); },
  (v: any) => { v.stream_index++; }, (v: any) => { v.actual_start.value++; },
  (v: any) => { v.actual_end.value--; }, (v: any) => { v.detail.sample_count--; },
  (v: any) => { v.detail.channels++; }, (v: any) => { v.policy_version = "other"; }, (v: any) => { v.byte_length = 1; },
  (v: any) => { v.byte_length += base.wav_header_bytes; }, (v: any) => { v.content_digest = "bad"; },
]) { const altered = structuredClone(result); mutate(altered); assert.throws(() => validateObservationAudioChunkResult(base, "audio-fixture", request.chunk, altered, digest, 2), /AUDIO_CHUNK_PLAN_INVALID/); }
assert.throws(() => [...observationAudioChunkRequests(base, "../invalid")], /AUDIO_CHUNK_PLAN_INVALID/);
assert.throws(() => validateObservationAudioChunkResult(base, "audio-fixture", { ...request.chunk, core_start_sample: request.chunk.core_start_sample + 1 }, result, digest, 2), /AUDIO_CHUNK_PLAN_INVALID/);
console.log("Observation audio chunk sample grid and bounds passed");
