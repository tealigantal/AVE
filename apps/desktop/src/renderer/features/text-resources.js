import { reportError } from "../components/error-dialog.js";

export const textResourceMime="application/x-ave-text-resource";
export const textResourceBinding=state=>JSON.stringify([state.status.project,state.selectedRequestId,state.selectedDraftId,state.timeline?.version]);
export const textResourceRole=kind=>kind==="caption"?"captions":kind==="text"?"text":null;
export function acceptsTextResource(track,kind){return Boolean(track?.kind==="video"&&!track.locked&&track.enabled!==false&&textResourceRole(kind)&&track.semantic_sidecar?.metadata?.workbench_role===textResourceRole(kind));}
export function readTextResource(transfer,state){
  const value=JSON.parse(transfer.getData(textResourceMime));
  if(!value||!textResourceRole(value.kind)||typeof value.text!=="string"||!value.text.trim())throw new Error("文字资源内容或类型无效，请重新填写后拖放。");
  if(value.binding!==textResourceBinding(state))throw new Error("文字资源所属作品或版本已变化，请重新拖放；原输入保留。");
  return value;
}
export function textResources(actions,state){
  const section=document.createElement("section");section.setAttribute("aria-label","字幕与文字资源");
  const hint=document.createElement("p");hint.className="muted";hint.textContent="填写内容后拖到对应轨道或＋按钮；点击资源可添加到播放头。默认显示 3 秒，可继续修边。";section.append(hint);
  const cards=[];
  for(const [kind,title] of [["caption","新字幕"],["text","标题文字"]]){
    const row=document.createElement("div"),label=document.createElement("label"),input=document.createElement("input"),card=document.createElement("button");
    label.textContent=title+"内容";input.setAttribute("aria-label",title+"内容");input.value=title;label.append(input);
    card.type="button";card.className="p4-registered-resource";card.textContent=title;card.setAttribute("aria-label","拖入"+title);card.dataset.textResourceKind=kind;
    let suppressClickUntil=0;
    const editable=()=>Boolean(state.authorityCurrent&&state.timeline&&!state.pending?.has("timeline-edit"));
    card.addEventListener("dragstart",event=>{if(!editable()||!input.value.trim()||!event.dataTransfer){event.preventDefault();return;}event.dataTransfer.setData(textResourceMime,JSON.stringify({kind,text:input.value,binding:textResourceBinding(state)}));event.dataTransfer.setData("application/x-ave-text-"+kind,kind);event.dataTransfer.effectAllowed="copy";suppressClickUntil=Date.now()+500;});
    card.addEventListener("dragend",()=>{suppressClickUntil=Date.now()+500;});
    card.addEventListener("click",()=>{if(Date.now()<suppressClickUntil||!editable())return;try{Promise.resolve(actions.addTimelineCaption(kind,input.value,state.playheadTicks??0n)).catch(reportError);}catch(error){reportError(error);}});
    row.append(label,card);section.append(row);cards.push({card,editable});
  }
  section.refresh=()=>{for(const {card,editable} of cards){card.disabled=!editable();card.draggable=editable();}};
  section.refresh();return section;
}
