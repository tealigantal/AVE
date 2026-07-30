export type RationalTime = Readonly<{ value: bigint; timescale: bigint }>;

export function rationalTime(value: bigint | number, timescale: bigint | number): RationalTime {
  const v = BigInt(value); const s = BigInt(timescale);
  if (s <= 0n) throw new Error("timescale must be positive");
  return { value: v, timescale: s };
}

export function compareTime(a: RationalTime, b: RationalTime): -1 | 0 | 1 {
  const left = a.value * b.timescale; const right = b.value * a.timescale;
  return left < right ? -1 : left > right ? 1 : 0;
}
