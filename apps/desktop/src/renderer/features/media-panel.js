export function mediaPanel(actions, state) {
  const section = document.createElement("section"); section.className = "panel media-panel";
  const media = state.media ?? [];
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">MEDIA INGESTION</p><h2>素材</h2></div><span class="badge">${media.length} 个</span></div><p class="muted">导入会由 Worker 完成指纹与 Probe，再由 Host 登记原片位置。</p>`;
  const list = document.createElement("div"); list.className = "media-list";
  for (const item of media) { const row = document.createElement("button"); row.type = "button"; row.className = `media-row ${state.selectedAssetId === item.asset_id ? "selected" : ""}`; row.innerHTML = `<strong>${item.asset_id}</strong><span>${item.location_ref}</span>`; row.addEventListener("click", () => actions.selectAsset(item.asset_id)); list.append(row); }
  if (media.length === 0) { const empty = document.createElement("p"); empty.className = "muted empty"; empty.textContent = "暂无已登记素材。"; list.append(empty); }
  section.append(list); const button = document.createElement("button"); button.className = "primary"; button.textContent = "导入素材"; button.disabled = state.busy || state.status.project === "not-open"; button.addEventListener("click", actions.importMedia); section.append(button); return section;
}
