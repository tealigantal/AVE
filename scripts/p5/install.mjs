// Preloaded before the Browser Host. This guards its current fetch paths, not arbitrary network clients.
import { lstatSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { openLedger } from './ledger.mjs';
import { createGuard, policyDigest } from './guard.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function ordinary(path) {
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('P5_SWITCH_SNAPSHOT_INVALID');
  return readFileSync(path);
}
function verifyCompletedSwitch(policy, baseline, evidence, activeIsPerformance = true) {
  const base = '/p5-run/empty-policy-switch.snapshots';
  const dir = lstatSync(base);
  if (!dir.isDirectory() || dir.isSymbolicLink()) throw Error('P5_SWITCH_SNAPSHOT_INVALID');
  const receiptBytes = ordinary(`${base}/receipt.json`), receipt = JSON.parse(receiptBytes);
  const marker = JSON.parse(ordinary('/p5-run/empty-policy-switch.completed'));
  const files = ['old-head.json', 'old-policy.json', 'new-policy.json', 'evidence.json'];
  if (Object.keys(marker).join() !== 'receiptSha256' || marker.receiptSha256 !== hash(receiptBytes) || receipt.version !== 1 || receipt.oldPolicyHash !== policyDigest(baseline) || receipt.newPolicyHash !== policyDigest(policy) || receipt.ledgerSha256 !== hash(Buffer.alloc(0)) || !receipt.files || Object.keys(receipt.files).sort().join() !== [...files].sort().join()) throw Error('P5_SWITCH_SNAPSHOT_INVALID');
  const data = Object.fromEntries(files.map(file => [file, ordinary(`${base}/${file}`)]));
  if (files.some(file => hash(data[file]) !== receipt.files[file]) || hash(data['old-head.json']) !== receipt.oldHeadSha256) throw Error('P5_SWITCH_SNAPSHOT_INVALID');
  const oldHead = JSON.parse(data['old-head.json']);
  if (Object.keys(oldHead).sort().join() !== 'hash,limit,policyHash,sequence,version' || oldHead.version !== 1 || oldHead.sequence !== 0 || oldHead.hash !== '0'.repeat(64) || oldHead.limit !== 100_000_000 || oldHead.policyHash !== policyDigest(baseline)) throw Error('P5_SWITCH_SNAPSHOT_INVALID');
  if (policyDigest(JSON.parse(data['old-policy.json'])) !== receipt.oldPolicyHash || policyDigest(JSON.parse(data['new-policy.json'])) !== receipt.newPolicyHash || !data['old-policy.json'].equals(ordinary('/p5-run/baseline-policy-performance-r1.json')) || !data['new-policy.json'].equals(ordinary('/p5-run/candidate-policy-performance-r1.json')) || (activeIsPerformance && !data['new-policy.json'].equals(ordinary('/p5-run/guard-policy.json'))) || !data['evidence.json'].equals(ordinary('/p5-run/candidate-evidence-performance-r1.json')) || JSON.stringify(JSON.parse(data['evidence.json'])) !== JSON.stringify(evidence)) throw Error('P5_SWITCH_SNAPSHOT_INVALID');
}

