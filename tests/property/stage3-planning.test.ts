import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const Ajv2020 = createRequire(import.meta.url)("ajv/dist/2020.js").default;
import { CREATION_PLANNING_PROTOCOL, retainedAudioSpan, creationPlanningMeasurementReceipt, buildCreationSourceChoiceCatalog, resolveCreationPlanningFinal, resolveRejectedCreationPlanningFinal, creationDecisionSchema, creationDigest, deriveCreationPlanningInput, measureCreationSelection, validateCreationPlanningProof } from "../../packages/platform/contract-runtime/src/public.js";
import { createQwenProvider, createSplitModelProvider, runModel } from "../../packages/platform/model-gateway/src/public.js";
import { createCreationPlanningProvider } from "../../packages/platform/model-gateway/src/creation-planning.js";
// @ts-expect-error P5 runtime harness is plain JavaScript without declarations.
import { createGuard, policyDigest } from "../../scripts/p5/guard.mjs";
// @ts-expect-error P5 runtime harness is plain JavaScript without declarations.
import { initializeLedger, openLedger } from "../../scripts/p5/ledger.mjs";

const creativeFields = (decision: any) => { const {decision_version:_version,target_duration_ticks:_target,shots,...fields}=decision; return {...fields,shots:shots.map(({source_window:_window,source_choice:_choice,timing:_timing,...shot}:any)=>shot)}; };
const time = (value: number, timescale = 30) => ({ schema_version: 1 as const, value, timescale });
const decision = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-decision.v1.json", "utf8"));
const span = { span_id: decision.shots[0].source_window.span_id, asset_id: decision.shots[0].source_window.asset_id, editable_start: time(0), editable_end: time(180), observations: [{ description: "real fixture description", uncertain: false, kind: "visual", evidence_id: "visual-1", sample_at: time(0) }] };
const root: any = { context: { planning_semantic_policy: "creative-v2", creative_brief: "Create a supported draft", planning: CREATION_PLANNING_PROTOCOL, planning_projection_version: "phase-specific-v1", output_schema: creationDecisionSchema, source_spans: [span], timeline: { sequence: { timebase: { value: "1", timescale: "30" } } }, duration_budget: { minimum_total_ticks: "90", maximum_total_ticks: "90" } }, media: [] as [] };
root.context.source_choice_catalog = buildCreationSourceChoiceCatalog(root.context);
const selection = (id: string, end = 30, kind: "weighted" | "exact" = "weighted") => ({ selection_id: id, source_choice: { kind: "custom_window" as const, source_window: { span_id: span.span_id, asset_id: span.asset_id, start: time(0), end: time(end) } }, timing: kind === "weighted" ? { kind, weight: 1 } : { kind } });
const query = (id = "query-1", end = 30) => ({ exchange_version: 3 as const, kind: "measure_selection" as const, query_id: id, target_duration_ticks: 90, selection: [selection("first", end)] });
const measured = measureCreationSelection(query(), root.context);
assert.equal(measured.total_capacity_ticks, "30"); assert.equal(measured.deficit_ticks, "60"); assert.equal(measured.capacity_feasible, false);
assert.equal(measureCreationSelection(query("full", 120), root.context).capacity_feasible, true);
const fixed = { ...query(), selection: [selection("fixed", 120, "exact")] };
assert.equal(measureCreationSelection(fixed, root.context).minimum_excess_ticks, "30", "sum>=target alone cannot pass exact reservations");
const fractional = query(); fractional.selection[0]!.source_choice.source_window.end = time(1, 29);
fractional.selection[0]!.timing = { kind: "exact" };
assert.throws(() => measureCreationSelection(fractional, root.context), (error: any) => error.code === "CREATION_TIME_INEXACT");
const outside = query(); outside.selection[0]!.source_choice.source_window.end = time(181);
assert.throws(() => measureCreationSelection(outside, root.context), (error: any) => error.code === "CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA");
assert.throws(() => measureCreationSelection({ ...query(), target_duration_ticks: 91 }, root.context), (error: any) => error.code === "CREATION_DURATION_TARGET_UNMET");
assert.throws(() => measureCreationSelection({ ...query(), extra: true }, root.context), (error: any) => error.code === "CREATION_PLANNING_EXCHANGE_INVALID");
const round = deriveCreationPlanningInput(root, [{ exchange: query("schema",120), measurement: measureCreationSelection(query("schema",120),root.context) }]);
const largeTrackRoot = structuredClone(root);
largeTrackRoot.context.source_track_retention = { version: 1, asset_id: span.asset_id, boundary: { version: 1, asset_id: span.asset_id, start_pts: "0", end_pts: "48000", time_base: { numerator: "1", denominator: "48000" } }, material_operation_id: "private-material", material_digest: "f".repeat(64), fresh_probe_digest: "a".repeat(64), fresh_probe: { timing: { frame_pts: Array.from({ length: 100000 }, (_, index) => index) } } };
for (const projected of [deriveCreationPlanningInput(largeTrackRoot, []), deriveCreationPlanningInput(largeTrackRoot, [{ exchange: query("large-track",120), measurement: measureCreationSelection(query("large-track",120),largeTrackRoot.context) }])]) {
  const wire = JSON.stringify(projected);
  assert.equal(wire.includes("frame_pts"), false, "the planner must never receive the local probe's full frame table");
  assert.equal(wire.includes("private-material"), false, "local material authority stays out of provider input");
  assert.ok(wire.length < 50000, "physical planning input does not grow with audio frame count");
  assert.equal((projected.context as any).source_track_retention.asset_id, span.asset_id);
}
assert.equal(round.context.planning_exchange.round, 2);
assert.equal(JSON.stringify(round).includes('"input_hash"'), false, "audit inputs are not recursively fed back");
const ajv = new Ajv2020({ strict: false });
const schema = ajv.compile(round.context.planning_exchange.response_schema);
assert.equal(schema(query()), true, JSON.stringify(schema.errors));
assert.equal(schema({ exchange_version: 3, kind: "final", measured_query_id: "schema", measurement_receipt_digest:(round.context.planning_exchange as any).feasible_receipts[0].measurement_receipt_digest, creative:{...creativeFields(decision),shots:[{...creativeFields(decision).shots[0],shot_id:"first"}]} }), true, JSON.stringify(schema.errors));
assert.equal(schema(decision), false, "bare legacy final is no longer a model response");

