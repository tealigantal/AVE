import assert from "node:assert/strict";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildRealDesktop, launchRealDesktop, armExactFileSelection, pickerEvidence } from "../fixtures/stage3/real-electron.js";
import { digestFile, preparePublicMedia, readPublicMedia } from "../fixtures/stage3/real-public-media.js";

// Explicit opt-in real UI acceptance; not part of synthetic/default gates.
// Usage: AVE_REAL_REVIEW_ROOT=<isolated directory> AVE_MODEL_CONFIG=<existing local config>
// node --import tsx tests/integration/stage3-acceptance-real.test.ts --import-only
const repository = resolve(import.meta.dirname, "../.."), reviewRoot = process.env.AVE_REAL_REVIEW_ROOT;
if (!reviewRoot) throw new Error("AVE_REAL_REVIEW_ROOT must explicitly name an isolated test directory");
if (process.argv.includes("--prepare-public-media")) {
  await preparePublicMedia(reviewRoot);
} else if (process.argv.includes("--continue-journey")) {
  const modelConfig = process.env.AVE_MODEL_CONFIG, journeyRoot = process.env.AVE_REAL_JOURNEY_ROOT, phase = process.env.AVE_REAL_JOURNEY_PHASE;
  if (!modelConfig || !journeyRoot || !phase) throw new Error("Continue requires explicit AVE_MODEL_CONFIG, AVE_REAL_JOURNEY_ROOT and AVE_REAL_JOURNEY_PHASE");
  const { continueRealJourney } = await import("../fixtures/stage3/real-journey-continue.js");
  await continueRealJourney(repository, reviewRoot, journeyRoot, modelConfig, phase);
} else if (process.argv.includes("--journey") || process.argv.includes("--speech-journey")) {
  const modelConfig = process.env.AVE_MODEL_CONFIG;
  if (!modelConfig) throw new Error("AVE_MODEL_CONFIG must name an authorized model configuration");
  const { runRealJourney } = await import("../fixtures/stage3/real-journey.js");
  await runRealJourney(repository, reviewRoot, modelConfig, process.argv.includes("--speech-journey") ? "speech" : "cold");
} else {
  if (!process.argv.includes("--import-only")) throw new Error("Choose --prepare-public-media or --import-only; this runner never implicitly calls models");
  const modelConfig = process.env.AVE_MODEL_CONFIG;
  if (!modelConfig) throw new Error("AVE_MODEL_CONFIG must name the authorized local model configuration; do not put credentials in arguments");
  const attemptRoot = resolve(reviewRoot, `import-${Date.now()}`), userData = resolve(attemptRoot, "test-user-data");
  await mkdir(attemptRoot, { recursive: true });
  const manifest = await readPublicMedia(reviewRoot);
  const sources = manifest.sources;
  const partitions = (process.env.AVE_REAL_IMPORT_PARTITIONS ?? "learning,held-out").split(",");
  assert.ok(partitions.length > 0 && partitions.every(partition => ["learning", "held-out"].includes(partition)));
  for (const partition of partitions) assert.ok(sources.some((source: any) => source.partition === partition), `Missing acquired ${partition} source`);
  const hashes = sources.map((source: any) => source.sha256);
  assert.equal(new Set(hashes).size, hashes.length, "Source partitions must not rename a duplicate original");
  for (const source of sources) assert.equal(await digestFile(source.local_file), source.sha256, "Source changed after licensing/probe");
  let app: any, page: any;
  const report: any = { identity: "stage3-isolated-creator", scope: "production startup, real UI project create/import only; zero model requests authorized", partitions, attempt: attemptRoot, screenshots: [], projects: [], errors: [], started_at: new Date().toISOString() };
  try {
    const entrypoint = await buildRealDesktop(repository, attemptRoot);
    app = await launchRealDesktop(repository, reviewRoot, attemptRoot, entrypoint, userData, modelConfig);
    page = await app.firstWindow();
    page.on("pageerror", (error: Error) => report.errors.push({ boundary: "renderer", message: error.message, stack: error.stack }));
    await page.waitForURL("app://renderer/index.html");
    await page.getByRole("button", { name: /新建作品|新建项目/, exact: true }).waitFor();
    const capture = async (name: string) => {
      await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined))); });
      const path = resolve(attemptRoot, `${name}.png`); await page.screenshot({ path }); report.screenshots.push(path);
    };
    await capture("01-empty-wide");
    for (const partition of partitions) {
      const projectRoot = resolve(attemptRoot, `project-${partition}`);
      await mkdir(projectRoot);
      await armExactFileSelection(app, ["openDirectory", "createDirectory"], [projectRoot]);
      await page.getByRole("button", { name: /新建作品|新建项目/, exact: true }).click();
      const materialNav = page.getByRole("navigation", { name: "工作台导航" }).getByRole("button", { name: "素材", exact: true });
      if (await materialNav.getAttribute("aria-pressed") !== "true") await materialNav.click();
      const importButton = page.getByRole("button", { name: "导入素材", exact: true });
      await importButton.waitFor({ state: "visible" });
      const chosen = sources.filter((source: any) => source.partition === partition);
      await armExactFileSelection(app, ["openFile", "multiSelections"], chosen.map((source: any) => source.local_file), true);
      await importButton.click();
      for (const source of chosen) await page.getByRole("button", { name: new RegExp(`source-${source.id}\\.mp4`) }).waitFor({ timeout: 120000 });
      await capture(`${partition}-imported-wide`);
      assert.ok((await stat(resolve(projectRoot, "project.sqlite"))).size > 0, "Production Host must create the actual project DB");
      report.projects.push({ partition, root: projectRoot, sources: chosen.map((source: any) => ({ id: source.id, sha256: source.sha256 })) });
      const nativeWindow = await app.browserWindow(page);
      await nativeWindow.evaluate((window: any) => window.setSize(1000, 760));
      await capture(`${partition}-imported-narrow`);
      await nativeWindow.evaluate((window: any) => window.setSize(1440, 960));
      // Returning to the actual project list keeps creation a UI action.
      const home = page.locator('[data-action="home"]');
      if (partition !== partitions.at(-1) && await home.count()) await home.click();
    }
    report.native_picker_role = await pickerEvidence(app);
    assert.equal(report.native_picker_role.length, partitions.length * 2);
    const unsent = "隔离测试身份：这是一条尚未发送的创作要求，重开必须保留。";
    const draftInput = page.locator('[data-creation-form="begin"] [name="original_text"]');
    const conversationRail = page.getByRole("navigation", { name: "工作台导航" }).getByRole("button", { name: "对话", exact: true });
    if (await conversationRail.getAttribute("aria-pressed") !== "true") await conversationRail.click();
    await draftInput.fill(unsent);
    // Close immediately after input, without waiting for a debounce timer.
    const nativeWindow = await app.browserWindow(page), closed = app.waitForEvent("close");
    await nativeWindow.evaluate((window: any) => window.close());
    await closed; app = undefined;
    app = await launchRealDesktop(repository, reviewRoot, attemptRoot, entrypoint, userData, modelConfig);
    page = await app.firstWindow();
    await page.getByRole("button", { name: /打开作品|打开项目/, exact: true }).waitFor();
    await armExactFileSelection(app, ["openDirectory"], [resolve(attemptRoot, `project-${partitions.at(-1)}`)]);
    await page.getByRole("button", { name: /打开作品|打开项目/, exact: true }).click();
    const reopenedConversation = page.getByRole("navigation", { name: "工作台导航" }).getByRole("button", { name: "对话", exact: true });
    if (await reopenedConversation.getAttribute("aria-pressed") !== "true") await reopenedConversation.click();
    await page.locator('[data-creation-form="begin"] [name="original_text"]').waitFor();
    await page.waitForFunction((expected: string) => (document.querySelector('[data-creation-form="begin"] [name="original_text"]') as HTMLTextAreaElement | null)?.value === expected, unsent);
    assert.equal(await page.locator('[data-creation-form="begin"] [name="original_text"]').inputValue(), unsent);
    report.reopen_picker_role = await pickerEvidence(app);
    report.unsent_input_reopen = { expected: unsent, actual: await page.locator('[data-creation-form="begin"] [name="original_text"]').inputValue() };
    await capture("reopened-unsent-input");
    assert.deepEqual(report.errors, []);
    report.result = "passed-import-only";
  } catch (error) {
    report.result = "failed"; report.failure = { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
    if (page) await page.screenshot({ path: resolve(attemptRoot, "failure.png") }).catch((captureError: Error) => report.errors.push({ boundary: "failure-capture", message: captureError.message }));
    throw error;
  } finally {
    if (app) {
      try { await app.close(); } catch (error) { report.shutdown_failure = String(error); report.result = "failed"; throw error; }
      finally { report.finished_at = new Date().toISOString(); await writeFile(resolve(attemptRoot, "result.json"), JSON.stringify(report, null, 2)); }
    } else await writeFile(resolve(attemptRoot, "result.json"), JSON.stringify(report, null, 2));
    console.log(`STAGE3_REAL_IMPORT_EVIDENCE=${attemptRoot}`);
  }
}
