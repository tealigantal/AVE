// Fixed host-side wrapper: never stops a service or issues a model request.
// First close the project through AVE and stop only the owned P5 services.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { acquireResumeLock, buildHarnessManifest, stageUsedHarness, validateStoppedRuntime } from './run.mjs';
import { repositoryRoot, runRoot } from './sources.mjs';
import { validateUsedSwitchEvidence } from './used-policy-switch.mjs';
import { verifyFixedUsedRunArtifacts, requireNoUsedHelper, USED_HELPER_NAME } from './used-policy-runtime.mjs';
export { verifyFixedUsedRunArtifacts, requireNoUsedHelper, USED_HELPER_NAME } from './used-policy-runtime.mjs';

const fail = message => { throw Error(`P5_USED_WRAPPER: ${message}`); };

export function runFixedUsedSwitch() {
  if (arguments.length || process.platform !== 'win32') fail('fixed Windows host invocation only');
  const configBytes = readFileSync(join(runRoot, 'guarded-run-20261105-r1.json'));
  const composePath = join(runRoot, 'compose-guarded-20261105-r1.json');
  const config = verifyFixedUsedRunArtifacts(runRoot, configBytes, readFileSync(composePath), readFileSync(join(runRoot, 'build-20261105-r1.json')));
  const docker = (...args) => execFileSync('docker', args, { cwd: repositoryRoot, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 }).trim();
  const noHelper = () => requireNoUsedHelper(docker('ps', '--all', '--quiet', '--filter', `name=^/${USED_HELPER_NAME}$`));
  const compose = (...args) => docker('compose', '--file', composePath, '--project-name', config.project, ...args);
  const stopped = () => {
    const result = {};
    for (const service of ['desktop', 'whisper']) {
      const id = compose('ps', '--all', '--quiet', service);
      if (!/^[a-f0-9]{12,64}$/.test(id)) fail('container identity unavailable');
      result[service] = JSON.parse(docker('inspect', '--format', '{{json .}}', id));
    }
    validateStoppedRuntime(config, result.desktop, result.whisper);
    return true;
  };
  const lock = acquireResumeLock(join(runRoot, 'used-policy-resume.owner'));
  let failure;
  try {
    noHelper(); stopped();
    stageUsedHarness(runRoot, buildHarnessManifest(config.harnessRoot, 'used'), stopped);
    stopped();
    docker('run', '--rm', '--name', USED_HELPER_NAME, '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '1000:1000',
      '--env', `AVE_P5_ISOLATED_PROJECT=${config.project}`, '--entrypoint', '/usr/local/bin/node',
      '--mount', `type=bind,source=${runRoot},target=/p5-run`,
      '--mount', `type=bind,source=${config.budgetRoot},target=/p5-budget`,
      '--mount', `type=bind,source=${config.harnessRoot},target=/p5-harness,readonly`,
      '--mount', `type=volume,source=${config.project}_projects,target=/p5-projects,readonly`,
      config.desktopImage, '/p5-harness/used-policy-switch.mjs');
    noHelper(); stopped();
    const policy = JSON.parse(readFileSync(join(runRoot, 'guard-policy.json')));
    const verified = validateUsedSwitchEvidence(runRoot, join(config.budgetRoot, 'ledger'), policy);
    return { project: config.project, previousHash: verified.previousHash, candidateHash: verified.candidateHash, originalReservedMicroCny: verified.oldState.reservedMicroCny, currentReservedMicroCny: verified.state.reservedMicroCny, modelCallsStarted: false };
  } catch (error) { failure = error; throw error; }
  finally {
    // A timed-out Docker CLI may leave its daemon-side helper running. Never
    // remove the host lock unless absence of that exact helper is confirmed.
    let cleanup;
    try { noHelper(); lock.release(); } catch (error) { cleanup = error; }
    if (cleanup) { if (failure) throw new AggregateError([failure, cleanup], 'transition failed; helper state or owner lock requires diagnosis'); throw cleanup; }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) fail('no arguments accepted');
  console.log(JSON.stringify(runFixedUsedSwitch()));
}