const productionRoot = structuredClone(root); productionRoot.context.planning_query_identity = "host-root-round-v1";
async function exercise(replies: any[], options: { reuseId?: boolean; finalInvalid?: boolean; cancelAfter?: number; persistenceFailure?: boolean } = {}) {
  let sends = 0, freshness = 0, audits: any[] = [], currentTransport: any;
  const controller = new AbortController();
  const adapter = createQwenProvider({ api_key: "fixture", models: [{ model: "fixture", media_types: [] }], fetch_impl: async (_url, init) => {
    const input = JSON.parse(JSON.parse(init!.body as string).messages[0].content);
    assert.equal(input.planning_exchange.round, sends + 1);
    const body = structuredClone(replies[sends++]);
    if (body?.kind === "measure_selection") body.query_id = options.reuseId && sends === 2 ? `measure:${creationDigest(productionRoot).slice(0,32)}:1` : input.planning_exchange.assigned_query_id;
    else if (body?.kind === "final" && body.creative) {
      body.measured_query_id = input.planning_exchange.feasible_receipts[0]?.query_id ?? input.planning_exchange.exchanges.at(-1)?.exchange.query_id ?? body.measured_query_id;
      if (body.measurement_receipt_digest === "0".repeat(64)) body.measurement_receipt_digest = input.planning_exchange.feasible_receipts[0]?.measurement_receipt_digest ?? body.measurement_receipt_digest;
    }
    return new Response(JSON.stringify({ choices: [{ message: { content: typeof body === "string" ? body : JSON.stringify(body) }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }));
  } });
  const sink = async (audit: any) => { audits.push({ audit, transport: currentTransport }); if (options.persistenceFailure) throw new Error("controlled settlement failure"); if (options.cancelAfter === audits.length) controller.abort(new Error("cancel between rounds")); };
  const wrapper = createCreationPlanningProvider(adapter, async () => { freshness += 1; });
  const request = { request_id: "run", project_id: "project", provider: "qwen", model: "fixture", prompt_version: "stage3-creation-v1", privacy_class: "sensitive" as const, input: productionRoot, structured_output: true, signal: controller.signal, on_call_audit: sink,
    output_validator: () => { if (options.finalInvalid) throw new Error("controlled final rejection"); }, dispatch: async (send: any, transport: any) => { currentTransport = transport; return send().response; } };
  try { return { result: await runModel(request, wrapper, Date.now(), { policy: { allowed_sensitive_providers: ["qwen"], retry: { max_attempts: 1 } } }), sends, audits, freshness }; }
  catch (error) { return { error: error as any, sends, audits, freshness }; }
}
decision.target_duration_ticks = 90; decision.shots[0].shot_id = "first"; decision.shots[0].source_window.end = time(120);
const chosen = { ...decision, shots: decision.shots.map(({ source_window, ...shot }: any) => ({ ...shot, source_choice: { kind: "custom_window", source_window } })) };
const final = { exchange_version: 3, kind: "final", measured_query_id: "query-2", measurement_receipt_digest:"0".repeat(64), creative: creativeFields(chosen) };
// Creative intent is no longer a mandatory proof object in new planning.
for (const projection of ["source-evidence-v1", "source-evidence-v2"]) {
  const current = structuredClone(root);
  current.context.audio_requirement_projection = projection;
  current.context.request = { current_revision: { revision: 2, raw_text: "30秒vlog" }, revisions: [{revision:1,raw_text:"30秒vlog，配字幕"},{revision:2,raw_text:"30秒vlog"}] };
  const input = deriveCreationPlanningInput(current, []);
  const validator = ajv.compile(input.context.planning_exchange.response_schema);
  assert.equal(validator(query("silent",120)), true, JSON.stringify(validator.errors));
  assert.equal(validator({...query("silent",120),audio_intent:{status:"required",requirements:[]}}), false);
  const request = query("silent",120);
  const measurement = measureCreationSelection(request,current.context);
  const finalDecision = {...final,measured_query_id:request.query_id,measurement_receipt_digest:creationPlanningMeasurementReceipt(current,request,measurement)};
  assert.doesNotThrow(()=>resolveCreationPlanningFinal(finalDecision,current,[{exchange:request,measurement}]));
}
const good = await exercise([query(), query("query-2", 120), final]);
assert.ok(good.result); assert.equal(good.sends, 3); assert.equal(good.audits.length, 3); assert.ok(good.freshness >= 7);
const ticket = { run_id: "run", input_digest: creationDigest(productionRoot), revision: 1, profile: null };
const state = { model_calls: good.audits.map(({ audit, transport }: any, index: number) => ({ run_id: "run", revision: 1, input_digest: ticket.input_digest, profile: null, attempt: index + 1, ...transport, settlement: { status: "response", output_digest: audit.output_hash, usage: { ...audit.token_usage, total: 30 } } })) };
validateCreationPlanningProof(state, ticket, productionRoot, decision, good.result!.audit);
// A saved pre-migration v3 proof must replay using its original projected
// prompt, schema, raw response and call ledger, even after the new policy.
// @ts-expect-error Frozen historical reader is private JavaScript.
const oldV3 = await import("../../packages/platform/contract-runtime/src/creation-planning-legacy-v3.mjs");
const oldRoot = structuredClone(productionRoot); delete oldRoot.context.planning_semantic_policy;
oldRoot.context.audio_requirement_projection = "source-evidence-v1";
oldRoot.context.request = {current_revision:{revision:1,raw_text:"30秒vlog"}, revisions:[{revision:1,raw_text:"30秒vlog"}]};
const oldInput1 = oldV3.deriveCreationPlanningInput(oldRoot, []);
const oldQuery = {...query(oldInput1.context.planning_exchange.assigned_query_id,120),audio_intent:{status:"not_requested",requirements:[]}};
const oldMeasurement = oldV3.measureCreationSelection(oldQuery, oldRoot.context);
const oldExchanges = [{exchange:oldQuery,measurement:oldMeasurement}];
const oldInput2 = oldV3.deriveCreationPlanningInput(oldRoot,oldExchanges);
const oldFinal = {...final,measured_query_id:oldQuery.query_id,measurement_receipt_digest:oldV3.creationPlanningMeasurementReceipt(oldRoot,oldQuery,oldMeasurement)};
const oldOutput = oldV3.resolveCreationPlanningFinal(oldFinal,oldRoot,oldExchanges);
const oldTransport = {wire_digest:"1".repeat(64),input_bytes:1};
const oldRound = (input:any,exchange:any,measurement?:any) => {const payload=JSON.stringify(exchange);return {model_snapshot:"old-model",input,input_hash:creationDigest(input),transport:oldTransport,provider_output:{representation:"provider-text",payload,utf8_bytes:Buffer.byteLength(payload),sha256:createHash("sha256").update(payload).digest("hex")},exchange,output_hash:creationDigest(exchange),...(measurement ? {measurement}: {})};};
const oldRounds = [oldRound(oldInput1,oldQuery,oldMeasurement),oldRound(oldInput2,oldFinal)];
const oldTicket = {run_id:"old-run",input_digest:creationDigest(oldRoot),revision:1,profile:null};
const oldState = {model_calls:oldRounds.map((round:any,index:number)=>({run_id:"old-run",attempt:index+1,revision:1,input_digest:oldTicket.input_digest,profile:null,...oldTransport,settlement:{status:"response",output_digest:round.output_hash,usage:null}}))};
const oldAudit = {input_hash:oldTicket.input_digest,output_hash:creationDigest(oldOutput),retry_count:0,cache_hit:false,planning:{protocol:"planning-exchange-v3",root_input_digest:oldTicket.input_digest,rounds:oldRounds}};
assert.doesNotThrow(()=>validateCreationPlanningProof(oldState,oldTicket,oldRoot,oldOutput,oldAudit));
const tamperedOld = structuredClone(oldAudit); tamperedOld.planning.rounds[0].provider_output.payload += " ";
assert.throws(()=>validateCreationPlanningProof(oldState,oldTicket,oldRoot,oldOutput,tamperedOld));

for (const change of [ (value: any) => { value.rounds[0].transport.wire_digest = "0".repeat(64); }, (value: any) => { value.rounds[1].input.context.task += " rebind"; value.rounds[1].input_hash = creationDigest(value.rounds[1].input); }, (value: any) => { value.rounds[0].measurement.total_capacity_ticks = "900"; } ]) {
  const audit = structuredClone(good.result!.audit); change(audit.planning); assert.throws(() => validateCreationPlanningProof(state, ticket, productionRoot, decision, audit), /CREATION_PLANNING|round|measurement/);
}
const direct = await exercise([final]); assert.equal(direct.sends, 1); assert.equal(direct.error.cause.code, "CREATION_PLANNING_MEASUREMENT_REQUIRED");
const excess = await exercise([query(), query("second",120), query("third"), final]); assert.equal(excess.sends, 3); assert.equal(excess.error.code, "MODEL_OUTPUT_INVALID"); assert.equal(excess.error.cause.code, "CREATION_PLANNING_BUDGET_EXCEEDED"); assert.equal(excess.error.planning_diagnostic.rounds.length, 2);
const reused = await exercise([query(), query(), final], { reuseId: true }); assert.equal(reused.sends, 2); assert.equal(reused.error.cause.code, "CREATION_PLANNING_QUERY_ID_MISMATCH");
const invalidFinal = await exercise([query("query-2",120), final, final], { finalInvalid: true }); assert.equal(invalidFinal.sends, 2); assert.equal(invalidFinal.error.code, "MODEL_OUTPUT_INVALID"); const actualInvalidFinal = { ...final, measured_query_id: `measure:${creationDigest(productionRoot).slice(0,32)}:1`, measurement_receipt_digest: creationPlanningMeasurementReceipt(productionRoot,invalidFinal.error.planning_diagnostic.rounds[0].exchange,invalidFinal.error.planning_diagnostic.rounds[0].measurement) }; assert.equal(invalidFinal.error.planning_diagnostic.pending.provider_output.payload, JSON.stringify(actualInvalidFinal));
const invalidQuery = await exercise([outside, final]); assert.equal(invalidQuery.sends, 1); assert.equal(invalidQuery.error.cause.code, "CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA");
const badJson = await exercise(["{", final]); assert.equal(badJson.sends, 1); assert.equal(badJson.error.planning_diagnostic.pending.provider_output.payload, "{");
const cancel = await exercise([query(), final], { cancelAfter: 1 }); assert.equal(cancel.sends, 1); assert.equal(cancel.error.code, "MODEL_CANCELLED"); assert.ok(cancel.error.planning_diagnostic);
const persistence = await exercise([query(), final], { persistenceFailure: true }); assert.equal(persistence.sends, 1); assert.ok(persistence.error.planning_diagnostic.pending.provider_output);


const unknownChoice = { ...query(), selection: [{ ...selection("first"), source_choice: { kind: "catalog_option", option_id: "missing" } }] };
assert.throws(() => measureCreationSelection(unknownChoice, root.context), (error: any) => error.code === "CREATION_PLANNING_OPTION_INVALID");
const catalogQuery = { ...query("catalog"), selection: [{ selection_id: "first", source_choice: { kind: "catalog_option", option_id: "s1v1" }, timing: { kind: "weighted", weight: 1 } }] };
assert.equal(measureCreationSelection(catalogQuery, root.context).total_capacity_ticks, "180");
const catalogFinal = { ...final, measured_query_id: "catalog" };
const catalogGood = await exercise([catalogQuery, catalogFinal]); assert.ok(catalogGood.result); assert.equal(catalogGood.sends,2);
assert.deepEqual((catalogGood.result!.output as any).shots[0].source_window, root.context.source_choice_catalog[0].source_window);
const rebound = structuredClone(catalogFinal); rebound.creative.shots[0].shot_id="different"; const badBinding=await exercise([catalogQuery,rebound]); assert.equal(badBinding.error.cause.code,"CREATION_PLANNING_SELECTION_REBOUND"); assert.equal(badBinding.sends,2);
const wrongReceipt={...catalogFinal,measurement_receipt_digest:"f".repeat(64)};const badReceipt=await exercise([catalogQuery,wrongReceipt]);assert.equal(badReceipt.error.cause.code,"CREATION_PLANNING_RECEIPT_REBOUND");assert.equal(badReceipt.sends,2);
for(const extra of [{decision:chosen},{selection:catalogQuery.selection},{target_duration_ticks:90}]) {const result=await exercise([catalogQuery,{...catalogFinal,...extra}]);assert.equal(result.error.cause.code,"CREATION_PLANNING_EXCHANGE_INVALID");assert.equal(result.sends,2);}
const duplicate=structuredClone(catalogFinal);duplicate.creative.shots.push(duplicate.creative.shots[0]);const duplicateResult=await exercise([catalogQuery,duplicate]);assert.equal(duplicateResult.error.cause.code,"CREATION_PLANNING_SELECTION_REBOUND");
const missing=structuredClone(catalogFinal);missing.creative.shots=[];const missingResult=await exercise([catalogQuery,missing]);assert.equal(missingResult.error.cause.code,"CREATION_PLANNING_EXCHANGE_INVALID");

const infeasible = await exercise([query("query-2"),final]); assert.equal(infeasible.error.cause.code,"CREATION_PLANNING_SELECTION_INFEASIBLE"); assert.equal(infeasible.sends,2);
const changedCatalog=structuredClone(root); changedCatalog.context.source_choice_catalog[0].source_window.end=time(179); assert.throws(()=>deriveCreationPlanningInput(changedCatalog,[]),(error:any)=>error.code==="CREATION_PLANNING_CATALOG_REBOUND");
const initial=deriveCreationPlanningInput(root,[]); const firstSchema=ajv.compile(initial.context.planning_exchange.response_schema); assert.equal(firstSchema(final),false); assert.equal(firstSchema(catalogQuery),true);
assert.equal("output_schema" in initial.context,false); assert.equal("source_choice_catalog" in initial.context,false); assert.equal((initial.context.source_spans as any[])[0].observations[0].option_id,"s1v1");

assert.deepEqual(resolveRejectedCreationPlanningFinal(actualInvalidFinal,invalidFinal.error.planning_diagnostic),decision);
const changedFailedProof=structuredClone(invalidFinal.error.planning_diagnostic);changedFailedProof.rounds[0].measurement.total_capacity_ticks="999";assert.throws(()=>resolveRejectedCreationPlanningFinal(actualInvalidFinal,changedFailedProof),(error:any)=>error.code==="CREATION_FAILURE_DIAGNOSTIC_INVALID");
const duplicateEvidence=structuredClone(root.context);duplicateEvidence.source_spans[0].observations.push({...duplicateEvidence.source_spans[0].observations[0],sample_at:time(1)});assert.throws(()=>buildCreationSourceChoiceCatalog(duplicateEvidence),(error:any)=>error.code==="CREATION_PLANNING_INPUT_INVALID");

const phaseFirst=deriveCreationPlanningInput(root,[]).context as any;
assert.equal(phaseFirst.planning_exchange.phase,"measure-only"); assert.deepEqual(phaseFirst.planning_exchange.allowed_kinds,["measure_selection"]);assert.equal(phaseFirst.task.includes("measured_query_id"),false);assert.equal(phaseFirst.task.includes("kind=final"),false);
const actualMixed={...query("mixed",120),kind:"final",measured_query_id:"not-completed"};const mixedFailure=await exercise([actualMixed]);assert.equal(mixedFailure.sends,1);assert.equal(mixedFailure.error.cause.code,"CREATION_PLANNING_EXCHANGE_INVALID");assert.equal(mixedFailure.error.planning_diagnostic.pending.provider_output.payload,JSON.stringify(actualMixed));
const exhaustedMeasurements=await exercise([query("short-1"),query("short-2")]);assert.equal(exhaustedMeasurements.sends,2);assert.equal(exhaustedMeasurements.error.code,"MODEL_OUTPUT_INVALID");assert.equal(exhaustedMeasurements.error.cause.code,"CREATION_PLANNING_BUDGET_EXCEEDED");
const paceRoot=structuredClone(root);paceRoot.context.timeline.version=2;paceRoot.context.timeline.tracks=[];
paceRoot.context.pacing_reference={version:1,sequence:{timebase:{value:"1",timescale:"24"}},tracks:[{kind:"video",clips:[{timeline_duration:"24"},{timeline_duration:"48"}]}]};
paceRoot.context.pacing_budget={kind:"each-shot-longer-than-base-mean",base_timeline_version:1,minimum_shot_ticks:"46"};
const paceQuery={...query("paced",120),selection:[selection("first",120),selection("second",120)]};
const paceMeasure=measureCreationSelection(paceQuery,paceRoot.context);assert.equal(paceMeasure.capacity_feasible,true);assert.equal(paceMeasure.pacing_feasible,false);assert.deepEqual(paceMeasure.selection.map(item=>item.allocated_duration_ticks),["45","45"]);
const paceFinal={...final,measured_query_id:"paced",creative:{...final.creative,shots:paceQuery.selection.map(item=>({...final.creative.shots[0],shot_id:item.selection_id}))}};
assert.throws(()=>resolveCreationPlanningFinal(paceFinal,paceRoot,[{exchange:paceQuery,measurement:paceMeasure}]),(error:any)=>error.code==="CREATION_PACING_GOAL_UNMET");
assert.equal((deriveCreationPlanningInput(paceRoot,[{exchange:paceQuery,measurement:paceMeasure}]).context as any).planning_exchange.phase,"measure-only");
const acceptedPace=measureCreationSelection(query("paced-one",120),paceRoot.context);assert.equal(acceptedPace.pacing_feasible,true);assert.deepEqual(acceptedPace.selection.map(item=>item.allocated_duration_ticks),["90"]);

const hostIdentityFirst = deriveCreationPlanningInput(productionRoot, []).context as any;
assert.equal(hostIdentityFirst.planning_exchange.assigned_query_id, `measure:${creationDigest(productionRoot).slice(0,32)}:1`);
const assignedFirst={...query("assigned",120),query_id:hostIdentityFirst.planning_exchange.assigned_query_id};
const hostIdentitySecond=deriveCreationPlanningInput(productionRoot,[{exchange:assignedFirst,measurement:measureCreationSelection(assignedFirst,productionRoot.context)}]).context as any;
assert.notEqual(hostIdentitySecond.planning_exchange.assigned_query_id,assignedFirst.query_id);
assert.match(hostIdentitySecond.task,/JSON/,"each physical planner prompt explicitly requests JSON");
const hostSchema=ajv.compile(hostIdentitySecond.planning_exchange.response_schema);
assert.equal(hostSchema({...query("new",120),query_id:hostIdentitySecond.planning_exchange.assigned_query_id}),true);
assert.equal(hostSchema(assignedFirst),false,"old query identity cannot be reused even with different creative selections");
assert.equal(hostSchema({...final,measured_query_id:assignedFirst.query_id,measurement_receipt_digest:hostIdentitySecond.planning_exchange.feasible_receipts[0].measurement_receipt_digest}),true);
assert.equal(hostSchema({...final,measured_query_id:"invented"}),false);
assert.equal(hostIdentitySecond.planning_feasibility.previous_measurement.total_capacity_ticks,"120");
assert.deepEqual(hostIdentitySecond.planning_feasibility.eligible_catalog_options.map((item:any)=>item.option_id),["s1v1"]);
// An explicit upper bound is not an exact target; only a new measured query
// may change the target. Missing policy retains byte-stable historical replay.
const upperRoot = structuredClone(productionRoot);
upperRoot.context.duration_remeasurement_policy = "explicit-upper-bound-v1";
upperRoot.context.duration_budget = { minimum_total_ticks: "1", maximum_total_ticks: "1800", exact_total_ticks: null };
upperRoot.context.hard_duration_target = { minimum: null, maximum: { value: "60", timescale: "1" } };
upperRoot.context.source_spans[0].editable_end = time(900);
upperRoot.context.source_choice_catalog = buildCreationSourceChoiceCatalog(upperRoot.context);
const upperFirst = deriveCreationPlanningInput(upperRoot, []).context as any;
const upperQ1 = { ...query("first", 900), target_duration_ticks: 1800, query_id: upperFirst.planning_exchange.assigned_query_id };
const upperM1 = measureCreationSelection(upperQ1, upperRoot.context);
assert.equal(upperM1.capacity_feasible, false);
const upperSecond = deriveCreationPlanningInput(upperRoot, [{ exchange: upperQ1, measurement: upperM1 }]).context as any;
assert.match(upperSecond.task, /only an upper bound/);
assert.match(upperSecond.task, /new measure_selection with a shorter target/);
assert.notEqual(upperSecond.planning_exchange.assigned_query_id, upperQ1.query_id);
const upperQ2 = { ...query("second", 900), query_id: upperSecond.planning_exchange.assigned_query_id, target_duration_ticks: 900 };
const upperM2 = measureCreationSelection(upperQ2, upperRoot.context);
assert.equal(upperM2.capacity_feasible, true);
const upperFinal = deriveCreationPlanningInput(upperRoot, [{ exchange: upperQ1, measurement: upperM1 }, { exchange: upperQ2, measurement: upperM2 }]).context as any;
assert.equal(upperFinal.planning_exchange.phase, "final-only");
assert.deepEqual(upperFinal.planning_exchange.feasible_receipts.map((receipt: any) => receipt.query_id), [upperQ2.query_id]);
assert.throws(() => measureCreationSelection({ ...upperQ2, target_duration_ticks: 1801 }, upperRoot.context), (error: any) => error.code === "CREATION_DURATION_TARGET_UNMET");
for (const explicitMinimum of [{ value: "1", timescale: "30" }, { value: "2", timescale: "1" }]) {
  const constrained = structuredClone(upperRoot);
  // Even when the quantized minimum equals the implicit one-tick floor, the
  // Host's explicit lower bound must not be reinterpreted as absent.
  constrained.context.hard_duration_target.minimum = explicitMinimum;
  const next = deriveCreationPlanningInput(constrained, [{ exchange: upperQ1, measurement: measureCreationSelection(upperQ1, constrained.context) }]).context as any;
  assert.doesNotMatch(next.task, /new measure_selection with a shorter target/);
  assert.match(next.task, /target unchanged/);
}
const exactRoot = structuredClone(upperRoot);
exactRoot.context.hard_duration_target.minimum = { value: "60", timescale: "1" };
exactRoot.context.duration_budget.minimum_total_ticks = "1800";
exactRoot.context.duration_budget.exact_total_ticks = "1800";
const exactSecond = deriveCreationPlanningInput(exactRoot, [{ exchange: upperQ1, measurement: measureCreationSelection(upperQ1, exactRoot.context) }]).context as any;
assert.doesNotMatch(exactSecond.task, /new measure_selection with a shorter target/);
assert.throws(() => measureCreationSelection(upperQ2, exactRoot.context), (error: any) => error.code === "CREATION_DURATION_TARGET_UNMET");
const secondInfeasible = { ...upperQ2, selection: [selection("second", 300)] };
const secondInfeasibleMeasurement = measureCreationSelection(secondInfeasible, upperRoot.context);
assert.equal(secondInfeasibleMeasurement.capacity_feasible, false);
assert.throws(() => deriveCreationPlanningInput(upperRoot, [{ exchange: upperQ1, measurement: upperM1 }, { exchange: secondInfeasible, measurement: secondInfeasibleMeasurement }]), (error: any) => error.code === "CREATION_PLANNING_BUDGET_EXCEEDED");
const historicalUpper = structuredClone(upperRoot);
delete historicalUpper.context.duration_remeasurement_policy;
const legacyNext = deriveCreationPlanningInput(historicalUpper, [{ exchange: upperQ1, measurement: measureCreationSelection(upperQ1, historicalUpper.context) }]).context as any;
assert.doesNotMatch(legacyNext.task, /new measure_selection with a shorter target/);
assert.match(legacyNext.task, /target unchanged/);
const unknownDurationPolicy = structuredClone(upperRoot);
unknownDurationPolicy.context.duration_remeasurement_policy = "future-unknown";
assert.throws(() => deriveCreationPlanningInput(unknownDurationPolicy, []), (error: any) => error.code === "CREATION_PLANNING_INPUT_INVALID");

const filteredRoot=structuredClone(paceRoot);filteredRoot.context.planning_query_identity="host-root-round-v1";
filteredRoot.context.source_spans.push({...span,span_id:"short",editable_end:time(45),observations:[{...span.observations[0],evidence_id:"short-evidence"}]});filteredRoot.context.source_choice_catalog=buildCreationSourceChoiceCatalog(filteredRoot.context);
const filtered=deriveCreationPlanningInput(filteredRoot,[]).context as any;
assert.equal(filtered.planning_feasibility.minimum_shot_ticks,"46");assert.deepEqual(filtered.planning_feasibility.eligible_catalog_options.map((item:any)=>item.option_id),["s1v1"]);
assert.equal(filtered.source_spans.length,2,"ineligible catalog rows retain original evidence and custom-window ranges");
const oldPhase=deriveCreationPlanningInput(root,[]).context as any;assert.equal(oldPhase.planning_exchange.assigned_query_id,undefined);assert.equal(oldPhase.planning_feasibility,undefined,"historical phase-specific input remains unchanged without new fixed marker");

// Corrected whole-work semantics are bound by a new kind; historical 109-style
// budgets above retain their original reconstruction and measurement bytes.
const spacious=structuredClone(root);
spacious.context.duration_budget={minimum_total_ticks:"900",maximum_total_ticks:"900"};
spacious.context.pacing_reference={version:1,sequence:{timebase:{value:"1",timescale:"30"}},tracks:[{kind:"video",clips:[90,100,100,120,130].map(t=>({timeline_duration:String(t)}))}]};
spacious.context.pacing_budget={kind:"longer-mean-with-preserved-minimum",base_timeline_version:1,minimum_shot_ticks:"90"};
const spaciousQuery=(durations:number[],kind:"weighted"|"exact"="exact")=>({...query("spacious"),target_duration_ticks:900,selection:durations.map((duration,index)=>selection(`s-${index}`,duration,kind))});
const feasibleSpacious=measureCreationSelection(spaciousQuery([160,125,125,115,95,95,95,90]),spacious.context);
assert.equal(feasibleSpacious.capacity_feasible,true);assert.equal(feasibleSpacious.pacing_feasible,true);assert.equal(feasibleSpacious.pacing_mean_increased,true);
const stillFragmented=measureCreationSelection(spaciousQuery(Array(9).fill(100)),spacious.context);assert.equal(stillFragmented.capacity_feasible,true);assert.equal(stillFragmented.pacing_feasible,false);assert.equal(stillFragmented.pacing_mean_increased,false);
const newFlash=measureCreationSelection(spaciousQuery([170,170,170,170,142,78]),spacious.context);assert.equal(newFlash.capacity_feasible,true);assert.equal(newFlash.pacing_feasible,false);assert.deepEqual(newFlash.pacing_violating_selection_ids,["s-5"]);
const originalBad=measureCreationSelection(spaciousQuery([130,120,133,166,93,78,97,81],"weighted"),spacious.context);assert.equal(originalBad.total_capacity_ticks,"898");assert.equal(originalBad.deficit_ticks,"2");assert.equal(originalBad.capacity_feasible,false);assert.equal(originalBad.pacing_feasible,false);
const reboundSpacious=structuredClone(spacious.context);reboundSpacious.pacing_budget.minimum_shot_ticks="89";assert.throws(()=>measureCreationSelection(spaciousQuery([160,125,125,115,95,95,95,90]),reboundSpacious),(error:any)=>error.code==="CREATION_PACING_BUDGET_INVALID");

spacious.context.planning_query_identity="host-root-round-v1";
const spaciousWire=deriveCreationPlanningInput(spacious,[]).context as any;
assert.equal(spaciousWire.planning_feasibility.minimum_shot_ticks,"90");
assert.equal(spaciousWire.planning_feasibility.mean_shot_requirement.maximum_shot_count_at_target,"8");
assert.deepEqual(spaciousWire.planning_feasibility.mean_shot_requirement.reference_mean_ticks,{numerator:"540",denominator:"5"});

for (const completed of [[{exchange:query("one",120),measurement:measureCreationSelection(query("one",120),root.context)}],[{exchange:query("first-short"),measurement:measureCreationSelection(query("first-short"),root.context)},{exchange:query("second-long",120),measurement:measureCreationSelection(query("second-long",120),root.context)}]]) {
  const projected=deriveCreationPlanningInput(root,completed).context as any;
  assert.match(projected.task,/measurement_receipt_digest copied exactly/);
  assert.equal(projected.task.includes("reproduce its complete ordered selection"),false);
  assert.equal(projected.task.includes("and decision. Match"),false);
  assert.deepEqual(projected.planning_exchange.feasible_receipts.map((receipt:any)=>receipt.selection_ids),[["first"]]);
}
const otherRoot=structuredClone(root);otherRoot.context.creative_brief="different run input";
const validQuery=query("receipt",120), validMeasurement=measureCreationSelection(validQuery,root.context);
const boundFinal={...final,measured_query_id:validQuery.query_id,measurement_receipt_digest:creationPlanningMeasurementReceipt(root,validQuery,validMeasurement)};
assert.deepEqual(resolveCreationPlanningFinal(boundFinal,root,[{exchange:validQuery,measurement:validMeasurement}]),decision);
assert.throws(()=>resolveCreationPlanningFinal(boundFinal,otherRoot,[{exchange:validQuery,measurement:validMeasurement}]),(error:any)=>error.code==="CREATION_PLANNING_RECEIPT_REBOUND");
assert.throws(()=>resolveCreationPlanningFinal({...boundFinal,measured_query_id:"prior-run"},root,[{exchange:validQuery,measurement:validMeasurement}]),(error:any)=>error.code==="CREATION_PLANNING_MEASUREMENT_REQUIRED");


const doubleQuery={...query("two-shots",120),selection:[selection("first",120),selection("second",120)]};
const doubleMeasurement=measureCreationSelection(doubleQuery,root.context);
const doubleFinal={...final,measured_query_id:doubleQuery.query_id,measurement_receipt_digest:creationPlanningMeasurementReceipt(root,doubleQuery,doubleMeasurement),creative:{...final.creative,shots:[{...final.creative.shots[0],shot_id:"second",purpose:"second decoration"},{...final.creative.shots[0],shot_id:"first",purpose:"first decoration"}]}};
const resolvedDouble=resolveCreationPlanningFinal(doubleFinal,root,[{exchange:doubleQuery,measurement:doubleMeasurement}]);
assert.deepEqual(resolvedDouble.shots.map(shot=>shot.shot_id),["first","second"],"immutable query, not decoration order, owns source order");
assert.deepEqual(resolvedDouble.shots.map(shot=>shot.purpose),["first decoration","second decoration"]);
for(const field of ["purpose","embedded_gain_db","reframe","color"]) { const incomplete=structuredClone(doubleFinal);delete incomplete.creative.shots[0][field];assert.throws(()=>resolveCreationPlanningFinal(incomplete,root,[{exchange:doubleQuery,measurement:doubleMeasurement}]),(error:any)=>error.code==="CREATION_PLANNING_EXCHANGE_INVALID"); }
assert.throws(()=>measureCreationSelection({...query(),exchange_version:2},root.context),(error:any)=>error.code==="CREATION_PLANNING_EXCHANGE_INVALID","retired v2 is not accepted by any new planning dispatch boundary");


// Explicit no-music and actual audible music govern the final decision, not catalog IDs alone.
const audioMeasurement=JSON.parse(readFileSync("contracts/examples/valid/editorial/audio-source-measurement.v1.json","utf8")),retained=retainedAudioSpan({ref:{object_ref_id:"actual",digest:creationDigest(audioMeasurement)},value:audioMeasurement});
const soundtrackRoot=structuredClone(root);soundtrackRoot.context.source_spans.push(retained);soundtrackRoot.context.audio_library={authorization:{pack_id:audioMeasurement.resource_ref.pack_id,pack_version:audioMeasurement.resource_ref.pack_version,pack_digest:audioMeasurement.resource_ref.pack_digest,mode:"automatic"},candidates:[],music_required:false,no_music:true};
const soundtrackQuery={...query("sound-policy",120),audio_resource_selections:[]},soundMeasurement=measureCreationSelection(soundtrackQuery,soundtrackRoot.context),soundRound={exchange:soundtrackQuery,measurement:soundMeasurement,audio_receipts:[]};
const soundtrackAudio={audio_id:"music",shot_id:"first",source:{asset_id:retained.asset_id,span_id:retained.span_id,start:retained.editable_start,end:time(retained.editable_start.value+retained.editable_start.timescale,retained.editable_start.timescale)},offset:time(0),role:"music",gain_db:-12,fade_in:time(0),fade_out:time(0),purpose:"Actual measured source"};
const policyFinal=()=>({...final,measured_query_id:soundtrackQuery.query_id,measurement_receipt_digest:creationPlanningMeasurementReceipt(soundtrackRoot,soundtrackQuery,soundMeasurement,[]),creative:{...final.creative,audio:[soundtrackAudio]}});
assert.throws(()=>resolveCreationPlanningFinal(policyFinal(),soundtrackRoot,[soundRound]),(error:any)=>error.code==="AUDIO_MUSIC_FORBIDDEN");
ajv.compile((deriveCreationPlanningInput(soundtrackRoot,[]).context as any).planning_exchange.response_schema);
soundtrackRoot.context.audio_library.music_required=true;soundtrackRoot.context.audio_library.no_music=false;soundtrackAudio.gain_db=-96;
assert.throws(()=>resolveCreationPlanningFinal(policyFinal(),soundtrackRoot,[soundRound]),(error:any)=>error.code==="AUDIO_SOUNDTRACK_REQUIRED");
soundtrackAudio.gain_db=-12;assert.equal(resolveCreationPlanningFinal(policyFinal(),soundtrackRoot,[soundRound]).audio[0].gain_db,-12);

const historicalPhysical=deriveCreationPlanningInput(root,[]);
assert.ok(!JSON.stringify(historicalPhysical.context.planning_exchange.response_schema).includes("retain_manual_layout"),"unmarked historical root keeps the original physical response schema");
assert.ok(!(historicalPhysical.context.task as string).includes("Include exchange_version:3 explicitly"));
const markedPhysical=deriveCreationPlanningInput({...root,context:{...root.context,planning_extensions:"mixed-media-v1"}},[]);
assert.ok(JSON.stringify(markedPhysical.context.planning_exchange.response_schema).includes("retain_manual_layout"));
assert.ok((markedPhysical.context.task as string).includes("Include exchange_version:3 explicitly"));

assert.ok(!(markedPhysical.context.task as string).includes("persisted author edit"),"v1 planning input remains immutable");
const latestPhysical=deriveCreationPlanningInput({...root,context:{...root.context,planning_extensions:"mixed-media-v2"}},[]);assert.ok((latestPhysical.context.task as string).includes("persisted author edit"));

const colorRoot:any=structuredClone(root);colorRoot.context.planning_extensions="mixed-media-v4";for(const span of colorRoot.context.source_spans)span.render_capabilities={color_available:false};const colorQuery=query("color-bound",120),colorMeasurement=measureCreationSelection(colorQuery,colorRoot.context),colorRound={exchange:colorQuery,measurement:colorMeasurement};const colorPhysical=deriveCreationPlanningInput(colorRoot,[colorRound]);const colorValidator=ajv.compile(colorPhysical.context.planning_exchange.response_schema);const colorFinal={exchange_version:3,kind:"final",measured_query_id:colorQuery.query_id,measurement_receipt_digest:creationPlanningMeasurementReceipt(colorRoot,colorQuery,colorMeasurement,undefined),creative:{...creativeFields(decision),shots:[{...creativeFields(decision).shots[0],shot_id:"first",color:null}]}};assert.equal(colorValidator(colorFinal),true,JSON.stringify(colorValidator.errors));assert.equal(colorValidator({...colorFinal,creative:{...colorFinal.creative,shots:[{...colorFinal.creative.shots[0],color:{exposure:0,contrast:1,saturation:1}}]}}),false,"unmeasured image color is refused by the actual final schema");

const measuredColorRoot:any=structuredClone(colorRoot);for(const span of measuredColorRoot.context.source_spans)span.render_capabilities.color_available=true;
const measuredColorQuery=query("actual-rec709",120),measuredColorRound={exchange:measuredColorQuery,measurement:measureCreationSelection(measuredColorQuery,measuredColorRoot.context)};
assert.doesNotThrow(()=>ajv.compile(deriveCreationPlanningInput(measuredColorRoot,[measuredColorRound]).context.planning_exchange.response_schema),"all color-capable selections must not produce invalid empty allOf");

// A resumed provider receives a Host-validated prefix, never re-sends it, and
// keeps the old call references in the final proof. This is an isolated HTTP
// fixture; the real Host still has to authenticate and inject its authority.
const continuationSeed: any = {
  root_input_digest: creationDigest(productionRoot),
  rounds: [structuredClone(good.result!.audit.planning!.rounds[0])],
  round_call_refs: [{ run_id: "old-run", call_id: "old-call" }],
  expected_pending: structuredClone(good.result!.audit.planning!.rounds[1]!.transport),
  continuation_id: "continuation-fixture",
};
async function exerciseContinuation(seed: any, authority: any, options: { root?: any; stale?: boolean; host?: "skip" | "duplicate" | "replace" | "throw-after" } = {}) {
  let sends = 0, hostDispatches = 0, authorityCalls = 0, freshness = 0, currentTransport: any;
  const audits: any[] = [];
  const adapter = createQwenProvider({ api_key: "fixture", models: [{ model: "fixture", media_types: [] }], fetch_impl: async (_url, init) => {
    const input = JSON.parse(JSON.parse(init!.body as string).messages[0].content);
    const number = input.planning_exchange.round; sends++;
    const reply: any = number === 2 ? { ...query("ignored", 120), query_id: input.planning_exchange.assigned_query_id } : {
      ...final, measured_query_id: input.planning_exchange.feasible_receipts[0]?.query_id,
      measurement_receipt_digest: input.planning_exchange.feasible_receipts[0]?.measurement_receipt_digest,
    };
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }));
  } });
  const wrappedAuthority = authority === undefined ? undefined : async (transport: any, send: any) => { authorityCalls++; return authority(transport, send); };
  const wrapper = createCreationPlanningProvider(adapter, async () => { freshness++; if (options.stale) throw new Error("source stale"); }, undefined, seed, wrappedAuthority);
  const request = { request_id: "new-run", project_id: "project", provider: "qwen", model: "fixture", prompt_version: "stage3-creation-v1", privacy_class: "sensitive" as const, input: options.root ?? productionRoot, structured_output: true,
    on_call_audit: async (audit: any) => { audits.push({ audit, transport: currentTransport }); }, output_validator: () => {}, dispatch: (send: any, transport: any) => {
      hostDispatches++; currentTransport = transport;
      if (options.host === "skip") return Promise.resolve(new Response("{}"));
      const response = send().response;
      if (options.host === "duplicate") { try { send(); } catch {} }
      if (options.host === "replace") return response.then(() => new Response("{}"));
      if (options.host === "throw-after") throw new Error("Host failed after invoking transport");
      return response;
    } };
  try { return { result: await runModel(request, wrapper, Date.now(), { policy: { allowed_sensitive_providers: ["qwen"], retry: { max_attempts: 1 } } }), sends, hostDispatches, authorityCalls, freshness, audits }; }
  catch (error) { return { error: error as any, sends, hostDispatches, authorityCalls, freshness, audits }; }
}
const forwardOnce = async (_transport: any, send: () => Promise<Response>) => send();
const resumed = await exerciseContinuation(continuationSeed, forwardOnce);
assert.ok(resumed.result, String(resumed.error));
assert.equal(resumed.sends, 2, "only the two remaining rounds make physical calls");
assert.equal(resumed.hostDispatches, 2); assert.equal(resumed.authorityCalls, 2); assert.ok(resumed.freshness >= 5);
assert.deepEqual(resumed.result!.audit.planning!.continuation, { continuation_id: "continuation-fixture", prior_round_call_refs: continuationSeed.round_call_refs });
assert.deepEqual(resumed.result!.audit.planning!.rounds[0], continuationSeed.rounds[0]);
assert.deepEqual(resumed.result!.token_usage, { input: 30, output: 60, total: 90 });
const continuationTicket = { run_id: "new-run", request_id: "request-fixture", revision: 1, input_digest: creationDigest(productionRoot), profile: null };
const savedCall = ({ audit, transport }: any, run_id: string, call_id: string, attempt: number) => ({ run_id, call_id, revision: 1, input_digest: continuationTicket.input_digest, profile: null, attempt, ...transport, settlement: { status: "response", output_digest: audit.output_hash, usage: { ...audit.token_usage, total: audit.token_usage.input + audit.token_usage.output } } });
const continuationState: any = { model_calls: [savedCall(good.audits[0], "old-run", "old-call", 1), { run_id: "old-run", call_id: "old-failed", attempt: 2, settlement: { status: "failed" } }, ...resumed.audits.map((value: any, index: number) => savedCall(value, "new-run", `new-call-${index}`, index + 1))] };
const validatedLineage = { continuation_id: "continuation-fixture", run_id: "new-run", prior_run_id: "old-run", request_id: "request-fixture", root_input_digest: continuationTicket.input_digest, pending_transport: continuationSeed.expected_pending, prior_round_call_refs: continuationSeed.round_call_refs, verified_prefix_rounds: continuationSeed.rounds };
validateCreationPlanningProof(continuationState, continuationTicket, productionRoot, decision, resumed.result!.audit, validatedLineage);
assert.throws(() => validateCreationPlanningProof(continuationState, continuationTicket, productionRoot, decision, resumed.result!.audit), /lineage/);
for (const tamper of [
  (s: any) => { s.model_calls[0].settlement.status = "failed"; },
  (s: any) => { s.model_calls[0].wire_digest = "a".repeat(64); },
  (s: any) => { s.model_calls[2].wire_digest = "a".repeat(64); },
  (s: any) => { s.model_calls[2].attempt = 2; },
]) {
  const changed = structuredClone(continuationState); tamper(changed);
  assert.throws(() => validateCreationPlanningProof(changed, continuationTicket, productionRoot, decision, resumed.result!.audit, validatedLineage), /planning|round|wire/i);
}
const noAuthority = await exerciseContinuation(continuationSeed, undefined); assert.equal(noAuthority.error.code, "MODEL_DISPATCH_DENIED"); assert.equal(noAuthority.sends, 0);
const noFreshness = await exerciseContinuation(continuationSeed, forwardOnce, { stale: true }); assert.equal(noFreshness.sends, 0); assert.equal(noFreshness.hostDispatches, 0);
for (const tamper of [
  (s: any) => { s.root_input_digest = "0".repeat(64); },
  (s: any) => { s.rounds[0].measurement.total_capacity_ticks = "999"; },
  (s: any) => { s.rounds[0].provider_output.payload += " "; },
  (s: any) => { s.rounds[0].output_hash = "a".repeat(64); },
  (s: any) => { s.rounds[0].token_usage.total++; },
  (s: any) => { s.round_call_refs[0].call_id = ""; },
  (s: any) => { s.expected_pending.wire_digest = "f".repeat(64); },
  (s: any) => { s.expected_pending.input_bytes++; },
  (s: any) => { s.expected_pending.target = { role: "planner", provider: "qwen", model: "fixture", endpoint: "https://example.invalid/v1", digest: "a".repeat(64) }; },
]) {
  const seed = structuredClone(continuationSeed); tamper(seed);
  const failure = await exerciseContinuation(seed, forwardOnce);
  assert.ok(failure.error); assert.equal(failure.sends, 0); assert.equal(failure.hostDispatches, 0);
}
const audioContinuationRoot = structuredClone(productionRoot); audioContinuationRoot.context.audio_library = {};
const audioContinuationSeed = { ...continuationSeed, root_input_digest: creationDigest(audioContinuationRoot) };
const unsupportedAudio = await exerciseContinuation(audioContinuationSeed, forwardOnce, { root: audioContinuationRoot });
assert.ok(unsupportedAudio.error); assert.equal(unsupportedAudio.sends, 0);
const duplicatedSeed = { ...continuationSeed, rounds: structuredClone(good.result!.audit.planning!.rounds.slice(0, 2)), round_call_refs: [{ run_id: "old-run", call_id: "same" }, { run_id: "another-run", call_id: "same" }], expected_pending: structuredClone(good.result!.audit.planning!.rounds[2]!.transport) };
const duplicateReference = await exerciseContinuation(duplicatedSeed, forwardOnce); assert.ok(duplicateReference.error); assert.equal(duplicateReference.sends, 0);
const forged = await exerciseContinuation(continuationSeed, async () => new Response("{}"));
assert.ok(forged.error); assert.equal(forged.sends, 0);
const substitutedResponse = await exerciseContinuation(continuationSeed, async (_transport: any, send: () => Promise<Response>) => { await send(); return new Response("{}"); });
assert.ok(substitutedResponse.error); assert.equal(substitutedResponse.sends, 1);
const skippedByHost = await exerciseContinuation(continuationSeed, forwardOnce, { host: "skip" });
assert.ok(skippedByHost.error); assert.equal(skippedByHost.sends, 0); assert.equal(skippedByHost.authorityCalls, 0);
const doubledByHost = await exerciseContinuation(continuationSeed, forwardOnce, { host: "duplicate" });
assert.ok(doubledByHost.error); assert.equal(doubledByHost.sends, 1); assert.equal(doubledByHost.authorityCalls, 1);
const replacedByHost = await exerciseContinuation(continuationSeed, forwardOnce, { host: "replace" });
assert.ok(replacedByHost.error); assert.equal(replacedByHost.sends, 1); assert.equal(replacedByHost.authorityCalls, 1);
const thrownByHost = await exerciseContinuation(continuationSeed, forwardOnce, { host: "throw-after" });
assert.ok(thrownByHost.error); assert.equal(thrownByHost.sends, 1); assert.equal(thrownByHost.authorityCalls, 1);
const duplicateDispatch = await exerciseContinuation(continuationSeed, async (_transport: any, send: () => Promise<Response>) => { const response = await send(); try { await send(); } catch {} return response; });
assert.ok(duplicateDispatch.error); assert.equal(duplicateDispatch.sends, 1, "authority cannot trigger a second send");

