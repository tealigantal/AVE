import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

// Current native interaction checks shared by real and synthetic material cases.
// Dialog responses are test-owned; this does not establish human acceptance.
export async function reviewMaterialCaseInElectron(workProject: string, reviewDirectory: string, expected: { goal: string; evidenceCount: number; duration: number }) {
const root = resolve(import.meta.dirname, '../..');
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
  assert.ok(result.views.contract.text.includes(expected.goal));
  assert.ok(result.views.evidence.cards >= expected.evidenceCount);
  assert.ok(result.views.story.candidates >= 2);
  assert.ok(result.views.review.intents >= 1);
  assert.equal(result.views.review.feedbackForm, true);
  assert.match(result.views.review.text, /当前 Timeline|Preview \/ Master \/ QC 已绑定执行/);
  assert.ok(Math.abs(result.journey.preview_duration - expected.duration) <= 0.08, "Product Preview must retain the current material-case duration");
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

console.log("Stage 2 automated Electron interaction, Preview, feedback and reopen checks passed; human acceptance remains pending");

}
