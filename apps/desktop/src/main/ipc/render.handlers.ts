import type { CommandHandler, DesktopContext } from "../types.js";

export function registerRenderHandlers(commands: Map<string, CommandHandler>, context: DesktopContext, host: Record<string, (...args: any[]) => unknown>): void {
  commands.set("project.export.capability", (request) => { const payload = request.payload as { capability_id?: string; profile?: unknown } | undefined; host.validateExportProfile(payload?.capability_id as string, payload?.profile); return host.status(); });
  commands.set("project.export.register", async (request) => { const payload = request.payload as { delivery_id?: string; qc_report_id?: string; export_id?: string } | undefined; const selection = await context.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "MP4", extensions: ["mp4"] }] }); if (selection.canceled || !selection.filePaths[0]) throw new Error("没有选择导出文件"); return host.registerExportFile(payload?.delivery_id as string, payload?.qc_report_id as string, payload?.export_id as string, selection.filePaths[0]); });
}
