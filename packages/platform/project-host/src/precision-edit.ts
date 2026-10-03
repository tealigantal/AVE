import type { PrecisionEditV1 } from "../../../../contracts/generated/typescript/editorial/precision-edit.v1.js";
import { sourceRange, type AssetId } from "../../../core/media-identity/src/public.js";
import { simulateCommands, type Timeline, type Track, type Clip, type Caption, type TimelineCommand } from "../../../core/timeline-core/src/public.js";

export type PrecisionSource = Readonly<{asset_id:string;kind:"video"|"audio"|"image";start:bigint;end:bigint;scale:bigint;sample_rate:number|null;frames:readonly bigint[]|null;spans:readonly {span_id:string;start:bigint;end:bigint;scale:bigint}[]}>;
const same=(a:unknown,b:unknown)=>JSON.stringify(a,(_k,v)=>typeof v==="bigint"?String(v):v)===JSON.stringify(b,(_k,v)=>typeof v==="bigint"?String(v):v);
const fail=(code:string,message:string):never=>{throw new Error(`${code}: ${message}`);};
const gcd=(a:bigint,b:bigint):bigint=>b===0n?a:gcd(b,a%b);
const lcm=(a:bigint,b:bigint)=>a/gcd(a,b)*b;
const exact=(n:bigint,d:bigint,label:string)=>{if(d<=0n||n%d!==0n)fail("PRECISION_TIME_INEXACT",`${label}; nearest Timeline tick boundaries ${n/d} and ${n/d+1n}; choose a boundary also present on the actual frame/sample grid`);return n/d;};
const end=(c:{timeline_start:bigint;timeline_duration:bigint})=>c.timeline_start+c.timeline_duration;
const labels=(value:Clip|Caption)=>value.semantic_sidecar?.labels??[];
const anchor=(c:Caption)=>labels(c).find(x=>x.startsWith("audio-anchor:"))?.slice(13)??labels(c).find(x=>x.startsWith("shot:"))?.slice(5);

