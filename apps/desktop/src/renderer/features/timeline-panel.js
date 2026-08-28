export function timelinePanel(actions, state) {
  const section = document.createElement("section");
  section.className = "panel timeline-panel";
  const timeline = state.timeline;
  const tracks = timeline?.tracks ?? [];
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">STAGE 2 TIMELINE</p><h2>素材参考与生成输出</h2></div><span class="badge">${state.status.timeline}</span></div><div class="timeline-summary"><strong>${tracks.length}</strong><span>条轨道 · Host 版本 ${timeline?.version ?? "—"}</span></div><p class="muted">手工 Add / Move / Trim 仅作用于禁用的 video-reference；video-main 只接收 Host 执行的一剪结果。</p>`;
  const row = document.createElement("div"); row.className = "button-row";
  for (const [label, action] of [["添加素材首段", actions.add], ["移动参考片段", actions.move], ["修剪参考片段", actions.trim], ["刷新状态", actions.refresh]]) { const button = document.createElement("button"); button.textContent = label; button.className = label === "刷新状态" ? "secondary" : "ghost"; button.disabled = state.busy || !timeline || ((label === "添加素材首段" || label === "移动参考片段" || label === "修剪参考片段") && !(timeline?.tracks?.some((track) => track.track_id === "video-reference" && track.clips?.length) || state.media?.length)); button.addEventListener("click", action); row.append(button); }
  section.append(row); return section;
}
