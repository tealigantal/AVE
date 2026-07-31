export function projectPanel(actions, state) {
  const section = document.createElement("section");
  section.className = "panel project-panel";
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">PROJECT HOST</p><h2>项目</h2></div><span class="badge">${state.status.project === "not-open" ? "未打开" : "已连接"}</span></div><p class="muted">权威状态来自 Project Host，Renderer 只负责展示和发起命令。</p>`;
  const actionsRow = document.createElement("div");
  actionsRow.className = "button-row";
  for (const [label, action, tone] of [["新建项目", actions.create, "primary"], ["打开项目", actions.open, "secondary"], ["关闭项目", actions.close, "ghost"]]) { const button = document.createElement("button"); button.textContent = label; button.className = tone; button.disabled = state.busy || (label === "关闭项目" && state.status.project === "not-open"); button.addEventListener("click", action); actionsRow.append(button); }
  section.append(actionsRow);
  return section;
}
