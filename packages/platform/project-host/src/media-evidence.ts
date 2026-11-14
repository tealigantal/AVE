import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { creationDigest, mediaProbeResultV2Validator, mediaSceneResultV2Validator } from "../../contract-runtime/src/public.js";

type Control = Readonly<{ assertCurrent(): void; completeReadOnly?: boolean }>;
type Scene = { schema_version: 2; path: string; receipt: { schema_version: 1; header: { schema_version: 1; source_digest: string; stream_index: number; time_base: { numerator: number; denominator: number }; threshold: number; policy_version: string; ffmpeg_version: string }; frame_count: number; start_pts: number; end_pts: number; byte_length: number; sha256: string }; span_count: number };
type Probe = { schema_version: 2; path: string; source_digest: string; byte_length: number; sha256: string; record_count: number; media_kind: "image" | "video" | "audio"; metadata_json: string; policy_version: string };
type FileIdentity = { dev: bigint; ino: bigint; size: bigint; mtimeNs: bigint; ctimeNs: bigint };
const identity = (s: FileIdentity) => `${process.platform === "win32" ? "windows" : s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`;
const invalid = (message: string): never => { throw new Error(`MEDIA_EVIDENCE_INVALID: ${message}`); };
const safe = (value: unknown, minimum = 0): value is number => Number.isSafeInteger(value) && (value as number) >= minimum;

async function* lines(handle: Awaited<ReturnType<typeof open>>, check: () => Promise<void>) {
  const buffer = Buffer.alloc(64 * 1024); let position = 0, carry = Buffer.alloc(0);
  for (;;) {
    await check(); const { bytesRead } = await handle.read(buffer, 0, buffer.length, position); await check();
    if (!bytesRead) break;
    position += bytesRead; let first = 0;
    for (let i = 0; i < bytesRead; i++) if (buffer[i] === 10) {
      const length = carry.length + i - first + 1;
      if (length > 4096) invalid("record too large");
      yield Buffer.concat([carry, buffer.subarray(first, i + 1)], length);
      carry = Buffer.alloc(0); first = i + 1;
    }
    if (carry.length + bytesRead - first > 4096) invalid("record too large");
    carry = Buffer.concat([carry, buffer.subarray(first, bytesRead)]);
  }
  if (carry.length) invalid("unterminated record");
}
function parse(line: Buffer): any {
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(line)); }
  catch (cause) { throw new Error("MEDIA_EVIDENCE_INVALID: malformed record", { cause }); }
}
async function* verifiedRecords(path: string, directory: string, digest: string, expectedLength: number, check: Control, verify: (record: any, index: number) => void, finish: (count: number) => void) {
  if (dirname(resolve(path)) !== resolve(directory) || await realpath(dirname(path)) !== await realpath(directory) || (await lstat(path)).isSymbolicLink()) invalid("path outside owned staging");
  check.assertCurrent();
  const file = await open(path, process.platform === "win32" ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NOFOLLOW);
  let failure: unknown;
  try {
    const before = await file.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size !== BigInt(expectedLength) || identity(before) !== identity(await lstat(path, { bigint: true }))) invalid("file identity changed");
    const current = async () => { check.assertCurrent(); if (identity(before) !== identity(await file.stat({ bigint: true })) || identity(before) !== identity(await lstat(path, { bigint: true }))) invalid("file identity changed"); check.assertCurrent(); };
    // Verify all bytes and records before exposing the first row to a caller.
    const scan = async () => { const hash = createHash("sha256"); let count = 0, size = 0; for await (const line of lines(file, current)) { hash.update(line); size += line.length; verify(parse(line), count++); } finish(count); if (size !== expectedLength || hash.digest("hex") !== digest) invalid("content hash mismatch"); };
    await scan();
    const secondHash = createHash("sha256"); let count = 0;
    for await (const line of lines(file, current)) { secondHash.update(line); const record = parse(line); if (!check.completeReadOnly) await current(); yield record; count++; }
    await current(); if (secondHash.digest("hex") !== digest) invalid("content hash mismatch");
    if (count === 0) invalid("empty evidence");
  } catch (error) { failure = error; throw error; }
  finally { try { await file.close(); } catch (cleanup) { if (failure !== undefined) throw new AggregateError([failure, cleanup], "evidence read and cleanup failed", { cause: failure }); throw cleanup; } }
}

