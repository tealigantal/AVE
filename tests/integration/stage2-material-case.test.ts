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
const broadCase = structuredClone(c);
for (const e of broadCase.evidence) if (!e.supports.some(s => s.requirement === "opening")) e.supports.push({ requirement: "opening", reason: "broad requirement supported by every item" });
validateMaterialCase(broadCase, true);
assert.throws(() => validateMaterialCase(c), /deterministic data/);
const mutate = (f: (v: MaterialCase) => void, error: RegExp) => { const v = structuredClone(c); f(v); assert.throws(() => validateMaterialCase(v, true), error); };
mutate(v => { v.assets = v.assets.slice(0, 1); }, /SIX/);
mutate(v => { v.assets[1]!.sha256 = v.assets[0]!.sha256; }, /duplicate/);
mutate(v => { v.evidence.forEach(e => { e.supports = []; }); }, /MISSING_REQUIRED_EVIDENCE/);
mutate(v => { v.candidates[1]!.beats = structuredClone(v.candidates[0]!.beats); }, /TWO_CONTENT_DIFFERENCES/);
mutate(v => { v.feedback.trim_pts = 3 * 48000; }, /ENDING_RESERVE/);
mutate(v => { v.evidence[13]!.protected = true; }, /protected/);
mutate(v => { v.evidence[13]!.end -= 1; }, /120 seconds/);
// Mixed-timescale role boundaries: total duration stays exactly 120 seconds.
const reflectionBoundary = (maximum: boolean, delta: number) => {
  const v = structuredClone(c), scale = 1_000_000_000_000_000;
  v.assets.push(...['a', 'b'].map(id => ({ ...c.assets[0]!, id, sha256: id.repeat(64) })));
  v.evidence[10] = { ...v.evidence[10]!, asset: 'a', start: 0, end: scale + delta, timescale: scale };
  v.evidence[12] = { ...v.evidence[12]!, asset: 'b', start: 0, end: 7 * scale - delta, timescale: scale };
  v.evidence[11]!.end = v.evidence[11]!.start + (maximum ? 27 : 19) * 48000;
  if (maximum) {
    for (const i of [0, 1, 14, 15]) v.evidence[i]!.end = v.evidence[i]!.start + 4 * 48000;
    for (const i of [2, 3]) v.evidence[i]!.end = v.evidence[i]!.start + 7 * 48000;
  }
  const next = new Map<string, number>();
  for (const e of v.evidence.filter(e => e.timescale === 48000)) {
    const duration = e.end - e.start; e.start = next.get(e.asset) ?? 0; e.end = e.start + duration; next.set(e.asset, e.end);
  }
  return v;
};
validateMaterialCase(reflectionBoundary(false, 0), true);
validateMaterialCase(reflectionBoundary(true, 0), true);
assert.throws(() => validateMaterialCase(reflectionBoundary(false, -1), true), /ROLE_BUDGET:reflection/);
assert.throws(() => validateMaterialCase(reflectionBoundary(true, 1), true), /ROLE_BUDGET:reflection/);
console.log('Material-case protocol validation passed; no real media or human acceptance asserted');
// Explicit bounded review of one 65-second source; the two-minute gate stays strict.
const shortCase: MaterialCase = { ...structuredClone(c), blueprint_id: 'duration-60s-v1', assets: [c.assets[0]!], evidence: [], candidates: [], feedback: { ...c.feedback, evidence: 'a-e13' } };
const shortBudgets = [7, 9, 8, 8, 8, 9, 11], shortRoles = ['hook', 'setup', 'development', 'development', 'development', 'turn', 'ending'];
for (const candidate of ['a', 'b']) {
  let cursor = candidate === 'a' ? 0 : 5 * 48000;
  const shortBeats = shortBudgets.map((seconds, i) => {
    const evidence = [0, 1].map(j => {
      const id = `${candidate}-e${i * 2 + j}`, start = cursor; cursor += seconds * 24000;
      shortCase.evidence.push({ ...c.evidence[0]!, id, asset: c.assets[0]!.id, start, end: cursor, supports: i === 0 ? [{ requirement: 'opening', reason: 'test opening' }] : i === 6 ? [{ requirement: 'ending', reason: 'test ending' }] : [] });
      return id;
    });
    return { id: `${candidate}-beat-${i}`, role: shortRoles[i]!, purpose: 'bounded source review', evidence };
  });
  shortCase.candidates.push({ id: candidate, title: candidate, thesis: 'preserve chronological source', tradeoff: 'different source opening and ending', beats: shortBeats });
}
validateMaterialCase(shortCase, true);
assert.throws(() => validateMaterialCase({ ...shortCase, blueprint_id: 'duration-2m-v1' }, true), /SIX/);
assert.throws(() => validateMaterialCase({ ...shortCase, blueprint_id: 'unknown' as any }, true), /UNSUPPORTED_MATERIAL_CASE_BLUEPRINT/);
assert.throws(() => validateMaterialCase({ ...shortCase, feedback: { ...shortCase.feedback, trim_pts: 2 * 48000 } }, true), /FEEDBACK_DURATION_VARIANCE/);
const badShortDuration = structuredClone(shortCase); badShortDuration.evidence[0]!.end--;
assert.throws(() => validateMaterialCase(badShortDuration, true), /60 seconds/);
console.log('Explicit single-source 60-second review validation passed; two-minute main-case requirements preserved');
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
