import assert from "node:assert/strict";
import { cp, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

// Actual Electron and Host, with a test-only exact native authorization response.
// Sources/model setup belong to the clearly identified engineering fixture.
export async function reviewCreationInElectron(workProject: string, reviewDirectory: string, expected: { duration: number }) {
const root = resolve(import.meta.dirname, '../../..');
const outputRoot = await mkdtemp(resolve(tmpdir(), "ave-creation-product-electron-"));
const tsconfig = resolve(root, ".ave-creation-product-electron.tsconfig.json");
const electron = resolve(root, "node_modules/electron/dist", process.platform === "win32" ? "electron.exe" : "electron");
const tsc = resolve(root, "node_modules/typescript/bin/tsc");
const config = { extends: "./tsconfig.base.json", compilerOptions: { noEmit: false, outDir: outputRoot, rootDir: root, declaration: false, sourceMap: false }, include: ["apps/desktop/src/**/*.ts", "packages/**/*.ts", "tests/integration/electron-stage2-harness.ts"] };

async function runElectron(markerPrefix: string, mode: "engineering" | "reopen" | "renderer-races"): Promise<any> {
  const harnessArguments = ["--no-sandbox", `--user-data-dir=${resolve(outputRoot, "electron-user-data")}`, resolve(outputRoot, "tests/integration/electron-stage2-harness.js"), `--ave-harness-mode=${mode}`, `--ave-harness-project=${workProject}`, `--ave-harness-review-dir=${reviewDirectory}`];
  const child = spawn(electron, harnessArguments, { cwd: outputRoot, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "", timedOut = false;
  const exitCode = await new Promise<number | null>((done, reject) => {
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 90000);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => { clearTimeout(timer); done(code); });
  });
  assert.equal(timedOut, false, `${markerPrefix} did not finish shutdown\n${stdout}\n${stderr}`);
  assert.equal(exitCode, 0, `${markerPrefix} exited with ${exitCode}\n${stdout}\n${stderr}`);
  assert.ok(stdout.includes("AVE_ELECTRON_SHUTDOWN_COMPLETE"), "actual Desktop shutdown must finish");
  assert.ok(stderr.includes("AVE_ELECTRON_NATIVE_QUIT"), "native quit event must complete");
  assert.ok(!stderr.includes("AVE_ELECTRON_UNCAUGHT"), stderr);
  assert.ok(!stderr.includes("AVE_ELECTRON_PRODUCT_REVIEW_FAILED"), stderr);
  const line = stdout.split(/\r?\n/).find(value => value.startsWith(markerPrefix));
  assert.ok(line, `${markerPrefix} missing\n${stdout}\n${stderr}`);
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

  await cp(resolve(root, "tests/fixtures/stage3/renderer-races.js"), resolve(outputRoot, "apps/desktop/src/renderer/test-renderer-races.js"));
  await writeFile(resolve(outputRoot, "apps/desktop/src/renderer/test-races.html"), '<html><head><meta charset="utf-8"></head><body><div id="root"></div><script src="/test-renderer-races.js"></script></body></html>');
  const races = await runElectron("AVE_CREATION_RENDERER_RACES ", "renderer-races");
  assert.deepEqual(races, {refresh_interleaving:true,failed_refresh_denials:true,stale_send_count:0,selected_asset_count:1,explicit_render_attempts:3});
  const result = await runElectron("AVE_CREATION_ELECTRON_REVIEW ", "engineering");
  await writeFile(resolve(reviewDirectory, "CREATION-WORKSPACE-OBSERVATION.json"), JSON.stringify(result, null, 2));
  assert.equal(result.title, "AVE 工作台"); assert.equal(result.native_confirmations, 1);
  assert.ok(Math.abs(result.journey.preview_duration - expected.duration) <= 0.08);
  assert.ok(result.journey.played_seconds > 0.15);
  assert.equal(result.journey.final_version, result.journey.initial_version + 2);
  assert.equal(result.journey.input_retained, true); assert.equal(result.journey.player_retained, true);
  assert.equal(result.journey.stale_edit_code, "REQUEST_BASE_STALE"); assert.equal(result.journey.invalid_code, "DESKTOP_CREATION_INPUT_INVALID");
  assert.equal(result.journey.render.preview.qc.status, "passed"); assert.equal(result.journey.render.master.qc.status, "passed");
  assert.deepEqual(result.nativeJourney.allowed_data, ["request"]); assert.equal(result.nativeJourney.cancelled, true);
  assert.equal(new Set(result.nativeJourney.asset_ids).size, result.nativeJourney.asset_ids.length);
  for (const path of result.captures) assert.ok((await stat(path)).size > 10_000, `review capture is too small: ${path}`);
  const reopened = await runElectron("AVE_CREATION_ELECTRON_REOPEN ", "reopen");
  assert.deepEqual(reopened, result.snapshot, "reopen preserves exact workspace versions, media references, source ranges, captions, pointers and cancellation");
  await writeFile(resolve(reviewDirectory, "CREATION-WORKSPACE-REVIEW.json"), JSON.stringify({ ...result, reopened }, null, 2));
  console.log(`CREATION_ENGINEERING_REVIEW_ROOT=${resolve(reviewDirectory)}`);
  return { ...result, reopened };
} finally {
  await rm(tsconfig, { force: true });
  await rm(outputRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
}
