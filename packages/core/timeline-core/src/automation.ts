export type AutomationValue = number | boolean | string | readonly number[];
export type Interpolation = "hold" | "linear" | "bezier";
export type Tangent = Readonly<{ time: number; value: number }>;
export type AutomationKeyframe = Readonly<{ keyframe_id: string; time: bigint; value: AutomationValue; interpolation?: Interpolation; in_tangent?: Tangent; out_tangent?: Tangent }>;
export type AutomationCurve = Readonly<{ curve_id: string; target_id: string; property_path: string; value_kind: "number" | "boolean" | "string" | "vector" | "color" | "rectangle"; keyframes: readonly AutomationKeyframe[] }>;

export const transformAutomationPropertyPaths = ["transform.x", "transform.y", "transform.scale_x", "transform.scale_y", "transform.rotation", "transform.anchor_x", "transform.anchor_y", "transform.opacity"] as const;
export type TransformAutomationPropertyPath = typeof transformAutomationPropertyPaths[number];
export const transformAutomationDefaults: Readonly<Record<TransformAutomationPropertyPath, number>> = Object.freeze({
  "transform.x": 0,
  "transform.y": 0,
  "transform.scale_x": 1,
  "transform.scale_y": 1,
  "transform.rotation": 0,
  "transform.anchor_x": 0,
  "transform.anchor_y": 0,
  "transform.opacity": 1
});

const propertyRegistry: Readonly<Record<string, readonly AutomationCurve["value_kind"][]>> = {
  "transform.x": ["number"], "transform.y": ["number"], "transform.scale_x": ["number"], "transform.scale_y": ["number"], "transform.rotation": ["number"], "transform.anchor_x": ["number"], "transform.anchor_y": ["number"], "transform.opacity": ["number"],
  "audio.gain_db": ["number"], "audio.pan": ["number"],
  "color.exposure": ["number"], "color.brightness": ["number"], "color.contrast": ["number"], "color.saturation": ["number"], "color.gamma": ["number"],
  "mask.x": ["number"], "mask.y": ["number"], "mask.width": ["number"], "mask.height": ["number"], "mask.feather": ["number"]
};

const boundedNumberProperties: Readonly<Partial<Record<TransformAutomationPropertyPath, Readonly<{ minimum: number; maximum?: number; minimumExclusive?: boolean }>>>> = Object.freeze({
  "transform.scale_x": { minimum: 0, minimumExclusive: true },
  "transform.scale_y": { minimum: 0, minimumExclusive: true },
  "transform.anchor_x": { minimum: 0, maximum: 1 },
  "transform.anchor_y": { minimum: 0, maximum: 1 },
  "transform.opacity": { minimum: 0, maximum: 1 }
});
const registeredInterpolations = new Set<Interpolation>(["hold", "linear", "bezier"]);
const hermiteDegenerateEpsilon = 1e-12;

function numericValueIsInRange(propertyPath: string, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  const constraint = boundedNumberProperties[propertyPath as TransformAutomationPropertyPath];
  if (!constraint) return true;
  if (constraint.minimumExclusive ? value <= constraint.minimum : value < constraint.minimum) return false;
  return constraint.maximum === undefined || value <= constraint.maximum;
}

function tangentSlope(tangent: Tangent | undefined, fallback: number): number {
  return tangent ? tangent.value / tangent.time : fallback;
}

function hermiteValue(left: number, right: number, ratio: number, outTangent?: Tangent, inTangent?: Tangent): number {
  const fallback = right - left;
  const slope0 = tangentSlope(outTangent, fallback);
  const slope1 = tangentSlope(inTangent, fallback);
  const t2 = ratio * ratio, t3 = t2 * ratio;
  return (2 * t3 - 3 * t2 + 1) * left + (t3 - 2 * t2 + ratio) * slope0 + (-2 * t3 + 3 * t2) * right + (t3 - t2) * slope1;
}

function hermiteExtrema(left: number, right: number, outTangent?: Tangent, inTangent?: Tangent): readonly number[] {
  const fallback = right - left;
  const slope0 = tangentSlope(outTangent, fallback);
  const slope1 = tangentSlope(inTangent, fallback);
  const a = 2 * left - 2 * right + slope0 + slope1;
  const b = -3 * left + 3 * right - 2 * slope0 - slope1;
  const c = slope0;
  const roots: number[] = [];
  if (Math.abs(a) <= hermiteDegenerateEpsilon) {
    if (Math.abs(b) > hermiteDegenerateEpsilon) roots.push(-c / (2 * b));
  } else {
    const discriminant = 4 * b * b - 12 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      roots.push((-2 * b + root) / (6 * a), (-2 * b - root) / (6 * a));
    }
  }
  return [left, right, ...roots.filter((ratio) => ratio > 0 && ratio < 1).map((ratio) => hermiteValue(left, right, ratio, outTangent, inTangent))];
}

