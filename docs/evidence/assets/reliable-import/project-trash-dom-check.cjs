// Controlled real Electron DOM; not direct-human or production-project acceptance.
const {app,BrowserWindow}=require('electron');
const {createServer}=require('node:http');
const {readFile,writeFile,mkdtemp}=require('node:fs/promises');
const {resolve,extname}=require('node:path');
const {tmpdir}=require('node:os');
const assert=require('node:assert/strict');
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 app.setPath('userData',await mkdtemp(resolve(tmpdir(),'ave-trash-dom-')));
 const root=resolve(process.cwd(),'apps/desktop/src/renderer');
 const server=createServer(async(req,res)=>{
  try{
   if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(`<html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles/workbench.css"></head><body><div id="app"></div><script>
   const item={id:'fixture-opaque-id',display_name:'测试作品',last_opened_at:'2026-10-03T00:00:00.000Z'};
   window.fixture={trashed:false,cancel:false,fail:false,commands:[]};window.projectApi={subscribeProjectEvents:()=>()=>{},onBeforeClose:()=>()=>{},acknowledgeClose:async()=>{},query:async input=>({ok:true,data:input.query_type==='app.status'?{project:'not-open',timeline:'none',render:'idle',qc:'not-run'}:{items:fixture.trashed?[]:[item],trashed_items:fixture.trashed?[{...item,deleted_at:'2026-10-04T00:00:00.000Z'}]:[]}}),command:async input=>{fixture.commands.push(input);if(fixture.fail)return {ok:false,error:{code:'FIXTURE_TRASH_SAVE_FAILED',message:'删除未登记，作品仍在列表'}};if(!fixture.cancel)fixture.trashed=input.command_type==='project.trash';return {ok:true,data:{project:'not-open',cancelled:fixture.cancel}};}};
   </script><script type="module">import{mountWorkbench}from'/workbench/workbench.js';window.workbench=mountWorkbench(document.querySelector('#app'));</script></body></html>`);return;}
   const path=resolve(root,'.'+req.url);if(!path.startsWith(root+require('node:path').sep))throw new Error('invalid test path');
   res.setHeader('Content-Type',extname(path)==='.css'?'text/css':'text/javascript');res.end(await readFile(path));
  }catch(error){res.writeHead(404);res.end();}
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const window=new BrowserWindow({show:false,width:1150,height:850,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 const wait=async script=>{const start=Date.now();while(Date.now()-start<10000){if(await window.webContents.executeJavaScript(script))return;await new Promise(done=>setTimeout(done,20));}throw new Error('DOM condition timeout: '+script);};
 try{
  await window.loadURL('http://127.0.0.1:'+server.address().port);
  await wait(`!!document.querySelector('.project-trash-button:not(:disabled)')`);
  await window.webContents.executeJavaScript(`fixture.cancel=true;document.querySelector('.project-trash-button').click()`);
  await wait(`document.querySelector('.project-trash-button:not(:disabled)')&&fixture.commands.length===1`);
  assert.equal(await window.webContents.executeJavaScript(`fixture.trashed`),false);
  await window.webContents.executeJavaScript(`fixture.cancel=false;document.querySelector('.project-trash-button').click()`);
  await wait(`!!document.querySelector('.project-trash-row button:not(:disabled)')`);
  assert.equal(await window.webContents.executeJavaScript(`document.querySelectorAll('.project-trash-button').length`),0);
  await writeFile(resolve(process.cwd(),'docs/evidence/assets/reliable-import/project-trash-dom-attempt01.png'),(await window.webContents.capturePage()).toPNG());
  await window.webContents.executeJavaScript(`document.querySelector('.project-trash-row button').click()`);
  await wait(`!!document.querySelector('.project-trash-button:not(:disabled)')`);
  await window.webContents.executeJavaScript(`fixture.fail=true;document.querySelector('.project-trash-button').click()`);
  await wait(`!!document.querySelector('.persistent-error-dialog[open]')&&!!document.querySelector('.project-trash-button:not(:disabled)')`);
  const commands=await window.webContents.executeJavaScript(`fixture.commands`);
  assert.deepEqual(commands.map(item=>item.command_type),['project.trash','project.trash','project.restore','project.trash']);
  for(const item of commands)assert.deepEqual(item.payload,{id:'fixture-opaque-id'});
  await writeFile(resolve(process.cwd(),'docs/evidence/assets/reliable-import/project-trash-dom-attempt01.json'),JSON.stringify({result:'passed',scope:'controlled actual Electron DOM',checks:['delete button invokes opaque ID','cancel keeps card','trash replaces card with restore row','restore shows card again','failure keeps card and persistent error'],commands},null,2));
  console.log('PASS: actual Electron DOM project trash/cancel/restore/error, controlled fixture');
 }finally{window.destroy();await new Promise(done=>server.close(done));app.quit();}
}).catch(error=>{console.error(error);app.exit(1);});
