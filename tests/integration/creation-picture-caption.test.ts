import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {ProjectHostSession} from "../../packages/platform/project-host/src/public.js";
import {createQwenProvider} from "../../packages/platform/model-gateway/src/public.js";
import {fixtureSkillExchange} from "../fixtures/stage3/skill-planning.js";
import {buildCreationSourceChoiceCatalog,resolveCreationSourceChoice} from "../../packages/platform/contract-runtime/src/public.js";
const root=await mkdtemp(resolve(tmpdir(),"ave-picture-captions-")), run=promisify(execFile), credential={};let planningCalls=0;const recoverImage=process.env.AVE_TEST_IMAGE_CORRECTION==="1";
const time=(value:number,timescale=30)=>({schema_version:1,value,timescale});
const provider=createQwenProvider({api_key:"fixture",models:[{model:"fixture",media_types:["image/png"]}],fetch_impl:async(_url,init)=>{
 const content=JSON.parse(init!.body as string).messages[0].content;let output;
 if(Array.isArray(content)){const c=JSON.parse(content[0].text);output={samples:c.samples.map((sample:any)=>({sample_id:sample.sample_id,description:"A green hillside",uncertain:false,transcript:[]}))};}
 else {
  planningCalls++;const c=JSON.parse(content),image=c.source_spans.find((span:any)=>span.media_kind==="image");assert.ok(image);assert.equal(c.audio_library,undefined);
  const shot={shot_id:"photo",source_window:{kind:"image",asset_id:image.asset_id,span_id:image.span_id},timing:{kind:"still",duration_ticks:180},purpose:"Show the landscape",embedded_gain_db:-96,reframe:null,color:null};
  const decision:any={decision_version:1,target_duration_ticks:180,thesis:"A short landscape view",shots:[shot],audio:[],captions:[{caption_id:"caption",shot_id:"photo",text:"A green hillside",offset:time(0),duration:time(90),kind:"editorial",audio_anchor:null,evidence_ids:[image.observations[0].evidence_id]}],preserve_refs:c.request.current_revision.preserve_refs,applied_principle_ids:[],feedback_interpretation:"Explain the visible picture",change_summary:"Added a picture-based caption"};
  if(c.planning_exchange.phase==="measure-only"){
   const selectedWindow=recoverImage && planningCalls===1?{asset_id:image.asset_id,span_id:image.span_id,start:time(0,1),end:time(1,1)}:shot.source_window;
   if(recoverImage && planningCalls===1){
    const choice:any={kind:"custom_window",source_window:selectedWindow}, still={kind:"still",duration_ticks:180}, fixed={...c,source_choice_catalog:buildCreationSourceChoiceCatalog(c)};
    assert.deepEqual(resolveCreationSourceChoice(choice,fixed,still),shot.source_window);
    assert.deepEqual(resolveCreationSourceChoice(choice,{...fixed,image_source_choice_policy:undefined},still),selectedWindow);
    assert.deepEqual(resolveCreationSourceChoice({...choice,source_window:{...selectedWindow,end:time(2,1)}},fixed,still),{...selectedWindow,end:time(2,1)});
    assert.deepEqual(resolveCreationSourceChoice({...choice,source_window:{...selectedWindow,asset_id:"forged"}},fixed,still),{...selectedWindow,asset_id:"forged"});
    assert.deepEqual(resolveCreationSourceChoice(choice,fixed,{kind:"exact"}),selectedWindow);
   }
   const query={exchange_version:3,kind:"measure_selection",query_id:c.planning_exchange.assigned_query_id,target_duration_ticks:180,duration_constraint:{kind:"range",minimum_ticks:150,maximum_ticks:210,reason:"Approximately six seconds"},selection:[{selection_id:"photo",source_choice:{kind:"custom_window",source_window:selectedWindow},timing:shot.timing}]};
   assert.equal("audio_intent" in query,false);output=fixtureSkillExchange(c,query,decision);
  }else{
   const receipt=c.planning_exchange.feasible_receipts[0],{decision_version,target_duration_ticks,shots,...creative}=decision;
   output=fixtureSkillExchange(c,{exchange_version:3,kind:"final",measured_query_id:receipt.query_id,measurement_receipt_digest:receipt.measurement_receipt_digest,creative:{...creative,shots:shots.map(({source_window,timing,...item}:any)=>item)}},decision);
   if(recoverImage)delete output.creative.skill_effects;
  }
 }
 return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(output)},finish_reason:"stop"}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}));
}});
const options={now:()=>Date.parse("2026-10-02T01:00:00Z"),creationRequestChannels:[{credential,actor_id:"user-1"}],provider:"qwen",model:"fixture",modelProvider:provider,creationObservationPolicy:{scene_threshold:100,max_frame_edge:64,max_samples:32,timeout_seconds:30},creationModelPolicy:{max_attempts:1 as const,timeout_ms:60000}};
const host=new ProjectHostSession(options);
try{
 const photo=resolve(root,"photo.png"),project=resolve(root,"project");await run(process.env.AVE_PYTHON??"python",["-c","from PIL import Image; import sys; Image.new('RGB',(64,48),(60,120,80)).save(sys.argv[1])",photo]);
 await host.create(project);host.initializeTimeline([],{sequence_id:"main",timebase:{value:1n,timescale:30n},tracks:[]});const asset=(await host.importMedia([photo]))[0] as any;
 const {actor_id,project_id,deployment,...auth}=JSON.parse(readFileSync("contracts/examples/valid/editorial/creation-session.v1.json","utf8")).authorization;
 Object.assign(auth,{request_id:"picture-captions",original_text:"制作六秒作品，用字幕解释画面",asset_ids:[asset.asset_id],provider:"qwen",model:"fixture",allowed_data:["request","timeline","evidence","frames"],expires_at:"2026-10-03T01:00:00Z"});delete auth.audio_library;
 host.beginCreationRequest(credential,auth);const result=await host.produceCreation(credential,{request_id:"picture-captions",expected_revision:1,profile_query:null});
 assert.equal(planningCalls,2);assert.ok(result.render_id);const timeline=host.readCreationDraftTimeline(credential,{request_id:"picture-captions",draft_id:result.draft_id});
 if(recoverImage){
  const session=(host as any).session,row=session.db.prepare("SELECT metadata_json,output_object_hash FROM model_runs ORDER BY rowid DESC LIMIT 1").get();
  const audit=JSON.parse(row.metadata_json).audit.planning.rounds,raw=JSON.parse(audit[0].provider_output.payload);
  assert.equal(raw.selection[0].source_choice.source_window.end.value,1);assert.equal(raw.selection[0].source_choice.source_window.kind,undefined);
  const decision=JSON.parse(readFileSync(resolve(project,"objects","sha256",row.output_object_hash.slice(0,2),row.output_object_hash),"utf8"));
  assert.equal(decision.shots[0].source_window.kind,"image");assert.equal(decision.shots[0].source_window.end,undefined);
 }
 assert.equal(timeline.tracks.filter(track=>track.kind==="audio").flatMap(track=>track.clips).length,0);assert.equal(timeline.tracks.flatMap((track:any)=>track.captions??[]).length,1);
 await host.close();await host.open(project,{requireCreationTimeline:true});assert.deepEqual(host.readCreationDraftTimeline(credential,{request_id:"picture-captions",draft_id:result.draft_id}),timeline);
 const workspace=await host.readCreationWorkspace(credential,{profile_query:null}),saved=workspace.requests[0]!.drafts[0]!;assert.equal(saved.renders[0]!.preview.qc.status,"passed");assert.equal(saved.renders[0]!.master.qc.status,"passed");
 console.log("Picture-only editorial caption produces, renders and reopens without audio authorization or speech proof");
}finally{await host.close();await rm(root,{recursive:true,force:true});}
