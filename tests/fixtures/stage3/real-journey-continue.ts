import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { observeRealMotion } from "./real-motion.js";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { armExactExport, armExactFileSelection, buildRealDesktop, reuseRealDesktop, launchRealDesktop } from "./real-electron.js";
import { armConfirmation, readConfirmationAudit, readProjectProof, realJourney } from "./real-journey.js";
import { digestFile, readPublicMedia } from "./real-public-media.js";

const n = (value: string | number) => Number(typeof value === "string" ? value.replace(/n$/, "") : value);
const integer = (value: string | number) => BigInt(typeof value === "string" ? value.replace(/n$/, "") : value);
export function assertExactDuration(facts: any, seconds: number): void {
  assert.ok(Number.isSafeInteger(seconds), "Frozen duration target must be exact integer seconds");
  const end = facts.video.reduce((maximum: bigint, clip: any) => { const value = integer(clip.timeline_start) + integer(clip.timeline_duration); return value > maximum ? value : maximum; }, 0n);
  assert.equal(end * integer(facts.timeline.sequence.timebase.value), BigInt(seconds) * integer(facts.timeline.sequence.timebase.timescale), "Encoded timeline target must equal the frozen rational duration exactly");
}
const selectionOrder = (facts: any) => facts.source_map.map((item: any) => ({ asset_id: item.asset_id, start_seconds: n(item.source_start_pts) / n(item.source_timescale) }));
const observationCount = (proof: any, requestId: string) => proof.objects.filter((item: any) => item.object_type === "creation_observation" && item.value.ticket.request_id === requestId).length;
export function readProfileProof(userData: string): any {
  const db = new DatabaseSync(resolve(userData, "creator-profile/user-profile.sqlite"), { readOnly: true });
  try { return JSON.parse((db.prepare("SELECT content FROM profile_state WHERE id=1").get() as any).content); } finally { db.close(); }
}
export function verifyPlanningRounds(root: any, audit: any, calls: any[]): any {
  const stable = (value: any): any => Array.isArray(value) ? value.map(stable) : value !== null && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  const hash = (value: any) => createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
  assert.ok(["planning-exchange-v2", "planning-exchange-v3"].includes(audit.protocol));
  const version = audit.protocol === "planning-exchange-v3" ? 3 : 2;
  assert.equal(root.context.planning.protocol, audit.protocol);
  assert.equal(audit.root_input_digest, hash(root)); assert.ok(audit.rounds.length >= 2 && audit.rounds.length <= 3); assert.equal(calls.length, audit.rounds.length);
  const prior: any[] = [];
  let resolvedDecision: any;
  const receiptDigest = (item: any) => hash({ protocol: "planning-exchange-v3", root_input_digest: hash(root), query: item.exchange, measurement: item.measurement });
  for (const [index, round] of audit.rounds.entries()) {
    const transformed = new Set(["output_schema", "source_choice_catalog", "weighted_anchor_options", "capacity_budget", "edit_grids", "decision_fields", "generation_binding", "task", "edit_grid_rules", "source_spans"]);
    for (const [key, value] of Object.entries(root.context)) if (!transformed.has(key)) assert.deepEqual(round.input.context[key], value, `Round root context field ${key} must stay bound`);
    assert.deepEqual(round.input.media, root.media);
    assert.deepEqual(round.input.context.source_spans.map((span: any) => { const original = root.context.source_spans.find((item: any) => item.span_id === span.span_id); assert.ok(original); for (const item of span.observations.filter((item: any) => item.kind === "visual")) { const options = root.context.source_choice_catalog.filter((option: any) => option.option_id === item.option_id); assert.equal(options.length, 1); assert.deepEqual(item, { kind: "visual", ...options[0] }); } return { ...span, observations: span.observations.map((item: any) => item.kind === "visual" ? original.observations.find((source: any) => source.evidence_id === item.evidence_id) : item) }; }), root.context.source_spans);
    assert.equal(round.input_hash, hash(round.input)); assert.equal(round.input.context.planning_exchange.root_input_digest, audit.root_input_digest); assert.equal(round.input.context.planning_exchange.round, index + 1); assert.deepEqual(round.input.context.planning_exchange.exchanges, prior);
    if (root.context.planning_query_identity === "host-root-round-v1") {
      const assigned = `measure:${audit.root_input_digest.slice(0, 32)}:${index + 1}`;
      assert.equal(round.input.context.planning_exchange.assigned_query_id, assigned);
      assert.deepEqual(round.input.context.planning_exchange.feasible_query_ids, prior.filter(item => item.measurement.capacity_feasible && item.measurement.pacing_feasible !== false).map(item => item.exchange.query_id));
      if (version === 3) assert.deepEqual(round.input.context.planning_exchange.feasible_receipts, prior.filter(item => item.measurement.capacity_feasible && item.measurement.pacing_feasible !== false).map(item => ({ query_id: item.exchange.query_id, measurement_receipt_digest: receiptDigest(item), selection_ids: item.exchange.selection.map((selection: any) => selection.selection_id) })));
      if (round.exchange.kind === "measure_selection") assert.equal(round.exchange.query_id, assigned, "Measurement ID must come from the actual Host-bound round");
      else assert.ok(round.input.context.planning_exchange.feasible_query_ids.includes(round.exchange.measured_query_id));
    }
    assert.equal(calls[index].input_digest, audit.root_input_digest); assert.equal(calls[index].attempt, index + 1); assert.equal(calls[index].settlement.status, "response"); assert.equal(calls[index].settlement.output_digest, hash(round.exchange)); assert.equal(calls[index].wire_digest, round.transport.wire_digest); assert.equal(calls[index].input_bytes, round.transport.input_bytes); assert.equal(calls[index].target.role, "planner");
    assert.equal(createHash("sha256").update(round.provider_output.payload).digest("hex"), round.provider_output.sha256); assert.equal(Buffer.byteLength(round.provider_output.payload), round.provider_output.utf8_bytes); assert.deepEqual(JSON.parse(round.provider_output.payload), round.exchange);
    assert.equal(round.exchange.exchange_version, version);
    if (round.exchange.kind === "final") {
      assert.equal(index, audit.rounds.length - 1); const measured = prior.find(item => item.exchange.query_id === round.exchange.measured_query_id); assert.ok(measured?.measurement.capacity_feasible); assert.notEqual(measured.measurement.pacing_feasible, false);
      if (version === 2) {
        assert.equal(round.exchange.decision.target_duration_ticks, measured.exchange.target_duration_ticks); assert.deepEqual(round.exchange.decision.shots.map((shot: any) => ({ selection_id: shot.shot_id, source_choice: shot.source_choice, timing: shot.timing })), measured.exchange.selection);
      } else {
        assert.deepEqual(Object.keys(round.exchange).sort(), ["creative", "exchange_version", "kind", "measured_query_id", "measurement_receipt_digest"]);
        assert.equal(round.exchange.measurement_receipt_digest, receiptDigest(measured));
        const creative = round.exchange.creative;
        assert.deepEqual(Object.keys(creative).sort(), ["applied_principle_ids", "audio", "captions", "change_summary", "feedback_interpretation", "preserve_refs", "shots", "thesis"]);
        assert.deepEqual(creative.shots.map((shot: any) => shot.shot_id).sort(), measured.exchange.selection.map((item: any) => item.selection_id).sort());
        for (const shot of creative.shots) assert.deepEqual(Object.keys(shot).sort(), ["color", "embedded_gain_db", "purpose", "reframe", "shot_id"]);
        resolvedDecision = { decision_version: 1, target_duration_ticks: measured.exchange.target_duration_ticks, ...creative, shots: measured.exchange.selection.map((item: any) => {
          const decoration = creative.shots.find((shot: any) => shot.shot_id === item.selection_id);
          const source_window = item.source_choice.kind === "catalog_option" ? root.context.source_choice_catalog.find((option: any) => option.option_id === item.source_choice.option_id).source_window : item.source_choice.source_window;
          return { ...decoration, source_window, timing: item.timing };
        }) };
      }
      continue;
    }
    assert.equal(round.exchange.kind, "measure_selection"); assert.ok(index < 2);
    const grid = root.context.timeline.sequence.timebase, result = round.measurement;
    const capacities = round.exchange.selection.map((item: any) => { const choices = item.source_choice.kind === "catalog_option" ? root.context.source_choice_catalog.filter((option: any) => option.option_id === item.source_choice.option_id) : null; if (choices) assert.equal(choices.length, 1); const window = choices ? choices[0].source_window : item.source_choice.source_window; assert.ok(window); const span = root.context.source_spans.find((candidate: any) => candidate.span_id === window.span_id && candidate.asset_id === window.asset_id); assert.ok(span); const start = window.start, end = window.end; assert.ok(BigInt(start.value) * BigInt(span.editable_start.timescale) >= BigInt(span.editable_start.value) * BigInt(start.timescale)); assert.ok(BigInt(end.value) * BigInt(span.editable_end.timescale) <= BigInt(span.editable_end.value) * BigInt(end.timescale)); const numerator = (BigInt(end.value) * BigInt(start.timescale) - BigInt(start.value) * BigInt(end.timescale)) * BigInt(grid.timescale); const denominator = BigInt(start.timescale) * BigInt(end.timescale) * BigInt(grid.value); if (item.timing.kind === "exact") assert.equal(numerator % denominator, 0n); return numerator / denominator; });
    let sum = 0n, minimum = 0n, exact = 0n;
    for (const [i, capacity] of capacities.entries()) { const item = round.exchange.selection[i]; assert.equal(result.selection[i].selection_id, item.selection_id); assert.equal(result.selection[i].capacity_ticks, String(capacity)); sum += capacity; minimum += item.timing.kind === "exact" ? capacity : 1n; if (item.timing.kind === "exact") exact += capacity; }
    const target = BigInt(round.exchange.target_duration_ticks); assert.equal(result.total_capacity_ticks, String(sum)); assert.equal(result.deficit_ticks, String(target > sum ? target - sum : 0n)); assert.equal(result.minimum_required_ticks, String(minimum)); assert.equal(result.exact_reserved_ticks, String(exact)); assert.equal(result.capacity_feasible, minimum <= target && target <= sum && capacities.every((value: bigint) => value >= 1n)); assert.equal(result.final_validation_required, true);
    prior.push({ exchange: round.exchange, measurement: result });
  }
  assert.equal(audit.rounds.at(-1).exchange.kind, "final");
  return resolvedDecision;
}
export function timelineFacts(proof: any, draftId?: string): any {
  const request = proof.requests.at(-1), draft = request.drafts.find((item: any) => item.draft_id === (draftId ?? request.latest_draft_id));
  assert.ok(draft, "Expected a persisted actual draft");
  const timeline = proof.objects.find((item: any) => item.object_type === "timeline_snapshot" && item.version === draft.timeline_version)?.value;
  assert.ok(timeline); const unit = n(timeline.sequence.timebase.value) / n(timeline.sequence.timebase.timescale);
  const video = timeline.tracks.filter((track: any) => track.kind === "video").flatMap((track: any) => track.clips).sort((a: any, b: any) => n(a.timeline_start) - n(b.timeline_start));
  const end = Math.max(...video.map((clip: any) => n(clip.timeline_start) + n(clip.timeline_duration)));
  for (const clip of video) assert.ok(clip.source?.asset_id && n(clip.source.end_pts) > n(clip.source.start_pts) && n(clip.source.timescale) > 0, "Actual clip must have an explicit positive source PTS range");
  return { draft, timeline, video, seconds: end * unit, unit, source_map: video.map((clip: any) => ({ asset_id: clip.source.asset_id, source_start_pts: clip.source.start_pts, source_end_pts: clip.source.end_pts, source_timescale: clip.source.timescale, timeline_start: clip.timeline_start, timeline_duration: clip.timeline_duration })) };
}
export async function validateRenderedProof(projectRoot: string, proof: any, draft: any): Promise<any> {
  const receipt = proof.objects.filter((item: any) => item.object_type === "creation_render" && item.value.draft_id === draft.draft_id).at(-1)?.value;
  assert.ok(receipt, "Actual Preview/Master receipt is required");
  const objectPath = (hash: string) => resolve(projectRoot, "objects/sha256", hash.slice(0, 2), hash);
  assert.equal(await digestFile(objectPath(receipt.bundle.object_hash)), receipt.bundle.object_hash);
  const bundle = JSON.parse(await readFile(objectPath(receipt.bundle.object_hash), "utf8"));
  const plans = bundle.manifests.filter((item: any) => item.manifest_type === "execution_plan").map((item: any) => item.value);
  const preview = plans.find((item: any) => item.target === "preview"), master = plans.find((item: any) => item.target === "master");
  assert.ok(preview && master); assert.notEqual(preview.plan_id, master.plan_id);
  assert.equal(preview.semantic_graph_hash, master.semantic_graph_hash); assert.equal(preview.semantic_graph_payload, master.semantic_graph_payload); assert.equal(preview.semantic_graph_hash, receipt.semantic_graph_hash);
  for (const target of ["preview", "master"]) {
    assert.equal(receipt[target].qc_report.status, "passed");
    const output = bundle.manifests.find((item: any) => item.manifest_type === "output_manifest" && item.value.target === target)?.value;
    assert.equal(output?.semantic_graph_hash, receipt.semantic_graph_hash); assert.equal(output?.output_hash, receipt[target].output_hash); assert.equal(output?.execution_plan_id, receipt[target].plan_id);
    const path = objectPath(receipt[target].output_hash); assert.equal(await digestFile(path), receipt[target].output_hash);
    const decoded = spawnSync("ffmpeg", ["-v", "error", "-i", path, "-f", "null", "-"], { windowsHide: true, encoding: "utf8" }); assert.equal(decoded.status, 0, decoded.stderr);
  }
  return receipt;
}

/** Review copies derive only from verified encoded objects; they never enter production input. */
export async function saveRenderedReview(projectRoot: string, attemptRoot: string, facts: any, receipt: any): Promise<void> {
  const folder = resolve(attemptRoot, `review-v${facts.draft.timeline_version}`); await mkdir(folder, { recursive: true });
  for (const target of ["preview", "master"]) {
    const hash = receipt[target].output_hash, output = resolve(folder, `${target}.mp4`);
    await copyFile(resolve(projectRoot, "objects/sha256", hash.slice(0, 2), hash), output); assert.equal(await digestFile(output), hash);
  }
  const frames = [];
  for (let index = 0; index < facts.video.length; index++) {
    const clip = facts.video[index], seconds = (n(clip.timeline_start) + n(clip.timeline_duration) / 2) * facts.unit, name = `shot-${String(index + 1).padStart(2, "0")}.png`;
    const result = spawnSync("ffmpeg", ["-v", "error", "-ss", String(seconds), "-i", resolve(folder, "preview.mp4"), "-frames:v", "1", "-vf", "scale=640:-1", resolve(folder, name)], { windowsHide: true, encoding: "utf8" }); assert.equal(result.status, 0, result.stderr);
    frames.push({ file: name, encoded_preview_time_seconds: seconds, source: facts.source_map[index] });
  }
  await writeFile(resolve(folder, "source-map.json"), JSON.stringify({ draft_id: facts.draft.draft_id, timeline_version: facts.draft.timeline_version, semantic_graph_hash: receipt.semantic_graph_hash, seconds: facts.seconds, preview_hash: receipt.preview.output_hash, master_hash: receipt.master.output_hash, frames, visual_review: "Frames saved for independent opening; this file does not assert subjective acceptance." }, null, 2));
}

