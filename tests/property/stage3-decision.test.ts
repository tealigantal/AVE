import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Ajv2020 as Ajv } from "ajv/dist/2020.js";
import { assertCreationDecisionV1, assertCreationPlanV1, compileCreationDecisionV1, creationDecisionSchema } from "../../packages/platform/contract-runtime/src/public.js";
import { compileCreationPlan, type CreationCompileContext } from "../../packages/core/edit-ir/src/public.js";
import { simulateCommands, type Timeline } from "../../packages/core/timeline-core/src/public.js";

const sample = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-decision.v1.json", "utf8"));
const identity = { plan_id: "compiled", request_id: "request", revision: 1, base_timeline_version: 0, input_digest: "a".repeat(64) };
const grid = { value: 1n, timescale: 30n };
const time = (value: number, timescale = 30) => ({ schema_version: 1, value, timescale });
const make = (target: number, windows: Array<{ capacity: number; weight?: number; exact?: boolean }>) => ({ ...structuredClone(sample), target_duration_ticks: target, shots: windows.map((window, index) => ({ ...structuredClone(sample.shots[0]), shot_id: `shot-${index}`, source_window: { ...structuredClone(sample.shots[0].source_window), start: time(0), end: time(window.capacity) }, timing: window.exact ? { kind: "exact" } : { kind: "weighted", weight: window.weight ?? 1 } })) });
const code = (expected: string) => (error: any) => error.code === expected;
const ticks = (plan: ReturnType<typeof compileCreationDecisionV1>) => plan.shots.map(shot => {
  const { start, end } = shot.source;
  const numerator = (BigInt(end.value) * BigInt(start.timescale) - BigInt(start.value) * BigInt(end.timescale)) * 30n;
  const denominator = BigInt(start.timescale) * BigInt(end.timescale);
  assert.equal(numerator % denominator, 0n); return Number(numerator / denominator);
});
assertCreationDecisionV1(sample);
const validator = new Ajv({ strict: true }).compile(creationDecisionSchema);
assert.equal(validator(sample), true);
assert.equal(JSON.stringify(creationDecisionSchema).includes("https://ai-vlog.local/contracts/"), false, "model schema is self-contained");
for (const mutate of [
  (value: any) => { delete value.decision_version; },
  (value: any) => { delete value.target_duration_ticks; },
  (value: any) => { value.shots[0].source = value.shots[0].source_window; delete value.shots[0].source_window; },
  (value: any) => { delete value.shots[0].timing; },
  (value: any) => { value.shots[0].timing.weight = 0; },
  (value: any) => { value.target_duration_ticks = Number.MAX_SAFE_INTEGER + 1; },
  (value: any) => { value.shots[0].timing = { kind: "exact", weight: 1 }; },
]) { const invalid: any = structuredClone(sample); mutate(invalid); assert.throws(() => assertCreationDecisionV1(invalid), code("CONTRACT_CREATION_DECISION_INVALID")); assert.equal(validator(invalid), false); }

assert.deepEqual(ticks(compileCreationDecisionV1(make(11, [{ capacity: 20 }, { capacity: 20 }, { capacity: 20 }]), identity, grid, null)), [4, 4, 3], "stable largest remainder ties follow shot order");
assert.deepEqual(ticks(compileCreationDecisionV1(make(12, [{ capacity: 2, weight: 100 }, { capacity: 30 }, { capacity: 30 }]), identity, grid, null)), [2, 5, 5], "saturated window redistributes its quota");
assert.deepEqual(ticks(compileCreationDecisionV1(make(12, [{ capacity: 4, exact: true }, { capacity: 30 }, { capacity: 30, weight: 3 }]), identity, grid, null)), [4, 3, 5]);
assert.throws(() => compileCreationDecisionV1(make(13, [{ capacity: 6 }, { capacity: 6 }]), identity, grid, null), code("CREATION_DECISION_CAPACITY_INSUFFICIENT"));
assert.throws(() => compileCreationDecisionV1(make(1, [{ capacity: 6 }, { capacity: 6 }]), identity, grid, null), code("CREATION_DECISION_CAPACITY_INSUFFICIENT"));
assert.throws(() => compileCreationDecisionV1(make(13, [{ capacity: 12, exact: true }]), identity, grid, null), code("CREATION_DECISION_CAPACITY_INSUFFICIENT"));
assert.throws(() => compileCreationDecisionV1(make(30, [{ capacity: 90 }]), identity, grid, { minimum_total_ticks: "60", maximum_total_ticks: "90" }), code("CREATION_DURATION_TARGET_UNMET"));

