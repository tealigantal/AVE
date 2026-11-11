// Second, independently journalled P5 policy change. Prior snapshots and the
// entire charge ledger remain immutable prefixes; hard-killed owners fail shut.
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { openLedger, LIMIT_MICRO_CNY } from './ledger.mjs';
import { policyDigest } from './guard.mjs';
import { readChain, validateUsedHistoricalEvidence, USED_BASELINE_HASH } from './used-policy-switch.mjs';

const PLANNER = 'qwen3.7-max-2026-05-20';
const OBSERVED = Object.freeze({ sequence: 70, hash: '0b26ab747a262a043210689b9bdb0a724176313c2c2702158c9f90f82d62118f', reservedMicroCny: 38610516, reservations: 35 });
const PRIOR_POLICY_HASH = 'f669127989a8cd5436cd82e05acf483bf1418c4876290274f7438d427d3bcb35';
const sha = data => createHash('sha256').update(data).digest('hex');
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const fail = message => { throw Error(`P5_USED2_SWITCH: ${message}`); };
const present = path => { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
function ordinary(path) { const stat = lstatSync(path); if (!stat.isFile() || stat.isSymbolicLink()) fail('expected ordinary file'); return readFileSync(path); }
function directory(path) { const stat = lstatSync(path); if (!stat.isDirectory() || stat.isSymbolicLink()) fail('invalid snapshot directory'); }
function syncDir(path) { if (process.platform !== 'linux') return; const fd = openSync(path, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } }
function putNew(path, bytes) { const fd = openSync(path, 'wx', 0o600); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } syncDir(dirname(path)); }
function requireObserved(head, state, observed) {
  if (head.sequence !== observed.sequence || head.hash !== observed.hash || state.reservedMicroCny !== observed.reservedMicroCny || state.reservations !== observed.reservations || state.pending || state.frozen || state.uncertain) fail('observed ledger identity changed');
}

export function validateUsed2PolicyExpansion(previous, candidate) {
  if (!previous || !candidate || previous.project !== 'ave-p5-current-20261105' || previous.limitMicroCny !== LIMIT_MICRO_CNY) fail('invalid project or budget');
  const old = previous.models?.[PLANNER], next = candidate.models?.[PLANNER];
  if (!old || !next || old.maxTextBytes !== 150000 || old.maxInputTokens !== 160000 || next.maxTextBytes !== 500000 || next.maxInputTokens !== 524288) fail('unexpected planner bounds');
  const normalized = structuredClone(candidate);
  normalized.models[PLANNER].maxTextBytes = old.maxTextBytes;
  normalized.models[PLANNER].maxInputTokens = old.maxInputTokens;
  if (canonical(normalized) !== canonical(previous)) fail('unauthorized policy change');
  return { previousHash: policyDigest(previous), candidateHash: policyDigest(candidate) };
}

