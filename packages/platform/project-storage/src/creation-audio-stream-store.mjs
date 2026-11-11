import { createReadStream } from "node:fs";
import { existsSync } from "node:fs";
import { lstat, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { creationDigest, verifyCreationAudioStreamIndex, validateCreationAudioStreamCall, classifyCreationAudioStreamRecovery, creationAudioStreamCallV1Validator, creationAudioStreamSettlementV1Validator } from "../../contract-runtime/src/public.mjs";
import { prepareContentAddressedFile, checkedFileIdentity, runCreationObjectMutation, registerPreparedCreationObjectInTransaction, storeCanonicalJsonInTransaction, readObjectSync } from "./project-storage.mjs";

// Same-package Host storage only: this module never performs a model send.
// Root/index, reservations, responses and settlements are separate immutable
// object refs. No state transition may treat a reservation as a response.
const selections = new WeakMap();
const pendingIndexes = new WeakMap();
const error = (code, message) => { throw new Error(`${code}: ${message}`); };
const maxMetadataBytes = 64 * 1024, maxResponseBytes = 8 * 1024 * 1024;
const freezeTree = value => { if (value && typeof value === "object") { for (const child of Object.values(value)) freezeTree(child); Object.freeze(value); } return value; };
const identifier = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const refId = (projectId, type, suffix) => `${projectId}:audio-stream-${type}:${suffix}`;
const callRelation = (rootDigest, chunkIndex, role) => `${rootDigest}:${chunkIndex}:${role}`;
const checkSession = (session, projectId) => { if (!session?.db?.isOpen || session.manifest?.project_id !== projectId) error("CREATION_AUDIO_LEDGER_PROJECT_INVALID", "the authorized project session is unavailable"); };
const requireOwnedTransaction = session => { if (session.db.isTransaction || session.__creationObjectWrites) error("CREATION_AUDIO_LEDGER_TRANSACTION_BUSY", "audio reservations and settlements must commit their own transaction"); };
const checkCallback = callback => { if (typeof callback !== "function") error("CREATION_AUDIO_LEDGER_AUTHORITY_REQUIRED", "a Host-owned guard is required"); };
const requireSync = (callback, ...args) => {
  const result = callback(...args);
  if (result && typeof result.then === "function") { Promise.resolve(result).catch(() => {}); error("CREATION_AUDIO_LEDGER_AUTHORITY_INVALID", "transaction guards must be synchronous"); }
  if (result === false) error("CREATION_AUDIO_LEDGER_AUTHORITY_INVALID", "transaction guard rejected the operation");
};
const bounded = (value, maximum, name) => { const text = JSON.stringify(value); if (typeof text !== "string" || Buffer.byteLength(text) > maximum) error("CREATION_AUDIO_LEDGER_LIMIT", `${name} exceeds its bounded metadata limit`); return text; };
async function withIndexInstall(session, digest, signal, operation) {
  if (typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest)) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "a valid index hash is required");
  let pending = pendingIndexes.get(session);
  if (!pending) { pending = new Map(); pendingIndexes.set(session, pending); }
  const previous = pending.get(digest) ?? Promise.resolve();
  let release;
  const owned = new Promise(resolve => { release = resolve; });
  const tail = previous.then(() => owned);
  pending.set(digest, tail);
  try {
    if (!signal) await previous;
    else await new Promise((resolve, reject) => {
      const abort = () => { signal.removeEventListener("abort", abort); reject(signal.reason); };
      if (signal.aborted) { abort(); return; }
      signal.addEventListener("abort", abort, { once: true });
      previous.then(() => { signal.removeEventListener("abort", abort); resolve(); }, cause => { signal.removeEventListener("abort", abort); reject(cause); });
    });
    if (signal?.aborted) throw signal.reason;
    return await operation();
  } finally {
    release();
    void tail.then(() => { if (pending.get(digest) === tail) pending.delete(digest); });
  }
}

