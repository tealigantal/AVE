export function mediaPanel(actions, state) {
  const section = document.createElement("section"); section.className = "panel media-panel";
  const media = state.media ?? [];
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">YOUR MATERIAL</p><h2>素材</h2></div><span class="badge">${media.length} 个</span></div><p class="muted">选择本次创作的素材，原片会保持完整。</p>`;
  const list = document.createElement("div"); list.className = "media-list";
  for (const [index, item] of media.entries()) { const row = document.createElement("button"); row.type = "button"; row.className = `media-row ${state.selectedAssetId === item.asset_id ? "selected" : ""}`; const identity = document.createElement("strong"); identity.textContent = `${index + 1}. ${item.display_name ?? "素材"}`; row.title = item.asset_id; const location = document.createElement("span"); location.textContent = `${item.location_type === "original" ? "原片" : "代理文件"} · ${item.permission_state === "authorized" ? "已授权" : "已登记"}`; row.append(identity, location); row.addEventListener("click", () => actions.selectAsset(item.asset_id)); list.append(row); }
  if (media.length === 0) { const empty = document.createElement("p"); empty.className = "muted empty"; empty.textContent = "暂无已登记素材。"; list.append(empty); }
  section.append(list); const button = document.createElement("button"); button.className = "primary"; button.textContent = "导入素材"; button.disabled = state.busy || state.status.project === "not-open"; button.addEventListener("click", actions.importMedia); section.append(button); return section;
}
