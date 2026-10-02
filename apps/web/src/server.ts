import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir, readFile, realpath, stat, unlink } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { basename, dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHostContext } from '../../desktop/src/main/host-context.js';
import { createRequestDispatcher, type RequestDialogs } from '../../desktop/src/main/ipc/request-dispatcher.js';
import { DesktopLifecycleError, type DesktopOperation } from '../../desktop/src/main/project-session-manager.js';
import { encode, decode } from './wire.js';

type DialogAnswer={response?:number;choice?:string;name?:string;uploads?:string[];cancel?:boolean};
type Client={id:number;token:string;csrf:string;lastSeen:number;events?:ServerResponse;uploads:Map<string,string>;downloads:Map<string,{path:string;name:string;ready:boolean}>;pending:Map<string,{resolve:(value:DialogAnswer)=>void;reject:(error:unknown)=>void;choices?:Map<string,string>}>};
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
 const ask=async(client:Client,operation:DesktopOperation,kind:string,options:unknown,choices?:Map<string,string>)=>{
  const id=randomUUID();
  return context.sessions.waitForDialog(operation,()=>new Promise<DialogAnswer>((accept,reject)=>{
   const stop=()=>{client.pending.delete(id);publish(client,'browser.dialog-close',{id});reject(operation.signal.reason);};
   operation.signal.addEventListener('abort',stop,{once:true});
   const clear=()=>operation.signal.removeEventListener('abort',stop);
   client.pending.set(id,{resolve:value=>{clear();client.pending.delete(id);accept(value);},reject:error=>{clear();client.pending.delete(id);reject(error);},choices});
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
   const answer=await ask(client,operation,'files',{multiple:options.properties?.includes('multiSelections')??false});
   if(answer.cancel)return {canceled:true,filePaths:[]};
   if(!Array.isArray(answer.uploads)||!answer.uploads.length||new Set(answer.uploads).size!==answer.uploads.length)throw new Error('Invalid uploaded file selection');
   const paths=answer.uploads.map(id=>{const path=client.uploads.get(id);if(!path)throw new Error('Upload is not owned by this session');return path;});
   return {canceled:false,filePaths:paths};
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
    if(!client){if(clients.size>=32){send(res,429,{error:'浏览器会话已满，请关闭闲置窗口后重试'});return;}client={id:++sequence,token:randomBytes(32).toString('hex'),csrf:randomBytes(32).toString('hex'),lastSeen:Date.now(),uploads:new Map(),downloads:new Map(),pending:new Map()};clients.set(client.token,client);}
    client.lastSeen=Date.now();
    res.setHeader('Set-Cookie',`ave_session=${client.token}; HttpOnly; SameSite=Strict; Path=/`);send(res,200,{csrf:client.csrf});return;
   }
   if(url.pathname.startsWith('/api/')&&url.pathname!=='/api/project-api.js'){
    const client=clients.get(cookie(req)??'');if(!client||mutation&&req.headers['x-ave-csrf']!==client.csrf){send(res,403,{error:'Browser session required'});return;}
    client.lastSeen=Date.now();
    if(url.pathname==='/api/events'&&req.method==='GET'){
     client.events?.end(); client.events=res;
     if(!context.sessions.hasWindow(client.id))context.sessions.registerWindow({webContents:{id:client.id,send:(channel,payload)=>publish(client,channel,payload)}});
     res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write(': ready\n\n');
     const keep=setInterval(()=>res.write(': keepalive\n\n'),15000);
     res.on('close',()=>{clearInterval(keep);if(client.events===res){client.events=undefined;context.sessions.unregisterWindow(client.id);for(const pending of client.pending.values())pending.reject(new Error('Browser disconnected'));client.pending.clear();}});return;
    }
    if(url.pathname==='/api/dialog'&&req.method==='POST'){
     const input=await json(req),pending=client.pending.get(input.id);if(!pending)throw new Error('Dialog is stale or belongs to another browser');
     if(!input.answer||typeof input.answer!=='object'||Array.isArray(input.answer)||Object.keys(input.answer).some(key=>!['response','choice','name','uploads','cancel'].includes(key)))throw new Error('Invalid dialog answer');
     pending.resolve(input.answer);send(res,200,{ok:true});return;
    }
    if(url.pathname==='/api/upload'&&req.method==='POST'){
     if(!context.sessions.hasWindow(client.id))throw new Error('Browser disconnected');
     const original=decodeURIComponent(String(req.headers['x-ave-filename']??''));const extension=extname(original).toLowerCase();
     if(!['.mp4','.mov','.m4v','.webm','.wav','.mp3','.m4a','.flac'].includes(extension))throw new Error('Unsupported media type');
     const id=randomUUID(),folder=resolve(roots.uploads,client.token,id);await mkdir(folder,{recursive:true});
     const label=basename(original.replaceAll('\\','/')).replace(/[\x00-\x1f]/g,'_');if(!label||label.length>240)throw new Error('Invalid media filename');const path=resolve(folder,label);
     let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>10*1024**3)req.destroy(new Error('Upload exceeds 10 GiB'));});
     try{await pipeline(req,createWriteStream(path,{flags:'wx',mode:0o600}));}catch(error){await unlink(path).catch(cleanup=>{if(cleanup.code!=='ENOENT')throw new AggregateError([error,cleanup],'Upload and cleanup failed');});throw error;}
     client.uploads.set(id,path);send(res,200,{id,name:basename(original),size});return;
    }
    if(url.pathname==='/api/invoke'&&req.method==='POST'){
     const {channel,request}=await json(req);if(typeof channel!=='string')throw new Error('Invalid request channel');
     const owned:string[]=[];const result=await invocation.run(owned,()=>dispatch(channel,{sender:{id:client.id}},decode(request)));
     const downloads=[];for(const id of owned){const item=client.downloads.get(id);if(!item)continue;if((result as any).ok){item.ready=true;downloads.push({url:`/api/download/${id}`,name:item.name});}else client.downloads.delete(id);}
     send(res,200,{result:encode(result),downloads});return;
    }
    if(url.pathname.startsWith('/api/download/')&&req.method==='GET'){
     const item=client.downloads.get(url.pathname.slice('/api/download/'.length));if(!item?.ready){send(res,404,{error:'Download not found'});return;}
     const info=await stat(item.path);res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':info.size,'Content-Disposition':`attachment; filename="${item.name.replace(/[^a-zA-Z0-9_.-]/g,'_')}"`,'Cache-Control':'no-store'});await pipeline(createReadStream(item.path),res);return;
    }
    send(res,404,{error:'Unknown endpoint'});return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){send(res,405,{error:'Method not allowed'});return;}
   let target=resolve(renderer,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(url.pathname==='/browser/wire.js')target=resolve(dirname(fileURLToPath(import.meta.url)),'wire.js');
   else if(!inside(renderer,target)){send(res,403,{error:'Path denied'});return;}
   const allowedRoot=url.pathname==='/browser/wire.js'?dirname(fileURLToPath(import.meta.url)):renderer;
   if(!inside(allowedRoot,await realpath(target))){send(res,403,{error:'Path denied'});return;}
   const mime:Record<string,string>={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
   if(!mime[extname(target)]){send(res,404,{error:'Not found'});return;}
   let content=await readFile(target);if(target===resolve(renderer,'index.html'))content=Buffer.from(content.toString().replace('src="/app/main.js"','src="/browser/entry.js"'));
   res.writeHead(200,{'Content-Type':mime[extname(target)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'"});res.end(content);
  }catch(error){console.error('AVE browser request failed',error);if(!res.headersSent)send(res,(error as NodeJS.ErrnoException).code==='ENOENT'?404:400,{error:'请求未完成，具体原因已保留在服务日志中'});else res.destroy(error instanceof Error?error:undefined);}
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'0.0.0.0',resolve);});
 async function close(){
  let flushError:unknown;try{await context.sessions.flushCreationInputs();}catch(error){flushError=error;console.error('Browser input flush failed during shutdown',error);}
  for(const client of clients.values()){client.events?.end();context.sessions.unregisterWindow(client.id);for(const pending of client.pending.values())pending.reject(new Error('Server stopping'));}
  await context.sessions.shutdown();await new Promise<void>((accept,reject)=>server.close(error=>error?reject(error):accept()));clients.clear();
  if(flushError)throw flushError;
 }
 return {server,context,close};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const host=await startBrowserHost();console.log('AVE direct browser Host ready on :8080');
 for(const signal of ['SIGTERM','SIGINT'] as const)process.once(signal,()=>{void host.close().then(()=>process.exit(0),error=>{console.error('AVE Host shutdown failed',error);process.exit(1);});});
}
