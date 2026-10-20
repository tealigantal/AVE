import { precisionAction } from "../features/precision-edit.js";
import { command, query, subscribe, onBeforeClose, acknowledgeClose, isCreationControlResult } from "../api/project-api.js";
import { projectPanel } from "../features/project-panel.js";
import { createHelpPage } from "../features/help-page.js";
import { mediaPanel } from "../features/media-panel.js";
import { jobsPanel } from "../features/jobs-panel.js";
import { timelinePanel } from "../features/timeline-panel.js";
import { addCrossDissolve, addAuthorizedMediaClip, addTextCaption, addWorkbenchTrack, duplicateVideoClipToPip, insertAuthorizedMediaAt, insertVideoClip, isPictureInPictureTrack, mainVideoTrackId, moveAudioClipToTrack, moveTimelineCaption, moveVideoClipToTrack, removeCrossDissolve, removeTextCaption, removeTimelineClip, removeVideoEffect, removeWorkbenchTrack, reorderVideoClip, replaceCrossDissolve, replaceVideoEffect, sourceSpanClip, splitTimelineCaptionAtPlayhead, splitTimelineClipAtPlayhead, trimTimelineCaptionToPlayhead, trimTimelineClipToPlayhead, updateTextCaption } from "../features/p4-timeline-commands.js";
import { currentClipConversationAnnotation, prepareTimelineAnnotationSubmission, timelineAnnotationReceiptMatches, timelineAnnotationV2 } from "../features/timeline-annotation-queue.js";
import { creationUiValuesEqual, mergeCreationUi } from "./creation-ui-sync.js";
import { playerPanel } from "../features/player-panel.js";
import { comparisonPanel } from "../features/comparison-panel.js";
import { diffPanel } from "../features/diff-panel.js";
import { createCreationWorkspace, prepareCreationAuthorization, exactTicks, explicitList } from "../features/creation-workspace.js";
import { createWorkbenchState, editNavigationHistory, advanceEditNavigation, creationNoticeText, validateWorkspaceContext, clipMatchesTimeline, WORKBENCH_PAGE_IDS, readWorkbenchPage, writeWorkbenchPage, readAssetLayout, writeAssetLayout, readPrecisionLayout, writePrecisionLayout, readWorkbenchComposerPosition, writeWorkbenchComposerPosition, rememberWorkspaceFocus, restoreWorkspaceFocus } from "../state/workbench-state.js";
import { statusCard } from "../components/status-card.js";
import { reportError, createErrorRecoveryPage, configureErrorJournal, restoreErrorHistory, resolveRecoveredImportIssues } from "../components/error-dialog.js";

function importNotice(batch, cancelled = false) {
  if (cancelled && !batch) return "已取消素材选择。";
  if (!batch || !Array.isArray(batch.items)) throw new Error("导入未返回持久批次结果，请查看导入记录。");
  const count=status=>batch.items.filter(item=>item.status===status).length;
  for(const item of batch.items.filter(item=>item.status==="failed"))reportError(`${item.error.code}: ${item.display_name}：${item.error.message}`,{operation_type:"media.import"});
  if(batch.stop_reason)reportError(`${batch.stop_reason.code}: ${batch.stop_reason.message}`,{operation_type:"media.import"});
  return `素材导入${({completed:"完成",partial:"部分完成",stopped:"已停止",active:"进行中"})[batch.status]}：${count("imported")} 个已导入，${count("duplicate")} 个重复，${count("failed")} 个失败，${count("cancelled")} 个取消。${batch.stop_reason?.message??"失败原因和恢复操作保留在素材侧栏。"}`;
}

function timelineWithAddedWorkbenchTrack(timeline, command) {
  if (!timeline || !Array.isArray(timeline.tracks) || !Number.isInteger(timeline.version)) throw new Error("当前工作台时间线缺少有效版本或轨道列表");
  if (command?.type !== "add_track" || !command.track || typeof command.track.track_id !== "string") throw new Error("新增工作台轨道命令无效");
  if (timeline.tracks.some(track => track.track_id === command.track.track_id)) throw new Error(`轨道 ${command.track.track_id} 已存在`);
  const index = command.index ?? timeline.tracks.length;
  if (!Number.isInteger(index) || index < 0 || index > timeline.tracks.length) throw new Error("新增工作台轨道位置无效");
  const tracks = [...timeline.tracks];
  tracks.splice(index, 0, command.track);
  return {
    ...timeline,
    version: timeline.version + 1,
    tracks,
    ...(timeline.sequence ? { sequence: { ...timeline.sequence, tracks } } : {}),
  };
}

function optionalTrackAfterWorkbenchCommands(timeline, commands, trackId) {
  let track = timeline.tracks.find(item => item.track_id === trackId);
  if (!track) throw new Error(`可选轨道 ${trackId} 不在当前时间线中`);
  for (const command of commands) {
    if (!command || typeof command.type !== "string") throw new Error("工作台时间线命令无效，未清理轨道");
    if (command.type === "restore_track" && command.track_id === trackId) {
      if (command.track?.track_id !== trackId) throw new Error("可选轨道快照身份不一致，未清理轨道");
      track = command.track;
    } else if (command.type === "set_track_properties" && command.track_id === trackId) {
      if (!command.properties || typeof command.properties !== "object" || Array.isArray(command.properties)) throw new Error("可选轨道属性命令无效，未清理轨道");
      track = { ...track, ...command.properties };
    } else if (command.type === "remove_track" && command.track_id === trackId) {
      return null;
    } else if (command.type === "move_clip" && command.track_id === trackId) {
      // Moving a clip changes its position, not whether the optional track is empty.
    } else if (command.track_id === trackId) {
      throw new Error(`无法从 ${command.type} 命令安全判断可选轨道内容，未清理轨道`);
    }
  }
  return track;
}

