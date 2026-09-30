import { clipMatchesTimeline } from "../state/workbench-state.js";
function seconds(ticks,timebase) { if(typeof ticks!=="bigint" || !timebase)return null;return Number(ticks)*Number(timebase.value)/Number(timebase.timescale); }
export function thumbnailTick(clip) { if(typeof clip.timeline_start!=="bigint"||typeof clip.timeline_duration!=="bigint"||clip.timeline_start<0n||clip.timeline_duration<=0n)throw new Error("镜头缺少有效的精确时间范围");return clip.timeline_start+clip.timeline_duration/2n; }
export function selectedTimelineShot(selection,timeline,trackId,clipId) { return clipMatchesTimeline(selection,timeline)&&selection.track_id===trackId&&selection.clip_id===clipId; }
/** Thumbnails decode the authorized preview only. Source files never enter Renderer. */
export function timelinePanel(actions,state) {
  const section=document.createElement("section");section.className="panel timeline-panel";
  const heading=document.createElement("div");heading.className="panel-heading";
  const title=document.createElement("h2"),buttons=document.createElement("div");buttons.className="button-row";
  const reference=document.createElement("button"),refine=document.createElement("button");reference.textContent="引用到对话";refine.textContent="精修镜头";reference.className=refine.className="ghost";reference.addEventListener("click",actions.referenceClip);refine.addEventListener("click",actions.refineClip);buttons.append(reference,refine);heading.append(title,buttons);section.append(heading);
  const strip=document.createElement("div");strip.className="shot-strip";strip.setAttribute("aria-label","当前作品镜头");section.append(strip);
  let signature="",controller=null,decoder=null,disposed=false;
  const cancel=()=>{controller?.abort();controller=null;if(decoder){decoder.pause();decoder.removeAttribute("src");decoder.load();decoder=null;}};
  const waitFor=(video,event,signal)=>new Promise((resolve,reject)=>{
    const finish=error=>{clearTimeout(timer);video.removeEventListener(event,ready);video.removeEventListener("error",failed);signal.removeEventListener("abort",aborted);error?reject(error):resolve();};
    const ready=()=>finish(),failed=()=>finish(new Error(`预览解码失败（${video.error?.code??"unknown"}）`)),aborted=()=>finish(new Error("缩略图任务已取消"));
    const timer=setTimeout(()=>finish(new Error("预览缩略图解码超时")),12000);video.addEventListener(event,ready,{once:true});video.addEventListener("error",failed,{once:true});signal.addEventListener("abort",aborted,{once:true});
  });
  async function thumbnails(url,shots,timebase,signal,binding) {
    const video=document.createElement("video");decoder=video;video.preload="auto";video.muted=true;
    try {
      const loaded=waitFor(video,"loadeddata",signal);video.src=url;await loaded;
      for(const {clip,canvas,status} of shots){if(signal.aborted)return;const position=seconds(thumbnailTick(clip),timebase);if(position===null||!Number.isFinite(position))throw new Error("当前版本缺少精确时间基");
        if(video.currentTime!==position){const sought=waitFor(video,"seeked",signal);video.currentTime=position;await sought;}
        if(signal.aborted)return;const context=canvas.getContext("2d");if(!context)throw new Error("无法建立缩略图画布");
        canvas.width=160;canvas.height=90;context.fillStyle="#111a20";context.fillRect(0,0,160,90);const scale=Math.min(160/video.videoWidth,90/video.videoHeight),width=video.videoWidth*scale,height=video.videoHeight*scale;context.drawImage(video,(160-width)/2,(90-height)/2,width,height);canvas.dataset.previewTick=String(thumbnailTick(clip));canvas.hidden=false;status.hidden=true;actions.thumbnailReady?.(binding,clip.clip_id,canvas.toDataURL("image/jpeg",0.8));
      }
    } catch(error) {if(!signal.aborted&&!disposed)for(const {canvas,status}of shots)if(canvas.hidden){status.textContent="缩略图读取失败";status.title=error.message;}}
    finally {video.pause();video.removeAttribute("src");video.load();if(decoder===video)decoder=null;}
  }
  function update() {
    const timeline=state.displayedPreviewTimeline??state.timeline,binding=state.displayedPreviewBinding,isOld=timeline?.version!==state.timeline?.version;
    title.textContent=`镜头带 · ${binding?"正在观看":"当前编辑"} v${timeline?.version??0}${isOld?" · 旧版只读":""}`;
    reference.disabled=!clipMatchesTimeline(state.selectedClip,timeline);refine.disabled=reference.disabled||isOld;
    const next=JSON.stringify([state.status.project,timeline?.version,state.displayedPreviewUrl??"",(timeline?.tracks??[]).map(track=>[track.track_id,track.clips.map(clip=>clip.clip_id)])]);
    if(next===signature){for(const shot of strip.querySelectorAll("button")){const selected=selectedTimelineShot(state.selectedClip,timeline,shot.dataset.trackId,shot.dataset.clipId);shot.classList.toggle("selected",selected);shot.setAttribute("aria-pressed",String(selected));}return;}
    signature=next;cancel();strip.replaceChildren();const shots=[];
    for(const track of timeline?.tracks??[])for(const [index,clip]of track.clips.entries()){
      const shot=document.createElement("button");shot.className="shot";shot.dataset.clipId=clip.clip_id;shot.dataset.trackId=track.track_id;const name=document.createElement("strong"),detail=document.createElement("span"),canvas=document.createElement("canvas"),status=document.createElement("span");canvas.hidden=true;canvas.setAttribute("aria-label",`镜头 ${index+1} 中段的实际预览帧`);status.className="shot-image-status";status.textContent=track.kind==="video"&&state.displayedPreviewUrl?"读取画面…":track.kind==="audio"?"音频片段":"尚无预览画面";
      name.textContent=`${track.kind==="video"?"镜头":"音频"} ${index+1}`;const duration=seconds(clip.timeline_duration,timeline?.sequence?.timebase);detail.textContent=duration===null?"源片片段":`${duration.toFixed(2)} 秒`;
      const selected=selectedTimelineShot(state.selectedClip,timeline,track.track_id,clip.clip_id);shot.classList.toggle("selected",selected);shot.setAttribute("aria-pressed",String(selected));shot.append(canvas,status,name,detail);shot.addEventListener("click",()=>actions.selectClip(track,clip,timeline.version));strip.append(shot);if(track.kind==="video")shots.push({clip,canvas,status});
    }
    if(!strip.children.length){const empty=document.createElement("p");empty.className="muted";empty.textContent="作品生成后，在这里选择镜头并继续修改。";strip.append(empty);}
    if(state.displayedPreviewUrl&&shots.length){controller=new AbortController();void thumbnails(state.displayedPreviewUrl,shots,timeline.sequence?.timebase,controller.signal,binding);}
  }
  return {node:section,update,destroy(){disposed=true;cancel();}};
}
