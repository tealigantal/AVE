import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outputRoot = await mkdtemp(resolve(tmpdir(), "ave-electron-runtime-"));
const tsconfig = resolve(root, ".ave-electron-runtime.tsconfig.json");
const electron = resolve(root, "node_modules/electron/dist", process.platform === "win32" ? "electron.exe" : "electron");
const tsc = resolve(root, "node_modules/typescript/bin/tsc");
const config = {
  extends: "./tsconfig.base.json",
  compilerOptions: { noEmit: false, outDir: outputRoot, rootDir: root, declaration: false, sourceMap: false },
  include: ["apps/desktop/src/**/*.ts", "packages/**/*.ts", "tests/integration/electron-stage2-harness.ts"],
};

try {
  await writeFile(tsconfig, JSON.stringify(config));
  const compile = spawn(process.execPath, [tsc, "-p", tsconfig], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let compileStdout = "";
  let compileStderr = "";
  compile.stdout.on("data", (chunk) => { compileStdout += chunk; });
  compile.stderr.on("data", (chunk) => { compileStderr += chunk; });
  const compileCode = await new Promise((resolveCode) => compile.on("close", resolveCode));
  assert.equal(compileCode, 0, `Electron smoke TypeScript compile failed:\n${compileStdout}\n${compileStderr}`);
  await cp(resolve(root, "packages"), resolve(outputRoot, "packages"), { recursive: true, force: true });
  await cp(resolve(root, "database"), resolve(outputRoot, "database"), { recursive: true, force: true });
  await cp(resolve(root, "apps/worker-host"), resolve(outputRoot, "apps/worker-host"), { recursive: true, force: true });
  await cp(resolve(root, "apps/desktop/src/renderer"), resolve(outputRoot, "apps/desktop/src/renderer"), { recursive: true });
  await cp(resolve(root, "apps/desktop/src/preload-runtime.cjs"), resolve(outputRoot, "apps/desktop/src/preload.cjs"));
  const harness = resolve(outputRoot, "tests/integration/electron-stage2-harness.js");
  const child = spawn(electron, ["--no-sandbox", "--disable-gpu", harness, "--ave-harness-mode=smoke"], { cwd: outputRoot, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (stdout.includes("AVE_ELECTRON_RUNTIME_SMOKE ")) setTimeout(() => child.kill(), 500);
  });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => child.kill(), 30000);
  const exitCode = await new Promise((resolveCode) => child.on("close", resolveCode));
  clearTimeout(timer);
  const line = stdout.split(/\r?\n/).find((value) => value.startsWith("AVE_ELECTRON_RUNTIME_SMOKE "));
  assert.ok(line, `Electron runtime smoke marker missing.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  assert.ok(exitCode === 0 || exitCode === null, `Electron runtime exited with ${exitCode}.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  const result = JSON.parse(line.slice("AVE_ELECTRON_RUNTIME_SMOKE ".length));
  assert.deepEqual(result, { title: "AVE 工作台", projectApi: true, workbench: true });
  console.log("electron runtime smoke passed");
} finally {
  await rm(tsconfig, { force: true });
  await rm(outputRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
