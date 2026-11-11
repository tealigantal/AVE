import { reportError } from "../components/error-dialog.js";
import { sourcePlayer } from "./source-player.js";
import { createPreviewTimelineAnnotation, previewPointAtClientPoint, timelineTickAtMediaTime } from "./timeline-annotation-queue.js";
import { renderProgress, failureFacts } from "./creation-progress.js";
export function editablePreviewSeekTick(state, binding, seconds) {
  if (!binding || state.status?.project !== binding.project_id || state.selectedRequestId !== binding.request_id || state.selectedDraftId !== binding.draft_id || !state.authorityCurrent || state.sourceBrowsing || state.pending?.has("preview") || state.pending?.has("timeline-edit") || state.previewBinding !== binding || state.displayedPreviewBinding !== binding || !state.previewUrl || state.previewUrl !== state.displayedPreviewUrl || state.timeline?.version !== binding.timeline_version || state.displayedPreviewTimeline?.version !== binding.timeline_version || state.workspace?.timeline_version !== binding.timeline_version) return null;
  const request=state.workspace.requests.find(item=>item.authorization.request_id===binding.request_id),draft=request?.drafts.find(item=>item.draft_id===binding.draft_id),render=draft?.renders.find(item=>item.render_id===binding.render_id);
  if (draft?.timeline_version!==binding.timeline_version || !render || render.preview?.output_hash!==binding.output_hash) return null;
  return timelineTickAtMediaTime(seconds,state.timeline.sequence?.timebase);
}
export function previewPlaceholderText(state) {
  const request=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId);
  if(request?.status==="failed"&&!request.production)return ["初稿制作未完成",request.failure?.message || "这次制作未完成，暂时没有更详细的原因；你可以检查素材和服务后再决定是否继续制作。"];
  if(request?.status==="cancelled"||request?.revoked)return ["本次制作已停止","素材与已保存版本仍保留；你可以查看要求与授权状态。"];
  const phases={admission:["正在核对创作范围","确认本次获准的素材与制作要求。"],"material-preparation":["正在准备素材","初稿制作已开始，准备完成后继续分析画面与声音。"],observation:["正在分析画面与声音","依据获准素材整理内容，完成后继续生成初稿。"],"generation-and-commit":["正在生成与校验初稿","可播放画面就绪后会显示在这里；你仍可在对话中补充要求。"],"preview-master-render":["正在制作可播放画面","作品正在渲染；画面就绪后再切换到播放器。"],"authorized-feedback-learning":["正在整理获准的反馈经验","你仍可查看版本与继续编辑要求。"]};
  if(request?.production&&phases[request.production.phase]){const progress=renderProgress(request.production);return progress?["正在制作可播放画面",progress.label+"，完成后还需进行质量检查。"]:phases[request.production.phase];}
  if(request?.drafts.some(draft=>draft.renders.length))return ["选择一个版本开始看片","在版本历史中选择已有作品并点击“观看此版”。观看与采用分别记录。"];
  if(request)return ["创作要求已保存","你可以继续制作初稿，或补充这次作品的要求。"];
  if(state.media?.some(item=>item.location_type==="original"))return ["素材已导入","在对话中告诉 AVE 你想讲的故事，授权后开始制作可播放初稿。"];
  return ["画面将在这里开始","导入素材，告诉 AVE 你想讲的故事。完成后，这里播放你的真实作品。"];
}

