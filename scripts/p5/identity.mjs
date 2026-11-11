import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { currentBuildIdentity, assertRuntimeBuildProvenance } from '../docker/build-identity.mjs';
import { validateConfig, validateLicensedOriginals, validatePaths, validateRuntimeMounts, validateSources } from './preflight.mjs';

try {
  if (process.argv.length !== 4) throw Error('usage: node scripts/p5/identity.mjs <run-config.json> <new-identity-file>');
  const config = validateConfig(JSON.parse(readFileSync(process.argv[2], 'utf8')));
  const paths = validatePaths(config, process.cwd());
  validateLicensedOriginals(config, JSON.parse(readFileSync('docs/evidence/assets/mixed-media-p5/review-manifest.json', 'utf8')));
  validateSources(config, paths.materialsRoot);
  const parent = realpathSync(dirname(resolve(process.argv[3]))), sub = relative(paths.runRoot, parent);
  if (sub === '..' || sub.startsWith(`..${sep}`) || isAbsolute(sub)) throw Error('identity output outside run root');
  if (!process.env.COMPOSE_FILE || realpathSync(process.env.COMPOSE_FILE) !== realpathSync('scripts/p5/compose.offline.yaml') || process.env.COMPOSE_PROJECT_NAME !== config.project || process.env.P5_DESKTOP_IMAGE !== config.desktopImage || process.env.P5_WHISPER_IMAGE !== config.whisperImage || process.env.P5_PORT !== String(config.port) || realpathSync(process.env.P5_MATERIALS ?? '') !== paths.materialsRoot || realpathSync(process.env.P5_EXPORTS ?? '') !== paths.exportRoot) throw Error('Compose environment differs from authorized P5 run');
  const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim();
  const containers = {};
  for (const service of ['desktop', 'whisper']) {
    const id = docker('compose', 'ps', '--quiet', service);
    if (!/^[a-f0-9]{12,64}$/.test(id)) throw Error(`P5 runtime container missing: ${service}`);
    containers[service] = JSON.parse(docker('inspect', '--format', '{{json .}}', id));
    validateRuntimeMounts(config, service, containers[service]);
  }
  if (containers.whisper.HostConfig?.NetworkMode !== `container:${containers.desktop.Id}`) throw Error('Whisper shares an unexpected network namespace');
  const identity = await currentBuildIdentity();
  assertRuntimeBuildProvenance(identity);
  writeFileSync(process.argv[3], JSON.stringify(identity, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ code_fingerprint: identity.code_fingerprint, build_input_digest: identity.build_input_digest, runtime_digest: identity.runtime.digest, services: identity.runtime.services.map(({ service, image_id }) => ({ service, image_id })) }));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
