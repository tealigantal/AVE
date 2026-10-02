import { fixtureSkillExchange } from "../../tests/fixtures/stage3/skill-planning.js";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";

import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import { ProfileRepository } from "../../packages/platform/user-profile-store/src/public.js";


// Controlled provider follows the production v3 measured-receipt/final exchange; observations and learning are unchanged.
function planningFixtureExchange(context: any, decision: any): any {
  const shots = decision.shots.map(({ source_window, ...shot }: any) => ({ ...shot, source_choice: { kind: "custom_window", source_window } }));
  const query_id = context.planning_exchange.assigned_query_id;
  assert.equal(typeof query_id, "string");
  if (context.planning_exchange.phase === "measure-only") return fixtureSkillExchange(context, { exchange_version: 3, kind: "measure_selection", query_id, target_duration_ticks: decision.target_duration_ticks, selection: shots.map((shot: any) => ({ selection_id: shot.shot_id, source_choice: shot.source_choice, timing: shot.timing })) }, decision);
  assert.equal(context.planning_exchange.round, 2, "Full-body evaluation/measurement and final are exactly two calls, without retry");
  assert.equal(context.planning_exchange.exchanges.length, 1);
  const receipt = context.planning_exchange.feasible_receipts.at(-1);
  // Deliberately preserve the infeasible-final negative case; never fabricate a feasible receipt.
  const measured_query_id = receipt ? receipt.query_id : context.planning_exchange.exchanges[0].exchange.query_id;
  const measurement_receipt_digest = receipt ? receipt.measurement_receipt_digest : "0".repeat(64);
  assert.equal(context.planning_exchange.exchanges[0].exchange.query_id, measured_query_id);
  const { decision_version, target_duration_ticks, shots: originalShots, ...creative } = decision;
  return fixtureSkillExchange(context, { exchange_version: 3, kind: "final", measured_query_id, measurement_receipt_digest, creative: { ...creative, shots: originalShots.map(({ source_window, source_choice, timing, ...shot }: any) => shot) } }, decision);
}