try { lstatSync('/p5-run/empty-policy-switch.pending'); throw Error('P5_SWITCH_PENDING'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try { lstatSync('/p5-run/used-policy-switch.pending'); throw Error('P5_SWITCH_PENDING'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try { lstatSync('/p5-run/used2-policy-switch.pending'); throw Error('P5_SWITCH_PENDING'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try { lstatSync('/p5-run/budget-amendment-299173272.pending'); throw Error('P5_SWITCH_PENDING'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try { lstatSync('/p5-run/harness-manifest-budget-299173272.pending'); throw Error('P5_SWITCH_PENDING'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try { lstatSync('/p5-run/budget-amendment-200.pending'); throw Error('P5_SWITCH_PENDING'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try { lstatSync('/p5-run/harness-manifest-used-r2.pending'); throw Error('P5_SWITCH_PENDING'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try { lstatSync('/p5-run/harness-manifest-used-r1.pending'); throw Error('P5_SWITCH_PENDING'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const policy = JSON.parse(readFileSync('/p5-run/guard-policy.json', 'utf8'));
if (policy.version !== 1 || policy.project !== process.env.AVE_P5_ISOLATED_PROJECT || policy.limitMicroCny !== 100_000_000) throw Error('P5_TASK_CONTEXT_MISMATCH');
const harnessBytes = readFileSync('/p5-run/harness-manifest.json');
const harness = JSON.parse(harnessBytes);
if (harness.schema_version !== 1 || !Array.isArray(harness.files) || !['guard.mjs', 'ledger.mjs', 'install.mjs'].every(file => harness.files.some(item => item.file === file)) || new Set(harness.files.map(item => item.file)).size !== harness.files.length) throw Error('P5_HARNESS_MANIFEST_INVALID');
for (const item of harness.files) {
  if (typeof item.file !== 'string' || item.file.includes('..') || item.file.startsWith('/') || item.file.includes('\\')) throw Error('P5_HARNESS_PATH_INVALID');
  if (hash(readFileSync(`/p5-harness/${item.file}`)) !== item.sha256) throw Error('P5_HARNESS_SOURCE_CHANGED');
}
if (hash(readFileSync('/opt/ave/app/resources/audio/free-audio-2026.10.02.1.json')) !== policy.catalogHash) throw Error('P5_POLICY_INPUT_IDENTITY_MISMATCH');
const baselinePolicy = 'c624e9897f9986320a47e7df8c3fb8c01f5fac9c95830e8bc42885b6db378b69';
let usedSwitchPresent = false, used2Present = false, budgetAmended = false, finalBudgetAmended = false;
try { lstatSync('/p5-run/budget-amendment-299173272.completed'); finalBudgetAmended = true; }
catch (error) { if (error.code !== 'ENOENT') throw error; }
try { lstatSync('/p5-run/budget-amendment-200.completed'); budgetAmended = true; }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (finalBudgetAmended && !budgetAmended) throw Error('P5_SWITCH_HISTORY_MISSING');
if (budgetAmended && !harness.files.some(item => item.file === 'budget-amendment.mjs')) throw Error('P5_HARNESS_MANIFEST_INVALID');
if (policyDigest(policy) === baselinePolicy) {
  try { lstatSync('/p5-run/used2-policy-switch.completed'); throw Error('P5_SWITCH_HISTORY_UNEXPECTED'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  // Preserve the original four-file harness and six-input startup path.
  const inputsBytes = readFileSync('/p5-run/inputs-manifest.json');
  const samplesBytes = readFileSync('/p5-run/samples-r1/receipt.json');
  if (hash(inputsBytes) !== policy.inputsManifestHash || hash(samplesBytes) !== policy.sampleReceiptHash) throw Error('P5_POLICY_INPUT_IDENTITY_MISMATCH');
  const inputs = JSON.parse(inputsBytes).inputs;
  for (const input of inputs) {
    if (!/^[a-z0-9-]+\.(mp4|png|wav)$/.test(input.file)) throw Error('P5_POLICY_INPUT_PATH_INVALID');
    const bytes = readFileSync(`/p5-run/inputs/${input.file}`);
    if (bytes.length !== input.bytes || hash(bytes) !== input.sha256 || !policy.assetHashes.includes(input.sha256)) throw Error('P5_POLICY_SOURCE_CHANGED');
  }
  for (const sample of JSON.parse(samplesBytes).entries) {
    if (!inputs.some(input => input.file === sample.input && input.sha256 === sample.source_digest) || !policy.imageHashes.includes(sample.content_digest)) throw Error('P5_SAMPLE_SOURCE_NOT_AUTHORIZED');
  }
} else {
  // Dynamic imports happen only after the complete dependency set has been
  // checked against the startup manifest. The verifier accepts one pinned C5
  // addition and rejects any other price, limit, source or sample changes.
  if (!['launch.py', 'performance-amendment.mjs', 'sources.mjs'].every(file => harness.files.some(item => item.file === file))) throw Error('P5_HARNESS_MANIFEST_INVALID');
  const { verifyPerformanceAmendment, resolvePerformanceInputPaths } = await import('./performance-amendment.mjs');
  const baseline = JSON.parse(readFileSync('/p5-run/baseline-policy-performance-r1.json', 'utf8'));
  const evidence = JSON.parse(readFileSync('/p5-run/candidate-evidence-performance-r1.json', 'utf8'));
  let performancePolicy = policy, activeIsPerformance = true;
  try { lstatSync('/p5-run/used-policy-switch.completed'); usedSwitchPresent = true; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  try { lstatSync('/p5-run/used2-policy-switch.completed'); used2Present = true; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (used2Present && !usedSwitchPresent) throw Error('P5_SWITCH_HISTORY_MISSING');
  if (usedSwitchPresent) {
    if (!harness.files.some(item => item.file === 'used-policy-switch.mjs')) throw Error('P5_HARNESS_MANIFEST_INVALID');
    const { validateUsedSwitchEvidence, requireResolvedUsedLedger } = await import('./used-policy-switch.mjs');
    if (used2Present && !harness.files.some(item => item.file === 'used2-policy-switch.mjs')) throw Error('P5_HARNESS_MANIFEST_INVALID');
    if (budgetAmended && !used2Present) throw Error('P5_SWITCH_HISTORY_MISSING');
    const proof = budgetAmended ? (await import('./budget-amendment.mjs'))[finalBudgetAmended ? 'verifyFinalBudgetAmendment' : 'verifyBudgetAmendment']('/p5-run', '/p5-budget/ledger', policy) : used2Present ? (await import('./used2-policy-switch.mjs')).validateUsed2SwitchEvidence('/p5-run', '/p5-budget/ledger', policy) : validateUsedSwitchEvidence('/p5-run', '/p5-budget/ledger', policy);
    requireResolvedUsedLedger(proof.state);
    performancePolicy = budgetAmended ? (await import('./used2-policy-switch.mjs')).validateUsed2SwitchEvidence('/p5-run', '/p5-budget/ledger', policy, { expectedLimit: finalBudgetAmended ? 299_173_272 : 200_000_000 }).first.previous : used2Present ? proof.first.previous : proof.previous;
    activeIsPerformance = false;
  }
  verifyPerformanceAmendment('/p5-run', baseline, performancePolicy, evidence);
  verifyCompletedSwitch(performancePolicy, baseline, evidence, activeIsPerformance);
  const inputsBytes = readFileSync('/p5-run/inputs-manifest-performance-r1.json');
  const samplesBytes = readFileSync('/p5-run/samples-performance-r1.json');
  if (hash(inputsBytes) !== policy.inputsManifestHash || hash(samplesBytes) !== policy.sampleReceiptHash) throw Error('P5_POLICY_INPUT_IDENTITY_MISMATCH');
  const inputs = JSON.parse(inputsBytes).inputs, paths = resolvePerformanceInputPaths(inputs);
  for (let i = 0; i < inputs.length; i++) {
    const bytes = readFileSync(`/p5-run/${paths[i]}`), input = inputs[i];
    if (bytes.length !== input.bytes || hash(bytes) !== input.sha256 || !policy.assetHashes.includes(input.sha256)) throw Error('P5_POLICY_SOURCE_CHANGED');
  }
  for (const sample of JSON.parse(samplesBytes).entries) {
    if (!inputs.some(input => input.file === sample.input && input.sha256 === sample.source_digest) || !policy.imageHashes.includes(sample.content_digest)) throw Error('P5_SAMPLE_SOURCE_NOT_AUTHORIZED');
  }
}
const ledger = openLedger('/p5-budget/ledger', policyDigest(policy), { limitMicroCny: finalBudgetAmended ? 299_173_272 : budgetAmended ? 200_000_000 : 100_000_000 });
try {
  // The pre-lock proof can become stale while an old Host is shutting down.
  // Re-read the complete chain under this process's exclusive ledger lock.
  if (usedSwitchPresent) {
    if (budgetAmended) {
      const proof = (await import('./budget-amendment.mjs'))[finalBudgetAmended ? 'verifyFinalBudgetAmendment' : 'verifyBudgetAmendment']('/p5-run', '/p5-budget/ledger', policy), held = ledger.snapshot();
      if (held.pending || held.frozen || held.sequence !== proof.state.sequence || held.reservedMicroCny !== proof.state.reservedMicroCny || held.reservations !== proof.state.reservations) throw Error('P5_BUDGET_LOCKED_STATE_CHANGED');
    } else if (used2Present) (await import('./used2-policy-switch.mjs')).verifyLockedUsed2Startup('/p5-run', '/p5-budget/ledger', policy, ledger);
    else (await import('./used-policy-switch.mjs')).verifyLockedUsedStartup('/p5-run', '/p5-budget/ledger', policy, ledger);
  }
  const lockPath = '/p5-budget/ledger/owner.lock', ledgerPath = '/p5-budget/ledger/ledger.jsonl';
  const lockStat = lstatSync(lockPath, { bigint: true }), lockBytes = ordinary(lockPath), ledgerStat = lstatSync(ledgerPath, { bigint: true });
  if (!lockStat.isFile() || lockStat.isSymbolicLink() || !ledgerStat.isFile() || ledgerStat.isSymbolicLink()) throw Error('P5_AUTHORITY_LEDGER_INVALID');
  const provenancePath = '/opt/ave/app/build-provenance.json';
  const provenanceBytes = ordinary(provenancePath), provenanceHash = hash(provenanceBytes);
  let guardedFetch;
  const assertContinuationAuthority = () => {
    const currentLock = lstatSync(lockPath, { bigint: true }), currentLedger = lstatSync(ledgerPath, { bigint: true });
    if (!usedSwitchPresent || globalThis.fetch !== guardedFetch || !currentLock.isFile() || currentLock.isSymbolicLink() || currentLock.dev !== lockStat.dev || currentLock.ino !== lockStat.ino || !ordinary(lockPath).equals(lockBytes) || !currentLedger.isFile() || currentLedger.isSymbolicLink() || currentLedger.dev !== ledgerStat.dev || currentLedger.ino !== ledgerStat.ino || hash(ordinary(provenancePath)) !== provenanceHash || hash(ordinary('/p5-run/harness-manifest.json')) !== hash(harnessBytes) || policyDigest(JSON.parse(ordinary('/p5-run/guard-policy.json'))) !== policyDigest(policy)) throw Error('P5_AUTHORITY_IDENTITY_CHANGED');
    continuationVerifier('/p5-run', '/p5-budget/ledger', policy, ledger);
    return true;
  };
  let continuationVerifier;
  if (budgetAmended) {
    const amendment = await import('./budget-amendment.mjs');
    const verifyBudgetAmendment = finalBudgetAmended ? amendment.verifyFinalBudgetAmendment : amendment.verifyBudgetAmendment;
    continuationVerifier = (root, directory, currentPolicy, heldLedger) => {
      const proof = verifyBudgetAmendment(root, directory, currentPolicy), held = heldLedger.snapshot();
      if (held.pending || held.frozen || held.sequence !== proof.state.sequence || held.reservedMicroCny !== proof.state.reservedMicroCny || held.reservations !== proof.state.reservations) throw Error('P5_BUDGET_LOCKED_STATE_CHANGED');
      return proof;
    };
  } else if (used2Present) ({ verifyLockedUsed2Startup: continuationVerifier } = await import('./used2-policy-switch.mjs'));
  else if (usedSwitchPresent) ({ verifyLockedUsedStartup: continuationVerifier } = await import('./used-policy-switch.mjs'));
  guardedFetch = createGuard({ ledger, policy, priceEvidence: readFileSync('/p5-run/price-evidence.json'), fetchImpl: globalThis.fetch.bind(globalThis), assertContinuationAuthority });
  globalThis.fetch = guardedFetch;
  // Images predating this capability remain usable for normal requests but
  // cannot offer continuation. New images bind this fixed module to the
  // build provenance independently verified by the outer runtime check.
  const capabilityPath = '/opt/ave/app/packages/platform/model-gateway/src/trusted-dispatch.js';
  let capabilityBytes;
  try { capabilityBytes = ordinary(capabilityPath); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (usedSwitchPresent && capabilityBytes) {
    const provenance = JSON.parse(provenanceBytes);
    const entries = provenance.outputs?.filter(item => item.path === 'packages/platform/model-gateway/src/trusted-dispatch.js') ?? [];
    if (entries.length !== 1 || entries[0].sha256 !== hash(capabilityBytes) || entries[0].bytes !== capabilityBytes.length) throw Error('P5_AUTHORITY_MODULE_CHANGED');
    const registry = await import('file:///opt/ave/app/packages/platform/model-gateway/src/trusted-dispatch.js');
    const identity = { version: 1, project: policy.project, policy: policyDigest(policy), harness: hash(harnessBytes), provenance: provenanceHash, ledger_device: String(ledgerStat.dev), ledger_inode: String(ledgerStat.ino) };
    registry.registerTrustedDispatch({ digest: hash(JSON.stringify(identity)), resumeDispatch: guardedFetch.resumeDispatch });
  }
} catch (error) {
  try { ledger.close(); }
  catch (cleanup) { throw new AggregateError([error, cleanup], 'P5 guard startup and ledger cleanup both failed', { cause: error }); }
  throw error;
}
process.on('exit', () => ledger.close());
console.log(JSON.stringify({ event: 'P5_GUARD_READY', policy_sha256: policyDigest(policy), harness_sha256: hash(harnessBytes), project: policy.project, ...ledger.snapshot() }));
