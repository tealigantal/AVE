import { rationalTime, type RationalTime } from "./rational-time.js";

export type TimeRounding = "exact" | "floor" | "ceil" | "nearest";
export type PtsMap = Readonly<{ mediaTimescale: bigint; pts: bigint; time: RationalTime }>;

function floorDivide(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder !== 0n && numerator < 0n ? quotient - 1n : quotient;
}

export function divideRounded(numerator: bigint, denominator: bigint, rounding: TimeRounding): bigint {
  if (denominator <= 0n) throw new Error("conversion denominator must be positive");
  const floor = floorDivide(numerator, denominator);
  const remainder = numerator - floor * denominator;
  if (rounding === "exact") {
    if (remainder !== 0n) throw new Error("time conversion is not exact");
    return floor;
  }
  if (rounding === "floor") return floor;
  if (rounding === "ceil") return remainder === 0n ? floor : floor + 1n;
  const doubled = remainder * 2n;
  if (doubled < denominator) return floor;
  if (doubled > denominator) return floor + 1n;
  return numerator < 0n ? floor : floor + 1n;
}

export function ptsToTime(pts: bigint | number, timescale: bigint | number): RationalTime {
  return rationalTime(pts, timescale);
}

export function timeToPts(time: RationalTime, timescale: bigint | number, rounding: TimeRounding = "exact"): bigint {
  const target = BigInt(timescale);
  if (target <= 0n) throw new Error("PTS timescale must be positive");
  return divideRounded(time.value * target, time.timescale, rounding);
}

export function frameToTime(frame: bigint | number, rateNumerator: bigint | number, rateDenominator: bigint | number = 1n): RationalTime {
  const numerator = BigInt(rateNumerator);
  const denominator = BigInt(rateDenominator);
  if (numerator <= 0n || denominator <= 0n) throw new Error("frame rate must be positive");
  return rationalTime(BigInt(frame) * denominator, numerator);
}

export function timeToFrame(time: RationalTime, rateNumerator: bigint | number, rateDenominator: bigint | number = 1n, rounding: TimeRounding = "exact"): bigint {
  const numerator = BigInt(rateNumerator);
  const denominator = BigInt(rateDenominator);
  if (numerator <= 0n || denominator <= 0n) throw new Error("frame rate must be positive");
  return divideRounded(time.value * numerator, time.timescale * denominator, rounding);
}

export function sampleToTime(sample: bigint | number, sampleRate: bigint | number): RationalTime {
  const rate = BigInt(sampleRate);
  if (rate <= 0n) throw new Error("sample rate must be positive");
  return rationalTime(sample, rate);
}

export function timeToSample(time: RationalTime, sampleRate: bigint | number, rounding: TimeRounding = "exact"): bigint {
  const rate = BigInt(sampleRate);
  if (rate <= 0n) throw new Error("sample rate must be positive");
  return divideRounded(time.value * rate, time.timescale, rounding);
}
