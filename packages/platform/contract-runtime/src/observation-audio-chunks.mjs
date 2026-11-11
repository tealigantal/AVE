/** Exact, lazy planning of contiguous core samples with bounded context.
 * This does not infer speech, merge model results, or authorize any send. */
const invalid = message => { throw new Error(`AUDIO_CHUNK_PLAN_INVALID: ${message}`); };
const integer = (value, name, minimum = 0) => {
  if (!Number.isSafeInteger(value) || value < minimum) invalid(`${name} must be a safe integer >= ${minimum}`);
  return BigInt(value);
};
function limits(config) {
  if (!config || typeof config !== "object" || Array.isArray(config) || Object.keys(config).sort().join(",") !== "channels,context_samples,end_sample,max_base64_bytes,max_core_samples,max_duration_seconds,sample_rate,start_sample,wav_header_bytes") invalid("exact planning fields required");
  const start = integer(config.start_sample, "start_sample"), end = integer(config.end_sample, "end_sample"), rate = integer(config.sample_rate, "sample_rate", 1), channels = integer(config.channels, "channels", 1);
  const context = integer(config.context_samples, "context_samples"), coreLimit = integer(config.max_core_samples, "max_core_samples", 1);
  const seconds = integer(config.max_duration_seconds, "max_duration_seconds", 1), base64 = integer(config.max_base64_bytes, "max_base64_bytes", 1), header = integer(config.wav_header_bytes, "wav_header_bytes", 1);
  if (end <= start) invalid("sample interval must be nonempty");
  // 4*ceil(bytes/3) must be strictly less than the configured Base64 limit.
  const maxBytes = ((base64 - 1n) / 4n) * 3n;
  const pcmBytesPerSample = channels * 2n;
  if (maxBytes <= header) invalid("audio header does not fit the encoded limit");
  const byBytes = (maxBytes - header) / pcmBytesPerSample, byDuration = seconds * rate;
  const maxInput = byBytes < byDuration ? byBytes : byDuration;
  let maxCore;
  if (maxInput <= context * 2n) {
    if (end - start > maxInput || end - start > coreLimit) invalid("context leaves no bounded core");
    maxCore = end - start;
  } else maxCore = coreLimit < maxInput - context * 2n ? coreLimit : maxInput - context * 2n;
  return { start, end, rate, channels, context, maxCore, maxInput, maxBytes, header };
}
function expectedChunk(plan, first, index) {
  const last = first + plan.maxCore < plan.end ? first + plan.maxCore : plan.end;
  const inputFirst = first - plan.context > plan.start ? first - plan.context : plan.start;
  const inputLast = last + plan.context < plan.end ? last + plan.context : plan.end;
  return { index, core_start_sample: Number(first), core_end_sample: Number(last), input_start_sample: Number(inputFirst), input_end_sample: Number(inputLast) };
}
/** Iteration retains one plan entry at a time, regardless of source duration. */
export function* planObservationAudioChunks(config) {
  const plan = limits(config);
  let first = plan.start, index = 0;
  while (first < plan.end) {
    if (!Number.isSafeInteger(index)) invalid("chunk index exceeds exact range");
    const chunk = expectedChunk(plan, first, index++);
    yield chunk;
    first = BigInt(chunk.core_end_sample);
  }
}
/** Reconstruct and compare every core/context boundary; gaps and overlaps fail. */
export function validateObservationAudioChunks(config, chunks) {
  const plan = limits(config);
  if (!chunks || typeof chunks[Symbol.iterator] !== "function") invalid("chunk sequence must be iterable");
  let first = plan.start, index = 0;
  for (const chunk of chunks) {
    if (first >= plan.end || !Number.isSafeInteger(index)) invalid("extra chunk");
    const expected = expectedChunk(plan, first, index++);
    if (!chunk || typeof chunk !== "object" || Array.isArray(chunk) || Object.keys(chunk).sort().join(",") !== "core_end_sample,core_start_sample,index,input_end_sample,input_start_sample" || Object.entries(expected).some(([key, value]) => chunk[key] !== value)) invalid("core or context identity differs from exact plan");
    const count = BigInt(chunk.input_end_sample) - BigInt(chunk.input_start_sample);
    if (count > plan.maxInput || plan.header + count * plan.channels * 2n > plan.maxBytes) invalid("model input exceeds its configured limit");
    first = BigInt(chunk.core_end_sample);
  }
  if (first !== plan.end) invalid("chunk sequence does not cover the whole source interval");
  return true;
}

