import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "../..");
const tick = () => new Promise(resolve => setImmediate(resolve));
async function load(file, dependencies, extra = {}) {
  const source = (await readFile(path.resolve(root, file), "utf8")).replaceAll("import.meta.url", "__moduleUrl");
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  runInNewContext(output, {
    exports, __moduleUrl: url.pathToFileURL(path.resolve(root, file)).href,
    require: name => { assert.ok(Object.hasOwn(dependencies, name), `undeclared runtime test dependency ${name}`); return dependencies[name]; },
    process, setImmediate, AbortController, ...extra,
  });
  return exports;
}

for (const failingResource of ["host", "profile"]) {
  const app = new EventEmitter(), trace = [], diagnostics = [], dialogs = [];
  let quitAllowed = 0, quitRequests = 0, hostCloses = 0, profileCloses = 0;
  app.whenReady = () => Promise.resolve(); app.getPath = () => path.resolve(root, "test-user-data");
  app.quit = () => {
    quitRequests++;
    const event = { prevented: false, preventDefault() { this.prevented = true; } };
    app.emit("before-quit", event);
    if (event.prevented) return;
    quitAllowed++; app.emit("will-quit", event); app.emit("quit", event, 0);
  };
  const failure = new Error(`injected ${failingResource} close failure`), registrationFailure = new Error("injected IPC registration failure");
  const { ProjectSessionManager } = await load("apps/desktop/src/main/project-session-manager.ts", {});
  const host = {
    status: () => ({ project: "not-open" }),
    suspendCreationRequests: () => () => {},
    close: async () => { trace.push("host-close"); if (++hostCloses === 1 && failingResource === "host") throw failure; },
  };
  const profile = { close: async () => { trace.push("profile-close"); if (++profileCloses === 1 && failingResource === "profile") throw failure; } };
  const sessions = new ProjectSessionManager(host, profile);
  const electron = { app, BrowserWindow: { getAllWindows: () => [] }, dialog: { showErrorBox: (...args) => dialogs.push(args) } };
  const console = { error: (...args) => diagnostics.push(args) };
  const lifecycle = await load("apps/desktop/src/main/app-lifecycle.ts", { electron, "./window-manager.js": { createWindow: () => { throw new Error("failed startup must not create a working window"); } } }, { console });
  const { bootstrap } = await load("apps/desktop/src/main/bootstrap.ts", {
    electron, "node:path": path, "node:url": url, "./app-lifecycle.js": lifecycle,
    "./composition-root.js": {
      createCompositionRoot: async () => ({ host, profile, sessions }),
      registerCompositionRoot: () => { assert.equal(app.listenerCount("before-quit"), 1, "quit barrier must precede fallible registration"); throw registrationFailure; },
    },
    "./protocol-handler.js": { registerAppProtocol: () => { throw new Error("IPC failure must stop later registration"); } },
  }, { console });
  bootstrap(); await tick(); await tick();
  assert.equal(hostCloses, 1); assert.equal(profileCloses, failingResource === "host" ? 0 : 1);
  assert.equal(quitRequests, 0, "failed startup cleanup must not secretly retry or bypass its quit barrier");
  assert.equal(quitAllowed, 0); assert.equal(sessions.shutdownComplete, false); assert.equal(sessions.acceptingRequests, false);
  assert.equal(dialogs.length, 1);
  const reported = diagnostics[0][1];
  assert.deepEqual([...reported.errors], [registrationFailure, failure], "retain registration and cleanup causes");
  app.quit(); await tick(); await tick();
  assert.equal(sessions.shutdownComplete, true); assert.equal(quitAllowed, 1);
  assert.equal(hostCloses, 2); assert.equal(profileCloses, failingResource === "host" ? 1 : 2);
  assert.equal(app.listenerCount("before-quit"), 1);
  assert.ok(trace.indexOf("host-close") < trace.indexOf("profile-close"));
}
console.log("Stage3 actual bootstrap/lifecycle: registration plus Host/profile close failure stays contained, keeps both causes and exits only after explicit successful retry");
