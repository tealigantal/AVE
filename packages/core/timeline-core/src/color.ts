export type ColorContext = Readonly<{ input_space: "rec709" | "srgb" | "rec2020"; working_space: "rec709" | "srgb" | "rec2020"; output_space: "rec709" | "srgb" | "rec2020"; bit_depth: 8 | 10; range: "limited" | "full" }>;
export type Grade = Readonly<{ grade_id: string; exposure?: number; brightness?: number; contrast?: number; saturation?: number; gamma?: number; lut_path?: string; lut_sha256?: string; context: ColorContext }>;
/** Read-only interpretation of the current Worker color/FFmpeg eq protocol.
 * No grade means no color node (identity). Omitted optional eq parameters use
 * its identity values; exposure is added to brightness, not an EV multiplier.
 * This does not supply missing fields in a creation candidate or rewrite Grade.
 * LUTs and other color operations remain separate and must still be preserved. */
export function effectiveGradeSettings(grade?: Pick<Grade, "exposure" | "brightness" | "contrast" | "saturation" | "gamma">) {
  const exposure = grade?.exposure ?? 0, brightness = grade?.brightness ?? 0;
  return { exposure, brightness, contrast: grade?.contrast ?? 1, saturation: grade?.saturation ?? 1, gamma: grade?.gamma ?? 1, render_brightness: exposure + brightness };
}
export function validateGrade(grade: Grade): readonly string[] { const errors: string[] = []; if (!grade.grade_id) errors.push("grade id is required"); for (const key of ["exposure", "brightness", "contrast", "saturation", "gamma"] as const) if (grade[key] !== undefined && !Number.isFinite(grade[key])) errors.push(`${key} must be finite`); const ranges = { exposure: [-1, 1], brightness: [-1, 1], contrast: [-1000, 1000], saturation: [0, 3], gamma: [0.1, 10] } as const; for (const [key, [minimum, maximum]] of Object.entries(ranges) as Array<[keyof typeof ranges, readonly [number, number]]>) if (grade[key] !== undefined && (grade[key]! < minimum || grade[key]! > maximum)) errors.push(`${key} must be in [${minimum}, ${maximum}]`); if ((grade.lut_path === undefined) !== (grade.lut_sha256 === undefined)) errors.push("LUT path and sha256 must be paired"); if (grade.lut_sha256 !== undefined && !/^[0-9a-f]{64}$/.test(grade.lut_sha256)) errors.push("LUT sha256 must be lowercase hexadecimal"); return errors; }
