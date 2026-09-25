export function playerPanel(actions, state) {
  const section = document.createElement("section"); section.className = "panel player-panel";
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">PREVIEW PLAYER</p><h2>视频预览</h2></div></div>`;
  const caption = document.createElement("p"), video = document.createElement("video"); caption.className = "muted"; video.controls = true; video.preload = "metadata";
  let loaded = "", binding = null;
  const onPlaying = () => { if (binding) actions.markViewed(binding); };
  video.addEventListener("playing",onPlaying); section.append(caption,video);
  function update() {
    if (loaded !== state.previewUrl) { video.pause(); loaded = state.previewUrl; binding = state.previewBinding; if (loaded) video.src = loaded; else { video.removeAttribute("src"); video.load(); } }
    video.hidden = !loaded; caption.textContent = binding ? `当前播放：作品 v${binding.timeline_version}。播放与采用分别记录。` : "在作品与修改中选择渲染版本并加载 Preview。";
  }
  return { node: section,update,destroy() { video.removeEventListener("playing",onPlaying); video.pause(); video.removeAttribute("src"); video.load(); } };
}
