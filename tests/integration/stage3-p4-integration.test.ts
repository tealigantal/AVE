import assert from "node:assert/strict";
import { test } from "node:test";
const rendererStatePath: string = "../../apps/desktop/src/renderer/state/workbench-state.js";
const projectApiPath: string = "../../apps/desktop/src/renderer/api/project-api.js";
const {
  DEFAULT_ASSET_LAYOUT,
  DEFAULT_PRECISION_LAYOUT,
  DEFAULT_WORKBENCH_COMPOSER_POSITION,
  WORKBENCH_PAGE_IDS,
  readAssetLayout,
  readPrecisionLayout,
  readWorkbenchComposerPosition,
  readWorkbenchPage,
  rememberWorkspaceFocus,
  restoreWorkspaceFocus,
  writeAssetLayout,
  writePrecisionLayout,
  writeWorkbenchComposerPosition,
  writeWorkbenchPage,
} = await import(rendererStatePath);

test("P4 workspace pages persist by project and reject unknown routes", () => {
  const forms = new Map<string, unknown>();
  assert.deepEqual(WORKBENCH_PAGE_IDS, ["creation", "assets", "precision", "history", "issues", "projects", "recycle", "help", "export"]);
  assert.equal(readWorkbenchPage(forms, "project-one"), "creation");
  assert.equal(writeWorkbenchPage(forms, "project-one", "precision"), "precision");
  assert.equal(readWorkbenchPage(forms, "project-one"), "precision");
  assert.equal(readWorkbenchPage(forms, "project-two"), "creation");
  assert.equal(writeWorkbenchPage(forms, "project-one", "export"), "export");
  assert.equal(readWorkbenchPage(forms, "project-one"), "export");
  assert.equal(writeWorkbenchPage(forms, "project-one", "recycle"), "recycle");
  assert.equal(readWorkbenchPage(forms, "project-one"), "recycle");
  assert.equal(writeWorkbenchPage(forms, "project-one", "projects"), "projects");
  assert.equal(readWorkbenchPage(forms, "project-one"), "projects");
  assert.equal(writeWorkbenchPage(forms, "project-one", "help"), "help");
  assert.equal(readWorkbenchPage(forms, "project-one"), "help");
  assert.throws(() => writeWorkbenchPage(forms, "project-one", "home" as never), /页面不存在/);
});

test("P4 asset view, thumbnail size, and panel width persist with strict bounds", () => {
  const forms = new Map<string, unknown>();
  assert.deepEqual(readAssetLayout(forms, "project-one"), DEFAULT_ASSET_LAYOUT);
  const selected = { view: "list", thumbnailSize: 200, panelWidth: 360 };
  assert.deepEqual(writeAssetLayout(forms, "project-one", selected), selected);
  assert.deepEqual(readAssetLayout(forms, "project-one"), selected);
  assert.deepEqual(readAssetLayout(forms, "project-two"), DEFAULT_ASSET_LAYOUT);
  assert.throws(() => writeAssetLayout(forms, "project-one", { ...selected, panelWidth: 500 }), /支持范围/);
  assert.deepEqual(readAssetLayout(forms, "project-one"), selected, "invalid layout does not overwrite the last saved values");
  forms.set(JSON.stringify(["project-one", "", "asset-layout"]), { ...selected, extra: true });
  assert.throws(() => readAssetLayout(forms, "project-one"), /设置无效/);
});

