import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCreativeSkillCatalog, routeCreativeSkillCandidates } from "../../packages/core/editorial-core/src/public.js";
import { creativeSkillCatalog, creativeSkillCatalogRules, catalogSource, catalogSourceDigest } from "../../packages/platform/project-host/src/creative-skill-catalog.js";
import { creationDigest, creationDecisionSchema, CREATION_PLANNING_PROTOCOL, deriveCreationPlanningInput, measureCreationSelection, resolveCreationPlanningFinal, compileCreationDecisionV1, assertCreationPlanningRoundIdentity } from "../../packages/platform/contract-runtime/src/public.js";
import { validateSkillEvaluations, assertCreativeSkillEffects, projectCreativeSkills } from "../../packages/platform/contract-runtime/src/creative-skill-runtime.mjs";
import { fixtureSkillEvaluations, fixtureSkillEffects } from "../fixtures/stage3/skill-planning.js";
import { compileCreationPlan, type CreationCompileContext } from "../../packages/core/edit-ir/src/public.js";
import { simulateCommands, type Timeline } from "../../packages/core/timeline-core/src/public.js";
import { createQwenProvider, runModel } from "../../packages/platform/model-gateway/src/public.js";
import { createCreationPlanningProvider } from "../../packages/platform/model-gateway/src/creation-planning.js";
import { createHash } from "node:crypto";

assert.equal(creativeSkillCatalog.length, 64);
assert.equal(new Set(creativeSkillCatalog.map(item => `${item.skill_id}@${item.skill_version}`)).size, 64);
assert.equal(createHash("sha256").update(catalogSource).digest("hex"), catalogSourceDigest);
const catalogData = JSON.parse(readFileSync("packages/core/editorial-core/src/knowledge/skill/catalog.v1.json", "utf8"));
assert.deepEqual(parseCreativeSkillCatalog(catalogSource, catalogData), creativeSkillCatalog);
assert.throws(() => parseCreativeSkillCatalog(catalogSource.replace("S02｜", "S01｜"), catalogData), /CATALOG_INVALID/);
assert.ok(Object.isFrozen(creativeSkillCatalog[0]!.catalog_content));
for (const item of creativeSkillCatalog) assert.ok(catalogSource.includes(item.catalog_content!.body), "every complete body is verbatim source text");

const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
const source = (index: number) => ({ asset_id: `asset:sha256:${String(index + 1).repeat(64)}`, span_id: `span-${index}`, start: time(0), end: time(90) });
const spans = [0, 1].map(index => ({ span_id: source(index).span_id, asset_id: source(index).asset_id, editable_start: time(0), editable_end: time(90), observations: [{ kind: "visual", evidence_id: `visual-${index}`, sample_at: time(0), description: index ? "朋友的真实反应" : "旅行到达、观察环境", uncertain: false }, { kind: "audio", evidence_id: `audio-${index}`, description: "可听见原声与环境声", uncertain: false }] }));
(spans[0]!.observations as any[]).push({ kind: "transcript", evidence_id: "transcript-0", text: "口播主题", description: "口播主题", start: time(0), end: time(15), uncertain: false });
const caps = ["source-selection", "source-order", "weighted-pacing", "audio-source-selection", "audio-gain", "embedded-gain", "editorial-captions", "verbatim-captions"];
const rootFor = (request: string, platform = false): any => {
  const schema: any = structuredClone(creationDecisionSchema); schema.required.push("skill_effects");
  const context: any = { creative_brief: "用素材支持当前意图", planning: CREATION_PLANNING_PROTOCOL, planning_projection_version: "phase-specific-v1", planning_query_identity: "host-root-round-v1", output_schema: schema,
    request: { current_revision: { revision: 1, raw_text: request, preserve_refs: [] }, protected_refs: [], hard_requirements: ["不虚构事实"] }, profile: { principles: [{ principle_id: "approved-observational", instruction: "日常作品偏好留白；本次明确请求优先", evidence: "approved fixture" }] }, timeline: { version: 0, sequence: { timebase: { value: "1", timescale: "30" } } }, source_spans: spans,
    creative_skills: { protocol: "skill-demand-v1", definitions: creativeSkillCatalog, rules: creativeSkillCatalogRules, candidate_ids: routeCreativeSkillCandidates(creativeSkillCatalog, { task: request.includes("第二段") ? "local" : "create", focus: [ ...(request.includes("旅行") ? ["travel","friends"] : []), ...(request.includes("口播") ? ["speech"] : []), ...(request.includes("观察") ? ["observation"] : []), ...(request.includes("朋友") ? ["friends"] : []), ...(request.includes("不要音乐") ? ["music","reaction","rhythm"] : []) ], platform: platform ? "youtube" : null, commercial: false, knowledge: false, observation_kinds: ["visual","audio","transcript"], executable_capabilities: caps, profile_dimensions: ["observation"], protected_requirements: ["真实"] }), executable_capabilities: caps } };
  return { context, media: [] };
};
const buildCatalog = async (root: any) => { const { buildCreationSourceChoiceCatalog } = await import("../../packages/platform/contract-runtime/src/public.js"); root.context.source_choice_catalog = buildCreationSourceChoiceCatalog(root.context); return root; };
const template = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-decision.v1.json", "utf8"));
const modelDecision = (request: string, ids: string[], details: any): any => {
  assert.ok(ids.every(id => details.candidates.some((item: any) => item.skill_id === id)));
  for (const detail of details.candidates) assert.equal(detail.body, creativeSkillCatalog.find(item => item.skill_id === detail.skill_id)!.catalog_content!.body);
  const light = request.includes("轻快"), speech = request.includes("口播");
  const order = light ? [1, 0] : [0, 1];
  return { ...template, target_duration_ticks: 90, thesis: request, applied_principle_ids: [],
    shots: order.map((index, position) => ({ ...template.shots[0], shot_id: `shot-${index}`, source_window: source(index), timing: { kind: "weighted", weight: light ? position ? 1 : 2 : position ? 2 : 1 }, embedded_gain_db: speech ? 0 : light ? -6 : -3 })),
    captions: speech ? [{ caption_id: "label", shot_id: "shot-0", offset: time(0), duration: time(15), kind: "verbatim", text: "口播主题", evidence_ids: ["transcript-0"], audio_anchor: { kind: "embedded", id: "shot-0" } }] : [], audio: [], preserve_refs: [], feedback_interpretation: request, change_summary: "Fixture response verifies rule transport and compiled fields; it does not prove real-model causality." };
};
const base: Timeline = { version: 0, tracks: [], sequence: { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] } };
const compiledContext: CreationCompileContext = { request_id: "request", revision: 1, input_digest: "a".repeat(64), authorized_asset_ids: spans.map(span => span.asset_id as any), protected_refs: [], principle_ids: [], spans: spans.map(span => ({ span_id: span.span_id, asset_id: span.asset_id as any, start_pts: 0n, end_pts: 90n, timescale: 30n, has_video: true, has_audio: true, observations: [{ evidence_id: span.observations[0]!.evidence_id, kind: "visual", start_pts: 0n, end_pts: 90n, timescale: 30n, text: span.observations[0]!.description, uncertain: false }, { evidence_id: span.observations[1]!.evidence_id, kind: "audio", start_pts: 0n, end_pts: 90n, timescale: 30n, text: "Original sound", uncertain: false }] })) };

