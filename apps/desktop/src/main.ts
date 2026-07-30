import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ProjectHostSession } from "./project-host.js";

const projectHost = new ProjectHostSession();
const currentDirectory = dirname(fileURLToPath(import.meta.url));

function validateSender(event: Electron.IpcMainInvokeEvent): void {
  const frameUrl = event.senderFrame.url;
  if (!frameUrl.startsWith("file://")) throw new Error("untrusted IPC sender");
}

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    webPreferences: {
      preload: join(currentDirectory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  return window;
}

ipcMain.handle("project.query", (event, request: unknown) => {
  validateSender(event);
  if (!request || typeof request !== "object" || (request as { api_version?: number }).api_version !== 1) return { ok: false, error: { code: "INVALID_REQUEST", message: "api_version must be 1" } };
  const queryType = (request as { query_type?: string }).query_type;
  if (queryType !== "app.status") return { ok: false, error: { code: "UNKNOWN_QUERY", message: "query is not implemented by this host" } };
  return { ok: true, data: projectHost.status() };
});
ipcMain.handle("project.command", async (event, request: unknown) => {
  validateSender(event);
  if (!request || typeof request !== "object" || (request as { api_version?: number }).api_version !== 1) return { ok: false, error: { code: "INVALID_REQUEST", message: "api_version must be 1" } };
  const commandType = (request as { command_type?: string }).command_type;
  if (commandType === "project.open") {
    const selection = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    if (selection.canceled || !selection.filePaths[0]) return { ok: false, error: { code: "CANCELLED", message: "没有选择项目" } };
    return { ok: true, data: await projectHost.open(selection.filePaths[0]) };
  }
  if (commandType === "project.close") { await projectHost.close(); return { ok: true, data: projectHost.status() }; }
  if (commandType === "project.timeline.initialize") {
    try { return { ok: true, data: projectHost.initializeTimeline((request as { payload?: { tracks?: unknown } }).payload?.tracks as never) }; }
    catch (error) { return { ok: false, error: { code: "TIMELINE_INIT_FAILED", message: error instanceof Error ? error.message : "timeline initialization failed" } }; }
  }
  if (commandType === "project.timeline.command") {
    try { const payload = (request as { payload?: { command?: unknown; base_version?: number } }).payload; return { ok: true, data: projectHost.applyTimelineCommand(payload?.command as never, payload?.base_version as number) }; }
    catch (error) { return { ok: false, error: { code: "TIMELINE_COMMAND_FAILED", message: error instanceof Error ? error.message : "timeline command failed" } }; }
  }
  if (commandType === "project.timeline.undo") {
    try { return { ok: true, data: projectHost.undoTimeline() }; }
    catch (error) { return { ok: false, error: { code: "UNDO_FAILED", message: error instanceof Error ? error.message : "undo failed" } }; }
  }
  if (commandType === "project.timeline.redo") {
    try { return { ok: true, data: projectHost.redoTimeline() }; }
    catch (error) { return { ok: false, error: { code: "REDO_FAILED", message: error instanceof Error ? error.message : "redo failed" } }; }
  }
  if (commandType === "project.render") {
    const selection = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "视频", extensions: ["mp4", "mov", "m4v"] }] });
    if (selection.canceled || !selection.filePaths[0]) return { ok: false, error: { code: "CANCELLED", message: "没有选择原片" } };
    try { return { ok: true, data: await projectHost.render(selection.filePaths[0]) }; }
    catch (error) { return { ok: false, error: { code: "RENDER_FAILED", message: error instanceof Error ? error.message : "render failed" } }; }
  }
  if (commandType === "project.evidence.register") {
    try { projectHost.registerEvidence((request as { payload?: Record<string, unknown> }).payload ?? {}); return { ok: true, data: projectHost.status() }; }
    catch (error) { return { ok: false, error: { code: "EVIDENCE_REGISTER_FAILED", message: error instanceof Error ? error.message : "evidence registration failed" } }; }
  }
  if (commandType === "project.story.approve") {
    try { projectHost.registerApprovedStoryPlan((request as { payload?: Record<string, unknown> }).payload ?? {}); return { ok: true, data: projectHost.status() }; }
    catch (error) { return { ok: false, error: { code: "STORY_APPROVAL_FAILED", message: error instanceof Error ? error.message : "story approval failed" } }; }
  }
  if (commandType === "project.assembly.register") {
    try { projectHost.registerAssemblyCut((request as { payload?: Record<string, unknown> }).payload ?? {}); return { ok: true, data: projectHost.status() }; }
    catch (error) { return { ok: false, error: { code: "ASSEMBLY_REGISTER_FAILED", message: error instanceof Error ? error.message : "assembly registration failed" } }; }
  }
  if (commandType === "project.assembly.compile") {
    try { const payload = (request as { payload?: { assembly_id?: string; track_id?: string; base_version?: number } }).payload; return { ok: true, data: projectHost.compileAssemblyToTimeline(payload?.assembly_id as string, payload?.track_id as string, payload?.base_version as number) }; }
    catch (error) { return { ok: false, error: { code: "ASSEMBLY_COMPILE_FAILED", message: error instanceof Error ? error.message : "assembly compile failed" } }; }
  }
  if (commandType === "project.rough-cut.apply") {
    try { const payload = (request as { payload?: { patch?: unknown; track_id?: string } }).payload; return { ok: true, data: projectHost.applyRoughCutPatch(payload?.patch, payload?.track_id as string) }; }
    catch (error) { return { ok: false, error: { code: "ROUGH_CUT_FAILED", message: error instanceof Error ? error.message : "rough cut failed" } }; }
  }
  if (commandType === "project.review.diagnosis") {
    try { const payload = (request as { payload?: { diagnosis?: unknown; issues?: unknown[] } }).payload; projectHost.registerFeedbackDiagnosis(payload?.diagnosis, payload?.issues ?? []); return { ok: true, data: projectHost.status() }; }
    catch (error) { return { ok: false, error: { code: "DIAGNOSIS_FAILED", message: error instanceof Error ? error.message : "diagnosis failed" } }; }
  }
  if (commandType === "project.review.compare") {
    try { projectHost.registerCompare((request as { payload?: Record<string, unknown> }).payload ?? {}); return { ok: true, data: projectHost.status() }; }
    catch (error) { return { ok: false, error: { code: "COMPARE_FAILED", message: error instanceof Error ? error.message : "compare failed" } }; }
  }
  if (commandType === "project.review.reaction") {
    try { projectHost.registerReactionTiming((request as { payload?: Record<string, unknown> }).payload ?? {}); return { ok: true, data: projectHost.status() }; }
    catch (error) { return { ok: false, error: { code: "REACTION_FAILED", message: error instanceof Error ? error.message : "reaction timing failed" } }; }
  }
  if (commandType === "project.delivery.privacy" || commandType === "project.delivery.rights" || commandType === "project.delivery.manifest") {
    try { const payload = (request as { payload?: Record<string, unknown> }).payload ?? {}; if (commandType.endsWith("privacy")) projectHost.registerPrivacy(payload); else if (commandType.endsWith("rights")) projectHost.registerRights(payload); else projectHost.registerDelivery(payload); return { ok: true, data: projectHost.status() }; }
    catch (error) { return { ok: false, error: { code: "DELIVERY_GATE_FAILED", message: error instanceof Error ? error.message : "delivery gate failed" } }; }
  }
  if (commandType === "project.export.capability") { try { const payload = (request as { payload?: { capability_id?: string; profile?: unknown } }).payload; projectHost.validateExportProfile(payload?.capability_id as string, payload?.profile); return { ok: true, data: projectHost.status() }; } catch (error) { return { ok: false, error: { code: "EXPORT_CAPABILITY_FAILED", message: error instanceof Error ? error.message : "export capability failed" } }; } }
  if (commandType === "project.export.register") {
    const selection = await dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "MP4", extensions: ["mp4"] }] });
    if (selection.canceled || !selection.filePaths[0]) return { ok: false, error: { code: "CANCELLED", message: "没有选择导出文件" } };
    try { const payload = (request as { payload?: { delivery_id?: string; qc_report_id?: string; export_id?: string } }).payload; return { ok: true, data: await projectHost.registerExportFile(payload?.delivery_id as string, payload?.qc_report_id as string, payload?.export_id as string, selection.filePaths[0]) }; } catch (error) { return { ok: false, error: { code: "EXPORT_REGISTER_FAILED", message: error instanceof Error ? error.message : "export registration failed" } }; }
  }
  return { ok: false, error: { code: "COMMAND_REQUIRES_HOST", message: "该命令尚未接入 Project Host" } };
});

app.whenReady().then(() => { createWindow(); app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
