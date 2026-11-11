import { createHash } from "node:crypto";
import { creationDigest } from "./creation-session.mjs";
import { planObservationAudioChunks, validateObservationAudioChunkResult } from "./observation-audio-chunks.mjs";
import { creationAudioStreamRootV1Validator, creationAudioStreamChunkV1Validator, creationAudioStreamCallV1Validator, creationAudioStreamSettlementV1Validator } from "./generated/creative-context-validators.mjs";

const invalid = message => { throw new Error(`CREATION_AUDIO_STREAM_INVALID: ${message}`); };
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const maxLineBytes = 16 * 1024, maxBlockBytes = 64 * 1024, maxBase64Bytes = 32 * 1024 * 1024;
const freezeTree = value => { if (value && typeof value === "object") { for (const child of Object.values(value)) freezeTree(child); Object.freeze(value); } return value; };
const check = (assertCurrent, signal, root) => {
  if (signal?.aborted) throw signal.reason;
  const result = assertCurrent(root);
  if (result && typeof result.then === "function") { Promise.resolve(result).catch(() => {}); invalid("authorization checks must be synchronous"); }
  if (result === false) invalid("authorization check did not confirm current authority");
  if (signal?.aborted) throw signal.reason;
};
// A fresh full-index verification is required after restart. A caller cannot
// manufacture a membership proof by supplying a matching string alone.
const verifiedIndexSelections = new WeakMap();

/** Each index line is canonical UTF-8 JSON plus a newline. It does not contain
 * the root digest: the root instead commits to the exact bytes, avoiding a
 * circular identity. */
export function encodeCreationAudioStreamChunk(chunk) {
  if (!creationAudioStreamChunkV1Validator(chunk)) invalid("invalid chunk contract");
  const bytes = Buffer.from(`${JSON.stringify(canonical(chunk))}\n`, "utf8");
  if (bytes.length > maxLineBytes) invalid("chunk index line exceeds the bounded parser limit");
  return bytes;
}

function rootIdentity(root) {
  if (!creationAudioStreamRootV1Validator(root)) invalid("invalid root contract");
  if (root.chunk_policy.wav_header_bytes < 44 || root.chunk_policy.max_base64_bytes > maxBase64Bytes) invalid("invalid bounded PCM or model payload policy");
  // The planner checks all integer, duration and context constraints without
  // materializing the whole timeline.
  planObservationAudioChunks(root.chunk_policy).next();
  return creationDigest(root);
}

function checkChunk(root, chunk) {
  if (!creationAudioStreamChunkV1Validator(chunk)) invalid("invalid chunk contract");
  const wire = { index: chunk.index, core_start_sample: chunk.core_start_sample, core_end_sample: chunk.core_end_sample, input_start_sample: chunk.input_start_sample, input_end_sample: chunk.input_end_sample };
  const rate = root.chunk_policy.sample_rate, samples = chunk.input_end_sample - chunk.input_start_sample;
  const start = { schema_version: 1, value: chunk.input_start_sample, timescale: rate }, end = { schema_version: 1, value: chunk.input_end_sample, timescale: rate };
  validateObservationAudioChunkResult(root.chunk_policy, root.sample_prefix, wire, { schema_version: 1, sample_id: chunk.sample_id, source_digest: root.asset_id.slice("asset:sha256:".length), stream_index: root.stream_index, content_digest: chunk.sample_content_digest, byte_length: chunk.sample_byte_length, policy_version: chunk.sample_policy_version, requested_start: start, requested_end: end, actual_start: start, actual_end: end, detail: { kind: "audio", mime_type: "audio/wav", sample_rate: rate, channels: root.chunk_policy.channels, sample_count: samples } }, root.asset_id.slice("asset:sha256:".length), root.stream_index);
  return wire;
}

/** Fully verify an ordered chunk index in fixed memory. No record is returned
 * before the whole file, hash, count, and complete core coverage are verified.
 * The caller supplies a pinned source stream and an authorization check. */
