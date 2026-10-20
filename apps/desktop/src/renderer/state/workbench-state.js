export const WORKBENCH_PAGE_IDS = Object.freeze(["creation", "assets", "precision", "history", "issues", "projects", "recycle", "help", "export"]);
export const DEFAULT_ASSET_LAYOUT = Object.freeze({view:"grid",thumbnailSize:160,panelWidth:300});
export const DEFAULT_PRECISION_LAYOUT = Object.freeze({resourcesOpen:true,inspectorOpen:true,inspectorWidth:300,timelineHeight:280});
export const DEFAULT_WORKBENCH_COMPOSER_POSITION = Object.freeze({x:1,y:1});

export function normalizeWorkbenchComposerPosition(value) {
  if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).sort().join("|")!=="x|y")throw new Error("对话面板位置无效，未修改布局。");
  if(!Number.isFinite(value.x)||value.x<0||value.x>1||!Number.isFinite(value.y)||value.y<0||value.y>1)throw new Error("对话面板位置超出支持范围，未修改布局。");
  return {x:value.x,y:value.y};
}

export function readWorkbenchComposerPosition(forms, projectId) {
  if(typeof projectId!=="string")throw new Error("对话面板位置必须绑定当前作品");
  if(!projectId)return {...DEFAULT_WORKBENCH_COMPOSER_POSITION};
  const saved=forms.get(JSON.stringify([projectId,"","composer-position"]));
  return saved===undefined?{...DEFAULT_WORKBENCH_COMPOSER_POSITION}:normalizeWorkbenchComposerPosition(saved);
}

export function writeWorkbenchComposerPosition(forms, projectId, value) {
  if(typeof projectId!=="string"||!projectId)throw new Error("对话面板位置必须绑定当前作品");
  const normalized=normalizeWorkbenchComposerPosition(value);
  forms.set(JSON.stringify([projectId,"","composer-position"]),normalized);
  return normalized;
}

export function normalizeAssetLayout(value) {
  if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).sort().join("|")!=="panelWidth|thumbnailSize|view")throw new Error("素材视图设置无效，未修改布局。");
  if(!["grid","list","compact"].includes(value.view)||!Number.isSafeInteger(value.thumbnailSize)||value.thumbnailSize<112||value.thumbnailSize>224||!Number.isSafeInteger(value.panelWidth)||value.panelWidth<240||value.panelWidth>420)throw new Error("素材视图设置超出支持范围，未修改布局。");
  return {view:value.view,thumbnailSize:value.thumbnailSize,panelWidth:value.panelWidth};
}

export function readAssetLayout(forms, projectId) {
  if(typeof projectId!=="string")throw new Error("素材布局必须绑定当前作品");
  if(!projectId)return {...DEFAULT_ASSET_LAYOUT};
  const saved=forms.get(JSON.stringify([projectId,"","asset-layout"]));
  return saved===undefined?{...DEFAULT_ASSET_LAYOUT}:normalizeAssetLayout(saved);
}

export function writeAssetLayout(forms, projectId, value) {
  if(typeof projectId!=="string"||!projectId)throw new Error("素材布局必须绑定当前作品");
  const normalized=normalizeAssetLayout(value);
  forms.set(JSON.stringify([projectId,"","asset-layout"]),normalized);
  return normalized;
}

export function normalizePrecisionLayout(value) {
  if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).sort().join("|")!=="inspectorOpen|inspectorWidth|resourcesOpen|timelineHeight")throw new Error("精修布局设置无效，未修改布局。");
  if(typeof value.resourcesOpen!=="boolean"||typeof value.inspectorOpen!=="boolean"||!Number.isSafeInteger(value.inspectorWidth)||value.inspectorWidth<220||value.inspectorWidth>420||!Number.isSafeInteger(value.timelineHeight)||value.timelineHeight<220||value.timelineHeight>520)throw new Error("精修布局设置超出支持范围，未修改布局。");
  return {resourcesOpen:value.resourcesOpen,inspectorOpen:value.inspectorOpen,inspectorWidth:value.inspectorWidth,timelineHeight:value.timelineHeight};
}

export function readPrecisionLayout(forms, projectId) {
  if(typeof projectId!=="string")throw new Error("精修布局必须绑定当前作品");
  if(!projectId)return {...DEFAULT_PRECISION_LAYOUT};
  const saved=forms.get(JSON.stringify([projectId,"","precision-layout"]));
  return saved===undefined?{...DEFAULT_PRECISION_LAYOUT}:normalizePrecisionLayout(saved);
}

export function writePrecisionLayout(forms, projectId, value) {
  if(typeof projectId!=="string"||!projectId)throw new Error("精修布局必须绑定当前作品");
  const normalized=normalizePrecisionLayout(value);
  forms.set(JSON.stringify([projectId,"","precision-layout"]),normalized);
  return normalized;
}

export function workbenchPageFormKey(projectId) {
  if (typeof projectId !== "string" || !projectId) throw new Error("工作台页面状态必须绑定当前作品");
  return JSON.stringify([projectId, "", "workspace-page"]);
}

export function readWorkbenchPage(forms, projectId) {
  const saved = forms.get(workbenchPageFormKey(projectId));
  if (saved === undefined) return "creation";
  if (typeof saved !== "string" || !WORKBENCH_PAGE_IDS.includes(saved)) throw new Error("已保存的工作台页面无效，未恢复导航状态。");
  return saved;
}

export function writeWorkbenchPage(forms, projectId, page) {
  if (!WORKBENCH_PAGE_IDS.includes(page)) throw new Error("工作台页面不存在");
  forms.set(workbenchPageFormKey(projectId), page);
  return page;
}

export function rememberWorkspaceFocus(targets, page, target) {
  if (!WORKBENCH_PAGE_IDS.includes(page)) throw new Error("工作台页面不存在");
  if (!target || typeof target.focus !== "function") return false;
  targets.set(page, target);
  return true;
}

export function restoreWorkspaceFocus(targets, page) {
  if (!WORKBENCH_PAGE_IDS.includes(page)) throw new Error("工作台页面不存在");
  const target = targets.get(page);
  if (!target) return false;
  if (target.isConnected !== true || target.disabled === true) {
    targets.delete(page);
    return false;
  }
  for (let ancestor = target; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.hidden === true || ancestor.inert === true) {
      targets.delete(page);
      return false;
    }
  }
  target.focus({ preventScroll: true });
  return true;
}

export function createWorkbenchState() {
  return { workspacePage: "projects", exportReturnPage: null, navigationVisible: true, composingNew: false, materialOpen: false, sourceBrowsing: false, conversationOpen: true, selectedClip: null, selectedCaption: null, selectedTimelineTrackId: "", timelineZoom: 0, playheadTicks: 0n, timelineSnap: true, status: { project: "not-open", timeline: "no-version", render: "idle", qc: "not-run" }, workspace: null, timeline: null, media: [], importBatches: [], jobs: [], creationView: "request", selectedRequestId: "", selectedDraftId: "", selectedRenderId: "", selectedAssetId: "", profileQuery: null, previewUrl: "", previewBinding: null, forms: new Map(), pending: new Map(), failedRenderAttempts: new Set(), notice: "", busy: false, refreshing: false, authorityCurrent: false };
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
