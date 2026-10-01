import { creationDigest } from "../../../packages/platform/contract-runtime/src/public.js";
import { creativeSkillCatalog } from "../../../packages/platform/project-host/src/creative-skill-catalog.js";

/** Explicit fixture model response, never production fallback. */
export function fixtureSkillEvaluations(context: any, ids = ["S01"]) {
  return ids.map(id => {
    const definition = creativeSkillCatalog.find(item => item.skill_id === id)!;
    return { skill_id: id, skill_version: definition.skill_version, definition_digest: definition.definition_digest, result: "applicable", disposition: "edit_proposed", evidence_ids: context.source_spans.flatMap((span: any) => span.observations.map((item: any) => item.evidence_id)), required_capabilities: ["source-selection"], reason: "Fixture selects an evidenced source strategy under current request." };
  });
}
export function fixtureSkillEffects(context: any, decision: any, paths?: Record<string, string>) {
  return context.creative_skills.evaluations.filter((item: any) => item.result === "applicable" && item.disposition === "edit_proposed").map((item: any) => {
    const path = paths?.[item.skill_id] ?? "/shots";
    let value = decision; for (const key of path.slice(1).split("/")) value = value[key];
    return { definition_ref: { object_id: item.skill_id, object_version: item.skill_version, digest: item.definition_digest }, decision_path: path, value_digest: creationDigest(value), evidence_ids: item.evidence_ids, reason: "Fixture binds the selected full rules to actual executable fields." };
  });
}
export function fixtureSkillExchange(context: any, exchange: any, decision: any) {
  if (!context.creative_skills) return exchange;
  if (exchange.kind === "measure_selection" && context.creative_skills.stage === "plan") return { ...exchange, skill_evaluations: fixtureSkillEvaluations(context) };
  if (exchange.kind === "final" && context.creative_skills.stage === "confirm") {
    const measured = context.planning_exchange.exchanges.find((item: any) => item.exchange.query_id === exchange.measured_query_id).exchange;
    const resolved = { ...exchange.creative, shots: measured.selection.map((selection: any) => {
      const choice = selection.source_choice;
      const window = choice.kind === "custom_window" ? choice.source_window : context.source_spans.flatMap((span: any) => span.observations).find((item: any) => item.option_id === choice.option_id).source_window;
      return { ...exchange.creative.shots.find((shot: any) => shot.shot_id === selection.selection_id), timing: selection.timing, source_window: window };
    }) };
    return { ...exchange, creative: { ...exchange.creative, skill_effects: fixtureSkillEffects(context, resolved) } };
  }
  return exchange;
}
