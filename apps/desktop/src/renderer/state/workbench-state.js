export function createWorkbenchState() {
  return { home: false, composingNew: false, materialOpen: false, conversationOpen: true, selectedClip: null, status: { project: "not-open", timeline: "no-version", render: "idle", qc: "not-run" }, workspace: null, timeline: null, media: [], jobs: [], creationView: "request", selectedRequestId: "", selectedDraftId: "", selectedRenderId: "", selectedAssetId: "", profileQuery: null, previewUrl: "", previewBinding: null, forms: new Map(), pending: new Map(), failedRenderAttempts: new Set(), notice: "", busy: false, refreshing: false, authorityCurrent: false };
}
export function setState(state, patch) { Object.assign(state, patch); return state; }

export function editNavigationHistory(request, saved) {
  if (saved && saved.current_draft_id === request.latest_draft_id && Array.isArray(saved.ids) && Number.isInteger(saved.cursor) && saved.cursor >= 0 && saved.cursor < saved.ids.length && saved.ids.every(id => request.drafts.some(draft => draft.draft_id === id))) return saved;
  const ids = [], visited = new Set();
  let draft = request.drafts.find(item => item.draft_id === request.latest_draft_id);
  while (draft && !visited.has(draft.draft_id)) { visited.add(draft.draft_id); ids.unshift(draft.draft_id); draft = request.drafts.find(item => item.draft_id === draft.parent_draft_id); }
  return { ids, cursor: ids.length - 1, current_draft_id: request.latest_draft_id };
}
export function advanceEditNavigation(history, draftId, direction = 0) {
  if (!direction) { const ids = [...history.ids.slice(0, history.cursor + 1), draftId]; return { ids, cursor: ids.length - 1, current_draft_id: draftId }; }
  const cursor = history.cursor + direction;
  if (![-1, 1].includes(direction) || !history.ids[cursor]) throw new Error("没有可撤销或重做的编辑内容");
  return { ids: [...history.ids], cursor, current_draft_id: draftId };
}

export function creationNoticeText(raw) {
  if (raw.startsWith("MODEL_PROVIDER_FAILED: ")) return raw.slice("MODEL_PROVIDER_FAILED: ".length);
  if (raw.includes("CREATION_DURATION_TARGET_UNMET")) return "生成的镜头总时长不符合当前要求，本次制作已停止。你可以补充要求后继续，具体原因保留在记录中。";
  if (raw.includes("CREATION_TIME_INEXACT")) return "生成方案中的时间未对齐素材或作品的精确帧边界，本次制作已停止。你可以继续修改要求，具体原因保留在记录中。";
  if (raw.includes("CREATION_PRODUCTION_FAILED")) return "本次制作未完成。请查看记录中的具体原因；已有版本可在历史中核对。";
  return raw;
}

export function validateWorkspaceContext(value,projectId) {
  const exact=(item,keys)=>item&&typeof item==="object"&&!Array.isArray(item)&&Object.keys(item).sort().join("|")===keys.sort().join("|");
  const text=value=>typeof value==="string"&&value.length>0;
  const keys=["context_version","composing_new","selected_render_id","watched_preview","clip_selection"];
  if(value?.context_version===2)keys.push("profile_query");
  if(!exact(value,keys)||![1,2].includes(value.context_version)||typeof value.composing_new!=="boolean"||typeof value.selected_render_id!=="string")throw new Error("已保存的工作区上下文格式无效，未恢复选择。");
  if(value.context_version===2&&value.profile_query!==null){
    const query=value.profile_query,list=items=>Array.isArray(items)&&items.every(text)&&new Set(items).size===items.length;
    if(!exact(query,["contexts","except_principle_ids"])||!list(query.contexts)||!list(query.except_principle_ids))throw new Error("已保存的个人化查询格式无效，未恢复查询。");
  }
  const watched=value.watched_preview;
  if(watched!==null&&(!exact(watched,["project_id","request_id","draft_id","render_id","output_hash","timeline_version"])||watched.project_id!==projectId||![watched.request_id,watched.draft_id,watched.render_id].every(text)||!/^[a-f0-9]{64}$/.test(watched.output_hash)||!Number.isSafeInteger(watched.timeline_version)||watched.timeline_version<1))throw new Error("已保存的观看版本身份无效，未恢复画面。");
  const clip=value.clip_selection;
  if(clip!==null&&(!exact(clip,["track_id","clip_id","timeline_version"])||![clip.track_id,clip.clip_id].every(text)||!Number.isSafeInteger(clip.timeline_version)||clip.timeline_version<1))throw new Error("已保存的镜头选择无效，未恢复选择。");
  // Version 1 never recorded an applied query; form text is not evidence of application.
  return value.context_version===1?{...value,context_version:2,profile_query:null}:value;
}
export function clipMatchesTimeline(selection,timeline) { return Boolean(selection&&selection.timeline_version===timeline?.version&&timeline.tracks.some(track=>track.track_id===selection.track_id&&track.clips.some(clip=>clip.clip_id===selection.clip_id))); }