/** A typed, deterministic Host adapter. One result is one existing atomic edit batch. */
export function compilePrecisionEdit(base:Timeline,input:PrecisionEditV1,sources:ReadonlyMap<string,PrecisionSource>):readonly TimelineCommand[]{
 const tb=base.sequence?.timebase;if(!tb||tb.value<=0n||tb.timescale<=0n)fail("PRECISION_TIMEBASE_REQUIRED","explicit Timeline clock required");
 const clock=tb!,tracks=structuredClone(base.tracks) as Track[],a=input.action,prefix=`precision:${input.operation_id}`;
 if(a.kind==="adjust"){
  let current=base;const batch:TimelineCommand[]=[];
  const apply=(action:PrecisionEditV1["action"])=>{const commands=compilePrecisionEdit(current,{...input,action},sources);batch.push(...commands);current=simulateCommands(current,commands);};
  if(a.at_ticks!==null)apply({kind:"move",clip_id:a.clip_id,at_ticks:a.at_ticks,associated:true,snap:false});
  if(a.gain_db!==null)apply({kind:"gain",clip_id:a.clip_id,gain_db:a.gain_db});
  if(a.caption_text!==null){const track=base.tracks.find(t=>t.clips.some(c=>c.clip_id===a.clip_id))??fail("PRECISION_CLIP_MISSING",a.clip_id);apply({kind:"caption",track_id:track.track_id,caption_id:null,text:a.caption_text,at_ticks:a.caption_start_ticks,duration_ticks:a.caption_duration_ticks,safe_y_ratio:0.82});}
  if(!batch.length)fail("PRECISION_NO_CHANGE","choose an actual change");return batch;
 }

 const locate=(id:string)=>{for(const track of tracks){const clip=track.clips.find(c=>c.clip_id===id);if(clip)return {track,clip};}return fail("PRECISION_CLIP_MISSING",id);};
 const put=(track:Track,clip:Clip)=>{const index=tracks.findIndex(t=>t.track_id===track.track_id);const current=tracks[index]!;tracks[index]={...current,clips:current.clips.map(c=>c.clip_id===clip.clip_id?clip:c)};};
 const remap=<T extends Clip|Caption>(item:T,id:string,map:ReadonlyMap<string,string>):T=>{
  const copy=structuredClone(item) as any;
  if("clip_id" in copy){const newIdentity=copy.clip_id!==id;copy.clip_id=id;if(copy.link_group_id)copy.link_group_id=map.get(copy.link_group_id)??copy.link_group_id;
   if(newIdentity&&copy.grade)copy.grade={...copy.grade,grade_id:`${id}:${copy.grade.grade_id}`};if(newIdentity&&copy.mask)copy.mask={...copy.mask,mask_id:`${id}:${copy.mask.mask_id}`};
   for(const field of ["effects","keyframes","automation_curves"])if(newIdentity&&copy[field])copy[field]=copy[field].map((x:any)=>({...x,...(x.effect_id?{effect_id:`${id}:${x.effect_id}`,clip_id:id}:{}),...(x.keyframe_id?{keyframe_id:`${id}:${x.keyframe_id}`,target_id:id}:{}),...(x.curve_id?{curve_id:`${id}:${x.curve_id}`,target_id:id,keyframes:x.keyframes.map((k:any)=>({...k,keyframe_id:`${id}:${k.keyframe_id}`}))}: {})}));
  }else copy.caption_id=id;
  if(copy.semantic_sidecar)copy.semantic_sidecar={...copy.semantic_sidecar,semantic_id:id,labels:copy.semantic_sidecar.labels.map((x:string)=>{const mark=x.startsWith("shot:")?"shot:":x.startsWith("audio-anchor:")?"audio-anchor:":null;return mark?mark+(map.get(x.slice(mark.length))??x.slice(mark.length)):x;})};
  return copy;
 };
 const sourceOf=(clip:Clip)=>sources.get(clip.source.asset_id)??fail("PRECISION_SOURCE_REQUIRED",clip.source.asset_id);
 const validatePoint=(source:PrecisionSource,p:bigint,scale:bigint,audioOnly=false,origin?:{value:bigint;scale:bigint})=>{
  if(p*source.scale<source.start*scale||p*source.scale>source.end*scale)fail("PRECISION_SOURCE_RANGE_INVALID",source.asset_id);
  if(source.kind==="image")return;
  const sampled=source.sample_rate===null||p*BigInt(source.sample_rate)%scale===0n;
  const onClock=!origin||(p*origin.scale-origin.value*scale)*clock.timescale%(scale*origin.scale*clock.value)===0n;
  if(source.kind==="video"&&!audioOnly){
   const framed=source.frames?.some(f=>f*scale===p*source.scale);
   if(framed&&sampled&&onClock)return;
   const points=(source.frames??[]).filter(f=>(source.sample_rate===null||f*BigInt(source.sample_rate)%source.scale===0n)&&(!origin||(f*origin.scale-origin.value*source.scale)*clock.timescale%(source.scale*origin.scale*clock.value)===0n)),near=points.filter(f=>f*scale<=p*source.scale).at(-1),next=points.find(f=>f*scale>p*source.scale);
   fail(!framed?"PRECISION_FRAME_BOUNDARY_INVALID":!sampled?"PRECISION_SAMPLE_BOUNDARY_INVALID":"PRECISION_TIME_INEXACT",`available joint source/Timeline boundaries ${near===undefined?"none":`${near}/${source.scale}`} and ${next===undefined?"none":`${next}/${source.scale}`}`);
  }
  if(sampled&&onClock)return;
  if(source.sample_rate===null)fail("PRECISION_SAMPLE_RATE_REQUIRED",source.asset_id);
  const rate=BigInt(source.sample_rate!),step=origin?lcm(rate*clock.value,clock.timescale)/clock.timescale:1n,anchor=origin?exact(origin.value*rate,origin.scale,"sample origin"):0n,relative=p*rate-anchor*scale,low=(relative>=0n?relative/(scale*step):-((-relative+scale*step-1n)/(scale*step)))*step+anchor;
  fail(!sampled?"PRECISION_SAMPLE_BOUNDARY_INVALID":"PRECISION_TIME_INEXACT",`available joint source/Timeline sample boundaries ${low*source.scale<source.start*rate?"none":`${low}/${rate}`} and ${(low+step)*source.scale>source.end*rate?"none":`${low+step}/${rate}`}`);
 };
 const slice=(clip:Clip,start:bigint,finish:bigint,id=clip.clip_id,map:ReadonlyMap<string,string>=new Map()):Clip=>{
  if(start<clip.timeline_start||finish>end(clip)||finish<=start)fail("PRECISION_INTERVAL_INVALID",clip.clip_id);
  if(clip.automation_curves?.length||clip.keyframes?.length||clip.mask?.tracking_samples?.length)fail("PRECISION_AUTOMATION_CUT_UNSUPPORTED","basic cuts require static clip semantics; edit the automation first");
  if(clip.time_map||clip.speed)fail("PRECISION_MAPPING_UNSUPPORTED","basic cuts require the existing constant 1:1 source mapping");
  const source=sourceOf(clip),scale=lcm(clip.source.timescale,clock.timescale),oldStart=clip.source.start_pts*(scale/clip.source.timescale);
  const point=(tick:bigint)=>oldStart+exact((tick-clip.timeline_start)*clock.value*scale,clock.timescale,"source cut");
  const first=clip.kind==="image"?0n:point(start),last=clip.kind==="image"?finish-start:point(finish);
  if(clip.kind!=="image"){if(start!==clip.timeline_start)validatePoint(source,first,scale,clip.media_kind==="audio",{value:clip.source.start_pts,scale:clip.source.timescale});if(finish!==end(clip))validatePoint(source,last,scale,clip.media_kind==="audio",{value:clip.source.start_pts,scale:clip.source.timescale});}
  const copy=id===clip.clip_id?structuredClone(clip):remap(clip,id,map);
  const fades=copy.boundary_fades?{...copy.boundary_fades}:undefined;
  if(fades){if(start!==clip.timeline_start){delete fades.audio_fade_in;delete fades.video_fade_in;}if(finish!==end(clip)){delete fades.audio_fade_out;delete fades.video_fade_out;}
   for(const fade of [fades.audio_fade_in,fades.audio_fade_out,fades.video_fade_in,fades.video_fade_out])if(fade&&fade.value*clock.timescale>(finish-start)*clock.value*fade.timescale)fail("PRECISION_FADE_RANGE_INVALID","adjust the fade before shortening this clip");}
  const {boundary_fades:_oldFades,...rest}=copy;
  return {...rest,source:sourceRange(clip.source.asset_id,first,clip.kind==="image"?last*clock.value:last,clip.kind==="image"?clock.timescale:scale),timeline_start:start,timeline_duration:finish-start,...(fades&&Object.keys(fades).length>1?{boundary_fades:fades}:{})};
 };
 const group=(clip:Clip,associated:boolean)=>{
  if(!associated)return [clip.clip_id];const root=clip.link_group_id??clip.clip_id;
  return tracks.flatMap(t=>t.clips).filter(c=>c.clip_id===root||c.link_group_id===root||c.clip_id===clip.clip_id||labels(c).includes(`shot:${root}`)).map(c=>c.clip_id);
 };
 const shiftCaption=(caption:Caption,delta:bigint)=>({...caption,timeline_start:caption.timeline_start+delta,...(caption.words?{words:caption.words.map(w=>({...w,timeline_start:w.timeline_start+delta}))}:{})});
 const shiftGroup=(ids:readonly string[],delta:bigint)=>{for(const id of ids){const {track,clip}=locate(id);if(clip.timeline_start+delta<0n)fail("PRECISION_PLACEMENT_INVALID",id);put(track,{...clip,timeline_start:clip.timeline_start+delta});}for(let i=0;i<tracks.length;i++)tracks[i]={...tracks[i]!,captions:tracks[i]!.captions?.map(c=>ids.includes(anchor(c)??"")?shiftCaption(c,delta):c)};};
 const append=(track:Track,clip:Clip,donorId?:string)=>{const i=tracks.findIndex(t=>t.track_id===track.track_id),current=tracks[i]!;const oldRoute=current.audio_routing?.find(r=>r.source_clip_id===clip.clip_id)||track.audio_routing?.find(r=>r.source_clip_id===donorId);tracks[i]={...current,clips:[...current.clips,clip],...(track.kind==="audio"?{audio_routing:[...(current.audio_routing??[]),{routing_id:`routing:${clip.clip_id}`,source_clip_id:clip.clip_id,bus:oldRoute?.bus??(track.track_id.slice(6) as "music"|"narration"|"sfx"),...(oldRoute?.gain_db!==undefined?{gain_db:oldRoute.gain_db}:{}),...(oldRoute?.muted!==undefined?{muted:oldRoute.muted}:{})}]}:{})};};
 const snap=(tick:bigint,excluded:readonly string[])=>{const points=[0n,...tracks.flatMap(t=>t.clips.filter(c=>!excluded.includes(c.clip_id)).flatMap(c=>[c.timeline_start,end(c)]))];return points.reduce((best,p)=>{const d=p>tick?p-tick:tick-p,b=best>tick?best-tick:tick-best;return d<b?p:best;},points[0]!);};
 const captionSlice=(c:Caption,start:bigint,finish:bigint,id=c.caption_id,map:ReadonlyMap<string,string>=new Map())=>{
  const copy=id===c.caption_id?c:remap(c,id,map),words=copy.words?.filter(w=>w.timeline_start>=start&&w.timeline_start+w.timeline_duration<=finish);
  if(labels(copy).includes("verbatim")&&!copy.words&&(start!==copy.timeline_start||finish!==copy.timeline_start+copy.timeline_duration))fail("PRECISION_CAPTION_WORD_BOUNDARY_INVALID","verbatim subtitles need actual word boundaries or an unchanged interval");
  if(copy.words?.some(w=>w.timeline_start<finish&&w.timeline_start+w.timeline_duration>start&&!words?.includes(w)))fail("PRECISION_CAPTION_WORD_BOUNDARY_INVALID","choose a subtitle word boundary");
  return {...copy,timeline_start:start,timeline_duration:finish-start,...(words?{words,text:words.map(w=>w.text).join(" ")}:{})};
 };
 if(a.kind==="move"){const {clip}=locate(a.clip_id),ids=group(clip,a.associated),requested=BigInt(a.at_ticks),target=a.snap?snap(requested,ids):requested;shiftGroup(ids,target-clip.timeline_start);}
 else if(a.kind==="delete"){const ids=group(locate(a.clip_id).clip,a.associated);for(let i=0;i<tracks.length;i++){const t=tracks[i]!;tracks[i]={...t,clips:t.clips.filter(c=>!ids.includes(c.clip_id)),audio_routing:t.audio_routing?.filter(r=>!ids.includes(r.source_clip_id)),captions:t.captions?.filter(c=>!ids.includes(anchor(c)??""))};}}
 else if(a.kind==="split"){
  const root=locate(a.clip_id).clip,point=BigInt(a.at_ticks);if(point<=root.timeline_start||point>=end(root))fail("PRECISION_SPLIT_INVALID","split inside the selected clip");
  const members=group(root,a.associated),ids=members.filter(id=>{const c=locate(id).clip;return c.timeline_start<point&&end(c)>point;}),map=new Map(ids.map(id=>[id,`${prefix}:right:${id}`]));
  for(const id of ids){const {track,clip}=locate(id),left=slice(clip,clip.timeline_start,point),right=slice(clip,point,end(clip),map.get(id)!,map);put(track,left);append(track,right,id);}
  for(const id of members.filter(id=>!ids.includes(id))){const found=locate(id);if(found.clip.timeline_start>=point)put(found.track,remap(found.clip,found.clip.clip_id,map));}
  for(let i=0;i<tracks.length;i++){const t=tracks[i]!;tracks[i]={...t,captions:t.captions?.flatMap(c=>{const ref=anchor(c);if(!ref||!members.includes(ref)||c.timeline_start+c.timeline_duration<=point)return [c];if(c.timeline_start>=point)return [remap(c,c.caption_id,map)];return [captionSlice(c,c.timeline_start,point),captionSlice(c,point,c.timeline_start+c.timeline_duration,`${prefix}:right:${c.caption_id}`,map)];})};}
 }
 else if(a.kind==="duplicate"||a.kind==="repeat"){
  const root=locate(a.clip_id).clip,ids=group(root,a.kind==="duplicate"?a.associated:false),count=a.kind==="repeat"?a.count:2;
  if(a.kind==="repeat"&&locate(a.clip_id).track.kind!=="audio")fail("PRECISION_REPEAT_AUDIO_REQUIRED",a.clip_id);
  const first=a.kind==="repeat"?end(root):a.snap?snap(BigInt(a.at_ticks),ids):BigInt(a.at_ticks),originalCaptions=tracks.flatMap(t=>(t.captions??[]).map(c=>({track:t,c}))).filter(x=>ids.includes(anchor(x.c)??""));
  for(let n=1;n<count;n++){const map=new Map(ids.map(id=>[id,`${prefix}:copy:${n}:${id}`])),delta=first-root.timeline_start+BigInt(n-1)*root.timeline_duration;
   for(const id of ids){const {track,clip}=locate(id);const copied=remap(clip,map.get(id)!,map);append(track,{...copied,timeline_start:copied.timeline_start+delta},id);}
   for(const {track,c} of originalCaptions){const i=tracks.findIndex(t=>t.track_id===track.track_id);tracks[i]={...tracks[i]!,captions:[...(tracks[i]!.captions??[]),shiftCaption(remap(c,`${prefix}:copy:${n}:${c.caption_id}`,map),delta)]};}
  }
 }
 else if(a.kind==="ripple"){
  const first=BigInt(a.start_ticks),last=BigInt(a.end_ticks),delta=last-first;if(delta<=0n)fail("PRECISION_RIPPLE_INVALID","positive whole-work deletion interval required");
  const map=new Map(tracks.flatMap(t=>t.clips).filter(c=>c.timeline_start<last&&end(c)>last&&c.timeline_start<first).map(c=>[c.clip_id,`${prefix}:tail:${c.clip_id}`]));
  for(let i=0;i<tracks.length;i++){const track=tracks[i]!,clips:Clip[]=[];
   for(const c of track.clips){if(end(c)<=first)clips.push(c);else if(c.timeline_start>=last)clips.push({...remap(c,c.clip_id,map),timeline_start:c.timeline_start-delta});else{
    if(c.timeline_start<first)clips.push(slice(c,c.timeline_start,first));
    if(end(c)>last){const id=c.timeline_start<first?map.get(c.clip_id)!:c.clip_id,tail=slice(c,last,end(c),id,map);clips.push({...tail,timeline_start:tail.timeline_start-delta});}
   }}
   const captions=(track.captions??[]).flatMap(c=>{const finish=c.timeline_start+c.timeline_duration;if(finish<=first)return [c];if(c.timeline_start>=last)return [shiftCaption(remap(c,c.caption_id,map),-delta)];const parts:Caption[]=[];if(c.timeline_start<first)parts.push(captionSlice(c,c.timeline_start,first));if(finish>last)parts.push(shiftCaption(captionSlice(c,last,finish,c.timeline_start<first?`${prefix}:tail:${c.caption_id}`:c.caption_id,map),-delta));return parts;});
   const routes=clips.flatMap(c=>{const old=track.audio_routing?.find(r=>r.source_clip_id===c.clip_id||map.get(r.source_clip_id)===c.clip_id);return old?[old.source_clip_id===c.clip_id?old:{...old,routing_id:`routing:${c.clip_id}`,source_clip_id:c.clip_id}]:[];});
   const gaps=track.gaps?.flatMap(g=>{const finish=g.timeline_start+g.timeline_duration;if(finish<=first)return [g];if(g.timeline_start>=last)return [{...g,timeline_start:g.timeline_start-delta}];const parts=[];if(g.timeline_start<first)parts.push({...g,timeline_duration:first-g.timeline_start});if(finish>last)parts.push({...g,gap_id:g.timeline_start<first?`${prefix}:tail:${g.gap_id}`:g.gap_id,timeline_start:first,timeline_duration:finish-last});return parts;});
   if(track.transitions?.some(t=>t.timeline_start+t.timeline_duration>first))fail("PRECISION_TRANSITION_INTERVAL_UNSUPPORTED","remove or protect the transition before a whole-work ripple");
   tracks[i]={...track,clips,captions,...(gaps?{gaps}:{}),...(track.audio_routing?{audio_routing:routes}:{})};
  }
 }
 else if(a.kind==="trim"){
  const {track,clip}=locate(a.clip_id);if(clip.automation_curves?.length||clip.keyframes?.length||clip.mask?.tracking_samples?.length)fail("PRECISION_AUTOMATION_CUT_UNSUPPORTED","basic trim requires static semantics");if(clip.speed||clip.time_map)fail("PRECISION_MAPPING_UNSUPPORTED","basic source trim requires constant 1:1 mapping");if(clip.kind==="image")fail("PRECISION_IMAGE_DURATION_REQUIRED","images use display duration");
  const scale=lcm(BigInt(a.source_start.timescale),BigInt(a.source_end.timescale)),start=BigInt(a.source_start.value)*(scale/BigInt(a.source_start.timescale)),finish=BigInt(a.source_end.value)*(scale/BigInt(a.source_end.timescale)),source=sourceOf(clip);validatePoint(source,start,scale,clip.media_kind==="audio",{value:clip.source.start_pts,scale:clip.source.timescale});validatePoint(source,finish,scale,clip.media_kind==="audio",{value:clip.source.start_pts,scale:clip.source.timescale});
  if(finish<=start)fail("PRECISION_SOURCE_RANGE_INVALID",a.clip_id);const duration=exact((finish-start)*clock.timescale,scale*clock.value,"trim duration");
  const offset=exact((start*clip.source.timescale-clip.source.start_pts*scale)*clock.timescale,scale*clip.source.timescale*clock.value,"trim offset");
  const ids=group(clip,a.associated),retainedStart=clip.timeline_start+offset,retainedEnd=retainedStart+duration,removed=new Set<string>();
  for(const id of ids){const found=locate(id);if(id===clip.clip_id)put(track,{...clip,source:sourceRange(clip.source.asset_id,start,finish,scale),timeline_duration:duration});else {const first=found.clip.timeline_start>retainedStart?found.clip.timeline_start:retainedStart,last=end(found.clip)<retainedEnd?end(found.clip):retainedEnd;if(last<=first){removed.add(id);continue;}const part=slice(found.clip,first,last);put(found.track,{...part,timeline_start:first-offset});}}
  for(let i=0;i<tracks.length;i++){const t=tracks[i]!;tracks[i]={...t,clips:t.clips.filter(c=>!removed.has(c.clip_id)),audio_routing:t.audio_routing?.filter(r=>!removed.has(r.source_clip_id))};}
  for(let i=0;i<tracks.length;i++){const t=tracks[i]!;tracks[i]={...t,captions:t.captions?.flatMap(c=>{if(!ids.includes(anchor(c)??""))return [c];const s=clip.timeline_start+offset,f=s+duration,lo=c.timeline_start>s?c.timeline_start:s,hi=c.timeline_start+c.timeline_duration<f?c.timeline_start+c.timeline_duration:f;return hi>lo?[shiftCaption(captionSlice(c,lo,hi),-offset)]:[];})};}
 }
 else if(a.kind==="insert"||a.kind==="replace"){
  const source=sources.get(a.asset_id)??fail("PRECISION_SOURCE_REQUIRED",a.asset_id),span=source.spans.find(s=>s.span_id===a.span_id)??fail("PRECISION_SPAN_DENIED",a.span_id);
  const existing=a.kind==="replace"?locate(a.clip_id):null,scale=lcm(BigInt(a.source_start.timescale),BigInt(a.source_end.timescale)),first=BigInt(a.source_start.value)*(scale/BigInt(a.source_start.timescale)),last=BigInt(a.source_end.value)*(scale/BigInt(a.source_end.timescale));
  if(existing&&(existing.clip.speed||existing.clip.time_map))fail("PRECISION_MAPPING_UNSUPPORTED","basic replacement requires constant 1:1 mapping");
  let duration=BigInt(a.duration_ticks);if(source.kind!=="image"){validatePoint(source,first,scale);validatePoint(source,last,scale);if(first*span.scale<span.start*scale||last*span.scale>span.end*scale)fail("PRECISION_SPAN_RANGE_DENIED",a.span_id);duration=exact((last-first)*clock.timescale,scale*clock.value,"new source duration");if(duration!==BigInt(a.duration_ticks))fail("PRECISION_DURATION_REBOUND","display duration must match the actual temporal source range");}
  else if(first!==0n||last!==0n)fail("PRECISION_IMAGE_SOURCE_INVALID","a still identity has no temporal source interval");
  if(duration<=0n||existing&&duration!==existing.clip.timeline_duration)fail("PRECISION_REPLACEMENT_DURATION_INVALID","replacement retains the exact existing placement and duration");
  const role=a.kind==="insert"?a.role:existing!.track.kind==="video"?"picture":existing!.track.track_id.slice(6),kind=role==="picture"?"video":"audio";
  if(kind==="audio"&&source.kind!=="audio"||kind==="video"&&source.kind==="audio")fail("PRECISION_MEDIA_KIND_INVALID",a.asset_id);
  const id=existing?.clip.clip_id??`${prefix}:insert`,position=existing?.clip.timeline_start??BigInt((a as Extract<typeof a,{kind:"insert"}>).at_ticks),trackId=existing?.track.track_id??(kind==="video"?"video-main":`audio-${role}`);
  let track=tracks.find(t=>t.track_id===trackId);if(!track){track={track_id:trackId,kind,clips:[]};tracks.push(track);}
  const clip:Clip={...(existing?.clip??{}),clip_id:id,source:source.kind==="image"?sourceRange(a.asset_id as AssetId,0n,duration*clock.value,clock.timescale):sourceRange(a.asset_id as AssetId,first,last,scale),timeline_start:position,timeline_duration:duration,media_kind:kind, ...(source.kind==="image"?{kind:"image" as const}:{kind:"media" as const}),semantic_sidecar:{semantic_id:id,labels:existing?.clip.semantic_sidecar?.labels??[role],evidence_refs:[a.span_id],metadata:{purpose:input.raw_text,...(!existing&&kind==="audio"?{precision_association:"detached"}:{})}}};
  if(existing){if(!same(existing.clip.source,clip.source)&&tracks.flatMap(t=>t.captions??[]).some(c=>labels(c).includes("verbatim")&&labels(c).includes(`audio-anchor:${existing.clip.clip_id}`)))fail("PRECISION_VERBATIM_REPLACEMENT_CONFLICT","edit or remove the anchored verbatim subtitle before replacing its sound source");put(track,clip);}else append(track,clip);
 }
 else if(a.kind==="caption"){
  const i=tracks.findIndex(t=>t.track_id===a.track_id);if(i<0)fail("PRECISION_TRACK_MISSING",a.track_id);const track=tracks[i]!,old=a.caption_id?track.captions?.find(c=>c.caption_id===a.caption_id):undefined;
  if(a.caption_id&&!old)fail("PRECISION_CAPTION_MISSING",a.caption_id);const keep=track.captions?.filter(c=>c.caption_id!==a.caption_id)??[];
  if(a.text!==null){if(!a.text.trim()||BigInt(a.duration_ticks)<=0n)fail("PRECISION_CAPTION_INVALID","positive caption text/time required");const id=a.caption_id??`${prefix}:caption`,caption:Caption={...(old??{}),caption_id:id,text:a.text,timeline_start:BigInt(a.at_ticks),timeline_duration:BigInt(a.duration_ticks),style:{...old?.style,layout_version:1,safe_y_ratio:a.safe_y_ratio}};
   if(!old){const picture=tracks.filter(t=>t.kind==="video").flatMap(t=>t.clips).find(c=>c.timeline_start<=caption.timeline_start&&end(c)>=caption.timeline_start+caption.timeline_duration);(caption as any).semantic_sidecar={semantic_id:id,labels:["editorial",...(picture?[`shot:${picture.clip_id}`]:[])],evidence_refs:[...(picture?.semantic_sidecar?.evidence_refs??[])],metadata:{purpose:input.raw_text,precision_authored_caption:"true"}};}
   if(old&&old.semantic_sidecar&&(old.text!==a.text||old.timeline_start!==caption.timeline_start||old.timeline_duration!==caption.timeline_duration)) (caption as any).semantic_sidecar={...old.semantic_sidecar,labels:[...labels(old).filter(label=>label!=="verbatim"&&!label.startsWith("audio-anchor:")&&label!=="editorial"),"editorial"],metadata:{...old.semantic_sidecar.metadata,precision_authored_caption:"true"}};
   const words=old?.words;if(words&&(old!.text!==a.text||old!.timeline_start!==caption.timeline_start||old!.timeline_duration!==caption.timeline_duration))delete (caption as any).words;keep.push(caption);}
  tracks[i]={...track,captions:keep};
 }
 else if(a.kind==="duck")return [{type:"set_dialogue_music_ducking",ducking:{schema_version:1,enabled:a.enabled,threshold_db:-30,ratio:6,attack_ms:20,release_ms:300,max_reduction_db:12}}];
 else {
  const {track,clip}=locate(a.clip_id);
  if(a.kind==="image_duration"){if(clip.kind!=="image"||BigInt(a.duration_ticks)<=0n)fail("PRECISION_IMAGE_DURATION_INVALID",a.clip_id);put(track,{...clip,timeline_duration:BigInt(a.duration_ticks),source:sourceRange(clip.source.asset_id,0n,BigInt(a.duration_ticks)*clock.value,clock.timescale)});}
  else if(a.kind==="transform"){if(track.kind!=="video")fail("PRECISION_PICTURE_REQUIRED",a.clip_id);const {static_reframe:_old,...rest}=clip;put(track,{...rest,transform:{...clip.transform,x:a.x,y:a.y,scale_x:a.scale_x,scale_y:a.scale_y,rotation:a.rotation}});}
  else if(a.kind==="reframe"){const {transform:_old,...rest}=clip;if(track.kind!=="video")fail("PRECISION_PICTURE_REQUIRED",a.clip_id);put(track,{...rest,static_reframe:{schema_version:1,mode:a.mode,focal_x:a.focal_x,focal_y:a.focal_y}});}
  else if(a.kind==="gain"){const metadata=clip.semantic_sidecar?.metadata;if(metadata?.precision_solo_gain!==undefined)put(track,{...clip,gain_db:metadata.precision_solo_selected==="true"?a.gain_db:-96,semantic_sidecar:{...clip.semantic_sidecar!,metadata:{...metadata,precision_solo_gain:String(a.gain_db)}}});else put(track,{...clip,gain_db:a.gain_db});}
  else if(a.kind==="fades"){if(a.fade_in.value<0||a.fade_out.value<0)fail("PRECISION_FADE_RANGE_INVALID","fades must be nonnegative");if(track.kind!=="audio")fail("PRECISION_AUDIO_REQUIRED",a.clip_id);const total=BigInt(a.fade_in.value)*BigInt(a.fade_out.timescale)+BigInt(a.fade_out.value)*BigInt(a.fade_in.timescale);if(total*clock.timescale>clip.timeline_duration*clock.value*BigInt(a.fade_in.timescale)*BigInt(a.fade_out.timescale))fail("PRECISION_FADE_RANGE_INVALID","fades exceed the actual audio clip");const fades={schema_version:1 as const,...(a.fade_in.value>0?{audio_fade_in:{value:BigInt(a.fade_in.value),timescale:BigInt(a.fade_in.timescale)}}:{}),...(a.fade_out.value>0?{audio_fade_out:{value:BigInt(a.fade_out.value),timescale:BigInt(a.fade_out.timescale)}}:{})};const {boundary_fades:_old,...rest}=clip;put(track,{...rest,...(Object.keys(fades).length>1?{boundary_fades:fades}:{})});}
  else if(a.kind==="mute"||a.kind==="solo"){
   if(track.kind!=="audio")fail("PRECISION_AUDIO_REQUIRED",a.clip_id);
   if(a.kind==="mute"){const i=tracks.indexOf(track),metadata=clip.semantic_sidecar?.metadata,solo=metadata?.precision_solo_gain!==undefined;if(solo)put(track,{...clip,semantic_sidecar:{...clip.semantic_sidecar!,metadata:{...metadata,precision_solo_muted:String(a.enabled)}}});tracks[i]={...tracks[i]!,audio_routing:(track.audio_routing??[]).map(r=>r.source_clip_id===clip.clip_id?{...r,muted:a.enabled||solo&&metadata?.precision_solo_selected!=="true"}:r)};}
   else {for(let i=0;i<tracks.length;i++){const t=tracks[i]!,previous=t.clips[0]?.semantic_sidecar?.metadata,restoreState=(key:string)=>(previous?.[key]==="absent"?undefined:previous?.[key]==="true");tracks[i]={...t,...(t.clips.length?{muted:a.enabled?false:previous?.precision_solo_track_muted===undefined?t.muted:restoreState("precision_solo_track_muted"),solo:a.enabled?false:previous?.precision_solo_track_solo===undefined?t.solo:restoreState("precision_solo_track_solo")} :{}),audio_routing:t.audio_routing?.map(r=>{const linked=t.clips.find(c=>c.clip_id===r.source_clip_id),old=linked?.semantic_sidecar?.metadata?.precision_solo_muted;return a.enabled?{...r,muted:r.source_clip_id!==a.clip_id}:old===undefined?r:{...r,muted:old==="true"};}),clips:t.clips.map(c=>{if(!c.semantic_sidecar)fail("PRECISION_SIDECAR_REQUIRED",c.clip_id);const metadata={...c.semantic_sidecar!.metadata},old=metadata.precision_solo_gain;if(a.enabled){metadata.precision_solo_selected=String(c.clip_id===a.clip_id);metadata.precision_solo_track_muted??=t.muted===undefined?"absent":String(t.muted);metadata.precision_solo_track_solo??=t.solo===undefined?"absent":String(t.solo);metadata.precision_solo_gain??=c.gain_db===undefined?"absent":String(c.gain_db);metadata.precision_solo_muted??=String(t.audio_routing?.find(r=>r.source_clip_id===c.clip_id)?.muted===true);}else{delete metadata.precision_solo_gain;delete metadata.precision_solo_muted;delete metadata.precision_solo_track_muted;delete metadata.precision_solo_track_solo;delete metadata.precision_solo_selected;}const copy={...c,semantic_sidecar:{...c.semantic_sidecar!,metadata}};if(a.enabled)copy.gain_db=c.clip_id===a.clip_id?(old===undefined?c.gain_db:old==="absent"?undefined:Number(old)):-96;else if(old!==undefined){if(old==="absent")delete copy.gain_db;else copy.gain_db=Number(old);}return copy;})};}}
  }
  else if(a.kind==="detach"&&track.kind==="audio"){const {link_group_id:_group,...rest}=clip;put(track,{...rest,semantic_sidecar:clip.semantic_sidecar?{...clip.semantic_sidecar,labels:labels(clip).filter(l=>!l.startsWith("shot:")),metadata:{...clip.semantic_sidecar.metadata,precision_association:"detached"}}:undefined});}
  else if(a.kind==="detach"){if(track.kind!=="video"||clip.kind==="image")fail("PRECISION_VIDEO_AUDIO_REQUIRED",a.clip_id);if(clip.speed||clip.time_map||clip.automation_curves?.length)fail("PRECISION_DETACH_MAPPING_UNSUPPORTED","basic separation requires constant source mapping and static gain");const source=sourceOf(clip);if(source.sample_rate===null)fail("PRECISION_SOURCE_AUDIO_REQUIRED",a.clip_id);const id=`${prefix}:detached`,trackId="audio-narration";let audioTrack=tracks.find(t=>t.track_id===trackId);if(!audioTrack){audioTrack={track_id:trackId,kind:"audio",clips:[]};tracks.push(audioTrack);}const copied=remap(clip,id,new Map());const detached:Clip={clip_id:id,source:copied.source,timeline_start:copied.timeline_start,timeline_duration:copied.timeline_duration,media_kind:"audio",gain_db:clip.gain_db??0,...(clip.boundary_fades&&(clip.boundary_fades.audio_fade_in||clip.boundary_fades.audio_fade_out)?{boundary_fades:{schema_version:1 as const,...(clip.boundary_fades.audio_fade_in?{audio_fade_in:clip.boundary_fades.audio_fade_in}:{}),...(clip.boundary_fades.audio_fade_out?{audio_fade_out:clip.boundary_fades.audio_fade_out}:{})}}:{}),semantic_sidecar:{semantic_id:id,labels:["narration"],evidence_refs:[...(clip.semantic_sidecar?.evidence_refs??[])],metadata:{purpose:input.raw_text,precision_association:"detached"}}};append(audioTrack,detached);put(track,{...clip,gain_db:-96});for(let i=0;i<tracks.length;i++){const t=tracks[i]!;tracks[i]={...t,captions:t.captions?.map(c=>labels(c).includes(`audio-anchor:${clip.clip_id}`)?{...c,semantic_sidecar:{...c.semantic_sidecar!,labels:labels(c).map(l=>l===`audio-anchor:${clip.clip_id}`?`audio-anchor:${id}`:l)}}:c)};}}
  else if(a.kind==="link"){const picture=locate(a.picture_clip_id);if(track.kind!=="audio"||picture.track.kind!=="video")fail("PRECISION_ASSOCIATION_INVALID","associate audio with a picture clip");const metadata={...clip.semantic_sidecar?.metadata};delete metadata.precision_association;put(track,{...clip,link_group_id:picture.clip.clip_id,semantic_sidecar:clip.semantic_sidecar?{...clip.semantic_sidecar,metadata,labels:[...labels(clip).filter(l=>!l.startsWith("shot:")),`shot:${picture.clip.clip_id}`]}:undefined});}
 }
 // Ordinary timing edits preserve empty work intervals. Ripple explicitly shortens them.
 const workEnd=(items:readonly Track[])=>items.flatMap(t=>[...t.clips,...(t.gaps??[]),...(t.captions??[])]).reduce((n,c)=>end(c)>n?end(c):n,0n);
 const oldEnd=workEnd(base.tracks),rippleEnd=a.kind==="ripple"?(oldEnd>BigInt(a.end_ticks)?oldEnd-BigInt(a.end_ticks)+BigInt(a.start_ticks):oldEnd>BigInt(a.start_ticks)?BigInt(a.start_ticks):oldEnd):oldEnd;
 const extent=workEnd(tracks)>rippleEnd?workEnd(tracks):rippleEnd;
 for(let i=0;i<tracks.length;i++){const t=tracks[i]!,prior=base.tracks.find(x=>x.track_id===t.track_id);
  if(a.kind==="ripple"||t.kind!=="video"||same(prior?.clips.map(c=>[c.clip_id,c.timeline_start,c.timeline_duration])??[],t.clips.map(c=>[c.clip_id,c.timeline_start,c.timeline_duration])))continue;
  const ranges=t.clips.map(c=>({start:c.timeline_start,end:end(c)})).sort((x,y)=>x.start<y.start?-1:1),gaps:NonNullable<Track["gaps"]>[number][]=[];let cursor=0n;
  const gap=(start:bigint,finish:bigint)=>{if(finish<=start)return;const existing=t.gaps?.find(g=>g.timeline_start===start&&end(g)===finish);gaps.push(existing??{gap_id:`${prefix}:gap:${t.track_id}:${start}:${finish}`,timeline_start:start,timeline_duration:finish-start});};
  for(const range of ranges){gap(cursor,range.start);if(range.end>cursor)cursor=range.end;}gap(cursor,extent);tracks[i]={...t,gaps};
 }
 for(const target of tracks){const prior=base.tracks.find(t=>t.track_id===target.track_id);if(prior?.automation_curves?.length&&!same(prior.clips,target.clips))fail("PRECISION_TRACK_AUTOMATION_UNSUPPORTED","basic timing edits require static track semantics");}
 const commands:TimelineCommand[]=[];
 for(const target of tracks){const before=base.tracks.find(t=>t.track_id===target.track_id);if(!before){commands.push({type:"add_track",track:target});continue;}
  for(const old of before.clips){const next=target.clips.find(c=>c.clip_id===old.clip_id);if(!next)commands.push({type:"remove_clip",track_id:target.track_id,clip_id:old.clip_id});else if(!same(old,next))commands.push({type:"replace_clip",track_id:target.track_id,clip_id:old.clip_id,clip:next});}
  for(const next of target.clips)if(!before.clips.some(c=>c.clip_id===next.clip_id))commands.push({type:"add_clip",track_id:target.track_id,clip:next});
  if(!same(before.captions??[],target.captions??[]))commands.push({type:"set_track_properties",track_id:target.track_id,properties:{captions:target.captions??[]}});
  if(!same(before.audio_routing??[],target.audio_routing??[]))commands.push({type:"set_track_properties",track_id:target.track_id,properties:{audio_routing:target.audio_routing??[]}});
  if(!same(before.gaps??[],target.gaps??[]))commands.push({type:"set_track_properties",track_id:target.track_id,properties:{gaps:target.gaps??[]}});
  if(before.muted!==target.muted)commands.push({type:"set_track_properties",track_id:target.track_id,properties:{muted:target.muted}});
  if(before.solo!==target.solo)commands.push({type:"set_track_properties",track_id:target.track_id,properties:{solo:target.solo}});
 }
 if(!commands.length)fail("PRECISION_NO_CHANGE","the selected action has no effect");return commands;
}
