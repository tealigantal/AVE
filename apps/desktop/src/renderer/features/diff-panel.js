export function diffPanel(state) {
  const section = document.createElement("section"); section.className = "panel diff-panel";
  const diff = state.timelineDiff;
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">PATCH DIFF</p><h2>Timeline 变化</h2></div><span class="badge">${diff ? `v${diff.from_version ?? "—"} → v${diff.to_version}` : "暂无"}</span></div>`;
  if (!diff) { const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "提交 Timeline 版本后显示 Host 计算的变化。"; section.append(empty); return section; }
  const summary = document.createElement("p"); summary.className = "muted"; summary.textContent = `新增 ${diff.added_clip_ids.length} · 删除 ${diff.removed_clip_ids.length} · 修改 ${diff.changed_clip_ids.length}`; section.append(summary); return section;
}
