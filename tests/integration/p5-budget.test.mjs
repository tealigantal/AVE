import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initializeLedger, openLedger, LIMIT_MICRO_CNY, FINAL_LIMIT_MICRO_CNY } from '../../scripts/p5/ledger.mjs';
import { createGuard, policyDigest, quote } from '../../scripts/p5/guard.mjs';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { switchEmptyPolicyInTest, switchFixedPerformancePolicy, validateEmptyPolicyExpansion } from '../../scripts/p5/empty-policy-switch.mjs';
import { verifyPerformanceAmendment } from '../../scripts/p5/performance-amendment.mjs';
import { switchUsedPolicyInTest, validateUsedPolicyExpansion, validateUsedSwitchEvidence, switchFixedUsedPolicy, requireResolvedUsedLedger, verifyLockedUsedStartup } from '../../scripts/p5/used-policy-switch.mjs';
import { switchUsed2PolicyInTest, switchFixedUsed2Policy, validateUsed2PolicyExpansion, validateUsed2SwitchEvidence, verifyLockedUsed2Startup } from '../../scripts/p5/used2-policy-switch.mjs';
import { runRoot } from '../../scripts/p5/sources.mjs';
import { amendBudget, verifyBudgetAmendment, amendFinalBudget, verifyFinalBudgetAmendment, AMENDED_LIMIT } from '../../scripts/p5/budget-amendment.mjs';
import { openVerifiedTaskLedger } from '../../scripts/p5/policy.mjs';

const policy = 'a'.repeat(64), wire1 = 'b'.repeat(64), wire2 = 'c'.repeat(64);

test('trusted continuation binds actual guarded fetch, exclusive authority and exact wire', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-dispatch-'));
  let ledger;
  try {
    const priceEvidence = Buffer.from('isolated dispatch price'), model = 'qwen3.7-max-2026-05-20';
    const rules = { priceEvidenceHash: createHash('sha256').update(priceEvidence).digest('hex'), imageHashes: [], assetHashes: [], models: {
      [model]: { maxTokens: 20, enableThinking: false, inputMicroCnyPerMillion: 1000000, outputMicroCnyPerMillion: 1000000, imageTokenUpper: 0, frameTokenUpper: 0, outputTokenMargin: 0, maxInputTokens: 10000, maxImages: 0 }
    } };
    initializeLedger(join(root, 'ledger'), policyDigest(rules)); ledger = openLedger(join(root, 'ledger'), policyDigest(rules));
    let sends = 0, validAuthority = true;
    const guarded = createGuard({ ledger, policy: rules, priceEvidence, assertContinuationAuthority: () => validAuthority, fetchImpl: async () => { sends++; return new Response(JSON.stringify({ usage: { prompt_tokens: 1, completion_tokens: 1 } })); } });
    const body = JSON.stringify({ model, max_tokens: 20, enable_thinking: false, messages: [{ role: 'user', content: 'authorized' }] });
    const transport = { wire_digest: createHash('sha256').update(body).digest('hex'), input_bytes: Buffer.byteLength(body), target: { role: 'planner', provider: 'qwen', model, endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1', digest: 'd'.repeat(64) } };
    const target = `${transport.target.endpoint}/chat/completions`, send = () => guarded(target, { method: 'POST', redirect: 'error', body });
    await assert.rejects(guarded.resumeDispatch(transport, async () => new Response('fake')), /did not return guarded response/);
    await assert.rejects(guarded.resumeDispatch({ ...transport, input_bytes: transport.input_bytes + 1 }, send), /transport mismatch/);
    await assert.rejects(guarded.resumeDispatch({ ...transport, input_bytes: transport.input_bytes + 1 }, async () => { try { await send(); } catch {} return new Response('fake'); }), /did not return guarded response/);
    await assert.rejects(guarded.resumeDispatch({ ...transport, target: { ...transport.target, endpoint: 'https://example.com' } }, send), /invalid continuation/);
    validAuthority = false; await assert.rejects(guarded.resumeDispatch(transport, send), /authority unavailable/); validAuthority = true;
    assert.equal(sends, 0); assert.equal(ledger.snapshot().reservations, 0);
    const response = await guarded.resumeDispatch(transport, send); assert.equal(response.status, 200);
    assert.equal(sends, 1); assert.equal(ledger.snapshot().reservations, 1); assert.equal(ledger.snapshot().pending, 0);
    await assert.rejects(guarded.resumeDispatch(transport, send), /no blind replay/);
    assert.equal(sends, 1);
  } finally { ledger?.close(); rmSync(root, { recursive: true, force: true }); }
});

function usedSwitchFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-used-switch-test-'));
  const model = { maxTokens: 8192, enableThinking: true, thinkingBudget: 4096, inputMicroCnyPerMillion: 12000000, outputMicroCnyPerMillion: 36000000, imageTokenUpper: 0, frameTokenUpper: 8192, outputTokenMargin: 256, maxInputTokens: 131072, maxImages: 0, maxTextBytes: 100000 };
  const previous = { project: 'ave-p5-current-20261105', version: 1, limitMicroCny: LIMIT_MICRO_CNY, priceEvidenceHash: 'a'.repeat(64), imageHashes: [], assetHashes: [], models: { 'qwen3.7-max-2026-05-20': model } };
  const candidate = structuredClone(previous);
  Object.assign(candidate.models['qwen3.7-max-2026-05-20'], { maxTextBytes: 150000, maxInputTokens: 160000 });
  writeFileSync(join(root, 'guard-policy.json'), JSON.stringify(previous));
  writeFileSync(join(root, 'candidate-policy.json'), JSON.stringify(candidate));
  initializeLedger(join(root, 'ledger'), policyDigest(previous));
  return { root, previous, candidate };
}