export function mountWorkbench(root) {
  const state = createWorkbenchState();state.previewCovers=new Map();state.previewCoverRevision=0;
  const pageFocusTargets = new Map();
  let disposed = false, epoch = 0, refreshSequence = 0, selectionEpoch = 0, previewSequence = 0, noticeSequence = 0, combinationSequence = 0, comparisonSequence = 0;
  const operationIds = new Map();
  const restorePageFocusAfterRouteChange = (previous, page) => {
    // The dedicated export surface owns focus; a route restore would steal it after open().
    if (previous !== page && page !== "export") queueMicrotask(() => { if (!disposed && state.workspacePage === page) restoreWorkspaceFocus(pageFocusTargets, page); });
  };
  let viewingTail=Promise.resolve();const viewingFailures=new Map();
  // Serialize actual playing acknowledgements and feedback behind them. Each caller
  // owns its error; a failed viewing write blocks dependent feedback until a new
  // explicit playing event successfully records its real identity.
  const enqueueViewing=operation=>{const result=viewingTail.then(operation);viewingTail=result.then(()=>undefined,()=>undefined);return result;};
  const drainViewing=async()=>{let pending;do{pending=viewingTail;await pending;}while(pending!==viewingTail);if(viewingFailures.size)throw new Error(`观看记录未保存：${[...viewingFailures.values()].map(error=>error.message).join("；")}`);};
  let uiVersion=0,uiBaseValue=null,uiLoaded=false,uiTimer=null,uiSaveChain=Promise.resolve(),productionPoll=null;
  let recentProjects=[],recentError="",recentLoading=true,recycleProjects=[],recycleError="",recycleLoading=true,statusKnown=false,issuePage=null,toastTimer=null,toastHideTimer=null,toastRevision=0,exportPageOpened=false;
  let lifecycleRefresh=null;const refreshReads=new Set();
  const projectId = () => state.status.project === "not-open" ? "" : state.status.project;
  let inputRevision = 0, inputSaveState = "loading";
  const issueCall = async (type, id, payload, write = false) => {
    if (disposed || id !== projectId()) throw new Error("作品已切换，未修改其他作品的问题记录。");
    const result = write ? await window.projectApi.command({ api_version: 1, project_id: id, command_type: type, command_id: crypto.randomUUID(), idempotency_key: `${type}:${crypto.randomUUID()}`, payload }) : await window.projectApi.query({ api_version: 1, project_id: id, query_type: type, payload });
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
    return result.data;
  };
  const disconnectErrorJournal = configureErrorJournal({ projectId, list: id => issueCall("project.issues.list", id, {}), report: (id, value) => issueCall("project.issues.report", id, value, true), acknowledge: (id, value) => issueCall("project.issues.acknowledge", id, value, true) });
  const selectedRequest = () => state.workspace?.requests.find(item => item.authorization.request_id === state.selectedRequestId);
  const selectedDraft = () => selectedRequest()?.drafts.find(item => item.draft_id === state.selectedDraftId);
  const selectedRender = () => selectedDraft()?.renders.find(item => item.render_id === state.selectedRenderId);
  const requireRequest = () => { const value = selectedRequest(); if (!value) throw new Error("请选择已授权创作请求"); return value; };
  const applyUiValue = (value,id) => {
    state.forms=new Map(Object.entries(value.forms));state.formsGeneration=(state.formsGeneration??0)+1;state.selectedRequestId=value.selected_request_id;state.selectedDraftId=value.selected_draft_id;state.materialOpen=value.library_open;state.conversationOpen=value.panel_open;state.creationView=value.panel_tab;state.workspacePage=readWorkbenchPage(state.forms,id);const savedNavigation=state.forms.get(JSON.stringify([id,"","navigation-visible"]));if(savedNavigation!==undefined&&typeof savedNavigation!=="boolean")throw new Error("已保存的导航显示状态无效，未修改工作区。");state.navigationVisible=savedNavigation??true;
    const savedContext=state.forms.get(JSON.stringify([id,"","workspace-context"]));
    if(savedContext!==undefined){const context=validateWorkspaceContext(savedContext,id);if(context.composing_new&&value.selected_request_id)throw new Error("新创作输入与已保存请求选择不一致。");state.profileQuery=context.profile_query;state.composingNew=context.composing_new;state.selectedRenderId=context.selected_render_id;state.selectedClip=context.clip_selection;state.restoredPreviewBinding=context.watched_preview;state.needsRestoredPreview=context.watched_preview!==null;}
    else {state.selectedClip=null;state.needsRestoredPreview=false;state.restoredPreviewBinding=null;}
  };
  const captureUiValue = id => {
    state.forms.delete(JSON.stringify([id,"","clip-selection"]));
    state.forms.set(JSON.stringify([id,"","workspace-context"]),validateWorkspaceContext({context_version:2,profile_query:state.profileQuery,composing_new:state.composingNew,selected_render_id:state.selectedRenderId,watched_preview:state.displayedPreviewBinding??state.restoredPreviewBinding??null,clip_selection:state.selectedClip},id));
    return {forms:Object.fromEntries([...state.forms].filter(([key])=>JSON.parse(key)[0]===id)),selected_request_id:state.selectedRequestId,selected_draft_id:state.selectedDraftId,selected_clip_id:state.selectedClip?.clip_id??"",library_open:state.materialOpen,panel_open:state.conversationOpen,panel_tab:state.creationView};
  };
  const operationId = (kind, value) => {
    const key = JSON.stringify([projectId(),state.selectedRequestId,kind,value], (_, item) => typeof item === "bigint" ? { exact_tick: String(item) } : item);
    if (!operationIds.has(key)) operationIds.set(key, `${kind}:${crypto.randomUUID()}`);
    return operationIds.get(key);
  };
  const clearPreview = () => { previewSequence++; state.previewUrl = ""; state.previewBinding = null;state.restoredPreviewBinding=null;state.displayedPreviewUrl="";state.displayedPreviewBinding=null;state.displayedPreviewTimeline=null; };
  const changeProject = status => {
    epoch++; selectionEpoch++; inputRevision=0;inputSaveState="loading";state.issueLoadError="";viewingFailures.clear();state.previewCovers.clear();state.previewCoverRevision++;clearPreview(); closeComparison(); uiLoaded=false;uiVersion=0;uiBaseValue=null;clearTimeout(uiTimer);
    Object.assign(state, { workspacePage: status.project === "not-open" ? "projects" : "creation", navigationVisible: true, status, workspace: null, timeline: null, media: [], importBatches: [], jobs: [], selectedRequestId: "", selectedDraftId: "", selectedRenderId: "", selectedAssetId: "", sourceBrowsing: false, selectedClip: null, selectedCaption: null, selectedTransition: null, selectedTimelineTrackId: "", timelineZoom: 0, playheadTicks: 0n, needsRestoredPreview: false, restoredPreviewBinding: null, composingNew: false, precisionSources:[], combinationSource: null, redoAdoption: null, profileQuery: null });
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
    recentLoading=true;recycleLoading=true;
    try {
      const [recent,recycle]=await Promise.all([query("app.projects.recent","",{}),query("app.projects.recycle-bin","",{})]);
      if(disposed||sequence!==refreshSequence||scopeEpoch!==epoch)return null;
      recentLoading=false;recycleLoading=false;
      if(recent.ok){recentProjects=recent.data.items;recentError="";}else{recentProjects=[];recentError=`近期作品未能读取：${recent.error.message}`;}
      if(recycle.ok){recycleProjects=recycle.data.items;recycleError="";}else{recycleProjects=[];recycleError=`回收站未能读取：${recycle.error.message}`;}
    }catch(error){if(disposed||sequence!==refreshSequence||scopeEpoch!==epoch)return null;recentLoading=false;recycleLoading=false;recentProjects=[];recycleProjects=[];recentError=`近期作品未能读取：${error.message}`;recycleError=`回收站未能读取：${error.message}`;}
    if (!id) { update(); return true; }
    if (!uiLoaded) {
      let saved;
      try { saved=await query("project.creation.ui",id,{}); }
      catch(error) { if(!disposed&&scopeEpoch===epoch&&sequence===refreshSequence){inputSaveState="restore-failed";update();} throw error; }
      if(disposed||scopeEpoch!==epoch||sequence!==refreshSequence)return null;
      if(!saved.ok) { inputSaveState="restore-failed";state.notice=`界面草稿读取失败：${saved.error.message}`;update();return false; }
      uiVersion=saved.data.version;uiLoaded=true;inputSaveState="saved";
      const value=saved.data.value;
      if(value)applyUiValue(value,id);
      uiBaseValue=structuredClone(value??captureUiValue(id));
    }
    const results = await Promise.all([
      query("project.creation.workspace", id, { profile_query: state.profileQuery }), query("project.creation.timeline", id, {}), query("project.media.list", id), query("project.jobs.list", id), query("project.audio.library",id,{action:"list",kind:"all",search:"",use_tag:""}), query("project.media.import-batches", id), issueCall("project.issues.list", id, {}).then(data => ({ ok: true, data }), error => ({ ok: false, error: { message: error.message } })),
    ]);
    if (disposed || sequence !== refreshSequence || scopeEpoch !== epoch || id !== projectId()) return null;
    const keys = ["workspace","timeline","media","jobs","audioCatalog","importBatches"], failures = [];
    results.forEach((result, index) => { if (index === 6) { if (result.ok) { restoreErrorHistory(id, result.data); state.issueLoadError = ""; } else state.issueLoadError = result.error.message; return; } if (result.ok) state[keys[index]] = result.data; else { failures.push(`${result.error.code}: ${result.error.message}`); } });
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
    if (["revise", "cancel", "manual", "precision", "timeline-edit"].includes(key)) selectionEpoch++;
    const token = Symbol(key), startedEpoch = epoch, startedSelection = selectionEpoch, startedNotice = ++noticeSequence;
    state.pending.set(key, token); state.notice = "正在执行…"; update();
    let completed = false;
    try {
      const result = await operation();
      if (isCreationControlResult(result)) {
        if (disposed || startedEpoch !== epoch) return;
        if (result.error.code === "DESKTOP_SESSION_STALE") { await readAfter(); return; }
        if (startedSelection === selectionEpoch && startedNotice === noticeSequence) state.notice = result.error.message;
        await readAfter();
        return;
      }
      if (!result?.ok) throw new Error(`${result?.error?.code ?? "OPERATION_FAILED"}: ${result?.error?.message ?? "操作未返回有效结果"}`);
      completed = true;
      if (disposed || startedEpoch !== epoch) return;
      if (startedSelection === selectionEpoch) await onSuccess?.(result.data);
      if (startedSelection === selectionEpoch && startedNotice === noticeSequence && state.notice === "正在执行…") state.notice = "本次操作已完成，其他未处理问题仍保留。";
      const fresh = await readAfter(); if (fresh === false && !disposed && startedEpoch === epoch && startedSelection === selectionEpoch && startedNotice === noticeSequence) { state.notice = `操作已经完成，读取最新状态失败：${state.notice}`; update(); }
    } catch (error) { if (!disposed && startedEpoch === epoch) { let message = `${completed ? "操作已经完成，读取最新状态失败：" : ""}${error instanceof Error ? error.message : String(error)}`; reportError(message); if(key==="lifecycle"&&startedSelection===selectionEpoch&&startedNotice===noticeSequence)state.notice=message; try { await readAfter(); } catch (readError) { message += `；读取状态也失败：${readError.message}`; reportError(message); } if (startedEpoch === epoch && startedSelection === selectionEpoch && (completed || startedNotice === noticeSequence)) state.notice = message; update(); } }
    finally { if (state.pending.get(key) === token) state.pending.delete(key); if (!disposed) update(); }
  };
  const currentInput = () => { const request = requireRequest(); return { request_id: request.authorization.request_id, expected_revision: request.revisions.at(-1).revision }; };
  const annotationQueueKey = requestId => JSON.stringify([projectId(),requestId,"timeline-annotation-drafts"]);
  const selectedAnnotationQueue = requestId => state.forms.get(annotationQueueKey(requestId)) ?? { schema_version:1, annotations:[], submission:null };
  const observationRefs = () => { const request = requireRequest(), observation = request.observations.at(-1); if (!observation) throw new Error("请先完成当前获准素材的真实分析"); return [observation.ref]; };
  const afterDraft = (result, recordHistory = true) => { const request=selectedRequest(); if(recordHistory&&request){state.forms.set(editHistoryKey(request),advanceEditNavigation(editHistory(request),result.draft_id));actions.saveUi();} state.selectedDraftId = result.draft_id; state.selectedRenderId = ""; state.precisionSources=[]; state.creationView = "drafts"; };
  const persistUi = () => {
    if(!uiLoaded||!projectId())return Promise.resolve();
    const id=projectId(),scopeEpoch=epoch,revision=inputRevision,value=captureUiValue(id);
    const pending=uiSaveChain.then(async()=>{
      if(scopeEpoch!==epoch)return;
      inputSaveState="saving";update();
      let candidate=value,base=uiBaseValue,expectedVersion=uiVersion,revisionToSave=revision;
      for(let attempt=0;attempt<4;attempt++){
        if(scopeEpoch!==epoch)return;
        const result=await command("project.creation.ui.save",id,{expected_version:expectedVersion,value:candidate});
        if(result.ok){
          if(scopeEpoch!==epoch)return;
          if(attempt>0){
            let adopted=result.data.value;
            if(revisionToSave!==inputRevision){const live=captureUiValue(id),rebased=mergeCreationUi(candidate,live,result.data.value);if(!rebased.ok)throw new Error(`界面草稿保存后又有同一字段被并发修改：${rebased.conflicts.join("、")}。最新输入仍保留在本窗口，请解决冲突后重试。`);adopted=rebased.value;}
            applyUiValue(adopted,id);
          }
          uiVersion=result.data.version;uiBaseValue=structuredClone(result.data.value);
          inputSaveState=revisionToSave===inputRevision?"saved":"pending";update();return;
        }
        if(result.error?.code!=="CREATION_UI_STALE")throw new Error(`界面草稿未保存：${result.error.code}: ${result.error.message}`);
        const latest=await query("project.creation.ui",id,{});
        if(!latest.ok)throw new Error(`界面草稿版本冲突后无法读取最新状态：${latest.error.code}: ${latest.error.message}`);
        if(scopeEpoch!==epoch)return;
        if(latest.data.version===expectedVersion||!latest.data.value)throw new Error(`界面草稿未保存：${result.error.code}: ${result.error.message}`);
        const merged=mergeCreationUi(base,candidate,latest.data.value);
        if(!merged.ok)throw new Error(`界面草稿存在同一字段的并发修改：${merged.conflicts.join("、")}。本窗口未覆盖另一窗口的已保存输入；请刷新并处理冲突后重试。`);
        const live=captureUiValue(id),withLive=mergeCreationUi(candidate,live,merged.value);
        if(!withLive.ok)throw new Error(`界面草稿在同步时又有同一字段被修改：${withLive.conflicts.join("、")}。最新输入仍保留在本窗口，请重试。`);
        candidate=withLive.value;revisionToSave=inputRevision;base=latest.data.value;expectedVersion=latest.data.version;
        if(creationUiValuesEqual(candidate,latest.data.value)){
          let adopted=latest.data.value;
          if(revisionToSave!==inputRevision){const liveNow=captureUiValue(id),rebased=mergeCreationUi(candidate,liveNow,latest.data.value);if(!rebased.ok)throw new Error(`界面草稿同步后又有同一字段被并发修改：${rebased.conflicts.join("、")}。最新输入仍保留在本窗口，请重试。`);adopted=rebased.value;}
          applyUiValue(adopted,id);uiVersion=latest.data.version;uiBaseValue=structuredClone(latest.data.value);inputSaveState=revisionToSave===inputRevision?"saved":"pending";update();return;
        }
      }
      throw new Error("界面草稿被其他窗口连续更新，四次安全合并后仍未保存；当前输入保留，请重试。");
    });
    uiSaveChain=pending.catch(error=>{if(scopeEpoch===epoch){inputSaveState="failed";reportError(error);state.notice=error.message;update();}});return pending;
  };
  const lifecycle = (type,payload) => {
    if(lifecycleRefresh)return lifecycleRefresh.promise;
    const stayOnRecyclePage=state.workspacePage==="recycle";
    let resolveBarrier;const barrier={promise:new Promise(resolve=>{resolveBarrier=resolve;}),result:null};lifecycleRefresh=barrier;
    clearTimeout(uiTimer);clearTimeout(productionPoll);productionPoll=null;
    let navigateToEditor=false;
    const ownedRefresh=async()=>{const sequence=refreshSequence+1;try{barrier.result=await refreshNow();if(!disposed&&lifecycleRefresh===barrier&&navigateToEditor&&barrier.result===true&&projectId()&&state.workspacePage!=="creation")actions.setWorkspacePage("creation");return barrier.result;}catch(error){if(!disposed&&lifecycleRefresh===barrier&&sequence===refreshSequence){state.notice+=`；读取状态失败：${error.message}`;update();}throw error;}};
    return run("lifecycle",async()=>{
      // Main switches its project session only after every already-issued state
      // read has settled. Events during this operation share its final refresh.
      await Promise.all([...refreshReads]);await drainViewing();await persistUi();
      return command(`project.${type}`,projectId(),payload);
    },result=>{
      if(["create","open","open-recent"].includes(type))navigateToEditor=true;
      if(type==="recycle-bin.move"){state.workspacePage="projects";state.notice="作品已移入回收站；本地项目文件保持不变。";}
      else if(type==="recycle-bin.restore"){state.workspacePage=stayOnRecyclePage?"recycle":"projects";state.notice="作品已恢复到最近作品。";}
      else if(type==="recycle-bin.restore-all"){state.workspacePage=stayOnRecyclePage?"recycle":"projects";state.notice=`已恢复 ${result.restored_ids.length} 个作品。`;}
      else if(type==="recycle-bin.permanently-delete"){state.workspacePage=stayOnRecyclePage?"recycle":"projects";state.notice=result.cancelled?"已取消永久删除；作品仍保留在回收站。":"作品的专属项目数据已从磁盘清理。";}
      else if(type==="recycle-bin.permanently-delete-all"){state.workspacePage=stayOnRecyclePage?"recycle":"projects";const deleted=result.results.filter(item=>item.status==="deleted").length,failed=result.results.filter(item=>item.status==="failed");state.notice=result.status==="cancelled"?"已取消永久删除；回收站内容保留。":failed.length?`已清理 ${deleted} 项，${failed.length} 项未完成并保留在回收站，可重试。`:`已清理回收站中的 ${deleted} 个作品。`;}
      else if(type==="delete")state.workspacePage="projects";
    },ownedRefresh).finally(()=>{
      if(lifecycleRefresh===barrier)lifecycleRefresh=null;resolveBarrier(barrier.result);
      if(!disposed){update();if(barrier.result===true&&state.authorityCurrent&&state.needsRestoredPreview){const binding=state.restoredPreviewBinding;state.needsRestoredPreview=false;void actions.restorePreview(binding);}}
    });
  };
  const adoptionKey=request=>JSON.stringify([projectId(),request.authorization.request_id,"adoption-navigation"]);
  const adoptionHistory=request=>{const saved=state.forms.get(adoptionKey(request));if(saved&&saved.ids[saved.cursor]===request.adopted_draft_id&&saved.ids.every(id=>request.drafts.some(draft=>draft.draft_id===id)))return saved;const ids=request.adoptions.map(item=>item.draft_id);return {ids,cursor:ids.length-1};};
  const moveAdoption=direction=>run(direction<0?"undo-adopt":"redo-adopt",async()=>{const request=requireRequest(),history=adoptionHistory(request),cursor=history.cursor+direction,draft_id=history.ids[cursor];if(!draft_id)throw new Error("没有可撤销或重做的采用操作");const result=await command("project.creation.select",projectId(),{request_id:request.authorization.request_id,draft_id,pointer:"adopted"});if(result.ok){state.forms.set(adoptionKey(request),{ids:history.ids,cursor});actions.saveUi();}return result;});
  const editHistoryKey = request => JSON.stringify([projectId(),request.authorization.request_id,"edit-navigation"]);
  const editHistory = request => editNavigationHistory(request,state.forms.get(editHistoryKey(request)));
  const removeEmptyOptionalTrackAfterEdit=(timeline,commands,trackId)=>{
    const original=timeline.tracks.find(track=>track.track_id===trackId),role=original?.semantic_sidecar?.metadata?.workbench_role;
    if(!["picture-in-picture","captions","text","music","sfx","narration"].includes(role))return {commands,removed:false};
    const updated=optionalTrackAfterWorkbenchCommands(timeline,commands,trackId);if(!updated)return {commands,removed:false};
    const content=[updated.clips,updated.captions,updated.gaps,updated.transitions,updated.effects,updated.keyframes,updated.automation_curves,updated.audio_routing,updated.locks];
    if(content.some(items=>(items??[]).length>0))return {commands,removed:false};
    return {commands:[...commands,removeWorkbenchTrack(timeline,trackId)],removed:true};
  };
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
      afterDraft(result,false);await refresh();if(state.selectedClip){const remains=state.timeline?.tracks.some(track=>track.track_id===state.selectedClip.track_id&&track.clips.some(clip=>clip.clip_id===state.selectedClip.clip_id));state.selectedClip=remains?{...state.selectedClip,timeline_version:state.timeline.version}:null;actions.saveUi();}if(state.selectedDraftId===result.draft_id)void actions.renderDraft();
    });
  };
  const actions = {
    saveUi: () => {if(!uiLoaded)return;inputRevision++;inputSaveState="pending";updateInputSave();clearTimeout(uiTimer);uiTimer=setTimeout(()=>{void persistUi().catch(error=>{reportError(error);state.notice=error.message;update();});},250);},
    setWorkspacePage: page => {
      if(!WORKBENCH_PAGE_IDS.includes(page))throw new Error("工作台页面不存在");
      const previous=state.workspacePage;
      if(!projectId()&&!['projects','help','recycle'].includes(page)){page="projects";state.notice="请先新建或打开作品，再进入这个工作区。";}
      if(previous==="export"&&page!=="export"){creation?.closeExport?.(false);state.exportReturnPage=null;exportPageOpened=false;}
      state.workspacePage=page;state.sourceBrowsing=false;
      state.materialOpen=["creation","assets","precision"].includes(page);
      if(page==="precision")creation.refinement.open=true;
      if(["issues","projects","recycle","help","export"].includes(page))closeComparison();
      if(projectId())writeWorkbenchPage(state.forms,projectId(),page);
      actions.saveUi();update();
      restorePageFocusAfterRouteChange(previous,page);
      if(page==="issues")void issuePage?.refresh();
    },
    openExportPage: () => {
      if(state.workspacePage!=="export")state.exportReturnPage=state.workspacePage;
      exportPageOpened=true;
      if(state.workspacePage!=="export")actions.setWorkspacePage("export");else update();
      if(!creation.showExport())actions.closeExport();
    },
    closeExport: () => {
      exportPageOpened=false;
      const target=state.exportReturnPage;state.exportReturnPage=null;
      actions.setWorkspacePage(target&&WORKBENCH_PAGE_IDS.includes(target)&&target!=="export"?target:"history");
    },
    toggleNavigation: () => {state.navigationVisible=!state.navigationVisible;if(projectId())state.forms.set(JSON.stringify([projectId(),"","navigation-visible"]),state.navigationVisible);actions.saveUi();update();},
    setAssetLayout: value => {
      const id=projectId();if(!id)throw new Error("请先打开作品再调整素材布局。");
      const layout=writeAssetLayout(state.forms,id,value);
      grid.style.setProperty("--asset-panel-width",layout.panelWidth+"px");actions.saveUi();update();
    },
    setPrecisionLayout: value => {
      const id=projectId();if(!id)throw new Error("请先打开作品再调整精修布局。");
      const layout=writePrecisionLayout(state.forms,id,value);
      grid.style.setProperty("--p4-inspector-width",layout.inspectorWidth+"px");grid.style.setProperty("--p4-timeline-height",layout.timelineHeight+"px");grid.classList.toggle("precision-resources-collapsed",!layout.resourcesOpen);grid.classList.toggle("precision-inspector-collapsed",!layout.inspectorOpen);
      actions.saveUi();update();return layout;
    },
    togglePrecisionPanel: name => {
      if(name!=="resources"&&name!=="inspector")throw new Error("未知精修面板");
      const layout=readPrecisionLayout(state.forms,projectId()),key=name==="resources"?"resourcesOpen":"inspectorOpen",next={...layout,[key]:!layout[key]};
      return actions.setPrecisionLayout(next);
    },
    compare: otherId => run("compare",async()=>{
      const request=requireRequest(),current=selectedDraft(),other=request.drafts.find(item=>item.draft_id===otherId);if(!current||!other||current.draft_id===other.draft_id)throw new Error("请选择两个不同版本");
      const scopeEpoch=epoch,selection=selectionEpoch,id=projectId(),comparisonTicket=++comparisonSequence,comparisonOpener=document.activeElement;
      const result=await Promise.all([current,other].map(async draft=>{const render=draft.renders.at(-1);if(!render)throw new Error(`作品 v${draft.timeline_version} 尚未制作可播放画面`);const input={request_id:request.authorization.request_id,draft_id:draft.draft_id,render_id:render.render_id};const [output,exactTimeline]=await Promise.all([query("project.creation.preview",id,input),query("project.creation.draft.timeline",id,{request_id:input.request_id,draft_id:input.draft_id})]);if(!exactTimeline.ok)throw new Error(`${exactTimeline.error.code}: ${exactTimeline.error.message}`);if(exactTimeline.data.version!==draft.timeline_version)throw new Error("比较镜头与所选版本不一致");if(!output.ok)throw new Error(`${output.error.code}: ${output.error.message}`);if(output.data.output_hash!==render.preview.output_hash||output.data.timeline_version!==draft.timeline_version)throw new Error("比较画面与版本不一致");return {draft,data:output.data,timeline:exactTimeline.data};}));
      if(scopeEpoch!==epoch||selection!==selectionEpoch||comparisonTicket!==comparisonSequence)return {ok:true,data:null};
      await comparisonView.open(result,()=>scopeEpoch===epoch&&selection===selectionEpoch&&comparisonTicket===comparisonSequence&&state.workspacePage!=="projects",comparisonOpener);return {ok:true,data:null};
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
    readExports: async identity => { if(identity.project_id!==projectId())throw new Error("作品已切换。");const result=await query("project.creation.export-history",identity.project_id,{request_id:identity.request_id,draft_id:identity.draft_id,render_id:identity.render_id});if(!result.ok)throw new Error(result.error.message);return result.data; },
    thumbnailReady: (binding,clipId,image) => {if(!binding||binding!==state.displayedPreviewBinding||binding.project_id!==projectId())return;const key=JSON.stringify([binding.project_id,binding.draft_id,binding.render_id,binding.output_hash]),frames=state.previewCovers.get(key)??[];if(frames.some(item=>item.clipId===clipId))return;state.previewCovers.set(key,[...frames,{clipId,image}]);state.previewCoverRevision++;creation.update();},
    create: () => lifecycle("create"), open: () => lifecycle("open"), close: () => lifecycle("close"), openRecent:id=>lifecycle("open-recent",{id}),
    recycleProject:id=>lifecycle("recycle-bin.move",{id}), restoreRecycledProject:id=>lifecycle("recycle-bin.restore",{id}), restoreAllRecycledProjects:()=>lifecycle("recycle-bin.restore-all",{}), permanentlyDeleteRecycledProject:id=>lifecycle("recycle-bin.permanently-delete",{id}), permanentlyDeleteAllRecycledProjects:()=>lifecycle("recycle-bin.permanently-delete-all",{}),
    refresh: () => { const startedEpoch = epoch, sequence = refreshSequence + 1; void refresh().catch(error => { if (!disposed && startedEpoch === epoch && sequence === refreshSequence) { reportError(error);state.notice = error.message; update(); } }); },
    importMedia: () => {actions.setWorkspacePage("assets");return run("import", () => command("project.media.import", projectId()), result => { state.notice=importNotice(result.batch,result.cancelled); });},
    cancelImport: batchId => run(`import-cancel:${batchId}`, () => command("project.media.import.cancel", projectId(), {batch_id:batchId}), batch => {state.notice=importNotice(batch);}),
    retryImport: batchId => run(`import-retry:${batchId}`, () => command("project.media.import.retry", projectId(), {batch_id:batchId}), async result => {
      if (result.cancelled) { state.notice="已取消来源重选，批次与历史记录保留。"; return; }
      const notice = importNotice(result.batch);
      try {
        const resolved = await resolveRecoveredImportIssues(result.batch);
        state.notice = resolved ? `${notice} 已将 ${resolved} 条关联导入问题标记为解决。` : notice;
      } catch (error) {
        const detail = `MEDIA_IMPORT_ISSUE_RECOVERY_FAILED: ${error instanceof Error ? error.message : String(error)}`;
        state.notice = `${notice} 导入已成功，但关联问题记录未能更新：${detail}`;
        reportError(detail, { operation_type: "media.import.issue-recovery" });
      }
    }),
    selectAsset: assetId => { state.selectedAssetId = assetId; if(!state.sourceBrowsing)state.sourceReturnPage=state.workspacePage;state.sourceBrowsing = true; state.materialOpen = true;state.workspacePage="assets";if(projectId())writeWorkbenchPage(state.forms,projectId(),"assets");actions.saveUi();update(); },
    returnToWork: () => { state.sourceBrowsing=false;const page=state.sourceReturnPage;state.sourceReturnPage=null;if(page&&page!=="assets")actions.setWorkspacePage(page);else update(); },
    newRequest: () => { closeComparison(); for(const key of operationIds.keys()){const identity=JSON.parse(key);if(identity[0]===projectId()&&identity[2]==="request")operationIds.delete(key);}selectionEpoch++;state.composingNew=true;state.selectedRequestId="";state.selectedDraftId="";state.selectedRenderId="";actions.showView("request"); },
    selectRequest: id => { closeComparison(); state.composingNew=false;selectionEpoch++; clearPreview(); state.precisionSources=[];state.selectedClip=null;state.selectedCaption=null;state.selectedTransition=null;state.selectedTimelineTrackId="";state.selectedRequestId = id; state.selectedDraftId = ""; state.selectedRenderId = ""; chooseDefaults(); actions.saveUi(); update(); },
    selectDraft: id => { closeComparison(); selectionEpoch++; state.precisionSources=[];state.selectedClip=null;state.selectedCaption=null;state.selectedTransition=null;state.selectedTimelineTrackId="";state.selectedDraftId = id; state.selectedRenderId = ""; chooseDefaults(); actions.saveUi(); update(); },
    selectRender: id => { closeComparison(); selectionEpoch++; state.selectedRenderId = id; actions.saveUi(); update(); },
    begin: values => run("begin", () => command("project.creation.begin", projectId(), {...prepareCreationAuthorization(values, operationId("request", values)),...(values.audio_library ? {audio_library:{pack_id:state.audioCatalog.pack_id,pack_version:state.audioCatalog.pack_version,pack_digest:state.audioCatalog.pack_digest,mode:"automatic"}}:{})}), result => { state.composingNew=false;state.selectedRequestId = result.request_id; state.selectedDraftId = ""; state.creationView = "request"; void actions.produce({ request_id: result.request_id, expected_revision: 1 }); }),
    revise: values => {let queued=selectedAnnotationQueue(requireRequest().authorization.request_id);
      if(values.conversation_scope==="current"&&!queued.submission){const annotation=currentClipConversationAnnotation(state.timeline,state.selectedClip??state.selectedCaption,values.raw_text);if(queued.annotations.some(item=>item.anchor.clip_id!==annotation.anchor.clip_id||item.anchor.track_id!==annotation.anchor.track_id))throw new Error("待发送批注包含当前片段以外的对象；请选择整部作品，或移除这些批注后发送。");if(!queued.annotations.some(item=>item.body===annotation.body&&item.anchor.clip_id===annotation.anchor.clip_id)){actions.commitTimelineAnnotation(annotation);queued=selectedAnnotationQueue(requireRequest().authorization.request_id);}}
      if(queued.annotations.length||queued.submission)return actions.sendTimelineAnnotations(values.raw_text,values.preserve_refs);const id=projectId(),clickedRequest=requireRequest(),requestId=clickedRequest.authorization.request_id,expectedRevision=clickedRequest.revisions.at(-1).revision,scopeEpoch=epoch;
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
      if (result?.draft_id && !state.previewBinding) { state.selectedDraftId = result.draft_id; state.selectedRenderId = result.render_id ?? ""; chooseDefaults(); if(state.selectedRenderId)void actions.loadPreview(); }
      state.notice = "新版本已就绪，可在历史中观看；当前播放与采用版本保持独立。";
    }); },
    showView: (view,options={}) => { const previous=state.workspacePage;state.materialOpen=view!=="drafts";state.sourceBrowsing=false;state.workspacePage=view==="drafts"?"history":"creation";state.conversationOpen=true;state.creationView=view;if(projectId())writeWorkbenchPage(state.forms,projectId(),state.workspacePage);actions.saveUi();update();if(options.restoreFocus!==false)restorePageFocusAfterRouteChange(previous,state.workspacePage); },
    watchMode: () => { creation.refinement.open=false;update(); },
    watchDraft: id => { actions.selectDraft(id); void actions.loadPreview(); },
    setConversationScope: scope => {state.forms.set(JSON.stringify([projectId(),state.selectedRequestId||"","conversation-scope"]),scope==="current"?"current":"project");actions.saveUi();update();},
    selectClip: (track, clip, timelineVersion) => {state.forms.set(JSON.stringify([projectId(),state.selectedRequestId||"","conversation-scope"]),"current"); state.selectedCaption=null;state.selectedTransition=null;state.selectedTimelineTrackId=track.track_id;state.selectedClip = { track_id: track.track_id, clip_id: clip.clip_id, timeline_version: timelineVersion };actions.saveUi(); update(); },
    selectCaption: (track, caption, timelineVersion) => {state.forms.set(JSON.stringify([projectId(),state.selectedRequestId||"","conversation-scope"]),"current"); state.selectedClip=null;state.selectedTransition=null;state.selectedTimelineTrackId=track.track_id;state.selectedCaption={track_id:track.track_id,caption_id:caption.caption_id,timeline_version:timelineVersion};actions.saveUi();update(); },
    selectTimelineTrack: trackId => { state.selectedClip=null;state.selectedCaption=null;state.selectedTransition=null;state.selectedTimelineTrackId=trackId;update(); },
    selectTimelineTransition: (track, transition, timelineVersion) => { state.selectedClip=null;state.selectedCaption=null;state.selectedTimelineTrackId=track.track_id;state.selectedTransition={track_id:track.track_id,transition_id:transition.transition_id,timeline_version:timelineVersion};actions.saveUi();update(); },
    queueTimelineAnnotation: annotation => {
      const request=requireRequest(),queue=selectedAnnotationQueue(request.authorization.request_id);
      if(queue.relocateAnnotationId)return actions.commitTimelineAnnotation(annotation);
      if(queue.submission)throw new Error("上一批批注仍绑定原提交；请精确重试或重新打开编辑。");
      creation.editAnnotation(timelineAnnotationV2(annotation),body=>actions.commitTimelineAnnotation({...annotation,body}));
    },
    commitTimelineAnnotation: annotation => {
      const request=requireRequest(),draft=selectedDraft();if(state.pending.has("timeline-annotation-send")||!state.authorityCurrent||!draft||draft.timeline_version!==state.timeline?.version||(state.displayedPreviewTimeline&&state.displayedPreviewTimeline.version!==state.timeline.version))throw new Error("批注只能添加到当前可编辑版本且不能与发送操作并行");
      const key=annotationQueueKey(request.authorization.request_id),queue=selectedAnnotationQueue(request.authorization.request_id);if(queue.submission)throw new Error("上一批批注的发送结果尚未确认，请先重试原提交后再修改队列。写入回执前不能增加新批注。");if(!Array.isArray(queue.annotations)||queue.annotations.length>=20)throw new Error("一次最多排队 20 条批注");
      if(![1,2].includes(annotation?.schema_version)||!annotation.annotation_id||!annotation.anchor?.track_id||!annotation.anchor.start)throw new Error("时间线没有返回有效的精确批注锚点");
      if(queue.relocateAnnotationId){const index=queue.annotations.findIndex(item=>item.annotation_id===queue.relocateAnnotationId);if(index<0)throw new Error("待重新定位的批注已不存在");const annotations=queue.annotations.map((item,itemIndex)=>itemIndex===index?{...timelineAnnotationV2(item),annotation_id:crypto.randomUUID(),anchor:timelineAnnotationV2(annotation).anchor}:timelineAnnotationV2(item));state.forms.set(key,{schema_version:1,annotations,submission:null});state.notice="已保留批注正文并更新到新的精确锚点。";}else state.forms.set(key,{schema_version:1,annotations:[...queue.annotations.map(timelineAnnotationV2),timelineAnnotationV2(annotation)],submission:null});state.creationView="request";state.conversationOpen=true;actions.saveUi();update();
    },
    relocateTimelineAnnotation: annotationId => {const request=selectedRequest();if(!request||state.pending.has("timeline-annotation-send"))return;const key=annotationQueueKey(request.authorization.request_id),queue=selectedAnnotationQueue(request.authorization.request_id);if(queue.submission||!queue.annotations.some(item=>item.annotation_id===annotationId))return;state.forms.set(key,{...queue,relocateAnnotationId:annotationId});state.notice="请在预览画面或时间线上右键，选择这条批注的新锚点。";actions.saveUi();update();},
    timelineAnnotationSnapshot: () => {
      const request=selectedRequest();if(!request)return [];
      const active=(request.timeline_annotations??[]).filter(message=>["queued","processing","failed"].includes(message.processing?.status));
      const saved=active.flatMap(message=>message.annotations??[]).map(annotation=>({...annotation,pending:false}));
      const savedIds=new Set(saved.map(annotation=>annotation.annotation_id));
      const queued=selectedAnnotationQueue(request.authorization.request_id).annotations.filter(annotation=>!savedIds.has(annotation.annotation_id)).map(annotation=>({...timelineAnnotationV2(annotation),pending:true}));
      return [...saved,...queued];
    },
    updateTimelineAnnotation: (annotationId,body) => {
      const request=selectedRequest();if(!request||state.pending.has("timeline-annotation-send"))return;const key=annotationQueueKey(request.authorization.request_id),queue=selectedAnnotationQueue(request.authorization.request_id),index=queue.annotations.findIndex(item=>item.annotation_id===annotationId);if(index<0||queue.submission)return;
      const annotations=queue.annotations.map(item=>item.annotation_id===annotationId?{...timelineAnnotationV2(item),body}:timelineAnnotationV2(item));state.forms.set(key,{schema_version:1,annotations,submission:null});actions.saveUi();
    },
    removeTimelineAnnotation: annotationId => {
      const request=selectedRequest();if(!request||state.pending.has("timeline-annotation-send"))return;const key=annotationQueueKey(request.authorization.request_id),queue=selectedAnnotationQueue(request.authorization.request_id);if(queue.submission)return;state.forms.set(key,{schema_version:1,annotations:queue.annotations.filter(item=>item.annotation_id!==annotationId),submission:null});actions.saveUi();update();
    },
    clearTimelineAnnotations: () => {const request=selectedRequest();if(!request||state.pending.has("timeline-annotation-send"))return;const key=annotationQueueKey(request.authorization.request_id);if(selectedAnnotationQueue(request.authorization.request_id).submission)return;state.forms.delete(key);actions.saveUi();update();},
    retryTimelineAnnotationMessage: operationId => {
      const request=requireRequest(),message=request.timeline_annotations?.find(item=>item.operation_id===operationId&&item.schema_version===3&&item.processing?.status==="failed");
      if(!message)throw new Error("任务状态已变化，请刷新后重试。");
      const key=annotationQueueKey(request.authorization.request_id),queue=selectedAnnotationQueue(request.authorization.request_id);
      if(queue.annotations.length&&queue.submission?.operation_id!==operationId)throw new Error("请先处理当前待发送批注；不会用历史任务覆盖草稿。");
      creation.assertAnnotationRestoreSafe(message);
      const {schema_version,operation_id,message_id,project_id,request_id,draft_id,expected_revision,timeline_version,request_text,preserve_refs,profile_query}=message;
      const submission={schema_version,operation_id,message_id,project_id,request_id,draft_id,expected_revision,timeline_version,request_text,preserve_refs,profile_query,annotations:message.annotations.map(timelineAnnotationV2)};
      state.forms.set(key,{schema_version:1,annotations:submission.annotations,submission});creation.restoreAnnotationRequest(submission);actions.saveUi();return actions.sendTimelineAnnotations(request_text,preserve_refs);
    },
    reopenFailedTimelineAnnotations: operationId => {
      let failedSubmission,failedAnnotations;
      return run("timeline-annotation-reopen",async()=>{
        const request=requireRequest(),requestId=request.authorization.request_id,queue=selectedAnnotationQueue(requestId);
        const failed=request.timeline_annotations?.find(message=>message.operation_id===operationId&&message.schema_version===3&&message.processing?.status==="failed");
        if(!failed)throw new Error("组合任务状态已变化；请刷新后重试");
        if(queue.annotations.length&&queue.submission?.operation_id!==operationId)throw new Error("当前还有未发送批注；请先处理它们，避免历史任务覆盖草稿。");
        creation.assertAnnotationRestoreSafe(failed);
        failedSubmission=queue.submission?.operation_id===operationId?queue.submission:failed;
        if(failedSubmission.schema_version!==3)throw new Error("当前组合任务没有可编辑的请求内容");
        failedAnnotations=queue.submission?.operation_id===operationId?queue.annotations:failed.annotations;
        if(queue.submission?.operation_id===operationId&&JSON.stringify(queue.annotations.map(timelineAnnotationV2))!==JSON.stringify(failedSubmission.annotations))throw new Error("本地批注与失败消息不一致；为保护历史，未重新打开");
        return command("project.creation.annotation.supersede",projectId(),{request_id:requestId,operation_id:operationId});
      },result=>{
        const request=requireRequest(),requestId=request.authorization.request_id,key=annotationQueueKey(requestId);
        if(result.processing?.status!=="superseded"||result.processing?.operation_id!==operationId||!failedSubmission||!failedAnnotations)throw new Error("未能确认失败任务已重新打开，原队列和锚点保持不变");
        const annotations=failedAnnotations.map(item=>({...timelineAnnotationV2(item),annotation_id:crypto.randomUUID()}));
        state.forms.set(key,{schema_version:1,annotations,submission:null});creation.restoreAnnotationRequest({request_text:failedSubmission.request_text,preserve_refs:failedSubmission.preserve_refs});
        state.notice="失败任务已保留在历史中；批注正文和锚点已载入编辑队列，可修改或重新定位后提交。";actions.saveUi();update();
      });
    },
    sendTimelineAnnotations: (requestText, preserveRefs) => run("timeline-annotation-send",async()=>{
      const request=requireRequest(),draft=selectedDraft(),requestId=request.authorization.request_id,key=annotationQueueKey(requestId),queue=selectedAnnotationQueue(requestId);
      const requirement=typeof requestText==="string"?requestText:"",refs=[...new Set([...request.revisions.at(-1).preserve_refs,...explicitList(preserveRefs??[])])];
      if(!queue.submission&&(!draft||!state.authorityCurrent||draft.timeline_version!==state.timeline?.version||(state.displayedPreviewTimeline&&state.displayedPreviewTimeline.version!==state.timeline.version)||!queue.annotations.length||queue.annotations.length>20||queue.annotations.some(item=>typeof item.body!=="string"||!item.body.trim())||!requirement.trim()))throw new Error("请填写整体创作要求、补全批注，并确保它们仍对应当前编辑版本。");
      let submission=queue.submission;
      if(submission&&submission.schema_version!==3){
        const snapshots=await query("project.creation.workspace",projectId(),{profile_query:state.profileQuery});if(!snapshots.ok)throw new Error(`${snapshots.error.code}: ${snapshots.error.message}`);
        const savedRequest=snapshots.data.requests.find(item=>item.authorization.request_id===requestId);if(!savedRequest)throw new Error("旧批注所属请求已不可用，原草稿仍保留。");
        const historical=savedRequest.timeline_annotations.find(item=>item.operation_id===submission.operation_id);
        const submittedAnnotations=submission.annotations??[],queuedAnnotations=queue.annotations.map(timelineAnnotationV2);
        if(submittedAnnotations.length!==queuedAnnotations.length||submittedAnnotations.some(item=>!queuedAnnotations.some(queuedItem=>queuedItem.annotation_id===item.annotation_id&&queuedItem.body===item.body)))throw new Error("旧批注草稿与原提交内容不一致；为保护正文，未覆盖队列。");
        if(historical&&(historical.message_id!==submission.message_id||historical.request_id!==requestId||historical.annotations.length!==queuedAnnotations.length||historical.annotations.some(item=>!queuedAnnotations.some(queuedItem=>queuedItem.annotation_id===item.annotation_id&&queuedItem.body===item.body))))throw new Error("已保存的旧批注与本地草稿身份不一致；为保护历史，未覆盖队列。");
        queue.annotations=queuedAnnotations.map(item=>({...item,annotation_id:crypto.randomUUID()}));queue.submission=null;submission=null;state.forms.set(key,queue);actions.saveUi();
        state.notice=historical?"已核实旧协议批注只保存在历史；正文已保留并转换为新的组合任务。":"已确认旧提交没有保存回执；正文已保留并转换为当前组合任务。";
      }
      if(!submission){
        submission=prepareTimelineAnnotationSubmission(queue,{project_id:projectId(),request_id:requestId,draft_id:draft.draft_id,expected_revision:request.revisions.at(-1).revision,timeline_version:state.timeline.version},{request_text:requirement,preserve_refs:refs,profile_query:state.profileQuery});
        state.forms.set(key,{...queue,submission});actions.saveUi();clearTimeout(uiTimer);await persistUi();
      }
      if(submission.project_id!==projectId()||submission.request_id!==requestId)throw new Error("批注重试仍绑定到原作品和请求，请切回原请求后重试。");
      return command("project.creation.annotation.send",submission.project_id,submission);
    },async receipt=>{
      const request=selectedRequest(),queue=request&&selectedAnnotationQueue(request.authorization.request_id),submission=queue?.submission;
      if(!timelineAnnotationReceiptMatches(receipt,submission))throw new Error("批注回执与本次精确提交身份不一致；队列和锚点仍保留。");
      state.forms.delete(annotationQueueKey(submission.request_id));state.selectedDraftId=receipt.processing.result.draft_id;state.selectedRenderId=receipt.processing.result.render_id;state.creationView="request";state.notice=`组合要求与批注已处理，作品 v${receipt.processing.result.timeline_version} 已完成预览与成片渲染。`;actions.saveUi();clearTimeout(uiTimer);await persistUi();
      if(await refresh())await actions.loadPreview();
    }),
    referenceClip: () => { if (!clipMatchesTimeline(state.selectedClip,state.displayedPreviewTimeline??state.timeline)){state.notice="所选镜头不属于当前观看版本，请重新选择镜头。";update();return;} actions.showView("request",{restoreFocus:false}); creation.referenceClip(state.selectedClip); },
    refineClip: () => { actions.setWorkspacePage("precision");creation.refineClip(state.selectedClip); },
    cancel: revoke => run("cancel", () => command("project.creation.cancel", projectId(), { request_id: requireRequest().authorization.request_id, revoke }), () => { state.notice = revoke ? "本次授权已撤销，已保存作品保留。" : "本次制作已取消，已保存作品保留。"; }),
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
    libraryAlternative: resource_id=>{state.materialOpen=true;state.sourceBrowsing=false;actions.setWorkspacePage("assets");update();document.dispatchEvent(new CustomEvent("ave:audio-alternative",{detail:resource_id}));},
    libraryBinding:()=>{const request=selectedRequest();return JSON.stringify([epoch,projectId(),state.selectedRequestId,state.selectedDraftId,state.timeline?.version,state.selectedClip,request?.authorization_generation,request?.revisions.at(-1)?.revision,request?.authorization.audio_library,request?.status]);},
    libraryApply: values => run("library-apply",()=>{
      if(values.binding!==actions.libraryBinding())throw new Error("音频操作上下文已失效，请重新选择。");
      const request=requireRequest(),draft=selectedDraft();if(!draft || draft.timeline_version!==state.timeline?.version)throw new Error("请选择当前可编辑版本");
      const selected=state.selectedClip,replace=values.replace?state.timeline.tracks.flatMap(track=>track.clips).find(clip=>clip.clip_id===selected?.clip_id):null;
      if(values.replace&&!replace)throw new Error("请选择要替换的音频片段");
      const input={action:"apply",...currentInput(),expected_timeline_version:state.timeline.version,parent_draft_id:draft.draft_id,raw_text:`${values.replace?"替换":"加入"}音频库素材 ${values.title}`,preserve_refs:[...request.revisions.at(-1).preserve_refs],resource_id:values.resource_id,placement_ticks:String(replace?replace.timeline_start:exactTicks(values.placement,state.timeline.sequence.timebase)),duration_ticks:String(replace?replace.timeline_duration:exactTicks(values.duration,state.timeline.sequence.timebase)),gain_db:Number(values.gain),replace_clip_id:replace?.clip_id??null};
      return command("project.audio.library",projectId(),{...input,operation_id:operationId("library-apply",input)});
    },afterDraft),
    precisionSources:()=>run("precision-sources",()=>{const request=requireRequest(),draft=selectedDraft();if(!draft)throw new Error("请选择作品版本");return query("project.creation.precision.sources",projectId(),{request_id:request.authorization.request_id,parent_draft_id:draft.draft_id});},result=>{state.precisionSources=result;}),
    timelineSeek: tick => {if(typeof tick!=="bigint"||!state.timeline?.sequence?.timebase)return;const position=tick<0n?0n:tick;state.playheadTicks=position;const base=state.timeline.sequence.timebase,seconds=Number(position)*Number(base.value)/Number(base.timescale);if(Number.isFinite(seconds))player?.seekToSeconds?.(seconds);update();},
    applyTimelineEffectToClip: (clipId,kind) => actions.timelineEdit(()=>{const track=state.timeline.tracks.find(item=>item.kind==="video"&&item.clips.some(clip=>clip.clip_id===clipId)),clip=track?.clips.find(item=>item.clip_id===clipId);if(!track||!clip||track.locked||track.enabled===false)throw new Error("效果目标视频片段不存在、已锁定或已停用");return replaceVideoEffect(state.timeline,clipId,kind,"p4-effect:"+clipId);},"将已注册效果 "+kind+" 应用于时间线上目标片段 "+clipId+"；同一片段保持一个活动效果。",result=>{const track=state.timeline.tracks.find(item=>item.kind==="video"&&item.clips.some(clip=>clip.clip_id===clipId));if(track)state.selectedClip={track_id:track.track_id,clip_id:clipId,timeline_version:result.edit_ref.timeline_version};state.selectedCaption=null;}),
    removeTimelineEffect: (trackId,clipId) => actions.timelineEdit(()=>{const track=state.timeline.tracks.find(item=>item.track_id===trackId);if(!track?.clips.some(clip=>clip.clip_id===clipId))throw new Error("效果目标片段已不存在或已移动");return removeVideoEffect(state.timeline,clipId);},`移除视频片段 ${clipId} 的已注册效果。`,result=>{state.selectedClip={track_id:trackId,clip_id:clipId,timeline_version:result.edit_ref.timeline_version};state.selectedCaption=null;state.selectedTransition=null;}),
    timelineEdit: (compile,rawText,afterCommit) => run("timeline-edit",()=>{
      const request=requireRequest(),draft=selectedDraft();if(!state.authorityCurrent||!draft||draft.timeline_version!==state.timeline?.version)throw new Error("时间线修改必须基于 Host 当前可编辑版本");const commands=typeof compile==="function"?compile():compile;if(!Array.isArray(commands)||!commands.length)throw new Error("没有可提交的时间线命令");
      const input={...currentInput(),expected_timeline_version:state.timeline.version,parent_draft_id:draft.draft_id,raw_text:rawText,preserve_refs:[],commands};return command("project.creation.manual",projectId(),{...input,operation_id:operationId("p4-timeline",input)});
    },result=>{const priorSelection=state.selectedClip,priorCaption=state.selectedCaption,priorTransition=state.selectedTransition;afterDraft(result);if(priorSelection&&Number.isSafeInteger(result.edit_ref?.timeline_version)){state.selectedClip={...priorSelection,timeline_version:result.edit_ref.timeline_version};actions.saveUi();}if(priorCaption&&Number.isSafeInteger(result.edit_ref?.timeline_version)){state.selectedCaption={...priorCaption,timeline_version:result.edit_ref.timeline_version};actions.saveUi();}if(priorTransition&&Number.isSafeInteger(result.edit_ref?.timeline_version)){state.selectedTransition={...priorTransition,timeline_version:result.edit_ref.timeline_version};actions.saveUi();}afterCommit?.(result);state.notice=`时间线修改已保存为 v${result.edit_ref?.timeline_version??state.timeline.version+1}；播放器继续显示当前观看版本，精修操作仍作用于最新编辑版本。可制作并观看最新版本检查结果。`;}),
    reorderTimelineClip: (clipId,anchorClipId,side) => actions.timelineEdit(()=>reorderVideoClip(state.timeline,clipId,anchorClipId,side),`将片段移到目标片段的${side==="before"?"前面":"后面"}，保持各段原时长。`),
    splitTimelineClip: () => actions.timelineEdit(()=>{const selection=state.selectedClip,tick=state.playheadTicks;if(!clipMatchesTimeline(selection,state.timeline))throw new Error("请选择当前编辑版本中的片段");return splitTimelineClipAtPlayhead(state.timeline,selection.clip_id,tick,`p4-split:${crypto.randomUUID()}`);},`在播放头明确分割所选片段，保持两侧源范围连续。`),
    splitTimelineClipAt: (clipId,tick) => actions.timelineEdit(()=>splitTimelineClipAtPlayhead(state.timeline,clipId,tick,`p4-split:${crypto.randomUUID()}`),`在第 ${tick} 帧明确分割片段 ${clipId}，保持两侧源范围连续。`),
    splitTimelineCaption: () => {const selection=state.selectedCaption;if(selection?.timeline_version!==state.timeline?.version)throw new Error("请选择当前编辑版本中的字幕/文字对象");const newCaptionId=`p4-caption-split:${crypto.randomUUID()}`;return actions.timelineEdit(()=>splitTimelineCaptionAtPlayhead(state.timeline,selection.caption_id,state.playheadTicks,newCaptionId),`在播放头分割字幕/文字 ${selection.caption_id}，保留两段的文本与样式。`,result=>{state.selectedCaption={track_id:selection.track_id,caption_id:newCaptionId,timeline_version:result.edit_ref.timeline_version};state.selectedClip=null;actions.saveUi();});},
    splitTimelineCaptionAt: (trackId,captionId,tick) => {const newCaptionId=`p4-caption-split:${crypto.randomUUID()}`;return actions.timelineEdit(()=>splitTimelineCaptionAtPlayhead(state.timeline,captionId,tick,newCaptionId),`在第 ${tick} 帧分割字幕/文字 ${captionId}，保留两段的文本与样式。`,result=>{state.selectedTimelineTrackId=trackId;state.selectedCaption={track_id:trackId,caption_id:newCaptionId,timeline_version:result.edit_ref.timeline_version};state.selectedClip=null;actions.saveUi();});},
    trimTimelineClip: edge => actions.timelineEdit(()=>{const selection=state.selectedClip,tick=state.playheadTicks;if(!clipMatchesTimeline(selection,state.timeline))throw new Error("请选择当前编辑版本中的片段");return trimTimelineClipToPlayhead(state.timeline,selection.clip_id,edge,tick);},`将所选片段的${edge==="start"?"开始":"结束"}边缘修剪到播放头。`),
    trimTimelineClipAt: (clipId,edge,tick) => actions.timelineEdit(()=>trimTimelineClipToPlayhead(state.timeline,clipId,edge,tick),`将片段 ${clipId} 的${edge==="start"?"开始":"结束"}边缘修剪到第 ${tick} 帧。`),
    trimTimelineCaptionAt: (captionId,edge,tick) => actions.timelineEdit(()=>trimTimelineCaptionToPlayhead(state.timeline,captionId,edge,tick),`将字幕/文字 ${captionId} 的${edge==="start"?"开始":"结束"}边缘修剪到第 ${tick} 帧。`),
    removeTimelineClip: (trackId,clipId) => {let removedTrack=false;return actions.timelineEdit(()=>{const result=removeEmptyOptionalTrackAfterEdit(state.timeline,removeTimelineClip(state.timeline,trackId,clipId),trackId);removedTrack=result.removed;return result.commands;},`从轨道 ${trackId} 删除片段 ${clipId}，保留作品中的原始素材；最后一个对象移除后自动清理空的可选轨道。`,()=>{if(state.selectedClip?.clip_id===clipId)state.selectedClip=null;state.selectedCaption=null;if(removedTrack&&state.selectedTimelineTrackId===trackId)state.selectedTimelineTrackId=state.timeline?.tracks.find(track=>track.track_id==="video-main")?.track_id??"";});},
    duplicateTimelineClipToPip: (sourceTrackId,clipId,at) => {
      const newClipId=`p4-pip-copy:${crypto.randomUUID()}`;let targetTrackId="";
      return actions.timelineEdit(()=>{const sourceTrack=state.timeline.tracks.find(track=>track.track_id===sourceTrackId),sourceClip=sourceTrack?.clips.find(clip=>clip.clip_id===clipId);if(!sourceTrack||!sourceClip||sourceTrack.kind!=="video")throw new Error("所选片段已不在当前视频轨");let target=state.timeline.tracks.find(track=>isPictureInPictureTrack(track)&&track.enabled!==false&&!track.locked&&!track.clips.some(clip=>at<clip.timeline_start+clip.timeline_duration&&clip.timeline_start<at+sourceClip.timeline_duration));const commands=[];let timeline=state.timeline;if(!target){const added=addWorkbenchTrack(state.timeline,"pip");commands.push(added);timeline=timelineWithAddedWorkbenchTrack(state.timeline,added);target=timeline.tracks.find(track=>track.track_id===added.track.track_id);}targetTrackId=target.track_id;commands.push(...duplicateVideoClipToPip(timeline,clipId,targetTrackId,at,newClipId));return commands;},`复制片段 ${clipId} 的获准画面到画中画轨，并保留原片段。`,result=>{state.selectedTimelineTrackId=targetTrackId;state.selectedClip={track_id:targetTrackId,clip_id:newClipId,timeline_version:result.edit_ref.timeline_version};state.selectedCaption=null;});
    },
    applyTimelineEffect: kind => actions.timelineEdit(()=>{const selection=state.selectedClip;if(!clipMatchesTimeline(selection,state.timeline))throw new Error("请选择当前编辑版本中的片段");return replaceVideoEffect(state.timeline,selection.clip_id,kind,`p4-effect:${selection.clip_id}`);},`将所选片段的可执行效果设为 ${kind}；同一片段保持一个活动效果。`),
    addTimelineTransition: secondsText => {const selection=state.selectedClip;if(!clipMatchesTimeline(selection,state.timeline))throw new Error("请选择当前编辑版本中的片段");return actions.addTimelineTransitionAt(selection.clip_id,secondsText);},
    addTimelineTransitionAt: (clipId,secondsText) => {const track=state.timeline.tracks.find(item=>item.track_id===mainVideoTrackId(state.timeline)),existing=track?.transitions?.find(item=>item.from_clip_id===clipId),transitionId=existing?.transition_id??`p4-transition:${crypto.randomUUID()}`;return actions.timelineEdit(()=>{const overlap=exactTicks(secondsText,state.timeline.sequence.timebase);return existing?replaceCrossDissolve(state.timeline,transitionId,overlap):addCrossDissolve(state.timeline,clipId,overlap,transitionId);},`${existing?"替换":"设置"}主视频剪辑点 ${clipId} 的交叉叠化时长为 ${secondsText} 秒。`,result=>{state.selectedClip=null;state.selectedCaption=null;state.selectedTransition={track_id:track.track_id,transition_id:transitionId,timeline_version:result.edit_ref.timeline_version};});},
    removeTimelineTransition: transitionId => {const selected=state.selectedTransition;return actions.timelineEdit(()=>removeCrossDissolve(state.timeline,transitionId),`移除交叉叠化 ${transitionId} 并恢复剪辑点后的时间位置。`,()=>{state.selectedTransition=null;if(selected?.transition_id===transitionId)state.selectedClip=null;});},
    insertTimelineSource: (span,side) => actions.timelineEdit(()=>{const selection=state.selectedClip;if(!clipMatchesTimeline(selection,state.timeline))throw new Error("请选择当前编辑版本中的片段作为插入位置");const authorized=(state.precisionSources??[]).find(item=>item.asset_id===span?.asset_id&&item.span_id===span?.span_id&&item.media_kind==="video");if(!authorized)throw new Error("来源不属于当前请求返回的获准视频片段");const clip=sourceSpanClip(authorized,state.timeline.sequence.timebase,`p4-insert:${crypto.randomUUID()}`);return insertVideoClip(state.timeline,clip,selection.clip_id,side);},`将本请求获准的视频片段完整插入所选镜头${side==="before"?"之前":"之后"}，保留其源范围和时长。`),
    addTimelineTrack: kind => { let trackId="";return actions.timelineEdit(()=>{const command=addWorkbenchTrack(state.timeline,kind);trackId=command.track.track_id;return [command];},`新增一个真实 ${kind} 可选轨道。`,()=>{state.selectedTimelineTrackId=trackId;}); },
    removeTimelineTrack: trackId => actions.timelineEdit(()=>[removeWorkbenchTrack(state.timeline,trackId)],`删除工作台可选轨道 ${trackId} 及其所有内容；此操作可通过撤销恢复。`,()=>{if(state.selectedTimelineTrackId===trackId)state.selectedTimelineTrackId=mainVideoTrackId(state.timeline);if(state.selectedClip?.track_id===trackId)state.selectedClip=null;if(state.selectedCaption?.track_id===trackId)state.selectedCaption=null;}),
    setTimelineTrackProperties: (trackId,properties) => actions.timelineEdit(()=>{const track=state.timeline.tracks.find(item=>item.track_id===trackId);if(!track||!properties||Object.keys(properties).some(key=>!["locked","enabled","muted","solo"].includes(key))||Object.values(properties).some(value=>typeof value!=="boolean"))throw new Error("轨道属性或身份无效");if(track.track_id==="video-main"&&properties.enabled===false)throw new Error("主视频轨不能停用");return [{type:"set_track_properties",track_id:trackId,properties}];},`更新轨道 ${trackId} 的锁定、启用或静音状态。`),
    moveTimelineClip: (clipId,trackId,at) => {let sourceTrackId="",removedSourceTrack=false;return actions.timelineEdit(()=>{const source=state.timeline.tracks.find(track=>track.clips.some(clip=>clip.clip_id===clipId));if(!source)throw new Error("要移动的片段已不存在");sourceTrackId=source.track_id;const move=source.kind==="audio"?moveAudioClipToTrack(state.timeline,clipId,trackId,at):moveVideoClipToTrack(state.timeline,clipId,trackId,at),result=removeEmptyOptionalTrackAfterEdit(state.timeline,move,sourceTrackId);removedSourceTrack=result.removed;return result.commands;},`将片段 ${clipId} 放到轨道 ${trackId} 的第 ${at} 帧；保留源范围和时长，源可选轨道为空时自动移除。`,result=>{state.selectedTimelineTrackId=trackId;state.selectedClip={track_id:trackId,clip_id:clipId,timeline_version:result.edit_ref.timeline_version};state.selectedCaption=null;if(removedSourceTrack&&state.selectedTimelineTrackId===sourceTrackId)state.selectedTimelineTrackId=trackId;});},
    moveTimelineCaption: (captionId,trackId,at) => {let sourceTrackId="",removedSourceTrack=false;return actions.timelineEdit(()=>{const source=state.timeline.tracks.find(track=>(track.captions??[]).some(caption=>caption.caption_id===captionId));if(!source)throw new Error("要移动的字幕/文字对象已不存在");sourceTrackId=source.track_id;const result=removeEmptyOptionalTrackAfterEdit(state.timeline,moveTimelineCaption(state.timeline,captionId,trackId,at),sourceTrackId);removedSourceTrack=result.removed;return result.commands;},`将字幕/文字 ${captionId} 放到轨道 ${trackId} 的第 ${at} 帧；保留文本、样式和词级时间，源可选轨道为空时自动移除。`,result=>{state.selectedTimelineTrackId=trackId;state.selectedCaption={track_id:trackId,caption_id:captionId,timeline_version:result.edit_ref.timeline_version};state.selectedClip=null;if(removedSourceTrack&&state.selectedTimelineTrackId===sourceTrackId)state.selectedTimelineTrackId=trackId;});},
    moveTimelineClipToNewPip: (clipId,at) => {
      let targetTrackId="";
      return actions.timelineEdit(()=>{const sourceTrackId=mainVideoTrackId(state.timeline),source=state.timeline.tracks.find(track=>track.track_id===sourceTrackId&&track.clips.some(clip=>clip.clip_id===clipId));if(!source||state.timeline.tracks.some(isPictureInPictureTrack))throw new Error("临时画中画落点只接受当前主视频片段，且不能重复创建画中画轨");const added=addWorkbenchTrack(state.timeline,"pip"),virtual=timelineWithAddedWorkbenchTrack(state.timeline,added);targetTrackId=added.track.track_id;return [added,...moveVideoClipToTrack(virtual,clipId,targetTrackId,at)];},`将主视频片段 ${clipId} 移入新建画中画轨的第 ${at} 帧；仅在一次 Host 提交中创建轨道并移动片段。`,result=>{state.selectedTimelineTrackId=targetTrackId;state.selectedClip={track_id:targetTrackId,clip_id:clipId,timeline_version:result.edit_ref.timeline_version};state.selectedCaption=null;});
    },
    addTimelineResource: (span,trackId,at,newTrackKind=null) => actions.timelineEdit(()=>{
      const authorized=(state.precisionSources??[]).find(item=>item.asset_id===span?.asset_id&&item.span_id===span?.span_id&&item.media_kind===span?.media_kind);if(!authorized)throw new Error("来源不属于当前请求返回的获准素材片段");
      if(trackId===mainVideoTrackId(state.timeline))return insertAuthorizedMediaAt(state.timeline,authorized,at,`p4-resource:${crypto.randomUUID()}`);
      if(trackId)return addAuthorizedMediaClip(state.timeline,authorized,trackId,at,`p4-resource:${crypto.randomUUID()}`);
      if(!newTrackKind)throw new Error("请先选择素材目标轨道");if(["captions","text"].includes(newTrackKind))throw new Error("字幕和文字轨通过属性栏添加真实文字对象，不能接收媒体素材");if(newTrackKind==="pip"&&!['video','image'].includes(authorized.media_kind))throw new Error("画中画轨只接受视频或图片素材");if(["music","sfx","narration"].includes(newTrackKind)&&authorized.media_kind!=="audio")throw new Error("配乐、音效和旁白轨只接受音频素材");const added=addWorkbenchTrack(state.timeline,newTrackKind),virtual=timelineWithAddedWorkbenchTrack(state.timeline,added);return [added,...addAuthorizedMediaClip(virtual,authorized,added.track.track_id,at,`p4-resource:${crypto.randomUUID()}`)];
    },`将当前创作请求获准的${span?.media_kind??""}素材放入精确时间线，并保留素材身份与源范围。`),
    addTimelineCaption: (workbenchKind,text,at=state.playheadTicks) => {
      let trackId="",captionId=`p4-caption:${crypto.randomUUID()}`;
      return actions.timelineEdit(()=>{const role=workbenchKind==="caption"?"captions":"text";let track=state.timeline.tracks.find(item=>item.kind==="video"&&item.semantic_sidecar?.metadata?.workbench_role===role);const commands=[];let commandTimeline=state.timeline;if(!track){const added=addWorkbenchTrack(state.timeline,role);trackId=added.track.track_id;commands.push(added);commandTimeline=timelineWithAddedWorkbenchTrack(state.timeline,added);track=commandTimeline.tracks.find(item=>item.track_id===trackId);}else trackId=track.track_id;const timebase=state.timeline.sequence.timebase,duration=(6n*timebase.timescale+timebase.value)/(2n*timebase.value);commands.push(addTextCaption(commandTimeline,trackId,at,duration,captionId,text,workbenchKind));return commands;},`在第 ${at} 帧新增 ${workbenchKind==="caption"?"字幕":"文字"}对象并保存其实际预览/主输出样式。`,result=>{state.selectedTimelineTrackId=trackId;state.selectedCaption={track_id:trackId,caption_id:captionId,timeline_version:result.edit_ref.timeline_version};state.selectedClip=null;});
    },
    updateTimelineCaption: (trackId,captionId,patch) => actions.timelineEdit(()=>[updateTextCaption(state.timeline,trackId,captionId,patch)],`保存字幕/文字 ${captionId} 的文本与渲染样式。`),
    removeTimelineCaption: (trackId,captionId) => {let removedTrack=false;return actions.timelineEdit(()=>{const result=removeEmptyOptionalTrackAfterEdit(state.timeline,[removeTextCaption(state.timeline,trackId,captionId)],trackId);removedTrack=result.removed;return result.commands;},`删除字幕/文字 ${captionId}；最后一个对象移除后自动清理空的可选轨道。`,()=>{state.selectedCaption=null;if(removedTrack&&state.selectedTimelineTrackId===trackId)state.selectedTimelineTrackId=state.timeline?.tracks.find(track=>track.track_id==="video-main")?.track_id??"";});},
    updateTimelineClipTransform: (trackId,clipId,transform) => actions.timelineEdit(()=>{const track=state.timeline.tracks.find(item=>item.track_id===trackId),clip=track?.clips.find(item=>item.clip_id===clipId);if(!track||!clip||track.locked||!isPictureInPictureTrack(track))throw new Error("只有当前未锁定的画中图片段可调整位置与尺寸");if(![transform.x,transform.y,transform.scale_x,transform.scale_y].every(Number.isFinite)||transform.x<0||transform.y<0||transform.scale_x<0.1||transform.scale_y<0.1||transform.scale_x>1||transform.scale_y>1||transform.x+transform.scale_x>1||transform.y+transform.scale_y>1)throw new Error("画中画必须位于画布内，尺寸比例须在 0.1 到 1 之间");const clips=track.clips.map(item=>item.clip_id===clipId?{...item,transform:{...(item.transform??{}),position_mode:"normalized",x:transform.x,y:transform.y,scale_x:transform.scale_x,scale_y:transform.scale_y}}:item);return [{type:"restore_track",track_id:trackId,track:{...track,clips}}];},`更新画中画 ${clipId} 的归一化位置与尺寸，交由 Preview/Master 渲染。`),
    precision:values=>run("precision",()=>{const draft=selectedDraft();if(!draft||draft.timeline_version!==state.timeline?.version)throw new Error("精修需要当前版本");const input={schema_version:1,...currentInput(),expected_timeline_version:state.timeline.version,parent_draft_id:draft.draft_id,raw_text:values.raw_text,preserve_refs:explicitList(values.preserve_refs),action:precisionAction(state.timeline,values,text=>exactTicks(text,state.timeline.sequence.timebase))};return command("project.creation.precision",projectId(),{...input,operation_id:operationId("precision",input)});},afterDraft),
    manual: values => run("manual", () => {
      const draft = selectedDraft(); if (!draft || draft.timeline_version !== state.timeline?.version) throw new Error("手动修改必须基于当前作品版本；请先选择对应草稿");
      const identity = { ...currentInput(), expected_timeline_version: state.timeline.version, parent_draft_id: draft.draft_id, values }, operation_id = operationId("manual", identity);
      const target=JSON.parse(values.target||"null");if(!target)throw new Error("请选择实际片段");
      return command("project.creation.precision",projectId(),{schema_version:1,...currentInput(),expected_timeline_version:state.timeline.version,parent_draft_id:draft.draft_id,operation_id,raw_text:values.raw_text,preserve_refs:explicitList(values.preserve_refs),action:{kind:"adjust",clip_id:target[1],at_ticks:values.placement_text!==""?String(exactTicks(values.placement_text,state.timeline.sequence.timebase)):null,gain_db:values.gain_db!==""?Number(values.gain_db):null,caption_text:values.caption_text!==""?values.caption_text:null,caption_start_ticks:values.caption_text!==""?String(exactTicks(values.caption_start,state.timeline.sequence.timebase)):"0",caption_duration_ticks:values.caption_text!==""?String(exactTicks(values.caption_duration,state.timeline.sequence.timebase)):"0"}});
    }, afterDraft),
    renderDraft: (watchAfter = false) => run("render", async () => {
      const input = { request_id: requireRequest().authorization.request_id, draft_id: selectedDraft()?.draft_id }; if (!input.draft_id) throw new Error("请选择草稿");
      const key = JSON.stringify([projectId(),input.request_id,input.draft_id]);
      const result = await command("project.creation.render", projectId(), { ...input, operation_id: operationId("render", input) });
      if (!result.ok && ["CREATION_RENDER_ATTEMPT_FAILED", "CREATION_RENDER_QC_BLOCKED"].includes(result.error.code)) state.failedRenderAttempts.add(key);
      if (result.ok) state.failedRenderAttempts.delete(key);
      return result;
    }, result => { state.selectedRenderId = result.render_id; }, async () => { await refresh(); if(watchAfter)await actions.restorePreview(null); }),
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
    profileQuery: values => { try { state.profileQuery = values === null ? null : { contexts: explicitList(values.contexts), except_principle_ids: explicitList(values.exceptions) }; actions.saveUi(); if (state.workspace) state.workspace = { ...state.workspace, profile: null }; actions.refresh(); } catch (error) { reportError(error);state.notice = error.message; update(); } },
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
  shell.innerHTML = `<header class="topbar"><span class="brand">AVE</span><button type="button" class="ghost navigation-toggle" data-action="toggle-nav" aria-label="隐藏工作台导航">☰</button><button type="button" class="ghost" data-action="projects">作品管理</button><h1 class="workspace-title">当前作品</h1><span class="connection"><i></i> 本地项目</span><div class="button-row"><button type="button" class="ghost precision-chat-toggle" data-action="chat" aria-expanded="false" hidden>打开对话</button><button type="button" data-action="history">版本历史</button><button type="button" data-action="export" class="primary">导出</button></div></header>`;
  const cards = document.createElement("div"); cards.className = "status-grid";
  const inputSave = document.createElement("span"); inputSave.className = "input-save-state"; inputSave.setAttribute("aria-live", "polite"); const retrySave = document.createElement("button"); retrySave.type = "button"; retrySave.className = "ghost"; retrySave.onclick = () => { void (inputSaveState==="restore-failed"?refresh():persistUi()).catch(error => { reportError(error); state.notice=error.message; update(); }); }; shell.querySelector(".topbar .button-row").prepend(inputSave,retrySave);
  const creation = createCreationWorkspace(actions,state), grid = document.createElement("div"); grid.className = "product-shell";
  const rail = document.createElement("nav"); rail.className = "sidebar"; rail.setAttribute("aria-label","工作台导航");
  const workspaceName=document.createElement("div");workspaceName.className="workspace-name";workspaceName.textContent="工作区";rail.append(workspaceName);
  const pageButtons={};
  for(const [page,label,icon] of [["creation","创作","✦"],["assets","素材","▧"],["precision","精修轨道","▤"],["history","版本历史","◷"],["issues","问题与恢复","ⓘ"],["projects","作品管理","▣"],["recycle","回收站","▱"],["help","帮助与快捷操作","?"],["export","导出","⇧"]]){const button=document.createElement("button");button.type="button";button.className="ghost navigation-page";button.dataset.workspacePage=page;button.setAttribute("aria-label",label);button.title=label;const mark=document.createElement("span");mark.className="navigation-icon";mark.setAttribute("aria-hidden","true");mark.textContent=icon;const text=document.createElement("span");text.className="navigation-label";text.textContent=label;button.append(mark,text);button.addEventListener("click",()=>page==="export"?actions.openExportPage():actions.setWorkspacePage(page));pageButtons[page]=button;rail.append(button);}
  const spacer=document.createElement("div");spacer.className="rail-spacer";rail.append(spacer);
  const productionButton=document.createElement("button");productionButton.className="ghost";productionButton.textContent="制作";productionButton.dataset.creationView="material";productionButton.addEventListener("click",()=>actions.showView("material"));rail.append(productionButton);
  const profileButton=document.createElement("button");profileButton.className="ghost";profileButton.textContent="档案";profileButton.dataset.creationView="profile";profileButton.addEventListener("click",()=>actions.showView("profile"));rail.append(profileButton);
  const diagnosticButton=document.createElement("button");diagnosticButton.className="ghost";diagnosticButton.textContent="记录";rail.append(diagnosticButton);
  const library = document.createElement("aside"); library.className = "asset-panel"; library.setAttribute("aria-label", "项目与素材");
  const player = playerPanel(actions,state), notice = document.createElement("p"); notice.className = "notice"; notice.setAttribute("role", "status");
  const timeline = document.createElement("div"); timeline.className = "timeline-wrap";const timelineView=timelinePanel(actions,state,creation.inspector);timeline.append(timelineView.node);
  const desk=document.createElement("main");desk.className="workspace-editor";desk.setAttribute("aria-label","作品编辑工作台");desk.append(player.node,timeline,creation.refinement);
  const screenHeading=document.createElement("header");screenHeading.className="screen-heading";screenHeading.innerHTML='<div><p class="eyebrow"></p><h1></h1></div><span class="state-badge"></span>';
  const historyPage=document.createElement("section");historyPage.className="workspace-history-page";historyPage.dataset.workspaceFocusRoot="history";historyPage.setAttribute("aria-label","版本历史");historyPage.append(creation.historyNode);
  const globalChat=document.createElement("aside");globalChat.className="global-chat";globalChat.setAttribute("aria-label","全局创作对话");
  const chatBubble=document.createElement("button");chatBubble.type="button";chatBubble.className="chat-bubble-toggle";chatBubble.setAttribute("aria-controls","creation-chat-popover");chatBubble.title="点击打开对话，拖动移动气泡；方向键微调";chatBubble.innerHTML='<span class="bubble-icon">✦</span><span>创作对话</span><span class="bubble-dot"></span>';
  const chatPopover=document.createElement("div");chatPopover.className="fine-chat-popover";chatPopover.id="creation-chat-popover";chatPopover.setAttribute("aria-label","围绕当前作品继续创作");
  const chatClose=document.createElement("button");chatClose.type="button";chatClose.className="chat-close ghost";chatClose.textContent="×";chatClose.setAttribute("aria-label","收起创作对话");creation.node.querySelector(".panel-heading").append(chatClose);
  chatPopover.append(creation.node,creation.dock);globalChat.append(chatBubble,chatPopover);
  const makeLayoutSeparator=(name,orientation,label)=>{const separator=document.createElement("div");separator.className="p4-layout-resizer p4-layout-resizer-"+name;separator.setAttribute("role","separator");separator.setAttribute("aria-orientation",orientation);separator.setAttribute("aria-label",label);separator.tabIndex=0;separator.setAttribute("aria-valuemin","220");separator.setAttribute("aria-valuemax","520");return separator;};
  const resourceSeparator=makeLayoutSeparator("resources","vertical","调整素材栏宽度"),inspectorSeparator=makeLayoutSeparator("inspector","vertical","调整属性栏宽度"),timelineSeparator=makeLayoutSeparator("timeline","horizontal","调整时间线高度");
  const resourceToggle=document.createElement("button");resourceToggle.type="button";resourceToggle.className="p4-layout-toggle p4-layout-toggle-resources";resourceToggle.addEventListener("click",()=>actions.togglePrecisionPanel("resources"));
  const inspectorToggle=document.createElement("button");inspectorToggle.type="button";inspectorToggle.className="p4-layout-toggle p4-layout-toggle-inspector";inspectorToggle.addEventListener("click",()=>actions.togglePrecisionPanel("inspector"));
  const diagnostics = document.createElement("section"); diagnostics.className = "workspace-diagnostics"; diagnostics.hidden=true;
  const diagnosticLabel = document.createElement("h2"); diagnosticLabel.textContent = "制作记录与诊断";
  const diagnosticPanels = document.createElement("div"); diagnosticPanels.className = "panel-grid"; const diagnosticError=document.createElement("p");diagnosticError.className="stage2-risk";diagnosticError.setAttribute("aria-label","当前操作诊断");
  diagnostics.append(diagnosticLabel,diagnosticError,cards,diagnosticPanels);
  diagnosticButton.addEventListener("click",()=>{diagnostics.hidden=!diagnostics.hidden;diagnosticButton.setAttribute("aria-expanded",String(!diagnostics.hidden));});
  const comparisonView=comparisonPanel();const closeComparison=()=>{comparisonSequence++;comparisonView.close(true);};
  shell.append(comparisonView.node);
  const projectsPage=document.createElement("section");projectsPage.className="project-management-page";projectsPage.dataset.workspaceFocusRoot="projects";projectsPage.setAttribute("aria-labelledby","project-management-title");
  const recyclePage=document.createElement("section");recyclePage.className="workspace-recycle-page";recyclePage.dataset.workspaceFocusRoot="recycle";recyclePage.setAttribute("aria-label","回收站");recyclePage.tabIndex=-1;
  const helpPage=createHelpPage();
  helpPage.dataset.workspaceFocusRoot="help";helpPage.tabIndex=-1;
  issuePage=createErrorRecoveryPage();
  const toast=document.createElement("div");toast.className="error-toast";toast.setAttribute("role","alert");toast.setAttribute("aria-live","assertive");toast.hidden=true;
  const onOperationError=event=>{const detail=event.detail??{};if(detail.project_id&&detail.project_id!==projectId())return;const revision=++toastRevision;clearTimeout(toastTimer);clearTimeout(toastHideTimer);toast.textContent=String(detail.message??"操作未成功，请查看问题与恢复记录。");toast.hidden=false;toast.classList.add("is-visible");toastTimer=setTimeout(()=>{if(revision!==toastRevision)return;toast.classList.remove("is-visible");toastHideTimer=setTimeout(()=>{if(revision===toastRevision)toast.hidden=true;},180);},1800);};
  window.addEventListener("ave:operation-error",onOperationError);
  grid.append(rail,screenHeading,library,desk,historyPage,issuePage.node,recyclePage,helpPage,creation.exportNode,resourceSeparator,inspectorSeparator,timelineSeparator,resourceToggle,inspectorToggle,projectsPage); shell.append(grid,globalChat,creation.annotationDialog,notice,diagnostics,toast); root.replaceChildren(shell);
  const precisionActive=()=>grid.dataset.page==="precision"&&state.status.project!=="not-open";
  const resourcesActive=()=>["creation","precision"].includes(grid.dataset.page)&&state.status.project!=="not-open";
  const setPanelLayout=(next)=>{try{actions.setPrecisionLayout(next);}catch(error){reportError(error);update();}};
  const updatePrecisionControls=()=>{
    const active=precisionActive(),layout=readPrecisionLayout(state.forms,projectId()),gridRect=grid.getBoundingClientRect(),resourceRect=library.getBoundingClientRect(),inspectorRect=creation.refinement.getBoundingClientRect(),railRect=rail.getBoundingClientRect();
    for(const control of [resourceToggle,inspectorToggle,timelineSeparator])control.hidden=!active;
    resourceSeparator.hidden=!resourcesActive()||(active&&!layout.resourcesOpen)||window.innerWidth<=820;
    inspectorSeparator.hidden=!active||!layout.inspectorOpen||window.innerWidth<=640;
    resourceToggle.textContent=layout.resourcesOpen?"<":">";resourceToggle.setAttribute("aria-label",layout.resourcesOpen?"收起素材栏":"展开素材栏");resourceToggle.title=layout.resourcesOpen?"收起素材栏":"展开素材栏";
    inspectorToggle.textContent=layout.inspectorOpen?"<":">";inspectorToggle.setAttribute("aria-label",layout.inspectorOpen?"收起属性栏":"展开属性栏");inspectorToggle.title=layout.inspectorOpen?"收起属性栏":"展开属性栏";
    resourceToggle.style.left=(layout.resourcesOpen?resourceRect.right-gridRect.left-13:railRect.right-gridRect.left+4)+"px";resourceToggle.style.top=(layout.resourcesOpen?resourceRect.top-gridRect.top+12:82)+"px";
    inspectorToggle.style.left=(layout.inspectorOpen?inspectorRect.left-gridRect.left-13:gridRect.width-29)+"px";inspectorToggle.style.top=(layout.inspectorOpen?inspectorRect.top-gridRect.top+12:82)+"px";
    resourceSeparator.style.left=(resourceRect.right-gridRect.left)+"px";inspectorSeparator.style.left=(inspectorRect.left-gridRect.left)+"px";
    resourceSeparator.setAttribute("aria-valuenow",String(Math.round(resourceRect.width)));inspectorSeparator.setAttribute("aria-valuenow",String(Math.round(inspectorRect.width)));timelineSeparator.setAttribute("aria-valuenow",String(layout.timelineHeight));
  };
  const clampLayout=(value,min,max)=>Math.max(min,Math.min(max,value));
  const panelWidthLimit=(kind)=>{
    const gridWidth=grid.clientWidth,navWidth=rail.hidden?0:rail.getBoundingClientRect().width,resourceWidth=library.getBoundingClientRect().width,inspectorWidth=creation.refinement.getBoundingClientRect().width,fraction=window.innerWidth<=1080?.30:.35,centerMinimum=window.innerWidth<=1080?250:300;
    const other=kind==="resources"?inspectorWidth:resourceWidth,designLimit=kind==="resources"?gridWidth*fraction:420;
    return Math.max(kind==="resources"?240:220,Math.floor(Math.min(420,designLimit,gridWidth-navWidth-other-centerMinimum)));
  };
  const persistPanelWidth=(kind,width)=>{
    if(kind==="resources"){const asset=readAssetLayout(state.forms,projectId());actions.setAssetLayout({...asset,panelWidth:width});}
    else{const layout=readPrecisionLayout(state.forms,projectId());setPanelLayout({...layout,inspectorWidth:width});}
  };
  const bindPanelSeparator=(separator,kind)=>{
    let drag=null;
    const minimum=kind==="resources"?240:220,widthAt=event=>clampLayout(Math.round(drag.startWidth+(kind==="resources"?1:-1)*(event.clientX-drag.startX)),minimum,panelWidthLimit(kind));
    separator.addEventListener("pointerdown",event=>{
      if(event.button!==0||separator.hidden||!(kind==="resources"?resourcesActive():precisionActive()))return;
      const visibleWidth=Math.round(kind==="resources"?library.getBoundingClientRect().width:creation.refinement.getBoundingClientRect().width);
      drag={pointerId:event.pointerId,startX:event.clientX,startWidth:visibleWidth,current:visibleWidth};separator.setPointerCapture(event.pointerId);separator.dataset.dragging="true";event.preventDefault();
    });
    separator.addEventListener("pointermove",event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;drag.current=widthAt(event);grid.style.setProperty(kind==="resources"?"--asset-panel-width":"--p4-inspector-width",drag.current+"px");separator.setAttribute("aria-valuenow",String(drag.current));updatePrecisionControls();
    });
    const finish=event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;const completed=drag;drag=null;delete separator.dataset.dragging;
      if(separator.hasPointerCapture(event.pointerId))separator.releasePointerCapture(event.pointerId);
      if(event.type==="pointerup"&&completed.current!==completed.startWidth){try{persistPanelWidth(kind,completed.current);}catch(error){reportError(error);update();}}
      else update();
    };
    separator.addEventListener("pointerup",finish);separator.addEventListener("pointercancel",finish);
    separator.addEventListener("keydown",event=>{
      if(!["ArrowLeft","ArrowRight"].includes(event.key)||!(kind==="resources"?resourcesActive():precisionActive()))return;event.preventDefault();
      const current=Math.round(kind==="resources"?library.getBoundingClientRect().width:creation.refinement.getBoundingClientRect().width),delta=(event.shiftKey?16:8)*(kind==="resources"?(event.key==="ArrowRight"?1:-1):(event.key==="ArrowLeft"?1:-1)),next=clampLayout(current+delta,kind==="resources"?240:220,panelWidthLimit(kind));
      if(next!==current)try{persistPanelWidth(kind,next);}catch(error){reportError(error);}
    });
  };
  const bindTimelineSeparator=()=>{
    let drag=null;
    timelineSeparator.addEventListener("pointerdown",event=>{
      if(event.button!==0||timelineSeparator.hidden||!precisionActive())return;const layout=readPrecisionLayout(state.forms,projectId());drag={pointerId:event.pointerId,startY:event.clientY,startHeight:layout.timelineHeight,current:layout.timelineHeight};timelineSeparator.setPointerCapture(event.pointerId);timelineSeparator.dataset.dragging="true";event.preventDefault();
    });
    timelineSeparator.addEventListener("pointermove",event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;const dockHeight=80,upperMin=window.innerHeight<=700?200:300,max=Math.max(220,Math.min(520,grid.clientHeight-dockHeight-upperMin));drag.current=clampLayout(Math.round(drag.startHeight-(event.clientY-drag.startY)),220,max);grid.style.setProperty("--p4-timeline-height",drag.current+"px");timelineSeparator.setAttribute("aria-valuenow",String(drag.current));
    });
    const finish=event=>{
      if(!drag||event.pointerId!==drag.pointerId)return;const completed=drag;drag=null;delete timelineSeparator.dataset.dragging;if(timelineSeparator.hasPointerCapture(event.pointerId))timelineSeparator.releasePointerCapture(event.pointerId);
      if(event.type==="pointerup"&&completed.current!==completed.startHeight){const layout=readPrecisionLayout(state.forms,projectId());setPanelLayout({...layout,timelineHeight:completed.current});}else update();
    };
    timelineSeparator.addEventListener("pointerup",finish);timelineSeparator.addEventListener("pointercancel",finish);
    timelineSeparator.addEventListener("keydown",event=>{
      if(!["ArrowUp","ArrowDown"].includes(event.key)||!precisionActive())return;event.preventDefault();const layout=readPrecisionLayout(state.forms,projectId()),dockHeight=80,upperMin=window.innerHeight<=700?200:300,max=Math.max(220,Math.min(520,grid.clientHeight-dockHeight-upperMin)),delta=(event.shiftKey?32:16)*(event.key==="ArrowUp"?1:-1),next=clampLayout(layout.timelineHeight+delta,220,max);if(next!==layout.timelineHeight)setPanelLayout({...layout,timelineHeight:next});
    });
  };
  bindPanelSeparator(resourceSeparator,"resources");bindPanelSeparator(inspectorSeparator,"inspector");bindTimelineSeparator();
  resourceSeparator.setAttribute("aria-valuemin","240");resourceSeparator.setAttribute("aria-valuemax","420");inspectorSeparator.setAttribute("aria-valuemin","220");inspectorSeparator.setAttribute("aria-valuemax","420");
  const pageFocusKeys=new Map();
  shell.addEventListener("focusin",event=>{const target=event.target;if(!(target instanceof HTMLElement)||rail.contains(target))return;const key=target.dataset.workspaceFocusKey??target.dataset.projectFocusKey??target.dataset.recycleFocusKey;if(key)pageFocusKeys.set(state.workspacePage,key);rememberWorkspaceFocus(pageFocusTargets,state.workspacePage,target);});
  shell.querySelector('[data-action="toggle-nav"]').addEventListener("click",()=>actions.toggleNavigation());
  const chatToggle=shell.querySelector('[data-action="chat"]');chatToggle.remove();
  let composerDrag=null,suppressChatClick=false;
  const setChatOpen=open=>{state.conversationOpen=open;actions.saveUi();update();if(!open)chatBubble.focus({preventScroll:true});else creation.dock.querySelector("textarea")?.focus({preventScroll:true});};
  chatBubble.addEventListener("click",()=>{if(suppressChatClick){suppressChatClick=false;return;}setChatOpen(!state.conversationOpen);});
  chatClose.addEventListener("click",()=>setChatOpen(false));
  chatPopover.addEventListener("keydown",event=>{if(event.key==="Escape"&&!event.isComposing){event.preventDefault();setChatOpen(false);}});
  const applyComposerPosition=position=>{
    const rect=chatBubble.getBoundingClientRect(),padding=12,width=window.innerWidth,height=window.innerHeight;
    const left=padding+position.x*Math.max(0,width-rect.width-padding*2),top=padding+position.y*Math.max(0,height-rect.height-padding*2);
    globalChat.style.left=left+"px";globalChat.style.top=top+"px";
    const popoverWidth=Math.min(410,width-24),availableAbove=top-padding-10,availableBelow=height-top-rect.height-padding-10;
    const below=availableAbove<Math.min(360,height*.6)&&availableBelow>availableAbove;
    globalChat.dataset.chatPlacement=below?"below":"above";
    const popupLeft=Math.max(padding,Math.min(width-padding-popoverWidth,left+rect.width-popoverWidth));
    chatPopover.style.left=(popupLeft-left)+"px";chatPopover.style.right="auto";
    chatPopover.style.maxHeight=Math.max(100,below?availableBelow:availableAbove)+"px";
  };
  const positionForBubble=(left,top)=>{const rect=chatBubble.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(left-12)/Math.max(1,window.innerWidth-rect.width-24))),y:Math.max(0,Math.min(1,(top-12)/Math.max(1,window.innerHeight-rect.height-24)))};};
  chatBubble.addEventListener("pointerdown",event=>{if(event.button!==0)return;const rect=chatBubble.getBoundingClientRect();composerDrag={pointerId:event.pointerId,project:projectId(),startX:event.clientX,startY:event.clientY,left:rect.left,top:rect.top,start:readWorkbenchComposerPosition(state.forms,projectId()),current:null};chatBubble.setPointerCapture(event.pointerId);});
  chatBubble.addEventListener("pointermove",event=>{if(!composerDrag||event.pointerId!==composerDrag.pointerId)return;const dx=event.clientX-composerDrag.startX,dy=event.clientY-composerDrag.startY;if(Math.abs(dx)+Math.abs(dy)<5&&!composerDrag.current)return;suppressChatClick=true;composerDrag.current=positionForBubble(composerDrag.left+dx,composerDrag.top+dy);applyComposerPosition(composerDrag.current);});
  const finishBubbleDrag=event=>{if(!composerDrag||event.pointerId!==composerDrag.pointerId)return;const drag=composerDrag;composerDrag=null;if(event.type==="pointercancel")suppressChatClick=false;if(chatBubble.hasPointerCapture(event.pointerId))chatBubble.releasePointerCapture(event.pointerId);if(event.type==="pointerup"&&drag.current&&drag.project===projectId()&&drag.project){writeWorkbenchComposerPosition(state.forms,drag.project,drag.current);actions.saveUi();}else applyComposerPosition(drag.start);};
  chatBubble.addEventListener("pointerup",finishBubbleDrag);chatBubble.addEventListener("pointercancel",finishBubbleDrag);
  chatBubble.addEventListener("keydown",event=>{if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)||!projectId())return;event.preventDefault();const rect=chatBubble.getBoundingClientRect(),delta=event.shiftKey?24:8,next=positionForBubble(rect.left+(event.key==="ArrowLeft"?-delta:event.key==="ArrowRight"?delta:0),rect.top+(event.key==="ArrowUp"?-delta:event.key==="ArrowDown"?delta:0));writeWorkbenchComposerPosition(state.forms,projectId(),next);applyComposerPosition(next);actions.saveUi();});
  shell.querySelector('[data-action="projects"]').addEventListener("click",()=>actions.setWorkspacePage("projects"));
  shell.querySelector('[data-action="history"]').addEventListener("click",()=>actions.setWorkspacePage("history"));
  shell.querySelector('[data-action="export"]').addEventListener("click",()=>actions.openExportPage());
  shell.addEventListener("keydown",event=>{
    if(event.isComposing)return;
    if(event.defaultPrevented)return;
    if(event.key==="Escape"&&event.target instanceof Element&&event.target.closest("dialog"))return;
    if(event.key==="Escape"){if(!comparisonView.node.hidden){event.preventDefault();comparisonSequence++;comparisonView.close();return;}diagnostics.hidden=true;closeComparison();update();pageButtons[state.workspacePage]?.focus();return;}
    if(event.defaultPrevented||!precisionActive())return;
    const target=event.target instanceof Element?event.target:null;
    if(target?.closest("input,textarea,select,[contenteditable='true'],[role='textbox']"))return;
    const timelineFocus=Boolean(target?.closest(".p4-timeline-editor")),playerFocus=Boolean(target?.closest(".player-panel"));
    if(event.key===" "&&(timelineFocus||playerFocus)&&!target?.closest("button,video,input,textarea,select")){if(player.togglePlayback?.())event.preventDefault();return;}
    if(timelineFocus&&!event.repeat&&event.key.toLowerCase()==="a"&&!event.ctrlKey&&!event.altKey&&!event.metaKey){event.preventDefault();timelineView.activateSelectTool();return;}
    if(!timelineFocus||event.repeat||!event.ctrlKey||event.altKey||event.metaKey)return;
    if(event.key.toLowerCase()==="b"){
      const captionSelection=state.selectedCaption,captionTrack=captionSelection?.timeline_version===state.timeline?.version&&state.timeline?.tracks.find(track=>track.track_id===captionSelection.track_id),caption=captionTrack?.captions?.find(item=>item.caption_id===captionSelection.caption_id);if(caption&&state.playheadTicks>caption.timeline_start&&state.playheadTicks<caption.timeline_start+caption.timeline_duration){event.preventDefault();actions.splitTimelineCaption?.();}else if(clipMatchesTimeline(state.selectedClip,state.timeline)){event.preventDefault();actions.splitTimelineClip?.();}
      return;
    }
    if(event.key.toLowerCase()==="z"){
      const availability=actions.editAvailability?.();if(event.shiftKey?availability?.redo:availability?.undo){event.preventDefault();(event.shiftKey?actions.redoEdit:actions.undoEdit)?.();}
      return;
    }
  });
  shell.addEventListener("keydown",event=>{
    if(event.isComposing||event.defaultPrevented||event.repeat||event.key!=="Delete"||!precisionActive())return;
    const target=event.target instanceof Element?event.target:null;if(!target?.closest(".p4-timeline-editor")||target.closest("input,textarea,select,[contenteditable='true'],[role='textbox']"))return;
    const transition=state.selectedTransition;if(transition?.timeline_version===state.timeline?.version){const track=state.timeline.tracks.find(item=>item.track_id===transition.track_id),item=track?.transitions?.find(value=>value.transition_id===transition.transition_id);if(track&&item){event.preventDefault();actions.removeTimelineTransition?.(item.transition_id);return;}}
    const caption=state.selectedCaption;if(caption?.timeline_version===state.timeline?.version){const track=state.timeline.tracks.find(item=>item.track_id===caption.track_id),item=track?.captions.find(value=>value.caption_id===caption.caption_id);if(track&&item){event.preventDefault();actions.removeTimelineCaption?.(track.track_id,item.caption_id);return;}}
    if(clipMatchesTimeline(state.selectedClip,state.timeline)){event.preventDefault();actions.removeTimelineClip?.(state.selectedClip.track_id,state.selectedClip.clip_id);}
  });
  function updateInputSave() {
    inputSave.hidden=!projectId();inputSave.dataset.state=inputSaveState;inputSave.textContent=({loading:"正在恢复输入…","restore-failed":"输入未能恢复",pending:"输入等待保存",saving:"正在保存输入…",saved:"输入已保存",failed:"保存失败 · 最新输入未确认"})[inputSaveState];retrySave.hidden=!["failed","restore-failed"].includes(inputSaveState);retrySave.textContent=inputSaveState==="restore-failed"?"重试恢复输入":"重试保存";
  }
  function update() {
    if (disposed) return;updateInputSave();state.busy = lifecycleRefresh!==null||state.pending.has("lifecycle");
    const initializing=!statusKnown||state.busy||Boolean(projectId()&&!uiLoaded);
    grid.inert=initializing;grid.setAttribute("aria-busy",String(initializing));
    for(const button of [...Object.values(pageButtons),productionButton,profileButton,diagnosticButton])button.disabled=initializing;
    shell.querySelector('[data-action="history"]').disabled=initializing;
    const page=state.workspacePage,assetLayout=readAssetLayout(state.forms,projectId()),precisionLayout=readPrecisionLayout(state.forms,projectId());grid.dataset.page=page;grid.style.setProperty("--asset-panel-width",assetLayout.panelWidth+"px");grid.style.setProperty("--p4-inspector-width",precisionLayout.inspectorWidth+"px");grid.style.setProperty("--p4-timeline-height",precisionLayout.timelineHeight+"px");grid.style.setProperty("--p4-dock-height",window.innerHeight<=700?"110px":"124px");grid.classList.toggle("precision-resources-collapsed",!precisionLayout.resourcesOpen);grid.classList.toggle("precision-inspector-collapsed",!precisionLayout.inspectorOpen);grid.classList.toggle("navigation-hidden",!state.navigationVisible);rail.hidden=!state.navigationVisible;
    const navigationToggle=shell.querySelector('[data-action="toggle-nav"]');navigationToggle.textContent=state.navigationVisible?"隐藏导航":"显示导航";navigationToggle.setAttribute("aria-label",state.navigationVisible?"隐藏工作台导航":"显示工作台导航");
    for(const [id,button] of Object.entries(pageButtons)){button.setAttribute("aria-pressed",String(id===page));button.disabled=initializing;}
    pageButtons.export.disabled=initializing||!selectedRender();
    const projectPageVisible=page==="projects",helpPageVisible=page==="help";
    library.hidden=!["creation","assets","precision"].includes(page);
    desk.hidden=!["creation","precision"].includes(page)&&!(page==="assets"&&state.sourceBrowsing);
    desk.classList.toggle("source-preview-overlay",page==="assets"&&state.sourceBrowsing);
    creation.node.hidden=false;creation.dock.hidden=false;
    globalChat.hidden=!projectId();globalChat.inert=initializing;
    chatPopover.hidden=!state.conversationOpen;chatPopover.inert=!state.conversationOpen;
    chatBubble.setAttribute("aria-expanded",String(state.conversationOpen));
    issuePage.node.hidden=page!=="issues";recyclePage.hidden=page!=="recycle";helpPage.hidden=!helpPageVisible;projectsPage.hidden=!projectPageVisible;historyPage.hidden=page!=="history";
    creation.exportNode.hidden=page!=="export";creation.exportNode.classList.toggle("export-page",page==="export");creation.setExportPageMode(page==="export");
    for(const surface of [library,desk,issuePage.node,recyclePage,helpPage,projectsPage,historyPage,creation.exportNode])surface.inert=initializing||surface.hidden;
    const pageLabel=({creation:"创作",assets:"素材",precision:"精修轨道",history:"版本历史",issues:"问题与恢复",projects:"作品管理",recycle:"回收站",help:"帮助与快捷操作",export:"导出"})[page];
    screenHeading.hidden=["projects","help","export"].includes(page);screenHeading.querySelector(".eyebrow").textContent="工作区 / "+pageLabel;screenHeading.querySelector("h1").textContent=page==="creation"?(selectedRequest()?.authorization.original_text.slice(0,38)||"开始创作你的作品"):pageLabel;screenHeading.querySelector(".state-badge").textContent=state.workspace?"作品 v"+state.workspace.timeline_version:"本地工作区";
    creation.update();grid.classList.toggle("is-projects",projectPageVisible);
    for(const [id,button] of Object.entries(pageButtons)){if(id===page)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");}
    if(page==="export"&&!exportPageOpened&&!initializing){exportPageOpened=true;queueMicrotask(()=>{if(!disposed&&state.workspacePage==="export"&&!creation.showExport())actions.closeExport();});}else if(page!=="export")exportPageOpened=false;
    shell.querySelector('[data-action="export"]').disabled=initializing||!selectedRender();
    shell.querySelector(".workspace-title").textContent=({creation:"创作",assets:"素材",precision:"精修",history:"版本历史",issues:"问题与恢复",projects:"作品管理",recycle:"回收站",help:"帮助与快捷操作",export:"导出"})[page]+(state.workspace&&["creation","precision"].includes(page)?` · v${state.workspace.timeline_version}`:"");
    pageButtons.recycle.querySelector(".navigation-label").textContent=`回收站${recycleProjects.length?` · ${recycleProjects.length}`:""}`;
    if(projectPageVisible)renderProjectManagementPage();
    if(page==="recycle")renderRecycleBin(recyclePage,pageFocusKeys.get("recycle"));
    const producing=[...state.pending.keys()].some(key=>key.startsWith("produce:")||key==="import"||key.startsWith("import-retry:"))||(state.workspace?.requests??[]).some(request=>request.production)||(state.importBatches??[]).some(batch=>batch.status==="active");
    if(producing&&!state.refreshing&&!lifecycleRefresh&&!productionPoll)productionPoll=setTimeout(async()=>{productionPoll=null;if(disposed||state.refreshing||lifecycleRefresh)return;try{await refresh();}catch(error){state.notice=`制作状态读取失败：${error.message}`;update();}},1200);
    else if(!producing&&productionPoll){clearTimeout(productionPoll);productionPoll=null;}
    cards.replaceChildren(...[["项目",state.status.project],["时间线",state.status.timeline],["渲染",state.status.render],["QC",state.status.qc]].map(([label,value])=>statusCard(label,value)));
    if(!globalChat.hidden)applyComposerPosition(readWorkbenchComposerPosition(state.forms,projectId()));
    const materialView=mediaPanel(actions,state);if(library.firstChild!==materialView)library.replaceChildren(materialView);timelineView.update();
    diagnosticPanels.replaceChildren(jobsPanel(state),diffPanel(state)); player.update();diagnosticError.textContent=state.notice;diagnosticError.hidden=!state.notice; notice.textContent = initializing&&state.refreshing ? "正在恢复作品与未发送输入…" : creationNoticeText(state.notice) || "素材与作品保存在本地；模型使用范围由你的创作授权决定。";updatePrecisionControls();
  }
  function renderProjectManagementPage(){
    const active=projectsPage.contains(document.activeElement)?document.activeElement:null;
    const focusKey=(active instanceof HTMLElement?(active.dataset.workspaceFocusKey??active.dataset.projectFocusKey):"")||pageFocusKeys.get("projects")||"";
    projectsPage.replaceChildren();
    const heading=document.createElement("header");heading.className="workspace-page-heading";
    const intro=document.createElement("div");const eyebrow=document.createElement("p");eyebrow.className="eyebrow";eyebrow.textContent="工作区 / 作品管理";
    const title=document.createElement("h1");title.id="project-management-title";title.textContent="作品管理";
    const description=document.createElement("p");description.className="muted";description.textContent="打开本机作品，或从素材开始创作。移入回收站不会改动项目文件；永久删除只清理所选项目专属数据。";intro.append(eyebrow,title,description);heading.append(intro);
    const content=document.createElement("div");content.className="project-management-content";
    const panel=projectPanel(actions,state);panel.dataset.workspaceFocusRoot="projects";content.append(panel);
    const recycleNav=document.createElement("button");recycleNav.type="button";recycleNav.className="secondary recycle-bin-link";recycleNav.dataset.workspaceFocusKey="recycle";recycleNav.textContent=`打开回收站${recycleProjects.length?` · ${recycleProjects.length}`:""}`;recycleNav.disabled=state.busy;recycleNav.addEventListener("click",()=>actions.setWorkspacePage("recycle"));content.append(recycleNav);
    if(projectId()){
      const current=document.createElement("section");current.className="current-project-card";current.setAttribute("aria-label","当前打开的作品");
      const cover=document.createElement("div");cover.className="current-project-cover";
      const watched=state.displayedPreviewBinding,frames=watched?state.previewCovers.get(JSON.stringify([watched.project_id,watched.draft_id,watched.render_id,watched.output_hash])):null;
      if(frames?.length){const image=document.createElement("img");image.src=frames[0].image;image.alt=`当前作品已观看 v${watched.timeline_version} 的实际预览帧`;cover.append(image);}else{const mark=document.createElement("span");mark.setAttribute("aria-hidden","true");mark.textContent="AVE";cover.append(mark);}
      const meta=document.createElement("div");meta.className="current-project-meta";const name=document.createElement("strong");name.textContent=selectedRequest()?.authorization.original_text.slice(0,48)||"当前作品";const details=document.createElement("span");details.textContent=`${state.media.filter(item=>item.location_type==="original").length} 份素材 · 作品 v${state.workspace?.timeline_version??0}`;meta.append(name,details);
      const currentActions=document.createElement("div");currentActions.className="current-project-actions";const open=document.createElement("button");open.type="button";open.className="secondary";open.dataset.workspaceFocusKey="current";open.textContent="继续编辑";open.addEventListener("click",()=>actions.setWorkspacePage("creation"));const recycleCurrent=document.createElement("button");recycleCurrent.type="button";recycleCurrent.className="project-recycle-button";recycleCurrent.dataset.workspaceFocusKey="current-recycle";recycleCurrent.textContent="移入回收站";recycleCurrent.setAttribute("aria-label","移入回收站：当前作品");recycleCurrent.disabled=state.busy;recycleCurrent.addEventListener("click",()=>actions.recycleProject(projectId()));currentActions.append(open,recycleCurrent);current.append(cover,meta,currentActions);content.append(current);
    }
    const recent=document.createElement("section");recent.className="recent-projects";recent.setAttribute("aria-labelledby","recent-projects-title");const recentHeading=document.createElement("h2");recentHeading.id="recent-projects-title";recentHeading.textContent="最近打开";recent.append(recentHeading);
    if(recentLoading||recentError||!recentProjects.length){const message=document.createElement("p");message.className=recentError?"stage2-risk":"muted";message.textContent=recentError||(recentLoading?"正在读取近期作品…":"还没有近期作品。通过“新建作品”或“打开作品”开始。");recent.append(message);}
    const list=document.createElement("div");list.className="recent-project-grid";
    for(const item of recentProjects){const entry=document.createElement("article");entry.className="recent-project-entry";const card=document.createElement("button");card.type="button";card.className="recent-project-card";card.dataset.recentProject=item.id;card.dataset.workspaceFocusKey=`recent:${item.id}`;card.disabled=state.busy;const cover=document.createElement("div");cover.className="recent-project-placeholder";cover.setAttribute("aria-hidden","true");cover.textContent="AVE";const name=document.createElement("strong");name.textContent=item.display_name;const time=document.createElement("span");time.textContent=`最近打开：${new Date(item.last_opened_at).toLocaleString("zh-CN")}`;card.append(cover,name,time);card.addEventListener("click",()=>actions.openRecent(item.id));const recycle=document.createElement("button");recycle.type="button";recycle.className="project-recycle-button";recycle.dataset.workspaceFocusKey=`recycle:${item.id}`;recycle.textContent="移入回收站";recycle.setAttribute("aria-label",`移入回收站：${item.display_name}`);recycle.disabled=state.busy;recycle.addEventListener("click",()=>actions.recycleProject(item.id));entry.append(card,recycle);list.append(entry);}
    recent.append(list);content.append(recent);projectsPage.append(heading,content);
    if(focusKey){const target=[...projectsPage.querySelectorAll("[data-workspace-focus-key],[data-project-focus-key]")].find(node=>(node.dataset.workspaceFocusKey??node.dataset.projectFocusKey)===focusKey);if(target instanceof HTMLElement&&!target.disabled)target.focus({preventScroll:true});}
  }
  function renderRecycleBin(container,preferredFocusKey=""){
    const active=container.ownerDocument.activeElement;
    const focusKey=(container.contains(active)?active.dataset.recycleFocusKey:"")||preferredFocusKey;
    container.replaceChildren();
    const heading=document.createElement("h2");heading.textContent="回收站";
    const description=document.createElement("p");description.className="muted";description.textContent="移入回收站只隐藏作品入口，不改动项目文件。永久删除只清理所选项目专属数据。";
    const toolbar=document.createElement("div");toolbar.className="button-row recycle-bin-toolbar";
    const pendingRecycle=recycleProjects.some(item=>item.delete_pending);
    const restoreAll=document.createElement("button");restoreAll.className="secondary";restoreAll.textContent="全部恢复";restoreAll.dataset.recycleFocusKey="restore-all";restoreAll.disabled=state.busy||!recycleProjects.length||pendingRecycle;restoreAll.title=pendingRecycle?"有项目正在等待永久清理，请先重试清理。":"";restoreAll.addEventListener("click",actions.restoreAllRecycledProjects);toolbar.append(restoreAll);
    const deleteAll=document.createElement("button");deleteAll.className="project-delete-button";deleteAll.textContent="全部彻底删除";deleteAll.dataset.recycleFocusKey="delete-all";deleteAll.disabled=state.busy||!recycleProjects.length;deleteAll.addEventListener("click",actions.permanentlyDeleteAllRecycledProjects);toolbar.append(deleteAll);
    const children=[heading,description,toolbar];
    if(recycleLoading||recycleError||!recycleProjects.length){const message=document.createElement("p");message.className=recycleError?"stage2-risk":"muted";message.textContent=recycleError||(recycleLoading?"正在读取回收站…":"回收站为空。");children.push(message);}
    const list=document.createElement("div");list.className="recent-project-grid recycle-bin-grid";
    for(const item of recycleProjects){const card=document.createElement("article");card.className="recycle-project-entry";const name=document.createElement("strong");name.textContent=item.display_name;const time=document.createElement("span");time.textContent=`移入时间：${new Date(item.recycled_at).toLocaleString("zh-CN")}`;card.append(name,time);if(item.delete_pending){const pending=document.createElement("span");pending.className="recycle-pending";pending.textContent="永久清理未完成；项目仍保留，可重试。";card.append(pending);}const actionsRow=document.createElement("div");actionsRow.className="button-row";const restore=document.createElement("button");restore.className="secondary";restore.textContent="恢复";restore.dataset.recycleFocusKey=`restore:${item.id}`;restore.disabled=state.busy||Boolean(item.delete_pending);restore.addEventListener("click",()=>actions.restoreRecycledProject(item.id));const remove=document.createElement("button");remove.className="project-delete-button";remove.textContent=item.delete_pending?"重试彻底删除":"彻底删除";remove.dataset.recycleFocusKey=`delete:${item.id}`;remove.disabled=state.busy;remove.addEventListener("click",()=>actions.permanentlyDeleteRecycledProject(item.id));actionsRow.append(restore,remove);card.append(actionsRow);list.append(card);}
    children.push(list);container.replaceChildren(...children);
    if(focusKey){const target=[...container.querySelectorAll("[data-recycle-focus-key]")].find(node=>node.dataset.recycleFocusKey===focusKey);if(target&&!target.disabled)target.focus();else container.focus();}
  }
  const unsubscribeClose=onBeforeClose(async ({token})=>{clearTimeout(uiTimer);try{await drainViewing();await persistUi();await acknowledgeClose({token,ok:true});}catch(error){reportError(error);state.notice=error.message;update();try{await acknowledgeClose({token,ok:false,message:error.message});}catch(ackError){state.notice+=`；关闭确认发送失败：${ackError.message}`;update();}}});
  const onResize=()=>update();window.addEventListener("resize",onResize);
  const onPageHide=()=>{clearTimeout(uiTimer);void persistUi().catch(error=>{reportError(error);state.notice=error.message;update();});};window.addEventListener("pagehide",onPageHide);
  const unsubscribe = subscribe(event => { if(event?.event_type==="app.shutdown.failed"){reportError(`${event.payload.code}: ${event.payload.message}`);state.notice=event.payload.message;update();return;}if(event?.event_type==="project.session.changed"){state.notice="";state.issueLoadError="";void actions.refresh();return;}if (["project.create","project.open","project.open-recent","project.close","project.recycle-bin.move","project.recycle-bin.restore","project.recycle-bin.restore-all","project.recycle-bin.permanently-delete","project.recycle-bin.permanently-delete-all"].includes(event?.event_type) || !event?.project_id || event.project_id === projectId()) actions.refresh(); });
  update(); actions.refresh();
  return { refresh, destroy() { disposed = true; disconnectErrorJournal();epoch++; refreshSequence++;toastRevision++;clearTimeout(toastTimer);clearTimeout(toastHideTimer);unsubscribe(); unsubscribeClose();clearTimeout(uiTimer);clearTimeout(productionPoll);window.removeEventListener("pagehide",onPageHide);window.removeEventListener("resize",onResize);window.removeEventListener("ave:operation-error",onOperationError);clearPreview(); player.destroy();timelineView.destroy();comparisonView.destroy();creation.destroy();issuePage?.destroy();state.previewCovers.clear(); root.replaceChildren(); } };
}
