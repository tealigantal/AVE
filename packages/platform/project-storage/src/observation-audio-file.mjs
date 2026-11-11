import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";

// The caller owns the project authorization and validates that `path` denotes
// the intended staged/object-store sample. This helper never changes files or
// project state. A fixed handle, complete hash and exact sample grid bind every
// later read to the same verified PCM16 WAV.
const BLOCK_BYTES = 64 * 1024;
const invalid = message => { throw new Error(`CREATION_OBSERVATION_AUDIO_REBOUND: ${message}`); };
const isInteger = value => Number.isSafeInteger(value) && value >= 0;
const time = value => value && value.schema_version === 1 && isInteger(value.value) && Number.isSafeInteger(value.timescale) && value.timescale > 0;
const timeEqual = (a, b) => BigInt(a.value) * BigInt(b.timescale) === BigInt(b.value) * BigInt(a.timescale);
const identity = stat => [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].join(":");

export async function openVerifiedObservationAudioFile(path, sample, { assertCurrent, signal } = {}) {
  if (typeof path !== "string" || !path || typeof assertCurrent !== "function" || !sample || sample.detail?.kind !== "audio" || sample.detail.mime_type !== "audio/wav" || ![sample.detail.sample_rate, sample.detail.channels, sample.detail.sample_count].every(value => Number.isSafeInteger(value) && value > 0) || !Number.isSafeInteger(sample.byte_length) || sample.byte_length < 44 || typeof sample.content_digest !== "string" || !/^[a-f0-9]{64}$/.test(sample.content_digest) || ![sample.actual_start, sample.actual_end, sample.requested_start, sample.requested_end].every(time)) invalid("sample identity or authorization callback is missing");
  // The caller retains its descriptor. Snapshot all identity-bearing fields
  // before the first callback/await so later mutation cannot rebind a read.
  const { sample_rate: rate, channels, sample_count: count } = sample.detail;
  const expectedLength = sample.byte_length, expectedDigest = sample.content_digest, expectedSampleId = sample.sample_id;
  const first = BigInt(sample.actual_start.value) * BigInt(rate), last = BigInt(sample.actual_end.value) * BigInt(rate);
  if (first % BigInt(sample.actual_start.timescale) || last % BigInt(sample.actual_end.timescale) || last / BigInt(sample.actual_end.timescale) - first / BigInt(sample.actual_start.timescale) !== BigInt(count) || !timeEqual(sample.actual_start, sample.requested_start) || !timeEqual(sample.actual_end, sample.requested_end) || !Number.isSafeInteger(count * channels * 2)) invalid("sample grid does not match the actual source range");
  const checkAuthorization = () => {
    if (signal?.aborted) throw signal.reason;
    const result = assertCurrent();
    if (result && typeof result.then === "function") { Promise.resolve(result).catch(() => {}); invalid("authorization checks must be synchronous"); }
    if (result === false) invalid("authorization check did not confirm current authority");
    if (signal?.aborted) throw signal.reason;
  };
  checkAuthorization();
  const beforePath = await lstat(path, { bigint: true });
  if (!beforePath.isFile() || beforePath.isSymbolicLink()) invalid("sample is not a regular file");
  const handle = await open(path, process.platform === "win32" ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NOFOLLOW);
  let closed = false, failure, succeeded = false, closeTask;
  const close = () => { closed = true; return closeTask ??= handle.close(); };
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || identity(before) !== identity(beforePath) || before.size !== BigInt(expectedLength)) invalid("sample file identity or length changed");
    const check = async () => {
      checkAuthorization();
      if (closed) invalid("sample handle is closed");
      const current = await handle.stat({ bigint: true }), currentPath = await lstat(path, { bigint: true });
      if (!current.isFile() || !currentPath.isFile() || currentPath.isSymbolicLink() || identity(current) !== identity(before) || identity(currentPath) !== identity(before)) invalid("sample changed while reading");
      checkAuthorization();
    };
    const exact = async (position, length) => {
      const buffer = Buffer.alloc(length); let offset = 0;
      while (offset < length) { await check(); const result = await handle.read(buffer, offset, length - offset, position + offset); if (!result.bytesRead) invalid("sample file is truncated"); offset += result.bytesRead; }
      await check(); return buffer;
    };
    const header = await exact(0, 12);
    if (header.toString("ascii", 0, 4) !== "RIFF" || header.toString("ascii", 8, 12) !== "WAVE" || header.readUInt32LE(4) + 8 !== expectedLength) invalid("WAV container is inconsistent");
    let position = 12, formatSeen = false, dataOffset = -1;
    while (position < expectedLength) {
      if (position + 8 > expectedLength) invalid("WAV chunk header is truncated");
      const header = await exact(position, 8), kind = header.toString("ascii", 0, 4), size = header.readUInt32LE(4), start = position + 8;
      if (start + size > expectedLength) invalid("WAV chunk exceeds the file");
      if (kind === "fmt ") {
        if (formatSeen || size < 16) invalid("WAV format is ambiguous");
        const format = await exact(start, 16);
        if (format.readUInt16LE(0) !== 1 || format.readUInt16LE(2) !== channels || format.readUInt32LE(4) !== rate || format.readUInt32LE(8) !== rate * channels * 2 || format.readUInt16LE(12) !== channels * 2 || format.readUInt16LE(14) !== 16) invalid("WAV format does not match PCM16 sample geometry");
        formatSeen = true;
      } else if (kind === "data") {
        if (dataOffset !== -1 || size !== count * channels * 2) invalid("WAV PCM length or data chunk is invalid");
        dataOffset = start;
      }
      position = start + size + size % 2;
    }
    if (position !== expectedLength || !formatSeen || dataOffset < 0) invalid("WAV format or PCM data is missing");
    const hash = createHash("sha256"), buffer = Buffer.alloc(BLOCK_BYTES);
    for (let offset = 0; offset < expectedLength;) {
      await check(); const length = Math.min(buffer.length, expectedLength - offset), read = await handle.read(buffer, 0, length, offset);
      if (!read.bytesRead) invalid("sample file is truncated");
      hash.update(buffer.subarray(0, read.bytesRead)); offset += read.bytesRead;
    }
    await check();
    if (hash.digest("hex") !== expectedDigest) invalid("sample hash changed");
    const verified = Object.freeze({
      sample_count: count, sample_rate: rate, channels,
      async measure(firstSample, endSample) {
        if (!isInteger(firstSample) || !isInteger(endSample) || firstSample >= endSample || endSample > count) invalid("requested PCM sample range is invalid");
        const hash = createHash("sha256"), buffer = Buffer.alloc(BLOCK_BYTES), frameBytes = channels * 2;
        let position = dataOffset + firstSample * frameBytes, remaining = (endSample - firstSample) * frameBytes, nonzero = false;
        while (remaining) {
          await check(); const length = Math.min(buffer.length, remaining), read = await handle.read(buffer, 0, length, position);
          if (!read.bytesRead) invalid("PCM sample data was truncated");
          const part = buffer.subarray(0, read.bytesRead); hash.update(part);
          if (!nonzero) nonzero = part.some(value => value !== 0);
          position += read.bytesRead; remaining -= read.bytesRead;
        }
        await check(); return { sample_count: endSample - firstSample, nonzero, pcm_digest: hash.digest("hex") };
      },
      async readModelMedia(maxBase64Bytes) {
        // The existing gateway accepts one bounded inline sample per physical
        // call. Do not allow a caller to use this bridge to recreate an
        // unbounded whole-source allocation.
        if (!Number.isSafeInteger(maxBase64Bytes) || maxBase64Bytes <= 0 || maxBase64Bytes > 32 * 1024 * 1024 || typeof expectedSampleId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(expectedSampleId) || 4 * Math.ceil(expectedLength / 3) >= maxBase64Bytes) invalid("model sample exceeds its explicit bounded payload or lacks identity");
        const data = Buffer.alloc(expectedLength), hash = createHash("sha256");
        for (let offset = 0; offset < data.length;) {
          await check(); const length = Math.min(BLOCK_BYTES, data.length - offset), read = await handle.read(data, offset, length, offset);
          if (!read.bytesRead) invalid("model sample was truncated");
          hash.update(data.subarray(offset, offset + read.bytesRead)); offset += read.bytesRead;
        }
        await check(); if (hash.digest("hex") !== expectedDigest) invalid("model sample changed after validation");
        return { sample_id: expectedSampleId, mime_type: "audio/wav", data_base64: data.toString("base64"), content_digest: expectedDigest };
      },
      close,
    });
    succeeded = true;
    return verified;
  } catch (error) { failure = error; throw error; }
  finally { if (!succeeded) { try { await close(); } catch (error) { throw new AggregateError([failure, error], "audio verification and handle cleanup failed", { cause: failure }); } } }
}
