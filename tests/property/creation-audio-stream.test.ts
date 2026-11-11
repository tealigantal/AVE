import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { CreationAudioStreamRootV1 } from "../../contracts/generated/typescript/editorial/creation-audio-stream-root.v1.js";
import type { CreationAudioStreamChunkV1 } from "../../contracts/generated/typescript/editorial/creation-audio-stream-chunk.v1.js";
import type { CreationAudioStreamCallV1 } from "../../contracts/generated/typescript/editorial/creation-audio-stream-call.v1.js";
import type { CreationAudioStreamSettlementV1 } from "../../contracts/generated/typescript/editorial/creation-audio-stream-settlement.v1.js";
import { creationDigest } from "../../packages/platform/contract-runtime/src/creation-session.mjs";
import { observationAudioChunkRequests } from "../../packages/platform/contract-runtime/src/observation-audio-chunks.mjs";
import { encodeCreationAudioStreamChunk, verifyCreationAudioStreamIndex, validateCreationAudioStreamCall, classifyCreationAudioStreamRecovery } from "../../packages/platform/contract-runtime/src/creation-audio-stream.mjs";

const example = async <T>(name: string): Promise<T> => JSON.parse(await readFile(`contracts/examples/valid/editorial/creation-audio-stream-${name}.v1.json`, "utf8"));
const sha = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex"), fail = /(?:CREATION_AUDIO_STREAM_INVALID|AUDIO_CHUNK_PLAN_INVALID)/;
const root = await example<CreationAudioStreamRootV1>("root");
const target = { role: "transcription" as const, provider: "local", model: "whisper-small", endpoint: "http://127.0.0.1:18080", digest: "6".repeat(64) };
const deployment = { endpoint: "http://127.0.0.1:18080", digest: "d".repeat(64), routes: [target] };
root.deployment_digest = creationDigest(deployment);
const entries: CreationAudioStreamChunkV1[] = [...observationAudioChunkRequests(root.chunk_policy, root.sample_prefix)].map(({ chunk, sample }) => ({ schema_version: 1, ...chunk, sample_id: sample.sample_id, sample_content_digest: "3".repeat(64), sample_byte_length: 78 + (chunk.input_end_sample - chunk.input_start_sample) * root.chunk_policy.channels * 2, sample_policy_version: "source-pts-sampling-v1" }));
const bytes = Buffer.concat(entries.map(encodeCreationAudioStreamChunk));
root.chunk_index = { sha256: sha(bytes), byte_length: bytes.length, record_count: entries.length };
const pieces = async function* (value: Buffer, size = 7) { for (let offset = 0; offset < value.length; offset += size) yield value.subarray(offset, Math.min(offset + size, value.length)); };
let checks = 0; const options = { assertCurrent: () => { checks++; } };
const verified = await verifyCreationAudioStreamIndex(root, pieces(bytes), options);
assert.deepEqual(verified, { root_digest: creationDigest(root), index_sha256: sha(bytes), record_count: entries.length, byte_length: bytes.length });
assert.ok(checks > entries.length, "authorization rechecked during streaming");
const callerMutableRoot = structuredClone(root); let immutableAuthoritySeen = false;
await verifyCreationAudioStreamIndex(callerMutableRoot, pieces(bytes), { assertCurrent(boundRoot) {
  callerMutableRoot.request_id = "rebound-request";
  assert.equal(boundRoot.request_id, root.request_id, "authorization receives the root snapshot actually being verified");
  assert.ok(Object.isFrozen(boundRoot) && Object.isFrozen(boundRoot.chunk_policy)); immutableAuthoritySeen = true;
} });
assert.equal(immutableAuthoritySeen, true);

const rejectIndex = async (input: Buffer, change?: (copy: CreationAudioStreamRootV1) => void) => {
  const updated = structuredClone(root); updated.chunk_index = { ...updated.chunk_index, sha256: sha(input), byte_length: input.length }; change?.(updated);
  await assert.rejects(verifyCreationAudioStreamIndex(updated, pieces(input), { assertCurrent() {} }), fail);
};
await rejectIndex(Buffer.concat(entries.slice(1).map(encodeCreationAudioStreamChunk)), value => { value.chunk_index.record_count--; });
await rejectIndex(Buffer.concat([...entries].reverse().map(encodeCreationAudioStreamChunk)));
const altered = structuredClone(entries); altered[1]!.core_start_sample++;
await rejectIndex(Buffer.concat(altered.map(encodeCreationAudioStreamChunk)));
const overlap = structuredClone(entries); overlap[1]!.input_start_sample++;
await rejectIndex(Buffer.concat(overlap.map(encodeCreationAudioStreamChunk)));
const wrongId = structuredClone(entries); wrongId[0]!.sample_id = "another-0";
await rejectIndex(Buffer.concat(wrongId.map(encodeCreationAudioStreamChunk)));
const tooLarge = structuredClone(entries); tooLarge[0]!.sample_byte_length = root.chunk_policy.max_base64_bytes;
await rejectIndex(Buffer.concat(tooLarge.map(encodeCreationAudioStreamChunk)));
await rejectIndex(Buffer.from(`{"schema_version":1,"schema_version":1}\n`));
await rejectIndex(Buffer.from(`${JSON.stringify(entries[0], null, 2)}\n`));
await rejectIndex(Buffer.from([0xff, 0x0a]));
await rejectIndex(Buffer.concat([bytes, Buffer.from("extra") ]));
await assert.rejects(verifyCreationAudioStreamIndex(root, pieces(bytes), { assertCurrent() { throw new Error("REQUEST_REVOKED"); } }), /REQUEST_REVOKED/);
await assert.rejects(verifyCreationAudioStreamIndex(root, pieces(bytes), { assertCurrent: async () => {} }), fail, "async checks cannot silently escape a synchronous authorization boundary");
const abort = new AbortController(); let closed = false;
const cancelled = async function* () { try { yield bytes.subarray(0, 1); abort.abort(new Error("REQUEST_CANCELLED")); yield bytes.subarray(1); } finally { closed = true; } };
await assert.rejects(verifyCreationAudioStreamIndex(root, cancelled(), { assertCurrent() {}, signal: abort.signal }), /REQUEST_CANCELLED/); assert.equal(closed, true);