function ref(session, projectId, id, type, relation) {
  const row = session.db.prepare("SELECT object_ref_id, object_hash, object_type, relation_key, version FROM object_refs WHERE project_id=? AND object_ref_id=?").get(projectId, id);
  if (!row || row.object_type !== type || row.relation_key !== relation) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "required immutable reference is missing or rebound");
  return row;
}
function objectLocation(session, row, maxBytes) {
  const object = session.db.prepare("SELECT object_path,byte_length FROM object_store WHERE object_hash=?").get(row.object_hash);
  const path = resolve(session.projectDirectory, "objects", "sha256", row.object_hash.slice(0, 2), row.object_hash);
  if (!object || resolve(object.object_path) !== path || !Number.isSafeInteger(Number(object.byte_length)) || Number(object.byte_length) < 0 || (maxBytes !== undefined && Number(object.byte_length) > maxBytes)) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "object location or length differs");
  return { path, byte_length: Number(object.byte_length) };
}
function jsonObject(session, row, maxBytes = maxMetadataBytes) {
  const info = objectLocation(session, row, maxBytes), bytes = readObjectSync(session.projectDirectory, row.object_hash);
  if (bytes.length !== info.byte_length) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "object length changed");
  try { return JSON.parse(bytes.toString("utf8")); } catch (cause) { throw new Error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID: malformed stored JSON", { cause }); }
}
function rootRefs(session, projectId, digest) {
  const root = ref(session, projectId, refId(projectId, "root", digest), "creation_audio_stream_root", digest);
  const index = ref(session, projectId, refId(projectId, "index", digest), "creation_audio_stream_index", digest);
  if (root.object_hash !== digest) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "root object does not have its canonical identity");
  const value = freezeTree(jsonObject(session, root));
  if (value.project_id !== projectId || creationDigest(value) !== digest || value.chunk_index?.sha256 !== index.object_hash) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "root and index identities differ");
  const indexObject = objectLocation(session, index);
  if (indexObject.byte_length !== value.chunk_index.byte_length) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "index length differs from root");
  return { value, index, indexObject };
}

/** Install the complete, prevalidated chunk index and root together. The
 * staged file is copied and hashed by the shared object-store implementation. */
export async function registerCreationAudioStreamRoot(session, projectId, rootValue, indexPath, { assertCurrent, signal } = {}) {
  checkSession(session, projectId); checkCallback(assertCurrent);
  requireOwnedTransaction(session);
  const root = freezeTree(structuredClone(rootValue)); bounded(root, maxMetadataBytes, "root");
  if (root?.project_id !== projectId) error("CREATION_AUDIO_LEDGER_PROJECT_INVALID", "root belongs to a different project");
  const guard = () => { checkSession(session, projectId); if (signal?.aborted) throw signal.reason; requireSync(assertCurrent, root); if (signal?.aborted) throw signal.reason; };
  guard();
  return withIndexInstall(session, root.chunk_index?.sha256, signal, async () => {
  guard();
  const prepared = await prepareContentAddressedFile(session.projectDirectory, indexPath, root.chunk_index?.sha256);
  let failure;
  try {
    if (prepared.byte_length !== root.chunk_index.byte_length) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "prepared index length differs");
    const verifyGuard = () => { guard(); if (checkedFileIdentity(prepared.temporary) !== prepared.temporaryIdentity) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "prepared index changed"); };
    const checked = await verifyCreationAudioStreamIndex(root, createReadStream(prepared.temporary, { highWaterMark: 64 * 1024 }), { assertCurrent: verifyGuard, signal });
    const digest = checked.root_digest; verifyGuard();
    requireOwnedTransaction(session);
    return runCreationObjectMutation(session, () => {
      verifyGuard();
      const rootId = refId(projectId, "root", digest), indexId = refId(projectId, "index", digest);
      const oldRoot = session.db.prepare("SELECT 1 FROM object_refs WHERE project_id=? AND object_ref_id=?").get(projectId, rootId), oldIndex = session.db.prepare("SELECT 1 FROM object_refs WHERE project_id=? AND object_ref_id=?").get(projectId, indexId);
      if (oldRoot || oldIndex) {
        if (!oldRoot || !oldIndex) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "incomplete root registration");
        const existing = rootRefs(session, projectId, digest);
        if (existing.index.object_hash !== prepared.hash || !prepared.existingIdentity || checkedFileIdentity(prepared.path) !== prepared.existingIdentity) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "existing index changed");
        verifyGuard(); return { root_digest: digest, status: "existing" };
      }
      registerPreparedCreationObjectInTransaction(session, projectId, prepared, { object_ref_id: indexId, object_type: "creation_audio_stream_index", version: 1, relation_key: digest }, guard);
      storeCanonicalJsonInTransaction(session, projectId, root, { object_ref_id: rootId, object_type: "creation_audio_stream_root", version: 1, relation_key: digest }, new Date().toISOString());
      // prepared.temporary has moved after a new installation; check the
      // installed path via the immutable object row and recheck authorization.
      guard(); rootRefs(session, projectId, digest); guard();
      return { root_digest: digest, status: "registered" };
    });
  } catch (cause) { failure = cause; throw cause; }
  finally {
    try { if (existsSync(prepared.temporary)) { if (checkedFileIdentity(prepared.temporary) !== prepared.temporaryIdentity) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "prepared index cleanup identity changed"); await rm(prepared.temporary); } }
    catch (cleanup) { if (failure !== undefined) throw new AggregateError([failure, cleanup], "Audio index registration and cleanup failed", { cause: failure }); throw cleanup; }
  }
  });
}

