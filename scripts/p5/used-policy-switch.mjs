// A narrowly scoped, resumable transition for a previously used P5 ledger.
// A hard-killed owner leaves owner.lock in place. Recovery then fails closed
// and requires diagnosis of the actual owner; it never deletes a stale lock.
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { openLedger, LIMIT_MICRO_CNY } from './ledger.mjs';
import { policyDigest } from './guard.mjs';

const PLANNER = 'qwen3.7-max-2026-05-20';
export const USED_BASELINE_HASH = '8c54e1274ec1e68d551e7226ea7e83ecfb358129b7b48e586fbe635f4234c50a';
const EXPECTED_OLD_HEAD = '129a67cbc02c39ab36db59e98a23182d97c425605d776e7f4465847e1b29d907';
function requireObservedLedger(head, state) {
  if (head.sequence !== 54 || head.hash !== EXPECTED_OLD_HEAD || state.reservedMicroCny !== 28774764 || state.reservations !== 27 || state.pending || state.frozen || state.uncertain) fail('observed original ledger identity changed');
}
const sha = value => createHash('sha256').update(value).digest('hex');
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const fail = reason => { throw Error(`P5_USED_SWITCH: ${reason}`); };
const present = path => { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
function ordinary(path) { const stat = lstatSync(path); if (!stat.isFile() || stat.isSymbolicLink()) fail('expected ordinary file'); return readFileSync(path); }
function syncDir(path) { if (process.platform !== 'linux') return; const fd = openSync(path, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } }
function putNew(path, data) { const fd = openSync(path, 'wx', 0o600); try { writeFileSync(fd, data); fsyncSync(fd); } finally { closeSync(fd); } syncDir(dirname(path)); }
function dir(path) { const stat = lstatSync(path); if (!stat.isDirectory() || stat.isSymbolicLink()) fail('invalid snapshot directory'); }

// Exact ceilings are tied to the observed 136,436-byte request, and stay far
// below the documented 983,616-token thinking-mode input limit. Pricing and
// every other policy field must remain byte-for-byte equivalent canonically.
export function validateUsedPolicyExpansion(previous, candidate) {
  if (!previous || !candidate || typeof previous !== 'object' || typeof candidate !== 'object') fail('invalid policy');
  if (previous.project !== 'ave-p5-current-20261105' || previous.limitMicroCny !== LIMIT_MICRO_CNY) fail('task identity mismatch');
  const oldModel = previous.models?.[PLANNER], newModel = candidate.models?.[PLANNER];
  if (!oldModel || !newModel || oldModel.maxTextBytes !== 100000 || oldModel.maxInputTokens !== 131072 || newModel.maxTextBytes !== 150000 || newModel.maxInputTokens !== 160000) fail('unexpected planner bounds');
  const normalized = structuredClone(candidate);
  normalized.models[PLANNER].maxTextBytes = oldModel.maxTextBytes;
  normalized.models[PLANNER].maxInputTokens = oldModel.maxInputTokens;
  if (canonical(normalized) !== canonical(previous)) fail('unauthorized policy change');
  return { previousHash: policyDigest(previous), candidateHash: policyDigest(candidate) };
}

export function readChain(bytes, head, expectedHash, expectedLimit = LIMIT_MICRO_CNY) {
  if (head.version !== 1 || head.policyHash !== expectedHash || head.limit !== expectedLimit || Object.keys(head).sort().join() !== 'hash,limit,policyHash,sequence,version') fail('ledger head mismatch');
  const text = bytes.toString('utf8');
  if (text && !text.endsWith('\n')) fail('partial ledger');
  let seq = 0, previous = '0'.repeat(64), total = 0, frozen = false, uncertain = false;
  const reserved = new Set(), terminal = new Set();
  for (const line of text.split('\n').filter(Boolean)) {
    const row = JSON.parse(line), { hash, ...entry } = row;
    if (entry.seq !== ++seq || entry.previous !== previous || sha(JSON.stringify(entry)) !== hash || !/^[a-f0-9]{64}$/.test(entry.wire ?? '')) fail('ledger chain mismatch');
    if (entry.kind === 'reserved') {
      if (!Number.isSafeInteger(entry.microCny) || entry.microCny <= 0 || reserved.has(entry.wire)) fail('invalid reservation');
      reserved.add(entry.wire); total += entry.microCny;
    } else if (['response', 'uncertain', 'violation'].includes(entry.kind)) {
      if (!reserved.has(entry.wire) || terminal.has(entry.wire)) fail('invalid terminal');
      terminal.add(entry.wire); frozen ||= entry.kind === 'violation'; uncertain ||= entry.kind === 'uncertain';
    } else fail('unknown ledger event');
    previous = hash;
  }
  if (seq !== head.sequence || previous !== head.hash || !Number.isSafeInteger(total) || total > expectedLimit) fail('ledger head or total mismatch');
  return { sequence: seq, reservedMicroCny: total, reservations: reserved.size, pending: reserved.size - terminal.size, frozen, uncertain };
}

// Read-only startup verification: the old ledger is a byte-exact prefix of
// the continuing one, and both complete chains are verified independently.
export function validateUsedHistoricalEvidence(root, current, head, activePolicy, expectedPreviousHash = USED_BASELINE_HASH) {
  if (present(join(root, 'used-policy-switch.pending'))) fail('transition pending');
  const base = join(root, 'used-policy-switch.snapshots'); dir(base);
  const receiptBytes = ordinary(join(base, 'receipt.json')), receipt = JSON.parse(receiptBytes), marker = JSON.parse(ordinary(join(root, 'used-policy-switch.completed')));
  if (canonical(marker) !== canonical({ receiptSha256: sha(receiptBytes) })) fail('completion marker mismatch');
  const names = ['old-policy.json', 'new-policy.json', 'old-head.json', 'ledger.jsonl'];
  if (receipt.version !== 1 || Object.keys(receipt.files ?? {}).sort().join() !== names.slice().sort().join() || names.some(name => sha(ordinary(join(base, name))) !== receipt.files[name])) fail('snapshot mismatch');
  const oldBytes = ordinary(join(base, names[0])), newBytes = ordinary(join(base, names[1])), oldHead = JSON.parse(ordinary(join(base, names[2]))), oldLedger = ordinary(join(base, names[3]));
  const ids = validateUsedPolicyExpansion(JSON.parse(oldBytes), JSON.parse(newBytes));
  if (ids.previousHash !== expectedPreviousHash || receipt.previousHash !== ids.previousHash || receipt.candidateHash !== ids.candidateHash || policyDigest(activePolicy) !== ids.candidateHash) fail('policy identity mismatch');
  const oldState = readChain(oldLedger, oldHead, ids.previousHash);
  if (!oldState.reservations || oldState.pending || oldState.frozen || oldState.uncertain || receipt.reservedMicroCny !== oldState.reservedMicroCny || receipt.reservations !== oldState.reservations) fail('original ledger state invalid');
  if (expectedPreviousHash === USED_BASELINE_HASH) requireObservedLedger(oldHead, oldState);
  if (current.length < oldLedger.length || !current.subarray(0, oldLedger.length).equals(oldLedger)) fail('original ledger prefix changed');
  const state = readChain(current, head, ids.candidateHash);
  if (state.sequence < oldState.sequence || state.reservedMicroCny < oldState.reservedMicroCny) fail('continuing ledger state invalid');
  return { previous: JSON.parse(oldBytes), ...ids, oldState, state };
}

export function validateUsedSwitchEvidence(root, ledgerDir, activePolicy, expectedPreviousHash = USED_BASELINE_HASH) {
  if (!ordinary(join(root, 'guard-policy.json')).equals(ordinary(join(root, 'used-policy-switch.snapshots', 'new-policy.json'))) || present(join(ledgerDir, 'head.pending'))) fail('policy identity mismatch');
  return validateUsedHistoricalEvidence(root, ordinary(join(ledgerDir, 'ledger.jsonl')), JSON.parse(ordinary(join(ledgerDir, 'head.json'))), activePolicy, expectedPreviousHash);
}

export function requireResolvedUsedLedger(state) {
  if (!state || !Number.isSafeInteger(state.pending) || state.pending !== 0 || state.frozen !== false || state.uncertain !== false) fail('used ledger has unresolved operations');
  return true;
}

export function verifyLockedUsedStartup(root, ledgerDir, policy, ledger, expectedPreviousHash = USED_BASELINE_HASH) {
  if (!ledger || typeof ledger.snapshot !== 'function') fail('exclusive ledger required');
  const proof = validateUsedSwitchEvidence(root, ledgerDir, policy, expectedPreviousHash);
  requireResolvedUsedLedger(proof.state);
  const held = ledger.snapshot();
  if (held.sequence !== proof.state.sequence || held.reservedMicroCny !== proof.state.reservedMicroCny || held.reservations !== proof.state.reservations || held.pending !== proof.state.pending || held.frozen !== proof.state.frozen || ledger.policyHash !== proof.candidateHash) fail('locked ledger changed during startup');
  return proof;
}

function execute(root, { assertHostStopped, onStep = () => {}, ledgerDir = join(root, 'ledger'), candidateName = 'candidate-policy.json', expectedPreviousHash }) {
  if (typeof assertHostStopped !== 'function' || typeof onStep !== 'function') fail('missing stopped-host verifier');
  const active = join(root, 'guard-policy.json'), candidate = join(root, candidateName);
  const headPath = join(ledgerDir, 'head.json'), ledgerPath = join(ledgerDir, 'ledger.jsonl');
  const snapshots = join(root, 'used-policy-switch.snapshots'), pending = join(root, 'used-policy-switch.pending'), done = join(root, 'used-policy-switch.completed');
  if (present(done) && !present(pending)) fail('transition already completed');
  if (assertHostStopped() !== true) fail('host not stopped');
  const currentHead = JSON.parse(ordinary(headPath));
  const ledger = openLedger(ledgerDir, currentHead.policyHash);
  const lockPath = join(ledgerDir, 'owner.lock'), lockStat = lstatSync(lockPath, { bigint: true }), lockBytes = ordinary(lockPath);
  const requireLock = () => { const stat = lstatSync(lockPath, { bigint: true }); if (!stat.isFile() || stat.dev !== lockStat.dev || stat.ino !== lockStat.ino || !ordinary(lockPath).equals(lockBytes)) fail('exclusive owner changed'); };
  const requireStopped = () => { requireLock(); if (assertHostStopped() !== true) fail('host not stopped'); };
  let primary;
  try {
    const state = ledger.snapshot();
    const ledgerBytes = ordinary(ledgerPath), lines = ledgerBytes.toString('utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    if (state.frozen || state.pending || !state.reservations || lines.some(line => line.kind === 'uncertain' || line.kind === 'violation') || present(join(ledgerDir, 'head.pending'))) fail('ledger is unresolved or frozen');
    if (!present(snapshots)) {
      if (present(pending)) fail('missing snapshots');
      const oldBytes = ordinary(active), newBytes = ordinary(candidate), old = JSON.parse(oldBytes), next = JSON.parse(newBytes);
      const ids = validateUsedPolicyExpansion(old, next);
      if (expectedPreviousHash && ids.previousHash !== expectedPreviousHash) fail('baseline identity mismatch');
      const headBytes = ordinary(headPath), head = JSON.parse(headBytes);
      if (head.policyHash !== ids.previousHash || head.sequence !== state.sequence || head.limit !== LIMIT_MICRO_CNY) fail('old head mismatch');
      if (expectedPreviousHash === USED_BASELINE_HASH) requireObservedLedger(head, { ...state, uncertain: lines.some(line => line.kind === 'uncertain') });
      const files = { 'old-policy.json': oldBytes, 'new-policy.json': newBytes, 'old-head.json': headBytes, 'ledger.jsonl': ledgerBytes };
      const receipt = Buffer.from(JSON.stringify({ version: 1, ...ids, reservedMicroCny: state.reservedMicroCny, reservations: state.reservations, files: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, sha(bytes)])) }) + '\n');
      const staging = join(root, `.used-policy-snapshots.${randomUUID()}`); mkdirSync(staging); syncDir(root);
      for (const [name, bytes] of Object.entries(files)) putNew(join(staging, name), bytes);
      putNew(join(staging, 'receipt.json'), receipt); requireStopped();
      renameSync(staging, snapshots); syncDir(root); onStep('snapshots');
    }
    dir(snapshots);
    const receiptBytes = ordinary(join(snapshots, 'receipt.json')), receipt = JSON.parse(receiptBytes);
    const names = ['old-policy.json', 'new-policy.json', 'old-head.json', 'ledger.jsonl'];
    if (receipt.version !== 1 || Object.keys(receipt.files ?? {}).sort().join() !== names.slice().sort().join() || names.some(name => sha(ordinary(join(snapshots, name))) !== receipt.files[name])) fail('snapshot changed');
    const oldBytes = ordinary(join(snapshots, names[0])), newBytes = ordinary(join(snapshots, names[1])), oldHeadBytes = ordinary(join(snapshots, names[2])), originalLedger = ordinary(join(snapshots, names[3]));
    const ids = validateUsedPolicyExpansion(JSON.parse(oldBytes), JSON.parse(newBytes)), oldHead = JSON.parse(oldHeadBytes);
    if (expectedPreviousHash && ids.previousHash !== expectedPreviousHash) fail('baseline identity mismatch');
    if (expectedPreviousHash === USED_BASELINE_HASH) requireObservedLedger(oldHead, { ...state, uncertain: lines.some(line => line.kind === 'uncertain') });
    if (receipt.previousHash !== ids.previousHash || receipt.candidateHash !== ids.candidateHash || oldHead.policyHash !== ids.previousHash || oldHead.limit !== LIMIT_MICRO_CNY || receipt.reservedMicroCny !== state.reservedMicroCny || receipt.reservations !== state.reservations || !originalLedger.equals(ledgerBytes) || !ordinary(candidate).equals(newBytes)) fail('snapshot identity mismatch');
    const newHeadBytes = Buffer.from(JSON.stringify({ ...oldHead, policyHash: ids.candidateHash }) + '\n');
    const livePolicy = ordinary(active), liveHead = ordinary(headPath);
    if (!(livePolicy.equals(oldBytes) || livePolicy.equals(newBytes)) || !(liveHead.equals(oldHeadBytes) || liveHead.equals(newHeadBytes)) || (livePolicy.equals(oldBytes) && liveHead.equals(newHeadBytes))) fail('unexpected transition state');
    if (!present(pending)) { if (!livePolicy.equals(oldBytes) || !liveHead.equals(oldHeadBytes)) fail('missing transition marker'); putNew(pending, Buffer.from(JSON.stringify({ receiptSha256: sha(receiptBytes) }) + '\n')); onStep('marker'); }
    const marker = ordinary(pending);
    if (canonical(JSON.parse(marker)) !== canonical({ receiptSha256: sha(receiptBytes) })) fail('marker changed');
    requireStopped();
    if (!ordinary(ledgerPath).equals(originalLedger) || !ordinary(candidate).equals(newBytes)) fail('state changed before replacement');
    if (ordinary(active).equals(oldBytes)) { const temp = join(root, `.used-policy.${randomUUID()}`); putNew(temp, newBytes); requireStopped(); renameSync(temp, active); syncDir(root); onStep('policy'); }
    requireStopped();
    if (!ordinary(active).equals(newBytes) || !ordinary(ledgerPath).equals(originalLedger)) fail('policy state changed');
    if (ordinary(headPath).equals(oldHeadBytes)) { const temp = join(ledgerDir, `.used-head.${randomUUID()}`); putNew(temp, newHeadBytes); requireStopped(); renameSync(temp, headPath); syncDir(ledgerDir); onStep('head'); }
    requireStopped();
    if (!ordinary(headPath).equals(newHeadBytes) || !ordinary(ledgerPath).equals(originalLedger) || !ordinary(active).equals(newBytes)) fail('committed state changed');
    if (present(done)) { if (!ordinary(done).equals(marker)) fail('completion marker changed'); }
    else { linkSync(pending, done); syncDir(root); onStep('linked'); }
    unlinkSync(pending); syncDir(root);
    return { ...ids, reservedMicroCny: state.reservedMicroCny, reservations: state.reservations };
  } catch (error) { primary = error; throw error; }
  finally { try { requireLock(); ledger.close(); } catch (error) { if (primary) throw new AggregateError([primary, error], 'switch failed and owner lock release failed'); throw error; } }
}

