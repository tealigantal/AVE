import assert from "node:assert/strict";
import { test } from "node:test";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const rendererStatePath: string = "../../apps/desktop/src/renderer/state/workbench-state.js";
const projectApiPath: string = "../../apps/desktop/src/renderer/api/project-api.js";

test("composer plus menu and conversation scroll retain real controls", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "ave-composer-panel-"));
  try {
    const renderer = resolve(root, "renderer");
    await cp(resolve("apps/desktop/src/renderer"), renderer, { recursive: true });
    const html = resolve(renderer, "composer-test.html"), launcher = resolve(root, "composer-launcher.cjs");
    await writeFile(html, '<!doctype html><html><head><link rel="stylesheet" href="./styles/workbench.css"></head><body></body></html>');
    const workspaceUrl = pathToFileURL(resolve(renderer, "features/creation-workspace.js")).href;
    const script = `const {createCreationWorkspace}=await import(${JSON.stringify(workspaceUrl)});
      const request={authorization:{request_id:'r',original_text:'测试作品',asset_ids:[],protected_refs:[],expires_at:'2999-01-01T00:00:00Z'},status:'received',revisions:Array.from({length:20},(_,i)=>({revision:i+1,conversation_revision:i+1,raw_text:'测试消息 '+(i+1),preserve_refs:[]})),drafts:[],materials:[],observations:[],learning:[],adoptions:[],timeline_annotations:[],revoked:false};
      const state={status:{project:'fixture',model_service:null},workspace:{requests:[request],timeline_version:1,profile_contexts:{mode:'unconfigured',contexts:[]}},selectedRequestId:'r',selectedDraftId:'',selectedRenderId:'',selectedClip:null,selectedCaption:null,selectedTransition:null,selectedTimelineTrackId:'',creationView:'request',workspacePage:'creation',authorityCurrent:true,timeline:{version:1,sequence:{timebase:{value:1n,timescale:30n}},tracks:[]},displayedPreviewTimeline:null,forms:new Map(),formsGeneration:0,pending:new Set(),media:[],precisionSources:[],failedRenderAttempts:new Set(),previewCovers:new Map(),previewCoverRevision:0,profileQuery:null};
      const actions=new Proxy({editAvailability:()=>({undo:false,redo:false}),adoptionAvailability:()=>({undo:false,redo:false}),saveUi(){}},{get(target,key){return target[key]??(()=>{});}});
      const host=document.createElement('div');host.className='fine-chat-popover';host.style.cssText='position:fixed;bottom:10px;right:10px';const ui=createCreationWorkspace(actions,state);host.append(ui.node,ui.dock);document.body.append(host);ui.update();
      const plus=host.querySelector('.composer-add-button'),menu=host.querySelector('.composer-options-menu'),panels=[...host.querySelectorAll('.composer-settings-panel')],log=host.querySelector('.conversation-log');
      const initialHidden=menu.hidden&&panels.every(item=>item.hidden);plus.click();const menuOpened=!menu.hidden&&plus.getAttribute('aria-expanded')==='true';
      const labels=[...menu.querySelectorAll('button')].map(item=>item.textContent),menuRect=menu.getBoundingClientRect(),menuFits=menuRect.top>=0&&menuRect.right<=innerWidth&&menuRect.bottom<=innerHeight;
      menu.querySelector('[data-composer-option="sound"]').click();const sound=panels.find(item=>item.getAttribute('aria-label')==='声音设置'),soundOpened=!sound.hidden&&Boolean(sound.querySelector('[aria-label="AI 制作的环境声要求"]'));
      ui.dock.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));const escaped=sound.hidden&&document.activeElement===plus&&plus.getAttribute('aria-expanded')==='false';
      plus.click();menu.querySelector('[data-composer-option="protect"]').click();const protect=panels.find(item=>item.getAttribute('aria-label')==='保护镜头'),protectOpened=!protect.hidden&&Boolean(protect.querySelector('[name="preserve_refs"]'));
      protect.querySelector('.composer-settings-close').click();plus.click();menu.querySelector('[data-composer-option="request"]').click();const requestPanel=panels.find(item=>item.getAttribute('aria-label')==='创作要求'),requestOpened=!requestPanel.hidden&&Boolean(requestPanel.querySelector('.request-settings'));
      requestPanel.querySelector('.composer-settings-close').click();const scrollable=log.scrollHeight>log.clientHeight&&log.tabIndex===0;log.scrollTop=log.scrollHeight;
      request.revisions.push({revision:21,conversation_revision:21,raw_text:'新消息',preserve_refs:[]});ui.update();await Promise.resolve();const followsBottom=log.scrollTop+log.clientHeight>=log.scrollHeight-1;
      log.scrollTop=0;request.revisions.push({revision:22,conversation_revision:22,raw_text:'另一条消息',preserve_refs:[]});ui.update();await Promise.resolve();const preservesHistory=log.scrollTop===0;
      let submitted;actions.begin=value=>{submitted=value;};state.status.model_service={provider:'fixture',model:'fixture'};state.workspace.requests=[];state.selectedRequestId='';state.media=[{asset_id:'asset-a',asset_location_id:'original-a',location_type:'original',display_name:'素材',permission_state:'unknown'}];ui.update();
      state.status.model_profiles={default_digest:'a'.repeat(64),options:[{digest:'a'.repeat(64),label:'本机',audio_mode:'local',routes:[{role:'vision',provider:'fixture',model:'economy',endpoint:'https://example.com'}]},{digest:'b'.repeat(64),label:'云端',audio_mode:'cloud',routes:[{role:'vision',provider:'fixture',model:'quality',endpoint:'https://example.com'}]}]};ui.update();
      const profileSelect=requestPanel.querySelector('[name="model_deployment_digest"]'),defaultProfile=profileSelect.value==='a'.repeat(64)&&profileSelect.selectedOptions[0].textContent.includes('本地音频')&&requestPanel.textContent.includes('转写与声音分析使用本地');profileSelect.value='b'.repeat(64);profileSelect.dispatchEvent(new Event('change',{bubbles:true}));const selectedProfile=profileSelect.value==='b'.repeat(64)&&profileSelect.selectedOptions[0].textContent.includes('全云端')&&requestPanel.textContent.includes('quality')&&requestPanel.textContent.includes('转写和声音分析使用云端');
      plus.click();menu.querySelector('[data-composer-option="request"]').click();const profileVisible=profileSelect.getBoundingClientRect().height>0&&!profileSelect.closest('[hidden]');const item=requestPanel.querySelector('.creation-material-item input'),selectedByDefault=Boolean(item?.checked);item.click();const updatedItem=requestPanel.querySelector('.creation-material-item input'),canDeselect=!updatedItem.checked;updatedItem.click();requestPanel.querySelector('.composer-settings-close').click();
      const text=ui.dock.querySelector('textarea');text.value='制作短片';text.dispatchEvent(new Event('input',{bubbles:true}));ui.dock.querySelector('[aria-label="发送当前创作要求"]').click();
      const submittedActual=Boolean(submitted?.asset_ids?.[0]==='asset-a'&&submitted.original_locations?.[0]?.asset_location_id==='original-a'&&['request','timeline','evidence','frames'].every(key=>submitted.allowed_data.includes(key)));
      const submittedProfile=submitted?.model_deployment_digest==='b'.repeat(64);
      state.status.model_profiles.options=state.status.model_profiles.options.slice(0,1);ui.update();ui.update();const removedProfileNeedsChoice=profileSelect.value==='';
      ui.destroy();host.remove();return {initialHidden,menuOpened,labels,menuFits,soundOpened,escaped,protectOpened,requestOpened,scrollable,followsBottom,preservesHistory,selectedByDefault,canDeselect,submittedActual,defaultProfile,selectedProfile,submittedProfile,profileVisible,removedProfileNeedsChoice};`;
    await writeFile(launcher, `const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(root)});app.disableHardwareAcceleration();app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,width:800,height:500,webPreferences:{sandbox:false}});try{await win.loadFile(${JSON.stringify(html)});const result=await win.webContents.executeJavaScript(${JSON.stringify(`(async()=>{${script}})()`)});console.log('AVE_COMPOSER_RESULT '+JSON.stringify(result));}finally{win.destroy();app.quit();}}).catch(error=>{console.error(error);app.exit(1);});`);
    const electron = resolve("node_modules/electron/dist", process.platform === "win32" ? "electron.exe" : "electron");
    const { stdout } = await promisify(execFile)(electron, ["--no-sandbox", "--disable-gpu", launcher], { timeout: 20000 });
    const result = stdout.split(/\r?\n/).find(line => line.startsWith("AVE_COMPOSER_RESULT "));
    assert.ok(result, "composer returned no DOM result");
    assert.deepEqual(JSON.parse(result.slice("AVE_COMPOSER_RESULT ".length)), { initialHidden:true,menuOpened:true,labels:["创作要求","保护镜头","声音设置"],menuFits:true,soundOpened:true,escaped:true,protectOpened:true,requestOpened:true,scrollable:true,followsBottom:true,preservesHistory:true,selectedByDefault:true,canDeselect:true,submittedActual:true,defaultProfile:true,selectedProfile:true,submittedProfile:true,profileVisible:true,removedProfileNeedsChoice:true });
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("material insert controls follow creation and precision context", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "ave-material-panel-"));
  try {
    const renderer = resolve(root, "renderer");
    await cp(resolve("apps/desktop/src/renderer"), renderer, { recursive: true });
    const html = resolve(renderer, "material-test.html"), launcher = resolve(root, "launcher.cjs");
    await writeFile(html, "<!doctype html><html><body></body></html>");
    const panelUrl = pathToFileURL(resolve(renderer, "features/media-panel.js")).href;
    const stateUrl = pathToFileURL(resolve(renderer, "state/workbench-state.js")).href;
    const script = `const {mediaPanel}=await import(${JSON.stringify(panelUrl)});const {createWorkbenchState}=await import(${JSON.stringify(stateUrl)});
      const state=createWorkbenchState();state.status.project='fixture';state.workspacePage='creation';state.workspace={requests:[]};
      const panel=mediaPanel({importMedia(){},selectAsset(){}},state);document.body.append(panel);
      const shelf=panel.querySelector('.p4-authorized-resource-shelf');const emptyCreation=shelf.hidden;
      state.workspacePage='precision';panel.refreshSources();panel.refreshAvailability();const precisionVisible=!shelf.hidden;
      state.workspacePage='creation';state.selectedRequestId='request';state.selectedDraftId='draft';state.workspace.requests=[{authorization:{request_id:'request'},drafts:[{draft_id:'draft',timeline_version:1}]}];state.timeline={version:1,tracks:[]};state.authorityCurrent=true;
      panel.refreshSources();panel.refreshAvailability();const existingVisible=!shelf.hidden;const loadEnabled=!shelf.querySelector('.p4-resource-heading button').disabled;
      panel.destroy();panel.remove();return {emptyCreation,precisionVisible,existingVisible,loadEnabled};`;
    await writeFile(launcher, `const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(root)});app.disableHardwareAcceleration();app.whenReady().then(async()=>{const win=new BrowserWindow({show:false,webPreferences:{sandbox:false}});try{await win.loadFile(${JSON.stringify(html)});const result=await win.webContents.executeJavaScript(${JSON.stringify(`(async()=>{${script}})()`)});console.log('AVE_MATERIAL_RESULT '+JSON.stringify(result));}finally{win.destroy();app.quit();}}).catch(error=>{console.error(error);app.exit(1);});`);
    const electron = resolve("node_modules/electron/dist", process.platform === "win32" ? "electron.exe" : "electron");
    const { stdout } = await promisify(execFile)(electron, ["--no-sandbox", "--disable-gpu", launcher], { timeout: 20000 });
    const result = stdout.split(/\r?\n/).find(line => line.startsWith("AVE_MATERIAL_RESULT "));
    assert.ok(result, "material panel returned no DOM result");
    assert.deepEqual(JSON.parse(result.slice("AVE_MATERIAL_RESULT ".length)), { emptyCreation: true, precisionVisible: true, existingVisible: true, loadEnabled: true });
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
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
