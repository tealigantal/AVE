import type { CommandHandler, HostContext, SystemHandler, QueryHandler } from "../types.js";
import type { OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { RequestSource } from "../types.js";
import type { DesktopOperation } from "../project-session-manager.js";
import { safeMediaRows } from "./project-media-projection.js";
import { MEDIA_EXTENSIONS } from "../../renderer/media-formats.js";
import { randomUUID } from "node:crypto";

type ShowOpenDialogForEvent = (context: HostContext, event: RequestSource, operation: DesktopOperation, options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;

export function registerMediaHandlers(commands: Map<string, CommandHandler>, systems: Map<string, SystemHandler>, context: HostContext, showOpenDialogForEvent: ShowOpenDialogForEvent, queries?: Map<string,QueryHandler>): void {
  queries?.set("project.media.browse", async (request, event, operation) => {
    const result = await context.host.prepareMediaBrowse(event.sender.id, request.payload as { operation_id: string; asset_id: string }, { signal: operation.signal, assertCurrent: () => context.sessions.assertCurrent(operation) });
    return { ...result, url: `app://renderer/browse/${result.reference}` };
  });
  commands.set("project.media.browse.release", (request, event) => context.host.releaseMediaBrowse(event.sender.id, request.payload as { operation_id: string }));
  commands.set("project.media.browse.report", (request, event) => context.host.reportMediaBrowsePlayback(event.sender.id, request.payload as { reference: string; error_code: number }));
  queries?.set("project.media.browse.waveform", (request, event, operation) => context.host.mediaBrowseWaveform(event.sender.id, request.payload as { reference: string }, { signal: operation.signal, assertCurrent: () => context.sessions.assertCurrent(operation) }));
  queries?.set("project.media.analysis",request=>context.host.readMediaAnalysis((request.payload as {asset_id:string}).asset_id));
  queries?.set("project.media.import-batches", () => context.host.listMediaImportBatches());
  commands.set("project.media.import.cancel", async (request, _event, operation) => {
    context.sessions.assertCurrent(operation);
    const payload = request.payload as { batch_id?: unknown };
    if (!payload || typeof payload.batch_id !== "string" || Object.keys(payload).some(key => key !== "batch_id")) throw new Error("无效的导入批次取消请求");
    return context.host.cancelMediaImportBatch(payload.batch_id);
  });
  commands.set("project.media.import.retry", async (request, event, operation) => {
    context.sessions.assertCurrent(operation);
    const payload = request.payload as { batch_id?: unknown };
    if (!payload || typeof payload.batch_id !== "string" || Object.keys(payload).some(key => key !== "batch_id")) throw new Error("无效的导入批次重试请求");
    const control = { signal: operation.signal, assertCurrent: () => context.sessions.assertCurrent(operation) };
    if (await context.host.mediaImportNeedsSources(payload.batch_id)) {
      context.sessions.assertCurrent(operation);
      const batch = context.host.listMediaImportBatches().find(batch => batch.batch_id === payload.batch_id);
      if (!batch) throw new Error("MEDIA_IMPORT_BATCH_NOT_FOUND");
      const options: OpenDialogOptions & { aveImport: { retry_batch_id: string; names: string[] } } = { title: "仅重新选择失败项的同名来源", properties: ["openFile", "multiSelections"], filters: [{ name: "视频、图片与音频素材", extensions: [...MEDIA_EXTENSIONS] }], aveImport: { retry_batch_id: payload.batch_id, names: batch.items.filter(item => item.status === "failed").map(item => item.display_name) } };
      const selection = await showOpenDialogForEvent(context, event, operation, options);
      context.sessions.assertCurrent(operation);
      const selectedBatch = (selection as OpenDialogReturnValue & { batch_id?: string }).batch_id;
      if (selection.canceled) return { batch: selectedBatch ? context.host.cancelMediaImportBatch(selectedBatch) : batch, cancelled: true };
      if (selectedBatch) { if (selectedBatch !== payload.batch_id) throw new Error("MEDIA_IMPORT_BATCH_MISMATCH"); await context.host.importMedia(selection.filePaths, { batch_id: selectedBatch, control }); return { batch: context.host.listMediaImportBatches().find(batch => batch.batch_id === selectedBatch), cancelled: false }; }
      return { batch: await context.host.retryMediaImportBatch(payload.batch_id, control, selection.filePaths), cancelled: false };
    }
    return { batch: await context.host.retryMediaImportBatch(payload.batch_id, control), cancelled: false };
  });
  commands.set("project.media.import", async (request, event, operation) => {
    if(request.payload!==undefined&&request.payload!==null){
      const payload=request.payload as {batch_id?:unknown};
      if(typeof payload!=="object"||Array.isArray(payload)||Object.keys(payload).join(',')!=="batch_id"||typeof payload.batch_id!=="string")throw new Error("无效的已选来源导入请求");
      context.sessions.assertCurrent(operation);
      await context.host.importMedia([],{batch_id:payload.batch_id,control:{signal:operation.signal,assertCurrent:()=>context.sessions.assertCurrent(operation)}});
      const batch=context.host.listMediaImportBatches().find(batch=>batch.batch_id===payload.batch_id);
      if(!batch)throw new Error("MEDIA_IMPORT_RESULT_MISSING");
      return {media:safeMediaRows(context.host.listMedia()),batch,cancelled:false};
    }
    const selection = await showOpenDialogForEvent(context, event, operation, { properties: ["openFile", "multiSelections"], filters: [{ name: "视频、图片与音频素材", extensions: [...MEDIA_EXTENSIONS] }] });
    context.sessions.assertCurrent(operation);
    const batchId = (selection as OpenDialogReturnValue & { batch_id?: string }).batch_id;
    if (selection.canceled) {
      const batch = batchId ? context.host.cancelMediaImportBatch(batchId) : null;
      return { media: safeMediaRows(context.host.listMedia()), batch, cancelled: true };
    }
    if (selection.filePaths.length === 0 && !batchId) throw new Error("没有选择素材");
    await context.host.importMedia(selection.filePaths, { ...(batchId ? { batch_id: batchId } : {}), identity: { actor_id: "local-user", idempotency_key: request.idempotency_key }, control: { signal: operation.signal, assertCurrent: () => context.sessions.assertCurrent(operation) } });
    const batch = context.host.listMediaImportBatches().find(item => batchId ? item.batch_id === batchId : item.idempotency_key === request.idempotency_key);
    if (!batch) throw new Error("MEDIA_IMPORT_RESULT_MISSING: 导入缺少持久批次结果");
    return { media: safeMediaRows(context.host.listMedia()), batch, cancelled: false };
  });
  systems.set("system.choose-files", async (request, event, operation) => {
    if(request!==undefined&&(!request||typeof request!=="object"||Array.isArray(request)||Object.keys(request).some(key=>key!=="multiple")||("multiple" in request&&typeof request.multiple!=="boolean")))throw new Error("无效的素材选择请求");
    if(context.sessions.activeProjectId()==="")throw new Error("请先打开项目再选择素材");
    const properties:Array<"openFile"|"multiSelections">=["openFile"];if((request as {multiple?:boolean}|undefined)?.multiple)properties.push("multiSelections");
    const selection=await showOpenDialogForEvent(context,event,operation,{properties,filters:[{name:"视频、图片与音频素材",extensions:[...MEDIA_EXTENSIONS]}]});context.sessions.assertCurrent(operation);
    const selected=(selection as OpenDialogReturnValue&{batch_id?:string}).batch_id;
    if(selection.canceled)return {cancelled:true,batch_id:selected??null,items:[]};
    const batch=selected?context.host.listMediaImportBatches().find(batch=>batch.batch_id===selected):context.host.createMediaImportBatch(selection.filePaths.map(path=>path.split(/[\\/]/).at(-1)!),{actor_id:"local-user",idempotency_key:`source-selection:${randomUUID()}`});
    if(!batch)throw new Error("MEDIA_IMPORT_BATCH_NOT_FOUND");
    if(!selected)for(const [index,path] of selection.filePaths.entries())context.host.bindMediaImportSource(batch.batch_id,batch.items[index].item_id,path);
    return {cancelled:false,batch_id:batch.batch_id,items:batch.items.map(({item_id,source_ref_id,display_name})=>({item_id,source_ref_id,display_name}))};
  });
  systems.set("system.choose-directory", async (_request, event, operation) => showOpenDialogForEvent(context, event, operation, { properties: ["openDirectory", "createDirectory"] }));
}
