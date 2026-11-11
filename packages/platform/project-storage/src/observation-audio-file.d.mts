export type VerifiedObservationAudioFile = Readonly<{
  sample_count: number;
  sample_rate: number;
  channels: number;
  measure(firstSample: number, endSample: number): Promise<Readonly<{ sample_count: number; nonzero: boolean; pcm_digest: string }>>;
  readModelMedia(maxBase64Bytes: number): Promise<Readonly<{ sample_id: string; mime_type: "audio/wav"; data_base64: string; content_digest: string }>>;
  close(): Promise<void>;
}>;

/** The caller must establish path/source authority and recheck it through
 * assertCurrent; the helper validates a pinned WAV and never writes state. */
export function openVerifiedObservationAudioFile(path: string, sample: unknown, options: Readonly<{ assertCurrent: () => void; signal?: AbortSignal }>): Promise<VerifiedObservationAudioFile>;
