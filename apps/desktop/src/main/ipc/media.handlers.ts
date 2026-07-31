import type { CommandHandler, DesktopContext, SystemHandler } from "../types.js";

export function registerMediaHandlers(commands: Map<string, CommandHandler>, systems: Map<string, SystemHandler>, context: DesktopContext): void {
  commands.set("project.media.import", async () => {
    const selection = await context.dialog.showOpenDialog({ properties: ["openFile", "multiSelections"], filters: [{ name: "视频素材", extensions: ["mp4", "mov", "m4v", "webm"] }] });
    if (selection.canceled || selection.filePaths.length === 0) throw new Error("没有选择素材");
    return context.host.importMedia(selection.filePaths);
  });
  commands.set("project.render", async (request) => {
    const selection = await context.dialog.showOpenDialog({ properties: ["openFile"], filters: [{ name: "视频", extensions: ["mp4", "mov", "m4v"] }] });
    if (selection.canceled || !selection.filePaths[0]) throw new Error("没有选择原片");
    const payload = (request.payload ?? {}) as { qc_requirements?: Record<string, unknown> };
    return context.host.render(selection.filePaths[0], payload.qc_requirements ?? {});
  });
  systems.set("system.choose-files", async (request) => { const properties: Array<"openFile" | "multiSelections"> = ["openFile"]; if (request && typeof request === "object" && (request as { multiple?: boolean }).multiple) properties.push("multiSelections"); return context.dialog.showOpenDialog({ properties }); });
  systems.set("system.choose-directory", async () => context.dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] }));
}
