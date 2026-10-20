import { reportError } from "../components/error-dialog.js";
// Keep pure work-player helpers importable without constructing a browser API.
const query = (...args) => import("../api/project-api.js").then(api => api.query(...args));
const command = (...args) => import("../api/project-api.js").then(api => api.command(...args));

/** Browsing coordinates are never passed to Timeline or precision controls. */
export function sourcePlayer(actions, state) {
  const node = document.createElement("section"); node.className = "source-player"; node.hidden = true;
  const heading = document.createElement("div"), title = document.createElement("h2"), back = document.createElement("button"), status = document.createElement("p"), stage = document.createElement("div"), retry = document.createElement("button"), note = document.createElement("p");
  heading.className = "panel-heading"; back.type = retry.type = "button"; back.textContent = "返回作品"; retry.textContent = "重新准备素材"; note.className = "muted"; note.textContent = "素材浏览 · 播放位置仅供浏览，精修需核验原片时间。";
  stage.className = "source-player-stage"; heading.append(title, back); node.append(heading, status, stage, retry, note);
  back.onclick = () => actions.returnToWork();
  let key = "", generation = 0, operation = null, media = null, savedProject = "", disposed = false; const urls = [], releases = new Set();
  const release = () => {
    generation++;
    if (media && media.tagName !== "IMG") { media.pause(); media.removeAttribute("src"); media.load(); }
    media = null; stage.replaceChildren();
    for (const url of urls) URL.revokeObjectURL(url); urls.length = 0;
    const previous = operation; operation = null;
    if (previous) {
      const task = command("project.media.browse.release", previous.project, { operation_id: previous.id }).then(result => { if (!result.ok) throw new Error(result.error.message); });
      releases.add(task);
      void task.then(() => releases.delete(task), error => { releases.delete(task); reportError(error); state.notice = `素材浏览释放失败：${error.message}`; });
    }
    return Promise.all([...releases]);
  };
  const prepare = async () => {
    const released = release(), ticket = generation, project = savedProject, asset = state.selectedAssetId, id = crypto.randomUUID(); retry.hidden = true; status.textContent = "正在准备完整素材…";
    const current = () => !disposed && ticket === generation && state.status.project === project && state.selectedAssetId === asset && state.sourceBrowsing && state.materialOpen && ["assets","precision"].includes(state.workspacePage);
    try {
      await released;
      if (!current()) return;
      operation = { id, project };
      const result = await query("project.media.browse", project, { asset_id: asset, operation_id: id });
      if (!current()) return;
      if (!result.ok) throw new Error(result.error.message);
      const value = result.data;
      if (value.asset_id !== asset || value.time_mapping !== "blocked" || !["image", "video", "audio"].includes(value.kind)) throw new Error("素材播放身份无效");
      media = document.createElement(value.kind === "image" ? "img" : value.kind);
      media.setAttribute("aria-label", "当前素材浏览");
      media.addEventListener("error", () => { if (current()) { status.textContent = "素材播放失败，请重新准备。"; retry.hidden = false; if (media?.tagName !== "IMG") media?.pause(); reportError(status.textContent); void command("project.media.browse.report", project, { reference: value.reference, error_code: media?.error?.code ?? 0 }).then(result => { if (!result.ok) throw new Error(result.error.message); }).catch(error => { if (current()) { status.textContent += ` 播放故障登记失败：${error.message}`; reportError(error); } }); } });
      if (value.kind === "image") {
        media.alt = title.textContent;
        const zoom = document.createElement("input"), reset = document.createElement("button"); zoom.type = "range"; zoom.min = "0.25"; zoom.max = "4"; zoom.step = "0.05"; zoom.value = "1"; zoom.setAttribute("aria-label", "图片缩放"); reset.textContent = "恢复图片大小"; reset.type = "button";
        const scale = () => { if (media) media.style.transform = `scale(${zoom.value})`; }; zoom.oninput = scale; reset.onclick = () => { zoom.value = "1"; scale(); }; stage.append(zoom, reset);
      } else { media.controls = true; media.preload = "metadata"; }
      const fullscreen = document.createElement("button"); fullscreen.type = "button"; fullscreen.textContent = "全屏浏览"; fullscreen.onclick = () => { void (document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen()).catch(error => { status.textContent = error.message; reportError(error); }); };
      stage.append(media, fullscreen); media.src = value.url;
      status.textContent = value.kind === "image" ? "图片已准备" : value.audio_status === "present" ? "完整素材已准备 · 包含声音" : "完整视频已准备 · 原片无音轨";
      if (value.waveform_error) status.textContent += " · 波形准备失败，播放仍可用";
      retry.hidden = true;
      if (value.audio_status === "present") {
        void query("project.media.browse.waveform", project, { reference: value.reference }).then(result => {
          if (!current()) return;
          if (!result.ok || result.data.error) { status.textContent += " · 波形准备失败，播放仍可用"; return; }
          if (result.data.bytes) { const image = document.createElement("img"), url = URL.createObjectURL(new Blob([new Uint8Array(result.data.bytes.data ?? result.data.bytes)], { type: "image/png" })); urls.push(url); image.src = url; image.alt = "素材浏览波形（不可用作精修时间）"; stage.append(image); }
        }).catch(error => { if (current()) { status.textContent += " · 波形准备失败，播放仍可用"; reportError(error); } });
      }
    } catch (error) { if (current()) { status.textContent = `素材准备失败：${error.message}`; retry.hidden = false; reportError(error); } }
  };
  retry.onclick = () => { void prepare(); };
  return { node, update() {
    const active = Boolean(state.sourceBrowsing && state.selectedAssetId && state.materialOpen && ["assets","precision"].includes(state.workspacePage) && state.status.project !== "not-open");
    node.hidden = !active;
    const next = active ? JSON.stringify([state.status.project, state.selectedAssetId]) : "";
    if (next === key) return;
    key = next; savedProject = state.status.project;
    if (active) { title.textContent = `素材 · ${state.media.find(item => item.asset_id === state.selectedAssetId)?.display_name ?? "当前素材"}`; void prepare(); }
    else void release().catch(error => { state.notice = `素材浏览释放失败：${error.message}`; reportError(error); });
  }, destroy() { disposed = true; void release().catch(error => { state.notice = `素材浏览释放失败：${error.message}`; reportError(error); }); } };
}
