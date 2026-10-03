import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const Ajv2020 = createRequire(import.meta.url)("ajv/dist/2020.js").default;
import { CREATION_PLANNING_PROTOCOL, retainedAudioSpan, creationPlanningMeasurementReceipt, buildCreationSourceChoiceCatalog, resolveCreationPlanningFinal, resolveRejectedCreationPlanningFinal, creationDecisionSchema, creationDigest, deriveCreationPlanningInput, measureCreationSelection, validateCreationPlanningProof } from "../../packages/platform/contract-runtime/src/public.js";
import { createQwenProvider, runModel } from "../../packages/platform/model-gateway/src/public.js";
import { createCreationPlanningProvider } from "../../packages/platform/model-gateway/src/creation-planning.js";

const creativeFields = (decision: any) => { const {decision_version:_version,target_duration_ticks:_target,shots,...fields}=decision; return {...fields,shots:shots.map(({source_window:_window,source_choice:_choice,timing:_timing,...shot}:any)=>shot)}; };
const time = (value: number, timescale = 30) => ({ schema_version: 1 as const, value, timescale });
const decision = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-decision.v1.json", "utf8"));
const span = { span_id: decision.shots[0].source_window.span_id, asset_id: decision.shots[0].source_window.asset_id, editable_start: time(0), editable_end: time(180), observations: [{ description: "real fixture description", uncertain: false, kind: "visual", evidence_id: "visual-1", sample_at: time(0) }] };
const root: any = { context: { creative_brief: "Create a supported draft", planning: CREATION_PLANNING_PROTOCOL, planning_projection_version: "phase-specific-v1", output_schema: creationDecisionSchema, source_spans: [span], timeline: { sequence: { timebase: { value: "1", timescale: "30" } } }, duration_budget: { minimum_total_ticks: "90", maximum_total_ticks: "90" } }, media: [] as [] };
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
const good = await exercise([query(), query("query-2", 120), final]);
assert.ok(good.result); assert.equal(good.sends, 3); assert.equal(good.audits.length, 3); assert.ok(good.freshness >= 7);
const ticket = { run_id: "run", input_digest: creationDigest(productionRoot), revision: 1, profile: null };
const state = { model_calls: good.audits.map(({ audit, transport }: any, index: number) => ({ run_id: "run", revision: 1, input_digest: ticket.input_digest, profile: null, attempt: index + 1, ...transport, settlement: { status: "response", output_digest: audit.output_hash, usage: { ...audit.token_usage, total: 30 } } })) };
validateCreationPlanningProof(state, ticket, productionRoot, decision, good.result!.audit);
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

console.log("Planning v3 exact arithmetic, measured receipt, strict decoration coverage, ledger proof, cancellation and phase projection passed");

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