export function validateUsed2SwitchEvidence(root, ledgerDir, activePolicy, options = {}) {
  const { expectedFirstHash = USED_BASELINE_HASH, observed = OBSERVED, expectedPriorHash = PRIOR_POLICY_HASH, currentLedger, currentHead, expectedLimit = LIMIT_MICRO_CNY } = options;
  if (present(join(root, 'used2-policy-switch.pending')) || present(join(ledgerDir, 'head.pending'))) fail('transition pending');
  const base = join(root, 'used2-policy-switch.snapshots'); directory(base);
  const receiptBytes = ordinary(join(base, 'receipt.json')), receipt = JSON.parse(receiptBytes);
  if (canonical(JSON.parse(ordinary(join(root, 'used2-policy-switch.completed')))) !== canonical({ receiptSha256: sha(receiptBytes) })) fail('completion marker mismatch');
  const names = ['old-policy.json', 'new-policy.json', 'old-head.json', 'ledger.jsonl'];
  if (receipt.version !== 1 || Object.keys(receipt.files ?? {}).sort().join() !== names.slice().sort().join() || names.some(name => sha(ordinary(join(base, name))) !== receipt.files[name])) fail('snapshot mismatch');
  const oldBytes = ordinary(join(base, names[0])), nextBytes = ordinary(join(base, names[1])), old = JSON.parse(oldBytes), next = JSON.parse(nextBytes);
  if (!oldBytes.equals(ordinary(join(root, 'used-policy-switch.snapshots', 'new-policy.json')))) fail('policy generations are not byte-identical');
  const oldHead = JSON.parse(ordinary(join(base, names[2]))), oldLedger = ordinary(join(base, names[3]));
  const ids = validateUsed2PolicyExpansion(old, next);
  if (ids.previousHash !== expectedPriorHash || receipt.previousHash !== ids.previousHash || receipt.candidateHash !== ids.candidateHash || policyDigest(activePolicy) !== ids.candidateHash || !ordinary(join(root, 'guard-policy.json')).equals(nextBytes)) fail('policy identity mismatch');
  const first = validateUsedHistoricalEvidence(root, oldLedger, oldHead, old, expectedFirstHash);
  requireObserved(oldHead, first.state, observed);
  if (receipt.reservedMicroCny !== first.state.reservedMicroCny || receipt.reservations !== first.state.reservations) fail('snapshot budget mismatch');
  const current = currentLedger ?? ordinary(join(ledgerDir, 'ledger.jsonl')), head = currentHead ?? JSON.parse(ordinary(join(ledgerDir, 'head.json')));
  if (current.length < oldLedger.length || !current.subarray(0, oldLedger.length).equals(oldLedger)) fail('second ledger prefix changed');
  const state = readChain(current, head, ids.candidateHash, expectedLimit);
  if (state.sequence < first.state.sequence || state.reservedMicroCny < first.state.reservedMicroCny) fail('continuing ledger state invalid');
  return { ...ids, previous: old, first, oldState: first.state, state };
}

export function verifyLockedUsed2Startup(root, ledgerDir, policy, ledger, options) {
  const proof = validateUsed2SwitchEvidence(root, ledgerDir, policy, options);
  const state = proof.state, held = ledger?.snapshot?.();
  if (!held || state.pending || state.frozen || state.uncertain || held.pending || held.frozen || held.sequence !== state.sequence || held.reservedMicroCny !== state.reservedMicroCny || held.reservations !== state.reservations || ledger.policyHash !== proof.candidateHash) fail('locked ledger changed or unresolved');
  return proof;
}