function used2Fixture() {
  const f = usedSwitchFixture(), path = join(f.root, 'ledger');
  let ledger = openLedger(path, policyDigest(f.previous)); ledger.reserve(wire1, 7); ledger.finish(wire1, 'response'); ledger.close();
  switchUsedPolicyInTest(f.root, { assertHostStopped: () => true });
  ledger = openLedger(path, policyDigest(f.candidate)); ledger.reserve(wire2, 11); ledger.finish(wire2, 'response'); const state = ledger.snapshot(); ledger.close();
  const head = JSON.parse(readFileSync(join(path, 'head.json'))), next = structuredClone(f.candidate);
  Object.assign(next.models['qwen3.7-max-2026-05-20'], { maxTextBytes: 500000, maxInputTokens: 524288 });
  writeFileSync(join(f.root, 'candidate-policy2.json'), JSON.stringify(next));
  const options = { expectedFirstHash: policyDigest(f.previous), expectedPriorHash: policyDigest(f.candidate), observed: { sequence: state.sequence, hash: head.hash, reservedMicroCny: state.reservedMicroCny, reservations: state.reservations } };
  return { ...f, path, next, options };
}

test('authorized cumulative increase preserves the entire used ledger and enforces the new ceiling', () => {
  const f = used2Fixture();
  try {
    switchUsed2PolicyInTest(f.root, { ...f.options, assertHostStopped: () => true });
    const before = readFileSync(join(f.path, 'ledger.jsonl'));
    assert.throws(() => amendBudget(f.root, f.path, f.next, () => false, f.options), /host must be stopped/);
    const proof = amendBudget(f.root, f.path, f.next, () => true, f.options);
    assert.equal(proof.old.reservedMicroCny, 18);
    assert.deepEqual(readFileSync(join(f.path, 'ledger.jsonl')), before);
    assert.throws(() => openLedger(f.path, policyDigest(f.next)), /ceiling mismatch/);
    const ledger = openVerifiedTaskLedger(f.root, f.path, f.next, f.options);
    assert.throws(() => ledger.reserve('f'.repeat(64), AMENDED_LIMIT - 17), /budget exceeded/);
    ledger.reserve('f'.repeat(64), 100_000_000); ledger.finish('f'.repeat(64), 'response'); ledger.close();
    assert.equal(verifyBudgetAmendment(f.root, f.path, f.next, f.options).state.reservedMicroCny, 100_000_018);
    const snapshot = join(f.root, 'budget-amendment-200', 'ledger.jsonl'), saved = readFileSync(snapshot);
    writeFileSync(snapshot, '{}\n'); assert.throws(() => verifyBudgetAmendment(f.root, f.path, f.next, f.options), /snapshot changed/);
    assert.throws(() => openVerifiedTaskLedger(f.root, f.path, f.next, f.options), /snapshot changed/);
    assert.equal(existsSync(join(f.path, 'owner.lock')), false); writeFileSync(snapshot, saved);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('additional balance binds the exact existing ledger and remains a cumulative ceiling', () => {
  const f = used2Fixture();
  try {
    switchUsed2PolicyInTest(f.root, { ...f.options, assertHostStopped: () => true });
    amendBudget(f.root, f.path, f.next, () => true, f.options);
    let ledger = openVerifiedTaskLedger(f.root, f.path, f.next, f.options);
    for (let i = 0; i < 161; i++) {
      const wire = createHash('sha256').update(`additional-${i}`).digest('hex');
      ledger.reserve(wire, i === 160 ? 199_543_094 : 1); ledger.finish(wire, 'response');
    }
    const state = ledger.snapshot(); ledger.close();
    const head = JSON.parse(readFileSync(join(f.path, 'head.json')));
    const options = { ...f.options, finalObserved: { sequence: state.sequence, hash: head.hash, reservedMicroCny: state.reservedMicroCny, reservations: state.reservations } };
    assert.equal(state.reservedMicroCny, 199_543_272); assert.equal(state.reservations, 163);
    const original = readFileSync(join(f.path, 'ledger.jsonl'));
    assert.throws(() => amendFinalBudget(f.root, f.path, f.next, () => false, options), /host must be stopped/);
    assert.throws(() => amendFinalBudget(f.root, f.path, f.next, () => true, { ...options, finalObserved: { ...options.finalObserved, hash: 'f'.repeat(64) } }), /baseline changed/);
    const proof = amendFinalBudget(f.root, f.path, f.next, () => true, options);
    assert.equal(proof.limitMicroCny, FINAL_LIMIT_MICRO_CNY);
    assert.deepEqual(readFileSync(join(f.path, 'ledger.jsonl')), original);
    ledger = openVerifiedTaskLedger(f.root, f.path, f.next, options);
    assert.throws(() => ledger.reserve('f'.repeat(64), 99_630_001), /budget exceeded/);
    ledger.reserve('f'.repeat(64), 99_630_000); ledger.finish('f'.repeat(64), 'response'); ledger.close();
    assert.equal(verifyFinalBudgetAmendment(f.root, f.path, f.next, options).state.reservedMicroCny, FINAL_LIMIT_MICRO_CNY);
    const snapshot = join(f.root, 'budget-amendment-299173272', 'ledger.jsonl'), saved = readFileSync(snapshot);
    writeFileSync(snapshot, '{}\\n');
    assert.throws(() => openVerifiedTaskLedger(f.root, f.path, f.next, options), /snapshot changed/);
    assert.equal(existsSync(join(f.path, 'owner.lock')), false); writeFileSync(snapshot, saved);
    writeFileSync(join(f.root, 'budget-amendment-299173272.pending'), '{}');
    assert.throws(() => openVerifiedTaskLedger(f.root, f.path, f.next, options), /TRANSITION_PENDING/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('second used policy preserves both historical chains and only enlarges planner bounds', () => {
  const f = used2Fixture();
  try {
    validateUsed2PolicyExpansion(f.candidate, f.next);
    const changed = structuredClone(f.next); changed.models['qwen3.7-max-2026-05-20'].outputMicroCnyPerMillion--;
    assert.throws(() => validateUsed2PolicyExpansion(f.candidate, changed), /unauthorized/);
    const firstBytes = readFileSync(join(f.root, 'used-policy-switch.snapshots', 'ledger.jsonl')), oldBytes = readFileSync(join(f.path, 'ledger.jsonl'));
    const result = switchUsed2PolicyInTest(f.root, { ...f.options, assertHostStopped: () => true });
    assert.equal(result.reservedMicroCny, 18); assert.equal(result.reservations, 2);
    assert.deepEqual(readFileSync(join(f.root, 'used-policy-switch.snapshots', 'ledger.jsonl')), firstBytes);
    assert.deepEqual(readFileSync(join(f.root, 'used2-policy-switch.snapshots', 'ledger.jsonl')), oldBytes);
    let proof = validateUsed2SwitchEvidence(f.root, f.path, f.next, f.options);
    assert.equal(proof.first.oldState.reservations, 1); assert.equal(proof.oldState.reservations, 2);
    const ledger = openLedger(f.path, policyDigest(f.next)); verifyLockedUsed2Startup(f.root, f.path, f.next, ledger, f.options);
    ledger.reserve('e'.repeat(64), 13); ledger.finish('e'.repeat(64), 'response'); ledger.close();
    proof = validateUsed2SwitchEvidence(f.root, f.path, f.next, f.options); assert.equal(proof.state.reservedMicroCny, 31);
    const firstNew = join(f.root, 'used-policy-switch.snapshots', 'new-policy.json'), saved = readFileSync(firstNew);
    writeFileSync(firstNew, '{}'); assert.throws(() => validateUsed2SwitchEvidence(f.root, f.path, f.next, f.options), /not byte-identical/); writeFileSync(firstNew, saved);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('second used policy resumes ordered interruptions and rejects active or unresolved ledgers', () => {
  for (const step of ['snapshots', 'marker', 'policy', 'head', 'linked']) {
    const f = used2Fixture();
    try {
      const original = readFileSync(join(f.path, 'ledger.jsonl'));
      assert.throws(() => switchUsed2PolicyInTest(f.root, { ...f.options, assertHostStopped: () => true, onStep: point => { if (point === step) throw Error(`crash-${step}`); } }), new RegExp(`crash-${step}`));
      assert.deepEqual(readFileSync(join(f.path, 'ledger.jsonl')), original);
      switchUsed2PolicyInTest(f.root, { ...f.options, assertHostStopped: () => true });
      assert.equal(validateUsed2SwitchEvidence(f.root, f.path, f.next, f.options).state.reservedMicroCny, 18);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  }
  for (const mode of ['active', 'pending', 'uncertain']) {
    const f = used2Fixture(); let owner;
    try {
      if (mode === 'active') owner = openLedger(f.path, policyDigest(f.candidate));
      else { const ledger = openLedger(f.path, policyDigest(f.candidate)); ledger.reserve('e'.repeat(64), 1); if (mode === 'uncertain') ledger.finish('e'.repeat(64), 'uncertain'); ledger.close(); }
      assert.throws(() => switchUsed2PolicyInTest(f.root, { ...f.options, assertHostStopped: () => true }), /EEXIST|unresolved|identity changed/);
    } finally { owner?.close(); rmSync(f.root, { recursive: true, force: true }); }
  }
  assert.throws(() => switchFixedUsed2Policy({ root: 'outside' }), /invalid live/);
});

test('hard-killed second migration preserves its lock and both historical prefixes', async () => {
  const f = used2Fixture(); let child;
  try {
    const before = readFileSync(join(f.path, 'ledger.jsonl'));
    const script = `import {writeSync} from 'node:fs'; import {switchUsed2PolicyInTest} from ${JSON.stringify(new URL('../../scripts/p5/used2-policy-switch.mjs', import.meta.url).href)}; const opts=JSON.parse(process.argv[2]); switchUsed2PolicyInTest(process.argv[1], {...opts,assertHostStopped:()=>true,onStep:step=>{if(step==='marker'){writeSync(1,'READY\\n');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}}});`;
    child = spawn(process.execPath, ['--input-type=module', '-e', script, f.root, JSON.stringify(f.options)], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const exited = once(child, 'exit');
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('hard-kill fixture timed out')), 15000); child.once('error', error => { clearTimeout(timer); reject(error); }); child.stdout.once('data', data => { clearTimeout(timer); data.toString().includes('READY') ? resolve() : reject(Error('marker not reached')); }); child.once('exit', () => { clearTimeout(timer); reject(Error('fixture exited early')); }); });
    child.kill('SIGKILL'); await exited; child = null;
    assert.equal(existsSync(join(f.root, 'used2-policy-switch.pending')), true); assert.equal(existsSync(join(f.path, 'owner.lock')), true);
    assert.deepEqual(readFileSync(join(f.path, 'ledger.jsonl')), before);
    assert.throws(() => switchUsed2PolicyInTest(f.root, { ...f.options, assertHostStopped: () => true }), /EEXIST/);
  } finally { if (child) child.kill('SIGKILL'); rmSync(f.root, { recursive: true, force: true }); }
});

test('used policy expansion prices the complete request and rejects other policy changes', () => {
  const f = usedSwitchFixture();
  try {
    validateUsedPolicyExpansion(f.previous, f.candidate);
    const changed = structuredClone(f.candidate); changed.assetHashes.push('b'.repeat(64));
    assert.throws(() => validateUsedPolicyExpansion(f.previous, changed), /unauthorized/);
    changed.assetHashes = []; changed.models['qwen3.7-max-2026-05-20'].inputMicroCnyPerMillion--;
    assert.throws(() => validateUsedPolicyExpansion(f.previous, changed), /unauthorized/);
    const body = { model: 'qwen3.7-max-2026-05-20', max_tokens: 8192, enable_thinking: true, thinking_budget: 4096, messages: [{ role: 'user', content: 'x'.repeat(136000) }] };
    assert.throws(() => quote(body, f.previous), /text byte bound/);
    const priced = quote(body, f.candidate);
    assert.equal(priced.inputUpper, Buffer.byteLength(JSON.stringify(body)) + 8192);
    assert.ok(priced.microCny > 2000000 && priced.microCny < LIMIT_MICRO_CNY);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('used policy migration preserves the same ledger and recovers at every durable checkpoint', () => {
  for (const interrupted of ['snapshots', 'marker', 'policy', 'head', 'linked', null]) {
    const f = usedSwitchFixture();
    try {
      const ledgerPath = join(f.root, 'ledger', 'ledger.jsonl');
      let ledger = openLedger(join(f.root, 'ledger'), policyDigest(f.previous));
      ledger.reserve(wire1, 28774764); ledger.finish(wire1, 'response'); ledger.close();
      const before = readFileSync(ledgerPath);
      const options = { assertHostStopped: () => true, onStep: step => { if (step === interrupted) throw Error('simulated crash'); } };
      if (interrupted) assert.throws(() => switchUsedPolicyInTest(f.root, options), /simulated crash/);
      const result = switchUsedPolicyInTest(f.root, { assertHostStopped: () => true });
      assert.equal(result.reservedMicroCny, 28774764);
      assert.deepEqual(readFileSync(ledgerPath), before);
      ledger = openLedger(join(f.root, 'ledger'), policyDigest(f.candidate));
      assert.equal(ledger.snapshot().reservedMicroCny, 28774764);
      assert.throws(() => ledger.reserve(wire1, 1), /no blind replay/);
      assert.throws(() => ledger.reserve(wire2, LIMIT_MICRO_CNY - 28774764 + 1), /budget exceeded/);
      ledger.reserve(wire2, 123); ledger.finish(wire2, 'response');
      ledger.close();
      const verified = validateUsedSwitchEvidence(f.root, join(f.root, 'ledger'), f.candidate, policyDigest(f.previous));
      assert.equal(verified.state.reservedMicroCny, 28774887);
      assert.equal(verified.oldState.reservedMicroCny, 28774764);
      assert.throws(() => validateUsedSwitchEvidence(f.root, join(f.root, 'ledger'), f.candidate, 'f'.repeat(64)), /policy identity mismatch/);
      assert.throws(() => switchUsedPolicyInTest(f.root, { assertHostStopped: () => true }), /already completed/);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  }
});

test('fixed used policy adapter accepts no caller-controlled paths or host execution', () => {
  assert.throws(() => switchFixedUsedPolicy('/untrusted'), /invalid live transition context/);
  if (process.platform !== 'linux') assert.throws(() => switchFixedUsedPolicy(), /invalid live transition context/);
});

test('used startup rejects unresolved, uncertain and frozen ledger states', () => {
  assert.equal(requireResolvedUsedLedger({ pending: 0, frozen: false, uncertain: false }), true);
  for (const state of [{ pending: 1 }, { uncertain: true }, { frozen: true }, null]) assert.throws(() => requireResolvedUsedLedger(state), /unresolved/);
});

test('used startup rechecks under the owner lock after a stale clean proof', () => {
  const f = usedSwitchFixture();
  try {
    let ledger = openLedger(join(f.root, 'ledger'), policyDigest(f.previous));
    ledger.reserve(wire1, 10); ledger.finish(wire1, 'response'); ledger.close();
    switchUsedPolicyInTest(f.root, { assertHostStopped: () => true });
    const preLock = validateUsedSwitchEvidence(f.root, join(f.root, 'ledger'), f.candidate, policyDigest(f.previous));
    assert.equal(preLock.state.uncertain, false);
    ledger = openLedger(join(f.root, 'ledger'), policyDigest(f.candidate));
    verifyLockedUsedStartup(f.root, join(f.root, 'ledger'), f.candidate, ledger, policyDigest(f.previous));
    ledger.reserve(wire2, 5); ledger.finish(wire2, 'uncertain');
    assert.throws(() => verifyLockedUsedStartup(f.root, join(f.root, 'ledger'), f.candidate, ledger, policyDigest(f.previous)), /unresolved/);
    ledger.close();
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('used policy migration refuses active host, pending, uncertain, violation, and changed evidence', () => {
  for (const terminal of ['pending', 'uncertain', 'violation', 'response']) {
    const f = usedSwitchFixture();
    try {
      const ledger = openLedger(join(f.root, 'ledger'), policyDigest(f.previous));
      ledger.reserve(wire1, 5); if (terminal !== 'pending') ledger.finish(wire1, terminal); ledger.close();
      if (terminal === 'response') {
        assert.throws(() => switchUsedPolicyInTest(f.root, { assertHostStopped: () => false }), /host not stopped/);
        assert.throws(() => switchUsedPolicyInTest(f.root, { assertHostStopped: () => true, onStep: step => { if (step === 'marker') throw Error('pause'); } }), /pause/);
        writeFileSync(join(f.root, 'candidate-policy.json'), '{}');
        assert.throws(() => switchUsedPolicyInTest(f.root, { assertHostStopped: () => true }), /snapshot identity mismatch/);
      } else assert.throws(() => switchUsedPolicyInTest(f.root, { assertHostStopped: () => true }), /unresolved or frozen/);
    } finally { rmSync(f.root, { recursive: true, force: true }); }
  }
});

test('used migration preserves locks and fails closed when the Host restarts during a transition', () => {
  const f = usedSwitchFixture();
  try {
    const ledger = openLedger(join(f.root, 'ledger'), policyDigest(f.previous));
    ledger.reserve(wire1, 7); ledger.finish(wire1, 'response');
    assert.throws(() => switchUsedPolicyInTest(f.root, { assertHostStopped: () => true }), /EEXIST/);
    ledger.close();
    let online = false;
    assert.throws(() => switchUsedPolicyInTest(f.root, { assertHostStopped: () => !online, onStep: step => { if (step === 'policy') online = true; } }), /host not stopped/);
    assert.equal(existsSync(join(f.root, 'used-policy-switch.pending')), true);
    assert.throws(() => validateUsedSwitchEvidence(f.root, join(f.root, 'ledger'), f.candidate, policyDigest(f.previous)), /transition pending/);
    switchUsedPolicyInTest(f.root, { assertHostStopped: () => true });
    assert.equal(validateUsedSwitchEvidence(f.root, join(f.root, 'ledger'), f.candidate, policyDigest(f.previous)).state.reservedMicroCny, 7);
    writeFileSync(join(f.root, 'ledger', 'ledger.jsonl'), '{}\n');
    assert.throws(() => validateUsedSwitchEvidence(f.root, join(f.root, 'ledger'), f.candidate, policyDigest(f.previous)), /prefix changed/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('hard-killed used-switch owner keeps its lock and cannot be silently recovered', async () => {
  const f = usedSwitchFixture(); let child;
  try {
    const ledger = openLedger(join(f.root, 'ledger'), policyDigest(f.previous));
    ledger.reserve(wire1, 7); ledger.finish(wire1, 'response'); ledger.close();
    const before = readFileSync(join(f.root, 'ledger', 'ledger.jsonl'));
    const script = `import {writeSync} from 'node:fs'; import {switchUsedPolicyInTest} from ${JSON.stringify(new URL('../../scripts/p5/used-policy-switch.mjs', import.meta.url).href)}; switchUsedPolicyInTest(process.argv[1], {assertHostStopped:()=>true,onStep:step=>{if(step==='marker'){writeSync(1,'READY\\n');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);}}});`;
    child = spawn(process.execPath, ['--input-type=module', '-e', script, f.root], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const exited = once(child, 'exit');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('hard-kill fixture timed out')), 15000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.stdout.once('data', data => { clearTimeout(timer); data.toString().includes('READY') ? resolve() : reject(Error('hard-kill fixture did not reach marker')); });
      child.once('exit', () => { clearTimeout(timer); reject(Error('hard-kill fixture exited early')); });
    });
    child.kill('SIGKILL'); await exited; child = null;
    assert.equal(existsSync(join(f.root, 'used-policy-switch.pending')), true);
    assert.equal(existsSync(join(f.root, 'ledger', 'owner.lock')), true);
    assert.deepEqual(readFileSync(join(f.root, 'ledger', 'ledger.jsonl')), before);
    assert.throws(() => switchUsedPolicyInTest(f.root, { assertHostStopped: () => true }), /EEXIST/);
  } finally { if (child) child.kill('SIGKILL'); rmSync(f.root, { recursive: true, force: true }); }
});

test('reservations persist, cannot replay or exceed the hard ceiling, and uncertain calls are not refunded', () => {
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-budget-'));
  try {
    const directory = join(root, 'ledger');
    initializeLedger(directory, policy);
    let ledger = openLedger(directory, policy);
    assert.throws(() => openLedger(directory, policy), /EEXIST/);
    ledger.reserve(wire1, LIMIT_MICRO_CNY - 1);
    assert.throws(() => ledger.reserve(wire1, 1), /no blind replay/);
    assert.throws(() => ledger.reserve(wire2, 2), /budget exceeded/);
    ledger.finish(wire1, 'uncertain');
    ledger.close();
    ledger = openLedger(directory, policy);
    assert.equal(ledger.snapshot().reservedMicroCny, LIMIT_MICRO_CNY - 1);
    ledger.reserve(wire2, 1);
    assert.equal(ledger.snapshot().reservedMicroCny, LIMIT_MICRO_CNY);
    ledger.finish(wire2, 'violation');
    assert.throws(() => ledger.reserve('d'.repeat(64), 1), /budget exceeded|frozen/);
    ledger.close();
    ledger = openLedger(directory, policy);
    assert.equal(ledger.snapshot().frozen, true);
    ledger.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('guard rejects unknown scope before transport and reserves before a real send', async () => {
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-budget-'));
  try {
    const directory = join(root, 'ledger');
    const png = Buffer.alloc(24);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
    png.writeUInt32BE(1, 16); png.writeUInt32BE(1, 20);
    const sample = createHash('sha256').update(png).digest('hex');
    const priceEvidence = Buffer.from('test price evidence');
    const rules = { priceEvidenceHash: createHash('sha256').update(priceEvidence).digest('hex'), imageHashes: [sample], assetHashes: [], models: {
      'test-model': { maxTokens: 20, enableThinking: false, thinkingBudget: undefined, inputMicroCnyPerMillion: 1_000_000, outputMicroCnyPerMillion: 2_000_000, imageTokenUpper: 100, frameTokenUpper: 100, outputTokenMargin: 2, maxInputTokens: 10000, maxImages: 1 }
    } };
    const boundPolicy = policyDigest(rules);
    initializeLedger(directory, boundPolicy);
    const ledger = openLedger(directory, boundPolicy);
    const body = { model: 'test-model', max_tokens: 20, enable_thinking: false, messages: [{ role: 'user', content: [{ type: 'text', text: 'test' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${png.toString('base64')}` } }] }] };
    assert.ok(quote(body, rules).microCny > 0);
    assert.throws(() => quote({ ...body, tools: [] }, rules), /unknown request/);
    assert.throws(() => quote(body, { ...rules, imageHashes: [] }), /allowlist/);
    assert.throws(() => quote({ ...body, max_tokens: undefined }, rules), /inference settings/);
    const invalidThinking = structuredClone(rules);
    invalidThinking.models['test-model'].enableThinking = true;
    invalidThinking.models['test-model'].thinkingBudget = -19;
    assert.throws(() => quote({ ...body, enable_thinking: true, thinking_budget: -19 }, invalidThinking), /thinking bounds/);
    let sends = 0;
    assert.throws(() => createGuard({ ledger, policy: { ...rules, imageHashes: [] }, priceEvidence, fetchImpl: async () => {} }), /policy mismatch/);
    assert.throws(() => createGuard({ ledger, policy: rules, priceEvidence: Buffer.from('wrong'), fetchImpl: async () => {} }), /price evidence mismatch/);
    const guard = createGuard({ ledger, policy: rules, priceEvidence, fetchImpl: async () => {
      sends++;
      assert.equal(ledger.snapshot().reservations, 1);
      return new Response(JSON.stringify({ usage: { prompt_tokens: 10, completion_tokens: 10 } }), { status: 200 });
    } });
    rules.models['test-model'].inputMicroCnyPerMillion = 1;
    const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
    const init = { method: 'POST', redirect: 'error', body: JSON.stringify(body) };
    await assert.rejects(guard('https://example.org/endpoint', init), /unauthorized transport/);
    assert.equal(sends, 0);
    await guard(url, init);
    await assert.rejects(guard(url, init), /no blind replay/);
    assert.equal(sends, 1);
    ledger.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a missing, truncated or altered ledger never silently resets reservations', () => {
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-budget-'));
  try {
    const directory = join(root, 'ledger');
    initializeLedger(directory, policy);
    const ledger = openLedger(directory, policy);
    ledger.reserve(wire1, 5);
    ledger.close();
    assert.throws(() => openLedger(directory, 'e'.repeat(64)), /policy/);
    const path = join(directory, 'ledger.jsonl');
    const original = readFileSync(path, 'utf8');
    writeFileSync(path, '');
    assert.throws(() => openLedger(directory, policy), /head disagree/);
    writeFileSync(path, original.slice(0, -1));
    assert.throws(() => openLedger(directory, policy), /partial ledger/);
    assert.throws(() => initializeLedger(directory, policy), /EEXIST/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('real Model Gateway default vision wire crosses the guard after durable reservation', async () => {
  const { createOpenAICompatibleProvider, runModel } = await import('../../packages/platform/model-gateway/src/public.ts');
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-gateway-'));
  let ledger;
  try {
    const priceEvidence = Buffer.from('isolated test pricing');
    const rules = { priceEvidenceHash: createHash('sha256').update(priceEvidence).digest('hex'), imageHashes: [], assetHashes: [], models: {
      'qwen3-vl-plus': { maxTokens: 32768, enableThinking: false, allowDefaultMaxTokens: true, allowDefaultThinking: true, inputMicroCnyPerMillion: 3_000_000, outputMicroCnyPerMillion: 30_000_000, imageTokenUpper: 16384, frameTokenUpper: 8192, outputTokenMargin: 256, maxInputTokens: 128000, maxImages: 1 }
    } };
    const directory = join(root, 'ledger');
    initializeLedger(directory, policyDigest(rules));
    ledger = openLedger(directory, policyDigest(rules));
    let sends = 0;
    const guard = createGuard({ ledger, policy: rules, priceEvidence, fetchImpl: async (_url, init) => {
      sends++;
      const body = JSON.parse(init.body);
      assert.equal(Object.hasOwn(body, 'max_tokens'), false, 'the guard cannot insert an output cap');
      assert.equal(Object.hasOwn(body, 'enable_thinking'), false);
      assert.equal(JSON.parse(readFileSync(join(directory, 'head.json'), 'utf8')).sequence, 1, 'fsynced head precedes send');
      return new Response(JSON.stringify({ model: body.model, choices: [{ finish_reason: 'stop', message: { content: '{}' } }], usage: { prompt_tokens: 12, completion_tokens: 2, total_tokens: 14 } }));
    } });
    const provider = createOpenAICompatibleProvider({ provider: 'qwen', model_snapshot: 'qwen3-vl-plus', api_key: 'test-only', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', response_mode: 'json', structured_output: 'validated_json', fetch_impl: guard });
    await runModel({ request_id: 'p5-guard-test', provider: 'qwen', model: 'qwen3-vl-plus', prompt_version: 'test', privacy_class: 'internal', structured_output: true, input: { context: 'authorized test context', media: [] } }, provider);
    assert.equal(sends, 1);
    assert.ok(ledger.snapshot().reservedMicroCny >= 32768 * 30, 'reserve the complete provider maximum answer');
    assert.equal(ledger.snapshot().pending, 0);
  } finally { ledger?.close(); rmSync(root, { recursive: true, force: true }); }
});

const oldSwitchPolicy = {
  version: 1, project: 'test', limitMicroCny: LIMIT_MICRO_CNY,
  priceEvidenceHash: '1'.repeat(64), inputsManifestHash: '2'.repeat(64), sampleReceiptHash: '3'.repeat(64),
  imageHashes: ['4'.repeat(64)], assetHashes: ['5'.repeat(64)],
  models: { vision: { maxTokens: 100, inputMicroCnyPerMillion: 12 } }, audioDownloads: [],
};
const nextSwitchPolicy = {
  ...structuredClone(oldSwitchPolicy), inputsManifestHash: '6'.repeat(64), sampleReceiptHash: '7'.repeat(64),
  imageHashes: [...oldSwitchPolicy.imageHashes, '8'.repeat(64)], assetHashes: [...oldSwitchPolicy.assetHashes, '9'.repeat(64)],
};
function createSwitchFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-switch-test-'));
  initializeLedger(join(root, 'ledger'), policyDigest(oldSwitchPolicy));
  writeFileSync(join(root, 'guard-policy.json'), JSON.stringify(oldSwitchPolicy) + '\n');
  writeFileSync(join(root, 'candidate-policy.json'), JSON.stringify(nextSwitchPolicy) + '\n');
  writeFileSync(join(root, 'candidate-evidence.json'), JSON.stringify({ source: 'test-only' }) + '\n');
  return root;
}
const switchChecks = { assertHostStopped: () => true, verifyEvidence: () => true };

test('empty policy switch rejects removal or alteration of non-media limits', () => {
  assert.equal(validateEmptyPolicyExpansion(oldSwitchPolicy, nextSwitchPolicy).candidateHash, policyDigest(nextSwitchPolicy));
  for (const mutate of [
    p => { p.limitMicroCny++; }, p => { p.models.vision.maxTokens++; },
    p => { p.models.vision.inputMicroCnyPerMillion--; }, p => { p.project = 'other'; },
    p => { p.audioDownloads.push({ url: 'https://invalid.example/' }); },
    p => { p.assetHashes = ['9'.repeat(64)]; }, p => { p.imageHashes = ['8'.repeat(64)]; },
    p => { p.imageHashes.push(p.imageHashes[0]); }, p => { p.inputsManifestHash = oldSwitchPolicy.inputsManifestHash; },
  ]) {
    const changed = structuredClone(nextSwitchPolicy); mutate(changed);
    assert.throws(() => validateEmptyPolicyExpansion(oldSwitchPolicy, changed), /P5_EMPTY_SWITCH/);
  }
});

test('empty policy switch holds the existing ledger lock and preserves an immutable snapshot', () => {
  const root = createSwitchFixture();
  try {
    const head = readFileSync(join(root, 'ledger', 'head.json'));
    const old = readFileSync(join(root, 'guard-policy.json'));
    const candidate = readFileSync(join(root, 'candidate-policy.json'));
    const evidence = readFileSync(join(root, 'candidate-evidence.json'));
    let validations = 0;
    const result = switchEmptyPolicyInTest(root, { assertHostStopped: () => true, verifyEvidence: (_root, before, after, proof) => {
      validations++;
      assert.equal(policyDigest(before), policyDigest(oldSwitchPolicy));
      assert.equal(policyDigest(after), policyDigest(nextSwitchPolicy));
      assert.equal(proof.source, 'test-only');
      assert.throws(() => openLedger(join(root, 'ledger'), policyDigest(oldSwitchPolicy)), /EEXIST/);
      return true;
    } });
    assert.equal(validations, 4);
    assert.equal(result.ledgerBytes, 0);
    assert.deepEqual(readFileSync(join(root, 'empty-policy-switch.snapshots', 'old-head.json')), head);
    assert.deepEqual(readFileSync(join(root, 'empty-policy-switch.snapshots', 'old-policy.json')), old);
    assert.deepEqual(readFileSync(join(root, 'empty-policy-switch.snapshots', 'new-policy.json')), candidate);
    assert.deepEqual(readFileSync(join(root, 'empty-policy-switch.snapshots', 'evidence.json')), evidence);
    assert.equal(readFileSync(join(root, 'ledger', 'ledger.jsonl')).length, 0);
    assert.equal(JSON.parse(readFileSync(join(root, 'ledger', 'head.json'), 'utf8')).policyHash, policyDigest(nextSwitchPolicy));
    assert.deepEqual(readFileSync(join(root, 'guard-policy.json')), candidate);
    assert.equal(existsSync(join(root, 'empty-policy-switch.completed')), true);
    assert.equal(existsSync(join(root, 'empty-policy-switch.pending')), false);
    assert.throws(() => switchEmptyPolicyInTest(root, switchChecks), /existing switch evidence/);
    const reopened = openLedger(join(root, 'ledger'), policyDigest(nextSwitchPolicy));
    assert.equal(reopened.snapshot().reservedMicroCny, 0); reopened.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('empty policy switch refuses active, nonempty, pending and unverified cases', () => {
  for (const mode of ['active', 'used', 'pending-head', 'host-active', 'unverified', 'changed-candidate', 'changed-snapshot']) {
    const root = createSwitchFixture();
    let owner;
    try {
      const dir = join(root, 'ledger');
      if (mode === 'active') owner = openLedger(dir, policyDigest(oldSwitchPolicy));
      if (mode === 'used') { const l = openLedger(dir, policyDigest(oldSwitchPolicy)); l.reserve(wire1, 12); l.finish(wire1, 'response'); l.close(); }
      if (mode === 'pending-head') writeFileSync(join(dir, 'head.pending'), 'incomplete');
      const checks = { ...switchChecks };
      if (mode === 'host-active') checks.assertHostStopped = () => false;
      if (mode === 'unverified') checks.verifyEvidence = () => false;
      if (mode === 'changed-candidate') checks.onStep = step => { if (step === 'marker') writeFileSync(join(root, 'candidate-policy.json'), '{}'); };
      if (mode === 'changed-snapshot') checks.onStep = step => { if (step === 'marker') writeFileSync(join(root, 'empty-policy-switch.snapshots', 'old-policy.json'), '{}'); };
      assert.throws(() => switchEmptyPolicyInTest(root, checks), /EEXIST|not pristine|Host not confirmed stopped|candidate evidence rejected|state changed|snapshot changed/);
      assert.equal(JSON.parse(readFileSync(join(root, 'guard-policy.json'), 'utf8')).inputsManifestHash, oldSwitchPolicy.inputsManifestHash);
    } finally { owner?.close(); rmSync(root, { recursive: true, force: true }); }
  }
  const nonsandbox = mkdtempSync(join(tmpdir(), 'ave-p5-budget-'));
  try { assert.throws(() => switchEmptyPolicyInTest(nonsandbox, switchChecks), /unavailable outside isolated test directory/); }
  finally { rmSync(nonsandbox, { recursive: true, force: true }); }
});

test('interrupted empty switch retains snapshots and never automatically rolls back', () => {
  for (const step of ['snapshots', 'marker', 'staged', 'policy', 'head']) {
    const root = createSwitchFixture();
    try {
      assert.throws(() => switchEmptyPolicyInTest(root, { ...switchChecks, onStep: current => { if (current === step) throw Error(`interrupted-${step}`); } }), new RegExp(`interrupted-${step}`));
      assert.equal(existsSync(join(root, 'empty-policy-switch.snapshots', 'receipt.json')), true);
      assert.equal(readFileSync(join(root, 'ledger', 'ledger.jsonl')).length, 0);
      assert.equal(existsSync(join(root, 'empty-policy-switch.completed')), false);
      assert.equal(existsSync(join(root, 'empty-policy-switch.pending')), step !== 'snapshots');
      const active = JSON.parse(readFileSync(join(root, 'guard-policy.json'), 'utf8'));
      const head = JSON.parse(readFileSync(join(root, 'ledger', 'head.json'), 'utf8'));
      assert.equal(policyDigest(active), ['policy', 'head'].includes(step) ? policyDigest(nextSwitchPolicy) : policyDigest(oldSwitchPolicy));
      assert.equal(head.policyHash, step === 'head' ? policyDigest(nextSwitchPolicy) : policyDigest(oldSwitchPolicy));
      if (step === 'policy') assert.throws(() => openLedger(join(root, 'ledger'), policyDigest(active)), /policy/);
      assert.throws(() => switchEmptyPolicyInTest(root, switchChecks), /existing switch evidence/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test('empty switch leaves a visible mismatch if evidence or Host state changes after policy replacement', () => {
  for (const mode of ['evidence-changed', 'host-restarted']) {
    const root = createSwitchFixture();
    try {
      let hostStopped = true;
      const checks = { ...switchChecks, assertHostStopped: () => hostStopped, onStep: step => {
        if (step !== 'policy') return;
        if (mode === 'evidence-changed') writeFileSync(join(root, 'candidate-evidence.json'), '{"changed":true}');
        else hostStopped = false;
      } };
      assert.throws(() => switchEmptyPolicyInTest(root, checks), /state changed during switch/);
      const active = JSON.parse(readFileSync(join(root, 'guard-policy.json'), 'utf8'));
      const head = JSON.parse(readFileSync(join(root, 'ledger', 'head.json'), 'utf8'));
      assert.equal(policyDigest(active), policyDigest(nextSwitchPolicy));
      assert.equal(head.policyHash, policyDigest(oldSwitchPolicy));
      assert.equal(existsSync(join(root, 'empty-policy-switch.pending')), true);
      assert.throws(() => openLedger(join(root, 'ledger'), policyDigest(active)), /policy/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test('live switch adapter rejects all caller-supplied paths and non-Linux use', () => {
  assert.throws(() => switchFixedPerformancePolicy({ root: 'anything' }), /invalid live transition context/);
  if (process.platform !== 'linux') assert.throws(() => switchFixedPerformancePolicy(), /invalid live transition context/);
});

const realEvidencePaths = ['baseline-policy-performance-r1.json', 'candidate-policy-performance-r1.json', 'candidate-evidence-performance-r1.json'];
test('real P5 candidate passes the fixed source and sample verifier without touching its ledger', { skip: realEvidencePaths.some(name => !existsSync(join(runRoot, name))) }, () => {
  const [previous, next, evidence] = realEvidencePaths.map(name => JSON.parse(readFileSync(join(runRoot, name), 'utf8')));
  assert.equal(verifyPerformanceAmendment(runRoot, previous, next, evidence), true);
  const extra = structuredClone(next); extra.assetHashes.push('f'.repeat(64));
  assert.throws(() => verifyPerformanceAmendment(runRoot, previous, extra, evidence), /candidate policy or evidence mismatch/);
  const wrong = structuredClone(evidence); wrong.derived_sha256 = 'e'.repeat(64);
  assert.throws(() => verifyPerformanceAmendment(runRoot, previous, next, wrong), /candidate policy or evidence mismatch/);
});
