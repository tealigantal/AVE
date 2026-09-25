import type { CommandHandler, DesktopContext, SystemHandler } from "../types.js";
import type { IpcMainInvokeEvent, OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { DesktopOperation } from "../project-session-manager.js";
import { safeMediaRows } from "./project-media-projection.js";

type ShowOpenDialogForEvent = (context: DesktopContext, event: IpcMainInvokeEvent, operation: DesktopOperation, options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;

export function registerMediaHandlers(commands: Map<string, CommandHandler>, systems: Map<string, SystemHandler>, context: DesktopContext, showOpenDialogForEvent: ShowOpenDialogForEvent): void {
  commands.set("project.media.import", async (_request, event, operation) => {
    const selection = await showOpenDialogForEvent(context, event, operation, { properties: ["openFile", "multiSelections"], filters: [{ name: "视频与音频素材", extensions: ["mp4", "mov", "m4v", "webm", "wav", "mp3", "m4a", "flac"] }] });
    context.sessions.assertCurrent(operation);
    if (selection.canceled || selection.filePaths.length === 0) throw new Error("没有选择素材");
    await context.host.importMedia(selection.filePaths);
    return safeMediaRows(context.host.listMedia());
  });
  systems.set("system.choose-files", async (request, event, operation) => { const properties: Array<"openFile" | "multiSelections"> = ["openFile"]; if (request && typeof request === "object" && (request as { multiple?: boolean }).multiple) properties.push("multiSelections"); return showOpenDialogForEvent(context, event, operation, { properties }); });
  systems.set("system.choose-directory", async (_request, event, operation) => showOpenDialogForEvent(context, event, operation, { properties: ["openDirectory", "createDirectory"] }));
}
