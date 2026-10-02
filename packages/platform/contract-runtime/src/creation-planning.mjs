import { validateAudioResourceSelections, validatePlanningAudioReceipts, planningAudioContext } from "./soundtrack-planning.mjs";
import { allocateCreationSelectionTicks, assertCreationDecisionV1 } from "./creation-decision.mjs";
import { createHash } from "node:crypto";
import { creationDigest, CreationError } from "./creation-session.mjs";
import { creationPlanningExchangeV3Validator } from "./generated/creative-context-validators.mjs";
import { historicalPlanningExchangeV2Validator } from "./creation-planning-legacy-v2.mjs";
import { projectCreativeSkills, validateSkillEvaluations, assertCreativeSkillEffects, skillEvaluationProposalSchema, bindSkillEffectProposalSchema } from "./creative-skill-runtime.mjs";

const LEGACY_PLANNING_PROTOCOL = Object.freeze({ protocol: "planning-exchange-v1", tool: "measure_creation_selection", max_measurements: 2, max_physical_calls: 3 });
const fail = (code, message) => { throw new CreationError(code, message); };
const same = (a, b) => creationDigest(a) === creationDigest(b);
const cmp = (a, b) => BigInt(a.value) * BigInt(b.timescale) - BigInt(b.value) * BigInt(a.timescale);
const rational = value => {
  if (!value || value.schema_version !== 1 || !Number.isSafeInteger(value.value) || value.value < 0 || !Number.isSafeInteger(value.timescale) || value.timescale <= 0) fail("CREATION_PLANNING_TIME_INVALID", "measurement needs nonnegative safe-integer RationalTime");
  return value;
};
// Private immutable receipt reader. This is not a current model/contract boundary.
function assertLegacyPlanningReceiptExchange(value) {
  const invalid = message => fail("CREATION_PLANNING_EXCHANGE_INVALID", message);
  const keys = (item, expected) => item && typeof item === "object" && !Array.isArray(item) && Object.keys(item).sort().join(",") === [...expected].sort().join(",");
  const text = (item, max = Infinity) => typeof item === "string" && [...item].length >= 1 && [...item].length <= max;
  const time = item => keys(item, ["schema_version", "value", "timescale"]) && item.schema_version === 1 && Number.isInteger(item.value) && Number.isInteger(item.timescale) && item.timescale >= 1;
  if (!value || value.exchange_version !== 1) invalid("historical receipt exchange identity differs");
  if (value.kind === "final") {
    if (!keys(value, ["exchange_version", "kind", "decision"])) invalid("historical final receipt fields differ");
    try { assertCreationDecisionV1(value.decision); } catch (cause) { const error = new CreationError("CREATION_PLANNING_EXCHANGE_INVALID", "historical final decision is invalid"); error.cause = cause; throw error; }
    return;
  }
  if (value.kind !== "measure_selection" || !keys(value, ["exchange_version", "kind", "query_id", "target_duration_ticks", "selection"]) || !text(value.query_id, 128) || !Number.isSafeInteger(value.target_duration_ticks) || value.target_duration_ticks < 1 || !Array.isArray(value.selection) || value.selection.length < 1 || value.selection.length > 256) invalid("historical measurement receipt fields differ");
  for (const item of value.selection) {
    if (!keys(item, ["selection_id", "source_window", "timing"]) || !text(item.selection_id, 128) || !keys(item.timing, ["kind"]) || !["weighted", "exact"].includes(item.timing.kind)) invalid("historical selection receipt fields differ");
    const source = item.source_window;
    if (!keys(source, ["asset_id", "span_id", "start", "end"]) || !text(source.asset_id) || !text(source.span_id) || !time(source.start) || !time(source.end)) invalid("historical source receipt fields differ");
  }
}
/** Internal reader for already-bound historical failed provider bytes; never used for new dispatch. */
function readHistoricalPlanningFinalReceipt(value) {
  assertLegacyPlanningReceiptExchange(value);
  if (value.kind !== "final") fail("CREATION_FAILURE_DIAGNOSTIC_INVALID", "a measurement is not a rejected final decision");
  return value.decision;
}
function legacyPlanningResponseSchema(decisionSchema, finalOnly = false) {
  const decision = structuredClone(decisionSchema), defs = decision.$defs;
  delete decision.$defs;
  const object = properties => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
  const final = object({ exchange_version: { const: 1 }, kind: { const: "final" }, decision });
  const query = object({ exchange_version: { const: 1 }, kind: { const: "measure_selection" }, query_id: { type: "string", minLength: 1, maxLength: 128 }, target_duration_ticks: decision.properties.target_duration_ticks,
    selection: { type: "array", minItems: 1, maxItems: 256, items: object({ selection_id: { type: "string", minLength: 1, maxLength: 128 }, source_window: decision.properties.shots.items.properties.source_window, timing: object({ kind: { enum: ["weighted", "exact"] } }) }) } });
  return { ...(defs ? { $defs: defs } : {}), ...(finalOnly ? final : { oneOf: [query, final] }) };
}
function deriveLegacyPlanningInput(root, exchanges) {
  if (!root || root.media?.length !== 0 || !same(root.context?.planning, LEGACY_PLANNING_PROTOCOL) || !Array.isArray(exchanges) || exchanges.length > 2 || exchanges.some(item => item.exchange?.kind !== "measure_selection")) fail("CREATION_PLANNING_INPUT_INVALID", "fixed root input and at most two completed measurement exchanges are required");
  return { context: { ...structuredClone(root.context), task: `${root.context.task} For this call return exactly one JSON object matching planning_exchange.response_schema. A measure_selection query asks Host to calculate the exact capacity of YOUR selected windows; it is not a final decision. Read the result before choosing your final decision. You may use at most two measurements and must return kind=final on the last call. No rejected final is retried.`,
    planning_exchange: { protocol: LEGACY_PLANNING_PROTOCOL.protocol, root_input_digest: creationDigest(root), round: exchanges.length + 1, exchanges: structuredClone(exchanges), response_schema: legacyPlanningResponseSchema(root.context.output_schema, exchanges.length === 2) } }, media: [] };
}
/** Calculates declared selections only; never chooses, moves, extends or repeats a window. */
function measureLegacySelection(query, context) {
  assertLegacyPlanningReceiptExchange(query);
  if (query.kind !== "measure_selection") fail("CREATION_PLANNING_QUERY_INVALID", "expected measure_selection");
  const grid = context.timeline?.sequence?.timebase;
  if (!grid || !/^[1-9]\d*$/.test(String(grid.value)) || !/^[1-9]\d*$/.test(String(grid.timescale))) fail("CREATION_PLANNING_TIME_INVALID", "fixed Timeline timebase is missing");
  const target = BigInt(query.target_duration_ticks), budget = context.duration_budget;
  if (budget && (target < BigInt(budget.minimum_total_ticks) || budget.maximum_total_ticks !== null && target > BigInt(budget.maximum_total_ticks))) fail("CREATION_DURATION_TARGET_UNMET", "measurement target differs from the current hard duration budget");
  const seen = new Set();
  const selection = query.selection.map(item => {
    if (seen.has(item.selection_id)) fail("CREATION_PLANNING_QUERY_INVALID", "selection IDs must be unique");
    seen.add(item.selection_id);
    const window = item.source_window, start = rational(window.start), end = rational(window.end);
    const spans = context.source_spans.filter(span => span.span_id === window.span_id && span.asset_id === window.asset_id);
    if (spans.length !== 1 || cmp(start, end) >= 0n || cmp(start, rational(spans[0].editable_start)) < 0n || cmp(end, rational(spans[0].editable_end)) > 0n) fail("CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA", `measurement selection ${item.selection_id} is outside its authorized editable span`);
    const numerator = (BigInt(end.value) * BigInt(start.timescale) - BigInt(start.value) * BigInt(end.timescale)) * BigInt(grid.timescale);
    const denominator = BigInt(start.timescale) * BigInt(end.timescale) * BigInt(grid.value);
    if (item.timing.kind === "exact" && numerator % denominator !== 0n) fail("CREATION_TIME_INEXACT", `exact measurement selection ${item.selection_id} is not whole Timeline ticks`);
    const ticks = numerator / denominator;
    const visual = spans[0].observations.filter(observation => observation.kind === "visual" && observation.sample_at && cmp(start, observation.sample_at) <= 0n && cmp(observation.sample_at, end) < 0n).map(observation => ({ evidence_id: observation.evidence_id, sample_at: observation.sample_at }));
    return { selection_id: item.selection_id, timing_kind: item.timing.kind, capacity_ticks: String(ticks), exact_reserved_ticks: item.timing.kind === "exact" ? String(ticks) : "0", minimum_ticks: item.timing.kind === "exact" ? String(ticks) : "1", visual_anchors_in_declared_window: visual, grounding_note: visual.length ? "Final allocated prefix must still contain genuine visual evidence; this measurement does not certify final grounding." : "No visual anchor in this window; a final video selection here cannot pass source grounding." };
  });
  const sum = selection.reduce((n, item) => n + BigInt(item.capacity_ticks), 0n), minimum = selection.reduce((n, item) => n + BigInt(item.minimum_ticks), 0n), exact = selection.reduce((n, item) => n + BigInt(item.exact_reserved_ticks), 0n);
  return { tool: LEGACY_PLANNING_PROTOCOL.tool, query_id: query.query_id, target_duration_ticks: String(target), selection, total_capacity_ticks: String(sum), exact_reserved_ticks: String(exact), minimum_required_ticks: String(minimum), deficit_ticks: String(target > sum ? target - sum : 0n), minimum_excess_ticks: String(minimum > target ? minimum - target : 0n), capacity_feasible: minimum <= target && target <= sum && selection.every(item => BigInt(item.capacity_ticks) >= 1n), final_validation_required: true };
}
function validateLegacyPlanningProof(state, ticket, input, output, audit) {
  const invalid = message => fail("CREATION_PLANNING_PROOF_INVALID", message);
  const proof = audit?.planning, calls = state.model_calls.filter(call => call.run_id === ticket.run_id);
  if (!same(input.context?.planning, LEGACY_PLANNING_PROTOCOL) || proof?.protocol !== LEGACY_PLANNING_PROTOCOL.protocol || proof.root_input_digest !== ticket.input_digest || creationDigest(input) !== ticket.input_digest || audit.input_hash !== ticket.input_digest || audit.output_hash !== creationDigest(output) || audit.retry_count !== 0 || audit.cache_hit || !Array.isArray(proof.rounds) || proof.rounds.length < 1 || proof.rounds.length > 3 || calls.length !== proof.rounds.length) invalid("root identity, budget or physical call count differs");
  const exchanges = []; let inputTokens = 0, outputTokens = 0, allUsage = true;
  for (const [index, round] of proof.rounds.entries()) {
    const derived = deriveLegacyPlanningInput(input, exchanges), call = calls[index], raw = round.provider_output;
    if (!same(round.input, derived) || round.input_hash !== creationDigest(derived) || !raw || !["provider-text", "canonical-json"].includes(raw.representation) || typeof raw.payload !== "string" || raw.utf8_bytes !== Buffer.byteLength(raw.payload) || raw.sha256 !== createHash("sha256").update(raw.payload).digest("hex") || !same(JSON.parse(raw.payload), round.exchange) || round.output_hash !== creationDigest(round.exchange)) invalid("round input/raw output was rebound");
    if (typeof round.model_snapshot !== "string" || !round.model_snapshot || call.target && (call.target.role !== "planner" || call.target.sample_id !== undefined)) invalid("generation round snapshot/physical planner role differs");
    assertLegacyPlanningReceiptExchange(round.exchange);
    const usage = round.token_usage ? { ...round.token_usage, total: round.token_usage.total ?? round.token_usage.input + round.token_usage.output } : null;
    if (call.attempt !== index + 1 || call.revision !== ticket.revision || call.input_digest !== ticket.input_digest || !same(call.profile, ticket.profile) || call.wire_digest !== round.transport?.wire_digest || call.input_bytes !== round.transport?.input_bytes || !same(call.target ?? null, round.transport?.target ?? null) || call.settlement?.status !== "response" || call.settlement.output_digest !== round.output_hash || !same(call.settlement.usage, usage)) invalid("round differs from durable physical call ledger");
    if (usage) { inputTokens += usage.input; outputTokens += usage.output; } else allUsage = false;
    if (round.exchange.kind === "final") {
      if (index !== proof.rounds.length - 1 || round.measurement !== undefined || !same(round.exchange.decision, output)) invalid("final output differs or final was followed by another call");
    } else {
      if (index >= (input.context.creative_skills ? 1 : 2) || index === proof.rounds.length - 1 || exchanges.some(item => item.exchange.query_id === round.exchange.query_id)) invalid("measurement budget or query identity invalid");
      const measurement = measureLegacySelection(round.exchange, input.context);
      if (!same(measurement, round.measurement)) invalid("measurement differs from exact fixed-input calculation");
      exchanges.push({ exchange: round.exchange, measurement });
    }
  }
  const total = allUsage ? { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens } : null;
  const actual = audit.token_usage ? { ...audit.token_usage, total: audit.token_usage.total ?? audit.token_usage.input + audit.token_usage.output } : null;
  if (!same(total, actual)) invalid("aggregate usage differs from accounted physical calls");
}

