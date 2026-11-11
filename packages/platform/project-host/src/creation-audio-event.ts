import { createHash } from "node:crypto";
import { CreationError } from "../../contract-runtime/src/public.js";
import { validatedObservationPcm } from "../../project-storage/src/public.js";

/** Measure exactly the event's source-aligned PCM16 frames in the immutable
 * observation WAV. Nonzero PCM proves a signal, never its semantic kind. */
export function measureCreationAudioEvent(sample: any, event: any, bytes: Buffer, sourceAssetId: string) {
  const fail = (code: string, message: string): never => { throw new CreationError(code, message); };
  if (!/^asset:sha256:[a-f0-9]{64}$/.test(sourceAssetId) || sample.source_digest !== sourceAssetId.slice("asset:sha256:".length) || typeof sample.sample_id !== "string" || !sample.sample_id || !Number.isSafeInteger(sample.stream_index) || sample.stream_index < 0) fail("CREATION_AUDIO_EVENT_SOURCE_REBOUND", "sample is not bound to the authorized source and stream");
  if (sample.detail?.kind !== "audio" || createHash("sha256").update(bytes).digest("hex") !== sample.content_digest || bytes.length !== sample.byte_length) fail("CREATION_AUDIO_EVENT_SAMPLE_REBOUND", "audio sample bytes differ from the observation");
  const pcm: Buffer = validatedObservationPcm(sample,bytes);
  const {sample_rate:rate,channels,sample_count:count}=sample.detail;
  const toFrame = (time: any) => {
    if (!Number.isSafeInteger(time?.value) || !Number.isSafeInteger(time?.timescale) || time.timescale <= 0) return fail("CREATION_AUDIO_EVENT_TIME_INVALID", "exact event time required");
    const numerator=(BigInt(time.value)*BigInt(sample.actual_start.timescale)-BigInt(sample.actual_start.value)*BigInt(time.timescale))*BigInt(rate), denominator=BigInt(time.timescale)*BigInt(sample.actual_start.timescale);
    if (numerator < 0n || numerator % denominator !== 0n) return fail("CREATION_AUDIO_EVENT_TIME_INVALID", "event must align to the observed sample grid");
    const frame=numerator/denominator; if (frame>BigInt(count)) return fail("CREATION_AUDIO_EVENT_TIME_INVALID", "event exceeds observed audio");
    return Number(frame);
  };
  const start=toFrame(event.start), end=toFrame(event.end);
  if (end<=start) return fail("CREATION_AUDIO_EVENT_TIME_INVALID", "event interval must be positive");
  const selected=pcm.subarray(start*channels*2,end*channels*2);
  return {method:"pcm16-sample-v1", source_digest:sample.source_digest, stream_index:sample.stream_index, sample_id:sample.sample_id, sample_digest:sample.content_digest, sample_rate:rate, channels, sample_count:end-start, nonzero:selected.some(value=>value!==0), pcm_digest:createHash("sha256").update(selected).digest("hex")};
}
