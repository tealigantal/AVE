import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { encode, decode } from '../../apps/web/src/wire.js';

assert.deepEqual(decode(encode({time:2345678901234567890n,bytes:new Uint8Array([0,128,255]),nested:[-8n]})),{time:2345678901234567890n,bytes:new Uint8Array([0,128,255]),nested:[-8n]});
assert.throws(()=>decode({$ave:'bigint',value:'broken'}));
const directory=await mkdtemp(resolve(tmpdir(),'ave-web-'));
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
 const events=await fetch(base+'/api/events',{headers:{...headers,Cookie:cookie},signal:controller.signal});
 const reader=events.body!.getReader();await reader.read();
 assert.equal((await (await request('/api/invoke',query)).json()).result.ok,true);
 let buffer='';
 async function dialog(){for(;;){const frameEnd=buffer.indexOf('\n\n');if(frameEnd>=0){const frame=buffer.slice(0,frameEnd);buffer=buffer.slice(frameEnd+2);if(frame.startsWith('data: ')){const event=decode(JSON.parse(frame.slice(6)));if(event.channel==='browser.dialog')return event.payload;}continue;}const chunk=await reader.read();if(chunk.done)throw new Error('event stream closed');buffer+=new TextDecoder().decode(chunk.value);}}
 const command=(type:string,project='',payload?:unknown)=>({channel:'project.command',request:{api_version:1,command_type:type,command_id:randomUUID(),idempotency_key:randomUUID(),project_id:project,payload}});
 const create=request('/api/invoke',command('project.create'));
 const selection=await dialog();assert.equal(selection.kind,'project');assert.equal(selection.options.create,true);
 const second=await fetch(base+'/api/session',{headers});const other=second.headers.get('set-cookie')!.split(';')[0],otherCsrf=(await second.json()).csrf;
 assert.equal((await request('/api/dialog',{id:selection.id,answer:{name:'wrong browser'}},{Cookie:other,'X-AVE-CSRF':otherCsrf})).status,400);
 assert.equal((await request('/api/dialog',{id:selection.id,answer:{name:'浏览器测试'}})).status,200);
 const created=decode((await (await create).json()).result);assert.equal(created.ok,true);assert.notEqual(created.data.project,'not-open');
 assert.equal((await request('/api/dialog',{id:selection.id,answer:{name:'replay'}})).status,400);
 const upload=await fetch(base+'/api/upload',{method:'POST',headers:{...headers,Cookie:cookie,'X-AVE-CSRF':csrf,'X-AVE-Filename':'../test.wav'},body:new Uint8Array([1,2,3])});
 assert.equal(upload.status,200);const uploaded=await upload.json();assert.equal(uploaded.name,'test.wav');
 assert.equal((await fetch(base+'/api/upload',{method:'POST',headers:{...headers,Cookie:cookie,'X-AVE-CSRF':csrf,'X-AVE-Filename':'bad.exe'},body:'bad'})).status,400);
 const importing=request('/api/invoke',command('project.media.import',created.data.project));
 const files=await dialog();assert.equal(files.kind,'files');await request('/api/dialog',{id:files.id,answer:{uploads:['/etc/passwd']}});
 assert.equal((await (await importing).json()).result.ok,false,'Arbitrary server paths cannot become imported originals');
 assert.equal((await request('/api/download/not-owned')).status,404);
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
 controller.abort();if(!closed)await host.close();process.env=previous;await rm(directory,{recursive:true,force:true});
}