// Current production protocol. The v1 helpers above are reconstruction-only.
const HISTORICAL_V2_PROTOCOL = Object.freeze({ protocol: "planning-exchange-v2", tool: "measure_creation_selection", max_measurements: 2, max_physical_calls: 3 });
export const CREATION_PLANNING_PROTOCOL = Object.freeze({ protocol: "planning-exchange-v3", tool: "measure_creation_selection", max_measurements: 2, max_physical_calls: 3 });
function assertHistoricalV2(value) {
  if (!historicalPlanningExchangeV2Validator(value)) fail("CREATION_PLANNING_EXCHANGE_INVALID", (historicalPlanningExchangeV2Validator.errors ?? []).map(error => `${error.instancePath}:${error.keyword}:${error.message}`).join("|"));
}
export function assertCreationPlanningExchangeV3(value) {
  if (!creationPlanningExchangeV3Validator(value)) fail("CREATION_PLANNING_EXCHANGE_INVALID", (creationPlanningExchangeV3Validator.errors ?? []).map(error => `${error.instancePath}:${error.keyword}:${error.message}`).join("|"));
}
const historicalV2 = context => same(context?.planning, HISTORICAL_V2_PROTOCOL);
const assertExchange = (value, context) => historicalV2(context) ? assertHistoricalV2(value) : assertCreationPlanningExchangeV3(value);
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
const commonWindow = (start, end) => {
  const scale = BigInt(start.timescale) / gcd(BigInt(start.timescale), BigInt(end.timescale)) * BigInt(end.timescale);
  const a = BigInt(start.value) * (scale / BigInt(start.timescale)), b = BigInt(end.value) * (scale / BigInt(end.timescale));
  return [scale, a, b].every(n => n <= BigInt(Number.MAX_SAFE_INTEGER))
    ? { start: { schema_version: 1, value: Number(a), timescale: Number(scale) }, end: { schema_version: 1, value: Number(b), timescale: Number(scale) } }
    : { start: structuredClone(start), end: structuredClone(end) };
};
/** Rebuilt from immutable source evidence, not accepted from a self-consistent catalog. */
export function buildCreationSourceChoiceCatalog(context) {
  const grid = context.timeline?.sequence?.timebase;
  if (!grid || !/^[1-9]\d*$/.test(String(grid.value)) || !/^[1-9]\d*$/.test(String(grid.timescale)) || !Array.isArray(context.source_spans)) fail("CREATION_PLANNING_INPUT_INVALID", "catalog requires original source evidence and exact Timeline grid");
  const ids = new Set();
  return context.source_spans.flatMap((span, spanIndex) => {
    if (span.media_kind === 'image') {
      if (ids.has(span.span_id)) fail('CREATION_PLANNING_INPUT_INVALID','duplicate static span'); ids.add(span.span_id);
      return span.observations.filter(item=>item.kind==='visual').map((item,index)=>({option_id:`s${spanIndex+1}v${index+1}`,span_id:span.span_id,asset_id:span.asset_id,evidence_id:item.evidence_id,description:item.description,uncertain:item.uncertain,source_window:{kind:'image',span_id:span.span_id,asset_id:span.asset_id},maximum_duration_ticks:null,unavailable_reason:null}));
    }
    const start = rational(span.editable_start), end = rational(span.editable_end);
    if (ids.has(span.span_id) || cmp(start, end) >= 0n) fail("CREATION_PLANNING_INPUT_INVALID", "catalog span identities and bounds must be unique and positive");
    ids.add(span.span_id);
    const evidenceIds = new Set();
    return span.observations.filter(observation => observation.kind === "visual").map((observation, index) => {
      if (typeof observation.evidence_id !== "string" || !observation.evidence_id || evidenceIds.has(observation.evidence_id)) fail("CREATION_PLANNING_INPUT_INVALID", "visual evidence IDs must be unique within their source span");
      evidenceIds.add(observation.evidence_id);
      const at = rational(observation.sample_at), inside = cmp(at, start) >= 0n && cmp(at, end) < 0n;
      const ticks = inside ? (BigInt(end.value) * BigInt(at.timescale) - BigInt(at.value) * BigInt(end.timescale)) * BigInt(grid.timescale) / (BigInt(end.timescale) * BigInt(at.timescale) * BigInt(grid.value)) : 0n;
      const available = inside && ticks > 0n;
      return { option_id: `s${spanIndex + 1}v${index + 1}`, span_id: span.span_id, asset_id: span.asset_id, evidence_id: observation.evidence_id, description: observation.description, uncertain: observation.uncertain, sample_at: structuredClone(at),
        source_window: available ? { span_id: span.span_id, asset_id: span.asset_id, ...commonWindow(at, end) } : null,
        maximum_duration_ticks: String(ticks), unavailable_reason: !inside ? "sample-point-outside-editable-window" : !available ? "less-than-one-timeline-tick-remains" : null };
    });
  });
}
const checkedCatalog = context => {
  const catalog = buildCreationSourceChoiceCatalog(context);
  if (!same(context.source_choice_catalog, catalog)) fail("CREATION_PLANNING_CATALOG_REBOUND", "source choice catalog differs from fixed original source evidence");
  return catalog;
};
export function resolveCreationSourceChoice(choice, context) {
  const catalog = checkedCatalog(context);
  if (choice.kind === "custom_window") return structuredClone(choice.source_window);
  if (choice.kind !== "catalog_option") fail("CREATION_PLANNING_CHOICE_INVALID", "an explicit catalog or custom source choice is required");
  const matches = catalog.filter(item => item.option_id === choice.option_id);
  if (matches.length !== 1 || matches[0].source_window === null) fail("CREATION_PLANNING_OPTION_INVALID", `unknown or unavailable catalog option ${choice.option_id}`);
  return structuredClone(matches[0].source_window);
}
function historicalV2ResponseSchema(decisionSchema, phase = "measure-or-final") {
  const decision = structuredClone(decisionSchema), defs = decision.$defs ?? {};
  delete decision.$defs;
  const object = properties => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });
  const shot = decision.properties.shots.items;
  defs.planning_source_window = shot.properties.source_window;
  defs.planning_timing = shot.properties.timing;
  defs.planning_source_choice = { oneOf: [object({ kind: { const: "catalog_option" }, option_id: { type: "string", minLength: 1, maxLength: 128 } }), object({ kind: { const: "custom_window" }, source_window: { $ref: "#/$defs/planning_source_window" } })] };
  shot.required = shot.required.map(key => key === "source_window" ? "source_choice" : key);
  delete shot.properties.source_window;
  shot.properties.source_choice = { $ref: "#/$defs/planning_source_choice" };
  shot.properties.timing = { $ref: "#/$defs/planning_timing" };
  const final = object({ exchange_version: { const: 2 }, kind: { const: "final" }, measured_query_id: { type: "string", minLength: 1, maxLength: 128 }, decision });
  const query = object({ exchange_version: { const: 2 }, kind: { const: "measure_selection" }, query_id: { type: "string", minLength: 1, maxLength: 128 }, target_duration_ticks: decision.properties.target_duration_ticks,
    selection: { type: "array", minItems: 1, maxItems: 256, items: object({ selection_id: { type: "string", minLength: 1, maxLength: 128 }, source_choice: { $ref: "#/$defs/planning_source_choice" }, timing: { $ref: "#/$defs/planning_timing" } }) } });
  return { $defs: defs, ...(phase === "measure-only" ? query : phase === "final-only" ? final : { oneOf: [query, final] }) };
}
export function creationPlanningResponseSchema(decisionSchema, phase = "measure-or-final") {
  const schema = historicalV2ResponseSchema(decisionSchema, phase);
  for (const branch of schema.oneOf ?? [schema]) {
    branch.properties.exchange_version = { const: 3 };
    if (branch.properties.kind.const !== "final") continue;
    const creative = branch.properties.decision;
    for (const key of ["decision_version", "target_duration_ticks"]) { delete creative.properties[key]; creative.required = creative.required.filter(item => item !== key); }
    const shot = creative.properties.shots.items;
    for (const key of ["source_choice", "timing"]) { delete shot.properties[key]; shot.required = shot.required.filter(item => item !== key); }
    delete branch.properties.decision;
    branch.properties.creative = creative;
    branch.properties.measurement_receipt_digest = { type: "string", pattern: "^[0-9a-f]{64}$" };
    branch.required = ["exchange_version", "kind", "measured_query_id", "measurement_receipt_digest", "creative"];
  }
  return schema;
}
const responseSchemaFor = (root, phase) => historicalV2(root.context) ? historicalV2ResponseSchema(root.context.output_schema, phase) : creationPlanningResponseSchema(root.context.output_schema, phase);
export function creationPlanningMeasurementReceipt(root, exchange, measurement, audioReceipts) {
  if (!same(root?.context?.planning, CREATION_PLANNING_PROTOCOL)) fail("CREATION_PLANNING_INPUT_INVALID", "receipt requires the current fixed root");
  assertCreationPlanningExchangeV3(exchange);
  if (exchange.kind !== "measure_selection" || !same(measureSelection(exchange, root.context), measurement)) fail("CREATION_PLANNING_MEASUREMENT_REBOUND", "receipt measurement differs from its exact fixed-root query");
  if(root.context.audio_library)validatePlanningAudioReceipts(root,exchange,audioReceipts);
  return creationDigest({ protocol: CREATION_PLANNING_PROTOCOL.protocol, root_input_digest: creationDigest(root), query: exchange, measurement, ...(root.context.audio_library ? {audio_receipts:audioReceipts}: {}) });
}
function deriveCatalogPlanningInput(root, exchanges) {
  if (!root || root.media?.length !== 0 || (!same(root.context?.planning, CREATION_PLANNING_PROTOCOL) && !historicalV2(root.context)) || !Array.isArray(exchanges) || exchanges.length > 2 || exchanges.some(item => item.exchange?.kind !== "measure_selection")) fail("CREATION_PLANNING_INPUT_INVALID", "current fixed root and at most two measurements are required");
  const catalog = checkedCatalog(root.context), context = structuredClone(planningAudioContext(root,exchanges));
  for (const key of ["output_schema", "source_choice_catalog", "weighted_anchor_options", "capacity_budget", "edit_grids", "decision_fields", "generation_binding"]) delete context[key];
  context.source_spans = context.source_spans.map(span => ({ ...span, observations: span.observations.map(observation => {
    if (observation.kind !== "visual") return observation;
    const option = catalog.find(item => item.span_id === span.span_id && item.evidence_id === observation.evidence_id);
    if (!option) fail("CREATION_PLANNING_CATALOG_REBOUND", "visual source evidence has no corresponding catalog row");
    return { kind: "visual", ...option };
  }) }));
  context.edit_grid_rules = "Catalog references preserve the displayed exact source window without rewriting time values. A custom_window uses its explicit RationalTime endpoints within source_spans editable bounds. Exact retained/protected or transcript source anchors must be copied without rounding. Weighted timing allocates whole Timeline ticks inside the declared window; it does not freeze, repeat or change speed.";
  context.task = `${root.context.planning_projection_version === "phase-specific-v1" ? root.context.creative_brief : root.context.task} Return exactly one JSON object matching planning_exchange.response_schema. First measure your ordered source choices. Catalog option_id resolves exactly to its adjacent window; custom_window retains arbitrary exact ranges. After reading a feasible measurement, final must cite measured_query_id and reproduce its complete ordered selection IDs, source choices, timing/weights and target. You may revise an insufficient selection with one further measurement, never return an unmeasured or infeasible final. No rejected exchange is retried.`;
  context.planning_exchange = { protocol: root.context.planning.protocol, root_input_digest: creationDigest(root), round: exchanges.length + 1, exchanges: structuredClone(exchanges), response_schema: responseSchemaFor(root, !exchanges.length ? "measure-only" : exchanges.length === 2 ? "final-only" : "measure-or-final") };
  return { context, media: [] };
}
export const CREATION_PLANNING_PROJECTION_VERSION = "phase-specific-v1";
export const CREATION_PLANNING_QUERY_IDENTITY = "host-root-round-v1";
/** Host-owned control identity, never a creative choice or repaired provider field. */
export function assertCreationPlanningRoundIdentity(input, exchange) {
  const control = input.context.planning_exchange;
  const skills = input.context.creative_skills;
  if (skills) {
    if (exchange.kind === "final" && control.phase === "measure-only") fail("CREATIVE_SKILL_FAILURE", "full Skill rules must participate in a new measured plan before final");
    if (exchange.kind === "measure_selection" && (skills.stage !== "plan" || !Array.isArray(exchange.skill_evaluations) || !exchange.skill_evaluations.length)) fail("CREATIVE_SKILL_FAILURE", "full-body first call requires formal Skill evaluations; no second measurement allowed");
  }
  if (control.query_identity === undefined) return; // Exact historical projection.
  if (control.query_identity !== CREATION_PLANNING_QUERY_IDENTITY) fail("CREATION_PLANNING_INPUT_INVALID", "unknown query identity rule");
  if (exchange.kind === "measure_selection" && exchange.query_id !== control.assigned_query_id) fail("CREATION_PLANNING_QUERY_ID_MISMATCH", "measurement query ID differs from the Host-assigned ID for this fixed root and round");
}
function planningFeasibility(context, exchanges) {
  const minimum = BigInt(context.pacing_budget?.minimum_shot_ticks ?? "1"), bounds = context.duration_budget;
  const target = bounds && bounds.maximum_total_ticks !== null && String(bounds.minimum_total_ticks) === String(bounds.maximum_total_ticks) ? BigInt(bounds.minimum_total_ticks) : null;
  const options = checkedCatalog(context).filter(option => option.source_window !== null && (option.source_window.kind === "image" || BigInt(option.maximum_duration_ticks) >= minimum)).map(option => ({ option_id: option.option_id, span_id: option.span_id, evidence_id: option.evidence_id, description: option.description, maximum_duration_ticks: option.maximum_duration_ticks }));
  const prior = exchanges.at(-1)?.measurement;
  let meanRequirement;
  if (context.pacing_budget?.kind === "longer-mean-with-preserved-minimum") {
    const reference=context.pacing_reference, referenceGrid=reference?.sequence?.timebase, grid=context.timeline?.sequence?.timebase;
    const clips=reference?.tracks?.filter(track=>track.kind === "video" && track.enabled !== false).flatMap(track=>track.clips);
    if (!referenceGrid || !grid || !clips?.length || clips.some(clip=>!/^[1-9]\d*$/.test(String(clip.timeline_duration)))) fail("CREATION_PACING_BUDGET_INVALID", "mean shot constraint requires the actual viewed reference");
    const total=clips.reduce((sum,clip)=>sum+BigInt(clip.timeline_duration),0n), count=BigInt(clips.length);
    const maximum=target===null?null:(target*count*BigInt(referenceGrid.timescale)*BigInt(grid.value)-1n)/(total*BigInt(referenceGrid.value)*BigInt(grid.timescale));
    meanRequirement={comparison:"strictly_greater_than_viewed_mean",reference_mean_ticks:{numerator:String(total),denominator:String(count)},reference_timebase:referenceGrid,execution_timebase:grid,maximum_shot_count_at_target:maximum===null?null:String(maximum),meaning:"Exact whole-work mean bound at this target, independent of catalog selection; it does not select sources or guarantee capacity."};
  }
  return { scope: "catalog-only capacity bounds; custom_window remains legal inside original editable spans; this is not a story selection or a global material-insufficiency claim", target_duration_ticks: target===null?null:String(target), duration_budget: bounds ?? null, minimum_shot_ticks:String(minimum), eligible_catalog_options:options,
    ...(meanRequirement ? {mean_shot_requirement:meanRequirement,previous_mean_increased:prior?.pacing_mean_increased??null} : {}),
    previous_measurement:prior?{query_id:prior.query_id,target_duration_ticks:prior.target_duration_ticks,total_capacity_ticks:prior.total_capacity_ticks,deficit_ticks:prior.deficit_ticks,minimum_excess_ticks:prior.minimum_excess_ticks,capacity_feasible:prior.capacity_feasible,pacing_feasible:prior.pacing_feasible??null,windows_below_pacing_minimum:prior.selection.filter(item=>BigInt(item.capacity_ticks)<minimum).map(item=>({selection_id:item.selection_id,capacity_ticks:item.capacity_ticks})),pacing_violating_selection_ids:prior.pacing_violating_selection_ids??[]}:null };
}
function derivePlanningInput(root, exchanges) {
  if (root?.context?.planning_projection_version === undefined) return deriveCatalogPlanningInput(root, exchanges);
  if (root.context.planning_projection_version !== CREATION_PLANNING_PROJECTION_VERSION) fail("CREATION_PLANNING_INPUT_INVALID", "unknown fixed planning projection version");
  if (typeof root.context.creative_brief !== "string" || !root.context.creative_brief.trim() || root.context.task !== undefined) fail("CREATION_PLANNING_INPUT_INVALID", "phase-specific root requires a distinct creative brief, not an inherited protocol task");
  const derived = deriveCatalogPlanningInput(root, exchanges);
  const skillProjection = projectCreativeSkills(root.context, exchanges);
  const feasible = exchanges.filter((item, index) => item.measurement.capacity_feasible && item.measurement.pacing_feasible !== false).map(item => item.exchange.query_id);
  if ((skillProjection ? exchanges.length === 1 : exchanges.length === 2) && !feasible.length) {
    if (skillProjection && exchanges[0].measurement.pacing_feasible === false) fail("CREATION_PACING_GOAL_UNMET", "the full-rule measured plan violates the current pacing requirement");
    fail("CREATION_PLANNING_BUDGET_EXCEEDED", "permitted full-rule measurements are infeasible; no measured final can be submitted");
  }
  const phase = !exchanges.length || !feasible.length ? "measure-only" : skillProjection || exchanges.length === 2 ? "final-only" : "measure-or-final";
  const allowed = phase === "measure-only" ? ["measure_selection"] : phase === "final-only" ? ["final"] : ["measure_selection", "final"];
  let task = phase === "measure-only"
    ? "This call performs ONLY a read-only source-selection measurement. Return one JSON object with kind=measure_selection and the required query fields in response_schema. Select and order sources for the creative brief below. Do not submit a finished creative decision in this call. Host will return measured durations before any final submission."
    : phase === "final-only"
      ? "This call submits the final creative decision. Return one JSON object with kind=final, measured_query_id naming one listed feasible query, and decision. Match that query's target, complete ordered selections, choices and timing exactly. Keep creative text, captions, sound and supported picture decisions in decision."
      : "Read the completed measurement. Either submit kind=final with decision and measured_query_id naming a listed feasible query, or request your remaining measurement with kind=measure_selection. Return exactly one schema branch, never merge their fields.";
  if (!historicalV2(root.context) && phase !== "measure-only") {
    const confirm = "Return one JSON object with kind=final, measured_query_id and measurement_receipt_digest copied exactly from one feasible_receipts row, plus creative. Supply one complete shot decoration for every listed selection_id using the same shot_id. Host preserves that receipt's measured source order, windows, target and timing. Do not repeat decision, selection, source_choice, source_window, timing or target_duration_ticks in final.";
    task = phase === "final-only" ? `This call confirms a measured creative candidate. ${confirm}` : `Read the completed measurement. You may request the remaining measurement with kind=measure_selection, or confirm a listed feasible candidate. ${confirm} Use exactly one schema branch; never merge their fields.`;
  }
  const { task: _oldTask, planning_exchange: oldExchange, ...creative } = derived.context;
  const schema = responseSchemaFor({...root,context:planningAudioContext(root,exchanges)}, phase);
  if(root.context.audio_library)for(const branch of schema.oneOf ?? [schema])if(branch.properties.kind.const==="measure_selection"){branch.properties.audio_resource_selections={type:"array",maxItems:root.context.audio_library.candidates.length?3:0,items:{type:"object",additionalProperties:false,required:["resource_id","reason","match_evidence_ids"],properties:{resource_id:root.context.audio_library.candidates.length?{enum:root.context.audio_library.candidates.map(item=>item.resource_ref.resource_id)}:{type:"string"},reason:{type:"string",minLength:1,maxLength:1200},match_evidence_ids:{type:"array",minItems:1,uniqueItems:true,items:{type:"string",enum:root.context.source_spans.flatMap(span=>span.observations.map(item=>item.evidence_id))}}}}};branch.required.push("audio_resource_selections");}
  if (skillProjection) for (const branch of schema.oneOf ?? [schema]) {
    if (branch.properties.kind.const === "measure_selection") {
      branch.properties.skill_evaluations = structuredClone(skillEvaluationProposalSchema);
      if (!exchanges.length) branch.required.push("skill_evaluations");
    } else {
      branch.properties.creative.required.push("skill_effects");
      bindSkillEffectProposalSchema(root.context, exchanges, branch.properties.creative.properties.skill_effects);
    }
  }
  let identity = {}, feasibility;
  if (root.context.planning_query_identity !== undefined) {
    if (root.context.planning_query_identity !== CREATION_PLANNING_QUERY_IDENTITY) fail("CREATION_PLANNING_INPUT_INVALID", "unknown fixed query identity policy");
    task = task.replace("Return exactly one schema branch", "Return exactly one JSON object matching one schema branch");
    const assigned = `measure:${creationDigest(root).slice(0,32)}:${exchanges.length+1}`;
    for (const branch of schema.oneOf ?? [schema]) {
      if (branch.properties.kind.const === "measure_selection") branch.properties.query_id = { const: assigned };
      else branch.properties.measured_query_id = { enum: feasible };
    }
    identity = { query_identity: CREATION_PLANNING_QUERY_IDENTITY, assigned_query_id: assigned };
    feasibility = planningFeasibility(root.context, exchanges);
    if (phase !== "final-only") task += ` Copy query_id exactly as ${assigned}; Host assigns a different ID to each measurement round. This ID is not a creative choice.`;
    if (feasibility.previous_measurement) { const previous=feasibility.previous_measurement; task += ` Previous measured capacity was ${previous.total_capacity_ticks} ticks for target ${previous.target_duration_ticks}, deficit ${previous.deficit_ticks}; minimum shot duration is ${feasibility.minimum_shot_ticks} ticks. Weights and shot count alone do not supply missing duration; the selected exact windows must together provide the target capacity. Keep the creative brief's target unchanged. Read planning_feasibility for every catalog option able to meet the per-shot minimum.`; }
  }
  let receiptProjection = {};
  if (!historicalV2(root.context)) {
    const receipts = exchanges.filter((item, index) => item.measurement.capacity_feasible && item.measurement.pacing_feasible !== false).map(item => ({ query_id: item.exchange.query_id, measurement_receipt_digest: creationPlanningMeasurementReceipt(root, item.exchange, item.measurement, item.audio_receipts), selection_ids: item.exchange.selection.map(selection => selection.selection_id) }));
    receiptProjection = { feasible_receipts: receipts };
    for (const branch of schema.oneOf ?? [schema]) if (branch.properties.kind.const === "final") {
      branch.properties.measurement_receipt_digest = { type: "string", enum: receipts.map(item => item.measurement_receipt_digest) };
      branch.properties.creative.properties.shots.items.properties.shot_id = { type: "string", enum: [...new Set(receipts.flatMap(item => item.selection_ids))] };
    }
  }
  const { creative_skills: _localCatalogue, ...physicalCreative } = creative;
  return { context: { task, planning_exchange: { ...oldExchange, ...identity, ...receiptProjection, projection_version: CREATION_PLANNING_PROJECTION_VERSION, phase, allowed_kinds: allowed, feasible_query_ids: feasible, response_schema: schema }, ...(feasibility ? { planning_feasibility: feasibility } : {}), creative_brief: root.context.creative_brief, ...physicalCreative, ...(skillProjection ? { creative_skills: skillProjection } : {}) }, media: [] };
}
export function deriveCreationPlanningInput(root, exchanges) {
  if (!same(root?.context?.planning, CREATION_PLANNING_PROTOCOL) || root.context.planning_projection_version !== CREATION_PLANNING_PROJECTION_VERSION) fail("CREATION_PLANNING_INPUT_INVALID", "new planning requires the current protocol and phase projection");
  return derivePlanningInput(root, exchanges);
}
export function measureCreationSelection(query, context) { assertCreationPlanningExchangeV3(query); return measureSelection(query, context); }
function measureMixedSelection(query, context) {
  if (!query.selection.some(item=>item.source_window.kind==='image' || item.timing.kind==='still')) return measureLegacySelection(query,context);
  const target=BigInt(query.target_duration_ticks), bounds=context.duration_budget;
  if (bounds && (target<BigInt(bounds.minimum_total_ticks) || bounds.maximum_total_ticks!==null && target>BigInt(bounds.maximum_total_ticks))) fail('CREATION_DURATION_TARGET_UNMET','measurement target outside hard duration budget');
  const seen=new Set();
  const selection=query.selection.map(item=>{
    if (seen.has(item.selection_id)) fail('CREATION_PLANNING_QUERY_INVALID','duplicate selection'); seen.add(item.selection_id);
    const source=item.source_window;
    if (source.kind!=='image' && item.timing.kind!=='still') return measureLegacySelection({...query,selection:[item]},context).selection[0];
    const spans=context.source_spans.filter(span=>span.span_id===source.span_id && span.asset_id===source.asset_id);
    if (source.kind!=='image' || item.timing.kind!=='still' || spans.length!==1 || spans[0].media_kind!=='image' || !spans[0].observations.some(observation=>observation.kind==='visual') || !Number.isSafeInteger(item.timing.duration_ticks) || item.timing.duration_ticks<1) fail('CREATION_PLANNING_IMAGE_INVALID','observed static identity and explicit display duration required');
    const ticks=String(item.timing.duration_ticks);
    return {selection_id:item.selection_id,timing_kind:'still',capacity_ticks:ticks,exact_reserved_ticks:ticks,minimum_ticks:ticks,visual_anchors_in_declared_window:[],grounding_note:'Decoded static identity. Explicit display duration, no source motion capacity.'};
  });
  const sum=selection.reduce((n,item)=>n+BigInt(item.capacity_ticks),0n), minimum=selection.reduce((n,item)=>n+BigInt(item.minimum_ticks),0n), exact=selection.reduce((n,item)=>n+BigInt(item.exact_reserved_ticks),0n);
  return {tool:LEGACY_PLANNING_PROTOCOL.tool,query_id:query.query_id,target_duration_ticks:String(target),selection,total_capacity_ticks:String(sum),exact_reserved_ticks:String(exact),minimum_required_ticks:String(minimum),deficit_ticks:String(target>sum?target-sum:0n),minimum_excess_ticks:String(minimum>target?minimum-target:0n),capacity_feasible:minimum<=target && target<=sum && selection.every(item=>BigInt(item.capacity_ticks)>=1n),final_validation_required:true};
}
function measureSelection(query, context) {
  assertExchange(query, context);
  if (query.skill_evaluations !== undefined) validateSkillEvaluations(context, query.skill_evaluations);
  validateAudioResourceSelections(query,context);
  if (query.kind !== "measure_selection") fail("CREATION_PLANNING_QUERY_INVALID", "expected a measurement query");
  const resolved = { exchange_version: 1, kind: "measure_selection", query_id: query.query_id, target_duration_ticks: query.target_duration_ticks,
    selection: query.selection.map(item => ({ selection_id: item.selection_id, source_window: resolveCreationSourceChoice(item.source_choice, context), timing: item.timing.kind === "still" ? structuredClone(item.timing) : { kind: item.timing.kind } })) };
  // Original capacity arithmetic remains unchanged; pacing also measures actual allocations.
  const measurement = measureMixedSelection(resolved, context);
  if (context.pacing_budget == null) return measurement;
  const pacing = context.pacing_budget;
  const reference = context.pacing_reference;
  if (!reference?.sequence?.timebase) fail("CREATION_PACING_BUDGET_INVALID", "the relative target requires an explicit viewed pacing reference");
  const clips = reference.tracks.filter(track=>track.kind === "video" && track.enabled !== false).flatMap(track=>track.clips), referenceGrid=reference.sequence.timebase, grid=context.timeline.sequence.timebase;
  const wholeWork = pacing.kind === "longer-mean-with-preserved-minimum";
  if (!clips.length || !wholeWork && pacing.kind !== "each-shot-longer-than-base-mean" || pacing.base_timeline_version !== reference.version || !/^[1-9]\d*$/.test(pacing.minimum_shot_ticks) || clips.some(clip=>!/^[1-9]\d*$/.test(String(clip.timeline_duration)))) fail("CREATION_PACING_BUDGET_INVALID", "pacing proxy must derive exactly from the bound viewed Timeline");
  const total=clips.reduce((sum,clip)=>sum+BigInt(clip.timeline_duration),0n), shortest=clips.reduce((minimum,clip)=>BigInt(clip.timeline_duration)<minimum?BigInt(clip.timeline_duration):minimum,BigInt(clips[0].timeline_duration));
  const conversionNumerator=BigInt(referenceGrid.value)*BigInt(grid.timescale), conversionDenominator=BigInt(referenceGrid.timescale)*BigInt(grid.value);
  const expectedMinimum=wholeWork ? (shortest*conversionNumerator+conversionDenominator-1n)/conversionDenominator : total*conversionNumerator/(BigInt(clips.length)*conversionDenominator)+1n;
  if (BigInt(pacing.minimum_shot_ticks)!==expectedMinimum) fail("CREATION_PACING_BUDGET_INVALID", "pacing minimum differs from the exact bound reference");
  const allocations = measurement.capacity_feasible ? allocateCreationSelectionTicks(resolved.selection.map((item,index)=>({source_window:item.source_window,timing:query.selection[index].timing})), BigInt(query.target_duration_ticks), context.timeline.sequence.timebase) : null;
  const minimum=BigInt(pacing.minimum_shot_ticks), violating=allocations ? allocations.filter(slot=>slot.allocated<minimum).map(slot=>query.selection[slot.index].selection_id) : query.selection.map(item=>item.selection_id);
  const meanIncreased=BigInt(query.target_duration_ticks)*BigInt(clips.length)*conversionDenominator>total*BigInt(query.selection.length)*conversionNumerator;
  return { ...measurement, selection: measurement.selection.map((item,index)=>({...item, allocated_duration_ticks:allocations ? String(allocations[index].allocated) : null})), pacing_minimum_shot_ticks:pacing.minimum_shot_ticks, pacing_feasible: allocations !== null && violating.length===0 && (!wholeWork || meanIncreased), pacing_violating_selection_ids:violating, ...(wholeWork?{pacing_mean_increased:meanIncreased}: {}) };

}
function resolveHistoricalV2Final(final, context, exchanges) {
  assertHistoricalV2(final);
  if (final.kind !== "final") fail("CREATION_PLANNING_FINAL_INVALID", "a final exchange is required");
  const matches = exchanges.filter(item => item.exchange.query_id === final.measured_query_id);
  if (matches.length !== 1) fail("CREATION_PLANNING_MEASUREMENT_REQUIRED", "final must name a completed measurement from this run");
  const { exchange, measurement } = matches[0];
  const recomputed = measureSelection(exchange, context);
  if (!same(recomputed, measurement)) fail("CREATION_PLANNING_MEASUREMENT_REBOUND", "measurement was changed");
  if (!measurement.capacity_feasible) fail("CREATION_PLANNING_SELECTION_INFEASIBLE", "final references an infeasible selection");
  if (measurement.pacing_feasible === false) fail("CREATION_PACING_GOAL_UNMET", "final references a measurement that violates the current relative shot-pacing target");
  const selection = final.decision.shots.map(shot => ({ selection_id: shot.shot_id, source_choice: shot.source_choice, timing: shot.timing }));
  if (final.decision.target_duration_ticks !== exchange.target_duration_ticks || !same(selection, exchange.selection)) fail("CREATION_PLANNING_SELECTION_REBOUND", "final target, ordered selection, source choices or timing differ from measured selection");
  return { ...structuredClone(final.decision), shots: final.decision.shots.map(shot => { const { source_choice, ...creative } = shot; return { ...structuredClone(creative), source_window: resolveCreationSourceChoice(source_choice, context) }; }) };
}

