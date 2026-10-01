import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCreativeSkillCatalog } from "../../packages/core/editorial-core/src/public.js";
import { creativeSkillCatalog, creativeSkillCatalogRules, catalogSource, catalogSourceDigest } from "../../packages/platform/project-host/src/creative-skill-catalog.js";
import { creationDigest, creationDecisionSchema, CREATION_PLANNING_PROTOCOL, deriveCreationPlanningInput, measureCreationSelection, resolveCreationPlanningFinal, compileCreationDecisionV1, assertCreationPlanningRoundIdentity } from "../../packages/platform/contract-runtime/src/public.js";
import { validateSkillEvaluations, assertCreativeSkillEffects } from "../../packages/platform/contract-runtime/src/creative-skill-runtime.mjs";
import { fixtureSkillEvaluations, fixtureSkillEffects } from "../fixtures/stage3/skill-planning.js";
import { compileCreationPlan, type CreationCompileContext } from "../../packages/core/edit-ir/src/public.js";
import { simulateCommands, type Timeline } from "../../packages/core/timeline-core/src/public.js";
import { createQwenProvider, runModel } from "../../packages/platform/model-gateway/src/public.js";
import { createCreationPlanningProvider } from "../../packages/platform/model-gateway/src/creation-planning.js";
import { createHash } from "node:crypto";

assert.equal(creativeSkillCatalog.length, 64);
assert.equal(new Set(creativeSkillCatalog.map(item => `${item.skill_id}@${item.skill_version}`)).size, 64);
assert.equal(createHash("sha256").update(catalogSource).digest("hex"), catalogSourceDigest);
assert.deepEqual(parseCreativeSkillCatalog(catalogSource), creativeSkillCatalog);
assert.throws(() => parseCreativeSkillCatalog(catalogSource.replace("S02｜", "S01｜")), /CATALOG_INVALID/);
assert.ok(Object.isFrozen(creativeSkillCatalog[0]!.catalog_content));
for (const item of creativeSkillCatalog) assert.ok(catalogSource.includes(item.catalog_content!.body), "every complete body is verbatim source text");

