import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { builtInCreativeSkillDefinitions, builtInDurationBlueprints, type StoryBeatCandidate } from "../../packages/core/editorial-core/src/public.js";
import { createStage2HumanReview } from "./stage2-human-review-helper.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceProject = process.env.AVE_STAGE2_PRODUCT_PROJECT;
const reviewDirectory = process.env.AVE_STAGE2_PRODUCT_REVIEW_ROOT;
if (!sourceProject || !reviewDirectory) throw new Error("AVE_STAGE2_PRODUCT_PROJECT and AVE_STAGE2_PRODUCT_REVIEW_ROOT are required");
await stat(resolve(sourceProject, "project.sqlite"));
let reviewRootExists = true; try { await stat(reviewDirectory); } catch { reviewRootExists = false; }
assert.equal(reviewRootExists, false, "Product review root must be fresh");
await mkdir(reviewDirectory, { recursive: true });
const workProject = resolve(reviewDirectory, "project");
await cp(sourceProject, workProject, { recursive: true });

const human = createStage2HumanReview("desktop-user", "2026-08-24T12:00:00Z");
const preparationHost = new ProjectHostSession(human.options);
try {
  await preparationHost.open(workProject);
  let clearedTimeline = preparationHost.readTimelineSnapshot() as any;
  for (const track of clearedTimeline.tracks) for (const clip of [...track.clips]) { preparationHost.applyTimelineCommand({ type: "remove_clip", track_id: track.track_id, clip_id: clip.clip_id }, clearedTimeline.version); clearedTimeline = preparationHost.readTimelineSnapshot() as any; }
  const initial = await preparationHost.readStage2Workspace() as any;
  const contract = initial.contract, evidence = initial.evidence.filter((item: any) => item.status === "approved"), original = (preparationHost.listMedia() as any[]).find((item) => item.location_type === "original");
  assert.ok(contract && evidence.length >= 2 && original?.location_ref, "retained real project lacks accepted Stage 2 Contract, Evidence or Original");
  const contractRef = { object_id: contract.object_id, object_version: contract.object_version, digest: contract.digest };
  const pack = await preparationHost.assembleMaterialEvidencePack({ pack_id: "pack-product-electron", contract_ref: contractRef, evidence_ids: evidence.map((item: any) => item.object_id), coverage_matrix: { schema_version: 1, matrix_id: "coverage-product-electron", rows: contract.requirements.map((requirement: any) => ({ requirement_id: requirement.requirement_id, evidence_ids: evidence.map((item: any) => item.object_id), status: "covered" })) }, expected_media_verified_at: { [original.asset_id]: original.verified_at }, policy_version: "knowledge-v1", timeline_version: initial.timeline.version, created_at: "2026-08-24T12:00:00Z" }) as any;
  const packRef = { object_id: pack.value.pack_id, object_version: 1, digest: pack.object_hash };
  const definition = builtInCreativeSkillDefinitions.find((item) => item.status === "published")!; preparationHost.pinBuiltInCreativeSkillDefinition(definition.skill_id, definition.skill_version);
  const evaluation = await preparationHost.evaluateCreativeSkillKnowledge({ evaluation_id: "evaluation-product-electron", definition_ref: { object_id: definition.skill_id, object_version: definition.skill_version, digest: definition.definition_digest }, contract_ref: contractRef, material_pack_ref: packRef, context_tags: ["personal-story", "reaction-evidenced"], parameter_values: { intensity: "moderate" }, evaluated_at: "2026-08-24T12:01:00Z" }) as any;
  const evaluationRef = { object_id: evaluation.value.evaluation_id, object_version: 1, digest: evaluation.object_hash };
  const blueprint = builtInDurationBlueprints.find((item) => item.duration_class === "60s")!; preparationHost.pinBuiltInDurationBlueprint(blueprint.blueprint_id, 1);
  const feasibility = await preparationHost.evaluateDurationBlueprint({ feasibility_id: "duration-product-electron", blueprint_ref: { object_id: blueprint.blueprint_id, object_version: 1, digest: blueprint.definition_digest }, contract_ref: contractRef, material_pack_ref: packRef, evaluated_at: "2026-08-24T12:02:00Z" }) as any;
  const durationRef = { object_id: feasibility.value.feasibility_id, object_version: 1, digest: feasibility.object_hash };
  const directionA = await preparationHost.createStoryDirection({ direction_id: "direction-product-electron-a", title: "证据驱动的抵达", thesis: "用真实镜头把目标、转折和抵达连成一条线", contract_ref: contractRef, material_pack_ref: packRef, skill_evaluation_refs: [evaluationRef], duration_feasibility_ref: durationRef, expected_benefits: ["结尾回应开场"], risks: [], alternatives: [], confidence: { score: 0.95, basis: ["当前证据覆盖硬约束"] }, created_at: "2026-08-24T12:03:00Z" }) as any;
  await preparationHost.createStoryDirection({ direction_id: "direction-product-electron-b", title: "安静的时间顺序", thesis: "按拍摄顺序保留旅程", contract_ref: contractRef, material_pack_ref: packRef, skill_evaluation_refs: [evaluationRef], duration_feasibility_ref: durationRef, expected_benefits: ["顺序直观"], risks: ["转折偏弱"], alternatives: [], confidence: { score: 0.7, basis: ["时间证据完整"] }, created_at: "2026-08-24T12:03:00Z" });
  const directionWorkspace = await preparationHost.readStage2Workspace() as any;
  const selectedDirection = await preparationHost.performStage2ProductAction(human.credential, { action: "direction.select", workspace_digest: directionWorkspace.workspace_digest, reason: "选择证据更完整的当前方向", selected_id: directionA.value.direction_id }) as any;
  const directionRef = { object_id: selectedDirection.direction.value.direction_id, object_version: 2, digest: selectedDirection.direction.object_hash }, evidenceRef = (index: number) => ({ object_id: evidence[index].object_id, object_version: evidence[index].object_version, digest: evidence[index].digest });
  const beat = (id: string, role: string, seconds: number, index: number, requirement: string, entry: string, exit: string): StoryBeatCandidate => ({ beat_id: id, role, purpose: `${role} purpose`, target_duration: { schema_version: 1, value: seconds, timescale: 1 }, evidence_refs: [evidenceRef(index)], alternative_evidence_refs: [], coverage_requirement_ids: [requirement], entry_state: entry, exit_state: exit, desired_emotion: role === "ending" ? "satisfied" : "curious", continuity_constraints: ["preserve state"], confidence: { score: 0.9, basis: ["approved evidence"] }, reason: "evidence supports beat", risks: [], unresolved_assumptions: [] });
  const storyCommon = { direction_ref: directionRef, contract_ref: contractRef, material_pack_ref: packRef, skill_evaluation_refs: [evaluationRef], duration_feasibility_ref: durationRef, risks: [], alternatives: [], created_at: "2026-08-24T12:04:00Z" } as const;
  const proposalA = await preparationHost.proposeStoryV2({ ...storyCommon, proposal_id: "proposal-product-electron-a", thesis: selectedDirection.direction.value.thesis, audience_promise: "看见目标、变化与抵达", beats: [beat("hook", "hook", 20, 0, contract.requirements[0].requirement_id, "unknown", "engaged"), beat("ending", "ending", 40, 1, contract.requirements[1].requirement_id, "engaged", "resolved")] }) as any;
  await preparationHost.proposeStoryV2({ ...storyCommon, proposal_id: "proposal-product-electron-b", thesis: "时间顺序备选", audience_promise: "顺序跟随旅程", beats: [beat("hook-b", "hook", 20, 1, contract.requirements[0].requirement_id, "unknown", "engaged"), beat("ending-b", "ending", 40, 0, contract.requirements[1].requirement_id, "different", "resolved")] });
  const storyWorkspace = await preparationHost.readStage2Workspace() as any;
  const selectedStory = await preparationHost.performStage2ProductAction(human.credential, { action: "story.approve", workspace_digest: storyWorkspace.workspace_digest, reason: "批准当前证据闭合的故事", selected_id: proposalA.value.proposal_id }) as any;
  const intent = await preparationHost.generateEditorialIntent({
    plan_id: selectedStory.plan.value.plan_id,
    decision_ids: [selectedStory.decision.value.decision_id],
    capability_snapshot_id: "capabilities-product-electron",
    intent_id: "intent-product-electron-current",
    operations: [{ operation_id: "select-product-electron", kind: "select_evidence", target_refs: ["beat:hook", `evidence:${evidence[0].object_id}`], parameter_values: { priority: 1 }, expected_effect: "把已批准的真实素材证据追加为当前可审阅镜头", required_capabilities: ["semantic-evidence-selection"], unsupported_policy: "block" }],
    preconditions: ["current Timeline remains exact"],
    reason: "prepare one current execution-bound desktop review journey",
    alternatives: ["retain the accepted revision"],
    risks: [],
    confidence: { score: 1, basis: ["accepted Story, Evidence and real Original"] },
    actor: { actor_id: "project-host", actor_kind: "policy" },
    created_at: "2026-08-24T12:00:00Z",
  }) as any;
  const approvalWorkspace = await preparationHost.readStage2Workspace() as any;
  const approval = await preparationHost.performStage2ProductAction(human.credential, { action: "intent.approve", workspace_digest: approvalWorkspace.workspace_digest, reason: "approve the exact current real-media effect", intent_id: intent.value.intent_id }) as any;
  const executionWorkspace = await preparationHost.readStage2Workspace() as any;
  const executionInput = { action: "intent.execute" as const, workspace_digest: executionWorkspace.workspace_digest, reason: "execute the exact current real-media effect", intent_id: intent.value.intent_id, proposal_approval_decision_id: approval.value.decision_id };
  const executionReview = await preparationHost.prepareStage2ProductActionReview(executionInput);
  const execution = await preparationHost.performStage2ProductAction(human.credential, executionInput, executionReview) as any;
  const timeline = preparationHost.readTimelineSnapshot() as any;
  assert.equal(original.asset_id, timeline.tracks[0].clips[0].source.asset_id);
  const sourceTimescale = BigInt(timeline.tracks[0].clips[0].source.timescale);
  await preparationHost.renderTimeline({
    sources: [{ asset_ref: original.asset_id, original_ref: original.location_ref, source_timescale: sourceTimescale, original_timescale: sourceTimescale }],
    outputDirectory: resolve(workProject, "product-review-render"),
    profile: { name: "semantic-intent-preflight" },
    qcRequirements: { planned_silence: true },
    executionBinding: { timeline_version: execution.final_timeline_version, semantic_graph_hash: execution.semantic_graph_hash, preview_plan_id: execution.preview_plan_id, master_plan_id: execution.master_plan_id, source_identity_digest: execution.source_identity_digest },
  });
  const current = await preparationHost.readStage2Workspace() as any;
  assert.equal(current.review.render.binding_status, "current");
  assert.equal(current.review.current_execution_id, execution.execution_id);
} finally {
  await preparationHost.close();
}

