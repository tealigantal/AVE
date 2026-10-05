// Isolated actual Electron DOM regression, not the Windows acceptance journey.
const {app,BrowserWindow}=require('electron');
const {createServer}=require('node:http');
const {readFile,mkdtemp,writeFile}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const renderer=resolve(process.cwd(),'apps/desktop/src/renderer');
 app.setPath('userData',await mkdtemp(resolve(tmpdir(),'ave-error-dialog-check-')));
 const routes={'/components/error-dialog.js':'components/error-dialog.js','/api/project-api.js':'api/project-api.js','/styles.css':'styles/workbench.css'};
 const server=createServer(async(req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(`<html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"></head><body><p id="notice">就绪</p><script>window.projectApi={query:async()=>({ok:false,error:{code:'FIXTURE_MEDIA_ERROR',message:'测试错误：素材预览失败，信息保留用于截图。'}}),command:async()=>({ok:true,data:{}})};</script><script type="module">import{query,command}from'/api/project-api.js';import{showErrorHistory,reportError}from'/components/error-dialog.js';window.fixture={query,command,showErrorHistory,reportError};</script></body></html>`);return;}
  const path=routes[req.url];if(!path){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'text/javascript');res.end(await readFile(resolve(renderer,path)));
 });
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const window=new BrowserWindow({show:false,width:1100,height:850,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 try{
  await window.loadURL('http://127.0.0.1:'+server.address().port);
  await window.webContents.executeJavaScript(`(async()=>{await fixture.query('project.media.preview');await fixture.command('unrelated-success');document.querySelector('#notice').textContent='操作完成';const modal=document.querySelector('.persistent-error-dialog');const event=new Event('cancel',{cancelable:true});modal.dispatchEvent(event);return {open:modal.open,prevented:event.defaultPrevented,text:modal.textContent};})()`).then(value=>{assert(value.open);assert(value.prevented);assert(value.text.includes('FIXTURE_MEDIA_ERROR'));});
  await new Promise(done=>setTimeout(done,31000));
  assert(await window.webContents.executeJavaScript(`document.querySelector('.persistent-error-dialog').open`),'Error remains after thirty seconds and unrelated success');
  const screenshot=await window.webContents.capturePage();await writeFile(resolve(process.cwd(),'docs/evidence/assets/reliable-import/error-dialog-check-attempt03.png'),screenshot.toPNG());
  assert(await window.webContents.executeJavaScript(`(()=>{document.querySelector('.persistent-error-dialog button').click();const closed=!document.querySelector('.persistent-error-dialog').open;fixture.showErrorHistory();return closed&&document.querySelector('.persistent-error-dialog').open&&document.querySelector('pre').textContent.includes('FIXTURE_MEDIA_ERROR');})()`),'Manual close and error-history reopen retain the original failure');
  await writeFile(resolve(process.cwd(),'docs/evidence/assets/reliable-import/error-dialog-check-attempt03.json'),JSON.stringify({result:'passed',scope:'controlled actual Electron DOM, not Windows acceptance',checks:['error survives unrelated success','Escape cannot dismiss','visible after 31 seconds','manual close','history reopens original error']},null,2));
  console.log('PASS: actual Electron error dialog remains >30s, survives unrelated success and Escape, closes only by button, and reopens with original details; controlled engineering test, no Windows journey claim');
 }finally{window.destroy();await new Promise(done=>server.close(done));app.quit();}
}).catch(async error=>{console.error(error);await writeFile(resolve(process.cwd(),'docs/evidence/assets/reliable-import/error-dialog-check-attempt03.json'),JSON.stringify({result:'failed',message:error.message,stack:error.stack},null,2));app.exit(1);});