test("P4 precision panel visibility and split sizes persist per project with strict bounds", () => {
  const forms = new Map<string, unknown>();
  assert.deepEqual(readPrecisionLayout(forms, "project-one"), DEFAULT_PRECISION_LAYOUT);
  const selected = { resourcesOpen: false, inspectorOpen: true, inspectorWidth: 360, timelineHeight: 420 };
  assert.deepEqual(writePrecisionLayout(forms, "project-one", selected), selected);
  assert.deepEqual(readPrecisionLayout(forms, "project-one"), selected);
  assert.deepEqual(readPrecisionLayout(forms, "project-two"), DEFAULT_PRECISION_LAYOUT);
  assert.throws(() => writePrecisionLayout(forms, "project-one", { ...selected, timelineHeight: 600 }), /支持范围/);
  assert.deepEqual(readPrecisionLayout(forms, "project-one"), selected, "invalid layout does not overwrite the last saved values");
  forms.set(JSON.stringify(["project-one", "", "precision-layout"]), { ...selected, inspectorWidth: 300, extra: true });
  assert.throws(() => readPrecisionLayout(forms, "project-one"), /设置无效/);
});

test("P4 shared composer drag position persists per project with strict bounds", () => {
  const forms = new Map<string, unknown>();
  assert.deepEqual(readWorkbenchComposerPosition(forms, "project-one"), DEFAULT_WORKBENCH_COMPOSER_POSITION);
  const selected = { x: 0.22, y: 0.4 };
  assert.deepEqual(writeWorkbenchComposerPosition(forms, "project-one", selected), selected);
  assert.deepEqual(readWorkbenchComposerPosition(forms, "project-one"), selected);
  assert.deepEqual(readWorkbenchComposerPosition(forms, "project-two"), DEFAULT_WORKBENCH_COMPOSER_POSITION);
  assert.throws(() => writeWorkbenchComposerPosition(forms, "project-one", { x: 1.1, y: 0 }), /支持范围/);
  assert.deepEqual(readWorkbenchComposerPosition(forms, "project-one"), selected, "invalid position does not overwrite the saved location");
  forms.set(JSON.stringify(["project-one", "", "composer-position"]), { ...selected, extra: true });
  assert.throws(() => readWorkbenchComposerPosition(forms, "project-one"), /位置无效/);
});

test("P4 restores each page's last focused control without focusing hidden or stale elements", () => {
  const focusTargets = new Map<string, any>();
  let focused = 0;
  const page = { hidden: false, inert: false, parentElement: null };
  const control = { isConnected: true, disabled: false, parentElement: page, focus: (options: { preventScroll: boolean }) => { assert.deepEqual(options, { preventScroll: true }); focused++; } };

  assert.equal(rememberWorkspaceFocus(focusTargets, "creation", control), true);
  assert.equal(restoreWorkspaceFocus(focusTargets, "creation"), true);
  assert.equal(focused, 1);

  page.hidden = true;
  assert.equal(restoreWorkspaceFocus(focusTargets, "creation"), false);
  assert.equal(focused, 1, "hidden page controls are not focused");
  assert.equal(focusTargets.has("creation"), false, "hidden targets are discarded before a later route change");

  assert.equal(rememberWorkspaceFocus(focusTargets, "history", control), true);
  control.isConnected = false;
  assert.equal(restoreWorkspaceFocus(focusTargets, "history"), false);
  assert.equal(focused, 1, "detached page controls are not focused");
  assert.throws(() => rememberWorkspaceFocus(focusTargets, "unknown", control), /页面不存在/);
});

