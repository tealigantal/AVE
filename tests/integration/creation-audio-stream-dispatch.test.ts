import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject, readObjectSync } from "../../packages/platform/project-storage/src/public.js";
import { openVerifiedObservationAudioFile } from "../../packages/platform/project-storage/src/observation-audio-file.mjs";
import { registerCreationAudioStreamRoot, selectCreationAudioStreamChunk, settleCreationAudioStreamCall, recoverCreationAudioStreamCall } from "../../packages/platform/project-storage/src/creation-audio-stream-store.mjs";
import { creationDigest } from "../../packages/platform/contract-runtime/src/creation-session.mjs";
import { encodeCreationAudioStreamChunk } from "../../packages/platform/contract-runtime/src/creation-audio-stream.mjs";
import { validateObservationAudioChunkResult } from "../../packages/platform/contract-runtime/src/observation-audio-chunks.mjs";
import { createWhisperProvider } from "../../packages/platform/model-gateway/src/whisper.js";
import { createOpenAICompatibleProvider, modelInputHash, ModelGatewayError, runModel, type ModelDeployment, type ModelFailureAudit, type ModelRoute } from "../../packages/platform/model-gateway/src/public.js";
import { createCreationAudioStreamDispatch } from "../../packages/platform/project-host/src/creation-audio-stream-dispatch.js";
import type { CreationAudioStreamRootV1 } from "../../contracts/generated/typescript/editorial/creation-audio-stream-root.v1.js";