/** Reopening must stream and verify the saved index again; the selected
 * process-local receipt cannot be deserialized or rebound to another project. */
export async function selectCreationAudioStreamChunk(session, projectId, rootDigest, selectedIndex, { assertCurrent, signal } = {}) {
  checkSession(session, projectId); checkCallback(assertCurrent);
  const loaded = rootRefs(session, projectId, rootDigest), identity = checkedFileIdentity(loaded.indexObject.path);
  const guard = root => { checkSession(session, projectId); if (signal?.aborted) throw signal.reason; if (checkedFileIdentity(loaded.indexObject.path) !== identity) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "stored index changed"); requireSync(assertCurrent, root); if (signal?.aborted) throw signal.reason; };
  const receipt = await verifyCreationAudioStreamIndex(loaded.value, createReadStream(loaded.indexObject.path, { highWaterMark: 64 * 1024 }), { assertCurrent: guard, selectedIndex, signal });
  guard(loaded.value);
  const selection = Object.freeze({ root_digest: rootDigest, chunk: receipt.selected_chunk });
  selections.set(selection, { session, projectId, rootDigest, root: loaded.value, receipt, indexPath: loaded.indexObject.path, identity });
  return selection;
}

function selectionGuard(session, projectId, selection, assertCurrent) {
  checkSession(session, projectId); checkCallback(assertCurrent);
  const proof = selection && selections.get(selection);
  if (!proof || proof.session !== session || proof.projectId !== projectId) error("CREATION_AUDIO_LEDGER_SELECTION_INVALID", "a fresh project-bound selection is required");
  const loaded = rootRefs(session, projectId, proof.rootDigest);
  if (creationDigest(loaded.value) !== proof.rootDigest || loaded.indexObject.path !== proof.indexPath || checkedFileIdentity(proof.indexPath) !== proof.identity) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "root or index changed after selection");
  requireSync(assertCurrent, loaded.value); return proof;
}

/** Recheck the project-bound index and current Host authority immediately
 * after reservation and before entering the physical transport. */
export function assertCurrentCreationAudioStreamSelection(session, projectId, selection, assertCurrent) {
  return selectionGuard(session, projectId, selection, assertCurrent).root;
}

