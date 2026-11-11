import { lstatSync, readFileSync, realpathSync, writeFileSync, existsSync } from 'node:fs';
import { isAbsolute, join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256, runRoot, verifyInputs } from './sources.mjs';

// Fixed P5 C5 evidence anchors. A caller cannot authorize an arbitrary source.
const TRUSTED = Object.freeze({
  baselinePolicy: 'c624e9897f9986320a47e7df8c3fb8c01f5fac9c95830e8bc42885b6db378b69',
  fixtureReceipt: 'cfa91a0a4ede3c785003588362fbf35b32bfa4784411ec73467ed6e80772c999',
  original: '340ce53a831f1ce644aafc48aefa302b7b79dc89b74b83f9cd5684998094efc3',
  derived: 'e1c777bb33e1eec7d68b63b598c5a9b751347bac47a12d2a6c7ed15c00e25677',
  sampleInput: 'c6b49f8f810b13c558bb27bc8ac6e2ec7d64cdb8267cfc8af7804486e8e0343b',
  sampleReceipt: '1732b278a5975b31f4eaa7c776214eb5d42cdad37278b58f3859fc360ca194df',
  page: 'https://www.dvidshub.net/video/292413/piccolo-solo',
  media: 'https://d34w7g4gy10iej.cloudfront.net/video/1306/DOD_100830046/DOD_100830046-720x406-800k.mp4',
  restrictions: 'https://www.dvidshub.net/about/copyright',
});
const PATHS = Object.freeze({
  baselineInputs: 'inputs-manifest.json', baselineSamples: 'samples-r1/receipt.json',
  fixtureReceipt: 'performance-fixture-r1/receipt-r2.json',
  sampleInput: 'performance-fixture-r1/sample-input-r1.json',
  performanceSamples: 'performance-samples-r1/receipt.json',
  baselinePolicy: 'baseline-policy-performance-r1.json',
  nextInputs: 'inputs-manifest-performance-r1.json', nextSamples: 'samples-performance-r1.json',
  candidate: 'candidate-policy-performance-r1.json', evidence: 'candidate-evidence-performance-r1.json',
});
const hashPattern = /^[a-f0-9]{64}$/;
const validHash = value => typeof value === 'string' && hashPattern.test(value);
const fail = reason => { throw Error(`P5_PERFORMANCE_AMENDMENT: ${reason}`); };
const jsonBytes = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const sortedUnique = values => [...new Set(values)].sort();
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
export const performancePolicyDigest = policy => sha256(canonical(policy));