export function resolveCreationPlanningFinal(final, root, exchanges) {
  assertCreationPlanningExchangeV3(final);
  if (final.kind !== "final") fail("CREATION_PLANNING_FINAL_INVALID", "a final exchange is required");
  const matches = exchanges.filter(item => item.exchange.query_id === final.measured_query_id);
  if (matches.length !== 1) fail("CREATION_PLANNING_MEASUREMENT_REQUIRED", "final must name a completed measurement from this run");
  const { exchange, measurement, audio_receipts:audioReceipts } = matches[0];
  const resourceSpans=validatePlanningAudioReceipts(root,exchange,audioReceipts);
  if (root.context.creative_skills && (exchanges.length !== 1 || exchange !== exchanges[0].exchange)) fail("CREATIVE_SKILL_FAILURE", "final must use the measurement planned with full selected Skill rules");
  if (!same(measureSelection(exchange, root.context), measurement)) fail("CREATION_PLANNING_MEASUREMENT_REBOUND", "measurement was changed");
  if (!measurement.capacity_feasible) fail("CREATION_PLANNING_SELECTION_INFEASIBLE", "final references an infeasible selection");
  if (measurement.pacing_feasible === false) fail("CREATION_PACING_GOAL_UNMET", "final references a measurement that violates the current pacing target");
  if (final.measurement_receipt_digest !== creationPlanningMeasurementReceipt(root, exchange, measurement, audioReceipts)) fail("CREATION_PLANNING_RECEIPT_REBOUND", "final receipt differs from this fixed root and completed query");
  const decorations = new Map(final.creative.shots.map(shot => [shot.shot_id, shot]));
  if (decorations.size !== final.creative.shots.length || decorations.size !== exchange.selection.length || exchange.selection.some(item => !decorations.has(item.selection_id))) fail("CREATION_PLANNING_SELECTION_REBOUND", "final shot decorations must exactly match the measured selection IDs");
  const decision = { ...structuredClone(final.creative), decision_version: 1, target_duration_ticks: exchange.target_duration_ticks,
    shots: exchange.selection.map(item => ({ ...structuredClone(decorations.get(item.selection_id)), timing: structuredClone(item.timing), source_window: resolveCreationSourceChoice(item.source_choice, root.context) })) };
  assertCreationDecisionV1(decision);
  if(root.context.audio_library?.no_music&&decision.audio.some(audio=>audio.role==="music"))fail("AUDIO_MUSIC_FORBIDDEN","current request explicitly forbids soundtrack");
  if(root.context.audio_library?.music_required&&!decision.audio.some(audio=>audio.role==="music"&&audio.gain_db>-96))fail("AUDIO_SOUNDTRACK_REQUIRED","the delivered work requires audible music");
  for(const span of resourceSpans){const used=decision.audio.filter(audio=>audio.source.span_id===span.span_id&&audio.source.asset_id===span.asset_id);if(!used.length||used.some(audio=>audio.role!==span.resource_kind))fail("AUDIO_SELECTED_RESOURCE_OMITTED","final must arrange every selected resource with its real role");}
  assertCreativeSkillEffects(root.context, exchanges, decision,resourceSpans);
  return decision;
}
const resolveFinalFor = (final, root, exchanges) => historicalV2(root.context) ? resolveHistoricalV2Final(final, root.context, exchanges) : resolveCreationPlanningFinal(final, root, exchanges);

