import { createHash } from "node:crypto";
import { creativeSkillDefinitionDigest, validateCreativeSkillDefinition, type CreativeSkillDefinitionV1 } from "./public.js";

const freeze = <T>(value: T): T => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
/** Lossless mapping: title, paragraphs and sentences remain source text, never generated advice. */
export function parseCreativeSkillCatalog(source: string): readonly CreativeSkillDefinitionV1[] {
  const sections = [...source.matchAll(/^# (\d+)\. (.+)\r?$/gm)];
  const units = [...source.matchAll(/^## ([SEAVCWPKQ]\d{2})｜([^\r\n]+)\r?\n([\s\S]*?)(?=^## |^# |$(?![\s\S]))/gm)];
  const sourceDigest = createHash("sha256").update(source).digest("hex"), ids = new Set<string>();
  const definitions = units.map(match => {
    const [, id, title, rawBody] = match, body = rawBody.trimEnd();
    const category = sections.filter(section => section.index! < match.index!).at(-1)?.[2];
    if (!category || !body || ids.has(id)) throw new Error(`CREATIVE_SKILL_CATALOG_INVALID:${id}`);
    ids.add(id);
    const lines = body.split(/\r?\n/).filter(Boolean);
    const prohibitions = lines.filter(line => /不得|不能|禁止|不默认|失败|缺失|不足|只有/.test(line));
    const base: Omit<CreativeSkillDefinitionV1, "definition_digest"> = {
      schema_version: 1, skill_id: id, skill_version: 1, status: "published", goal: title,
      applicable_contexts: [category], incompatible_contexts: [], required_evidence: [],
      sufficiency_thresholds: { minimum_coverage_ratio: 1, minimum_approved_evidence: 1 }, parameters: [],
      reasoning_rules: [{ rule_id: `${id}:body`, required_contexts: [], recommendation: body, evidence_requirement_ids: [], reason: title }],
      conflict_rules: [], failure_cases: prohibitions.length ? prohibitions : [body],
      evaluation_criteria: [{ criterion_id: `${id}:source-rules`, weight: 1, reason: body }], known_counterexamples: [],
      output_kinds: ["decision_proposal", "edit_intent_proposal"], created_at: "2026-10-01T00:00:00+08:00",
      provenance: { producer: "curated-author", source_id: "AVE_Creative_Skill_Catalog_Source.md", source_version: "1", policy_version: "source-verbatim-v1", input_refs: [sourceDigest], unresolved_assumptions: [] },
      governance: { reviewer_id: "user-provided-runtime-authorization", reviewed_at: "2026-10-01T00:00:00+08:00", trust_status: "trusted", license_id: "user-provided-local-runtime-use", license_status: "approved" },
      catalog_content: { category, purpose: title, trigger: lines[0], incompatibility: prohibitions[0] ?? "", body, source_digest: sourceDigest },
    };
    const definition = { ...base, definition_digest: creativeSkillDefinitionDigest(base) };
    validateCreativeSkillDefinition(definition); return definition;
  });
  if (definitions.length !== 64) throw new Error(`CREATIVE_SKILL_CATALOG_INVALID:expected 64, got ${definitions.length}`);
  return freeze(definitions);
}
export const parseCreativeSkillCatalogRules = (catalogSource: string) => freeze({
  common: catalogSource.split("# 1. 共用核心提示词")[1].split("# 2.")[0].trim(),
  routing: catalogSource.split("# 11. Skill Selection / Prompt Loading")[1].split("# 12.")[0].trim(),
  precedence: catalogSource.split("# 12. 优先级与冲突")[1].split("# 13.")[0].trim(),
});