(compiledContext.spans[0]!.observations as any[]).push({ evidence_id: "transcript-0", kind: "transcript", start_pts: 0n, end_pts: 15n, timescale: 30n, text: "口播主题", uncertain: false });

async function exercise(request: string, ids: string[], platform = false) {
  const root = await buildCatalog(rootFor(request, platform)), exchanges: any[] = [];
  const first = deriveCreationPlanningInput(root, []); const detail=first.context.creative_skills as any;
  assert.equal(detail.stage,"plan"); assert.ok(detail.candidates.length>=6&&detail.candidates.length<=12);
  assert.equal(JSON.stringify(first).includes('"definitions"'),false); assert.ok(detail.candidates.every((d:any)=>catalogSource.includes(d.body)));
  assert.equal(detail.candidates.some((item:any)=>item.skill_id==="P01"),platform);
  const decision = modelDecision(request, ids, detail);
  const proposed = fixtureSkillEvaluations(root.context, ids).map(item=>({...item,required_capabilities:item.skill_id.startsWith("A")?["embedded-gain"]:item.skill_id.startsWith("V")?["verbatim-captions"]:["source-selection"]}));
  const q1:any = {exchange_version:3,kind:"measure_selection",query_id:(first.context.planning_exchange as any).assigned_query_id,target_duration_ticks:decision.target_duration_ticks,selection:decision.shots.map((shot:any)=>({selection_id:shot.shot_id,source_choice:{kind:"custom_window",source_window:shot.source_window},timing:shot.timing})),skill_evaluations:proposed};
  exchanges.push({exchange:q1,measurement:measureCreationSelection(q1,root.context)});
  const second=deriveCreationPlanningInput(root,exchanges), third=second, q2=q1;
  assert.equal((second.context.planning_exchange as any).phase,"final-only");
  assert.equal(JSON.stringify(second.context.creative_skills).includes('"body"'),false);
  const receipt=(second.context.planning_exchange as any).feasible_receipts[0];
  const paths=Object.fromEntries(ids.map(id=>[id,id.startsWith("A")?"/shots/0/embedded_gain_db":id.startsWith("V")?"/captions":"/shots"]));
  decision.skill_effects=fixtureSkillEffects(second.context,decision,paths);
  const { decision_version, target_duration_ticks, shots, ...creative } = decision;
  const final: any = { exchange_version: 3, kind: "final", measured_query_id: receipt.query_id, measurement_receipt_digest: receipt.measurement_receipt_digest, creative: { ...creative, shots: shots.map(({ source_window, timing, ...shot }: any) => shot) } };
  assertCreationPlanningRoundIdentity(third, final);
  const output = resolveCreationPlanningFinal(final, root, exchanges);
  const plan = compileCreationDecisionV1(output, { plan_id: "plan", request_id: "request", revision: 1, base_timeline_version: 0, input_digest: "a".repeat(64) }, base.sequence!.timebase!, null);
  const timeline = simulateCommands(base, compileCreationPlan(plan, base, compiledContext));
  assert.equal(timeline.tracks[0]!.clips.reduce((sum, clip) => sum + clip.timeline_duration, 0n), 90n);
  assert.equal(plan.skill_effects!.length, ids.length);
  const bad = structuredClone(final); bad.creative.skill_effects[0].value_digest = "f".repeat(64);
  assert.throws(() => resolveCreationPlanningFinal(bad, root, exchanges), (error: any) => error.code === "CREATIVE_SKILL_FAILURE");
  const namesOnly = structuredClone(final); namesOnly.creative.skill_effects = [];
  assert.throws(() => resolveCreationPlanningFinal(namesOnly, root, exchanges), (error: any) => error.code === "CREATIVE_SKILL_FAILURE");
  return { root, first, second, third, q1, q2, final, output, plan, timeline };
}
const A = await exercise("朋友出游、旅行、轻快", ["W01", "S01", "S03", "E04", "S09", "A01", "A03"]);
// New roots may revise one infeasible measured selection with full rules.
const reviseRoot = structuredClone(A.root);
reviseRoot.context.creative_skills.projection_version = "effect-bindings-v3";
const reviseFirst = deriveCreationPlanningInput(reviseRoot, []);
assert.equal(creationDigest(reviseFirst),"aebbfcfbe7d334bf5d5d79b084a3998a2e8774000753f75f01389c9b5a2ab03c","stored v3 root retains its fixed historical projection");
// The versioned wire projection constrains Skill citations to exact observation
// IDs, without changing old persisted projections or repairing a bad response.
const exactRoot=structuredClone(reviseRoot);
exactRoot.context.skill_evidence_projection="observation-ids-v1";
exactRoot.context.source_spans[0].observations[0].evidence_id="observation:run:0";
exactRoot.context.source_spans[0].observations[1].evidence_id="observation:run:1";
await buildCatalog(exactRoot);
const exactInput=deriveCreationPlanningInput(exactRoot,[]);
const exactSchema=(exactInput.context.planning_exchange as any).response_schema.properties.skill_evaluations.items.properties.evidence_ids;
assert.deepEqual(exactSchema.items.enum,exactRoot.context.source_spans.flatMap((span:any)=>span.observations.map((item:any)=>item.evidence_id)));
assert.match((exactInput.context as any).task,/complete.*observation.*evidence_id/i);
const oldSchema=(reviseFirst.context.planning_exchange as any).response_schema.properties.skill_evaluations.items.properties.evidence_ids;
assert.equal(oldSchema.items.enum,undefined);
assert.deepEqual(deriveCreationPlanningInput(reviseRoot,[]),reviseFirst,"historical root reconstructs identically");
const prefixQuery=structuredClone(A.q1);prefixQuery.skill_evaluations[0].evidence_ids=["observation:run"];
prefixQuery.skill_evaluations.slice(1).forEach((item:any)=>{item.evidence_ids=item.evidence_ids.map((id:string)=>id==="visual-0"?"observation:run:0":id==="audio-0"?"observation:run:1":id);});
assert.throws(()=>measureCreationSelection(prefixQuery,exactRoot.context),(error:any)=>error.code==="CREATIVE_SKILL_FAILURE");
prefixQuery.skill_evaluations[0].evidence_ids=["observation:run:0"];
assert.doesNotThrow(()=>measureCreationSelection(prefixQuery,exactRoot.context));
const emptyEvidenceRoot=structuredClone(exactRoot);emptyEvidenceRoot.context.source_spans.forEach((span:any)=>span.observations=[]);
await buildCatalog(emptyEvidenceRoot);
const emptyInput=deriveCreationPlanningInput(emptyEvidenceRoot,[]);
assert.equal((emptyInput.context.planning_exchange as any).response_schema.properties.skill_evaluations.items.properties.evidence_ids.maxItems,0);
const emptyQuery=structuredClone(A.q1);emptyQuery.skill_evaluations=emptyQuery.skill_evaluations.map((item:any)=>({...item,disposition:"decision_only",evidence_ids:[],required_capabilities:[]}));
assert.doesNotThrow(()=>measureCreationSelection(emptyQuery,emptyEvidenceRoot.context));
const unsupportedCitation=structuredClone(emptyQuery);unsupportedCitation.skill_evaluations[0].evidence_ids=["observation:run:0"];
assert.throws(()=>measureCreationSelection(unsupportedCitation,emptyEvidenceRoot.context),(error:any)=>error.code==="CREATIVE_SKILL_FAILURE");
const ungroundedEdit=structuredClone(emptyQuery);ungroundedEdit.skill_evaluations[0].disposition="edit_proposed";
assert.throws(()=>measureCreationSelection(ungroundedEdit,emptyEvidenceRoot.context),(error:any)=>error.code==="CREATIVE_SKILL_INSUFFICIENT_EVIDENCE");
const shortQuery = structuredClone(A.q1);
shortQuery.query_id = (reviseFirst.context.planning_exchange as any).assigned_query_id;
shortQuery.selection.forEach((item: any) => { item.source_choice.source_window.end = time(15); });
const shortMeasurement = measureCreationSelection(shortQuery, reviseRoot.context);
assert.equal(shortMeasurement.capacity_feasible, false);
const shortExchanges = [{ exchange: shortQuery, measurement: shortMeasurement }];
const invalidShort = structuredClone(shortExchanges); invalidShort[0].exchange.skill_evaluations[0].evidence_ids = ["invented-evidence"];
assert.throws(() => deriveCreationPlanningInput(reviseRoot, invalidShort), (error: any) => error.code === "CREATIVE_SKILL_FAILURE");
const reviseSecond = deriveCreationPlanningInput(reviseRoot, shortExchanges);
assert.equal((reviseSecond.context.planning_exchange as any).phase, "measure-only");
assert.equal((reviseSecond.context.creative_skills as any).stage, "plan");
assert.ok((reviseSecond.context.creative_skills as any).candidates.every((item: any) => catalogSource.includes(item.body)));
assert.equal((reviseSecond.context.planning_feasibility as any).previous_measurement.deficit_ticks, shortMeasurement.deficit_ticks);
const revisedQuery = structuredClone(A.q1);
revisedQuery.query_id = (reviseSecond.context.planning_exchange as any).assigned_query_id;
revisedQuery.skill_evaluations = revisedQuery.skill_evaluations.map((item: any) => ({ ...item, disposition: "decision_only", evidence_ids: [], required_capabilities: [] }));
assertCreationPlanningRoundIdentity(reviseSecond, revisedQuery);
const missingEvaluations = structuredClone(revisedQuery); delete missingEvaluations.skill_evaluations;
assert.throws(() => assertCreationPlanningRoundIdentity(reviseSecond, missingEvaluations), (error: any) => error.code === "CREATIVE_SKILL_FAILURE");
const revisedMeasurement = measureCreationSelection(revisedQuery, reviseRoot.context);
assert.equal(revisedMeasurement.capacity_feasible, true);
const revisedExchanges = [...shortExchanges, { exchange: revisedQuery, measurement: revisedMeasurement }];
const reviseFinalInput = deriveCreationPlanningInput(reviseRoot, revisedExchanges);
assert.equal((reviseFinalInput.context.planning_exchange as any).phase, "final-only");
assert.deepEqual((reviseFinalInput.context.creative_skills as any).allowed_effect_bindings, []);
const revisedReceipt = (reviseFinalInput.context.planning_exchange as any).feasible_receipts[0];
const revisedFinal = structuredClone(A.final);
Object.assign(revisedFinal, { measured_query_id: revisedReceipt.query_id, measurement_receipt_digest: revisedReceipt.measurement_receipt_digest });
revisedFinal.creative.skill_effects = [];
assert.equal(resolveCreationPlanningFinal(revisedFinal, reviseRoot, revisedExchanges).target_duration_ticks, 90);
const wronglyBound = structuredClone(revisedFinal); wronglyBound.measured_query_id = shortQuery.query_id;
assert.throws(() => resolveCreationPlanningFinal(wronglyBound, reviseRoot, revisedExchanges));
const secondShort = { ...revisedQuery, selection: shortQuery.selection };
assert.throws(() => deriveCreationPlanningInput(reviseRoot, [...shortExchanges, {exchange:secondShort,measurement:measureCreationSelection(secondShort, reviseRoot.context)}]), (error:any) => error.code === "CREATION_PLANNING_BUDGET_EXCEEDED");
let reviseSends = 0; const revisePhysical:any[] = [];
const reviseProvider = createQwenProvider({ api_key: "fixture-only", models: [{ model:"fixture", media_types:[] }], fetch_impl: async (_url, init) => {
  revisePhysical.push(JSON.parse(JSON.parse(init!.body as string).messages[0].content));
  const reply = [shortQuery,revisedQuery,revisedFinal][reviseSends++];
  return new Response(JSON.stringify({ choices:[{message:{content:JSON.stringify(reply)},finish_reason:"stop"}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20} }));
} });
const reviseResult = await runModel({ request_id:"revise-fixture",project_id:"fixture",prompt_version:"skill-v3-fixture",privacy_class:"sensitive",provider:"qwen",model:"fixture",input:reviseRoot,structured_output:true,on_call_audit:()=>{},dispatch:(send:any)=>send().response } as any,createCreationPlanningProvider(reviseProvider,async()=>{}),Date.now(),{policy:{allowed_sensitive_providers:["qwen"],retry:{max_attempts:1}}});
assert.equal(reviseSends,3);
assert.equal(revisePhysical[1].creative_skills.stage,"plan");
assert.ok(revisePhysical[1].creative_skills.candidates.every((item:any)=>catalogSource.includes(item.body)));
assert.equal(revisePhysical[2].creative_skills.stage,"confirm");
assert.deepEqual(reviseResult.output,resolveCreationPlanningFinal(revisedFinal,reviseRoot,revisedExchanges));
const B = await exercise("口播，保留原话，字幕清楚", ["W03", "E05", "E02", "V04", "A03"]);
assert.equal(B.timeline.tracks.flatMap(track => track.captions ?? []).length, 1);
const C = await exercise("保留最后反应，第二段短一点，这里不要音乐。", ["Q03", "S09", "E04", "A02"]);
assert.equal(C.plan.audio.length, 0);
// Three real command objects: shorten only the second segment and preserve the final reaction.
const localBaseline: any = structuredClone(C.plan);
localBaseline.shots = [0, 1, 2].map(position => ({ ...localBaseline.shots[position ? 1 : 0], shot_id: ["opening", "second-segment", "last-reaction"][position], source: { ...source(position ? 1 : 0), start: time(position === 2 ? 30 : 0), end: time(position === 2 ? 60 : 30) } }));
localBaseline.audio = [{ audio_id: "music", source: { ...source(0), end: time(15) }, shot_id: "opening", offset: time(0), role: "music", gain_db: -12, fade_in: time(0), fade_out: time(0), purpose: "Controlled fixture music" }];
const localBase: Timeline = { ...simulateCommands(base, compileCreationPlan(localBaseline, base, compiledContext)), version: 1 };
const revised: any = structuredClone(localBaseline); revised.base_timeline_version = 1; revised.audio = []; revised.preserve_refs = ["last-reaction"]; revised.shots[1].source.end = time(15);
const localAfter = simulateCommands(localBase, compileCreationPlan(revised, localBase, { ...compiledContext, protected_refs: ["last-reaction"] }));
assert.deepEqual(localAfter.tracks[0]!.clips.map(clip => clip.timeline_duration), [30n, 15n, 30n]);
assert.deepEqual(localAfter.tracks[0]!.clips[2]!.source, localBase.tracks[0]!.clips[2]!.source);
assert.equal(localAfter.tracks.filter(track => track.kind === "audio").flatMap(track => track.clips).length, 0);
const D = await exercise("日常观察、留白", ["W02", "S01", "S09", "A01"]);
assert.notDeepEqual(A.plan.shots.map(shot => shot.source.asset_id), D.plan.shots.map(shot => shot.source.asset_id));
assert.notDeepEqual(A.timeline.tracks[0]!.clips.map(clip => clip.timeline_duration), D.timeline.tracks[0]!.clips.map(clip => clip.timeline_duration));
assert.notEqual(A.plan.shots[0]!.embedded_gain_db, D.plan.shots[0]!.embedded_gain_db);
const E = await exercise("YouTube，日常观察、留白，不要强行制造冲突", ["P01", "S01", "S09"] , true);
assert.deepEqual(E.root.context.profile, D.root.context.profile); assert.deepEqual(E.root.context.source_spans, D.root.context.source_spans);
assert.ok((E.first.context.creative_skills as any).precedence.includes("当前用户请求"));

