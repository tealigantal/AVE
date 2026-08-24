import { createHash } from "node:crypto";
import type { RationalTime } from "../../../../../../contracts/generated/typescript/common/rational-time.v1.js";
import type { DurationBlueprintV1 } from "../../../../../../contracts/generated/typescript/editorial/duration-blueprint.v1.js";
import type { DurationFeasibilityV1 } from "../../../../../../contracts/generated/typescript/editorial/duration-feasibility.v1.js";
import type { CreativeContractV2, MaterialEvidencePackV1, VersionedObjectRef } from "../../public.js";
import { isStrictComparableDateTime } from "../date-time.js";

export type { DurationBlueprintV1, DurationFeasibilityV1 };
export const DURATION_ALLOCATOR_VERSION = "duration-allocator-v1";
export const DURATION_POLICY_VERSION = "duration-policy-v1";
export const DURATION_MATERIAL_POLICY_VERSION = "knowledge-v1";
const canonicalValue = (value: unknown): unknown => Array.isArray(value) ? value.map(canonicalValue) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value as Record<string, unknown>).filter((key) => (value as Record<string, unknown>)[key] !== undefined).sort().map((key) => [key, canonicalValue((value as Record<string, unknown>)[key])])) : value;
export const canonicalDurationBlueprint = (value: unknown): string => JSON.stringify(canonicalValue(value));
const digest = (value: unknown): string => createHash("sha256").update(canonicalDurationBlueprint(value)).digest("hex");
export function durationBlueprintDigest(value: Omit<DurationBlueprintV1, "definition_digest"> | DurationBlueprintV1): string { const { definition_digest: _ignored, ...content } = value as DurationBlueprintV1; return digest(content); }
const deepFreeze = <T>(value: T): T => { if (!value || typeof value !== "object" || Object.isFrozen(value)) return value; Object.values(value as Record<string, unknown>).forEach(deepFreeze); return Object.freeze(value); };
const expectedSeconds: Record<DurationBlueprintV1["duration_class"], number> = { "30s": 30, "60s": 60, "2m": 120, "5m": 300, "10m": 600, "30m": 1800 };
type Fraction = Readonly<{ numerator: bigint; denominator: bigint }>;
const fraction = (value: RationalTime, label: string): Fraction => {
  if (!Number.isSafeInteger(value.value) || !Number.isSafeInteger(value.timescale) || value.timescale < 1) throw new Error(`${label} RationalTime is invalid`);
  return { numerator: BigInt(value.value), denominator: BigInt(value.timescale) };
};
const compareFraction = (left: Fraction, right: Fraction): number => {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};
const addFraction = (left: Fraction, right: Fraction): Fraction => ({ numerator: left.numerator * right.denominator + right.numerator * left.denominator, denominator: left.denominator * right.denominator });
const rationalEquals = (left: RationalTime, right: RationalTime): boolean => compareFraction(fraction(left, "left"), fraction(right, "right")) === 0;
const rationalCompare = (left: RationalTime, right: RationalTime): number => compareFraction(fraction(left, "left"), fraction(right, "right"));
const sumRational = (values: readonly RationalTime[]): Fraction => values.reduce((sum, value) => addFraction(sum, fraction(value, "duration")), { numerator: 0n, denominator: 1n } as Fraction);
const rationalToUnits = (value: RationalTime, timescale: number): number => {
  if (!Number.isSafeInteger(timescale) || timescale < 1) throw new Error("duration target timescale is invalid");
  const source = fraction(value, "duration budget"), numerator = source.numerator * BigInt(timescale);
  if (numerator % source.denominator !== 0n) throw new Error("duration budget is not exactly representable");
  const units = numerator / source.denominator;
  if (units > BigInt(Number.MAX_SAFE_INTEGER) || units < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error("duration budget exceeds safe integer range");
  return Number(units);
};
const exactRef = (left: VersionedObjectRef, right: VersionedObjectRef): boolean => left.object_id === right.object_id && left.object_version === right.object_version && left.digest === right.digest;

export function validateDurationBlueprint(blueprint: DurationBlueprintV1): void {
  if (blueprint.definition_digest !== durationBlueprintDigest(blueprint)) throw new Error("duration blueprint digest mismatch");
  if (blueprint.status === "published" && blueprint.governance.trust_status !== "trusted") throw new Error("duration blueprint is untrusted");
  const expectedTarget: RationalTime = { schema_version: 1, value: expectedSeconds[blueprint.duration_class], timescale: 1 };
  if (!rationalEquals(blueprint.target_duration, expectedTarget)) throw new Error("duration class and target duration disagree");
  if (fraction(blueprint.acceptable_variance, "duration variance").numerator < 0n) throw new Error("duration variance is invalid");
  if (blueprint.beat_count.minimum > blueprint.beat_count.maximum) throw new Error("duration beat-count bounds are contradictory");
  if (new Set(blueprint.beat_roles.map((role) => role.role_id)).size !== blueprint.beat_roles.length) throw new Error("duration role IDs must be unique");
  if (blueprint.beat_roles.some((role) => fraction(role.minimum_duration, "duration role minimum").numerator < 0n || fraction(role.maximum_duration, "duration role maximum").numerator < 0n)) throw new Error("duration role budget is negative");
  if (blueprint.beat_roles.some((role) => rationalCompare(role.minimum_duration, role.maximum_duration) > 0)) throw new Error("duration role bounds are contradictory");
  if (new Set(blueprint.emotional_curve.map((point) => point.phase)).size !== blueprint.emotional_curve.length || blueprint.emotional_curve[0]?.position !== 0 || blueprint.emotional_curve.at(-1)?.position !== 1 || blueprint.emotional_curve.some((point, index) => index > 0 && point.position <= blueprint.emotional_curve[index - 1]!.position)) throw new Error("duration emotional curve must use unique phases strictly ordered from zero to one");
  const ending = blueprint.beat_roles.find((role) => role.role_id === "ending");
  if (fraction(blueprint.ending_contract.reserve, "duration ending reserve").numerator < 0n) throw new Error("duration ending reserve is negative");
  if (!ending || rationalCompare(blueprint.ending_contract.reserve, ending.minimum_duration) < 0 || rationalCompare(blueprint.ending_contract.reserve, ending.maximum_duration) > 0) throw new Error("duration ending reserve is impossible");
  const minimum = sumRational(blueprint.beat_roles.map((role) => role.minimum_duration)), maximum = sumRational(blueprint.beat_roles.map((role) => role.maximum_duration)), target = fraction(blueprint.target_duration, "duration target"), variance = fraction(blueprint.acceptable_variance, "duration variance");
  if (compareFraction(minimum, addFraction(target, variance)) > 0 || compareFraction(addFraction(maximum, variance), target) < 0) throw new Error("duration role budgets cannot reach the target");
}

export type DurationFeasibilityInput = Readonly<{ feasibility_id: string; blueprint_ref: VersionedObjectRef; contract_ref: VersionedObjectRef; material_pack_ref: VersionedObjectRef; evaluated_at: string }>;
const inputFields = ["blueprint_ref", "contract_ref", "evaluated_at", "feasibility_id", "material_pack_ref"];
function validateVersionedRef(value: unknown, label: string): asserts value is VersionedObjectRef {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value as Record<string, unknown>).sort().join(",") !== "digest,object_id,object_version") throw new Error(`${label} reference is invalid`);
  const reference = value as Record<string, unknown>;
  if (typeof reference.object_id !== "string" || !reference.object_id || !Number.isSafeInteger(reference.object_version) || (reference.object_version as number) < 1 || typeof reference.digest !== "string" || !/^[0-9a-f]{64}$/.test(reference.digest)) throw new Error(`${label} reference is invalid`);
}
export function validateDurationFeasibilityInput(value: unknown): asserts value is DurationFeasibilityInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("duration feasibility input is invalid");
  const input = value as Record<string, unknown>, keys = Object.keys(input).sort();
  if (keys.join(",") !== inputFields.join(",")) throw new Error("duration feasibility contains an unknown input field");
  if (typeof input.feasibility_id !== "string" || !input.feasibility_id.trim()) throw new Error("duration feasibility ID is invalid");
  validateVersionedRef(input.blueprint_ref, "duration blueprint");
  validateVersionedRef(input.contract_ref, "duration Contract");
  validateVersionedRef(input.material_pack_ref, "duration Material Evidence Pack");
  if (!isStrictComparableDateTime(input.evaluated_at)) throw new Error("duration feasibility evaluation time is invalid");
}
export function evaluateDurationFeasibility(blueprint: DurationBlueprintV1, contract: CreativeContractV2, pack: MaterialEvidencePackV1, input: DurationFeasibilityInput): DurationFeasibilityV1 {
  validateDurationFeasibilityInput(input);
  validateDurationBlueprint(blueprint);
  if (blueprint.status !== "published" || blueprint.governance.trust_status !== "trusted" || input.blueprint_ref.object_id !== blueprint.blueprint_id || input.blueprint_ref.object_version !== blueprint.blueprint_version || input.blueprint_ref.digest !== blueprint.definition_digest) throw new Error("duration blueprint is unavailable or rebound");
  if (contract.status !== "approved" || input.contract_ref.object_id !== contract.contract_id || input.contract_ref.object_version !== contract.object_version || input.contract_ref.digest !== digest(contract)) throw new Error("duration Contract is stale or rebound");
  if (pack.status !== "sufficient" || pack.project_id !== contract.project_id || !exactRef(pack.contract_ref, input.contract_ref) || input.material_pack_ref.object_id !== pack.pack_id || input.material_pack_ref.object_version !== pack.object_version || input.material_pack_ref.digest !== digest(pack)) throw new Error("duration Material Evidence Pack is stale or rebound");
  if (pack.policy_snapshot.policy_version !== DURATION_MATERIAL_POLICY_VERSION || !exactRef(pack.policy_snapshot.privacy_policy_ref, contract.privacy_policy_ref) || !exactRef(pack.policy_snapshot.rights_policy_ref, contract.rights_policy_ref)) throw new Error("duration Material Evidence Pack policy is stale or rebound");
  const blockers: string[] = [];
  if (!rationalEquals(contract.target_duration, blueprint.target_duration)) blockers.push("contract_target_duration_mismatch");
  const requiredEvidence = Math.max(blueprint.beat_count.minimum, blueprint.ending_contract.minimum_evidence_count, blueprint.beat_roles.reduce((sum, role) => sum + role.minimum_evidence_count, 0));
  const missingEvidence = Math.max(0, requiredEvidence - pack.evidence_refs.length);
  if (missingEvidence) blockers.push("insufficient_approved_evidence");
  const timescale = blueprint.target_duration.timescale;
  const toUnits = (value: RationalTime): number => rationalToUnits(value, timescale);
  const allocations = blueprint.beat_roles.map((role) => ({ role_id: role.role_id, value: toUnits(role.minimum_duration), maximum: toUnits(role.maximum_duration) }));
  let remaining = blueprint.target_duration.value - allocations.reduce((sum, role) => sum + role.value, 0);
  for (const role of allocations) { const addition = Math.min(Math.max(0, remaining), role.maximum - role.value); role.value += addition; remaining -= addition; }
  const ending = allocations.find((role) => role.role_id === "ending")!;
  if (ending.value < toUnits(blueprint.ending_contract.reserve)) blockers.push("ending_reserve_impossible");
  const allocatedTotal = allocations.reduce((sum, role) => sum + role.value, 0), variance = Math.abs(blueprint.target_duration.value - allocatedTotal);
  if (variance > toUnits(blueprint.acceptable_variance)) blockers.push("acceptable_variance_exceeded");
  const plannedBeatCount = Math.min(blueprint.beat_count.maximum, Math.max(blueprint.beat_count.minimum, pack.evidence_refs.length));
  const fingerprint = digest({ blueprint_ref: input.blueprint_ref, contract_ref: input.contract_ref, material_pack_ref: input.material_pack_ref, allocator_version: DURATION_ALLOCATOR_VERSION, policy_version: DURATION_POLICY_VERSION });
  return { schema_version: 1, feasibility_id: input.feasibility_id, project_id: contract.project_id, object_version: 1, blueprint_ref: input.blueprint_ref, contract_ref: input.contract_ref, material_pack_ref: input.material_pack_ref, input_fingerprint: fingerprint, result: blockers.length ? "blocked" : "feasible", target_duration: blueprint.target_duration, planned_beat_count: plannedBeatCount, information_density: blueprint.information_density, redundancy_policy: blueprint.redundancy_policy, emotional_curve: blueprint.emotional_curve.map((point) => ({ ...point })), allocated_roles: allocations.map((role) => ({ role_id: role.role_id, duration: { schema_version: 1, value: role.value, timescale } })), total_allocated: { schema_version: 1, value: allocatedTotal, timescale }, variance: { schema_version: 1, value: variance, timescale }, missing_evidence_count: missingEvidence, blockers: [...new Set(blockers)].sort(), evaluated_at: input.evaluated_at, provenance: { producer: "project-host", allocator_version: DURATION_ALLOCATOR_VERSION, policy_version: DURATION_POLICY_VERSION, input_refs: [input.blueprint_ref.digest, input.contract_ref.digest, input.material_pack_ref.digest] } };
}

