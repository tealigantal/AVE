import { command, query, subscribe, onBeforeClose, acknowledgeClose } from "../api/project-api.js";
import { projectPanel } from "../features/project-panel.js";
import { mediaPanel } from "../features/media-panel.js";
import { jobsPanel } from "../features/jobs-panel.js";
import { timelinePanel } from "../features/timeline-panel.js";
import { playerPanel } from "../features/player-panel.js";
import { comparisonPanel } from "../features/comparison-panel.js";
import { diffPanel } from "../features/diff-panel.js";
import { createCreationWorkspace, prepareCreationAuthorization, manualCommands, exactTicks, explicitList } from "../features/creation-workspace.js";
import { createWorkbenchState, editNavigationHistory, advanceEditNavigation, creationNoticeText, validateWorkspaceContext, clipMatchesTimeline } from "../state/workbench-state.js";
import { statusCard } from "../components/status-card.js";

export function mountWorkbench(root) {
  const state = createWorkbenchState();state.previewCovers=new Map();state.previewCoverRevision=0;
  let disposed = false, epoch = 0, refreshSequence = 0, selectionEpoch = 0, previewSequence = 0, noticeSequence = 0, combinationSequence = 0, comparisonSequence = 0;
  const operationIds = new Map();
  let viewingTail=Promise.resolve();const viewingFailures=new Map();
  // Serialize actual playing acknowledgements and feedback behind them. Each caller
  // owns its error; a failed viewing write blocks dependent feedback until a new
  // explicit playing event successfully records its real identity.
  const enqueueViewing=operation=>{const result=viewingTail.then(operation);viewingTail=result.then(()=>undefined,()=>undefined);return result;};
  const drainViewing=async()=>{let pending;do{pending=viewingTail;await pending;}while(pending!==viewingTail);if(viewingFailures.size)throw new Error(`观看记录未保存：${[...viewingFailures.values()].map(error=>error.message).join("；")}`);};
  let uiVersion=0,uiLoaded=false,uiTimer=null,uiSaveChain=Promise.resolve(),productionPoll=null;
  let recentProjects=[],recentError="",recentLoading=true,statusKnown=false;
  let lifecycleRefresh=null;const refreshReads=new Set();
  const projectId = () => state.status.project === "not-open" ? "" : state.status.project;
  const selectedRequest = () => state.workspace?.requests.find(item => item.authorization.request_id === state.selectedRequestId);
  const selectedDraft = () => selectedRequest()?.drafts.find(item => item.draft_id === state.selectedDraftId);
  const selectedRender = () => selectedDraft()?.renders.find(item => item.render_id === state.selectedRenderId);
  const requireRequest = () => { const value = selectedRequest(); if (!value) throw new Error("请选择已授权创作请求"); return value; };
  const operationId = (kind, value) => {
    const key = JSON.stringify([projectId(),state.selectedRequestId,kind,value], (_, item) => typeof item === "bigint" ? { exact_tick: String(item) } : item);
    if (!operationIds.has(key)) operationIds.set(key, `${kind}:${crypto.randomUUID()}`);
    return operationIds.get(key);
  };
  const clearPreview = () => { previewSequence++; state.previewUrl = ""; state.previewBinding = null;state.restoredPreviewBinding=null;state.displayedPreviewUrl="";state.displayedPreviewBinding=null;state.displayedPreviewTimeline=null; };
  const changeProject = status => {
    epoch++; selectionEpoch++; viewingFailures.clear();state.previewCovers.clear();state.previewCoverRevision++;clearPreview(); closeComparison(); uiLoaded=false;uiVersion=0;clearTimeout(uiTimer);
    Object.assign(state, { home: false, status, workspace: null, timeline: null, media: [], jobs: [], selectedRequestId: "", selectedDraftId: "", selectedRenderId: "", selectedAssetId: "", selectedClip: null, needsRestoredPreview: false, restoredPreviewBinding: null, composingNew: false, combinationSource: null, redoAdoption: null, profileQuery: null });
    state.pending.clear();
  };
  const chooseDefaults = () => {
    const requests = state.workspace?.requests ?? [];
    if (!state.composingNew && !requests.some(item => item.authorization.request_id === state.selectedRequestId)) state.selectedRequestId = requests.length === 1 ? requests[0].authorization.request_id : "";
    const request = selectedRequest();
    if (!request?.drafts.some(item => item.draft_id === state.selectedDraftId)) { state.selectedDraftId = request?.adopted_draft_id ?? request?.latest_draft_id ?? ""; state.selectedRenderId = ""; }
    const draft = selectedDraft();
    if (!draft?.renders.some(item => item.render_id === state.selectedRenderId)) state.selectedRenderId = draft?.renders.at(-1)?.render_id ?? "";
  };
  const readState = async () => {
    const sequence = ++refreshSequence, startedEpoch = epoch;
    state.refreshing = true; state.authorityCurrent = false; update();
    try {
    const status = await query("app.status");
    if (disposed || sequence !== refreshSequence || startedEpoch !== epoch) return null;
    if (!status.ok) { state.notice = status.error.message; update(); return false; }
    statusKnown=true;
    if (status.data.project !== state.status.project) changeProject(status.data); else state.status = status.data;
    const scopeEpoch = epoch, id = projectId();
    recentLoading=true;
    try {
      const recent=await query("app.projects.recent","",{});
      if(disposed||sequence!==refreshSequence||scopeEpoch!==epoch)return null;
      recentLoading=false;
      if(recent.ok){recentProjects=recent.data.items;recentError="";}else{recentProjects=[];recentError=`近期作品未能读取：${recent.error.message}`;}
    }catch(error){if(disposed||sequence!==refreshSequence||scopeEpoch!==epoch)return null;recentLoading=false;recentProjects=[];recentError=`近期作品未能读取：${error.message}`;}
    if (!id) { update(); return true; }
    if (!uiLoaded) {
      const saved=await query("project.creation.ui",id,{});
      if(disposed||scopeEpoch!==epoch||sequence!==refreshSequence)return null;
      if(!saved.ok) { state.notice=`界面草稿读取失败：${saved.error.message}`;update();return false; }
      uiVersion=saved.data.version;uiLoaded=true;
      const value=saved.data.value;
      if(value){
        state.forms=new Map(Object.entries(value.forms));state.formsGeneration=(state.formsGeneration??0)+1;state.selectedRequestId=value.selected_request_id;state.selectedDraftId=value.selected_draft_id;state.materialOpen=value.library_open;state.conversationOpen=value.panel_open;state.creationView=value.panel_tab;
        const savedContext=state.forms.get(JSON.stringify([id,"","workspace-context"]));
        // Prior UI records had no viewing identity. Do not invent one from the history selection.
        if(savedContext!==undefined){const context=validateWorkspaceContext(savedContext,id);if(context.composing_new&&value.selected_request_id)throw new Error("新创作输入与已保存请求选择不一致。");state.profileQuery=context.profile_query;state.composingNew=context.composing_new;state.selectedRenderId=context.selected_render_id;state.selectedClip=context.clip_selection;state.restoredPreviewBinding=context.watched_preview;state.needsRestoredPreview=context.watched_preview!==null;}
        else {state.selectedClip=null;state.needsRestoredPreview=false;state.restoredPreviewBinding=null;}
      }
    }
    const results = await Promise.all([
      query("project.creation.workspace", id, { profile_query: state.profileQuery }), query("project.creation.timeline", id, {}), query("project.media.list", id), query("project.jobs.list", id), query("project.audio.library",id,{action:"list",kind:"all",search:"",use_tag:""}),
    ]);
    if (disposed || sequence !== refreshSequence || scopeEpoch !== epoch || id !== projectId()) return null;
    const keys = ["workspace","timeline","media","jobs","audioCatalog"], failures = [];
    results.forEach((result, index) => { if (result.ok) state[keys[index]] = result.data; else { failures.push(`${result.error.code}: ${result.error.message}`); } });
    if (!failures.length && state.workspace?.timeline_version !== state.timeline?.version) failures.push("作品版本仍在变化，请刷新后再提交修改。");
    state.authorityCurrent = failures.length === 0;
    if(!failures.length)chooseDefaults();
    if(state.needsRestoredPreview&&!failures.length&&!lifecycleRefresh){const binding=state.restoredPreviewBinding;state.needsRestoredPreview=false;queueMicrotask(()=>{if(scopeEpoch===epoch&&!lifecycleRefresh)void actions.restorePreview(binding);});}
    if (failures.length) state.notice = failures.join("；"); update(); return failures.length === 0;
    } finally { if (!disposed && sequence === refreshSequence) { state.refreshing = false; update(); } }
  };
  const refreshNow=()=>{const pending=readState();refreshReads.add(pending);pending.then(()=>refreshReads.delete(pending),()=>refreshReads.delete(pending));return pending;};
  const refresh=()=>lifecycleRefresh?lifecycleRefresh.promise:refreshNow();
  const run = async (key, operation, onSuccess, readAfter=refresh) => {
    if (state.pending.has(key)) return;
    if (["revise", "cancel", "manual"].includes(key)) selectionEpoch++;
    const token = Symbol(key), startedEpoch = epoch, startedSelection = selectionEpoch, startedNotice = ++noticeSequence;
    state.pending.set(key, token); state.notice = "正在执行…"; update();
    let completed = false;
    try {
      const result = await operation();
      if (!result?.ok) throw new Error(`${result?.error?.code ?? "OPERATION_FAILED"}: ${result?.error?.message ?? "操作未返回有效结果"}`);
      completed = true;
      if (disposed || startedEpoch !== epoch) return;
      if (startedSelection === selectionEpoch) await onSuccess?.(result.data);
      if (startedSelection === selectionEpoch && startedNotice === noticeSequence && state.notice === "正在执行…") state.notice = "操作已完成。";
      const fresh = await readAfter(); if (fresh === false && !disposed && startedEpoch === epoch && startedSelection === selectionEpoch && startedNotice === noticeSequence) { state.notice = `操作已经完成，读取最新状态失败：${state.notice}`; update(); }
    } catch (error) { if (!disposed && startedEpoch === epoch) { let message = `${completed ? "操作已经完成，读取最新状态失败：" : ""}${error instanceof Error ? error.message : String(error)}`; if(key==="lifecycle"&&startedSelection===selectionEpoch&&startedNotice===noticeSequence)state.notice=message; try { await readAfter(); } catch (readError) { message += `；读取状态也失败：${readError.message}`; } if (startedEpoch === epoch && startedSelection === selectionEpoch && (completed || startedNotice === noticeSequence)) state.notice = message; update(); } }
    finally { if (state.pending.get(key) === token) state.pending.delete(key); if (!disposed) update(); }
  };
  const currentInput = () => { const request = requireRequest(); return { request_id: request.authorization.request_id, expected_revision: request.revisions.at(-1).revision }; };
  const observationRefs = () => { const request = requireRequest(), observation = request.observations.at(-1); if (!observation) throw new Error("请先完成当前获准素材的真实分析"); return [observation.ref]; };
  const afterDraft = (result, recordHistory = true) => { const request=selectedRequest(); if(recordHistory&&request){state.forms.set(editHistoryKey(request),advanceEditNavigation(editHistory(request),result.draft_id));actions.saveUi();} state.selectedDraftId = result.draft_id; state.selectedRenderId = ""; state.creationView = "drafts"; };
  const persistUi = () => {
    if(!uiLoaded||!projectId())return Promise.resolve();
    const id=projectId(),scopeEpoch=epoch;
    state.forms.delete(JSON.stringify([id,"","clip-selection"]));
    state.forms.set(JSON.stringify([id,"","workspace-context"]),validateWorkspaceContext({context_version:2,profile_query:state.profileQuery,composing_new:state.composingNew,selected_render_id:state.selectedRenderId,watched_preview:state.displayedPreviewBinding??state.restoredPreviewBinding??null,clip_selection:state.selectedClip},id));
    const value={forms:Object.fromEntries([...state.forms].filter(([key])=>JSON.parse(key)[0]===id)),selected_request_id:state.selectedRequestId,selected_draft_id:state.selectedDraftId,selected_clip_id:state.selectedClip?.clip_id??"",library_open:state.materialOpen,panel_open:state.conversationOpen,panel_tab:state.creationView};
    const pending=uiSaveChain.then(async()=>{if(scopeEpoch!==epoch)return;const result=await command("project.creation.ui.save",id,{expected_version:uiVersion,value});if(!result.ok)throw new Error(`界面草稿未保存：${result.error.code}: ${result.error.message}`);if(scopeEpoch===epoch)uiVersion=result.data.version;});
    uiSaveChain=pending.catch(error=>{if(scopeEpoch===epoch){state.notice=error.message;update();}});return pending;
  };
  const lifecycle = (type,payload) => {
    if(lifecycleRefresh)return lifecycleRefresh.promise;
    let resolveBarrier;const barrier={promise:new Promise(resolve=>{resolveBarrier=resolve;}),result:null};lifecycleRefresh=barrier;
    clearTimeout(uiTimer);clearTimeout(productionPoll);productionPoll=null;
    const ownedRefresh=async()=>{const sequence=refreshSequence+1;try{barrier.result=await refreshNow();return barrier.result;}catch(error){if(!disposed&&lifecycleRefresh===barrier&&sequence===refreshSequence){state.notice+=`；读取状态失败：${error.message}`;update();}throw error;}};
    return run("lifecycle",async()=>{
      // Main switches its project session only after every already-issued state
      // read has settled. Events during this operation share its final refresh.
      await Promise.all([...refreshReads]);await drainViewing();await persistUi();
      return command(`project.${type}`,projectId(),payload);
    },()=>{state.home=false;},ownedRefresh).finally(()=>{
      if(lifecycleRefresh===barrier)lifecycleRefresh=null;resolveBarrier(barrier.result);
      if(!disposed){update();if(barrier.result===true&&state.authorityCurrent&&state.needsRestoredPreview){const binding=state.restoredPreviewBinding;state.needsRestoredPreview=false;void actions.restorePreview(binding);}}
    });
  };
  const adoptionKey=request=>JSON.stringify([projectId(),request.authorization.request_id,"adoption-navigation"]);
  const adoptionHistory=request=>{const saved=state.forms.get(adoptionKey(request));if(saved&&saved.ids[saved.cursor]===request.adopted_draft_id&&saved.ids.every(id=>request.drafts.some(draft=>draft.draft_id===id)))return saved;const ids=request.adoptions.map(item=>item.draft_id);return {ids,cursor:ids.length-1};};
  const moveAdoption=direction=>run(direction<0?"undo-adopt":"redo-adopt",async()=>{const request=requireRequest(),history=adoptionHistory(request),cursor=history.cursor+direction,draft_id=history.ids[cursor];if(!draft_id)throw new Error("没有可撤销或重做的采用操作");const result=await command("project.creation.select",projectId(),{request_id:request.authorization.request_id,draft_id,pointer:"adopted"});if(result.ok){state.forms.set(adoptionKey(request),{ids:history.ids,cursor});actions.saveUi();}return result;});
  const editHistoryKey = request => JSON.stringify([projectId(),request.authorization.request_id,"edit-navigation"]);
  const editHistory = request => editNavigationHistory(request,state.forms.get(editHistoryKey(request)));
  const restoreContent = (sourceId, direction = 0) => {
    let history, key;
    return run("restore", () => {
      const request=requireRequest(), parent=request.drafts.find(draft=>draft.timeline_version===state.timeline?.version);
      history=editHistory(request); key=editHistoryKey(request);
      const targetId=direction ? history.ids[history.cursor+direction] : sourceId??state.selectedDraftId;
      const source=request.drafts.find(draft=>draft.draft_id===targetId);
      if(!source||!parent)throw new Error("请在当前编辑版本所属的请求中恢复作品");
      const input={...currentInput(),expected_timeline_version:state.timeline.version,source_draft_id:source.draft_id,parent_draft_id:parent.draft_id,raw_text:`恢复作品 v${source.timeline_version} 的完整内容，创建新的编辑版本。`,preserve_refs:[...request.revisions.at(-1).preserve_refs]};
      return command("project.creation.restore",projectId(),{...input,operation_id:operationId("restore",input)});
    }, async result => {
      state.forms.set(key,advanceEditNavigation(history,result.draft_id,direction)); actions.saveUi();
      afterDraft(result,false);await refresh();if(state.selectedDraftId===result.draft_id)void actions.renderDraft();
    });
  };
  const actions = {
    saveUi: () => {if(!uiLoaded)return;clearTimeout(uiTimer);uiTimer=setTimeout(()=>{void persistUi().catch(error=>{state.notice=error.message;update();});},250);},
    compare: otherId => run("compare",async()=>{
      const request=requireRequest(),current=selectedDraft(),other=request.drafts.find(item=>item.draft_id===otherId);if(!current||!other||current.draft_id===other.draft_id)throw new Error("请选择两个不同版本");
      const scopeEpoch=epoch,selection=selectionEpoch,id=projectId(),comparisonTicket=++comparisonSequence,comparisonOpener=document.activeElement;
      const result=await Promise.all([current,other].map(async draft=>{const render=draft.renders.at(-1);if(!render)throw new Error(`作品 v${draft.timeline_version} 尚未制作可播放画面`);const input={request_id:request.authorization.request_id,draft_id:draft.draft_id,render_id:render.render_id};const [output,exactTimeline]=await Promise.all([query("project.creation.preview",id,input),query("project.creation.draft.timeline",id,{request_id:input.request_id,draft_id:input.draft_id})]);if(!exactTimeline.ok)throw new Error(`${exactTimeline.error.code}: ${exactTimeline.error.message}`);if(exactTimeline.data.version!==draft.timeline_version)throw new Error("比较镜头与所选版本不一致");if(!output.ok)throw new Error(`${output.error.code}: ${output.error.message}`);if(output.data.output_hash!==render.preview.output_hash||output.data.timeline_version!==draft.timeline_version)throw new Error("比较画面与版本不一致");return {draft,data:output.data,timeline:exactTimeline.data};}));
      if(scopeEpoch!==epoch||selection!==selectionEpoch||comparisonTicket!==comparisonSequence)return {ok:true,data:null};
      await comparisonView.open(result,()=>scopeEpoch===epoch&&selection===selectionEpoch&&comparisonTicket===comparisonSequence&&!state.home,comparisonOpener);return {ok:true,data:null};
    }),
    inspectCombination: draftId => {const sequence=++combinationSequence;return run(`combine-inspect:${sequence}`,async()=>{const request=requireRequest(),id=projectId(),scopeEpoch=epoch,requestId=request.authorization.request_id;const result=await query("project.creation.draft.timeline",id,{request_id:requestId,draft_id:draftId});if(result.ok&&scopeEpoch===epoch&&sequence===combinationSequence&&state.selectedRequestId===requestId){state.combinationSource={draft_id:draftId,timeline:result.data};}return result;});},
    combine: values => run("combine",()=>{const input={...currentInput(),expected_timeline_version:state.timeline.version,parent_draft_id:selectedDraft()?.draft_id,raw_text:values.raw_text,selections:values.selections,preserve_refs:explicitList(values.preserve_refs)};return command("project.creation.combine",projectId(),{...input,operation_id:operationId("combine",input)});},afterDraft),
    restoreDraft: sourceId => restoreContent(sourceId),
    undoEdit: () => restoreContent(undefined,-1),
    redoEdit: () => restoreContent(undefined,1),
    editAvailability: () => {const request=selectedRequest();if(!request)return {undo:false,redo:false};const history=editHistory(request);return {undo:history.cursor>0,redo:history.cursor<history.ids.length-1};},
    editCaption: values => run("caption",()=>{const request=requireRequest(),draft=selectedDraft(),target=JSON.parse(values.caption_target||"null"),track=state.timeline?.tracks.find(track=>track.track_id===target?.[0]),caption=track?.captions.find(caption=>caption.caption_id===target?.[1]);if(!draft||draft.timeline_version!==state.timeline?.version||!caption)throw new Error("请选择当前编辑版本中实际存在的字幕");if(!values.raw_text.trim())throw new Error("请填写这次字幕修改的说明");if(values.caption_operation!=="delete"&&!values.caption_text.trim())throw new Error("字幕文字不能为空；删除请明确选择删除字幕");const input={...currentInput(),expected_timeline_version:state.timeline.version,parent_draft_id:draft.draft_id,raw_text:values.raw_text,preserve_refs:[...request.revisions.at(-1).preserve_refs],track_id:track.track_id,caption_id:caption.caption_id,text:values.caption_operation==="delete"?null:values.caption_text};return command("project.creation.caption",projectId(),{...input,operation_id:operationId("caption",input)});},async result=>{afterDraft(result);await refresh();if(state.selectedDraftId===result.draft_id)void actions.renderDraft();}),
    adoptionAvailability: () => {const request=selectedRequest();if(!request)return {undo:false,redo:false};const history=adoptionHistory(request);return {undo:history.cursor>0,redo:history.cursor<history.ids.length-1};},
    undoAdoption: () => moveAdoption(-1),
    redoAdoption: () => moveAdoption(1),
    exportDraft: async identity => {if(identity.project_id!==projectId())return {ok:false,error:{message:"作品已切换，未导出其他项目。"}};let outcome;await run("export",async()=>{try{outcome=await command("project.creation.export",identity.project_id,{request_id:identity.request_id,draft_id:identity.draft_id,render_id:identity.render_id});return outcome;}catch(error){outcome={ok:false,error:{message:error.message}};throw error;}});return outcome;},
    thumbnailReady: (binding,clipId,image) => {if(!binding||binding!==state.displayedPreviewBinding||binding.project_id!==projectId())return;const key=JSON.stringify([binding.project_id,binding.draft_id,binding.render_id,binding.output_hash]),frames=state.previewCovers.get(key)??[];if(frames.some(item=>item.clipId===clipId))return;state.previewCovers.set(key,[...frames,{clipId,image}]);state.previewCoverRevision++;creation.update();},
    create: () => lifecycle("create"), open: () => lifecycle("open"), close: () => lifecycle("close"), openRecent:id=>lifecycle("open-recent",{id}),
    refresh: () => { const startedEpoch = epoch, sequence = refreshSequence + 1; void refresh().catch(error => { if (!disposed && startedEpoch === epoch && sequence === refreshSequence) { state.notice = error.message; update(); } }); },
    importMedia: () => run("import", () => command("project.media.import", projectId())),
    selectAsset: assetId => { state.selectedAssetId = assetId; update(); },
    newRequest: () => { closeComparison(); for(const key of operationIds.keys()){const identity=JSON.parse(key);if(identity[0]===projectId()&&identity[2]==="request")operationIds.delete(key);}selectionEpoch++;state.composingNew=true;state.selectedRequestId="";state.selectedDraftId="";state.selectedRenderId="";actions.showView("request"); },
    selectRequest: id => { closeComparison(); state.composingNew=false;selectionEpoch++; clearPreview(); state.selectedRequestId = id; state.selectedDraftId = ""; state.selectedRenderId = ""; chooseDefaults(); actions.saveUi(); update(); },
    selectDraft: id => { closeComparison(); selectionEpoch++; state.selectedDraftId = id; state.selectedRenderId = ""; chooseDefaults(); actions.saveUi(); update(); },
    selectRender: id => { closeComparison(); selectionEpoch++; state.selectedRenderId = id; actions.saveUi(); update(); },
    begin: values => run("begin", () => command("project.creation.begin", projectId(), {...prepareCreationAuthorization(values, operationId("request", values)),...(values.audio_library ? {audio_library:{pack_id:state.audioCatalog.pack_id,pack_version:state.audioCatalog.pack_version,pack_digest:state.audioCatalog.pack_digest,mode:"manual"}}:{})}), result => { state.composingNew=false;state.selectedRequestId = result.request_id; state.selectedDraftId = ""; state.creationView = "request"; void actions.produce({ request_id: result.request_id, expected_revision: 1 }); }),
    revise: values => {const id=projectId(),clickedRequest=requireRequest(),requestId=clickedRequest.authorization.request_id,expectedRevision=clickedRequest.revisions.at(-1).revision,scopeEpoch=epoch;
      return run("revise",()=>enqueueViewing(async()=>{
        if(disposed||scopeEpoch!==epoch||requestId!==state.selectedRequestId)throw new Error("反馈所属作品或请求已经改变，未提交旧输入。");
        if(viewingFailures.has(requestId))throw viewingFailures.get(requestId);
        const snapshot=await query("project.creation.workspace",id,{profile_query:state.profileQuery});
        if(!snapshot.ok)throw new Error(`${snapshot.error.code}: ${snapshot.error.message}`);
        if(disposed||scopeEpoch!==epoch||requestId!==state.selectedRequestId)throw new Error("反馈所属作品或请求已经改变，未提交旧输入。");
        const request=snapshot.data.requests.find(item=>item.authorization.request_id===requestId);
        if(!request)throw new Error("反馈所属请求已不可用。");
        const prior=request.revisions.at(-1);if(prior.revision!==expectedRevision)throw new Error("CREATION_REVISION_STALE: 要求已被更新，未提交基于旧要求的反馈。");const viewed=request.drafts.find(item=>item.draft_id===request.viewed_draft_id);
        const result=await command("project.creation.revise",id,{request_id:requestId,expected_revision:expectedRevision,raw_text:values.raw_text,viewed_timeline_version:viewed?.timeline_version??null,preserve_refs:[...new Set([...prior.preserve_refs,...explicitList(values.preserve_refs)])]});
        if(result.ok&&scopeEpoch===epoch)void actions.produce({request_id:requestId,expected_revision:prior.revision+1});return result;
      }));
    },
    produce: input => { const scope = input ?? currentInput(); return run(`produce:${scope.request_id}:${scope.expected_revision}`, () => command("project.creation.produce", projectId(), { ...scope, profile_query: state.profileQuery }), async result => {
      const completedSelection=selectionEpoch;
      await refresh();
      if(completedSelection!==selectionEpoch||state.selectedRequestId!==scope.request_id||selectedRequest()?.revisions.at(-1)?.revision!==scope.expected_revision)return;
      if (result?.draft_id && !state.previewBinding) { state.selectedDraftId = result.draft_id; state.selectedRenderId = result.render_id ?? ""; chooseDefaults(); void actions.loadPreview(); }
      state.notice = "新版本已就绪，可在历史中观看；当前播放与采用版本保持独立。";
    }); },
    showView: view => { state.home = false; state.conversationOpen = true; state.creationView = view; actions.saveUi(); if (window.innerWidth <= 1100) state.materialOpen = false; update(); },
    toggleConversation: () => { state.conversationOpen=!state.conversationOpen;if(state.conversationOpen&&window.innerWidth<=1100)state.materialOpen=false;actions.saveUi();update(); },
    watchMode: () => { creation.refinement.open=false;update(); },
    watchDraft: id => { actions.selectDraft(id);void actions.loadPreview(); },
    selectClip: (track, clip, timelineVersion) => { state.selectedClip = { track_id: track.track_id, clip_id: clip.clip_id, timeline_version: timelineVersion };actions.saveUi(); update(); },
    referenceClip: () => { if (!clipMatchesTimeline(state.selectedClip,state.displayedPreviewTimeline??state.timeline)){state.notice="所选镜头不属于当前观看版本，请重新选择镜头。";update();return;} actions.showView("request"); creation.referenceClip(state.selectedClip); },
    refineClip: () => { if(state.displayedPreviewTimeline&&state.displayedPreviewTimeline.version!==state.timeline?.version){state.notice="正在观看旧版；请先观看当前编辑版本，再精修镜头。";update();return;}state.home=false;update();creation.refineClip(state.selectedClip); },
    cancel: revoke => run("cancel", () => command("project.creation.cancel", projectId(), { request_id: requireRequest().authorization.request_id, revoke })),
    prepare: () => run("prepare", async () => {
      const request = requireRequest(), scopeEpoch = epoch, id = projectId(); let completed = 0;
      for (const asset_id of request.authorization.asset_ids) {
        if (scopeEpoch !== epoch) throw new Error("项目已切换，停止素材准备");
        const source = state.media.find(item => item.asset_id === asset_id && item.location_type === "original"); if (!source) throw new Error("获准素材缺少当前原片位置");
        const input = { request_id: request.authorization.request_id, asset_id, asset_location_id: source.asset_location_id };
        const result = await command("project.creation.material.prepare", id, { ...input, operation_id: operationId("material", input) });
        if (!result.ok) return result; completed++;
      }
      return { ok: true, data: { completed } };
    }),
    observe: include_audio => run("observe", () => {
      const request = requireRequest();
      const material_operation_ids = request.authorization.asset_ids.map(id => { const value = request.materials.filter(item => item.asset_id === id && item.authorization_generation === request.authorization_generation).at(-1); if (!value) throw new Error("请先准备全部获准素材"); return value.operation_id; });
      return command("project.creation.observe", projectId(), { ...currentInput(), material_operation_ids, include_audio });
    }),
    generate: () => run("generate", () => command("project.creation.generate", projectId(), { ...currentInput(), observation_refs: observationRefs(), profile_query: state.profileQuery }), afterDraft),
    libraryApply: values => run("library-apply",()=>{
      const request=requireRequest(),draft=selectedDraft();if(!draft || draft.timeline_version!==state.timeline?.version)throw new Error("请选择当前可编辑版本");
      const selected=state.selectedClip,replace=values.replace?state.timeline.tracks.flatMap(track=>track.clips).find(clip=>clip.clip_id===selected?.clip_id):null;
      if(values.replace&&!replace)throw new Error("请选择要替换的音频片段");
      const input={action:"apply",...currentInput(),expected_timeline_version:state.timeline.version,parent_draft_id:draft.draft_id,raw_text:`${values.replace?"替换":"加入"}音频库素材 ${values.title}`,preserve_refs:[...request.revisions.at(-1).preserve_refs],resource_id:values.resource_id,placement_ticks:String(replace?replace.timeline_start:exactTicks(values.placement,state.timeline.sequence.timebase)),duration_ticks:String(replace?replace.timeline_duration:exactTicks(values.duration,state.timeline.sequence.timebase)),gain_db:Number(values.gain),replace_clip_id:replace?.clip_id??null};
      return command("project.audio.library",projectId(),{...input,operation_id:operationId("library-apply",input)});
    },afterDraft),
    manual: values => run("manual", () => {
      const draft = selectedDraft(); if (!draft || draft.timeline_version !== state.timeline?.version) throw new Error("手动修改必须基于当前作品版本；请先选择对应草稿");
      const identity = { ...currentInput(), expected_timeline_version: state.timeline.version, parent_draft_id: draft.draft_id, values }, operation_id = operationId("manual", identity);
      return command("project.creation.manual", projectId(), { ...currentInput(), expected_timeline_version: state.timeline.version, parent_draft_id: draft.draft_id, operation_id, raw_text: values.raw_text, preserve_refs: explicitList(values.preserve_refs), commands: manualCommands(state.timeline, values, operation_id) });
    }, afterDraft),
    renderDraft: () => run("render", async () => {
      const input = { request_id: requireRequest().authorization.request_id, draft_id: selectedDraft()?.draft_id }; if (!input.draft_id) throw new Error("请选择草稿");
      const key = JSON.stringify([projectId(),input.request_id,input.draft_id]);
      const result = await command("project.creation.render", projectId(), { ...input, operation_id: operationId("render", input) });
      if (!result.ok && result.error.code === "CREATION_RENDER_ATTEMPT_FAILED") state.failedRenderAttempts.add(key);
      if (result.ok) state.failedRenderAttempts.delete(key);
      return result;
    }, result => { state.selectedRenderId = result.render_id; }),
    retryRender: () => {
      const input = { request_id: state.selectedRequestId, draft_id: state.selectedDraftId }, key = JSON.stringify([projectId(),input.request_id,input.draft_id]);
      if (!state.failedRenderAttempts.has(key) || state.pending.has("render")) return;
      operationIds.delete(JSON.stringify([projectId(),input.request_id,"render",input])); state.failedRenderAttempts.delete(key); actions.renderDraft();
    },
    adopt: () => run("adopt", async () => {const request=requireRequest(),draft=selectedDraft(),history=adoptionHistory(request);const result=await command("project.creation.select", projectId(), { request_id: request.authorization.request_id, draft_id: draft?.draft_id, pointer: "adopted" });if(result.ok){const ids=[...history.ids.slice(0,history.cursor+1),draft.draft_id];state.forms.set(adoptionKey(request),{ids,cursor:ids.length-1});actions.saveUi();}return result;}),
    previewReady: (binding,url) => {if(binding!==state.previewBinding)return;state.displayedPreviewBinding=binding;state.restoredPreviewBinding=null;state.displayedPreviewTimeline=state.previewTimeline;state.displayedPreviewUrl=url;if(state.selectedClip&&!clipMatchesTimeline(state.selectedClip,state.previewTimeline))state.selectedClip=null;actions.saveUi();update();},
    markViewed: binding => {
      if(binding!==state.displayedPreviewBinding||binding.project_id!==projectId())return;
      const scopeEpoch=epoch;
      void enqueueViewing(async()=>{
        if(disposed||scopeEpoch!==epoch)return;
        const result=await command("project.creation.select",binding.project_id,{request_id:binding.request_id,draft_id:binding.draft_id,pointer: "viewed"});
        if(!result.ok){const error=new Error(`${result.error.code}: ${result.error.message}`);if(scopeEpoch===epoch)viewingFailures.set(binding.request_id,error);throw error;}
        if(scopeEpoch===epoch)viewingFailures.delete(binding.request_id);
      }).then(()=>{if(!disposed&&scopeEpoch===epoch)actions.refresh();},error=>{if(!disposed&&scopeEpoch===epoch){viewingFailures.set(binding.request_id,error);state.notice=`观看记录未保存：${error.message}`;update();}});
    },
    loadPreview: () => actions.restorePreview(null),
    restorePreview: saved => {
      const request=saved?state.workspace?.requests.find(item=>item.authorization.request_id===saved.request_id):selectedRequest(),draft=saved?request?.drafts.find(item=>item.draft_id===saved.draft_id):selectedDraft(),render=saved?draft?.renders.find(item=>item.render_id===saved.render_id):selectedRender();
      if(request&&draft&&render){
        const candidate={project_id:projectId(),request_id:request.authorization.request_id,draft_id:draft.draft_id,render_id:render.render_id,output_hash:render.preview.output_hash,timeline_version:draft.timeline_version};
        const savedMatches=!saved||Object.keys(candidate).every(key=>candidate[key]===saved[key]);
        const reused=savedMatches?player.reuseReadyPreview(candidate):null;
        if(reused){previewSequence++;state.previewBinding=reused.binding;state.previewUrl=reused.url;state.previewTimeline=state.displayedPreviewTimeline;state.restoredPreviewBinding=null;actions.saveUi();update();return Promise.resolve();}
      }
      return run("preview", async () => {
      const request = saved ? state.workspace?.requests.find(item=>item.authorization.request_id===saved.request_id) : requireRequest(), draft = saved ? request?.drafts.find(item=>item.draft_id===saved.draft_id) : selectedDraft(), render = saved ? draft?.renders.find(item=>item.render_id===saved.render_id) : selectedRender();
      if (!draft || !render) throw new Error(saved?"已保存的观看版本不再可用，未替换为其他版本。":"请选择已渲染的版本");
      if(saved&&(saved.project_id!==projectId()||draft.timeline_version!==saved.timeline_version||render.preview.output_hash!==saved.output_hash))throw new Error("已保存的观看身份与实际作品不一致，未加载画面。");
      const sequence = ++previewSequence, scopeEpoch = epoch, selection = selectionEpoch, id = projectId();
      const binding = { project_id: id, request_id: request.authorization.request_id, draft_id: draft.draft_id, render_id: render.render_id, output_hash: render.preview.output_hash, timeline_version: draft.timeline_version };
      const [result,draftTimeline] = await Promise.all([query("project.creation.preview", id, { request_id: binding.request_id, draft_id: binding.draft_id, render_id: binding.render_id }),query("project.creation.draft.timeline",id,{request_id:binding.request_id,draft_id:binding.draft_id})]);
      if (disposed || scopeEpoch !== epoch || selection !== selectionEpoch || sequence !== previewSequence) return { ok: true, data: null };
      if (!result.ok) return result;
      if (!draftTimeline.ok) return draftTimeline;if(draftTimeline.data.version!==binding.timeline_version)throw new Error("镜头带与预览版本不一致");state.previewTimeline=draftTimeline.data;
      if (result.data.output_hash !== binding.output_hash || result.data.timeline_version !== binding.timeline_version) throw new Error("Preview 与所选作品记录不一致");
      const bytes = result.data.bytes instanceof Uint8Array ? result.data.bytes : new Uint8Array(result.data.bytes);
      state.previewUrl = URL.createObjectURL(new Blob([bytes], { type: result.data.mime_type })); state.previewBinding = binding; update();
      return { ok: true, data: null };
      });
    },
    profileQuery: values => { try { state.profileQuery = values === null ? null : { contexts: explicitList(values.contexts), except_principle_ids: explicitList(values.exceptions) }; actions.saveUi(); if (state.workspace) state.workspace = { ...state.workspace, profile: null }; actions.refresh(); } catch (error) { state.notice = error.message; update(); } },
    configureProfile: values => run("profile-configure", () => command("project.profile.configure", projectId(), { source_project_ids: explicitList(values.source_project_ids), data_types: explicitList(values.data_types), external_provider: values.external_provider.trim() || null, retention_until: new Date(values.retention_until).toISOString(), enabled: values.enabled })),
    forget: values => { const targeted=Object.hasOwn(values,"principle_ids"),key=targeted?"principle_ids":"source_project_ids";return run(targeted?"forget-principles":"forget", () => command("project.profile.forget", projectId(), { [key]: explicitList(values[key]) })); },
    learn: values => run("learn", () => {
      const request = requireRequest(), draft = selectedDraft(); let selection;
      if (values.kind === "selection") { const adopted = request.adoptions.filter(item => item.draft_id === draft?.draft_id).at(-1); if (!adopted) throw new Error("所选版本没有实际采用记录"); selection = { data_type: "selection", state_ref: adopted.state_ref }; }
      else if (values.kind === "feedback") { if (!draft) throw new Error("请选择反馈产生的作品版本"); selection = { data_type: "feedback", state_ref: request.state_ref, revision: draft.revision, result_draft_id: draft.draft_id }; }
      else if (values.kind === "manual_diff") { if (draft?.source.kind !== "manual") throw new Error("请选择实际手动修改版"); selection = { data_type: "manual_diff", edit_ref: draft.edit_ref, raw_text: values.raw_text }; }
      else if (values.kind === "history_reference") selection = { data_type: "history_reference", timeline_version: state.timeline.version, observation_refs: observationRefs(), raw_text: values.raw_text };
      else throw new Error("请选择具体经验类型");
      const ids = explicitList(values.correction_ids), profile = state.workspace.profile;
      const predecessors = ids.map(id => { const ref = profile?.correction_predecessors.find(item => item.principle_id === id); if (!ref) throw new Error("纠正对象不在当前已读取的档案中"); return ref; });
      const input = { ...currentInput(), selection, correction: predecessors.length ? { profile_id: profile.snapshot.profile_id, predecessors } : null };
      return command("project.creation.learn", projectId(), { ...input, operation_id: operationId("learn", input) });
    }),
  };
  const shell = document.createElement("div"); shell.className = "workbench-shell";
  shell.innerHTML = `<header class="topbar"><span class="brand">AVE</span><button type="button" class="ghost" data-action="home">作品</button><h1 class="workspace-title">当前作品</h1><span class="connection"><i></i> 本地项目</span><div class="button-row"><button type="button" data-action="history">版本历史</button><button type="button" data-action="export" class="primary">导出</button></div></header>`;
  const cards = document.createElement("div"); cards.className = "status-grid";
  const creation = createCreationWorkspace(actions,state), grid = document.createElement("div"); grid.className = "product-shell";
  const rail = document.createElement("nav"); rail.className = "navigation-rail"; rail.setAttribute("aria-label","工作台导航");
  const railButtons = {};
  for (const [key,label,action] of [["material","素材",()=>{state.materialOpen=!state.materialOpen;if(state.materialOpen&&window.innerWidth<=1100)state.conversationOpen=false; actions.saveUi(); update();}],["request","对话",()=>{if(state.conversationOpen && state.creationView === "request") state.conversationOpen=false; else {state.conversationOpen=true;state.creationView="request";if(window.innerWidth<=1100)state.materialOpen=false;} actions.saveUi(); update();}],["drafts","精修",()=>actions.refineClip()],["profile","档案",()=>actions.showView("profile")]]) { const button=document.createElement("button"); button.textContent=label;button.className="ghost";button.addEventListener("click",action);railButtons[key]=button;rail.append(button); }
  const spacer=document.createElement("div");spacer.className="rail-spacer";rail.append(spacer);
  const productionButton=document.createElement("button");productionButton.className="ghost";productionButton.textContent="制作";productionButton.dataset.creationView="material";productionButton.addEventListener("click",()=>actions.showView("material"));rail.append(productionButton);
  railButtons.profile.dataset.creationView="profile";
  const diagnosticButton=document.createElement("button");diagnosticButton.className="ghost";diagnosticButton.textContent="记录";rail.append(diagnosticButton);
  const library = document.createElement("aside"); library.className = "story-sidebar"; library.setAttribute("aria-label", "项目与素材");
  const player = playerPanel(actions,state), notice = document.createElement("p"); notice.className = "notice"; notice.setAttribute("role", "status");
  const timeline = document.createElement("div"); timeline.className = "timeline-wrap";const timelineView=timelinePanel(actions,state);timeline.append(timelineView.node);
  const desk=document.createElement("main");desk.className="editor-desk";desk.setAttribute("aria-label","作品编辑工作台");desk.append(player.node,timeline,creation.refinement,creation.dock);
  const diagnostics = document.createElement("section"); diagnostics.className = "workspace-diagnostics"; diagnostics.hidden=true;
  const diagnosticLabel = document.createElement("h2"); diagnosticLabel.textContent = "制作记录与诊断";
  const diagnosticPanels = document.createElement("div"); diagnosticPanels.className = "panel-grid"; const diagnosticError=document.createElement("p");diagnosticError.className="stage2-risk";diagnosticError.setAttribute("aria-label","当前操作诊断");
  diagnostics.append(diagnosticLabel,diagnosticError,cards,diagnosticPanels);
  diagnosticButton.addEventListener("click",()=>{diagnostics.hidden=!diagnostics.hidden;diagnosticButton.setAttribute("aria-expanded",String(!diagnostics.hidden));});
  const comparisonView=comparisonPanel();const closeComparison=()=>{comparisonSequence++;comparisonView.close(true);};
  shell.append(comparisonView.node);
  const home=document.createElement("section");home.className="project-home";home.setAttribute("aria-label","作品列表");
  grid.append(rail,library,desk,creation.node); shell.append(grid,notice,diagnostics,home,creation.exportNode); root.replaceChildren(shell);
  shell.querySelector('[data-action="home"]').addEventListener("click",()=>{state.home=!state.home;if(state.home)closeComparison();update();});
  shell.querySelector('[data-action="history"]').addEventListener("click",()=>actions.showView("drafts"));
  shell.querySelector('[data-action="export"]').addEventListener("click",()=>{actions.showView("drafts");creation.showExport();});
  shell.addEventListener("keydown",event=>{if(event.key==="Escape"){if(!comparisonView.node.hidden){event.preventDefault();comparisonSequence++;comparisonView.close();return;}diagnostics.hidden=true;closeComparison();state.conversationOpen=false;update();railButtons.request.focus();}});
  function update() {
    if (disposed) return; if(window.innerWidth<=1100&&state.materialOpen&&state.conversationOpen)state.conversationOpen=false;state.busy = lifecycleRefresh!==null||state.pending.has("lifecycle");
    const initializing=!statusKnown||state.busy||Boolean(projectId()&&!uiLoaded);
    grid.inert=initializing;grid.setAttribute("aria-busy",String(initializing));
    for(const button of [...Object.values(railButtons),productionButton])button.disabled=initializing;
    shell.querySelector('[data-action="history"]').disabled=initializing;
    grid.classList.toggle("material-open",state.materialOpen);grid.classList.toggle("conversation-closed",!state.conversationOpen);
    creation.node.inert=false;creation.update();library.inert=!state.materialOpen;creation.node.inert=!state.conversationOpen;
    railButtons.material.setAttribute("aria-pressed",String(state.materialOpen));railButtons.request.setAttribute("aria-pressed",String(state.conversationOpen));
    const homeVisible=state.home || state.status.project === "not-open";home.classList.toggle("is-visible",homeVisible);grid.classList.toggle("is-home",homeVisible);for(const panel of [library,player.node,creation.node,timeline])panel.inert=homeVisible||(panel===library&&!state.materialOpen)||(panel===creation.node&&!state.conversationOpen);home.inert=!homeVisible;home.setAttribute("aria-hidden",String(!homeVisible));
    shell.querySelector('[data-action="export"]').disabled=initializing||!selectedRender();
    desk.inert=homeVisible;shell.querySelector(".workspace-title").textContent=homeVisible?"作品列表":`当前作品${state.workspace?` · v${state.workspace.timeline_version}`:""}`;
    if (homeVisible) { home.replaceChildren(); const heading=document.createElement("h2");heading.textContent="作品";const description=document.createElement("p");description.className="muted";description.textContent="从本地素材开始，或继续已有作品。";home.append(heading,description,projectPanel(actions,state));if(projectId()){const card=document.createElement("button");card.className="project-card"; const strong=document.createElement("strong");strong.textContent=selectedRequest()?.authorization.original_text.slice(0,48)||"当前作品"; const small=document.createElement("span");small.textContent=`${state.media.filter(item=>item.location_type==="original").length} 份素材 · 作品 v${state.workspace?.timeline_version ?? 0}`;strong.append(small);const watched=state.displayedPreviewBinding,frames=watched?state.previewCovers.get(JSON.stringify([watched.project_id,watched.draft_id,watched.render_id,watched.output_hash])):null;const cover=document.createElement("div");cover.className="project-cover";if(frames?.length){const image=document.createElement("img");image.src=frames[0].image;image.alt=`当前作品已观看 v${watched.timeline_version} 的实际预览帧`;cover.append(image);}else{const placeholder=document.createElement("span");placeholder.textContent="打开作品，继续你的故事";cover.append(placeholder);}const meta=document.createElement("div");meta.className="project-meta";meta.append(strong);card.append(cover,meta);card.addEventListener("click",()=>{state.home=false;update();});home.append(card);} }
    if(homeVisible){
      const recent=document.createElement("section");recent.className="recent-projects";recent.setAttribute("aria-label","最近打开的作品");const label=document.createElement("h3");label.textContent="最近打开";recent.append(label);
      if(recentLoading||recentError||!recentProjects.length){const message=document.createElement("p");message.className=recentError?"stage2-risk":"muted";message.textContent=recentError||(recentLoading?"正在读取近期作品…":"还没有近期作品。通过“新建作品”或“打开作品”开始。");recent.append(message);}
      const list=document.createElement("div");list.className="recent-project-grid";
      for(const item of recentProjects){const card=document.createElement("button");card.className="recent-project-card";card.dataset.recentProject=item.id;card.disabled=state.busy;const cover=document.createElement("div");cover.className="recent-project-placeholder";cover.textContent="本地作品";const name=document.createElement("strong");name.textContent=item.display_name;const time=document.createElement("span");time.textContent=`最近打开：${new Date(item.last_opened_at).toLocaleString("zh-CN")}`;card.append(cover,name,time);card.addEventListener("click",()=>actions.openRecent(item.id));list.append(card);}recent.append(list);home.append(recent);
    }
    const producing=[...state.pending.keys()].some(key=>key.startsWith("produce:"))||(state.workspace?.requests??[]).some(request=>request.production);
    if(producing&&!state.refreshing&&!lifecycleRefresh&&!productionPoll)productionPoll=setTimeout(async()=>{productionPoll=null;if(disposed||state.refreshing||lifecycleRefresh)return;try{await refresh();}catch(error){state.notice=`制作状态读取失败：${error.message}`;update();}},1200);
    else if(!producing&&productionPoll){clearTimeout(productionPoll);productionPoll=null;}
    cards.replaceChildren(...[["项目",state.status.project],["时间线",state.status.timeline],["渲染",state.status.render],["QC",state.status.qc]].map(([label,value])=>statusCard(label,value)));
    library.replaceChildren(mediaPanel(actions,state)); timelineView.update();
    diagnosticPanels.replaceChildren(jobsPanel(state),diffPanel(state)); player.update();diagnosticError.textContent=state.notice;diagnosticError.hidden=!state.notice; notice.textContent = initializing&&state.refreshing ? "正在恢复作品与未发送输入…" : creationNoticeText(state.notice) || "素材与作品保存在本地；模型使用范围由你的创作授权决定。";
  }
  const unsubscribeClose=onBeforeClose(async ({token})=>{clearTimeout(uiTimer);try{await drainViewing();await persistUi();await acknowledgeClose({token,ok:true});}catch(error){state.notice=error.message;update();try{await acknowledgeClose({token,ok:false,message:error.message});}catch(ackError){state.notice+=`；关闭确认发送失败：${ackError.message}`;update();}}});
  const onResize=()=>update();window.addEventListener("resize",onResize);
  const onPageHide=()=>{clearTimeout(uiTimer);void persistUi().catch(error=>{state.notice=error.message;update();});};window.addEventListener("pagehide",onPageHide);
  const unsubscribe = subscribe(event => { if (["project.create","project.open","project.open-recent","project.close"].includes(event?.event_type) || !event?.project_id || event.project_id === projectId()) actions.refresh(); });
  update(); actions.refresh();
  return { refresh, destroy() { disposed = true; epoch++; refreshSequence++; unsubscribe(); unsubscribeClose();clearTimeout(uiTimer);clearTimeout(productionPoll);window.removeEventListener("pagehide",onPageHide);window.removeEventListener("resize",onResize);clearPreview(); player.destroy();timelineView.destroy();comparisonView.destroy();creation.destroy();state.previewCovers.clear(); root.replaceChildren(); } };
}
