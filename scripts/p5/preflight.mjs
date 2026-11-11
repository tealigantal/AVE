import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { pathToFileURL } from 'node:url';
import { collectBuildInputs } from '../docker/build-identity.mjs';

const fail = message => { throw new Error(`P5_PREFLIGHT: ${message}`); };
const sha = data => createHash('sha256').update(data).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/;
const imagePattern = /^sha256:[a-f0-9]{64}$/;
export function hostBindPath(source) {
  if (process.platform === 'win32') {
    const mapped = /^\/run\/desktop\/mnt\/host\/([a-z])\/(.+)$/.exec(source);
    if (mapped) return realpathSync(`${mapped[1].toUpperCase()}:/${mapped[2]}`);
  }
  return realpathSync(source);
}

export function validateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) fail('configuration missing');
  if (!/^ave-p5-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config.project ?? '')) fail('project must be a unique ave-p5-* name');
  if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535 || [6080, 6081].includes(config.port)) fail('invalid isolated port');
  if (!imagePattern.test(config.desktopImage ?? '') || !imagePattern.test(config.whisperImage ?? '')) fail('images must use exact image identities');
  for (const name of ['runRoot', 'materialsRoot', 'exportRoot']) if (typeof config[name] !== 'string' || !isAbsolute(config[name])) fail(`${name} must be absolute`);
  if (!Array.isArray(config.sources) || !config.sources.length) fail('sources required');
  const ids = new Set();
  for (const item of config.sources) {
    if (!item || !/^[a-zA-Z0-9_-]+$/.test(item.id ?? '') || ids.has(item.id)) fail('source id must be unique');
    ids.add(item.id);
    if (typeof item.path !== 'string' || !isAbsolute(item.path) || !hashPattern.test(item.sha256 ?? '') || !Number.isSafeInteger(item.bytes) || item.bytes < 1 || typeof item.rights !== 'string' || !item.rights.trim()) fail(`invalid source ${item.id}`);
  }
  return config;
}

export function validatePaths(config, repositoryRoot) {
  const evidenceRoot = realpathSync(resolve(repositoryRoot, 'docs/evidence/assets/mixed-media-p5/current-build-20261105'));
  const runRoot = realpathSync(config.runRoot), materialsRoot = realpathSync(config.materialsRoot), exportRoot = realpathSync(config.exportRoot);
  const within = (base, child) => { const rel = relative(base, child); return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel); };
  if (!within(evidenceRoot, runRoot) || !within(runRoot, exportRoot) || runRoot === exportRoot || within(materialsRoot, exportRoot) || within(exportRoot, materialsRoot)) fail('exports must be in the isolated run root and separate from materials');
  if (lstatSync(config.exportRoot).isSymbolicLink()) fail('export root cannot be a symlink');
  return { runRoot, materialsRoot, exportRoot };
}

export function validateLicensedOriginals(config, manifest) {
  const sources = manifest?.public_sources?.sources;
  if (!Array.isArray(sources)) fail('licensed source manifest missing');
  for (const item of config.sources) {
    const match = sources.find(source => source.source_id === item.id && source.source_sha256?.toLowerCase() === item.sha256 && source.license === item.rights && source.source_page === item.sourcePage);
    if (!match) fail(`source not bound to the licensed original: ${item.id}`);
  }
}

