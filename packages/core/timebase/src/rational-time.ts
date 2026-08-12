export type RationalTime = Readonly<{ value: bigint; timescale: bigint }>;

function gcd(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right !== 0n) [left, right] = [right, left % right];
  return left || 1n;
}

export function rationalTime(value: bigint | number, timescale: bigint | number): RationalTime {
  const rawValue = BigInt(value);
  const rawTimescale = BigInt(timescale);
  if (rawTimescale <= 0n) throw new Error("timescale must be positive");
  const divisor = gcd(rawValue, rawTimescale);
  return { value: rawValue / divisor, timescale: rawTimescale / divisor };
}

export function addTime(a: RationalTime, b: RationalTime): RationalTime {
  return rationalTime(a.value * b.timescale + b.value * a.timescale, a.timescale * b.timescale);
}

export function subtractTime(a: RationalTime, b: RationalTime): RationalTime {
  return rationalTime(a.value * b.timescale - b.value * a.timescale, a.timescale * b.timescale);
}

export function multiplyTime(a: RationalTime, numerator: bigint | number, denominator: bigint | number = 1n): RationalTime {
  const divisor = BigInt(denominator);
  if (divisor === 0n) throw new Error("cannot multiply time by a zero denominator");
  const sign = divisor < 0n ? -1n : 1n;
  return rationalTime(a.value * BigInt(numerator) * sign, a.timescale * divisor * sign);
}

export function divideTime(a: RationalTime, numerator: bigint | number, denominator: bigint | number = 1n): RationalTime {
  const divisor = BigInt(numerator);
  if (divisor === 0n) throw new Error("cannot divide time by zero");
  return multiplyTime(a, BigInt(denominator), divisor);
}

export function compareTime(a: RationalTime, b: RationalTime): -1 | 0 | 1 {
  const left = a.value * b.timescale;
  const right = b.value * a.timescale;
  return left < right ? -1 : left > right ? 1 : 0;
}