// Exercise the actual split planner -> gateway -> guard capability against a
// temporary ledger and in-memory transport. No request leaves this process.
const guardFixtureRoot = mkdtempSync(join(tmpdir(), "ave-p5-gateway-continuation-"));
try {
  const evidence = Buffer.from("fixture price evidence"), plannerModel = "qwen3.7-max-2026-05-20", endpoint = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const guardedPolicy = { priceEvidenceHash: createHash("sha256").update(evidence).digest("hex"), imageHashes: [], assetHashes: [span.asset_id.slice("asset:sha256:".length)], models: {
    [plannerModel]: { maxTokens: 8192, enableThinking: false, inputMicroCnyPerMillion: 12000000, outputMicroCnyPerMillion: 36000000, imageTokenUpper: 0, frameTokenUpper: 8192, outputTokenMargin: 256, maxInputTokens: 524288, maxImages: 0, maxTextBytes: 500000 },
  } };
  initializeLedger(join(guardFixtureRoot, "ledger"), policyDigest(guardedPolicy));
  const ledger = openLedger(join(guardFixtureRoot, "ledger"), policyDigest(guardedPolicy));
  try {
    let physicalSends = 0;
    const guard: any = createGuard({ ledger, policy: guardedPolicy, priceEvidence: evidence, assertContinuationAuthority: () => true, fetchImpl: async (_url: any, init: any) => {
      physicalSends++;
      const input = JSON.parse(JSON.parse(init.body).messages[0].content), first = input.planning_exchange.round === 1;
      const reply = first ? { ...query("ignored", 120), query_id: input.planning_exchange.assigned_query_id } : { ...final, measured_query_id: input.planning_exchange.feasible_receipts[0].query_id, measurement_receipt_digest: input.planning_exchange.feasible_receipts[0].measurement_receipt_digest };
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 } }));
    } });
    const common = { base_url: endpoint, api_key: "fixture", provider: "qwen", enable_thinking: false, max_tokens: 8192, fetch_impl: guard };
    const split = createSplitModelProvider({ vision: { ...common, model: "qwen3-vl-plus" }, planner: { ...common, model: plannerModel }, transcription: { provider: "local-whisper", model: "fixture-whisper", base_url: "http://127.0.0.1:18080/v1" }, sound: { provider: "local-yamnet", model: "fixture-yamnet", base_url: "http://127.0.0.1:18081/v1" } });
    let dispatches = 0;
    const initialRequest = { request_id: "old-run", project_id: "project", provider: "ave-split", model: "creation-v1", prompt_version: "stage3-creation-v1", privacy_class: "sensitive" as const, input: productionRoot, structured_output: true, on_call_audit: async () => {}, output_validator: () => {},
      dispatch: async (send: any) => { dispatches++; if (dispatches === 2) throw new Error("fixture second-round pre-send failure"); return send().response; } };
    let failed: any;
    try { await runModel(initialRequest, createCreationPlanningProvider(split, async () => {}), Date.now(), { policy: { allowed_sensitive_providers: ["ave-split"], retry: { max_attempts: 1 } } }); }
    catch (error) { failed = error; }
    assert.ok(failed); assert.equal(physicalSends, 1); assert.equal(ledger.snapshot().reservations, 1);
    const diagnostic = failed.planning_diagnostic;
    const seed = { root_input_digest: diagnostic.root_input_digest, rounds: diagnostic.rounds, round_call_refs: [{ run_id: "old-run", call_id: "old-call" }], expected_pending: diagnostic.pending.transport, continuation_id: "guarded-continuation" };
    const nextRequest = { ...initialRequest, request_id: "new-run", dispatch: async (send: any) => send().response };
    const provider = createCreationPlanningProvider(split, async () => {}, undefined, seed, guard.resumeDispatch);
    const result = await runModel(nextRequest, provider, Date.now(), { policy: { allowed_sensitive_providers: ["ave-split"], retry: { max_attempts: 1 } } });
    assert.equal(physicalSends, 2); assert.equal(ledger.snapshot().reservations, 2);
    assert.deepEqual(result.audit.planning!.continuation?.prior_round_call_refs, seed.round_call_refs);
    await assert.rejects(runModel(nextRequest, provider, Date.now(), { policy: { allowed_sensitive_providers: ["ave-split"], retry: { max_attempts: 1 } } }), /no blind replay/);
    assert.equal(physicalSends, 2, "reserved continuation wire is never sent twice");
  } finally { ledger.close(); }
} finally { rmSync(guardFixtureRoot, { recursive: true, force: true }); }
console.log("Planning proof, continuation, guarded dispatch and failure boundaries passed");