/** Fully validates the receipt and table before yielding rows; publish only after EOF. */
export async function* readSceneEvidence(value: unknown, directory: string, expected: Readonly<{ source_digest: string; stream_index: number; time_base: { numerator: number; denominator: number }; threshold: number; ffmpeg_version: string }>, control: Control) {
  if (!mediaSceneResultV2Validator(value)) invalid("scene receipt schema");
  const scene = value as Scene, header = scene.receipt.header;
  if (header.source_digest !== expected.source_digest || header.stream_index !== expected.stream_index || creationDigest(header.time_base) !== creationDigest(expected.time_base) || header.threshold !== expected.threshold || header.ffmpeg_version !== expected.ffmpeg_version) invalid("scene source or execution identity changed");
  let previous: number | null = null, count = 0, spans = 0;
  const verify = (record: any, index: number) => {
    if (index === 0) { if (creationDigest(record) !== creationDigest(header)) invalid("scene header changed"); return; }
    if (!record || Object.keys(record).sort().join(",") !== "change_score,end_pts,frame_index,pts" || record.frame_index !== count || !safe(record.pts) || !safe(record.end_pts, 1) || record.end_pts <= record.pts || previous !== null && record.pts !== previous || typeof record.change_score !== "number" || !Number.isFinite(record.change_score) || record.change_score < 0 || record.change_score > 100) invalid("scene frame changed");
    if (count === 0 && record.pts !== scene.receipt.start_pts) invalid("scene start changed");
    if (count === 0 || record.change_score >= header.threshold) spans++;
    previous = record.end_pts; count++;
  };
  const finish = (rows: number) => { if (rows !== scene.receipt.frame_count + 1 || count !== scene.receipt.frame_count || spans !== scene.span_count || previous !== scene.receipt.end_pts) invalid("scene coverage changed"); };
  let first = true;
  for await (const row of verifiedRecords(scene.path, directory, scene.receipt.sha256, scene.receipt.byte_length, control, verify, finish)) { if (first) { first = false; continue; } yield row as { frame_index: number; pts: number; end_pts: number; change_score: number }; }
}

/** Derive every cut from verified ordered frames; publication must wait for EOF. */
export async function* readSceneSpans(value: unknown, directory: string, expected: Readonly<{ source_digest: string; stream_index: number; time_base: { numerator: number; denominator: number }; threshold: number; ffmpeg_version: string }>, control: Control) {
  type Frame = { frame_index: number; pts: number; end_pts: number; change_score: number };
  let first: Frame | null = null, previous: Frame | null = null, index = 0;
  for await (const frame of readSceneEvidence(value, directory, expected, control)) {
    if (first && previous && frame.change_score >= expected.threshold) {
      yield { span_index: index++, first_frame_index: first.frame_index, last_frame_index: previous.frame_index, start_pts: first.pts, end_pts: previous.end_pts };
      first = null;
    }
    first ??= frame;
    previous = frame;
  }
  if (!first || !previous) return invalid("scene span coverage empty");
  yield { span_index: index, first_frame_index: first.frame_index, last_frame_index: previous.frame_index, start_pts: first.pts, end_pts: previous.end_pts };
}