export function validateRuntimeMounts(config, service, inspected) {
  const expectedImage = service === 'desktop' ? config.desktopImage : config.whisperImage;
  if (inspected.Image !== expectedImage || inspected.State?.Running !== true || inspected.Config?.Labels?.['com.docker.compose.project'] !== config.project || inspected.Config?.Labels?.['com.docker.compose.service'] !== service) fail(`${service} runtime identity mismatch`);
  const expected = service === 'desktop' ? [
    ['/config', 'volume', `${config.project}_profile`, true],
    ['/run/ave', 'volume', `${config.project}_configuration`, true],
    ['/workspace/projects', 'volume', `${config.project}_projects`, true],
    ['/workspace/uploads', 'volume', `${config.project}_uploads`, true],
    ['/workspace/materials', 'bind', realpathSync(config.materialsRoot), false],
    ['/workspace/exports', 'bind', realpathSync(config.exportRoot), true],
  ] : [['/home/ubuntu/.cache/huggingface/hub', 'volume', `${config.project}_whisper-cache`, true]];
  if (service === 'desktop' && config.mode === 'guarded') expected.push(
    ['/original-config', 'volume', 'ave-desktop_configuration', false],
    ['/p5-harness', 'bind', realpathSync(config.harnessRoot), false],
    ['/p5-run', 'bind', realpathSync(config.runRoot), false],
    ['/p5-budget', 'bind', realpathSync(config.budgetRoot), true],
  );
  if (!Array.isArray(inspected.Mounts) || inspected.Mounts.length !== expected.length) fail(`${service} unexpected mounts`);
  for (const [destination, type, source, rw] of expected) {
    const matches = inspected.Mounts.filter(mount => mount.Destination === destination);
    if (matches.length !== 1) fail(`${service} missing mount ${destination}`);
    const mount = matches[0];
    const actual = type === 'bind' ? hostBindPath(mount.Source) : mount.Name;
    if (mount.Type !== type || actual !== source || mount.RW !== rw) fail(`${service} mount mismatch ${destination}`);
  }
  if (service === 'desktop') {
    const bindings = inspected.NetworkSettings?.Ports?.['8080/tcp'];
    if (!Array.isArray(bindings) || bindings.length !== 1 || bindings[0].HostIp !== '127.0.0.1' || bindings[0].HostPort !== String(config.port)) fail('desktop port mismatch');
    const env = Object.fromEntries((inspected.Config?.Env ?? []).map(value => { const at = value.indexOf('='); return [value.slice(0, at), value.slice(at + 1)]; }));
    if (config.mode === 'guarded') {
      if (env.AVE_P5_ISOLATED_PROJECT !== config.project || Object.keys(env).some(key => key.endsWith('_API_KEY')) || env.AVE_MODEL_SERVICES_JSON !== undefined) fail('guarded context/credential environment mismatch');
      if (JSON.stringify(inspected.Config.Entrypoint) !== JSON.stringify(['/opt/ave-python/bin/python', '/p5-harness/launch.py'])) fail('guarded startup path mismatch');
    } else {
      if (env.AVE_VISION_API_KEY !== 'disabled-offline' || env.AVE_PLANNER_API_KEY !== 'disabled-offline') fail('offline credentials mismatch');
      const settings = JSON.parse(env.AVE_MODEL_SERVICES_JSON ?? '{}');
      if (settings.vision?.base_url !== 'http://127.0.0.1:9/v1' || settings.planner?.base_url !== 'http://127.0.0.1:9/v1') fail('offline endpoint mismatch');
    }
  } else if (!(inspected.Config?.Env ?? []).includes('HF_HUB_OFFLINE=1')) fail('Whisper offline flag missing');
}

export function validateSources(config, authorizedRoot) {
  const root = realpathSync(authorizedRoot);
  return config.sources.map(item => {
    const actual = realpathSync(item.path);
    const within = relative(root, actual);
    if (!within || isAbsolute(within) || within === '..' || within.startsWith(`..${sep}`)) fail(`source outside authorized root: ${item.id}`);
    if (!statSync(actual).isFile()) fail(`source is not a file: ${item.id}`);
    const bytes = readFileSync(actual);
    if (bytes.length !== item.bytes || sha(bytes) !== item.sha256) fail(`source identity mismatch: ${item.id}`);
    return { id: item.id, bytes: item.bytes, sha256: item.sha256, rights: item.rights };
  });
}

export function validateImageLabels(config, digest, inspect) {
  if (!hashPattern.test(digest)) fail('invalid build input identity');
  for (const [service, image] of [['desktop', config.desktopImage], ['whisper', config.whisperImage]]) {
    const value = inspect(image);
    if (value.Id !== image || value.Config?.Labels?.['io.ave.build-input-digest'] !== digest) fail(`${service} image build identity differs`);
  }
}

async function assertFreePort(port) {
  await new Promise((done, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => server.close(done));
  });
}

export async function preflight(config, authorizedRoot, root = process.cwd()) {
  validateConfig(config);
  const paths = validatePaths(config, root);
  if (realpathSync(authorizedRoot) !== paths.materialsRoot) fail('authorized root differs from configuration');
  validateLicensedOriginals(config, JSON.parse(readFileSync(resolve(root, 'docs/evidence/assets/mixed-media-p5/review-manifest.json'), 'utf8')));
  const sources = validateSources(config, authorizedRoot);
  const docker = (...args) => execFileSync('docker', args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim();
  const projects = JSON.parse(docker('compose', 'ls', '--all', '--format', 'json'));
  if (projects.some(entry => entry.Name === config.project)) fail('project already exists; preserve it and choose a new run id');
  const volumes = docker('volume', 'ls', '--format', '{{.Name}}').split(/\r?\n/).filter(Boolean);
  if (volumes.some(name => name.startsWith(`${config.project}_`))) fail('project volume already exists');
  await assertFreePort(config.port);
  const inputs = await collectBuildInputs(root);
  validateImageLabels(config, inputs.digest, image => JSON.parse(docker('image', 'inspect', '--format', '{{json .}}', image)));
  return { project: config.project, port: config.port, buildInputDigest: inputs.digest, images: { desktop: config.desktopImage, whisper: config.whisperImage }, sources };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length !== 4) fail('usage: node scripts/p5/preflight.mjs <config.json> <authorized-source-root>');
    console.log(JSON.stringify(await preflight(JSON.parse(readFileSync(process.argv[2], 'utf8')), process.argv[3]), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
