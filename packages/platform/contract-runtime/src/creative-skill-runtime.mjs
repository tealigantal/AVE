import { creationDigest, CreationError } from "./creation-session.mjs";
import { skillEvaluationV2Schema, skillEvaluationV2Validator } from "./generated/creative-context-validators.mjs";

const fail = (status, message) => { throw new CreationError(`CREATIVE_SKILL_${status.toUpperCase()}`, message); };
const statuses = skillEvaluationV2Schema.properties.result.enum;
export const skillEvaluationProposalSchema = {
  type: "array", minItems: 1, maxItems: 12, items: {
    type: "object", additionalProperties: false,
    required: ["skill_id", "result", "evidence_ids", "required_capabilities", "reason", "disposition"],
    properties: {
      skill_id: { type: "string" }, skill_version: { const: 1 }, definition_digest: { type: "string", pattern: "^[0-9a-f]{64}$" },
      result: { enum: statuses }, disposition: { enum: ["decision_only", "no_change", "edit_proposed", "none"] }, evidence_ids: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
      required_capabilities: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } }, reason: { type: "string", minLength: 1 },
    },
  },
};
export function assertSkillRoot(context) {
  const root = context.creative_skills;
  if (!root) return;
  if (root.protocol !== "skill-demand-v1" || !Array.isArray(root.definitions) || root.definitions.length !== 64 || !Array.isArray(root.candidate_ids) || root.candidate_ids.length > 12 || root.candidate_ids.length === 0 || !Array.isArray(root.executable_capabilities)) fail("failure", "invalid built-in knowledge root");
  const ids = new Set();
  for (const definition of root.definitions) {
    const { definition_digest, ...body } = definition;
    if (ids.has(definition.skill_id) || definition.skill_version !== 1 || definition.status !== "local_runtime_approved" || definition.governance?.trust_status !== "user_authorized" || definition.governance?.license_status !== "redistribution_not_granted" || definition_digest !== creationDigest(body) || !definition.catalog_content?.body) fail("failure", "definition identity/content is damaged");
    ids.add(definition.skill_id);
  }
  if (new Set(root.candidate_ids).size !== root.candidate_ids.length || root.candidate_ids.some(id => !ids.has(id))) fail("failure", "unknown or duplicate candidate identity");
}
export function validateSkillEvaluations(context, evaluations) {
  assertSkillRoot(context);
  const root = context.creative_skills;
  if (!root || !Array.isArray(evaluations) || !evaluations.length || evaluations.length > 12) fail("failure", "bounded SkillEvaluation proposals required");
  const evidence = new Set(context.source_spans.flatMap(span => span.observations.map(item => item.evidence_id))), seen = new Set();
  for (const evaluation of evaluations) {
    const definition = root.definitions.find(item => item.skill_id === evaluation.skill_id);
    if (!definition || !root.candidate_ids.includes(evaluation.skill_id) || seen.has(evaluation.skill_id) || evaluation.skill_version !== undefined && evaluation.skill_version !== definition.skill_version || evaluation.definition_digest !== undefined && evaluation.definition_digest !== definition.definition_digest || !statuses.includes(evaluation.result) || !evaluation.reason?.trim() || !Array.isArray(evaluation.evidence_ids) || !Array.isArray(evaluation.required_capabilities)) fail("failure", "SkillEvaluation protocol/definition pin is invalid");
    seen.add(evaluation.skill_id);
    if (evaluation.evidence_ids.some(id => !evidence.has(id))) fail("failure", "SkillEvaluation references unavailable evidence");
    const missing = evaluation.required_capabilities.filter(capability => !root.executable_capabilities.includes(capability));
    if (evaluation.result === "failure") fail("failure", evaluation.reason);
    if (evaluation.result === "applicable" && !["decision_only", "no_change", "edit_proposed"].includes(evaluation.disposition) || evaluation.result !== "applicable" && evaluation.disposition !== "none") fail("failure", "invalid result/disposition combination");
    if (evaluation.result === "applicable" && evaluation.disposition === "edit_proposed" && !evaluation.evidence_ids.length) fail("insufficient_evidence", `${evaluation.skill_id}: applicable requires grounded evidence`);
    if (evaluation.result === "applicable" && evaluation.disposition === "edit_proposed" && (!evaluation.required_capabilities.length || missing.length)) fail("unsupported_capability", `${evaluation.skill_id}: ${missing.join(",") || "no executable effect declared"}`);
    if (evaluation.result === "unsupported_capability" && !missing.length) fail("failure", "unsupported status must name an actual unavailable capability");
  }
  return evaluations.map(evaluation => {
    const definition = root.definitions.find(item => item.skill_id === evaluation.skill_id);
    const bound = { ...evaluation, schema_version: 2, evaluation_id: `skill-evaluation:${creationDigest({ context, evaluation })}`, context_kind: "creation-planning", skill_version: definition.skill_version, definition_digest: definition.definition_digest,
      input_fingerprint: creationDigest(context), context_binding: { request: creationDigest(context.request), observations: creationDigest({ refs: context.observation_refs ?? [], spans: context.source_spans }), timeline: creationDigest(context.timeline), profile: creationDigest(context.profile ?? null), capabilities: creationDigest(root.executable_capabilities) } };
    if (!skillEvaluationV2Validator(bound)) fail("failure", "Host-bound SkillEvaluationV2 violates its canonical contract");
    return bound;
  });
}
/** The local root retains the whole immutable catalogue; physical model inputs never do. */
export function projectCreativeSkills(context, exchanges) {
  assertSkillRoot(context); const root=context.creative_skills; if(!root) return null;
  const instruction="Read the candidate complete rules and select only relevant Skills. Evaluate AFTER reading full bodies. applicable may be decision_only (Story/review judgment without edit), no_change (already correct), or edit_proposed. Only edit_proposed requires executable capabilities and actual skill_effects; never invent an edit to prove use. All selected evaluations are audited. not_applicable, insufficient_evidence, unsupported_capability and failure remain distinct. Facts/permissions/hard requirements/protected refs > current request > project exception > applicable authorized Profile > Skill > Platform/Trend. Old Profile preferences cannot override this request. Trend is advisory, never authorization. For edit_proposed, copy exact definition_ref, cite grounded observations and required executable capabilities. Bind effects only to actual /shots, /shots/0/source_window, /shots/0/timing, /shots/0/embedded_gain_db, /shots/0/reframe, /shots/0/color, /audio or /captions fields. Never prefix /creative, never bind purpose/thesis/reason/null, never invent hashes. Host computes value_digest. Empty collections mean removal only with grounded prior Timeline content. Malformed evidence or refs fail; no filtering, replacement, retry or fallback.";
  if(!exchanges.length) return {protocol:root.protocol,stage:"plan",executable_capabilities:root.executable_capabilities,common:root.rules.common,precedence:root.rules.precedence,candidates:root.candidate_ids.map(id=>{const d=root.definitions.find(d=>d.skill_id===id);return {skill_id:id,definition_ref:{object_id:id,object_version:d.skill_version,digest:d.definition_digest},required_evidence:d.required_evidence,conflict_rules:d.conflict_rules,failure_cases:d.failure_cases,known_counterexamples:d.known_counterexamples,evaluation_criteria:d.evaluation_criteria.map(item=>({criterion_id:item.criterion_id,weight:item.weight,rule_ref:d.reasoning_rules[0].rule_id})),body_rule_id:d.reasoning_rules[0].rule_id,body:d.catalog_content.body};}),instruction};
  const evaluations=validateSkillEvaluations(context,exchanges[0].exchange.skill_evaluations);
  return {protocol:root.protocol,stage:"confirm",evaluations,executable_capabilities:root.executable_capabilities,instruction:"Confirm the complete-rule measurement using its exact feasible receipt; do not request another measurement, rebind evaluations or manufacture edits. Only edit_proposed evaluations need grounded skill_effects. decision_only/no_change are valid with zero effects. "+instruction};
}
/** Constrain transport annotations to exact selected pins and real measured source fields. No creative values are generated here. */
export function bindSkillEffectProposalSchema(context, exchanges, schema) {
  const selected = validateSkillEvaluations(context, exchanges[0].exchange.skill_evaluations).filter(item => item.result === "applicable" && item.disposition === "edit_proposed");
  const selections = exchanges.at(-1).exchange.selection;
  const item = schema.items;
  const variants = selected.map(evaluation => {
    const paths = [];
    selections.forEach((selection, index) => {
      const choice = selection.source_choice;
      const source = choice.kind === "custom_window" ? choice.source_window : context.source_choice_catalog.find(item => item.option_id === choice.option_id)?.source_window;
      if (!source) fail("failure", "measured effect source identity unavailable");
      const span = context.source_spans.find(span => span.span_id === source.span_id && span.asset_id === source.asset_id);
      if (!span?.observations.some(observation => evaluation.evidence_ids.includes(observation.evidence_id))) return;
      const caps = evaluation.required_capabilities;
      if (caps.includes("source-selection")) paths.push(`/shots/${index}/source_window`);
      if (caps.includes("weighted-pacing") || caps.includes("exact-source-timing")) paths.push(`/shots/${index}/timing`);
      if (caps.includes("embedded-gain") || caps.includes("audio-source-selection")) paths.push(`/shots/${index}/embedded_gain_db`);
      if (caps.includes("static-reframe") || caps.includes("static-transform")) paths.push(`/shots/${index}/reframe`);
      if (caps.includes("basic-color")) paths.push(`/shots/${index}/color`);
    });
    if (paths.length || evaluation.required_capabilities.includes("source-order")) paths.push("/shots");
    if (evaluation.required_capabilities.some(cap => cap.endsWith("captions"))) paths.push("/captions");
    if (evaluation.required_capabilities.some(cap => cap.startsWith("audio-"))) paths.push("/audio");
    if (!paths.length) fail("failure", "selected Skill has no bindable measured decision field");
    const variant = structuredClone(item);
    variant.properties.definition_ref = { const: { object_id: evaluation.skill_id, object_version: evaluation.skill_version, digest: evaluation.definition_digest } };
    variant.properties.decision_path = { enum: paths };
    return variant;
  });
  if (variants.length) schema.items = { oneOf: variants };
  else schema.maxItems = 0;
  schema.minItems = selected.length;
}
export function assertCreativeSkillEffects(context, exchanges, decision) {
  if (!context.creative_skills) return;
  const evaluations = validateSkillEvaluations(context, exchanges[0]?.exchange.skill_evaluations);
  const selected = evaluations.filter(item => item.result === "applicable" && item.disposition === "edit_proposed");
  if (!Array.isArray(decision.skill_effects)) fail("failure", "final decision must bind Skill effects");
  const covered = new Set();
  for (const effect of decision.skill_effects) {
    const evaluation = selected.find(item => item.skill_id === effect.definition_ref.object_id);
    if (!evaluation || effect.definition_ref.object_version !== evaluation.skill_version || effect.definition_ref.digest !== evaluation.definition_digest) fail("failure", "effect definition is not selected/pinned");
    if (!/^\/(shots(?:\/\d+\/(source_window|timing(?:\/(kind|weight|duration_ticks))?|embedded_gain_db|reframe|color))?|audio(?:\/\d+(?:\/(source|offset|gain_db|fade_in|fade_out|role))?)?|captions(?:\/\d+(?:\/(text|offset|duration|style|audio_anchor))?)?)$/.test(effect.decision_path)) fail("failure", "Skill effect must bind an executable decision field");
    let value = decision;
    for (const key of effect.decision_path.slice(1).split("/")) { if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) fail("failure", "Skill effect path is absent"); value = value[key]; }
    if (value === null || effect.value_digest !== undefined && effect.value_digest !== creationDigest(value) || !effect.evidence_ids.length || effect.evidence_ids.some(id => !evaluation.evidence_ids.includes(id))) fail("failure", "Skill effect value/evidence was rebound or has no executable value");
    const parts = effect.decision_path.slice(1).split("/"), collection = parts[0];
    const caps = evaluation.required_capabilities, field = parts[2];
    const related = collection === "captions" ? caps.some(cap => cap.endsWith("captions")) : collection === "audio" ? caps.some(cap => cap.startsWith("audio-")) : !field ? caps.some(cap => ["source-selection", "source-order", "weighted-pacing", "exact-source-timing", "embedded-gain", "audio-source-selection", "static-transform", "static-reframe", "basic-color"].includes(cap)) : field === "source_window" ? caps.includes("source-selection") : field === "timing" ? caps.some(cap => ["weighted-pacing", "exact-source-timing"].includes(cap)) : field === "embedded_gain_db" ? caps.some(cap => ["embedded-gain", "audio-source-selection"].includes(cap)) : field === "reframe" ? caps.some(cap => ["static-transform", "static-reframe"].includes(cap)) : field === "color" && caps.includes("basic-color");
    if (!related) fail("failure", "Skill effect field is unrelated to its declared executable capabilities");
    const targets = parts.length > 1 ? [decision[collection][Number(parts[1])]] : decision[collection];
    if (!targets.length) {
      const prior = context.timeline?.tracks ?? [];
      const removed = collection === "audio" ? prior.filter(track => track.kind === "audio").flatMap(track => track.clips ?? []) : collection === "captions" ? prior.flatMap(track => track.captions ?? []) : [];
      const groundedRemoval = removed.some(item => item.semantic_sidecar?.evidence_refs?.some(id => effect.evidence_ids.includes(id) || collection === "audio" && context.source_spans.some(span => span.span_id === id && span.asset_id === item.source?.asset_id && span.observations.some(observation => effect.evidence_ids.includes(observation.evidence_id)))));
      if (!removed.length || !groundedRemoval) fail("failure", "empty collection has no grounded prior content to remove");
    } else {
      const grounded = targets.some(target => {
        const source = collection === "shots" ? target.source_window : collection === "audio" ? target.source : null;
        if (source) return context.source_spans.some(span => span.span_id === source.span_id && span.asset_id === source.asset_id && span.observations.some(observation => effect.evidence_ids.includes(observation.evidence_id)));
        return collection === "captions" && target.evidence_ids?.some(id => effect.evidence_ids.includes(id));
      });
      if (!grounded) fail("failure", "Skill effect evidence is unrelated to its actual decision content");
    }
    effect.value_digest = creationDigest(value);
    covered.add(evaluation.skill_id);
  }
  if (selected.some(item => !covered.has(item.skill_id))) fail("failure", "selected Skill has no observable decision effect");
}
