import type { CommandHandler, HostContext, SystemHandler, QueryHandler } from "../types.js";
import type { OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { RequestSource } from "../types.js";
import type { DesktopOperation } from "../project-session-manager.js";
import { safeMediaRows } from "./project-media-projection.js";
import { MEDIA_EXTENSIONS } from "../../renderer/media-formats.js";

type ShowOpenDialogForEvent = (context: HostContext, event: RequestSource, operation: DesktopOperation, options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;

export function registerMediaHandlers(commands: Map<string, CommandHandler>, systems: Map<string, SystemHandler>, context: HostContext, showOpenDialogForEvent: ShowOpenDialogForEvent, queries?: Map<string,QueryHandler>): void {
  queries?.set("project.media.preview",request=>context.host.readMediaPreview((request.payload as {asset_id:string}).asset_id));
  commands.set("project.media.import", async (_request, event, operation) => {
    const selection = await showOpenDialogForEvent(context, event, operation, { properties: ["openFile", "multiSelections"], filters: [{ name: "视频、图片与音频素材", extensions: [...MEDIA_EXTENSIONS] }] });
    context.sessions.assertCurrent(operation);
    if (selection.canceled || selection.filePaths.length === 0) throw new Error("没有选择素材");
    await context.host.importMedia(selection.filePaths);
    return safeMediaRows(context.host.listMedia());
  });
  systems.set("system.choose-files", async (request, event, operation) => { const properties: Array<"openFile" | "multiSelections"> = ["openFile"]; if (request && typeof request === "object" && (request as { multiple?: boolean }).multiple) properties.push("multiSelections"); return showOpenDialogForEvent(context, event, operation, { properties }); });
  systems.set("system.choose-directory", async (_request, event, operation) => showOpenDialogForEvent(context, event, operation, { properties: ["openDirectory", "createDirectory"] }));
}
