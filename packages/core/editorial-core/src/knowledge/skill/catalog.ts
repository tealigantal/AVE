import { createHash } from "node:crypto";
import { creativeSkillDefinitionDigest, validateCreativeSkillDefinition, type CreativeSkillDefinitionV1 } from "./public.js";
const freeze = <T>(value: T): T => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
/** Only verifies provenance and shape. Semantics are authored once in catalog.v1.json, never inferred from prose. */
export function parseCreativeSkillCatalog(source: string, catalog: unknown): readonly CreativeSkillDefinitionV1[] {
  const data = catalog as {catalog_version: number; source_digest: string; definitions: CreativeSkillDefinitionV1[]};
  const digest = createHash("sha256").update(source).digest("hex");
  const units = [...source.matchAll(/^## ([SEAVCWPKQ]\d{2})｜([^\r\n]+)\r?\n([\s\S]*?)(?=^## |^# |$(?![\s\S]))/gm)];
  if (data?.catalog_version !== 1 || data.source_digest !== digest || data.definitions?.length !== 64 || units.length !== 64 || new Set(units.map(item=>item[1])).size !== 64) throw new Error("CREATIVE_SKILL_CATALOG_INVALID");
  const ids = new Set<string>();
  for (const definition of data.definitions) {
    const unit = units.find(item=>item[1]===definition.skill_id);
    if (!unit || ids.has(definition.skill_id) || definition.skill_version !== 1 || definition.catalog_content?.body !== unit[3].trimEnd() || definition.goal !== unit[2] || definition.catalog_content.source_digest !== digest || definition.status !== "local_runtime_approved" || !definition.routing_metadata || definition.required_evidence.length === 0) throw new Error("CREATIVE_SKILL_CATALOG_INVALID");
    ids.add(definition.skill_id); validateCreativeSkillDefinition(definition);
    if(definition.definition_digest !== creativeSkillDefinitionDigest(definition)) throw new Error("CREATIVE_SKILL_CATALOG_INVALID");
  }
  return freeze(data.definitions);
}
export const parseCreativeSkillCatalogRules = (source: string) => freeze({common: source.split("# 1. 共用核心提示词")[1].split("# 2.")[0].trim(),routing: source.split("# 11. Skill Selection / Prompt Loading")[1].split("# 12.")[0].trim(),precedence: source.split("# 12. 优先级与冲突")[1].split("# 13.")[0].trim()});
export type SkillRoutingContext = Readonly<{task: string; focus: readonly string[]; platform: string | null; commercial: boolean; knowledge: boolean; observation_kinds: readonly string[]; executable_capabilities: readonly string[]; profile_dimensions: readonly string[]; protected_requirements: readonly string[]; audio_library_available?: boolean}>;
/** Bounded candidate filtering only: no applicability, Story, source, timing or edit is generated here. */
export function routeCreativeSkillCandidates(definitions: readonly CreativeSkillDefinitionV1[], input: SkillRoutingContext): readonly string[] {
  const eligible = definitions.filter(d=>{
    const m=d.routing_metadata!, category=d.catalog_content!.category;
    if(category.startsWith("Commercial") && !input.commercial || category.startsWith("Platform") && (!input.platform || !m.focus.includes(input.platform)) || category.startsWith("Knowledge") && !input.knowledge) return false;
    if(category.startsWith("Workflow") && !m.focus.some(f=>input.focus.includes(f))) return false;
    if(category.startsWith("Quality") && !m.tasks.includes(input.task)) return false;
    if(category.startsWith("Audio") && !input.observation_kinds.includes("audio") && !input.audio_library_available) return false;
    if(m.evidence_kinds.includes("transcript") && !input.observation_kinds.includes("transcript")) return false;
    return m.tasks.includes(input.task) || category.startsWith("Platform") || category.startsWith("Commercial") && input.commercial || category.startsWith("Knowledge") && input.knowledge;
  });
  const ranked=eligible.map(d=>{const m=d.routing_metadata!;const focus=m.focus.some(f=>input.focus.includes(f));const gaps=m.capability_hints.filter(c=>!input.executable_capabilities.includes(c));return {d,score:m.priority+(focus?100:0)+(input.protected_requirements.length && m.focus.includes("requirements")?20:0)+(m.focus.some(f=>input.profile_dimensions.includes(f))?5:0)-(gaps.length && !focus?60:0)};}).sort((a,b)=>b.score-a.score||a.d.skill_id.localeCompare(b.d.skill_id));
  const quotas: Record<string,number>={Story:3,Editing:3,Audio:input.audio_library_available&&input.focus.includes("effects")?3:2,Visual:1,Workflow:2,Quality:1,Commercial:input.commercial?1:0,Platform:input.platform?1:0,Knowledge:input.knowledge?3:0};
  const selected: string[]=[];
  // Explicit domains reserve space; selection still belongs to the model.
  for(const prefix of ["Platform","Commercial","Knowledge","Workflow","Quality","Story","Editing","Audio","Visual"]){for(const item of ranked.filter(item=>item.d.catalog_content!.category.startsWith(prefix)).slice(0,quotas[prefix])) if(selected.length<12)selected.push(item.d.skill_id);}
  for(const item of ranked)if(selected.length<Math.min(12,eligible.length)&&!selected.includes(item.d.skill_id))selected.push(item.d.skill_id);
  return freeze(selected);
}
