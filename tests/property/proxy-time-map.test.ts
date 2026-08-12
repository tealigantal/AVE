import { strict as assert } from "node:assert";
import { addTime, compareTime, frameToTime, mapOriginalToProxy, mapProxyToOriginal, proxyMapFromPoints, rationalTime, sampleToTime, timeToFrame, timeToPts, timeToSample, validateProxyMap } from "../../packages/core/timebase/src/public.js";
import { mapTimelineToSource, validateTimeMap } from "../../packages/core/timeline-core/src/public.js";

const map = proxyMapFromPoints([
  { original: rationalTime(0n, 1000n), proxy: rationalTime(0n, 900n) },
  { original: rationalTime(400n, 1000n), proxy: rationalTime(360n, 900n) },
  { original: rationalTime(1000n, 1000n), proxy: rationalTime(810n, 900n) },
], 1000n, 900n);
validateProxyMap(map);
for (const value of [0n, 1n, 199n, 400n, 601n, 999n, 1000n]) {
  const original = rationalTime(value, 1000n);
  const proxy = mapOriginalToProxy(map, original);
  const roundtrip = mapProxyToOriginal(map, proxy);
  assert.equal(compareTime(roundtrip, original), 0, `roundtrip failed at ${value}`);
}
assert.equal(compareTime(mapOriginalToProxy(map, rationalTime(400n, 1000n)), rationalTime(360n, 900n)), 0);
assert.throws(() => validateProxyMap({ ...map, segments: [{ ...map.segments[0], original_end: map.segments[0].original_start }] }), /strictly increasing/);
assert.throws(() => mapOriginalToProxy({ ...map, segments: [] }, rationalTime(0n, 1000n)), /invalid proxy map header/);
assert.throws(() => validateProxyMap({ ...map, segments: [map.segments[0], { ...map.segments[1], original_start: rationalTime(401n, 1000n) }] }), /continuous/);
assert.throws(() => mapOriginalToProxy(map, rationalTime(-1n, 1000n)), /out of range/);
assert.throws(() => mapOriginalToProxy(map, rationalTime(1001n, 1000n)), /out of range/);
const remap = { map_id: "speed-hold-reverse", pitch_policy: "preserve" as const, segments: [{ segment_id: "speed", timeline_start: 0n, timeline_end: 10n, source_start: 0n, source_end: 20n, mode: "speed" as const, speed_numerator: 2n, speed_denominator: 1n }, { segment_id: "hold", timeline_start: 10n, timeline_end: 15n, source_start: 20n, source_end: 20n, mode: "hold" as const }, { segment_id: "reverse", timeline_start: 15n, timeline_end: 25n, source_start: 10n, source_end: 20n, mode: "reverse" as const }] };
assert.deepEqual(validateTimeMap(remap), []);
assert.equal(mapTimelineToSource(remap, 5n), 10n);
assert.equal(mapTimelineToSource(remap, 12n), 20n);
assert.equal(mapTimelineToSource(remap, 20n), 15n);
const discontinuousBoundary = { map_id: "boundary", pitch_policy: "change" as const, segments: [{ segment_id: "outgoing", timeline_start: 0n, timeline_end: 10n, source_start: 0n, source_end: 10n, mode: "speed" as const, speed_numerator: 1n, speed_denominator: 1n }, { segment_id: "incoming", timeline_start: 10n, timeline_end: 20n, source_start: 100n, source_end: 110n, mode: "speed" as const, speed_numerator: 1n, speed_denominator: 1n }] };
assert.equal(mapTimelineToSource(discontinuousBoundary, 10n), 100n, "contiguous boundary must resolve to the incoming segment");
assert.match(validateTimeMap({ ...remap, segments: [{ ...remap.segments[0], speed_numerator: 3n }] }).join(","), /TIME_MAP_RATIO_MISMATCH/);
assert.match(validateTimeMap({ ...remap, segments: [{ ...remap.segments[0] }, { ...remap.segments[1], segment_id: "speed" }, remap.segments[2]] }).join(","), /unique/);
assert.throws(() => mapTimelineToSource({ ...remap, segments: [{ ...remap.segments[0], timeline_end: 0n }] }, 0n), /TIME_MAP_INVALID/);
for (const [numerator, denominator] of [[24000n, 1001n], [25n, 1n], [30n, 1n], [50n, 1n], [60000n, 1001n], [30000n, 1001n]]) {
  const rateMap = proxyMapFromPoints([{ original: rationalTime(0n, denominator), proxy: rationalTime(0n, denominator) }, { original: rationalTime(numerator, denominator), proxy: rationalTime(numerator, denominator) }], denominator, denominator);
  assert.equal(compareTime(mapProxyToOriginal(rateMap, rationalTime(numerator / 2n, denominator)), rationalTime(numerator / 2n, denominator)), 0);
}
assert.deepEqual(rationalTime(6000n, 24000n), rationalTime(1n, 4n));
assert.deepEqual(addTime(rationalTime(1n, 3n), rationalTime(1n, 6n)), rationalTime(1n, 2n));
assert.equal(timeToPts(rationalTime(1n, 3n), 90_000n, "exact"), 30_000n);
assert.throws(() => timeToPts(rationalTime(1n, 3n), 1000n, "exact"), /not exact/);
assert.equal(timeToPts(rationalTime(1n, 3n), 1000n, "floor"), 333n);
assert.equal(timeToPts(rationalTime(1n, 3n), 1000n, "ceil"), 334n);
assert.equal(timeToPts(rationalTime(-1n, 2n), 1n, "nearest"), -1n);
for (const [rateNumerator, rateDenominator] of [[24000n, 1001n], [30000n, 1001n], [60000n, 1001n]] as const) {
  const lastFrame = 60n * 60n * rateNumerator / rateDenominator;
  const time = frameToTime(lastFrame, rateNumerator, rateDenominator);
  assert.equal(timeToFrame(time, rateNumerator, rateDenominator, "exact"), lastFrame, "long duration frame accumulation must remain exact");
  assert.equal(timeToFrame(frameToTime(1n, rateNumerator, rateDenominator), rateNumerator, rateDenominator, "exact"), 1n, "one frame boundary must remain exact");
}
for (const sampleRate of [44_100n, 48_000n]) {
  const sample = sampleRate * 60n * 60n + 1n;
  assert.equal(timeToSample(sampleToTime(sample, sampleRate), sampleRate, "exact"), sample);
}
console.log("proxy time map property check passed (exact timebase, VFR, bounded mapping, frame and sample conversion)");