test("P4 stale project requests fail closed and tell every renderer to resync", async () => {
  const { ProjectSessionManager } = await import("../../apps/desktop/src/main/project-session-manager.js");
  const { createRequestDispatcher } = await import("../../apps/desktop/src/main/ipc/request-dispatcher.js");
  const previousWindow = globalThis.window;
  Object.defineProperty(globalThis, "window", { value: { addEventListener: () => {}, projectApi: {} }, configurable: true });
  const { isCreationControlResult } = await import(projectApiPath);
  if (previousWindow === undefined) delete (globalThis as any).window;
  else Object.defineProperty(globalThis, "window", { value: previousWindow, configurable: true });
  const sent: Array<{ channel: string; payload: any }> = [];
  let mediaReads = 0;
  const host = { status: () => ({ project: "active-project" }), listMedia: () => { mediaReads++; return []; }, close: async () => {}, suspendCreationRequests: () => () => {} };
  const profile = { close: async () => {} };
  const sessions = new ProjectSessionManager(host as any, profile);
  sessions.registerWindow({ webContents: { id: 81, send: (channel: string, payload: any) => sent.push({ channel, payload }) } });
  const dispatch = createRequestDispatcher({ host, sessions, events: { publish: () => {} }, profile, creationCredential: {}, recents: {} } as any, {
    open: async () => ({ canceled: true, filePaths: [] }), save: async () => ({ canceled: true }), confirm: async () => ({ response: 0 }),
  });
  const result = await dispatch("project.query", { sender: { id: 81 } } as any, { api_version: 1, query_type: "project.media.list", project_id: "previous-project", payload: {} });
  assert.deepEqual(result, { ok: false, error: { code: "DESKTOP_SESSION_STALE", message: "作品已切换，正在同步当前作品。" } });
  assert.equal(isCreationControlResult(result), true, "a stale-session response is handled as control flow, not a persistent operation error");
  assert.equal(mediaReads, 0, "stale project identity never reaches Project Host");
  assert.ok(sent.some(item => item.channel === "project.event" && item.payload.event_type === "project.session.changed"), "all connected renderers receive a session resync signal");
  const retiredDelete = await dispatch("project.command", { sender: { id: 81 } } as any, { api_version: 1, command_type: "project.delete", command_id: "retired-direct-delete", idempotency_key: "retired-direct-delete", project_id: "active-project", payload: {} });
  const retiredDeleteResult = retiredDelete as { ok: boolean; error: { code: string; message: string } };
  assert.equal(retiredDeleteResult.ok, false);
  assert.equal(retiredDeleteResult.error.code, "UNKNOWN_COMMAND", "the retired direct-delete route is not admitted by the dispatcher");
  assert.match(retiredDeleteResult.error.message, /UNKNOWN_COMMAND/);
  await sessions.shutdown();
});

test("P4 recycle-bin query works without an open project", async () => {
  const { ProjectSessionManager } = await import("../../apps/desktop/src/main/project-session-manager.js");
  const { createRequestDispatcher } = await import("../../apps/desktop/src/main/ipc/request-dispatcher.js");
  const sessions = new ProjectSessionManager({ status: () => ({ project: "" }), close: async () => {}, suspendCreationRequests: () => () => {} } as any, { close: async () => {} } as any);
  sessions.registerWindow({ webContents: { id: 82, send: () => {} } });
  const recycled = [{ id: "recycled-project" }];
  const dispatch = createRequestDispatcher({
    host: { status: () => ({ project: "" }) }, sessions,
    events: { publish: () => {} }, profile: {}, creationCredential: {},
    recents: { listRecycleBin: () => recycled, list: () => [] },
  } as any, {
    open: async () => ({ canceled: true, filePaths: [] }), save: async () => ({ canceled: true }), confirm: async () => ({ response: 0 }),
  });

  const result = await dispatch("project.query", { sender: { id: 82 } } as any, { api_version: 1, query_type: "app.projects.recycle-bin", project_id: "", payload: {} });
  assert.deepEqual(result, { ok: true, data: recycled });
  await sessions.shutdown();
});

test("P4 system close acknowledgement is admitted during an active project session", async () => {
  const { ProjectSessionManager } = await import("../../apps/desktop/src/main/project-session-manager.js");
  const { createRequestDispatcher } = await import("../../apps/desktop/src/main/ipc/request-dispatcher.js");
  let closeRequest: { token: string } | undefined;
  const host = { status: () => ({ project: "active-project" }), close: async () => {}, suspendCreationRequests: () => () => {} };
  const sessions = new ProjectSessionManager(host as any, { close: async () => {} });
  sessions.registerWindow({ webContents: { id: 86, send: (channel: string, payload: any) => { if (channel === "system.before-close") closeRequest = payload; } } });
  const dispatch = createRequestDispatcher({ host, sessions, events: { publish: () => {} }, profile: {}, creationCredential: {}, recents: {} } as any, {
    open: async () => ({ canceled: true, filePaths: [] }), save: async () => ({ canceled: true }), confirm: async () => ({ response: 0 }),
  });

  const flush = sessions.flushCreationInputs();
  assert.ok(closeRequest, "the active workbench receives the close-save request");
  const result = await dispatch("system.flush-complete", { sender: { id: 86 } } as any, { token: closeRequest.token, ok: true });
  assert.deepEqual(result, { ok: true, data: undefined }, "project-independent system acknowledgement is bound to the current session");
  await flush;
  await sessions.shutdown();
});

