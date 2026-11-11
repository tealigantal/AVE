import { encode, decode } from './wire.js';
import { MEDIA_ACCEPT } from '../media-formats.js';
import { reportError } from '../components/error-dialog.js';
import { acquireBrowserSessionLock } from './session-lock.js';

// The Host currently routes one event stream per browser cookie. Wait for the
// existing tab instead of sending its dialogs to whichever stream connected last.
const appRoot = document.getElementById('app');
const lockAbort = new AbortController();
let releaseSession;
window.addEventListener('pagehide', () => { lockAbort.abort(); releaseSession?.(); }, { once: true });
window.addEventListener('pageshow', event => { if (event.persisted) window.location.reload(); });
appRoot.textContent = '正在连接工作台；如果已有工作台标签打开，请先关闭它，本页会自动连接。';
try { releaseSession = await acquireBrowserSessionLock(navigator.locks, lockAbort.signal); }
catch (error) { appRoot.textContent = error.message; throw error; }
appRoot.textContent = '正在加载工作台…';

const sessionResponse = await fetch('/api/session');
if (!sessionResponse.ok) throw new Error('无法建立浏览器会话');
const { csrf } = await sessionResponse.json();
const listeners = new Map();
const dialogs = new Map();
const closedDialogs = new Set();
let dialogQueue = Promise.resolve();
async function post(path, value) {
  const response = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json','X-AVE-CSRF':csrf}, body:JSON.stringify(value)});
  const result = await response.json();
  if (!response.ok) { const error = new Error(result.error ?? `请求失败 (${response.status})`); reportError(error); throw error; }
  return result;
}
function listen(channel, listener) {
  if (!listeners.has(channel)) listeners.set(channel, new Set());
  const set = listeners.get(channel); set.add(listener);
  return () => set.delete(listener);
}
async function invoke(channel, request) {
  const result = await post('/api/invoke', {channel, request:encode(request)});
  if (result.downloads.length) showDownloads(result.downloads);
  return decode(result.result);
}
function showDownloads(items) {
  const modal=element('dialog',undefined,document.body); modal.className='browser-dialog';
  modal.setAttribute('aria-label','下载已准备的文件');
  element('h2','下载已准备的文件',modal);
  element('p','请分别下载所需文件。文件已准备好；是否保存成功，以浏览器下载记录为准。',modal);
  for(const item of items) {
    const label=item.name.endsWith('.audio.json')?'下载音频清单':item.name.endsWith('.credits.txt')?'下载音频署名':'下载成片';
    const row=element('p',undefined,modal),anchor=element('a',label,row);
    anchor.href=item.url; anchor.download=item.name;
    element('span',` · ${item.name}`,row);
  }
  const close=element('button','关闭文件下载',modal); close.type='button';
  close.onclick=()=>{modal.close();modal.remove();};
  modal.addEventListener('cancel',event=>{event.preventDefault();close.click();});
  modal.showModal();
}
window.projectApi = Object.freeze({
  transport:'browser',
  query:request=>invoke('project.query',request), command:request=>invoke('project.command',request),
  chooseFiles:request=>invoke('system.choose-files',request), chooseDirectory:()=>invoke('system.choose-directory'),
  acknowledgeClose:value=>invoke('system.flush-complete',value),
  subscribeProjectEvents:listener=>listen('project.event',listener), onBeforeClose:listener=>listen('system.before-close',listener),
});
function element(tag, text, parent) {
  const item=document.createElement(tag); if(text!==undefined)item.textContent=text; parent?.append(item); return item;
}
async function showDialog(message) {
  const {id,kind,options}=message;
  if(closedDialogs.delete(id))return;
  const modal=element('dialog',undefined,document.body); modal.className='browser-dialog';
  const form=element('form',undefined,modal); form.method='dialog';
  element('h2',kind==='confirm'?options.title:kind==='files'?'上传素材':kind==='save'?'下载作品':options.create?'新建作品':'打开作品',form);
  const error=element('p','',form); error.className='browser-error'; error.setAttribute('role','alert');
  let input;
  if(kind==='confirm') { element('p',options.message,form); element('pre',options.detail,form); }
  if(kind==='save') element('p',`下载已检查的成片：${options.name}`,form);
  if(kind==='project') {
    if(options.create) { const label=element('label','作品名称',form); input=element('input',undefined,label); input.required=true; input.maxLength=120; input.value='我的作品'; }
    else { const label=element('label','选择作品',form); input=element('select',undefined,label); input.required=true; for(const item of options.items){const option=element('option',item.name,input);option.value=item.id;} if(!options.items.length)element('p','尚无作品，请先新建作品。',form); }
  }
  if(kind==='files') {
    const label=element('label',undefined,form);label.className='browser-file-picker';
    const icon=element('span','＋',label);icon.className='browser-file-picker-icon';icon.setAttribute('aria-hidden','true');
    const heading=element('strong','选择本机素材文件',label);heading.className='browser-file-picker-title';
    const hint=element('span',options.multiple?'选择视频、图片或音频，可一次选择多个文件':'选择一个视频、图片或音频文件',label);hint.className='browser-file-picker-hint';
    const summary=element('span','还没有选择文件',label);summary.className='browser-file-picker-summary';summary.setAttribute('aria-live','polite');
    input=element('input',undefined,label);input.type='file';input.multiple=options.multiple;input.required=true;input.accept=MEDIA_ACCEPT;input.setAttribute('aria-label','选择本机素材文件');
    input.addEventListener('change',()=>{const files=[...input.files];summary.textContent=files.length===0?'还没有选择文件':files.length===1?files[0].name:`已选择 ${files.length} 个文件`;});
  }
  const actions=element('div',undefined,form);actions.className='browser-dialog-actions';
  const cancel=element('button',kind==='confirm'?options.buttons[0]:'取消',actions);cancel.type='button';
  const accept=element('button',kind==='confirm'?options.buttons[1]:kind==='save'?'下载成片':kind==='files'?'上传并导入':'确定',actions);accept.type='submit';
  if(kind==='project'&&!options.create&&!options.items.length)accept.disabled=true;
  let finished=false, submitting=false, cancelling=false, uploadController, batchId;
  const done=(manual=false)=>{finished=true;uploadController?.abort();dialogs.delete(id);if(!manual&&error.textContent){accept.disabled=true;cancel.disabled=false;cancel.textContent='关闭';cancel.onclick=()=>done(true);return;}modal.close();modal.remove();};
  dialogs.set(id,done);
  const answer=async(value)=>{try{await post('/api/dialog',{id,answer:value});done(Boolean(value.cancel));}catch(cause){error.textContent=cause.message;accept.disabled=false;cancel.disabled=false;}};
  cancel.onclick=()=>{if(cancelling||finished)return;cancelling=true;cancel.disabled=true;accept.disabled=true;uploadController?.abort();void answer(kind==='confirm'?{response:0}:{cancel:true,...(batchId?{batch_id:batchId}:{})}).finally(()=>{cancelling=false;});};
  modal.addEventListener('cancel',event=>{event.preventDefault();cancel.click();});
  form.onsubmit=async event=>{
    event.preventDefault();if(submitting||finished||cancelling)return;submitting=true;accept.disabled=true;cancel.disabled=kind!=='files';error.textContent='';
    try {
      let value;
      if(kind==='confirm')value={response:1};
      else if(kind==='project')value=options.create?{name:input.value}:{choice:input.value};
      else if(kind==='files') {
        const uploads=[]; const files=[...input.files];input.disabled=true;
        const admission=await post('/api/upload-batch',{dialog_id:id,files:files.map(file=>({name:file.name,bytes:file.size}))});
        batchId=admission.batch_id;
        if(finished||cancelling)return;
        const rows=element('ol',undefined,form);
        const statuses=files.map(file=>element('li',`${file.name}：等待上传`,rows));
        for(let i=0;i<files.length;i++) {
          if(finished||cancelling)return;
          statuses[i].textContent=`${files[i].name}：上传中`;
          uploadController=new AbortController();
          const response=await fetch('/api/upload',{method:'POST',headers:{'X-AVE-CSRF':csrf,'X-AVE-Dialog':id,'X-AVE-Batch':batchId,'X-AVE-Item':admission.items[i].item_id,'X-AVE-Filename':encodeURIComponent(files[i].name)},body:files[i],signal:uploadController.signal});
          const result=await response.json();
          if(response.ok){uploads.push(result.id);statuses[i].textContent=`${files[i].name}：上传完成，等待校验和登记`;}
          else {
            statuses[i].textContent=`${files[i].name}：上传失败 — ${result.error??'请查看批次问题并重试'}`;
            error.textContent='部分素材上传失败，错误与逐项结果会保留；请截图或查看后手动关闭。';
            reportError(statuses[i].textContent);
            const current=await post('/api/upload-batch',{dialog_id:id,files:files.map(file=>({name:file.name,bytes:file.size}))});
            if(current.batch.status!=='active')break;
          }
        }
        value={uploads,batch_id:batchId};
      } else value={};
      if(!finished)await answer(value);
    }catch(cause){if(!finished&&!cancelling){error.textContent=cause.message;reportError(cause);accept.disabled=false;cancel.disabled=false;}}
    finally{submitting=false;uploadController=undefined;}
  };
  modal.showModal(); if(kind==='confirm')cancel.focus();else input?.focus();
  await new Promise(resolve=>modal.addEventListener('close',resolve,{once:true}));
}
const stream=new EventSource('/api/events');
stream.onmessage=event=>{
  const {channel,payload}=decode(JSON.parse(event.data));
  if(channel==='browser.dialog') {dialogQueue=dialogQueue.then(()=>showDialog(payload)).catch(error=>console.error('对话框失败',error));return;}
  if(channel==='browser.dialog-close'){const close=dialogs.get(payload.id);if(close)close();else closedDialogs.add(payload.id);return;}
  for(const listener of listeners.get(channel)??[])listener(payload);
};
await new Promise((resolve,reject)=>{stream.onopen=resolve;stream.onerror=()=>reject(new Error('无法连接 AVE Host'));});
const style=element('link',undefined,document.head);style.rel='stylesheet';style.href='/browser/dialog.css';
await import('/app/main.js');
