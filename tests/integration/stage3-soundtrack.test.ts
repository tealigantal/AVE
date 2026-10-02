import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {ProjectHostSession} from '../../packages/platform/project-host/src/public.js';
import {createQwenProvider} from '../../packages/platform/model-gateway/src/public.js';
import {assertAudioSourceMeasurement,validateAudioResourceSelections,creationDigest} from '../../packages/platform/contract-runtime/src/public.js';
import {creationAudioCredits} from '../../packages/platform/project-host/src/audio-credits.js';
import {AUDIO_PACK,AUDIO_PACK_DIGEST} from '../../packages/platform/project-host/src/audio-library.js';
import {fixtureSkillExchange} from '../fixtures/stage3/skill-planning.js';
const root=await mkdtemp(resolve(tmpdir(),'ave-soundtrack-')),credential={},run=promisify(execFile);
const music=AUDIO_PACK.items.find(item=>item.resource_id==='oga:8a83b97f06cad105')!;
const wire=readFileSync('tests/fixtures/stage3/audio-library/music.wire'),originalFetch=globalThis.fetch;
let downloads=0,planningCalls=0;
globalThis.fetch=async(url)=>{assert.equal(String(url),music.download.url,'only the selected resource is fetched');downloads++;return new Response(wire,{status:200,headers:{'content-length':String(wire.length)}});};
const t=(value:number,timescale=30)=>({schema_version:1,value,timescale});
const provider=createQwenProvider({api_key:'fixture',models:[{model:'fixture',media_types:['image/png','audio/wav']}],fetch_impl:async(_url,init)=>{
 const content=JSON.parse(init!.body as string).messages[0].content;let output;
 if(Array.isArray(content)){const c=JSON.parse(content[0].text);output={samples:c.samples.map((sample:any)=>({sample_id:sample.sample_id,description:'Controlled decoded photo',uncertain:false,transcript:[]}))};}
 else{
  planningCalls++;const c=JSON.parse(content),image=c.source_spans.find((span:any)=>span.media_kind==='image');
  const shot={shot_id:'photo',source_window:{kind:'image',asset_id:image.asset_id,span_id:image.span_id},timing:{kind:'still',duration_ticks:180},purpose:planningCalls>2?'Revised warm photo':'Photo work',embedded_gain_db:-96,reframe:null,color:null};
  const decision={decision_version:1,target_duration_ticks:180,thesis:'Warm travel photo',shots:[shot],audio:[] as any[],captions:[],preserve_refs:c.request.current_revision.preserve_refs,applied_principle_ids:[],feedback_interpretation:'Controlled fixture',change_summary:'Photo with music'};
  if(c.planning_exchange.phase==='measure-only'){
   assert.equal(downloads,planningCalls===1?0:1,'Call1 sees metadata before any resource download');assert.ok(c.audio_library.candidates.length<=12);assert.ok(c.creative_skills.candidates.some((skill:any)=>skill.skill_id==='A02'));assert.ok(c.creative_skills.candidates.some((skill:any)=>skill.skill_id==='A03'));assert.ok(c.audio_library.candidates.some((item:any)=>item.resource_ref.resource_id===music.resource_id));
   output=fixtureSkillExchange(c,{exchange_version:3,kind:'measure_selection',query_id:c.planning_exchange.assigned_query_id,target_duration_ticks:180,selection:[{selection_id:'photo',source_choice:{kind:'custom_window',source_window:shot.source_window},timing:shot.timing}],audio_resource_selections:planningCalls===1?[{resource_id:music.resource_id,reason:'Source genre and existing warm travel photo; unknown vocal metadata remains unknown',match_evidence_ids:[image.observations[0].evidence_id]}]:[]},decision);
  }else{
   assert.equal(downloads,1);assert.equal(c.audio_library.candidates,undefined,'Call2 cannot select a new catalog resource');assert.equal(c.audio_library.selected_receipts.length,planningCalls===2?1:0);
   if(planningCalls===2)writeFileSync(resolve(tmpdir(),'ave-audio-measurement-example.json'),JSON.stringify(c.audio_library.selected_receipts[0].value,null,2)+'\n');
   const audio=c.source_spans.find((span:any)=>span.resource_kind==='music'),first=audio.editable_start;
   decision.audio=[{audio_id:'soundtrack',shot_id:'photo',source:{asset_id:audio.asset_id,span_id:audio.span_id,start:first,end:t(first.value+6*first.timescale,first.timescale)},offset:t(0),role:'music',gain_db:c.timeline.tracks.flatMap((track:any)=>track.clips).find((clip:any)=>clip.clip_id==='soundtrack')?.gain_db??-18,fade_in:t(15),fade_out:t(15),purpose:'Measured selected soundtrack'}];
   const receipt=c.planning_exchange.feasible_receipts[0],{decision_version,target_duration_ticks,shots,...creative}=decision;
   output=fixtureSkillExchange(c,{exchange_version:3,kind:'final',measured_query_id:receipt.query_id,measurement_receipt_digest:receipt.measurement_receipt_digest,creative:{...creative,shots:shots.map(({source_window,timing,...shot})=>shot)}},decision);
  }
 }
 return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(output)},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}}));
}});
const options={now:()=>Date.parse('2026-10-02T01:00:00Z'),creationRequestChannels:[{credential,actor_id:'user-1'}],provider:'qwen',model:'fixture',modelProvider:provider,creationObservationPolicy:{scene_threshold:100,max_frame_edge:64,max_samples:32,timeout_seconds:30},creationModelPolicy:{max_attempts:1 as const,timeout_ms:60000}};
const candidate={resource_ref:{resource_id:music.resource_id,kind:'music'}},policy={music_required:true,no_music:false,candidates:[candidate]},minimal={audio_library:policy,source_spans:[{observations:[{evidence_id:'actual-photo'}]}]},selection={audio_resource_selections:[{resource_id:music.resource_id,reason:'Warm photo',match_evidence_ids:['actual-photo']}]};
assert.throws(()=>validateAudioResourceSelections(selection,{}),/no automatic/);assert.throws(()=>validateAudioResourceSelections({audio_resource_selections:[]},minimal),/without selected/);assert.throws(()=>validateAudioResourceSelections({...selection,audio_resource_selections:[...selection.audio_resource_selections,{...selection.audio_resource_selections[0]}]},minimal),/pinned candidates/);assert.throws(()=>validateAudioResourceSelections(selection,{...minimal,audio_library:{...policy,no_music:true}}),/no music/);assert.throws(()=>validateAudioResourceSelections({audio_resource_selections:[{...selection.audio_resource_selections[0],resource_id:'kenney:unrequested'}]},minimal),/pinned candidates/);
const measured=JSON.parse(readFileSync('contracts/examples/valid/editorial/audio-source-measurement.v1.json','utf8'));assertAudioSourceMeasurement(measured);assert.throws(()=>assertAudioSourceMeasurement({...measured,sample_ref:{...measured.sample_ref,digest:'0'.repeat(64)}}),/identities differ/);
const by={...music,license:{...music.license,spdx:'CC-BY-4.0' as const,attribution_required:true},attribution_notice:'Author copyright notice'},byRef={...measured.resource_ref,metadata_digest:creationDigest(by)};
const credits=creationAudioCredits({version:7,tracks:[{track_id:'audio-music',kind:'audio',clips:[{clip_id:'licensed-music',timeline_start:0n,timeline_duration:30n,source:{asset_id:`asset:sha256:${music.content_sha256}`,start_pts:0n,end_pts:32000n,timescale:32000n}}]}]} as any,[{value:{asset_id:`asset:sha256:${music.content_sha256}`,resource_ref:byRef,resource_snapshot:by} as any}]);for(const term of [music.title,music.author,music.source_page,'CC-BY-4.0','Author copyright notice','Changes:'])assert.ok(credits.publish_text.includes(term));
let host=new ProjectHostSession(options);
try{
 const photo=resolve(root,'photo.png'),project=resolve(root,'project');await run(process.env.AVE_PYTHON??'python',['-c',"from PIL import Image; import sys; Image.new('RGB',(64,48),(60,120,80)).save(sys.argv[1])",photo]);
 await host.create(project);host.initializeTimeline([],{sequence_id:'main',timebase:{value:1n,timescale:30n},tracks:[]});const imported=(await host.importMedia([photo]))[0] as any;
 const {actor_id,project_id,deployment,...auth}=JSON.parse(readFileSync('contracts/examples/valid/editorial/creation-session.v1.json','utf8')).authorization;
 Object.assign(auth,{request_id:'automatic',original_text:'制作6秒温暖轻快旅行照片作品，自动配乐',asset_ids:[imported.asset_id],provider:'qwen',model:'fixture',allowed_data:['request','timeline','evidence','frames','audio'],expires_at:'2026-10-03T01:00:00Z',audio_library:{pack_id:AUDIO_PACK.pack_id,pack_version:AUDIO_PACK.pack_version,pack_digest:AUDIO_PACK_DIGEST,mode:'automatic'}});
 host.beginCreationRequest(credential,auth);await host.prepareCreationMaterial(credential,{operation_id:'photo',request_id:'automatic',asset_id:imported.asset_id,asset_location_id:imported.asset_location_id});
 const observation=await host.observeCreationMaterial(credential,{request_id:'automatic',expected_revision:1,material_operation_ids:['photo'],include_audio:false});
 const draft=await host.generateCreationDraft(credential,{request_id:'automatic',expected_revision:1,observation_refs:[observation.ref],profile_query:null});assert.equal(planningCalls,2);assert.equal(downloads,1);
 const rendered=await host.renderCreationDraft(credential,{request_id:'automatic',draft_id:draft.draft_id,operation_id:'soundtrack-render'});assert.equal((rendered.receipt.master.qc_report as any).status,'passed');
 const workspace=await host.readCreationWorkspace(credential,{profile_query:null});assert.ok((workspace.requests[0].drafts[0].soundtrack as any).reasons.length);assert.ok(host.readCreationDraftMaster(credential,{request_id:'automatic',draft_id:draft.draft_id,render_id:rendered.receipt.bundle.render_id}).audio_credits.source_text.includes(music.author));
 const manual=await host.editCreationDraft(credential,{request_id:'automatic',expected_revision:1,expected_timeline_version:1,parent_draft_id:draft.draft_id,operation_id:'gain',raw_text:'手动调低音乐',preserve_refs:[],commands:[{type:'set_gain',track_id:'audio-music',clip_id:'soundtrack',gain_db:-22}]});
 const oldAudio=(host.readTimelineSnapshot() as any).tracks.flatMap((track:any)=>track.clips).find((clip:any)=>clip.clip_id==='soundtrack');
 host.reviseCreationRequest(credential,'automatic',1,{raw_text:'保持配乐、音量和时长，只调整画面描述',viewed_timeline_version:manual.edit_ref.timeline_version,preserve_refs:['soundtrack']});
 const revised=await host.generateCreationDraft(credential,{request_id:'automatic',expected_revision:2,observation_refs:[observation.ref],profile_query:null});assert.equal(planningCalls,4);assert.equal(downloads,1);
 const preserved=(host.readTimelineSnapshot() as any).tracks.flatMap((track:any)=>track.clips).find((clip:any)=>clip.clip_id==='soundtrack');assert.deepEqual(preserved,oldAudio,'protected resource identity/source/gain/fades survives AI continuation');
 await host.close();globalThis.fetch=async()=>{throw new Error('offline');};host=new ProjectHostSession(options);await host.open(project);
 const reopened=await host.renderCreationDraft(credential,{request_id:'automatic',draft_id:draft.draft_id,operation_id:'offline-render'});assert.equal((reopened.receipt.preview.qc_report as any).status,'passed');
 for(const failure of ['HTTP 404','changed hash']){
  await host.create(resolve(root,`failed-${failure.replaceAll(' ','-')}`));host.initializeTimeline([],{sequence_id:'main',timebase:{value:1n,timescale:30n},tracks:[]});const asset=(await host.importMedia([photo]))[0] as any;
  planningCalls=0;downloads=0;globalThis.fetch=async()=>{downloads++;return failure==='HTTP 404'?new Response('missing',{status:404}):new Response(Buffer.alloc(wire.length),{status:200});};
  host.beginCreationRequest(credential,{...auth,request_id:'failed',asset_ids:[asset.asset_id]});await host.prepareCreationMaterial(credential,{operation_id:'failed-photo',request_id:'failed',asset_id:asset.asset_id,asset_location_id:asset.asset_location_id});const observed=await host.observeCreationMaterial(credential,{request_id:'failed',expected_revision:1,material_operation_ids:['failed-photo'],include_audio:false});
  await assert.rejects(host.generateCreationDraft(credential,{request_id:'failed',expected_revision:1,observation_refs:[observed.ref],profile_query:null}));assert.equal(planningCalls,1,'failed exact source never reaches Call2');assert.equal(downloads,1);assert.equal((host.readTimelineSnapshot() as any).version,0,'resource failure creates no Timeline version');assert.equal(host.readCreationRequest('failed').latest_draft_id,null);
 }
 console.log('Automatic soundtrack: metadata Call1 → selected-only fetch/actual sample receipt → measured Call2, exact two calls, dual encode/QC and offline reopen passed');
}finally{globalThis.fetch=originalFetch;await host.close();await rm(root,{recursive:true,force:true});}
