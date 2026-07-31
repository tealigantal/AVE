export function playerPanel(actions, state) {
  const section = document.createElement("section"); section.className = "panel player-panel";
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">PREVIEW PLAYER</p><h2>视频预览</h2></div><span class="badge">${state.previewUrl ? "已加载" : "未加载"}</span></div>`;
  if (state.previewUrl) { const video = document.createElement("video"); video.controls = true; video.preload = "metadata"; video.src = state.previewUrl; section.append(video); } else { const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "渲染 Preview 后从 Host 加载预览。Renderer 不访问原片路径。"; section.append(empty); }
  const button = document.createElement("button"); button.className = "secondary"; button.textContent = "加载最新 Preview"; button.disabled = state.busy || !state.renderLatest; button.addEventListener("click", actions.loadPreview); section.append(button); return section;
}
