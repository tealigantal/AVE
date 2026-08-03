const bigintTag = "$ave_bigint";

function canonicalValue(value: unknown, seen: Set<object>): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("CANONICAL_VALUE_INVALID: numbers must be finite"); return Object.is(value, -0) ? 0 : value; }
  if (typeof value === "bigint") return { [bigintTag]: value.toString(10) };
  if (typeof value === "undefined") throw new Error("CANONICAL_VALUE_INVALID: undefined is not serializable");
  if (typeof value === "function" || typeof value === "symbol") throw new Error(`CANONICAL_VALUE_INVALID: ${typeof value} is not serializable`);
  if (typeof value !== "object") throw new Error("CANONICAL_VALUE_INVALID: unsupported value");
  if (seen.has(value)) throw new Error("CANONICAL_VALUE_INVALID: cyclic value");
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => canonicalValue(item, seen));
    const prototype = Object.getPrototypeOf(value); if (prototype !== Object.prototype && prototype !== null) throw new Error("CANONICAL_VALUE_INVALID: only plain objects are supported");
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonicalValue((value as Record<string, unknown>)[key], seen)]));
  } finally { seen.delete(value); }
}

export function canonicalSerialize(value: unknown): string { return JSON.stringify(canonicalValue(value, new Set())); }
