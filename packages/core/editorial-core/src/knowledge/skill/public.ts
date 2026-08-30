import { createHash } from "node:crypto";
import type { CreativeSkillDefinitionV1 } from "../../../../../../contracts/generated/typescript/editorial/creative-skill-definition.v1.js";
import type { SkillEvaluationV1 } from "../../../../../../contracts/generated/typescript/editorial/skill-evaluation.v1.js";
import type { CreativeContractV2, MaterialEvidencePackV1, VersionedObjectRef } from "../../public.js";
import { isStrictComparableDateTime } from "../date-time.js";

export type { CreativeSkillDefinitionV1, SkillEvaluationV1 };
export type SkillScalar = boolean | number | string;

function canonicalValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("creative skill contains a non-finite number"); return Object.is(value, -0) ? 0 : value; }
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value as Record<string, unknown>).filter((key) => (value as Record<string, unknown>)[key] !== undefined).sort().map((key) => [key, canonicalValue((value as Record<string, unknown>)[key])]));
  throw new Error(`creative skill contains unsupported value: ${typeof value}`);
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item);
  return Object.freeze(value);
}

export function canonicalCreativeSkill(value: unknown): string { return JSON.stringify(canonicalValue(value)); }

export function creativeSkillDefinitionDigest(definition: Omit<CreativeSkillDefinitionV1, "definition_digest"> | CreativeSkillDefinitionV1): string {
  const { definition_digest: _ignored, ...content } = definition as CreativeSkillDefinitionV1;
  return createHash("sha256").update(canonicalCreativeSkill(content)).digest("hex");
}

const forbiddenKeys = /^(?:commands?|timeline(?:_commands?)?|render_?graphs?|nodes?|backend|adapter|compiler|shell|code|executable|model_?calls?|download_?url|runtime_?url)$/i;
export function assertCreativeSkillKnowledgeOnly(value: unknown, path = "$definition"): void {
  if (typeof value === "string") return;
  if (Array.isArray(value)) { value.forEach((item, index) => assertCreativeSkillKnowledgeOnly(item, `${path}[${index}]`)); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (forbiddenKeys.test(key)) throw new Error(`creative skill execution field is forbidden: ${path}.${key}`);
    assertCreativeSkillKnowledgeOnly(item, `${path}.${key}`);
  }
}

function unique(values: readonly string[], label: string): void { if (new Set(values).size !== values.length) throw new Error(`${label} must be unique`); }
function scalarMatches(type: CreativeSkillDefinitionV1["parameters"][number]["value_type"], value: SkillScalar): boolean {
  if (type === "boolean") return typeof value === "boolean";
  if (type === "integer") return typeof value === "number" && Number.isSafeInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  return typeof value === "string";
}