export function validateCreationPlanningProof(state, ticket, input, output, audit) {
  if (input?.context?.planning?.protocol === "planning-exchange-v1") return validateLegacyPlanningProof(state, ticket, input, output, audit);
  checkedCatalog(input.context);
  const invalid = message => fail("CREATION_PLANNING_PROOF_INVALID", message);
  const proof = audit?.planning, calls = state.model_calls.filter(call => call.run_id === ticket.run_id);
  if ((!same(input.context?.planning, CREATION_PLANNING_PROTOCOL) && !historicalV2(input.context)) || proof?.protocol !== input.context.planning.protocol || proof.root_input_digest !== ticket.input_digest || creationDigest(input) !== ticket.input_digest || audit.input_hash !== ticket.input_digest || audit.output_hash !== creationDigest(output) || audit.retry_count !== 0 || audit.cache_hit || !Array.isArray(proof.rounds) || proof.rounds.length < 1 || proof.rounds.length > 3 || calls.length !== proof.rounds.length) invalid("root identity, budget or physical call count differs");
  const exchanges = []; let inputTokens = 0, outputTokens = 0, allUsage = true;
  for (const [index, round] of proof.rounds.entries()) {
    const derived = derivePlanningInput(input, exchanges), call = calls[index], raw = round.provider_output;
    if (!same(round.input, derived) || round.input_hash !== creationDigest(derived) || !raw || !["provider-text", "canonical-json"].includes(raw.representation) || typeof raw.payload !== "string" || raw.utf8_bytes !== Buffer.byteLength(raw.payload) || raw.sha256 !== createHash("sha256").update(raw.payload).digest("hex") || !same(JSON.parse(raw.payload), round.exchange) || round.output_hash !== creationDigest(round.exchange)) invalid("round input/raw output was rebound");
    if (typeof round.model_snapshot !== "string" || !round.model_snapshot || call.target && (call.target.role !== "planner" || call.target.sample_id !== undefined)) invalid("generation round snapshot/physical planner role differs");
    if (call.target && round.model_snapshot !== state.authorization?.deployment?.digest) invalid("routed round snapshot differs from the authorized split deployment");
    assertExchange(round.exchange, input.context);
    assertCreationPlanningRoundIdentity(derived, round.exchange);
    const usage = round.token_usage ? { ...round.token_usage, total: round.token_usage.total ?? round.token_usage.input + round.token_usage.output } : null;
    if (call.attempt !== index + 1 || call.revision !== ticket.revision || call.input_digest !== ticket.input_digest || !same(call.profile, ticket.profile) || call.wire_digest !== round.transport?.wire_digest || call.input_bytes !== round.transport?.input_bytes || !same(call.target ?? null, round.transport?.target ?? null) || call.settlement?.status !== "response" || call.settlement.output_digest !== round.output_hash || !same(call.settlement.usage, usage)) invalid("round differs from durable physical call ledger");
    if (usage) { inputTokens += usage.input; outputTokens += usage.output; } else allUsage = false;
    if (round.exchange.kind === "final") {
      if (index !== proof.rounds.length - 1 || round.measurement !== undefined || !same(resolveFinalFor(round.exchange, input, exchanges), output)) invalid("final output differs or final was followed by another call");
    } else {
      if (index >= 2 || index === proof.rounds.length - 1 || exchanges.some(item => item.exchange.query_id === round.exchange.query_id)) invalid("measurement budget or query identity invalid");
      const measurement = measureSelection(round.exchange, input.context);
      if (!same(measurement, round.measurement)) invalid("measurement differs from exact fixed-input calculation");
      if(input.context.audio_library)validatePlanningAudioReceipts(input,round.exchange,round.audio_receipts);
      exchanges.push({ exchange: round.exchange, measurement, ...(input.context.audio_library?{audio_receipts:round.audio_receipts}:{}) });
    }
  }
  const total = allUsage ? { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens } : null;
  const actual = audit.token_usage ? { ...audit.token_usage, total: audit.token_usage.total ?? audit.token_usage.input + audit.token_usage.output } : null;
  if (!same(total, actual)) invalid("aggregate usage differs from accounted physical calls");
}


