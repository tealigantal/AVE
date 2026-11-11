// Fixed offline wrapper. Does not stop services or issue model requests.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { acquireResumeLock, buildHarnessManifest, stageUsed2Harness, validateStoppedRuntime } from './run.mjs';
import { repositoryRoot, runRoot } from './sources.mjs';
import { validateUsed2SwitchEvidence } from './used2-policy-switch.mjs';
import { verifyFixedUsed2RunArtifacts, requireNoUsed2Helper, USED2_HELPER_NAME } from './used2-policy-runtime.mjs';
import { requireNoUsedHelper, USED_HELPER_NAME } from './used-policy-runtime.mjs';

export function runFixedUsed2Switch() {
  if (arguments.length || process.platform !== 'win32') throw Error('P5_USED2_WRAPPER: fixed Windows host invocation only');
  const composePath = join(runRoot, 'compose-guarded-20261105-r2.json');
  const config = verifyFixedUsed2RunArtifacts(runRoot, readFileSync(join(runRoot, 'guarded-run-20261105-r2.json')), readFileSync(composePath), readFileSync(join(runRoot, 'build-20261105-r2.json')));
  const docker = (...args) => execFileSync('docker', args, { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 }).trim();
  const noHelper = () => { requireNoUsedHelper(docker('ps', '--all', '--quiet', '--filter', `name=^/${USED_HELPER_NAME}$`)); requireNoUsed2Helper(docker('ps', '--all', '--quiet', '--filter', `name=^/${USED2_HELPER_NAME}$`)); };
  const compose = (...args) => docker('compose', '--file', composePath, '--project-name', config.project, ...args);
  const stopped = () => { const result = {}; for (const service of ['desktop', 'whisper']) { const id = compose('ps', '--all', '--quiet', service); if (!/^[a-f0-9]{12,64}$/.test(id)) throw Error('P5_USED2_WRAPPER: container identity unavailable'); result[service] = JSON.parse(docker('inspect', '--format', '{{json .}}', id)); } validateStoppedRuntime(config, result.desktop, result.whisper); return true; };
  const lock = acquireResumeLock(join(runRoot, 'used2-policy-resume.owner')); let failure;
  try {
    noHelper(); stopped(); stageUsed2Harness(runRoot, buildHarnessManifest(config.harnessRoot, 'used2'), stopped); stopped();
    docker('run', '--rm', '--name', USED2_HELPER_NAME, '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '1000:1000', '--env', `AVE_P5_ISOLATED_PROJECT=${config.project}`, '--entrypoint', '/usr/local/bin/node', '--mount', `type=bind,source=${runRoot},target=/p5-run`, '--mount', `type=bind,source=${config.budgetRoot},target=/p5-budget`, '--mount', `type=bind,source=${config.harnessRoot},target=/p5-harness,readonly`, '--mount', `type=volume,source=${config.project}_projects,target=/p5-projects,readonly`, config.desktopImage, '/p5-harness/used2-policy-switch.mjs');
    noHelper(); stopped();
    const proof = validateUsed2SwitchEvidence(runRoot, join(config.budgetRoot, 'ledger'), JSON.parse(readFileSync(join(runRoot, 'guard-policy.json'))));
    return { project: config.project, previousHash: proof.previousHash, candidateHash: proof.candidateHash, originalReservedMicroCny: proof.oldState.reservedMicroCny, currentReservedMicroCny: proof.state.reservedMicroCny, modelCallsStarted: false };
  } catch (error) { failure = error; throw error; }
  finally { let cleanup; try { noHelper(); lock.release(); } catch (error) { cleanup = error; } if (cleanup) { if (failure) throw new AggregateError([failure, cleanup], 'transition failed; helper state or owner lock requires diagnosis'); throw cleanup; } }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) { if (process.argv.length !== 2) throw Error('P5_USED2_WRAPPER: no arguments accepted'); console.log(JSON.stringify(runFixedUsed2Switch())); }