function callRow(session, projectId, callId) {
  const row = session.db.prepare("SELECT object_ref_id,object_hash,object_type,relation_key,version FROM object_refs WHERE project_id=? AND object_ref_id=?").get(projectId, refId(projectId, "call", callId));
  if (!row) return null;
  const value = jsonObject(session, row);
  if (row.object_type !== "creation_audio_stream_call" || !creationAudioStreamCallV1Validator(value) || value.call_id !== callId || creationDigest(value) !== row.object_hash || row.relation_key !== callRelation(value.root_digest, value.chunk_index, value.target.role) || row.version !== value.attempt) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "stored call identity changed");
  return { value, object_hash: row.object_hash, relation: row.relation_key };
}
function latestSettlement(session, projectId, callId) {
  const row = session.db.prepare("SELECT object_ref_id,object_hash,object_type,relation_key,version FROM object_refs WHERE project_id=? AND object_type='creation_audio_stream_settlement' AND relation_key=? ORDER BY version DESC LIMIT 1").get(projectId, callId);
  if (!row) return null;
  const count = session.db.prepare("SELECT COUNT(*) AS n FROM object_refs WHERE project_id=? AND object_type='creation_audio_stream_settlement' AND relation_key=?").get(projectId, callId).n;
  if (Number(count) !== row.version) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "settlement history is missing or duplicated");
  const call = callRow(session, projectId, callId), check = item => {
    const value = jsonObject(session, item);
    if (!call || ![1, 2].includes(item.version) || item.object_ref_id !== refId(projectId, "settlement", `${callId}:${item.version}`) || !creationAudioStreamSettlementV1Validator(value) || value.call_id !== callId || value.call_digest !== call.object_hash || value.root_digest !== call.value.root_digest || creationDigest(value) !== item.object_hash || Date.parse(value.completed_at) < Date.parse(call.value.dispatch_committed_at) || value.usage && (!Number.isSafeInteger(value.usage.input + value.usage.output) || value.usage.total !== value.usage.input + value.usage.output)) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "stored settlement changed");
    return value;
  };
  const value = check(row);
  if (row.version === 2) {
    const first = ref(session, projectId, refId(projectId, "settlement", `${callId}:1`), "creation_audio_stream_settlement", callId), prior = check(first);
    if (prior.status !== "unknown" || value.status === "unknown" || Date.parse(value.completed_at) < Date.parse(prior.completed_at)) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "unknown resolution history changed");
  }
  return { value, object_hash: row.object_hash, version: row.version };
}

/** This synchronous method commits the reservation before returning. The Host
 * must recheck authorization and call the provider immediately after return. */
export function reserveCreationAudioStreamCall(session, projectId, selection, callValue, { deployment, assertCurrent, explicitRetry = false } = {}) {
  const call = structuredClone(callValue); bounded(call, maxMetadataBytes, "reservation");
  if (!identifier(call?.call_id) || typeof explicitRetry !== "boolean") error("CREATION_AUDIO_LEDGER_CALL_INVALID", "safe call ID and explicit retry state required");
  const proof = selectionGuard(session, projectId, selection, assertCurrent), verify = () => selectionGuard(session, projectId, selection, assertCurrent);
  const bound = validateCreationAudioStreamCall(proof.root, selection.chunk, call, { deployment, indexReceipt: proof.receipt, assertCurrent: verify });
  requireOwnedTransaction(session);
  return runCreationObjectMutation(session, () => {
    verify();
    if (callRow(session, projectId, call.call_id)) error("CREATION_AUDIO_CALL_ALREADY_RESERVED", "an existing reservation must never trigger another send");
    const relation = callRelation(bound.root_digest, call.chunk_index, call.target.role);
    let priorCount = 0;
    for (const row of session.db.prepare("SELECT object_ref_id,object_hash,object_type,relation_key,version FROM object_refs WHERE project_id=? AND object_type='creation_audio_stream_call' AND relation_key=? ORDER BY version,object_ref_id").iterate(projectId, relation)) {
      const lastValue = jsonObject(session, row), previous = callRow(session, projectId, lastValue.call_id), settled = latestSettlement(session, projectId, lastValue.call_id);
      priorCount++;
      if (!previous || previous.object_hash !== row.object_hash || previous.value.attempt !== priorCount || row.version !== priorCount) error("CREATION_AUDIO_CALL_ATTEMPT_INVALID", "attempt history is incomplete or duplicated");
      if (!settled || settled.value.status === "unknown") error("CREATION_AUDIO_CALL_UNCERTAIN", "an unconfirmed physical send cannot be repeated");
      if (settled.value.status === "response") error("CREATION_AUDIO_CALL_ALREADY_COMPLETE", "the verified response must be reused");
      if (settled.value.status !== "failed") error("CREATION_AUDIO_CALL_RETRY_REQUIRED", "a cancelled call cannot be silently retried");
    }
    if (priorCount ? call.attempt !== priorCount + 1 || !explicitRetry : call.attempt !== 1 || explicitRetry) error("CREATION_AUDIO_CALL_ATTEMPT_INVALID", "only explicit, sequential retries after failure are allowed");
    const saved = storeCanonicalJsonInTransaction(session, projectId, call, { object_ref_id: refId(projectId, "call", call.call_id), object_type: "creation_audio_stream_call", version: call.attempt, relation_key: relation }, new Date().toISOString());
    if (saved.object_hash !== bound.call_digest) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "reservation digest differs");
    verify(); return { call_digest: saved.object_hash, status: "reserved" };
  });
}

