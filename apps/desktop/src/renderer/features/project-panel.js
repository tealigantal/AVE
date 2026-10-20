export function projectPanel(actions, state) {
  const section = document.createElement("section");
  section.className = "panel project-panel";

  const actionsRow = document.createElement("div");
  actionsRow.className = "button-row";
  for (const [label, action, tone, focusKey] of [["新建作品", actions.create, "primary", "create"], ["打开作品", actions.open, "secondary", "open"], ["关闭作品", actions.close, "ghost", "close"]]) {
    const button = document.createElement("button");
    button.textContent = label;
    button.className = tone;
    button.dataset.projectFocusKey = focusKey;
    button.hidden = label === "关闭作品" && state.status.project === "not-open";
    button.disabled = state.busy || (label === "关闭作品" && state.status.project === "not-open");
    button.addEventListener("click", action);
    actionsRow.append(button);
  }
  section.append(actionsRow);
  return section;
}
