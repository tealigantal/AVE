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
const root=await mkdtemp(resolve(tmpdir(),"ave-mixed-")), credential={}, run=promisify(execFile);
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
    if(c.planning_exchange.phase==="measure-only")output=fixtureSkillExchange(c,{exchange_version:3,kind:"measure_selection",query_id:c.planning_exchange.assigned_query_id,target_duration_ticks:180,selection:shots.map(s=>({selection_id:s.shot_id,source_choice:{kind:"custom_window",source_window:s.source_window},timing:s.timing}))},decision);
    else {const receipt=c.planning_exchange.feasible_receipts[0];const {decision_version,target_duration_ticks,shots:unused,...creative}=decision;output=fixtureSkillExchange(c,{exchange_version:3,kind:"final",measured_query_id:receipt.query_id,measurement_receipt_digest:receipt.measurement_receipt_digest,creative:{...creative,shots:shots.map(({source_window,timing,...s})=>s)}},decision);}
  }
  return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(output)},finish_reason:"stop"}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}));
}});
const options={now:()=>Date.parse("2026-09-24T01:00:00Z"),creationRequestChannels:[{credential,actor_id:"user-1"}],provider:"qwen",model:"fixture",modelProvider:provider,creationObservationPolicy:{scene_threshold:100,max_frame_edge:64,max_samples:32,timeout_seconds:30},creationModelPolicy:{max_attempts:1 as const,timeout_ms:30000}};
let host=new ProjectHostSession(options);
try {
 const image=resolve(root,"photo.png"), video=resolve(root,"video.mp4"),audio=resolve(root,"voice.wav"),project=resolve(root,"project");
 await run(process.env.AVE_PYTHON ?? "python",["-c","from PIL import Image; import sys; Image.new('RGBA',(63,47),(20,70,110,80)).save(sys.argv[1])",image]);
 await run("ffmpeg",["-v","error","-f","lavfi","-i","testsrc2=s=96x64:r=30:d=3","-c:v","libx264","-pix_fmt","yuv420p",video]);
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
 assert.deepEqual(observation.value.samples.map(s=>s.sample.detail.kind).sort(),["audio","frame","frame","frame","image"].sort());
 assert.equal(host.readCreationObservation(observation.ref.run_id).object_hash,observation.object_hash);
 const draft=await host.generateCreationDraft(credential,{request_id:"mixed",expected_revision:1,observation_refs:[observation.ref],profile_query:null});
 const timeline=host.readTimelineSnapshot() as Timeline;
 assert.equal(timeline.tracks[0]!.clips[0]!.kind,"image");assert.equal(timeline.tracks[0]!.clips[0]!.timeline_duration,90n);
 assert.equal(timeline.tracks.find(t=>t.track_id==="audio-narration")!.clips[0]!.timeline_duration,90n);
 assert.equal(calls,3,"one observation plus exactly two planning calls");
 host.reviseCreationRequest(credential,"mixed",1,{raw_text:"保留照片，将音乐降低6dB。",viewed_timeline_version:1,preserve_refs:["photo"]});
 const revised=await host.generateCreationDraft(credential,{request_id:"mixed",expected_revision:2,observation_refs:[observation.ref],profile_query:null});
 const revision=host.readTimelineSnapshot() as Timeline;
 assert.deepEqual(revision.tracks[0]!.clips[0],timeline.tracks[0]!.clips[0],"protected static identity, duration and framing survive language edits");
 assert.equal(revision.tracks.find(t=>t.track_id==="audio-music")!.clips[0]!.gain_db,-18);
 const rendered=await host.renderCreationDraft(credential,{request_id:"mixed",draft_id:revised.draft_id,operation_id:"render-mixed"});
 assert.equal((rendered.receipt.preview.qc_report as any).status,"passed");assert.equal((rendered.receipt.master.qc_report as any).status,"passed");
 await host.close();host=new ProjectHostSession(options);await host.open(project);
 assert.equal(host.readCreationObservation(observation.ref.run_id).object_hash,observation.object_hash);
 assert.equal((host.readTimelineSnapshot() as Timeline).tracks[0]!.clips[0]!.kind,"image");
 await host.close();
 await host.create(resolve(root,"still-project"));host.initializeTimeline([],{sequence_id:"main",timebase:{value:1n,timescale:30n},tracks:[]});
 const still=(await host.importMedia([image]))[0] as any;
 host.beginCreationRequest(credential,{...auth,request_id:"still-native",asset_ids:[still.asset_id]});
 await host.prepareCreationMaterial(credential,{operation_id:"still-source",request_id:"still-native",asset_id:still.asset_id,asset_location_id:still.asset_location_id});
 const stillObservation=await host.observeCreationMaterial(credential,{request_id:"still-native",expected_revision:1,material_operation_ids:["still-source"],include_audio:false});
 const stillDraft=await host.generateCreationDraft(credential,{request_id:"still-native",expected_revision:1,observation_refs:[stillObservation.ref],profile_query:null});
 const stillRender=await host.renderCreationDraft(credential,{request_id:"still-native",draft_id:stillDraft.draft_id,operation_id:"render-still-native"});
 assert.equal((stillRender.receipt.preview.qc_report as any).status,"passed");assert.equal((stillRender.receipt.master.qc_report as any).status,"passed");
 console.log("Mixed static image/video/44.1k independent audio: actual extraction, two-call allocation, atomic commit, dual encoding/QC and reopen passed (controlled model)");
} finally {await host.close();await rm(root,{recursive:true,force:true});}
