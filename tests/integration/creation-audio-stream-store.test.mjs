import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { creationDigest } from "../../packages/platform/contract-runtime/src/creation-session.mjs";
import { observationAudioChunkRequests } from "../../packages/platform/contract-runtime/src/observation-audio-chunks.mjs";
import { encodeCreationAudioStreamChunk } from "../../packages/platform/contract-runtime/src/creation-audio-stream.mjs";
import { createProject, openProject, listOrphanObjects, readObjectSync } from "../../packages/platform/project-storage/src/project-storage.mjs";
import { registerCreationAudioStreamRoot, selectCreationAudioStreamChunk, reserveCreationAudioStreamCall, settleCreationAudioStreamCall, recoverCreationAudioStreamCall } from "../../packages/platform/project-storage/src/creation-audio-stream-store.mjs";

const dir = await mkdtemp(resolve(tmpdir(), "ave-audio-ledger-")), projectPath = resolve(dir, "project"), indexPath = resolve(dir, "chunks.jsonl");
const example = async name => JSON.parse(await readFile(`contracts/examples/valid/editorial/creation-audio-stream-${name}.v1.json`, "utf8"));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const transcription = { role: "transcription", provider: "local", model: "whisper-small", endpoint: "http://127.0.0.1:18080", digest: "6".repeat(64) };
const sound = { ...transcription, role: "sound", model: "yamnet", digest: "7".repeat(64) };
const deployment = { endpoint: "http://127.0.0.1:18080", digest: "d".repeat(64), routes: [transcription, sound] };
let session, allowed = true, generation = 0;
const guard = root => { if (!allowed || root.authorization_generation !== generation) throw new Error("REQUEST_REVOKED"); };
const owner = () => { if (!session.db.isOpen) throw new Error("PROJECT_CLOSED"); };
const rows = (type, relation) => session.db.prepare("SELECT object_ref_id,object_hash,version FROM object_refs WHERE project_id=? AND object_type=?" + (relation === undefined ? "" : " AND relation_key=?") + " ORDER BY version").all(...(relation === undefined ? [session.manifest.project_id, type] : [session.manifest.project_id, type, relation]));
const noOrphans = async () => assert.deepEqual(await listOrphanObjects(session, projectPath), []);
const responseValidator = (role, value) => { assert.ok(["transcription", "sound"].includes(role)); assert.ok(value && Array.isArray(value.segments)); };
try {
  session = await createProject(projectPath); const projectId = session.manifest.project_id;
  const root = await example("root"); root.project_id = projectId; root.deployment_digest = creationDigest(deployment);
  const chunks = [...observationAudioChunkRequests(root.chunk_policy, root.sample_prefix)].map(({ chunk, sample }) => ({ schema_version: 1, ...chunk, sample_id: sample.sample_id, sample_content_digest: "3".repeat(64), sample_byte_length: 78 + (chunk.input_end_sample - chunk.input_start_sample) * root.chunk_policy.channels * 2, sample_policy_version: "source-pts-sampling-v1" }));
  const index = Buffer.concat(chunks.map(encodeCreationAudioStreamChunk)); root.chunk_index = { sha256: sha(index), byte_length: index.length, record_count: chunks.length }; await writeFile(indexPath, index);
  await assert.rejects(registerCreationAudioStreamRoot(session, projectId, root, indexPath, { assertCurrent: async () => {} }), /CREATION_AUDIO_LEDGER_AUTHORITY_INVALID/);

  // Failure after staging the index, but before root registration, rolls back
  // all DB references and removes only this transaction's newly installed object.
  session.db.exec("CREATE TEMP TRIGGER fail_audio_root BEFORE INSERT ON object_refs WHEN NEW.object_type='creation_audio_stream_root' BEGIN SELECT RAISE(ABORT, 'INJECTED_ROOT_FAILURE'); END");
  await assert.rejects(registerCreationAudioStreamRoot(session, projectId, root, indexPath, { assertCurrent: guard }), /INJECTED_ROOT_FAILURE/);
  assert.equal(rows("creation_audio_stream_root").length, 0); assert.equal(rows("creation_audio_stream_index").length, 0); await noOrphans();
  session.db.exec("DROP TRIGGER fail_audio_root");

  // If an untrusted process replaces a newly installed object before rollback,
  // cleanup must fail closed instead of deleting the replacement by pathname.
  const changedChunks = structuredClone(chunks); changedChunks[0].sample_content_digest = "9".repeat(64);
  const changedIndex = Buffer.concat(changedChunks.map(encodeCreationAudioStreamChunk)), changedPath = resolve(dir, "changed-index.jsonl"); await writeFile(changedPath, changedIndex);
  const changedRoot = { ...root, run_id: "rebound", chunk_index: { sha256: sha(changedIndex), byte_length: changedIndex.length, record_count: changedChunks.length } }, changedRootDigest = creationDigest(changedRoot);
  const changedObject = resolve(projectPath, "objects", "sha256", changedRoot.chunk_index.sha256.slice(0, 2), changedRoot.chunk_index.sha256);
  const replaceBeforeRollback = boundRoot => {
    guard(boundRoot);
    if (rows("creation_audio_stream_index", changedRootDigest).length) { writeFileSync(changedObject, Buffer.from("replacement")); throw new Error("INJECTED_INDEX_REBOUND"); }
  };
  await assert.rejects(registerCreationAudioStreamRoot(session, projectId, changedRoot, changedPath, { assertCurrent: replaceBeforeRollback }), error => error instanceof AggregateError && error.errors.some(entry => String(entry).includes("CREATION_PREPARED_OBJECT_CLEANUP_REBOUND")));
  assert.equal((await readFile(changedObject)).toString(), "replacement", "rollback preserved a replaced object");
  assert.equal(rows("creation_audio_stream_index", changedRootDigest).length, 0);
  await rm(changedObject); await noOrphans();

  const registered = await registerCreationAudioStreamRoot(session, projectId, root, indexPath, { assertCurrent: guard });
  assert.equal(registered.root_digest, creationDigest(root)); assert.equal(registered.status, "registered");
  assert.equal((await registerCreationAudioStreamRoot(session, projectId, root, indexPath, { assertCurrent: guard })).status, "existing");

  // The same index content may be shared by multiple roots. A later rollback
  // must not delete the first root's pre-existing content-addressed object.
  const otherRoot = { ...root, run_id: "run-other" };
  session.db.exec("CREATE TEMP TRIGGER fail_shared_root BEFORE INSERT ON object_refs WHEN NEW.object_type='creation_audio_stream_root' BEGIN SELECT RAISE(ABORT, 'INJECTED_SHARED_FAILURE'); END");
  await assert.rejects(registerCreationAudioStreamRoot(session, projectId, otherRoot, indexPath, { assertCurrent: guard }), /INJECTED_SHARED_FAILURE/);
  session.db.exec("DROP TRIGGER fail_shared_root"); assert.equal(rows("creation_audio_stream_root").length, 1); await noOrphans();

  // Concurrent roots may reference the same hash. Serialize only the index
  // installation, preserve separate root authorization and allow cancellation
  // while waiting without cancelling the predecessor.
  const queuedRoot = { ...root, run_id: "queued-owner" }, cancelledRoot = { ...root, run_id: "queued-cancelled" }, queueAbort = new AbortController(), stopped = new Error("REQUEST_CANCELLED");
  const ownerJob = registerCreationAudioStreamRoot(session, projectId, queuedRoot, indexPath, { assertCurrent: guard });
  const waitingJob = registerCreationAudioStreamRoot(session, projectId, cancelledRoot, indexPath, { assertCurrent: guard, signal: queueAbort.signal });
  const waitingRejected = assert.rejects(waitingJob, error => error === stopped); queueAbort.abort(stopped); await waitingRejected;
  assert.equal((await ownerJob).status, "registered");
  assert.equal(rows("creation_audio_stream_root", creationDigest(cancelledRoot)).length, 0);
  const concurrent = await Promise.all([
    registerCreationAudioStreamRoot(session, projectId, { ...root, run_id: "parallel-a" }, indexPath, { assertCurrent: guard }),
    registerCreationAudioStreamRoot(session, projectId, { ...root, run_id: "parallel-b" }, indexPath, { assertCurrent: guard }),
  ]);
  assert.deepEqual(concurrent.map(item => item.status), ["registered", "registered"]);
  assert.equal(Number(session.db.prepare("SELECT COUNT(*) AS n FROM object_store WHERE object_hash=?").get(root.chunk_index.sha256).n), 1, "concurrent registrations reuse one verified content object");

  let selection = await selectCreationAudioStreamChunk(session, projectId, registered.root_digest, 0, { assertCurrent: guard });
  assert.deepEqual(selection.chunk, chunks[0]);
  let sawFrozenRoot = false;
  await selectCreationAudioStreamChunk(session, projectId, registered.root_digest, 0, { assertCurrent(boundRoot) { guard(boundRoot); assert.ok(Object.isFrozen(boundRoot) && Object.isFrozen(boundRoot.chunk_policy)); sawFrozenRoot = true; } });
  assert.equal(sawFrozenRoot, true, "authorization always receives an immutable identity snapshot");
  const call = { ...(await example("call")), call_id: "call-first", root_digest: registered.root_digest, chunk_index: selection.chunk.index, chunk_digest: creationDigest(selection.chunk), sample_id: selection.chunk.sample_id, target: transcription };
  const settle = async (callValue, status, details = {}) => ({ schema_version: 1, call_id: callValue.call_id, call_digest: creationDigest(callValue), root_digest: callValue.root_digest, status, usage: null, response_ref: null, reason_code: status === "unknown" ? "DELIVERY_UNCONFIRMED" : status === "failed" ? "PROVIDER_FAILED" : status === "cancelled" ? "REQUEST_REVOKED" : null, completed_at: "2026-11-11T00:00:02Z", ...details });
  assert.throws(() => reserveCreationAudioStreamCall(session, projectId, structuredClone(selection), call, { deployment, assertCurrent: guard }), /CREATION_AUDIO_LEDGER_SELECTION_INVALID/);
  assert.throws(() => reserveCreationAudioStreamCall(session, projectId, selection, call, { deployment, assertCurrent: async () => {} }), /CREATION_AUDIO_LEDGER_AUTHORITY_INVALID/);
  session.db.exec("BEGIN IMMEDIATE");
  try { assert.throws(() => reserveCreationAudioStreamCall(session, projectId, selection, call, { deployment, assertCurrent: guard }), /CREATION_AUDIO_LEDGER_TRANSACTION_BUSY/, "a reservation cannot escape an uncommitted outer transaction"); }
  finally { session.db.exec("ROLLBACK"); }
  assert.equal(rows("creation_audio_stream_call").length, 0);
  assert.equal(reserveCreationAudioStreamCall(session, projectId, selection, call, { deployment, assertCurrent: guard }).status, "reserved");
  assert.throws(() => reserveCreationAudioStreamCall(session, projectId, selection, call, { deployment, assertCurrent: guard }), /CREATION_AUDIO_CALL_ALREADY_RESERVED/);
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, selection, call.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "resolve-unknown", response: null });
  const retry = { ...call, call_id: "call-retry", attempt: 2 };
  assert.throws(() => reserveCreationAudioStreamCall(session, projectId, selection, retry, { deployment, assertCurrent: guard, explicitRetry: true }), /CREATION_AUDIO_CALL_UNCERTAIN/);

  // A crash after reservation leaves the send unknown after a real reopen.
  await session.close(); session = await openProject(projectPath);
  assert.throws(() => reserveCreationAudioStreamCall(session, projectId, selection, retry, { deployment, assertCurrent: guard, explicitRetry: true }), /CREATION_AUDIO_LEDGER_SELECTION_INVALID/);
  selection = await selectCreationAudioStreamChunk(session, projectId, registered.root_digest, 0, { assertCurrent: guard });
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, selection, call.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "resolve-unknown", response: null });
  const unknown = await settle(call, "unknown");
  assert.throws(() => settleCreationAudioStreamCall(session, projectId, call.call_id, unknown, undefined, { assertLedgerOwner: async () => {} }), /CREATION_AUDIO_LEDGER_AUTHORITY_INVALID/);
  session.db.exec("BEGIN IMMEDIATE");
  try { assert.throws(() => settleCreationAudioStreamCall(session, projectId, call.call_id, unknown, undefined, { assertLedgerOwner: owner }), /CREATION_AUDIO_LEDGER_TRANSACTION_BUSY/); }
  finally { session.db.exec("ROLLBACK"); }
  assert.equal(rows("creation_audio_stream_settlement", call.call_id).length, 0);
  assert.equal(settleCreationAudioStreamCall(session, projectId, call.call_id, unknown, undefined, { assertLedgerOwner: owner }).status, "recorded");
  assert.equal(settleCreationAudioStreamCall(session, projectId, call.call_id, unknown, undefined, { assertLedgerOwner: owner }).status, "existing");
  assert.throws(() => reserveCreationAudioStreamCall(session, projectId, selection, retry, { deployment, assertCurrent: guard, explicitRetry: true }), /CREATION_AUDIO_CALL_UNCERTAIN/);
  const failure = await settle(call, "failed", { usage: { input: 3, output: 4, total: 7 }, completed_at: "2026-11-11T00:00:03Z" });
  assert.equal(settleCreationAudioStreamCall(session, projectId, call.call_id, failure, undefined, { assertLedgerOwner: owner }).status, "recorded");
  assert.deepEqual(rows("creation_audio_stream_settlement", call.call_id).map(row => row.version), [1, 2], "unknown history remains immutable after a later known result");
  assert.throws(() => reserveCreationAudioStreamCall(session, projectId, selection, retry, { deployment, assertCurrent: guard }), /CREATION_AUDIO_CALL_ATTEMPT_INVALID/);
  assert.equal(reserveCreationAudioStreamCall(session, projectId, selection, retry, { deployment, assertCurrent: guard, explicitRetry: true }).status, "reserved");

  const response = { segments: [] }, responseId = `${projectId}:audio-stream-response:${retry.call_id}`;
  const success = await settle(retry, "response", { response_ref: { object_ref_id: responseId, digest: creationDigest(response) }, usage: { input: 8, output: 4, total: 12 }, completed_at: "2026-11-11T00:00:04Z" });
  session.db.exec("CREATE TEMP TRIGGER fail_audio_settlement BEFORE INSERT ON object_refs WHEN NEW.object_type='creation_audio_stream_settlement' BEGIN SELECT RAISE(ABORT, 'INJECTED_SETTLEMENT_FAILURE'); END");
  const sharedSuccess = { ...success, response_ref: { object_ref_id: responseId, digest: creationDigest(root) } };
  assert.throws(() => settleCreationAudioStreamCall(session, projectId, retry.call_id, sharedSuccess, root, { assertLedgerOwner: owner, selection, deployment, assertCurrent: guard, validateResponse() {} }), /INJECTED_SETTLEMENT_FAILURE/);
  assert.deepEqual((await selectCreationAudioStreamChunk(session, projectId, registered.root_digest, 0, { assertCurrent: guard })).chunk, chunks[0], "rollback preserves an existing object shared with another reference");
  assert.throws(() => settleCreationAudioStreamCall(session, projectId, retry.call_id, success, response, { assertLedgerOwner: owner, selection, deployment, assertCurrent: guard, validateResponse: responseValidator }), /INJECTED_SETTLEMENT_FAILURE/);
  session.db.exec("DROP TRIGGER fail_audio_settlement"); assert.equal(rows("creation_audio_stream_response", retry.call_id).length, 0); assert.equal(rows("creation_audio_stream_settlement", retry.call_id).length, 0); await noOrphans();

  // Revocation during the transaction cannot publish output or a success.
  const revokeDuringCommit = boundRoot => { guard(boundRoot); if (rows("creation_audio_stream_response", retry.call_id).length) { allowed = false; throw new Error("REQUEST_REVOKED"); } };
  assert.throws(() => settleCreationAudioStreamCall(session, projectId, retry.call_id, success, response, { assertLedgerOwner: owner, selection, deployment, assertCurrent: revokeDuringCommit, validateResponse: responseValidator }), /REQUEST_REVOKED/);
  assert.equal(rows("creation_audio_stream_response", retry.call_id).length, 0); assert.equal(rows("creation_audio_stream_settlement", retry.call_id).length, 0); await noOrphans();
  // An already-dispatched call is not erased: only the ledger owner may record
  // its accurate cancellation/known usage; no response content is published.
  const cancelled = await settle(retry, "cancelled", { usage: { input: 8, output: 4, total: 12 }, completed_at: "2026-11-11T00:00:04Z" });
  assert.equal(settleCreationAudioStreamCall(session, projectId, retry.call_id, cancelled, undefined, { assertLedgerOwner: owner }).status, "recorded");
  assert.equal(rows("creation_audio_stream_call").length, 2); assert.equal(rows("creation_audio_stream_response", retry.call_id).length, 0);
  const cancelledRow = rows("creation_audio_stream_settlement", retry.call_id)[0], recordedCancellation = JSON.parse(readObjectSync(projectPath, cancelledRow.object_hash).toString("utf8"));
  assert.deepEqual(recordedCancellation.usage, { input: 8, output: 4, total: 12 }); assert.equal(recordedCancellation.status, "cancelled");
  await assert.rejects(recoverCreationAudioStreamCall(session, projectId, selection, retry.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), /REQUEST_REVOKED/);
  generation++; allowed = true;
  await assert.rejects(selectCreationAudioStreamChunk(session, projectId, registered.root_digest, 0, { assertCurrent: guard }), /REQUEST_REVOKED/, "reauthorization generation cannot rebind an old root");

  // A separate sound call can finish and be reused only with a fresh root,
  // current permission, exact indexed bytes, and validated durable response.
  const renewed = { ...root, run_id: "renewed", authorization_generation: generation };
  const renewedReg = await registerCreationAudioStreamRoot(session, projectId, renewed, indexPath, { assertCurrent: guard });
  let renewedSelection = await selectCreationAudioStreamChunk(session, projectId, renewedReg.root_digest, 0, { assertCurrent: guard });
  const audioCall = { ...call, call_id: "call-sound", root_digest: renewedReg.root_digest, chunk_digest: creationDigest(renewedSelection.chunk), sample_id: renewedSelection.chunk.sample_id, target: sound };
  reserveCreationAudioStreamCall(session, projectId, renewedSelection, audioCall, { deployment, assertCurrent: guard });
  const audioResponseId = `${projectId}:audio-stream-response:${audioCall.call_id}`;
  const audioSuccess = await settle(audioCall, "response", { response_ref: { object_ref_id: audioResponseId, digest: creationDigest(response) } });
  assert.equal(settleCreationAudioStreamCall(session, projectId, audioCall.call_id, audioSuccess, response, { assertLedgerOwner: owner, selection: renewedSelection, deployment, assertCurrent: guard, validateResponse: responseValidator }).status, "recorded");
  assert.throws(() => settleCreationAudioStreamCall(session, projectId, audioCall.call_id, audioSuccess, { segments: ["different"] }, { assertLedgerOwner: owner }), /CREATION_AUDIO_LEDGER_RESPONSE_INVALID/, "idempotent recovery rejects a different supplied response");
  assert.equal(settleCreationAudioStreamCall(session, projectId, audioCall.call_id, audioSuccess, response, { assertLedgerOwner: owner }).status, "existing");
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, renewedSelection, audioCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "reuse-verified-response", response: { ref: audioSuccess.response_ref, value: response } });
  assert.throws(() => reserveCreationAudioStreamCall(session, projectId, renewedSelection, { ...audioCall, call_id: "duplicate-sound", attempt: 2 }, { deployment, assertCurrent: guard, explicitRetry: true }), /CREATION_AUDIO_CALL_ALREADY_COMPLETE/);
  // A late, previously unconfirmed response is appended as a new immutable
  // settlement; the unknown record is retained and the shared output reused.
  const nextSelection = await selectCreationAudioStreamChunk(session, projectId, renewedReg.root_digest, 1, { assertCurrent: guard });
  const lateCall = { ...audioCall, call_id: "call-late", chunk_index: nextSelection.chunk.index, chunk_digest: creationDigest(nextSelection.chunk), sample_id: nextSelection.chunk.sample_id, target: transcription };
  reserveCreationAudioStreamCall(session, projectId, nextSelection, lateCall, { deployment, assertCurrent: guard });
  const lateUnknown = await settle(lateCall, "unknown"); settleCreationAudioStreamCall(session, projectId, lateCall.call_id, lateUnknown, undefined, { assertLedgerOwner: owner });
  const lateResponse = await settle(lateCall, "response", { response_ref: { object_ref_id: `${projectId}:audio-stream-response:${lateCall.call_id}`, digest: creationDigest(response) }, completed_at: "2026-11-11T00:00:03Z" });
  settleCreationAudioStreamCall(session, projectId, lateCall.call_id, lateResponse, response, { assertLedgerOwner: owner, selection: nextSelection, deployment, assertCurrent: guard, validateResponse: responseValidator });
  assert.deepEqual(rows("creation_audio_stream_settlement", lateCall.call_id).map(row => row.version), [1, 2]);
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, nextSelection, lateCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "reuse-verified-response", response: { ref: lateResponse.response_ref, value: response } });
  session.db.exec("BEGIN IMMEDIATE");
  try {
    session.db.prepare("INSERT INTO object_refs(object_ref_id,project_id,object_hash,object_type,version,relation_key,metadata_json,created_at) SELECT ?,project_id,object_hash,object_type,version,relation_key,metadata_json,created_at FROM object_refs WHERE object_ref_id=?").run("forged-duplicate-settlement", `${projectId}:audio-stream-settlement:${lateCall.call_id}:1`);
    await assert.rejects(recoverCreationAudioStreamCall(session, projectId, nextSelection, lateCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), /CREATION_AUDIO_LEDGER_REFERENCE_INVALID/);
  } finally { session.db.exec("ROLLBACK"); }
  await session.close(); session = await openProject(projectPath);
  renewedSelection = await selectCreationAudioStreamChunk(session, projectId, renewedReg.root_digest, 0, { assertCurrent: guard });
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, renewedSelection, audioCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "reuse-verified-response", response: { ref: audioSuccess.response_ref, value: response } }, "a durable verified response survives a real project reopen");
  const responseRow = rows("creation_audio_stream_response", audioCall.call_id)[0], responseObject = session.db.prepare("SELECT object_path FROM object_store WHERE object_hash=?").get(responseRow.object_hash), originalResponseBytes = await readFile(responseObject.object_path);
  await writeFile(responseObject.object_path, Buffer.from("tampered"));
  await assert.rejects(recoverCreationAudioStreamCall(session, projectId, renewedSelection, audioCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), /object hash mismatch|object length changed/);
  await writeFile(responseObject.object_path, originalResponseBytes);
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, renewedSelection, audioCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "reuse-verified-response", response: { ref: audioSuccess.response_ref, value: response } });

  // COMMIT can succeed while its acknowledgement is lost. Never erase the
  // reservation or guess that a physical request is safe to send again.
  const lostSelection = await selectCreationAudioStreamChunk(session, projectId, renewedReg.root_digest, 2, { assertCurrent: guard });
  const lostCall = { ...audioCall, call_id: "call-lost-ack", chunk_index: lostSelection.chunk.index, chunk_digest: creationDigest(lostSelection.chunk), sample_id: lostSelection.chunk.sample_id };
  const originalExec = session.db.exec, runExec = originalExec.bind(session.db);
  session.db.exec = statement => { const value = runExec(statement); if (statement === "COMMIT") throw new Error("INJECTED_COMMIT_ACK_LOST"); return value; };
  try { assert.throws(() => reserveCreationAudioStreamCall(session, projectId, lostSelection, lostCall, { deployment, assertCurrent: guard }), /INJECTED_COMMIT_ACK_LOST/); }
  finally { session.db.exec = originalExec; }
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, lostSelection, lostCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "resolve-unknown", response: null });
  assert.throws(() => reserveCreationAudioStreamCall(session, projectId, lostSelection, { ...lostCall, call_id: "lost-ack-retry", attempt: 2 }, { deployment, assertCurrent: guard, explicitRetry: true }), /CREATION_AUDIO_CALL_UNCERTAIN/);
  const unknownWithUsage = await settle(lostCall, "unknown", { usage: { input: 2, output: 3, total: 5 } });
  settleCreationAudioStreamCall(session, projectId, lostCall.call_id, unknownWithUsage, undefined, { assertLedgerOwner: owner });
  const unknownWithUsageRow = rows("creation_audio_stream_settlement", lostCall.call_id)[0];
  assert.deepEqual(JSON.parse(readObjectSync(projectPath, unknownWithUsageRow.object_hash).toString("utf8")).usage, { input: 2, output: 3, total: 5 });
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, lostSelection, lostCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "resolve-unknown", response: null });

  // The same lost acknowledgement on settlement preserves both response and
  // settlement and allows recovery without another model call.
  const settledSelection = await selectCreationAudioStreamChunk(session, projectId, renewedReg.root_digest, 3, { assertCurrent: guard });
  const settledCall = { ...audioCall, call_id: "settlement-lost-ack", chunk_index: settledSelection.chunk.index, chunk_digest: creationDigest(settledSelection.chunk), sample_id: settledSelection.chunk.sample_id };
  reserveCreationAudioStreamCall(session, projectId, settledSelection, settledCall, { deployment, assertCurrent: guard });
  const settledReceipt = await settle(settledCall, "response", { response_ref: { object_ref_id: `${projectId}:audio-stream-response:${settledCall.call_id}`, digest: creationDigest(response) } });
  session.db.exec = statement => { const value = runExec(statement); if (statement === "COMMIT") throw new Error("INJECTED_COMMIT_ACK_LOST"); return value; };
  try { assert.throws(() => settleCreationAudioStreamCall(session, projectId, settledCall.call_id, settledReceipt, response, { assertLedgerOwner: owner, selection: settledSelection, deployment, assertCurrent: guard, validateResponse: responseValidator }), /INJECTED_COMMIT_ACK_LOST/); }
  finally { session.db.exec = originalExec; }
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, settledSelection, settledCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "reuse-verified-response", response: { ref: settledReceipt.response_ref, value: response } });

  // A separate process exits without closing SQLite after each committed
  // boundary. The real project lock recovery and WAL reopen must preserve the
  // reservation/response records. No provider is contacted by this fixture.
  await session.close(); session = undefined;
  const abruptScript = `
    import { readFileSync } from 'node:fs';
    import { resolve } from 'node:path';
    import { pathToFileURL } from 'node:url';
    const input=JSON.parse(readFileSync(0,'utf8'));
    const url=p=>pathToFileURL(resolve(p)).href;
    const {openProject}=await import(url('packages/platform/project-storage/src/project-storage.mjs'));
    const {selectCreationAudioStreamChunk,reserveCreationAudioStreamCall,settleCreationAudioStreamCall}=await import(url('packages/platform/project-storage/src/creation-audio-stream-store.mjs'));
    const session=await openProject(input.projectPath), guard=()=>{};
    const selection=await selectCreationAudioStreamChunk(session,input.projectId,input.rootDigest,input.index,{assertCurrent:guard});
    reserveCreationAudioStreamCall(session,input.projectId,selection,input.call,{deployment:input.deployment,assertCurrent:guard});
    if(input.settlement) settleCreationAudioStreamCall(session,input.projectId,input.call.call_id,input.settlement,input.response,{assertLedgerOwner:guard,selection,deployment:input.deployment,assertCurrent:guard,validateResponse:guard});
    process.exit(input.settlement ? 80 : 79);
  `;
  const abrupt = (input, expectedStatus) => {
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", abruptScript], { cwd: process.cwd(), input: JSON.stringify(input), encoding: "utf8" });
    assert.equal(child.status, expectedStatus, `isolated child did not reach intended crash boundary: ${child.stderr}`);
  };
  const crashChunk = chunks[2], crashCall = { ...audioCall, call_id: "abrupt-reservation", chunk_index: 2, chunk_digest: creationDigest(crashChunk), sample_id: crashChunk.sample_id, target: transcription };
  abrupt({ projectPath, projectId, rootDigest: renewedReg.root_digest, index: 2, call: crashCall, deployment }, 79);
  session = await openProject(projectPath);
  let crashSelection = await selectCreationAudioStreamChunk(session, projectId, renewedReg.root_digest, 2, { assertCurrent: guard });
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, crashSelection, crashCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "resolve-unknown", response: null });
  assert.throws(() => reserveCreationAudioStreamCall(session, projectId, crashSelection, { ...crashCall, call_id: "abrupt-retry", attempt: 2 }, { deployment, assertCurrent: guard, explicitRetry: true }), /CREATION_AUDIO_CALL_UNCERTAIN/);
  await session.close(); session = undefined;
  const completeChunk = chunks[3], completeCall = { ...audioCall, call_id: "abrupt-response", chunk_index: 3, chunk_digest: creationDigest(completeChunk), sample_id: completeChunk.sample_id, target: transcription };
  const completeSettlement = await settle(completeCall, "response", { response_ref: { object_ref_id: `${projectId}:audio-stream-response:${completeCall.call_id}`, digest: creationDigest(response) } });
  abrupt({ projectPath, projectId, rootDigest: renewedReg.root_digest, index: 3, call: completeCall, deployment, settlement: completeSettlement, response }, 80);
  session = await openProject(projectPath);
  crashSelection = await selectCreationAudioStreamChunk(session, projectId, renewedReg.root_digest, 3, { assertCurrent: guard });
  assert.deepEqual(await recoverCreationAudioStreamCall(session, projectId, crashSelection, completeCall.call_id, { deployment, assertCurrent: guard, validateResponse: responseValidator }), { action: "reuse-verified-response", response: { ref: completeSettlement.response_ref, value: response } });
  await noOrphans();
  console.log("Audio stream ledger: atomic root/index, reservation, uncertain recovery, revocation and durable response passed");
} finally { await session?.close(); await rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