const evaluation = fixtureSkillEvaluations(A.root.context)[0]!;
const canonical = validateSkillEvaluations(A.root.context, [evaluation])[0]!;
assert.equal(canonical.schema_version, 2); assert.equal(canonical.context_kind, "creation-planning");
assert.equal(canonical.input_fingerprint, creationDigest(A.root.context));
const changedRequest = structuredClone(A.root.context); changedRequest.request.current_revision.raw_text = "Changed intent";
assert.notEqual(validateSkillEvaluations(changedRequest, [evaluation])[0]!.context_binding.request, canonical.context_binding.request);
// Collection annotations cannot turn empty output or another source into success.
const effectCase = (path: string, decision: any, evidence = ["visual-0"]) => ({ ...decision, skill_effects: [{ definition_ref: { object_id: evaluation.skill_id, object_version: 1, digest: evaluation.definition_digest }, decision_path: path, evidence_ids: evidence, reason: "Grounded executable effect" }] });
const effectExchange: any = [{ exchange: { skill_evaluations: [evaluation] } }];
assert.throws(() => assertCreativeSkillEffects(A.root.context, effectExchange, effectCase("/audio", { audio: [] })), (error: any) => error.code === "CREATIVE_SKILL_FAILURE");
assert.throws(() => assertCreativeSkillEffects(A.root.context, effectExchange, effectCase("/shots", { shots: [{ source_window: source(1) }] })), (error: any) => error.code === "CREATIVE_SKILL_FAILURE");
assert.throws(() => assertCreativeSkillEffects(A.root.context, effectExchange, effectCase("/captions", { captions: [{ evidence_ids: ["visual-1"] }] })), (error: any) => error.code === "CREATIVE_SKILL_FAILURE");
const removalContext = structuredClone(A.root.context); removalContext.timeline.tracks = [{ kind: "audio", clips: [{ source: { asset_id: source(0).asset_id, start_pts: "0", end_pts: "90", timescale: "30" }, semantic_sidecar: { evidence_refs: ["span-0"] } }] }];
assertCreativeSkillEffects(removalContext, [{ exchange: { skill_evaluations: [{ ...evaluation, required_capabilities: ["audio-source-selection"] }] } }], effectCase("/audio", { audio: [] }));
const removalExchange = [{ exchange: { skill_evaluations: [{ ...evaluation, required_capabilities: ["audio-source-selection"] }] } }];
for (const semantic_sidecar of [undefined, { evidence_refs: ["retired-analysis"] }]) {
  const current = structuredClone(removalContext); current.timeline.tracks[0].clips[0].semantic_sidecar = semantic_sidecar;
  assertCreativeSkillEffects(current, removalExchange, effectCase("/audio", { audio: [] }));
  for (const patch of [{ asset_id: source(1).asset_id }, { end_pts: "91" }, { start_pts: "-1" }]) {
    const invalid = structuredClone(current); Object.assign(invalid.timeline.tracks[0].clips[0].source, patch);
    assert.throws(() => assertCreativeSkillEffects(invalid, removalExchange, effectCase("/audio", { audio: [] })), (error: any) => error.code === "CREATIVE_SKILL_FAILURE");
  }
}
for (const patch of [{ result: "unsupported_capability", required_capabilities: ["source-selection"] }, { result: "applicable", evidence_ids: ["visual-0"] }, { result: "applicable", required_capabilities: ["audio-gain"] }]) {
  const changed: any = { ...A.q2, skill_evaluations: [{ ...A.q1.skill_evaluations![0], ...patch }] };
  assert.throws(() => assertCreationPlanningRoundIdentity(A.second as any, changed), (error: any) => error.code === "CREATIVE_SKILL_FAILURE");
}
for (const result of ["not_applicable", "insufficient_evidence"]) assert.equal(validateSkillEvaluations(A.root.context, [{ ...evaluation, result, disposition: "none", evidence_ids: [], reason: result }])[0].result, result);
assert.equal(validateSkillEvaluations(A.root.context, [{ ...evaluation, result: "unsupported_capability", disposition: "none", required_capabilities: ["dynamic-subject-tracking"] }])[0].result, "unsupported_capability");
for (const [patch, code] of [[{ result: "failure" }, "CREATIVE_SKILL_FAILURE"], [{ skill_id: "unknown" }, "CREATIVE_SKILL_FAILURE"], [{ evidence_ids: [] }, "CREATIVE_SKILL_INSUFFICIENT_EVIDENCE"], [{ required_capabilities: ["dynamic-subject-tracking"] }, "CREATIVE_SKILL_UNSUPPORTED_CAPABILITY"], [{ evidence_ids: ["invented"] }, "CREATIVE_SKILL_FAILURE"]] as const) assert.throws(() => validateSkillEvaluations(A.root.context, [{ ...evaluation, ...patch }]), (error: any) => error.code === code);

