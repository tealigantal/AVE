import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const base = 'docs/evidence/assets/reliable-import/';
const current = JSON.parse(await readFile(base + 'current-inputs-attempt05.json', 'utf8'));
const p0 = JSON.parse(await readFile('docs/evidence/assets/reliable-baseline/current-build-runtime.json', 'utf8'));
const manifest = JSON.parse(await readFile('docs/program/creative-assistant-stage3/EXECUTION_MANIFEST.yaml', 'utf8'));
const wp = manifest.work_packages.find(p => p.work_package_id === 'WP-S3-RELIABLE-IMPORT-001');
const match = (path, glob) => new RegExp('^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('**', '§§').replaceAll('*', '[^/]*').replaceAll('§§', '.*') + '$').test(path);
const previous = new Map(p0.inputs.files.map(f => [f.path, f.sha256]));
const changed = current.inputs.files.filter(f => previous.get(f.path) !== f.sha256).map(f => f.path);
const outside = changed.filter(path => !wp.allowed_paths.some(g => match(path, g)) || wp.forbidden_paths.some(g => match(path, g)));
if (outside.length) throw new Error(JSON.stringify(outside));
const protectedFiles = {
  '.dockerignore': 'f0d8ca1aab3056f6a7e6812a35a511692832fe6cdcac5baec931555a7d023a99',
  'docker/Dockerfile': '89194af26baf96127986c13119474a4ff39c6a6307530cb9d5e7a4823c9e1d8e',
  'docs/plans/2026-10-02-mixed-media-resource-packs.md': '935d675a252c74cf592ab908d5da7948d8e33b9cb32ff759b04d7f16c33b46d2',
  'tests/integration/docker-packaging.test.mjs': 'dea1c3e09d3b233d607f13e540b676023a3ca6f016f38b2ee8a0d7995726d431',
};
for (const [path, digest] of Object.entries(protectedFiles)) if (sha(await readFile(path)) !== digest) throw new Error('PROTECTED_CHANGED:' + path);
await writeFile(base + 'path-and-protection-audit-attempt05.json', JSON.stringify({ scope: 'build inputs since immutable P0; full Git authorization also depends on package history', code_fingerprint: current.code_fingerprint, build_input_digest: current.build_input_digest, changed_inputs: changed, outside_allowed_paths: outside, protected_files: protectedFiles }, null, 2) + '\n');
const entries = [];
for (const path of (await readdir(base)).sort()) {
  if (path === 'artifact-manifest-engineering.json' || !(path.endsWith('.log') || path.endsWith('.json'))) continue;
  const bytes = await readFile(base + path);
  entries.push({ path, bytes: bytes.length, sha256: sha(bytes) });
}
await writeFile(base + 'artifact-manifest-engineering.json', JSON.stringify({ scope: 'local engineering artifacts, no actual Windows interaction proof', code_fingerprint: current.code_fingerprint, build_input_digest: current.build_input_digest, files: entries }, null, 2) + '\n');
console.log(JSON.stringify({ changed: changed.length, artifacts: entries.length, fingerprint: current.code_fingerprint }));
