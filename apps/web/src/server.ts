import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, readFile, realpath, rmdir, stat, statfs, unlink } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { basename, dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHostContext } from '../../desktop/src/main/host-context.js';
import { createRequestDispatcher, type RequestDialogs } from '../../desktop/src/main/ipc/request-dispatcher.js';
import { DesktopLifecycleError, type DesktopOperation } from '../../desktop/src/main/project-session-manager.js';
import { MEDIA_EXTENSIONS } from '../../desktop/src/renderer/media-formats.js';
import { encode, decode } from './wire.js';

type DialogAnswer={response?:number;choice?:string;name?:string;uploads?:string[];cancel?:boolean;batch_id?:string};
type UploadRecord={id:string;path:string;project_id:string;batch_id:string;item_id:string};
type UploadSlot={item_id:string;name:string;bytes:number;upload_id?:string;controller?:AbortController;completion?:Promise<void>};
type PendingDialog={resolve:(value:DialogAnswer)=>void;reject:(error:unknown)=>void;choices?:Map<string,string>;kind:string;operation:DesktopOperation;project_id:string;batch_id?:string;retry_batch_id?:string;slots?:Map<string,UploadSlot>;settling:boolean};
type Client={id:number;token:string;csrf:string;lastSeen:number;events?:ServerResponse;uploads:Map<string,string>;uploadRecords:Map<string,UploadRecord>;downloads:Map<string,{path:string;name:string;ready:boolean}>;pending:Map<string,PendingDialog>};
const uploadReservations=new Map<string,number>();
const invocation=new AsyncLocalStorage<string[]>();
const roots={projects:resolve(process.env.AVE_PROJECT_ROOT??'/workspace/projects'),uploads:resolve(process.env.AVE_UPLOAD_ROOT??'/workspace/uploads'),exports:resolve(process.env.AVE_EXPORT_ROOT??'/workspace/exports')};
const renderer=resolve(dirname(fileURLToPath(import.meta.url)),'../../desktop/src/renderer');
const clients=new Map<string,Client>(); let sequence=0;
const externalPort=process.env.AVE_BROWSER_PORT??'6080';
export function allowedRequest(host:string|undefined,origin:string|undefined,mutation:boolean):boolean {
 const hosts=new Set([`localhost:${externalPort}`,`127.0.0.1:${externalPort}`,'localhost:8080','127.0.0.1:8080']);
 return !!host&&hosts.has(host)&&(!origin||origin===`http://${host}`)&&(!mutation||origin===`http://${host}`);
}
function send(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function json(req:IncomingMessage){let bytes=0;const chunks:Buffer[]=[];for await(const chunk of req){bytes+=chunk.length;if(bytes>16*1024*1024)throw new Error('request body limit exceeded');chunks.push(Buffer.from(chunk));}return JSON.parse(Buffer.concat(chunks).toString());}
const inside=(root:string,path:string)=>path===root||path.startsWith(root+sep);
const cookie=(req:IncomingMessage)=>String(req.headers.cookie??'').split(';').map(v=>v.trim()).find(v=>v.startsWith('ave_session='))?.slice(12);
function publish(client:Client,channel:string,payload:unknown){client.events?.write(`data: ${JSON.stringify(encode({channel,payload}))}\n\n`);}
export async function startBrowserHost(port=8080){
 await Promise.all(Object.values(roots).map(p=>mkdir(p,{recursive:true})));
 const context=await createHostContext(resolve(process.env.AVE_PROFILE_ROOT??'/config/ave/profile/creator-profile'));
 const find=(id:number)=>{const c=[...clients.values()].find(c=>c.id===id);if(!c)throw new Error('Browser session missing');return c;};
 const cleanupUpload=async(client:Client,record:UploadRecord,unregistered=false)=>{
  if(!inside(roots.uploads,record.path))throw new Error('Upload cleanup path is outside its owned root');
  if(!unregistered){
   // An unavailable/other project cannot establish that an Original is unreferenced.
   if(context.sessions.activeProjectId()!==record.project_id)return;
   if((context.host.listMedia() as Array<{location_ref:string}>).some(location=>location.location_ref===record.path))return;
   const batch=context.host.listMediaImportBatches().find(batch=>batch.batch_id===record.batch_id),item=batch?.items.find(item=>item.item_id===record.item_id);
   if(!item||!['failed','cancelled'].includes(item.status))return;
  }
  try{await unlink(record.path);}catch(cause){if((cause as NodeJS.ErrnoException).code!=='ENOENT')throw cause;}
  try{await rmdir(dirname(record.path));}catch(cause){if(!['ENOENT','ENOTEMPTY'].includes((cause as NodeJS.ErrnoException).code??''))throw cause;}
  client.uploads.delete(record.id);client.uploadRecords.delete(record.id);
  if(!unregistered)context.host.discardFailedMediaImportSource(record.batch_id,record.item_id);
 };
 const cleanupBatch=async(client:Client,batchId:string)=>{for(const record of [...client.uploadRecords.values()])if(record.batch_id===batchId)await cleanupUpload(client,record);};
 const cleanupPersistedUploads=async()=>{
  if(!context.sessions.activeProjectId())return;
  for(const source of context.host.listMediaImportCleanupCandidates()){
   if(!inside(roots.uploads,source.path))continue;
   try{if(!inside(await realpath(roots.uploads),await realpath(dirname(source.path))))throw new Error('Persisted upload cleanup escapes its owned root');}
   catch(cause){if((cause as NodeJS.ErrnoException).code!=='ENOENT')throw cause;}
   if(context.sessions.activeProjectId()!==source.project_id)return;
   if(!context.host.listMediaImportCleanupCandidates().some(current=>current.source_ref_id===source.source_ref_id))continue;
   try{await unlink(source.path);}catch(cause){if((cause as NodeJS.ErrnoException).code!=='ENOENT')throw cause;}
   try{await rmdir(dirname(source.path));}catch(cause){if(!['ENOENT','ENOTEMPTY'].includes((cause as NodeJS.ErrnoException).code??''))throw cause;}
   if(context.sessions.activeProjectId()===source.project_id){const current=context.host.listMediaImportBatches().find(batch=>batch.batch_id===source.batch_id)?.items.find(item=>item.item_id===source.item_id);if(current?.source_ref_id===source.source_ref_id)context.host.discardFailedMediaImportSource(source.batch_id,source.item_id);}
  }
 };
 const ask=async(client:Client,operation:DesktopOperation,kind:string,options:unknown,choices?:Map<string,string>)=>{
  const id=randomUUID();
  return context.sessions.waitForDialog(operation,()=>new Promise<DialogAnswer>((accept,reject)=>{
   const stop=()=>{publish(client,'browser.dialog-close',{id});client.pending.get(id)?.reject(operation.signal.reason);};
   operation.signal.addEventListener('abort',stop,{once:true});
   const clear=()=>operation.signal.removeEventListener('abort',stop);
   const retry=(options as {retry_batch_id?:string}).retry_batch_id;
   const pending:PendingDialog={choices,kind,operation,project_id:context.sessions.activeProjectId(),retry_batch_id:retry,settling:false,resolve:value=>{
    if(pending.settling)return;pending.settling=true;
    void (async()=>{if(value.cancel&&pending.batch_id){context.host.cancelMediaImportBatch(pending.batch_id);for(const slot of pending.slots?.values()??[])slot.controller?.abort(new Error('Upload cancelled'));await Promise.allSettled([...(pending.slots?.values()??[])].map(slot=>slot.completion));await cleanupBatch(client,pending.batch_id);}return {...value,...(pending.batch_id?{batch_id:pending.batch_id}:{})};})().then(value=>{clear();client.pending.delete(id);accept(value);},error=>{clear();client.pending.delete(id);reject(error);});
   },reject:error=>{
    if(pending.settling)return;pending.settling=true;
    void (async()=>{if(pending.batch_id&&context.sessions.activeProjectId()===pending.project_id){context.host.cancelMediaImportBatch(pending.batch_id);for(const slot of pending.slots?.values()??[])slot.controller?.abort(error);await Promise.allSettled([...(pending.slots?.values()??[])].map(slot=>slot.completion));await cleanupBatch(client,pending.batch_id);}})().then(()=>{clear();client.pending.delete(id);reject(error);},cleanup=>{clear();client.pending.delete(id);reject(new AggregateError([error,cleanup],'Upload cancellation cleanup failed',{cause:error}));});
   }};
   client.pending.set(id,pending);
   publish(client,'browser.dialog',{id,kind,options});
  }));
 };
 const dialogs:RequestDialogs={
  open:async(_context,event,operation,options)=>{
   const client=find(event.sender.id);
   if(options.properties?.includes('openDirectory')){
    const choices=new Map<string,string>(); const items:{id:string;name:string}[]=[];
    for(const entry of (await context.recents.list()).items) {
     const recent=await context.recents.lookup(entry.id);
     if(!inside(roots.projects,resolve(recent.path)))continue;
     const id=randomUUID();choices.set(id,recent.path);items.push({id,name:entry.display_name});
    }
    const create=options.properties.includes('createDirectory');
    const answer=await ask(client,operation,'project',{create,items},choices);
    if(answer.cancel)return {canceled:true,filePaths:[]};
    if(create){if(typeof answer.name!=='string'||!answer.name.trim()||answer.name.length>120)throw new DesktopLifecycleError('DESKTOP_PROJECT_NAME_INVALID','作品名称无效'); const label=answer.name.trim().replace(/[^\p{L}\p{N}_ -]/gu,'_');return {canceled:false,filePaths:[resolve(roots.projects,`${label}-${randomUUID().slice(0,8)}`)]};}
    const path=choices.get(answer.choice??'');if(!path||!inside(await realpath(roots.projects),await realpath(path)))throw new Error('Invalid project selection');return {canceled:false,filePaths:[path]};
   }
   const retry=(options as typeof options&{aveImport?:{retry_batch_id:string;names:string[]}}).aveImport;
   const answer=await ask(client,operation,'files',{multiple:options.properties?.includes('multiSelections')??false,...(retry?{retry_batch_id:retry.retry_batch_id,names:retry.names}:{})});
   if(answer.cancel)return {canceled:true,filePaths:[],...(answer.batch_id?{batch_id:answer.batch_id}:{})};
   if(!answer.batch_id||!Array.isArray(answer.uploads)||new Set(answer.uploads).size!==answer.uploads.length)throw new Error('Invalid uploaded file selection');
   const batch=context.host.listMediaImportBatches().find(batch=>batch.batch_id===answer.batch_id);if(!batch||batch.project_id!==context.sessions.activeProjectId())throw new Error('Upload batch is stale');
   for(const id of answer.uploads){const record=client.uploadRecords.get(id);if(!record||record.batch_id!==answer.batch_id||record.project_id!==batch.project_id)throw new Error('Upload is not owned by this batch');}
   const paths=answer.uploads.map(id=>{const path=client.uploads.get(id);if(!path)throw new Error('Upload is not owned by this session');return path;});
   return {canceled:false,filePaths:paths,batch_id:answer.batch_id};
  },
  save:async(_context,event,operation,options)=>{
   const client=find(event.sender.id),answer=await ask(client,operation,'save',{name:options.defaultPath});
   if(answer.cancel)return {canceled:true};
   const owned=invocation.getStore();if(!owned)throw new Error('Export requires an owning invocation');
   const id=randomUUID(),path=resolve(roots.exports,`${id}.mp4`);client.downloads.set(id,{path,name:options.defaultPath,ready:false});owned.push(id);return {canceled:false,filePath:path};
  },
  confirm:async(event,operation,options)=>{const answer=await ask(find(event.sender.id),operation,'confirm',options);if(answer.response!==0&&answer.response!==1)throw new Error('Explicit confirmation required');return {response:answer.response};}
 };
 const dispatch=createRequestDispatcher(context,dialogs);
 const server=createServer(async(req,res)=>{
  try{
   const mutation=req.method!=='GET'&&req.method!=='HEAD';
   if(!allowedRequest(req.headers.host,req.headers.origin,mutation)){send(res,403,{error:'Untrusted browser origin'});return;}
   const url=new URL(req.url??'/',`http://${req.headers.host}`);
   if(url.pathname==='/health'){send(res,context.sessions.acceptingRequests?200:503,{status:context.sessions.acceptingRequests?'ready':'stopping'});return;}
   if(url.pathname==='/api/session'&&req.method==='GET'){
    let client=clients.get(cookie(req)??'');
    for(const [token,entry] of clients)if(!entry.events&&Date.now()-entry.lastSeen>3600000)clients.delete(token);
    if(!client){if(clients.size>=32){send(res,429,{error:'浏览器会话已满，请关闭闲置窗口后重试'});return;}client={id:++sequence,token:randomBytes(32).toString('hex'),csrf:randomBytes(32).toString('hex'),lastSeen:Date.now(),uploads:new Map(),uploadRecords:new Map(),downloads:new Map(),pending:new Map()};clients.set(client.token,client);}
    client.lastSeen=Date.now();
    res.setHeader('Set-Cookie',`ave_session=${client.token}; HttpOnly; SameSite=Strict; Path=/`);send(res,200,{csrf:client.csrf});return;
   }
   if(url.pathname.startsWith('/api/')&&url.pathname!=='/api/project-api.js'){
    const client=clients.get(cookie(req)??'');if(!client||mutation&&req.headers['x-ave-csrf']!==client.csrf){send(res,403,{error:'Browser session required'});return;}
    client.lastSeen=Date.now();
    if(url.pathname.startsWith('/api/media-browse/')){
     const operation=context.sessions.capture(client.id,context.sessions.activeProjectId(),true);
     await context.sessions.run(operation,async()=>{
      const response=await context.host.mediaBrowseResponse(client.id,url.pathname.slice('/api/media-browse/'.length),req.method??'GET',req.headers.range,{signal:operation.signal,assertCurrent:()=>context.sessions.assertCurrent(operation)});
      res.writeHead(response.status,response.headers);if(response.body)await pipeline(response.body,res);else res.end();
     });return;
    }
    if(url.pathname==='/api/events'&&req.method==='GET'){
     client.events?.end(); client.events=res;
     if(!context.sessions.hasWindow(client.id))context.sessions.registerWindow({webContents:{id:client.id,send:(channel,payload)=>publish(client,channel,payload)}});
     res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write(': ready\n\n');
     const keep=setInterval(()=>res.write(': keepalive\n\n'),15000);
     res.on('close',()=>{clearInterval(keep);if(client.events===res){client.events=undefined;context.sessions.unregisterWindow(client.id);for(const pending of client.pending.values())pending.reject(new Error('Browser disconnected'));client.pending.clear();}});return;
    }
    if(url.pathname==='/api/dialog'&&req.method==='POST'){
     const input=await json(req),pending=client.pending.get(input.id);if(!pending)throw new Error('Dialog is stale or belongs to another browser');
     context.sessions.assertCurrent(pending.operation);
     if(!input.answer||typeof input.answer!=='object'||Array.isArray(input.answer)||Object.keys(input.answer).some(key=>!['response','choice','name','uploads','cancel','batch_id'].includes(key)))throw new Error('Invalid dialog answer');
     if(input.answer.batch_id!==undefined&&input.answer.batch_id!==pending.batch_id)throw new Error('Dialog batch identity mismatch');
     if(pending.kind==='files'&&!input.answer.cancel){
      if(!pending.batch_id||!pending.slots||[...pending.slots.values()].some(slot=>slot.controller)||!Array.isArray(input.answer.uploads)||new Set(input.answer.uploads).size!==input.answer.uploads.length)throw new Error('Uploads have not reached a selectable state');
      const expected=[...pending.slots.values()].flatMap(slot=>slot.upload_id?[slot.upload_id]:[]);
      if(expected.length!==input.answer.uploads.length||expected.some(id=>!input.answer.uploads.includes(id)))throw new Error('Incomplete uploaded file selection');
     }
     pending.resolve(input.answer);send(res,200,{ok:true});return;
    }
    if(url.pathname==='/api/upload-batch'&&req.method==='POST'){
     const input=await json(req),pending=client.pending.get(input.dialog_id);
     if(!pending||pending.kind!=='files'||pending.settling)throw new Error('Upload requires a current owned file dialog');
     context.sessions.assertCurrent(pending.operation);
     if(pending.project_id!==context.sessions.activeProjectId())throw new Error('Upload project changed');
     if(Object.keys(input).some(key=>!['dialog_id','files'].includes(key))||!Array.isArray(input.files)||!input.files.length||input.files.length>10000||input.files.some((file:any)=>!file||Object.keys(file).sort().join(',')!=='bytes,name'||typeof file.name!=='string'||!file.name||file.name.length>1024||/[\\/\x00-\x1f]/.test(file.name)||!Number.isSafeInteger(file.bytes)||file.bytes<0))throw new Error('Invalid upload descriptors');
     if(pending.slots){const expected=[...pending.slots.values()];if(expected.length!==input.files.length||expected.some((slot,index)=>slot.name!==input.files[index].name||slot.bytes!==input.files[index].bytes))throw new Error('Upload selection changed');}
     else{
      const names=input.files.map((file:{name:string})=>file.name);
      const batch=pending.retry_batch_id?context.host.prepareMediaImportRetry(pending.retry_batch_id,names):context.host.createMediaImportBatch(names,{actor_id:'local-user',idempotency_key:`browser-dialog:${input.dialog_id}`},'uploading');
      pending.batch_id=batch.batch_id;const items=batch.items.filter(item=>item.status==='uploading');
      pending.slots=new Map(items.map((item,index)=>[item.item_id,{item_id:item.item_id,name:input.files[index].name,bytes:input.files[index].bytes}]));
     }
     send(res,200,{batch_id:pending.batch_id,batch:context.host.listMediaImportBatches().find(batch=>batch.batch_id===pending.batch_id),items:[...pending.slots.values()].map(slot=>({item_id:slot.item_id,name:slot.name,bytes:slot.bytes}))});return;
    }
    if(url.pathname==='/api/upload'&&req.method==='POST'){
     if(!context.sessions.hasWindow(client.id))throw new Error('Browser disconnected');
     const dialogId=String(req.headers['x-ave-dialog']??''),batchId=String(req.headers['x-ave-batch']??''),itemId=String(req.headers['x-ave-item']??'');
     const pending=client.pending.get(dialogId),slot=pending?.slots?.get(itemId);
     if(!pending||pending.kind!=='files'||pending.settling||pending.batch_id!==batchId||!slot)throw new Error('Upload is not admitted by this project batch and dialog');
     context.sessions.assertCurrent(pending.operation);if(pending.project_id!==context.sessions.activeProjectId())throw new Error('Upload project changed');
     const batch=context.host.listMediaImportBatches().find(batch=>batch.batch_id===batchId),item=batch?.items.find(item=>item.item_id===itemId);
     if(!item||batch?.status!=='active'||item.status!=='uploading'||slot.controller||slot.upload_id)throw new Error('Upload item is stale or already in progress');
     const original=decodeURIComponent(String(req.headers['x-ave-filename']??''));const extension=extname(original).toLowerCase();
     const controller=new AbortController();const abortUpload=()=>controller.abort(pending.operation.signal.reason);pending.operation.signal.addEventListener('abort',abortUpload,{once:true});if(pending.operation.signal.aborted)abortUpload();slot.controller=controller;let finish!:()=>void;slot.completion=new Promise<void>(accept=>{finish=accept;});
     const reservation=`${client.id}:${batchId}:${itemId}`,id=randomUUID(),folder=resolve(roots.uploads,client.token,id),path=resolve(folder,slot.name);
     const record:UploadRecord={id,path,project_id:pending.project_id,batch_id:batchId,item_id:itemId};let allocated=false,bound=false;
     try{
      if(original!==slot.name||basename(original)!==original)throw new Error('MEDIA_UPLOAD_NAME_MISMATCH');
      if(!MEDIA_EXTENSIONS.includes(extension.slice(1)))throw new Error('MEDIA_UPLOAD_TYPE_UNSUPPORTED');
      if(slot.bytes>10*1024**3)throw new Error('MEDIA_UPLOAD_TOO_LARGE: 每项上限10 GiB');
      const expectedLength=Number(req.headers['content-length']);if(!Number.isSafeInteger(expectedLength)||expectedLength!==slot.bytes)throw new Error('MEDIA_UPLOAD_LENGTH_INVALID');
      const space=await statfs(roots.uploads,{bigint:true});context.sessions.assertCurrent(pending.operation);
      const reserved=[...uploadReservations.values()].reduce((total,bytes)=>total+BigInt(bytes),0n);
      if(space.bavail*space.bsize-reserved<BigInt(slot.bytes)+16n*1024n*1024n)throw Object.assign(new Error('上传磁盘空间不足，请释放空间后重试'),{code:'ENOSPC'});
      uploadReservations.set(reservation,slot.bytes);await mkdir(folder,{recursive:true});allocated=true;
      if(!inside(await realpath(roots.uploads),await realpath(folder)))throw new Error('Upload folder escapes its owned root');
      context.sessions.assertCurrent(pending.operation);
      context.host.reserveMediaImportSource(batchId,itemId,path);
      let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>slot.bytes)controller.abort(new Error('MEDIA_UPLOAD_LENGTH_INVALID'));});
      await pipeline(req,createWriteStream(path,{flags:'wx',mode:0o600}),{signal:controller.signal});
      context.sessions.assertCurrent(pending.operation);if(pending.settling||controller.signal.aborted)throw controller.signal.reason??new Error('Upload cancelled');
      if(size!==slot.bytes)throw new Error('MEDIA_UPLOAD_LENGTH_INVALID');
      context.host.bindMediaImportSource(batchId,itemId,path);bound=true;client.uploads.set(id,path);client.uploadRecords.set(id,record);slot.upload_id=id;
      send(res,200,{id,name:slot.name,size,status:'waiting',batch_id:batchId,item_id:itemId});return;
     }catch(error){
      const failures:unknown[]=[];
      if(allocated&&!bound)try{await cleanupUpload(client,record,true);}catch(cleanup){failures.push(cleanup);}
      try{if(context.sessions.activeProjectId()===pending.project_id){const current=context.host.listMediaImportBatches().find(batch=>batch.batch_id===batchId);if(current?.items.find(item=>item.item_id===itemId)?.status==='uploading')context.host.failMediaImportUpload(batchId,itemId,error);}}catch(audit){failures.push(audit);}
      if(failures.length)throw new AggregateError([error,...failures],'Upload, cleanup or failure record failed',{cause:error});throw error;
     }finally{pending.operation.signal.removeEventListener('abort',abortUpload);uploadReservations.delete(reservation);slot.controller=undefined;finish();}
    }
    if(url.pathname==='/api/invoke'&&req.method==='POST'){
     const {channel,request}=await json(req);if(typeof channel!=='string')throw new Error('Invalid request channel');
     const owned:string[]=[];const result=await invocation.run(owned,()=>dispatch(channel,{sender:{id:client.id}},decode(request)));
     if(channel==='project.query'&&request?.query_type==='project.media.browse'&&(result as any).ok){const data=(result as any).data;data.url=`/api/media-browse/${data.reference}`;}
     if(channel==='project.command')await cleanupPersistedUploads();
     if(channel==='project.command'&&['project.media.import','project.media.import.retry','project.media.import.cancel'].includes(request?.command_type)){
      for(const record of [...client.uploadRecords.values()])await cleanupUpload(client,record);
      const response=result as {ok?:boolean;data?:{batch?:{batch_id:string}}};
      if(response.ok&&response.data?.batch)response.data.batch=context.host.listMediaImportBatches().find(batch=>batch.batch_id===response.data!.batch!.batch_id);
     }
     const downloads=[];for(const id of owned){const item=client.downloads.get(id);if(!item)continue;if((result as any).ok){item.ready=true;downloads.push({url:`/api/download/${id}`,name:item.name});
      if((result as any).data?.audio_credits?.items.length)for(const suffix of ['.audio.json','.credits.txt']){const extra=randomUUID();client.downloads.set(extra,{path:item.path+suffix,name:item.name+suffix,ready:true});downloads.push({url:`/api/download/${extra}`,name:item.name+suffix});}}else client.downloads.delete(id);}
     send(res,200,{result:encode(result),downloads});return;
    }
    if(url.pathname.startsWith('/api/download/')&&req.method==='GET'){
     const item=client.downloads.get(url.pathname.slice('/api/download/'.length));if(!item?.ready){send(res,404,{error:'Download not found'});return;}
     const info=await stat(item.path);res.writeHead(200,{'Content-Type':item.name.endsWith('.json')?'application/json':item.name.endsWith('.txt')?'text/plain; charset=utf-8':'video/mp4','Content-Length':info.size,'Content-Disposition':`attachment; filename="${item.name.replace(/[^a-zA-Z0-9_.-]/g,'_')}"`,'Cache-Control':'no-store'});await pipeline(createReadStream(item.path),res);return;
    }
    send(res,404,{error:'Unknown endpoint'});return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){send(res,405,{error:'Method not allowed'});return;}
   let target=resolve(renderer,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(url.pathname==='/browser/wire.js')target=resolve(dirname(fileURLToPath(import.meta.url)),'wire.js');
   else if(!inside(renderer,target)){send(res,403,{error:'Path denied'});return;}
   const allowedRoot=url.pathname==='/browser/wire.js'?dirname(fileURLToPath(import.meta.url)):renderer;
   if(!inside(await realpath(allowedRoot),await realpath(target))){send(res,403,{error:'Path denied'});return;}
   const mime:Record<string,string>={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
   if(!mime[extname(target)]){send(res,404,{error:'Not found'});return;}
   let content=await readFile(target);if(target===resolve(renderer,'index.html'))content=Buffer.from(content.toString().replace('src="/app/main.js"','src="/browser/entry.js"'));
   res.writeHead(200,{'Content-Type':mime[extname(target)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(content);
  }catch(error){console.error('AVE browser request failed',error);if(!res.headersSent)send(res,(error as NodeJS.ErrnoException).code==='ENOENT'?404:400,{error:'请求未完成，具体原因已保留在服务日志中'});else res.destroy(error instanceof Error?error:undefined);}
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'0.0.0.0',resolve);});
 async function close(){
  // A missing/failed acknowledgement must leave the project and HTTP/SSE live.
  // Closing first would make a save failure unrecoverable in the same workbench.
  try{await context.sessions.flushCreationInputs();}catch(error){
   console.error('Browser input flush failed; shutdown cancelled and Host remains open',error);
   const code=error instanceof DesktopLifecycleError?error.code:'DESKTOP_INPUT_SAVE_FAILED';
   for(const client of clients.values())publish(client,'project.event',{event_type:'app.shutdown.failed',project_id:context.sessions.activeProjectId()||'not-open',payload:{code,message:'关闭已停止：尚未确认工作台输入保存。请保留页面，检查保存错误或连接，保存后重试关闭。'}});
   throw error;
  }
  for(const client of clients.values()){client.events?.end();context.sessions.unregisterWindow(client.id);for(const pending of client.pending.values())pending.reject(new Error('Server stopping'));}
  await context.sessions.shutdown();
  // Host has flushed inputs and drained productive work. Remaining HTTP/SSE
  // sockets belong to this stopped application, and cannot keep shutdown alive.
  await new Promise<void>((accept,reject)=>{server.close(error=>error?reject(error):accept());server.closeAllConnections();});clients.clear();
 }
 return {server,context,close};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const host=await startBrowserHost();console.log('AVE direct browser Host ready on :8080');
 let closing=false;
 for(const signal of ['SIGTERM','SIGINT'] as const)process.on(signal,()=>{
  if(closing)return;closing=true;
  void host.close().then(()=>process.exit(0),error=>{closing=false;console.error('AVE Host shutdown cancelled; save input and retry',error);});
 });
}
