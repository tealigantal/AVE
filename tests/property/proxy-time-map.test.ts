import { strict as assert } from "node:assert";
import { compareTime, mapOriginalToProxy, mapProxyToOriginal, proxyMapFromPoints, rationalTime, validateProxyMap } from "../../packages/core/timebase/src/public.js";

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
for (const [numerator, denominator] of [[24000n, 1001n], [25n, 1n], [30n, 1n], [50n, 1n], [60000n, 1001n], [30000n, 1001n]]) {
  const rateMap = proxyMapFromPoints([{ original: rationalTime(0n, denominator), proxy: rationalTime(0n, denominator) }, { original: rationalTime(numerator, denominator), proxy: rationalTime(numerator, denominator) }], denominator, denominator);
  assert.equal(compareTime(mapProxyToOriginal(rateMap, rationalTime(numerator / 2n, denominator)), rationalTime(numerator / 2n, denominator)), 0);
}
console.log("proxy time map property check passed (VFR multi-segment roundtrip)");
