// Pure identity checks shared by the CLI and the offline transition wrapper.
// Keep this module free of any import of run.mjs or top-level execution.
import { resolve } from 'node:path';
import { validatePaths } from './preflight.mjs';
import { repositoryRoot, sha256 } from './sources.mjs';

const fail = message => { throw Error(`P5_USED_WRAPPER: ${message}`); };
const CONFIG_HASH = '2ca1809f6809c6d1f32701e36724fd6867ea5189568d393bf728ba4d2403850b';
const COMPOSE_HASH = 'bec2217c88cd00e3a51864917a042d7957035e6be9f4d39cba20d340d3591baf';
const BUILD_HASH = 'd0d122b7c321ae44b9f36e15f838e7423fbe36cd23fce97c934220c970360f8e';
export const USED_HELPER_NAME = 'ave-p5-used-policy-switch-20261105';

export function requireNoUsedHelper(ids) {
  if (typeof ids !== 'string' || ids.trim()) fail('used policy helper still exists or its state is unknown');
  return true;
}

export function verifyFixedUsedRunArtifacts(root, configBytes, composeBytes, buildBytes) {
  if (sha256(configBytes) !== CONFIG_HASH || sha256(composeBytes) !== COMPOSE_HASH || sha256(buildBytes) !== BUILD_HASH) fail('recorded run artifacts changed');
  const config = JSON.parse(configBytes), build = JSON.parse(buildBytes);
  if (config.project !== 'ave-p5-current-20261105' || config.port !== 6083 || resolve(config.runRoot) !== resolve(root) || resolve(config.budgetRoot) !== resolve(root, 'budget') || resolve(config.harnessRoot) !== resolve(repositoryRoot, 'scripts/p5') || build.services.find(item => item.service === 'desktop')?.image_id !== config.desktopImage || build.services.find(item => item.service === 'whisper')?.image_id !== config.whisperImage) fail('run identity mismatch');
  validatePaths(config, repositoryRoot);
  return config;
}
