// The user authorized one cumulative increase from CNY 100 to CNY 200.
// The policy and all historical wire records stay unchanged.
import { createHash } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readdirSync, realpathSync } from 'node:fs';
import { LIMIT_MICRO_CNY, FINAL_LIMIT_MICRO_CNY, openLedger } from './ledger.mjs';
import { policyDigest } from './guard.mjs';
import { validateUsed2SwitchEvidence } from './used2-policy-switch.mjs';

export const AMENDED_LIMIT = 200_000_000;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = message => { throw Error(`P5_BUDGET_AMENDMENT: ${message}`); };
const read = path => { const stat = lstatSync(path); if (!stat.isFile() || stat.isSymbolicLink()) fail('expected ordinary file'); return readFileSync(path); };
const syncDir = path => { if (process.platform !== 'linux') return; const fd = openSync(path, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } };
const put = (path, bytes) => { const fd = openSync(path, 'wx', 0o600); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } };
const equal = (a, b) => a.length === b.length && a.equals(b);
const resolved = s => !s.pending && !s.frozen && !s.uncertain;

// Verify both the old chain and the current chain against the same policy.
export function verifyBudgetAmendment(root, ledgerDir, policy, options = {}) {
  const dir = join(root, 'budget-amendment-200'), pending = join(root, 'budget-amendment-200.pending');
  if (existsSync(pending)) fail('transition pending');
  const receiptBytes = read(join(dir, 'receipt.json')), receipt = JSON.parse(receiptBytes);
  const marker = JSON.parse(read(join(root, 'budget-amendment-200.completed')));
  if (marker.receiptSha256 !== sha(receiptBytes) || Object.keys(marker).length !== 1 || receipt.version !== 1 || receipt.oldLimit !== LIMIT_MICRO_CNY || receipt.newLimit !== AMENDED_LIMIT || receipt.policyHash !== policyDigest(policy)) fail('receipt identity mismatch');
  const oldHeadBytes = read(join(dir, 'old-head.json')), oldLedger = read(join(dir, 'ledger.jsonl'));
  if (sha(oldHeadBytes) !== receipt.headSha256 || sha(oldLedger) !== receipt.ledgerSha256) fail('snapshot changed');
  const oldHead = JSON.parse(oldHeadBytes);
  const old = validateUsed2SwitchEvidence(root, ledgerDir, policy, { ...options, currentLedger: oldLedger, currentHead: oldHead });
  if (!resolved(old.state) || old.state.reservedMicroCny !== receipt.reservedMicroCny || old.state.reservations !== receipt.reservations || old.state.sequence !== receipt.sequence) fail('old ledger unresolved');
  const current = options.currentLedger ?? read(join(ledgerDir, 'ledger.jsonl')), head = options.currentHead ?? JSON.parse(read(join(ledgerDir, 'head.json')));
  if (current.length < oldLedger.length || !equal(current.subarray(0, oldLedger.length), oldLedger)) fail('ledger prefix changed');
  const live = validateUsed2SwitchEvidence(root, ledgerDir, policy, { ...options, currentLedger: current, currentHead: head, expectedLimit: AMENDED_LIMIT });
  if (!resolved(live.state) || live.state.sequence < old.state.sequence || live.state.reservedMicroCny < old.state.reservedMicroCny || head.limit !== AMENDED_LIMIT) fail('current ledger invalid');
  return { old: old.state, state: live.state, limitMicroCny: AMENDED_LIMIT };
}

