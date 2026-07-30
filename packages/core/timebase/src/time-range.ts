import { compareTime, RationalTime } from "./rational-time.js";
export type TimeRange = Readonly<{ start: RationalTime; duration: RationalTime }>;
export function timeRange(start: RationalTime, duration: RationalTime): TimeRange {
  if (duration.value < 0n) throw new Error("duration must not be negative");
  return { start, duration };
}
export function contains(range: TimeRange, time: RationalTime): boolean {
  const end: RationalTime = { value: range.start.value * range.duration.timescale + range.duration.value * range.start.timescale, timescale: range.start.timescale * range.duration.timescale };
  return compareTime(range.start, time) <= 0 && compareTime(time, end) < 0;
}
