import { DesktopLifecycleError } from "../project-session-manager.js";
import type { CommandHandler, DesktopContext, QueryHandler } from "../types.js";
import type { showOpenDialogForEvent } from "./dialog.js";
import { safeMediaRows } from "./project-media-projection.js";
import { createCreationProject, openCreationProject } from "../project-lifecycle.js";

export function registerProjectHandlers(queries: Map<string, QueryHandler>, commands: Map<string, CommandHandler>, context: DesktopContext, chooseDirectory: typeof showOpenDialogForEvent): void {
  const empty = (payload: unknown) => { if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length) throw new DesktopLifecycleError("DESKTOP_RECENT_INPUT_INVALID", "recent list requires an empty payload"); };
  const remember = async (path: string) => { try { await context.recents.remember(path, context.host.status().project); } catch (cause) { const error = new DesktopLifecycleError("DESKTOP_RECENT_SAVE_FAILED_AFTER_OPEN", "project opened successfully but its recent navigation reference could not be saved"); error.cause = cause; throw error; } };
  queries.set("app.projects.recent", async request => { empty(request.payload); return context.recents.list(); });
  commands.set("project.open-recent", async (request,_event,operation) => {
    const payload = request.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).join(",") !== "id" || !("id" in payload) || typeof payload.id !== "string" || !payload.id) throw new DesktopLifecycleError("DESKTOP_RECENT_INPUT_INVALID", "open recent requires exactly one opaque ID");
    const reference = await context.recents.lookup(payload.id); context.sessions.assertCurrent(operation);
    return context.sessions.transition(operation, async()=>{ await openCreationProject(context.host,reference.path,reference.project_id); await remember(reference.path); return context.host.status(); });
  });
  queries.set("app.status", () => ({ ...context.host.status(), model_service: context.modelService ?? null }));
  queries.set("project.media.list", () => safeMediaRows(context.host.listMedia()));
  commands.set("project.create", async (_request,event,operation) => {
    const selection=await chooseDirectory(context,event,operation,{properties:["openDirectory","createDirectory"]});
    context.sessions.assertCurrent(operation);
    if(selection.canceled||!selection.filePaths[0]) throw new Error("没有选择项目目录");
    return context.sessions.transition(operation,async()=>{await createCreationProject(context.host,selection.filePaths[0]!); await remember(selection.filePaths[0]!); return context.host.status();});
  });
  commands.set("project.open", async (_request,event,operation) => {
    const selection=await chooseDirectory(context,event,operation,{properties:["openDirectory"]});
    context.sessions.assertCurrent(operation);
    if(selection.canceled||!selection.filePaths[0]) throw new Error("没有选择项目");
    return context.sessions.transition(operation,async()=>{await openCreationProject(context.host,selection.filePaths[0]!); await remember(selection.filePaths[0]!); return context.host.status();});
  });
  commands.set("project.close",(_request,_event,operation)=>context.sessions.transition(operation,async()=>{await context.host.close();return context.host.status();}));
}
