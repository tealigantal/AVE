export function previewPlaceholderText(state) {
  const request=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId);
  if(request?.status==="failed")return ["初稿制作未完成","具体原因保留在本地记录中。你可以在对话中补充要求，修正后继续制作。"];
  if(request?.status==="cancelled"||request?.revoked)return ["本次制作已停止","素材与已保存版本仍保留；你可以查看要求与授权状态。"];
  const phases={admission:["正在核对创作范围","确认本次获准的素材与制作要求。"],"material-preparation":["正在准备素材","初稿制作已开始，准备完成后继续分析画面与声音。"],observation:["正在分析画面与声音","依据获准素材整理内容，完成后继续生成初稿。"],"generation-and-commit":["正在生成与校验初稿","可播放画面就绪后会显示在这里；你仍可在对话中补充要求。"],"preview-master-render":["正在制作可播放画面","作品正在渲染；画面就绪后再切换到播放器。"],"authorized-feedback-learning":["正在整理获准的反馈经验","你仍可查看版本与继续编辑要求。"]};
  if(request?.production&&phases[request.production.phase])return phases[request.production.phase];
  if(request?.drafts.some(draft=>draft.renders.length))return ["选择一个版本开始看片","在版本历史中选择已有作品并点击“观看此版”。观看与采用分别记录。"];
  if(request)return ["创作要求已保存","你可以继续制作初稿，或补充这次作品的要求。"];
  if(state.media?.some(item=>item.location_type==="original"))return ["素材已导入","在对话中告诉 AVE 你想讲的故事，授权后开始制作可播放初稿。"];
  return ["画面将在这里开始","导入素材，告诉 AVE 你想讲的故事。完成后，这里播放你的真实作品。"];
}

