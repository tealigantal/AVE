import { DesktopLifecycleError } from "../project-session-manager.js";
import type { CommandHandler, HostContext, QueryHandler } from "../types.js";
import type { ShowOpenDialog, RequestDialogs } from "./request-dispatcher.js";
import { safeMediaRows } from "./project-media-projection.js";
import { createCreationProject, openCreationProject } from "../project-lifecycle.js";

export function registerProjectHandlers(queries: Map<string, QueryHandler>, commands: Map<string, CommandHandler>, context: HostContext, chooseDirectory: ShowOpenDialog, showConfirmation: RequestDialogs["confirm"]): void {
  const empty = (payload: unknown) => { if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length) throw new DesktopLifecycleError("DESKTOP_RECENT_INPUT_INVALID", "recent list requires an empty payload"); };
  const remember = async (path: string) => { try { await context.recents.remember(path, context.host.status().project); } catch (cause) { const error = new DesktopLifecycleError("DESKTOP_RECENT_SAVE_FAILED_AFTER_OPEN", "project opened successfully but its recent navigation reference could not be saved"); error.cause = cause; throw error; } };
  queries.set("app.projects.recent", async request => { empty(request.payload); return context.recents.list(); });
  commands.set("project.open-recent", async (request,_event,operation) => {
    const payload = request.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).join(",") !== "id" || !("id" in payload) || typeof payload.id !== "string" || !payload.id) throw new DesktopLifecycleError("DESKTOP_RECENT_INPUT_INVALID", "open recent requires exactly one opaque ID");
    const reference = await context.recents.lookup(payload.id); context.sessions.assertCurrent(operation);
    if(reference.delete_pending) throw new DesktopLifecycleError("DESKTOP_PROJECT_DELETE_PENDING", "project deletion must be explicitly completed before opening");
    return context.sessions.transition(operation, async()=>{ await openCreationProject(context.host,reference.path,reference.project_id); await remember(reference.path); return context.host.status(); });
  });
  const referenceId = (payload: unknown): string => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).join(",") !== "id" || !("id" in payload) || typeof payload.id !== "string" || !payload.id) throw new DesktopLifecycleError("DESKTOP_RECENT_INPUT_INVALID", "project deletion requires exactly one opaque ID");
    return payload.id;
  };
  commands.set("project.delete", async (request,event,operation)=>{
    const id=referenceId(request.payload), reference=await context.recents.lookup(id);
    context.sessions.assertCurrent(operation);
    const confirmation=await showConfirmation(event,operation,{type:"warning",title:"彻底删除作品",message:`永久删除“${reference.display_name}”？`,detail:"本作品的项目文件、素材副本、预览、渲染和缓存将从磁盘移除，无法恢复。外部原片、独立导出和个人档案保留。当前作品会先保存输入并关闭。",buttons:["取消","彻底删除"],defaultId:0,cancelId:0,noLink:true});
    context.sessions.assertCurrent(operation);
    if(confirmation.response!==1)return {...context.host.status(),cancelled:true};
    const current=await context.recents.lookup(id);
    if(current.path!==reference.path||current.project_id!==reference.project_id)throw new DesktopLifecycleError("DESKTOP_RECENT_PROJECT_CHANGED","project identity changed during confirmation");
    if(context.sessions.activeProjectId()===reference.project_id)await context.sessions.flushCreationInputs();
    context.sessions.assertCurrent(operation);
    return context.sessions.transition(operation,async()=>{
      await context.host.deleteProjectDirectory(reference.path,reference.project_id,Boolean(reference.delete_pending),()=>context.recents.beginDeletion(id));
      await context.recents.completeDeletion(id);
      return {...context.host.status(),cancelled:false};
    });
  });
  queries.set("app.status", () => ({ ...context.host.status(), model_service: context.modelService ?? null }));
  queries.set("project.media.list", () => safeMediaRows(context.host.listMedia()));
  queries.set("project.issues.list", request => { empty(request.payload); return context.host.listWorkspaceIssues(); });
  commands.set("project.issues.acknowledge", request => context.host.acknowledgeWorkspaceIssue(request.payload));
  commands.set("project.issues.report", request => {
    const value = request.payload as Record<string, unknown>;
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== "code,message,operation_type" || typeof value.code !== "string" || typeof value.message !== "string" || typeof value.operation_type !== "string") throw new Error("DESKTOP_ISSUE_INPUT_INVALID");
    return context.host.recordWorkspaceIssue({ operation_id: request.command_id, operation_type: value.operation_type, code: value.code, message: value.message });
  });
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