// Called only with an independently verified stopped Host and the ledger lock.
// A pending marker prevents Host startup after an interrupted replacement.
export function amendBudget(root, ledgerDir, policy, assertStopped, options = {}) {
  if (typeof assertStopped !== 'function' || assertStopped() !== true) fail('host must be stopped');
  const headPath = join(ledgerDir, 'head.json'), ledgerPath = join(ledgerDir, 'ledger.jsonl');
  const pending = join(root, 'budget-amendment-200.pending'), done = join(root, 'budget-amendment-200.completed'), dir = join(root, 'budget-amendment-200');
  if (existsSync(done)) return verifyBudgetAmendment(root, ledgerDir, policy, options);
  if (existsSync(pending) || existsSync(dir)) fail('partial transition requires diagnosis');
  const headBytes = read(headPath), head = JSON.parse(headBytes), ledgerBytes = read(ledgerPath);
  const ledger = openLedger(ledgerDir, policyDigest(policy));
  try {
    if (assertStopped() !== true || !equal(read(headPath), headBytes) || !equal(read(ledgerPath), ledgerBytes)) fail('state changed');
    const proof = validateUsed2SwitchEvidence(root, ledgerDir, policy, options), held = ledger.snapshot();
    if (!resolved(proof.state) || held.sequence !== proof.state.sequence || held.reservedMicroCny !== proof.state.reservedMicroCny || held.reservations !== proof.state.reservations) fail('ledger unresolved');
    const receipt = Buffer.from(JSON.stringify({ version: 1, oldLimit: LIMIT_MICRO_CNY, newLimit: AMENDED_LIMIT, policyHash: policyDigest(policy), headSha256: sha(headBytes), ledgerSha256: sha(ledgerBytes), sequence: held.sequence, reservedMicroCny: held.reservedMicroCny, reservations: held.reservations }) + '\n');
    mkdirSync(dir); syncDir(root); put(join(dir, 'old-head.json'), headBytes); put(join(dir, 'ledger.jsonl'), ledgerBytes); put(join(dir, 'receipt.json'), receipt); syncDir(dir);
    put(pending, Buffer.from(JSON.stringify({ receiptSha256: sha(receipt) }) + '\n'));
    syncDir(root);
    if (assertStopped() !== true || !equal(read(headPath), headBytes) || !equal(read(ledgerPath), ledgerBytes)) fail('state changed before commit');
    const temp = join(ledgerDir, 'budget-amendment-head.pending');
    put(temp, Buffer.from(JSON.stringify({ ...head, limit: AMENDED_LIMIT }) + '\n'));
    renameSync(temp, headPath);
    syncDir(ledgerDir);
    renameSync(pending, done);
    syncDir(root);
  } finally { ledger.close(); }
  return verifyBudgetAmendment(root, ledgerDir, policy, options);
}

// Fixed authorization: add the stated remaining balance to the exact observed
// cumulative reservation.  It does not grant a fresh independent budget.
export const FINAL_OBSERVED = Object.freeze({ sequence: 326, hash: '761964edea4eea2c4550a8f7f8eeffe9afa0e70b62df978471ecbea546da21c0', reservedMicroCny: 199_543_272, reservations: 163 });
export const FINAL_ADDITIONAL_MICRO_CNY = 99_630_000;
const finalName = 'budget-amendment-299173272';

export function verifyFinalBudgetAmendment(root, ledgerDir, policy, options = {}) {
  const observed = options.finalObserved ?? FINAL_OBSERVED;
  const dir = join(root, finalName);
  if (existsSync(join(root, `${finalName}.pending`))) fail('transition pending');
  const receiptBytes = read(join(dir, 'receipt.json')), receipt = JSON.parse(receiptBytes);
  const marker = JSON.parse(read(join(root, `${finalName}.completed`)));
  if (Object.keys(marker).join() !== 'receiptSha256' || marker.receiptSha256 !== sha(receiptBytes) || receipt.version !== 1 || receipt.oldLimit !== AMENDED_LIMIT || receipt.newLimit !== FINAL_LIMIT_MICRO_CNY || receipt.additionalMicroCny !== FINAL_ADDITIONAL_MICRO_CNY || receipt.policyHash !== policyDigest(policy)) fail('final receipt identity mismatch');
  const headBytes = read(join(dir, 'old-head.json')), oldLedger = read(join(dir, 'ledger.jsonl')), head = JSON.parse(headBytes);
  if (sha(headBytes) !== receipt.headSha256 || sha(oldLedger) !== receipt.ledgerSha256) fail('final snapshot changed');
  const old = verifyBudgetAmendment(root, ledgerDir, policy, { ...options, currentLedger: oldLedger, currentHead: head });
  if (!resolved(old.state) || head.sequence !== observed.sequence || head.hash !== observed.hash || old.state.reservedMicroCny !== observed.reservedMicroCny || old.state.reservations !== observed.reservations || receipt.sequence !== observed.sequence || receipt.reservedMicroCny !== observed.reservedMicroCny || receipt.reservations !== observed.reservations || observed.reservedMicroCny + FINAL_ADDITIONAL_MICRO_CNY !== FINAL_LIMIT_MICRO_CNY) fail('final baseline changed');
  const current = read(join(ledgerDir, 'ledger.jsonl')), liveHead = JSON.parse(read(join(ledgerDir, 'head.json')));
  if (current.length < oldLedger.length || !equal(current.subarray(0, oldLedger.length), oldLedger)) fail('final ledger prefix changed');
  const live = validateUsed2SwitchEvidence(root, ledgerDir, policy, { ...options, currentLedger: current, currentHead: liveHead, expectedLimit: FINAL_LIMIT_MICRO_CNY });
  if (!resolved(live.state) || live.state.sequence < old.state.sequence || live.state.reservedMicroCny < old.state.reservedMicroCny || liveHead.limit !== FINAL_LIMIT_MICRO_CNY) fail('final ledger invalid');
  return { old: old.state, state: live.state, limitMicroCny: FINAL_LIMIT_MICRO_CNY };
}

