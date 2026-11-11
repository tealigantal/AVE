import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateConfig, validateImageLabels, validateLicensedOriginals, validatePaths, validateRuntimeMounts, validateSources } from '../../scripts/p5/preflight.mjs';
import { checkWorkerSample, performancePolicyDigest, resolvePerformanceInputPaths, validateExactMediaAddition } from '../../scripts/p5/performance-amendment.mjs';
import { policyDigest } from '../../scripts/p5/guard.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const image = `sha256:${'a'.repeat(64)}`;
const digest = 'b'.repeat(64);

test('P5 preflight binds sources, rights, isolated runtime and image build identity', () => {
  const root = mkdtempSync(join(tmpdir(), 'ave-p5-test-'));
  const other = mkdtempSync(join(tmpdir(), 'ave-p5-other-'));
  try {
    const file = join(root, 'source.bin');
    const runRoot = join(root, 'docs/evidence/assets/mixed-media-p5/current-build-20261105');
    const exportRoot = join(runRoot, 'exports');
    const materialsRoot = join(root, 'materials');
    mkdirSync(exportRoot, { recursive: true });
    mkdirSync(materialsRoot);
    const bytes = Buffer.from('authorized source');
    writeFileSync(file, bytes);
    const config = { project: 'ave-p5-test-01', port: 6082, desktopImage: image, whisperImage: image, runRoot, exportRoot, materialsRoot,
      sources: [{ id: 'source1', path: file, bytes: bytes.length, sha256: hash(bytes), rights: 'test rights', sourcePage: 'https://example.org/source' }] };
    assert.equal(validateConfig(config), config);
    validatePaths(config, root);
    assert.throws(() => validatePaths({ ...config, exportRoot: materialsRoot }, root), /isolated run root/);
    const manifest = { public_sources: { sources: [{ source_id: 'source1', source_sha256: hash(bytes), license: 'test rights', source_page: 'https://example.org/source' }] } };
    validateLicensedOriginals(config, manifest);
    assert.throws(() => validateLicensedOriginals(config, { public_sources: { sources: [] } }), /licensed original/);
    const mounts = [
      ['/config', 'volume', `${config.project}_profile`, true], ['/run/ave', 'volume', `${config.project}_configuration`, true],
      ['/workspace/projects', 'volume', `${config.project}_projects`, true], ['/workspace/uploads', 'volume', `${config.project}_uploads`, true],
      ['/workspace/materials', 'bind', materialsRoot, false], ['/workspace/exports', 'bind', exportRoot, true]
    ].map(([Destination, Type, value, RW]) => ({ Destination, Type, RW, ...(Type === 'volume' ? { Name: value } : { Source: value }) }));
    const inspected = { Image: image, State: { Running: true }, Mounts: mounts, NetworkSettings: { Ports: { '8080/tcp': [{ HostIp: '127.0.0.1', HostPort: '6082' }] } }, Config: { Labels: { 'com.docker.compose.project': config.project, 'com.docker.compose.service': 'desktop' }, Env: ['AVE_VISION_API_KEY=disabled-offline', 'AVE_PLANNER_API_KEY=disabled-offline', `AVE_MODEL_SERVICES_JSON=${JSON.stringify({ vision: { base_url: 'http://127.0.0.1:9/v1' }, planner: { base_url: 'http://127.0.0.1:9/v1' } })}`] } };
    validateRuntimeMounts(config, 'desktop', inspected);
    assert.throws(() => validateRuntimeMounts(config, 'desktop', { ...inspected, Mounts: mounts.map(mount => mount.Destination === '/workspace/exports' ? { ...mount, Source: materialsRoot } : mount) }), /mount mismatch/);
    assert.throws(() => validateRuntimeMounts(config, 'desktop', { ...inspected, Image: `sha256:${'c'.repeat(64)}` }), /identity mismatch/);
    assert.deepEqual(validateSources(config, root), [{ id: 'source1', bytes: bytes.length, sha256: hash(bytes), rights: 'test rights' }]);
    validateImageLabels(config, digest, id => ({ Id: id, Config: { Labels: { 'io.ave.build-input-digest': digest } } }));
    assert.throws(() => validateConfig({ ...config, port: 6081 }), /invalid isolated port/);
    assert.throws(() => validateConfig({ ...config, project: 'ave-desktop' }), /project/);
    assert.throws(() => validateConfig({ ...config, desktopImage: 'ave-desktop:local' }), /exact image/);
    assert.throws(() => validateConfig({ ...config, sources: [config.sources[0], config.sources[0]] }), /unique/);
    assert.throws(() => validateSources({ sources: [{ ...config.sources[0], sha256: '0'.repeat(64) }] }, root), /identity mismatch/);
    assert.throws(() => validateSources(config, other), /source outside/);
    assert.throws(() => validateImageLabels(config, digest, id => ({ Id: id, Config: { Labels: {} } })), /build identity differs/);
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(other, { recursive: true, force: true }); }
});

