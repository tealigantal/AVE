export type ObservationAudioChunkConfiguration = Readonly<{
  start_sample: number; end_sample: number; sample_rate: number; channels: number;
  context_samples: number; max_core_samples: number; max_duration_seconds: number;
  max_base64_bytes: number; wav_header_bytes: number;
}>;
export type ObservationAudioChunk = Readonly<{
  index: number; core_start_sample: number; core_end_sample: number;
  input_start_sample: number; input_end_sample: number;
}>;
export function planObservationAudioChunks(config: ObservationAudioChunkConfiguration): Generator<ObservationAudioChunk>;
export function validateObservationAudioChunks(config: ObservationAudioChunkConfiguration, chunks: Iterable<ObservationAudioChunk>): true;
export type ObservationAudioChunkRequest = Readonly<{
  chunk: ObservationAudioChunk;
  sample: Readonly<{ sample_id: string; kind: "audio"; start: Readonly<{ schema_version: 1; value: number; timescale: number }>; end: Readonly<{ schema_version: 1; value: number; timescale: number }> }>;
}>;
export function observationAudioChunkRequests(config: ObservationAudioChunkConfiguration, prefix: string): Generator<ObservationAudioChunkRequest>;
export function validateObservationAudioChunkResult(config: ObservationAudioChunkConfiguration, prefix: string, chunk: ObservationAudioChunk, sample: unknown, sourceDigest: string, streamIndex: number): true;