/** Reconstructs timing summaries from every retained row before any row is exposed. */
export async function* readProbeEvidence(value: unknown, directory: string, expectedSourceDigest: string, control: Control) {
  if (!mediaProbeResultV2Validator(value)) invalid("probe receipt schema");
  const probe = value as Probe;
  if (probe.source_digest !== expectedSourceDigest) invalid("probe source changed");
  if (Buffer.byteLength(probe.metadata_json, "utf8") > 8 * 1024 * 1024) invalid("probe metadata too large");
  let metadata: unknown;
  try { metadata = JSON.parse(probe.metadata_json); } catch (cause) { throw new Error("MEDIA_EVIDENCE_INVALID: malformed probe metadata", { cause }); }
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) invalid("probe metadata invalid");
  const data = metadata as any;
  if (!Array.isArray(data.streams) || !data.streams.length || !data.timing_summary?.streams || typeof data.timing_summary.streams !== "object") invalid("probe streams missing");
  const videoStreams = data.streams.filter((stream: any) => stream?.codec_type === "video");
  const audioStreams = data.streams.filter((stream: any) => stream?.codec_type === "audio");
  if (probe.media_kind === "image") {
    const image = data.still_image;
    if (data.format && (Object.hasOwn(data.format, "duration") || Object.hasOwn(data.format, "start_time"))) invalid("probe image timing invalid");
    if (data.streams.length !== 1 || videoStreams.length !== 1 || !image || image.stream_index !== videoStreams[0].index || !safe(image.width, 1) || !safe(image.height, 1) || !safe(image.orientation) || image.orientation > 8 || typeof image.alpha !== "boolean" || typeof image.pixel_format !== "string" || !image.pixel_format || image.pixel_format !== videoStreams[0].pix_fmt || !safe(videoStreams[0].width, 1) || !safe(videoStreams[0].height, 1) || image.width !== (image.orientation >= 5 && image.orientation <= 8 ? videoStreams[0].height : videoStreams[0].width) || image.height !== (image.orientation >= 5 && image.orientation <= 8 ? videoStreams[0].width : videoStreams[0].height) || probe.record_count !== 0 || ["time_base", "start_pts", "start_time", "duration", "duration_ts", "nb_frames", "r_frame_rate", "avg_frame_rate"].some(key => Object.hasOwn(videoStreams[0], key))) invalid("probe image facts invalid");
  } else if (data.still_image !== undefined || (probe.media_kind === "video" ? videoStreams.length === 0 : videoStreams.length !== 0 || audioStreams.length === 0)) invalid("probe media kind invalid");
  type State = { stream: any; frames: number; packets: number; firstFrame: number | null; firstPacket: number | null; previous: bigint | null; delta: bigint | null; vfr: boolean; audioValid: boolean; audioStart: bigint | null; audioEnd: bigint | null; audioSamples: bigint; rate: number | null; numerator: bigint | null; denominator: bigint | null };
  const states = new Map<number, State>();
  for (const stream of data.streams) {
    if (!stream || !safe(stream.index) || states.has(stream.index)) invalid("probe stream identity invalid");
    const rate = stream.sample_rate === undefined || stream.sample_rate === null || stream.sample_rate === "" ? null : Number(stream.sample_rate);
    if (rate !== null && (!Number.isSafeInteger(rate) || rate <= 0)) invalid("probe sample rate invalid");
    const match = typeof stream.time_base === "string" ? /^(-?\d+)(?:\/(\d+))?$/.exec(stream.time_base) : null;
    const numerator = match ? BigInt(match[1]!) : null, denominator = match ? BigInt(match[2] ?? "1") : null;
    states.set(stream.index, { stream, frames: 0, packets: 0, firstFrame: null, firstPacket: null, previous: null, delta: null, vfr: false, audioValid: stream.codec_type === "audio", audioStart: null, audioEnd: null, audioSamples: 0n, rate, numerator, denominator });
  }
  const metadataHash = createHash("sha256").update(probe.metadata_json).digest("hex");
  const verify = (record: any, index: number) => {
    if (index === 0) { if (creationDigest(record) !== creationDigest({ kind: "header", schema_version: 2, source_digest: expectedSourceDigest, policy_version: probe.policy_version })) invalid("probe header changed"); return; }
    if (index === probe.record_count + 1) { if (creationDigest(record) !== creationDigest({ kind: "footer", record_count: probe.record_count, metadata_sha256: metadataHash })) invalid("probe metadata identity changed"); return; }
    const allowed = ["kind", "stream_index", "pts", "dts", "best_effort_timestamp", "duration", "pkt_duration", "nb_samples", "pos", "pkt_pos", "flags"];
    if (!record || !["frame", "packet"].includes(record.kind) || !safe(record.stream_index) || Object.keys(record).some(key => !allowed.includes(key)) || ["pts", "dts", "best_effort_timestamp", "duration", "pkt_duration", "nb_samples"].some(key => record[key] !== undefined && !Number.isSafeInteger(record[key])) || ["pos", "pkt_pos", "flags"].some(key => record[key] !== undefined && typeof record[key] !== "string")) invalid("probe record changed");
    const state = states.get(record.stream_index) ?? invalid("probe record references unknown stream");
    const point = record.kind === "frame" ? record.best_effort_timestamp : record.pts;
    if (record.kind === "packet") { state.packets++; if (state.firstPacket === null && point !== undefined) state.firstPacket = point; return; }
    state.frames++;
    if (state.firstFrame === null && point !== undefined) state.firstFrame = point;
    if (point !== undefined) {
      const position = BigInt(point);
      if (state.previous !== null && position > state.previous) {
        const delta = position - state.previous;
        if (state.stream.codec_type === "video" && state.delta !== null && state.delta !== delta) state.vfr = true;
        state.delta = delta;
      }
      state.previous = position;
    }
    if (state.audioValid) {
      if (point === undefined || !state.rate || state.numerator === null || state.denominator === null || state.numerator <= 0n || state.denominator <= 0n || !safe(record.nb_samples, 1)) { state.audioValid = false; return; }
      const numerator = BigInt(record.nb_samples) * state.denominator, denominator = BigInt(state.rate) * state.numerator;
      const start = BigInt(point);
      if (numerator % denominator !== 0n || state.audioEnd !== null && state.audioEnd !== start) { state.audioValid = false; return; }
      if (state.audioStart === null) state.audioStart = start;
      state.audioEnd = start + numerator / denominator;
      state.audioSamples += BigInt(record.nb_samples);
    }
  };
  const finish = (count: number) => {
    if (count !== probe.record_count + 2 || Object.keys(data.timing_summary.streams).length !== states.size) invalid("probe coverage changed");
    const exactNumber = (value: bigint | null) => { if (value === null || value < -BigInt(Number.MAX_SAFE_INTEGER) || value > BigInt(Number.MAX_SAFE_INTEGER)) invalid("probe timing unrepresentable"); return Number(value); };
    for (const [index, state] of states) {
      const summary: Record<string, unknown> = { frame_count: state.frames, packet_count: state.packets, first_frame_pts: state.firstFrame, first_packet_pts: state.firstPacket, vfr: state.vfr, time_base: state.stream.time_base ?? null, duration: state.stream.duration ?? null, duration_ts: state.stream.duration_ts ?? null, sample_rate: state.rate };
      if (state.audioValid && state.frames) summary.decoded_audio_bounds = { method: "decoded-contiguous-samples-v1", start_pts: exactNumber(state.audioStart), end_pts: exactNumber(state.audioEnd), frame_count: state.frames, sample_count: exactNumber(state.audioSamples), sample_rate: state.rate };
      if (creationDigest(summary) !== creationDigest(data.timing_summary.streams[String(index)])) invalid("probe summary differs from complete timing rows");
    }
  };
  let first = true;
  for await (const row of verifiedRecords(probe.path, directory, probe.sha256, probe.byte_length, control, verify, finish)) { if (first) { first = false; continue; } if (row.kind === "footer") continue; yield row as Record<string, unknown>; }
}

