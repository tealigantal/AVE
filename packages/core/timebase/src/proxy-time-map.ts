import { compareTime, RationalTime, rationalTime } from "./rational-time.js";

export type ProxyMapSegment = Readonly<{
  original_start: RationalTime;
  original_end: RationalTime;
  proxy_start: RationalTime;
  proxy_end: RationalTime;
}>;

export type ProxyMap = Readonly<{
  schema_version: 1;
  original_timebase: bigint;
  proxy_timebase: bigint;
  segments: readonly ProxyMapSegment[];
  audio?: Readonly<{ original_sample_rate: bigint; proxy_sample_rate: bigint }>;
}>;

export type ProxyTimeMap = Readonly<{ original: RationalTime; proxy: RationalTime }>;

function positiveDelta(start: RationalTime, end: RationalTime, label: string): RationalTime {
  const numerator = end.value * start.timescale - start.value * end.timescale;
  if (numerator <= 0n) throw new Error(`${label} range must be strictly increasing`);
  return rationalTime(numerator, start.timescale * end.timescale);
}

function validateSegment(segment: ProxyMapSegment): void {
  positiveDelta(segment.original_start, segment.original_end, "original");
  positiveDelta(segment.proxy_start, segment.proxy_end, "proxy");
}

export function validateProxyMap(map: ProxyMap): void {
  if (map.schema_version !== 1 || map.original_timebase <= 0n || map.proxy_timebase <= 0n || map.segments.length === 0) throw new Error("invalid proxy map header");
  let previous: ProxyMapSegment | undefined;
  for (const segment of map.segments) {
    validateSegment(segment);
    if (previous && (compareTime(segment.original_start, previous.original_end) < 0 || compareTime(segment.proxy_start, previous.proxy_end) < 0)) throw new Error("proxy map segments must be ordered and non-overlapping");
    previous = segment;
  }
}

function gcd(a: bigint, b: bigint): bigint { let left = a < 0n ? -a : a; let right = b < 0n ? -b : b; while (right) [left, right] = [right, left % right]; return left || 1n; }
function fraction(value: bigint, timescale: bigint): RationalTime { if (timescale === 0n) throw new Error("timescale must be positive"); const sign = timescale < 0n ? -1n : 1n; const divisor = gcd(value, timescale); return rationalTime((value * sign) / divisor, (timescale * sign) / divisor); }
function add(a: RationalTime, b: RationalTime): RationalTime { return fraction(a.value * b.timescale + b.value * a.timescale, a.timescale * b.timescale); }
function subtract(a: RationalTime, b: RationalTime): RationalTime { return fraction(a.value * b.timescale - b.value * a.timescale, a.timescale * b.timescale); }
function multiply(a: RationalTime, b: RationalTime): RationalTime { return fraction(a.value * b.value, a.timescale * b.timescale); }
function divide(a: RationalTime, b: RationalTime): RationalTime { if (b.value === 0n) throw new Error("cannot divide by zero time"); return fraction(a.value * b.timescale, a.timescale * b.value); }
function linear(value: RationalTime, start: RationalTime, end: RationalTime, outStart: RationalTime, outEnd: RationalTime): RationalTime {
  return add(outStart, multiply(divide(subtract(value, start), subtract(end, start)), subtract(outEnd, outStart)));
}

function segmentFor(segments: readonly ProxyMapSegment[], time: RationalTime, direction: "original" | "proxy"): ProxyMapSegment {
  const start = direction === "original" ? "original_start" : "proxy_start";
  const end = direction === "original" ? "original_end" : "proxy_end";
  const exact = segments.find((segment) => compareTime(segment[start], time) <= 0 && compareTime(time, segment[end]) <= 0);
  if (exact) return exact;
  const prior = [...segments].reverse().find((segment) => compareTime(segment[start], time) <= 0);
  if (prior) return prior;
  return segments[0];
}

export function mapOriginalToProxy(map: ProxyMap, original: RationalTime): RationalTime {
  validateProxyMap(map);
  const segment = segmentFor(map.segments, original, "original");
  return linear(original, segment.original_start, segment.original_end, segment.proxy_start, segment.proxy_end);
}

export function mapProxyToOriginal(map: ProxyMap, proxy: RationalTime): RationalTime {
  validateProxyMap(map);
  const segment = segmentFor(map.segments, proxy, "proxy");
  return linear(proxy, segment.proxy_start, segment.proxy_end, segment.original_start, segment.original_end);
}

export function proxyMapFromPoints(points: readonly ProxyTimeMap[], originalTimebase: bigint, proxyTimebase: bigint): ProxyMap {
  if (points.length < 2) throw new Error("proxy map needs at least two points");
  const segments = points.slice(0, -1).map((point, index) => ({ original_start: point.original, original_end: points[index + 1].original, proxy_start: point.proxy, proxy_end: points[index + 1].proxy }));
  const map: ProxyMap = { schema_version: 1, original_timebase: originalTimebase, proxy_timebase: proxyTimebase, segments };
  validateProxyMap(map);
  return map;
}

export function mapProxyTime(points: readonly ProxyTimeMap[], proxy: RationalTime): RationalTime {
  return mapProxyToOriginal(proxyMapFromPoints(points, points[0]?.original.timescale ?? 1n, points[0]?.proxy.timescale ?? 1n), proxy);
}