const time = (value: number): RationalTime => ({ schema_version: 1, value, timescale: 1 });
const role = (role_id: string, minimum: number, maximum: number, minimum_evidence_count: number): DurationBlueprintV1["beat_roles"][number] => ({ role_id, minimum_duration: time(minimum), maximum_duration: time(maximum), minimum_evidence_count });
const authority = { created_at: "2026-08-24T00:00:00Z", provenance: { producer: "curated-author" as const, source_id: "duration-blueprints", source_version: "1", policy_version: DURATION_POLICY_VERSION }, governance: { reviewer_id: "ave-review", reviewed_at: "2026-08-24T00:00:00Z", trust_status: "trusted" as const } };
const defineBlueprint = (base: Omit<DurationBlueprintV1, "definition_digest">): DurationBlueprintV1 => ({ ...base, definition_digest: durationBlueprintDigest(base) });

export const builtInDurationBlueprints: readonly DurationBlueprintV1[] = deepFreeze([
  defineBlueprint({ ...authority, schema_version: 1, blueprint_id: "duration-30s-v1", blueprint_version: 1, status: "published", duration_class: "30s", objective: "Deliver one evidence-backed promise and immediate payoff", target_duration: time(30), acceptable_variance: time(1), beat_count: { minimum: 3, maximum: 5 }, information_density: "very-high", redundancy_policy: "none", beat_roles: [role("hook", 3, 5, 1), role("proof", 10, 14, 1), role("payoff", 8, 11, 1), role("ending", 5, 7, 1)], emotional_curve: [{ phase: "hook", position: 0, intensity: 0.95 }, { phase: "proof", position: 0.45, intensity: 0.7 }, { phase: "payoff", position: 0.78, intensity: 1 }, { phase: "resolution", position: 1, intensity: 0.45 }], ending_contract: { objective: "Land the promised payoff without recap", reserve: time(5), minimum_evidence_count: 1 } }),
  defineBlueprint({ ...authority, schema_version: 1, blueprint_id: "duration-60s-v1", blueprint_version: 1, status: "published", duration_class: "60s", objective: "Build one compact turn and resolved arc", target_duration: time(60), acceptable_variance: time(2), beat_count: { minimum: 4, maximum: 7 }, information_density: "high", redundancy_policy: "none", beat_roles: [role("hook", 5, 8, 1), role("setup", 8, 12, 1), role("development", 20, 28, 2), role("turn", 7, 11, 1), role("ending", 8, 12, 1)], emotional_curve: [{ phase: "hook", position: 0, intensity: 0.9 }, { phase: "setup", position: 0.25, intensity: 0.55 }, { phase: "turn", position: 0.68, intensity: 1 }, { phase: "resolution", position: 1, intensity: 0.5 }], ending_contract: { objective: "Resolve the turn with one clean final image", reserve: time(8), minimum_evidence_count: 1 } }),
  defineBlueprint({ ...authority, schema_version: 1, blueprint_id: "duration-2m-v1", blueprint_version: 1, status: "published", duration_class: "2m", objective: "Tell a coherent mini-story with context and reflection", target_duration: time(120), acceptable_variance: time(4), beat_count: { minimum: 6, maximum: 10 }, information_density: "high", redundancy_policy: "none", beat_roles: [role("hook", 8, 12, 1), role("context", 14, 20, 1), role("development", 40, 52, 2), role("turn", 16, 22, 1), role("reflection", 20, 28, 1), role("ending", 12, 18, 1)], emotional_curve: [{ phase: "hook", position: 0, intensity: 0.82 }, { phase: "context", position: 0.18, intensity: 0.48 }, { phase: "development", position: 0.45, intensity: 0.68 }, { phase: "turn", position: 0.7, intensity: 1 }, { phase: "reflection", position: 0.86, intensity: 0.72 }, { phase: "resolution", position: 1, intensity: 0.45 }], ending_contract: { objective: "Close the mini-story with evidenced reflection", reserve: time(12), minimum_evidence_count: 1 } }),
  defineBlueprint({ ...authority, schema_version: 1, blueprint_id: "duration-5m-v1", blueprint_version: 1, status: "published", duration_class: "5m", objective: "Develop a character or process journey with a midpoint change", target_duration: time(300), acceptable_variance: time(9), beat_count: { minimum: 8, maximum: 14 }, information_density: "alternating", redundancy_policy: "meaning-only", beat_roles: [role("opening", 15, 25, 1), role("setup", 35, 50, 1), role("development", 90, 120, 2), role("midpoint", 30, 45, 1), role("escalation", 55, 75, 1), role("climax", 35, 50, 1), role("ending", 25, 35, 1)], emotional_curve: [{ phase: "opening", position: 0, intensity: 0.7 }, { phase: "setup", position: 0.15, intensity: 0.45 }, { phase: "development", position: 0.38, intensity: 0.62 }, { phase: "midpoint", position: 0.55, intensity: 0.78 }, { phase: "escalation", position: 0.75, intensity: 0.9 }, { phase: "climax", position: 0.88, intensity: 1 }, { phase: "resolution", position: 1, intensity: 0.42 }], ending_contract: { objective: "Resolve the journey after the climax", reserve: time(25), minimum_evidence_count: 1 } }),
  defineBlueprint({ ...authority, schema_version: 1, blueprint_id: "duration-10m-v1", blueprint_version: 1, status: "published", duration_class: "10m", objective: "Sustain a layered narrative across distinct chapters", target_duration: time(600), acceptable_variance: time(18), beat_count: { minimum: 10, maximum: 18 }, information_density: "layered", redundancy_policy: "meaning-only", beat_roles: [role("cold-open", 20, 35, 1), role("chapter-one", 90, 120, 2), role("chapter-two", 100, 135, 2), role("midpoint", 60, 80, 1), role("chapter-three", 100, 135, 2), role("escalation", 90, 120, 2), role("climax", 55, 75, 1), role("ending", 45, 60, 1)], emotional_curve: [{ phase: "cold-open", position: 0, intensity: 0.78 }, { phase: "chapter-one", position: 0.12, intensity: 0.45 }, { phase: "chapter-two", position: 0.3, intensity: 0.6 }, { phase: "midpoint", position: 0.5, intensity: 0.82 }, { phase: "chapter-three", position: 0.68, intensity: 0.7 }, { phase: "escalation", position: 0.8, intensity: 0.9 }, { phase: "climax", position: 0.9, intensity: 1 }, { phase: "resolution", position: 1, intensity: 0.4 }], ending_contract: { objective: "Synthesize the chapter arc without restarting it", reserve: time(45), minimum_evidence_count: 1 } }),
  defineBlueprint({ ...authority, schema_version: 1, blueprint_id: "duration-30m-v1", blueprint_version: 1, status: "published", duration_class: "30m", objective: "Build a documentary-scale experience with chapters and evidence trails", target_duration: time(1800), acceptable_variance: time(54), beat_count: { minimum: 14, maximum: 30 }, information_density: "documentary", redundancy_policy: "callbacks-only", beat_roles: [role("prologue", 60, 90, 1), role("chapter-one", 240, 300, 2), role("chapter-two", 240, 300, 2), role("chapter-three", 240, 300, 2), role("evidence-trail", 300, 390, 3), role("reflection", 180, 240, 1), role("climax", 240, 300, 2), role("ending", 120, 180, 1)], emotional_curve: [{ phase: "prologue", position: 0, intensity: 0.65 }, { phase: "chapter-one", position: 0.1, intensity: 0.42 }, { phase: "chapter-two", position: 0.25, intensity: 0.58 }, { phase: "chapter-three", position: 0.42, intensity: 0.72 }, { phase: "evidence-trail", position: 0.6, intensity: 0.68 }, { phase: "reflection", position: 0.74, intensity: 0.55 }, { phase: "climax", position: 0.9, intensity: 1 }, { phase: "epilogue", position: 1, intensity: 0.35 }], ending_contract: { objective: "Close the evidence trail and echo the opening", reserve: time(120), minimum_evidence_count: 2 } }),
]);
