import { rationalTime, RationalTime } from "./rational-time.js";

export type PtsMap = Readonly<{ mediaTimescale: bigint; pts: bigint; time: RationalTime }>;
export function ptsToTime(pts: bigint | number, timescale: bigint | number): RationalTime { return rationalTime(pts, timescale); }
export function timeToPts(time: RationalTime, timescale: bigint | number): bigint { const target = BigInt(timescale); return (time.value * target) / time.timescale; }