export function validateAutomationCurve(curve: AutomationCurve): readonly string[] {
  const errors: string[] = [];
  if (!curve.curve_id || !curve.target_id || !curve.property_path || curve.keyframes.length === 0) errors.push("curve identity, property path and keyframes are required");
  if (!(curve.property_path in propertyRegistry) || !propertyRegistry[curve.property_path]?.includes(curve.value_kind)) errors.push("automation property path or value kind is not registered");
  if ("before" in curve || "after" in curve) errors.push("automation boundary policies are not supported by v1; endpoint hold is authoritative");
  let previous: bigint | undefined;
  for (const keyframe of curve.keyframes) {
    if (!keyframe.keyframe_id) errors.push("keyframe id is required");
    if (keyframe.time < 0n) errors.push("keyframe time must be non-negative clip-local ticks");
    if (previous !== undefined && keyframe.time <= previous) errors.push("keyframes must be strictly monotonic"); previous = keyframe.time;
    if (typeof keyframe.value === "number" && !Number.isFinite(keyframe.value)) errors.push("numeric keyframe must be finite");
    if (typeof keyframe.value === "number" && Number.isFinite(keyframe.value) && !numericValueIsInRange(curve.property_path, keyframe.value)) errors.push(`numeric keyframe is out of range for ${curve.property_path}`);
    if (Array.isArray(keyframe.value) && keyframe.value.some((value) => !Number.isFinite(value))) errors.push("vector keyframe must be finite");
    if (keyframe.interpolation !== undefined && !registeredInterpolations.has(keyframe.interpolation)) errors.push("automation interpolation is not registered");
    if ((curve.value_kind === "boolean" || curve.value_kind === "string") && (keyframe.interpolation ?? "hold") !== "hold") errors.push("boolean and string keyframes require hold interpolation");
    if (keyframe.interpolation === "bezier" && curve.value_kind !== "number") errors.push("bezier interpolation currently requires numeric values");
    for (const tangent of [keyframe.in_tangent, keyframe.out_tangent]) if (tangent && (!Number.isFinite(tangent.time) || !Number.isFinite(tangent.value) || tangent.time <= 0 || !Number.isFinite(tangent.value / tangent.time))) errors.push("tangent and normalized slope must be finite with positive time");
  }
  const kinds: Record<AutomationCurve["value_kind"], (value: AutomationValue) => boolean> = { number: (value) => typeof value === "number", boolean: (value) => typeof value === "boolean", string: (value) => typeof value === "string", vector: (value) => Array.isArray(value), color: (value) => Array.isArray(value) && value.length === 4, rectangle: (value) => Array.isArray(value) && value.length === 4 };
  if (curve.keyframes.some((keyframe) => !kinds[curve.value_kind](keyframe.value))) errors.push("keyframe value does not match curve value_kind");
  if (curve.value_kind === "number" && boundedNumberProperties[curve.property_path as TransformAutomationPropertyPath]) {
    for (let index = 0; index + 1 < curve.keyframes.length; index += 1) {
      const left = curve.keyframes[index], right = curve.keyframes[index + 1];
      if ((left.interpolation ?? "linear") !== "bezier" || typeof left.value !== "number" || typeof right.value !== "number") continue;
      if ([left.out_tangent, right.in_tangent].some((tangent) => tangent && (!Number.isFinite(tangent.time) || !Number.isFinite(tangent.value) || tangent.time <= 0 || !Number.isFinite(tangent.value / tangent.time)))) continue;
      if (hermiteExtrema(left.value, right.value, left.out_tangent, right.in_tangent).some((value) => !numericValueIsInRange(curve.property_path, value))) errors.push(`bezier segment is out of range for ${curve.property_path}`);
    }
  }
  return errors;
}

export function automationCurveNumericBounds(curve: AutomationCurve): readonly [number, number] {
  const errors = validateAutomationCurve(curve);
  if (errors.length || curve.value_kind !== "number") throw new Error(`AUTOMATION_CURVE_INVALID:${errors.join(",") || "numeric curve required"}`);
  const values = curve.keyframes.map((keyframe) => keyframe.value as number);
  for (let index = 0; index + 1 < curve.keyframes.length; index += 1) {
    const left = curve.keyframes[index], right = curve.keyframes[index + 1];
    if ((left.interpolation ?? "linear") !== "bezier") continue;
    values.push(...hermiteExtrema(left.value as number, right.value as number, left.out_tangent, right.in_tangent));
  }
  return [Math.min(...values), Math.max(...values)];
}

function interpolate(left: AutomationValue, right: AutomationValue, ratio: number): AutomationValue {
  if (typeof left === "number" && typeof right === "number") return left + (right - left) * ratio;
  if (Array.isArray(left) && Array.isArray(right) && left.length === right.length) return left.map((value, index) => value + (right[index] - value) * ratio);
  return left;
}

function cubic(left: number, right: number, ratio: number, outTangent?: Tangent, inTangent?: Tangent): number {
  return hermiteValue(left, right, ratio, outTangent, inTangent);
}

export function evaluateAutomationCurve(curve: AutomationCurve, time: bigint): AutomationValue {
  const errors = validateAutomationCurve(curve); if (errors.length) throw new Error(`AUTOMATION_CURVE_INVALID:${errors.join(",")}`);
  const keys = curve.keyframes; if (time <= keys[0].time) return keys[0].value; if (time >= keys.at(-1)!.time) return keys.at(-1)!.value;
  const rightIndex = keys.findIndex((keyframe) => keyframe.time > time); const left = keys[rightIndex - 1], right = keys[rightIndex];
  if ((left.interpolation ?? "linear") === "hold" || typeof left.value === "boolean" || typeof left.value === "string") return left.value;
  const numerator = time - left.time; const denominator = right.time - left.time; const precision = 1_000_000_000_000_000n;
  const ratio = Number((numerator * precision) / denominator) / Number(precision);
  if ((left.interpolation ?? "linear") === "bezier" && typeof left.value === "number" && typeof right.value === "number") return cubic(left.value, right.value, ratio, left.out_tangent, right.in_tangent);
  return interpolate(left.value, right.value, ratio);
}
