import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { loadModelServices } from "../../apps/desktop/src/main/model-configuration.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { readCreationDraftExecution, listModelRuns, listCreationStates } from "../../packages/platform/project-storage/src/public.js";

// Explicit opt-in paths. A fresh project uses the authorized public original; old state stays intact.
const original = process.env.AVE_SKILL_SOURCE_PROJECT, configPath = process.env.AVE_MODEL_CONFIG, reviewRoot = process.env.AVE_REAL_REVIEW_ROOT, originalMedia = process.env.AVE_SKILL_SOURCE_MEDIA;
if (!original || !configPath || !reviewRoot || !originalMedia) throw new Error("Real Skill test requires explicit historical authorization, source media, authorized model config and isolated review root");
const database = new DatabaseSync(join(original, "project.sqlite"), { readOnly: true });
let prior: any;
try {
  const rows = database.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_session'").all() as { object_hash: string }[];
  const states = await Promise.all(rows.map(async row => JSON.parse(await readFile(join(original, "objects/sha256", row.object_hash.slice(0, 2), row.object_hash), "utf8"))));
  prior = states.filter(state => state.drafts.length).sort((a, b) => b.sequence - a.sequence)[0];
  assert.ok(prior, "A previously authorized real-source draft and observations are required");
} finally { database.close(); }
const resume = process.env.AVE_SKILL_RESUME_PROJECT;
const attempt = resolve(reviewRoot, `skill-planner-${Date.now()}`), project = resume ? resolve(resume) : join(attempt, "project");
await mkdir(attempt, { recursive: true });
const config = await loadModelServices(configPath, { ...process.env, AVE_MODEL_CONFIG: configPath });
assert.ok(config.provider && config.name && config.model, "Exact configured services must be enabled");
const credential = {}, host = new ProjectHostSession({ provider: config.name, model: config.model, modelProvider: config.provider, creationModelPolicy: config.creationModelPolicy, creationObservationPolicy: config.creationObservationPolicy, creationRequestChannels: [{ credential, actor_id: prior.authorization.actor_id }] });
const report: any = { attempt, scope: "one real creation operation in a fresh project with previously authorized public original; no retries or old-state writes", result: "running", old_project_preserved: original, started_at: new Date().toISOString() };
try {
  let state: any, observation: any;
  if (resume) {
    const previous: any = JSON.parse(await readFile(join(resolve(resume, ".."), "result.json"), "utf8"));
    assert.ok(previous.observation && previous.result === "failed", "Resume only preserved observation after a recorded failed operation with changed protocol input");
    await host.open(project);
    const storage = (host as any).session;
    state = listCreationStates(storage, storage.manifest.project_id).map((item: any) => item.value).find((item: any) => item.authorization.request_id.startsWith("skill-real:"));
    assert.ok(state); observation = { ref: previous.observation }; report.resumed_observation = previous.observation;
  } else {
  await host.create(project);
  host.initializeTimeline([], { sequence_id: "main", timebase: { value: 1n, timescale: 30n }, tracks: [] });
  const imported: any[] = await host.importMedia([originalMedia]) as any;
  const { actor_id, project_id, deployment, ...authorized } = prior.authorization;
  assert.ok(imported.every(item => authorized.asset_ids.includes(item.asset_id)), "Use only the already authorized immutable public original");
  // This user task authorizes a new bounded test operation over the same public source and deployment.
  // Never mutate or extend an expired request; create a fresh Host authorization instead.
  state = host.beginCreationRequest(credential, { ...authorized, expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), request_id: `skill-real:${Date.now()}`, original_text: "根据已有真实口播素材，做8秒、两个镜头的简洁说明。保留真实原话与现场声音，对白清楚；字幕只依据完整原话，不加不存在的音乐和煽情表达。", asset_ids: imported.map(item => item.asset_id) });
  const requestId = state.authorization.request_id;
  const materialIds = imported.map(item => `skill-material:${item.asset_id}`);
  for (const [index, item] of imported.entries()) await host.prepareCreationMaterial(credential, { operation_id: materialIds[index]!, request_id: requestId, asset_id: item.asset_id, asset_location_id: item.asset_location_id });
  observation = await host.observeCreationMaterial(credential, { request_id: requestId, expected_revision: 1, material_operation_ids: materialIds, include_audio: true });
  }
  const requestId = state.authorization.request_id;
  report.observation = observation.ref; await writeFile(join(attempt, "result.json"), JSON.stringify(report, null, 2));
  const generation = await host.generateCreationDraft(credential, { request_id: requestId, expected_revision: 1, observation_refs: [observation.ref], profile_query: null });
  const session = (host as any).session;
  const run: any = listModelRuns(session, state.project_id).find((row: any) => row.model_run_id === generation.model_run_id);
  const audit = run.metadata.audit.planning;
  assert.equal(audit.rounds.length, 3); assert.equal(audit.rounds[0].input.context.creative_skills.stage, "select"); assert.equal(audit.rounds[1].input.context.creative_skills.stage, "plan");
  const draft: any = readCreationDraftExecution(session, state.project_id, generation.draft_id);
  assert.ok(draft.value.source.plan.skill_effects.length > 0);
  report.planning = { model_run_id: generation.model_run_id, physical_calls: audit.rounds.length, selections: audit.rounds[0].exchange.skill_evaluations, skill_effects: draft.value.source.plan.skill_effects, draft_id: generation.draft_id, timeline_version: (host.readTimelineSnapshot() as any).version };
  report.result = "real_planner_passed"; await writeFile(join(attempt, "result.json"), JSON.stringify(report, null, 2));
  if (process.env.AVE_SKILL_RENDER === "1") {
    const output = await host.renderCreationDraft(credential, { operation_id: `skill-render:${generation.model_run_id}`, request_id: requestId, draft_id: generation.draft_id });
    assert.equal((output.receipt.preview.qc_report as any).status, "passed"); assert.equal((output.receipt.master.qc_report as any).status, "passed"); report.render = output; report.result = "real_planner_preview_master_qc_passed";
  }
} catch (cause) {
  report.result = "failed"; report.failure = { name: (cause as Error).name, message: (cause as Error).message, code: (cause as any).code, stack: (cause as Error).stack, cause: { code: (cause as any).cause?.code, message: (cause as any).cause?.message, stack: (cause as any).cause?.stack } };
  report.planning_diagnostic = (cause as any).planning_diagnostic ?? (cause as any).cause?.planning_diagnostic;
  console.error(JSON.stringify({ status: "failed", code: report.failure.code, message: report.failure.message, cause: report.failure.cause.message })); process.exitCode = 1;
} finally {
  await host.close(); report.completed_at = new Date().toISOString(); await writeFile(join(attempt, "result.json"), JSON.stringify(report, null, 2)); console.log(`SKILL_REAL_RESULT=${join(attempt, "result.json")}`);
}