export function validateCreativeSkillDefinition(definition: CreativeSkillDefinitionV1): void {
  assertCreativeSkillKnowledgeOnly(definition);
  if (definition.definition_digest !== creativeSkillDefinitionDigest(definition)) throw new Error("creative skill definition digest mismatch");
  unique(definition.applicable_contexts, "applicable contexts");
  unique(definition.incompatible_contexts, "incompatible contexts");
  if (definition.applicable_contexts.some((tag) => definition.incompatible_contexts.includes(tag))) throw new Error("creative skill context is both applicable and incompatible");
  unique(definition.required_evidence.map((item) => item.requirement_id), "evidence requirement IDs");
  unique(definition.parameters.map((item) => item.parameter_id), "parameter IDs");
  if (definition.parameters.some((item) => forbiddenKeys.test(item.parameter_id))) throw new Error("creative skill parameter carries execution authority");
  unique(definition.reasoning_rules.map((item) => item.rule_id), "reasoning rule IDs");
  unique(definition.conflict_rules.map((item) => item.conflict_id), "conflict rule IDs");
  unique(definition.evaluation_criteria.map((item) => item.criterion_id), "evaluation criterion IDs");
  const evidenceRequirements = new Set(definition.required_evidence.map((item) => item.requirement_id));
  if (definition.reasoning_rules.some((rule) => rule.evidence_requirement_ids.some((id) => !evidenceRequirements.has(id)))) throw new Error("creative skill rule references unknown evidence requirement");
  for (const parameter of definition.parameters) {
    if (parameter.minimum !== undefined && parameter.maximum !== undefined && parameter.minimum > parameter.maximum) throw new Error(`creative skill parameter range is invalid: ${parameter.parameter_id}`);
    if (parameter.value_type === "enum" && (!parameter.allowed_values?.length || parameter.default_value !== undefined && !parameter.allowed_values.includes(String(parameter.default_value)))) throw new Error(`creative skill enum parameter is invalid: ${parameter.parameter_id}`);
    if (parameter.value_type !== "enum" && parameter.allowed_values) throw new Error(`creative skill non-enum parameter cannot declare allowed values: ${parameter.parameter_id}`);
    if (parameter.default_value !== undefined && !scalarMatches(parameter.value_type, parameter.default_value)) throw new Error(`creative skill parameter default type is invalid: ${parameter.parameter_id}`);
  }
  const weight = definition.evaluation_criteria.reduce((sum, item) => sum + item.weight, 0);
  if (Math.abs(weight - 1) > 1e-9) throw new Error("creative skill evaluation weights must sum to one");
  if (definition.status === "published" && (definition.governance.trust_status !== "trusted" || definition.governance.license_status !== "approved" || definition.provenance.unresolved_assumptions.length)) throw new Error("published creative skill is not trusted, licensed and resolved");
  if (definition.status === "retired" && !definition.supersedes_ref && definition.skill_version > 1) throw new Error("retired creative skill version lacks supersession metadata");
}

export type SkillEvaluationInput = Readonly<{
  evaluation_id: string;
  definition_ref: VersionedObjectRef;
  contract_ref: VersionedObjectRef;
  material_pack_ref: VersionedObjectRef;
  context_tags: readonly string[];
  parameter_values?: Readonly<Record<string, SkillScalar>>;
  active_conflict_dimensions?: readonly string[];
  selected_skill_ids?: readonly string[];
  evaluated_at: string;
}>;

export const CREATIVE_SKILL_EVALUATOR_VERSION = "skill-evaluator-v1";
export const CREATIVE_SKILL_POLICY_VERSION = "knowledge-v1";

function validateVersionedRef(value: unknown, label: string): asserts value is VersionedObjectRef {
  const reference = value as Partial<VersionedObjectRef> | null;
  if (!reference || typeof reference !== "object" || Object.keys(reference).some((key) => !["object_id", "object_version", "digest"].includes(key)) || typeof reference.object_id !== "string" || !reference.object_id || !Number.isSafeInteger(reference.object_version) || Number(reference.object_version) < 1 || typeof reference.digest !== "string" || !/^[0-9a-f]{64}$/.test(reference.digest)) throw new Error(`creative skill evaluation ${label} is invalid`);
}

export function validateSkillEvaluationInput(input: SkillEvaluationInput): void {
  if (!input || typeof input !== "object") throw new Error("creative skill evaluation input is invalid");
  const allowedInputFields = new Set(["evaluation_id", "definition_ref", "contract_ref", "material_pack_ref", "context_tags", "parameter_values", "active_conflict_dimensions", "selected_skill_ids", "evaluated_at"]);
  if (Object.keys(input as Record<string, unknown>).some((key) => !allowedInputFields.has(key))) throw new Error("creative skill evaluation contains unknown input field");
  assertCreativeSkillKnowledgeOnly(input, "$evaluation-input");
  if (typeof input.evaluation_id !== "string" || !input.evaluation_id) throw new Error("creative skill evaluation ID is invalid");
  validateVersionedRef(input.definition_ref, "Definition reference");
  validateVersionedRef(input.contract_ref, "Contract reference");
  validateVersionedRef(input.material_pack_ref, "Material Evidence Pack reference");
  if (!Array.isArray(input.context_tags) || input.context_tags.some((tag) => typeof tag !== "string" || !tag)) throw new Error("creative skill evaluation context tags are invalid");
  if (input.parameter_values !== undefined && (!input.parameter_values || typeof input.parameter_values !== "object" || Array.isArray(input.parameter_values))) throw new Error("creative skill evaluation parameters are invalid");
  for (const values of [input.active_conflict_dimensions, input.selected_skill_ids]) if (values !== undefined && (!Array.isArray(values) || values.some((value) => typeof value !== "string" || !value))) throw new Error("creative skill evaluation selection metadata is invalid");
  if (!isStrictComparableDateTime(input.evaluated_at)) throw new Error("creative skill evaluation time is invalid");
}