/** Return metadata only after the entire receipt, index, and source binding are verified. */
export async function readVerifiedProbeMetadata(value: unknown, directory: string, expectedSourceDigest: string, control: Control): Promise<{ media_kind: Probe["media_kind"]; metadata: Record<string, unknown>; record_count: number }> {
  const snapshot = structuredClone(value);
  let record_count = 0;
  // This function exposes no individual rows and returns only after EOF and
  // the final identity/authorization check. Keep per-row checks for public
  // streaming consumers, but check this complete read at each bounded block.
  for await (const _ of readProbeEvidence(snapshot, directory, expectedSourceDigest, { ...control, completeReadOnly: true })) record_count++;
  const probe = snapshot as Probe;
  return { media_kind: probe.media_kind, metadata: JSON.parse(probe.metadata_json) as Record<string, unknown>, record_count };
}

export type DecodedFrameIndex = {
  source_digest: string; stream_index: number; time_base: {numerator:number;denominator:number}; threshold:number;
  start_pts:number; end_pts:number; content_digest:string;
  frames:Array<{frame_index:number;pts:number;end_pts:number;change_score:number}>;
  spans:Array<{span_index:number;first_frame_index:number;last_frame_index:number;start_pts:number;end_pts:number}>;
};
export async function decodeSceneEvidence(value: unknown, directory:string, expected:Parameters<typeof readSceneEvidence>[2], control:Control):Promise<DecodedFrameIndex> {
  const snapshot=structuredClone(value) as Scene;
  if(!mediaSceneResultV2Validator(snapshot)) invalid("scene receipt schema");
  if(snapshot.receipt.frame_count>250000) throw new Error("MEDIA_EVIDENCE_MEMORY_BUDGET_EXCEEDED");
  const frames:DecodedFrameIndex["frames"]=[];
  for await(const frame of readSceneEvidence(snapshot,directory,expected,control)) frames.push(frame);
  const spans:DecodedFrameIndex["spans"]=[];
  for(const frame of frames) {
    if(!spans.length||frame.change_score>=expected.threshold) spans.push({span_index:spans.length,first_frame_index:frame.frame_index,last_frame_index:frame.frame_index,start_pts:frame.pts,end_pts:frame.end_pts});
    else {const span=spans.at(-1)!;span.last_frame_index=frame.frame_index;span.end_pts=frame.end_pts;}
  }
  const {source_digest,stream_index,time_base,threshold}=snapshot.receipt.header;
  return {source_digest,stream_index,time_base,threshold,start_pts:snapshot.receipt.start_pts,end_pts:snapshot.receipt.end_pts,content_digest:snapshot.receipt.sha256,frames,spans};
}