function readScoped(root, name) {
  if (typeof name !== 'string' || !name || isAbsolute(name) || name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..')) fail('unsafe evidence path');
  const base = realpathSync(root), path = join(base, ...name.split('/'));
  const rel = relative(base, path);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail('evidence path outside run root');
  let cursor = base;
  const parts = name.split('/');
  for (let i = 0; i < parts.length; i++) {
    cursor = join(cursor, parts[i]);
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink() || (i === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) fail('evidence path is not an ordinary file');
  }
  return readFileSync(path);
}

export function checkWorkerSample(entry, bytes, inputs, expectedPrefix) {
  if (!entry || typeof entry !== 'object' || !/^[a-z0-9-]+\.(mp4|png|wav)$/.test(entry.input ?? '') || !validHash(entry.source_digest) || !validHash(entry.content_digest) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1) fail('invalid sample identity');
  if (!inputs.some(input => input.file === entry.input && input.sha256 === entry.source_digest)) fail('sample source mismatch');
  if (typeof entry.file !== 'string' || !entry.file.startsWith(expectedPrefix) || entry.file.includes('..') || entry.file.includes('\\')) fail('invalid sample path');
  if (bytes.length !== entry.bytes || sha256(bytes) !== entry.content_digest || bytes.length < 24 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') fail('sample bytes mismatch');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height || width > 768 || height > 768) fail('sample geometry outside limit');
}

// Called only after the pinned evidence verifier has accepted the combined
// manifest. Keep local paths explicit instead of accepting manifest paths.
export function resolvePerformanceInputPaths(inputs) {
  const baseline = ['visitors-main.mp4', 'coast-main.mp4', 'visitors-holdout.mp4', 'coast-holdout.mp4', 'coast-photo.png', 'interview-audio.wav'];
  if (!Array.isArray(inputs) || inputs.length !== 7 || inputs.some(input => !input || typeof input !== 'object') || !equal(inputs.slice(0, 6).map(input => input.file), baseline)) fail('unexpected baseline inputs');
  const performance = inputs[6];
  if (performance.file !== 'piccolo-performance.mp4' || performance.relative_path !== 'performance-fixture-r1/piccolo-performance.mp4' || performance.source_id !== 'D01' || performance.sha256 !== TRUSTED.derived) fail('unexpected performance input');
  if (inputs.slice(0, 6).some(input => Object.hasOwn(input, 'relative_path'))) fail('unexpected baseline input path');
  return [...baseline.map(file => `inputs/${file}`), performance.relative_path];
}

// Pure set-boundary validation is not proof of source authorization; only
// verifyPerformanceAmendment reads pinned source and sample bytes.
export function validateExactMediaAddition(previous, next, expectedAssets, expectedImages) {
  if (!previous || !next || typeof previous !== 'object' || typeof next !== 'object' || Array.isArray(previous) || Array.isArray(next)) fail('invalid policy');
  for (const name of ['inputsManifestHash', 'sampleReceiptHash']) if (!validHash(previous[name]) || !validHash(next[name]) || previous[name] === next[name]) fail('invalid evidence digest');
  for (const [name, additions] of [['assetHashes', expectedAssets], ['imageHashes', expectedImages]]) {
    if (!Array.isArray(previous[name]) || !Array.isArray(next[name]) || [...previous[name], ...next[name]].some(value => !validHash(value)) || new Set(previous[name]).size !== previous[name].length || new Set(next[name]).size !== next[name].length) fail('invalid media list');
    if (!Array.isArray(additions) || !additions.length || additions.some(value => !validHash(value)) || new Set(additions).size !== additions.length || additions.some(value => previous[name].includes(value))) fail('invalid expected additions');
    if (!equal(sortedUnique(next[name]), sortedUnique([...previous[name], ...additions]))) fail(`${name} additions do not match verified media`);
  }
  const comparable = policy => Object.fromEntries(Object.entries(policy).filter(([name]) => !['inputsManifestHash', 'sampleReceiptHash', 'imageHashes', 'assetHashes'].includes(name)));
  if (canonical(comparable(previous)) !== canonical(comparable(next))) fail('non-media policy changed');
  return true;
}

function buildCandidate(root, previous) {
  if (performancePolicyDigest(previous) !== TRUSTED.baselinePolicy) fail('baseline policy differs from frozen task policy');
  const verifiedInputs = verifyInputs(root);
  const baselineInputsBytes = readScoped(root, PATHS.baselineInputs);
  const baselineSamplesBytes = readScoped(root, PATHS.baselineSamples);
  if (sha256(baselineInputsBytes) !== previous.inputsManifestHash || sha256(baselineSamplesBytes) !== previous.sampleReceiptHash) fail('baseline evidence differs from active policy');
  const baselineInputs = JSON.parse(baselineInputsBytes), baselineSamples = JSON.parse(baselineSamplesBytes);
  if (!equal(baselineInputs, verifiedInputs) || baselineInputs.inputs.length !== 6 || baselineSamples.schema_version !== 1 || baselineSamples.inputs_manifest_sha256 !== previous.inputsManifestHash || baselineSamples.scene_threshold !== 12 || baselineSamples.max_frame_edge !== 768 || !Array.isArray(baselineSamples.entries) || baselineSamples.entries.length !== 52) fail('invalid baseline input or sample receipt');
  for (const input of baselineInputs.inputs) {
    const bytes = readScoped(root, `inputs/${input.file}`);
    if (bytes.length !== input.bytes || sha256(bytes) !== input.sha256) fail('baseline input bytes mismatch');
  }
  for (const sample of baselineSamples.entries) checkWorkerSample(sample, readScoped(root, `samples-r1/${sample.file}`), baselineInputs.inputs, `${sample.input.replace(/\.[^.]+$/, '')}/`);
  const baselineImageHashes = baselineSamples.entries.map(sample => sample.content_digest);
  if (new Set(baselineImageHashes).size !== 52 || !equal(sortedUnique(baselineImageHashes), sortedUnique(previous.imageHashes))) fail('baseline sample set differs from policy');
  if (!baselineInputs.inputs.every(input => previous.assetHashes.includes(input.sha256))) fail('baseline asset missing from policy');

  const fixtureBytes = readScoped(root, PATHS.fixtureReceipt), inputBytes = readScoped(root, PATHS.sampleInput), sampleBytes = readScoped(root, PATHS.performanceSamples);
  if (sha256(fixtureBytes) !== TRUSTED.fixtureReceipt || sha256(inputBytes) !== TRUSTED.sampleInput || sha256(sampleBytes) !== TRUSTED.sampleReceipt) fail('pinned performance evidence changed');
  const fixture = JSON.parse(fixtureBytes), performanceInput = JSON.parse(inputBytes), performanceSamples = JSON.parse(sampleBytes);
  if (fixture.schema_version !== 1 || fixture.source?.page !== TRUSTED.page || fixture.source?.media !== TRUSTED.media || fixture.source?.stated_rights !== 'PUBLIC DOMAIN' || fixture.source?.restrictions_url !== TRUSTED.restrictions || fixture.original?.file !== 'piccolo-original.mp4' || fixture.original?.sha256 !== TRUSTED.original || fixture.derived?.file !== 'piccolo-performance.mp4' || fixture.derived?.sha256 !== TRUSTED.derived) fail('performance source or rights mismatch');
  for (const part of [fixture.original, fixture.derived]) {
    const bytes = readScoped(root, `performance-fixture-r1/${part.file}`);
    if (!Number.isSafeInteger(part.bytes) || bytes.length !== part.bytes || sha256(bytes) !== part.sha256) fail('performance original or derivative changed');
  }
  const expectedSampleInput = { file: fixture.derived.file, bytes: fixture.derived.bytes, sha256: TRUSTED.derived };
  if (performanceInput.schema_version !== 1 || !equal(performanceInput.inputs, [expectedSampleInput])) fail('performance sample input mismatch');
  if (performanceSamples.schema_version !== 1 || performanceSamples.inputs_manifest_sha256 !== TRUSTED.sampleInput || performanceSamples.scene_threshold !== 12 || performanceSamples.max_frame_edge !== 768 || !Array.isArray(performanceSamples.entries) || performanceSamples.entries.length !== 3) fail('incomplete Worker sample receipt');
  for (const sample of performanceSamples.entries) checkWorkerSample(sample, readScoped(root, `performance-samples-r1/${sample.file}`), [expectedSampleInput], 'piccolo-performance/');
  const additions = performanceSamples.entries.map(sample => sample.content_digest);
  if (new Set(additions).size !== 3) fail('duplicate performance samples');

  const performance = { file: fixture.derived.file, relative_path: `performance-fixture-r1/${fixture.derived.file}`, source_id: 'D01', original_sha256: fixture.original.sha256, source_page: fixture.source.page, license: fixture.source.stated_rights, bytes: fixture.derived.bytes, sha256: fixture.derived.sha256, command: fixture.derived.command };
  if (baselineInputs.inputs.some(input => input.file === performance.file)) fail('performance input name already present');
  const nextInputs = { schema_version: 1, baseline_manifest_sha256: sha256(baselineInputsBytes), fixture_receipt_sha256: TRUSTED.fixtureReceipt, inputs: [...baselineInputs.inputs, performance] };
  resolvePerformanceInputPaths(nextInputs.inputs);
  const nextInputBytes = jsonBytes(nextInputs);
  const nextSamples = { schema_version: 1, inputs_manifest_sha256: sha256(nextInputBytes), baseline_sample_receipt_sha256: sha256(baselineSamplesBytes), performance_sample_receipt_sha256: TRUSTED.sampleReceipt, scene_threshold: 12, max_frame_edge: 768, entries: [...baselineSamples.entries.map(sample => ({ ...sample, file: `samples-r1/${sample.file}` })), ...performanceSamples.entries.map(sample => ({ ...sample, file: `performance-samples-r1/${sample.file}` }))] };
  const nextSampleBytes = jsonBytes(nextSamples);
  const next = structuredClone(previous);
  next.inputsManifestHash = sha256(nextInputBytes);
  next.sampleReceiptHash = sha256(nextSampleBytes);
  next.assetHashes = sortedUnique([...previous.assetHashes, TRUSTED.derived]);
  next.imageHashes = sortedUnique([...previous.imageHashes, ...additions]);
  validateExactMediaAddition(previous, next, [TRUSTED.derived], additions);
  const evidence = { version: 1, kind: 'p5-performance-media-addition', fixture_receipt_sha256: TRUSTED.fixtureReceipt, original_sha256: TRUSTED.original, derived_sha256: TRUSTED.derived, baseline_inputs_sha256: previous.inputsManifestHash, baseline_samples_sha256: previous.sampleReceiptHash, performance_sample_input_sha256: TRUSTED.sampleInput, performance_sample_receipt_sha256: TRUSTED.sampleReceipt, next_inputs_sha256: next.inputsManifestHash, next_samples_sha256: next.sampleReceiptHash, previous_policy_sha256: performancePolicyDigest(previous), next_policy_sha256: performancePolicyDigest(next) };
  return { next, evidence, nextInputBytes, nextSampleBytes };
}

function writeExactOnce(path, bytes) {
  if (existsSync(path)) { if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink() || !readFileSync(path).equals(bytes)) fail('candidate artifact already exists with different bytes'); return; }
  writeFileSync(path, bytes, { flag: 'wx' });
}

// Prepares reviewable candidates only. It does not open or mutate the ledger,
// switch the active policy, or authorize a model call.
export function preparePerformanceAmendment(root, previous) {
  const candidate = buildCandidate(root, previous);
  const active = readScoped(root, 'guard-policy.json');
  if (!equal(JSON.parse(active), previous)) fail('active baseline policy differs');
  writeExactOnce(join(root, PATHS.baselinePolicy), active);
  writeExactOnce(join(root, PATHS.nextInputs), candidate.nextInputBytes);
  writeExactOnce(join(root, PATHS.nextSamples), candidate.nextSampleBytes);
  writeExactOnce(join(root, PATHS.candidate), jsonBytes(candidate.next));
  writeExactOnce(join(root, PATHS.evidence), jsonBytes(candidate.evidence));
  return { policy: candidate.next, evidence: candidate.evidence };
}

// The production evidence entry recomputes from pinned source and sample
// bytes and requires the persisted candidate documents to match exactly.
export function verifyPerformanceAmendment(root, previous, next, evidence) {
  const candidate = buildCandidate(root, previous);
  const savedBaseline = JSON.parse(readScoped(root, PATHS.baselinePolicy));
  if (!equal(previous, savedBaseline) || !equal(next, candidate.next) || !equal(evidence, candidate.evidence) || !readScoped(root, PATHS.nextInputs).equals(candidate.nextInputBytes) || !readScoped(root, PATHS.nextSamples).equals(candidate.nextSampleBytes) || !readScoped(root, PATHS.candidate).equals(jsonBytes(candidate.next)) || !readScoped(root, PATHS.evidence).equals(jsonBytes(candidate.evidence))) fail('candidate policy or evidence mismatch');
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || !['prepare', 'verify'].includes(process.argv[2])) fail('usage: node scripts/p5/performance-amendment.mjs <prepare|verify>');
  const previous = JSON.parse(readScoped(runRoot, process.argv[2] === 'prepare' ? 'guard-policy.json' : PATHS.baselinePolicy));
  if (process.argv[2] === 'prepare') {
    const result = preparePerformanceAmendment(runRoot, previous);
    console.log(JSON.stringify({ previous_policy: result.evidence.previous_policy_sha256, candidate_policy: result.evidence.next_policy_sha256, inputs: 7, samples: 55 }));
  } else {
    const next = JSON.parse(readScoped(runRoot, PATHS.candidate)), evidence = JSON.parse(readScoped(runRoot, PATHS.evidence));
    verifyPerformanceAmendment(runRoot, previous, next, evidence);
    console.log(JSON.stringify({ candidate_policy: evidence.next_policy_sha256, verified: true }));
  }
}
