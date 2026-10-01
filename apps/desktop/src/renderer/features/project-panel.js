export function projectPanel(actions, state) {
  const section = document.createElement("section");
  section.className = "panel project-panel";

  const actionsRow = document.createElement("div");
  actionsRow.className = "button-row";
  for (const [label, action, tone] of [["新建作品", actions.create, "primary"], ["打开作品", actions.open, "secondary"], ["关闭作品", actions.close, "ghost"]]) { const button = document.createElement("button"); button.textContent = label; button.className = tone; button.hidden = label === "关闭作品" && state.status.project === "not-open"; button.disabled = state.busy || (label === "关闭作品" && state.status.project === "not-open"); button.addEventListener("click", action); actionsRow.append(button); }
  section.append(actionsRow);
  return section;
}