const outputRoot = await mkdtemp(resolve(tmpdir(), "ave-stage2-product-electron-"));
const tsconfig = resolve(root, ".ave-stage2-product-electron.tsconfig.json");
const electron = resolve(root, "node_modules/electron/dist", process.platform === "win32" ? "electron.exe" : "electron");
const tsc = resolve(root, "node_modules/typescript/bin/tsc");
const config = { extends: "./tsconfig.base.json", compilerOptions: { noEmit: false, outDir: outputRoot, rootDir: root, declaration: false, sourceMap: false }, include: ["apps/desktop/src/**/*.ts", "packages/**/*.ts"] };

async function runElectron(markerPrefix: string, extraEnvironment: Record<string, string> = {}): Promise<any> {
  const child = spawn(electron, ["--no-sandbox", resolve(outputRoot, "apps/desktop/src/main.js")], { cwd: outputRoot, env: { ...process.env, AVE_OPEN_PROJECT: workProject, AVE_ELECTRON_PRODUCT_REVIEW: "1", AVE_ELECTRON_PRODUCT_REVIEW_REJECT_CONFIRM: "1", AVE_ELECTRON_REVIEW_DIR: reviewDirectory, ...extraEnvironment }, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  const line = await new Promise<string>((done, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${markerPrefix} timed out\nstdout:\n${stdout}\nstderr:\n${stderr}`)); }, 60000);
    child.stdout.on("data", (chunk) => { stdout += chunk; const marker = stdout.split(/\r?\n/).find((value) => value.startsWith(markerPrefix)); if (marker) { clearTimeout(timer); done(marker); } });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => { if (!stdout.includes(markerPrefix)) { clearTimeout(timer); reject(new Error(`${markerPrefix} exited with ${code}\nstdout:\n${stdout}\nstderr:\n${stderr}`)); } });
  });
  child.kill();
  return JSON.parse(line.slice(markerPrefix.length));
}

try {
  await writeFile(tsconfig, JSON.stringify(config));
  const compile = spawn(process.execPath, [tsc, "-p", tsconfig], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let compileOutput = ""; compile.stdout.on("data", (chunk) => { compileOutput += chunk; }); compile.stderr.on("data", (chunk) => { compileOutput += chunk; });
  assert.equal(await new Promise((done) => compile.on("close", done)), 0, compileOutput);
  await cp(resolve(root, "packages"), resolve(outputRoot, "packages"), { recursive: true, force: true });
  await cp(resolve(root, "database"), resolve(outputRoot, "database"), { recursive: true, force: true });
  await cp(resolve(root, "apps/worker-host"), resolve(outputRoot, "apps/worker-host"), { recursive: true, force: true });
  await cp(resolve(root, "apps/desktop/src/renderer"), resolve(outputRoot, "apps/desktop/src/renderer"), { recursive: true });
  await cp(resolve(root, "apps/desktop/src/preload-runtime.cjs"), resolve(outputRoot, "apps/desktop/src/preload.cjs"));

  const result = await runElectron("AVE_ELECTRON_PRODUCT_REVIEW ");
  assert.equal(result.title, "AVE 工作台");
  assert.equal(result.tabs, 4);
  assert.equal(result.selectedTab, "review");
  assert.equal(result.rawJsonPrompts, false);
  assert.match(result.views.contract.text, /Build an evidence-led first cut/);
  assert.ok(result.views.evidence.cards >= 8);
  assert.ok(result.views.story.candidates >= 2);
  assert.ok(result.views.review.intents >= 1);
  assert.equal(result.views.review.feedbackForm, true);
  assert.match(result.views.review.text, /当前 Timeline|Preview \/ Master \/ QC 已绑定执行/);
  assert.ok(result.journey.preview_duration > 0);
  assert.ok(result.journey.preview_played_seconds > 0.15);
  assert.equal(result.journey.feedback_preview_visible, true);
  assert.equal(result.journey.dual_id_payload_closed, true);
  assert.equal(result.journey.dual_id_timeline_unchanged, true);
  assert.equal(result.journey.dual_id_approval_unchanged, true);
  assert.equal(result.journey.feedback_decision, "rejected");
  assert.equal(result.journey.feedback_decision_visible, true);
  assert.equal(result.journey.feedback_decision_timeline_unchanged, true);
  assert.match(result.journey.feedback_rejection_decision_id, /^permission:gate-feedback_revision\.reject-/);
  assert.equal(result.journey.preview_effect_after_recovery, false);
  assert.equal(result.journey.media_preview_after_recovery, false);
  assert.equal(result.journey.stale_preview_reload_disabled, true);
  assert.equal(result.journey.stale_preview_query_closed, true);
  assert.equal(result.journey.invalid_payload_closed, true);
  assert.ok(result.journey.undo_timeline_version > result.journey.before_timeline_version);
  assert.ok(result.journey.redo_timeline_version > result.journey.undo_timeline_version);
  assert.equal(result.journey.render_after_recovery, "stale");
  assert.equal(result.journey.feedback_after_recovery, "stale");
  for (const path of result.captures) assert.ok((await stat(path)).size > 10_000, `review capture is too small: ${path}`);

  const reopened = await runElectron("AVE_ELECTRON_PRODUCT_REOPEN ", { AVE_ELECTRON_PRODUCT_REOPEN_ONLY: "1" });
  assert.equal(reopened.project_id, result.journey.project_id);
  assert.equal(reopened.timeline_version, result.journey.redo_timeline_version);
  assert.equal(reopened.workspace_digest, result.journey.workspace_digest);
  assert.equal(reopened.render_binding, "stale");
  assert.ok(reopened.stale_intents >= 1);
  await writeFile(resolve(reviewDirectory, "PRODUCT-WORKSPACE-REVIEW.json"), JSON.stringify({ ...result, reopened }, null, 2));
  console.log(`STAGE2_PRODUCT_REVIEW_ROOT=${resolve(reviewDirectory)}`);
} finally {
  await rm(tsconfig, { force: true });
  await rm(outputRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

console.log("Stage 2 Product real Electron interaction, Preview, feedback, recovery and reopen check passed");