// Engineering fixture: real codecs, Host, SQLite and render; model output is controlled.
const root = await mkdtemp(resolve("/workspace/projects", "compose-acceptance-")), credential = {};
const now = () => Date.parse("2026-09-27T01:00:00Z");
const profile = new ProfileRepository(resolve(root, "profile"), "test-profile", credential, now);
let generationAttempts = 0, observationCalls = 0, learningCalls = 0;
let physicalPlanningCalls = 0;
let cancelLearning = false, learningEntered!: () => void;
let latestGenerationContext: any;
let latestProviderText!: string;
const time = (value: number) => ({ schema_version: 1, value, timescale: 30 });
const provider = createQwenProvider({ api_key: "fixture", models: [{ model: "fixture", media_types: ["image/png", "audio/wav"] }], fetch_impl: async (_url, init) => {
  const content = JSON.parse(init!.body as string).messages[0].content;
  let output: unknown;
  if (Array.isArray(content)) {
    observationCalls++;
    const input = JSON.parse(content[0].text);
    output = { samples: input.samples.map((item: any) => ({ sample_id: item.sample_id, description: "Explicit synthetic engineering fixture", uncertain: false, transcript: [] })) };
  } else {
    const input = JSON.parse(content);
    if (input.learning_event) {
      learningCalls++;
      if (cancelLearning) {
        learningEntered();
        await new Promise((_resolve, reject) => { const signal = init!.signal!; const abort = () => reject(signal.reason); signal.addEventListener("abort", abort, { once: true }); if (signal.aborted) abort(); });
      }
      output = input.learning_event.data_type === "selection"
        ? { principles: [{ dimension: "pacing", statement: "Explicit adoption engineering fixture only", contexts: ["test-adoption"], exceptions: [], evidence_refs: [input.learning_event.facts[0].fact_id] }], no_inference_reason: null }
        : { principles: [], no_inference_reason: "One request is not evidence of a lasting preference." };
    } else {
    physicalPlanningCalls++;
    if (input.planning_exchange.round === 1) generationAttempts++;
    assert.match(input.task, /JSON/, "JSON response mode requires an explicit JSON instruction");
    latestGenerationContext = input;
    for (const span of input.source_spans) {
      assert.deepEqual(Object.keys(span.source_coverage), ["restriction"], "raw stream bounds stay outside the generation selection context");
      assert.ok(span.editable_start && span.editable_end, "Wire retains exact source bounds");
      for (const sample of span.observations.filter((item: any) => item.kind === "visual")) {
        assert.ok(sample.sample_at); assert.equal(typeof sample.description, "string");
        for (const field of ["start_pts", "end_pts", "timescale"]) assert.equal(Object.hasOwn(sample, field), false);
        assert.equal(typeof sample.option_id, "string"); assert.match(sample.maximum_duration_ticks, /^\d+$/); if (sample.source_window === null) assert.equal(sample.maximum_duration_ticks, "0"); else { assert.equal(sample.source_window.span_id, span.span_id); assert.equal(sample.source_window.asset_id, span.asset_id); }
      }
    }
    const editableWindow = (span: any) => ({ span_id: span.span_id, asset_id: span.asset_id, start: span.editable_start, end: span.editable_end });
    const spans = generationAttempts % 2 ? input.source_spans : [...input.source_spans].reverse();
    output = { decision_version: 1, target_duration_ticks: 75, thesis: "Controlled output", shots: spans.map((item: any, index: number) => ({ shot_id: `shot-${index}`, timing: { kind: "weighted", weight: index ? 2 : 3 }, source_window: editableWindow(item), purpose: "Selected controlled interval", embedded_gain_db: -6, reframe: null, color: null })), audio: [], captions: [], preserve_refs: input.request.revisions.at(-1).preserve_refs, applied_principle_ids: [], feedback_interpretation: input.request.revisions.at(-1).raw_text, change_summary: "Actual source cuts" };
    output = planningFixtureExchange(input, output);
    }
  }
  latestProviderText = JSON.stringify(output);
  return new Response(JSON.stringify({ choices: [{ message: { content: latestProviderText }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200 } }));
} });
const host = new ProjectHostSession({ now, profileRepository: profile, creationRequestChannels: [{ credential, actor_id: "desktop-user" }], provider: "qwen", model: "fixture", modelProvider: provider, creationObservationPolicy: { scene_threshold: 100, max_frame_edge: 64, max_samples: 32, timeout_seconds: 30 }, creationModelPolicy: { max_attempts: 1, timeout_ms: 30000 } });

try {
  const paths = [resolve(root, "a.mp4"), resolve(root, "b.mp4")];
  for (const [index, path] of paths.entries()) await promisify(execFile)("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc2=s=96x64:r=30:d=3", "-f", "lavfi", "-i", `sine=frequency=${440 + index * 150}:sample_rate=48000:duration=${index ? 2.95 : 3}`, "-vf", `hue=h=${index * 50},setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709`, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-t", "3", path]);
  const project = resolve(root, "project");
  await host.create(project); host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported = await host.importMedia(paths) as any[];
  const { actor_id: _actor, project_id: _project, deployment: _deployment, ...authorization } = JSON.parse(await readFile("contracts/examples/valid/editorial/creation-session.v1.json", "utf8")).authorization;
  Object.assign(authorization, { request_id: "product", original_text: "做一个2-3秒的视频", expires_at: "2027-01-01T00:00:00Z", asset_ids: imported.map(item => item.asset_id), provider: "qwen", model: "fixture", allowed_data: ["request", "timeline", "evidence", "frames", "audio", "transcript"] });
  host.beginCreationRequest(credential, authorization);
  const produce = (revision: number) => host.produceCreation(credential, { request_id: "product", expected_revision: revision, profile_query: null });
  const [first, duplicate] = await Promise.all([produce(1), produce(1)]);
  assert.deepEqual(duplicate, first); assert.equal(generationAttempts, 1); assert.equal(physicalPlanningCalls, 2, "one logical generation is two physical planner calls: full-body evaluation/measurement and final"); assert.equal(observationCalls, 1);
  assert.equal(latestGenerationContext.source_spans.some((span: any) => span.source_coverage.restriction === "embedded-audio-intersection"), true, "real encoded shorter AAC audio exposes an explicit usable intersection instead of rejecting valid cuts");
  const original = host.readCreationDraftTimeline(credential, { request_id: "product", draft_id: first.draft_id });
  assert.equal(original.version, first.timeline_version);
  assert.equal(host.readCreationDraftMaster(credential, { request_id: "product", draft_id: first.draft_id, render_id: first.render_id }).bytes.length > 0, true);
  await produce(1); assert.equal(generationAttempts, 1, "completed production resumes without repeating a paid generation");
  const master = host.readCreationDraftMaster(credential, { request_id: "product", draft_id: first.draft_id, render_id: first.render_id });
  await (await import('node:fs/promises')).writeFile('/workspace/exports/compose-acceptance-master.mp4', master.bytes);
  await host.close(); await host.open(project);
  assert.equal(host.readCreationDraftMaster(credential, { request_id: "product", draft_id: first.draft_id, render_id: first.render_id }).bytes.length, master.bytes.length);
  console.log(JSON.stringify({result:'passed',project,export:'/workspace/exports/compose-acceptance-master.mp4',master_bytes:master.bytes.length,timeline_version:first.timeline_version,model:'controlled fixture; actual media codecs/Host/render/QC'}));
} finally { await host.close(); await profile.close(); }