// Actual Gateway transport receives three projections, never the local full catalogue.
let sends = 0; const physical: any[] = [];
const provider = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture", media_types: [] }], fetch_impl: async (_url, init) => {
  const input = JSON.parse(JSON.parse(init!.body as string).messages[0].content); physical.push(input); sends++;
  const exchange = sends === 1 ? A.q1 : A.final;
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(exchange) }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }));
} });
const gateway = await runModel({ request_id: "fixture", project_id: "fixture", prompt_version: "skill-fixture-v1", privacy_class: "sensitive", provider: "qwen", model: "fixture", input: A.root, structured_output: true, on_call_audit: () => {}, dispatch: (send: any) => send().response } as any, createCreationPlanningProvider(provider, async () => {}), Date.now(), { policy: { allowed_sensitive_providers: ["qwen"], retry: { max_attempts: 1 } } });
assert.equal(sends, 2); assert.deepEqual(gateway.output, A.output);
assert.equal(physical[0].creative_skills.candidates.length, 12); assert.equal(physical[1].creative_skills.evaluations.length, 7);
assert.ok(physical.every(input => !JSON.stringify(input).includes('"definitions"')));
const wireRoot=structuredClone(A.root);wireRoot.context.skill_evidence_projection="observation-ids-v1";
let invalidWireCalls=0;const invalidWireAudits:any[]=[];
const invalidWireProvider=createQwenProvider({api_key:"fixture-only",models:[{model:"fixture",media_types:[]}],fetch_impl:async(_url,init)=>{
  invalidWireCalls++;
  const input=JSON.parse(JSON.parse(init!.body as string).messages[0].content);
  assert.deepEqual(input.planning_exchange.response_schema.properties.skill_evaluations.items.properties.evidence_ids.items.enum,wireRoot.context.source_spans.flatMap((span:any)=>span.observations.map((item:any)=>item.evidence_id)));
  const invalid=structuredClone(A.q1);invalid.query_id=input.planning_exchange.assigned_query_id;invalid.skill_evaluations[0].evidence_ids=["visual"];
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(invalid)},finish_reason:"stop"}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}}));
}});
await assert.rejects(()=>runModel({request_id:"exact-wire-fixture",project_id:"fixture",prompt_version:"skill-fixture-v1",privacy_class:"sensitive",provider:"qwen",model:"fixture",input:wireRoot,structured_output:true,on_call_audit:(item:any)=>invalidWireAudits.push(item),dispatch:(send:any)=>send().response} as any,createCreationPlanningProvider(invalidWireProvider,async()=>{}),Date.now(),{policy:{allowed_sensitive_providers:["qwen"],retry:{max_attempts:1}}}), (error:any)=>error.code==="MODEL_OUTPUT_INVALID" && /unavailable evidence/.test(error.message));
assert.equal(invalidWireCalls,1,"invalid prefix fails without an automatic paid retry");
assert.ok(invalidWireAudits.length,"failed physical call is audited");
console.log("Skill Catalog 64 lossless pins; A–F two-level Planner/decision/compiler fixtures and physical Gateway projection passed (no real model)");

