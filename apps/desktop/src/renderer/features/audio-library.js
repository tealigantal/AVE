import { command, query } from "../api/project-api.js";
const node=(tag,text="")=>{const value=document.createElement(tag);value.textContent=text;return value;};
export function audioLibrary(actions,state) {
  const section=node("details"),heading=node("summary","免费音频库");section.append(heading);
  const catalog=state.audioCatalog;if(!catalog){section.append(node("p","资源目录尚未读取"));return section;}
  const scope=node("p",`版本 ${catalog.pack_version} · ${catalog.items.length} 项 · 按需下载`);scope.className="muted";
  const kind=node("select"),search=node("input"),use=node("select"),placement=node("input"),duration=node("input"),gain=node("input"),list=node("div"),status=node("p"),clear=node("button","清理未使用的试听缓存"),stop=node("button","停止试听");
  for(const [value,label] of [["all","全部"],["music","配乐"],["sfx","音效"]])kind.append(new Option(label,value));
  use.append(new Option("全部用途",""));for(const [value,label]of [["daily","日常"],["travel","旅行"],["warm","温暖"],["upbeat","轻快"],["quiet","安静"],["city","城市"],["hint","提示"],["motion","动效"],["transition","转场"],["emphasis","强调"],["environment","环境"]])use.append(new Option(label,value));
  search.placeholder="搜索曲名、作者或标签";search.setAttribute("aria-label","搜索音频库");kind.setAttribute("aria-label","音频类型");use.setAttribute("aria-label","音频用途");
  const label=(text,input,value)=>{const l=node("label",text);input.value=value;l.append(input);return l;};
  section.append(scope,kind,use,search,label("加入位置（秒）",placement,"0"),label("使用时长（秒）",duration,"1"),label("增益 dB",gain,"-12"),stop,clear,status,list);
  let pending=null,url=null,player=null;
  const revoke=()=>{player?.pause();player?.remove();if(url)URL.revokeObjectURL(url);url=null;player=null;};
  const cancel=async()=>{revoke();const id=pending;pending=null;if(id){const result=await command("project.audio.library",state.status.project,{action:"cancel",operation_id:id});if(!result.ok)throw new Error(result.error.message);}};
  stop.onclick=()=>cancel().catch(error=>{status.textContent=error.message;});
  clear.onclick=async()=>{try{await cancel();const result=await command("project.audio.library",state.status.project,{action:"clear_cache"});if(!result.ok)throw new Error(result.error.message);status.textContent=`已清理 ${result.data.removed} 个缓存，项目原件与历史版本仍保留。`;}catch(error){status.textContent=error.message;}};
  const draw=()=>{list.replaceChildren();for(const item of catalog.items.filter(item=>(kind.value==="all"||kind.value===item.kind)&&(!use.value||item.use_tags.includes(use.value))&&[item.title,item.author,...item.use_tags].join(" ").toLowerCase().includes(search.value.trim().toLowerCase()))){
    const row=node("article"),title=node("strong",item.title),facts=node("p",`${item.author} · ${item.license.spdx} · ${item.measurement.display_length_seconds.toFixed(2)} 秒`),wave=node("div"),source=node("a","原始来源"),license=node("a","许可");wave.setAttribute("aria-label","完整音频波形");wave.style.cssText="display:flex;align-items:center;height:28px";
    for(const value of item.measurement.waveform){const bar=node("i");bar.style.cssText=`display:block;background:currentColor;width:2px;flex:1;height:${Math.max(1,value*28)}px`;wave.append(bar);}source.href=item.source_page;license.href=item.license.url;for(const link of [source,license]){link.target="_blank";link.rel="noopener noreferrer";}
    const preview=node("button","试听前 15 秒"),add=node("button","加入作品"),replace=node("button","替换所选音频");
    preview.onclick=async()=>{let id;try{await cancel();id=crypto.randomUUID();pending=id;status.textContent="正在获取并验证音频…";const result=await query("project.audio.preview",state.status.project,{action:"preview",operation_id:id,resource_id:item.resource_id});if(pending!==id || !section.isConnected)return;if(!result.ok)throw new Error(result.error.message);pending=null;const bytes=result.data.audio;url=URL.createObjectURL(new Blob([new Uint8Array(bytes.data??bytes)],{type:result.data.mime_type}));player=node("audio");player.controls=true;player.src=url;row.append(player);status.textContent="试听已验证；完整波形显示在曲目下方。";}catch(error){status.textContent=error.message;}finally{if(pending===id)pending=null;}};
    const apply=replace=>{cancel().then(()=>actions.libraryApply({resource_id:item.resource_id,title:item.title,replace,placement:placement.value,duration:duration.value,gain:gain.value})).catch(error=>{status.textContent=error.message;});};add.onclick=()=>apply(false);replace.onclick=()=>apply(true);
    const request=state.workspace?.requests.find(request=>request.authorization.request_id===state.selectedRequestId);add.disabled=replace.disabled=state.busy||!request?.authorization.audio_library;
    row.append(title,facts,wave,source,document.createTextNode(" · "),license,preview,add,replace);list.append(row);
  }};
  for(const input of [kind,search,use])input.addEventListener("input",draw);draw();
  const observer=new MutationObserver(()=>{if(!section.isConnected){cancel().catch(error=>{state.notice=`试听取消失败：${error.message}`;});observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});return section;
}