export function playerPanel(actions, state) {
  const section = document.createElement("section"); section.className = "panel player-panel";
  section.innerHTML = `<div class="panel-heading"><div><h2>当前作品</h2><span class="badge" data-player-summary></span></div><div class="player-modes"><button type="button" class="ghost active" data-mode="watch">看片</button><button type="button" class="ghost" data-mode="refine">精修</button></div></div>`;
  section.querySelector('[data-mode="watch"]').addEventListener("click",()=>actions.watchMode());section.querySelector('[data-mode="refine"]').addEventListener("click",()=>actions.refineClip());
  const caption = document.createElement("p"), stage=document.createElement("div"), placeholder=document.createElement("div"), loading=document.createElement("span");
  stage.className="player-stage";placeholder.className="player-placeholder";const placeholderTitle=document.createElement("strong"),placeholderBody=document.createElement("span");placeholder.append(placeholderTitle,placeholderBody);
  loading.className="player-loading";loading.hidden=true;caption.className="player-caption";
  let loaded = "", binding = null, generation=0, current=null, pending=null, retiring=null, transition=null;
  const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const onPlaying = () => { if (binding) actions.markViewed(binding); };
  let latestReady=null,dismissedReady=null;
  const readySlot=document.createElement("div"),readyText=document.createElement("span"),readyWatch=document.createElement("button"),readyLater=document.createElement("button");readySlot.className="ready-slot";readyWatch.textContent="查看新版本";readyLater.textContent="稍后";readyWatch.className=readyLater.className="ghost";readyWatch.type=readyLater.type="button";readySlot.append(readyText,readyWatch,readyLater);section.append(readySlot);readyWatch.addEventListener("click",()=>{if(latestReady)actions.watchDraft(latestReady);});readyLater.addEventListener("click",()=>{dismissedReady=latestReady;readySlot.hidden=true;});
  const release=video=>{if(!video)return;video.pause();video.removeEventListener("playing",onPlaying);const url=video.getAttribute("src");video.removeAttribute("src");video.load();video.remove();if(url?.startsWith("blob:"))URL.revokeObjectURL(url);};
  const settleTransition=()=>{const animation=transition;transition=null;if(animation){animation.onfinish=null;animation.oncancel=null;animation.cancel();}release(retiring);retiring=null;};
  const onMotionChange=()=>{if(motion.matches)settleTransition();};motion.addEventListener("change",onMotionChange);
  const reset=()=>{generation++;settleTransition();release(pending);release(current);pending=null;current=null;binding=null;loading.hidden=true;placeholder.hidden=false;};
  const block=document.createElement("div"),controls=document.createElement("div");block.className="video-block";controls.className="video-controls";
  controls.innerHTML=`<button type="button" class="ghost" aria-label="播放作品">▶</button><span class="playback-time">0:00 / 0:00</span><input type="range" min="0" max="1" step="0.01" value="0" aria-label="播放进度"><button type="button" class="ghost" aria-label="静音">声音</button><input type="range" min="0" max="1" step="0.05" value="1" aria-label="播放音量"><button type="button" class="ghost" aria-label="全屏看片">全屏</button>`;
  const play=controls.querySelector('[aria-label="播放作品"]'),seek=controls.querySelector('[aria-label="播放进度"]'),mute=controls.querySelector('[aria-label="静音"]'),volume=controls.querySelector('[aria-label="播放音量"]'),fullscreen=controls.querySelector('[aria-label="全屏看片"]'),clock=controls.querySelector('.playback-time');
  const format=value=>{const seconds=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;};
  const syncControls=()=>{const available=current&&current.readyState>=2;play.disabled=!available;seek.disabled=!available||!Number.isFinite(current.duration);mute.disabled=volume.disabled=!available;play.textContent=current&&!current.paused?"Ⅱ":"▶";play.setAttribute("aria-label",current&&!current.paused?"暂停作品":"播放作品");clock.textContent=`${format(current?.currentTime)} / ${format(current?.duration)}`;seek.max=String(Number.isFinite(current?.duration)?current.duration:1);seek.value=String(current?.currentTime??0);mute.textContent=current?.muted?"静音":"声音";mute.setAttribute("aria-label",current?.muted?"取消静音":"静音");volume.value=String(current?.volume??1);};
  const togglePlay=()=>{if(!current)return;if(current.paused)void current.play().catch(error=>{loading.textContent=`无法播放：${error.message}`;loading.hidden=false;});else current.pause();};
  play.addEventListener("click",togglePlay);seek.addEventListener("input",()=>{if(current&&Number.isFinite(current.duration))current.currentTime=Number(seek.value);});mute.addEventListener("click",()=>{if(current){current.muted=!current.muted;syncControls();}});volume.addEventListener("input",()=>{if(current){current.volume=Number(volume.value);syncControls();}});fullscreen.addEventListener("click",()=>{const task=document.fullscreenElement?document.exitFullscreen():block.requestFullscreen();void task.catch(error=>{loading.textContent=`无法进入全屏：${error.message}`;loading.hidden=false;});});
  stage.append(placeholder,loading);block.append(stage,controls);section.append(block,caption);syncControls();
  function update() {
    const [title,description]=previewPlaceholderText(state);placeholderTitle.textContent=title;placeholderBody.textContent=description;
    if (loaded !== state.previewUrl) {
      loaded = state.previewUrl;
      if(!loaded) reset();
      else {
        const ticket=++generation,nextBinding=state.previewBinding,video=document.createElement("video");
        settleTransition();release(pending);pending=video;video.controls=false;video.tabIndex=0;video.preload="auto";video.hidden=true;video.setAttribute("aria-label",`作品 v${nextBinding.timeline_version} 预览`);loading.textContent="正在准备画面…";loading.hidden=false;
        video.addEventListener("keydown",event=>{if(event.key===" "&&video===current){event.preventDefault();togglePlay();}});
        for(const type of ["timeupdate","durationchange","play","pause","ended","volumechange"])video.addEventListener(type,()=>{if(video===current)syncControls();});
        video.addEventListener("loadeddata",()=>{
          if(ticket!==generation)return;
          settleTransition();retiring=current;if(current){video.volume=current.volume;video.muted=current.muted;}current=video;pending=null;binding=nextBinding;
          if(retiring){retiring.pause();retiring.controls=false;retiring.inert=true;retiring.setAttribute("aria-hidden","true");}
          video.hidden=false;placeholder.hidden=true;loading.hidden=true;caption.textContent=`正在观看 v${binding.timeline_version} · 观看与采用分别记录`;
          if(retiring&&!motion.matches){const animation=video.animate([{opacity:0},{opacity:1}],{duration:180,easing:"cubic-bezier(.22,1,.36,1)"});transition=animation;animation.onfinish=()=>{if(transition===animation)settleTransition();};animation.oncancel=()=>{if(transition===animation)settleTransition();};}
          else settleTransition();
          actions.previewReady(binding,loaded);
          syncControls();
        },{once:true});
        video.addEventListener("error",()=>{if(ticket!==generation)return;loading.hidden=false;loading.textContent="画面载入失败，当前可用版本保持不变。";release(pending);pending=null;},{once:true});
        video.addEventListener("playing",onPlaying);stage.append(video);video.src=loaded;
      }
    }
    if(!binding) caption.textContent="初稿完成后可观看、比较，再决定采用。";
    const shown=state.displayedPreviewTimeline??state.timeline,clips=(shown?.tracks??[]).filter(track=>track.kind==="video").flatMap(track=>track.clips);section.querySelector("h2").textContent=`作品 v${binding?.timeline_version??shown?.version??0}`;section.querySelector("[data-player-summary]").textContent=`${clips.length} 个镜头 · ${binding?"实际预览":"等待画面"}`;syncControls();
    const request=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId),latest=request?.drafts.find(item=>item.draft_id===request.latest_draft_id);latestReady=latest?.renders.some(item=>item.preview.qc.status==="passed")?latest.draft_id:null;readySlot.hidden=!latestReady||latestReady===binding?.draft_id||latestReady===dismissedReady;readyText.textContent=latestReady?`新版本 v${latest.timeline_version} 已就绪，当前观看保持不变。`:"";readyWatch.disabled=Boolean(state.pending?.has("preview"));
  }
  return { node: section,update,reuseReadyPreview(candidate) {
    const keys=["project_id","request_id","draft_id","render_id","output_hash","timeline_version"];
    if(!current||current.readyState<2||current.error||!binding||!keys.every(key=>candidate?.[key]!==undefined&&candidate[key]===binding[key]))return null;
    // A watch of the actual displayed identity is navigation, not a reload.
    // Cancel a different decoded-in-flight candidate without touching this URL.
    if(pending){generation++;release(pending);pending=null;}
    settleTransition();loaded=current.getAttribute("src");loading.hidden=true;
    return {binding,url:loaded};
  },destroy() { loaded="";motion.removeEventListener("change",onMotionChange);reset(); } };
}