const chunk = entries[0]!, call: CreationAudioStreamCallV1 = { ...(await example<CreationAudioStreamCallV1>("call")), root_digest: creationDigest(root), chunk_digest: creationDigest(chunk), chunk_index: chunk.index, sample_id: chunk.sample_id, target };
const indexReceipt = await verifyCreationAudioStreamIndex(root, pieces(bytes), { assertCurrent() {}, selectedIndex: 0 });
assert.equal(indexReceipt.selected_chunk_index, 0); assert.equal(indexReceipt.selected_chunk_digest, creationDigest(chunk));
assert.deepEqual(indexReceipt.selected_chunk, chunk); assert.equal(Object.isFrozen(indexReceipt.selected_chunk), true);
const callOptions = { deployment, indexReceipt, assertCurrent() {} };
const bound = validateCreationAudioStreamCall(root, chunk, call, callOptions);
assert.equal(bound.call_digest, creationDigest(call));
for (const mutate of [
  (v: CreationAudioStreamCallV1) => { v.root_digest = "0".repeat(64); },
  (v: CreationAudioStreamCallV1) => { v.chunk_digest = "0".repeat(64); },
  (v: CreationAudioStreamCallV1) => { v.chunk_index++; },
  (v: CreationAudioStreamCallV1) => { v.sample_id = "other"; },
  (v: CreationAudioStreamCallV1) => { v.target.endpoint = "http://attacker.invalid"; },
]) { const changed = structuredClone(call); mutate(changed); assert.throws(() => validateCreationAudioStreamCall(root, chunk, changed, callOptions), fail); }
assert.throws(() => validateCreationAudioStreamCall(root, chunk, call, { ...callOptions, indexReceipt: structuredClone(indexReceipt) }), fail, "matching serialized values are not a current verified-index receipt");
assert.throws(() => validateCreationAudioStreamCall(root, chunk, call, { ...callOptions, indexReceipt: verified }), fail, "a full-index receipt without a selected chunk is not membership proof");
const otherRoot = { ...root, created_at: "2026-11-11T00:00:03Z" }, reboundCall = { ...call, root_digest: creationDigest(otherRoot) };
assert.throws(() => validateCreationAudioStreamCall(otherRoot, chunk, reboundCall, callOptions), fail, "a selection cannot be rebound to another root");
const changedChunk = { ...chunk, sample_content_digest: "0".repeat(64) }, reboundChunkCall = { ...call, chunk_digest: creationDigest(changedChunk) };
assert.throws(() => validateCreationAudioStreamCall(root, changedChunk, reboundChunkCall, callOptions), fail, "a selection cannot be rebound to another chunk");
await assert.rejects(verifyCreationAudioStreamIndex(root, pieces(bytes), { assertCurrent() {}, selectedIndex: entries.length }), fail);
assert.throws(() => validateCreationAudioStreamCall(root, chunk, call, { ...callOptions, deployment: { ...deployment, digest: "0".repeat(64) } }), fail);
assert.throws(() => validateCreationAudioStreamCall(root, chunk, call, { ...callOptions, assertCurrent() { throw new Error("REQUEST_REVOKED"); } }), /REQUEST_REVOKED/);

