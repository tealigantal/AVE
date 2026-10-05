import { audioLibrary } from "./audio-library.js";
const mediaViews=new WeakMap();
export function mediaPanel(actions, state) {
  const key=JSON.stringify([state.status.project,state.selectedAssetId,state.media,state.audioCatalog?.pack_digest]);const held=mediaViews.get(state);if(held?.key===key){held.section.refreshAvailability();return held.section;}
  const section = document.createElement("section"); section.className = "panel media-panel";
  const media = [...new Map((state.media ?? []).filter(item=>item.location_type==="original").map(item=>[item.asset_id,item])).values()];
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">YOUR MATERIAL</p><h2>素材</h2></div><span class="badge">${media.length} 个</span></div><p class="muted">选择本次创作的素材，原片会保持完整。</p>`;
  const list = document.createElement("div"); list.className = "media-list";
  for (const [index, item] of media.entries()) { const row = document.createElement("button"); row.type = "button"; row.className = `media-row ${state.selectedAssetId === item.asset_id ? "selected" : ""}`; const identity = document.createElement("strong"); identity.textContent = `${index + 1}. ${item.display_name ?? "素材"}`; row.title = item.asset_id; const location = document.createElement("span"); location.textContent = `${item.location_type === "original" ? "原片" : "代理文件"} · ${item.permission_state === "authorized" ? "已授权" : "已登记"}`; row.append(identity, location); row.addEventListener("click", () => actions.selectAsset(item.asset_id)); list.append(row); }
  if (media.length === 0) { const empty = document.createElement("p"); empty.className = "muted empty"; empty.textContent = "暂无已登记素材。"; list.append(empty); }
  section.append(list);
  const batches=document.createElement("div");batches.className="media-import-batches";batches.setAttribute("aria-label","导入批次与问题");let batchKey="";
  const refreshBatches=()=>{
    const values=state.importBatches??[],key=JSON.stringify([values,state.busy,[...state.pending.keys()].filter(key=>key.startsWith("import-"))]);if(key===batchKey)return;batchKey=key;
    batches.replaceChildren();
    for(const batch of [...values].reverse()){
      const card=document.createElement("details");card.className="media-import-batch";card.open=batch.status==="active"||batch.items.some(item=>item.status==="failed")||batch.status==="stopped";
      const summary=document.createElement("summary"),ended=batch.items.filter(item=>["imported","duplicate","failed","cancelled"].includes(item.status)).length;
      summary.textContent=`导入批次 · ${({active:"进行中",completed:"完成",partial:"部分完成",stopped:"停止"})[batch.status]} · ${ended}/${batch.items.length} 项`;card.append(summary);
      if(batch.stop_reason){const reason=document.createElement("p");reason.className="media-import-error";reason.textContent=batch.stop_reason.message;card.append(reason);}
      for(const item of batch.items){const row=document.createElement("div");row.className="media-import-item";const name=document.createElement("strong"),status=document.createElement("span");name.textContent=item.display_name;name.title=item.display_name;status.textContent=({waiting:"等待",uploading:"上传中",validating:"校验中",imported:"已导入",duplicate:"重复",failed:"失败",cancelled:"取消"})[item.status];row.append(name,status);
        if(item.error){const error=document.createElement("p");error.className="media-import-error";error.textContent=item.error.message;const recovery=document.createElement("span");recovery.textContent=({retry:"可重试该失败项", "choose-source":"请重新选择来源", "reopen-project":"请重开项目", "free-space":"请释放磁盘空间", "repair-storage":"请修复项目存储问题", "check-permission":"请检查素材与项目权限"})[item.error.recovery];row.append(error,recovery);}
        for(const note of item.compatibility_notes??[]){const text=document.createElement("p");text.textContent=note;row.append(text);}
        if(item.error||item.issues.length){const detail=document.createElement("details"),title=document.createElement("summary"),body=document.createElement("pre");title.textContent="查看错误记录";body.textContent=item.issues.map(issue=>`第${issue.attempt}次 · ${issue.observed_at}\n${issue.error.code}: ${issue.error.message}`).join("\n\n");detail.append(title,body);row.append(detail);}card.append(row);
      }
      if(batch.status==="active"){const cancel=document.createElement("button");cancel.type="button";cancel.textContent="停止剩余导入";cancel.disabled=state.busy||state.pending.has(`import-cancel:${batch.batch_id}`);cancel.onclick=()=>actions.cancelImport(batch.batch_id);card.append(cancel);}
      else if(batch.items.some(item=>item.status==="failed")){const retry=document.createElement("button");retry.type="button";retry.textContent="仅重试失败项";retry.disabled=state.busy||state.pending.has(`import-retry:${batch.batch_id}`);retry.onclick=()=>actions.retryImport(batch.batch_id);card.append(retry);}
      batches.append(card);
    }
  };refreshBatches();section.append(batches);
  const projectId=state.status.project;const active=()=>state.status.project===projectId&&state.materialOpen&&!state.home&&section.isConnected;
  const button = document.createElement("button"); button.className = "primary"; button.textContent = "导入素材"; button.disabled = state.busy || state.status.project === "not-open" || state.pending.has("import"); button.addEventListener("click", actions.importMedia); const audio=audioLibrary(actions,state);section.refreshAvailability=()=>{button.disabled=state.busy||state.status.project==="not-open"||state.pending.has("import");refreshBatches();audio.refreshAvailability?.();};section.append(button,audio);mediaViews.set(state,{key,section});return section;
}