function sameVersionedRef(left: VersionedObjectRef, right: VersionedObjectRef): boolean {
  return left.object_id === right.object_id && left.object_version === right.object_version && left.digest === right.digest;
}

function immutableObjectDigest(value: unknown): string {
  return createHash("sha256").update(canonicalCreativeSkill(value)).digest("hex");
}

function resolveParameters(definition: CreativeSkillDefinitionV1, supplied: Readonly<Record<string, SkillScalar>>): Record<string, SkillScalar> {
  const known = new Set(definition.parameters.map((item) => item.parameter_id));
  if (Object.keys(supplied).some((key) => !known.has(key))) throw new Error("creative skill evaluation contains unknown parameter");
  const resolved: Record<string, SkillScalar> = {};
  for (const parameter of definition.parameters) {
    const value = supplied[parameter.parameter_id] ?? parameter.default_value;
    if (value === undefined) { if (parameter.required) throw new Error(`creative skill parameter is required: ${parameter.parameter_id}`); continue; }
    if (!scalarMatches(parameter.value_type, value)) throw new Error(`creative skill parameter type is invalid: ${parameter.parameter_id}`);
    if (typeof value === "number" && (parameter.minimum !== undefined && value < parameter.minimum || parameter.maximum !== undefined && value > parameter.maximum)) throw new Error(`creative skill parameter is outside range: ${parameter.parameter_id}`);
    if (parameter.value_type === "enum" && !parameter.allowed_values?.includes(String(value))) throw new Error(`creative skill enum value is invalid: ${parameter.parameter_id}`);
    resolved[parameter.parameter_id] = value;
  }
  return Object.fromEntries(Object.entries(resolved).sort(([left], [right]) => left.localeCompare(right)));
}

