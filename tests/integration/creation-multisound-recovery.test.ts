import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {ProjectHostSession} from "../../packages/platform/project-host/src/public.js";
import {createQwenProvider} from "../../packages/platform/model-gateway/src/public.js";
import {AUDIO_PACK,AUDIO_PACK_DIGEST} from "../../packages/platform/project-host/src/audio-library.js";
import {fixtureSkillExchange} from "../fixtures/stage3/skill-planning.js";
import {creationGenerationFailureContext} from "../../packages/platform/project-host/src/stage3-creative.js";

const root=await mkdtemp(resolve(tmpdir(),"ave-multi-recovery-")), run=promisify(execFile), credential={};
const good=AUDIO_PACK.items.find(item=>item.resource_id==="oga:8a83b97f06cad105")!;
const bad=AUDIO_PACK.items.slice(0,2), wire=readFileSync("tests/fixtures/stage3/audio-library/music.wire");
const previousFetch=globalThis.fetch;const attempts:string[]=[];let planningCalls=0;const secondMeasurement=process.env.AVE_TEST_SECOND_MEASUREMENT==="1", exhausted=process.env.AVE_TEST_EXHAUST==="1", cascade=process.env.AVE_TEST_CASCADE==="1" || exhausted;
globalThis.fetch=async url=>{const item=[...bad,good].find(item=>item.download.url===String(url));assert.ok(item,"only selected pinned resources are fetched");attempts.push(item.resource_id);return item===good?new Response(wire,{status:200,headers:{"content-length":String(wire.length)}}):new Response("unavailable",{status:503});};
const time=(value:number,timescale=30)=>({schema_version:1,value,timescale});
const provider=createQwenProvider({api_key:"fixture",models:[{model:"fixture",media_types:["image/png","audio/wav"]}],fetch_impl:async(_url,init)=>{
 const content=JSON.parse(init!.body as string).messages[0].content;let output;
 if(Array.isArray(content)){const c=JSON.parse(content[0].text);output={samples:c.samples.map((sample:any)=>({sample_id:sample.sample_id,description:"A green fixture photo",uncertain:false,transcript:[]}))};}
 else {
  planningCalls++;const c=JSON.parse(content),image=c.source_spans.find((span:any)=>span.media_kind==="image");
  const shot={shot_id:"photo",source_window:{kind:"image",asset_id:image.asset_id,span_id:image.span_id},timing:{kind:"still",duration_ticks:180},purpose:"Photo",embedded_gain_db:-96,reframe:null,color:null};
  const decision:any={decision_version:1,target_duration_ticks:180,thesis:"A six second photo",shots:[shot],audio:[],captions:[],preserve_refs:c.request.current_revision.preserve_refs,applied_principle_ids:[],feedback_interpretation:"Keep a usable music layer when other resources fail",change_summary:"Photo with available music"};
  if(c.planning_exchange.phase==="measure-only" || secondMeasurement && planningCalls===2){
   const correction=!!c.previous_generation_failure;
   if(correction){const resource=c.previous_resource_failure??c.previous_generation_failure;assert.deepEqual(resource.resource_ids,bad.map(item=>item.resource_id));if(cascade && planningCalls===4)assert.equal(c.previous_generation_failure.code,"CREATION_CAPTION_RANGE_INVALID");for(const item of bad)assert.ok(!c.audio_library.candidates.some((candidate:any)=>candidate.resource_ref.resource_id===item.resource_id));assert.ok(c.audio_library.candidates.some((candidate:any)=>candidate.resource_ref.resource_id===good.resource_id));}
   const selections=(correction?[good]:secondMeasurement && planningCalls===1?[]:[bad[0]!,good,bad[1]!]).map(item=>({resource_id:item.resource_id,reason:"Available music for photo",match_evidence_ids:[image.observations[0].evidence_id]}));
   output=fixtureSkillExchange(c,{exchange_version:3,kind:"measure_selection",query_id:c.planning_exchange.assigned_query_id,target_duration_ticks:secondMeasurement && !correction && planningCalls===1 ? 150 : 180,duration_constraint:{kind:"range",minimum_ticks:150,maximum_ticks:210,reason:"Approximately six seconds"},selection:[{selection_id:"photo",source_choice:{kind:"custom_window",source_window:shot.source_window},timing:shot.timing}],audio_resource_selections:selections},decision);
  }else{
   assert.equal(c.audio_library.selected_receipts.length,1);const audio=c.source_spans.find((span:any)=>span.resource_kind==="music"),first=audio.editable_start;
   decision.audio=[{audio_id:"music",shot_id:"photo",source:{asset_id:audio.asset_id,span_id:audio.span_id,start:first,end:time(first.value+6*first.timescale,first.timescale)},offset:time(0),role:"music",gain_db:-18,fade_in:time(15),fade_out:time(15),purpose:"Available music"}];
   if(cascade && (planningCalls===3 || exhausted && planningCalls===5))decision.captions=[{caption_id:"bad",shot_id:"photo",text:"Photo",offset:time(0),duration:time(999),kind:"editorial",audio_anchor:null,evidence_ids:[image.observations[0].evidence_id]}];
   const receipt=c.planning_exchange.feasible_receipts[0],{decision_version,target_duration_ticks,shots,...creative}=decision;
   output=fixtureSkillExchange(c,{exchange_version:3,kind:"final",measured_query_id:receipt.query_id,measurement_receipt_digest:receipt.measurement_receipt_digest,creative:{...creative,shots:shots.map(({source_window,timing,...item}:any)=>item)}},decision);
  }
 }
 return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(output)},finish_reason:"stop"}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}));
}});
const options={now:()=>Date.parse("2026-10-02T01:00:00Z"),creationRequestChannels:[{credential,actor_id:"user-1"}],provider:"qwen",model:"fixture",modelProvider:provider,creationObservationPolicy:{scene_threshold:100,max_frame_edge:64,max_samples:32,timeout_seconds:30},creationModelPolicy:{max_attempts:1 as const,timeout_ms:60000}};
const host=new ProjectHostSession(options);
try {
 const photo=resolve(root,"photo.png"),project=resolve(root,"project");await run(process.env.AVE_PYTHON??"python",["-c","from PIL import Image; import sys; Image.new('RGB',(64,48),(60,120,80)).save(sys.argv[1])",photo]);
 await host.create(project);host.initializeTimeline([],{sequence_id:"main",timebase:{value:1n,timescale:30n},tracks:[]});const asset=(await host.importMedia([photo]))[0] as any;
 const {actor_id,project_id,deployment,...auth}=JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json","utf8")).authorization;
 Object.assign(auth,{request_id:"multi",original_text:"制作六秒照片作品，尝试多种声音，失败时保留可用声音",asset_ids:[asset.asset_id],provider:"qwen",model:"fixture",allowed_data:["request","timeline","evidence","frames","audio"],expires_at:"2026-10-03T01:00:00Z",audio_library:{pack_id:AUDIO_PACK.pack_id,pack_version:AUDIO_PACK.pack_version,pack_digest:AUDIO_PACK_DIGEST,mode:"automatic"}});
 host.beginCreationRequest(credential,auth);
 if(exhausted){
  await assert.rejects(host.produceCreation(credential,{request_id:"multi",expected_revision:1,profile_query:null}));
  assert.equal(planningCalls,5);assert.equal(host.readCreationRequest("multi").drafts.length,0);assert.equal((host.readTimelineSnapshot() as any).version,0);
  console.log("Repeated failures stop at the shared five-send limit without a partial commit");
 }else{
 const result=await host.produceCreation(credential,{request_id:"multi",expected_revision:1,profile_query:null});
 assert.ok(result.draft_id);assert.ok(result.render_id);assert.equal(planningCalls,cascade?5:secondMeasurement?4:3);assert.deepEqual(attempts,[bad[0]!.resource_id,good.resource_id,bad[1]!.resource_id]);
 assert.equal(result.resource_warning?.resource_id,bad[0]!.resource_id);
 const timeline=host.readCreationDraftTimeline(credential,{request_id:"multi",draft_id:result.draft_id});assert.equal(timeline.tracks.filter(track=>track.kind==="audio").flatMap(track=>track.clips).length,1);
 const state=(host as any).session;const row=state.db.prepare("SELECT object_hash FROM object_refs WHERE object_ref_id=?").get(`${state.manifest.project_id}:creation-production-failure:${result.resource_warning!.failure_id}`);assert.ok(row);
 const failure=JSON.parse(readFileSync(resolve(project,"objects","sha256",row.object_hash.slice(0,2),row.object_hash),"utf8"));assert.deepEqual(failure.error.cause.resource_failures.map((item:any)=>item.resource_id),bad.map(item=>item.resource_id));
 if(secondMeasurement){
  const diagnostic=failure.error.planning_diagnostic, binding=failure.error.creation_generation_binding, evidence=diagnostic.root_input.context.source_spans.map((context:any)=>({context}));
  assert.equal(diagnostic.rounds.length,2);assert.ok(creationGenerationFailureContext(failure,binding,evidence,{value:1n,timescale:30n}));
  const changed=structuredClone(failure);changed.error.planning_diagnostic.rounds[0].input_hash="0".repeat(64);
  assert.throws(()=>creationGenerationFailureContext(changed,binding,evidence,{value:1n,timescale:30n}));
 }
 await host.close();await host.open(project,{requireCreationTimeline:true});assert.deepEqual(host.readCreationDraftTimeline(credential,{request_id:"multi",draft_id:result.draft_id}),timeline);
 const workspace=await host.readCreationWorkspace(credential,{profile_query:null}), saved=workspace.requests[0]!.drafts[0]!;
 assert.ok((saved.soundtrack as any).resource_warning);if(cascade)assert.equal(saved.planning_warning?.kind,"caption");assert.equal(saved.renders[0]!.preview.qc.status,"passed");assert.equal(saved.renders[0]!.master.qc.status,"passed");
 console.log("Host, provider, storage, render and reopen retain the available sound after two resource failures");
 }
}finally{globalThis.fetch=previousFetch;await host.close();await rm(root,{recursive:true,force:true});}
