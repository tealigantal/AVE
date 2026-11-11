// One-time zero-use transition. The live adapter has fixed Linux paths and
// a fixed verifier; Host-stop checks and startup marker validation remain the
// responsibility of the bounded Docker wrapper and trusted bootstrap.
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { openLedger, LIMIT_MICRO_CNY } from './ledger.mjs';
import { policyDigest } from './guard.mjs';
import { verifyPerformanceAmendment } from './performance-amendment.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = reason => { throw Error(`P5_EMPTY_SWITCH: ${reason}`); };
const isHash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const pathPresent = path => { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
function syncDir(path) {
  if (process.platform !== 'linux') return;
  const fd = openSync(path, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}
function putNew(path, bytes) {
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  syncDir(dirname(path));
}
function readRegular(path) {
  if (!lstatSync(path).isFile()) fail('expected ordinary file');
  return readFileSync(path);
}
function requireSandbox(root) {
  const real = realpathSync(root);
  if (dirname(real) !== realpathSync(tmpdir()) || !basename(real).startsWith('ave-p5-switch-test-')) fail('unavailable outside isolated test directory');
  return real;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

// Only media allowlists and their two receipts may change; existing media
// cannot be removed. Other values remain identical as canonical JSON.
export function validateEmptyPolicyExpansion(previous, candidate) {
  if (!previous || !candidate || typeof previous !== 'object' || typeof candidate !== 'object' || Array.isArray(previous) || Array.isArray(candidate)) fail('invalid policy');
  let count = 0;
  for (const key of ['imageHashes', 'assetHashes']) {
    const oldList = previous[key], nextList = candidate[key];
    if (!Array.isArray(oldList) || !Array.isArray(nextList) || oldList.some(x => !isHash(x)) || nextList.some(x => !isHash(x)) || new Set(oldList).size !== oldList.length || new Set(nextList).size !== nextList.length) fail('invalid media list');
    const nextSet = new Set(nextList);
    if (oldList.some(x => !nextSet.has(x))) fail('removed existing media');
    count += nextList.length - oldList.length;
  }
  for (const key of ['inputsManifestHash', 'sampleReceiptHash']) if (!isHash(previous[key]) || !isHash(candidate[key]) || previous[key] === candidate[key]) fail('missing revised evidence digest');
  const unchanged = policy => Object.fromEntries(Object.entries(policy).filter(([key]) => !['imageHashes', 'assetHashes', 'inputsManifestHash', 'sampleReceiptHash'].includes(key)));
  if (!count || canonical(unchanged(previous)) !== canonical(unchanged(candidate))) fail('unauthorized policy change');
  return { previousHash: policyDigest(previous), candidateHash: policyDigest(candidate) };
}

function executeSwitch({ root, ledgerDir, candidateName, evidenceName, verifyEvidence, assertHostStopped, onStep }) {
  if (typeof verifyEvidence !== 'function' || typeof assertHostStopped !== 'function' || typeof onStep !== 'function') fail('missing test verifier');
  const headPath = join(ledgerDir, 'head.json'), ledgerPath = join(ledgerDir, 'ledger.jsonl');
  if (realpathSync(ledgerDir) !== ledgerDir) fail('ledger path changed');
  const activePath = join(root, 'guard-policy.json'), candidatePath = join(root, candidateName), evidencePath = join(root, evidenceName);
  const marker = join(root, 'empty-policy-switch.pending'), done = join(root, 'empty-policy-switch.completed'), snapshots = join(root, 'empty-policy-switch.snapshots');
  if ([marker, done, snapshots].some(pathPresent)) fail('existing switch evidence');
  const oldBytes = readRegular(activePath), candidateBytes = readRegular(candidatePath), evidenceBytes = readRegular(evidencePath);
  const oldPolicy = freeze(JSON.parse(oldBytes)), candidate = freeze(JSON.parse(candidateBytes)), evidence = freeze(JSON.parse(evidenceBytes));
  const { previousHash, candidateHash } = validateEmptyPolicyExpansion(oldPolicy, candidate);
  const ledger = openLedger(ledgerDir, previousHash);
  const lockPath = join(ledgerDir, 'owner.lock'), lockStat = lstatSync(lockPath), lockBytes = readRegular(lockPath);
  let primaryError;
  function requireLock() {
    const current = lstatSync(lockPath);
    if (!current.isFile() || current.dev !== lockStat.dev || current.ino !== lockStat.ino || !readRegular(lockPath).equals(lockBytes)) fail('exclusive owner changed');
  }
  try {
    if (assertHostStopped(root) !== true) fail('Host not confirmed stopped');
    const headBytes = readRegular(headPath), head = JSON.parse(headBytes), actualLedger = readRegular(ledgerPath), state = ledger.snapshot();
    if (Object.keys(head).sort().join(',') !== 'hash,limit,policyHash,sequence,version' || head.version !== 1 || head.sequence !== 0 || head.hash !== '0'.repeat(64) || head.policyHash !== previousHash || head.limit !== LIMIT_MICRO_CNY || actualLedger.length || state.sequence !== 0 || state.reservedMicroCny !== 0 || state.reservations !== 0 || state.pending !== 0 || state.frozen || pathPresent(join(ledgerDir, 'head.pending'))) fail('ledger not pristine');
    if (!readRegular(activePath).equals(oldBytes) || verifyEvidence(root, oldPolicy, candidate, evidence) !== true) fail('candidate evidence rejected');
    requireLock();
    mkdirSync(snapshots);
    syncDir(root);
    const copies = [['old-head.json', headBytes], ['old-policy.json', oldBytes], ['new-policy.json', candidateBytes], ['evidence.json', evidenceBytes]];
    for (const [name, bytes] of copies) putNew(join(snapshots, name), bytes);
    const receipt = { version: 1, oldPolicyHash: previousHash, newPolicyHash: candidateHash, oldHeadSha256: sha(headBytes), ledgerSha256: sha(actualLedger), files: Object.fromEntries(copies.map(([name, bytes]) => [name, sha(bytes)])) };
    const receiptPath = join(snapshots, 'receipt.json'), receiptBytes = Buffer.from(JSON.stringify(receipt) + '\n');
    putNew(receiptPath, receiptBytes);
    function requireSnapshots() {
      if (!readRegular(receiptPath).equals(receiptBytes) || copies.some(([name, bytes]) => !readRegular(join(snapshots, name)).equals(bytes))) fail('snapshot changed');
    }
    onStep('snapshots');
    putNew(marker, Buffer.from(JSON.stringify({ receiptSha256: sha(receiptBytes) }) + '\n'));
    onStep('marker');
    requireLock();
    requireSnapshots();
    if (assertHostStopped(root) !== true || !readRegular(activePath).equals(oldBytes) || !readRegular(candidatePath).equals(candidateBytes) || !readRegular(evidencePath).equals(evidenceBytes) || !readRegular(headPath).equals(headBytes) || readRegular(ledgerPath).length !== 0 || pathPresent(join(ledgerDir, 'head.pending')) || verifyEvidence(root, oldPolicy, candidate, evidence) !== true) fail('state changed before switch');
    const nextHead = Buffer.from(JSON.stringify({ ...head, policyHash: candidateHash }) + '\n');
    const policyTemp = join(root, `.policy.pending.${randomUUID()}`), headTemp = join(ledgerDir, `.head.switch.${randomUUID()}`);
    putNew(policyTemp, candidateBytes);
    putNew(headTemp, nextHead);
    onStep('staged');
    requireLock();
    requireSnapshots();
    if (assertHostStopped(root) !== true || !readRegular(activePath).equals(oldBytes) || !readRegular(candidatePath).equals(candidateBytes) || !readRegular(evidencePath).equals(evidenceBytes) || !readRegular(headPath).equals(headBytes) || readRegular(ledgerPath).length !== 0 || pathPresent(join(ledgerDir, 'head.pending')) || !readRegular(policyTemp).equals(candidateBytes) || !readRegular(headTemp).equals(nextHead) || verifyEvidence(root, oldPolicy, candidate, evidence) !== true) fail('state changed before policy replacement');
    renameSync(policyTemp, activePath);
    syncDir(root);
    onStep('policy');
    requireLock();
    requireSnapshots();
    if (assertHostStopped(root) !== true || !readRegular(activePath).equals(candidateBytes) || !readRegular(candidatePath).equals(candidateBytes) || !readRegular(evidencePath).equals(evidenceBytes) || !readRegular(headPath).equals(headBytes) || readRegular(ledgerPath).length !== 0 || pathPresent(join(ledgerDir, 'head.pending')) || !readRegular(headTemp).equals(nextHead) || verifyEvidence(root, oldPolicy, candidate, evidence) !== true) fail('state changed during switch');
    renameSync(headTemp, headPath);
    syncDir(ledgerDir);
    onStep('head');
    requireLock();
    requireSnapshots();
    if (!readRegular(activePath).equals(candidateBytes) || !readRegular(headPath).equals(nextHead) || readRegular(ledgerPath).length !== 0) fail('committed state mismatch');
    // Hardlink uses create-if-absent semantics; a pre-existing completion
    // marker is never overwritten, even after a concurrent external change.
    linkSync(marker, done);
    unlinkSync(marker);
    syncDir(root);
    return { previousHash, candidateHash, receipt, ledgerBytes: 0 };
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    // The legacy lock API does not expose its fd; do not delete a replacement
    // lock if ownership was disturbed. This is not stale-lock recovery.
    try { requireLock(); ledger.close(); }
    catch (error) { if (primaryError) throw new AggregateError([primaryError, error], 'switch failed and owner lock could not be released'); throw error; }
  }
}

// Replaceable callbacks and temporary paths are exposed only for tests.
export function switchEmptyPolicyInTest(root, { verifyEvidence, assertHostStopped, onStep = () => {} } = {}) {
  root = requireSandbox(root);
  return executeSwitch({ root, ledgerDir: join(root, 'ledger'), candidateName: 'candidate-policy.json', evidenceName: 'candidate-evidence.json', verifyEvidence, assertHostStopped, onStep });
}

// No arguments, alternate paths, callback injection or alternate verifier are
// accepted on the live path. An outer Docker wrapper must first confirm that
// the one target Host is stopped and cannot restart during this operation.
export function switchFixedPerformancePolicy() {
  if (arguments.length || process.platform !== 'linux' || process.env.AVE_P5_ISOLATED_PROJECT !== 'ave-p5-current-20261105') fail('invalid live transition context');
  const root = '/p5-run', ledgerDir = '/p5-budget/ledger', baseline = join(root, 'baseline-policy-performance-r1.json');
  if (realpathSync(root) !== root || realpathSync(ledgerDir) !== ledgerDir) fail('live mount path changed');
  const baselineBytes = readRegular(baseline);
  const offline = () => {
    const interfaces = readdirSync('/sys/class/net').sort();
    if (interfaces.length !== 1 || interfaces[0] !== 'lo') fail('live transition must run with network none');
    return true;
  };
  const verify = (actualRoot, previous, candidate, evidence) => {
    if (actualRoot !== root || !readRegular(baseline).equals(baselineBytes) || policyDigest(JSON.parse(baselineBytes)) !== policyDigest(previous)) fail('baseline policy changed');
    return verifyPerformanceAmendment(root, previous, candidate, evidence);
  };
  return executeSwitch({ root, ledgerDir, candidateName: 'candidate-policy-performance-r1.json', evidenceName: 'candidate-evidence-performance-r1.json', verifyEvidence: verify, assertHostStopped: offline, onStep: () => {} });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) fail('live transition accepts no arguments');
  console.log(JSON.stringify(switchFixedPerformancePolicy()));
}
