import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject, readObjectSync } from "../../packages/platform/project-storage/src/public.js";
import { registerCreationAudioStreamRoot, selectCreationAudioStreamChunk } from "../../packages/platform/project-storage/src/creation-audio-stream-store.mjs";
import { encodeCreationAudioStreamChunk } from "../../packages/platform/contract-runtime/src/creation-audio-stream.mjs";
import { creationDigest } from "../../packages/platform/contract-runtime/src/creation-session.mjs";
import { createSplitModelProvider } from "../../packages/platform/model-gateway/src/split-provider.js";
import { runCreationAudioStreamChunk } from "../../packages/platform/project-host/src/creation-audio-stream-runner.js";
import { ResourceGate } from "../../packages/platform/project-host/src/resource-gate.js";
import type { CreationAudioStreamRootV1 } from "../../contracts/generated/typescript/editorial/creation-audio-stream-root.v1.js";

const directory = await mkdtemp(resolve(tmpdir(), "ave-audio-runner-")), projectPath = resolve(directory, "project"), indexPath = resolve(directory, "index.jsonl");
const sha = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex"), rate = 16000, count = 8000;
const header = Buffer.alloc(44); header.write("RIFF"); header.writeUInt32LE(36 + count * 2, 4); header.write("WAVEfmt ", 8); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(count * 2, 40);
const wav = Buffer.concat([header, Buffer.alloc(count * 2, 7)]), digest = sha(wav), gate = new ResourceGate(true);
let session: Awaited<ReturnType<typeof createProject>> | undefined, allowed = true, whisper = 0, sound = 0, status = 0, failSound = false, revokeSound = false;
const fetchWhisper = async (url: RequestInfo | URL) => { if (String(url).endsWith("/api/ps")) { status++; return new Response(JSON.stringify({ models: [] })); } whisper++; return new Response(JSON.stringify({ text: "hello", language: "en", duration: 0.5, segments: [{ id: 0, start: 0, end: 0.4, text: "hello", words: [{ word: "hello", start: 0, end: 0.4 }], avg_logprob: -0.3, compression_ratio: 1, no_speech_prob: 0.1 }] }), { status: 200 }); };
const fetchSound = async () => { sound++; if (failSound) throw new Error("DISCONNECTED_AFTER_SEND"); if (revokeSound) allowed = false; return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ description: "sound", uncertain: true, events: [{ kind: "unknown", start_sample: 0, end_sample: count, uncertain: true, description: "sound" }] }) }, finish_reason: "stop" }], usage: { prompt_tokens: 11, completion_tokens: 4, total_tokens: 15 } }), { status: 200 }); };
const provider = createSplitModelProvider({ vision: { provider: "vision", model: "v", base_url: "http://127.0.0.1:18082/v1", fetch_impl: async () => { throw new Error("NOT_EXPECTED"); } }, transcription: { provider: "local-whisper", model: "small", base_url: "http://127.0.0.1:18080", fetch_impl: fetchWhisper }, sound: { provider: "local-sound", model: "yamnet", base_url: "http://127.0.0.1:18081/v1", audio_input: "data-url", fetch_impl: fetchSound } }, { observation_output_version: 2, resource_gate: gate });
const guard = () => { if (!allowed) throw new Error("REQUEST_REVOKED"); }, owner = () => { if (!session?.db.isOpen) throw new Error("PROJECT_CLOSED"); };
try {
  session = await createProject(projectPath); const projectId = session.manifest.project_id;
  const chunks = [0, 1].map(index => ({ schema_version: 1 as const, index, sample_id: `sample-${index}`, core_start_sample: index * count, core_end_sample: (index + 1) * count, input_start_sample: index * count, input_end_sample: (index + 1) * count, sample_content_digest: digest, sample_byte_length: wav.length, sample_policy_version: "source-pts-sampling-v1" as const }));
  const index = Buffer.concat(chunks.map(encodeCreationAudioStreamChunk)); await writeFile(indexPath, index);
  const root: CreationAudioStreamRootV1 = { schema_version: 1, protocol: "creation-audio-stream-v1", project_id: projectId, request_id: "request", run_id: "run", revision: 1, authorization_digest: "a".repeat(64), authorization_generation: 0, cancellation_generation: 0, base_timeline_version: 0, base_timeline_digest: "b".repeat(64), deployment_digest: creationDigest(provider.deployment), material_operation_id: "material", material_digest: "c".repeat(64), asset_id: `asset:sha256:${"e".repeat(64)}`, original_identity_digest: "d".repeat(64), immutable_identity_digest: "f".repeat(64), stream_index: 0, sample_prefix: "sample", chunk_policy: { start_sample: 0, end_sample: count * 2, sample_rate: rate, channels: 1, context_samples: 0, max_core_samples: count, max_duration_seconds: 1, max_base64_bytes: 200000, wav_header_bytes: 4096 }, chunk_index: { sha256: sha(index), byte_length: index.length, record_count: 2 }, created_at: "2026-11-11T00:00:00Z" };
  const registered = await registerCreationAudioStreamRoot(session, projectId, root, indexPath, { assertCurrent: guard });
  const run = async (i: number, rootDigest = registered.root_digest) => {
    const selection = await selectCreationAudioStreamChunk(session!, projectId, rootDigest, i, { assertCurrent: guard });
    const time = (value: number) => ({ schema_version: 1 as const, value, timescale: rate });
    return runCreationAudioStreamChunk({ session: session!, projectId, selection, provider, media: { sample_id: chunks[i]!.sample_id, mime_type: "audio/wav", content_digest: digest, data_base64: wav.toString("base64") }, sample: { sample_id: chunks[i]!.sample_id, sample_rate: rate, actual_start: time(i * count), actual_end: time((i + 1) * count) }, assertCurrent: guard, assertSample: chunk => { if (chunk.sample_content_digest !== digest) throw new Error("SAMPLE_REBOUND"); }, assertLedgerOwner: owner });
  };
  const first = await run(0); assert.deepEqual(first.map(x => x.role), ["transcription", "sound"]); assert.equal(whisper, 1); assert.equal(sound, 1); assert.equal(status, 1);
  await session.close(); session = await openProject(projectPath);
  assert.deepEqual(await run(0), first); assert.equal(whisper, 1); assert.equal(sound, 1, "reopen reuses both physical outputs");
  failSound = true; await assert.rejects(run(1), /DISCONNECTED_AFTER_SEND/); assert.equal(whisper, 2); assert.equal(sound, 2);
  await session.close(); session = await openProject(projectPath); failSound = false;
  await assert.rejects(run(1), /CREATION_AUDIO_RUNNER_RESOLVE_UNKNOWN/); assert.equal(whisper, 2); assert.equal(sound, 2, "an unknown sound call is never resent");
  // A separate root exercises revocation after the physical sound response.
  const next = await registerCreationAudioStreamRoot(session, projectId, { ...root, run_id: "revoked" }, indexPath, { assertCurrent: guard });
  // The earlier failed local sound call poisoned the shared gate; a fresh
  // service instance models a clean process restart before this next root.
  const cleanProvider = createSplitModelProvider({ vision: { provider: "vision", model: "v", base_url: "http://127.0.0.1:18082/v1", fetch_impl: async () => { throw new Error("NOT_EXPECTED"); } }, transcription: { provider: "local-whisper", model: "small", base_url: "http://127.0.0.1:18080", fetch_impl: fetchWhisper }, sound: { provider: "local-sound", model: "yamnet", base_url: "http://127.0.0.1:18081/v1", audio_input: "data-url", fetch_impl: fetchSound } }, { observation_output_version: 2, resource_gate: new ResourceGate(true) });
  const selection = await selectCreationAudioStreamChunk(session, projectId, next.root_digest, 0, { assertCurrent: guard });
  revokeSound = true;
  await assert.rejects(runCreationAudioStreamChunk({ session, projectId, selection, provider: cleanProvider, media: { sample_id: "sample-0", mime_type: "audio/wav", content_digest: digest, data_base64: wav.toString("base64") }, sample: { sample_id: "sample-0", sample_rate: rate, actual_start: { schema_version: 1, value: 0, timescale: rate }, actual_end: { schema_version: 1, value: count, timescale: rate } }, assertCurrent: guard, assertSample: () => {}, assertLedgerOwner: owner }), /REQUEST_REVOKED/);
  const settlements = session.db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_audio_stream_settlement'").all() as { object_hash: string }[];
  const saved = settlements.map(row => JSON.parse(readObjectSync(projectPath, row.object_hash).toString("utf8"))).find(item => item.reason_code === "RESPONSE_NOT_PUBLISHED");
  assert.ok(saved); assert.deepEqual(saved.usage, { input: 11, output: 4, total: 15 }); assert.equal(saved.response_ref, null);
  console.log("Audio runner: split adapters, sequential resource lease, reopen reuse, unknown no-resend and revoked response accounting passed (local fixtures)");
} finally { await session?.close(); await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
