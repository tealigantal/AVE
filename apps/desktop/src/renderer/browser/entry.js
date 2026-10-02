import { encode, decode } from './wire.js';
import { MEDIA_ACCEPT } from '../media-formats.js';

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
  if (!response.ok) throw new Error(result.error ?? `请求失败 (${response.status})`);
  return result;
}
function listen(channel, listener) {
  if (!listeners.has(channel)) listeners.set(channel, new Set());
  const set = listeners.get(channel); set.add(listener);
  return () => set.delete(listener);
}
async function invoke(channel, request) {
  const result = await post('/api/invoke', {channel, request:encode(request)});
  for (const item of result.downloads) {
    const anchor = document.createElement('a'); anchor.href=item.url; anchor.download=item.name;
    document.body.append(anchor); anchor.click(); anchor.remove();
  }
  return decode(result.result);
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
  if(kind==='files') {const label=element('label','选择本机素材文件',form);input=element('input',undefined,label);input.type='file';input.multiple=options.multiple;input.required=true;input.accept=MEDIA_ACCEPT;}
  const actions=element('div',undefined,form);actions.className='browser-dialog-actions';
  const cancel=element('button',kind==='confirm'?options.buttons[0]:'取消',actions);cancel.type='button';
  const accept=element('button',kind==='confirm'?options.buttons[1]:kind==='save'?'下载成片':kind==='files'?'上传并导入':'确定',actions);accept.type='submit';
  if(kind==='project'&&!options.create&&!options.items.length)accept.disabled=true;
  let finished=false;
  const done=()=>{finished=true;dialogs.delete(id);modal.close();modal.remove();};
  dialogs.set(id,done);
  const answer=async(value)=>{try{await post('/api/dialog',{id,answer:value});done();}catch(cause){error.textContent=cause.message;accept.disabled=false;cancel.disabled=false;}};
  cancel.onclick=()=>void answer(kind==='confirm'?{response:0}:{cancel:true});
  modal.addEventListener('cancel',event=>{event.preventDefault();cancel.click();});
  form.onsubmit=async event=>{
    event.preventDefault();accept.disabled=true;cancel.disabled=true;error.textContent='';
    try {
      let value;
      if(kind==='confirm')value={response:1};
      else if(kind==='project')value=options.create?{name:input.value}:{choice:input.value};
      else if(kind==='files') {
        const uploads=[]; const files=[...input.files];
        for(let i=0;i<files.length;i++) {
          error.textContent=`正在上传 ${i+1}/${files.length}：${files[i].name}`;
          const response=await fetch('/api/upload',{method:'POST',headers:{'X-AVE-CSRF':csrf,'X-AVE-Filename':encodeURIComponent(files[i].name)},body:files[i]});
          const result=await response.json();if(!response.ok)throw new Error(result.error??'上传失败');uploads.push(result.id);
        }
        value={uploads};
      } else value={};
      if(!finished)await answer(value);
    }catch(cause){if(!finished){error.textContent=cause.message;accept.disabled=false;cancel.disabled=false;}}
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