test('P5 media expansion allows only exact verified additions and preserves all non-media limits', () => {
  const prev = {
    version: 1, project: 'ave-p5-test', limitMicroCny: 100_000_000,
    inputsManifestHash: hash('old-inputs'), sampleReceiptHash: hash('old-samples'),
    assetHashes: [hash('old-asset')], imageHashes: [hash('old-image')],
    models: { vision: { price: 3, maxTokens: 10 } }, audioDownloads: [{ url: 'https://example.org/verified' }],
  };
  const newAsset = hash('verified-performance'), newImage = hash('verified-frame');
  const next = structuredClone(prev);
  next.inputsManifestHash = hash('new-inputs'); next.sampleReceiptHash = hash('new-samples');
  next.assetHashes = [...prev.assetHashes, newAsset]; next.imageHashes = [...prev.imageHashes, newImage];
  assert.equal(performancePolicyDigest(prev), policyDigest(prev));
  assert.equal(validateExactMediaAddition(prev, next, [newAsset], [newImage]), true);
  const mutate = change => { const value = structuredClone(next); change(value); return value; };
  assert.throws(() => validateExactMediaAddition(prev, mutate(value => value.assetHashes.push(hash('unverified'))), [newAsset], [newImage]), /do not match verified media/);
  assert.throws(() => validateExactMediaAddition(prev, mutate(value => value.imageHashes.push(hash('unverified-frame'))), [newAsset], [newImage]), /do not match verified media/);
  assert.throws(() => validateExactMediaAddition(prev, mutate(value => value.assetHashes.shift()), [newAsset], [newImage]), /do not match verified media/);
  assert.throws(() => validateExactMediaAddition(prev, mutate(value => value.imageHashes.pop()), [newAsset], [newImage]), /do not match verified media/);
  assert.throws(() => validateExactMediaAddition(prev, mutate(value => value.limitMicroCny++), [newAsset], [newImage]), /non-media policy changed/);
  assert.throws(() => validateExactMediaAddition(prev, mutate(value => value.models.vision.price++), [newAsset], [newImage]), /non-media policy changed/);
  assert.throws(() => validateExactMediaAddition(prev, mutate(value => value.audioDownloads.push({ url: 'https://example.org/other' })), [newAsset], [newImage]), /non-media policy changed/);
  assert.throws(() => validateExactMediaAddition(prev, mutate(value => { value.sampleReceiptHash = prev.sampleReceiptHash; }), [newAsset], [newImage]), /invalid evidence digest/);
  assert.throws(() => validateExactMediaAddition(prev, mutate(value => value.imageHashes.push(newImage)), [newAsset], [newImage]), /invalid media list/);
  assert.throws(() => validateExactMediaAddition(prev, next, [newAsset], []), /invalid expected additions/);
});

test('P5 performance sample bytes, source and geometry are checked before authorization', () => {
  const png = Buffer.alloc(24); Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
  png.writeUInt32BE(720, 16); png.writeUInt32BE(406, 20);
  const source = hash('performance');
  const entry = { input: 'piccolo-performance.mp4', source_digest: source, content_digest: hash(png), bytes: png.length, file: 'piccolo-performance/frame-0.png' };
  const inputs = [{ file: entry.input, sha256: source }];
  checkWorkerSample(entry, png, inputs, 'piccolo-performance/');
  assert.throws(() => checkWorkerSample({ ...entry, source_digest: hash('other') }, png, inputs, 'piccolo-performance/'), /sample source mismatch/);
  assert.throws(() => checkWorkerSample({ ...entry, file: 'piccolo-performance/../other.png' }, png, inputs, 'piccolo-performance/'), /invalid sample path/);
  assert.throws(() => checkWorkerSample({ ...entry, bytes: 25 }, png, inputs, 'piccolo-performance/'), /sample bytes mismatch/);
  assert.throws(() => checkWorkerSample(entry, Buffer.alloc(24), inputs, 'piccolo-performance/'), /sample bytes mismatch/);
  const oversized = Buffer.from(png); oversized.writeUInt32BE(769, 16);
  assert.throws(() => checkWorkerSample({ ...entry, content_digest: hash(oversized) }, oversized, inputs, 'piccolo-performance/'), /sample geometry outside limit/);
});

test('P5 combined input paths reject extras, aliases and replaced performance sources', () => {
  const files = ['visitors-main.mp4', 'coast-main.mp4', 'visitors-holdout.mp4', 'coast-holdout.mp4', 'coast-photo.png', 'interview-audio.wav'];
  const performance = { file: 'piccolo-performance.mp4', relative_path: 'performance-fixture-r1/piccolo-performance.mp4', source_id: 'D01', sha256: 'e1c777bb33e1eec7d68b63b598c5a9b751347bac47a12d2a6c7ed15c00e25677' };
  const inputs = [...files.map(file => ({ file })), performance];
  assert.deepEqual(resolvePerformanceInputPaths(inputs), [...files.map(file => `inputs/${file}`), performance.relative_path]);
  assert.throws(() => resolvePerformanceInputPaths([...inputs, { file: 'extra.mp4' }]), /unexpected baseline inputs/);
  assert.throws(() => resolvePerformanceInputPaths([{ ...inputs[0], relative_path: '../outside' }, ...inputs.slice(1)]), /unexpected baseline input path/);
  assert.throws(() => resolvePerformanceInputPaths([...inputs.slice(0, 6), { ...performance, relative_path: '../outside' }]), /unexpected performance input/);
  assert.throws(() => resolvePerformanceInputPaths([...inputs.slice(0, 6), { ...performance, sha256: hash('replacement') }]), /unexpected performance input/);
});
import './p5-run-resume.test.mjs';
