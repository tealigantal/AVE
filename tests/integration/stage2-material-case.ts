import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { builtInDurationBlueprints } from '../../packages/core/editorial-core/src/public.js';

// External test input, never a new product protocol or project-state authority.
export type MaterialCase = {
  case_id: string; blueprint_id: 'duration-2m-v1' | 'duration-60s-v1'; event: string;
  provenance: { kind: 'system' | 'human-reviewed' | 'deterministic-fixture'; author: string; method: string };
  assets: { id: string; path: string; sha256: string; independent_original: boolean; authorization: string }[];
  contract: { goal: string; audience: string[]; requirements: { id: string; statement: string }[]; forbidden: string[] };
  evidence: { id: string; asset: string; start: number; end: number; timescale: number; observation: string; interpretation: string; uncertainty: string[]; supports: { requirement: string; reason: string }[]; provenance: string; protected: boolean }[];
  candidates: { id: string; title: string; thesis: string; tradeoff: string; beats: { id: string; role: string; purpose: string; evidence: string[] }[] }[];
  feedback: { candidate: string; evidence: string; trim_pts: number; reason: string; preserved_facts: string[] };
};
export function materialCaseBlueprint(c: Pick<MaterialCase, 'blueprint_id'>) {
  assert.ok(['duration-2m-v1', 'duration-60s-v1'].includes(c.blueprint_id), 'UNSUPPORTED_MATERIAL_CASE_BLUEPRINT');
  return builtInDurationBlueprints.find(x => x.blueprint_id === c.blueprint_id)!;
}
export async function fileHash(path: string) { const h = createHash('sha256'); for await (const chunk of createReadStream(path)) h.update(chunk); return h.digest('hex'); }
export function externalPath(path: string) { assert.ok(isAbsolute(path), 'absolute external path required'); const r = relative(resolve('.'), resolve(path)); assert.ok(r.startsWith('..') || isAbsolute(r), 'private inputs and review outputs must be outside repository'); return resolve(path); }
const text = (s: unknown) => assert.ok(typeof s === 'string' && s.trim().length > 0, 'content or provenance missing');
export function evidenceDuration(e: MaterialCase['evidence'][number]) { return (e.end - e.start) / e.timescale; }
export function validateMaterialCase(c: MaterialCase, synthetic = false) {
  const blueprint = materialCaseBlueprint(c); text(c.case_id); text(c.event); text(c.provenance.author); text(c.provenance.method);
  assert.ok(['system', 'human-reviewed', ...(synthetic ? ['deterministic-fixture'] : [])].includes(c.provenance.kind), 'deterministic data cannot stand for real material');
  assert.ok(c.assets.length >= (c.blueprint_id === 'duration-2m-v1' ? 6 : 1), c.blueprint_id === 'duration-2m-v1' ? 'MAIN_CASE_REQUIRES_SIX_INDEPENDENT_ORIGINALS' : 'REVIEW_CASE_REQUIRES_REAL_SOURCE');
  assert.equal(new Set(c.assets.map(a => a.id)).size, c.assets.length);
  assert.equal(new Set(c.assets.map(a => a.sha256)).size, c.assets.length, 'duplicate originals are not independent assets');
  for (const a of c.assets) { text(a.id); assert.match(a.sha256, /^[a-f0-9]{64}$/); assert.equal(a.independent_original, true); text(a.authorization); }
  text(c.contract.goal); assert.ok(c.contract.requirements.length > 0); assert.ok(c.contract.forbidden.length > 0);
  assert.equal(new Set(c.contract.requirements.map(r => r.id)).size, c.contract.requirements.length);
  assert.ok(c.evidence.length >= 12, 'MAIN_CASE_REQUIRES_CONTENT_SELECTION_SPACE');
  assert.equal(new Set(c.evidence.map(e => e.id)).size, c.evidence.length);
  const byId = new Map(c.evidence.map(e => [e.id, e]));
  assert.equal(new Set(c.evidence.map(e => e.asset)).size, c.assets.length, 'each declared asset must contribute actual content Evidence');
  for (const e of c.evidence) {
    assert.ok(c.assets.some(a => a.id === e.asset)); text(e.observation); text(e.provenance);
    assert.ok([e.start, e.end, e.timescale].every(Number.isSafeInteger) && e.start >= 0 && e.end > e.start && e.timescale > 0, 'exact source range required');
    assert.ok(Array.isArray(e.uncertainty));
    for (const s of e.supports) { assert.ok(c.contract.requirements.some(r => r.id === s.requirement)); text(s.reason); }
  }
  for (const r of c.contract.requirements) assert.ok(c.evidence.some(e => e.supports.some(s => s.requirement === r.id)), `MISSING_REQUIRED_EVIDENCE:${r.id}`);
  assert.equal(c.candidates.length, 2); assert.notEqual(c.candidates[0]!.id, c.candidates[1]!.id);
  const orders: string[][] = [];
  for (const p of c.candidates) {
    assert.match(p.id, /^[a-z0-9][a-z0-9-]{0,48}$/, 'candidate id must be a safe directory slug');
    text(p.title); text(p.thesis); text(p.tradeoff);
    assert.ok(p.beats.length >= blueprint.beat_count.minimum && p.beats.length <= blueprint.beat_count.maximum);
    assert.equal(p.beats.length, Math.min(blueprint.beat_count.maximum, Math.max(blueprint.beat_count.minimum, c.evidence.length)), 'Beat count must equal current Duration Feasibility');
    const order = p.beats.flatMap(b => b.evidence); orders.push(order);
    assert.equal(new Set(order).size, order.length, 'repeated Evidence cannot pad the film');
    const used = order.map(id => { assert.ok(byId.has(id), `unknown Evidence:${id}`); return byId.get(id)!; });
    // Exact rational comparison, not floating-point duration tolerance.
    const timescale = used.reduce((n, e) => n * BigInt(e.timescale), 1n);
    assert.equal(used.reduce((n, e) => n + BigInt(e.end - e.start) * (timescale / BigInt(e.timescale)), 0n), BigInt(blueprint.target_duration.value) * timescale / BigInt(blueprint.target_duration.timescale), `approved full cut must be exactly ${blueprint.target_duration.value / blueprint.target_duration.timescale} seconds`);
    for (const a of c.assets) {
      const ranges = used.filter(e => e.asset === a.id).sort((x, y) => x.start / x.timescale - y.start / y.timescale);
      for (let i = 1; i < ranges.length; i++) assert.ok(BigInt(ranges[i-1]!.end) * BigInt(ranges[i]!.timescale) <= BigInt(ranges[i]!.start) * BigInt(ranges[i-1]!.timescale), 'overlapping source ranges cannot pad a story');
    }
    for (const r of c.contract.requirements) assert.ok(used.some(e => e.supports.some(s => s.requirement === r.id)), `CANDIDATE_MISSING_REQUIREMENT:${r.id}`);
    for (const role of blueprint.beat_roles) {
      const ticks = p.beats.filter(b => b.role === role.role_id).flatMap(b => b.evidence).reduce((n, id) => {
        const e = byId.get(id)!;
        return n + BigInt(e.end - e.start) * (timescale / BigInt(e.timescale));
      }, 0n);
      assert.ok(ticks * BigInt(role.minimum_duration.timescale) >= BigInt(role.minimum_duration.value) * timescale && ticks * BigInt(role.maximum_duration.timescale) <= BigInt(role.maximum_duration.value) * timescale, `ROLE_BUDGET:${role.role_id}`);
    }
    for (const b of p.beats) { text(b.purpose); assert.ok(blueprint.beat_roles.some(r => r.role_id === b.role)); assert.ok(b.evidence.length > 0); }
    assert.equal(p.beats.at(-1)!.role, 'ending');
  }
  const contentKey = (id: string) => { const e = byId.get(id)!; const gcd = (a: bigint, b: bigint): bigint => b ? gcd(b, a % b) : a; const rational = (n: number) => { const d = gcd(BigInt(n), BigInt(e.timescale)); return `${BigInt(n)/d}/${BigInt(e.timescale)/d}`; }; return `${c.assets.find(a => a.id === e.asset)!.sha256}:${rational(e.start)}:${rational(e.end)}`; };
  for (let i = 0; i < orders.length; i++) orders[i] = orders[i]!.map(contentKey);
  const openingChanged = c.candidates[0]!.beats[0]!.evidence.map(contentKey).join() !== c.candidates[1]!.beats[0]!.evidence.map(contentKey).join();
  const selectionChanged = [...orders[0]!].sort().join() !== [...orders[1]!].sort().join();
  const orderChanged = orders[0]!.filter(id => orders[1]!.includes(id)).join() !== orders[1]!.filter(id => orders[0]!.includes(id)).join();
  assert.ok([openingChanged, selectionChanged, orderChanged].filter(Boolean).length >= 2, 'CANDIDATES_NEED_TWO_CONTENT_DIFFERENCES');
  const selected = c.candidates.find(p => p.id === c.feedback.candidate); assert.ok(selected);
  assert.equal(selected.beats.at(-1)!.evidence.at(-1), c.feedback.evidence, 'positive trim must target the actual final clip without ripple');
  const tail = byId.get(c.feedback.evidence)!; assert.equal(tail.protected, false, 'protected ending cannot be trimmed');
  const first = byId.get(selected.beats[0]!.evidence[0]!)!;
  assert.equal(tail.timescale, first.timescale, 'FEEDBACK_TRIM_TIMEBASE_UNSUPPORTED: current tail trim requires the Timeline source tick');
  assert.ok(Number.isSafeInteger(c.feedback.trim_pts) && c.feedback.trim_pts > 0 && c.feedback.trim_pts < tail.end - tail.start);
  assert.ok(tail.end - tail.start - c.feedback.trim_pts > 1, 'rejected suggestion must still be a legal nonempty inward trim');
  const trim = c.feedback.trim_pts / tail.timescale;
  const ending = selected.beats.filter(b => b.role === 'ending').flatMap(b => b.evidence).reduce((n, id) => n + evidenceDuration(byId.get(id)!), 0);
  assert.ok(ending - trim - 1 / tail.timescale >= blueprint.ending_contract.reserve.value / blueprint.ending_contract.reserve.timescale, 'FEEDBACK_ENDING_RESERVE');
  assert.ok(trim + 1 / tail.timescale <= blueprint.acceptable_variance.value / blueprint.acceptable_variance.timescale, 'FEEDBACK_DURATION_VARIANCE');
  text(c.feedback.reason); assert.ok(c.feedback.preserved_facts.length > 0);
  return c;
}
export async function loadMaterialCase(manifestPath: string): Promise<MaterialCase> {
  const manifest = JSON.parse(await readFile(externalPath(manifestPath), 'utf8'));
  assert.ok(manifest.stage2_case, 'STAGE2_MATERIAL_CASE_REQUIRED: single-source legacy manifest is insufficient');
  const c = validateMaterialCase(manifest.stage2_case);
  for (const a of c.assets) assert.equal(await fileHash(externalPath(a.path)), a.sha256, `SOURCE_HASH_MISMATCH:${a.id}`);
  return c;
}