for(const disposition of ["decision_only","no_change"]){ const proposal={...evaluation,disposition,evidence_ids:[],required_capabilities:[]}; const verified=validateSkillEvaluations(A.root.context,[proposal])[0]; assert.equal(verified.disposition,disposition); const unchanged=structuredClone(A.output);unchanged.skill_effects=[]; const before=creationDigest(unchanged); assertCreativeSkillEffects(A.root.context,[{exchange:{skill_evaluations:[proposal]}}],unchanged);assert.equal(creationDigest(unchanged),before,"non-edit evaluation cannot manufacture a Timeline decision change"); }

// Stored proofs reconstruct the old physical projection exactly; new prompting is opt-in by root version.
assert.equal(createHash("sha256").update((A.first.context.creative_skills as any).instruction).digest("hex"), "50dbaf145bde43a4ff6a8398974e117edaec03531d477d734c73653c632efe7c");
assert.equal(createHash("sha256").update((A.second.context.creative_skills as any).instruction).digest("hex"), "f2841d72ea89d33b9597d696d84a757303a17f4d20e4ff9df7e737887935c682");
assert.deepEqual(Object.keys(A.second.context.creative_skills as any), ["protocol","stage","evaluations","executable_capabilities","instruction"]);
const direct = await buildCatalog(rootFor("仅将主视频改为灰度，保留原有时序"));
direct.context.creative_skills.projection_version = "effect-bindings-v2";
direct.context.creative_skills.candidate_ids = ["Q01"];
direct.context.creative_skills.executable_capabilities = [...caps,"basic-color"];
const q01 = creativeSkillCatalog.find(item => item.skill_id === "Q01")!;
const decisionOnly = {skill_id:"Q01",skill_version:1,definition_digest:q01.definition_digest,result:"applicable",disposition:"decision_only",evidence_ids:[],required_capabilities:[],reason:"Review judgment; grayscale is the direct user request."};
const directFirst = deriveCreationPlanningInput(direct, []);
const directMeasure = {...structuredClone(A.q1),query_id:(directFirst.context.planning_exchange as any).assigned_query_id,skill_evaluations:[decisionOnly]};
const directExchanges = [{exchange:directMeasure,measurement:measureCreationSelection(directMeasure,direct.context)}];
const directSecond = deriveCreationPlanningInput(direct,directExchanges);
const directProjection:any = directSecond.context.creative_skills;
assert.equal(directProjection.projection_version,"effect-bindings-v2");
assert.deepEqual(directProjection.allowed_effect_bindings,[]);
assert.match(directProjection.instruction,/MUST return creative\.skill_effects as \[\]/);
assert.equal((directSecond.context.planning_exchange as any).response_schema.properties.creative.properties.skill_effects.maxItems,0);
const directReceipt = (directSecond.context.planning_exchange as any).feasible_receipts[0];
const directFinal = structuredClone(A.final);
Object.assign(directFinal,{measured_query_id:directReceipt.query_id,measurement_receipt_digest:directReceipt.measurement_receipt_digest});
directFinal.creative.skill_effects=[];
directFinal.creative.shots[0].color={exposure:0,contrast:1,saturation:0};
const directOutput=resolveCreationPlanningFinal(directFinal,direct,directExchanges);
assert.deepEqual(directOutput.shots[0].color,{exposure:0,contrast:1,saturation:0});
const contradictory=structuredClone(directFinal);
contradictory.creative.skill_effects=[{definition_ref:{object_id:"Q01",object_version:1,digest:q01.definition_digest},decision_path:"/shots/0/color",evidence_ids:["visual-0"],reason:"Incorrectly attributes a direct user edit to a decision-only Skill."}];
const contradictionBefore=creationDigest(contradictory);
assert.throws(()=>resolveCreationPlanningFinal(contradictory,direct,directExchanges),(error:any)=>error.code==="CREATIVE_SKILL_FAILURE"&&/decision_only/.test(error.message));
assert.equal(creationDigest(contradictory),contradictionBefore,"reject contradictory output without filtering or repairing it");
const mixedContext=structuredClone(A.root.context);mixedContext.creative_skills.projection_version="effect-bindings-v2";
mixedContext.creative_skills.candidate_ids.push("Q01");
mixedContext.creative_skills.candidate_ids=[...new Set(mixedContext.creative_skills.candidate_ids)].slice(-12);
const mixedProjection=projectCreativeSkills(mixedContext,[{exchange:{skill_evaluations:[evaluation,decisionOnly]}}]);
assert.deepEqual(mixedProjection.allowed_effect_bindings.map((item:any)=>item.definition_ref.object_id),[evaluation.skill_id]);
for(const patch of [{object_id:"unknown"},{object_version:2},{digest:"0".repeat(64)}]){
 const changed=effectCase("/shots",structuredClone(A.output));Object.assign(changed.skill_effects[0].definition_ref,patch);
 assert.throws(()=>assertCreativeSkillEffects(A.root.context,effectExchange,changed),(error:any)=>error.code==="CREATIVE_SKILL_FAILURE");
}
const unknownProjection=structuredClone(direct);unknownProjection.context.creative_skills.projection_version="unknown";
assert.throws(()=>deriveCreationPlanningInput(unknownProjection,[]),(error:any)=>error.code==="CREATIVE_SKILL_FAILURE");
let directSends=0;const directPhysical:any[]=[];
const directProvider=createQwenProvider({api_key:"fixture-only",models:[{model:"fixture",media_types:[]}],fetch_impl:async(_url,init)=>{
 const input=JSON.parse(JSON.parse(init!.body as string).messages[0].content);directPhysical.push(input);
 return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(++directSends===1?directMeasure:directFinal)},finish_reason:"stop"}],usage:{prompt_tokens:10,completion_tokens:10,total_tokens:20}}));
}});
const directGateway=await runModel({request_id:"direct-fixture",project_id:"fixture",prompt_version:"skill-fixture-v2",privacy_class:"sensitive",provider:"qwen",model:"fixture",input:direct,structured_output:true,on_call_audit:()=>{},dispatch:(send:any)=>send().response} as any,createCreationPlanningProvider(directProvider,async()=>{}),Date.now(),{policy:{allowed_sensitive_providers:["qwen"],retry:{max_attempts:1}}});
assert.equal(directSends,2);assert.deepEqual(directGateway.output,directOutput);
assert.deepEqual(directPhysical[1].creative_skills.allowed_effect_bindings,[]);
console.log("Versioned Skill effect bindings: legacy projection identity, decision-only grayscale, contradiction/pin denial and actual two-call transport passed");
const currentSchema=JSON.parse(readFileSync("contracts/schemas/editorial/skill-evaluation.v2.schema.json","utf8"));assert.ok(!JSON.stringify(currentSchema).includes('stage2_compat'));assert.ok(!JSON.stringify(currentSchema).includes('"const":1'));

