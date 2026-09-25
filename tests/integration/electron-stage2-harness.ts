import assert from "node:assert/strict";
import { app, BrowserWindow, dialog } from "electron";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeSync } from "node:fs";
import { createWindow } from "../../apps/desktop/src/main/window-manager.js";
import { registerAppShutdown } from "../../apps/desktop/src/main/app-lifecycle.js";
import { createCompositionRoot, registerCompositionRoot } from "../../apps/desktop/src/main/composition-root.js";
import { registerAppProtocol } from "../../apps/desktop/src/main/protocol-handler.js";
import { openCreationProject } from "../../apps/desktop/src/main/project-lifecycle.js";
import { creationAuthorizationDetail } from "../../apps/desktop/src/main/ipc/creation-confirmation.js";
import { creationFixtureDialog } from "../fixtures/stage3/desktop-dialog.js";

// This executable is test-owned. Production has no automation or approval hook.
const args = new Map(process.argv.slice(2).filter(value => value.startsWith("--ave-harness-")).map(value => { const at = value.indexOf("="); if (at < 0) throw new Error("Harness arguments need explicit values"); return [value.slice(2, at), value.slice(at + 1)]; }));
const mode = args.get("ave-harness-mode")!;
if (!["smoke", "engineering", "reopen", "renderer-races"].includes(mode)) throw new Error("Current harness requires smoke, engineering or reopen mode");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const native = creationFixtureDialog(mode);
const harnessDialog = new Proxy(dialog, { get(target, property, receiver) { if (property === "showMessageBox") return native.show; const value = Reflect.get(target, property, receiver); return typeof value === "function" ? value.bind(target) : value; } });
const context = await createCompositionRoot(harnessDialog, resolve(root, "harness-profile"));
registerAppShutdown(context.sessions);
app.prependListener("quit", () => writeSync(2, "AVE_ELECTRON_NATIVE_QUIT\n"));
process.on("uncaughtExceptionMonitor", error => writeSync(2, `AVE_ELECTRON_UNCAUGHT ${error.stack}\n`));
app.on("will-quit", () => { assert.equal(context.sessions.shutdownComplete, true, "Host and profile must close before native quit"); console.log("AVE_ELECTRON_SHUTDOWN_COMPLETE"); });
registerCompositionRoot(context);
const exactJson = (value: unknown) => JSON.stringify(value, (_key, item) => typeof item === "bigint" ? `${item}n` : item);