export function playerPanel(actions, state) {
  const section = document.createElement("section"); section.className = "panel player-panel";
  const source = sourcePlayer(actions, state);
  let browsing = false, savedWatch = null;
  section.innerHTML = `<div class="panel-heading"><div><h2>当前作品</h2><span class="badge" data-player-summary></span></div><div class="player-modes"><button type="button" class="ghost active" data-mode="watch">看片</button><button type="button" class="ghost" data-mode="refine">精修</button></div></div>`;
  section.querySelector('[data-mode="watch"]').addEventListener("click",()=>actions.watchMode());section.querySelector('[data-mode="refine"]').addEventListener("click",()=>actions.refineClip());
  const caption = document.createElement("p"), stage=document.createElement("div"), placeholder=document.createElement("div"), loading=document.createElement("span"),captionLayer=document.createElement("div"),previewAnnotationLayer=document.createElement("div");
  stage.className="player-stage";placeholder.className="player-placeholder";const placeholderTitle=document.createElement("strong"),placeholderBody=document.createElement("span"),failureToggle=document.createElement("button"),failureDetails=document.createElement("span");failureToggle.type="button";failureToggle.className="ghost";failureToggle.textContent="查看失败详情";failureToggle.setAttribute("aria-expanded","false");failureToggle.hidden=true;failureDetails.hidden=true;failureDetails.className="render-failure-details";failureToggle.addEventListener("click",()=>{failureDetails.hidden=!failureDetails.hidden;failureToggle.setAttribute("aria-expanded",String(!failureDetails.hidden));failureToggle.textContent=failureDetails.hidden?"查看失败详情":"收起失败详情";});placeholder.append(placeholderTitle,placeholderBody,failureToggle,failureDetails);
  loading.className="player-loading";loading.hidden=true;caption.className="player-caption";captionLayer.className="player-caption-hit-layer";captionLayer.setAttribute("aria-label","选择当前实际预览中的字幕或文字");captionLayer.hidden=true;
  previewAnnotationLayer.className="player-preview-annotation-layer";previewAnnotationLayer.setAttribute("aria-label","当前预览画面的批注位置");previewAnnotationLayer.hidden=true;
  let loaded = "", binding = null, generation=0, current=null, pending=null, retiring=null, transition=null, failureIdentity="";
  const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
  const onPlaying = () => { if (binding) actions.markViewed(binding); };
  let latestReady=null,dismissedReady=null;
  const readySlot=document.createElement("div"),readyText=document.createElement("span"),readyWatch=document.createElement("button"),readyLater=document.createElement("button");readySlot.className="ready-slot";readyWatch.textContent="查看新版本";readyLater.textContent="稍后";readyWatch.className=readyLater.className="ghost";readyWatch.type=readyLater.type="button";readySlot.append(readyText,readyWatch,readyLater);section.append(readySlot);readyWatch.addEventListener("click",()=>{if(latestReady)actions.watchDraft(latestReady);});readyLater.addEventListener("click",()=>{dismissedReady=latestReady;readySlot.hidden=true;});
  const release=video=>{if(!video)return;video.pause();video.removeEventListener("playing",onPlaying);const url=video.getAttribute("src");video.removeAttribute("src");video.load();video.remove();if(url?.startsWith("blob:"))URL.revokeObjectURL(url);};
  const settleTransition=()=>{const animation=transition;transition=null;if(animation){animation.onfinish=null;animation.oncancel=null;animation.cancel();}release(retiring);retiring=null;};
  const onMotionChange=()=>{if(motion.matches)settleTransition();};motion.addEventListener("change",onMotionChange);
  const reset=()=>{generation++;settleTransition();release(pending);release(current);pending=null;current=null;binding=null;captionLayer.replaceChildren();captionLayer.hidden=true;captionSignature="";previewAnnotationLayer.replaceChildren();previewAnnotationLayer.hidden=true;closePreviewAnnotationMenu();loading.hidden=true;placeholder.hidden=false;};
  const block=document.createElement("div"),controls=document.createElement("div");block.className="video-block";controls.className="video-controls";
  controls.innerHTML=`<button type="button" class="ghost" aria-label="播放作品">▶</button><span class="playback-time">0:00 / 0:00</span><input type="range" min="0" max="1" step="0.01" value="0" aria-label="播放进度"><button type="button" class="ghost" aria-label="静音">声音</button><input type="range" min="0" max="1" step="0.05" value="1" aria-label="播放音量"><button type="button" class="ghost" aria-label="全屏看片">全屏</button>`;
  const play=controls.querySelector('[aria-label="播放作品"]'),seek=controls.querySelector('[aria-label="播放进度"]'),mute=controls.querySelector('[aria-label="静音"]'),volume=controls.querySelector('[aria-label="播放音量"]'),fullscreen=controls.querySelector('[aria-label="全屏看片"]'),clock=controls.querySelector('.playback-time');
  const format=value=>{const seconds=Number.isFinite(value)?Math.max(0,Math.floor(value)):0;return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;};
  const syncControls=()=>{const available=current&&current.readyState>=2;play.disabled=!available;seek.disabled=!available||!Number.isFinite(current.duration);mute.disabled=volume.disabled=!available;play.textContent=current&&!current.paused?"Ⅱ":"▶";play.setAttribute("aria-label",current&&!current.paused?"暂停作品":"播放作品");clock.textContent=`${format(current?.currentTime)} / ${format(current?.duration)}`;seek.max=String(Number.isFinite(current?.duration)?current.duration:1);seek.value=String(current?.currentTime??0);mute.textContent=current?.muted?"静音":"声音";mute.setAttribute("aria-label",current?.muted?"取消静音":"静音");volume.value=String(current?.volume??1);};
  const togglePlay=()=>{if(!current)return false;if(current.paused)void current.play().catch(error=>{reportError(error);loading.textContent=`无法播放：${error.message}`;loading.hidden=false;});else current.pause();return true;};
  play.addEventListener("click",togglePlay);seek.addEventListener("input",()=>{const value=Number(seek.value);if(current&&Number.isFinite(current.duration)&&Number.isFinite(value)&&value>=0&&value<=current.duration){current.currentTime=value;if(!browsing&&editablePreviewSeekTick(state,binding,value)!==null)actions.previewSeek?.(binding,value);}});mute.addEventListener("click",()=>{if(current){current.muted=!current.muted;syncControls();}});volume.addEventListener("input",()=>{if(current){current.volume=Number(volume.value);syncControls();}});fullscreen.addEventListener("click",()=>{const task=document.fullscreenElement?document.exitFullscreen():block.requestFullscreen();void task.catch(error=>{reportError(error);loading.textContent=`无法进入全屏：${error.message}`;loading.hidden=false;});});
  const renderStatus=document.createElement("div"),renderStatusText=document.createElement("span"),renderStatusBar=document.createElement("progress");renderStatus.className="render-progress";renderStatus.setAttribute("role","status");renderStatusBar.max=1;renderStatusBar.setAttribute("aria-label","当前渲染进度");renderStatus.append(renderStatusText,renderStatusBar);renderStatus.hidden=true;
  stage.append(placeholder,loading,captionLayer,previewAnnotationLayer);block.append(stage,controls);section.append(source.node,renderStatus,block,caption);syncControls();
  const previewAnnotationMenu=document.createElement("div"),addPreviewAnnotation=document.createElement("button");previewAnnotationMenu.className="p4-preview-context-menu";previewAnnotationMenu.hidden=true;previewAnnotationMenu.setAttribute("role","menu");addPreviewAnnotation.type="button";addPreviewAnnotation.setAttribute("role","menuitem");addPreviewAnnotation.textContent="添加画面批注";previewAnnotationMenu.append(addPreviewAnnotation);section.append(previewAnnotationMenu);
  let previewAnnotationDraft=null;
  const closePreviewAnnotationMenu=()=>{previewAnnotationMenu.hidden=true;previewAnnotationDraft=null;};
  const dismissPreviewAnnotationMenu=event=>{if(!previewAnnotationMenu.contains(event.target))closePreviewAnnotationMenu();};
  document.addEventListener("pointerdown",dismissPreviewAnnotationMenu);
  previewAnnotationMenu.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();closePreviewAnnotationMenu();}});
  addPreviewAnnotation.addEventListener("click",()=>{const annotation=previewAnnotationDraft;if(!annotation)return;closePreviewAnnotationMenu();try{actions.queueTimelineAnnotation?.(annotation);}catch(error){reportError(error);}});
  let captionSignature="",dismissedCaptionId="";
  const updateCaptionEditor=()=>{
    const previewBinding=state.displayedPreviewBinding,timeline=state.displayedPreviewTimeline;
    if(browsing||!current||!binding||!previewBinding||!timeline||binding.render_id!==previewBinding.render_id||binding.output_hash!==previewBinding.output_hash||timeline.version!==binding.timeline_version||state.timeline?.version!==timeline.version||!state.authorityCurrent||state.pending?.has("timeline-edit")||!current.videoWidth||!current.videoHeight){if(!captionLayer.hidden||captionSignature){captionLayer.replaceChildren();captionLayer.hidden=true;captionSignature="";}return;}
    const timebase=timeline.sequence?.timebase;if(!timebase||timebase.value<=0n||timebase.timescale<=0n)return;
    const tickValue=current.currentTime*Number(timebase.timescale)/Number(timebase.value);if(!Number.isFinite(tickValue)||tickValue>Number.MAX_SAFE_INTEGER)return;
    const tick=BigInt(Math.floor(tickValue)),active=[];for(const track of timeline.tracks??[])for(const item of track.captions??[])if(tick>=item.timeline_start&&tick<item.timeline_start+item.timeline_duration)active.push({track,caption:item});
    const selected=state.selectedCaption?.timeline_version===timeline.version?state.selectedCaption:null,key=JSON.stringify([binding.timeline_version,active.map(item=>[item.track.track_id,item.caption.caption_id]),selected?.caption_id,dismissedCaptionId,stage.clientWidth,stage.clientHeight]);
    captionLayer.hidden=!active.length;if(key===captionSignature)return;captionSignature=key;captionLayer.replaceChildren();if(!active.length)return;
    const fit=Math.min(stage.clientWidth/current.videoWidth,stage.clientHeight/current.videoHeight),contentWidth=current.videoWidth*fit,contentHeight=current.videoHeight*fit,left=(stage.clientWidth-contentWidth)/2,top=(stage.clientHeight-contentHeight)/2;
    for(const {track,caption:item} of active){
      const button=document.createElement("button");button.type="button";button.className="player-caption-hit-target";button.textContent=item.text;button.setAttribute("aria-label",`编辑实际预览字幕：${item.text}`);button.title="选择实际字幕后可直接输入修改；Enter 或离开时保存，Escape 还原";button.disabled=Boolean(state.pending?.has("timeline-edit"));
      const y=Number(item.style?.safe_y_ratio??0.78),height=Math.max(28,contentHeight*Number(item.style?.font_size_ratio??0.045)*1.8);button.style.left=`${left+contentWidth*.04}px`;button.style.top=`${top+contentHeight*y-height/2}px`;button.style.width=`${contentWidth*.92}px`;button.style.height=`${height}px`;
      const isSelected=selected?.track_id===track.track_id&&selected?.caption_id===item.caption_id,captionFamily=item.style?.font_family??"system",fontUsableInCurrentWorker=["system","serif"].includes(captionFamily);button.classList.toggle("selected",isSelected);
      if(isSelected&&!fontUsableInCurrentWorker)button.title="当前运行环境不支持此字体。请先在右侧属性面板切换为系统字体或宋体，再直接编辑文字。";
      button.addEventListener("click",event=>{event.stopPropagation();dismissedCaptionId="";actions.selectCaption?.(track,item,timeline.version);});
      if(isSelected&&fontUsableInCurrentWorker&&dismissedCaptionId!==item.caption_id){
        const editor=document.createElement("input");editor.type="text";editor.className="player-caption-inline-editor";editor.value=item.text;editor.setAttribute("aria-label",`直接编辑${item.style?.workbench_kind==="text"?"文字":"字幕"}`);editor.style.fontFamily=captionFamily==="serif"?"serif":"system-ui";editor.style.fontSize=`${Math.max(12,contentHeight*Number(item.style?.font_size_ratio??0.045))}px`;editor.style.color=item.style?.font_color??"#ffffff";editor.style.fontWeight=item.style?.bold?"700":"400";let finished=false;
        const finish=(commit)=>{if(finished)return;finished=true;dismissedCaptionId=item.caption_id;editor.removeEventListener("blur",onBlur);if(commit&&editor.value.trim()&&editor.value!==item.text)actions.updateTimelineCaption?.(track.track_id,item.caption_id,{text:editor.value});else if(commit&&!editor.value.trim()){editor.value=item.text;reportError(new Error("文字/字幕内容不能为空，已恢复上次保存的文本"));}captionSignature="";queueMicrotask(updateCaptionEditor);};
        const onBlur=()=>finish(true);editor.addEventListener("click",event=>event.stopPropagation());editor.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();finish(true);editor.blur();}else if(event.key==="Escape"){event.preventDefault();editor.value=item.text;finish(false);editor.blur();}});editor.addEventListener("blur",onBlur,{once:true});button.replaceChildren(editor);captionLayer.append(button);editor.focus({preventScroll:true});editor.select();
      }else captionLayer.append(button);
    }
  };
  const updatePreviewAnnotationMarkers=()=>{
    const timeline=state.displayedPreviewTimeline,previewBinding=state.displayedPreviewBinding,timebase=timeline?.sequence?.timebase;
    if(browsing||!current||!binding||!previewBinding||binding.render_id!==previewBinding.render_id||binding.output_hash!==previewBinding.output_hash||!timeline||timeline.version!==binding.timeline_version||state.timeline?.version!==timeline.version||!state.authorityCurrent||state.pending?.has("timeline-edit")||!current.videoWidth||!current.videoHeight||!timebase){previewAnnotationLayer.replaceChildren();previewAnnotationLayer.hidden=true;return;}
    const tick=timelineTickAtMediaTime(current.currentTime,timebase),items=actions.timelineAnnotationSnapshot?.()??[];
    if(tick===null){previewAnnotationLayer.replaceChildren();previewAnnotationLayer.hidden=true;return;}
    const fit=Math.min(stage.clientWidth/current.videoWidth,stage.clientHeight/current.videoHeight),contentWidth=current.videoWidth*fit,contentHeight=current.videoHeight*fit,left=(stage.clientWidth-contentWidth)/2,top=(stage.clientHeight-contentHeight)/2;
    const markers=[];
    for(const [index,item] of items.entries()){
      const anchor=item.anchor,point=anchor?.preview_point,resolution=item.anchor_resolution;
      if(anchor?.surface!=="preview"||!point)continue;
      let startTick=null;
      if(resolution&&["current","mapped"].includes(resolution.status)&&resolution.timeline_version===timeline.version&&resolution.start_ticks!==null)startTick=BigInt(resolution.start_ticks);
      else if(!resolution){const start=anchor.start,denominator=BigInt(start.timescale)*timebase.value,numerator=BigInt(start.value)*timebase.timescale;if(denominator>0n&&numerator%denominator===0n)startTick=numerator/denominator;}
      if(startTick!==tick)continue;
      const marker=document.createElement("span");marker.className="player-preview-annotation-marker";marker.textContent=String(index+1);marker.style.left=`${left+contentWidth*point.x}px`;marker.style.top=`${top+contentHeight*point.y}px`;marker.title=item.body||"待补充的画面批注";marker.setAttribute("aria-label",`批注 ${index+1}：${marker.title}`);markers.push(marker);
    }
    previewAnnotationLayer.replaceChildren(...markers);previewAnnotationLayer.hidden=markers.length===0;
  };
  const openPreviewAnnotationMenu=event=>{
    if(event.button!==2&&event.type!=="contextmenu")return;
    event.preventDefault();closePreviewAnnotationMenu();
    const timeline=state.displayedPreviewTimeline,previewBinding=state.displayedPreviewBinding,timebase=timeline?.sequence?.timebase,request=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId),draft=request?.drafts.find(item=>item.draft_id===state.selectedDraftId);
    if(!["creation","precision"].includes(state.workspacePage)||!current||!binding||!previewBinding||binding.render_id!==previewBinding.render_id||binding.output_hash!==previewBinding.output_hash||!timeline||timeline.version!==binding.timeline_version||state.timeline?.version!==timeline.version||!state.authorityCurrent||draft?.timeline_version!==timeline.version||state.pending?.has("timeline-edit")||state.pending?.has("timeline-annotation-send")||!timebase)return;
    const point=previewPointAtClientPoint(event.clientX,event.clientY,stage.getBoundingClientRect(),current.videoWidth,current.videoHeight),tick=timelineTickAtMediaTime(current.currentTime,timebase);
    if(!point){reportError(new Error("请在实际预览画面范围内右键添加批注。"));return;}
    if(tick===null){reportError(new Error("当前预览位置无法映射到精确时间线刻度。"));return;}
    try{previewAnnotationDraft=createPreviewTimelineAnnotation(timeline,tick,point);}catch(error){reportError(error);return;}
    previewAnnotationMenu.hidden=false;previewAnnotationMenu.style.left=`${Math.max(8,Math.min(event.clientX,window.innerWidth-190))}px`;previewAnnotationMenu.style.top=`${Math.max(8,Math.min(event.clientY,window.innerHeight-58))}px`;addPreviewAnnotation.focus({preventScroll:true});
  };
  stage.addEventListener("contextmenu",openPreviewAnnotationMenu);
  function update() {
    source.update();
    const sourceActive = !source.node.hidden;
    if(sourceActive||state.workspacePage!=="precision"||!state.authorityCurrent)closePreviewAnnotationMenu();
    if (sourceActive && !browsing) { savedWatch = current ? { video: current, playing: !current.paused } : null; current?.pause(); }
    if (!sourceActive && browsing && savedWatch?.video === current && savedWatch.playing) void current.play().catch(reportError);
    browsing = sourceActive;
    block.hidden = caption.hidden = readySlot.hidden = sourceActive;
    section.querySelector(".player-modes").hidden = sourceActive;
    section.querySelector(".panel-heading").hidden = sourceActive;
    const [title,description]=previewPlaceholderText(state);placeholderTitle.textContent=title;placeholderBody.textContent=description;
    const failed=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId),facts=failed?.status==="failed"&&!failed.production?failureFacts(failed.failure):[],identity=JSON.stringify([state.selectedRequestId,failed?.status,Boolean(failed?.production),failed?.failure]);if(identity!==failureIdentity){failureIdentity=identity;failureDetails.hidden=true;failureToggle.setAttribute("aria-expanded","false");failureToggle.textContent="查看失败详情";}failureToggle.hidden=!facts.length;failureDetails.textContent=facts.join(" · ");if(!facts.length)failureDetails.hidden=true;
    const producing=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId)?.production,progress=renderProgress(producing),rendering=producing?.phase==="preview-master-render";renderStatus.hidden=sourceActive||!rendering;if(rendering){renderStatusText.textContent=progress?.label??"正在制作预览与成片，等待渲染进度";if(progress){renderStatusBar.value=progress.fraction;renderStatusBar.setAttribute("aria-valuetext",progress.label);}else{renderStatusBar.removeAttribute("value");renderStatusBar.removeAttribute("aria-valuetext");}}
    if (loaded !== state.previewUrl) {
      loaded = state.previewUrl;
      if(!loaded) reset();
      else {
        const ticket=++generation,nextBinding=state.previewBinding,video=document.createElement("video");
        settleTransition();release(pending);pending=video;video.controls=false;video.tabIndex=0;video.preload="auto";video.hidden=true;video.setAttribute("aria-label",`作品 v${nextBinding.timeline_version} 预览`);loading.textContent="正在准备画面…";loading.hidden=false;
        video.addEventListener("keydown",event=>{if(event.key===" "&&video===current){event.preventDefault();togglePlay();}});
        for(const type of ["timeupdate","seeked","durationchange","play","pause","ended","volumechange"])video.addEventListener(type,()=>{if(video===current){syncControls();updateCaptionEditor();updatePreviewAnnotationMarkers();}});
        video.addEventListener("loadeddata",()=>{
          if(ticket!==generation)return;
          settleTransition();retiring=current;if(current){video.volume=current.volume;video.muted=current.muted;}current=video;pending=null;binding=nextBinding;
          if(retiring){retiring.pause();retiring.controls=false;retiring.inert=true;retiring.setAttribute("aria-hidden","true");}
          video.hidden=false;placeholder.hidden=true;loading.hidden=true;caption.textContent=`正在观看 v${binding.timeline_version} · 观看与采用分别记录`;
          if(retiring&&!motion.matches){const animation=video.animate([{opacity:0},{opacity:1}],{duration:180,easing:"cubic-bezier(.22,1,.36,1)"});transition=animation;animation.onfinish=()=>{if(transition===animation)settleTransition();};animation.oncancel=()=>{if(transition===animation)settleTransition();};}
          else settleTransition();
          actions.previewReady(binding,loaded);updateCaptionEditor();updatePreviewAnnotationMarkers();
          syncControls();
        },{once:true});
        video.addEventListener("error",()=>{if(ticket!==generation)return;loading.hidden=false;loading.textContent="画面载入失败，当前可用版本保持不变。";reportError(loading.textContent);release(pending);pending=null;},{once:true});
        video.addEventListener("playing",onPlaying);stage.append(video);video.src=loaded;
      }
    }
    if(!binding) caption.textContent="初稿完成后可观看、比较，再决定采用。";
    else if(state.timeline&&editablePreviewSeekTick(state,binding,current?.currentTime??0)===null)caption.textContent=`正在观看 v${binding.timeline_version} · 当前编辑 v${state.timeline.version}；拖放使用编辑播放头，可在“精修”定位。`;
    else caption.textContent=`正在观看 v${binding.timeline_version} · 观看与采用分别记录`;
    const shown=state.displayedPreviewTimeline??state.timeline,clips=(shown?.tracks??[]).filter(track=>track.kind==="video").flatMap(track=>track.clips);section.querySelector("h2").textContent=`作品 v${binding?.timeline_version??shown?.version??0}`;section.querySelector("[data-player-summary]").textContent=`${clips.length} 个镜头 · ${binding?"实际预览":"等待画面"}`;syncControls();updateCaptionEditor();updatePreviewAnnotationMarkers();
    const request=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId),latest=request?.drafts.find(item=>item.draft_id===request.latest_draft_id);latestReady=latest?.renders.some(item=>item.preview.qc.status==="passed")?latest.draft_id:null;readySlot.hidden=sourceActive||!latestReady||latestReady===binding?.draft_id||latestReady===dismissedReady;readyText.textContent=latestReady?`新版本 v${latest.timeline_version} 已就绪，当前观看保持不变。`:"";readyWatch.disabled=Boolean(state.pending?.has("preview"));
  }
  return { node: section,update,togglePlayback:togglePlay,seekToSeconds(value) {
    if(!current||current.readyState<1||current.error||!Number.isFinite(value)||value<0)return false;
    current.currentTime=Number.isFinite(current.duration)?Math.min(value,current.duration):value;
    return true;
  },reuseReadyPreview(candidate) {
    const keys=["project_id","request_id","draft_id","render_id","output_hash","timeline_version"];
    if(!current||current.readyState<2||current.error||!binding||!keys.every(key=>candidate?.[key]!==undefined&&candidate[key]===binding[key]))return null;
    // A watch of the actual displayed identity is navigation, not a reload.
    // Cancel a different decoded-in-flight candidate without touching this URL.
    if(pending){generation++;release(pending);pending=null;}
    settleTransition();loaded=current.getAttribute("src");loading.hidden=true;
    return {binding,url:loaded};
  },destroy() { source.destroy();loaded="";motion.removeEventListener("change",onMotionChange);document.removeEventListener("pointerdown",dismissPreviewAnnotationMenu);closePreviewAnnotationMenu();reset(); } };
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
