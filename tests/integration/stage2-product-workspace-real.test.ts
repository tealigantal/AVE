import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { allocateDurationBeatBudgets, allocateDurationRoleBudgets, builtInCreativeSkillDefinitions, builtInDurationBlueprints, type StoryBeatCandidate } from "../../packages/core/editorial-core/src/public.js";
import { createStage2HumanReview } from "./stage2-human-review-helper.js";
import { assertCanonicalStage2Timeline, canonicalStage2TimelineTracks } from "../../apps/desktop/src/main/stage2-timeline.js";

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
  // Rebuild this disposable fixture through Host Commands using the current
  // desktop topology; a Pipeline-only track layout cannot enter Electron.
  for (const track of clearedTimeline.tracks) {
    preparationHost.applyTimelineCommand({ type: "remove_track", track_id: track.track_id }, clearedTimeline.version);
    clearedTimeline = preparationHost.readTimelineSnapshot() as any;
  }
  for (const track of canonicalStage2TimelineTracks) {
    preparationHost.applyTimelineCommand({ type: "add_track", track }, clearedTimeline.version);
    clearedTimeline = preparationHost.readTimelineSnapshot() as any;
  }
  assertCanonicalStage2Timeline(clearedTimeline);
  const initial = await preparationHost.readStage2Workspace() as any;
  const contract = initial.contract, original = (preparationHost.listMedia() as any[]).find((item) => item.location_type === "original"); let evidence = initial.evidence.filter((item: any) => item.status === "approved");
  assert.ok(contract && evidence.length >= 2 && original?.location_ref, "retained real project lacks accepted Stage 2 Contract, Evidence or Original");
  const contractRef = { object_id: contract.object_id, object_version: contract.object_version, digest: contract.digest };
  await preparationHost.recordMaterialPermission(await human.materialPermission(preparationHost, "approval-product-electron-copied-material", { contract_ref: contractRef, asset_id: original.asset_id, asset_location_id: original.asset_location_id, location_ref: original.location_ref, verified_at: original.verified_at, permission_state: "authorized", policy_ref: contract.rights_policy_ref }));
  const blueprint = builtInDurationBlueprints.find((item) => item.duration_class === "60s")!; preparationHost.pinBuiltInDurationBlueprint(blueprint.blueprint_id, 1);
  const plannedBeatCount = Math.min(blueprint.beat_count.maximum, Math.max(blueprint.beat_count.minimum, evidence.length)), fixtureBeatBudgets = allocateDurationBeatBudgets({ planned_beat_count: plannedBeatCount, allocated_roles: allocateDurationRoleBudgets(blueprint).allocated_roles }), sourceTimescale = Number(evidence[0]!.range.timescale); assert.ok(Number.isSafeInteger(sourceTimescale) && sourceTimescale > 0, "retained real project Evidence must expose a valid source timescale");
  // The authorized 65-second fixture has an unplanned silent lead-in. Select
  // the exact audible 2..62-second window without altering the Original or QC.
  const fixtureSourceStart = 2 * sourceTimescale;
  const originalProbe = JSON.parse((await promisify(execFile)("ffprobe", ["-v", "error", "-show_streams", "-of", "json", original.location_ref])).stdout);
  const originalVideo = originalProbe.streams.find((stream: any) => stream.codec_type === "video");
  const originalTimeBase = /^(\d+)\/(\d+)$/.exec(originalVideo?.time_base ?? "");
  assert.ok(originalTimeBase && Number.isSafeInteger(originalVideo.duration_ts) && originalVideo.duration_ts > 0, "real Product requires exact Original video duration");
  assert.ok(BigInt(originalVideo.duration_ts) * BigInt(originalTimeBase[1]!) * BigInt(sourceTimescale) >= BigInt(fixtureSourceStart + 60 * sourceTimescale) * BigInt(originalTimeBase[2]!), "real Original must cover the complete audible 2..62-second fixture window");
  let sourceCursor = fixtureSourceStart; const fixtureEvidence = fixtureBeatBudgets.map((budget, index) => { const numerator = BigInt(budget.duration.value) * BigInt(sourceTimescale); assert.equal(numerator % BigInt(budget.duration.timescale), 0n, "current Duration Beat must be exactly representable by the real source timebase"); const durationPts = Number(numerator / BigInt(budget.duration.timescale)), candidate = { evidence_id: `product-electron-current-${index + 1}`, analysis_type: "scene", asset_id: original.asset_id, start_pts: sourceCursor, end_pts: sourceCursor + durationPts, timescale: sourceTimescale, evidence_version: 1, review_status: "candidate", label: `current exact ${budget.role_id} Evidence ${index + 1}` }; sourceCursor += durationPts; preparationHost.registerEvidence(candidate); return candidate; });
  for (const candidate of fixtureEvidence) await human.approveEvidence(preparationHost, `approval-product-electron-evidence-${candidate.evidence_id}`, candidate);
  assert.equal(sourceCursor - fixtureSourceStart, 60 * sourceTimescale, "Product Evidence must cover exactly 60 seconds at unit speed");
  const fixtureEvidenceIds = fixtureEvidence.map((candidate) => candidate.evidence_id);
  evidence = (await preparationHost.readStage2Workspace() as any).evidence.filter((item: any) => fixtureEvidenceIds.includes(item.object_id) && item.status === "approved"); assert.equal(evidence.length, fixtureBeatBudgets.length, "current Product fixture must approve one exact Evidence range per planned Beat");
  const pack = await preparationHost.assembleMaterialEvidencePack({ pack_id: "pack-product-electron", contract_ref: contractRef, evidence_ids: evidence.map((item: any) => item.object_id), coverage_matrix: { schema_version: 1, matrix_id: "coverage-product-electron", rows: contract.requirements.map((requirement: any) => ({ requirement_id: requirement.requirement_id, evidence_ids: evidence.map((item: any) => item.object_id), status: "covered" })) }, expected_media_verified_at: { [original.asset_id]: original.verified_at }, policy_version: "knowledge-v1", timeline_version: initial.timeline.version, created_at: "2026-08-24T12:00:00Z" }) as any;
  const packRef = { object_id: pack.value.pack_id, object_version: 1, digest: pack.object_hash };
  const definition = builtInCreativeSkillDefinitions.find((item) => item.status === "published")!; preparationHost.pinBuiltInCreativeSkillDefinition(definition.skill_id, definition.skill_version);
  const evaluation = await preparationHost.evaluateCreativeSkillKnowledge({ evaluation_id: "evaluation-product-electron", definition_ref: { object_id: definition.skill_id, object_version: definition.skill_version, digest: definition.definition_digest }, contract_ref: contractRef, material_pack_ref: packRef, context_tags: ["personal-story", "reaction-evidenced"], parameter_values: { intensity: "moderate" }, evaluated_at: "2026-08-24T12:01:00Z" }) as any;
  const evaluationRef = { object_id: evaluation.value.evaluation_id, object_version: 1, digest: evaluation.object_hash };
  const feasibility = await preparationHost.evaluateDurationBlueprint({ feasibility_id: "duration-product-electron", blueprint_ref: { object_id: blueprint.blueprint_id, object_version: 1, digest: blueprint.definition_digest }, contract_ref: contractRef, material_pack_ref: packRef, evaluated_at: "2026-08-24T12:02:00Z" }) as any;
  const durationRef = { object_id: feasibility.value.feasibility_id, object_version: 1, digest: feasibility.object_hash };
  const directionA = await preparationHost.createStoryDirection({ direction_id: "direction-product-electron-a", title: "证据驱动的抵达", thesis: "用真实镜头把目标、转折和抵达连成一条线", contract_ref: contractRef, material_pack_ref: packRef, skill_evaluation_refs: [evaluationRef], duration_feasibility_ref: durationRef, expected_benefits: ["结尾回应开场"], risks: [], alternatives: [], confidence: { score: 0.95, basis: ["当前证据覆盖硬约束"] }, created_at: "2026-08-24T12:03:00Z" }) as any;
  await preparationHost.createStoryDirection({ direction_id: "direction-product-electron-b", title: "安静的时间顺序", thesis: "按拍摄顺序保留旅程", contract_ref: contractRef, material_pack_ref: packRef, skill_evaluation_refs: [evaluationRef], duration_feasibility_ref: durationRef, expected_benefits: ["顺序直观"], risks: ["转折偏弱"], alternatives: [], confidence: { score: 0.7, basis: ["时间证据完整"] }, created_at: "2026-08-24T12:03:00Z" });
  const directionWorkspace = await preparationHost.readStage2Workspace() as any;
  const selectedDirection = await preparationHost.performStage2ProductAction(human.credential, { action: "direction.select", workspace_digest: directionWorkspace.workspace_digest, reason: "选择证据更完整的当前方向", selected_id: directionA.value.direction_id }) as any;
  const directionRef = { object_id: selectedDirection.direction.value.direction_id, object_version: 2, digest: selectedDirection.direction.object_hash }, evidenceRef = (index: number) => ({ object_id: evidence[index].object_id, object_version: evidence[index].object_version, digest: evidence[index].digest });
  const plannedBeats = allocateDurationBeatBudgets(feasibility.value); assert.ok(evidence.length >= plannedBeats.length, "retained real project must provide enough approved Evidence for the current Duration plan");
  const beat = (id: string, role: string, duration: { schema_version: 1; value: number; timescale: number }, index: number, requirement: string, entry: string, exit: string): StoryBeatCandidate => ({ beat_id: id, role, purpose: `${role} purpose`, target_duration: duration, evidence_refs: [evidenceRef(index)], alternative_evidence_refs: [], coverage_requirement_ids: [requirement], entry_state: entry, exit_state: exit, desired_emotion: role === "ending" ? "satisfied" : "curious", continuity_constraints: ["preserve state"], confidence: { score: 0.9, basis: ["approved evidence"] }, reason: "evidence supports beat", risks: [], unresolved_assumptions: [] });
  const storyCommon = { direction_ref: directionRef, contract_ref: contractRef, material_pack_ref: packRef, skill_evaluation_refs: [evaluationRef], duration_feasibility_ref: durationRef, risks: [], alternatives: [], created_at: "2026-08-24T12:04:00Z" } as const;
  const storyBeats = (prefix: string, evidenceOrder: readonly number[]) => plannedBeats.map((budget, index) => beat(`${prefix}-${budget.role_id}-${budget.role_beat_index + 1}`, budget.role_id, budget.duration, evidenceOrder[index]!, contract.requirements[index % contract.requirements.length]!.requirement_id, index === 0 ? "unknown" : `state-${index}`, index === plannedBeats.length - 1 ? "resolved" : `state-${index + 1}`));
  const remainingEvidenceRefs = [...pack.value.evidence_refs], chronologicalEvidenceOrder = plannedBeats.map((budget) => { const matchingIndex = remainingEvidenceRefs.findIndex((reference: any) => (BigInt(reference.range.end.value) - BigInt(reference.range.start.value)) * BigInt(budget.duration.timescale) === BigInt(budget.duration.value) * BigInt(reference.range.start.timescale)); assert.ok(matchingIndex >= 0, `current Duration Beat ${budget.role_id}/${budget.role_beat_index + 1} needs an exact approved Evidence range`); const [reference] = remainingEvidenceRefs.splice(matchingIndex, 1), workspaceIndex = evidence.findIndex((candidate: any) => candidate.object_id === reference!.evidence_id && candidate.object_version === reference!.evidence_version && candidate.digest === reference!.content_digest); assert.ok(workspaceIndex >= 0, "Material Evidence Pack ref must remain visible in the current workspace"); return workspaceIndex; }), equalDurationAlternativeOrder = plannedBeats.map((budget, index) => { const matches = plannedBeats.map((candidate, candidateIndex) => ({ candidate, candidateIndex })).filter(({ candidate }) => candidate.duration.value === budget.duration.value && candidate.duration.timescale === budget.duration.timescale).map(({ candidateIndex }) => candidateIndex); return chronologicalEvidenceOrder[matches[matches.length - matches.indexOf(index) - 1]!]!; });
  const proposalA = await preparationHost.proposeStoryV2({ ...storyCommon, proposal_id: "proposal-product-electron-a", thesis: selectedDirection.direction.value.thesis, audience_promise: "看见目标、变化与抵达", beats: storyBeats("current", chronologicalEvidenceOrder) }) as any;
  await preparationHost.proposeStoryV2({ ...storyCommon, proposal_id: "proposal-product-electron-b", thesis: "等时长证据顺序备选", audience_promise: "在同长证据内调整顺序", beats: storyBeats("alternative", equalDurationAlternativeOrder) });
  const storyWorkspace = await preparationHost.readStage2Workspace() as any;
  const selectedStory = await preparationHost.performStage2ProductAction(human.credential, { action: "story.approve", workspace_digest: storyWorkspace.workspace_digest, reason: "批准当前证据闭合的故事", selected_id: proposalA.value.proposal_id }) as any;
  const intent = await preparationHost.generateEditorialIntent({
    plan_id: selectedStory.plan.value.plan_id,
    decision_ids: [selectedStory.decision.value.decision_id],
    capability_snapshot_id: "capabilities-product-electron",
    intent_id: "intent-product-electron-current",
    operations: selectedStory.plan.value.beats.map((beat: any, index: number) => ({ operation_id: `select-product-electron-${index + 1}`, kind: "select_evidence", target_refs: [`beat:${beat.beat_id}`, `evidence:${beat.evidence_refs[0].object_id}`], parameter_values: { priority: index + 1 }, expected_effect: "把已批准的真实素材证据追加为当前可审阅镜头", required_capabilities: ["semantic-evidence-selection"], unsupported_policy: "block" })),
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
  assertCanonicalStage2Timeline(timeline);
  const outputTrack = timeline.tracks.find((track: any) => track.track_id === "video-main");
  assert.equal(outputTrack.clips.length, plannedBeats.length);
  assert.equal(original.asset_id, outputTrack.clips[0].source.asset_id);
  const preRenderWorkspace = await preparationHost.readStage2Workspace() as any;
  await preparationHost.renderStage2ProductExecution({ workspace_digest: preRenderWorkspace.workspace_digest, execution_id: execution.execution_id });
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
const config = { extends: "./tsconfig.base.json", compilerOptions: { noEmit: false, outDir: outputRoot, rootDir: root, declaration: false, sourceMap: false }, include: ["apps/desktop/src/**/*.ts", "packages/**/*.ts", "tests/integration/electron-stage2-harness.ts"] };

async function runElectron(markerPrefix: string, mode: "product" | "reopen", feedbackIntentId?: string): Promise<any> {
  const harnessArguments = ["--no-sandbox", resolve(outputRoot, "tests/integration/electron-stage2-harness.js"), `--ave-harness-mode=${mode}`, `--ave-harness-project=${workProject}`, `--ave-harness-review-dir=${reviewDirectory}`];
  if (feedbackIntentId) harnessArguments.push(`--ave-harness-feedback-intent=${feedbackIntentId}`);
  const child = spawn(electron, harnessArguments, { cwd: outputRoot, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "";
  const line = await new Promise<string>((done, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${markerPrefix} timed out\nstdout:\n${stdout}\nstderr:\n${stderr}`)); }, 60000);
    child.stdout.on("data", (chunk) => { stdout += chunk; const marker = stdout.split(/\r?\n/).find((value) => value.startsWith(markerPrefix)); if (marker) { clearTimeout(timer); done(marker); } });
    child.stderr.on("data", (chunk) => { stderr += chunk; if (stderr.includes("AVE_ELECTRON_PRODUCT_REVIEW_FAILED")) { clearTimeout(timer); child.kill(); reject(new Error(stderr)); } });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
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

  const result = await runElectron("AVE_ELECTRON_PRODUCT_REVIEW ", "product");
  await writeFile(resolve(reviewDirectory, "PRODUCT-WORKSPACE-OBSERVATION.json"), JSON.stringify(result, null, 2));
  assert.deepEqual(result.native_feedback_confirmations, ["feedback.create", `feedback.reject:${result.journey.feedback_intent_id}`]);
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
  assert.ok(Math.abs(result.journey.preview_duration - 60) <= 0.08, "real Product Preview must retain the complete approved 60-second Story");
  assert.ok(result.journey.preview_played_seconds > 0.15);
  assert.equal(result.journey.feedback_preview_visible, true);
  assert.equal(result.journey.dual_id_payload_closed, true);
  assert.equal(result.journey.dual_id_timeline_unchanged, true);
  assert.equal(result.journey.dual_id_approval_unchanged, true);
  assert.equal(result.journey.feedback_decision, "rejected");
  assert.equal(result.journey.feedback_decision_visible, true);
  assert.equal(result.journey.feedback_decision_timeline_unchanged, true);
  assert.match(result.journey.feedback_rejection_decision_id, /^permission:gate-feedback_revision\.reject-/);
  assert.equal(result.journey.decided_feedback_preview_cleared, true);
  assert.equal(result.journey.current_media_preview_retained, true);
  assert.equal(result.journey.current_preview_action_available, true);
  assert.equal(result.journey.stale_preview_query_closed, true);
  assert.equal(result.journey.invalid_payload_closed, true);
  assert.equal(result.journey.timeline_version, result.journey.before_timeline_version);
  assert.equal(result.journey.render_binding, "current");
  assert.equal(result.journey.feedback_status, "rejected");
  for (const path of result.captures) assert.ok((await stat(path)).size > 10_000, `review capture is too small: ${path}`);

  const reopened = await runElectron("AVE_ELECTRON_PRODUCT_REOPEN ", "reopen", result.journey.feedback_intent_id);
  assert.equal(reopened.project_id, result.journey.project_id);
  assert.equal(reopened.timeline_version, result.journey.timeline_version);
  assert.equal(reopened.workspace_digest, result.journey.workspace_digest);
  assert.equal(reopened.render_binding, "current");
  assert.deepEqual(reopened.stale_intent_ids, result.journey.stale_intent_ids, "reopen must preserve historical staleness without introducing new stale intents");
  assert.equal(reopened.current_execution_id, result.journey.current_execution_id);
  assert.equal(reopened.feedback_status, "rejected");
  assert.equal(reopened.feedback_rejection_decision_id, result.journey.feedback_rejection_decision_id);
  await writeFile(resolve(reviewDirectory, "PRODUCT-WORKSPACE-REVIEW.json"), JSON.stringify({ ...result, reopened }, null, 2));
  console.log(`STAGE2_PRODUCT_REVIEW_ROOT=${resolve(reviewDirectory)}`);
} finally {
  await rm(tsconfig, { force: true });
  await rm(outputRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

console.log("Stage 2 Product real Electron interaction, Preview, feedback, recovery and reopen check passed");
