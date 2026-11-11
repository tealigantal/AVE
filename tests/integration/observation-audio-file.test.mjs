import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { openVerifiedObservationAudioFile } from "../../packages/platform/project-storage/src/observation-audio-file.mjs";
import { validatedObservationPcm } from "../../packages/platform/project-storage/src/project-storage.mjs";

const dir = await mkdtemp(resolve(tmpdir(), "ave-observation-pcm-"));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const streamedHash = async path => { const hash = createHash("sha256"); for await (const block of createReadStream(path)) hash.update(block); return hash.digest("hex"); };
const header = (rate, channels, count) => {
  const pcm = count * channels * 2, bytes = Buffer.alloc(44);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(36 + pcm, 4); bytes.write("WAVEfmt ", 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(channels, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * channels * 2, 28); bytes.writeUInt16LE(channels * 2, 32); bytes.writeUInt16LE(16, 34); bytes.write("data", 36); bytes.writeUInt32LE(pcm, 40); return bytes;
};
const descriptor = (bytes, digest, rate, channels, count, origin = 0) => ({ sample_id: "test-sample", byte_length: bytes, content_digest: digest, requested_start: { schema_version: 1, value: origin, timescale: rate }, actual_start: { schema_version: 1, value: origin, timescale: rate }, requested_end: { schema_version: 1, value: origin + count, timescale: rate }, actual_end: { schema_version: 1, value: origin + count, timescale: rate }, detail: { kind: "audio", mime_type: "audio/wav", sample_rate: rate, channels, sample_count: count } });
const rejectCode = /CREATION_OBSERVATION_AUDIO_REBOUND/;
try {
  const path = resolve(dir, "sample.wav"), rate = 48000, channels = 2, count = 120000;
  const pcm = Buffer.alloc(count * channels * 2);
  for (let i = 0; i < pcm.length; i += 4) { pcm.writeInt16LE((i / 4) % 32767, i); pcm.writeInt16LE(-((i / 4) % 32767), i + 2); }
  const bytes = Buffer.concat([header(rate, channels, count), pcm]); await writeFile(path, bytes);
  const sample = descriptor(bytes.length, sha(bytes), rate, channels, count, 48000);
  await assert.rejects(openVerifiedObservationAudioFile(path, sample, { assertCurrent: async () => {} }), rejectCode);
  assert.deepEqual(validatedObservationPcm(sample, bytes), pcm, "legacy PCM verifier remains byte-identical");
  let checks = 0;
  const file = await openVerifiedObservationAudioFile(path, sample, { assertCurrent: () => { checks++; } });
  const encodedSize = 4 * Math.ceil(bytes.length / 3);
  await assert.rejects(file.readModelMedia(encodedSize), rejectCode);
  const media = await file.readModelMedia(encodedSize + 1);
  assert.equal(media.sample_id, sample.sample_id); assert.equal(media.content_digest, sample.content_digest); assert.deepEqual(Buffer.from(media.data_base64, "base64"), bytes);
  for (const [first, last] of [[0, 1], [4, 27], [16381, 32783], [count - 1, count], [0, count]]) {
    const expected = pcm.subarray(first * channels * 2, last * channels * 2);
    assert.deepEqual(await file.measure(first, last), { sample_count: last - first, nonzero: expected.some(value => value !== 0), pcm_digest: sha(expected) });
  }
  assert.ok(checks > 10, "source authorization is rechecked during verification and reading");
  for (const [first, last] of [[0, 0], [-1, 3], [0, count + 1], [0.5, 2]]) await assert.rejects(file.measure(first, last), rejectCode);
  await file.close(); await file.close(); await assert.rejects(file.measure(0, 1), rejectCode);

  const mutable = structuredClone(sample), pinnedId = mutable.sample_id, pinnedDigest = mutable.content_digest;
  let rebound = false;
  const pinned = await openVerifiedObservationAudioFile(path, mutable, { assertCurrent() { if (!rebound) { rebound = true; mutable.sample_id = "rebound"; mutable.content_digest = "0".repeat(64); mutable.byte_length = 1; } } });
  const pinnedMedia = await pinned.readModelMedia(encodedSize + 1);
  assert.equal(pinnedMedia.sample_id, pinnedId); assert.equal(pinnedMedia.content_digest, pinnedDigest); assert.deepEqual(Buffer.from(pinnedMedia.data_base64, "base64"), bytes);
  await pinned.close();

  for (const change of [
    value => { value.content_digest = "0".repeat(64); }, value => { value.byte_length++; },
    value => { value.detail.channels = 1; }, value => { value.detail.sample_count--; },
    value => { value.actual_start.value++; }, value => { value.actual_end.value--; },
  ]) { const changed = structuredClone(sample); change(changed); await assert.rejects(openVerifiedObservationAudioFile(path, changed, { assertCurrent() {} }), rejectCode); }
  const revoked = new Error("REQUEST_REVOKED"), controller = new AbortController(); let assertions = 0;
  await assert.rejects(openVerifiedObservationAudioFile(path, sample, { signal: controller.signal, assertCurrent() { if (++assertions === 4) controller.abort(revoked); } }), error => error === revoked);
  let authorized = true;
  const revokeWhileHeld = await openVerifiedObservationAudioFile(path, sample, { assertCurrent() { if (!authorized) throw revoked; } });
  authorized = false; await assert.rejects(revokeWhileHeld.measure(0, 1), error => error === revoked); await assert.rejects(revokeWhileHeld.readModelMedia(encodedSize + 1), error => error === revoked); await revokeWhileHeld.close();
  const held = await openVerifiedObservationAudioFile(path, sample, { assertCurrent() {} });
  const changed = await open(path, "r+"); await changed.write(Buffer.from([255]), 0, 1, 44); await changed.close();
  await assert.rejects(held.measure(0, 1), rejectCode); await held.close();

  // A sample larger than the current per-observation inline budget is verified
  // from a sparse file with fixed read buffers; it is never sent to a model.
  const largePath = resolve(dir, "large.wav"), largeCount = 18 * 1024 * 1024, largeBytes = 44 + largeCount * 2;
  const output = await open(largePath, "wx"); await output.write(header(48000, 1, largeCount)); await output.truncate(largeBytes); await output.close();
  const large = descriptor(largeBytes, await streamedHash(largePath), 48000, 1, largeCount);
  const largeFile = await openVerifiedObservationAudioFile(largePath, large, { assertCurrent() {} });
  await assert.rejects(largeFile.readModelMedia(10_000_000), rejectCode, "a long file cannot bypass the explicit model payload limit");
  const last = await largeFile.measure(largeCount - 100, largeCount); assert.equal(last.nonzero, false); assert.equal(last.pcm_digest, sha(Buffer.alloc(200)));
  await largeFile.close();
  assert.equal((await readFile(path)).length, bytes.length, "verification never writes or truncates its source");
  console.log("Observation audio file: exact PCM proof, permission, tampering, bounded large-file reads and cleanup passed");
} finally { await rm(dir, { recursive: true, force: true }); }
