export function timelinePanel(actions, state) {
  const section = document.createElement("section");
  section.className = "panel timeline-panel";
  const timeline = state.timeline;
  const tracks = timeline?.tracks ?? [];
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">TIMELINE</p><h2>时间线</h2></div><span class="badge">${state.status.timeline}</span></div><div class="timeline-summary"><strong>${tracks.length}</strong><span>条轨道 · Host 版本 ${timeline?.version ?? "—"}</span></div><p class="muted">Add / Move / Trim / Undo / Redo 通过 Host Command/Commit 执行。</p>`;
  const row = document.createElement("div"); row.className = "button-row";
  for (const [label, action] of [["初始化视频轨", actions.initialize], ["添加素材首段", actions.add], ["移动选中片段", actions.move], ["修剪选中片段", actions.trim], ["刷新状态", actions.refresh], ["Undo", actions.undo], ["Redo", actions.redo]]) { const button = document.createElement("button"); button.textContent = label; button.className = label === "刷新状态" ? "secondary" : "ghost"; button.disabled = state.busy || (label !== "初始化视频轨" && !timeline) || ((label === "添加素材首段" || label === "移动选中片段" || label === "修剪选中片段") && !(timeline?.tracks?.some((track) => track.clips?.length) || state.media?.length)); button.addEventListener("click", action); row.append(button); }
  section.append(row); return section;
}
