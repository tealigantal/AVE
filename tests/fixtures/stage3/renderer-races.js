// Controlled IPC replies exercise Renderer races in an isolated real DOM.
// This is a protocol unit fixture, not Host/model/media acceptance.
window.runRendererRaces = async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const wait = async (predicate, message) => { const start=Date.now(); while(Date.now()-start<10000){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,0));}throw new Error(message); };
  let eventListener, hold=false, failStatus=false, rejectWorkspace=false, releaseRevision, commands=[]; const queued=[];
  const request={authorization:{request_id:'request-a',original_text:'fixture request',asset_ids:['asset-a'],allowed_data:[],protected_refs:[]},status:'paused',revoked:false,authorization_generation:1,active_run:null,materials:[],observations:[],learning:[],adoptions:[],revisions:[{revision:1,raw_text:'first',preserve_refs:[]}],drafts:[{draft_id:'draft-a',timeline_version:1,base_timeline_version:0,revision:1,source:{kind:'model'},renders:[]}],latest_draft_id:'draft-a',adopted_draft_id:null,viewed_draft_id:null};
  const workspace={project_id:'project-a',timeline_version:1,requests:[request],profile:null};
  const timeline={version:1,sequence:{sequence_id:'main',timebase:{value:1n,timescale:30n}},tracks:[{track_id:'video-a',kind:'video',clips:[{clip_id:'clip-a',source:{asset_id:'asset-a',start_pts:0n,end_pts:30n,timescale:30n},timeline_start:0n,timeline_duration:30n}],captions:[]}]};
  window.projectApi={
    query:async input=>{
      if(input.query_type==='app.status'&&failStatus)return{ok:false,error:{code:'FIXTURE_STATUS_DENIED',message:'fixture status failure'}};
      if(input.query_type==='project.creation.workspace'&&rejectWorkspace)throw new Error('fixture workspace failure');
      if(input.query_type==='app.status')return{ok:true,data:{project:'project-a',timeline:'v1',render:'idle',qc:'not-run'}};
      if(input.query_type==='project.creation.workspace'){const value=structuredClone(workspace);if(hold)return new Promise(resolve=>queued.push(()=>resolve({ok:true,data:value})));return{ok:true,data:value};}
      if(input.query_type==='project.creation.timeline')return{ok:true,data:structuredClone(timeline)};
      if(input.query_type==='project.media.list')return{ok:true,data:[{asset_id:'asset-a',location_type:'original'},{asset_id:'asset-a',location_type:'proxy'},{asset_id:'asset-a',location_type:'original'}]};
      if(input.query_type==='project.jobs.list')return{ok:true,data:[]};
      throw new Error('unexpected fixture query '+input.query_type);
    },
    command:async input=>{
      commands.push(structuredClone(input));
      if(input.command_type==='project.creation.revise')return new Promise(resolve=>{releaseRevision=()=>{request.revisions.push({revision:request.revisions.length+1,raw_text:input.payload.raw_text,preserve_refs:[]});resolve({ok:true,data:{request_id:'request-a',sequence:2}});};});
      if(input.command_type==='project.creation.manual')return{ok:false,error:{code:'FIXTURE_DENIED',message:'explicit unit response; no Host invoked'}};
      if(input.command_type==='project.creation.render'){
        const renders=commands.filter(value=>value.command_type==='project.creation.render');
        if(renders.length<3)return{ok:false,error:{code:'CREATION_RENDER_ATTEMPT_FAILED',message:'persisted attempt failure fixture'}};
        return{ok:true,data:{operation_id:input.payload.operation_id,draft_id:'draft-a',render_id:'render-new'}};
      }
      throw new Error('unexpected fixture command '+input.command_type);
    },
    subscribeProjectEvents:listener=>{eventListener=listener;return()=>{};},
  };
  const {mountWorkbench}=await import('/workbench/workbench.js');
  const mounted=mountWorkbench(document.querySelector('#root'));
  const form=name=>document.querySelector('[data-creation-form="'+name+'"]');
  const submit=name=>form(name).querySelector('button[type=submit]');
  const button=label=>{const value=[...document.querySelectorAll('.stage2-workspace button')].find(value=>value.textContent===label);assert(value,'missing labelled button '+label);return value;};
  const set=(name,field,value)=>{const el=form(name).elements.namedItem(field);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return el;};
  await wait(()=>document.querySelector('[data-creation="draft-select"]')?.value==='draft-a'&&!submit('manual').disabled,'initial workspace');
  const assets=form('begin').elements.namedItem('asset_ids');assert(assets.options.length===1,'duplicate Original/Proxy assets must produce one choice');assets.options[0].selected=true;assets.dispatchEvent(new Event('change',{bubbles:true}));
  set('revise','raw_text','second revision');set('manual','raw_text','manual after second revision');set('manual','target',JSON.stringify(['video-a','clip-a']));set('manual','gain_db','-3');
  form('revise').requestSubmit();await wait(()=>Boolean(releaseRevision),'revision sent');hold=true;releaseRevision();
  await wait(()=>queued.length===1,'refresh A entered');
  eventListener({event_type:'project.creation.revise',project_id:'project-a'});await wait(()=>queued.length===2,'refresh B entered');
  queued[0]();await new Promise(resolve=>setTimeout(resolve,0));
  assert(submit('manual').disabled,'superseded A cannot enable manual before B lands');assert(button('生成可编辑初稿').disabled,'superseded A cannot enable generation');
  form('manual').requestSubmit();button('生成可编辑初稿').click();assert(commands.length===1,'disabled dependent actions cannot send stale requests');
  hold=false;queued[1]();await wait(()=>!submit('manual').disabled,'latest B committed');
  assert([...assets.selectedOptions].length===1,'refresh must retain exactly one selected asset');
  form('manual').requestSubmit();await wait(()=>commands.some(value=>value.command_type==='project.creation.manual'),'current manual sent');
  const sent=commands.find(value=>value.command_type==='project.creation.manual');assert(sent.payload.expected_revision===2,'manual binds newest applied revision');
  await wait(()=>!submit('manual').disabled,'manual unit failure settled');

  for(const failure of ['status','workspace']){
    set('revise','raw_text','revision with '+failure+' read failure');releaseRevision=null;form('revise').requestSubmit();await wait(()=>Boolean(releaseRevision),'new revision sent');
    if(failure==='status')failStatus=true;else rejectWorkspace=true;releaseRevision();
    await wait(()=>document.querySelector('.notice')?.textContent.includes(failure==='status'?'fixture status failure':'fixture workspace failure'),'failure visible');
    const priorCount=commands.length;assert(submit('manual').disabled&&button('生成可编辑初稿').disabled,'failed refresh cannot re-enable dependent commands');form('manual').requestSubmit();button('生成可编辑初稿').click();assert(commands.length===priorCount,'failed refresh sends no stale command');
    failStatus=false;rejectWorkspace=false;await mounted.refresh();await wait(()=>!submit('manual').disabled,'explicit successful refresh restores authority');
    form('manual').requestSubmit();await wait(()=>commands.length===priorCount+1,'post-recovery manual sent');assert(commands.at(-1).payload.expected_revision===request.revisions.length,'recovery uses exact current revision');await wait(()=>!submit('manual').disabled,'post-recovery manual settled');
  }
  const render=button('渲染 Preview 与 Master'), retry=button('原因修正后，开始新渲染尝试');assert(retry.hidden,'no new-attempt action before known failure');
  render.click();await wait(()=>!render.disabled&&!retry.hidden,'known failure surfaced');
  assert(commands.filter(value=>value.command_type==='project.creation.render').length===1,'failure cannot auto retry');
  render.click();await wait(()=>commands.filter(value=>value.command_type==='project.creation.render').length===2&&!render.disabled,'same operation replay');
  const attempts=commands.filter(value=>value.command_type==='project.creation.render');assert(attempts[0].payload.operation_id===attempts[1].payload.operation_id,'normal retry reuses uncertain or persisted operation');
  retry.click();await wait(()=>commands.filter(value=>value.command_type==='project.creation.render').length===3&&!render.disabled,'explicit new attempt');
  const final=commands.filter(value=>value.command_type==='project.creation.render');assert(final[2].payload.operation_id!==final[0].payload.operation_id,'explicit corrected attempt gets a new identity');assert(retry.hidden,'success closes failed-attempt action');
  mounted.destroy();return{refresh_interleaving:true,failed_refresh_denials:true,stale_send_count:0,selected_asset_count:1,explicit_render_attempts:3};
};