// Real Host-owned SQLite/object storage and the real Whisper adapter. The
// provider transport below is a local in-memory fixture, never a network call.
const directory = await mkdtemp(resolve(tmpdir(), "ave-audio-dispatch-")), projectPath = resolve(directory, "project"), samplePath = resolve(directory, "sample.wav"), indexPath = resolve(directory, "index.jsonl");
const sha = (data: Uint8Array) => createHash("sha256").update(data).digest("hex"), rate = 16000, count = 16000;
const header = Buffer.alloc(44); header.write("RIFF", 0); header.writeUInt32LE(36 + count * 2, 4); header.write("WAVEfmt ", 8); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24); header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(count * 2, 40);
const wav = Buffer.concat([header, Buffer.alloc(count * 2, 7)]); await writeFile(samplePath, wav);
const sampleTime = (value: number) => ({ schema_version: 1 as const, value, timescale: rate });
const sample = { schema_version: 1 as const, sample_id: "sample-0", source_digest: "e".repeat(64), stream_index: 0, requested_start: sampleTime(0), actual_start: sampleTime(0), requested_end: sampleTime(count), actual_end: sampleTime(count), path: samplePath, content_digest: sha(wav), byte_length: wav.length, policy_version: "source-pts-sampling-v1", ffmpeg_version: "fixture", detail: { kind: "audio" as const, mime_type: "audio/wav" as const, sample_rate: rate, channels: 1, sample_count: count } };
let session: Awaited<ReturnType<typeof createProject>> | undefined, allowed = true, sent = 0, wireDigest = "", wireBytes = 0;
let network: "success" | "lost" = "success";
const provider = createWhisperProvider({ provider: "local-whisper", model: "small", base_url: "http://127.0.0.1:18080", fetch_impl: async (_url, init) => {
  sent++; const raw = Buffer.from(init!.body as ArrayBuffer); wireDigest = sha(raw); wireBytes = raw.length;
  assert.equal(Number(session!.db.prepare("SELECT COUNT(*) AS n FROM object_refs WHERE object_type='creation_audio_stream_call'").get()!.n) >= sent, true, "reservation must commit before entering the adapter transport");
  if (network === "lost") throw new Error("SIMULATED_CONNECTION_LOST_AFTER_SEND");
  return new Response(JSON.stringify({ text: "hello", language: "en", duration: 1, segments: [{ id: 0, start: 0, end: 1, text: "hello", words: [{ word: "hello", start: 0, end: 1 }], avg_logprob: -0.3, compression_ratio: 1, no_speech_prob: 0.1 }] }), { status: 200, headers: { "content-type": "application/json" } });
} });
const target: ModelRoute = { role: "transcription", provider: "local-whisper", model: "small", endpoint: provider.deployment.endpoint, digest: provider.deployment.digest };
const deployment: ModelDeployment = { endpoint: "http://127.0.0.1:18080", digest: "d".repeat(64), routes: [target] };
const guard = (root: Readonly<CreationAudioStreamRootV1>) => { if (!allowed || root.authorization_generation !== 0) throw new Error("REQUEST_REVOKED"); };
const owner = () => { if (!session?.db.isOpen) throw new Error("PROJECT_CLOSED"); };
const stat = statSync(samplePath, { bigint: true });
const sampleGuard = (chunk: { sample_content_digest: string; sample_byte_length: number }) => { const current = statSync(samplePath, { bigint: true }); if (chunk.sample_content_digest !== sample.content_digest || chunk.sample_byte_length !== sample.byte_length || current.size !== stat.size || current.mtimeNs !== stat.mtimeNs || current.ctimeNs !== stat.ctimeNs || current.ino !== stat.ino) throw new Error("SAMPLE_REBOUND"); };
const validateOutput = (output: unknown) => { if (!output || typeof output !== "object" || !("segments" in output) || !Array.isArray(output.segments)) throw new Error("INVALID_TRANSCRIPTION"); };
try {
  session = await createProject(projectPath); const projectId = session.manifest.project_id;
  const chunk = { schema_version: 1 as const, index: 0, sample_id: sample.sample_id, core_start_sample: 0, core_end_sample: count, input_start_sample: 0, input_end_sample: count, sample_content_digest: sample.content_digest, sample_byte_length: sample.byte_length, sample_policy_version: "source-pts-sampling-v1" as const };
  const index = encodeCreationAudioStreamChunk(chunk); await writeFile(indexPath, index);
  const root: CreationAudioStreamRootV1 = { schema_version: 1, protocol: "creation-audio-stream-v1", project_id: projectId, request_id: "request", run_id: "run", revision: 1, authorization_digest: "a".repeat(64), authorization_generation: 0, cancellation_generation: 0, base_timeline_version: 0, base_timeline_digest: "b".repeat(64), deployment_digest: creationDigest(deployment), material_operation_id: "material", material_digest: "c".repeat(64), asset_id: `asset:sha256:${sample.source_digest}`, original_identity_digest: "d".repeat(64), immutable_identity_digest: "f".repeat(64), stream_index: 0, sample_prefix: "sample", chunk_policy: { start_sample: 0, end_sample: count, sample_rate: rate, channels: 1, context_samples: 0, max_core_samples: count, max_duration_seconds: 1, max_base64_bytes: 200000, wav_header_bytes: 4096 }, chunk_index: { sha256: sha(index), byte_length: index.length, record_count: 1 }, created_at: "2026-11-11T00:00:00Z" };
  const record = await registerCreationAudioStreamRoot(session, projectId, root, indexPath, { assertCurrent: guard });
  let selection = await selectCreationAudioStreamChunk(session, projectId, record.root_digest, 0, { assertCurrent: guard });
  validateObservationAudioChunkResult(root.chunk_policy, root.sample_prefix, { index: 0, core_start_sample: 0, core_end_sample: count, input_start_sample: 0, input_end_sample: count }, sample, sample.source_digest, 0);
  const reader = await openVerifiedObservationAudioFile(samplePath, sample, { assertCurrent: () => guard(root) });
  const media = await reader.readModelMedia(root.chunk_policy.max_base64_bytes); await reader.close();
  const input = { context: { sample_id: sample.sample_id }, media: [media] }; let activeRun = root.run_id;
  const invoke = (dispatcher: ReturnType<typeof createCreationAudioStreamDispatch>, inputMedia = media, audit?: (audit: ModelFailureAudit) => void, requestId = activeRun) => runModel({ request_id: requestId, project_id: projectId, provider: target.provider, model: target.model, prompt_version: "fixture", privacy_class: "sensitive", structured_output: true, audio_stream_identity: true, input: { ...input, media: [inputMedia] }, output_validator: validateOutput, dispatch: dispatcher.dispatch,
  }, provider, Date.now(), { policy: { allowed_sensitive_providers: [target.provider], retry: { max_attempts: 1 } }, audit: value => { if ("code" in value) audit?.(value); } });
  const setup = (callId: string, attempt = 1, explicitRetry = false, assertSample = sampleGuard) => createCreationAudioStreamDispatch({ session: session!, projectId, selection, deployment, target, input, callId, attempt, explicitRetry, assertCurrent: guard, assertSample, assertLedgerOwner: owner });

  const first = setup("first"), result = await invoke(first), committed = first.reservation();
  assert.ok(committed?.acknowledged); assert.equal(sent, 1); assert.equal(committed.call.wire_digest, wireDigest); assert.equal(committed.call.input_bytes, wireBytes);
  assert.equal(result.output_hash, creationDigest(result.output), "gateway output digest and durable canonical response agree");
  const responseRef = { object_ref_id: `${projectId}:audio-stream-response:first`, digest: result.output_hash };
  const settlement = { schema_version: 1 as const, call_id: "first", call_digest: creationDigest(committed.call), root_digest: record.root_digest, status: "response" as const, usage: null, response_ref: responseRef, reason_code: null, completed_at: new Date().toISOString() };
  settleCreationAudioStreamCall(session, projectId, "first", settlement, result.output, { assertLedgerOwner: owner, selection, deployment, assertCurrent: guard, validateResponse: (_role, output) => validateOutput(output) });
  await assert.rejects(invoke(first), /CREATION_AUDIO_DISPATCH_INVALID|MODEL_DISPATCH_DENIED/); assert.equal(sent, 1, "one dispatcher never sends twice");
  await session.close(); session = await openProject(projectPath); selection = await selectCreationAudioStreamChunk(session, projectId, record.root_digest, 0, { assertCurrent: guard });
  const recovered = await recoverCreationAudioStreamCall(session, projectId, selection, "first", { deployment, assertCurrent: guard, validateResponse: (_role, output) => validateOutput(output) });
  assert.equal(recovered.action, "reuse-verified-response"); assert.deepEqual(recovered.response?.value, result.output); assert.equal(sent, 1, "reopen reuses saved response without transport");

  // A different chunk role cannot be rebound to an unapproved physical route.
  const mismatch = setup("wrong-route");
  assert.throws(() => mismatch.dispatch(() => { throw new Error("SHOULD_NOT_SEND"); }, { wire_digest: "f".repeat(64), input_bytes: 1, gateway_input_hashes: [modelInputHash(input)], provider_binding: { provider: target.provider, model: target.model, endpoint: target.endpoint, digest: target.digest }, media_binding: { sample_id: sample.sample_id, mime_type: "audio/wav", content_digest: sample.content_digest, byte_length: sample.byte_length }, target: { ...target, endpoint: "http://other.invalid", sample_id: sample.sample_id } }), /CREATION_AUDIO_DISPATCH_INVALID/);
  assert.equal(sent, 1); assert.equal(mismatch.reservation(), null);
  const different = Buffer.from(wav); different[60] = different[60]! ^ 1;
  const differentMedia = { ...media, data_base64: different.toString("base64"), content_digest: sha(different) };
  const wrongBytes = setup("wrong-bytes"); await assert.rejects(invoke(wrongBytes, differentMedia), /CREATION_AUDIO_DISPATCH_INVALID|MODEL_DISPATCH_DENIED/);
  assert.equal(wrongBytes.reservation(), null, "same-size altered PCM is rejected before reservation");
  const wrongTrack = setup("wrong-track"); await assert.rejects(invoke(wrongTrack, { ...media, sample_id: "other-0" }), /CREATION_AUDIO_DISPATCH_INVALID|MODEL_DISPATCH_DENIED/);
  assert.equal(wrongTrack.reservation(), null, "different sample identity is rejected before reservation");
  const wrongLength = setup("wrong-length");
  assert.throws(() => wrongLength.dispatch(() => { throw new Error("SHOULD_NOT_SEND"); }, { wire_digest: "f".repeat(64), input_bytes: 1, gateway_input_hashes: [modelInputHash(input)], provider_binding: { provider: target.provider, model: target.model, endpoint: target.endpoint, digest: target.digest }, media_binding: { sample_id: sample.sample_id, mime_type: "audio/wav", content_digest: sample.content_digest, byte_length: sample.byte_length - 1 }, target: { ...target, sample_id: sample.sample_id } }), /CREATION_AUDIO_DISPATCH_INVALID/);
  assert.equal(wrongLength.reservation(), null); assert.equal(sent, 1);

  // The first role is complete. A second root creates a separate valid attempt
  // family for failure/cancellation tests, with no new model permissions.
  const secondRoot = { ...root, run_id: "run-second" }, second = await registerCreationAudioStreamRoot(session, projectId, secondRoot, indexPath, { assertCurrent: guard });
  selection = await selectCreationAudioStreamChunk(session, projectId, second.root_digest, 0, { assertCurrent: guard }); activeRun = secondRoot.run_id;
  let sampleChecks = 0;
  const denied = setup("denied", 1, false, chunk => { sampleGuard(chunk); if (++sampleChecks === 2) { allowed = false; throw new Error("REQUEST_REVOKED"); } });
  await assert.rejects(invoke(denied), /REQUEST_REVOKED/); assert.equal(sent, 1, "revocation after reservation happens before transport");
  const deniedCall = denied.reservation(); assert.ok(deniedCall?.acknowledged);
  const row = session.db.prepare("SELECT object_hash FROM object_refs WHERE project_id=? AND object_type='creation_audio_stream_settlement' AND relation_key=?").get(projectId, "denied") as { object_hash: string };
  const deniedSettlement = JSON.parse(readObjectSync(projectPath, row.object_hash).toString("utf8"));
  assert.equal(deniedSettlement.status, "cancelled"); assert.equal(deniedSettlement.reason_code, "PRE_SEND_GUARD_FAILED"); assert.equal(deniedSettlement.response_ref, null);

  allowed = true;
  const thirdRoot = { ...root, run_id: "run-third" }, third = await registerCreationAudioStreamRoot(session, projectId, thirdRoot, indexPath, { assertCurrent: guard });
  selection = await selectCreationAudioStreamChunk(session, projectId, third.root_digest, 0, { assertCurrent: guard }); activeRun = thirdRoot.run_id;
  network = "lost";
  let failureAudit: ModelFailureAudit | undefined;
  const lost = setup("lost"); await assert.rejects(invoke(lost, media, audit => { failureAudit = audit; }), /SIMULATED_CONNECTION_LOST_AFTER_SEND/); assert.equal(sent, 2);
  const trustedFailure = failureAudit; assert.ok(trustedFailure);
  assert.throws(() => lost.recordUnknown(structuredClone(trustedFailure)), (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_DISPATCH_DENIED", "a lookalike audit has no gateway provenance");
  assert.equal(lost.recordUnknown(trustedFailure).status, "recorded");
  const lostRow = session.db.prepare("SELECT object_hash FROM object_refs WHERE project_id=? AND object_type='creation_audio_stream_settlement' AND relation_key=?").get(projectId, "lost") as { object_hash: string };
  assert.equal(JSON.parse(readObjectSync(projectPath, lostRow.object_hash).toString("utf8")).usage, null, "unreported usage remains unknown");
  assert.equal((await recoverCreationAudioStreamCall(session, projectId, selection, "lost", { deployment, assertCurrent: guard, validateResponse: (_role, output) => validateOutput(output) })).action, "resolve-unknown");
  const retry = setup("retry", 2, true); await assert.rejects(invoke(retry), /CREATION_AUDIO_CALL_UNCERTAIN/); assert.equal(sent, 2, "an unknown transport never automatically resends");

  // A sound adapter can report real usage even if output validation fails.
  // The outcome remains unknown, but confirmed usage must be retained.
  let soundSends = 0, soundAudit: ModelFailureAudit | undefined;
  const soundProvider = createOpenAICompatibleProvider({ provider: "local-sound", base_url: "http://127.0.0.1:18081/v1", models: [{ model: "yamnet", media_types: ["audio/wav"] }], audio_input: "base64", fetch_impl: async () => { soundSends++; return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ description: "" }) }, finish_reason: "stop" }], usage: { prompt_tokens: 11, completion_tokens: 4, total_tokens: 15 } }), { status: 200 }); } });
  const soundTarget: ModelRoute = { role: "sound", provider: "local-sound", model: "yamnet", endpoint: soundProvider.deployment.endpoint, digest: soundProvider.deployment.digest };
  const soundDeployment: ModelDeployment = { endpoint: soundTarget.endpoint, digest: "5".repeat(64), routes: [soundTarget] };
  const soundRoot = { ...root, run_id: "run-sound", deployment_digest: creationDigest(soundDeployment) }, soundRecord = await registerCreationAudioStreamRoot(session, projectId, soundRoot, indexPath, { assertCurrent: guard });
  const soundSelection = await selectCreationAudioStreamChunk(session, projectId, soundRecord.root_digest, 0, { assertCurrent: guard });
  const soundInput = { context: "listen", media: [media] };
  const soundDispatch = createCreationAudioStreamDispatch({ session, projectId, selection: soundSelection, deployment: soundDeployment, target: soundTarget, input: soundInput, callId: "sound-unknown", attempt: 1, assertCurrent: guard, assertSample: sampleGuard, assertLedgerOwner: owner });
  await assert.rejects(runModel({ request_id: soundRoot.run_id, project_id: projectId, provider: soundTarget.provider, model: soundTarget.model, prompt_version: "fixture", privacy_class: "sensitive", structured_output: true, audio_stream_identity: true, input: soundInput, dispatch: soundDispatch.dispatch, output_validator: () => { throw new Error("INVALID_SOUND_OUTPUT"); } }, soundProvider, Date.now(), { policy: { allowed_sensitive_providers: [soundTarget.provider], retry: { max_attempts: 1 } }, audit: value => { if ("code" in value) soundAudit = value; } }), /INVALID_SOUND_OUTPUT/);
  const trustedSoundAudit = soundAudit; assert.equal(soundSends, 1); assert.ok(trustedSoundAudit?.usage_known); assert.throws(() => soundDispatch.recordUnknown(trustedFailure), (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_DISPATCH_DENIED", "an audit from a different physical dispatch cannot be rebound");
  assert.equal(soundDispatch.recordUnknown(trustedSoundAudit).status, "recorded");
  const soundRow = session.db.prepare("SELECT object_hash FROM object_refs WHERE project_id=? AND object_type='creation_audio_stream_settlement' AND relation_key=?").get(projectId, "sound-unknown") as { object_hash: string };
  const recordedSound = JSON.parse(readObjectSync(projectPath, soundRow.object_hash).toString("utf8"));
  assert.equal(recordedSound.status, "unknown"); assert.deepEqual(recordedSound.usage, { input: 11, output: 4, total: 15 });
  assert.equal((await recoverCreationAudioStreamCall(session, projectId, soundSelection, "sound-unknown", { deployment: soundDeployment, assertCurrent: guard, validateResponse: () => {} })).action, "resolve-unknown");
  assert.equal(soundSends, 1);
  const revokedRoot = { ...root, run_id: "run-sound-revoked", deployment_digest: creationDigest(soundDeployment) }, revokedRecord = await registerCreationAudioStreamRoot(session, projectId, revokedRoot, indexPath, { assertCurrent: guard });
  const revokedSelection = await selectCreationAudioStreamChunk(session, projectId, revokedRecord.root_digest, 0, { assertCurrent: guard });
  const revokedDispatch = createCreationAudioStreamDispatch({ session, projectId, selection: revokedSelection, deployment: soundDeployment, target: soundTarget, input: soundInput, callId: "sound-revoked", attempt: 1, assertCurrent: guard, assertSample: sampleGuard, assertLedgerOwner: owner });
  const responseBeforeRevoke = await runModel({ request_id: revokedRoot.run_id, project_id: projectId, provider: soundTarget.provider, model: soundTarget.model, prompt_version: "fixture", privacy_class: "sensitive", structured_output: true, audio_stream_identity: true, input: soundInput, dispatch: revokedDispatch.dispatch }, soundProvider, Date.now(), { policy: { allowed_sensitive_providers: [soundTarget.provider], retry: { max_attempts: 1 } } });
  allowed = false;
  assert.throws(() => revokedDispatch.recordUnpublishedResponse(structuredClone(responseBeforeRevoke.audit)), (error: unknown) => error instanceof ModelGatewayError && error.code === "MODEL_DISPATCH_DENIED", "copied success audit cannot establish usage");
  assert.equal(revokedDispatch.recordUnpublishedResponse(responseBeforeRevoke.audit).status, "recorded");
  const revokedRow = session.db.prepare("SELECT object_hash FROM object_refs WHERE project_id=? AND object_type='creation_audio_stream_settlement' AND relation_key=?").get(projectId, "sound-revoked") as { object_hash: string };
  const revokedSettlement = JSON.parse(readObjectSync(projectPath, revokedRow.object_hash).toString("utf8"));
  assert.equal(revokedSettlement.status, "unknown"); assert.deepEqual(revokedSettlement.usage, { input: 11, output: 4, total: 15 }); assert.equal(revokedSettlement.response_ref, null);
  await assert.rejects(recoverCreationAudioStreamCall(session, projectId, revokedSelection, "sound-revoked", { deployment: soundDeployment, assertCurrent: guard, validateResponse: () => {} }), /REQUEST_REVOKED/);
  allowed = true;
  const mutationProvider = createWhisperProvider({ provider: "mutable-fixture", model: "small", base_url: "http://127.0.0.1:18080", fetch_impl: async () => new Response(JSON.stringify({ text: "", language: "en", duration: 1, segments: [] }), { status: 200 }) });
  const mutableMedia = { ...media }; let capturedBinding: unknown;
  const pending = mutationProvider.complete({ request_id: "mutable", provider: "mutable-fixture", model: "small", prompt_version: "fixture", privacy_class: "internal", audio_stream_identity: true, input: { context: {}, media: [mutableMedia] }, dispatch: (send, transport) => { capturedBinding = transport.media_binding; return send().response; } });
  mutableMedia.content_digest = "0".repeat(64); mutableMedia.sample_id = "rebound";
  await pending;
  assert.deepEqual(capturedBinding, { sample_id: sample.sample_id, mime_type: "audio/wav", content_digest: sample.content_digest, byte_length: sample.byte_length }, "multipart binding is pinned before asynchronous serialization");
  console.log("Audio stream dispatch: real Whisper adapter, pre-send reservation, revocation and unknown delivery passed (local fixture only)");
} finally { await session?.close(); await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
