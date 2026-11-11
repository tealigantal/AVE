import type { CreationAudioStreamRootV1 } from "../../../../contracts/generated/typescript/editorial/creation-audio-stream-root.v1.js";
import type { CreationAudioStreamChunkV1 } from "../../../../contracts/generated/typescript/editorial/creation-audio-stream-chunk.v1.js";
import type { CreationAudioStreamCallV1 } from "../../../../contracts/generated/typescript/editorial/creation-audio-stream-call.v1.js";
import type { CreationAudioStreamSettlementV1 } from "../../../../contracts/generated/typescript/editorial/creation-audio-stream-settlement.v1.js";

export type AudioStreamIndexReceipt = Readonly<{ root_digest: string; index_sha256: string; record_count: number; byte_length: number; selected_chunk_index?: number; selected_chunk_digest?: string; selected_chunk?: Readonly<CreationAudioStreamChunkV1> }>;
export type AudioStreamCallValidation = Readonly<{ deployment: unknown; indexReceipt: AudioStreamIndexReceipt; assertCurrent: (root: Readonly<CreationAudioStreamRootV1>) => void }>;
export function encodeCreationAudioStreamChunk(chunk: CreationAudioStreamChunkV1): Buffer;
export function verifyCreationAudioStreamIndex(root: CreationAudioStreamRootV1, blocks: AsyncIterable<Uint8Array>, options: Readonly<{ assertCurrent: (root: Readonly<CreationAudioStreamRootV1>) => void; signal?: AbortSignal; selectedIndex?: number }>): Promise<AudioStreamIndexReceipt>;
export function validateCreationAudioStreamCall(root: CreationAudioStreamRootV1, chunk: CreationAudioStreamChunkV1, call: CreationAudioStreamCallV1, options: AudioStreamCallValidation): Readonly<{ root_digest: string; chunk_digest: string; call_digest: string }>;
export function classifyCreationAudioStreamRecovery(root: CreationAudioStreamRootV1, chunk: CreationAudioStreamChunkV1, call: CreationAudioStreamCallV1, settlement: CreationAudioStreamSettlementV1 | null, options: AudioStreamCallValidation & Readonly<{ verifyResponse?: (ref: Readonly<{ object_ref_id: string; digest: string }>, call: CreationAudioStreamCallV1) => Promise<boolean> | boolean }>): Promise<"resolve-unknown" | "cancelled" | "retry-only-explicitly" | "reuse-verified-response">;
