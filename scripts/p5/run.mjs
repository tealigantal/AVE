import { execFileSync, spawn } from 'node:child_process';
import { closeSync, fsyncSync, fstatSync, lstatSync, mkdirSync, openSync, readFileSync, readSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { currentBuildIdentity, assertRuntimeBuildProvenance, collectBuildInputs } from '../docker/build-identity.mjs';
import { validateImageLabels, validatePaths, validateRuntimeMounts } from './preflight.mjs';
import { repositoryRoot, runRoot, sha256, verifyInputs } from './sources.mjs';
import { budgetRoot, ledgerRoot, openTaskLedger, policyPath } from './policy.mjs';
import { policyDigest } from './guard.mjs';
import { AMENDED_LIMIT, verifyBudgetAmendment, verifyFinalBudgetAmendment } from './budget-amendment.mjs';
import { verifyPerformanceAmendment, resolvePerformanceInputPaths } from './performance-amendment.mjs';
import { validateUsedSwitchEvidence, requireResolvedUsedLedger, verifyLockedUsedStartup } from './used-policy-switch.mjs';
import { validateUsed2SwitchEvidence, verifyLockedUsed2Startup } from './used2-policy-switch.mjs';
import { verifyFixedUsed2RunArtifacts, verifyFixedUsed3RunArtifacts, verifyFixedUsed4RunArtifacts, verifyFixedUsed5RunArtifacts, verifyFixedUsed6RunArtifacts, verifyFixedUsed7RunArtifacts, verifyFixedUsed8RunArtifacts, verifyFixedUsed9RunArtifacts, verifyFixedUsed10RunArtifacts, verifyFixedUsed11RunArtifacts, verifyFixedUsed12RunArtifacts, verifyFixedUsed13RunArtifacts, verifyFixedUsed15RunArtifacts, verifyFixedUsed16RunArtifacts, verifyFixedUsed17RunArtifacts, verifyFixedUsed18RunArtifacts, verifyFixedUsed19RunArtifacts, verifyFixedUsed20RunArtifacts, verifyFixedUsed21RunArtifacts, verifyFixedUsed22RunArtifacts, verifyFixedUsed23RunArtifacts, verifyFixedUsed24RunArtifacts, verifyFixedUsed25RunArtifacts, used2ResumeSource, requireNoUsed2Helper, USED2_HELPER_NAME } from './used2-policy-runtime.mjs';
import { verifyFixedUsedRunArtifacts, requireNoUsedHelper, USED_HELPER_NAME } from './used-policy-runtime.mjs';
import { verifyFixedUsed26RunArtifacts, verifyFixedUsed27RunArtifacts, verifyFixedUsed28RunArtifacts } from './used2-policy-runtime.mjs';

const BASELINE_POLICY_HASH = 'c624e9897f9986320a47e7df8c3fb8c01f5fac9c95830e8bc42885b6db378b69';
const BASELINE_HARNESS_HASH = '9559516622fb7cee1fef6a97487518f4d4769d89ef371774976c73a3883ab523';
const zeroHash = '0'.repeat(64);
const fail = reason => { throw Error(`P5_RESUME: ${reason}`); };
const pathPresent = path => { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const ordinaryBytes = path => { const stat = lstatSync(path); if (!stat.isFile() || stat.isSymbolicLink()) fail('expected ordinary file'); return readFileSync(path); };
const ordinaryDirectory = path => { const stat = lstatSync(path); if (!stat.isDirectory() || stat.isSymbolicLink()) fail('expected ordinary directory'); };
const writeNew = (path, bytes) => { const fd = openSync(path, 'wx', 0o600); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } };

// Used by both the actual resume branch and its side-effect-free CLI probe.
// Keep the dependency boundary outside a dynamic import of the wrapper: that
// wrapper imports this module and would wait for this CLI's top-level await.
async function usedResumeDependencies() {
  return { verifyFixedUsedRunArtifacts, requireNoUsedHelper, USED_HELPER_NAME };
}

// On Windows Node reports a different device number for fstat(fd) and
// lstat(path) even for the same file. Capture the path identity separately,
// cross-check the bigint file ID against the handle, and bind both to a nonce.
export function acquireResumeLock(path) {
  const fd = openSync(path, 'wx+', 0o600);
  const nonce = Buffer.from(`${randomUUID()}\n`);
  let first;
  try {
    writeFileSync(fd, nonce);
    fsyncSync(fd);
    const handle = fstatSync(fd, { bigint: true });
    first = lstatSync(path, { bigint: true });
    if (!handle.isFile() || !first.isFile() || first.ino === 0n || handle.ino !== first.ino || (process.platform !== 'win32' && handle.dev !== first.dev)) fail('resume lock identity unavailable');
  } catch (error) { closeSync(fd); throw error; }
  return {
    release() {
      let failure;
      try {
        const before = lstatSync(path, { bigint: true });
        const handle = fstatSync(fd, { bigint: true });
        const fromHandle = Buffer.alloc(nonce.length);
        const count = readSync(fd, fromHandle, 0, fromHandle.length, 0);
        const fromPath = ordinaryBytes(path);
        const after = lstatSync(path, { bigint: true });
        if (!before.isFile() || !after.isFile() || before.dev !== first.dev || after.dev !== first.dev || before.ino !== first.ino || after.ino !== first.ino || handle.ino !== first.ino || count !== nonce.length || !fromHandle.equals(nonce) || !fromPath.equals(nonce)) fail('resume lock ownership changed');
      } catch (error) { failure = error; }
      try { closeSync(fd); } catch (error) { failure = failure ? new AggregateError([failure, error], 'resume lock validation and close failed') : error; }
      if (failure) throw failure;
      unlinkSync(path);
    },
  };
}

// This verifies the fixed source receipts and all bytes, not just policy set inclusion.
export function verifyRunPolicy(root, policy) {
  if (pathPresent(join(root, 'used-policy-switch.pending')) || pathPresent(join(root, 'harness-manifest-used-r1.pending')) || pathPresent(join(root, 'used2-policy-switch.pending')) || pathPresent(join(root, 'harness-manifest-used-r2.pending')) || pathPresent(join(root, 'budget-amendment-299173272.pending')) || pathPresent(join(root, 'harness-manifest-budget-299173272.pending')) || pathPresent(join(root, 'budget-amendment-200.pending')) || pathPresent(join(root, 'harness-manifest-budget-200.pending'))) fail('used policy or harness transition remains pending');
  const inputs = verifyInputs(root);
  if (policyDigest(policy) === BASELINE_POLICY_HASH) {
    if (sha256(ordinaryBytes(join(root, 'inputs-manifest.json'))) !== policy.inputsManifestHash) fail('baseline input manifest changed');
    return { kind: 'baseline', inputs };
  }
  const baseline = JSON.parse(ordinaryBytes(join(root, 'baseline-policy-performance-r1.json')));
  const evidence = JSON.parse(ordinaryBytes(join(root, 'candidate-evidence-performance-r1.json')));
  const used = pathPresent(join(root, 'used-policy-switch.completed')), used2 = pathPresent(join(root, 'used2-policy-switch.completed')), amended = pathPresent(join(root, 'budget-amendment-200.completed')), finalAmended = pathPresent(join(root, 'budget-amendment-299173272.completed'));
  if (finalAmended && !amended) fail('final budget amendment missing history');
  if (used2 && !used) fail('second used transition missing first');
  if (amended && !used2) fail('budget amendment missing used policy history');
  if (amended) (finalAmended ? verifyFinalBudgetAmendment : verifyBudgetAmendment)(root, join(root, 'budget', 'ledger'), policy);
  const performancePolicy = used2 ? validateUsed2SwitchEvidence(root, join(root, 'budget', 'ledger'), policy, amended ? { expectedLimit: finalAmended ? 299_173_272 : AMENDED_LIMIT } : {}).first.previous : used ? validateUsedSwitchEvidence(root, join(root, 'budget', 'ledger'), policy).previous : policy;
  if (policyDigest(baseline) !== BASELINE_POLICY_HASH || verifyPerformanceAmendment(root, baseline, performancePolicy, evidence) !== true) fail('performance amendment not verified');
  if (used) validateEmptySwitchEvidence(root, performancePolicy, BASELINE_POLICY_HASH, { historicalOnly: true });
  const combined = JSON.parse(ordinaryBytes(join(root, 'inputs-manifest-performance-r1.json')));
  resolvePerformanceInputPaths(combined.inputs);
  return { kind: used2 ? 'used2' : used ? 'used' : 'performance', inputs, amended, finalAmended };
}

export function buildHarnessManifest(harnessRoot, kind, amended = false) {
  if (!['baseline', 'performance', 'used', 'used2'].includes(kind)) fail('unknown harness mode');
  if (amended && kind !== 'used2') fail('budget amendment requires used2 harness');
  const names = ['guard.mjs', 'ledger.mjs', 'install.mjs', 'launch.py'];
  if (kind === 'performance' || kind === 'used' || kind === 'used2') names.push('sources.mjs', 'performance-amendment.mjs');
  if (kind === 'used' || kind === 'used2') names.push('used-policy-switch.mjs');
  if (kind === 'used2') names.push('used2-policy-switch.mjs');
  if (amended) names.push('budget-amendment.mjs');
  return { schema_version: 1, files: names.sort((a, b) => a.localeCompare(b, 'en')).map(file => ({ file, sha256: sha256(ordinaryBytes(join(harnessRoot, file))) })) };
}

// Validate stopped configuration rather than pretending the service is live.
// Stopped Docker containers no longer expose live NetworkSettings.Ports.
export function validateStoppedRuntime(config, desktop, whisper) {
  for (const [service, inspected] of [['desktop', desktop], ['whisper', whisper]]) {
    // The desktop wrapper's bash wait can return SIGTERM (143) after its
    // Host has completed shutdown; a separate ledger-lock and UI check still
    // verifies the owned Host stopped before any switch.
    const expectedExit = service === 'desktop' ? [0, 143] : [0];
    if (!/^[a-f0-9]{64}$/.test(inspected?.Id ?? '') || inspected.State?.Running !== false || inspected.State?.Status !== 'exited' || !expectedExit.includes(inspected.State?.ExitCode) || inspected.State?.OOMKilled || inspected.State?.Error || inspected.State?.Paused || inspected.State?.Restarting || inspected.HostConfig?.RestartPolicy?.Name !== 'no') fail(`${service} must have stopped without failure or automatic restart`);
    const expectedPorts = service === 'desktop' ? inspected.HostConfig?.PortBindings : inspected.NetworkSettings?.Ports;
    validateRuntimeMounts(config, service, { ...inspected, State: { ...inspected.State, Running: true }, NetworkSettings: { ...inspected.NetworkSettings, Ports: expectedPorts } });
  }
  if (whisper.HostConfig?.NetworkMode !== `container:${desktop.Id}`) fail('whisper network differs from stopped desktop');
  return true;
}

// A newly built image may replace only the exact stopped P5 container pair;
// accept a complete old or complete new pair, never a mixed or unrelated pair.
export function validateUsedResumeRuntime(previousConfig, nextConfig, desktop, whisper) {
  for (const key of ['project', 'port', 'mode', 'runRoot', 'materialsRoot', 'exportRoot', 'budgetRoot', 'harnessRoot']) if (previousConfig[key] !== nextConfig[key]) fail('used resume configuration identity changed');
  if (desktop.Image === previousConfig.desktopImage && whisper.Image === previousConfig.whisperImage) { validateStoppedRuntime(previousConfig, desktop, whisper); return 'previous'; }
  if (desktop.Image === nextConfig.desktopImage && whisper.Image === nextConfig.whisperImage) { validateStoppedRuntime(nextConfig, desktop, whisper); return 'next'; }
  fail('used resume images do not form an authorized pair');
}

// The CLI always invokes this through the fixed-baseline wrapper below.
// Parameterizing the pure checker allows isolated fixtures without a live policy.
export function validateEmptySwitchEvidence(root, policy, baselinePolicyHash, { historicalOnly = false } = {}) {
  if (!/^[a-f0-9]{64}$/.test(baselinePolicyHash ?? '')) fail('invalid baseline policy identity');
  if (pathPresent(join(root, 'empty-policy-switch.pending'))) fail('policy switch remains pending');
  const marker = JSON.parse(ordinaryBytes(join(root, 'empty-policy-switch.completed')));
  const snapshots = join(root, 'empty-policy-switch.snapshots');
  ordinaryDirectory(snapshots);
  const receiptBytes = ordinaryBytes(join(snapshots, 'receipt.json'));
  if (Object.keys(marker).join(',') !== 'receiptSha256' || marker.receiptSha256 !== sha256(receiptBytes)) fail('policy switch receipt mismatch');
  const receipt = JSON.parse(receiptBytes), names = ['old-head.json', 'old-policy.json', 'new-policy.json', 'evidence.json'];
  if (receipt.version !== 1 || Object.keys(receipt.files ?? {}).sort().join(',') !== names.slice().sort().join(',') || names.some(name => receipt.files[name] !== sha256(ordinaryBytes(join(snapshots, name))))) fail('policy switch snapshot mismatch');
  const oldPolicyBytes = ordinaryBytes(join(snapshots, 'old-policy.json')), nextPolicyBytes = ordinaryBytes(join(snapshots, 'new-policy.json'));
  const old = JSON.parse(oldPolicyBytes), next = JSON.parse(nextPolicyBytes), oldHeadBytes = ordinaryBytes(join(snapshots, 'old-head.json')), oldHead = JSON.parse(oldHeadBytes);
  const activeBytes = ordinaryBytes(join(root, 'guard-policy.json')), evidenceBytes = ordinaryBytes(join(root, 'candidate-evidence-performance-r1.json'));
  if (!oldPolicyBytes.equals(ordinaryBytes(join(root, 'baseline-policy-performance-r1.json'))) || (!historicalOnly && !nextPolicyBytes.equals(activeBytes)) || !ordinaryBytes(join(snapshots, 'evidence.json')).equals(evidenceBytes)) fail('policy switch artifacts drift');
  if (receipt.oldPolicyHash !== baselinePolicyHash || policyDigest(old) !== baselinePolicyHash || receipt.newPolicyHash !== policyDigest(policy) || policyDigest(next) !== receipt.newPolicyHash || receipt.oldHeadSha256 !== sha256(oldHeadBytes) || receipt.ledgerSha256 !== sha256(Buffer.alloc(0))) fail('policy switch identity mismatch');
  if (Object.keys(oldHead).sort().join(',') !== 'hash,limit,policyHash,sequence,version' || oldHead.version !== 1 || oldHead.sequence !== 0 || oldHead.hash !== zeroHash || oldHead.policyHash !== baselinePolicyHash || oldHead.limit !== 100_000_000) fail('original ledger not pristine');
  if (historicalOnly) return true;
  const ledgerDir = join(root, 'budget', 'ledger');
  ordinaryDirectory(join(root, 'budget')); ordinaryDirectory(ledgerDir);
  const head = JSON.parse(ordinaryBytes(join(ledgerDir, 'head.json')));
  const expectedHead = { ...oldHead, policyHash: receipt.newPolicyHash };
  if (Object.keys(head).sort().join(',') !== Object.keys(expectedHead).sort().join(',') || Object.keys(expectedHead).some(key => head[key] !== expectedHead[key]) || ordinaryBytes(join(ledgerDir, 'ledger.jsonl')).length !== 0 || pathPresent(join(ledgerDir, 'head.pending'))) fail('switched ledger not pristine');
  return true;
}
export function assertEmptySwitchComplete(root, policy) { return validateEmptySwitchEvidence(root, policy, BASELINE_POLICY_HASH); }

export function stagePerformanceHarness(root, manifest) {
  const canonical = join(root, 'harness-manifest.json'), baseline = join(root, 'harness-manifest-baseline-performance-r1.json'), expanded = join(root, 'harness-manifest-performance-r1.json');
  const expectedNames = ['guard.mjs', 'install.mjs', 'launch.py', 'ledger.mjs', 'performance-amendment.mjs', 'sources.mjs'];
  if (manifest?.schema_version !== 1 || !Array.isArray(manifest.files) || manifest.files.length !== expectedNames.length || manifest.files.some((item, index) => item.file !== expectedNames[index] || !/^[a-f0-9]{64}$/.test(item.sha256 ?? ''))) fail('invalid expanded harness manifest');
  const pending = join(root, 'harness-manifest-performance-r1.pending');
  if (pathPresent(pending)) fail('harness replacement remains pending');
  const current = ordinaryBytes(canonical), target = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  if (!pathPresent(baseline)) {
    if (sha256(current) !== BASELINE_HARNESS_HASH) fail('baseline harness snapshot unavailable');
    writeNew(baseline, current);
  }
  if (sha256(ordinaryBytes(baseline)) !== BASELINE_HARNESS_HASH) fail('baseline harness snapshot changed');
  if (pathPresent(expanded)) { if (!ordinaryBytes(expanded).equals(target)) fail('expanded harness snapshot changed'); }
  else writeNew(expanded, target);
  if (current.equals(target)) return sha256(target);
  if (sha256(current) !== BASELINE_HARNESS_HASH) fail('current harness is neither baseline nor expected expanded version');
  writeNew(pending, target);
  if (!ordinaryBytes(canonical).equals(current) || !ordinaryBytes(expanded).equals(target)) fail('harness changed before replacement');
  renameSync(pending, canonical);
  if (!ordinaryBytes(canonical).equals(target)) fail('harness replacement mismatch');
  return sha256(target);
}

export function stageUsedHarness(root, manifest, assertStopped) {
  if (typeof assertStopped !== 'function' || assertStopped() !== true) fail('Host must be stopped for harness transition');
  const expected = ['guard.mjs', 'install.mjs', 'launch.py', 'ledger.mjs', 'performance-amendment.mjs', 'sources.mjs', 'used-policy-switch.mjs'];
  if (manifest?.schema_version !== 1 || !Array.isArray(manifest.files) || manifest.files.length !== expected.length || manifest.files.some((item, i) => item.file !== expected[i] || !/^[a-f0-9]{64}$/.test(item.sha256 ?? ''))) fail('invalid used harness manifest');
  const currentPath = join(root, 'harness-manifest.json'), oldPath = join(root, 'harness-manifest-performance-r1.json'), savedOld = join(root, 'harness-manifest-before-used-r1.json'), targetPath = join(root, 'harness-manifest-used-r1.json'), pending = join(root, 'harness-manifest-used-r1.pending');
  const old = ordinaryBytes(oldPath), current = ordinaryBytes(currentPath), target = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  if (pathPresent(savedOld)) { if (!ordinaryBytes(savedOld).equals(old)) fail('prior harness snapshot changed'); } else { if (!current.equals(old)) fail('prior harness identity unavailable'); writeNew(savedOld, old); }
  if (pathPresent(targetPath)) { if (!ordinaryBytes(targetPath).equals(target)) fail('used harness snapshot changed'); } else writeNew(targetPath, target);
  if (pathPresent(pending) && !ordinaryBytes(pending).equals(target)) fail('harness pending identity changed');
  if (!current.equals(old) && !current.equals(target)) fail('current harness identity changed');
  if (!current.equals(target)) {
    if (!pathPresent(pending)) writeNew(pending, target);
    if (assertStopped() !== true || !ordinaryBytes(currentPath).equals(old) || !ordinaryBytes(targetPath).equals(target)) fail('harness changed before replacement');
    renameSync(pending, currentPath);
  } else if (pathPresent(pending)) {
    if (assertStopped() !== true) fail('Host restarted during harness transition');
    unlinkSync(pending);
  }
  if (!ordinaryBytes(currentPath).equals(target)) fail('harness replacement mismatch');
  return sha256(target);
}

export function stageUsed2Harness(root, manifest, assertStopped) {
  if (typeof assertStopped !== 'function' || assertStopped() !== true) fail('Host must be stopped for second harness transition');
  const expected = ['guard.mjs', 'install.mjs', 'launch.py', 'ledger.mjs', 'performance-amendment.mjs', 'sources.mjs', 'used-policy-switch.mjs', 'used2-policy-switch.mjs'];
  if (manifest?.schema_version !== 1 || !Array.isArray(manifest.files) || manifest.files.length !== expected.length || manifest.files.some((item, i) => item.file !== expected[i] || !/^[a-f0-9]{64}$/.test(item.sha256 ?? ''))) fail('invalid second used harness manifest');
  const currentPath = join(root, 'harness-manifest.json'), oldPath = join(root, 'harness-manifest-used-r1.json'), savedOld = join(root, 'harness-manifest-before-used-r2.json'), targetPath = join(root, 'harness-manifest-used-r2.json'), pending = join(root, 'harness-manifest-used-r2.pending');
  const old = ordinaryBytes(oldPath), current = ordinaryBytes(currentPath), target = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  if (pathPresent(savedOld)) { if (!ordinaryBytes(savedOld).equals(old)) fail('prior harness snapshot changed'); } else { if (!current.equals(old)) fail('prior harness identity unavailable'); writeNew(savedOld, old); }
  if (pathPresent(targetPath)) { if (!ordinaryBytes(targetPath).equals(target)) fail('second used harness snapshot changed'); } else writeNew(targetPath, target);
  if (pathPresent(pending) && !ordinaryBytes(pending).equals(target)) fail('second harness pending identity changed');
  if (!current.equals(old) && !current.equals(target)) fail('current harness identity changed');
  if (!current.equals(target)) { if (!pathPresent(pending)) writeNew(pending, target); if (assertStopped() !== true || !ordinaryBytes(currentPath).equals(old) || !ordinaryBytes(targetPath).equals(target)) fail('harness changed before replacement'); renameSync(pending, currentPath); }
  else if (pathPresent(pending)) { if (assertStopped() !== true) fail('Host restarted during harness transition'); unlinkSync(pending); }
  if (!ordinaryBytes(currentPath).equals(target)) fail('harness replacement mismatch');
  return sha256(target);
}

// The budget switch already installed and snapshotted this manifest. It may
// be reused only byte-for-byte; future source changes require a new transition.
export function verifyAmendedHarness(root, manifest, assertStopped, finalAmended = false) {
  if (typeof assertStopped !== 'function' || assertStopped() !== true) fail('Host must be stopped for budget harness verification');
  const expected = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  if (pathPresent(join(root, `harness-manifest-budget-${finalAmended ? '299173272' : '200'}.pending`)) || !ordinaryBytes(join(root, 'harness-manifest.json')).equals(expected) || !ordinaryBytes(join(root, `harness-manifest-budget-${finalAmended ? '299173272' : '200'}.json`)).equals(expected)) fail('budget harness snapshot changed');
  return sha256(expected);
}

async function main() {
const [command, buildId] = process.argv.slice(2);
if (command === '--check-resume-modules' && process.argv.length === 3) {
  const dependencies = await usedResumeDependencies();
  if (typeof dependencies.verifyFixedUsedRunArtifacts !== 'function' || typeof dependencies.requireNoUsedHelper !== 'function' || typeof dependencies.USED_HELPER_NAME !== 'string' || typeof verifyFixedUsed2RunArtifacts !== 'function' || typeof verifyFixedUsed3RunArtifacts !== 'function' || typeof verifyFixedUsed4RunArtifacts !== 'function' || typeof verifyFixedUsed5RunArtifacts !== 'function' || typeof verifyFixedUsed6RunArtifacts !== 'function' || typeof verifyFixedUsed7RunArtifacts !== 'function' || typeof verifyFixedUsed8RunArtifacts !== 'function' || typeof verifyFixedUsed9RunArtifacts !== 'function' || typeof verifyFixedUsed10RunArtifacts !== 'function' || typeof verifyFixedUsed11RunArtifacts !== 'function' || typeof verifyFixedUsed12RunArtifacts !== 'function' || typeof verifyFixedUsed13RunArtifacts !== 'function' || typeof verifyFixedUsed15RunArtifacts !== 'function' || typeof verifyFixedUsed16RunArtifacts !== 'function' || typeof verifyFixedUsed17RunArtifacts !== 'function' || typeof verifyFixedUsed18RunArtifacts !== 'function' || typeof verifyFixedUsed19RunArtifacts !== 'function' || typeof verifyFixedUsed20RunArtifacts !== 'function' || typeof verifyFixedUsed21RunArtifacts !== 'function' || typeof verifyFixedUsed22RunArtifacts !== 'function' || typeof verifyFixedUsed23RunArtifacts !== 'function' || typeof used2ResumeSource !== 'function' || typeof requireNoUsed2Helper !== 'function' || typeof USED2_HELPER_NAME !== 'string') fail('used resume dependencies unavailable');
  if (typeof verifyFixedUsed24RunArtifacts !== 'function') fail('r24 resume dependency unavailable');
  if (typeof verifyFixedUsed25RunArtifacts !== 'function') fail('r25 resume dependency unavailable');
  if (typeof verifyFixedUsed26RunArtifacts !== 'function') fail('r26 resume dependency unavailable');
  if (typeof verifyFixedUsed27RunArtifacts !== 'function') fail('r27 resume dependency unavailable');
  if (typeof verifyFixedUsed28RunArtifacts !== 'function') fail('r28 resume dependency unavailable');
  console.log('P5_RESUME_MODULES_READY');
  return;
}
if (!['plan', 'start', 'verify', 'resume'].includes(command) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(buildId ?? '')) throw Error('usage: node scripts/p5/run.mjs <plan|start|verify|resume> <build-id>');
const docker = (...args) => execFileSync('docker', args, { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 64 * 1024 * 1024 }).trim();
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
if (policy.project !== 'ave-p5-current-20261105' || policy.limitMicroCny !== 100_000_000) throw Error('P5_TASK_POLICY_CHANGED');
const { kind, inputs, amended = false, finalAmended = false } = verifyRunPolicy(runRoot, policy);
const build = JSON.parse(readFileSync(join(runRoot, `build-${buildId}.json`), 'utf8'));
const config = {
  mode: 'guarded', project: policy.project, port: 6083, runRoot, materialsRoot: join(runRoot, 'inputs'), exportRoot: join(runRoot, 'live-exports'), budgetRoot,
  harnessRoot: join(repositoryRoot, 'scripts/p5'), desktopImage: build.services.find(item => item.service === 'desktop').image_id, whisperImage: build.services.find(item => item.service === 'whisper').image_id,
  sources: inputs.inputs,
};
mkdirSync(config.exportRoot, { recursive: true });
validatePaths(config, repositoryRoot);
if (lstatSync(config.exportRoot).isSymbolicLink()) throw Error('P5_EXPORT_ROOT_SYMLINK');
const currentInputs = await collectBuildInputs(repositoryRoot);
if (currentInputs.digest !== build.build_input_digest) throw Error('P5_BUILD_INPUT_CHANGED');
validateImageLabels(config, currentInputs.digest, image => JSON.parse(docker('image', 'inspect', '--format', '{{json .}}', image)));
const composePath = join(runRoot, `compose-guarded-${buildId}.json`);
const configPath = join(runRoot, `guarded-run-${buildId}.json`);
const health = { interval: '10s', timeout: '5s', start_period: '1800s', retries: 3 };
const bind = (source, target, read_only = true) => ({ type: 'bind', source, target, read_only });
const compose = {
  name: config.project,
  services: {
    desktop: {
      image: config.desktopImage, entrypoint: ['/opt/ave-python/bin/python', '/p5-harness/launch.py'],
      environment: { TZ: 'Asia/Shanghai', AVE_BROWSER_PORT: String(config.port), AVE_P5_ISOLATED_PROJECT: config.project },
      ports: [`127.0.0.1:${config.port}:8080`],
      volumes: ['profile:/config', 'configuration:/run/ave', 'projects:/workspace/projects', 'uploads:/workspace/uploads', 'original-config:/original-config:ro', bind(config.materialsRoot, '/workspace/materials'), bind(config.exportRoot, '/workspace/exports', false), bind(config.harnessRoot, '/p5-harness'), bind(runRoot, '/p5-run'), bind(budgetRoot, '/p5-budget', false)],
      healthcheck: { test: ['CMD', '/usr/local/bin/ave-health'], ...health },
    },
    whisper: { image: config.whisperImage, network_mode: 'service:desktop', depends_on: { desktop: { condition: 'service_started' } }, environment: { AVE_WHISPER_DEVICE: 'cpu', HF_HUB_OFFLINE: '1', HF_HUB_DISABLE_TELEMETRY: '1', STT_MODEL_TTL: '300' }, volumes: ['whisper-cache:/home/ubuntu/.cache/huggingface/hub'], healthcheck: { test: ['CMD', 'python', '-c', "import urllib.request; urllib.request.urlopen('http://127.0.0.1:18080/health', timeout=3)"], ...health } },
  },
  volumes: { profile: {}, configuration: {}, projects: {}, uploads: {}, 'whisper-cache': {}, 'original-config': { external: true, name: 'ave-desktop_configuration' } },
};
const writeExact = (path, value) => {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  if (pathPresent(path)) { if (ordinaryBytes(path).toString('utf8') !== bytes) throw Error('P5_RUN_CONFIGURATION_DRIFT'); }
  else writeFileSync(path, bytes, { flag: 'wx' });
};
writeExact(composePath, compose);
writeExact(configPath, config);
process.env.COMPOSE_FILE = composePath;
process.env.COMPOSE_PROJECT_NAME = config.project;

const harnessManifest = () => buildHarnessManifest(config.harnessRoot, kind, amended);
function inspectContainers(includeStopped = false) {
  const inspected = {};
  for (const service of ['desktop', 'whisper']) {
    const id = docker('compose', 'ps', ...(includeStopped ? ['--all'] : []), '--quiet', service);
    if (!/^[a-f0-9]{12,64}$/.test(id)) throw Error(`P5_${service}_CONTAINER_NOT_UNIQUE`);
    inspected[service] = JSON.parse(docker('inspect', '--format', '{{json .}}', id));
  }
  return inspected;
}
function assertPristineLedger() {
  const ledger = openTaskLedger(policy);
  try {
    const state = ledger.snapshot();
    if (state.frozen || state.pending !== 0 || state.sequence !== 0 || state.reservedMicroCny !== 0 || state.reservations !== 0) fail('resume requires the original zero-use ledger');
  } finally { ledger.close(); }
}
async function verifyLive() {
  const inspected = inspectContainers();
  for (const service of ['desktop', 'whisper']) validateRuntimeMounts(config, service, inspected[service]);
  if (inspected.whisper.HostConfig.NetworkMode !== `container:${inspected.desktop.Id}`) throw Error('P5_WHISPER_NETWORK_MISMATCH');
  const currentHarness = Buffer.from(JSON.stringify(harnessManifest(), null, 2) + '\n');
  if (sha256(ordinaryBytes(join(runRoot, 'harness-manifest.json'))) !== sha256(currentHarness)) throw Error('P5_HARNESS_CHANGED_SINCE_START');
  const logs = docker('logs', '--since', inspected.desktop.State.StartedAt, inspected.desktop.Id);
  const ready = logs.split(/\r?\n/).filter(line => line.startsWith('{')).map(line => { try { return JSON.parse(line); } catch { return null; } }).filter(item => item?.event === 'P5_GUARD_READY');
  if (ready.length !== 1 || ready[0].policy_sha256 !== policyDigest(policy) || ready[0].harness_sha256 !== sha256(currentHarness)) throw Error('P5_GUARD_STARTUP_NOT_VERIFIED');
  const identity = await currentBuildIdentity(repositoryRoot);
  assertRuntimeBuildProvenance(identity);
  const output = join(runRoot, `guarded-identity-${Date.now()}.json`);
  writeFileSync(output, JSON.stringify({ ...identity, harness_sha256: sha256(currentHarness), policy_sha256: policyDigest(policy) }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ project: config.project, identity: output, build_input_digest: identity.build_input_digest, runtime_digest: identity.runtime.digest, guard_startup: ready[0] }));
}
if (command === 'plan') {
  const ledger = openTaskLedger(policy);
  try { console.log(JSON.stringify({ project: config.project, compose: composePath, ...ledger.snapshot() })); } finally { ledger.close(); }
} else if (command === 'start') {
  if (kind !== 'baseline') fail('a performance policy must resume the existing project');
  const ledger = openTaskLedger(policy);
  try { if (ledger.snapshot().frozen) throw Error('P5_BUDGET_FROZEN'); } finally { ledger.close(); }
  const existing = docker('ps', '--all', '--filter', `label=com.docker.compose.project=${config.project}`, '--quiet');
  if (existing) throw Error('P5_PROJECT_ALREADY_EXISTS; verify it instead of creating another budget or replacing data');
  const cache = `${config.project}_whisper-cache`;
  const volumeNames = docker('volume', 'ls', '--format', '{{.Name}}').split(/\r?\n/);
  if (volumeNames.some(name => name.startsWith(`${config.project}_`))) throw Error('P5_VOLUMES_ALREADY_EXIST; inspect preserved state before resume');
  docker('volume', 'create', '--label', `com.docker.compose.project=${config.project}`, '--label', 'com.docker.compose.volume=whisper-cache', cache);
  docker('run', '--rm', '--network', 'none', '--user', '0', '--entrypoint', 'cp', '--mount', 'type=volume,source=ave-p5-preflight-20261105_whisper-cache,target=/source,readonly', '--mount', `type=volume,source=${cache},target=/target`, config.whisperImage, '-a', '/source/.', '/target/');
  writeFileSync(join(runRoot, 'harness-manifest.json'), JSON.stringify(harnessManifest(), null, 2) + '\n', { flag: 'wx' });
  await new Promise((done, reject) => {
    const child = spawn('docker', ['compose', 'up', '-d', '--wait', '--wait-timeout', '1800'], { cwd: repositoryRoot, env: process.env, windowsHide: true, stdio: 'inherit' });
    child.once('error', reject); child.once('close', code => code === 0 ? done() : reject(Error(`P5_START_FAILED: ${code}`)));
  });
  console.log(JSON.stringify({ project: config.project, url: `http://127.0.0.1:${config.port}`, paid_calls_triggered: false }));
} else if (command === 'resume') {
  if (!['performance', 'used', 'used2'].includes(kind)) fail('resume requires a verified policy amendment');
  const lockPath = join(runRoot, kind === 'used2' ? 'used2-policy-resume.owner' : kind === 'used' ? 'used-policy-resume.owner' : 'performance-resume.owner');
  const resumeLock = acquireResumeLock(lockPath);
  let primaryError;
  try {
    if (kind === 'used2') {
      const previousConfig = used2ResumeSource(buildId) === 'r28'
        ? verifyFixedUsed28RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261109-seek-audio-r28.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261109-seek-audio-r28.json')), ordinaryBytes(join(runRoot, 'build-20261109-seek-audio-r28.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794223138902.json')))
        : used2ResumeSource(buildId) === 'r27'
        ? verifyFixedUsed27RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261109-manual-track-r27.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261109-manual-track-r27.json')), ordinaryBytes(join(runRoot, 'build-20261109-manual-track-r27.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794221940409.json')))
        : used2ResumeSource(buildId) === 'r26'
        ? verifyFixedUsed26RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261109-independent-track-r26.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261109-independent-track-r26.json')), ordinaryBytes(join(runRoot, 'build-20261109-independent-track-r26.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794220516648.json')))
        : used2ResumeSource(buildId) === 'r25'
        ? verifyFixedUsed25RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261109-source-track-r25.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261109-source-track-r25.json')), ordinaryBytes(join(runRoot, 'build-20261109-source-track-r25.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794218348568.json')))
        : used2ResumeSource(buildId) === 'r24'
        ? verifyFixedUsed24RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261109-audio-message-r24.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261109-audio-message-r24.json')), ordinaryBytes(join(runRoot, 'build-20261109-audio-message-r24.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794208340346.json')))
        : used2ResumeSource(buildId) === 'r23'
        ? verifyFixedUsed23RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261109-grant-r23.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261109-grant-r23.json')), ordinaryBytes(join(runRoot, 'build-20261109-grant-r23.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794200022348.json')))
        : used2ResumeSource(buildId) === 'r22'
        ? verifyFixedUsed22RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261109-reauth-r22.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261109-reauth-r22.json')), ordinaryBytes(join(runRoot, 'build-20261109-reauth-r22.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794198233674.json')))
        : used2ResumeSource(buildId) === 'r21'
        ? verifyFixedUsed21RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261109-qc-r21.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261109-qc-r21.json')), ordinaryBytes(join(runRoot, 'build-20261109-qc-r21.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794197370990.json')))
        : used2ResumeSource(buildId) === 'r20'
        ? verifyFixedUsed20RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261108-errors-r20.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261108-errors-r20.json')), ordinaryBytes(join(runRoot, 'build-20261108-errors-r20.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794142349282.json')))
        : used2ResumeSource(buildId) === 'r19'
        ? verifyFixedUsed19RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261108-audio-r19.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261108-audio-r19.json')), ordinaryBytes(join(runRoot, 'build-20261108-audio-r19.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794141279064.json')))
        : used2ResumeSource(buildId) === 'r18'
        ? verifyFixedUsed18RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261108-workspace-r18.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261108-workspace-r18.json')), ordinaryBytes(join(runRoot, 'build-20261108-workspace-r18.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794138548409.json')))
        : used2ResumeSource(buildId) === 'r17'
        ? verifyFixedUsed17RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261108-status-r17.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261108-status-r17.json')), ordinaryBytes(join(runRoot, 'build-20261108-status-r17.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794137750088.json')))
        : used2ResumeSource(buildId) === 'r16'
        ? verifyFixedUsed16RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261108-audio-r16.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261108-audio-r16.json')), ordinaryBytes(join(runRoot, 'build-20261108-audio-r16.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794136093791.json')))
        : used2ResumeSource(buildId) === 'r15'
        ? verifyFixedUsed15RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261108-qc-r15.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261108-qc-r15.json')), ordinaryBytes(join(runRoot, 'build-20261108-qc-r15.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794132139246.json')))
        : used2ResumeSource(buildId) === 'r13'
        ? verifyFixedUsed13RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261108-profile-r13.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261108-profile-r13.json')), ordinaryBytes(join(runRoot, 'build-20261108-profile-r13.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794129207329.json')))
        : used2ResumeSource(buildId) === 'r12'
        ? verifyFixedUsed12RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261108-audio-r12.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261108-audio-r12.json')), ordinaryBytes(join(runRoot, 'build-20261108-audio-r12.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794127829807.json')))
        : used2ResumeSource(buildId) === 'r11'
        ? verifyFixedUsed11RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261108-plan-r11.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261108-plan-r11.json')), ordinaryBytes(join(runRoot, 'build-20261108-plan-r11.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1794126486290.json')))
        : used2ResumeSource(buildId) === 'r10'
        ? verifyFixedUsed10RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261106-ux-r10.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261106-ux-r10.json')), ordinaryBytes(join(runRoot, 'build-20261106-ux-r10.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1793979134442.json')))
        : used2ResumeSource(buildId) === 'r9'
        ? verifyFixedUsed9RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261106-ux-r9.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261106-ux-r9.json')), ordinaryBytes(join(runRoot, 'build-20261106-ux-r9.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1793978668689.json')))
        : used2ResumeSource(buildId) === 'r8'
        ? verifyFixedUsed8RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261106-ux-r8.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261106-ux-r8.json')), ordinaryBytes(join(runRoot, 'build-20261106-ux-r8.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1793974675775.json')))
        : used2ResumeSource(buildId) === 'r7'
        ? verifyFixedUsed7RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261106-ux-r7.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261106-ux-r7.json')), ordinaryBytes(join(runRoot, 'build-20261106-ux-r7.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1793972738420.json')))
        : used2ResumeSource(buildId) === 'r6'
        ? verifyFixedUsed6RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261105-r6.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261105-r6.json')), ordinaryBytes(join(runRoot, 'build-20261105-r6.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1793885717885.json')))
        : used2ResumeSource(buildId) === 'r5'
        ? verifyFixedUsed5RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261105-r5.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261105-r5.json')), ordinaryBytes(join(runRoot, 'build-20261105-r5.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1793884580468.json')))
        : used2ResumeSource(buildId) === 'r4'
        ? verifyFixedUsed4RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261105-r4.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261105-r4.json')), ordinaryBytes(join(runRoot, 'build-20261105-r4.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1793882332337.json')))
        : used2ResumeSource(buildId) === 'r3'
        ? verifyFixedUsed3RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261105-r3.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261105-r3.json')), ordinaryBytes(join(runRoot, 'build-20261105-r3.json')), ordinaryBytes(join(runRoot, 'guarded-identity-1793879372476.json')))
        : verifyFixedUsed2RunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261105-r2.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261105-r2.json')), ordinaryBytes(join(runRoot, 'build-20261105-r2.json')));
      const stopped = () => { requireNoUsedHelper(docker('ps', '--all', '--quiet', '--filter', `name=^/${USED_HELPER_NAME}$`)); requireNoUsed2Helper(docker('ps', '--all', '--quiet', '--filter', `name=^/${USED2_HELPER_NAME}$`)); const value = inspectContainers(true); validateUsedResumeRuntime(previousConfig, config, value.desktop, value.whisper); return true; };
      const resolved = () => { const proof = amended ? (finalAmended ? verifyFinalBudgetAmendment : verifyBudgetAmendment)(runRoot, ledgerRoot, JSON.parse(ordinaryBytes(policyPath))) : validateUsed2SwitchEvidence(runRoot, ledgerRoot, JSON.parse(ordinaryBytes(policyPath))); requireResolvedUsedLedger(proof.state); const ledger = openTaskLedger(policy); try { if (!amended) verifyLockedUsed2Startup(runRoot, ledgerRoot, policy, ledger); } finally { ledger.close(); } };
      stopped(); resolved(); if (amended) verifyAmendedHarness(runRoot, harnessManifest(), stopped, finalAmended); else stageUsed2Harness(runRoot, harnessManifest(), stopped); stopped(); resolved();
      if (verifyRunPolicy(runRoot, JSON.parse(ordinaryBytes(policyPath))).kind !== 'used2') fail('policy changed before resume');
    } else if (kind === 'used') {
      const { verifyFixedUsedRunArtifacts, requireNoUsedHelper, USED_HELPER_NAME } = await usedResumeDependencies();
      const previousConfig = verifyFixedUsedRunArtifacts(runRoot, ordinaryBytes(join(runRoot, 'guarded-run-20261105-r1.json')), ordinaryBytes(join(runRoot, 'compose-guarded-20261105-r1.json')), ordinaryBytes(join(runRoot, 'build-20261105-r1.json')));
      const stopped = () => { requireNoUsedHelper(docker('ps', '--all', '--quiet', '--filter', `name=^/${USED_HELPER_NAME}$`)); const value = inspectContainers(true); validateUsedResumeRuntime(previousConfig, config, value.desktop, value.whisper); return true; };
      const resolved = () => {
        const proof = validateUsedSwitchEvidence(runRoot, ledgerRoot, JSON.parse(ordinaryBytes(policyPath)));
        requireResolvedUsedLedger(proof.state);
        const ledger = openTaskLedger(policy);
        try { verifyLockedUsedStartup(runRoot, ledgerRoot, policy, ledger); }
        finally { ledger.close(); }
      };
      stopped(); resolved();
      stageUsedHarness(runRoot, harnessManifest(), stopped);
      stopped(); resolved();
      if (verifyRunPolicy(runRoot, JSON.parse(ordinaryBytes(policyPath))).kind !== 'used') fail('policy changed before resume');
    } else {
      let stopped = inspectContainers(true);
      validateStoppedRuntime(config, stopped.desktop, stopped.whisper);
      assertEmptySwitchComplete(runRoot, policy);
      assertPristineLedger();
      stagePerformanceHarness(runRoot, harnessManifest());
      stopped = inspectContainers(true);
      validateStoppedRuntime(config, stopped.desktop, stopped.whisper);
      if (verifyRunPolicy(runRoot, JSON.parse(ordinaryBytes(policyPath))).kind !== 'performance') fail('policy changed before resume');
      assertEmptySwitchComplete(runRoot, policy);
      assertPristineLedger();
    }
    await new Promise((done, reject) => {
      const child = spawn('docker', ['compose', 'up', '-d', kind === 'used' || kind === 'used2' ? '--force-recreate' : '--no-recreate', '--wait', '--wait-timeout', '1800'], { cwd: repositoryRoot, env: process.env, windowsHide: true, stdio: 'inherit' });
      child.once('error', reject); child.once('close', code => code === 0 ? done() : reject(Error(`P5_RESUME_FAILED: ${code}`)));
    });
    await verifyLive();
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    let cleanupError;
    try { resumeLock.release(); } catch (error) { cleanupError = error; }
    if (cleanupError) {
      if (primaryError) throw new AggregateError([primaryError, cleanupError], 'resume failed and owned lock could not be safely released');
      throw cleanupError;
    }
  }
} else await verifyLive();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