export async function verifyCreationAudioStreamIndex(value, blocks, { assertCurrent, signal, selectedIndex } = {}) {
  if (typeof assertCurrent !== "function" || !blocks || typeof blocks[Symbol.asyncIterator] !== "function") invalid("authorized asynchronous index stream required");
  const root = freezeTree(structuredClone(value)), digest = rootIdentity(root), expected = planObservationAudioChunks(root.chunk_policy), hash = createHash("sha256");
  if (selectedIndex !== undefined && (!Number.isSafeInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= root.chunk_index.record_count)) invalid("selected chunk index is outside the root");
  let pending = Buffer.alloc(0), total = 0, count = 0, selectedDigest, selectedChunk;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  check(assertCurrent, signal, root);
  for await (const raw of blocks) {
    check(assertCurrent, signal, root);
    if (!(raw instanceof Uint8Array) || raw.byteLength === 0 || raw.byteLength > maxBlockBytes) invalid("invalid bounded index block");
    const block = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength); total += block.length;
    if (!Number.isSafeInteger(total) || total > root.chunk_index.byte_length) invalid("index byte length exceeds root");
    hash.update(block); let offset = 0;
    while (offset < block.length) {
      const boundary = block.indexOf(10, offset), end = boundary < 0 ? block.length : boundary;
      const part = block.subarray(offset, end);
      if (pending.length + part.length > maxLineBytes - 1) invalid("chunk index line exceeds bounded parser limit");
      pending = Buffer.concat([pending, part]);
      if (boundary < 0) break;
      let chunk;
      try { chunk = JSON.parse(decoder.decode(pending)); } catch (cause) { throw new Error("CREATION_AUDIO_STREAM_INVALID: invalid index JSON or UTF-8", { cause }); }
      const encoded = encodeCreationAudioStreamChunk(chunk);
      if (!encoded.subarray(0, -1).equals(pending)) invalid("chunk index must use canonical JSON without duplicate keys");
      const planned = expected.next();
      if (planned.done || creationDigest(checkChunk(root, chunk)) !== creationDigest(planned.value) || chunk.index !== count) invalid("chunk order or exact source coverage changed");
      if (chunk.index === selectedIndex) { selectedDigest = creationDigest(chunk); selectedChunk = freezeTree(structuredClone(chunk)); }
      count++; if (!Number.isSafeInteger(count) || count > root.chunk_index.record_count) invalid("too many index records");
      pending = Buffer.alloc(0); offset = boundary + 1;
    }
  }
  check(assertCurrent, signal, root);
  if (pending.length || total !== root.chunk_index.byte_length || count !== root.chunk_index.record_count || !expected.next().done || hash.digest("hex") !== root.chunk_index.sha256) invalid("incomplete or rebound chunk index");
  if (selectedIndex !== undefined && !selectedDigest) invalid("selected chunk is absent from the verified index");
  const receipt = Object.freeze({ root_digest: digest, index_sha256: root.chunk_index.sha256, record_count: count, byte_length: total, ...(selectedIndex === undefined ? {} : { selected_chunk_index: selectedIndex, selected_chunk_digest: selectedDigest, selected_chunk: selectedChunk }) });
  if (selectedIndex !== undefined) verifiedIndexSelections.set(receipt, { root_digest: digest, index_sha256: root.chunk_index.sha256, chunk_index: selectedIndex, chunk_digest: selectedDigest });
  return receipt;
}

/** A selected-index receipt is process-local and proves complete index
 * verification. Authorization and physical-send reservation remain Host
 * responsibilities; reopening must verify the index again. */
export function validateCreationAudioStreamCall(value, chunkValue, callValue, { deployment, indexReceipt, assertCurrent } = {}) {
  if (typeof assertCurrent !== "function") invalid("current authorization check required");
  const root = freezeTree(structuredClone(value)), chunk = structuredClone(chunkValue), call = structuredClone(callValue); check(assertCurrent, undefined, root);
  const digest = rootIdentity(root), chunkDigest = creationDigest(chunk), selection = indexReceipt && verifiedIndexSelections.get(indexReceipt); checkChunk(root, chunk);
  if (!creationAudioStreamCallV1Validator(call) || chunk.index >= root.chunk_index.record_count || !selection || selection.root_digest !== digest || selection.index_sha256 !== root.chunk_index.sha256 || selection.chunk_index !== chunk.index || selection.chunk_digest !== chunkDigest || call.root_digest !== digest || call.chunk_digest !== chunkDigest || call.chunk_index !== chunk.index || call.sample_id !== chunk.sample_id || !deployment || creationDigest(deployment) !== root.deployment_digest || !Array.isArray(deployment.routes) || !deployment.routes.some(route => creationDigest(route) === creationDigest(call.target))) invalid("call does not match the verified root, index, source or authorized route");
  check(assertCurrent, undefined, root); return Object.freeze({ root_digest: digest, chunk_digest: chunkDigest, call_digest: creationDigest(call) });
}

/** An unknown or unsettled physical send cannot be automatically repeated.
 * A response is reusable only after the Host verifies its durable object and
 * semantic content through `verifyResponse`; no remote model is called here. */
export async function classifyCreationAudioStreamRecovery(value, chunk, call, settlementValue, options = {}) {
  // Callers retain their objects. Bind asynchronous response verification to
  // the reservation that was validated, even if an object is later mutated.
  const root = freezeTree(structuredClone(value)), reserved = structuredClone(call);
  const bound = validateCreationAudioStreamCall(root, chunk, reserved, options);
  if (settlementValue === null) return "resolve-unknown";
  const settlement = structuredClone(settlementValue);
  if (!creationAudioStreamSettlementV1Validator(settlement) || settlement.call_id !== reserved.call_id || settlement.call_digest !== bound.call_digest || settlement.root_digest !== bound.root_digest || Date.parse(settlement.completed_at) < Date.parse(reserved.dispatch_committed_at)) invalid("settlement does not bind the reserved physical call");
  if (settlement.usage && (!Number.isSafeInteger(settlement.usage.input + settlement.usage.output) || settlement.usage.total !== settlement.usage.input + settlement.usage.output)) invalid("settled usage is inconsistent");
  check(options.assertCurrent, undefined, root);
  if (settlement.status === "unknown") return "resolve-unknown";
  if (settlement.status === "cancelled") return "cancelled";
  if (settlement.status === "failed") return "retry-only-explicitly";
  if (typeof options.verifyResponse !== "function") invalid("durable response validation required before reuse");
  if (await options.verifyResponse(structuredClone(settlement.response_ref), reserved) !== true) invalid("durable response validation did not confirm the response");
  check(options.assertCurrent, undefined, root); return "reuse-verified-response";
}