/** A phase is explicit and durable. Failure stops it; no phase auto-retries a failed model call. */
export async function continueRealJourney(repository: string, reviewRoot: string, journeyRoot: string, modelConfig: string, phase: string): Promise<void> {
  assert.ok(["profile-controls", "feedback", "resume-feedback", "review-feedback", "repair-feedback", "review-repaired-feedback", "resume-existing-feedback", "inspect-learning-failure", "alternate", "relative-shorter", "versions", "caption", "retry-caption", "export-reopen", "held-out", "opposite", "retry-opposite", "repair-opposite", "retry-repair-opposite", "exception", "correction", "resume-correction", "resume-explicit-correction", "forget", "after-forget", "after-forget-feedback", "after-forget-export-reopen", "interrupt", "review-interrupt", "cancel", "sound-feedback", "review-sound", "inspect-speech-states", "motion-review", "speech-export-reopen", "color-feedback", "repair-color-feedback", "framing-feedback", "performance", "resume-performance-render", "performance-feedback", "retry-performance-feedback", "retry-held-out", "retry-cold", "retry-speech", "renew-cold", "renew-speech", "renew-held-out", "renew-performance", "caption-layout", "resume-held-out-render", "review-held-out", "retry-renew-performance", "resume-render"].includes(phase), "Unknown frozen journey phase");
  const attemptRoot = resolve(journeyRoot, `phase-${phase}-${Date.now()}`), userData = resolve(journeyRoot, "test-user-data");
  await mkdir(attemptRoot, { recursive: true });
  await writeFile(resolve(attemptRoot, "frozen-test-role-and-targets.json"), JSON.stringify({ phase, frozen_before_app_launch: new Date().toISOString(), test_role: realJourney, boundary: "Evaluator targets and source labels stay local; only the relevant natural prompt and normal visible UI choices enter the product. This is not a prefilled profile." }, null, 2), { flag: "wx" });
  const manifest = await readPublicMedia(reviewRoot), config = JSON.parse(await readFile(modelConfig, "utf8"));
  const learnedRoot = resolve(journeyRoot, "project-learning"), heldRoot = resolve(journeyRoot, "project-held-out");
  let projectRoot = ["profile-controls", "feedback", "resume-feedback", "review-feedback", "repair-feedback", "review-repaired-feedback", "resume-existing-feedback", "inspect-learning-failure", "alternate", "relative-shorter", "versions", "caption", "retry-caption", "interrupt", "review-interrupt", "cancel", "retry-cold", "renew-cold", "resume-render"].includes(phase) ? learnedRoot : heldRoot;
  if (["sound-feedback", "review-sound", "inspect-speech-states", "motion-review", "speech-export-reopen", "color-feedback", "repair-color-feedback", "framing-feedback", "retry-speech", "renew-speech"].includes(phase)) projectRoot = resolve(journeyRoot, "project-speech");
  if (["performance", "resume-performance-render", "performance-feedback", "retry-performance-feedback", "renew-performance", "retry-renew-performance", "caption-layout"].includes(phase)) projectRoot = resolve(journeyRoot, "project-performance");
  if (["after-forget", "after-forget-feedback", "after-forget-export-reopen"].includes(phase)) projectRoot = resolve(journeyRoot, "project-after-forget");
  const report: any = { identity: realJourney.identity, phase, started_at: new Date().toISOString(), result: "running", operations: [], errors: [], authorizations: [] };
  const save = async () => writeFile(resolve(attemptRoot, "result.json"), JSON.stringify(report, null, 2));
  const log = async (action: string, proof: unknown = null) => { report.operations.push({ action, proof, at: new Date().toISOString() }); await save(); console.log(`${phase}: ${action} ${attemptRoot}`); };
  let app: any, page: any;
  try {
    const entrypoint = process.env.AVE_REAL_REUSE_BUILD_ROOT ? await reuseRealDesktop(reviewRoot, process.env.AVE_REAL_REUSE_BUILD_ROOT, attemptRoot) : await buildRealDesktop(repository, attemptRoot);
    app = await launchRealDesktop(repository, reviewRoot, attemptRoot, entrypoint, userData, modelConfig); page = await app.firstWindow();
    if (phase === "export-reopen" || phase === "speech-export-reopen" || phase === "after-forget-export-reopen") {
      const existing = timelineFacts(await readProjectProof(projectRoot));
      await armExactExport(app, { title: "导出所选作品", defaultPath: `AVE-v${existing.draft.timeline_version}.mp4`, filters: [{ name: "MP4 视频", extensions: ["mp4"] }] }, resolve(attemptRoot, `review-v${existing.draft.timeline_version}.mp4`));
    }
    page.on("pageerror", (error: Error) => report.errors.push({ message: error.message, stack: error.stack }));
    let rail = page.getByRole("navigation", { name: "工作台导航" });
    const view = async (name: string) => {
      const target = name === "档案" ? "profile" : name, panel = page.locator(".stage2-workspace");
      if (await panel.getAttribute("data-view") !== target || !await panel.isVisible() || await panel.evaluate((node: HTMLElement) => node.inert)) {
        if (target === "profile") await rail.getByRole("button", { name: "档案", exact: true }).click();
        else if (target === "material") await page.locator('[data-creation-view="material"]').click();
        else { const toggle = rail.getByRole("button", { name: "对话", exact: true }); if (await toggle.getAttribute("aria-pressed") !== "true") await toggle.click(); await page.locator(`[data-creation-view="${target}"]`).click(); }
      }
      await page.waitForFunction((expected: string) => { const panel = document.querySelector(".stage2-workspace") as HTMLElement | null; return panel?.dataset.view === expected && !panel.inert && panel.getBoundingClientRect().width > 0; }, target);
      if (target === "profile") await page.locator('[data-creation-form="profile-query"] [name="contexts"]').waitFor({ state: "visible" });
    };
    const capture = async (name: string) => { await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(item => item.effect?.getTiming().iterations !== Infinity).map(item => item.finished.catch(() => undefined))); }); await page.screenshot({ path: resolve(attemptRoot, `${name}.png`) }); };
    const captureDesktopSizes = async (name: string) => {
      const original = await app.evaluate(({ BrowserWindow }: any) => BrowserWindow.getAllWindows()[0].getContentSize());
      const conversationWasOpen = await rail.getByRole("button", { name: "对话", exact: true }).getAttribute("aria-pressed") === "true";
      const originalTab = await page.locator(".stage2-workspace").getAttribute("data-view");
      for (const width of [1440, 1000]) {
        await app.evaluate(({ BrowserWindow }: any, size: number) => BrowserWindow.getAllWindows()[0].setContentSize(size, 900), width);
        await page.waitForFunction((expected: number) => window.innerWidth === expected, width);
        if (conversationWasOpen && /failure|failed-request/.test(name) && !await page.getByRole("dialog", { name: "导出作品", exact: true }).isVisible()) {
          if (await rail.getByRole("button", { name: "对话", exact: true }).getAttribute("aria-pressed") !== "true") await rail.getByRole("button", { name: "对话", exact: true }).click();
          if (originalTab) await view(originalTab);
        }
        await capture(`${name}-${width}`);
      }
      await app.evaluate(({ BrowserWindow }: any, size: number[]) => BrowserWindow.getAllWindows()[0].setContentSize(size[0], size[1]), original);
      if (!await page.getByRole("dialog", { name: "导出作品", exact: true }).isVisible()) {
        if (conversationWasOpen && await rail.getByRole("button", { name: "对话", exact: true }).getAttribute("aria-pressed") !== "true") await rail.getByRole("button", { name: "对话", exact: true }).click();
        if (conversationWasOpen && originalTab) await view(originalTab);
      }
    };
    const waitUntil = async (check: () => Promise<boolean> | boolean, label: string, timeout = 60000) => {
      const until = Date.now() + timeout;
      while (Date.now() < until) {
        if (await check()) return;
        const notice = await page.locator('[role="status"]').innerText();
        if (/^[A-Z][A-Z0-9_]+:/.test(notice)) throw new Error(`REAL_PRODUCT_FAILURE: ${label}; ${notice}`);
        await page.waitForTimeout(500);
      }
      throw new Error(`REAL_UI_TIMEOUT: ${label}; notice=${await page.locator('[role="status"]').innerText()}`);
    };
    const openProject = async (root: string) => {
      await armExactFileSelection(app, ["openDirectory"], [root]);
      await page.getByRole("button", { name: "打开作品", exact: true }).click();
      await page.locator('[data-creation-form="begin"]').waitFor({ state: "attached" });
      await page.waitForFunction(() => { const badge = document.querySelector(".stage2-workspace .badge"); return Boolean(badge?.textContent && badge.textContent !== "尚未读取工作区"); }, undefined, { timeout: 120000 });
      await log("opened-project", { root, workspace_badge: await page.locator(".stage2-workspace .badge").innerText(), restored_view: await page.locator(".stage2-workspace").getAttribute("data-view") });
    };
    if (phase === "held-out" || phase === "performance" || phase === "after-forget") {
      const profile = readProfileProof(userData);
      if (phase !== "after-forget") assert.ok(profile.principles.length > 0, "Held-out personalization requires genuinely learned principles");
      else assert.ok(profile.excluded_sources.includes(JSON.parse(await readFile(resolve(learnedRoot, "project.json"), "utf8")).project_id), "The learned source must already be globally forgotten before the new project is created");
      await writeFile(resolve(attemptRoot, "profile-before-held-out.json"), JSON.stringify(profile, null, 2));
      await mkdir(projectRoot);
      await armExactFileSelection(app, ["openDirectory", "createDirectory"], [projectRoot]); await page.getByRole("button", { name: "新建作品", exact: true }).click();
      await rail.getByRole("button", { name: "素材", exact: true }).click();
      const sources = phase === "performance" ? [{ id: "D01", local_file: resolve(reviewRoot, "public-media/source-D01.mp4"), sha256: "c867d05090780b6f54aa4b57ba247c9ca50300707540ec2592e6ffaef1d288a2" }] : manifest.sources.filter((item: any) => item.partition === "held-out" && (phase !== "after-forget" || item.id === "B02"));
      assert.ok(sources.length > 0);
      if (phase === "after-forget") await writeFile(resolve(attemptRoot, "after-forget-new-project-frozen-input.json"), JSON.stringify({ previous_project: JSON.parse(await readFile(resolve(heldRoot, "project.json"), "utf8")).project_id, sources, prompt: realJourney.afterForget, purpose: "A newly created project tests global exclusion; reuses B02 and is not claimed to be another independent held-out source", suitability: "Opened actual 4-second-spaced B02 frames: sea, waves, rocks, shoreline, sunset and boat wake support an 18-second four-shot seaside story; title/end cards must not be treated as scenery", evaluator_image: "visual-review/after-forget-B02-suitability/actual-source-frames.png" }, null, 2), { flag: "wx" });
      for (const source of sources) assert.equal(await digestFile(source.local_file), source.sha256);
      if (phase === "performance") await writeFile(resolve(attemptRoot, "performance-frozen-input.json"), JSON.stringify({ prompt: realJourney.performance, sources, rights: JSON.parse(await readFile(resolve(reviewRoot, "source-rights/D01.rights.json"), "utf8")), expected: { seconds: 18, minimum_shots: 4, real_source_audio: true, no_invented_captions: true, profile_unchanged: true } }, null, 2), { flag: "wx" });
      await armExactFileSelection(app, ["openFile", "multiSelections"], sources.map((item: any) => item.local_file), true);
      await page.getByRole("button", { name: "导入素材", exact: true }).click();
      for (const source of sources) await page.getByRole("button", { name: new RegExp(`source-${source.id}\\.mp4`) }).waitFor({ timeout: 120000 });
      const identity = JSON.parse(await readFile(resolve(projectRoot, "project.json"), "utf8"));
      assert.ok(!profile.processed_events.some((item: any) => item.source_project_id === identity.project_id));
      assert.ok(!profile.consent.source_project_ids.includes(identity.project_id));
      await log("held-out-excluded-before-first-generation", { project_id: identity.project_id, source_hashes: sources.map((item: any) => item.sha256) });
    } else await openProject(projectRoot);
    const project = JSON.parse(await readFile(resolve(projectRoot, "project.json"), "utf8"));
    const statusReads: any[] = [];
    const selectedRequest = async () => {
      const selectedRequestId = await page.getByLabel("当前创作请求", { exact: true }).inputValue(); assert.ok(selectedRequestId, "Status polling follows the actual UI-selected request");
      const started = Date.now(), db = new DatabaseSync(resolve(projectRoot, "project.sqlite"), { readOnly: true });
      let ref: any;
      try { ref = db.prepare("SELECT object_hash,version FROM object_refs WHERE object_type='creation_session' AND relation_key=? ORDER BY version DESC LIMIT 1").get(selectedRequestId); } finally { db.close(); }
      assert.ok(ref, "A real current creation session must exist");
      const path = resolve(projectRoot, "objects/sha256", ref.object_hash.slice(0, 2), ref.object_hash); assert.equal(await digestFile(path), ref.object_hash);
      const request = JSON.parse(await readFile(path, "utf8")); assert.equal(request.sequence, ref.version); assert.equal(request.authorization.request_id, selectedRequestId);
      if (statusReads.length < 12) { statusReads.push({ at: new Date().toISOString(), read_ms: Date.now() - started, sequence: request.sequence, status: request.status, role_status_count: await page.locator('[role="status"]').count() }); await writeFile(resolve(attemptRoot, "passive-status-read-timings.json"), JSON.stringify(statusReads, null, 2)); }
      return request;
    };
    const waitForProductionSettled = async () => waitUntil(async () => {
      const current = await selectedRequest(); assert.notEqual(current.status, "failed", "Production or authorized learning failed; preserve the failed attempt");
      const version = current.drafts.find((item: any) => item.draft_id === current.latest_draft_id)?.timeline_version;
      return current.status === "watchable" && current.active_run === null && (await page.locator(".badge").allTextContents()).includes(`v${version} · 可以看片`);
    }, "production and authorized learning reached the real terminal state", 15 * 60 * 1000);
    const observeThumbnailTerminal = async (label: string) => {
      const samples: any[] = [], started = Date.now();
      while (true) {
        const sample = await page.evaluate(() => ({ at: performance.now(), images: [...document.querySelectorAll(".shot-image-status")].map(item => ({ text: item.textContent, title: item.getAttribute("title"), hidden: (item as HTMLElement).hidden, canvasVisible: !(item.parentElement?.querySelector("canvas") as HTMLCanvasElement | null)?.hidden })), videos: [...document.querySelectorAll(".player-stage video")].map(item => ({ ready: (item as HTMLVideoElement).readyState, network: (item as HTMLVideoElement).networkState, error: (item as HTMLVideoElement).error?.message ?? null })) }));
        samples.push(sample);
        if (sample.images.length && sample.images.every((item: any) => item.canvasVisible || item.title || !/读取画面/.test(item.text ?? ""))) break;
        if (Date.now() - started >= 13000) break;
        await page.waitForTimeout(250);
      }
      await log("passive-thumbnail-terminal-observation", { label, elapsed_ms: Date.now() - started, samples, boundary: "Read-only observations; no decoding retry, no inferred success from timeout" });
    };
    const playVersion = async (version: number) => {
      const video = page.locator(`.player-stage video[aria-label="作品 v${version} 预览"]:not([hidden]):not([aria-hidden="true"])`); await video.waitFor({ state: "visible" });
      await waitUntil(() => video.evaluate((element: HTMLVideoElement) => element.readyState >= 2 && !element.seeking && element.videoWidth > 0 && !element.inert), "target video decoded before playback input");
      await video.evaluate(async (element: HTMLVideoElement) => { await Promise.all(element.getAnimations().map(animation => animation.finished)); (element as any).__realPlaybackEvents = []; for (const type of ["play", "playing", "timeupdate", "pause", "waiting", "ended", "error", "emptied"]) element.addEventListener(type, () => (element as any).__realPlaybackEvents.push({ type, at: performance.now(), time: element.currentTime, paused: element.paused, ready: element.readyState })); });
      const state = () => video.evaluate((element: HTMLVideoElement) => ({ time: element.currentTime, paused: element.paused, ready: element.readyState, seeking: element.seeking, connected: element.isConnected, inert: element.inert, focused: document.activeElement === element, visibility: document.visibilityState, document_focus: document.hasFocus(), decoded_frames: element.getVideoPlaybackQuality().totalVideoFrames, dropped_frames: element.getVideoPlaybackQuality().droppedVideoFrames, error: element.error?.message ?? null, events: (element as any).__realPlaybackEvents }));
      const playbackCapture = `playback-v${version}-${Date.now()}`;
      const frameBefore = await video.screenshot({ path: resolve(attemptRoot, `${playbackCapture}-before.png`) });
      const before = await state(); await log("playback-before-explicit-input", { version, ...before });
      try {
        if (before.paused) await page.getByRole("button", { name: "播放作品", exact: true }).click();
        await waitUntil(async () => { const current = await state(); assert.ok(Array.isArray(current.events), "The ready target video was replaced during explicit playback; preserve this failure instead of rebinding or inventing empty events"); const updates = current.events.filter((item: any) => item.type === "timeupdate" && !item.paused); return updates.some((item: any, index: number) => index > 0 && item.time > updates[index - 1].time + .02 && item.at > updates[index - 1].at); }, "actual playback progressed in two recorded media timeupdates");
        const frameAfter = await video.screenshot({ path: resolve(attemptRoot, `${playbackCapture}-progressed.png`) });
        const progressed = await state(); await log("playback-progressed", { version, ...progressed, screenshot_prefix: playbackCapture, before_frame_sha256: createHash("sha256").update(frameBefore).digest("hex"), progressed_frame_sha256: createHash("sha256").update(frameAfter).digest("hex") });
        assert.ok(progressed.decoded_frames > before.decoded_frames, "Actual decoded video frames advance");
        assert.notEqual(createHash("sha256").update(frameBefore).digest("hex"), createHash("sha256").update(frameAfter).digest("hex"), "Two actual player screenshots must show changed picture, not only an advancing media clock");
        if (!(await state()).paused) await page.getByRole("button", { name: "暂停作品", exact: true }).click();
      } finally { await log("playback-input-events", { version, ...await state() }); }
      await observeThumbnailTerminal(`played-v${version}`);
    };
    const visibleDraftCards = async () => page.locator("button[data-creation-draft]").evaluateAll((items: HTMLButtonElement[]) => items.map(item => ({ value: item.dataset.creationDraft!, text: item.textContent ?? "", version: Number(item.dataset.timelineVersion), disabled: item.disabled })));
    const selectDraftCard = async (draftId: string) => {
      const card = page.locator(`button[data-creation-draft="${draftId}"]`); await card.click();
      await waitUntil(async () => await card.getAttribute("aria-pressed") === "true" && await page.locator(".history-list").getAttribute("data-selected-draft-id") === draftId, "visible version card selection");
    };
    const openAdvancedVersions = async () => { const panel = page.locator("details.advanced-version"); if (!await panel.evaluate((item: HTMLDetailsElement) => item.open)) await panel.locator(":scope > summary").click(); };
    const selectLatest = async () => {
      await view("drafts"); const request = await selectedRequest(); await selectDraftCard(request.latest_draft_id); return request;
    };
    const queryProfile = async (except: boolean, requestedContexts?: string[]) => {
      await view("档案"); const form = page.locator('[data-creation-form="profile-query"]');
      const visibleCatalog = await page.locator('[aria-label="档案中可用的情境"] [data-profile-context]').evaluateAll((items: HTMLElement[]) => items.map(item => ({ context: item.dataset.profileContext!, label: item.textContent })).filter(item => item.context));
      const visibleTravel = visibleCatalog.filter((item: any) => /travel|旅行|徒步|海边/i.test(item.context));
      const contexts = requestedContexts ?? (visibleTravel.length ? visibleTravel.map((item: any) => item.context) : [...realJourney.profileContexts]);
      await form.locator('[name="contexts"]').fill(contexts.length ? contexts.join(",") : "旅行");
      if (!except) await form.locator('[name="exceptions"]').selectOption([]);
      await form.getByRole("button", { name: "读取适用经验", exact: true }).click();
      await waitUntil(async () => await page.getByRole("heading", { name: /^经验状态：/ }).count() > 0, "profile query authority returned");
      if (except) { const select = form.locator('[name="exceptions"]'); await waitUntil(async () => await select.locator("option").count() > 0, "profile principles visible for exception"); const values = await select.locator("option").evaluateAll((items: HTMLOptionElement[]) => items.map(item => item.value).filter(Boolean)); assert.ok(values.length > 0); await select.selectOption(values); await form.getByRole("button", { name: "读取适用经验", exact: true }).click(); }
      await log(except ? "one-off-profile-exception" : "profile-query", { contexts, except, operator_source: requestedContexts ? "frozen natural-language story context" : visibleCatalog.length ? "actual visible product context catalog" : "frozen natural-language persona contexts; product catalog empty", visible_catalog: visibleCatalog });
    };
    const configure = async (sourceIds: string[]) => {
      await view("档案"); const form = page.locator('[data-creation-form="profile-configure"]');
      await form.locator('[name="source_project_ids"]').selectOption(sourceIds);
      await form.locator('[name="data_types"]').selectOption(["feedback", "manual_diff", "selection", "history_reference"]);
      await form.locator('[name="external_provider"]').selectOption("ave-split"); await form.locator('[name="enabled"]').check();
      const until = new Date(await form.locator('[name="retention_until"]').inputValue()).toISOString(), profile = readProfileProof(userData);
      const detail = [`档案：${profile.profile_id} · v${profile.version}`, "学习：启用", `允许的来源项目：\n${sourceIds.join("\n")}`, "允许学习：反馈原话、手动修改、采用选择、获准历史或参考", "可发送至：ave-split", `保留至：${until}`, "授权范围内的新反馈在作品完成后可主动学习；不会扫描全部历史。历史引用和长期纠正仍由你明确选择，随时可以关闭或遗忘。"].join("\n\n");
      await armConfirmation(app, { type: "warning", title: "AVE 学习范围授权", message: "确认本地创作档案的学习与保留范围", detail, buttons: ["取消", "确认学习范围"], defaultId: 0, cancelId: 0, noLink: true });
      await form.getByRole("button", { name: "核对学习范围", exact: true }).click();
      report.authorizations = await readConfirmationAudit(app); await save();
      await waitUntil(() => readProfileProof(userData).consent_generation > profile.consent_generation, "consent persisted");
      await log("profile-consent", { sourceIds, data_types: ["feedback", "manual_diff", "selection", "history_reference"] });
    };
    const verifyWatchable = async (revision: number, previousDraft: string | null, seconds: number | null) => {
      let proof: any;
      await waitUntil(async () => {
        proof = await readProjectProof(projectRoot); const request = proof.requests.at(-1);
        if (request.status === "failed") { await writeFile(resolve(attemptRoot, "failed-proof.json"), JSON.stringify(proof, null, 2)); throw new Error(`REAL_CREATION_FAILED: ${request.authorization.request_id} revision ${revision}`); }
        return request.status === "watchable" && request.revisions.at(-1).revision === revision && request.latest_draft_id !== previousDraft;
      }, "new complete playable draft", 25 * 60 * 1000);
      await writeFile(resolve(attemptRoot, "project-proof.json"), JSON.stringify(proof, null, 2));
      const facts = timelineFacts(proof); assert.ok(facts.video.length >= (["sound-feedback", "review-sound", "inspect-speech-states", "motion-review", "speech-export-reopen", "color-feedback", "repair-color-feedback", "framing-feedback", "retry-speech", "renew-speech"].includes(phase) ? 2 : 4), "Frozen story's minimum shot count must be present");
      if (["sound-feedback", "review-sound", "inspect-speech-states", "motion-review", "speech-export-reopen", "color-feedback", "repair-color-feedback", "framing-feedback", "retry-speech", "renew-speech"].includes(phase)) assert.equal(facts.video.length, 2, "Frozen speech story requests exactly two continuous clips");
      if (seconds !== null) assertExactDuration(facts, seconds);
      const render = await validateRenderedProof(projectRoot, proof, facts.draft);
      await saveRenderedReview(projectRoot, attemptRoot, facts, render);
      const generatedRun = proof.model_runs.find((item: any) => item.model_run_id === facts.draft.source.run_id);
      if (["correction", "resume-correction", "exception", "after-forget", "after-forget-feedback"].includes(phase)) assert.ok(generatedRun, "New creation must retain its actual registered model run");
      if (generatedRun) {
        const planning = JSON.parse(generatedRun.metadata_json).audit?.planning;
        if (["correction", "resume-correction", "exception", "after-forget", "after-forget-feedback"].includes(phase)) assert.equal(planning?.protocol, "planning-exchange-v3", "New remaining creation phases must use the current receipt protocol, never an old build");
        if (["planning-exchange-v2", "planning-exchange-v3"].includes(planning?.protocol)) {
          const inputPath = resolve(projectRoot, "objects/sha256", generatedRun.input_object_hash.slice(0, 2), generatedRun.input_object_hash); assert.equal(await digestFile(inputPath), generatedRun.input_object_hash);
          const input = JSON.parse(await readFile(inputPath, "utf8")), calls = proof.requests.at(-1).model_calls.filter((item: any) => item.run_id === generatedRun.model_run_id);
          const independentlyResolved = verifyPlanningRounds(input, planning, calls);
          if (planning.protocol === "planning-exchange-v3") {
            const outputPath = resolve(projectRoot, "objects/sha256", generatedRun.output_object_hash.slice(0, 2), generatedRun.output_object_hash); assert.equal(await digestFile(outputPath), generatedRun.output_object_hash);
            assert.deepEqual(JSON.parse(await readFile(outputPath, "utf8")), independentlyResolved, "Host stored decision must exactly resolve the independently hashed measurement receipt and final creative fields");
          }
          await writeFile(resolve(attemptRoot, `independent-${planning.protocol.replace("exchange-", "")}-audit.json`), JSON.stringify({ root_input_hash: generatedRun.input_object_hash, planning, calls }, null, 2));
        }
      }
      if (["held-out", "retry-held-out", "renew-held-out", "resume-held-out-render", "review-held-out", "retry-renew-performance", "renew-performance", "opposite", "retry-opposite", "repair-opposite", "retry-repair-opposite", "exception", "after-forget", "after-forget-feedback", "performance", "performance-feedback", "retry-performance-feedback"].includes(phase)) {
        const run = proof.model_runs.find((item: any) => item.model_run_id === facts.draft.source.run_id); assert.ok(run, "Generated draft must reference its actual model run");
        const readObject = async (hash: string) => { const path = resolve(projectRoot, "objects/sha256", hash.slice(0, 2), hash); assert.equal(await digestFile(path), hash); return JSON.parse(await readFile(path, "utf8")); };
        const input = await readObject(run.input_object_hash), output = await readObject(run.output_object_hash), principles = input.context.profile?.principles ?? [], applied = output.applied_principle_ids;
        assert.ok(Array.isArray(applied));
        if (phase === "held-out" || phase === "retry-held-out" || phase === "renew-held-out" || phase === "resume-held-out-render" || phase === "review-held-out") { assert.ok(principles.length > 0, "Held-out generation must actually receive learned contextual principles"); assert.ok(applied.length > 0, "Held-out generation must actually select a learned principle"); }
        if (phase === "retry-renew-performance" || phase === "renew-performance" || phase === "exception" || phase === "performance" || phase === "performance-feedback" || phase === "retry-performance-feedback") assert.equal(principles.length, 0, "Excepted or unrelated travel principles must not be sent into this generation");
        const profile = readProfileProof(userData);
        for (const principle of principles) assert.ok(!profile.excluded_sources.includes(principle.source_project_id), "Forgotten source must be excluded from actual model input, not only UI");
        if (phase === "after-forget" || phase === "after-forget-feedback") assert.ok(principles.every((item: any) => profile.principles.some((live: any) => live.principle_id === item.principle_id)), "Deleted historical principles cannot be silently recovered for model input");
        await writeFile(resolve(attemptRoot, "actual-generation-profile.json"), JSON.stringify({ model_run_id: run.model_run_id, input_object_hash: run.input_object_hash, output_object_hash: run.output_object_hash, principles, applied_principle_ids: applied, excluded_sources: profile.excluded_sources, actual_source_map: facts.source_map }, null, 2));
      }
      // Rendering briefly makes a request watchable before authorized learning starts.
      // Normal review waits for the actual whole production completion; interruption has its own separate real UI case.
      await waitForProductionSettled();
      await selectLatest(); await page.getByRole("button", { name: "观看此版", exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll("video")].some(video => video.readyState >= 2 && video.videoWidth > 0));
      await playVersion(facts.draft.timeline_version);
      await capture("watchable"); await captureDesktopSizes("watchable"); await log("verified-watchable", { revision, seconds: facts.seconds, source_map: facts.source_map, semantic_graph_hash: render.semantic_graph_hash }); return proof;
    };
    const revise = async (text: string, seconds: number | null) => {
      const prior = await selectedRequest(); await view("request"); const form = page.locator('[data-creation-form="revise"]');
      await form.locator('[name="raw_text"]').fill(text); await form.getByRole("button", { name: "提交并继续制作", exact: true }).click({ noWaitAfter: true });
      await capture("producing"); await log("revision-submitted", { raw_text: text, prior_draft: prior.latest_draft_id, revision: prior.revisions.at(-1).revision + 1 });
      return verifyWatchable(prior.revisions.at(-1).revision + 1, prior.latest_draft_id, seconds);
    };
    const begin = async (text: string, seconds: number) => {
      await rail.getByRole("button", { name: "精修", exact: true }).click();
      const versionHeading = await page.locator('[data-creation-form="manual"] h3').innerText();
      const versionMatch = /^精修当前编辑版 v(\d+)/.exec(versionHeading);
      assert.ok(versionMatch, "Independent test role must see the current edit version before approving a new request");
      const version = Number(versionMatch[1]);
      await view("request"); if ((await readProjectProof(projectRoot)).requests.length) await page.getByRole("button", { name: "新创作要求", exact: true }).click();
      const form = page.locator('[data-creation-form="begin"]'); await form.locator('[name="original_text"]').fill(text);
      if (!await form.locator("details").evaluate((element: HTMLDetailsElement) => element.open)) await form.locator("summary").click();
      await form.getByRole("button", { name: "选择全部已导入素材" }).click();
      for (const key of ["request", "timeline", "evidence", "frames", "audio", "transcript", "profile"]) await form.locator(`input[name="${key}"]`).check();
      const ids = await form.locator('[name="asset_ids"]').evaluate((element: HTMLSelectElement) => [...element.selectedOptions].map(item => item.value));
      const expires = new Date(await form.locator('[name="expires_at"]').inputValue()).toISOString(), endpoint = (url: string) => new URL(url).href.replace(/\/$/, "");
      const routes = ["vision", "transcription", "sound", "planner"].map(role => { const value = config[role] ?? config.vision; return `${role}: ${value.provider} / ${value.model} → ${endpoint(value.base_url)}`; });
      const detail = [`项目：${project.project_id} · 当前版本 v${version}`, `要求原文：\n${text}`, `授权素材：\n${ids.join("\n")}`, "模型服务：ave-split / creation-v1", `接收端：${endpoint((config.planner ?? config.vision).base_url)}`, "可发送的数据：本次要求、当前作品与时间线、素材观察与证据、素材抽帧、素材音频、转写、创作偏好", `分工接收端：\n${routes.join("\n")}`, "不得改变：未指定保护对象", `有效期：${expires}`, "本次授权包含范围内的素材分析和创作修改；扩大范围需重新授权。"].join("\n\n");
      await armConfirmation(app, { type: "warning", title: "AVE 创作请求授权", message: "确认素材、数据范围与模型服务", detail, buttons: ["取消", "授权本次创作"], defaultId: 0, cancelId: 0, noLink: true });
      await form.getByRole("button", { name: "授权并开始制作", exact: true }).click();
      report.authorizations = await readConfirmationAudit(app);
      await log("request-submitted", { text, ids }); return verifyWatchable(1, null, seconds);
    };
    if (phase === "profile-controls") {
      const before = await readProjectProof(projectRoot), profileBefore = readProfileProof(userData);
      await view("drafts"); const originalRequest = await page.getByLabel("当前创作请求", { exact: true }).inputValue(), originalDraft = await page.locator(".history-list").getAttribute("data-selected-draft-id");
      await view("档案");
      const query = page.locator('[data-creation-form="profile-query"]'), originalContexts = await query.locator('[name="contexts"]').inputValue(), originalExceptions = await query.locator('[name="exceptions"]').evaluate((item: HTMLSelectElement) => [...item.selectedOptions].map(option => option.value));
      const originalHeading = await page.getByRole("heading", { name: /^(经验状态：|未请求个人档案)/ }).innerText();
      assert.ok(["经验状态：已读取适用经验", "未请求个人档案"].includes(originalHeading), "Restore only the actual supported initial query state, not an inferred form submission");
      assert.equal(originalExceptions.length, 0, "Initial normal profile query has no hidden pending exception selection");
      await writeFile(resolve(attemptRoot, "profile-controls-before.json"), JSON.stringify({ profile: profileBefore, originalRequest, originalDraft, originalHeading, originalContexts, originalExceptions, frozen: "Normal visible query, one-off exclusion, close/reopen and restore; then select the already withdrawn A v2 feedback and require an exact zero-dispatch rejection. No source is forgotten in this phase." }, null, 2));
      await queryProfile(false); await page.getByRole("heading", { name: "经验状态：已读取适用经验", exact: true }).waitFor();
      const excluded = await query.locator('[name="exceptions"] option').evaluateAll((items: HTMLOptionElement[]) => items.filter(item => item.value).map(item => ({ id: item.value, text: item.textContent })));
      const appliedContexts = await query.locator('[name="contexts"]').inputValue(); assert.ok(excluded.length > 0);
      await queryProfile(true); await page.getByRole("heading", { name: "经验状态：没有适用经验", exact: true }).waitFor();
      assert.deepEqual(await query.locator('[name="exceptions"]').evaluate((item: HTMLSelectElement) => [...item.selectedOptions].map(option => ({ id: option.value, text: option.textContent }))), excluded, "The actual excluded habits must remain visibly selected and individually manageable");
      await capture("one-off-query-exception"); assert.deepEqual(readProfileProof(userData), profileBefore);
      await app.close(); app = undefined;
      const uiDb = new DatabaseSync(resolve(projectRoot, "project.sqlite"), { readOnly: true }); let uiRef: any;
      try { uiRef = uiDb.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_ui' ORDER BY version DESC LIMIT 1").get(); } finally { uiDb.close(); }
      assert.ok(uiRef); const uiPath = resolve(projectRoot, "objects/sha256", uiRef.object_hash.slice(0, 2), uiRef.object_hash); assert.equal(await digestFile(uiPath), uiRef.object_hash);
      const savedUi = JSON.parse(await readFile(uiPath, "utf8")), workspaceContext: any = Object.entries(savedUi.value.forms).find(([key]) => JSON.parse(key)[2] === "workspace-context")?.[1];
      assert.ok(workspaceContext); assert.deepEqual(workspaceContext.profile_query.except_principle_ids, excluded.map((item: any) => item.id)); assert.deepEqual(workspaceContext.profile_query.contexts, appliedContexts.split(/[,，]/));
      await writeFile(resolve(attemptRoot, "exception-durable-query.json"), JSON.stringify({ object_hash: uiRef.object_hash, profile_query: workspaceContext.profile_query, operator_visible_choices: excluded }, null, 2));
      app = await launchRealDesktop(repository, reviewRoot, attemptRoot, entrypoint, userData, modelConfig); page = await app.firstWindow(); page.on("pageerror", (error: Error) => report.errors.push({ message: error.message, stack: error.stack })); rail = page.getByRole("navigation", { name: "工作台导航" }); await openProject(projectRoot); await view("档案");
      await page.getByRole("heading", { name: "经验状态：没有适用经验", exact: true }).waitFor();
      const reopenedQuery = page.locator('[data-creation-form="profile-query"]');
      assert.equal(await reopenedQuery.locator('[name="contexts"]').inputValue(), appliedContexts);
      await log("reopened-exception-visible-controls", { persisted_exclusions: excluded, currently_visible_options: await reopenedQuery.locator('[name="exceptions"] option').evaluateAll((items: HTMLOptionElement[]) => items.map(item => ({ id: item.value, text: item.textContent, selected: item.selected }))), boundary: "The Host query and no-match state are checked independently; missing excluded options are recorded as a UI control limitation, never fabricated." });
      assert.deepEqual(await reopenedQuery.locator('[name="exceptions"]').evaluate((item: HTMLSelectElement) => [...item.selectedOptions].map(option => ({ id: option.value, text: option.textContent }))), excluded, "Reopening must preserve visible selected exception labels, not merely hidden IDs");
      await capture("one-off-query-exception-reopened"); assert.deepEqual(readProfileProof(userData), profileBefore);
      await reopenedQuery.locator('[name="exceptions"]').selectOption([]); await reopenedQuery.getByRole("button", { name: "读取适用经验", exact: true }).click();
      await page.getByRole("heading", { name: "经验状态：已读取适用经验", exact: true }).waitFor();
      assert.deepEqual(await reopenedQuery.locator('[name="exceptions"]').evaluate((item: HTMLSelectElement) => [...item.selectedOptions].map(option => option.value)), []);
      await capture("one-off-query-exception-explicitly-cancelled"); assert.deepEqual(readProfileProof(userData), profileBefore);
      await reopenedQuery.locator('[name="contexts"]').fill(originalContexts);
      if (originalHeading === "未请求个人档案") await reopenedQuery.getByRole("button", { name: "仅查看项目", exact: true }).click();
      else await reopenedQuery.getByRole("button", { name: "读取适用经验", exact: true }).click();
      await page.getByRole("heading", { name: originalHeading, exact: true }).waitFor();
      await log("one-off-query-reopen-and-original-query-restored", { originalHeading, excluded, profile_version_unchanged: profileBefore.version });
      const requestOptions = await page.getByLabel("当前创作请求", { exact: true }).locator("option").evaluateAll((items: HTMLOptionElement[]) => items.map(item => ({ id: item.value, text: item.textContent ?? "" })));
      const originalCreation = before.requests.find((item: any) => item.drafts.some((draft: any) => draft.timeline_version === 2)); assert.ok(originalCreation);
      const visibleRequest = requestOptions.find((item: any) => item.id === originalCreation.authorization.request_id); assert.ok(visibleRequest);
      const requestSettings = page.locator("details.request-settings"); if (!await requestSettings.evaluate((item: HTMLDetailsElement) => item.open)) await requestSettings.locator(":scope > summary").click();
      await page.getByLabel("当前创作请求", { exact: true }).selectOption(visibleRequest.id); await view("drafts");
      const historicalCard = (await visibleDraftCards()).find((item: any) => item.version === 2); assert.ok(historicalCard, "The test role selects the actual visible A v2 historical card");
      const historicalDraft = originalCreation.drafts.find((item: any) => item.draft_id === historicalCard.value); assert.ok(historicalDraft);
      assert.ok(profileBefore.excluded_events.some((event: any) => event.source_project_id === project.project_id && event.source_event_id === `auto-feedback:${historicalDraft.draft_id}`), "The selected visible draft must really be the previously withdrawn event");
      await selectDraftCard(historicalCard.value); await view("档案");
      const learn = page.locator('[data-creation-form="learn"]'); await learn.locator('[name="kind"]').selectOption("feedback"); await learn.locator('[name="correction_ids"]').selectOption([]);
      await log("visible-withdrawn-history-selected", { request: visibleRequest, card: historicalCard, reason: "This previously withdrawn A v2 feedback remains reviewable but must never dispatch another learning inference" });
      await learn.getByRole("button", { name: "学习所选经验", exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.startsWith("PROFILE_EVENT_EXCLUDED:"), undefined, { timeout: 60000 });
      await capture("withdrawn-event-learning-rejected");
      const after = await readProjectProof(projectRoot); assert.deepEqual(after.requests.map((item: any) => item.model_calls), before.requests.map((item: any) => item.model_calls)); assert.deepEqual(after.model_runs, before.model_runs); assert.deepEqual(after.requests.map((item: any) => item.drafts), before.requests.map((item: any) => item.drafts)); assert.deepEqual(readProfileProof(userData), profileBefore);
      await page.getByLabel("当前创作请求", { exact: true }).selectOption(originalRequest); await view("drafts"); if (originalDraft) await selectDraftCard(originalDraft);
      await log("withdrawn-event-rejected-with-zero-calls-and-profile-unchanged", { code: "PROFILE_EVENT_EXCLUDED", additional_model_calls: 0, profile_version: profileBefore.version });
    } else if (phase === "motion-review") {
      const before = await readProjectProof(projectRoot); await view("drafts"); await observeRealMotion(page, attemptRoot); const after = await readProjectProof(projectRoot); assert.deepEqual(after.model_runs, before.model_runs); assert.deepEqual(after.requests.map((item: any) => item.model_calls), before.requests.map((item: any) => item.model_calls)); await log("real-motion-without-generation");
    } else if (phase === "inspect-speech-states") {
      const before = await readProjectProof(projectRoot); await view("drafts");
      const options = await visibleDraftCards();
      const sound = options.find((item: any) => /^v2 ·/.test(item.text)), faultyColor = options.find((item: any) => /^v3 ·/.test(item.text)); assert.ok(sound && faultyColor);
      await selectDraftCard(sound.value); await page.getByRole("button", { name: "观看此版", exact: true }).click(); await playVersion(2);
      await page.getByLabel("比较版本", { exact: true }).selectOption(faultyColor.value); await page.getByRole("button", { name: "比较两个版本", exact: true }).click(); await page.getByRole("button", { name: "结束比较", exact: true }).waitFor();
      for (let index = 0; index < 2; index++) { const video = page.locator(".comparison-panel video").nth(index); await video.focus(); await page.keyboard.press("Space"); await waitUntil(() => video.evaluate((item: HTMLVideoElement) => item.readyState >= 2 && item.currentTime > .1 && !item.paused), "actual comparison video playback"); await page.keyboard.press("Space"); }
      await captureDesktopSizes("actual-valid-vs-failed-color-comparison"); await page.getByRole("button", { name: "结束比较", exact: true }).click();
      await page.locator('[data-action="export"]').click(); await page.getByRole("dialog", { name: "导出作品", exact: true }).waitFor(); await captureDesktopSizes("valid-v2-export-panel"); await page.getByRole("button", { name: "关闭导出", exact: true }).click();
      const after = await readProjectProof(projectRoot); assert.deepEqual(after.model_runs, before.model_runs); assert.deepEqual(after.requests.map((item: any) => item.model_calls), before.requests.map((item: any) => item.model_calls)); assert.deepEqual(after.requests.map((item: any) => item.drafts), before.requests.map((item: any) => item.drafts));
      await log("existing-valid-vs-failed-color-comparison-and-export-panel", { selected_visible_versions: [sound, faultyColor], zero_generation: true, bad_color_remains_failed_acceptance: true });
    } else if (phase === "inspect-learning-failure") {
      const before = await readProjectProof(projectRoot); assert.equal(before.requests.at(-1).status, "failed");
      await view("material"); await captureDesktopSizes("actual-cancelled-learning-failure"); await view("request"); await captureDesktopSizes("failed-request-context");
      const after = await readProjectProof(projectRoot); assert.deepEqual(after.model_runs, before.model_runs); assert.deepEqual(after.requests.map((item: any) => item.model_calls), before.requests.map((item: any) => item.model_calls));
      await log("existing-real-failure-state-inspected-without-retry");
    } else if (phase === "resume-render" || phase === "resume-performance-render" || phase === "resume-held-out-render") {
      const before = await readProjectProof(projectRoot), prior = before.requests.at(-1), priorFacts = timelineFacts(before);
      assert.equal(prior.status, "failed"); assert.equal(prior.authorization.original_text, phase === "resume-performance-render" ? realJourney.performance : phase === "resume-held-out-render" ? realJourney.heldOut : realJourney.cold); assertExactDuration(priorFacts, phase !== "resume-render" ? 18 : 24);
      await writeFile(resolve(attemptRoot, "before-explicit-render-resume.json"), JSON.stringify(before, null, 2));
      await view("material"); await page.getByRole("button", { name: "继续制作可播放版本", exact: true }).click();
      await log("explicit-render-resume-after-qc-fix", { draft_id: prior.latest_draft_id, timeline_version: priorFacts.draft.timeline_version, model_call_count: prior.model_calls.length });
      await waitUntil(async () => {
        const snapshot = await readProjectProof(projectRoot), current = snapshot.requests.at(-1), failure = snapshot.objects.find((item: any) => item.object_type === "creation_production_failure" && !before.objects.some((old: any) => old.object_hash === item.object_hash));
        if (failure) { await writeFile(resolve(attemptRoot, "failed-proof.json"), JSON.stringify(snapshot, null, 2)); throw new Error(`REAL_RENDER_RESUME_FAILED: ${failure.value.error.code ?? failure.value.error.message}`); }
        return current.status !== "failed";
      }, "committed version rendering resumed", 120000);
      const after = await verifyWatchable(prior.revisions.at(-1).revision, null, phase !== "resume-render" ? 18 : 24), current = after.requests.at(-1), actual = timelineFacts(after);
      assert.equal(current.latest_draft_id, prior.latest_draft_id); assert.equal(actual.draft.timeline_version, priorFacts.draft.timeline_version);
      assert.deepEqual(current.drafts, prior.drafts, "Render repair cannot regenerate or recommit the creative draft");
      assert.deepEqual(current.model_calls, prior.model_calls, "Render repair cannot issue additional model calls");
      assert.deepEqual(actual.source_map, priorFacts.source_map);
      for (const failure of before.objects.filter((item: any) => item.object_type === "creation_production_failure")) assert.ok(after.objects.some((item: any) => item.object_hash === failure.object_hash), "Prior QC failures remain immutable");
      await log("same-committed-work-now-watchable", { draft_id: current.latest_draft_id, timeline_version: actual.draft.timeline_version, model_call_count: current.model_calls.length });
      if (phase === "resume-performance-render") await log("technical-render-only-story-still-failed", { reason: "Original v1 selected 15.2 seconds of official spoken introduction instead of performance; independent VTT also disagrees with the ASR first word. Encoding success does not accept that story or subtitle accuracy." });
    } else if (phase === "renew-cold" || phase === "renew-speech") {
      const before = await readProjectProof(projectRoot), prior = before.requests.at(-1);
      await writeFile(resolve(attemptRoot, "before-new-deployment-authorization.json"), JSON.stringify(before, null, 2));
      const text = phase === "renew-cold" ? realJourney.cold : realJourney.speech;
      assert.equal(prior.authorization.original_text, text, "Deployment change cannot rewrite the frozen creative requirement");
      const after = await begin(text, phase === "renew-cold" ? 24 : 8), current = after.requests.at(-1), facts = timelineFacts(after);
      assert.notEqual(current.authorization.request_id, prior.authorization.request_id, "New deployment requires a new product authorization");
      assert.notEqual(current.authorization.deployment.digest, prior.authorization.deployment.digest, "This phase requires an explicit changed deployment, not a hidden retry");
      assert.ok(observationCount(after, current.authorization.request_id) > 0, "New authorization must complete its own production observation path");
      for (const failure of before.objects.filter((item: any) => item.object_type === "creation_production_failure")) assert.ok(after.objects.some((item: any) => item.object_hash === failure.object_hash), "Prior failed attempts remain immutable");
      const captions = facts.timeline.tracks.flatMap((track: any) => track.captions ?? []);
      if (phase === "renew-cold") assert.equal(captions.length, 0, "Silent source cannot invent captions");
      else { assert.ok(captions.length > 0, "Speech journey must exercise real captions"); assert.ok(captions.every((item: any) => !/[\u4e00-\u9fff]/.test(item.text)), "English speech retains its original language"); }
      await log("new-deployment-explicitly-authorized", { prior_request_id: prior.authorization.request_id, request_id: current.authorization.request_id, prior_deployment: prior.authorization.deployment, deployment: current.authorization.deployment });
    } else if (phase === "retry-cold" || phase === "retry-speech" || phase === "retry-held-out") {
      const before = await readProjectProof(projectRoot), prior = before.requests.at(-1); assert.equal(prior.status, "failed");
      assert.equal(prior.authorization.original_text, phase === "retry-cold" ? realJourney.cold : phase === "retry-held-out" ? realJourney.heldOut : realJourney.speech, "Retry must preserve the unchanged frozen user requirement");
      await writeFile(resolve(attemptRoot, "before-explicit-retry.json"), JSON.stringify(before, null, 2));
      await view("material"); await page.getByRole("button", { name: "继续制作可播放版本", exact: true }).click();
      await log("explicit-test-role-retry-after-code-fix", { prior_call_ids: prior.model_calls.map((item: any) => item.call_id), expected_revision: prior.revisions.at(-1).revision, unchanged_prompt: prior.authorization.original_text });
      await waitUntil(async () => {
        const snapshot = await readProjectProof(projectRoot), current = snapshot.requests.at(-1), failure = snapshot.objects.find((item: any) => item.object_type === "creation_production_failure" && !before.objects.some((old: any) => old.object_hash === item.object_hash));
        if (failure) { await writeFile(resolve(attemptRoot, "failed-proof.json"), JSON.stringify(snapshot, null, 2)); throw new Error(`REAL_CREATION_FAILED: ${failure.value.error.code ?? failure.value.error.message}`); }
        return current.status !== "failed" && current.model_calls.length > prior.model_calls.length;
      }, "new explicit run dispatch", 120000);
      const after = await verifyWatchable(prior.revisions.at(-1).revision, prior.latest_draft_id, phase === "retry-cold" ? 24 : phase === "retry-held-out" ? 18 : 8), facts = timelineFacts(after), current = after.requests.at(-1);
      const captions = facts.timeline.tracks.flatMap((track: any) => track.captions ?? []);
      if ((phase === "retry-cold" || phase === "retry-held-out")) assert.equal(captions.length, 0, "Silent cold source cannot invent captions");
      else { assert.ok(captions.length > 0, "Speech journey must exercise real captions"); assert.ok(captions.every((item: any) => !/[\u4e00-\u9fff]/.test(item.text)), "English speech must retain its original language"); }
      for (const failure of before.objects.filter((item: any) => item.object_type === "creation_production_failure")) assert.ok(after.objects.some((item: any) => item.object_hash === failure.object_hash), "Old failures must remain immutable after explicit retry");
      const oldCalls = new Set(prior.model_calls.map((item: any) => item.call_id)), newCalls = current.model_calls.filter((item: any) => !oldCalls.has(item.call_id));
      assert.ok(newCalls.length > 0);
      if (observationCount(before, prior.authorization.request_id) > 0) assert.ok(newCalls.every((item: any) => item.target?.role === "planner"), "Valid existing observations should be reused by the production UI retry");
      else assert.ok(observationCount(after, current.authorization.request_id) > 0, "An interrupted preparation must complete its own actual observations on explicit resume");
      await log("new-run-with-unchanged-observation-evidence", { new_calls: newCalls, previous_failure_count: before.objects.filter((item: any) => item.object_type === "creation_production_failure").length });
    } else if (phase === "feedback" || phase === "resume-feedback" || phase === "review-feedback" || phase === "repair-feedback" || phase === "review-repaired-feedback" || phase === "resume-existing-feedback") {
      if (phase === "feedback") await configure([project.project_id]);
      const before = await readProjectProof(projectRoot), prior = timelineFacts(before, ["review-feedback", "review-repaired-feedback", "resume-existing-feedback"].includes(phase) ? before.requests.at(-1).drafts[0].draft_id : undefined); let proof: any;
      if (phase === "resume-existing-feedback") {
        const request = before.requests.at(-1); assert.equal(request.status, "failed"); assert.equal(request.revisions.at(-1).raw_text, realJourney.repairedFeedback);
        await writeFile(resolve(attemptRoot, "before-explicit-learning-resume.json"), JSON.stringify(before, null, 2));
        await view("material");
        await writeFile(resolve(attemptRoot, "before-resume-visible-state.json"), JSON.stringify(await page.evaluate(() => ({ url: location.href, thumbnails: [...document.querySelectorAll(".shot-image-status")].map(item => ({ text: item.textContent, title: item.getAttribute("title") })), videos: [...document.querySelectorAll("video")].map(item => ({ src: item.currentSrc, readyState: item.readyState, error: item.error?.message ?? null })) })), null, 2));
        await page.getByRole("button", { name: "继续制作可播放版本", exact: true }).click({ noWaitAfter: true });
        await log("explicit-same-draft-cancelled-learning-resume", { draft_id: request.latest_draft_id, revision: request.revisions.at(-1).revision });
        await waitUntil(async () => { const current = await selectedRequest(); return current.status !== "failed" && current.model_calls.length > request.model_calls.length; }, "new explicit learning attempt dispatched", 120000);
        proof = await verifyWatchable(request.revisions.at(-1).revision, null, 12);
        assert.deepEqual(proof.requests.at(-1).drafts, request.drafts); assert.deepEqual(proof.jobs, before.jobs, "Learning resume must not start or rerun any Worker job");
        assert.deepEqual(proof.objects.filter((item: any) => ["creation_render", "creation_observation"].includes(item.object_type)), before.objects.filter((item: any) => ["creation_render", "creation_observation"].includes(item.object_type)));
        const calls = proof.requests.at(-1).model_calls, added = calls.filter((item: any) => !request.model_calls.some((old: any) => old.call_id === item.call_id)); assert.equal(added.length, 1);
        for (const old of request.model_calls) assert.deepEqual(calls.find((item: any) => item.call_id === old.call_id), old, "Cancelled and historical call ledgers must remain unchanged");
        const run = proof.model_runs.find((item: any) => item.model_run_id === added[0].run_id); assert.ok(run);
        const input = JSON.parse(await readFile(resolve(projectRoot, "objects/sha256", run.input_object_hash.slice(0, 2), run.input_object_hash), "utf8")); assert.match(input.context.task, /Extract contextual editing hypotheses/);
        await log("same-draft-render-zero-worker-generation-and-observation-one-new-learning", { new_learning_run: run.model_run_id });
      } else if (phase === "review-feedback" || phase === "review-repaired-feedback") {
        const request = before.requests.at(-1); assert.equal(request.status, "watchable"); assert.equal(request.revisions.at(-1).raw_text, realJourney.feedback);
        proof = await verifyWatchable(request.revisions.at(-1).revision, null, 12);
        assert.equal(proof.requests.at(-1).latest_draft_id, request.latest_draft_id);
        assert.deepEqual(proof.requests.map((item: any) => item.model_calls), before.requests.map((item: any) => item.model_calls)); assert.deepEqual(proof.model_runs, before.model_runs, "Review existing feedback must not generate or learn again");
      } else if (phase === "resume-feedback") {
        const request = before.requests.at(-1); assert.equal(request.status, "failed"); assert.equal(request.revisions.at(-1).raw_text, realJourney.feedback);
        await writeFile(resolve(attemptRoot, "before-feedback-resume.json"), JSON.stringify(before, null, 2));
        await view("material"); await page.getByRole("button", { name: "继续制作可播放版本", exact: true }).click();
        await log("explicit-unchanged-feedback-resume", { revision: request.revisions.at(-1).revision, original_feedback: realJourney.feedback });
        await waitUntil(async () => {
          const snapshot = await readProjectProof(projectRoot), current = snapshot.requests.at(-1), failure = snapshot.objects.find((item: any) => item.object_type === "creation_production_failure" && !before.objects.some((old: any) => old.object_hash === item.object_hash));
          if (failure) { await writeFile(resolve(attemptRoot, "failed-proof.json"), JSON.stringify(snapshot, null, 2)); throw new Error(`REAL_FEEDBACK_RESUME_FAILED: ${failure.value.error.code ?? failure.value.error.message}`); }
          return current.status !== "failed" && current.model_calls.length > request.model_calls.length;
        }, "new corrected feedback run dispatched", 120000);
        proof = await verifyWatchable(request.revisions.at(-1).revision, request.latest_draft_id, 12);
        for (const failure of before.objects.filter((item: any) => item.object_type === "creation_production_failure")) assert.ok(proof.objects.some((item: any) => item.object_hash === failure.object_hash), "Old failed feedback attempts remain immutable");
      } else proof = await revise(phase === "repair-feedback" ? realJourney.repairedFeedback : realJourney.feedback, 12);
      const actual = timelineFacts(proof);
      assert.notDeepEqual(actual.source_map, prior.source_map, "Feedback must materially change actual selection/order/duration");
      assert.notDeepEqual(selectionOrder(actual), selectionOrder(prior), "Reselection/reordering feedback must change source starts or shot order, not just shorten identical shots");
      await waitUntil(async () => {
        assert.notEqual((await selectedRequest()).status, "failed", "Proactive learning failed after rendering; retain the failure without resampling");
        return (await page.locator(".badge").allTextContents()).some((text: string) => /^v\d+ · 可以看片$/.test(text));
      }, "product reports authorized feedback learning has finished", 15 * 60 * 1000);
      await page.getByRole("button", { name: "采用此版", exact: true }).click();
      await waitUntil(async () => (await selectedRequest()).adopted_draft_id === actual.draft.draft_id, "adoption");
      if (phase === "repair-feedback" || phase === "review-repaired-feedback" || phase === "resume-existing-feedback") {
        await view("档案");
        const visibleContexts = await page.locator('[aria-label="档案中可用的情境"] [data-profile-context]').evaluateAll((items: HTMLElement[]) => items.map(item => item.dataset.profileContext!).filter(Boolean));
        const audioContext = visibleContexts.find((context: string) => /all editing contexts|所有剪辑|全部剪辑/i.test(context)); assert.ok(audioContext, "The mistaken general audio hypothesis must be visible for explicit correction");
        await queryProfile(false, [audioContext]);
        const form = page.locator('[data-creation-form="forget-principles"]');
        const visible = await form.locator('[name="principle_ids"] option').evaluateAll((items: HTMLOptionElement[]) => items.filter(item => item.value).map(item => ({ id: item.value, statement: item.textContent ?? "" })));
        const mistaken = visible.filter((item: any) => /authentic original sound|non-existent dialogue|真实.*原声|保留.*真实.*声音/i.test(item.statement));
        assert.equal(mistaken.length, 1, "Select only the exact visible mistaken audio principle, never every principle");
        const beforeCorrection = readProfileProof(userData);
        await writeFile(resolve(attemptRoot, "automatic-learning-before-audio-correction.json"), JSON.stringify({ project: await readProjectProof(projectRoot), profile: beforeCorrection, selected_visible_statement: mistaken[0] }, null, 2));
        const key = (item: any) => JSON.stringify([item.source_project_id, item.source_event_id]);
        const selected = beforeCorrection.principles.find((item: any) => item.principle_id === mistaken[0].id); assert.ok(selected);
        const affected = new Set([key(selected)]);
        for (const item of [...beforeCorrection.corrections].sort((a: any, b: any) => a.registered_version - b.registered_version)) if (item.correction.predecessors.some((ref: any) => affected.has(key(ref)))) affected.add(key(item));
        const events = beforeCorrection.processed_events.filter((item: any) => affected.has(key(item))), removed = beforeCorrection.principles.filter((item: any) => affected.has(key(item)));
        const preserved = beforeCorrection.principles.filter((item: any) => !affected.has(key(item)) && item.contexts.some((context: string) => /travel|旅行/i.test(context)));
        assert.ok(preserved.length > 0, "A separate corrected learning event must retain genuine travel experience after the whole mistaken event is withdrawn");
        const detail = [`档案：${beforeCorrection.profile_id} · v${beforeCorrection.version}`, "撤回选定原则关联的整条学习经验及依赖后继（同一经验中的其他原则也会移除）：", removed.map((item: any) => `• ${item.statement}（${item.contexts.join("、")}；来源作品 ${item.source_project_id}）`).join("\n"), `将移除 ${events.length} 条经验、${removed.length} 条原则，包含依赖这些经验的纠正结果。`, "这些来源和受影响经验后续不能重新用于个性化；项目中的作品与历史记录仍保留。"].join("\n\n");
        await armConfirmation(app, { type: "warning", title: "AVE 撤回经验", message: "确认撤回选定原则所属经验与依赖经验", detail, buttons: ["取消", "确认撤回关联经验"], defaultId: 0, cancelId: 0, noLink: true });
        await form.locator('[name="principle_ids"]').selectOption(mistaken[0].id); await form.getByRole("button", { name: "核对关联影响并撤回", exact: true }).click();
        report.authorizations = await readConfirmationAudit(app); await save();
        await waitUntil(() => readProfileProof(userData).deletion_generation > beforeCorrection.deletion_generation, "explicit mistaken-audio event retraction recorded");
        const corrected = readProfileProof(userData); await writeFile(resolve(attemptRoot, "explicit-audio-correction-result.json"), JSON.stringify(corrected, null, 2));
        assert.ok(corrected.principles.every((item: any) => !affected.has(key(item))), "The selected mistaken learning event must be excluded");
        for (const item of preserved) assert.ok(corrected.principles.some((live: any) => live.principle_id === item.principle_id), "Independent corrected travel experience must remain");
        assert.deepEqual(corrected.excluded_sources, beforeCorrection.excluded_sources, "Targeted event withdrawal must not exclude the whole source project");
        await queryProfile(false, [audioContext]);
        const remaining = await form.locator('[name="principle_ids"] option').evaluateAll((items: HTMLOptionElement[]) => items.map(item => item.value));
        assert.ok(!remaining.includes(mistaken[0].id), "Normal product retrieval must exclude the disabled audio hypothesis");
        await log("visible-audio-hypothesis-event-explicitly-withdrawn", { selected: mistaken[0], affected_events: [...affected], preserved_principle_ids: preserved.map((item: any) => item.principle_id) });
      }
      await queryProfile(false);
      const profile = readProfileProof(userData);
      await writeFile(resolve(attemptRoot, "profile-after-learning.json"), JSON.stringify(profile, null, 2));
      assert.ok(profile.processed_events.length > 0, "Authorized proactive learning must persist its actual outcome");
      assert.ok(profile.principles.length > 0, "Explicit long-term feedback produced no usable principles; retain no-inference and stop without resampling");
      await log("learned-principles", { count: profile.principles.length });
    } else if (phase === "sound-feedback" || phase === "review-sound") {
      const existingProof = await readProjectProof(projectRoot);
      assert.ok(phase !== "review-sound" || process.env.AVE_REAL_AUDIO_BEFORE_PROOF, "Existing audio repair requires the exact original before-proof file");
      const beforeProof = phase === "review-sound" ? JSON.parse(await readFile(process.env.AVE_REAL_AUDIO_BEFORE_PROOF!, "utf8")) : existingProof, before = timelineFacts(beforeProof);
      await writeFile(resolve(attemptRoot, "before-audio-feedback.json"), JSON.stringify(beforeProof, null, 2));
      const afterProof = phase === "review-sound" ? await verifyWatchable(existingProof.requests.at(-1).revisions.at(-1).revision, null, 8) : await revise(realJourney.soundFeedback, 8), after = timelineFacts(afterProof);
      if (phase === "review-sound") { assert.equal(after.draft.draft_id, timelineFacts(existingProof).draft.draft_id); assert.deepEqual(afterProof.requests.map((item: any) => item.model_calls), existingProof.requests.map((item: any) => item.model_calls)); assert.deepEqual(afterProof.model_runs, existingProof.model_runs, "UI repair must watch the existing draft with zero new model calls"); }
      assert.deepEqual(after.source_map, before.source_map, "Audio-only feedback must preserve video source ranges and order");
      const picture = (facts: any) => facts.video.map((clip: any) => { const { grade_id: _id, ...grade } = clip.grade ?? {}; return { static_reframe: clip.static_reframe, grade, transform: clip.transform, effects: clip.effects, speed: clip.speed, time_map: clip.time_map }; });
      assert.deepEqual(picture(after), picture(before), "Volume-only correction must preserve actual composition, grade, effects and speed");
      const captions = (timeline: any) => timeline.tracks.flatMap((track: any) => (track.captions ?? []).map((item: any) => ({ text: item.text, start: item.timeline_start, duration: item.timeline_duration })));
      assert.deepEqual(captions(after.timeline), captions(before.timeline), "Audio feedback must preserve exact captions");
      const render = (proof: any, draft: any) => proof.objects.filter((item: any) => item.object_type === "creation_render" && item.value.draft_id === draft.draft_id).at(-1)?.value;
      const rms = (hash: string) => {
        const result = spawnSync("ffmpeg", ["-hide_banner", "-i", resolve(projectRoot, "objects/sha256", hash.slice(0, 2), hash), "-vn", "-af", "astats=metadata=0:reset=0", "-f", "null", "-"], { windowsHide: true, encoding: "utf8" });
        assert.equal(result.status, 0, result.stderr); const overall = result.stderr.split("Overall").at(-1) ?? "";
        const match = /RMS level dB:\s*(-?\d+(?:\.\d+)?)/.exec(overall); assert.ok(match, "Encoded output must contain nonzero audible PCM"); return Number(match[1]);
      };
      const acoustic = [];
      for (const target of ["preview", "master"]) {
        const beforeDb = rms(render(beforeProof, before.draft)[target].output_hash), afterDb = rms(render(afterProof, after.draft)[target].output_hash), delta = afterDb - beforeDb;
        acoustic.push({ target, before_rms_db: beforeDb, after_rms_db: afterDb, actual_delta_db: delta });
        await writeFile(resolve(attemptRoot, "encoded-volume-difference.json"), JSON.stringify(acoustic, null, 2));
        assert.ok(Math.abs(delta + 12) <= 1, `Requested -12 dB must change actual ${target} PCM; observed ${delta} dB`);
      }
      await log("multi-clip-encoded-volume-changed", acoustic);
    } else if (phase === "color-feedback" || phase === "repair-color-feedback") {
      const currentProof = await readProjectProof(projectRoot);
      assert.ok(phase !== "repair-color-feedback" || process.env.AVE_REAL_COLOR_BEFORE_PROOF, "Color correction requires the original ungraded source comparison proof");
      const beforeProof = phase === "repair-color-feedback" ? JSON.parse(await readFile(process.env.AVE_REAL_COLOR_BEFORE_PROOF!, "utf8")) : currentProof, before = timelineFacts(beforeProof); await writeFile(resolve(attemptRoot, "before-color-feedback.json"), JSON.stringify(beforeProof, null, 2));
      if (phase === "repair-color-feedback") await writeFile(resolve(attemptRoot, "before-color-repair-actual-failed-picture.json"), JSON.stringify(currentProof, null, 2));
      const afterProof = await revise(phase === "repair-color-feedback" ? realJourney.repairedColorFeedback : realJourney.colorFeedback, 8), after = timelineFacts(afterProof);
      assert.deepEqual(after.source_map, before.source_map, "Exposure correction must preserve actual source selections and order");
      const captions = (facts: any) => facts.timeline.tracks.flatMap((track: any) => (track.captions ?? []).map((item: any) => ({ text: item.text, start: item.timeline_start, duration: item.timeline_duration })));
      assert.deepEqual(captions(after), captions(before));
      for (let index = 0; index < before.video.length; index++) {
        const old = before.video[index], current = after.video[index]; assert.equal(current.gain_db, old.gain_db); assert.deepEqual(current.static_reframe, old.static_reframe);
        assert.ok(current.grade, "Exposure correction must reach the actual committed Timeline"); assert.ok(Math.abs(current.grade.exposure - (old.grade?.exposure ?? 0) - .3) < 1e-6);
        assert.equal(current.grade.contrast, old.grade?.contrast ?? 1); assert.equal(current.grade.saturation, old.grade?.saturation ?? 1);
      }
      const beforeReceipt = await validateRenderedProof(projectRoot, beforeProof, before.draft), afterReceipt = await validateRenderedProof(projectRoot, afterProof, after.draft), measurements = [];
      for (const target of ["preview", "master"]) {
        const measure = async (hash: string, label: string) => {
          const path = resolve(projectRoot, "objects/sha256", hash.slice(0, 2), hash), luma = spawnSync("ffmpeg", ["-v", "error", "-i", path, "-an", "-vf", "signalstats,metadata=print:file=-", "-f", "null", "-"], { windowsHide: true, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }); assert.equal(luma.status, 0, luma.stderr);
          const values = [...luma.stdout.matchAll(/lavfi\.signalstats\.YAVG=(\d+(?:\.\d+)?)/g)].map(item => Number(item[1])); assert.ok(values.length > 0);
          const audio = spawnSync("ffmpeg", ["-hide_banner", "-i", path, "-vn", "-af", "astats=metadata=0:reset=0", "-f", "null", "-"], { windowsHide: true, encoding: "utf8" }); assert.equal(audio.status, 0, audio.stderr);
          const rms = /RMS level dB:\s*(-?\d+(?:\.\d+)?)/.exec(audio.stderr.split("Overall").at(-1) ?? ""); assert.ok(rms);
          const result = { frames: values.length, mean_luma: values.reduce((sum, value) => sum + value, 0) / values.length, audio_rms_db: Number(rms[1]) }; await writeFile(resolve(attemptRoot, `${target}-${label}-pixel-audio.json`), JSON.stringify(result, null, 2)); return result;
        };
        const original = await measure(beforeReceipt[target].output_hash, "before"), changed = await measure(afterReceipt[target].output_hash, "after"); measurements.push({ target, original, changed });
        assert.equal(changed.frames, original.frames); assert.ok(changed.mean_luma > original.mean_luma + .5, "Exposure must brighten actual encoded pixels, not only grade metadata"); assert.ok(Math.abs(changed.audio_rms_db - original.audio_rms_db) < .2, "Picture-only feedback must preserve encoded audio level");
      }
      await log("real-encoded-exposure-change-with-audio-captions-preserved", measurements);
    } else if (phase === "framing-feedback") {
      const beforeProof = await readProjectProof(projectRoot), before = timelineFacts(beforeProof);
      await writeFile(resolve(attemptRoot, "before-framing-feedback.json"), JSON.stringify(beforeProof, null, 2));
      const proof = await revise(realJourney.framingFeedback, 8), after = timelineFacts(proof);
      assert.deepEqual(after.source_map, before.source_map);
      const captions = (facts: any) => facts.timeline.tracks.flatMap((track: any) => (track.captions ?? []).map((item: any) => ({ text: item.text, start: item.timeline_start, duration: item.timeline_duration })));
      assert.deepEqual(captions(after), captions(before));
      for (let index = 0; index < before.video.length; index++) {
        const old = before.video[index], current = after.video[index];
        assert.deepEqual(current.transform, { scale_x: 1.2, scale_y: 1.2, x: -96, y: -54 }, "Frozen C01 960x540 canvas requires this centered uniform transform");
        assert.equal(current.gain_db, old.gain_db); assert.deepEqual(current.static_reframe, old.static_reframe);
        const grade = (clip: any) => { const { grade_id: _id, ...value } = clip.grade ?? {}; return value; };
        assert.deepEqual(grade(current), grade(old)); assert.deepEqual(current.effects, old.effects); assert.deepEqual(current.speed, old.speed); assert.deepEqual(current.time_map, old.time_map);
      }
      const oldReceipt = await validateRenderedProof(projectRoot, beforeProof, before.draft), newReceipt = await validateRenderedProof(projectRoot, proof, after.draft), measurements = [];
      const object = (hash: string) => resolve(projectRoot, "objects/sha256", hash.slice(0, 2), hash);
      for (const target of ["preview", "master"]) {
        const oldPath = object(oldReceipt[target].output_hash), newPath = object(newReceipt[target].output_hash);
        const geometry = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", newPath], { windowsHide: true, encoding: "utf8" }); assert.equal(geometry.status, 0); assert.deepEqual(JSON.parse(geometry.stdout).streams, [{ width: 960, height: 540 }]);
        const rms = (path: string) => { const value = spawnSync("ffmpeg", ["-hide_banner", "-i", path, "-vn", "-af", "astats=metadata=0:reset=0", "-f", "null", "-"], { windowsHide: true, encoding: "utf8" }); assert.equal(value.status, 0); const match = /RMS level dB:\s*(-?\d+(?:\.\d+)?)/.exec(value.stderr.split("Overall").at(-1) ?? ""); assert.ok(match); return Number(match[1]); };
        assert.ok(Math.abs(rms(oldPath) - rms(newPath)) < .2, "Framing-only edit preserves actual encoded audio");
        for (const frame of [30, 170]) {
          const score = (transformed: boolean) => {
            const prefix = transformed ? "scale=1152:648,crop=960:540:96:54," : "";
            const filter = `[0:v]select='eq(n,${frame})',${prefix}crop=960:360:0:0,setpts=PTS-STARTPTS[a];[1:v]select='eq(n,${frame})',crop=960:360:0:0,setpts=PTS-STARTPTS[b];[a][b]psnr`;
            const result = spawnSync("ffmpeg", ["-hide_banner", "-i", oldPath, "-i", newPath, "-filter_complex", filter, "-an", "-frames:v", "1", "-f", "null", "-"], { windowsHide: true, encoding: "utf8" }); assert.equal(result.status, 0, result.stderr);
            const match = /PSNR[^\n]*average:(inf|\d+(?:\.\d+)?)/.exec(result.stderr); assert.ok(match, result.stderr); return match[1] === "inf" ? Infinity : Number(match[1]);
          };
          const originalPsnr = score(false), centeredPsnr = score(true); measurements.push({ target, encoded_frame: frame, original_psnr_db: Number.isFinite(originalPsnr) ? originalPsnr : "inf", centered_1_2_prediction_psnr_db: Number.isFinite(centeredPsnr) ? centeredPsnr : "inf" });
          assert.ok(centeredPsnr > originalPsnr + 8, "Actual encoded picture must match the centered 1.2x prediction substantially better than unchanged framing");
        }
      }
      await writeFile(resolve(attemptRoot, "actual-framing-pixel-measurements.json"), JSON.stringify(measurements, null, 2));
      await log("actual-centered-framing-with-audio-caption-grade-preserved", measurements);
    } else if (phase === "relative-shorter") {
      const before = await readProjectProof(projectRoot), prior = timelineFacts(before), profileBefore = readProfileProof(userData);
      assertExactDuration(prior, 30);
      await writeFile(resolve(attemptRoot, "before-relative-feedback.json"), JSON.stringify({ project: before, profile: profileBefore, prompt: realJourney.relativeShorter }, null, 2));
      const after = await revise(realJourney.relativeShorter, null), actual = timelineFacts(after);
      assert.ok(actual.seconds > 0 && actual.seconds < prior.seconds, "Broad natural feedback must actually shorten the whole rendered work");
      await waitUntil(async () => {
        assert.notEqual((await selectedRequest()).status, "failed", "Learning after current-only feedback must finish without failure");
        return (await page.locator(".badge").allTextContents()).some((text: string) => /^v\d+ · 可以看片$/.test(text));
      }, "current-only feedback settled", 15 * 60 * 1000);
      assert.deepEqual(readProfileProof(userData).principles, profileBefore.principles, "Current-only relative correction cannot invent or overwrite long-term preferences");
      await log("relative-duration-changed-without-timecodes", { before_seconds: prior.seconds, after_seconds: actual.seconds, source_map: actual.source_map });
    } else if (phase === "alternate") {
      const prior = timelineFacts(await readProjectProof(projectRoot)); const proof = await begin(realJourney.alternate, 30);
      assert.notDeepEqual(selectionOrder(timelineFacts(proof)), selectionOrder(prior), "Different story intent must change selected source moments or order, not only stretch timing");
    } else if (phase === "review-held-out") {
      const before = await readProjectProof(projectRoot), prior = before.requests.at(-1); assert.equal(prior.status, "watchable");
      const after = await verifyWatchable(prior.revisions.at(-1).revision, null, 18);
      assert.deepEqual(after.model_runs, before.model_runs); assert.deepEqual(after.jobs, before.jobs); assert.deepEqual(after.requests.map((request: any) => request.model_calls), before.requests.map((request: any) => request.model_calls));
      assert.deepEqual(timelineFacts(after).source_map, timelineFacts(before).source_map);
      await log("existing-held-out-playback-without-generation-or-encoding");
    } else if (phase === "retry-renew-performance") {
      const before = await readProjectProof(projectRoot), prior = before.requests.at(-1); assert.equal(prior.status, "failed"); assert.equal(prior.authorization.original_text, realJourney.performance); assert.equal(prior.revisions.at(-1).revision, 1);
      const profileBefore = readProfileProof(userData); await queryProfile(false, ["现场音乐演出"]);
      await view("material"); await page.getByRole("button", { name: "继续制作可播放版本", exact: true }).click(); await log("explicit-latest-performance-continue-after-anchor-context-fix", { request_id: prior.authorization.request_id, revision: 1 });
      await waitUntil(async () => (await selectedRequest()).model_calls.length > prior.model_calls.length, "one new planner for existing authorized performance request");
      const after = await verifyWatchable(1, prior.latest_draft_id, 18), current = after.requests.at(-1), facts = timelineFacts(after);
      const added = current.model_calls.slice(prior.model_calls.length); assert.equal(added.length, 1); assert.equal(added[0].target.role, "planner"); assert.deepEqual(readProfileProof(userData).principles, profileBefore.principles);
      for (const clip of facts.video) assert.ok(integer(clip.source.start_pts) * 1000n >= 37010n * integer(clip.source.timescale), "Actual performance source must avoid independently documented introduction");
      assert.ok(facts.timeline.tracks.every((track: any) => !track.captions?.length));
      const receipt = await validateRenderedProof(projectRoot, after, facts.draft);
      for (const target of ["preview", "master"]) { const audio = spawnSync("ffmpeg", ["-hide_banner", "-i", resolve(projectRoot, "objects/sha256", receipt[target].output_hash.slice(0,2), receipt[target].output_hash), "-vn", "-af", "astats=metadata=0:reset=0", "-f", "null", "-"], { windowsHide:true, encoding:"utf8" }); assert.equal(audio.status,0,audio.stderr); await writeFile(resolve(attemptRoot,`performance-${target}-audio-statistics.txt`),audio.stderr); assert.match(audio.stderr.split("Overall").at(-1)??"",/RMS level dB:\s*-?\d+(?:\.\d+)?/); }
      await log("performance-new-planner-existing-observations", { source_map: facts.source_map, added_calls: added.map((call: any) => call.call_id) });
    } else if (phase === "caption-layout") {
      const before = await readProjectProof(projectRoot), prior = before.requests.at(-1), original = prior.drafts.find((draft: any) => draft.timeline_version === 1);
      assert.ok(original); const originalFacts = timelineFacts(before, original.draft_id), oldRender = await validateRenderedProof(projectRoot, before, original);
      const captions = (facts: any) => facts.timeline.tracks.flatMap((track: any) => track.captions ?? []);
      assert.ok(captions(originalFacts).some((caption: any) => caption.text.length > 50), "This technical case must retain the actually cropped long original caption");
      await writeFile(resolve(attemptRoot, "caption-layout-frozen-technical-case.json"), JSON.stringify({ original_draft: original, original_captions: captions(originalFacts), original_render: oldRender, expected: "Restore old story through the product; save exact same caption text into layout version 1; source/timing/words unchanged; no model call; story remains failed." }, null, 2));
      await view("drafts"); await selectDraftCard(original.draft_id);
      await openAdvancedVersions(); await page.getByRole("button", { name: "将所选旧版恢复为新草稿", exact: true }).click();
      const restored = await verifyWatchable(prior.revisions.at(-1).revision, prior.latest_draft_id, 18), restoredFacts = timelineFacts(restored);
      assert.deepEqual(restoredFacts.source_map, originalFacts.source_map); assert.deepEqual(captions(restoredFacts), captions(originalFacts));
      await rail.getByRole("button", { name: "精修", exact: true }).click();
      const form = page.locator('[data-creation-form="caption"]'), target = restoredFacts.timeline.tracks.flatMap((track: any) => (track.captions ?? []).map((caption: any) => ({ track, caption }))).find((item: any) => item.caption.text.length > 50);
      await form.locator('[name="caption_target"]').selectOption(JSON.stringify([target.track.track_id, target.caption.caption_id]));
      await form.locator('[name="caption_operation"]').selectOption("replace"); await form.locator('[name="caption_text"]').fill(target.caption.text);
      await form.locator('[name="raw_text"]').fill("字幕左右被裁掉了。保留这一版字幕的全部原文、原时序和画面，只按当前字幕安全区重新排版；这是技术修复，不是长期偏好，也不代表演奏故事已经通过。");
      await form.getByRole("button", { name: "保存字幕修改并制作预览", exact: true }).click();
      const repaired = await verifyWatchable(prior.revisions.at(-1).revision, restoredFacts.draft.draft_id, 18), repairedFacts = timelineFacts(repaired);
      const repairedCaption = captions(repairedFacts).find((caption: any) => caption.caption_id === target.caption.caption_id);
      assert.equal(repairedCaption.style.layout_version, 1); const { style: repairedStyle, ...repairedRest } = repairedCaption, { style: oldStyle, ...originalRest } = target.caption;
      assert.deepEqual(repairedRest, originalRest); assert.deepEqual(repairedStyle, { ...oldStyle, layout_version: 1 });
      assert.deepEqual(repairedFacts.source_map, originalFacts.source_map); assert.deepEqual(repaired.model_runs, before.model_runs); assert.deepEqual(repaired.requests.map((request: any) => request.model_calls), before.requests.map((request: any) => request.model_calls));
      assert.deepEqual(await validateRenderedProof(projectRoot, repaired, original), oldRender, "Original encoded artifact is immutable");
      await log("caption-layout-technical-regression-only", { original_draft: original.draft_id, new_draft: repairedFacts.draft.draft_id, complete_text: repairedCaption.text, original_timing: { start: repairedCaption.timeline_start, duration: repairedCaption.timeline_duration }, story_acceptance: "failed; introduction footage is deliberately retained for this technical regression" });
    } else if (phase === "renew-held-out" || phase === "renew-performance") {
      const before = await readProjectProof(projectRoot), prior = before.requests.at(-1), profileBefore = readProfileProof(userData);
      await writeFile(resolve(attemptRoot, "before-new-deployment-authorization.json"), JSON.stringify(before, null, 2));
      await queryProfile(false, phase === "renew-performance" ? ["现场音乐演出"] : undefined);
      if (phase === "renew-held-out") {
        assert.equal(profileBefore.principles.length, 1, "Frozen held-out profile must still contain only the independent corrected travel principle");
        await page.getByRole("heading", { name: "经验状态：已读取适用经验", exact: true }).waitFor();
        await capture("before-generation-visible-travel-profile");
      }
      const text = phase === "renew-held-out" ? realJourney.heldOut : realJourney.performance;
      const proof = await begin(text, 18), current = proof.requests.at(-1), facts = timelineFacts(proof);
      assert.notEqual(current.authorization.request_id, prior.authorization.request_id);
      assert.notEqual(current.authorization.deployment.digest, prior.authorization.deployment.digest);
      assert.deepEqual(readProfileProof(userData).principles, profileBefore.principles);
      if (phase === "renew-performance") {
        for (const clip of facts.video) assert.ok(integer(clip.source.start_pts) * 1000n >= 37010n * integer(clip.source.timescale), "Actual performance cuts must avoid independently documented introduction; evaluator boundary never enters the product");
        assert.ok(facts.timeline.tracks.every((track: any) => !track.captions?.length), "Selected instrumental music has no supported spoken captions");
        const receipt = await validateRenderedProof(projectRoot, proof, facts.draft);
        for (const target of ["preview", "master"]) {
          const audio = spawnSync("ffmpeg", ["-hide_banner", "-i", resolve(projectRoot, "objects/sha256", receipt[target].output_hash.slice(0, 2), receipt[target].output_hash), "-vn", "-af", "astats=metadata=0:reset=0", "-f", "null", "-"], { windowsHide: true, encoding: "utf8" }); assert.equal(audio.status, 0, audio.stderr); await writeFile(resolve(attemptRoot, `performance-${target}-audio-statistics.txt`), audio.stderr); assert.match(audio.stderr.split("Overall").at(-1) ?? "", /RMS level dB:\s*-?\d+(?:\.\d+)?/);
        }
      }
      await log("explicit-new-deployment-new-authorization", { previous_request: prior.authorization.request_id, request: current.authorization.request_id, source_map: facts.source_map });
    } else if (phase === "held-out") { await queryProfile(false); await begin(realJourney.heldOut, 18); }
    else if (phase === "performance") {
      const before = readProfileProof(userData); await queryProfile(false, ["现场音乐演出"]); const proof = await begin(realJourney.performance, 18), facts = timelineFacts(proof);
      await waitForProductionSettled(); assert.deepEqual(readProfileProof(userData).principles, before.principles, "Performance-specific requirements must not replace travel preferences");
      assert.ok(facts.timeline.tracks.every((track: any) => !track.captions?.length), "Instrumental performance must not fabricate spoken captions");
      const receipt = await validateRenderedProof(projectRoot, proof, facts.draft);
      for (const target of ["preview", "master"]) {
        const output = resolve(projectRoot, "objects/sha256", receipt[target].output_hash.slice(0, 2), receipt[target].output_hash);
        const audio = spawnSync("ffmpeg", ["-hide_banner", "-i", output, "-vn", "-af", "astats=metadata=0:reset=0", "-f", "null", "-"], { windowsHide: true, encoding: "utf8" }); assert.equal(audio.status, 0, audio.stderr);
        await writeFile(resolve(attemptRoot, `performance-${target}-audio-statistics.txt`), audio.stderr); assert.match(audio.stderr.split("Overall").at(-1) ?? "", /RMS level dB:\s*-?\d+(?:\.\d+)?/, "Real performance output must contain nonzero audio");
      }
      await log("performance-context-and-real-audio-verified", { source_map: facts.source_map, semantic_graph_hash: receipt.semantic_graph_hash });
    }
    else if (phase === "performance-feedback" || phase === "retry-performance-feedback") {
      const text = "上一版大部分还是开场介绍。请去掉开场介绍，选择真正正在演奏的段落，做成18秒至少四个镜头，展示演奏者、指挥和乐器的关系，保留同期音乐，不给介绍配字幕。这只是本次作品的纠正，不更新长期偏好。";
      await writeFile(resolve(attemptRoot, "performance-feedback-frozen-evaluator.json"), JSON.stringify({ prompt: text, evaluator_only_official_vtt: "source-rights/D01-official-evaluator-only.vtt", observed_introduction_end_seconds: "37.010", generation_boundary: "Only the natural prompt above enters generation; official timings/words are never submitted" }, null, 2), { flag: "wx" });
      const beforeProfile = readProfileProof(userData); let proof: any;
      if (phase === "retry-performance-feedback") {
        const before = await readProjectProof(projectRoot), prior = before.requests.at(-1); assert.equal(prior.status, "failed"); assert.equal(prior.revisions.at(-1).raw_text, text);
        await writeFile(resolve(attemptRoot, "before-performance-explicit-retry.json"), JSON.stringify(before, null, 2));
        await view("material"); await page.getByRole("button", { name: "继续制作可播放版本", exact: true }).click();
        await log("explicit-performance-retry-after-source-unit-fix", { revision: prior.revisions.at(-1).revision });
        await waitUntil(async () => { const current = await selectedRequest(); return current.model_calls.length > prior.model_calls.length; }, "new explicit performance planner attempt");
        proof = await verifyWatchable(prior.revisions.at(-1).revision, prior.latest_draft_id, 18);
        for (const failure of before.objects.filter((item: any) => item.object_type === "creation_production_failure")) assert.ok(proof.objects.some((item: any) => item.object_hash === failure.object_hash));
      } else proof = await revise(text, 18);
      const facts = timelineFacts(proof);
      for (const clip of facts.video) assert.ok(integer(clip.source.start_pts) * 1000n >= 37010n * integer(clip.source.timescale), "Every selected shot must avoid the independently documented spoken introduction");
      assert.ok(facts.timeline.tracks.every((track: any) => !track.captions?.length), "The corrected performance must omit introduction captions");
      const receipt = await validateRenderedProof(projectRoot, proof, facts.draft);
      for (const target of ["preview", "master"]) {
        const audio = spawnSync("ffmpeg", ["-hide_banner", "-i", resolve(projectRoot, "objects/sha256", receipt[target].output_hash.slice(0, 2), receipt[target].output_hash), "-vn", "-af", "astats=metadata=0:reset=0", "-f", "null", "-"], { windowsHide: true, encoding: "utf8" }); assert.equal(audio.status, 0, audio.stderr); await writeFile(resolve(attemptRoot, `performance-${target}-audio-statistics.txt`), audio.stderr); assert.match(audio.stderr.split("Overall").at(-1) ?? "", /RMS level dB:\s*-?\d+(?:\.\d+)?/);
      }
      await waitForProductionSettled(); assert.deepEqual(readProfileProof(userData).principles, beforeProfile.principles);
      await log("performance-selection-corrected-with-real-audio", { source_map: facts.source_map });
    }
    else if (phase === "retry-opposite") {
      const before = await readProjectProof(projectRoot), prior = before.requests.at(-1), profile = readProfileProof(userData);
      assert.equal(prior.status, "failed"); assert.equal(prior.revisions.at(-1).raw_text, realJourney.opposite);
      const failure = before.objects.filter((item: any) => item.object_type === "creation_production_failure" && item.value.input_revision === prior.revisions.at(-1).revision).at(-1);
      assert.equal(failure.value.error.cause.code, "CREATION_SOURCE_WINDOW_OUTSIDE_MEDIA");
      assert.equal(failure.value.error.output_diagnostic.sha256, "1672a91a40eebc6a90aa6e37f5ca03d46de0c742dcddd0ce38aceffdbde6fd15", "This phase is bound to the independently inspected latest cross-span/window-capacity failure");
      const profileVersionChanged = failure.value.error.creation_generation_binding.profile.version !== profile.version;
      assert.deepEqual(profile.principles, failure.value.error.planning_diagnostic.root_input.context.profile.principles, "A14 no-inference may advance the profile version but cannot alter the frozen opposite-test principles");
      await queryProfile(false);
      await log("opposite-profile-reapplied-through-visible-context", { version: profile.version, previous_failure_version: failure.value.error.creation_generation_binding.profile.version, principal_ids: profile.principles.map((item: any) => item.principle_id), old_diagnostic_must_be_excluded: profileVersionChanged });
      await writeFile(resolve(attemptRoot, "before-explicit-diagnostic-iteration.json"), JSON.stringify(before, null, 2));
      await view("material"); await page.getByRole("button", { name: "继续制作可播放版本", exact: true }).click();
      await log("explicit-capacity-diagnostic-iteration", { previous_output_sha256: failure.value.error.output_diagnostic.sha256, frozen_prompt: realJourney.opposite });
      await waitUntil(async () => (await selectedRequest()).model_calls.length > prior.model_calls.length, "new explicit diagnostic run", 25 * 60 * 1000);
      const after = await verifyWatchable(prior.revisions.at(-1).revision, prior.latest_draft_id, 30), current = after.requests.at(-1), facts = timelineFacts(after);
      const run = after.model_runs.find((item: any) => item.model_run_id === facts.draft.source.run_id);
      const path = resolve(projectRoot, "objects/sha256", run.input_object_hash.slice(0, 2), run.input_object_hash); assert.equal(await digestFile(path), run.input_object_hash);
      const input = JSON.parse(await readFile(path, "utf8")), diagnostic = input.context.previous_generation_failure;
      assert.equal(input.context.generation_binding.profile.version, profile.version);
      if (profileVersionChanged) assert.equal(diagnostic, null, "A historical failure from a different profile version must never be fed back");
      if (diagnostic !== null) {
        const cited = before.objects.find((item: any) => item.object_type === "creation_production_failure" && item.value.error?.output_diagnostic?.sha256 === diagnostic.previous_output_sha256); assert.ok(cited, "Any prior diagnosis must cite preserved actual failure");
        if (diagnostic.code === "CREATION_DECISION_CAPACITY_INSUFFICIENT") { const raw = JSON.parse(cited.value.error.output_diagnostic.payload), decision = raw.decision ?? raw, grid = input.context.timeline.sequence.timebase; const capacity = decision.shots.reduce((sum: bigint, shot: any) => { const a = shot.source_window.start, b = shot.source_window.end; return sum + (BigInt(b.value) * BigInt(a.timescale) - BigInt(a.value) * BigInt(b.timescale)) * BigInt(grid.timescale) / (BigInt(a.timescale) * BigInt(b.timescale) * BigInt(grid.value)); }, 0n); assert.equal(diagnostic.previous_total_capacity_ticks, String(capacity)); assert.equal(diagnostic.deficit_ticks, String(BigInt(decision.target_duration_ticks) > capacity ? BigInt(decision.target_duration_ticks) - capacity : 0n)); }
      }
      const calls = current.model_calls.filter((item: any) => !prior.model_calls.some((old: any) => old.call_id === item.call_id));
      const audit = JSON.parse(run.metadata_json).audit.planning; verifyPlanningRounds(input, audit, calls);
      assert.equal(observationCount(after, current.authorization.request_id), observationCount(before, prior.authorization.request_id));
      await writeFile(resolve(attemptRoot, "actual-bounded-planning-audit.json"), JSON.stringify({ root_input_hash: run.input_object_hash, diagnostic, planning: audit, calls }, null, 2));
      await waitForProductionSettled(); assert.deepEqual(readProfileProof(userData).principles, profile.principles);
      for (const old of before.objects.filter((item: any) => item.object_type === "creation_production_failure")) assert.ok(after.objects.some((item: any) => item.object_hash === old.object_hash));
      await log("current-opposite-with-bound-diagnostic-verified", { diagnostic, calls });
    }
    else if (phase === "repair-opposite" || phase === "retry-repair-opposite") {
      const before = await readProjectProof(projectRoot), prior = before.requests.at(-1), profileBefore = readProfileProof(userData);
      assert.equal(prior.status, "failed"); assert.equal(prior.revisions.at(-1).raw_text, phase === "retry-repair-opposite" ? realJourney.repairedOpposite : realJourney.exception);
      const original = timelineFacts(before, prior.drafts.find((draft: any) => draft.timeline_version === 1)?.draft_id), fragmented = timelineFacts(before, prior.drafts.find((draft: any) => draft.timeline_version === 2)?.draft_id);
      assertExactDuration(original, 18); assertExactDuration(fragmented, 30); assert.equal(original.video.length, 5); assert.equal(fragmented.video.length, 11);
      await queryProfile(false); await view("drafts"); await selectDraftCard(original.draft.draft_id);
      await page.getByRole("button", { name: "观看此版", exact: true }).click(); await playVersion(1);
      await waitUntil(async () => (await selectedRequest()).viewed_draft_id === original.draft.draft_id, "original v1 actually viewed before pacing feedback");
      const beforeRevision = await selectedRequest(); assert.equal(beforeRevision.latest_draft_id, fragmented.draft.draft_id, "Watching the baseline must not replace the latest draft");
      const pacing = (facts: any) => { const durations = facts.video.map((clip: any) => integer(clip.timeline_duration)); return { version: facts.draft.timeline_version, ticks: durations.map(String), total_ticks: String(durations.reduce((sum: bigint, value: bigint) => sum + value, 0n)), minimum_ticks: String(durations.reduce((minimum: bigint, value: bigint) => value < minimum ? value : minimum)), count: durations.length, timebase: facts.timeline.sequence.timebase }; };
      await writeFile(resolve(attemptRoot, "frozen-pacing-repair-baselines.json"), JSON.stringify({ prompt: realJourney.repairedOpposite, viewed: pacing(original), latest: pacing(fragmented), acceptance: "30 seconds; mean shot duration strictly exceeds both baselines; shortest shot is no shorter than the original v1 minimum. Actual source legality, image playback and unchanged principles are independently checked. No source timecodes or shot count answer enter the prompt." }, null, 2), { flag: "wx" });
      let after: any;
      if (phase === "retry-repair-opposite") {
        await view("material");
        const oldFailureHashes = new Set(before.objects.filter((item: any) => item.object_type === "creation_production_failure").map((item: any) => item.object_hash)), oldCallIds = new Set(prior.model_calls.map((item: any) => item.call_id));
        const noticeBefore = await page.locator('.notice[role="status"]').innerText();
        await page.locator('.notice[role="status"]').evaluate((element: HTMLElement) => {
          const events: { text: string; at: number }[] = []; (element as any).__realAdmissionNotices = events;
          events.push({ text: element.textContent ?? "", at: performance.now() });
          const observer = new MutationObserver(() => { const text = element.textContent ?? ""; if (events.at(-1)?.text !== text) events.push({ text, at: performance.now() }); });
          (element as any).__realAdmissionObserver = observer; observer.observe(element, { childList: true, subtree: true, characterData: true });
        });
        await page.getByRole("button", { name: "继续制作可播放版本", exact: true }).click();
        await log("explicit-pacing-repair-continuation", { revision: prior.revisions.at(-1).revision, prompt_unchanged: realJourney.repairedOpposite });
        await waitUntil(async () => {
          const current = await selectedRequest(), db = new DatabaseSync(resolve(projectRoot, "project.sqlite"), { readOnly: true });
          let rows: any[]; try { rows = db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key=?").all(prior.authorization.request_id); } finally { db.close(); }
          const added = rows.filter(item => !oldFailureHashes.has(item.object_hash));
          if (added.length) {
            const failures = await Promise.all(added.map(async item => { const path = resolve(projectRoot, "objects/sha256", item.object_hash.slice(0, 2), item.object_hash); assert.equal(await digestFile(path), item.object_hash); return { object_hash: item.object_hash, value: JSON.parse(await readFile(path, "utf8")) }; }));
            await writeFile(resolve(attemptRoot, "new-admission-failures.json"), JSON.stringify(failures, null, 2));
            throw new Error(`REAL_CREATION_NEW_ATTEMPT_FAILED: ${failures.map(item => item.value.error.code ?? item.value.error.message).join("; ")}`);
          }
          const addedCalls = current.model_calls.filter((item: any) => !oldCallIds.has(item.call_id));
          if (addedCalls.length) { await log("new-production-ticket-persisted", { before_sequence: prior.sequence, current_sequence: current.sequence, calls: addedCalls }); return true; }
          const notice = await page.locator('.notice[role="status"]').innerText();
          const noticeEvents = await page.locator('.notice[role="status"]').evaluate((element: HTMLElement) => (element as any).__realAdmissionNotices);
          assert.ok(Array.isArray(noticeEvents), "Admission's observed status node must remain available");
          if ((notice !== noticeBefore || noticeEvents.some((item: any) => item.text === "正在执行…")) && notice !== "正在执行…" && current.status === "failed" && current.active_run === null) {
            await writeFile(resolve(attemptRoot, "new-admission-ui-error.json"), JSON.stringify({ before: noticeBefore, current: notice, notice_events: noticeEvents, sequence: current.sequence, old_failure_hashes: [...oldFailureHashes] }, null, 2));
            throw new Error(`REAL_CREATION_ADMISSION_UI_ERROR: ${notice}`);
          }
          return false;
        }, "this explicit continuation has its own persisted model ticket or new failure identity", 25 * 60 * 1000);
        await page.locator('.notice[role="status"]').evaluate((element: HTMLElement) => (element as any).__realAdmissionObserver.disconnect());
        after = await verifyWatchable(prior.revisions.at(-1).revision, prior.latest_draft_id, 30);
      } else after = await revise(realJourney.repairedOpposite, 30);
      const current = after.requests.at(-1), facts = timelineFacts(after);
      const revision = current.revisions.at(-1); assert.equal(revision.viewed_timeline_version, original.draft.timeline_version); assert.equal(revision.base_timeline_version, fragmented.draft.timeline_version);
      const actual = pacing(facts), baselines = [pacing(original), pacing(fragmented)];
      for (const base of baselines) assert.ok(BigInt(actual.total_ticks) * integer(actual.timebase.value) * integer(base.timebase.timescale) * BigInt(base.count) > BigInt(base.total_ticks) * integer(base.timebase.value) * integer(actual.timebase.timescale) * BigInt(actual.count), "Actual mean shot length must be more relaxed than both the original and the fragmented edit");
      const baseline = baselines[0]; assert.ok(BigInt(actual.minimum_ticks) * integer(actual.timebase.value) * integer(baseline.timebase.timescale) >= BigInt(baseline.minimum_ticks) * integer(baseline.timebase.value) * integer(actual.timebase.timescale), "No flash ending shorter than the original shortest shot");
      await waitForProductionSettled(); assert.deepEqual(readProfileProof(userData).principles, profileBefore.principles);
      const run = after.model_runs.find((item: any) => item.model_run_id === facts.draft.source.run_id), inputPath = resolve(projectRoot, "objects/sha256", run.input_object_hash.slice(0, 2), run.input_object_hash);
      assert.equal(await digestFile(inputPath), run.input_object_hash); const input = JSON.parse(await readFile(inputPath, "utf8")), calls = current.model_calls.filter((item: any) => !prior.model_calls.some((old: any) => old.call_id === item.call_id));
      verifyPlanningRounds(input, JSON.parse(run.metadata_json).audit.planning, calls);
      assert.equal(observationCount(after, current.authorization.request_id), observationCount(before, prior.authorization.request_id));
      for (const old of before.objects.filter((item: any) => item.object_type === "creation_production_failure")) assert.ok(after.objects.some((item: any) => item.object_hash === old.object_hash));
      await writeFile(resolve(attemptRoot, "independent-pacing-repair-comparison.json"), JSON.stringify({ actual, baselines, revision, source_map: facts.source_map, root_input_hash: run.input_object_hash, calls }, null, 2));
      await log("pacing-repair-compared-with-original-and-fragmented-versions", { actual, baselines });
    }
    else if (phase === "opposite") { await queryProfile(false); const before = readProfileProof(userData); await revise(realJourney.opposite, 30); await waitForProductionSettled(); assert.deepEqual(readProfileProof(userData).principles, before.principles, "Current requirement cannot replace long-term profile"); }
    else if (phase === "exception") { await queryProfile(true); const before = readProfileProof(userData); await revise(realJourney.exception, 24); await waitForProductionSettled(); assert.deepEqual(readProfileProof(userData).principles, before.principles, "One-off exception cannot rewrite long-term profile"); }
    else if (phase === "correction" || phase === "resume-correction" || phase === "resume-explicit-correction") {
      const learned = JSON.parse(await readFile(resolve(learnedRoot, "project.json"), "utf8")); await queryProfile(false);
      if (phase === "correction") { await configure([learned.project_id, project.project_id]); await queryProfile(false); }
      const before = readProfileProof(userData);
      const learningOnly = phase === "resume-explicit-correction";
      const originalCorrectionProfile = learningOnly ? JSON.parse(await readFile(resolve(journeyRoot, "phase-resume-correction-1790546884736/before-explicit-correction-resume.json"), "utf8")).profile : before;
      const beforeLearningOnly = learningOnly ? await readProjectProof(projectRoot) : null;
      if (learningOnly) {
        const current = beforeLearningOnly.requests.at(-1), facts = timelineFacts(beforeLearningOnly);
        assert.equal(current.revisions.at(-1).raw_text, realJourney.correction); assert.equal(current.revisions.at(-1).revision, 6);
        assert.equal(facts.draft.timeline_version, 5); assertExactDuration(facts, 24);
        assert.equal(facts.draft.source.run_id, "2b04452e-3939-403a-818a-95152948c927");
        assert.ok(before.consent.source_project_ids.includes(learned.project_id) && before.consent.source_project_ids.includes(project.project_id));
        await writeFile(resolve(attemptRoot, "before-explicit-learning-only-resume.json"), JSON.stringify({ profile: before, project: beforeLearningOnly, predecessor_profile_version: originalCorrectionProfile.version, boundary: "Same v5 and correction text; previous click timed out and cleanup cancelled only the explicit learning. No new generation, revision, consent or encode." }, null, 2));
        await view("drafts"); await selectDraftCard(facts.draft.draft_id); await queryProfile(false);
      } else if (phase === "resume-correction") {
        assert.ok(before.consent.source_project_ids.includes(learned.project_id) && before.consent.source_project_ids.includes(project.project_id), "Already confirmed exact A+B scope must remain present; do not silently reauthorize");
        const prior = await selectedRequest(); assert.equal(prior.status, "failed"); assert.equal(prior.revisions.at(-1).raw_text, realJourney.correction);
        const db = new DatabaseSync(resolve(projectRoot, "project.sqlite"), { readOnly: true }); let oldFailures: any[];
        try { oldFailures = db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key=?").all(prior.authorization.request_id); } finally { db.close(); }
        const oldHashes = new Set(oldFailures.map(item => item.object_hash)), oldCalls = new Set(prior.model_calls.map((item: any) => item.call_id));
        await writeFile(resolve(attemptRoot, "before-explicit-correction-resume.json"), JSON.stringify({ profile: before, revision: prior.revisions.at(-1), old_call_ids: [...oldCalls], old_failure_hashes: [...oldHashes] }, null, 2));
        await view("material"); await page.getByRole("button", { name: "继续制作可播放版本", exact: true }).click({ noWaitAfter: true });
        await log("explicit-same-revision-correction-resume", { revision: prior.revisions.at(-1).revision, text: realJourney.correction, boundary: "Same submitted revision; no new feedback or consent; SPA click does not wait for unrelated navigation" });
        await waitUntil(async () => {
          const current = await selectedRequest(), db = new DatabaseSync(resolve(projectRoot, "project.sqlite"), { readOnly: true }); let rows: any[];
          try { rows = db.prepare("SELECT object_hash FROM object_refs WHERE object_type='creation_production_failure' AND relation_key=?").all(prior.authorization.request_id); } finally { db.close(); }
          const added = rows.filter(item => !oldHashes.has(item.object_hash));
          if (added.length) { const failures = await Promise.all(added.map(async item => { const path = resolve(projectRoot, "objects/sha256", item.object_hash.slice(0, 2), item.object_hash); assert.equal(await digestFile(path), item.object_hash); return { object_hash: item.object_hash, value: JSON.parse(await readFile(path, "utf8")) }; })); await writeFile(resolve(attemptRoot, "new-admission-failures.json"), JSON.stringify(failures, null, 2)); throw new Error(`REAL_CREATION_NEW_ATTEMPT_FAILED: ${failures.map(item => item.value.error.code).join("; ")}`); }
          const calls = current.model_calls.filter((item: any) => !oldCalls.has(item.call_id)); if (calls.length) { await log("new-production-ticket-persisted", { revision: current.revisions.at(-1).revision, calls }); return true; } return false;
        }, "this same-revision explicit continuation has a new persisted ticket or failure", 25 * 60 * 1000);
        await verifyWatchable(prior.revisions.at(-1).revision, prior.latest_draft_id, 24);
      } else await revise(realJourney.correction, 24);
      if (!learningOnly) await waitForProductionSettled();
      await writeFile(resolve(attemptRoot, "automatic-learning-before-explicit-correction.json"), JSON.stringify({ profile: readProfileProof(userData), project: await readProjectProof(projectRoot) }, null, 2));
      await queryProfile(false);
      const form = page.locator('[data-creation-form="learn"]'); await form.locator('[name="kind"]').selectOption("feedback");
      const visiblePredecessors = await form.locator('[name="correction_ids"] option').evaluateAll((items: HTMLOptionElement[]) => items.filter(item => item.value).map(item => ({ id: item.value, visible_statement: item.textContent })));
      const selectedPredecessors = visiblePredecessors.filter((item: any) => originalCorrectionProfile.principles.some((old: any) => old.principle_id === item.id && old.contexts.some((context: string) => /travel|旅行/i.test(context))));
      assert.ok(selectedPredecessors.length > 0, "Explicit correction needs the old travel principles still visible in the product");
      await form.locator('[name="correction_ids"]').selectOption(selectedPredecessors.map((item: any) => item.id));
      await log("visible-principles-selected-for-correction", selectedPredecessors.map((item: any) => ({ ...item, reason: "Previously learned travel pacing present before this correction; newly learned principles are not predecessors" })));
      await form.getByRole("button", { name: "学习所选经验", exact: true }).click({ noWaitAfter: true, timeout: 120000 });
      await log("explicit-correction-click-receipt", { action_receipt_budget_ms: 120000, learning_deadline_ms: 15 * 60 * 1000, reason: "Prior default 30-second action receipt expired during actual preparation; no product timeout changed" });
      await waitUntil(() => readProfileProof(userData).corrections.length > before.corrections.length, "explicit correction inference", 15 * 60 * 1000);
      await writeFile(resolve(attemptRoot, "corrected-profile.json"), JSON.stringify(readProfileProof(userData), null, 2));
      if (learningOnly) {
        const after = await readProjectProof(projectRoot), prior = beforeLearningOnly.requests.at(-1), current = after.requests.at(-1);
        assert.deepEqual(current.drafts, prior.drafts); assert.deepEqual(current.revisions, prior.revisions); assert.deepEqual(after.jobs, beforeLearningOnly.jobs);
        const added = current.model_calls.filter((item: any) => !prior.model_calls.some((old: any) => old.call_id === item.call_id));
        assert.equal(added.length, 1); assert.equal(added[0].settlement.status, "response");
        await log("same-v5-explicit-correction-registered", { additional_learning_calls: added.length, additional_generation_calls: 0, additional_worker_jobs: 0, selected_predecessors: selectedPredecessors });
      }
    } else if (phase === "forget") {
      await queryProfile(false); const before = readProfileProof(userData), source = JSON.parse(await readFile(resolve(learnedRoot, "project.json"), "utf8")).project_id;
      assert.ok(before.corrections.length > 0, "Forget follows the actually registered explicit correction");
      const correction = before.corrections.at(-1), successors = before.principles.filter((item: any) => correction.successor_principle_ids.includes(item.principle_id));
      const predecessorStatements = before.principles.filter((item: any) => correction.correction.predecessors.some((ref: any) => ref.principle_id === item.principle_id)).map((item: any) => item.statement);
      const visibleStatements = async () => page.getByRole("heading", { name: /^经验状态：/ }).locator("..").locator(":scope > div.stage2-copy > p:first-child").allTextContents();
      await waitUntil(async () => { const statements = await visibleStatements(); return successors.every((item: any) => statements.includes(item.statement)) && predecessorStatements.every((statement: string) => !statements.includes(statement)); }, "actual query returns correction successors and excludes superseded predecessor");
      await writeFile(resolve(attemptRoot, "visible-corrected-query-before-forget.json"), JSON.stringify({ profile_version: before.version, statements: await visibleStatements(), successors: successors.map((item: any) => item.principle_id), excluded_predecessor_statements: predecessorStatements }, null, 2));
      await capture("corrected-query-before-forget");
      const key = (item: any) => JSON.stringify([item.source_project_id, item.source_event_id]), affected = new Set(before.processed_events.filter((item: any) => item.source_project_id === source).map(key));
      for (const item of [...before.corrections].sort((a: any, b: any) => a.registered_version - b.registered_version)) if (item.correction.predecessors.some((ref: any) => affected.has(key(ref)))) affected.add(key(item));
      const events = before.processed_events.filter((item: any) => affected.has(key(item))), principles = before.principles.filter((item: any) => affected.has(key(item)));
      const detail = [`档案：${before.profile_id} · v${before.version}`, `遗忘来源项目：\n${source}`, principles.map((item: any) => `• ${item.statement}（${item.contexts.join("、")}；来源作品 ${item.source_project_id}）`).join("\n"), `将移除 ${events.length} 条经验、${principles.length} 条原则，包含依赖这些经验的纠正结果。`, "这些来源和受影响经验后续不能重新用于个性化；项目中的作品与历史记录仍保留。"].join("\n\n");
      await armConfirmation(app, { type: "warning", title: "AVE 遗忘经验", message: "确认移除指定来源及依赖经验", detail, buttons: ["取消", "确认遗忘"], defaultId: 0, cancelId: 0, noLink: true });
      const form = page.locator('[data-creation-form="forget"]'); await form.locator('[name="source_project_ids"]').selectOption([source]); await form.getByRole("button", { name: "核对并遗忘", exact: true }).click();
      report.authorizations = await readConfirmationAudit(app); await save();
      await waitUntil(() => readProfileProof(userData).deletion_generation > before.deletion_generation, "forget commit");
      const after = readProfileProof(userData); assert.ok(after.excluded_sources.includes(source)); assert.ok(after.principles.every((item: any) => !affected.has(key(item)))); assert.ok(after.processed_events.every((item: any) => !affected.has(key(item))));
      await writeFile(resolve(attemptRoot, "forgotten-profile.json"), JSON.stringify({ before, after, affected: [...affected] }, null, 2));
      // Test role selects the actual just-corrected B version, whose learning event
      // was removed through its predecessor dependency. No arbitrary reference is injected.
      const excludedBefore = await readProjectProof(projectRoot), oldDraft = timelineFacts(excludedBefore).draft;
      assert.ok(events.some((item: any) => item.source_project_id === project.project_id), "Forgetting must include this project's dependent correction event");
      await view("drafts"); const visibleOption = await visibleDraftCards();
      const targetOption = visibleOption.find((item: any) => item.value === oldDraft.draft_id); assert.ok(targetOption, "The actual historical work remains reviewable after forgetting");
      await selectDraftCard(oldDraft.draft_id); await view("档案");
      const rejectedLearn = page.locator('[data-creation-form="learn"]'); await rejectedLearn.locator('[name="kind"]').selectOption("feedback"); await rejectedLearn.locator('[name="correction_ids"]').selectOption([]);
      await log("test-role-attempts-excluded-historical-feedback", { visible_version: targetOption.text, reason: "This correction's predecessor was forgotten; historical work remains but learning from the excluded event must not resume" });
      await rejectedLearn.getByRole("button", { name: "学习所选经验", exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes("PROFILE_EVENT_EXCLUDED"), undefined, { timeout: 60000 });
      const rejectedAfter = await readProjectProof(projectRoot); assert.deepEqual(rejectedAfter.requests.map((item: any) => item.model_calls), excludedBefore.requests.map((item: any) => item.model_calls)); assert.deepEqual(readProfileProof(userData), after);
      await capture("forgotten-historical-feedback-explicitly-rejected"); await log("excluded-feedback-cannot-relearn-through-real-ui", { code: "PROFILE_EVENT_EXCLUDED", additional_model_calls: 0 });

    } else if (phase === "after-forget") {
      await queryProfile(false); const before = readProfileProof(userData); const generated = await begin(realJourney.afterForget, 18); assert.deepEqual(readProfileProof(userData).excluded_sources, before.excluded_sources);
      const generatedRequest = await selectedRequest(); assert.equal(generatedRequest.viewed_draft_id, timelineFacts(generated).draft.draft_id); await app.close(); app = undefined;
      app = await launchRealDesktop(repository, reviewRoot, attemptRoot, entrypoint, userData, modelConfig); page = await app.firstWindow(); rail = page.getByRole("navigation", { name: "工作台导航" }); page.on("pageerror", (error: Error) => report.errors.push({ message: error.message, stack: error.stack })); await openProject(projectRoot);
      await view("drafts"); const reopened = await selectedRequest(); assert.equal(reopened.latest_draft_id, generatedRequest.latest_draft_id); assert.equal(reopened.viewed_draft_id, generatedRequest.viewed_draft_id);
      await playVersion(timelineFacts(generated).draft.timeline_version); await queryProfile(false);
      assert.deepEqual(readProfileProof(userData).excluded_sources, before.excluded_sources); await capture("new-project-after-forget-reopened");
      await log("global-forgetting-survives-new-project-generation-and-reopen", { new_project_id: project.project_id, excluded_sources: before.excluded_sources });
    }
    else if (phase === "after-forget-feedback") {
      const beforeProof = await readProjectProof(projectRoot), previous = beforeProof.requests.at(-1), beforeProfile = readProfileProof(userData);
      assert.equal(previous.status, "failed"); assert.equal(previous.revisions.at(-1).revision, 1); assert.equal(timelineFacts(beforeProof).draft.timeline_version, 1);
      const text = "去掉原片自带的公园标志和静态字卡，用真实拍摄的海边环境画面结束。成片仍然做18秒，至少四个镜头；保留真实可用原声，不编对白或新增字幕。这只是本次作品修正，不是长期偏好，也不要恢复已经删除的经验。";
      await writeFile(resolve(attemptRoot, "after-forget-feedback-frozen-extension.json"), JSON.stringify({ frozen_before_submission: new Date().toISOString(), prompt: text, reason: "The first v1 selected the original static NPS/Acadia end card; real QC correctly blocked it. This is a new normal creative feedback revision, not code repair or unchanged retry.", expected: { seconds: 18, minimum_shots: 4, original_static_end_card_removed: true, profile_unchanged: true, old_qc_failure_preserved: true }, evaluator_only: { excluded_source_span: "B02 scene span 12 from failed actual generation", source_frames: "phase-after-forget-1790547782470/actual-source-freeze-diagnosis" } }, null, 2), { flag: "wx" });
      await queryProfile(false); await view("request"); const form = page.locator('[data-creation-form="revise"]');
      await form.locator('[name="raw_text"]').fill(text); await form.getByRole("button", { name: "提交并继续制作", exact: true }).click({ noWaitAfter: true, timeout: 120000 });
      await waitUntil(async () => (await selectedRequest()).revisions.at(-1).revision === 2, "new natural feedback revision admitted", 120000);
      await log("new-creative-feedback-after-static-end-card-qc", { text, previous_draft: previous.latest_draft_id });
      const proof = await verifyWatchable(2, previous.latest_draft_id, 18), facts = timelineFacts(proof), generatedRequest = await selectedRequest();
      assert.equal(generatedRequest.viewed_draft_id, facts.draft.draft_id, "Reopen baseline follows actual post-playback viewing, not the pre-playback proof snapshot");
      const run = proof.model_runs.find((item: any) => item.model_run_id === facts.draft.source.run_id), output = JSON.parse(await readFile(resolve(projectRoot, "objects/sha256", run.output_object_hash.slice(0, 2), run.output_object_hash), "utf8"));
      assert.ok(output.shots.every((shot: any) => !shot.source_window.span_id.endsWith(":12")), "Actual known static-end-card scene cannot remain in the new selection");
      assert.deepEqual(readProfileProof(userData), beforeProfile, "This current work correction cannot rewrite the remaining profile or restore forgotten events");
      for (const failure of beforeProof.objects.filter((item: any) => item.object_type === "creation_production_failure")) assert.ok(proof.objects.some((item: any) => item.object_hash === failure.object_hash));
      await app.close(); app = undefined;
      app = await launchRealDesktop(repository, reviewRoot, attemptRoot, entrypoint, userData, modelConfig); page = await app.firstWindow(); rail = page.getByRole("navigation", { name: "工作台导航" }); page.on("pageerror", (error: Error) => report.errors.push({ message: error.message, stack: error.stack })); await openProject(projectRoot);
      await view("drafts"); const reopened = await selectedRequest(); assert.equal(reopened.latest_draft_id, generatedRequest.latest_draft_id); assert.equal(reopened.viewed_draft_id, generatedRequest.viewed_draft_id);
      await playVersion(facts.draft.timeline_version); await queryProfile(false); assert.deepEqual(readProfileProof(userData), beforeProfile); await capture("new-project-after-forget-corrected-reopened");
      await log("global-forgetting-and-explicit-18-seconds-survive-creative-correction-and-reopen", { new_project_id: project.project_id, source_map: facts.source_map, prior_qc_failure_preserved: true });
    }
    else if (phase === "retry-caption") {
      const before = await readProjectProof(projectRoot), prior = before.requests.at(-1), manual = timelineFacts(before), texts = ["每一步都通往成长", "远方总有新的答案"];
      assert.equal(prior.status, "failed"); assert.ok(texts.every(text => prior.revisions.at(-1).raw_text.includes(text)));
      assert.ok(texts.every(text => manual.timeline.tracks.some((track: any) => track.captions?.some((caption: any) => caption.text === text))), "Both creator-added captions remain available after the rejected candidate");
      const profileBefore = readProfileProof(userData); await writeFile(resolve(attemptRoot,"before-explicit-caption-resume.json"),JSON.stringify(before,null,2));
      await view("material"); await page.getByRole("button", { name: "继续制作可播放版本", exact: true }).click(); await log("explicit-caption-resume-after-preservation-context-fix", { revision:prior.revisions.at(-1).revision, raw_text:prior.revisions.at(-1).raw_text });
      await waitUntil(async () => (await selectedRequest()).model_calls.length > prior.model_calls.length, "new explicit caption generation attempt after authorized material preparation", 25 * 60 * 1000);
      const proof=await verifyWatchable(prior.revisions.at(-1).revision,prior.latest_draft_id,12), actual=timelineFacts(proof);
      assert.deepEqual(actual.source_map,manual.source_map); assert.deepEqual(actual.timeline.tracks.filter((track:any)=>track.kind==="audio"),manual.timeline.tracks.filter((track:any)=>track.kind==="audio"));
      for(const text of texts) assert.ok(actual.timeline.tracks.every((track:any)=>!track.captions?.some((caption:any)=>caption.text===text)));
      assert.deepEqual(readProfileProof(userData).principles,profileBefore.principles,"Technical caption correction is not a long-term preference");
      for(const failure of before.objects.filter((item:any)=>item.object_type==="creation_production_failure")) assert.ok(proof.objects.some((item:any)=>item.object_hash===failure.object_hash));
      await log("two-shot-captions-removed-after-explicit-resume",{source_map:actual.source_map,removed:texts,old_failed_attempts_preserved:true});
    }
    else if (phase === "caption") {
      await selectLatest(); const before = timelineFacts(await readProjectProof(projectRoot));
      await rail.getByRole("button", { name: "精修", exact: true }).click();
      const form = page.locator('[data-creation-form="manual"]'), captionTexts = ["每一步都通往成长", "远方总有新的答案"], protectedClips: string[] = [];
      await writeFile(resolve(attemptRoot, "two-shot-editorial-caption-extension.json"), JSON.stringify({ texts: captionTexts, intent: "Test identity adds editorial summaries on two distinct shots, then removes both through one natural feedback; these are not original speech or long-term preferences", expected: "Both captions removed while source ranges/order/audio stay identical" }, null, 2), { flag: "wx" });
      let manual = before;
      for (const [index, captionText] of captionTexts.entries()) {
        const targets = await form.locator('[name="target"] option').evaluateAll((items: HTMLOptionElement[]) => items.filter(item => item.textContent?.startsWith("画面")).map(item => item.value)), target = targets[index]; assert.ok(target);
        protectedClips.push(JSON.parse(target)[1]); await form.locator('[name="target"]').selectOption(target);
        await form.locator('[name="raw_text"]').fill(`测试身份在第${index + 1}个镜头添加编辑字幕，用于随后真实反馈删除，不是原声台词，也不是长期偏好。`);
        await form.locator('[name="caption_text"]').fill(captionText); await form.locator('[name="caption_start"]').fill(String(n(manual.video[index].timeline_start) * manual.unit)); await form.locator('[name="caption_duration"]').fill("1");
        const priorDraft = manual.draft.draft_id; await form.getByRole("button", { name: "保存手动修改版", exact: true }).click();
        await waitUntil(async () => (await selectedRequest()).latest_draft_id !== priorDraft, "manual caption draft");
        await page.getByRole("button", { name: "制作预览与成片", exact: true }).click();
        manual = timelineFacts(await verifyWatchable((await selectedRequest()).revisions.at(-1).revision, priorDraft, before.seconds));
        assert.ok(manual.timeline.tracks.some((track: any) => track.captions?.some((caption: any) => caption.text === captionText)));
      }
      assert.equal(new Set(protectedClips).size, 2);
      await view("request"); const feedback = page.locator('[data-creation-form="revise"]'); await feedback.locator('[name="preserve_refs"]').selectOption(protectedClips);
      const proof = await revise(`删掉“${captionTexts[0]}”和“${captionTexts[1]}”这两句不同镜头上的字幕，都太像总结了。保护这两个相关画面；其他镜头、源片范围、顺序、音轨和总时长不变。这次只是具体字幕修正，不是长期偏好。`, before.seconds);
      const after = timelineFacts(proof); assert.deepEqual(after.source_map, manual.source_map, "Caption-only feedback must preserve actual footage");
      for (const captionText of captionTexts) assert.ok(after.timeline.tracks.every((track: any) => !track.captions?.some((caption: any) => caption.text === captionText)));
      assert.deepEqual(after.timeline.tracks.filter((track: any) => track.kind === "audio"), manual.timeline.tracks.filter((track: any) => track.kind === "audio"), "Multi-shot caption removal must preserve actual audio tracks");
      await log("captions-removed-two-pictures-preserved", { removed_texts: captionTexts, protected_clips: protectedClips });
    } else if (phase === "export-reopen" || phase === "speech-export-reopen" || phase === "after-forget-export-reopen") {
      const request = await selectLatest(), proof = await readProjectProof(projectRoot), facts = timelineFacts(proof);
      const render = proof.objects.filter((item: any) => item.object_type === "creation_render" && item.value.draft_id === facts.draft.draft_id).at(-1)?.value; assert.ok(render);
      await page.getByRole("button", { name: "观看此版", exact: true }).click();
      await playVersion(facts.draft.timeline_version);
      await waitUntil(async () => (await selectedRequest()).viewed_draft_id === facts.draft.draft_id, "viewed pointer");
      const exportPath = resolve(attemptRoot, `review-v${facts.draft.timeline_version}.mp4`), expected = { title: "导出所选作品", defaultPath: `AVE-v${facts.draft.timeline_version}.mp4`, filters: [{ name: "MP4 视频", extensions: ["mp4"] }] };
      await page.locator('[data-action="export"]').click(); await captureDesktopSizes("export-panel"); await page.getByRole("button", { name: "选择位置并导出", exact: true }).click();
      await waitUntil(async () => { try { return await digestFile(exportPath) === render.master.output_hash; } catch (error: any) { if (error.code === "ENOENT") return false; throw error; } }, "exact master export");
      await page.getByRole("dialog", { name: "导出作品", exact: true }).getByText("导出操作已完成。", { exact: true }).waitFor();
      await page.getByRole("button", { name: "关闭导出", exact: true }).click(); await page.getByRole("dialog", { name: "导出作品", exact: true }).waitFor({ state: "hidden" });
      await view("request"); const text = "还没发送：请保留我的输入和正在看的版本。"; await page.locator('[data-creation-form="revise"] [name="raw_text"]').fill(text);
      const native = await app.browserWindow(page), closed = app.waitForEvent("close"); await native.evaluate((window: any) => window.close()); await closed; app = undefined;
      app = await launchRealDesktop(repository, reviewRoot, attemptRoot, entrypoint, userData, modelConfig); page = await app.firstWindow(); rail = page.getByRole("navigation", { name: "工作台导航" }); page.on("pageerror", (error: Error) => report.errors.push({ message: error.message, stack: error.stack })); await openProject(projectRoot);
      const reopenedRail = page.getByRole("navigation", { name: "工作台导航" }).getByRole("button", { name: "对话", exact: true }); if (await reopenedRail.getAttribute("aria-pressed") !== "true") await reopenedRail.click();
      await page.locator('[data-creation-view="request"]').click(); await waitUntil(async () => await page.locator('[data-creation-form="revise"] [name="raw_text"]').inputValue() === text, "immediate-close input restoration");
      const reopened = await selectedRequest(); assert.equal(reopened.viewed_draft_id, facts.draft.draft_id); assert.equal(reopened.adopted_draft_id, request.adopted_draft_id); assert.equal(reopened.latest_draft_id, request.latest_draft_id);
      await capture("reopened-viewed-version"); await log("export-and-reopen", { exportPath, sha256: render.master.output_hash, draft_id: facts.draft.draft_id });
    } else if (phase === "review-interrupt") {
      const before = await readProjectProof(projectRoot), request = before.requests.at(-1), priorProfile = readProfileProof(userData), facts = timelineFacts(before);
      assert.equal(request.revisions.at(-1).revision, 9); assert.equal(facts.draft.timeline_version, 14); assert.equal(facts.draft.revision, 9); assertExactDuration(facts, 12);
      const cancelled = request.model_calls.filter((item: any) => item.revision === 8);
      assert.ok(cancelled.length > 0); assert.ok(cancelled.every((item: any) => item.settlement?.code === "MODEL_CANCELLED" && item.settlement?.reason_code === "REQUEST_REVISION_STALE")); assert.ok(!request.drafts.some((item: any) => item.revision === 8));
      await verifyWatchable(9, null, 12);
      await app.close(); app = undefined;
      app = await launchRealDesktop(repository, reviewRoot, attemptRoot, entrypoint, userData, modelConfig); page = await app.firstWindow(); await openProject(projectRoot);
      await waitUntil(async () => (await selectedRequest()).viewed_draft_id === facts.draft.draft_id, "the reviewed interrupt version survives reopen");
      await playVersion(14); await capture("interrupt-v14-reopened");
      const after = await readProjectProof(projectRoot); assert.deepEqual(after.model_runs, before.model_runs); assert.deepEqual(after.jobs, before.jobs); assert.deepEqual(after.requests.map((item: any) => item.model_calls), before.requests.map((item: any) => item.model_calls)); assert.deepEqual(readProfileProof(userData), priorProfile);
      await log("interrupted-12-second-draft-reviewed-without-regeneration", { cancelled_revision: 8, final_revision: 9, timeline_version: 14, source_map: facts.source_map, added_model_calls: 0, added_jobs: 0 });
    } else if (phase === "interrupt") {
      const prior = await selectedRequest(); await view("request"); const form = page.locator('[data-creation-form="revise"]');
      await form.locator('[name="raw_text"]').fill("先改成15秒的徒步动作故事，至少四个镜头，只是本次要求，不记录长期偏好。"); await form.getByRole("button", { name: "提交并继续制作", exact: true }).click({ noWaitAfter: true });
      const firstRevision = prior.revisions.at(-1).revision + 1;
      await waitUntil(async () => (await selectedRequest()).model_calls.some((item: any) => item.revision === firstRevision && !item.settlement), "first revision model request actually in flight", 15 * 60 * 1000);
      const proof = await revise("我改主意了，最终只做12秒，至少四个镜头，突出脚步和人物动作。这条插话覆盖刚才15秒要求，仍然只是本次要求。", 12);
      const request = proof.requests.at(-1); assert.equal(request.revisions.at(-1).revision, firstRevision + 1);
      assert.ok(!request.drafts.some((item: any) => item.revision === firstRevision), "Late obsolete response must not commit an intermediate draft");
      await log("interrupted-old-response-no-commit", { discarded_revision: firstRevision, committed_revision: firstRevision + 1 });
    } else if (phase === "cancel") {
      const prior = await selectedRequest(); await view("request"); const form = page.locator('[data-creation-form="revise"]');
      await form.locator('[name="raw_text"]').fill("做成15秒；这是用于测试制作中插话的临时请求。"); await form.getByRole("button", { name: "提交并继续制作", exact: true }).click({ noWaitAfter: true });
      const cancelledRevision = prior.revisions.at(-1).revision + 1;
      await waitUntil(async () => (await selectedRequest()).model_calls.some((item: any) => item.revision === cancelledRevision && !item.settlement), "model request actually in flight before cancellation", 15 * 60 * 1000);
      await form.locator('[name="raw_text"]').fill("尚未发送的插话保留测试"); assert.equal(await form.locator('[name="raw_text"]').inputValue(), "尚未发送的插话保留测试");
      await page.getByRole("button", { name: "取消当前制作", exact: true }).click();
      await waitUntil(async () => (await selectedRequest()).status === "cancelled", "cancelled");
      await waitUntil(async () => (await selectedRequest()).model_calls.filter((item: any) => item.revision === cancelledRevision).every((item: any) => item.settlement), "late cancelled model response settled", 15 * 60 * 1000);
      const after = await selectedRequest(); assert.equal(after.latest_draft_id, prior.latest_draft_id); assert.equal(after.active_run, null); assert.ok(!after.drafts.some((item: any) => item.revision === cancelledRevision)); await log("cancelled-no-new-draft");
    } else if (phase === "versions") {
      const request = await selectLatest(); assert.ok(request.drafts.length >= 2, "Version operations need two actual drafts in this request");
      const previous = request.drafts[0], latest = request.drafts.at(-1);
      await page.getByRole("button", { name: "观看此版", exact: true }).click();
      if (request.adopted_draft_id !== latest.draft_id) await page.getByRole("button", { name: "采用此版", exact: true }).click();
      else { assert.equal(await page.getByRole("button", { name: "采用此版", exact: true }).isDisabled(), true); await log("latest-already-adopted-through-prior-real-ui", { draft_id: latest.draft_id }); }
      await waitUntil(async () => (await selectedRequest()).adopted_draft_id === latest.draft_id, "latest adopted");
      await selectDraftCard(previous.draft_id); await page.getByRole("button", { name: "观看此版", exact: true }).click();
      await playVersion(previous.timeline_version);
      await waitUntil(async () => (await selectedRequest()).viewed_draft_id === previous.draft_id, "previous viewed"); assert.equal((await selectedRequest()).adopted_draft_id, latest.draft_id);
      await page.getByRole("button", { name: "采用此版", exact: true }).click(); await waitUntil(async () => (await selectedRequest()).adopted_draft_id === previous.draft_id, "previous adopted");
      await openAdvancedVersions(); await page.getByRole("button", { name: "撤销采用", exact: true }).click(); await waitUntil(async () => (await selectedRequest()).adopted_draft_id === latest.draft_id, "undo adoption");
      await openAdvancedVersions(); await page.getByRole("button", { name: "重做采用", exact: true }).click(); await waitUntil(async () => (await selectedRequest()).adopted_draft_id === previous.draft_id, "redo adoption");
      await page.getByLabel("比较版本", { exact: true }).selectOption(latest.draft_id); await page.getByRole("button", { name: "比较两个版本", exact: true }).click(); await page.getByRole("button", { name: "结束比较", exact: true }).waitFor(); await capture("comparison"); await captureDesktopSizes("comparison"); await page.getByRole("button", { name: "结束比较", exact: true }).click();
      await selectLatest(); await openAdvancedVersions(); const combo = page.locator("details").filter({ has: page.getByText("从不同版本组合镜头", { exact: true }) }); await combo.locator("summary").click();
      for (const draft of [previous, latest]) { await page.getByLabel("选片来源版本", { exact: true }).selectOption(draft.draft_id); await combo.getByRole("button", { name: "加入镜头 1", exact: true }).click(); await combo.getByRole("button", { name: "加入镜头 2", exact: true }).click(); }
      await page.getByLabel("组合说明", { exact: true }).fill("组合早版前两个镜头与新版前两个镜头，按所选顺序组成四镜头新版本，保留来源对应关系。"); await page.getByRole("button", { name: "生成组合草稿", exact: true }).click();
      await waitUntil(async () => (await selectedRequest()).latest_draft_id !== latest.draft_id, "combination draft"); await page.getByRole("button", { name: "制作预览与成片", exact: true }).click();
      const combinationProof = await verifyWatchable(request.revisions.at(-1).revision, latest.draft_id, null), combinationFacts = timelineFacts(combinationProof);
      const expectedClips = [timelineFacts(combinationProof, previous.draft_id), timelineFacts(combinationProof, latest.draft_id)].flatMap((facts: any) => facts.video.slice(0, 2));
      assert.equal(combinationFacts.video.length, 4);
      assert.deepEqual(combinationFacts.video.map((clip: any) => ({ source: clip.source, duration: clip.timeline_duration })), expectedClips.map((clip: any) => ({ source: clip.source, duration: clip.timeline_duration })), "Combination must actually contain previous first two clips then latest first two clips, with exact source ranges and durations");
      const execution = combinationProof.objects.find((item: any) => item.object_type === "creation_draft_execution" && item.relation_key === combinationFacts.draft.draft_id)?.value;
      assert.equal(execution?.source.kind, "manual"); const composition = JSON.parse(execution.source.input_json).composition;
      const expectedLineage = [previous, latest].flatMap((draft: any) => { const facts = timelineFacts(combinationProof, draft.draft_id), snapshot = combinationProof.objects.find((item: any) => item.object_type === "timeline_snapshot" && item.version === draft.timeline_version); return facts.video.slice(0, 2).map((clip: any) => ({ draft_id: draft.draft_id, clip_id: clip.clip_id, timeline_version: draft.timeline_version, timeline_digest: snapshot.object_hash })); });
      assert.deepEqual(composition, expectedLineage, "Durable composition lineage must bind exact selected draft/clip and immutable Timeline digest in order");
      await writeFile(resolve(attemptRoot, "combination-source-lineage-proof.json"), JSON.stringify({ selected_source_drafts: [previous, latest], expected_sources: expectedClips.map((clip: any) => ({ clip_id: clip.clip_id, source: clip.source, duration: clip.timeline_duration })), actual_draft: combinationFacts.draft, actual_source_map: combinationFacts.source_map }, null, 2));
      await openAdvancedVersions(); await page.getByRole("button", { name: "撤销本版修改", exact: true }).click();
      const undoneProof = await verifyWatchable(request.revisions.at(-1).revision, combinationFacts.draft.draft_id, null), undoneFacts = timelineFacts(undoneProof);
      const priorFacts = timelineFacts(combinationProof, latest.draft_id); assert.deepEqual(undoneFacts.source_map, priorFacts.source_map, "Undo must restore actual previous edit content");
      await openAdvancedVersions(); await page.getByRole("button", { name: "重做编辑内容", exact: true }).click();
      const redoneProof = await verifyWatchable(request.revisions.at(-1).revision, undoneFacts.draft.draft_id, null); assert.deepEqual(timelineFacts(redoneProof).source_map, combinationFacts.source_map, "Redo must restore actual combination content");
      await log("versions-combination-and-edit-undo-redo-verified");
      await openAdvancedVersions(); await page.getByRole("button", { name: "撤销本版修改", exact: true }).click();
      const restoredProof = await verifyWatchable(request.revisions.at(-1).revision, timelineFacts(redoneProof).draft.draft_id, priorFacts.seconds);
      assert.deepEqual(timelineFacts(restoredProof).source_map, priorFacts.source_map, "Restore the accepted feedback content before the separate protected-caption scenario");
      await log("feedback-content-restored-for-next-independent-scenario");
    }
    await capture("completed"); await writeFile(resolve(attemptRoot, "final-project-proof.json"), JSON.stringify(await readProjectProof(projectRoot), null, 2)); assert.deepEqual(report.errors, [], "Renderer errors cannot be treated as acceptance"); report.result = "passed-phase";
  } catch (error) {
    report.result = "failed"; report.failure = { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
    await save();
    try { await writeFile(resolve(attemptRoot, "failure-state.json"), JSON.stringify(await readProjectProof(projectRoot), null, 2)); } catch (evidenceError) { report.errors.push({ boundary: "independent-failure-state", message: String(evidenceError) }); }
    if (page) await page.screenshot({ path: resolve(attemptRoot, "failure.png") }).catch((error: Error) => report.errors.push({ boundary: "capture", message: error.message }));
    throw error;
  } finally {
    const cleanup: unknown[] = [];
    if (app) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([app.close(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("REAL_DESKTOP_CLEANUP_TIMEOUT: normal app.close did not finish within 30 seconds")), 30000); })]);
      } catch (error) {
        cleanup.push(error);
        report.cleanup_failures = cleanup.map(cause => ({ message: String(cause), stack: cause instanceof Error ? cause.stack : null }));
        await save();
        const child = app.process();
        if (child.exitCode === null) {
          // Only this isolated test application's owned process tree may be released.
          const killed = process.platform === "win32" ? spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, encoding: "utf8" }) : { status: child.kill("SIGKILL") ? 0 : 1, stdout: "", stderr: "" };
          await writeFile(resolve(attemptRoot, "forced-cleanup.json"), JSON.stringify({ owned_pid: child.pid, reason: String(error), status: killed.status, stdout: killed.stdout, stderr: killed.stderr }, null, 2));
          if (killed.status !== 0) cleanup.push(new Error("REAL_DESKTOP_FORCED_CLEANUP_FAILED"));
        }
      } finally { clearTimeout(timer); }
      if (app.__aveNativeFailures?.length) {
        await writeFile(resolve(attemptRoot, "native-information-errors.json"), JSON.stringify(app.__aveNativeFailures, null, 2));
        cleanup.push(new Error(`REAL_NATIVE_INFORMATIONAL_ERROR: ${JSON.stringify(app.__aveNativeFailures)}`));
      }
    }
    if (existsSync(resolve(projectRoot, "project.sqlite"))) {
      try { await writeFile(resolve(attemptRoot, "final-closed-project-proof.json"), JSON.stringify(await readProjectProof(projectRoot), null, 2)); } catch (error) { cleanup.push(error); }
    }
    if (cleanup.length) { report.result = "failed"; report.cleanup_failures = cleanup.map(error => ({ message: String(error), stack: error instanceof Error ? error.stack : null })); }
    report.finished_at = new Date().toISOString(); await save(); console.log(`STAGE3_REAL_PHASE_EVIDENCE=${attemptRoot}`);
    if (cleanup.length) throw new AggregateError([...(report.failure ? [report.failure] : []), ...cleanup], "Real phase shutdown failed; original failure retained in result.json");
  }
}
