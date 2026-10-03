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

import { AUDIO_PACK,AUDIO_PACK_DIGEST,downloadAudioResource } from "../../packages/platform/project-host/src/audio-library.js";
import { assertAudioResourcePack } from "../../packages/platform/contract-runtime/src/public.js";
const music=AUDIO_PACK.items.find(item=>item.resource_id==="oga:8a83b97f06cad105")!,sound=AUDIO_PACK.items.find(item=>item.resource_id==="kenney:d21d0f0b782445db")!;
const musicWire=readFileSync("tests/fixtures/stage3/audio-library/music.wire"),soundWire=readFileSync("tests/fixtures/stage3/audio-library/sfx.wire");
let networkCalls=0,offline=false;
const fetchLibrary:typeof fetch=async(url,init)=>{
 if(offline)throw new Error("intentional offline transport");networkCalls++;
 const item=String(url)===music.download.url?music:sound,wire=item===music?musicWire:soundWire;
 const download=item.download,ranged=download.kind==="archive_range";
 if(download.kind==="archive_range")assert.equal((init!.headers as any).Range,`bytes=${download.range_start}-${download.range_end}`);
 return new Response(wire,{status:ranged?206:200,headers:{"content-length":String(wire.length),...(download.kind==="archive_range"?{"content-range":`bytes ${download.range_start}-${download.range_end}/${download.archive_byte_length}`}:{})}});
};
assertAudioResourcePack(AUDIO_PACK);
assert.throws(()=>assertAudioResourcePack({...AUDIO_PACK,items:[...AUDIO_PACK.items.slice(1),AUDIO_PACK.items[1]]}),/DUPLICATE|kenney|oga/);
for(const status of [403,404])await assert.rejects(downloadAudioResource(music,new AbortController().signal,async()=>new Response("denied",{status})),new RegExp(`HTTP ${status}`));
await assert.rejects(downloadAudioResource(music,new AbortController().signal,async()=>new Response(Buffer.alloc(music.byte_length),{status:200})),/oga:/);
await assert.rejects(downloadAudioResource(sound,new AbortController().signal,async()=>new Response(soundWire,{status:206,headers:{"content-range":"bytes 0-1/2"}})),/kenney:/);
const abort=new AbortController(),blocked=downloadAudioResource(music,abort.signal,async(_url,init)=>new Promise((_resolve,reject)=>init!.signal!.addEventListener("abort",()=>reject(init!.signal!.reason),{once:true})));abort.abort(new Error("explicit test cancellation"));await assert.rejects(blocked,/aborted/);
assert.equal((await downloadAudioResource(music,new AbortController().signal,fetchLibrary)).length,music.byte_length);
assert.equal((await downloadAudioResource(sound,new AbortController().signal,fetchLibrary)).length,sound.byte_length);
const originalFetch=globalThis.fetch;globalThis.fetch=fetchLibrary;
const options={now:()=>Date.parse("2026-10-02T01:00:00Z"),creationRequestChannels:[{credential,actor_id:"user-1"}],provider:"qwen",model:"fixture",modelProvider:provider,creationObservationPolicy:{scene_threshold:100,max_frame_edge:64,max_samples:32,timeout_seconds:30},creationModelPolicy:{max_attempts:1 as const,timeout_ms:30000}};
let host=new ProjectHostSession(options);
try {
 const image=resolve(root,"photo.png"),project=resolve(root,"project");await run(process.env.AVE_PYTHON??"python",["-c","from PIL import Image; import sys; Image.new('RGB',(64,48),(20,70,110)).save(sys.argv[1])",image]);
 await host.create(project);host.initializeTimeline([],{sequence_id:"main",timebase:{value:1n,timescale:30n},tracks:[]});const original=(await host.importMedia([image]))[0] as any;
 const {actor_id,project_id,deployment,...auth}=JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json","utf8")).authorization;
 Object.assign(auth,{request_id:"library",original_text:"制作6秒照片作品",expires_at:"2026-10-03T01:00:00Z",asset_ids:[original.asset_id],provider:"qwen",model:"fixture",allowed_data:["request","timeline","evidence","frames","audio"]});
 const scope={pack_id:AUDIO_PACK.pack_id,pack_version:AUDIO_PACK.pack_version,pack_digest:AUDIO_PACK_DIGEST,mode:"manual" as const};
 host.beginCreationRequest(credential,{...auth,request_id:"old"});await assert.rejects(host.audioLibraryOperation(credential,{action:"acquire",request_id:"old",operation_id:"denied",resource_id:music.resource_id}),/enable this exact/);
 await assert.rejects(host.audioLibraryOperation(credential,{action:"acquire",request_id:"missing",operation_id:"missing",resource_id:music.resource_id}));
 host.beginCreationRequest(credential,{...auth,audio_library:scope});await host.prepareCreationMaterial(credential,{operation_id:"photo",request_id:"library",asset_id:original.asset_id,asset_location_id:original.asset_location_id});
 const observation=await host.observeCreationMaterial(credential,{request_id:"library",expected_revision:1,material_operation_ids:["photo"],include_audio:false});const first=await host.generateCreationDraft(credential,{request_id:"library",expected_revision:1,observation_refs:[observation.ref],profile_query:null});
 globalThis.fetch=async(_url,init)=>new Promise((_resolve,reject)=>init!.signal!.addEventListener("abort",()=>reject(init!.signal!.reason),{once:true}));
 const cancelled=host.audioLibraryOperation(credential,{action:"preview",operation_id:"cancel-audition",resource_id:sound.resource_id});
 for(let i=0;i<100 && !(host as any).creationModelOperations.has("audio-library:cancel-audition");i++)await new Promise(resolve=>setTimeout(resolve,5));
 await assert.rejects(host.audioLibraryOperation(credential,{action:"clear_cache"}),/another library operation/);
 const rejected=assert.rejects(cancelled,/cancel|aborted/i);await host.audioLibraryOperation(credential,{action:"cancel",operation_id:"cancel-audition"});await host.audioLibraryOperation(credential,{action:"clear_cache"});await rejected;
 assert.equal(host.listMedia().length,2,"cancelled audition registers no asset");globalThis.fetch=fetchLibrary;
 const preview=await host.audioLibraryOperation(credential,{action:"preview",operation_id:"audition",resource_id:sound.resource_id});assert.ok(preview.audio.length>0);assert.equal(host.listMedia().length,2,"audition registers no media; photo has its prepared immutable");
 const one=await host.audioLibraryOperation(credential,{action:"apply",operation_id:"add-music",request_id:"library",expected_revision:1,expected_timeline_version:1,parent_draft_id:first.draft_id,raw_text:"加入已选配乐",preserve_refs:[],resource_id:music.resource_id,placement_ticks:"0",duration_ticks:"180",gain_db:-12,replace_clip_id:null});
 const repeat=await host.audioLibraryOperation(credential,{action:"apply",operation_id:"add-music",request_id:"library",expected_revision:1,expected_timeline_version:1,parent_draft_id:first.draft_id,raw_text:"加入已选配乐",preserve_refs:[],resource_id:music.resource_id,placement_ticks:"0",duration_ticks:"180",gain_db:-12,replace_clip_id:null});assert.equal(repeat.draft_id,one.draft_id);assert.equal((host.readTimelineSnapshot() as Timeline).version,2,"lost apply response retries the exact committed operation without another version");
 const two=await host.audioLibraryOperation(credential,{action:"apply",operation_id:"add-sfx",request_id:"library",expected_revision:1,expected_timeline_version:2,parent_draft_id:one.draft_id,raw_text:"加入提示音效",preserve_refs:[],resource_id:sound.resource_id,placement_ticks:"30",duration_ticks:"3",gain_db:-12,replace_clip_id:null});
 const timeline=host.readTimelineSnapshot() as Timeline;assert.equal(timeline.version,3);for(const track of timeline.tracks.filter(track=>track.kind==="audio"))for(const route of track.audio_routing??[])assert.equal(route.routing_id,`routing:${route.source_clip_id}`,"manual resources preserve the planner routing identity");assert.equal(timeline.tracks.find(track=>track.track_id==="audio-sfx")!.audio_routing![0]!.bus,"sfx");

 const current=()=>host.readTimelineSnapshot() as Timeline,find=(id:string)=>current().tracks.flatMap(t=>t.clips).find(c=>c.clip_id===id)!;
 const musicId=current().tracks.find(t=>t.track_id==="audio-music")!.clips[0]!.clip_id,sfxId=current().tracks.find(t=>t.track_id==="audio-sfx")!.clips[0]!.clip_id;
 const muted=await host.editCreationDraft(credential,{request_id:"library",operation_id:"mute-before-solo",expected_revision:1,expected_timeline_version:3,parent_draft_id:two.draft_id,raw_text:"先静音配乐",preserve_refs:[],commands:[{type:"set_track_properties",track_id:"audio-music",properties:{muted:true}}]});
 const soloSound=await host.precisionEditCreationDraft(credential,{schema_version:1,request_id:"library",operation_id:"solo-sound",expected_revision:1,expected_timeline_version:4,parent_draft_id:muted.draft_id,raw_text:"独听音效",preserve_refs:[],action:{kind:"solo",clip_id:sfxId,enabled:true}});
 const replaced=await host.audioLibraryOperation(credential,{action:"apply",operation_id:"replace-suppressed",request_id:"library",expected_revision:1,expected_timeline_version:5,parent_draft_id:soloSound.draft_id,raw_text:"替换被独听暂时压低的配乐",preserve_refs:[],resource_id:music.resource_id,placement_ticks:"0",duration_ticks:"180",gain_db:-18,replace_clip_id:musicId});
 assert.equal(find(musicId).gain_db,-96);assert.equal(find(musicId).semantic_sidecar!.metadata!.precision_solo_gain,"-18");assert.equal(find(musicId).semantic_sidecar!.metadata!.precision_solo_track_muted,"true");assert.equal(current().tracks.find(t=>t.track_id==="audio-music")!.audio_routing![0]!.muted,true);
 const restored=await host.precisionEditCreationDraft(credential,{schema_version:1,request_id:"library",operation_id:"restore-solo-sound",expected_revision:1,expected_timeline_version:6,parent_draft_id:replaced.draft_id,raw_text:"取消独听恢复原静音与修改后音量",preserve_refs:[],action:{kind:"solo",clip_id:sfxId,enabled:false}});
 assert.equal(find(musicId).gain_db,-18);assert.equal(current().tracks.find(t=>t.track_id==="audio-music")!.muted,true);assert.equal(current().tracks.find(t=>t.track_id==="audio-music")!.audio_routing![0]!.muted,false);assert.ok(!Object.keys(find(musicId).semantic_sidecar!.metadata!).some(k=>k.startsWith("precision_solo_")));
 const recovered=await host.restoreCreationDraft(credential,{request_id:"library",expected_revision:1,expected_timeline_version:7,source_draft_id:two.draft_id,parent_draft_id:restored.draft_id,operation_id:"undo-library-solo-batch",raw_text:"恢复之前的可听混音",preserve_refs:[]});
 const count=host.listMedia().length,downloadCount=networkCalls;await host.audioLibraryOperation(credential,{action:"clear_cache"});offline=true;
 const again=await host.audioLibraryOperation(credential,{action:"acquire",operation_id:"duplicate",request_id:"library",resource_id:music.resource_id});assert.equal(again.asset_id,`asset:sha256:${music.content_sha256}`);assert.equal(host.listMedia().length,count);assert.equal(networkCalls,downloadCount);
 const localPreview=await host.audioLibraryOperation(credential,{action:"preview",operation_id:"offline-audition",resource_id:music.resource_id});assert.ok(localPreview.audio.length>0);
 const render=await host.renderCreationDraft(credential,{request_id:"library",draft_id:recovered.draft_id,operation_id:"render-library"});assert.equal((render.receipt.master.qc_report as any).status,"passed");
 await host.close();host=new ProjectHostSession(options);await host.open(project);await host.audioLibraryOperation(credential,{action:"clear_cache"});const reopened=await host.renderCreationDraft(credential,{request_id:"library",draft_id:recovered.draft_id,operation_id:"offline-render"});assert.equal((reopened.receipt.preview.qc_report as any).status,"passed");assert.equal(networkCalls,downloadCount);
 console.log("Pinned audio pack: download/range/hash/errors, manual request grant, audition, atomic music/SFX drafts, deduplication, cache cleanup and offline reopen/dual render passed");
}finally{globalThis.fetch=originalFetch;await host.close();await rm(root,{recursive:true,force:true});}
