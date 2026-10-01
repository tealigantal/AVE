import assert from "node:assert/strict";
import { cp, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { appendFileSync } from "node:fs";
import { StringDecoder } from "node:string_decoder";

async function codeFingerprint(repository: string): Promise<any> {
  const git = (args: string[]) => { const result = spawnSync("git", args, { cwd: repository, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 }); assert.equal(result.status, 0, result.error ? `${result.error.message}\n${result.stderr}` : result.stderr); return result.stdout; };
  const changed = [...new Set((git(["diff", "--name-only", "--diff-filter=ACMRTUXB", "HEAD"]) + git(["ls-files", "--others", "--exclude-standard"])).split(/\r?\n/).filter(path => /^(apps|packages|contracts|database|tests|docs|scripts|tools)\//.test(path) && /\.(ts|js|mjs|cjs|py|sql|yaml|yml|md|json|ps1|css|html)$/.test(path)))].sort();
  const files = [];
  for (const path of changed) files.push({ path, sha256: createHash("sha256").update(await readFile(resolve(repository, path))).digest("hex") });
  return { head: git(["rev-parse", "HEAD"]).trim(), tracked_diff_sha256: createHash("sha256").update(git(["diff", "--binary", "HEAD"])).digest("hex"), changed_code_files: files, fingerprint: createHash("sha256").update(JSON.stringify(files)).digest("hex"), at: new Date().toISOString() };
}
export async function recordBuildIdentity(repository: string, outputRoot: string, retrospective = false): Promise<void> {
  const files: any[] = [], appRoot = resolve(outputRoot, "app");
  const walk = async (directory: string, prefix = "") => { for (const entry of await readdir(directory, { withFileTypes: true })) { const relative = `${prefix}${entry.name}`; if (entry.isDirectory()) await walk(resolve(directory, entry.name), `${relative}/`); else if (entry.isFile()) files.push({ path: relative, sha256: createHash("sha256").update(await readFile(resolve(directory, entry.name))).digest("hex") }); } };
  await walk(appRoot); files.sort((a, b) => a.path.localeCompare(b.path));
  await writeFile(resolve(outputRoot, retrospective ? "build-identity-retrospective.json" : "build-identity.json"), JSON.stringify({ recorded_at: new Date().toISOString(), source_fingerprint_timing: retrospective ? "after-run; source may have changed since compilation" : "after-build; see source-before-build.json for changes during compilation", source: await codeFingerprint(repository), actual_app_files: files, actual_app_digest: createHash("sha256").update(JSON.stringify(files)).digest("hex") }, null, 2));
}

export async function buildRealDesktop(repository: string, outputRoot: string): Promise<string> {
  const appRoot = resolve(outputRoot, "app");
  await mkdir(appRoot, { recursive: true });
  await writeFile(resolve(outputRoot, "source-before-build.json"), JSON.stringify(await codeFingerprint(repository), null, 2));
  const configPath = resolve(outputRoot, "production-tsconfig.json");
  const globRoot = repository.replaceAll("\\", "/");
  await writeFile(configPath, JSON.stringify({ extends: resolve(repository, "tsconfig.base.json"), compilerOptions: { noEmit: false, outDir: appRoot, rootDir: repository, declaration: false, sourceMap: false }, include: [`${globRoot}/apps/desktop/src/**/*.ts`, `${globRoot}/packages/**/*.ts`] }));
  const compiled = spawnSync(process.execPath, [resolve(repository, "node_modules/typescript/bin/tsc"), "-p", configPath], { cwd: repository, encoding: "utf8", windowsHide: true });
  await writeFile(resolve(outputRoot, "build.log"), compiled.stdout + compiled.stderr);
  assert.equal(compiled.status, 0, `Production compilation failed; see ${resolve(outputRoot, "build.log")}`);
  for (const path of ["packages", "contracts/generated", "database", "apps/worker-host", "apps/desktop/src/renderer"]) await cp(resolve(repository, path), resolve(appRoot, path), { recursive: true });
  await cp(resolve(repository, "apps/desktop/src/preload-runtime.cjs"), resolve(appRoot, "apps/desktop/src/preload.cjs"));
  await writeFile(resolve(appRoot, "package.json"), JSON.stringify({ type: "module" }));
  await recordBuildIdentity(repository, outputRoot);
  return resolve(appRoot, "apps/desktop/src/main.js");
}

export async function reuseRealDesktop(reviewRoot: string, buildRoot: string, outputRoot: string): Promise<string> {
  const relativeRoot = relative(resolve(reviewRoot), resolve(buildRoot)); assert.ok(relativeRoot && !relativeRoot.startsWith("..") && !isAbsolute(relativeRoot), "Reuse only an existing isolated review build");
  const identity = JSON.parse(await readFile(resolve(buildRoot, "build-identity.json"), "utf8")), appRoot = resolve(buildRoot, "app");
  assert.ok(identity.actual_app_files.length > 0);
  for (const item of identity.actual_app_files) {
    const path = resolve(appRoot, item.path), part = relative(appRoot, path); assert.ok(part && !part.startsWith("..") && !isAbsolute(part));
    assert.equal(createHash("sha256").update(await readFile(path)).digest("hex"), item.sha256, "Reused actual app must still match its captured build identity");
  }
  await writeFile(resolve(outputRoot, "reused-build-identity.json"), JSON.stringify({ reused_from: buildRoot, verified_at: new Date().toISOString(), identity }, null, 2));
  return resolve(appRoot, "apps/desktop/src/main.js");
}

export async function launchRealDesktop(repository: string, reviewRoot: string, attemptRoot: string, entrypoint: string, userData: string, modelConfig: string): Promise<any> {
  const localRequire = createRequire(resolve(reviewRoot, "tooling/package.json"));
  const { _electron } = localRequire("playwright");
  const application = await _electron.launch({
    executablePath: resolve(repository, "node_modules/electron/dist", process.platform === "win32" ? "electron.exe" : "electron"),
    args: [entrypoint, `--user-data-dir=${userData}`],
    env: { ...process.env, AVE_MODEL_CONFIG: modelConfig },
    recordVideo: { dir: resolve(attemptRoot, "recordings"), size: { width: 1440, height: 960 } },
    timeout: 60000,
  });
  // Consume both pipes throughout every phase, including phases with no new consent.
  // Keep exact bytes locally; chunk boundaries must not corrupt UTF-8 diagnostics.
  for (const channel of ["stdout", "stderr"] as const) {
    const output = application.process()[channel];
    assert.ok(output, `Real Electron ${channel} must be available`);
    output.on("data", (chunk: Buffer) => appendFileSync(resolve(attemptRoot, `electron-${channel}.log`), chunk));
  }
  const lifecycleLog = (event: string, details: unknown = null) => appendFileSync(resolve(attemptRoot, "lifecycle-observations.jsonl"), JSON.stringify({ event, details, at: new Date().toISOString() }) + "\n");
  application.process().on("exit", (code: number | null, signal: string | null) => lifecycleLog("child-exit", { code, signal }));
  application.process().on("disconnect", () => lifecycleLog("child-disconnect"));
  application.on("close", () => lifecycleLog("playwright-application-close"));
  const originalClose = application.close.bind(application);
  application.close = async (...args: any[]) => { lifecycleLog("runner-app-close-called", { stack: new Error("Passive close call origin").stack }); return originalClose(...args); };
  try {
    await application.evaluate(({ app, BrowserWindow }: any) => {
      app.on("before-quit", () => process.stdout.write(`AVE_REAL_LIFECYCLE ${JSON.stringify({ event: "before-quit", at: new Date().toISOString() })}\n`));
      app.on("will-quit", () => process.stdout.write(`AVE_REAL_LIFECYCLE ${JSON.stringify({ event: "will-quit", at: new Date().toISOString() })}\n`));
      app.on("quit", () => process.stdout.write(`AVE_REAL_LIFECYCLE ${JSON.stringify({ event: "quit", at: new Date().toISOString() })}\n`));
      for (const window of BrowserWindow.getAllWindows()) {
        const id = window.id;
        window.on("close", (event: any) => process.stdout.write(`AVE_REAL_LIFECYCLE ${JSON.stringify({ event: "window-close", details: { id, defaultPrevented: event.defaultPrevented }, at: new Date().toISOString() })}\n`));
        window.on("closed", () => process.stdout.write(`AVE_REAL_LIFECYCLE ${JSON.stringify({ event: "window-closed", details: { id }, at: new Date().toISOString() })}\n`));
      }
      process.stdout.write(`AVE_REAL_LIFECYCLE ${JSON.stringify({ event: "passive-observers-installed", at: new Date().toISOString() })}\n`);
    });
  } catch (setupError) {
    // The caller cannot own cleanup until this function returns its application.
    // Preserve setup failure and any distinct shutdown failure without replacing either.
    try { await application.close(); } catch (closeError) { throw new AggregateError([setupError, closeError], "Real desktop setup and cleanup failed", { cause: setupError }); }
    throw setupError;
  }
  application.__aveNativeFailures = [];
  const nativeDecoder = new StringDecoder("utf8"); let nativeLines = "";
  application.process().stdout.on("data", (chunk: Buffer) => {
    nativeLines += nativeDecoder.write(chunk);
    let end: number;
    while ((end = nativeLines.indexOf("\n")) >= 0) {
      const line = nativeLines.slice(0, end); nativeLines = nativeLines.slice(end + 1);
      if (line.startsWith("AVE_REAL_INFORMATIONAL_ERROR ")) application.__aveNativeFailures.push(JSON.parse(line.slice("AVE_REAL_INFORMATIONAL_ERROR ".length)));
    }
  });
  await application.evaluate(({ dialog }: any) => {
    // This non-choice error notification can otherwise synchronously block shutdown.
    // It grants no permission: preserve its exact text and fail the verification.
    dialog.showErrorBox = (title: string, content: string) => { process.stdout.write(`AVE_REAL_INFORMATIONAL_ERROR ${JSON.stringify({ title, content, at: new Date().toISOString() })}\n`); };
  });
  assert.equal(resolve(await application.evaluate(({ app }: any) => app.getPath("userData"))), resolve(userData), "Test profile must never be the user's real profile");
  return application;
}

/** Only the native picker is represented by an independent exact-response test role.
 * The UI, preload, sender checks, IPC, Host, storage and media processing remain production.
 * Creation/learning authorizations are never auto-approved by this helper.
 */
export async function armExactFileSelection(application: any, properties: string[], paths: string[], withMediaFilter = false): Promise<void> {
  const options = { properties, ...(withMediaFilter ? { filters: [{ name: "视频与音频素材", extensions: ["mp4", "mov", "m4v", "webm", "wav", "mp3", "m4a", "flac"] }] } : {}) };
  await application.evaluate(({ dialog }: any, expected: any) => {
    const scope = globalThis as any;
    if (!scope.__aveTestPicker) {
      scope.__aveTestPicker = { pending: null, log: [] };
      dialog.showOpenDialog = async (...args: any[]) => {
        const state = scope.__aveTestPicker, selected = state.pending;
        if (!selected) throw new Error("TEST_ROLE_UNARMED_NATIVE_PICKER");
        state.pending = null;
        const actual = args.at(-1);
        if (JSON.stringify(actual) !== JSON.stringify(selected.options)) throw new Error(`TEST_ROLE_NATIVE_OPTIONS_MISMATCH: ${JSON.stringify(actual)}`);
        state.log.push({ role: "stage3-isolated-creator", options: actual, selected_paths: selected.paths, at: new Date().toISOString() });
        return { canceled: false, filePaths: selected.paths };
      };
    }
    if (scope.__aveTestPicker.pending) throw new Error("TEST_ROLE_PICKER_ALREADY_ARMED");
    scope.__aveTestPicker.pending = expected;
  }, { options, paths });
}

export async function pickerEvidence(application: any): Promise<any> {
  return application.evaluate(() => {
    const state = (globalThis as any).__aveTestPicker;
    if (state?.pending) throw new Error("TEST_ROLE_PICKER_NOT_CONSUMED");
    return state?.log ?? [];
  });
}

export async function armExactExport(application: any, expected: unknown, exportPath: string): Promise<void> {
  assert.equal(await application.evaluate(({ dialog }: any, input: any) => {
    const scope = globalThis as any; scope.__aveExactExport = { expected: input.expected, exportPath: input.exportPath, consumed: false };
    dialog.showSaveDialog = async (...args: any[]) => {
      const state = scope.__aveExactExport;
      if (state.consumed || JSON.stringify(args.at(-1)) !== JSON.stringify(state.expected)) throw new Error("TEST_ROLE_EXPORT_SCOPE_MISMATCH");
      state.consumed = true;
      process.stdout.write(`AVE_REAL_EXPORT_SCOPE ${JSON.stringify({ actual: args.at(-1), selected_path: state.exportPath })}\n`);
      return { canceled: false, filePath: state.exportPath };
    };
    return true;
  }, { expected, exportPath }), true, "Exact native export scope must be acknowledged before product interaction");
}
