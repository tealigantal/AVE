import { DesktopLifecycleError } from "../project-session-manager.js";
import type { CommandHandler, HostContext, QueryHandler } from "../types.js";
import type { ShowOpenDialog, RequestDialogs } from "./request-dispatcher.js";
import { safeMediaRows } from "./project-media-projection.js";
import { createCreationProject, openCreationProject } from "../project-lifecycle.js";
import { creationErrorResult } from "./creation-errors.js";

export function registerProjectHandlers(queries: Map<string, QueryHandler>, commands: Map<string, CommandHandler>, context: HostContext, chooseDirectory: ShowOpenDialog, showConfirmation: RequestDialogs["confirm"]): void {
  const empty = (payload: unknown) => { if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length) throw new DesktopLifecycleError("DESKTOP_RECENT_INPUT_INVALID", "recent list requires an empty payload"); };
  const remember = async (path: string) => { try { await context.recents.remember(path, context.host.status().project); } catch (cause) { const error = new DesktopLifecycleError("DESKTOP_RECENT_SAVE_FAILED_AFTER_OPEN", "project opened successfully but its recent navigation reference could not be saved"); error.cause = cause; throw error; } };
  queries.set("app.projects.recent", async request => { empty(request.payload); return context.recents.list(); });
  queries.set("app.projects.recycle-bin", async request => { empty(request.payload); return context.recents.listRecycleBin(); });
  commands.set("project.open-recent", async (request,_event,operation) => {
    const payload = request.payload;
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).join(",") !== "id" || !("id" in payload) || typeof payload.id !== "string" || !payload.id) throw new DesktopLifecycleError("DESKTOP_RECENT_INPUT_INVALID", "open recent requires exactly one opaque ID");
    const reference = await context.recents.lookupActive(payload.id); context.sessions.assertCurrent(operation);
    if(reference.delete_pending) throw new DesktopLifecycleError("DESKTOP_PROJECT_DELETE_PENDING", "project deletion must be explicitly completed before opening");
    return context.sessions.transition(operation, async()=>{ await openCreationProject(context.host,reference.path,reference.project_id); await remember(reference.path); return context.host.status(); });
  });
  const referenceId = (payload: unknown): string => {
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).join(",") !== "id" || !("id" in payload) || typeof payload.id !== "string" || !payload.id) throw new DesktopLifecycleError("DESKTOP_RECENT_INPUT_INVALID", "recycle action requires exactly one opaque ID");
    return payload.id;
  };
  const moveToRecycleBin = async (request: Parameters<CommandHandler>[0],_event: Parameters<CommandHandler>[1],operation: Parameters<CommandHandler>[2]) => {
    const id=referenceId(request.payload), reference=await context.recents.lookup(id);
    context.sessions.assertCurrent(operation);
    if(reference.delete_pending)throw new DesktopLifecycleError("DESKTOP_PROJECT_DELETE_PENDING","project cleanup must be retried from the recycle bin");
    if(context.sessions.activeProjectId()===reference.project_id)await context.sessions.flushCreationInputs();
    context.sessions.assertCurrent(operation);
    return context.sessions.transition(operation,async()=>{
      if(context.sessions.activeProjectId()===reference.project_id)await context.host.close();
      await context.recents.moveToRecycleBin(id,reference.path,reference.project_id);
      return { ...context.host.status(), moved_id:id };
    });
  };
  commands.set("project.recycle-bin.move", moveToRecycleBin);
  commands.set("project.recycle-bin.restore", async (request,_event,operation) => {
    const id=referenceId(request.payload);await context.recents.lookupRecycleBin(id);context.sessions.assertCurrent(operation);return context.sessions.transition(operation,async()=>{await context.recents.restoreFromRecycleBin(id);return {restored_ids:[id]};});
  });
  commands.set("project.recycle-bin.restore-all", async (request,_event,operation) => { empty(request.payload);context.sessions.assertCurrent(operation);return context.sessions.transition(operation,()=>context.recents.restoreAllFromRecycleBin()); });

  const confirmPermanentDeletion = async (event: Parameters<CommandHandler>[1],operation: Parameters<CommandHandler>[2],names: readonly string[]) => {
    const itemList=names.map(name=>`• ${name}`).join("\n");
    return showConfirmation(event,operation,{type:"warning",title:"永久删除回收站作品",message:names.length===1?`永久删除“${names[0]}”？`:`永久删除回收站中的 ${names.length} 个作品？`,detail:`将从磁盘移除以下作品的专属项目文件、素材副本、预览、渲染和缓存。外部原片、独立导出、个人档案及其他作品会保留。此操作无法撤销。\n\n${itemList}`,buttons:["取消","永久删除"],defaultId:0,cancelId:0,noLink:true});
  };
  const deleteRecycledReference = async (reference: Awaited<ReturnType<typeof context.recents.lookupRecycleBin>>,operation: Parameters<CommandHandler>[2]) => {
    const current=await context.recents.lookupRecycleBin(reference.id);
    if(current.path!==reference.path||current.project_id!==reference.project_id)throw new DesktopLifecycleError("DESKTOP_RECENT_PROJECT_CHANGED","project identity changed before cleanup");
    if(context.sessions.activeProjectId()===reference.project_id)await context.sessions.flushCreationInputs();
    context.sessions.assertCurrent(operation);
    await context.sessions.transition(operation,async()=>{
      await context.host.deleteProjectDirectory(current.path,current.project_id,Boolean(current.delete_pending),()=>context.recents.beginDeletion(current.id));
      await context.recents.completeDeletion(current.id);
    });
    return {id:current.id,display_name:current.display_name,status:"deleted" as const};
  };
  commands.set("project.recycle-bin.permanently-delete", async (request,event,operation)=>{
    const reference=await context.recents.lookupRecycleBin(referenceId(request.payload));context.sessions.assertCurrent(operation);
    const confirmation=await confirmPermanentDeletion(event,operation,[reference.display_name]);context.sessions.assertCurrent(operation);
    if(confirmation.response!==1)return {...context.host.status(),cancelled:true,id:reference.id};
    const result=await deleteRecycledReference(reference,operation);
    return {...context.host.status(),cancelled:false,...result};
  });
  commands.set("project.recycle-bin.permanently-delete-all", async (request,event,operation)=>{
    empty(request.payload);
    const snapshot=(await context.recents.listRecycleBin()).items;
    if(!snapshot.length)return {status:"completed",results:[]};
    const references=await Promise.all(snapshot.map(item=>context.recents.lookupRecycleBin(item.id)));
    context.sessions.assertCurrent(operation);
    const confirmation=await confirmPermanentDeletion(event,operation,references.map(item=>item.display_name));context.sessions.assertCurrent(operation);
    if(confirmation.response!==1)return {status:"cancelled",results:[]};
    const results=[];
    for(const reference of references){
      try{results.push(await deleteRecycledReference(reference,operation));}
      catch(error){const safe=creationErrorResult("COMMAND_FAILED",error).error;results.push({id:reference.id,display_name:reference.display_name,status:"failed",error:safe});}
    }
    const failed=results.some(item=>item.status==="failed");
    return {status:failed?(results.some(item=>item.status==="deleted")?"partial":"failed"):"completed",results};
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
    if(selection.canceled||!selection.filePaths[0]) throw new DesktopLifecycleError("DESKTOP_DIALOG_CANCELLED", "project creation directory selection was cancelled");
    return context.sessions.transition(operation,async()=>{await createCreationProject(context.host,selection.filePaths[0]!); await remember(selection.filePaths[0]!); return context.host.status();});
  });
  commands.set("project.open", async (_request,event,operation) => {
    const selection=await chooseDirectory(context,event,operation,{properties:["openDirectory"]});
    context.sessions.assertCurrent(operation);
    if(selection.canceled||!selection.filePaths[0]) throw new DesktopLifecycleError("DESKTOP_DIALOG_CANCELLED", "project open selection was cancelled");
    await context.recents.assertOpenPathAllowed(selection.filePaths[0]!);context.sessions.assertCurrent(operation);
    return context.sessions.transition(operation,async()=>{await openCreationProject(context.host,selection.filePaths[0]!); await remember(selection.filePaths[0]!); return context.host.status();});
  });
  commands.set("project.close",(_request,_event,operation)=>context.sessions.transition(operation,async()=>{await context.host.close();return context.host.status();}));
}