/** Recover only an already bound failed final for numeric diagnostics. No candidate changes. */
export function resolveRejectedCreationPlanningFinal(final, diagnostic) {
  if (final?.exchange_version === 1) return readHistoricalPlanningFinalReceipt(final);
  const invalid = message => fail("CREATION_FAILURE_DIAGNOSTIC_INVALID", message);
  if (!diagnostic || ![CREATION_PLANNING_PROTOCOL.protocol, HISTORICAL_V2_PROTOCOL.protocol].includes(diagnostic.protocol) || diagnostic.protocol !== diagnostic.root_input?.context?.planning?.protocol || diagnostic.root_input_digest !== creationDigest(diagnostic.root_input) || !Array.isArray(diagnostic.rounds) || diagnostic.rounds.length < 1 || diagnostic.rounds.length > 2) invalid("failed final lacks its fixed root and completed measurements");
  const exchanges = [];
  for (const round of diagnostic.rounds) {
    assertExchange(round.exchange, diagnostic.root_input.context);
    const derived = derivePlanningInput(diagnostic.root_input, exchanges), raw = round.provider_output;
    if (round.exchange.kind !== "measure_selection" || exchanges.some(item => item.exchange.query_id === round.exchange.query_id) || round.input_hash !== creationDigest(derived) || !same(round.input, derived) || !raw || raw.sha256 !== createHash("sha256").update(raw.payload).digest("hex") || raw.utf8_bytes !== Buffer.byteLength(raw.payload) || !same(JSON.parse(raw.payload), round.exchange) || round.output_hash !== creationDigest(round.exchange)) invalid("completed failed-run measurement evidence differs");
    assertCreationPlanningRoundIdentity(derived, round.exchange);
    const measurement = measureSelection(round.exchange, diagnostic.root_input.context);
    if (!same(measurement, round.measurement)) invalid("failed-run measurement was rebound");
    if(diagnostic.root_input.context.audio_library)validatePlanningAudioReceipts(diagnostic.root_input,round.exchange,round.audio_receipts);
    exchanges.push({ exchange: round.exchange, measurement, ...(diagnostic.root_input.context.audio_library?{audio_receipts:round.audio_receipts}:{}) });
  }
  const derived = derivePlanningInput(diagnostic.root_input, exchanges), pending = diagnostic.pending, raw = pending?.provider_output;
  if (!pending || pending.input_hash !== creationDigest(derived) || !same(pending.input, derived) || !raw || raw.sha256 !== createHash("sha256").update(raw.payload).digest("hex") || raw.utf8_bytes !== Buffer.byteLength(raw.payload) || !same(JSON.parse(raw.payload), final)) invalid("rejected final is not the saved pending response");
  return resolveFinalFor(final, diagnostic.root_input, exchanges);
}