export function evaluateCreativeSkill(definition: CreativeSkillDefinitionV1, contract: CreativeContractV2, pack: MaterialEvidencePackV1, input: SkillEvaluationInput): SkillEvaluationV1 {
  validateSkillEvaluationInput(input);
  validateCreativeSkillDefinition(definition);
  if (definition.status !== "published" || definition.governance.trust_status !== "trusted" || definition.governance.license_status !== "approved") throw new Error("creative skill definition is unavailable");
  if (input.definition_ref.object_id !== definition.skill_id || input.definition_ref.object_version !== definition.skill_version || input.definition_ref.digest !== definition.definition_digest) throw new Error("creative skill definition reference is rebound");
  if (contract.status !== "approved" || input.contract_ref.object_id !== contract.contract_id || input.contract_ref.object_version !== contract.object_version || input.contract_ref.digest !== immutableObjectDigest(contract)) throw new Error("creative skill Contract reference is stale or rebound");
  if (pack.project_id !== contract.project_id || !sameVersionedRef(pack.contract_ref, input.contract_ref)) throw new Error("creative skill Material Evidence Pack Contract reference is rebound");
  if (pack.policy_snapshot.policy_version !== CREATIVE_SKILL_POLICY_VERSION || !sameVersionedRef(pack.policy_snapshot.privacy_policy_ref, contract.privacy_policy_ref) || !sameVersionedRef(pack.policy_snapshot.rights_policy_ref, contract.rights_policy_ref)) throw new Error("creative skill Material Evidence Pack policy is stale or rebound");
  if (pack.status !== "sufficient" || input.material_pack_ref.object_id !== pack.pack_id || input.material_pack_ref.object_version !== pack.object_version || input.material_pack_ref.digest !== immutableObjectDigest(pack)) throw new Error("creative skill Material Evidence Pack is stale, insufficient or rebound");
  unique(input.context_tags, "evaluation context tags");
  unique(input.active_conflict_dimensions ?? [], "active conflict dimensions");
  unique(input.selected_skill_ids ?? [], "selected skill IDs");
  const contextTags = [...input.context_tags].sort();
  const resolvedParameters = resolveParameters(definition, input.parameter_values ?? {});
  const availableEvidence = new Set<string>();
  const satisfiedRequirements = new Set<string>();
  for (const requirement of definition.required_evidence) {
    const matches = pack.evidence_refs.filter((reference) => requirement.evidence_types.includes(reference.evidence_type));
    matches.forEach((reference) => availableEvidence.add(reference.evidence_id));
    if (matches.length >= requirement.minimum_count) satisfiedRequirements.add(requirement.requirement_id);
  }
  const evidenceRatio = definition.required_evidence.length === 0 ? 1 : satisfiedRequirements.size / definition.required_evidence.length;
  const incompatible = definition.incompatible_contexts.filter((tag) => contextTags.includes(tag));
  const contextApplicable = definition.applicable_contexts.some((tag) => contextTags.includes(tag));
  const selectedSkills = new Set(input.selected_skill_ids ?? []), activeDimensions = new Set(input.active_conflict_dimensions ?? []);
  const conflicts = definition.conflict_rules.filter((rule) => activeDimensions.has(rule.dimension) || rule.other_skill_id !== undefined && selectedSkills.has(rule.other_skill_id));
  const matchedRules = definition.reasoning_rules.filter((rule) => rule.required_contexts.every((tag) => contextTags.includes(tag)) && rule.evidence_requirement_ids.every((id) => satisfiedRequirements.has(id)));
  const blocked = !contextApplicable || pack.evidence_refs.length < definition.sufficiency_thresholds.minimum_approved_evidence || evidenceRatio < definition.sufficiency_thresholds.minimum_coverage_ratio;
  const conflicting = incompatible.length > 0 || conflicts.some((rule) => rule.resolution_policy !== "prefer_higher_precedence");
  const result: SkillEvaluationV1["result"] = blocked ? "blocked" : conflicting ? "conflicting" : "applicable";
  const score = result === "applicable" ? Math.min(1, (evidenceRatio + (matchedRules.length / definition.reasoning_rules.length)) / 2) : 0;
  const confidence = result === "applicable" ? evidenceRatio : 0;
  const risks = [...incompatible.map((tag) => `incompatible context: ${tag}`), ...conflicts.map((rule) => `skill conflict: ${rule.conflict_id}`), ...(blocked ? ["required evidence or applicable context is insufficient"] : [])].sort();
  const alternatives = result === "applicable" ? definition.known_counterexamples.slice(0, 1).map((_item) => "use a chronological evidence-bound direction") : ["omit this skill from the current direction"];
  const fingerprintInput = { definition_ref: input.definition_ref, contract_ref: input.contract_ref, material_pack_ref: input.material_pack_ref, context_tags: contextTags, parameter_values: resolvedParameters, active_conflict_dimensions: [...(input.active_conflict_dimensions ?? [])].sort(), selected_skill_ids: [...(input.selected_skill_ids ?? [])].sort(), policy_version: CREATIVE_SKILL_POLICY_VERSION, evaluator_version: CREATIVE_SKILL_EVALUATOR_VERSION };
  const inputFingerprint = createHash("sha256").update(canonicalCreativeSkill(fingerprintInput)).digest("hex");
  const reason = result === "applicable" ? `Applicable with ${satisfiedRequirements.size}/${definition.required_evidence.length} evidence requirements and ${matchedRules.length}/${definition.reasoning_rules.length} reasoning rules matched.` : result === "conflicting" ? `Conflicting contexts or skills require resolution: ${[...incompatible, ...conflicts.map((rule) => rule.conflict_id)].join(", ")}.` : "Required evidence or applicable context is insufficient.";
  return {
    schema_version: 1, evaluation_id: input.evaluation_id, project_id: contract.project_id, object_version: 1,
    definition_ref: input.definition_ref, contract_ref: input.contract_ref, material_pack_ref: input.material_pack_ref, input_fingerprint: inputFingerprint,
    context_tags: contextTags, result, required_evidence: definition.required_evidence.map((item) => item.requirement_id).sort(), available_evidence: [...availableEvidence].sort(), parameter_values: resolvedParameters,
    matched_rule_ids: matchedRules.map((rule) => rule.rule_id).sort(), conflict_ids: conflicts.map((rule) => rule.conflict_id).sort(), score, confidence, confidence_basis: `${satisfiedRequirements.size} of ${definition.required_evidence.length} required evidence groups is satisfied by approved Evidence.`, reason, risks, alternatives, output_kinds: result === "applicable" ? [...definition.output_kinds] : [],
    evaluated_at: input.evaluated_at, provenance: { producer: "project-host", evaluator_version: CREATIVE_SKILL_EVALUATOR_VERSION, policy_version: CREATIVE_SKILL_POLICY_VERSION, input_refs: [input.definition_ref.digest, input.contract_ref.digest, input.material_pack_ref.digest], unresolved_assumptions: [] },
  };
}