const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
const source = (index: number) => ({ asset_id: `asset:sha256:${String(index + 1).repeat(64)}`, span_id: `span-${index}`, start: time(0), end: time(90) });
const spans = [0, 1].map(index => ({ span_id: source(index).span_id, asset_id: source(index).asset_id, editable_start: time(0), editable_end: time(90), observations: [{ kind: "visual", evidence_id: `visual-${index}`, sample_at: time(0), description: index ? "朋友的真实反应" : "旅行到达、观察环境", uncertain: false }, { kind: "audio", evidence_id: `audio-${index}`, description: "可听见原声与环境声", uncertain: false }] }));
(spans[0]!.observations as any[]).push({ kind: "transcript", evidence_id: "transcript-0", text: "口播主题", description: "口播主题", start: time(0), end: time(15), uncertain: false });
const caps = ["source-selection", "source-order", "weighted-pacing", "audio-source-selection", "audio-gain", "embedded-gain", "editorial-captions", "verbatim-captions"];
const index = creativeSkillCatalog.filter(item => !/Knowledge|Commercial|Platform/.test(item.catalog_content!.category)).map(item => ({ skill_id: item.skill_id, category: item.catalog_content!.category, purpose: item.catalog_content!.purpose, trigger: item.catalog_content!.trigger, incompatibility: item.catalog_content!.incompatibility }));
const rootFor = (request: string, platform = false): any => {
  const schema: any = structuredClone(creationDecisionSchema); schema.required.push("skill_effects");
  const context: any = { creative_brief: "用素材支持当前意图", planning: CREATION_PLANNING_PROTOCOL, planning_projection_version: "phase-specific-v1", planning_query_identity: "host-root-round-v1", output_schema: schema,
    request: { current_revision: { revision: 1, raw_text: request, preserve_refs: [] }, protected_refs: [], hard_requirements: ["不虚构事实"] }, profile: { principles: [{ principle_id: "approved-observational", instruction: "日常作品偏好留白；本次明确请求优先", evidence: "approved fixture" }] }, timeline: { version: 0, sequence: { timebase: { value: "1", timescale: "30" } } }, source_spans: spans,
    creative_skills: { protocol: "skill-demand-v1", definitions: creativeSkillCatalog, rules: creativeSkillCatalogRules, index: platform ? [...index, ...creativeSkillCatalog.filter(item => item.skill_id === "P01").map(item => ({ skill_id: item.skill_id, category: item.catalog_content!.category, purpose: item.goal, trigger: item.catalog_content!.trigger, incompatibility: item.catalog_content!.incompatibility }))] : index, executable_capabilities: caps } };
  return { context, media: [] };
};
const buildCatalog = async (root: any) => { const { buildCreationSourceChoiceCatalog } = await import("../../packages/platform/contract-runtime/src/public.js"); root.context.source_choice_catalog = buildCreationSourceChoiceCatalog(root.context); return root; };
const template = JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-decision.v1.json", "utf8"));
const modelDecision = (request: string, ids: string[], details: any): any => {
  assert.deepEqual(details.selected.map((item: any) => item.skill_id), ids);
  for (const detail of details.selected) assert.equal(detail.body, creativeSkillCatalog.find(item => item.skill_id === detail.skill_id)!.catalog_content!.body);
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
  const first = deriveCreationPlanningInput(root, []); assert.equal((first.context.creative_skills as any).stage, "select");
  assert.deepEqual(Object.keys((first.context.creative_skills as any).index[0]).sort(), ["category", "incompatibility", "purpose", "skill_id", "trigger"]);
  assert.equal(JSON.stringify(first).includes('"definitions"'), false); assert.equal(JSON.stringify(first).includes('"body"'), false);
  assert.equal((first.context.creative_skills as any).index.some((item: any) => item.skill_id === "P01"), platform);
  const measure = (input: any, decision: any, evaluations?: any[]) => ({ exchange_version: 3, kind: "measure_selection", query_id: input.context.planning_exchange.assigned_query_id, target_duration_ticks: decision.target_duration_ticks, selection: decision.shots.map((shot: any) => ({ selection_id: shot.shot_id, source_choice: { kind: "custom_window", source_window: shot.source_window }, timing: shot.timing })), ...(evaluations ? { skill_evaluations: evaluations } : {}) });
  const provisional = { ...template, shots: [{ ...template.shots[0], shot_id: "shot-0", source_window: source(0) }], target_duration_ticks: 90 };
  const proposed = fixtureSkillEvaluations(root.context, ids).map(item => ({ ...item, required_capabilities: item.skill_id.startsWith("A") ? ["embedded-gain"] : item.skill_id.startsWith("V") ? ["verbatim-captions"] : ["source-selection"] }));
  const q1 = measure(first, provisional, proposed); exchanges.push({ exchange: q1, measurement: measureCreationSelection(q1, root.context) });
  const second = deriveCreationPlanningInput(root, exchanges), detail = second.context.creative_skills as any;
  assert.equal((second.context.planning_exchange as any).phase, "measure-only"); assert.equal(detail.selected.length, ids.length); assert.equal("index" in detail, false);
  assert.equal(JSON.stringify(second).includes('"definitions"'), false);
  const decision = modelDecision(request, ids, detail), q2 = measure(second, decision); exchanges.push({ exchange: q2, measurement: measureCreationSelection(q2, root.context) });
  const third = deriveCreationPlanningInput(root, exchanges), receipt = (third.context.planning_exchange as any).feasible_receipts[0];
  assert.equal(receipt.query_id, q2.query_id);
  const paths = Object.fromEntries(ids.map(id => [id, id.startsWith("A") ? "/shots/0/embedded_gain_db" : id.startsWith("V") ? "/captions" : "/shots"]));
  decision.skill_effects = fixtureSkillEffects(second.context, decision, paths);
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
assert.ok((E.second.context.creative_skills as any).precedence.includes("当前用户请求"));

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
const removalContext = structuredClone(A.root.context); removalContext.timeline.tracks = [{ kind: "audio", clips: [{ source: { asset_id: source(0).asset_id }, semantic_sidecar: { evidence_refs: ["span-0"] } }] }];
assertCreativeSkillEffects(removalContext, [{ exchange: { skill_evaluations: [{ ...evaluation, required_capabilities: ["audio-source-selection"] }] } }], effectCase("/audio", { audio: [] }));
for (const patch of [{ result: "unsupported_capability", required_capabilities: ["source-selection"] }, { result: "applicable", evidence_ids: ["visual-0"] }, { result: "applicable", required_capabilities: ["audio-gain"] }]) {
  const changed: any = { ...A.q2, skill_evaluations: [{ ...A.q1.skill_evaluations![0], ...patch }] };
  assert.throws(() => assertCreationPlanningRoundIdentity(A.second as any, changed), (error: any) => error.code === "CREATIVE_SKILL_FAILURE");
}
for (const result of ["not_applicable", "insufficient_evidence"]) assert.equal(validateSkillEvaluations(A.root.context, [{ ...evaluation, result, evidence_ids: [], reason: result }])[0].result, result);
assert.equal(validateSkillEvaluations(A.root.context, [{ ...evaluation, result: "unsupported_capability", required_capabilities: ["dynamic-subject-tracking"] }])[0].result, "unsupported_capability");
for (const [patch, code] of [[{ result: "failure" }, "CREATIVE_SKILL_FAILURE"], [{ skill_id: "unknown" }, "CREATIVE_SKILL_FAILURE"], [{ evidence_ids: [] }, "CREATIVE_SKILL_INSUFFICIENT_EVIDENCE"], [{ required_capabilities: ["dynamic-subject-tracking"] }, "CREATIVE_SKILL_UNSUPPORTED_CAPABILITY"], [{ evidence_ids: ["invented"] }, "CREATIVE_SKILL_FAILURE"]] as const) assert.throws(() => validateSkillEvaluations(A.root.context, [{ ...evaluation, ...patch }]), (error: any) => error.code === code);

// Actual Gateway transport receives three projections, never the local full catalogue.
let sends = 0; const physical: any[] = [];
const provider = createQwenProvider({ api_key: "fixture-only", models: [{ model: "fixture", media_types: [] }], fetch_impl: async (_url, init) => {
  const input = JSON.parse(JSON.parse(init!.body as string).messages[0].content); physical.push(input); sends++;
  const exchange = sends === 1 ? A.q1 : sends === 2 ? A.q2 : A.final;
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(exchange) }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }));
} });
const gateway = await runModel({ request_id: "fixture", project_id: "fixture", prompt_version: "skill-fixture-v1", privacy_class: "sensitive", provider: "qwen", model: "fixture", input: A.root, structured_output: true, on_call_audit: () => {}, dispatch: (send: any) => send().response } as any, createCreationPlanningProvider(provider, async () => {}), Date.now(), { policy: { allowed_sensitive_providers: ["qwen"], retry: { max_attempts: 1 } } });
assert.equal(sends, 3); assert.deepEqual(gateway.output, A.output);
assert.equal(physical[0].creative_skills.stage, "select"); assert.equal(physical[1].creative_skills.selected.length, 7);
assert.ok(physical.every(input => !JSON.stringify(input).includes('"definitions"')));
console.log("Skill Catalog 64 lossless pins; A–F two-level Planner/decision/compiler fixtures and physical Gateway projection passed (no real model)");
