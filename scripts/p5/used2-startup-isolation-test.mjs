// Copies only frozen P5 evidence into an OS temporary directory. The live
// ledger, owner lock and services are never mounted or modified.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { repositoryRoot, runRoot } from './sources.mjs';
import { buildHarnessManifest } from './run.mjs';
import { switchUsed2PolicyInTest, validateUsed2SwitchEvidence } from './used2-policy-switch.mjs';
import { verifyFixedUsed2RunArtifacts } from './used2-policy-runtime.mjs';
import { USED_BASELINE_HASH } from './used-policy-switch.mjs';

if (process.argv.length !== 2) throw Error('P5_USED2_ISOLATION_NO_ARGUMENTS');
const temp = mkdtempSync(join(tmpdir(), 'ave-p5-used-switch-test-'));
if (resolve(dirname(temp)) !== resolve(tmpdir()) || !basename(temp).startsWith('ave-p5-used-switch-test-')) throw Error('P5_USED2_ISOLATION_PATH_INVALID');
const sha = data => createHash('sha256').update(data).digest('hex');
try {
  const config = verifyFixedUsed2RunArtifacts(runRoot, readFileSync(join(runRoot, 'guarded-run-20261105-r2.json')), readFileSync(join(runRoot, 'compose-guarded-20261105-r2.json')), readFileSync(join(runRoot, 'build-20261105-r2.json')));
  const files = ['baseline-policy-performance-r1.json', 'candidate-policy-performance-r1.json', 'candidate-evidence-performance-r1.json', 'prepared-public-fixtures.json', 'inputs-manifest.json', 'inputs-manifest-performance-r1.json', 'samples-performance-r1.json', 'price-evidence.json', 'empty-policy-switch.completed', 'used-policy-switch.completed'];
  const dirs = ['materials', 'inputs', 'samples-r1', 'performance-fixture-r1', 'performance-samples-r1', 'empty-policy-switch.snapshots', 'used-policy-switch.snapshots'];
  for (const name of files) cpSync(join(runRoot, name), join(temp, name), { errorOnExist: true });
  for (const name of dirs) cpSync(join(runRoot, name), join(temp, name), { recursive: true, errorOnExist: true });
  cpSync(join(temp, 'used-policy-switch.snapshots', 'new-policy.json'), join(temp, 'guard-policy.json'), { errorOnExist: true });
  const isolated = join(runRoot, 'used2-isolation-source', 'ledger');
  if (existsSync(join(isolated, 'owner.lock'))) throw Error('P5_USED2_ISOLATION_OWNER_PRESENT');
  const expected = { 'head.json': '7203a29ba0adfb7e4f187fa9a2669da2676d19bb18e87a2a4cbfaebafb45480d', 'ledger.jsonl': '4f55220ae3708cfe011823d50f7c37cf4d43ddb43de1804047dff642fcde2122' };
  mkdirSync(join(temp, 'ledger'));
  for (const [name, digest] of Object.entries(expected)) { const bytes = readFileSync(join(isolated, name)); if (sha(bytes) !== digest) throw Error('P5_USED2_ISOLATION_COPY_CHANGED'); writeFileSync(join(temp, 'ledger', name), bytes, { flag: 'wx' }); }
  const previous = JSON.parse(readFileSync(join(temp, 'guard-policy.json'))), next = structuredClone(previous);
  Object.assign(next.models['qwen3.7-max-2026-05-20'], { maxTextBytes: 500000, maxInputTokens: 524288 });
  writeFileSync(join(temp, 'candidate-policy2.json'), JSON.stringify(next), { flag: 'wx' });
  const options = { expectedFirstHash: USED_BASELINE_HASH, expectedPriorHash: 'f669127989a8cd5436cd82e05acf483bf1418c4876290274f7438d427d3bcb35', observed: { sequence: 70, hash: '0b26ab747a262a043210689b9bdb0a724176313c2c2702158c9f90f82d62118f', reservedMicroCny: 38610516, reservations: 35 } };
  switchUsed2PolicyInTest(temp, { ...options, assertHostStopped: () => true });
  const before = validateUsed2SwitchEvidence(temp, join(temp, 'ledger'), next);
  const harness = join(repositoryRoot, 'scripts/p5');
  writeFileSync(join(temp, 'harness-manifest.json'), JSON.stringify(buildHarnessManifest(harness, 'used2'), null, 2) + '\n', { flag: 'wx' });
  const output = execFileSync('docker', ['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '1000:1000', '--env', `AVE_P5_ISOLATED_PROJECT=${config.project}`, '--entrypoint', '/usr/local/bin/node', '--mount', `type=bind,source=${temp},target=/p5-run,readonly`, '--mount', `type=bind,source=${temp},target=/p5-budget`, '--mount', `type=bind,source=${harness},target=/p5-harness,readonly`, config.desktopImage, '--import', '/p5-harness/install.mjs', '--eval', "console.log('P5_USED2_ISOLATED_STARTUP_OK')"], { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024 });
  if (!output.includes('P5_USED2_ISOLATED_STARTUP_OK') || !output.includes('P5_GUARD_READY') || existsSync(join(temp, 'ledger', 'owner.lock'))) throw Error('P5_USED2_ISOLATION_STARTUP_FAILED');
  // A second isolated startup overlays a transpiled registry and matching test
  // provenance on the old image. This verifies module-singleton wiring only;
  // it does not attest a future image or make a network call.
  const typescript = await import('typescript');
  const registrySource = readFileSync(join(repositoryRoot, 'packages/platform/model-gateway/src/trusted-dispatch.ts'), 'utf8');
  const registry = Buffer.from(typescript.transpileModule(registrySource, { compilerOptions: { module: typescript.ModuleKind.ESNext, target: typescript.ScriptTarget.ES2022 } }).outputText);
  const registryFile = join(temp, 'trusted-dispatch.fixture.js'); writeFileSync(registryFile, registry, { flag: 'wx' });
  const provenanceBytes = execFileSync('docker', ['run', '--rm', '--network', 'none', '--entrypoint', 'cat', config.desktopImage, '/opt/ave/app/build-provenance.json'], { cwd: repositoryRoot, windowsHide: true, timeout: 30000, maxBuffer: 32 * 1024 * 1024 });
  const provenance = JSON.parse(provenanceBytes); provenance.outputs.push({ path: 'packages/platform/model-gateway/src/trusted-dispatch.js', bytes: registry.length, sha256: sha(registry) });
  const provenanceFile = join(temp, 'build-provenance.fixture.json'); writeFileSync(provenanceFile, JSON.stringify(provenance), { flag: 'wx' });
  const probe = `const m=await import('file:///opt/ave/app/packages/platform/model-gateway/src/trusted-dispatch.js');const a=m.takeTrustedDispatch();if(!a||!/^[a-f0-9]{64}$/.test(a.digest)||m.takeTrustedDispatch()!==null)throw Error('registry missing');const t={wire_digest:'a'.repeat(64),input_bytes:1,target:{role:'planner',provider:'qwen',model:'qwen3.7-max-2026-05-20',endpoint:'https://dashscope.aliyuncs.com/compatible-mode/v1',digest:'b'.repeat(64)}};let rejected=false;try{await a.resumeDispatch(t,()=>fetch('https://example.invalid',{method:'POST',body:'x'}))}catch{rejected=true}if(!rejected)throw Error('unmatched transport accepted');console.log('P5_USED2_REGISTRY_SINGLETON_OK')`;
  const overlayOutput = execFileSync('docker', ['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '1000:1000', '--env', `AVE_P5_ISOLATED_PROJECT=${config.project}`, '--entrypoint', '/usr/local/bin/node', '--mount', `type=bind,source=${temp},target=/p5-run,readonly`, '--mount', `type=bind,source=${temp},target=/p5-budget`, '--mount', `type=bind,source=${harness},target=/p5-harness,readonly`, '--mount', `type=bind,source=${registryFile},target=/opt/ave/app/packages/platform/model-gateway/src/trusted-dispatch.js,readonly`, '--mount', `type=bind,source=${provenanceFile},target=/opt/ave/app/build-provenance.json,readonly`, config.desktopImage, '--import', '/p5-harness/install.mjs', '--eval', probe], { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024 });
  if (!overlayOutput.includes('P5_USED2_REGISTRY_SINGLETON_OK') || existsSync(join(temp, 'ledger', 'owner.lock'))) throw Error('P5_USED2_ISOLATION_REGISTRY_FAILED');
  const after = validateUsed2SwitchEvidence(temp, join(temp, 'ledger'), next);
  if (before.state.sequence !== after.state.sequence || before.state.reservedMicroCny !== after.state.reservedMicroCny) throw Error('P5_USED2_ISOLATION_LEDGER_CHANGED');
  console.log(JSON.stringify({ isolated: true, network: 'none', guardReady: true, copiedLedgerUnchanged: true, reservedMicroCny: after.state.reservedMicroCny, sequence: after.state.sequence, note: 'old image has no continuation registry; module wiring verified only with a test overlay, not production image' }));
} finally { rmSync(temp, { recursive: true, force: true }); }