function execute(root, { ledgerDir, candidateName, assertHostStopped, onStep = () => {}, expectedFirstHash, expectedPriorHash, observed }) {
  if (typeof assertHostStopped !== 'function' || typeof onStep !== 'function' || assertHostStopped() !== true) fail('host not stopped');
  const active = join(root, 'guard-policy.json'), candidate = join(root, candidateName), headPath = join(ledgerDir, 'head.json'), ledgerPath = join(ledgerDir, 'ledger.jsonl');
  const snapshots = join(root, 'used2-policy-switch.snapshots'), pending = join(root, 'used2-policy-switch.pending'), done = join(root, 'used2-policy-switch.completed');
  if (present(done) && !present(pending)) fail('transition already completed');
  const currentHead = JSON.parse(ordinary(headPath)), ledger = openLedger(ledgerDir, currentHead.policyHash);
  const lockPath = join(ledgerDir, 'owner.lock'), lockStat = lstatSync(lockPath, { bigint: true }), lockBytes = ordinary(lockPath);
  const check = () => { const s = lstatSync(lockPath, { bigint: true }); if (!s.isFile() || s.dev !== lockStat.dev || s.ino !== lockStat.ino || !ordinary(lockPath).equals(lockBytes) || assertHostStopped() !== true) fail('owner changed or Host restarted'); };
  let primary;
  try {
    const held = ledger.snapshot(), bytes = ordinary(ledgerPath);
    if (held.pending || held.frozen || present(join(ledgerDir, 'head.pending'))) fail('ledger unresolved');
    if (!present(snapshots)) {
      if (present(pending)) fail('missing snapshots');
      const oldBytes = ordinary(active), nextBytes = ordinary(candidate), old = JSON.parse(oldBytes), next = JSON.parse(nextBytes), ids = validateUsed2PolicyExpansion(old, next);
      if (!oldBytes.equals(ordinary(join(root, 'used-policy-switch.snapshots', 'new-policy.json')))) fail('policy generations are not byte-identical');
      if (ids.previousHash !== expectedPriorHash || currentHead.policyHash !== ids.previousHash) fail('baseline changed');
      const first = validateUsedHistoricalEvidence(root, bytes, currentHead, old, expectedFirstHash);
      requireObserved(currentHead, first.state, observed);
      const files = { 'old-policy.json': oldBytes, 'new-policy.json': nextBytes, 'old-head.json': ordinary(headPath), 'ledger.jsonl': bytes };
      const receipt = Buffer.from(JSON.stringify({ version: 1, ...ids, reservedMicroCny: held.reservedMicroCny, reservations: held.reservations, files: Object.fromEntries(Object.entries(files).map(([name, value]) => [name, sha(value)])) }) + '\n');
      const staging = join(root, `.used2-policy-snapshots.${randomUUID()}`); mkdirSync(staging); syncDir(root);
      for (const [name, value] of Object.entries(files)) putNew(join(staging, name), value);
      putNew(join(staging, 'receipt.json'), receipt); check(); renameSync(staging, snapshots); syncDir(root); onStep('snapshots');
    }
    directory(snapshots);
    const receiptBytes = ordinary(join(snapshots, 'receipt.json')), receipt = JSON.parse(receiptBytes), names = ['old-policy.json', 'new-policy.json', 'old-head.json', 'ledger.jsonl'];
    if (receipt.version !== 1 || Object.keys(receipt.files ?? {}).sort().join() !== names.slice().sort().join() || names.some(name => sha(ordinary(join(snapshots, name))) !== receipt.files[name])) fail('snapshot changed');
    const oldBytes = ordinary(join(snapshots, names[0])), nextBytes = ordinary(join(snapshots, names[1])), oldHeadBytes = ordinary(join(snapshots, names[2])), oldHead = JSON.parse(oldHeadBytes), original = ordinary(join(snapshots, names[3]));
    const old = JSON.parse(oldBytes), ids = validateUsed2PolicyExpansion(old, JSON.parse(nextBytes));
    if (!oldBytes.equals(ordinary(join(root, 'used-policy-switch.snapshots', 'new-policy.json')))) fail('policy generations are not byte-identical');
    if (ids.previousHash !== expectedPriorHash || receipt.previousHash !== ids.previousHash || receipt.candidateHash !== ids.candidateHash || !original.equals(bytes) || !ordinary(candidate).equals(nextBytes) || receipt.reservedMicroCny !== held.reservedMicroCny || receipt.reservations !== held.reservations) fail('snapshot identity mismatch');
    const first = validateUsedHistoricalEvidence(root, original, oldHead, old, expectedFirstHash); requireObserved(oldHead, first.state, observed);
    const newHeadBytes = Buffer.from(JSON.stringify({ ...oldHead, policyHash: ids.candidateHash }) + '\n'), livePolicy = ordinary(active), liveHead = ordinary(headPath);
    if (!(livePolicy.equals(oldBytes) || livePolicy.equals(nextBytes)) || !(liveHead.equals(oldHeadBytes) || liveHead.equals(newHeadBytes)) || (livePolicy.equals(oldBytes) && liveHead.equals(newHeadBytes))) fail('unexpected transition state');
    if (!present(pending)) { if (!livePolicy.equals(oldBytes) || !liveHead.equals(oldHeadBytes)) fail('missing marker'); putNew(pending, Buffer.from(JSON.stringify({ receiptSha256: sha(receiptBytes) }) + '\n')); onStep('marker'); }
    const marker = ordinary(pending); if (canonical(JSON.parse(marker)) !== canonical({ receiptSha256: sha(receiptBytes) })) fail('marker changed');
    check(); if (!ordinary(ledgerPath).equals(original) || !ordinary(candidate).equals(nextBytes)) fail('state changed before replacement');
    if (ordinary(active).equals(oldBytes)) { const temp = join(root, `.used2-policy.${randomUUID()}`); putNew(temp, nextBytes); check(); renameSync(temp, active); syncDir(root); onStep('policy'); }
    check(); if (!ordinary(active).equals(nextBytes) || !ordinary(ledgerPath).equals(original)) fail('policy state changed');
    if (ordinary(headPath).equals(oldHeadBytes)) { const temp = join(ledgerDir, `.used2-head.${randomUUID()}`); putNew(temp, newHeadBytes); check(); renameSync(temp, headPath); syncDir(ledgerDir); onStep('head'); }
    check(); if (!ordinary(headPath).equals(newHeadBytes) || !ordinary(ledgerPath).equals(original) || !ordinary(active).equals(nextBytes)) fail('committed state changed');
    if (present(done)) { if (!ordinary(done).equals(marker)) fail('completion marker changed'); }
    else { linkSync(pending, done); syncDir(root); onStep('linked'); }
    unlinkSync(pending); syncDir(root);
    return { ...ids, reservedMicroCny: held.reservedMicroCny, reservations: held.reservations };
  } catch (error) { primary = error; throw error; }
  finally { try { check(); ledger.close(); } catch (error) { if (primary) throw new AggregateError([primary, error], 'switch failed and owner release failed'); throw error; } }
}

