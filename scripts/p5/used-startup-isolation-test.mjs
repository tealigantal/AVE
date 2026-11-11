// Read-only copies of the P5 source/ledger are used in a disposable,
// network-disabled container. This never mounts or modifies the real ledger.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { repositoryRoot, runRoot } from './sources.mjs';
import { buildHarnessManifest } from './run.mjs';
import { switchUsedPolicyInTest, validateUsedSwitchEvidence } from './used-policy-switch.mjs';
import { verifyFixedUsedRunArtifacts } from './used-policy-run.mjs';

if (process.argv.length !== 2) throw Error('P5_ISOLATION_TEST_NO_ARGUMENTS');
const tempRoot = mkdtempSync(join(tmpdir(), 'ave-p5-used-switch-test-'));
if (resolve(dirname(tempRoot)) !== resolve(tmpdir()) || !basename(tempRoot).startsWith('ave-p5-used-switch-test-')) throw Error('P5_ISOLATION_TEST_PATH_INVALID');
try {
  const config = verifyFixedUsedRunArtifacts(runRoot, readFileSync(join(runRoot, 'guarded-run-20261105-r1.json')), readFileSync(join(runRoot, 'compose-guarded-20261105-r1.json')), readFileSync(join(runRoot, 'build-20261105-r1.json')));
  const files = ['guard-policy.json', 'baseline-policy-performance-r1.json', 'candidate-policy-performance-r1.json', 'candidate-evidence-performance-r1.json', 'prepared-public-fixtures.json', 'inputs-manifest.json', 'inputs-manifest-performance-r1.json', 'samples-performance-r1.json', 'price-evidence.json', 'empty-policy-switch.completed'];
  const dirs = ['materials', 'inputs', 'samples-r1', 'performance-fixture-r1', 'performance-samples-r1', 'empty-policy-switch.snapshots'];
  for (const name of files) cpSync(join(runRoot, name), join(tempRoot, name), { errorOnExist: true });
  for (const name of dirs) cpSync(join(runRoot, name), join(tempRoot, name), { recursive: true, errorOnExist: true });
  cpSync(join(runRoot, 'budget', 'ledger', 'head.json'), join(tempRoot, 'head-copy.json'), { errorOnExist: true });
  cpSync(join(runRoot, 'budget', 'ledger', 'ledger.jsonl'), join(tempRoot, 'ledger-copy.jsonl'), { errorOnExist: true });
  // Make an isolated ledger directory; owner.lock is intentionally not copied.
  const { mkdirSync } = await import('node:fs');
  mkdirSync(join(tempRoot, 'ledger'));
  cpSync(join(tempRoot, 'head-copy.json'), join(tempRoot, 'ledger', 'head.json'));
  cpSync(join(tempRoot, 'ledger-copy.jsonl'), join(tempRoot, 'ledger', 'ledger.jsonl'));
  const old = JSON.parse(readFileSync(join(tempRoot, 'guard-policy.json'))), candidate = structuredClone(old);
  Object.assign(candidate.models['qwen3.7-max-2026-05-20'], { maxTextBytes: 150000, maxInputTokens: 160000 });
  writeFileSync(join(tempRoot, 'candidate-policy.json'), JSON.stringify(candidate));
  switchUsedPolicyInTest(tempRoot, { assertHostStopped: () => true });
  const before = validateUsedSwitchEvidence(tempRoot, join(tempRoot, 'ledger'), candidate);
  const harnessRoot = join(repositoryRoot, 'scripts/p5');
  writeFileSync(join(tempRoot, 'harness-manifest.json'), JSON.stringify(buildHarnessManifest(harnessRoot, 'used'), null, 2) + '\n');
  const output = execFileSync('docker', ['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '1000:1000', '--env', `AVE_P5_ISOLATED_PROJECT=${config.project}`, '--entrypoint', '/usr/local/bin/node', '--mount', `type=bind,source=${tempRoot},target=/p5-run,readonly`, '--mount', `type=bind,source=${tempRoot},target=/p5-budget`, '--mount', `type=bind,source=${harnessRoot},target=/p5-harness,readonly`, config.desktopImage, '--import', '/p5-harness/install.mjs', '--eval', "console.log('P5_ISOLATED_STARTUP_OK')"], { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024 });
  if (!output.includes('P5_ISOLATED_STARTUP_OK') || !output.includes('P5_GUARD_READY') || existsSync(join(tempRoot, 'ledger', 'owner.lock'))) throw Error('P5_ISOLATED_STARTUP_NOT_VERIFIED');
  const after = validateUsedSwitchEvidence(tempRoot, join(tempRoot, 'ledger'), candidate);
  if (before.state.sequence !== after.state.sequence || before.state.reservedMicroCny !== after.state.reservedMicroCny) throw Error('P5_ISOLATED_LEDGER_CHANGED');
  console.log(JSON.stringify({ isolated: true, network: 'none', guardReady: true, copiedLedgerUnchanged: true, reservedMicroCny: after.state.reservedMicroCny, sequence: after.state.sequence }));
} finally { rmSync(tempRoot, { recursive: true, force: true }); }
