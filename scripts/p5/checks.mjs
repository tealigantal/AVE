import { spawn, execFileSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprint } from '../docs/fingerprint.mjs';
import { repositoryRoot, runRoot, sha256 } from './sources.mjs';

const [group, attempt] = process.argv.slice(2);
const groups = {
  focused: ['stage3:p5-tools:test', 'stage3:p4-integration:test', 'web:host:test', 'timeline-render:test', 'worker:render-graph:test', 'worker:render-correctness:test', 'renderer:workbench:test', 'interaction-acceptance:test', 'typecheck', 'contracts:check', 'architecture', 'render-graph:test', 'stage3:request:test', 'stage3:generation:test', 'stage3:model:test', 'docker:sound-download:test'],
  final: ['check', 'acceptance:final:synthetic', 'interaction-acceptance:test', 'docs:check'],
};
if (!groups[group] || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(attempt ?? '')) throw Error('usage: node scripts/p5/checks.mjs <focused|final> <new-attempt-id>');
const directory = join(runRoot, 'checks', attempt);
mkdirSync(join(runRoot, 'checks'), { recursive: true });
mkdirSync(directory);
const environment = { ...process.env, PYTHONPATH: join(repositoryRoot, 'output/playwright/p4-20261104/budget70/python-deps') };
const python = execFileSync('python', ['-c', 'import sys,PIL;print(sys.version.split()[0]);print(PIL.__version__)'], { env: environment, encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/);
if (python[1] !== '12.3.0') throw Error('P5_LOCKED_PILLOW_REQUIRED');
const results = [];
for (const name of groups[group]) {
  const before = await fingerprint(repositoryRoot);
  const started_at = new Date().toISOString();
  const file = join(directory, `${name.replaceAll(':', '-')}.log`), fd = openSync(file, 'wx');
  let code;
  try {
    code = await new Promise((done, reject) => {
      // Names are from the fixed list above; no user or file content reaches shell text.
      const child = spawn(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['run', name], { cwd: repositoryRoot, env: environment, windowsHide: true, shell: process.platform === 'win32', stdio: ['ignore', fd, fd] });
      child.once('error', reject); child.once('close', done);
    });
  } finally { closeSync(fd); }
  const after = await fingerprint(repositoryRoot);
  const entry = { command: `pnpm run ${name}`, started_at, finished_at: new Date().toISOString(), exit_code: code, source_before: before, source_after: after, frozen_source: before === after, log: { file: file.slice(runRoot.length + 1).replaceAll('\\', '/'), sha256: sha256(readFileSync(file)) } };
  results.push(entry);
  writeFileSync(join(directory, 'results.json'), JSON.stringify({ python, group, results }, null, 2) + '\n');
  console.log(JSON.stringify(entry));
}
if (results.some(result => result.exit_code !== 0 || !result.frozen_source)) process.exitCode = 1;