const routeInput={task:"create",focus:["speech"],platform:null,commercial:false,knowledge:false,observation_kinds:["visual","audio","transcript"],executable_capabilities:caps,profile_dimensions:["pacing"],protected_requirements:["keep identity"]};
const speechCandidates=routeCreativeSkillCandidates(creativeSkillCatalog,routeInput);
assert.ok(speechCandidates.length>=6&&speechCandidates.length<=12);
assert.ok(!speechCandidates.some(id=>/^[CPK]/.test(id)));
assert.ok(!routeCreativeSkillCandidates(creativeSkillCatalog,{...routeInput,observation_kinds:["visual"]}).some(id=>id.startsWith("A")));
assert.ok(routeCreativeSkillCandidates(creativeSkillCatalog,{...routeInput,focus:["composition"]}).includes("V01"),"unsupported related tracking stays available for a truthful evaluation");
const unselected=creativeSkillCatalog.find(d=>!A.root.context.creative_skills.candidate_ids.includes(d.skill_id))!;
assert.ok(physical.every(input=>!JSON.stringify(input).includes(unselected.catalog_content!.body)));
for(const d of creativeSkillCatalog){assert.equal(d.status,"local_runtime_approved");assert.equal(d.governance.license_status,"redistribution_not_granted");assert.ok(!("reviewer_id" in d.governance));assert.ok(d.required_evidence.length);assert.ok(d.routing_metadata);}