// Injectable verification is confined to a new directory under the OS temp
// root. In particular, no caller can point this adapter at the live ledger.
export function switchUsedPolicyInTest(root, options) {
  const real = realpathSync(root);
  if (dirname(real) !== realpathSync(tmpdir()) || !basename(real).startsWith('ave-p5-used-switch-test-')) fail('outside isolated test directory');
  return execute(real, options);
}

// Only the Docker wrapper may invoke this fixed, network-isolated operation;
// the wrapper separately proves the exact P5 containers stopped without a
// restart policy and mounts the project volume read-only for the evidence.
export function switchFixedUsedPolicy() {
  if (arguments.length || process.platform !== 'linux' || process.env.AVE_P5_ISOLATED_PROJECT !== 'ave-p5-current-20261105') fail('invalid live transition context');
  const root = '/p5-run', ledgerDir = '/p5-budget/ledger';
  if (realpathSync(root) !== root || realpathSync(ledgerDir) !== ledgerDir || realpathSync('/p5-projects') !== '/p5-projects') fail('live mount identity changed');
  const offline = () => { if (readdirSync('/sys/class/net').sort().join() !== 'lo') fail('network must be disabled'); return true; };
  offline();
  const oldPath = present(join(root, 'used-policy-switch.snapshots')) ? join(root, 'used-policy-switch.snapshots', 'old-policy.json') : join(root, 'guard-policy.json');
  const oldBytes = ordinary(oldPath), old = JSON.parse(oldBytes);
  if (policyDigest(old) !== USED_BASELINE_HASH || sha(ordinary(join(root, 'price-evidence.json'))) !== old.priceEvidenceHash) fail('baseline or price evidence changed');
  const failurePath = '/p5-projects/P5 页面预检 20261105-fbf4540c/objects/sha256/57/57fc62817e3ecf5795fed92c18e32bd2f129060ee300f28bcd5366f8b8a2f516';
  const failureBytes = ordinary(failurePath), failure = JSON.parse(failureBytes);
  if (sha(failureBytes) !== '57fc62817e3ecf5795fed92c18e32bd2f129060ee300f28bcd5366f8b8a2f516' || failure.request_id !== 'request:4484cb5a-0d19-40f3-8bfe-d75afa0834c1' || failure.phase !== 'generation-and-commit' || failure.error?.message !== 'P5_GUARD: text byte bound' || failure.error?.planning_diagnostic?.pending?.transport?.input_bytes !== 136436) fail('failure evidence changed');
  const next = structuredClone(old);
  Object.assign(next.models[PLANNER], { maxTextBytes: 150000, maxInputTokens: 160000 });
  validateUsedPolicyExpansion(old, next);
  const candidate = Buffer.from(JSON.stringify(next, null, 2) + '\n'), candidatePath = join(root, 'candidate-policy-used-r1.json');
  if (present(candidatePath)) { if (!ordinary(candidatePath).equals(candidate)) fail('candidate changed'); }
  else putNew(candidatePath, candidate);
  if (present(join(root, 'used-policy-switch.completed')) && !present(join(root, 'used-policy-switch.pending'))) return validateUsedSwitchEvidence(root, ledgerDir, JSON.parse(ordinary(join(root, 'guard-policy.json'))));
  return execute(root, { ledgerDir, candidateName: 'candidate-policy-used-r1.json', expectedPreviousHash: USED_BASELINE_HASH, assertHostStopped: offline });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) fail('live transition accepts no arguments');
  console.log(JSON.stringify(switchFixedUsedPolicy()));
}