const mixedTimes = make(576000, [{ capacity: 1 }, { capacity: 1 }]);
for (const shot of mixedTimes.shots) shot.source_window = { ...shot.source_window, start: time(1001, 30000), end: time(600600, 30000) };
const before = JSON.stringify(mixedTimes);
const mixed = compileCreationDecisionV1(mixedTimes, identity, { value: 1n, timescale: 24000n }, { minimum_total_ticks: "576000", maximum_total_ticks: "576000" });
assert.equal(JSON.stringify(mixedTimes), before, "compilation does not mutate the audited proposal");
assert.deepEqual(mixed.shots[0]!.source.start, mixedTimes.shots[0].source_window.start, "source start is never snapped to a Timeline origin");
assert.deepEqual(mixed.shots[0]!.source.end, time(361001, 30000), "12 seconds added exactly despite distinct source and Timeline grids");
assertCreationPlanV1(mixed);
const crossGrid = structuredClone(mixedTimes);
crossGrid.shots[1].timing.weight = 3;
const crossPlan = compileCreationDecisionV1(crossGrid, identity, { value: 1n, timescale: 24000n }, null);
const base: Timeline = { version: 0, tracks: [], sequence: { sequence_id: "mixed-grid", timebase: { value: 1n, timescale: 24000n }, tracks: [] } };
const sourceSpan = crossPlan.shots[0]!.source;
const compileContext: CreationCompileContext = { request_id: identity.request_id, revision: identity.revision, input_digest: identity.input_digest, authorized_asset_ids: [sourceSpan.asset_id], protected_refs: [], principle_ids: [], spans: [{ span_id: sourceSpan.span_id, asset_id: sourceSpan.asset_id as any, start_pts: 1001n, end_pts: 600600n, timescale: 30000n, has_video: true, has_audio: false, observations: [{ evidence_id: "real-grid-fixture", kind: "visual", start_pts: 1001n, end_pts: 600600n, timescale: 30000n, text: "Controlled source-grid observation", uncertain: false }] }] };
const crossTimeline = simulateCommands(base, compileCreationPlan(crossPlan, base, compileContext));
assert.deepEqual(crossTimeline.tracks[0]!.clips.map(clip => clip.timeline_duration), [144001n, 431999n]);
for (const [index, clip] of crossTimeline.tracks[0]!.clips.entries()) {
  const selected = crossPlan.shots[index]!.source;
  assert.equal(clip.source.start_pts * BigInt(selected.start.timescale), BigInt(selected.start.value) * clip.source.timescale);
  assert.equal(clip.source.end_pts * BigInt(selected.end.timescale), BigInt(selected.end.value) * clip.source.timescale);
  assert.equal((clip.source.end_pts - clip.source.start_pts) * 24000n, clip.timeline_duration * clip.source.timescale);
}
const exact = make(30, [{ capacity: 30, exact: true }]); exact.shots[0].source_window.start = time(1001, 30000); exact.shots[0].source_window.end = time(31001, 30000);
assert.deepEqual(compileCreationDecisionV1(exact, identity, grid, null).shots[0]!.source, exact.shots[0].source_window);
exact.shots[0].source_window.end = time(31002, 30000);
assert.throws(() => compileCreationDecisionV1(exact, identity, grid, null), code("CREATION_TIME_INEXACT"));
const unsafe = make(1, [{ capacity: 3 }]); unsafe.shots[0].source_window.end = time(Number.MAX_SAFE_INTEGER + 1);
assert.throws(() => compileCreationDecisionV1(unsafe, identity, grid, null), code("CREATION_DECISION_TIME_UNSAFE"));
const tiny = make(1, [{ capacity: 1 }]); tiny.shots[0].source_window.end = time(1, 100);
assert.throws(() => compileCreationDecisionV1(tiny, identity, grid, null), code("CREATION_DECISION_CAPACITY_INSUFFICIENT"));
assert.throws(() => compileCreationDecisionV1(make(1, [{ capacity: 30 }]), identity, { value: 1n, timescale: 10n ** 16n }, null), code("CREATION_DECISION_TIME_UNSAFE"), "unrepresentable compiled RationalTime must not round through Number");
const unchanged = make(30, [{ capacity: 60 }]);
unchanged.captions = [{ caption_id: "caption", shot_id: "shot-0", offset: time(0), duration: time(60), text: "Retain for the downstream evidence and bounds validator", kind: "editorial", evidence_ids: ["evidence"], audio_anchor: null }];
unchanged.audio = [{ audio_id: "audio", shot_id: "shot-0", source: structuredClone(unchanged.shots[0].source_window), offset: time(0), role: "music", gain_db: -6, fade_in: time(0), fade_out: time(0), purpose: "Explicit audio retained without trimming" }];
const unchangedPlan = compileCreationDecisionV1(unchanged, identity, grid, null);
assert.deepEqual(unchangedPlan.audio, unchanged.audio); assert.deepEqual(unchangedPlan.captions, unchanged.captions, "allocation never repairs captions or audio that downstream validation must reject");

for (let seed = 1; seed <= 200; seed++) {
  const capacities = Array.from({ length: seed % 7 + 1 }, (_, i) => ({ capacity: (seed * 17 + i * 11) % 90 + 1, weight: (seed * 13 + i * 7) % 40 + 1 }));
  const total = capacities.reduce((sum, item) => sum + item.capacity, 0), target = capacities.length + seed % (total - capacities.length + 1);
  const decision = make(target, capacities), result = ticks(compileCreationDecisionV1(decision, identity, grid, null));
  assert.equal(result.reduce((sum, value) => sum + value, 0), target);
  result.forEach((value, index) => assert.ok(value >= 1 && value <= capacities[index]!.capacity));
  assert.deepEqual(ticks(compileCreationDecisionV1(decision, identity, grid, null)), result);
}
console.log("Stage3 explicit decision: strict boundary, bounded weighted allocation, exact windows, rational grid separation and deterministic invariants passed");