const emotionalContrastBase: Omit<CreativeSkillDefinitionV1, "definition_digest"> = {
  schema_version: 1, skill_id: "emotional-contrast-introduction", skill_version: 1, status: "published", goal: "Open with an evidenced consequential reaction before its explanation.",
  applicable_contexts: ["personal-story", "reaction-evidenced"], incompatible_contexts: ["strict-chronology"],
  required_evidence: [{ requirement_id: "reaction", evidence_types: ["asr", "scene"], minimum_count: 1 }], sufficiency_thresholds: { minimum_coverage_ratio: 1, minimum_approved_evidence: 1 },
  parameters: [{ parameter_id: "intensity", value_type: "enum", required: false, default_value: "moderate", allowed_values: ["moderate", "strong"] }],
  reasoning_rules: [{ rule_id: "reaction-first", required_contexts: ["reaction-evidenced"], recommendation: "Propose a reaction-led opening.", evidence_requirement_ids: ["reaction"], reason: "The evidenced consequence can create curiosity without inventing causality." }],
  conflict_rules: [{ conflict_id: "chronology", dimension: "narrative-order", precedence: "contract", resolution_policy: "block" }], failure_cases: ["The reaction is unrelated to the explained event."],
  evaluation_criteria: [{ criterion_id: "evidence-strength", weight: 1, reason: "The opening must remain evidence-bound." }], known_counterexamples: ["A decorative reaction shot with no causal support."], output_kinds: ["direction_proposal", "story_proposal"],
  created_at: "2026-08-24T00:00:00.000Z", provenance: { producer: "curated-author", source_id: "ave-built-in", source_version: "1", policy_version: "knowledge-v1", input_refs: ["OBJECT_MODEL"], unresolved_assumptions: [] },
  governance: { reviewer_id: "ave-review", reviewed_at: "2026-08-24T00:00:00.000Z", trust_status: "trusted", license_id: "ave-built-in", license_status: "approved" },
};

export const builtInCreativeSkillDefinitions: readonly CreativeSkillDefinitionV1[] = deepFreeze([{ ...emotionalContrastBase, definition_digest: creativeSkillDefinitionDigest(emotionalContrastBase) }]);
