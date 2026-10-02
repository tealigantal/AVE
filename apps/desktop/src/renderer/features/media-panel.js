import { query } from "../api/project-api.js";
export function mediaPanel(actions, state) {
  const section = document.createElement("section"); section.className = "panel media-panel";
  const media = [...new Map((state.media ?? []).filter(item=>item.location_type==="original").map(item=>[item.asset_id,item])).values()];
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">YOUR MATERIAL</p><h2>素材</h2></div><span class="badge">${media.length} 个</span></div><p class="muted">选择本次创作的素材，原片会保持完整。</p>`;
  const list = document.createElement("div"); list.className = "media-list";
  for (const [index, item] of media.entries()) { const row = document.createElement("button"); row.type = "button"; row.className = `media-row ${state.selectedAssetId === item.asset_id ? "selected" : ""}`; const identity = document.createElement("strong"); identity.textContent = `${index + 1}. ${item.display_name ?? "素材"}`; row.title = item.asset_id; const location = document.createElement("span"); location.textContent = `${item.location_type === "original" ? "原片" : "代理文件"} · ${item.permission_state === "authorized" ? "已授权" : "已登记"}`; row.append(identity, location); row.addEventListener("click", () => actions.selectAsset(item.asset_id)); list.append(row); }
  if (media.length === 0) { const empty = document.createElement("p"); empty.className = "muted empty"; empty.textContent = "暂无已登记素材。"; list.append(empty); }
  section.append(list);
  const selected=media.find(item=>item.asset_id===state.selectedAssetId);
  if(selected) {
    const previewButton=document.createElement("button"), preview=document.createElement("div");previewButton.textContent=`预览${({image:"图片",audio:"音频",video:"视频素材"})[selected.media_kind]??"素材"}`;
    previewButton.onclick=async()=>{previewButton.disabled=true;const urls=[];try{const result=await query("project.media.preview",state.status.project,{asset_id:selected.asset_id});if(!result.ok)throw new Error(result.error.message);if(!section.isConnected)return;preview.replaceChildren();for(const [field,mime,tag] of [["thumbnail",result.data.thumbnail_mime_type,"img"],["waveform","image/png","img"],["audio","audio/wav","audio"]]){const bytes=result.data[field];if(!bytes)continue;const element=document.createElement(tag),url=URL.createObjectURL(new Blob([new Uint8Array(bytes.data??bytes)],{type:mime}));urls.push(url);element.src=url;if(tag==="audio")element.controls=true;else {element.alt=field==="waveform"?"音频波形":"素材缩略图";element.style.maxWidth="100%";}preview.append(element);}const observer=new MutationObserver(()=>{if(!section.isConnected){for(const url of urls)URL.revokeObjectURL(url);observer.disconnect();}});observer.observe(document.body,{childList:true,subtree:true});}catch(error){preview.textContent=error.message;for(const url of urls)URL.revokeObjectURL(url);}finally{previewButton.disabled=false;}};
    section.append(previewButton,preview);
  }
  const button = document.createElement("button"); button.className = "primary"; button.textContent = "导入素材"; button.disabled = state.busy || state.status.project === "not-open"; button.addEventListener("click", actions.importMedia); section.append(button); return section;
}