/** Bind one exact core/context plan to the existing Worker sample request.
 * Each returned request contains only its own bounded context, never a
 * truncated substitute for the complete source coverage plan. */
export function* observationAudioChunkRequests(config, prefix) {
  if (typeof prefix !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(prefix)) invalid("safe chunk sample prefix required");
  for (const chunk of planObservationAudioChunks(config)) {
    const sample_id = `${prefix}-${chunk.index}`;
    if (sample_id.length > 128) invalid("chunk sample identifier exceeds Worker limit");
    yield { chunk, sample: { sample_id, kind: "audio", start: { schema_version: 1, value: chunk.input_start_sample, timescale: config.sample_rate }, end: { schema_version: 1, value: chunk.input_end_sample, timescale: config.sample_rate } } };
  }
}

/** Validate Worker metadata against the exact source and sample-grid plan.
 * The caller must separately verify the staged bytes and content hash while
 * holding the appropriate Host-owned source and authorization leases. */
export function validateObservationAudioChunkResult(config, prefix, chunk, sample, sourceDigest, streamIndex) {
  const plan = limits(config);
  if (typeof prefix !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(prefix) || typeof sourceDigest !== "string" || !/^[a-f0-9]{64}$/.test(sourceDigest) || !Number.isSafeInteger(streamIndex) || streamIndex < 0 || !Number.isSafeInteger(chunk?.index) || chunk.index < 0) invalid("chunk source identity invalid");
  const first = plan.start + BigInt(chunk.index) * plan.maxCore;
  if (first >= plan.end) invalid("extra chunk");
  const expected = expectedChunk(plan, first, chunk.index);
  if (Object.keys(chunk).sort().join(",") !== "core_end_sample,core_start_sample,index,input_end_sample,input_start_sample" || Object.entries(expected).some(([key, value]) => chunk[key] !== value)) invalid("chunk plan changed");
  const sampleId = `${prefix}-${chunk.index}`;
  const matchesTime = (value, expectedSample) => value && value.schema_version === 1 && Number.isSafeInteger(value.value) && value.value >= 0 && Number.isSafeInteger(value.timescale) && value.timescale > 0 && BigInt(value.value) * plan.rate === BigInt(expectedSample) * BigInt(value.timescale);
  const samples = BigInt(expected.input_end_sample) - BigInt(expected.input_start_sample);
  if (sampleId.length > 128 || !sample || sample.schema_version !== 1 || sample.sample_id !== sampleId || sample.source_digest !== sourceDigest || sample.stream_index !== streamIndex || typeof sample.content_digest !== "string" || !/^[a-f0-9]{64}$/.test(sample.content_digest) || sample.policy_version !== "source-pts-sampling-v1" || !Number.isSafeInteger(sample.byte_length) || sample.byte_length <= 0 || sample.detail?.kind !== "audio" || sample.detail.mime_type !== "audio/wav" || sample.detail.sample_rate !== config.sample_rate || sample.detail.channels !== config.channels || !Number.isSafeInteger(sample.detail.sample_count) || sample.detail.sample_count <= 0 || BigInt(sample.detail.sample_count) !== samples || !matchesTime(sample.requested_start, expected.input_start_sample) || !matchesTime(sample.actual_start, expected.input_start_sample) || !matchesTime(sample.requested_end, expected.input_end_sample) || !matchesTime(sample.actual_end, expected.input_end_sample)) invalid("chunk Worker result differs from its source or sample grid");
  const bytes = BigInt(sample.byte_length), pcmBytes = samples * plan.channels * 2n;
  if (bytes < pcmBytes + 44n || bytes > pcmBytes + plan.header || 4n * ((bytes + 2n) / 3n) >= BigInt(config.max_base64_bytes) || samples > plan.maxInput) invalid("actual WAV exceeds the authorized chunk limits");
  return true;
}