/** Records accounting even after authorization is revoked, through a distinct
 * ledger-owner guard. Response publication additionally requires current
 * source authority and role-specific output validation. */
export function settleCreationAudioStreamCall(session, projectId, callId, settlementValue, response, { assertLedgerOwner, selection, deployment, assertCurrent, validateResponse } = {}) {
  checkSession(session, projectId); checkCallback(assertLedgerOwner);
  requireOwnedTransaction(session);
  if (!identifier(callId)) error("CREATION_AUDIO_LEDGER_CALL_INVALID", "safe call ID required");
  const settlement = structuredClone(settlementValue); bounded(settlement, maxMetadataBytes, "settlement");
  if (response !== undefined) bounded(response, maxResponseBytes, "response");
  const outputSnapshot = response === undefined ? undefined : structuredClone(response);
  const ownerGuard = () => { checkSession(session, projectId); requireSync(assertLedgerOwner); };
  return runCreationObjectMutation(session, () => {
    ownerGuard();
    const call = callRow(session, projectId, callId);
    if (!call || !creationAudioStreamSettlementV1Validator(settlement) || settlement.call_id !== callId || settlement.call_digest !== call.object_hash || settlement.root_digest !== call.value.root_digest || Date.parse(settlement.completed_at) < Date.parse(call.value.dispatch_committed_at) || settlement.usage && (!Number.isSafeInteger(settlement.usage.input + settlement.usage.output) || settlement.usage.total !== settlement.usage.input + settlement.usage.output)) error("CREATION_AUDIO_LEDGER_SETTLEMENT_INVALID", "settlement does not bind the reserved call");
    const existing = latestSettlement(session, projectId, callId);
    const settlementHash = creationDigest(settlement);
    if (existing?.object_hash === settlementHash) {
      if (settlement.status === "response" ? outputSnapshot === undefined || creationDigest(outputSnapshot) !== settlement.response_ref.digest : outputSnapshot !== undefined) error("CREATION_AUDIO_LEDGER_RESPONSE_INVALID", "idempotent settlement payload differs");
      ownerGuard(); return { settlement_digest: settlementHash, status: "existing" };
    }
    if (existing && (existing.version !== 1 || existing.value.status !== "unknown" || settlement.status === "unknown" || Date.parse(settlement.completed_at) < Date.parse(existing.value.completed_at))) error("CREATION_AUDIO_LEDGER_SETTLEMENT_CONFLICT", "only an unknown first outcome can be resolved once in time order");
    const version = existing ? 2 : 1;
    if (settlement.status === "response") {
      const proof = selectionGuard(session, projectId, selection, assertCurrent), verify = () => selectionGuard(session, projectId, selection, assertCurrent);
      validateCreationAudioStreamCall(proof.root, selection.chunk, call.value, { deployment, indexReceipt: proof.receipt, assertCurrent: verify });
      if (typeof validateResponse !== "function" || outputSnapshot === undefined || settlement.response_ref?.object_ref_id !== refId(projectId, "response", callId)) error("CREATION_AUDIO_LEDGER_RESPONSE_INVALID", "current authority, validator and deterministic response identity required");
      requireSync(validateResponse, call.value.target.role, structuredClone(outputSnapshot)); verify();
      const output = storeCanonicalJsonInTransaction(session, projectId, outputSnapshot, { object_ref_id: settlement.response_ref.object_ref_id, object_type: "creation_audio_stream_response", version: 1, relation_key: callId }, new Date().toISOString());
      if (output.object_hash !== settlement.response_ref.digest) error("CREATION_AUDIO_LEDGER_RESPONSE_INVALID", "response hash differs from settlement");
      verify();
    } else if (response !== undefined) error("CREATION_AUDIO_LEDGER_RESPONSE_INVALID", "non-response settlement cannot publish a response");
    const saved = storeCanonicalJsonInTransaction(session, projectId, settlement, { object_ref_id: refId(projectId, "settlement", `${callId}:${version}`), object_type: "creation_audio_stream_settlement", version, relation_key: callId }, new Date().toISOString());
    if (saved.object_hash !== settlementHash) error("CREATION_AUDIO_LEDGER_REFERENCE_INVALID", "settlement digest differs");
    ownerGuard();
    if (settlement.status === "response") selectionGuard(session, projectId, selection, assertCurrent);
    return { settlement_digest: saved.object_hash, status: "recorded" };
  });
}

