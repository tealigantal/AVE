export type AutomationValue = number | boolean | string | readonly number[];
export type Interpolation = "hold" | "linear" | "bezier";
export type BoundaryPolicy = "hold" | "clamp";
export type Tangent = Readonly<{ time: number; value: number }>;
export type AutomationKeyframe = Readonly<{ keyframe_id: string; time: bigint; value: AutomationValue; interpolation?: Interpolation; in_tangent?: Tangent; out_tangent?: Tangent }>;
export type AutomationCurve = Readonly<{ curve_id: string; target_id: string; property_path: string; value_kind: "number" | "boolean" | "string" | "vector" | "color" | "rectangle"; keyframes: readonly AutomationKeyframe[]; before?: BoundaryPolicy; after?: BoundaryPolicy }>;

export function validateAutomationCurve(curve: AutomationCurve): readonly string[] {
  const errors: string[] = [];
  if (!curve.curve_id || !curve.target_id || !curve.property_path || curve.keyframes.length === 0) errors.push("curve identity, property path and keyframes are required");
  let previous: bigint | undefined;
  for (const keyframe of curve.keyframes) {
    if (!keyframe.keyframe_id) errors.push("keyframe id is required");
    if (previous !== undefined && keyframe.time <= previous) errors.push("keyframes must be strictly monotonic"); previous = keyframe.time;
    if (typeof keyframe.value === "number" && !Number.isFinite(keyframe.value)) errors.push("numeric keyframe must be finite");
    if (Array.isArray(keyframe.value) && keyframe.value.some((value) => !Number.isFinite(value))) errors.push("vector keyframe must be finite");
    for (const tangent of [keyframe.in_tangent, keyframe.out_tangent]) if (tangent && (!Number.isFinite(tangent.time) || !Number.isFinite(tangent.value) || tangent.time < 0)) errors.push("tangent must be finite with non-negative time");
  }
  const kinds: Record<AutomationCurve["value_kind"], (value: AutomationValue) => boolean> = { number: (value) => typeof value === "number", boolean: (value) => typeof value === "boolean", string: (value) => typeof value === "string", vector: (value) => Array.isArray(value), color: (value) => Array.isArray(value) && value.length === 4, rectangle: (value) => Array.isArray(value) && value.length === 4 };
  if (curve.keyframes.some((keyframe) => !kinds[curve.value_kind](keyframe.value))) errors.push("keyframe value does not match curve value_kind");
  return errors;
}

function interpolate(left: AutomationValue, right: AutomationValue, ratio: number): AutomationValue {
  if (typeof left === "number" && typeof right === "number") return left + (right - left) * ratio;
  if (Array.isArray(left) && Array.isArray(right) && left.length === right.length) return left.map((value, index) => value + (right[index] - value) * ratio);
  return left;
}

function cubic(left: number, right: number, ratio: number, outTangent?: Tangent, inTangent?: Tangent): number {
  const slope0 = outTangent ? outTangent.value / Math.max(outTangent.time, Number.EPSILON) : right - left;
  const slope1 = inTangent ? inTangent.value / Math.max(inTangent.time, Number.EPSILON) : right - left;
  const t2 = ratio * ratio, t3 = t2 * ratio;
  return (2 * t3 - 3 * t2 + 1) * left + (t3 - 2 * t2 + ratio) * slope0 + (-2 * t3 + 3 * t2) * right + (t3 - t2) * slope1;
}

export function evaluateAutomationCurve(curve: AutomationCurve, time: bigint): AutomationValue {
  const errors = validateAutomationCurve(curve); if (errors.length) throw new Error(`AUTOMATION_CURVE_INVALID:${errors.join(",")}`);
  const keys = curve.keyframes; if (time <= keys[0].time) return keys[0].value; if (time >= keys.at(-1)!.time) return keys.at(-1)!.value;
  const rightIndex = keys.findIndex((keyframe) => keyframe.time > time); const left = keys[rightIndex - 1], right = keys[rightIndex];
  if ((left.interpolation ?? "linear") === "hold" || typeof left.value === "boolean" || typeof left.value === "string") return left.value;
  const ratio = Number(time - left.time) / Number(right.time - left.time);
  if ((left.interpolation ?? "linear") === "bezier" && typeof left.value === "number" && typeof right.value === "number") return cubic(left.value, right.value, ratio, left.out_tangent, right.in_tangent);
  return interpolate(left.value, right.value, ratio);
}
