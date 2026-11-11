import assert from 'node:assert/strict';
import { mkdtemp, open, readFile, readdir, rename, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { encode, decode } from '../../apps/web/src/wire.js';
import { RenderPreviewSession } from '../../packages/platform/project-host/src/media-browse.js';

assert.deepEqual(decode(encode({time:2345678901234567890n,bytes:new Uint8Array([0,128,255]),nested:[-8n]})),{time:2345678901234567890n,bytes:new Uint8Array([0,128,255]),nested:[-8n]});
assert.throws(()=>decode({$ave:'bigint',value:'broken'}));
const directory=await mkdtemp(resolve(tmpdir(),'ave-web-'));
{
 const previewPath=resolve(directory,'preview-stream.mp4'), previewBytes=Buffer.alloc(1024*1024,31), previewHash=createHash('sha256').update(previewBytes).digest('hex');
 await writeFile(previewPath,previewBytes);
 const streams=new RenderPreviewSession(),abort=new AbortController();let authorized=true;
 const control={signal:abort.signal,assertCurrent(){if(abort.signal.aborted)throw abort.signal.reason;}}, validate=()=>{if(!authorized)throw new Error('AUTH_REVOKED');return {path:previewPath,digest:previewHash,timeline_version:1};};
 const ref=await streams.prepare(7,validate,control);
 await assert.rejects(streams.response(8,ref.reference,'GET',undefined,control),/PREVIEW_REFERENCE_EXPIRED/);
 const slice=await streams.response(7,ref.reference,'GET','bytes=7-29',control),chunks:Buffer[]=[];
 assert.equal(slice.status,206);for await(const chunk of slice.body!)chunks.push(Buffer.from(chunk));assert.deepEqual(Buffer.concat(chunks),previewBytes.subarray(7,30));
 const ongoing=await streams.response(7,ref.reference,'GET',undefined,control);const iterator=ongoing.body![Symbol.asyncIterator]();assert.ok((await iterator.next()).value);authorized=false;
 await assert.rejects(async()=>{for await(const _ of ongoing.body!){}},/AUTH_REVOKED/);
 authorized=true;await writeFile(previewPath,Buffer.from('changed'));
 await assert.rejects(streams.response(7,ref.reference,'GET',undefined,control),/PREVIEW_OUTPUT_CHANGED/);
 await writeFile(previewPath,previewBytes);
 const changedDuringRead=await streams.response(7,ref.reference,'GET',undefined,control);
 const changingIterator=changedDuringRead.body![Symbol.asyncIterator]();assert.ok((await changingIterator.next()).value);
 await writeFile(previewPath,Buffer.from('changed during read'));
 await assert.rejects(async()=>{for await(const _ of changedDuringRead.body!){}},/PREVIEW_OUTPUT_CHANGED/);
 await streams.releaseOwner(7);await assert.rejects(streams.response(7,ref.reference,'GET',undefined,control),/PREVIEW_REFERENCE_EXPIRED/);
 await streams.close();
}
const previous={...process.env};
Object.assign(process.env,{AVE_BROWSER_PORT:'6089',AVE_PROJECT_ROOT:resolve(directory,'projects'),AVE_UPLOAD_ROOT:resolve(directory,'uploads'),AVE_EXPORT_ROOT:resolve(directory,'exports'),AVE_PROFILE_ROOT:resolve(directory,'profile/creator-profile'),AVE_MODEL_CONFIG:resolve(directory,'model.json')});
await writeFile(process.env.AVE_MODEL_CONFIG!,JSON.stringify({version:1,enabled:false}));
const {startBrowserHost,allowedRequest}=await import('../../apps/web/src/server.js');
assert.equal(allowedRequest('localhost:6080','http://evil.example',true),false);
assert.equal(allowedRequest('evil.example:6080',undefined,false),false);
assert.equal(allowedRequest('localhost:6080',undefined,true),false);
const host=await startBrowserHost(6089),address=host.server.address();
assert.ok(address&&typeof address==='object');
const base=`http://127.0.0.1:${address.port}`;
const headers={Host:'127.0.0.1:6089',Origin:'http://127.0.0.1:6089'};
let cookie='',csrf='',closed=false;
const controller=new AbortController();
async function request(path:string,body?:unknown,extra:Record<string,string>={}) {
 return fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...headers,Cookie:cookie,'X-AVE-CSRF':csrf,'Content-Type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
}
try {
 const badHost=await new Promise<number>(accept=>{const req=httpRequest(base+'/',{headers:{Host:'evil.example'}},response=>{response.resume();accept(response.statusCode!);});req.end();});assert.equal(badHost,403);
 const page=await request('/');assert.match(await page.text(),/\/browser\/entry.js/);assert.match(page.headers.get('content-security-policy')??'',/frame-ancestors 'none'/);
 const apiModule=await request('/api/project-api.js');assert.equal(apiModule.status,200);assert.match(await apiModule.text(),/export function command/);
 assert.equal((await request('/browser/../../main/host-context.js')).status,404);
 const session=await request('/api/session');cookie=session.headers.get('set-cookie')!.split(';')[0];csrf=(await session.json()).csrf;
 const query={channel:'project.query',request:{api_version:1,query_type:'app.status',project_id:'',payload:{}}};
 assert.equal((await request('/api/invoke',query,{'X-AVE-CSRF':'wrong'})).status,403);
 assert.equal((await request('/api/invoke',query,{Origin:'http://evil.example'})).status,403);
 const disconnected=await (await request('/api/invoke',query)).json();assert.equal(disconnected.result.ok,false);
 let events=await fetch(base+'/api/events',{headers:{...headers,Cookie:cookie},signal:controller.signal});
 let reader=events.body!.getReader();await reader.read();
 assert.equal((await (await request('/api/invoke',query)).json()).result.ok,true);
 let buffer='';
 async function eventFor(channel:string){for(;;){const frameEnd=buffer.indexOf('\n\n');if(frameEnd>=0){const frame=buffer.slice(0,frameEnd);buffer=buffer.slice(frameEnd+2);if(frame.startsWith('data: ')){const event=decode(JSON.parse(frame.slice(6)));if(event.channel===channel)return event.payload;}continue;}const chunk=await reader.read();if(chunk.done)throw new Error('event stream closed');buffer+=new TextDecoder().decode(chunk.value);}}
 const dialog=()=>eventFor('browser.dialog');
 const command=(type:string,project='',payload?:unknown)=>({channel:'project.command',request:{api_version:1,command_type:type,command_id:randomUUID(),idempotency_key:randomUUID(),project_id:project,payload}});
 const interrupted=request('/api/invoke',command('project.create'));
 const oldDialog=await dialog();assert.equal(oldDialog.kind,'project');
 const oldReader=reader;
 events=await fetch(base+'/api/events',{headers:{...headers,Cookie:cookie},signal:controller.signal});reader=events.body!.getReader();await reader.read();buffer='';
 let deadline:ReturnType<typeof setTimeout>|undefined;
 try {
  const cancelled=await Promise.race([interrupted.then(async response=>decode((await response.json()).result)),new Promise<never>((_,reject)=>{deadline=setTimeout(()=>reject(new Error('REPLACED_STREAM_OPERATION_NOT_CANCELLED')),1500);})]);
  assert.equal(cancelled.ok,false,'replacing a stream cancels the old window operation');
  assert.equal((await request('/api/dialog',{id:oldDialog.id,answer:{name:'stale'}})).status,400,'old confirmation cannot transfer to a new stream');
 } finally {clearTimeout(deadline);await oldReader.cancel().catch(()=>{});}
 const create=request('/api/invoke',command('project.create'));
 const selection=await dialog();assert.equal(selection.kind,'project');assert.equal(selection.options.create,true);
 const second=await fetch(base+'/api/session',{headers});const other=second.headers.get('set-cookie')!.split(';')[0],otherCsrf=(await second.json()).csrf;
 assert.equal((await request('/api/dialog',{id:selection.id,answer:{name:'wrong browser'}},{Cookie:other,'X-AVE-CSRF':otherCsrf})).status,400);
 assert.equal((await request('/api/dialog',{id:selection.id,answer:{name:'浏览器测试'}})).status,200);
 const created=decode((await (await create).json()).result);assert.equal(created.ok,true);assert.notEqual(created.data.project,'not-open');
 {
  const testHost=host.context.host as any, refDescriptor=Object.getOwnPropertyDescriptor(testHost,'prepareCreationPreview'), streamDescriptor=Object.getOwnPropertyDescriptor(testHost,'creationPreviewResponse');
  const previewPath=resolve(directory,'browser-render.mp4'), previewBytes=Buffer.from('browser preview source'), previewHash=createHash('sha256').update(previewBytes).digest('hex');await writeFile(previewPath,previewBytes);
  const streams=new RenderPreviewSession(); let authorized=true;
  const validate=()=>{if(!authorized)throw new Error('AUTH_REVOKED');return {path:previewPath,digest:previewHash,timeline_version:1};};
  testHost.prepareCreationPreview=(_credential:unknown,owner:number,_input:unknown,control:any)=>streams.prepare(owner,validate,control);
  testHost.creationPreviewResponse=(owner:number,token:string,method:string,range:string|undefined,control:any)=>streams.response(owner,token,method,range,control);
  try {
   const payload={channel:'project.query',request:{api_version:1,query_type:'project.creation.preview.ref',project_id:created.data.project,payload:{request_id:'request',draft_id:'draft',render_id:'render'}}};
   const legacy={...payload,request:{...payload.request,query_type:'project.creation.preview'}};
   assert.equal((await request('/api/invoke',legacy)).status,403,'Browser cannot invoke the legacy in-memory preview, even with its own authenticated session');
   const answer=decode((await (await request('/api/invoke',payload)).json()).result);assert.equal(answer.ok,true);assert.match(answer.data.url,/^\/api\/creation-preview\/[a-f0-9-]+$/);assert.equal(answer.data.output_hash,previewHash);assert.equal(JSON.stringify(answer).includes(previewPath),false);
   const response=await request(answer.data.url,undefined,{Range:'bytes=1-4'});assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes 1-4/${previewBytes.length}`);assert.deepEqual(Buffer.from(await response.arrayBuffer()),previewBytes.subarray(1,5));
   const noCookie=await fetch(base+answer.data.url,{headers});assert.equal(noCookie.status,403);
   authorized=false;assert.equal((await request(answer.data.url)).status,400);assert.equal((await request('/api/invoke',legacy)).status,403,'revocation cannot be bypassed with the old query');
  } finally {
   await streams.close();if(refDescriptor)Object.defineProperty(testHost,'prepareCreationPreview',refDescriptor);else delete testHost.prepareCreationPreview;
   if(streamDescriptor)Object.defineProperty(testHost,'creationPreviewResponse',streamDescriptor);else delete testHost.creationPreviewResponse;
  }
 }
 assert.equal((await request('/api/dialog',{id:selection.id,answer:{name:'replay'}})).status,400);
 const upload=await fetch(base+'/api/upload',{method:'POST',headers:{...headers,Cookie:cookie,'X-AVE-CSRF':csrf,'X-AVE-Filename':'../test.wav'},body:new Uint8Array([1,2,3])});
 assert.equal(upload.status,400,'Upload needs an admitted project-owned dialog and item');
 assert.equal((await fetch(base+'/api/upload',{method:'POST',headers:{...headers,Cookie:cookie,'X-AVE-CSRF':csrf,'X-AVE-Filename':'bad.exe'},body:'bad'})).status,400);
 const importing=request('/api/invoke',command('project.media.import',created.data.project));
 const files=await dialog();assert.equal(files.kind,'files');assert.equal((await request('/api/dialog',{id:files.id,answer:{uploads:['/etc/passwd']}})).status,400);
 const wave=Buffer.alloc(44+16000);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(8000,24);wave.writeUInt32LE(16000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(16000,40);
 const descriptors=[{name:'broken.png',bytes:3},{name:'valid.wav',bytes:wave.length}];
 const admission=await (await request('/api/upload-batch',{dialog_id:files.id,files:descriptors})).json();assert.equal(admission.batch.status,'active');
 assert.equal((await request('/api/upload-batch',{dialog_id:files.id,files:descriptors.map(file=>({bytes:file.bytes,name:file.name}))})).status,200,'Descriptor identity is independent of JSON key order');
 const sendUpload=(index:number,body:Uint8Array,extra:Record<string,string>={})=>fetch(base+'/api/upload',{method:'POST',headers:{...headers,Cookie:cookie,'X-AVE-CSRF':csrf,'X-AVE-Dialog':files.id,'X-AVE-Batch':admission.batch_id,'X-AVE-Item':admission.items[index].item_id,'X-AVE-Filename':encodeURIComponent(descriptors[index].name),...extra},body:Uint8Array.from(body).buffer});
 assert.equal((await sendUpload(0,new Uint8Array([1,2,3]),{Cookie:other,'X-AVE-CSRF':otherCsrf})).status,400,'Another session cannot use owned batch references');
 const badUpload=await (await sendUpload(0,new Uint8Array([1,2,3]))).json();const goodUpload=await (await sendUpload(1,wave)).json();assert.equal(goodUpload.status,'waiting');
 assert.equal((await request('/api/dialog',{id:files.id,answer:{batch_id:admission.batch_id,uploads:[badUpload.id,goodUpload.id]}})).status,200);
 const imported=decode((await (await importing).json()).result);assert.equal(imported.ok,true);assert.equal(imported.data.batch.status,'partial');assert.deepEqual(imported.data.batch.items.map((item:any)=>item.status),['failed','imported']);
 assert.equal(imported.data.batch.items[0].error.recovery,'choose-source','Discarded invalid upload must require explicit reselection');
 const {stat}=await import('node:fs/promises');
 const uploadedFiles=host.context.host.listMedia() as Array<{location_ref:string}>;assert.equal(uploadedFiles.length,1);await stat(uploadedFiles[0].location_ref);
 const removedPreview=decode((await (await request('/api/invoke',{channel:'project.query',request:{api_version:1,query_type:'project.media.preview',project_id:created.data.project,payload:{asset_id:(host.context.host.listMedia() as Array<{asset_id:string}>)[0].asset_id}}})).json()).result);assert.equal(removedPreview.ok,false);assert.equal(removedPreview.error.code,'UNKNOWN_QUERY','Retired preview query must be physically unregistered');
 assert.equal('readMediaPreview' in host.context.host,false,'Retired Host alias must not exist');
 const analysis=decode((await (await request('/api/invoke',{channel:'project.query',request:{api_version:1,query_type:'project.media.analysis',project_id:created.data.project,payload:{asset_id:(host.context.host.listMedia() as Array<{asset_id:string}>)[0].asset_id}}})).json()).result);assert.equal(analysis.ok,true);assert.ok(analysis.data.waveform&&analysis.data.source_audio,'Current precise-analysis caller retains real waveform and source range');
 const browseOperation=randomUUID();
 const browse=decode((await (await request('/api/invoke',{channel:'project.query',request:{api_version:1,query_type:'project.media.browse',project_id:created.data.project,payload:{asset_id:(host.context.host.listMedia()[0] as any).asset_id,operation_id:browseOperation}}})).json()).result);
 assert.equal(browse.ok,true);assert.match(browse.data.url,/^\/api\/media-browse\//);assert(!JSON.stringify(browse.data).includes(directory));
 const browseHead=await fetch(base+browse.data.url,{method:'HEAD',headers:{...headers,Cookie:cookie}});assert.equal(browseHead.status,200);assert.equal(Number(browseHead.headers.get('content-length')),browse.data.byte_length);assert.equal((await browseHead.arrayBuffer()).byteLength,0);
 const browseRange=await request(browse.data.url,undefined,{Range:'bytes=0-15'});assert.equal(browseRange.status,206);assert.equal((await browseRange.arrayBuffer()).byteLength,16);assert.match(browseRange.headers.get('content-range')!,/^bytes 0-15\//);
 assert.equal((await request(browse.data.url,undefined,{Range:'bytes=999999999-'})).status,416);
 assert.equal((await request(browse.data.url,undefined,{Cookie:other})).status,400,'A foreign browser cannot borrow a source reference');
 const released=decode((await (await request('/api/invoke',command('project.media.browse.release',created.data.project,{operation_id:browseOperation}))).json()).result);assert.equal(released.ok,true);assert.equal((await request(browse.data.url)).status,400,'Released reference expires');
 const repaired=await promisify(execFile)(process.env.AVE_FFMPEG??'ffmpeg',['-v','error','-f','lavfi','-i','color=c=red:s=8x8','-frames:v','1','-f','image2pipe','-c:v','png','pipe:1'],{encoding:'buffer'});
 const retrying=request('/api/invoke',command('project.media.import.retry',created.data.project,{batch_id:admission.batch_id}));const retryDialog=await dialog();assert.equal(retryDialog.options.retry_batch_id,admission.batch_id);
 const retryAdmission=await (await request('/api/upload-batch',{dialog_id:retryDialog.id,files:[{name:'broken.png',bytes:repaired.stdout.length}]})).json();assert.equal(retryAdmission.items.length,1);
 const repairedResponse=await fetch(base+'/api/upload',{method:'POST',headers:{...headers,Cookie:cookie,'X-AVE-CSRF':csrf,'X-AVE-Dialog':retryDialog.id,'X-AVE-Batch':admission.batch_id,'X-AVE-Item':retryAdmission.items[0].item_id,'X-AVE-Filename':'broken.png'},body:Uint8Array.from(repaired.stdout).buffer});assert.equal(repairedResponse.status,200);const repairedUpload=await repairedResponse.json();
 await request('/api/dialog',{id:retryDialog.id,answer:{batch_id:admission.batch_id,uploads:[repairedUpload.id]}});
 const retryResult=decode((await (await retrying).json()).result);assert.equal(retryResult.ok,true);assert.equal(retryResult.data.batch.status,'completed');assert.equal(retryResult.data.batch.items[0].attempt,2);assert.equal(retryResult.data.batch.items[0].issues.length,2);assert.deepEqual(retryResult.data.batch.items[1],imported.data.batch.items[1]);
 const choosing=request('/api/invoke',{channel:'system.choose-files',request:{multiple:false}});const chooseDialog=await dialog();
 const chosenAdmission=await (await request('/api/upload-batch',{dialog_id:chooseDialog.id,files:[{name:'selected.wav',bytes:wave.length}]})).json();
 const chosenResponse=await fetch(base+'/api/upload',{method:'POST',headers:{...headers,Cookie:cookie,'X-AVE-CSRF':csrf,'X-AVE-Dialog':chooseDialog.id,'X-AVE-Batch':chosenAdmission.batch_id,'X-AVE-Item':chosenAdmission.items[0].item_id,'X-AVE-Filename':'selected.wav'},body:Uint8Array.from(wave).buffer});assert.equal(chosenResponse.status,200);const chosenUpload=await chosenResponse.json();
 await request('/api/dialog',{id:chooseDialog.id,answer:{batch_id:chosenAdmission.batch_id,uploads:[chosenUpload.id]}});
 const chosen=decode((await (await choosing).json()).result);assert.equal(chosen.ok,true);assert.equal(chosen.data.batch_id,chosenAdmission.batch_id);assert.equal(chosen.data.items[0].display_name,'selected.wav');assert(!('filePaths' in chosen.data));assert(!JSON.stringify(chosen).includes(directory),'Public chooser must only return opaque references');
 assert.equal(host.context.host.listMediaImportBatches().find(batch=>batch.batch_id===chosen.data.batch_id)!.items[0].status,'waiting','Chooser receipt does not claim an import');
 const chosenImport=decode((await (await request('/api/invoke',command('project.media.import',created.data.project,{batch_id:chosen.data.batch_id}))).json()).result);assert.equal(chosenImport.ok,true);assert.equal(chosenImport.data.batch.status,'completed');assert.equal(chosenImport.data.batch.items[0].status,'duplicate');
 const disconnecting=request('/api/invoke',command('project.media.import',created.data.project));const disconnectDialog=await dialog();
 const disconnectAdmission=await (await request('/api/upload-batch',{dialog_id:disconnectDialog.id,files:[{name:'interrupted.wav',bytes:wave.length},{name:'after-interruption.wav',bytes:wave.length}]})).json();
 const socket=createConnection(address.port,'127.0.0.1');socket.on('error',()=>{});await new Promise<void>(accept=>socket.once('connect',accept));
 socket.write(`POST /api/upload HTTP/1.1\r\nHost: 127.0.0.1:6089\r\nOrigin: http://127.0.0.1:6089\r\nCookie: ${cookie}\r\nX-AVE-CSRF: ${csrf}\r\nX-AVE-Dialog: ${disconnectDialog.id}\r\nX-AVE-Batch: ${disconnectAdmission.batch_id}\r\nX-AVE-Item: ${disconnectAdmission.items[0].item_id}\r\nX-AVE-Filename: interrupted.wav\r\nContent-Length: ${wave.length}\r\n\r\n`);socket.write(wave.subarray(0,64));
 const waitUntil=async(predicate:()=>boolean)=>{const started=Date.now();while(!predicate()){if(Date.now()-started>3000)throw new Error('UPLOAD_STATE_NOT_OBSERVED');await new Promise(accept=>setTimeout(accept,10));}};
 await waitUntil(()=>host.context.host.listMediaImportBatches().find(batch=>batch.batch_id===disconnectAdmission.batch_id)!.revision>1);socket.destroy();
 await waitUntil(()=>host.context.host.listMediaImportBatches().find(batch=>batch.batch_id===disconnectAdmission.batch_id)!.items[0].status==='failed');
 const afterResponse=await fetch(base+'/api/upload',{method:'POST',headers:{...headers,Cookie:cookie,'X-AVE-CSRF':csrf,'X-AVE-Dialog':disconnectDialog.id,'X-AVE-Batch':disconnectAdmission.batch_id,'X-AVE-Item':disconnectAdmission.items[1].item_id,'X-AVE-Filename':'after-interruption.wav'},body:Uint8Array.from(wave).buffer});assert.equal(afterResponse.status,200);const afterUpload=await afterResponse.json();
 await request('/api/dialog',{id:disconnectDialog.id,answer:{batch_id:disconnectAdmission.batch_id,uploads:[afterUpload.id]}});
 const interruptedResult=decode((await (await disconnecting).json()).result);assert.equal(interruptedResult.ok,true);assert.deepEqual(interruptedResult.data.batch.items.map((item:any)=>item.status),['failed','duplicate']);assert.equal(interruptedResult.data.batch.items[0].error.recovery,'choose-source');
 const discarded=host.context.host.listMediaImportCleanupCandidates().find(source=>source.batch_id===disconnectAdmission.batch_id)!;assert(discarded);await assert.rejects(stat(discarded.path),(cause:any)=>cause.code==='ENOENT');await stat(uploadedFiles[0].location_ref);
 const cancelling=request('/api/invoke',command('project.media.import',created.data.project));const cancelDialog=await dialog();
 const cancelAdmission=await (await request('/api/upload-batch',{dialog_id:cancelDialog.id,files:[{name:'cancel.wav',bytes:wave.length}]})).json();
 const cancelUpload=await fetch(base+'/api/upload',{method:'POST',headers:{...headers,Cookie:cookie,'X-AVE-CSRF':csrf,'X-AVE-Dialog':cancelDialog.id,'X-AVE-Batch':cancelAdmission.batch_id,'X-AVE-Item':cancelAdmission.items[0].item_id,'X-AVE-Filename':'cancel.wav'},body:Uint8Array.from(wave).buffer});assert.equal(cancelUpload.status,200);
 const cancelledSource=host.context.host.listMediaImportCleanupCandidates();assert(!cancelledSource.some(source=>source.batch_id===cancelAdmission.batch_id),'A ready pending source is protected until cancellation');
 assert.equal((await request('/api/dialog',{id:cancelDialog.id,answer:{cancel:true,batch_id:cancelAdmission.batch_id}})).status,200);assert.equal(decode((await (await cancelling).json()).result).data.cancelled,true);
 assert.equal(host.context.host.listMediaImportBatches().find(batch=>batch.batch_id===cancelAdmission.batch_id)?.status,'stopped');await stat(uploadedFiles[0].location_ref);
 const cleaned=host.context.host.listMediaImportCleanupCandidates().filter(source=>source.batch_id===cancelAdmission.batch_id);assert.equal(cleaned.length,1);await assert.rejects(stat(cleaned[0].path),(cause:any)=>cause.code==='ENOENT');
 assert.equal((await request('/api/download/not-owned')).status,404);
 // Exercise the real export handler and HTTP download using a real encoded
 // synthetic video. Only the upstream master lookup and receipt are controlled;
 // this does not assert that a browser has saved the download.
 const fixture=(await promisify(execFile)(process.env.AVE_FFMPEG??'ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=s=64x64:r=10:d=1','-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','frag_keyframe+empty_moov','-f','mp4','pipe:1'],{encoding:'buffer'})).stdout;
 const fixtureHash=createHash('sha256').update(fixture).digest('hex');
 const fixturePath=resolve(directory,'export-master.mp4');await writeFile(fixturePath,fixture);
 const exportSelection={request_id:'fixture-request',draft_id:'fixture-draft',render_id:'fixture-render'};
 const controlledHost=host.context.host as any;
 const masterDescriptor=Object.getOwnPropertyDescriptor(controlledHost,'readCreationDraftMasterSource');
 const receiptDescriptor=Object.getOwnPropertyDescriptor(controlledHost,'recordCreationExport');
 let reads=0,recorded=false;
 controlledHost.readCreationDraftMasterSource=(_credential:unknown,selected:unknown)=>{assert.deepEqual(selected,exportSelection);reads++;return {path:fixturePath,output_hash:fixtureHash,timeline_version:1,audio_credits:null};};
 controlledHost.recordCreationExport=async (_credential:unknown,selected:unknown,_commandId:string,path:string)=>{assert.deepEqual(selected,exportSelection);assert.deepEqual(await readFile(path),fixture);recorded=true;return {status:'file-written',output_hash:fixtureHash};};
 try {
  const exporting=request('/api/invoke',command('project.creation.export',created.data.project,exportSelection));
  const saveDialog=await dialog();assert.equal(saveDialog.kind,'save');assert.equal(saveDialog.options.name,'AVE-v1.mp4');
  assert.equal((await request('/api/dialog',{id:saveDialog.id,answer:{}})).status,200);
  const exportResponse=await exporting;assert.equal(exportResponse.status,200);
  const exportBody=await exportResponse.json(),exportResult=decode(exportBody.result);
  assert.equal(exportResult.ok,true);assert.equal(exportResult.data.output_hash,fixtureHash);assert.equal(reads,7);assert.equal(recorded,true);
  assert.equal(exportBody.downloads.length,1);assert.equal(exportBody.downloads[0].name,'AVE-v1.mp4');
  const downloadUrl=exportBody.downloads[0].url;assert.match(downloadUrl,/^\/api\/download\//);
  assert.equal((await request(downloadUrl,undefined,{Cookie:other})).status,404,'Another session cannot download this export');
  const downloaded=await new Promise<{bytes:Buffer;length:string|undefined;type:string|undefined;complete:boolean}>((accept,reject)=>{
   const req=httpRequest(base+downloadUrl,{headers:{...headers,Cookie:cookie}},response=>{
    try{assert.equal(response.statusCode,200);}catch(error){response.resume();reject(error);return;}
    const chunks:Buffer[]=[];
    response.on('data',(chunk:Buffer)=>chunks.push(chunk));
    response.once('aborted',()=>reject(new Error('Download response aborted before EOF')));
    response.once('error',reject);
    response.once('end',()=>accept({bytes:Buffer.concat(chunks),length:response.headers['content-length'],type:response.headers['content-type'],complete:response.complete}));
   });
   req.setTimeout(10000,()=>req.destroy(new Error('Download response did not reach EOF')));req.once('error',reject);req.end();
  });
  assert.equal(downloaded.complete,true,'HTTP response must complete at EOF');
  assert.equal(downloaded.length,String(fixture.length));assert.equal(downloaded.type,'video/mp4');
  assert.equal(downloaded.bytes.length,fixture.length);assert.equal(createHash('sha256').update(downloaded.bytes).digest('hex'),fixtureHash);
  assert.deepEqual(downloaded.bytes,fixture);
  const exportedFiles=(await readdir(process.env.AVE_EXPORT_ROOT!)).filter(name=>name.endsWith('.mp4'));assert.equal(exportedFiles.length,1);
  await writeFile(resolve(process.env.AVE_EXPORT_ROOT!,exportedFiles[0]!),Buffer.from('changed after export'));
  assert.equal((await request(downloadUrl)).status,400,'A changed exported artifact must not be served under the original verified download');
  if(process.platform!=='win32'){
   const exportedPath=resolve(process.env.AVE_EXPORT_ROOT!,exportedFiles[0]!);await rename(exportedPath,`${exportedPath}.old`);await symlink(fixturePath,exportedPath);
   assert.equal((await request(downloadUrl)).status,400,'A symlink cannot replace an owned download');await rm(exportedPath);await rename(`${exportedPath}.old`,exportedPath);
  }
  const largePath=resolve(directory,'large-master.mp4');await writeFile(largePath,'');await truncate(largePath,96*1024*1024);
  const largeHasher=createHash('sha256');for await(const chunk of createReadStream(largePath))largeHasher.update(chunk);const largeHash=largeHasher.digest('hex');
  controlledHost.readCreationDraftMasterSource=()=>({path:largePath,output_hash:largeHash,timeline_version:2,audio_credits:null});
  controlledHost.recordCreationExport=async()=>({status:'file-written',output_hash:largeHash});
  const before=process.memoryUsage().rss,largeExport=request('/api/invoke',command('project.creation.export',created.data.project,exportSelection));
  const largeDialog=await dialog();assert.equal(largeDialog.options.name,'AVE-v2.mp4');assert.equal((await request('/api/dialog',{id:largeDialog.id,answer:{}})).status,200);
  const largeResult=await (await largeExport).json();assert.equal(largeResult.result.ok,true);assert.equal(largeResult.downloads.length,1);
  assert.ok(process.memoryUsage().rss-before<64*1024*1024,'exporting a 96 MiB Master must not buffer the whole file');
  const newFiles=(await readdir(process.env.AVE_EXPORT_ROOT!)).filter(name=>name.endsWith('.mp4')&&!exportedFiles.includes(name));assert.equal(newFiles.length,1);
  const largeOwnedPath=resolve(process.env.AVE_EXPORT_ROOT!,newFiles[0]!);
  const aborted=await new Promise<boolean>((accept,reject)=>{
   const req=httpRequest(base+largeResult.downloads[0].url,{headers:{...headers,Cookie:cookie}},response=>{
    if(response.statusCode!==200){response.resume();reject(new Error('large download not admitted'));return;}
    response.once('data',()=>{response.pause();void (async()=>{const file=await open(largeOwnedPath,'r+');try{await file.write(Buffer.from([1]),0,1,0);}finally{await file.close();}response.resume();})().catch(reject);});
    response.once('aborted',()=>accept(true));response.once('error',()=>accept(true));response.once('end',()=>accept(!response.complete));
   });req.setTimeout(20000,()=>req.destroy(new Error('large download did not terminate')));req.once('error',reject);req.end();
  });assert.equal(aborted,true,'A modified file must not finish a successful HTTP download');
  const credits={items:[{title:'合成音乐',author:'示例作者',license:'CC BY 4.0',source_page:'https://example.invalid/source'}],source_text:'合成音乐 — 示例作者\n许可证：CC BY 4.0',output_hash:fixtureHash};
  controlledHost.readCreationDraftMasterSource=()=>({path:fixturePath,output_hash:fixtureHash,timeline_version:3,audio_credits:credits});
  controlledHost.recordCreationExport=async()=>({status:'file-written',output_hash:fixtureHash});
  const creditedExport=request('/api/invoke',command('project.creation.export',created.data.project,exportSelection));
  const creditsDialog=await dialog();assert.equal(creditsDialog.options.name,'AVE-v3.mp4');assert.equal((await request('/api/dialog',{id:creditsDialog.id,answer:{}})).status,200);
  const credited=await (await creditedExport).json();assert.equal(credited.result.ok,true);assert.equal(credited.downloads.length,3);
  for(const [suffix,expected] of [['.audio.json',JSON.stringify(credits,null,2)+'\n'],['.credits.txt',credits.source_text+'\n']] as const){
   const entry=credited.downloads.find((item:any)=>item.name.endsWith(suffix));assert.ok(entry);
   const response=await request(entry.url);assert.equal(response.status,200);assert.equal(await response.text(),expected,'downloaded sidecar must exactly match actual exported UTF-8 bytes');
  }
 } finally {
  if(masterDescriptor)Object.defineProperty(controlledHost,'readCreationDraftMasterSource',masterDescriptor);else delete controlledHost.readCreationDraftMasterSource;
  if(receiptDescriptor)Object.defineProperty(controlledHost,'recordCreationExport',receiptDescriptor);else delete controlledHost.recordCreationExport;
 }
 // Saving is a precondition of shutdown: reject/timeout keep the real Host,
 // session, media and HTTP/SSE available, so input can be saved and retried.
 const rejectedClose=host.close();const rejectedOutcome=assert.rejects(rejectedClose,(error:any)=>error.code==='DESKTOP_INPUT_SAVE_FAILED');
 const failedFlush=await eventFor('system.before-close');
 assert.equal((await (await request('/api/invoke',{channel:'system.flush-complete',request:{token:failedFlush.token,ok:false,message:'controlled save failure'}})).json()).result.ok,true);
 await rejectedOutcome;assert.equal((await eventFor('project.event')).event_type,'app.shutdown.failed');
 assert.equal(host.context.sessions.acceptingRequests,true);assert.equal(host.server.listening,true);assert.equal(host.context.host.status().project,created.data.project);await stat(uploadedFiles[0].location_ref);
 const timeoutClose=host.close(), timeoutOutcome=assert.rejects(timeoutClose,(error:any)=>error.code==='DESKTOP_INPUT_SAVE_TIMEOUT');
 const timedFlush=await eventFor('system.before-close');await timeoutOutcome;
 assert.equal((await eventFor('project.event')).payload.code,'DESKTOP_INPUT_SAVE_TIMEOUT');
 assert.equal(host.context.sessions.acceptingRequests,true);assert.equal(host.server.listening,true);assert.equal(host.context.host.status().project,created.data.project);
 const late=decode((await (await request('/api/invoke',{channel:'system.flush-complete',request:{token:timedFlush.token,ok:true}})).json()).result);assert.equal(late.ok,false);assert.equal(late.error.code,'DESKTOP_INPUT_SAVE_STALE');
 const uiValue={forms:{'controlled-unsent-input':{raw_text:'保存失败后继续输入，不能丢失'}},selected_request_id:'',selected_draft_id:'',selected_clip_id:'',library_open:true,panel_open:true,panel_tab:'request'};
 const saved=decode((await (await request('/api/invoke',command('project.creation.ui.save',created.data.project,{expected_version:0,value:uiValue}))).json()).result);assert.equal(saved.ok,true);assert.equal(saved.data.version,1);
 const retryFlush=host.context.sessions.flushCreationInputs(), retryToken=await eventFor('system.before-close');
 assert.equal((await (await request('/api/invoke',{channel:'system.flush-complete',request:{token:retryToken.token,ok:true}})).json()).result.ok,true);await retryFlush;
 const readUi=decode((await (await request('/api/invoke',{channel:'project.query',request:{api_version:1,query_type:'project.creation.ui',project_id:created.data.project,payload:{}}})).json()).result);assert.equal(readUi.ok,true);assert.deepEqual(readUi.data.value,uiValue);assert.equal(readUi.data.version,1);
 assert.equal((await (await request('/api/invoke',command('project.close',created.data.project))).json()).result.ok,true);
 controller.abort();await reader.cancel().catch(error=>{assert.equal(error.name,'AbortError');});
 // An incomplete browser HTTP body must not outlive the already-drained Host.
 const partial=createConnection(address.port,'127.0.0.1');partial.on('error',()=>{});
 await new Promise<void>(accept=>partial.once('connect',accept));partial.write('POST /api/invoke HTTP/1.1\r\nHost: 127.0.0.1:6089\r\nContent-Length: 100000\r\n\r\n{');
 const disconnectedAt=Date.now();while(host.context.sessions.hasWindow(1)&&Date.now()-disconnectedAt<2000)await new Promise(accept=>setTimeout(accept,10));
 assert.equal(host.context.sessions.hasWindow(1),false,'closed browser stream must unregister before shutdown');
 let closeTimer:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([host.close().then(()=>{closed=true;}),new Promise((_,reject)=>{closeTimer=setTimeout(()=>reject(new Error('BROWSER_HTTP_CLOSE_NOT_DRAINED')),5000);})]);assert.equal(host.context.sessions.shutdownComplete,true);}finally{clearTimeout(closeTimer);partial.destroy();}
 console.log('Direct browser Host passed: actual creation/close, origin/CSRF/session, correlated dialogs/replay, upload path ownership, private static boundary, typed media wire.');
} finally {
 controller.abort();if(!closed){host.context.sessions.unregisterWindow(1);await host.close();}process.env=previous;await rm(directory,{recursive:true,force:true});
}
