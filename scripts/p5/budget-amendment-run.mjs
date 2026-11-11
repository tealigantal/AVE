// Fixed r28 continuation. The caller must first close the project and stop only
// the two owned P5 containers. No arguments, new project, or new ledger.
import { execFileSync } from 'node:child_process';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { acquireResumeLock, validateStoppedRuntime } from './run.mjs';
import { repositoryRoot, runRoot, sha256 } from './sources.mjs';
import { verifyFixedUsed28RunArtifacts, requireNoUsed2Helper, USED2_HELPER_NAME } from './used2-policy-runtime.mjs';
import { requireNoUsedHelper, USED_HELPER_NAME } from './used-policy-runtime.mjs';

if (process.argv.length !== 2 || process.platform !== 'win32') throw Error('P5_BUDGET_WRAPPER: fixed Windows invocation only');
const path = name => join(runRoot, name), bytes = name => readFileSync(path(name));
const composeName = 'compose-guarded-20261109-seek-audio-r28.json';
const config = verifyFixedUsed28RunArtifacts(runRoot, bytes('guarded-run-20261109-seek-audio-r28.json'), bytes(composeName), bytes('build-20261109-seek-audio-r28.json'), bytes('guarded-identity-1794223138902.json'));
const docker = (...args) => execFileSync('docker', args, { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true, timeout: 180000, maxBuffer: 4 * 1024 * 1024 }).trim();
const compose = (...args) => docker('compose', '--file', path(composeName), '--project-name', config.project, ...args);
const stopped = () => {
  requireNoUsedHelper(docker('ps', '--all', '--quiet', '--filter', `name=^/${USED_HELPER_NAME}$`));
  requireNoUsed2Helper(docker('ps', '--all', '--quiet', '--filter', `name=^/${USED2_HELPER_NAME}$`));
  const inspect = service => { const id = compose('ps', '--all', '--quiet', service); if (!/^[a-f0-9]{12,64}$/.test(id)) throw Error('P5_BUDGET_WRAPPER: container identity unavailable'); return JSON.parse(docker('inspect', '--format', '{{json .}}', id)); };
  validateStoppedRuntime(config, inspect('desktop'), inspect('whisper')); return true;
};
const lock = acquireResumeLock(path('used2-policy-resume.owner')); let failure;
try {
  stopped();
  const old = bytes('harness-manifest.json');
  if (sha256(old) !== '261555cbb14b5065088b6605e6eb54ba15bc2d6a052fc2bafedae8da0bb2c542') throw Error('P5_BUDGET_WRAPPER: original manifest changed');
  const original = JSON.parse(old), editable = new Set(['install.mjs', 'ledger.mjs', 'budget-amendment.mjs']);
  for (const item of original.files) if (!editable.has(item.file) && sha256(readFileSync(join(config.harnessRoot, item.file))) !== item.sha256) throw Error('P5_BUDGET_WRAPPER: unrelated harness source changed');
  const files = original.files.map(item => item.file).sort((a, b) => a.localeCompare(b, 'en'));
  const next = Buffer.from(JSON.stringify({ schema_version: 1, files: files.map(file => ({ file, sha256: sha256(readFileSync(join(config.harnessRoot, file))) })) }, null, 2) + '\n');
  writeFileSync(path('harness-manifest-before-budget-299173272.json'), old, { flag: 'wx' });
  writeFileSync(path('harness-manifest-budget-299173272.json'), next, { flag: 'wx' });
  stopped();
  const helper = 'ave-p5-budget-amendment-299173272';
  if (docker('ps', '--all', '--quiet', '--filter', `name=^/${helper}$`)) throw Error('P5_BUDGET_WRAPPER: helper already exists');
  docker('run', '--rm', '--name', helper, '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '1000:1000', '--env', `AVE_P5_ISOLATED_PROJECT=${config.project}`, '--entrypoint', '/usr/local/bin/node', '--mount', `type=bind,source=${runRoot},target=/p5-run`, '--mount', `type=bind,source=${config.budgetRoot},target=/p5-budget`, '--mount', `type=bind,source=${config.harnessRoot},target=/p5-harness,readonly`, config.desktopImage, '/p5-harness/budget-amendment.mjs');
  stopped();
  if (!bytes('harness-manifest.json').equals(old)) throw Error('P5_BUDGET_WRAPPER: manifest changed');
  writeFileSync(path('harness-manifest-budget-299173272.pending'), next, { flag: 'wx' });
  renameSync(path('harness-manifest-budget-299173272.pending'), path('harness-manifest.json'));
  console.log(JSON.stringify({ project: config.project, limitMicroCny: 299173272, harnessSha256: sha256(next), modelCallsStarted: false }));
} catch (error) { failure = error; throw error; }
finally { try { lock.release(); } catch (error) { if (failure) throw new AggregateError([failure, error], 'budget transition and lock release failed'); throw error; } }
