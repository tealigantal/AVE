import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { createQwenProvider } from "../../packages/platform/model-gateway/src/public.js";
import { fixtureSkillExchange } from "../fixtures/stage3/skill-planning.js";
import type { Timeline } from "../../packages/core/timeline-core/src/public.js";

// Actual file extraction, source identities, storage and dual encoding. The
// controlled model is deliberately distinct from real creative acceptance.
const root=await mkdtemp(resolve(tmpdir(),"ave-precision-")), credential={}, run=promisify(execFile);
let calls=0, scenes=0;
const time=(value:number)=>({schema_version:1,value,timescale:30});
const provider=createQwenProvider({api_key:"fixture",models:[{model:"fixture",media_types:["image/png","audio/wav"]}],fetch_impl:async(_url,init)=>{
  calls++;
  const content=JSON.parse(init!.body as string).messages[0].content;
  let output;
  if(Array.isArray(content)) {
    const c=JSON.parse(content[0].text);
    output={samples:c.samples.map((s:any)=>({sample_id:s.sample_id,description:`Actual controlled ${s.kind} sample`,uncertain:false,transcript:[]}))};
  } else {
    const c=JSON.parse(content), spans=c.source_spans;
    const image=spans.find((s:any)=>s.media_kind==="image"), video=spans.find((s:any)=>s.media_kind!=="image"&&s.observations.some((o:any)=>o.kind==="visual")), audio=spans.find((s:any)=>s.media_kind==="audio");
    const shots=[{shot_id:"photo",source_window:{kind:"image",asset_id:image.asset_id,span_id:image.span_id},timing:{kind:"still",duration_ticks:90},purpose:"Static photo",embedded_gain_db:-96,reframe:{mode:"contain",focal_x:0.5,focal_y:0.5},color:null},{shot_id:"motion",source_window:{asset_id:video?.asset_id??image.asset_id,span_id:video?.span_id??image.span_id,start:time(0),end:time(90)},timing:{kind:"exact"},purpose:"Moving picture",embedded_gain_db:-96,reframe:{mode:"contain",focal_x:0.5,focal_y:0.5},color:null}];
    if(!video){shots.splice(1,1);shots[0]!.timing={kind:"still",duration_ticks:180} as any;shots[0]!.reframe=null as any;}
    const decision={decision_version:1,target_duration_ticks:180,thesis:"Mixed work",shots,audio:[{audio_id:"voice",shot_id:"photo",source:{asset_id:audio?.asset_id??image.asset_id,span_id:audio?.span_id??image.span_id,start:time(0),end:time(90)},offset:time(0),role:"narration",gain_db:-6,fade_in:time(0),fade_out:time(0),purpose:"Independent voice"},{audio_id:"music",shot_id:"motion",source:{asset_id:audio?.asset_id??image.asset_id,span_id:audio?.span_id??image.span_id,start:time(0),end:time(90)},offset:time(0),role:"music",gain_db:c.request.revisions.at(-1).revision===2?-18:-12,fade_in:time(0),fade_out:time(0),purpose:"Music"}],captions:[],preserve_refs:c.request.revisions.at(-1).preserve_refs,applied_principle_ids:[],feedback_interpretation:"Fixture",change_summary:"Photo, video and audio"};
    if(!audio)decision.audio=[];
    if(c.timeline.version>0) {
      const pictures=c.timeline.tracks.find((t:any)=>t.kind==="video").clips;
      decision.shots=pictures.map((clip:any)=>({shot_id:clip.clip_id,source_window:clip.static_source??{asset_id:clip.source.asset_id,span_id:clip.semantic_sidecar.evidence_refs[0],start:{schema_version:1,value:Number(clip.source.start_pts),timescale:Number(clip.source.timescale)},end:{schema_version:1,value:Number(clip.source.end_pts),timescale:Number(clip.source.timescale)}},timing:clip.kind==="image"?{kind:"still",duration_ticks:Number(clip.timeline_duration)}:{kind:"exact"},purpose:"Retain manually refined picture",embedded_gain_db:clip.gain_db??0,reframe:clip.reframe,color:null}));
      decision.audio=c.timeline.tracks.filter((t:any)=>t.kind==="audio").flatMap((track:any)=>track.clips.map((clip:any)=>({audio_id:clip.clip_id,shot_id:clip.link_group_id??pictures.find((p:any)=>Number(p.timeline_start)<=Number(clip.timeline_start)&&Number(p.timeline_start)+Number(p.timeline_duration)>Number(clip.timeline_start)).clip_id,source:{asset_id:clip.source.asset_id,span_id:clip.semantic_sidecar.evidence_refs[0],start:{schema_version:1,value:Number(clip.source.start_pts),timescale:Number(clip.source.timescale)},end:{schema_version:1,value:Number(clip.source.end_pts),timescale:Number(clip.source.timescale)}},offset:time(Number(clip.timeline_start)-Number(pictures.find((p:any)=>p.clip_id===(clip.link_group_id??pictures.find((p:any)=>Number(p.timeline_start)<=Number(clip.timeline_start)&&Number(p.timeline_start)+Number(p.timeline_duration)>Number(clip.timeline_start)).clip_id)).timeline_start)),role:track.track_id.slice(6),gain_db:clip.gain_db??0,fade_in:clip.boundary_fades?.audio_fade_in?{schema_version:1,value:Number(clip.boundary_fades.audio_fade_in.value),timescale:Number(clip.boundary_fades.audio_fade_in.timescale)}:time(0),fade_out:clip.boundary_fades?.audio_fade_out?{schema_version:1,value:Number(clip.boundary_fades.audio_fade_out.value),timescale:Number(clip.boundary_fades.audio_fade_out.timescale)}:time(0),purpose:"Retain actual manual sound"})));
      decision.captions=c.timeline.tracks.flatMap((t:any)=>t.captions??[]).map((caption:any)=>({caption_id:caption.caption_id,shot_id:pictures[0].clip_id,kind:caption.retention_kind??"editorial",audio_anchor:null,text:caption.text,offset:time(Number(caption.timeline_start)-Number(pictures[0].timeline_start)),duration:time(Number(caption.timeline_duration)),evidence_ids:[image.observations[0].evidence_id]}));
    }
    if(c.planning_exchange.phase==="measure-only")output=fixtureSkillExchange(c,{exchange_version:3,kind:"measure_selection",query_id:c.planning_exchange.assigned_query_id,target_duration_ticks:180,...(c.timeline.version>0?{retain_manual_layout:true}:{}),selection:decision.shots.map(s=>({selection_id:s.shot_id,source_choice:{kind:"custom_window",source_window:s.source_window},timing:s.timing}))},decision);
    else {const receipt=c.planning_exchange.feasible_receipts[0];const {decision_version,target_duration_ticks,shots:unused,...creative}=decision;output=fixtureSkillExchange(c,{exchange_version:3,kind:"final",measured_query_id:receipt.query_id,measurement_receipt_digest:receipt.measurement_receipt_digest,creative:{...creative,shots:decision.shots.map(({source_window,timing,...s})=>s)}},decision);}
  }
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(output)},finish_reason:"stop"}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}));
}});
const options={now:()=>Date.parse("2026-09-24T01:00:00Z"),creationRequestChannels:[{credential,actor_id:"user-1"}],provider:"qwen",model:"fixture",modelProvider:provider,creationObservationPolicy:{scene_threshold:100,max_frame_edge:64,max_samples:32,timeout_seconds:30},creationModelPolicy:{max_attempts:1 as const,timeout_ms:30000}};
let host=new ProjectHostSession(options);
try {
 const image=resolve(root,"photo.png"), video=resolve(root,"video.mp4"),audio=resolve(root,"voice.wav"),project=resolve(root,"project");
 await run(process.env.AVE_PYTHON ?? "python",["-c","from PIL import Image; import sys; Image.new('RGBA',(1081,1921),(200,180,110,230)).save(sys.argv[1])",image]);
 await run("ffmpeg",["-v","error","-f","lavfi","-i","testsrc2=s=96x64:r=30:d=3","-f","lavfi","-i","sine=frequency=880:sample_rate=48000:duration=3","-c:a","aac","-c:v","libx264","-pix_fmt","yuv420p",video]);
 await run("ffmpeg",["-v","error","-f","lavfi","-i","sine=frequency=330:sample_rate=44100:duration=3","-c:a","pcm_s16le",audio]);
 await host.create(project);host.initializeTimeline([],{sequence_id:"main",timebase:{value:1n,timescale:30n},tracks:[]});
 const media=await host.importMedia([audio,image,video]) as any[];
 const imagePreview=await host.readMediaPreview(media[1].asset_id),audioPreview=await host.readMediaPreview(media[0].asset_id);
 assert.ok(imagePreview.thumbnail);assert.ok(audioPreview.audio);assert.ok(audioPreview.waveform);
 const port=(host as any).workerPort, originalSubmit=port.submit.bind(port);port.submit=(task:string,...args:any[])=>{if(task==="media.scene_scan.v1")scenes++;return originalSubmit(task,...args);};
 const {actor_id,project_id,deployment,...auth}=JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json","utf8")).authorization;
 Object.assign(auth,{request_id:"mixed",original_text:"制作6秒混合作品",asset_ids:media.map(m=>m.asset_id),provider:"qwen",model:"fixture",allowed_data:["request","timeline","evidence","frames","audio"]});
 host.beginCreationRequest(credential,auth);
 for(const m of media)await host.prepareCreationMaterial(credential,{operation_id:m.asset_id,request_id:"mixed",asset_id:m.asset_id,asset_location_id:m.asset_location_id});
 const observation=await host.observeCreationMaterial(credential,{request_id:"mixed",expected_revision:1,material_operation_ids:media.map(m=>m.asset_id),include_audio:true});
 assert.equal(scenes,1,"audio/images never enter video scene scan");
 assert.deepEqual(observation.value.samples.map(s=>s.sample.detail.kind).sort(),["audio","audio","frame","frame","frame","image"].sort());
 assert.equal(host.readCreationObservation(observation.ref.run_id).object_hash,observation.object_hash);
 const draft=await host.generateCreationDraft(credential,{request_id:"mixed",expected_revision:1,observation_refs:[observation.ref],profile_query:null});
 const timeline=host.readTimelineSnapshot() as Timeline;
 assert.equal(timeline.tracks[0]!.clips[0]!.kind,"image");assert.equal(timeline.tracks[0]!.clips[0]!.timeline_duration,90n);
 assert.equal(timeline.tracks.find(t=>t.track_id==="audio-narration")!.clips[0]!.timeline_duration,90n);
 assert.equal(calls,3,"one observation plus exactly two planning calls");
 let selected=draft.draft_id,seq=0;
 const current=()=>host.readTimelineSnapshot() as Timeline;
 const act=async(action:any,preserve_refs:string[]=[])=>{
   const before=current(),state=host.readCreationRequest("mixed"),modelCallsBefore=calls;
   const input={schema_version:1,operation_id:`op-${++seq}`,request_id:"mixed",expected_revision:state.revisions.at(-1)!.revision,expected_timeline_version:before.version,parent_draft_id:selected,raw_text:"Explicit precision action "+action.kind,preserve_refs,action};
   const result=await host.precisionEditCreationDraft(credential,input);selected=result.draft_id;
   assert.equal(current().version,before.version+1,"one user action is one atomic Timeline version");
   assert.equal(result.state.drafts.at(-1)!.parent_draft_id,input.parent_draft_id);
   assert.equal(calls,modelCallsBefore,"manual precision does not call the model");
   return {input,result};
 };
 const sources=host.readCreationPrecisionSources(credential,{request_id:"mixed",parent_draft_id:selected});
 assert.deepEqual(sources.find((s:any)=>s.media_kind==="image").start,{schema_version:1,value:0,timescale:1});
 const replay=await act({kind:"gain",clip_id:"music",gain_db:-18});const replayBefore=current();const replayed=await host.precisionEditCreationDraft(credential,replay.input);assert.equal(replayed.draft_id,replay.result.draft_id);assert.deepEqual(current(),replayBefore,"lost response replay creates no second version");
 const transformed=await act({kind:"transform",clip_id:"photo",x:3,y:2,scale_x:0.8,scale_y:0.9,rotation:12});
 await act({kind:"caption",track_id:"video-main",caption_id:null,text:"Human editorial words",at_ticks:"60",duration_ticks:"60",safe_y_ratio:0.78});
 const refined=current(),refinedId=selected;
 const restore=async(source:string)=>{const state=host.readCreationRequest("mixed"),result=await host.restoreCreationDraft(credential,{request_id:"mixed",expected_revision:state.revisions.at(-1)!.revision,expected_timeline_version:current().version,source_draft_id:source,parent_draft_id:selected,operation_id:`restore-${++seq}`,raw_text:"Undo or redo one atomic refinement",preserve_refs:[]});selected=result.draft_id;};
 const equivalent=(a:Timeline,b:Timeline)=>{const {version:av,...x}=a,{version:bv,...y}=b;assert.deepEqual(x,y);};
 await restore(transformed.result.draft_id);assert.equal(current().tracks[0]!.captions?.length??0,0);await restore(refinedId);equivalent(current(),refined);
 // Every adapter runs through actual source holds, permission checks, CommitPlan and storage.
 const audioSource=sources.find((s:any)=>s.media_kind==="audio"),imageSource=sources.find((s:any)=>s.media_kind==="image");
 const cases=[
   {kind:"split",clip_id:"photo",at_ticks:"45",associated:true},
   {kind:"trim",clip_id:"music",source_start:time(30),source_end:time(60),associated:false},
   {kind:"ripple",start_ticks:"120",end_ticks:"150"},
   {kind:"duplicate",clip_id:"photo",at_ticks:"180",associated:true,snap:false},
   {kind:"move",clip_id:"photo",at_ticks:"180",associated:true,snap:true},
   {kind:"delete",clip_id:"voice",associated:false},
   {kind:"image_duration",clip_id:"photo",duration_ticks:"60"},
   {kind:"reframe",clip_id:"photo",mode:"crop_fill",focal_x:0.4,focal_y:0.6},
   {kind:"fades",clip_id:"music",fade_in:time(10),fade_out:time(10)},
   {kind:"repeat",clip_id:"music",count:2},
   {kind:"mute",clip_id:"music",enabled:true},
   {kind:"solo",clip_id:"music",enabled:true},
   {kind:"duck",enabled:true},
   {kind:"detach",clip_id:"voice"},
   {kind:"detach",clip_id:"motion"},
   {kind:"split",clip_id:"motion",at_ticks:"120",associated:true},
   {kind:"link",clip_id:"music",picture_clip_id:"photo"},
   {kind:"insert",asset_id:audioSource.asset_id,span_id:audioSource.span_id,source_start:time(0),source_end:time(30),duration_ticks:"30",at_ticks:"0",role:"sfx"},
   {kind:"replace",clip_id:"motion",asset_id:imageSource.asset_id,span_id:imageSource.span_id,source_start:{schema_version:1,value:0,timescale:1},source_end:{schema_version:1,value:0,timescale:1},duration_ticks:"90"},
 ];
 for(const action of cases){await act(action);if(action.kind==="ripple"){const music=current().tracks.find(t=>t.track_id==="audio-music")!.clips;assert.equal(music.length,2);assert.equal(music[1]!.timeline_start,120n);assert.equal(music[1]!.source.start_pts*30n/music[1]!.source.timescale,60n);}if(action.kind==="detach"&&action.clip_id==="motion"){const detached=current().tracks.find(t=>t.track_id==="audio-narration")!.clips.find(c=>c.clip_id!=="voice")!;assert.equal(detached.semantic_sidecar!.metadata!.precision_association,"detached");await act({kind:"gain",clip_id:detached.clip_id,gain_db:-12});const soundRender=await host.renderCreationDraft(credential,{request_id:"mixed",draft_id:selected,operation_id:"render-detached"});assert.equal((soundRender.receipt.master.qc_report as any).status,"passed");}await restore(refinedId);equivalent(current(),refined);}
 const beforeInvalid=current(),invalidState=host.readCreationRequest("mixed");
 await assert.rejects(act({kind:"trim",clip_id:"music",source_start:{schema_version:1,value:1,timescale:44099},source_end:time(60),associated:false}),/SAMPLE_BOUNDARY/);
 assert.deepEqual(current(),beforeInvalid);assert.deepEqual(host.readCreationRequest("mixed"),invalidState);
 // Ordinary associated deletion leaves a deliberate 3s blank, with no invented footage.
 const gapBase=current();
 const gapDraft=await host.precisionEditCreationDraft(credential,{schema_version:1,operation_id:"blank-precision",request_id:"mixed",expected_revision:1,expected_timeline_version:gapBase.version,parent_draft_id:selected,raw_text:"Remove the photo and associated voice; retain the gap",preserve_refs:[],action:{kind:"delete",clip_id:"photo",associated:true}});selected=gapDraft.draft_id;
 const gapTimeline=current();assert.equal(gapTimeline.tracks[0]!.gaps![0]!.timeline_duration,90n);assert.equal(gapTimeline.tracks[0]!.clips[0]!.timeline_start,90n);
 const gapRender=await host.renderCreationDraft(credential,{request_id:"mixed",draft_id:selected,operation_id:"render-ordinary-gap"});assert.equal((gapRender.receipt.master.qc_report as any).status,"passed","declared blank/silence does not disable checks elsewhere");
 host.reviseCreationRequest(credential,"mixed",1,{raw_text:"只调整音量，保留当前画面位置、留白和时长。",viewed_timeline_version:gapTimeline.version,preserve_refs:["motion"]});
 const gapRevised=await host.generateCreationDraft(credential,{request_id:"mixed",expected_revision:2,observation_refs:[observation.ref],profile_query:null});selected=gapRevised.draft_id;
 assert.equal(current().tracks[0]!.clips[0]!.timeline_start,90n);assert.deepEqual(current().tracks[0]!.gaps,gapTimeline.tracks[0]!.gaps);
 const gapAiRender=await host.renderCreationDraft(credential,{request_id:"mixed",draft_id:selected,operation_id:"render-retained-gap"});assert.equal((gapAiRender.receipt.preview.qc_report as any).status,"passed");
 await restore(refinedId);equivalent(current(),refined);
 const protectedResult=await act({kind:"gain",clip_id:"music",gain_db:-20},["photo"]),protectedTimeline=current();
 await assert.rejects(act({kind:"transform",clip_id:"photo",x:9,y:2,scale_x:0.8,scale_y:0.9,rotation:12},["photo"]),/PROTECTED_CONTENT_CHANGED/);assert.deepEqual(current(),protectedTimeline);
 host.reviseCreationRequest(credential,"mixed",2,{raw_text:"保留照片构图、音乐、字幕及精修，只更新表达。",viewed_timeline_version:current().version,preserve_refs:["motion","photo",`caption:${protectedTimeline.tracks[0]!.captions![0]!.caption_id}`]});
 const revised=await host.generateCreationDraft(credential,{request_id:"mixed",expected_revision:3,observation_refs:[observation.ref],profile_query:null});selected=revised.draft_id;
 const revision=current();assert.deepEqual(revision.tracks[0]!.clips[0]!.transform,protectedTimeline.tracks[0]!.clips[0]!.transform,"manual rotation survives protected AI continuation");assert.deepEqual(revision.tracks[0]!.clips[0]!.source,protectedTimeline.tracks[0]!.clips[0]!.source);assert.equal(revision.tracks[0]!.clips[0]!.timeline_duration,90n);
 assert.equal(revision.tracks.find(t=>t.track_id==="audio-music")!.clips[0]!.gain_db,-20);assert.equal(revision.tracks[0]!.captions![0]!.style!.safe_y_ratio,0.78);
 const rendered=await host.renderCreationDraft(credential,{request_id:"mixed",draft_id:revised.draft_id,operation_id:"render-precision"});
 assert.equal((rendered.receipt.preview.qc_report as any).status,"passed");assert.equal((rendered.receipt.master.qc_report as any).status,"passed");
 await host.close();host=new ProjectHostSession(options);await host.open(project);
 assert.equal(host.readCreationObservation(observation.ref.run_id).object_hash,observation.object_hash);
 assert.equal((host.readTimelineSnapshot() as Timeline).tracks[0]!.clips[0]!.kind,"image");
 const reopenedRender=await host.renderCreationDraft(credential,{request_id:"mixed",draft_id:selected,operation_id:"render-precision-reopen"});assert.equal((reopenedRender.receipt.master.qc_report as any).status,"passed");
 const heldBefore=current(),hold=(host as any).holdCreationSources.bind(host);let reached!:()=>void,release!:()=>void;const admitted=new Promise<void>(resolve=>{reached=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;});
 (host as any).holdCreationSources=async(...args:any[])=>{reached();await gate;return hold(...args);};
 const cancelled=host.precisionEditCreationDraft(credential,{schema_version:1,operation_id:"cancelled-precision",request_id:"mixed",expected_revision:3,expected_timeline_version:heldBefore.version,parent_draft_id:selected,raw_text:"Cancelled precise gain",preserve_refs:[],action:{kind:"gain",clip_id:"music",gain_db:-22}});const rejection=assert.rejects(cancelled,(error:any)=>error.code==="REQUEST_CANCELLED");await admitted;host.cancelCreationRequest(credential,"mixed",false);release();await rejection;assert.deepEqual(current(),heldBefore);assert.equal((host as any).creationModelOperations.size,0,"cancelled precision releases operation and source holds");
 console.log("Precision Host: actual media grids, typed atomic actions, protection, undo/redo, manual-after-AI, dual encode/QC and reopen passed (controlled model)");
} finally {await host.close();await rm(root,{recursive:true,force:true});}
