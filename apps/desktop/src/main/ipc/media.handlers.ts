import type { CommandHandler, DesktopContext, SystemHandler } from "../types.js";
import { showOpenDialogForEvent } from "./dialog.js";

export function registerMediaHandlers(commands: Map<string, CommandHandler>, systems: Map<string, SystemHandler>, context: DesktopContext): void {
  commands.set("project.media.import", async (_request, event) => {
    const selection = await showOpenDialogForEvent(context, event, { properties: ["openFile", "multiSelections"], filters: [{ name: "视频素材", extensions: ["mp4", "mov", "m4v", "webm"] }] });
    if (selection.canceled || selection.filePaths.length === 0) throw new Error("没有选择素材");
    return context.host.importMedia(selection.filePaths);
  });
  commands.set("project.render", async (request, event) => {
    const selection = await showOpenDialogForEvent(context, event, { properties: ["openFile"], filters: [{ name: "视频", extensions: ["mp4", "mov", "m4v"] }] });
    if (selection.canceled || !selection.filePaths[0]) throw new Error("没有选择原片");
    const payload = (request.payload ?? {}) as { qc_requirements?: Record<string, unknown> };
    return context.host.render(selection.filePaths[0], payload.qc_requirements ?? {});
  });
  systems.set("system.choose-files", async (request, event) => { const properties: Array<"openFile" | "multiSelections"> = ["openFile"]; if (request && typeof request === "object" && (request as { multiple?: boolean }).multiple) properties.push("multiSelections"); return showOpenDialogForEvent(context, event, { properties }); });
  systems.set("system.choose-directory", async (_request, event) => showOpenDialogForEvent(context, event, { properties: ["openDirectory", "createDirectory"] }));
}