/** Reopen/read never treats an unsettled or unknown send as safely repeatable.
 * A saved response is read only after current authorization and independent
 * role-specific validation; the old v1 model ledger is not changed. */
export async function recoverCreationAudioStreamCall(session, projectId, selection, callId, { deployment, assertCurrent, validateResponse } = {}) {
  const proof = selectionGuard(session, projectId, selection, assertCurrent), call = callRow(session, projectId, callId);
  if (!call) error("CREATION_AUDIO_LEDGER_CALL_INVALID", "reservation is missing");
  const settlement = latestSettlement(session, projectId, callId), verify = () => selectionGuard(session, projectId, selection, assertCurrent);
  let recovered = null;
  const action = await classifyCreationAudioStreamRecovery(proof.root, selection.chunk, call.value, settlement?.value ?? null, {
    deployment, indexReceipt: proof.receipt, assertCurrent: verify,
    verifyResponse: async responseRef => {
      if (typeof validateResponse !== "function" || responseRef.object_ref_id !== refId(projectId, "response", callId)) error("CREATION_AUDIO_LEDGER_RESPONSE_INVALID", "response validator or identity missing");
      const row = ref(session, projectId, responseRef.object_ref_id, "creation_audio_stream_response", callId);
      if (row.object_hash !== responseRef.digest) error("CREATION_AUDIO_LEDGER_RESPONSE_INVALID", "response object differs from settlement");
      const value = jsonObject(session, row, maxResponseBytes); requireSync(validateResponse, call.value.target.role, structuredClone(value)); verify();
      recovered = { ref: { ...responseRef }, value }; return true;
    },
  });
  if (action === "reuse-verified-response" && !recovered) error("CREATION_AUDIO_LEDGER_RESPONSE_INVALID", "verified response is unavailable");
  return { action, response: recovered };
}

/** A deterministic call can be absent on first execution. Absence is checked
 * only under current source authority; reservation remains the atomic arbiter
 * when concurrent runners observe it simultaneously. */
export async function recoverCreationAudioStreamCallIfPresent(session, projectId, selection, callId, options) {
  selectionGuard(session, projectId, selection, options?.assertCurrent);
  if (!identifier(callId)) error("CREATION_AUDIO_LEDGER_CALL_INVALID", "safe call ID required");
  if (!callRow(session, projectId, callId)) return null;
  return recoverCreationAudioStreamCall(session, projectId, selection, callId, options);
}