test("P4 browser bootstrap queries work when Host already has an open project", async () => {
  const { ProjectSessionManager } = await import("../../apps/desktop/src/main/project-session-manager.js");
  const { createRequestDispatcher } = await import("../../apps/desktop/src/main/ipc/request-dispatcher.js");
  const host = { status: () => ({ project: "already-open-project" }), close: async () => {}, suspendCreationRequests: () => () => {} };
  const sessions = new ProjectSessionManager(host as any, { close: async () => {} });
  sessions.registerWindow({ webContents: { id: 83, send: () => {} } });
  const recent = { items: [{ id: "recent-project" }] };
  const recycled = { items: [{ id: "recycled-project" }] };
  const dispatch = createRequestDispatcher({
    host, sessions, events: { publish: () => {} }, profile: {}, creationCredential: {},
    recents: { list: () => recent, listRecycleBin: () => recycled },
  } as any, {
    open: async () => ({ canceled: true, filePaths: [] }), save: async () => ({ canceled: true }), confirm: async () => ({ response: 0 }),
  });
  const request = (query_type: string) => dispatch("project.query", { sender: { id: 83 } } as any, { api_version: 1, query_type, project_id: "", payload: {} });

  assert.deepEqual(await request("app.status"), { ok: true, data: { project: "already-open-project", model_service: null } });
  assert.deepEqual(await request("app.projects.recent"), { ok: true, data: recent });
  assert.deepEqual(await request("app.projects.recycle-bin"), { ok: true, data: recycled });
  await sessions.shutdown();
});

test("P4 project create and open start from an active Host session and treat dialog cancel as control flow", async () => {
  const { ProjectSessionManager } = await import("../../apps/desktop/src/main/project-session-manager.js");
  const { createRequestDispatcher } = await import("../../apps/desktop/src/main/ipc/request-dispatcher.js");
  const host = { status: () => ({ project: "already-open-project" }), close: async () => {}, suspendCreationRequests: () => () => {} };
  const sessions = new ProjectSessionManager(host as any, { close: async () => {} });
  sessions.registerWindow({ webContents: { id: 84, send: () => {} } });
  let dialogOpens = 0;
  const dispatch = createRequestDispatcher({ host, sessions, events: { publish: () => {} }, profile: {}, creationCredential: {}, recents: {} } as any, {
    open: async () => { dialogOpens++; return { canceled: true, filePaths: [] }; }, save: async () => ({ canceled: true }), confirm: async () => ({ response: 0 }),
  });
  const request = (command_type: string) => dispatch("project.command", { sender: { id: 84 } } as any, { api_version: 1, command_type, command_id: `cancel-${command_type}`, idempotency_key: `cancel-${command_type}`, project_id: "", payload: {} });
  const created = await request("project.create");
  const opened = await request("project.open");

  assert.deepEqual(created, { ok: false, error: { code: "DESKTOP_DIALOG_CANCELLED", message: "已取消，作品没有更改。" } });
  assert.deepEqual(opened, { ok: false, error: { code: "DESKTOP_DIALOG_CANCELLED", message: "已取消，作品没有更改。" } });
  assert.equal(dialogOpens, 2, "blank-project lifecycle commands reach their chooser even while Host has an active project");
  await sessions.shutdown();
});