app.whenReady().then(async () => {
  registerAppProtocol(resolve(root, "apps/desktop/src/renderer"));
  if (mode === "renderer-races") {
    const testWindow = new BrowserWindow({ show:false, webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false} });
    await testWindow.loadURL("app://renderer/test-races.html");
    const result = await testWindow.webContents.executeJavaScript("window.runRendererRaces()", true);
    console.log(`AVE_CREATION_RENDERER_RACES ${JSON.stringify(result)}`); app.quit(); return;
  }
  const project = args.get("ave-harness-project");
  if (project) await openCreationProject(context.host, resolve(project));
  const window = createWindow(resolve(root, "apps/desktop/src/main"), context.sessions);
  window.webContents.once("did-finish-load", async () => {
    try {
      const shell = await window.webContents.executeJavaScript("({ title: document.title, projectApi: typeof window.projectApi === 'object', workbench: Boolean(document.querySelector('.workbench-shell')) })", true);
      assert.deepEqual(shell, { title: "AVE 工作台", projectApi: true, workbench: true });
      if (mode === "smoke") { console.log(`AVE_ELECTRON_RUNTIME_SMOKE ${JSON.stringify(shell)}`); app.quit(); return; }
      await window.webContents.executeJavaScript(`new Promise((resolve, reject) => { const start = Date.now(); const poll = () => { const el = document.querySelector('.stage2-workspace .badge'); if (el && el.textContent.startsWith('v')) return resolve(true); if (Date.now() - start > 15000) return reject(new Error('Creation workspace load timeout: '+document.querySelector('.notice')?.textContent)); setTimeout(poll,50); }; poll(); })`, true);
      const snapshot = async () => ({ workspace: await context.host.readCreationWorkspace(context.creationCredential, { profile_query: null }), timeline: exactJson(context.host.readTimelineSnapshot()), media: context.host.listMedia().map((item: any) => ({ asset_id: item.asset_id, asset_location_id: item.asset_location_id, location_type: item.location_type })) });
      if (mode === "reopen") { console.log(`AVE_CREATION_ELECTRON_REOPEN ${JSON.stringify(await snapshot())}`); app.quit(); return; }
      const reviewRoot = resolve(args.get("ave-harness-review-dir")!); await mkdir(reviewRoot, { recursive: true });
      // This is a visible playback test. A covered muted window may be paused by Chromium.
      window.webContents.setBackgroundThrottling(false);
      window.setAlwaysOnTop(true); window.show(); window.focus();
      const before = await snapshot();
      assert.equal(before.workspace.requests.length, 1, "engineering fixture must have exactly one generated request");
      const journey = await window.webContents.executeJavaScript(`(async () => {
        const ensure = (value, label) => { if (!value) throw new Error(label); };
        const wait = async (read, test, label) => { const start = Date.now(); while (Date.now()-start < 30000) { const value = await read(); if (test(value)) return value; await new Promise(resolve=>setTimeout(resolve,40)); } const video=document.querySelector('.player-panel video'); throw new Error(label+': '+document.querySelector('.notice')?.textContent+' '+JSON.stringify({visibility:document.visibilityState,video:video&&{currentTime:video.currentTime,duration:video.duration,paused:video.paused,ended:video.ended,readyState:video.readyState,networkState:video.networkState,error:video.error?.message}})); };
        const status = await window.projectApi.query({api_version:1,query_type:'app.status',project_id:''}), id = status.data.project;
        const query = async type => { const result = await window.projectApi.query({api_version:1,query_type:type,project_id:id,payload:type.endsWith('workspace')?{profile_query:null}:{}}); ensure(result.ok,JSON.stringify(result.error)); return result.data; };
        const command = (type,payload) => window.projectApi.command({api_version:1,command_type:type,project_id:id,payload,command_id:crypto.randomUUID(),idempotency_key:crypto.randomUUID()});
        const workspace = () => query('project.creation.workspace'), timeline = () => query('project.creation.timeline');
        const click = async text => { const button = await wait(()=>[...document.querySelectorAll('.stage2-workspace button')].find(item=>item.textContent===text),item=>item&&!item.disabled,'button '+text); button.click(); };
        const tab = value => document.querySelector('[data-creation-view="'+value+'"]').click();
        const set = (form,name,value) => { const control=form.elements.namedItem(name); control.value=value; control.dispatchEvent(new Event('input',{bubbles:true})); control.dispatchEvent(new Event('change',{bubbles:true})); return control; };
        await wait(()=>document.visibilityState,value=>value==='visible','visible playback surface');
        const submit = async form => { await wait(()=>form.querySelector('button[type=submit]'),value=>value&&!value.disabled,'current form ready'); ensure(form.checkValidity(),'valid form'); form.requestSubmit(); };
        let ws=await workspace(); const requestId=ws.requests[0].authorization.request_id, initial=ws.requests[0].drafts.at(-1), initialTimeline=await timeline();
        ensure(initial.renders.length>0,'actual encoded initial Preview required');
        const request = value=>value.requests.find(item=>item.authorization.request_id===requestId);
        tab('request'); const reviseForm=document.querySelector('[data-creation-form="revise"]'), text=set(reviseForm,'raw_text','保留画面，只改第二段音量和字幕 1n。'); text.focus(); text.setSelectionRange(2,5);
        tab('drafts'); await click('加载所选 Preview');
        const video=await wait(()=>document.querySelector('.player-panel video'),value=>value?.src&&value.readyState>=1,'loaded actual Preview');
        ensure(request(await workspace()).viewed_draft_id===null,'loading is not playback'); ensure(request(await workspace()).adopted_draft_id===null,'loading is not adoption');
        video.muted=true; await video.play(); await wait(()=>video.currentTime,value=>value>0.15,'actual playback'); video.pause();
        await wait(workspace,value=>request(value).viewed_draft_id===initial.draft_id,'viewed pointer');
        ensure(request(await workspace()).adopted_draft_id===null,'playback must not adopt'); const played=video.currentTime, initialPreviewUrl=video.src;
        await click('采用此版'); await wait(workspace,value=>request(value).adopted_draft_id===initial.draft_id,'adopt pointer');
        await wait(()=>document.querySelector('.notice')?.textContent,value=>value==='操作已完成。','adoption refresh');
        ensure(document.querySelector('.player-panel video')===video,'persistent player node'); ensure(video.currentTime===played,'background refresh kept player position');
        ensure(document.querySelector('[data-creation-form="revise"]')===reviseForm&&text.value==='保留画面，只改第二段音量和字幕 1n。','input retained across refresh');
        ensure(text.selectionStart===2&&text.selectionEnd===5,'text selection retained');
        const track=initialTimeline.tracks.find(item=>item.kind==='video'&&item.clips.length>=2); ensure(track,'two actual shots required');
        tab('request'); set(reviseForm,'preserve_refs',''); await submit(reviseForm);
        ws=await wait(workspace,value=>request(value).revisions.length===2,'revision saved'); const revision=request(ws).revisions.at(-1); ensure(revision.raw_text===text.value,'exact raw words'); ensure(revision.viewed_timeline_version===initial.timeline_version,'feedback binds actual viewed version');
        tab('drafts'); const manual=document.querySelector('[data-creation-form="manual"]');
        set(manual,'target',JSON.stringify([track.track_id,track.clips[1].clip_id])); set(manual,'raw_text','第二段降至 -9 dB，加字幕 1n；保留两段画面。'); set(manual,'gain_db','-9'); set(manual,'caption_text','1n'); set(manual,'caption_start','0'); set(manual,'caption_duration','0.5'); await submit(manual);
        ws=await wait(workspace,value=>request(value).drafts.length===2,'manual draft');
        const firstManual=request(ws).drafts.at(-1); let edited=await timeline();
        ensure(edited.version===initialTimeline.version+1,'manual version'); ensure(edited.tracks.find(item=>item.track_id===track.track_id).clips[1].gain_db===-9,'actual second-clip gain'); ensure(edited.tracks.find(item=>item.track_id===track.track_id).captions[0].text==='1n','literal caption');
        ensure(request(ws).adopted_draft_id===initial.draft_id&&request(ws).viewed_draft_id===initial.draft_id,'manual draft does not silently move pointers');
        const denied=await command('project.creation.manual',{request_id:requestId,operation_id:'stale-dom-edit',expected_revision:2,expected_timeline_version:initialTimeline.version,parent_draft_id:initial.draft_id,raw_text:'stale edit must not commit',preserve_refs:[],commands:[{type:'set_gain',track_id:track.track_id,clip_id:track.clips[1].clip_id,gain_db:3}]});
        ensure(!denied.ok&&denied.error.code==='REQUEST_BASE_STALE','specific stale-edit rejection'); ensure((await timeline()).version===edited.version,'no rejected commit');
        const invalid=await command('project.creation.cancel',{request_id:requestId,revoke:false,unexpected:true}); ensure(!invalid.ok&&invalid.error.code==='DESKTOP_CREATION_INPUT_INVALID','unknown field denied'); ensure(request(await workspace()).status!== 'cancelled','bad cancel had no effect');
        const old=await command('project.stage2.action',{}); ensure(!old.ok&&old.error.code==='UNKNOWN_COMMAND','old current interface removed');
        await wait(()=>document.querySelector('[data-creation="draft-select"]').value,value=>value===firstManual.draft_id,'manual selection refresh');
        set(manual,'target',JSON.stringify([track.track_id,track.clips[0].clip_id])); set(manual,'raw_text','第一段降至 -12 dB，保留第二段声音和字幕。'); set(manual,'gain_db','-12'); set(manual,'caption_text',''); set(manual,'preserve_refs',edited.tracks.find(item=>item.track_id===track.track_id).captions[0].caption_id); await submit(manual);
        ws=await wait(workspace,value=>request(value).drafts.length===3,'second explicit shot edit'); const final=request(ws).drafts.at(-1);
        await wait(()=>document.querySelector('[data-creation="draft-select"]').value,value=>value===final.draft_id,'latest manual selection');
        await click('渲染 Preview 与 Master'); ws=await wait(workspace,value=>request(value).drafts.at(-1).renders.length===1,'actual dual render');
        const render=request(ws).drafts.at(-1).renders[0]; ensure(render.preview.qc.status==='passed'&&render.master.qc.status==='passed','actual dual QC');
        ensure(video.src===initialPreviewUrl&&video.currentTime===played,'new drafts and renders preserve the current loaded player'); await click('加载所选 Preview'); await wait(()=>video.readyState,value=>value>=1&&video.src!==initialPreviewUrl,'manual Preview load'); await video.play(); await wait(()=>video.currentTime,value=>value>0.15,'manual playback'); video.pause();
        await wait(workspace,value=>request(value).viewed_draft_id===final.draft_id,'manual viewed'); await click('采用此版'); await wait(workspace,value=>request(value).adopted_draft_id===final.draft_id,'manual adopted');
        edited=await timeline(); const currentTrack=edited.tracks.find(item=>item.track_id===track.track_id);
        ensure(currentTrack.clips[0].gain_db===-12&&currentTrack.clips[1].gain_db===-9,'independent gains persist'); ensure(currentTrack.captions[0].text==='1n','caption persists');
        for (let i=0;i<2;i++) ensure(JSON.stringify(currentTrack.clips[i].source,(_k,v)=>typeof v==='bigint'?String(v):v)===JSON.stringify(track.clips[i].source,(_k,v)=>typeof v==='bigint'?String(v):v),'preserved actual source');
        return {request_id:requestId,initial_draft_id:initial.draft_id,final_draft_id:final.draft_id,initial_version:initialTimeline.version,final_version:edited.version,preview_duration:video.duration,played_seconds:played,revision:revision.raw_text,stale_edit_code:denied.error.code,invalid_code:invalid.error.code,render,input_retained:true,player_retained:true};
      })()`, true);
      console.log("AVE_CREATION_JOURNEY_COMPLETE");
      const source = before.workspace.requests[0]!.authorization;
      const { actor_id: _actor, deployment: _deployment, ...input } = structuredClone(source);
      Object.assign(input, { request_id: "native-fixture-expected", original_text: "仅授权这次工程检查，不进行模型调用。", allowed_data: ["request"] });
      input.asset_ids = context.host.listMedia().filter((item: any) => item.location_type === "original" && input.asset_ids.includes(item.asset_id)).map((item: any) => item.asset_id);
      input.expires_at = new Date(input.expires_at).toISOString();
      const review = context.host.prepareCreationRequestAuthorization(context.creationCredential, input);
      native.arm({ type:"warning", title:"AVE 创作请求授权", message:"确认素材、数据范围与模型服务", detail:creationAuthorizationDetail(review), buttons:["取消","授权本次创作"],defaultId:0,cancelId:0,noLink:true });
      const nativeJourney = await window.webContents.executeJavaScript(`(async () => {
        const input=${JSON.stringify(input)};
        const form=document.querySelector('[data-creation-form="begin"]'); document.querySelector('[data-creation-view="request"]').click();
        const set=(key,value)=>{const el=form.elements.namedItem(key);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
        for(const key of ['original_text','provider','model'])set(key,input[key]);
        const date=new Date(input.expires_at); set('expires_at',new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16));set('protected_refs',input.protected_refs.join(','));
        const assets=form.elements.namedItem('asset_ids');for(const option of assets.options)option.selected=input.asset_ids.includes(option.value);assets.dispatchEvent(new Event('change',{bubbles:true}));
        for(const box of form.querySelectorAll('fieldset input')){box.checked=input.allowed_data.includes(box.name);box.dispatchEvent(new Event('change',{bubbles:true}));}
        if(!form.checkValidity())throw new Error('authorization form invalid');form.requestSubmit();
        const status=await window.projectApi.query({api_version:1,query_type:'app.status',project_id:''});
        const read=async()=>{const res=await window.projectApi.query({api_version:1,query_type:'project.creation.workspace',project_id:status.data.project,payload:{profile_query:null}});if(!res.ok)throw new Error(res.error.code);return res.data;};
        const wait=async(predicate)=>{const start=Date.now();while(Date.now()-start<15000){const value=await read();if(predicate(value))return value;await new Promise(r=>setTimeout(r,40));}throw new Error('native journey timeout: '+document.querySelector('.notice')?.textContent);};
        const ws=await wait(value=>value.requests.length===2), request=ws.requests.find(item=>item.authorization.original_text===input.original_text);
        const start=Date.now();while(document.querySelector('[data-creation="request-select"]').value!==request.authorization.request_id){if(Date.now()-start>10000)throw new Error('new request selection timeout');await new Promise(r=>setTimeout(r,40));}
        const cancel=[...document.querySelectorAll('.stage2-workspace button')].find(button=>button.textContent==='取消当前制作');if(cancel.disabled)throw new Error('cancel disabled');cancel.click();
        const cancelled=await wait(value=>value.requests.find(item=>item.authorization.request_id===request.authorization.request_id).status==='cancelled');
        if(cancelled.timeline_version!==ws.timeline_version)throw new Error('cancellation changed work');
        return {request_id:request.authorization.request_id,asset_ids:request.authorization.asset_ids,allowed_data:request.authorization.allowed_data,cancelled:true};
      })()`, true);
      assert.equal(native.confirmations.length, 1);
      console.log("AVE_CREATION_NATIVE_JOURNEY_COMPLETE");
      const captures: string[] = [];
      await window.webContents.executeJavaScript(`{ const select=document.querySelector('[data-creation="request-select"]'); select.value=${JSON.stringify((journey as any).request_id)}; select.dispatchEvent(new Event('change',{bubbles:true})); }`, true);
      await window.webContents.executeJavaScript(`(async () => {
        document.querySelector('[data-creation-view="drafts"]').click();
        const button=[...document.querySelectorAll('button')].find(item=>item.textContent==='加载所选 Preview');
        const deadline=Date.now()+10000;
        while(button.disabled){if(Date.now()>deadline)throw new Error('capture preview selection not ready');await new Promise(resolve=>setTimeout(resolve,30));}
        button.click();const video=document.querySelector('video');
        while(!video.src||video.readyState<2){if(Date.now()>deadline)throw new Error('capture preview not loaded');await new Promise(resolve=>setTimeout(resolve,30));}
        video.muted=true;await video.play();
        while(video.currentTime<0.15){if(Date.now()>deadline)throw new Error('capture preview did not play');await new Promise(resolve=>setTimeout(resolve,30));}
        video.pause();
      })()`,true);
      for (const view of ["request","material","drafts","profile"]) {
        await window.webContents.executeJavaScript(`new Promise(resolve=>{ document.querySelector('[data-creation-view="${view}"]').click(); document.querySelector('.stage2-workspace').scrollIntoView({block:'start'}); requestAnimationFrame(()=>requestAnimationFrame(resolve)); })`, true);
        await window.webContents.executeJavaScript("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
        const path=resolve(reviewRoot,`${view}.png`); await writeFile(path,(await window.webContents.capturePage()).toPNG());captures.push(path);
      }
      console.log(`AVE_CREATION_ELECTRON_REVIEW ${JSON.stringify({ ...shell, journey, nativeJourney, native_confirmations:native.confirmations.length, captures, snapshot:await snapshot() })}`); app.quit();
    } catch (error) { console.error(`AVE_ELECTRON_PRODUCT_REVIEW_FAILED ${error instanceof Error ? error.stack : String(error)}`); process.exitCode=1; app.quit(); }
  });
}).catch(error=>{ console.error(`AVE_ELECTRON_PRODUCT_REVIEW_FAILED ${error.stack}`); process.exitCode=1;app.quit(); });
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow(resolve(root,"apps/desktop/src/main"),context.sessions);});
