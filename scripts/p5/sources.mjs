import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const runRoot = join(repositoryRoot, 'docs/evidence/assets/mixed-media-p5/current-build-20261105');
export const fixtureReceiptHash = '08970faa427e0a1ced1fae8f8b48a3aa591a289a7bfb34c972919bdde435a1eb';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = reason => { throw Error(`P5_SOURCES: ${reason}`); };

export function checkedFixtures(root = runRoot) {
  const bytes = readFileSync(join(root, 'prepared-public-fixtures.json'));
  if (sha256(bytes) !== fixtureReceiptHash) fail('reviewed public source receipt changed');
  const receipt = JSON.parse(bytes);
  for (const file of receipt.files) {
    const data = readFileSync(join(root, 'materials', file.name));
    if (data.length !== file.bytes || sha256(data) !== file.sha256) fail(`reviewed source changed: ${file.name}`);
  }
  return receipt;
}

export function verifyInputs(root = runRoot) {
  const fixture = checkedFixtures(root);
  const expectedSources = { 'visitors-main.mp4': 'B01', 'coast-main.mp4': 'B02', 'visitors-holdout.mp4': 'B01', 'coast-holdout.mp4': 'B02', 'coast-photo.png': 'B02', 'interview-audio.wav': 'C01' };
  const receipt = JSON.parse(readFileSync(join(root, 'inputs-manifest.json'), 'utf8'));
  if (receipt.schema_version !== 1 || receipt.fixture_receipt_sha256 !== fixtureReceiptHash || !Array.isArray(receipt.inputs) || receipt.inputs.length !== 6) fail('invalid prepared inputs manifest');
  const seen = new Set();
  for (const input of receipt.inputs) {
    if (typeof input.file !== 'string' || !/^[a-z0-9-]+\.(mp4|png|wav)$/.test(input.file) || seen.has(input.file)) fail('unsafe or duplicated input');
    seen.add(input.file);
    const source = fixture.sources.find(item => item.id === expectedSources[input.file]);
    if (!source || input.source_id !== source.id || input.original_sha256 !== source.original_sha256 || input.source_page !== source.page || input.license !== source.license) fail('input lineage differs from reviewed sources');
    const bytes = readFileSync(join(root, 'inputs', input.file));
    if (bytes.length !== input.bytes || sha256(bytes) !== input.sha256) fail(`input changed: ${input.file}`);
  }
  return receipt;
}

export function prepareInputs(root = runRoot) {
  const fixture = checkedFixtures(root);
  if (existsSync(join(root, 'inputs-manifest.json'))) return verifyInputs(root);
  const directory = join(root, 'inputs');
  mkdirSync(directory, { recursive: true });
  const jobs = [
    ['visitors-main.mp4', 'B01', 'nps-acadia-visitors-original.mp4', ['-ss', '40'], ['-t', '8', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac']],
    ['coast-main.mp4', 'B02', 'nps-acadia-coastal-original.mp4', ['-ss', '10'], ['-t', '8', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac']],
    ['visitors-holdout.mp4', 'B01', 'nps-acadia-visitors-original.mp4', ['-ss', '48'], ['-t', '8', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac']],
    ['coast-holdout.mp4', 'B02', 'nps-acadia-coastal-original.mp4', ['-ss', '18'], ['-t', '8', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac']],
    ['coast-photo.png', 'B02', 'nps-acadia-coastal-original.mp4', ['-ss', '14'], ['-frames:v', '1', '-update', '1']],
    ['interview-audio.wav', 'C01', 'usgs-kurt-carpenter-original.mp4', ['-ss', '44'], ['-t', '12', '-vn', '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le']],
  ];
  const inputs = [];
  for (const [file, sourceId, original, before, after] of jobs) {
    const output = join(directory, file);
    if (existsSync(output)) fail(`unreceipted input exists; preserve and inspect it: ${file}`);
    const args = ['-v', 'error', '-n', ...before, '-i', join(root, 'materials', original), ...after, output];
    execFileSync(process.env.AVE_FFMPEG ?? 'ffmpeg', args, { windowsHide: true, timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] });
    const bytes = readFileSync(output), source = fixture.sources.find(item => item.id === sourceId);
    if (!source) fail('missing reviewed source');
    inputs.push({ file, source_id: sourceId, original_sha256: source.original_sha256, source_page: source.page, license: source.license, bytes: bytes.length, sha256: sha256(bytes), command: ['ffmpeg', '-v', 'error', '-n', ...before, '-i', original, ...after, file] });
  }
  const ffmpeg = execFileSync(process.env.AVE_FFMPEG ?? 'ffmpeg', ['-version'], { encoding: 'utf8', windowsHide: true }).split(/\r?\n/)[0];
  const receipt = { schema_version: 1, fixture_receipt_sha256: fixtureReceiptHash, prepared_at: new Date().toISOString(), ffmpeg, inputs };
  writeFileSync(join(root, 'inputs-manifest.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  return verifyInputs(root);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const receipt = process.argv[2] === 'prepare' ? prepareInputs() : verifyInputs();
  console.log(JSON.stringify(receipt, null, 2));
}
