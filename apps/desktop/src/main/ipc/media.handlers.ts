import type { CommandHandler, DesktopContext, SystemHandler } from "../types.js";
import type { IpcMainInvokeEvent, OpenDialogOptions, OpenDialogReturnValue } from "electron";

type ShowOpenDialogForEvent = (context: DesktopContext, event: IpcMainInvokeEvent, options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;

export function registerMediaHandlers(commands: Map<string, CommandHandler>, systems: Map<string, SystemHandler>, context: DesktopContext, showOpenDialogForEvent: ShowOpenDialogForEvent): void {
  commands.set("project.media.import", async (_request, event) => {
    const selection = await showOpenDialogForEvent(context, event, { properties: ["openFile", "multiSelections"], filters: [{ name: "视频素材", extensions: ["mp4", "mov", "m4v", "webm"] }] });
    if (selection.canceled || selection.filePaths.length === 0) throw new Error("没有选择素材");
    return context.host.importMedia(selection.filePaths);
  });
  systems.set("system.choose-files", async (request, event) => { const properties: Array<"openFile" | "multiSelections"> = ["openFile"]; if (request && typeof request === "object" && (request as { multiple?: boolean }).multiple) properties.push("multiSelections"); return showOpenDialogForEvent(context, event, { properties }); });
  systems.set("system.choose-directory", async (_request, event) => showOpenDialogForEvent(context, event, { properties: ["openDirectory", "createDirectory"] }));
}
