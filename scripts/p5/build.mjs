import { execFileSync, spawn } from 'node:child_process';
import { openSync, closeSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectBuildInputs } from '../docker/build-identity.mjs';
import { repositoryRoot, runRoot } from './sources.mjs';

const suffix = process.argv[2];
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suffix ?? '')) throw Error('usage: node scripts/p5/build.mjs <unique-build-id>');
const before = await collectBuildInputs(repositoryRoot);
const services = [];
for (const [service, dockerfile] of [['desktop', 'docker/Dockerfile'], ['whisper', 'docker/Whisper.Dockerfile']]) {
  const tag = `ave-p5-${service}:${suffix}`;
  const exists = execFileSync('docker', ['image', 'ls', '--filter', `reference=${tag}`, '--quiet'], { encoding: 'utf8', windowsHide: true }).trim();
  if (!exists) {
    const fd = openSync(join(runRoot, `build-${suffix}-${service}.log`), 'wx');
    try {
      await new Promise((done, reject) => {
        const child = spawn('docker', ['build', '--file', dockerfile, '--label', `io.ave.build-input-digest=${before.digest}`, '--tag', tag, '.'], { cwd: repositoryRoot, windowsHide: true, stdio: ['ignore', fd, fd] });
        const timer = setTimeout(() => { child.kill(); }, 1800000);
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('close', code => { clearTimeout(timer); code === 0 ? done() : reject(Error(`P5 ${service} build failed: ${code}; see retained log`)); });
      });
    } finally { closeSync(fd); }
  }
  const image = JSON.parse(execFileSync('docker', ['image', 'inspect', '--format', '{{json .}}', tag], { encoding: 'utf8', windowsHide: true }));
  if (image.Config?.Labels?.['io.ave.build-input-digest'] !== before.digest) throw Error(`P5 existing tag has different build inputs: ${tag}`);
  services.push({ service, image_id: image.Id, tag });
  console.log(JSON.stringify(services.at(-1)));
}
if ((await collectBuildInputs(repositoryRoot)).digest !== before.digest) throw Error('P5_BUILD_INPUT_CHANGED_DURING_BUILD');
const receipt = { build_input_digest: before.digest, services, built_at: new Date().toISOString(), services_started: false };
writeFileSync(join(runRoot, `build-${suffix}.json`), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt));
