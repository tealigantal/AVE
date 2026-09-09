import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { validateMaterialCase, fileHash, type MaterialCase } from './stage2-material-case.js';
import { runMaterialCase } from './stage2-material-run.js';
import { reviewMaterialCaseInElectron } from './stage2-electron-review.js';

const c: MaterialCase = {
  case_id: 'deterministic-case-validation', blueprint_id: 'duration-2m-v1', event: 'synthetic protocol fixtures, no real event',
  provenance: { kind: 'deterministic-fixture', author: 'test', method: 'predefined engineering inputs, not media understanding' },
  assets: Array.from({ length: 6 }, (_, i) => ({ id: `asset-${i}`, path: '', sha256: String(i).repeat(64), independent_original: true, authorization: 'generated test content' })),
  contract: { goal: 'verify bounded compilation', audience: ['test'], requirements: [{ id: 'opening', statement: 'retain designated opening' }, { id: 'ending', statement: 'retain designated ending' }], forbidden: ['fabricated real-media claim'] },
  evidence: [], candidates: [], feedback: { candidate: 'a', evidence: 'e13', trim_pts: 48000, reason: 'shorten synthetic tail by one second', preserved_facts: ['synthetic ending still exceeds reserve'] },
};
const budgets = [10, 20, 20, 20, 16, 20, 14]; const roles = ['hook', 'context', 'development', 'development', 'turn', 'reflection', 'ending'];
const cursors = Array(6).fill(0);
for (let i = 0; i < 14; i++) {
  const asset = i % 6, length = budgets[Math.floor(i / 2)]! / 2 * 48000, start = cursors[asset]; cursors[asset] += length;
  c.evidence.push({ id: `e${i}`, asset: `asset-${asset}`, start, end: cursors[asset], timescale: 48000, observation: `synthetic signal ${i}`, interpretation: 'test-only', uncertainty: [], supports: i < 2 ? [{ requirement: 'opening', reason: 'designated fixture' }] : i >= 12 ? [{ requirement: 'ending', reason: 'designated fixture' }] : [], provenance: 'deterministic-fixture', protected: false });
}
for (let i = 14; i < 16; i++) c.evidence.push({ ...c.evidence[i-14]!, id: `e${i}`, start: 50 * 48000, end: 55 * 48000, observation: `alternative synthetic signal ${i}` });
const beats = budgets.flatMap((_, i) => (i < 3 ? [[`e${i*2}`], [`e${i*2+1}`]] : [[`e${i*2}`, `e${i*2+1}`]]).map((evidence, j) => ({ id: `beat-${i}-${j}`, role: roles[i]!, purpose: 'verify exact range compilation', evidence })));
c.candidates = [{ id: 'a', title: 'A', thesis: 'fixture order', tradeoff: 'first signals', beats }, { id: 'b', title: 'B', thesis: 'different fixture selection', tradeoff: 'alternative opening and reordered context', beats: beats.map((b, i) => ({ ...b, evidence: i === 0 ? ['e14'] : i === 1 ? ['e15'] : i === 2 ? ['e3'] : i === 3 ? ['e2'] : b.evidence })) }];
validateMaterialCase(c, true);
assert.throws(() => validateMaterialCase(c), /deterministic data/);
const mutate = (f: (v: MaterialCase) => void, error: RegExp) => { const v = structuredClone(c); f(v); assert.throws(() => validateMaterialCase(v, true), error); };
mutate(v => { v.assets = v.assets.slice(0, 1); }, /SIX/);
mutate(v => { v.assets[1]!.sha256 = v.assets[0]!.sha256; }, /duplicate/);
mutate(v => { v.evidence.forEach(e => { e.supports = []; }); }, /MISSING_REQUIRED_EVIDENCE/);
mutate(v => { v.candidates[1]!.beats = structuredClone(v.candidates[0]!.beats); }, /TWO_CONTENT_DIFFERENCES/);
mutate(v => { v.feedback.trim_pts = 3 * 48000; }, /ENDING_RESERVE/);
mutate(v => { v.evidence[13]!.protected = true; }, /protected/);
mutate(v => { v.evidence[13]!.end -= 1; }, /120 seconds/);
console.log('Material-case protocol validation passed; no real media or human acceptance asserted');
// Explicit, optional end-to-end engineering run. Never a real fixture substitute.
if (process.env.AVE_STAGE2_CASE_SYNTHETIC === '1') {
  const root = await mkdtemp(resolve(tmpdir(), 'ave-material-case-engineering-'));
  for (const [i, a] of c.assets.entries()) {
    a.path = resolve(root, `${a.id}.mp4`);
    await promisify(execFile)('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', `testsrc2=size=160x90:rate=24:duration=60`, '-f', 'lavfi', '-i', `sine=frequency=${300+i*100}:sample_rate=48000:duration=60`, '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-shortest', a.path]);
    a.sha256 = await fileHash(a.path);
  }
  const results = await runMaterialCase(c, root);
  const humanProjects = await runMaterialCase(c, root, true);
  assert.equal(humanProjects.length, 2);
  const revised = results.find(result => result.label === 'after'); assert.ok(revised);
  const electronReview = resolve(root, 'electron-review'); await mkdir(electronReview);
  await reviewMaterialCaseInElectron(revised.project, electronReview, {
    goal: c.contract.goal, evidenceCount: c.evidence.length, duration: Number(revised.master.probe.format.duration),
  });
  console.log(`SYNTHETIC_MATERIAL_CASE_ROOT=${root}`);
}