/** Media seconds are UI only; source identity and range matching use exact ticks. */
export function alignedPreviewSeconds(fromTimeline,toTimeline,currentSeconds) {
  if(!Number.isFinite(currentSeconds)||currentSeconds<0)throw new Error("播放器位置无效");
  const base=fromTimeline?.sequence?.timebase,targetBase=toTimeline?.sequence?.timebase;
  if(!base||!targetBase||base.value<=0n||base.timescale<=0n||targetBase.value<=0n||targetBase.timescale<=0n)throw new Error("版本缺少精确时间基");
  const tick=BigInt(Math.floor(currentSeconds*Number(base.timescale)/Number(base.value)));
  const clips=timeline=>timeline.tracks.filter(track=>track.kind==="video"&&track.enabled!==false).flatMap(track=>track.clips);
  const source=clips(fromTimeline).find(clip=>tick>=clip.timeline_start&&tick<clip.timeline_start+clip.timeline_duration);
  if(!source)return null;
  const sourceWidth=source.source.end_pts-source.source.start_pts,duration=source.timeline_duration;
  if(sourceWidth<=0n||duration<=0n||source.source.timescale<=0n)throw new Error("版本包含无效源片范围");
  const numerator=source.source.start_pts*duration+(tick-source.timeline_start)*sourceWidth,denominator=duration*source.source.timescale;
  const matches=clips(toTimeline).filter(clip=>clip.source.asset_id===source.source.asset_id&&numerator*clip.source.timescale>=clip.source.start_pts*denominator&&numerator*clip.source.timescale<clip.source.end_pts*denominator);
  // A repeated source range is ambiguous without editorial lineage; never guess.
  if(matches.length!==1)return null;
  const target=matches[0],width=target.source.end_pts-target.source.start_pts;
  const offset=numerator*target.source.timescale-target.source.start_pts*denominator;
  const tickNumerator=target.timeline_start*denominator*width+offset*target.timeline_duration,tickDenominator=denominator*width;
  return Number(tickNumerator*targetBase.value)/Number(tickDenominator*targetBase.timescale);
}
