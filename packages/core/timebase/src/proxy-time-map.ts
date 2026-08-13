import { addTime, compareTime, divideTime, multiplyTime, RationalTime, rationalTime, subtractTime } from "./rational-time.js";

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
    if (previous && (compareTime(segment.original_start, previous.original_end) !== 0 || compareTime(segment.proxy_start, previous.proxy_end) !== 0)) throw new Error("proxy map segments must be continuous, ordered and non-overlapping");
    previous = segment;
  }
}

function linear(value: RationalTime, start: RationalTime, end: RationalTime, outStart: RationalTime, outEnd: RationalTime): RationalTime {
  const offset = subtractTime(value, start);
  const inputDuration = subtractTime(end, start);
  const outputDuration = subtractTime(outEnd, outStart);
  const ratioNumerator = offset.value * inputDuration.timescale;
  const ratioDenominator = offset.timescale * inputDuration.value;
  return addTime(outStart, multiplyTime(outputDuration, ratioNumerator, ratioDenominator));
}

function segmentFor(segments: readonly ProxyMapSegment[], time: RationalTime, direction: "original" | "proxy"): ProxyMapSegment {
  const start = direction === "original" ? "original_start" : "proxy_start";
  const end = direction === "original" ? "original_end" : "proxy_end";
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (compareTime(time, first[start]) < 0 || compareTime(time, last[end]) > 0) throw new Error(`proxy map ${direction} time is out of range`);
  const exact = segments.find((segment, index) => compareTime(segment[start], time) <= 0 && (index === segments.length - 1 ? compareTime(time, segment[end]) <= 0 : compareTime(time, segment[end]) < 0));
  if (!exact) throw new Error(`proxy map ${direction} time falls in a gap`);
  return exact;
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