// The fixed command supplies no override. Test fixtures may inject only the
// observed hash/sequence while retaining the same monetary ceiling.
export function amendFinalBudget(root, ledgerDir, policy, assertStopped, options = {}) {
  if (typeof assertStopped !== 'function' || assertStopped() !== true) fail('host must be stopped');
  const pending = join(root, `${finalName}.pending`), done = join(root, `${finalName}.completed`), dir = join(root, finalName);
  if (existsSync(done)) return verifyFinalBudgetAmendment(root, ledgerDir, policy, options);
  if (existsSync(pending) || existsSync(dir)) fail('partial transition requires diagnosis');
  const headPath = join(ledgerDir, 'head.json'), ledgerPath = join(ledgerDir, 'ledger.jsonl');
  const headBytes = read(headPath), head = JSON.parse(headBytes), ledgerBytes = read(ledgerPath), observed = options.finalObserved ?? FINAL_OBSERVED;
  const ledger = openLedger(ledgerDir, policyDigest(policy), { limitMicroCny: AMENDED_LIMIT });
  try {
    if (assertStopped() !== true || !equal(read(headPath), headBytes) || !equal(read(ledgerPath), ledgerBytes)) fail('state changed');
    const proof = verifyBudgetAmendment(root, ledgerDir, policy, options), held = ledger.snapshot();
    if (!resolved(proof.state) || held.pending || held.frozen || head.sequence !== observed.sequence || head.hash !== observed.hash || held.sequence !== observed.sequence || held.reservedMicroCny !== observed.reservedMicroCny || held.reservations !== observed.reservations || observed.reservedMicroCny + FINAL_ADDITIONAL_MICRO_CNY !== FINAL_LIMIT_MICRO_CNY) fail('final baseline changed');
    const receipt = Buffer.from(JSON.stringify({ version: 1, oldLimit: AMENDED_LIMIT, newLimit: FINAL_LIMIT_MICRO_CNY, additionalMicroCny: FINAL_ADDITIONAL_MICRO_CNY, policyHash: policyDigest(policy), headSha256: sha(headBytes), ledgerSha256: sha(ledgerBytes), sequence: held.sequence, reservedMicroCny: held.reservedMicroCny, reservations: held.reservations }) + '\n');
    mkdirSync(dir); syncDir(root); put(join(dir, 'old-head.json'), headBytes); put(join(dir, 'ledger.jsonl'), ledgerBytes); put(join(dir, 'receipt.json'), receipt); syncDir(dir);
    put(pending, Buffer.from(JSON.stringify({ receiptSha256: sha(receipt) }) + '\n')); syncDir(root);
    if (assertStopped() !== true || !equal(read(headPath), headBytes) || !equal(read(ledgerPath), ledgerBytes)) fail('state changed before commit');
    const temp = join(ledgerDir, 'budget-amendment-head.pending');
    put(temp, Buffer.from(JSON.stringify({ ...head, limit: FINAL_LIMIT_MICRO_CNY }) + '\n')); renameSync(temp, headPath); syncDir(ledgerDir);
    renameSync(pending, done); syncDir(root);
  } finally { ledger.close(); }
  return verifyFinalBudgetAmendment(root, ledgerDir, policy, options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2 || process.platform !== 'linux' || process.env.AVE_P5_ISOLATED_PROJECT !== 'ave-p5-current-20261105' || realpathSync('/p5-run') !== '/p5-run' || realpathSync('/p5-budget/ledger') !== '/p5-budget/ledger') fail('invalid fixed helper context');
  const offline = () => { if (readdirSync('/sys/class/net').sort().join() !== 'lo') fail('network must be disabled'); return true; };
  const policy = JSON.parse(read('/p5-run/guard-policy.json'));
  console.log(JSON.stringify(amendFinalBudget('/p5-run', '/p5-budget/ledger', policy, offline)));
}
