import { compareTime, RationalTime } from "./rational-time.js";
import { timeToPts } from "./pts.js";

export type ProxyTimeMap = Readonly<{ original: RationalTime; proxy: RationalTime }>;
export function mapProxyTime(points: readonly ProxyTimeMap[], proxy: RationalTime): RationalTime {
  if (points.length === 0) throw new Error("proxy map is empty");
  let candidate = points[0];
  for (const point of points) if (compareTime(point.proxy, proxy) <= 0 && compareTime(point.proxy, candidate.proxy) >= 0) candidate = point;
  const delta = timeToPts(proxy, candidate.proxy.timescale) - timeToPts(candidate.proxy, candidate.proxy.timescale);
  return { value: candidate.original.value + delta, timescale: candidate.original.timescale };
}