export function switchUsed2PolicyInTest(root, options) {
  const real = realpathSync(root);
  if (dirname(real) !== realpathSync(tmpdir()) || !basename(real).startsWith('ave-p5-used-switch-test-')) fail('outside isolated test directory');
  return execute(real, { ledgerDir: join(real, 'ledger'), candidateName: 'candidate-policy2.json', ...options });
}

export function switchFixedUsed2Policy() {
  if (arguments.length || process.platform !== 'linux' || process.env.AVE_P5_ISOLATED_PROJECT !== 'ave-p5-current-20261105') fail('invalid live transition context');
  const root = '/p5-run', ledgerDir = '/p5-budget/ledger';
  if (realpathSync(root) !== root || realpathSync(ledgerDir) !== ledgerDir || realpathSync('/p5-projects') !== '/p5-projects') fail('live mount identity changed');
  const offline = () => { if (readdirSync('/sys/class/net').sort().join() !== 'lo') fail('network must be disabled'); return true; }; offline();
  const failurePath = '/p5-projects/P5 页面预检 20261105-fbf4540c/objects/sha256/6e/6e647d1c160ad0c3aa2ab8240c05b7c8b5ad72b7df9562550d299fd80cc32628';
  const evidenceBytes = ordinary(failurePath), evidence = JSON.parse(evidenceBytes);
  if (sha(evidenceBytes) !== '6e647d1c160ad0c3aa2ab8240c05b7c8b5ad72b7df9562550d299fd80cc32628' || evidence.request_id !== 'request:4484cb5a-0d19-40f3-8bfe-d75afa0834c1' || evidence.phase !== 'generation-and-commit' || evidence.error?.message !== 'P5_GUARD: text byte bound' || evidence.error?.planning_diagnostic?.pending?.transport?.input_bytes !== 150355) fail('failure evidence changed');
  const old = JSON.parse(ordinary(join(root, 'used-policy-switch.snapshots', 'new-policy.json')));
  if (policyDigest(old) !== PRIOR_POLICY_HASH || sha(ordinary(join(root, 'price-evidence.json'))) !== old.priceEvidenceHash) fail('previous policy or pricing changed');
  const next = structuredClone(old); Object.assign(next.models[PLANNER], { maxTextBytes: 500000, maxInputTokens: 524288 }); validateUsed2PolicyExpansion(old, next);
  const bytes = Buffer.from(JSON.stringify(next, null, 2) + '\n'), path = join(root, 'candidate-policy-used-r2.json');
  if (present(path)) { if (!ordinary(path).equals(bytes)) fail('candidate changed'); } else putNew(path, bytes);
  if (present(join(root, 'used2-policy-switch.completed')) && !present(join(root, 'used2-policy-switch.pending'))) return validateUsed2SwitchEvidence(root, ledgerDir, JSON.parse(ordinary(join(root, 'guard-policy.json'))));
  return execute(root, { ledgerDir, candidateName: 'candidate-policy-used-r2.json', expectedFirstHash: USED_BASELINE_HASH, expectedPriorHash: PRIOR_POLICY_HASH, observed: OBSERVED, assertHostStopped: offline });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) fail('no arguments accepted');
  console.log(JSON.stringify(switchFixedUsed2Policy()));
}