const settlement: CreationAudioStreamSettlementV1 = { ...(await example<CreationAudioStreamSettlementV1>("settlement")), call_id: call.call_id, call_digest: bound.call_digest, root_digest: bound.root_digest };
let lookedUp = 0;
assert.equal(await classifyCreationAudioStreamRecovery(root, chunk, call, null, callOptions), "resolve-unknown");
assert.equal(await classifyCreationAudioStreamRecovery(root, chunk, call, { ...settlement, status: "unknown", usage: null, response_ref: null, reason_code: "DELIVERY_UNCONFIRMED" }, callOptions), "resolve-unknown");
assert.equal(await classifyCreationAudioStreamRecovery(root, chunk, call, { ...settlement, status: "failed", response_ref: null, reason_code: "PROVIDER_FAILED" }, callOptions), "retry-only-explicitly");
assert.equal(await classifyCreationAudioStreamRecovery(root, chunk, call, { ...settlement, status: "cancelled", response_ref: null, reason_code: "REQUEST_CANCELLED" }, callOptions), "cancelled");
await assert.rejects(classifyCreationAudioStreamRecovery(root, chunk, call, settlement, callOptions), fail);
await assert.rejects(classifyCreationAudioStreamRecovery(root, chunk, call, settlement, { ...callOptions, verifyResponse: async () => false }), fail);
await assert.rejects(classifyCreationAudioStreamRecovery(root, chunk, call, settlement, { ...callOptions, verifyResponse: async () => { throw new Error("RESPONSE_HASH_MISMATCH"); } }), /RESPONSE_HASH_MISMATCH/);
assert.equal(await classifyCreationAudioStreamRecovery(root, chunk, call, settlement, { ...callOptions, verifyResponse: async ref => { lookedUp++; assert.deepEqual(ref, settlement.response_ref); return true; } }), "reuse-verified-response");
assert.equal(lookedUp, 1, "only a response requires verified durable content");
let authorized = true;
await assert.rejects(classifyCreationAudioStreamRecovery(root, chunk, call, settlement, { ...callOptions, assertCurrent() { if (!authorized) throw new Error("REQUEST_REVOKED"); }, verifyResponse: async () => { authorized = false; return true; } }), /REQUEST_REVOKED/, "revocation during response verification prevents reuse");
const mutableCall = structuredClone(call), originalCall = structuredClone(call);
assert.equal(await classifyCreationAudioStreamRecovery(root, chunk, mutableCall, settlement, { ...callOptions, verifyResponse: async (_ref, reserved) => { mutableCall.target.endpoint = "http://changed.invalid"; assert.deepEqual(reserved, originalCall, "response verification receives the previously validated call snapshot"); return true; } }), "reuse-verified-response");
await assert.rejects(classifyCreationAudioStreamRecovery(root, chunk, call, { ...settlement, usage: { input: 10, output: 5, total: 14 } }, { ...callOptions, verifyResponse: async () => true }), fail);
assert.equal(await classifyCreationAudioStreamRecovery(root, chunk, call, { ...settlement, status: "unknown", response_ref: null, reason_code: "DELIVERY_UNCONFIRMED" }, callOptions), "resolve-unknown", "a confirmed usage does not make an unknown outcome safe to retry");
await assert.rejects(classifyCreationAudioStreamRecovery(root, chunk, call, { ...settlement, call_digest: "0".repeat(64) }, callOptions), fail);

// Exercise a long ordered index without creating a list or concatenating the
// index in memory. Selection is returned only after its final byte is checked.
const largeRoot = structuredClone(root), largeCount = 10000;
largeRoot.chunk_policy = { ...root.chunk_policy, start_sample: 0, end_sample: 12000 * largeCount, context_samples: 0, max_core_samples: 12000, max_duration_seconds: 1 };
const longEntries = function* () {
  for (const { chunk, sample } of observationAudioChunkRequests(largeRoot.chunk_policy, largeRoot.sample_prefix)) yield { schema_version: 1 as const, ...chunk, sample_id: sample.sample_id, sample_content_digest: "3".repeat(64), sample_byte_length: 78 + (chunk.input_end_sample - chunk.input_start_sample) * 2, sample_policy_version: "source-pts-sampling-v1" as const };
};
const longHash = createHash("sha256"); let longBytes = 0, lastEntry: CreationAudioStreamChunkV1 | undefined;
for (const entry of longEntries()) { const line = encodeCreationAudioStreamChunk(entry); longHash.update(line); longBytes += line.length; lastEntry = entry; }
largeRoot.chunk_index = { sha256: longHash.digest("hex"), byte_length: longBytes, record_count: largeCount };
const streamedLong = async function* () { for (const entry of longEntries()) yield encodeCreationAudioStreamChunk(entry); };
const selectedLast = await verifyCreationAudioStreamIndex(largeRoot, streamedLong(), { assertCurrent() {}, selectedIndex: largeCount - 1 });
assert.equal(selectedLast.record_count, largeCount); assert.equal(selectedLast.selected_chunk_digest, creationDigest(lastEntry));
const lastCall = { ...call, root_digest: creationDigest(largeRoot), chunk_index: lastEntry!.index, chunk_digest: creationDigest(lastEntry), sample_id: lastEntry!.sample_id };
assert.equal(validateCreationAudioStreamCall(largeRoot, lastEntry!, lastCall, { deployment, indexReceipt: selectedLast, assertCurrent() {} }).chunk_digest, creationDigest(lastEntry));
console.log("Audio stream index, immutable physical calls and failure-closed recovery passed");
