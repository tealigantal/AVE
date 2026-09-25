import type { CommandHandler, DesktopContext, QueryHandler } from "../types.js";
import { showOpenDialogForEvent } from "./dialog.js";
import { safeMediaRows } from "./project-media-projection.js";
import { createCreationProject, openCreationProject } from "../project-lifecycle.js";

export function registerProjectHandlers(queries: Map<string, QueryHandler>, commands: Map<string, CommandHandler>, context: DesktopContext): void {
  queries.set("app.status", () => ({ ...context.host.status(), model_service: context.modelService ?? null }));
  queries.set("project.media.list", () => safeMediaRows(context.host.listMedia()));
  commands.set("project.create", async (_request,event,operation) => {
    const selection=await showOpenDialogForEvent(context,event,operation,{properties:["openDirectory","createDirectory"]});
    context.sessions.assertCurrent(operation);
    if(selection.canceled||!selection.filePaths[0]) throw new Error("没有选择项目目录");
    return context.sessions.transition(operation,()=>createCreationProject(context.host,selection.filePaths[0]!));
  });
  commands.set("project.open", async (_request,event,operation) => {
    const selection=await showOpenDialogForEvent(context,event,operation,{properties:["openDirectory"]});
    context.sessions.assertCurrent(operation);
    if(selection.canceled||!selection.filePaths[0]) throw new Error("没有选择项目");
    return context.sessions.transition(operation,()=>openCreationProject(context.host,selection.filePaths[0]!));
  });
  commands.set("project.close",(_request,_event,operation)=>context.sessions.transition(operation,async()=>{await context.host.close();return context.host.status();}));
}
