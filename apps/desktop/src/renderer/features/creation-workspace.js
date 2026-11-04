import { reportError } from "../components/error-dialog.js";
import { precisionFields, precisionOperations, showPrecisionFields } from "./precision-edit.js";
import { exportDialog } from "./export-dialog.js";
import { annotationRecoveryComposerText } from "./timeline-annotation-queue.js";
export function creationQcRows(rendered) {
  const grouped=new Map();
  for(const [key,target] of [["preview","预览"],["master","成片"]])for(const issue of rendered[key].qc.issues){const identity=JSON.stringify([issue.code,issue.severity,issue.blocker]);if(!grouped.has(identity))grouped.set(identity,{...issue,targets:[]});grouped.get(identity).targets.push(target);}
  return [...grouped.values()].map(issue=>({...issue,text:`${issue.targets.join("与")}：${issue.code==="SILENCE"?`检测到静音（${issue.blocker?"未通过检查，请核对声音":"提示，此项不阻止导出"}）`:`${issue.blocker?"未通过检查":"检查提示"} · ${issue.code}（${({warning:"警告",error:"错误",info:"信息"})[issue.severity]??issue.severity}）`}`}));
}
const statusLabels = { received: "已收到", adjusting: "正在调整", rendering: "正在渲染", watchable: "可以看片", paused: "已暂停", cancelled: "已取消", failed: "制作失败", superseded: "已有新要求" };
const qcLabel = value => value === "passed" ? "通过" : value === "failed" ? "未通过" : value;
export const creationDataLabels = { request: "本次要求", timeline: "当前作品", evidence: "素材观察", frames: "抽帧", audio: "音频", transcript: "转写", profile: "个性化原则", feedback: "后台自学习：本作品反馈（默认开启）" };
export function explicitList(value) { const values = String(value).split(/[,，\r\n]+/).map(item => item.trim()).filter(Boolean); if (new Set(values).size !== values.length) throw new Error("列表包含重复项"); return values; }
export function authorizationAssets(media) {
  return [...new Map(media.filter(item => item.location_type === "original").map(item => [item.asset_id, item])).values()];
}
export function exactTicks(value, timebase) {
  const input = String(value).trim(), match = /^(\d+)(?:\.(\d+))?$/.exec(input), fraction = /^(\d+)\/(\d+)$/.exec(input);
  if (!match && !fraction) throw new Error("时间须为非负秒数或分数");
  const digits = match?.[2] ?? "", denominator = fraction ? BigInt(fraction[2]) : 10n ** BigInt(digits.length);
  const numerator = fraction ? BigInt(fraction[1]) : BigInt(match[1]) * denominator + BigInt(digits || "0");
  if (!timebase || typeof timebase.value !== "bigint" || typeof timebase.timescale !== "bigint" || timebase.value <= 0n || timebase.timescale <= 0n || denominator <= 0n) throw new Error("作品没有可用的精确时间基");
  const top = numerator * timebase.timescale, bottom = denominator * timebase.value;
  if (top % bottom !== 0n) throw new Error("这个时间无法精确落在当前帧边界上");
  return top / bottom;
}
export function prepareCreationAuthorization(values, requestId) {
  if (!values.original_text.trim() || !values.provider.trim() || !values.model.trim() || !values.asset_ids.length) throw new Error("请填写创作要求、模型并明确选择素材");
  const expires = new Date(values.expires_at); if (!Number.isFinite(expires.getTime())) throw new Error("请明确设置授权截止时间");
  return { request_id: requestId, original_text: values.original_text, asset_ids: [...values.asset_ids], provider: values.provider.trim(), model: values.model.trim(), allowed_data: [...values.allowed_data], protected_refs: explicitList(values.protected_refs), policy_version: "request-v1", expires_at: expires.toISOString() };
}
export function creationEntryIssues(values, context) {
  const issues = [];
  if (!values.original_text.trim()) issues.push({ field: "original_text", message: "先写下你想制作的内容。" });
  if (!values.asset_ids.length) issues.push({ field: "asset_ids", message: "请选择本次创作可使用的素材；导入素材或预览素材不会自动授权。" });
  if (!values.provider.trim() || !values.model.trim()) issues.push({ field: "provider", message: "当前没有完整的创作模型配置，请先配置服务与模型。" });
  const expires = new Date(values.expires_at).getTime();
  if (!Number.isFinite(expires) || expires <= context.now) issues.push({ field: "expires_at", message: "请选择尚未到期的授权截止时间。" });
  const required = ["request", "timeline", "evidence", "frames"];
  if (values.allowed_data.includes("audio") || context.hasCaptions) required.push("transcript");
  if (context.useProfile) required.push("profile");
  const missing = required.filter(key => !values.allowed_data.includes(key));
  if (missing.length) issues.push({ field: "allowed_data", message: `自动制作需要你确认：${missing.map(key => creationDataLabels[key]).join("、")}。` });
  return issues;
}
export function manualCommands(timeline, values, operationId) {
  const target = JSON.parse(values.target || "null"), track = timeline?.tracks.find(track => track.track_id === target?.[0]), clip = track?.clips.find(clip => clip.clip_id === target?.[1]);
  if (!clip || !track || !values.raw_text.trim()) throw new Error("请选择当前作品中的镜头，并保留修改说明");
  const commands = [];
  if (values.placement_text !== "") commands.push({ type: "move_clip", track_id: track.track_id, clip_id: clip.clip_id, timeline_start: exactTicks(values.placement_text, timeline.sequence?.timebase) });
  if (values.gain_db !== "") { const gain = Number(values.gain_db); if (!values.gain_db.trim() || !Number.isFinite(gain)) throw new Error("音量必须为有限数值"); commands.push({ type: "set_gain", track_id: track.track_id, clip_id: clip.clip_id, gain_db: gain }); }
  if (values.caption_text !== "") {
    if (track.kind !== "video") throw new Error("字幕必须放在视频轨上");
    const duration = exactTicks(values.caption_duration, timeline.sequence?.timebase); if (duration <= 0n) throw new Error("字幕时长必须为正");
    commands.push({ type: "add_caption", track_id: track.track_id, caption: { caption_id: `caption:${operationId}`, text: values.caption_text, timeline_start: exactTicks(values.caption_start, timeline.sequence?.timebase), timeline_duration: duration, style: { layout_version: 1 } } });
  }
  if (!commands.length) throw new Error("请填写至少一项实际修改");
  return commands;
}
const node = (tag, value = "", className = "") => { const element = document.createElement(tag); element.textContent = value; element.className = className; return element; };
const button = (label, action, tone = "secondary") => { const value = node("button", label, tone); value.type = "button"; value.addEventListener("click", event => {try{Promise.resolve(action(event)).catch(reportError);}catch(error){reportError(error);}}); return value; };
function options(select, items, selected, multiple = false) {
  const identity = JSON.stringify(items);
  if (select.dataset.options !== identity) { select.replaceChildren(); if (!multiple) select.append(new Option("请选择", "")); for (const [value, label] of items) select.append(new Option(label, value)); select.dataset.options = identity; }
  const values = multiple ? selected ?? [] : [selected ?? ""];
  for (const option of select.options) option.selected = values.includes(option.value);
}

/** Retains the forms and player-independent shell; snapshots update lists only. */
export function createCreationWorkspace(actions, state) {
  const section = node("section", "", "stage2-workspace"), heading = node("div", "", "panel-heading"), title = node("div");
  title.append(node("h2", "对话"));
  const summary = node("span", "", "badge"); heading.append(title, summary); section.append(heading);
  const requestSelect = node("select"); requestSelect.setAttribute("aria-label", "当前创作请求"); requestSelect.dataset.creation = "request-select";
  requestSelect.addEventListener("change", () => actions.selectRequest(requestSelect.value)); const newRequest=button("新创作要求",actions.newRequest,"ghost");
  const requestSettings=node("details","","request-settings");requestSettings.append(node("summary","创作要求与授权"),requestSelect,newRequest);section.append(requestSettings);
  const nav = node("nav", "", "stage2-tabs"), views = new Map(), tabs = new Map();
  for (const [key, label] of [["request", "对话"], ["material", "制作"], ["drafts", "历史"], ["profile", "档案"]]) {
    const tab = button(label, () => actions.showView(key)); tab.dataset.creationView = key; tabs.set(key, tab); if(key==="request"||key==="drafts")nav.append(tab);
    const view = node("div", "", "stage2-view"); views.set(key, view);
  }
  section.append(nav, ...views.values());
  const composer=node("div","","creation-composer"),dock=node("div","","chat-compose"),dockHandle=button("⋮⋮",()=>{},"ghost"),composerText=node("textarea"),composerContext=node("p","","composer-context"),composerSend=button("授权并开始制作",()=>{},"primary");
  dock.setAttribute("aria-label","随时输入修改意见");
  composerText.setAttribute("aria-label","创作要求或修改意见");composerText.rows=2;composerText.placeholder="告诉 AVE，你想讲怎样的故事…";
  const composeScope=node("div","","compose-scope");composeScope.setAttribute("role","group");composeScope.setAttribute("aria-label","调整范围");
  const scopeKey=()=>JSON.stringify([state.status.project,state.selectedRequestId||"","conversation-scope"]);
  const scopeValue=()=>state.forms.get(scopeKey())==="current"?"current":"project";
  const projectScope=button("整部作品",()=>{state.forms.set(scopeKey(),"project");actions.saveUi();syncComposer();});
  const clipScope=button("当前镜头 / 片段",()=>{state.forms.set(scopeKey(),"current");actions.saveUi();syncComposer();});
  projectScope.dataset.chatScope="project";clipScope.dataset.chatScope="current";composeScope.append(node("span","调整范围"),projectScope,clipScope);
  composerSend.setAttribute("aria-label","发送当前创作要求");composer.append(composerText,composerSend);dock.append(composeScope,composerContext,composer);
  let activeComposerScope="",activeComposerGeneration=state.formsGeneration??0,composerRevision=0,composerHandoff=null;
  const composerScope=()=>state.status.project==="not-open"?"":JSON.stringify([state.status.project,state.selectedRequestId||"","creative-composer"]);
  const saveComposer=()=>{if(!activeComposerScope)return;composerRevision++;state.forms.set(activeComposerScope,composerText.value);actions.saveUi();};
  function prepareRequestComposer(requestId){
    const handoff={from:activeComposerScope,to:JSON.stringify([state.status.project,requestId,"creative-composer"]),generation:activeComposerGeneration,revision:composerRevision};
    composerHandoff=handoff;
    return()=>{if(composerHandoff===handoff)composerHandoff=null;};
  }
  function syncComposer(){
    const key=composerScope(),generation=state.formsGeneration??0;
    if(key!==activeComposerScope||generation!==activeComposerGeneration){
      let handedOff=false;
      if(activeComposerScope&&activeComposerGeneration===generation)state.forms.set(activeComposerScope,composerText.value);
      // The Host broadcast may select this request before begin returns. Only
      // that exact creation can inherit edits made while its receipt was pending.
      if(composerHandoff?.from===activeComposerScope&&composerHandoff.to===key&&composerHandoff.generation===generation){
        const next=composerRevision===composerHandoff.revision?"":composerText.value,existing=state.forms.get(key);
        if(existing!==undefined&&existing!==next)throw new Error("新请求已有不同的创作草稿；原输入仍保留，未覆盖任一草稿。");
        state.forms.set(key,next);state.forms.delete(activeComposerScope);composerHandoff=null;handedOff=true;
      }
      activeComposerScope=key;activeComposerGeneration=generation;
      const saved=key?state.forms.get(key):undefined;
      if(saved!==undefined&&typeof saved!=="string")throw new Error("已保存的创作输入格式无效，未覆盖当前输入。");
      if(composerText.value!==(saved??""))composerText.value=saved??"";
      if(handedOff)actions.saveUi();
    }
    const selected=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId);
    const annotationKey=selected?JSON.stringify([state.status.project,selected.authorization.request_id,"timeline-annotation-drafts"]):"",annotationDraft=annotationKey?state.forms.get(annotationKey):null,hasAnnotations=Boolean(annotationDraft?.annotations?.length||annotationDraft?.submission),annotationRetry=annotationDraft?.submission?.schema_version===3;
    composerSend.textContent=selected?(annotationRetry?"重试组合任务":hasAnnotations?"提交要求与批注":"提交并继续制作"):"授权并开始制作";
    composerText.disabled=Boolean(state.pending.has("timeline-annotation-send")||state.pending.has("timeline-annotation-reopen")||annotationRetry);
    composerSend.disabled=!key||state.pending.has(selected?(hasAnnotations?"timeline-annotation-send":"revise"):"begin")||state.pending.has("timeline-annotation-reopen")||(selected&&hasAnnotations&&!composerText.value.trim());
    const selection=state.selectedClip??state.selectedCaption,track=selection&&state.timeline?.tracks.find(item=>item.track_id===selection.track_id),clipIndex=selection?.caption_id?(track?.captions?.findIndex(item=>item.caption_id===selection.caption_id)??-1):(track?.clips.findIndex(item=>item.clip_id===selection?.clip_id)??-1);
    const scope=scopeValue(),validClip=selection?.timeline_version===state.timeline?.version&&clipIndex>=0;
    projectScope.setAttribute("aria-pressed",String(scope==="project"));clipScope.setAttribute("aria-pressed",String(scope==="current"));
    projectScope.disabled=clipScope.disabled=Boolean(annotationRetry||state.pending.has("timeline-annotation-send"));
    composerContext.textContent=scope==="current"?(validClip?`当前对象：作品 v${state.timeline.version} · ${selection.caption_id?"字幕/文字":track.kind==="video"?"镜头":"音频"} ${clipIndex+1}`:"当前片段已失效，请重新选择；不会改为整部作品。"):(selected?"当前对象：整部作品":"新建作品 · 先选择素材与授权范围");
    if(scope==="current"&&!validClip&&!annotationRetry)composerSend.disabled=true;
  }
  composerText.addEventListener("input",saveComposer);
  composerText.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!event.repeat)composerSend.click();}});
  composerSend.addEventListener("click",()=>{const selected=state.workspace?.requests.some(item=>item.authorization.request_id===state.selectedRequestId);(selected?revise:request).element.requestSubmit();});
  const forms = [];
  function form(view, id, title, fields, submitLabel, action, scope = "request") {
    const element = node("form", "", "stage2-card stage2-contract-form"), grid = node("div", "", "stage2-contract-fields"), controls = {};
    element.dataset.creationForm = id; element.append(node("h3", title));
    for (const [name, label, kind = "text", initial = ""] of fields) {
      const wrapper = node("label", label), control = node(kind === "textarea" || kind === "select" ? kind : "input");
      if (control.tagName === "INPUT") control.type = kind;
      control.name = name; control.setAttribute("aria-label", label); control.value = initial;
      controls[name] = control; wrapper.append(control); grid.append(wrapper);
    }
    const submit = node("button", submitLabel, "primary"); submit.type = "submit";
    element.append(grid, submit); views.get(view).append(element);
    const values = () => Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.type === "checkbox" ? control.checked : control.multiple ? [...control.selectedOptions].map(option => option.value) : control.value]));
    let activeScope = "",activeGeneration=state.formsGeneration??0;
    const save = () => { if (activeScope) { state.forms.set(activeScope, values()); actions.saveUi(); } };
    element.addEventListener("input", save); element.addEventListener("change", save);
    element.addEventListener("submit", event => {
      event.preventDefault(); if (submit.disabled) return; save(); if (!element.reportValidity()) return;
      const submitted=values(),beforeRequest=state.selectedRequestId,beforeRevision=state.workspace?.requests.find(item=>item.authorization.request_id===beforeRequest)?.revisions.at(-1)?.revision??0,submittedText=composerText.value,submittedScope=activeComposerScope,submittedComposerRevision=composerRevision;
      if(id==="begin")submitted.original_text=submittedText;
      if(id==="revise"){submitted.raw_text=submittedText;submitted.conversation_scope=scopeValue();}
      let result;try{result=action(submitted);}catch(error){reportError(error);return;}
      // Begin cleanup belongs solely to its exact request handoff, never to a
      // different request selected while a cancelled/failed command settles.
      if(id==="revise")void Promise.resolve(result).then(()=>{
        const current=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId),succeeded=state.selectedRequestId===beforeRequest&&current?.revisions.at(-1)?.revision>beforeRevision;
        const queued=state.forms.get(JSON.stringify([state.status.project,beforeRequest,"timeline-annotation-drafts"]));
        if(!succeeded||queued?.submission||composerRevision!==submittedComposerRevision)return;
        if(submittedScope&&state.forms.get(submittedScope)===submittedText)state.forms.delete(submittedScope);
        if(activeComposerScope===submittedScope&&composerText.value===submittedText)composerText.value="";
        actions.saveUi();update();
      });
    });
    forms.push({ id, submit, sync: () => {
      const key = JSON.stringify([state.status.project, scope === "project" ? "" : state.selectedRequestId, id]);
      if (activeScope === key && activeGeneration===(state.formsGeneration??0)) return; if(activeGeneration===(state.formsGeneration??0))save(); activeScope = key;activeGeneration=state.formsGeneration??0;
      const prior = state.forms.get(key) ?? {};
      for (const [name, , , initial = ""] of fields) { const control = controls[name]; if (control.type === "checkbox") control.checked = prior[name] ?? Boolean(initial); else if (!control.multiple) control.value = prior[name] ?? initial; }
    } });
    return { element, controls, submit, values, save, saved: () => state.forms.get(activeScope) ?? {} };
  }
  const request = form("request", "begin", "告诉我，你想怎样讲这个故事", [
    ["asset_ids", "本次允许使用的素材", "select"],
    ["provider", "模型服务"], ["model", "模型名称"], ["audio_library", "使用内置免费音频库自动配乐（可手动替换，音效需明确请求）", "checkbox"],
    ["expires_at", "本次授权有效至", "datetime-local", new Date(Date.now()+86400000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)], ["protected_refs", "保护这些镜头（可选）", "select"],
  ], "授权并开始制作", values => {
    const input = { ...values, allowed_data: dataControls.filter(control => control.checked).map(control => control.name) };
    const issues = creationEntryIssues(input, entryContext());
    entryFeedback.textContent = issues.map(issue => issue.message).join("\n");
    for (const control of Object.values(request.controls)) control.removeAttribute("aria-invalid");
    dataFieldset.removeAttribute("aria-invalid");
    if (issues.length) {
      const first = issues[0];
      for (const issue of issues) {
        const control = issue.field === "allowed_data" ? dataFieldset : issue.field === "original_text" ? composerText : request.controls[issue.field];
        if (!control) throw new Error(`创作入口校验字段没有对应控件：${issue.field}`);
        control.setAttribute("aria-invalid", "true");
      }
      if (issues.some(issue => issue.field !== "original_text")) authorizationDetails.open = true;
      const target = first.field === "allowed_data" ? dataControls.find(control => !control.checked) : first.field==="original_text" ? composerText : request.controls[first.field];
      if (first.field === "provider") { request.controls.provider.parentElement.hidden = false; request.controls.model.parentElement.hidden = false; }
      // Keep focus on the first missing field after requestSubmit finishes its
      // native submission bookkeeping (notably for the shared dock composer).
      queueMicrotask(() => target?.focus());
      return;
    }
    return actions.begin(input);
  }, "project");
  request.controls.asset_ids.multiple = true; request.controls.protected_refs.multiple = true;
  const authorizationDetails=node("details"),authorizationSummary=node("summary","本次创作的素材、服务与权限"); authorizationDetails.append(authorizationSummary);authorizationDetails.open=false;const serviceNote=node("p","","model-service-note");authorizationDetails.append(serviceNote);
  for(const name of ["asset_ids","provider","model","expires_at","protected_refs","audio_library"]) authorizationDetails.append(request.controls[name].parentElement);
  request.element.insertBefore(authorizationDetails,request.submit);
  const allAssets=button("选择全部已导入素材",()=>{for(const option of request.controls.asset_ids.options)option.selected=true;request.save();});authorizationDetails.insertBefore(allAssets,request.controls.asset_ids.parentElement);
  const scopeNote=node("p","先选择本次素材并确认下方数据范围，再开始自动分析与制作。制作时仍可继续补充要求。","muted");request.element.insertBefore(scopeNote,authorizationDetails);
  const entryFeedback=node("p","","stage2-risk");entryFeedback.dataset.creationEntryFeedback="";entryFeedback.setAttribute("role","status");entryFeedback.style.whiteSpace="pre-line";request.element.insertBefore(entryFeedback,request.submit);
  const entryContext=()=>({now:Date.now(),hasCaptions:(state.timeline?.tracks??[]).some(track=>track.captions?.some(caption=>!caption.semantic_sidecar?.labels?.includes("editorial"))),useProfile:state.profileQuery!==null&&state.profileQuery!==undefined});
  const dataFieldset = node("fieldset"), dataControls = [];
  dataFieldset.append(node("legend", "允许发送给模型的数据"));
  for (const [key, label] of Object.entries(creationDataLabels)) { const input = node("input"); input.type = "checkbox"; input.name = key; const wrapper = node("label", label); wrapper.prepend(input); dataFieldset.append(wrapper); dataControls.push(input); input.addEventListener("change", () => {state.forms.set(JSON.stringify([state.status.project,"allowed_data"]), dataControls.filter(control => control.checked).map(control => control.name));actions.saveUi();}); }
  authorizationDetails.append(dataFieldset);
  const dataGuide=node("p","自动分析和制作必需：本次要求、当前作品、素材观察、抽帧。后台自学习默认开启，仅学习本作品明确提交的反馈，使用当前创作模型服务并保留30天；取消勾选即可关闭本次及后续自动学习。其他学习来源在“档案”中单独授权。音频分析可选；启用时还需确认转写。","muted");dataFieldset.prepend(dataGuide);
  dataFieldset.prepend(node("p","画幅：未要求竖屏重构图时，首个画面镜头决定输出画布，其余素材等比留边。需要9:16竖屏时，请明确所有镜头的构图方式；失败后可改为全部保留原画幅，再提交继续制作。","muted"));
  const revise = form("request", "revise", "补充要求或纠正理解", [["preserve_refs", "保护这些镜头（可选）", "select"]], "提交并继续制作", actions.revise);
  revise.controls.preserve_refs.multiple=true;
  const requestActions = node("div", "", "button-row"), cancel = button("取消当前制作", () => actions.cancel(false)), revoke = button("撤销本次授权", () => actions.cancel(true)); requestActions.append(cancel, revoke); views.get("request").append(requestActions);
  const revisions = node("div", "", "conversation-log");revisions.setAttribute("role","log");revisions.setAttribute("aria-label","修改意见与制作动态");
  const annotationQueue=node("section","","timeline-annotation-queue");annotationQueue.setAttribute("aria-label","待发送的批注");
  const annotationQueueTitle=node("h3","批注");
  const annotationQueueHelp=node("p","右键预览画面可添加带位置的画面批注；右键时间线片段或轨道空白处可添加时间锚点。填写整体要求后一次提交；批注正文与精确锚点会作为独立结构化上下文进入当前创作流程。","muted");
  const annotationDraftList=node("div","","timeline-annotation-draft-list");
  const annotationQueueActions=node("div","","button-row");
  const clearAnnotationQueue=button("清空队列",()=>actions.clearTimelineAnnotations?.(),"ghost");
  const reopenAnnotationQueue=button("编辑失败任务并保留批注",()=>actions.reopenFailedTimelineAnnotations?.(reopenAnnotationQueue.dataset.operationId),"ghost");reopenAnnotationQueue.hidden=true;
  const sendAnnotationQueue=button("提交要求与批注",()=>revise.element.requestSubmit(),"primary");
  annotationQueueActions.append(clearAnnotationQueue,reopenAnnotationQueue,sendAnnotationQueue);annotationQueue.append(annotationQueueTitle,annotationQueueHelp,annotationDraftList,annotationQueueActions);
  const reviseSettings=node("details","","composer-settings");reviseSettings.append(node("summary","保护镜头与授权操作"),revise.controls.preserve_refs.parentElement,requestActions);
  revise.element.append(reviseSettings);request.element.classList.add("composer-form");revise.element.classList.add("composer-form");
  request.submit.hidden=true;revise.submit.hidden=true;
  composerText.placeholder="告诉 AVE，你想讲怎样的故事…";
  views.get("request").append(revisions);dock.insertBefore(annotationQueue,composer);
  const materialList = node("div", "", "stage2-section"), includeAudio = node("input"); includeAudio.type = "checkbox";
  const audioLabel = node("label", "此次分析包含获准音频"); audioLabel.prepend(includeAudio);
  const produce = button("继续制作可播放版本",()=>actions.produce(),"primary"); views.get("material").append(produce);
  const prepare = button("准备获准素材", actions.prepare), observe = button("分析真实素材", () => actions.observe(includeAudio.checked)), generate = button("生成可编辑初稿", actions.generate, "primary");
  const technical=node("details"),technicalSummary=node("summary","分阶段制作与诊断");technical.append(technicalSummary,audioLabel,prepare,observe,generate);views.get("material").append(materialList,technical);
  const historyList=node("div","","history-list");historyList.setAttribute("aria-label","已保存的作品版本");views.get("drafts").append(historyList);
  const renderSelect = node("select"); renderSelect.setAttribute("aria-label", "渲染版本"); renderSelect.dataset.creation = "render-select"; renderSelect.addEventListener("change", () => actions.selectRender(renderSelect.value));
  const draftDetails = node("div", "", "stage2-section"), render = button("制作预览与成片", () => actions.renderDraft()), preview = button("观看此版", actions.loadPreview), adopt = button("采用此版", actions.adopt);
  const retryRender = button("原因修正后，开始新渲染尝试", actions.retryRender);
  const versionActions=node("div","","button-row version-actions");versionActions.append(render,retryRender,preview,adopt);const selectedVersion=node("div","","selected-version-actions");selectedVersion.append(renderSelect,draftDetails,versionActions);views.get("drafts").append(selectedVersion);
  const exportView=exportDialog(identity=>actions.exportDraft(identity),identity=>actions.readExports(identity),()=>actions.closeExport?.());
  const showExport=()=>{const selected=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId),draft=selected?.drafts.find(item=>item.draft_id===state.selectedDraftId),render=draft?.renders.find(item=>item.render_id===state.selectedRenderId);if(!render)return false;const cover=state.previewCovers?.get(JSON.stringify([state.status.project,draft.draft_id,render.render_id,render.preview.output_hash]))?.[0]?.image;return exportView.open({project_id:state.status.project,request_id:selected.authorization.request_id,draft_id:draft.draft_id,render_id:render.render_id,timeline_version:draft.timeline_version,preview_qc:qcLabel(render.preview.qc.status),master_qc:qcLabel(render.master.qc.status),cover});};
  const exportPanel=button("导出所选作品",()=>actions.openExportPage?.(),"ghost");selectedVersion.append(exportPanel);
  const scrollTo=node=>node.scrollIntoView({block:"nearest",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  const restoreButton=button("将所选旧版恢复为新草稿",()=>actions.restoreDraft()),undoEdit=button("撤销本版修改",actions.undoEdit),redoEdit=button("重做编辑内容",actions.redoEdit);const editHistoryActions=node("div","","button-row");editHistoryActions.append(restoreButton,undoEdit,redoEdit);const advancedVersion=node("details","","advanced-version");advancedVersion.append(node("summary","更多版本操作"),editHistoryActions);selectedVersion.append(advancedVersion);
  const compareSelect=node("select");compareSelect.setAttribute("aria-label","比较版本");compareSelect.addEventListener("change",()=>update());const compareButton=button("比较两个版本",()=>actions.compare(compareSelect.value));
  const adoptionActions=node("div","","button-row"),undo=button("撤销采用",actions.undoAdoption),redo=button("重做采用",actions.redoAdoption);adoptionActions.append(undo,redo);
  const comparisonActions=node("div","","comparison-actions");comparisonActions.append(compareSelect,compareButton);selectedVersion.insertBefore(comparisonActions,exportPanel);advancedVersion.append(adoptionActions);
  const combination=node("details"),combinationSummary=node("summary","从不同版本组合镜头"),combinationSource=node("select"),combinationClips=node("div","","stage2-section"),combinationList=node("div","","stage2-section"),combinationText=node("textarea"),combinationSubmit=button("生成组合草稿",()=>actions.combine({raw_text:combinationText.value,selections:[...selectedCombination],preserve_refs:[]}));
  combinationSource.setAttribute("aria-label","选片来源版本");combinationText.setAttribute("aria-label","组合说明");combinationText.placeholder="希望保留哪些部分，怎样组织？";combinationSource.addEventListener("change",()=>{saveCombination();if(combinationSource.value)actions.inspectCombination(combinationSource.value);});combinationText.addEventListener("input",()=>saveCombination());
  const selectedCombination=[];combination.append(combinationSummary,combinationSource,combinationClips,combinationList,combinationText,combinationSubmit);advancedVersion.append(combination);
  const manual = form("drafts", "manual", "直接修改当前作品", [
    ["target", "具体镜头", "select"], ["raw_text", "实际修改与保留要求", "textarea"], ["placement_text", "移动到第几秒（留空不改）"], ["gain_db", "音量 dB（留空不改）"],
    ["caption_text", "新增字幕原文（留空不加）", "textarea"], ["caption_start", "字幕开始秒数"], ["caption_duration", "字幕时长秒数"], ["preserve_refs", "保护这些镜头（可选）", "select"],
  ], "保存手动修改版", actions.manual);
  manual.controls.preserve_refs.multiple=true;
  const captions=form("drafts","caption","修改已有字幕",[["caption_target","选择字幕","select"],["caption_operation","操作","select"],["caption_text","替换后的文字","textarea"],["raw_text","修改说明（记录在版本历史）","textarea"]],"保存字幕修改并制作预览",actions.editCaption);
  options(captions.controls.caption_operation,[["replace","修改文字，保持位置与样式"],["delete","删除这条字幕"]],"replace");
  captions.element.append(node("p","保存会保留字幕时序，并按画面安全区域重新排版；原版本仍可查看。文字不变时也可保存新的排版版本。","stage2-copy"));
  const precision=form("drafts","precision","精修画面、声音与字幕",precisionFields,"保存精修版本",actions.precision);
  precision.controls.preserve_refs.multiple=true;
  options(precision.controls.kind,precisionOperations,"move");options(precision.controls.role,[["picture","画面"],["narration","独立旁白"],["music","音乐"],["sfx","音效"]],"picture");
  for(const key of ["associated","snap","enabled"])options(precision.controls[key],[["yes","是"],["no","否"]],key==="snap"?"no":"yes");
  options(precision.controls.mode,[["contain","完整显示"],["crop_fill","裁切填满"],["blurred_background","模糊背景"]],"contain");options(precision.controls.caption_operation,[["replace","新增或修改"],["delete","删除"]],"replace");
  precision.controls.kind.addEventListener("change",()=>showPrecisionFields(precision.controls));showPrecisionFields(precision.controls);
  const precisionSources=button("读取本作品可插入素材",()=>actions.precisionSources(),"ghost"),wave=button("读取所选音频波形并选段",async()=>{
    const target=JSON.parse(precision.controls.target.value||"null"),clip=state.timeline?.tracks.find(t=>t.track_id===target?.[0])?.clips.find(c=>c.clip_id===target?.[1]),project=state.status.project,version=state.timeline?.version;
    if(!clip)return;wave.disabled=true;try{const {query}=await import("../api/project-api.js");const result=await query("project.media.analysis",project,{asset_id:clip.source.asset_id});if(!result.ok)throw new Error(result.error.message);if(state.status.project!==project||state.timeline?.version!==version||!result.data.waveform||!result.data.source_audio)throw new Error("当前选段已改变，或素材没有可用音频");
      for(const url of waveUrls.splice(0))URL.revokeObjectURL(url);wavePreview.replaceChildren();const data=result.data,bytes=data.waveform,url=URL.createObjectURL(new Blob([new Uint8Array(bytes.data??bytes)],{type:"image/png"})),image=node("img");image.src=url;image.alt="原素材完整波形；依次点击选择源开始和结束";image.style.maxWidth="100%";let start=true;
      image.onclick=event=>{const box=image.getBoundingClientRect(),part=BigInt(Math.max(0,Math.min(10000,Math.round((event.clientX-box.left)/box.width*10000)))),range=data.source_audio,first=BigInt(range.start.value),last=BigInt(range.end.value),point=first+(last-first)*part/10000n;precision.controls[start?"source_start":"source_end"].value=`${point}/${range.start.timescale}`;start=!start;precision.controls.kind.value="trim";showPrecisionFields(precision.controls);precision.save();};
      wavePreview.append(node("p","原素材波形：依次点击设置开始、结束。保存时会校验采样、帧与成片时间边界。"),image);waveUrls.push(url);
      if(data.audio){const audio=node("audio"),bytes=data.audio,audioUrl=URL.createObjectURL(new Blob([new Uint8Array(bytes.data??bytes)],{type:"audio/wav"}));audio.src=audioUrl;audio.controls=true;wavePreview.append(node("p","试听前 15 秒以内的实际声音"),audio);waveUrls.push(audioUrl);}
    }catch(error){reportError(error);wavePreview.textContent=error.message;}finally{wave.disabled=false;}
  },"ghost"),wavePreview=node("div"),waveUrls=[];
  precision.element.append(precisionSources,wave,wavePreview);
  const waveCleanup=new MutationObserver(()=>{if(!section.isConnected){for(const url of waveUrls)URL.revokeObjectURL(url);waveCleanup.disconnect();}});waveCleanup.observe(document.body,{childList:true,subtree:true});
  precision.controls.source.addEventListener("change",()=>{const source=JSON.parse(precision.controls.source.value||"null");if(source){precision.controls.source_start.value=`${source.start.value}/${source.start.timescale}`;precision.controls.source_end.value=`${source.end.value}/${source.end.timescale}`;precision.save();}});
  const refinement=node("aside","","refinement-panel");refinement.setAttribute("aria-label","精修属性");refinement.append(node("h2","精修属性","p4-inspector-title"));const inspector=node("section","","p4-property-inspector");inspector.setAttribute("aria-label","所选片段属性");const advanced=node("details","","p4-advanced-controls");advanced.append(node("summary","更多精确编辑操作"),manual.element,precision.element,captions.element);refinement.append(inspector,advanced);
  captions.controls.caption_target.addEventListener("change",()=>{const target=JSON.parse(captions.controls.caption_target.value||"null"),caption=state.timeline?.tracks.find(track=>track.track_id===target?.[0])?.captions.find(caption=>caption.caption_id===target?.[1]);if(caption){captions.controls.caption_text.value=caption.text;captions.save();}});
  const query = form("profile", "profile-query", "本项目使用哪些经验", [["contexts", "适用情境（逗号分隔）"], ["exceptions", "这次不采用的习惯（可选）", "select"]], "读取适用经验", actions.profileQuery, "project");
  query.controls.exceptions.multiple=true;
  query.element.append(button("仅查看项目", () => actions.profileQuery(null)));
  const availableContexts=node("div","","stage2-section");availableContexts.setAttribute("aria-label","档案中可用的情境");const principles = node("div", "", "stage2-section"); views.get("profile").append(availableContexts,principles);
  const configure = form("profile", "profile-configure", "后台自学习开关与保留范围", [["source_project_ids", "允许从哪些作品学习", "select"], ["data_types", "允许学习的操作", "select"], ["external_provider", "档案学习使用的模型服务", "select"], ["retention_until", "保留截止时间", "datetime-local", new Date(Date.now()+30*86400000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)], ["enabled", "开启后台自学习与档案个性化（关闭即停止后续学习并禁用档案读取）", "checkbox"]], "核对并保存开关与范围", actions.configureProfile, "project");
  for (const name of ["source_project_ids", "data_types", "retention_until"]) configure.controls[name].required = true;
  configure.element.insertBefore(node("p", "请明确选择来源作品、允许学习的操作和保留时间。停用学习时仍保留这些范围与已有经验。", "muted"), configure.submit);
  configure.controls.source_project_ids.multiple=true;configure.controls.data_types.multiple=true;
  const learn = form("profile", "learn", "将选定经验纳入档案", [["kind", "经验类型", "select"], ["raw_text", "历史或手动经验说明", "textarea"], ["correction_ids", "明确纠正哪些习惯（可选）", "select"]], "学习所选经验", actions.learn);
  learn.controls.correction_ids.multiple=true;
  options(learn.controls.kind, [["selection","采用所选版本"],["feedback","所选版本对应的反馈"],["manual_diff","所选手动修改"],["history_reference","当前项目的获准历史或参考"]], "");
  const forget = form("profile", "forget", "遗忘作品带来的经验", [["source_project_ids", "要遗忘的来源作品", "select"]], "核对并遗忘", actions.forget, "project");
  forget.controls.source_project_ids.multiple=true;
  const forgetPrinciples=form("profile","forget-principles","撤回这次学习产生的经验",[["principle_ids","要撤回的经验","select"]],"核对关联影响并撤回",actions.forget,"project");forgetPrinciples.controls.principle_ids.multiple=true;forgetPrinciples.element.append(node("p","同一次学习产生的相关经验及依赖它们的纠正后继也会被排除。确认窗口会列出实际影响范围；此前作品仍保留。","stage2-copy"));
  let dataProject = null,dataGeneration=-1,combinationScope="",combinationGeneration=-1,annotationQueueSignature="";
  const saveCombination=()=>{if(!combinationScope)return;state.forms.set(combinationScope,{source_draft_id:combinationSource.value,raw_text:combinationText.value,selections:selectedCombination.map(item=>({...item}))});actions.saveUi();};
  function update() {
    for (const item of forms) item.sync();
    syncComposer();
    if (state.status.model_service) {
      request.controls.provider.value = state.status.model_service.provider;
      request.controls.model.value = state.status.model_service.model;
      request.controls.provider.readOnly = true; request.controls.model.readOnly = true;request.controls.provider.parentElement.hidden=true;request.controls.model.parentElement.hidden=true;serviceNote.textContent=`使用已配置服务：${state.status.model_service.provider} / ${state.status.model_service.model}`;
    }

    if (dataProject !== state.status.project || dataGeneration!==(state.formsGeneration??0)) { dataProject = state.status.project;dataGeneration=state.formsGeneration??0; const selected = state.forms.get(JSON.stringify([dataProject,"allowed_data"])) ?? []; dataControls.forEach(control => { control.checked = selected.includes(control.name); }); }
    const key=JSON.stringify([state.status.project,state.selectedRequestId,"combination"]);if(combinationScope!==key||combinationGeneration!==(state.formsGeneration??0)){combinationScope=key;combinationGeneration=state.formsGeneration??0;const saved=state.forms.get(key);selectedCombination.splice(0,selectedCombination.length,...(saved?.selections??[]));combinationText.value=saved?.raw_text??"";if(saved?.source_draft_id)queueMicrotask(()=>{if(combinationScope===key&&state.selectedRequestId)actions.inspectCombination(saved.source_draft_id);});}
    section.dataset.view=state.creationView;
    const workspace = state.workspace, selected = workspace?.requests.find(item => item.authorization.request_id === state.selectedRequestId), draft = selected?.drafts.find(item => item.draft_id === state.selectedDraftId), rendered = draft?.renders.find(item => item.render_id === state.selectedRenderId);
    const historyIdentity=JSON.stringify([selected?.drafts.map(item=>[item.draft_id,item.timeline_version,item.renders.length]),state.selectedDraftId,selected?.viewed_draft_id,selected?.adopted_draft_id,state.previewCoverRevision]);
    historyList.dataset.selectedDraftId=state.selectedDraftId;views.get("drafts").classList.add("history-view");
    if(historyList.dataset.identity!==historyIdentity){const focusedCard=historyList.contains(document.activeElement)?document.activeElement.dataset.creationDraft:null;historyList.dataset.identity=historyIdentity;historyList.replaceChildren(...[...(selected?.drafts??[])].reverse().map(item=>{const card=button("",()=>actions.selectDraft(item.draft_id),"history-version"),labels=[item.draft_id===selected.adopted_draft_id?"已采用":"",item.draft_id===selected.viewed_draft_id?"已观看":"",item.draft_id===selected.latest_draft_id?"最新草稿":""].filter(Boolean);card.dataset.creationDraft=item.draft_id;card.dataset.timelineVersion=String(item.timeline_version);card.setAttribute("aria-pressed",String(item.draft_id===state.selectedDraftId));card.setAttribute("aria-label",`选择作品 v${item.timeline_version} · ${labels.join(" · ")||`对应要求 ${item.revision}`}`);const render=item.renders.at(-1),covers=render?state.previewCovers?.get(JSON.stringify([state.status.project,item.draft_id,render.render_id,render.preview.output_hash])):null;const cover=node("div","","history-cover");if(covers?.length){for(const frame of covers.slice(0,4)){const image=node("img");image.src=frame.image;image.alt=`作品 v${item.timeline_version} 的实际预览帧`;cover.append(image);}}else cover.append(node("span",item.renders.length?"观看后显示实际画面":"尚无可播放画面"));card.append(cover);card.append(node("strong",`v${item.timeline_version} · ${item.source.kind==="manual"?"手动精修":"创作草稿"}`),node("span",labels.join(" · ")||`对应要求 ${item.revision}`),node("small",item.renders.length?"画面已就绪":"尚无可播放画面"));return card;}));if(focusedCard)[...historyList.children].find(card=>card.dataset.creationDraft===focusedCard)?.focus({preventScroll:true});}
    const phases={admission:"核对创作范围","material-preparation":"准备获准素材",observation:"分析画面与声音","generation-and-commit":"生成与校验初稿","preview-master-render":"制作预览与成片","authorized-feedback-learning":"整理获准的反馈经验"};
    summary.textContent = ["failed","cancelled"].includes(selected?.status) ? statusLabels[selected.status] : selected?.production ? phases[selected.production.phase]??selected.production.phase : workspace ? `v${workspace.timeline_version} · ${statusLabels[selected?.status] ?? "未选择请求"}` : "尚未读取工作区";
    options(requestSelect, (workspace?.requests ?? []).map(item => [item.authorization.request_id, `${item.authorization.original_text.slice(0,50)} · ${statusLabels[item.status] ?? item.status}`]), state.selectedRequestId);
    options(request.controls.asset_ids, authorizationAssets(state.media).map((item, index) => [item.asset_id, `${index + 1}. ${item.display_name ?? "素材"}`]), request.saved().asset_ids ?? [], true);
    authorizationSummary.textContent=`素材与授权范围 · ${request.controls.asset_ids.selectedOptions.length} 份素材 / ${dataControls.filter(item=>item.checked).length} 类数据`;
    if (!selected && !request.controls.asset_ids.selectedOptions.length) authorizationDetails.open = true;
    const context=entryContext();dataGuide.textContent=`自动分析和制作必需：本次要求、当前作品、素材观察、抽帧。${dataControls.find(control=>control.name==="audio").checked?"已启用音频分析，还需确认转写。":"音频分析可选；启用时还需确认转写。"}${context.hasCaptions?"当前作品含非编辑字幕，还需确认转写。":""}${context.useProfile?"本次使用档案查询，还需确认个性化原则。":""}`;
    options(compareSelect,(selected?.drafts??[]).filter(item=>item.draft_id!==state.selectedDraftId).map(item=>[item.draft_id,`作品 v${item.timeline_version}`]),compareSelect.value);
    options(combinationSource,(selected?.drafts??[]).map(item=>[item.draft_id,`作品 v${item.timeline_version}`]),state.forms.get(combinationScope)?.source_draft_id??"");
    combinationClips.replaceChildren();
    if(state.combinationSource?.draft_id===combinationSource.value)for(const track of state.combinationSource.timeline.tracks)for(const [index,clip]of track.clips.entries()){if(track.kind!=="video")continue;const add=button(`加入镜头 ${index+1}`,()=>{selectedCombination.push({draft_id:combinationSource.value,clip_id:clip.clip_id});saveCombination();update();});add.disabled=selectedCombination.some(item=>item.draft_id===combinationSource.value&&item.clip_id===clip.clip_id);combinationClips.append(add);}
    combinationList.replaceChildren(...selectedCombination.map((item,index)=>{const version=selected?.drafts.find(draft=>draft.draft_id===item.draft_id)?.timeline_version;return button(`${index+1}. 来自 v${version} 的镜头 · 移除`,()=>{selectedCombination.splice(index,1);saveCombination();update();});}));
    compareButton.disabled=!draft||!compareSelect.value;combinationSubmit.disabled=!selectedCombination.length||!draft||!state.authorityCurrent||draft.timeline_version!==state.timeline?.version||state.pending.has("combine");const adoption=actions.adoptionAvailability(),adoptionBusy=["adopt","undo-adopt","redo-adopt"].some(key=>state.pending.has(key));undo.disabled=!adoption.undo||adoptionBusy;redo.disabled=!adoption.redo||adoptionBusy;
    options(renderSelect, (draft?.renders ?? []).map((item, index) => [item.render_id, `输出 ${index + 1} · 预览 ${qcLabel(item.preview.qc.status)} / 成片 ${qcLabel(item.master.qc.status)}`]), state.selectedRenderId);
    const clipOptions=(state.timeline?.tracks ?? []).flatMap(track=>track.clips.map((clip,index)=>[clip.clip_id,`${track.kind==="video"?"镜头":"音频"} ${index+1}`]));
    const protectionOptions=[...clipOptions,...(state.timeline?.tracks??[]).flatMap(track=>(track.captions??[]).map(caption=>[caption.caption_id,`字幕：${caption.text}`]))];
    for(const target of [request,revise,manual,precision]) { const key=target===request?"protected_refs":"preserve_refs";options(target.controls[key],protectionOptions,target.saved()[key]??[],true);target.controls[key].parentElement.hidden=protectionOptions.length===0; }
    const managementPrinciples=workspace?.profile?workspace.profile.management_principles:[];
    const savedAllowedData=state.forms.get(JSON.stringify([state.status.project,"allowed_data"]));
    for(const control of dataControls){
      if(Array.isArray(savedAllowedData))control.checked=savedAllowedData.includes(control.name);
      else control.checked=control.name==="feedback"?(workspace?.profile?.consent?.enabled??true):false;
    }
    options(query.controls.exceptions,managementPrinciples.map(item=>[item.principle_id,item.statement]),query.saved().exceptions??[],true);
    options(learn.controls.correction_ids,managementPrinciples.map(item=>[item.principle_id,item.statement]),learn.saved().correction_ids??[],true);
    const sourceIds=[...new Set([...(workspace?.profile?.consent?.source_project_ids??[]),...managementPrinciples.map(item=>item.source_project_id),...(workspace?.profile?.registrations??[]).map(item=>item.source_project_id),...(state.status.project!=="not-open"?[state.status.project]:[])])];
    const sourceOptions=sourceIds.map((id,index)=>[id,id===state.status.project?"当前作品":`已授权来源作品 ${index+1}`]);
    options(forgetPrinciples.controls.principle_ids,managementPrinciples.map(item=>[item.principle_id,`${item.statement} · ${item.contexts.join("、")} · ${sourceOptions.find(([id])=>id===item.source_project_id)?.[1]??"来源作品"}`]),forgetPrinciples.saved().principle_ids??[],true);
    options(configure.controls.source_project_ids,sourceOptions,configure.saved().source_project_ids??[],true);options(forget.controls.source_project_ids,sourceOptions,forget.saved().source_project_ids??[],true);
    options(configure.controls.data_types,[["feedback","对话反馈"],["manual_diff","手动精修"],["selection","版本采用"],["history_reference","获准历史"]],configure.saved().data_types??[],true);
    const consentProvider=configure.saved().external_provider??workspace?.profile?.consent?.external_provider??"",configuredProvider=state.status.model_service?.provider;
    const providerOptions=configuredProvider?[[configuredProvider,"允许使用当前已配置的创作模型服务"]]:[];
    if(consentProvider&&consentProvider!==configuredProvider)providerOptions.push([consentProvider,"此前选定的服务（当前未配置，请重新选择）"]);
    options(configure.controls.external_provider,providerOptions,consentProvider);configure.controls.external_provider.options[0].textContent="不允许向模型服务发送档案学习数据";
    configure.controls.enabled.checked=configure.saved().enabled??workspace?.profile?.consent?.enabled??true;
    options(captions.controls.caption_target,(state.timeline?.tracks??[]).flatMap(track=>(track.captions??[]).map((caption,index)=>[JSON.stringify([track.track_id,caption.caption_id]),`${index+1}. ${caption.text}`])),captions.saved().caption_target??"");
    manual.element.querySelector("h3").textContent=`精修当前编辑版 v${state.timeline?.version??0}${state.displayedPreviewTimeline&&state.displayedPreviewTimeline.version!==state.timeline?.version?`（正在看片 v${state.displayedPreviewTimeline.version}）`:""}`;
    restoreButton.disabled=!draft||draft.timeline_version===state.timeline?.version||state.pending.has("restore");const editAvailable=actions.editAvailability();undoEdit.disabled=!editAvailable.undo||draft?.timeline_version!==state.timeline?.version||state.pending.has("restore");redoEdit.disabled=!editAvailable.redo||draft?.timeline_version!==state.timeline?.version||state.pending.has("restore");
    const precisionClips=(state.timeline?.tracks??[]).flatMap(track=>track.clips.map((clip,index)=>[JSON.stringify([track.track_id,clip.clip_id]),`${track.kind==="video"?"画面":"音频"} ${index+1} · ${clip.clip_id}`]));
    options(precision.controls.target,precisionClips,precision.saved().target??"");options(precision.controls.picture,precisionClips.filter(([value])=>state.timeline?.tracks.find(t=>t.track_id===JSON.parse(value)[0])?.kind==="video"),precision.saved().picture??"");
    options(precision.controls.source,(state.precisionSources??[]).map((source,index)=>[JSON.stringify(source),`${index+1} · ${source.media_kind} · ${source.span_id}`]),precision.saved().source??"");
    options(precision.controls.caption,[["","新增字幕"],...(state.timeline?.tracks??[]).flatMap(track=>(track.captions??[]).map(c=>[JSON.stringify([track.track_id,c.caption_id]),c.text]))],precision.saved().caption??"");
    precisionSources.disabled=!draft||draft.timeline_version!==state.timeline?.version||state.pending.has("precision-sources");showPrecisionFields(precision.controls);
    options(manual.controls.target, (state.timeline?.tracks ?? []).flatMap(track => track.clips.map((clip, index) => [JSON.stringify([track.track_id,clip.clip_id]), `${track.kind === "video" ? "画面" : "音频"} · 第 ${index + 1} 个片段`])), manual.saved().target ?? "");
    const persistedAnnotations=selected?.timeline_annotations??[];
    const conversationIdentity=JSON.stringify([selected?.authorization.request_id,selected?.revisions,persistedAnnotations,summary.textContent],(_,value)=>typeof value==="bigint"?String(value):value);
    if(revisions.dataset.identity!==conversationIdentity){const conversationView=views.get("request"),atEnd=conversationView.scrollHeight-conversationView.scrollTop-conversationView.clientHeight<40;revisions.dataset.identity=conversationIdentity;
      const combinedRevisions=new Set(persistedAnnotations.filter(message=>message.schema_version===3).map(message=>JSON.stringify([message.expected_revision+1,message.request_text])));
      const entries=[...(selected?.revisions??[]).filter(item=>!combinedRevisions.has(JSON.stringify([item.revision,item.raw_text]))).map(item=>({kind:"request",order:item.conversation_revision,value:item})),...persistedAnnotations.map(message=>({kind:"annotation",order:message.conversation_revision,value:message}))];
      if(entries.some(item=>!Number.isSafeInteger(item.order)||item.order<1))throw new Error("对话记录缺少 Host 顺序身份，未展示未绑定消息。");
      entries.sort((left,right)=>left.order-right.order);
      revisions.replaceChildren(...entries.flatMap(item=>{
        if(item.kind==="request"){const value=item.value,entry=node("article","","conversation-entry message user");entry.dataset.role="user";entry.append(node("span",`你 · 要求 ${value.revision}`,"conversation-author"),node("p",value.raw_text,"stage2-copy"));if(value.preserve_refs.length)entry.append(node("p",`保留：${value.preserve_refs.map(ref=>protectionOptions.find(item=>item[0]===ref)?.[1]??"已记录的保护对象").join("、")}`,"muted"));return entry;}
        const message=item.value,entry=node("article","","conversation-entry message user");entry.dataset.role="user";entry.append(node("span",message.schema_version===3?`你 · 创作要求与时间线批注 · v${message.timeline_version}`:`你 · 历史时间线批注 · v${message.timeline_version}`,"conversation-author"));
        if(message.schema_version===3)entry.append(node("p",message.request_text,"stage2-copy"));
        const task=message.processing;
        if(task?.status==="queued")entry.append(node("p","消息已保存，等待制作处理。","conversation-status"));
        else if(task?.status==="processing")entry.append(node("p","正在按整体要求和锚点批注调整作品，并制作预览与成片。","conversation-status"));
        else if(task?.status==="failed")entry.append(node("p",`处理失败 · ${task.failure?.code??"未知错误"}：${task.failure?.message??"请重试原组合任务。"}`,"conversation-status"));
        else if(task?.status==="resolved")entry.append(node("p",`已完成 · 草稿 ${task.result.draft_id} · Timeline v${task.result.timeline_version} · 渲染 ${task.result.render_id}`,"conversation-status"));
        else if(task?.status==="superseded")entry.append(node("p","已重新打开编辑；原失败记录保留在历史中。","conversation-status"));
        else if(message.schema_version!==3)entry.append(node("p","历史消息已保存；旧协议没有关联处理任务。","muted"));
        for(const annotation of message.annotations??[]){const card=node("section","","timeline-annotation-message"),resolution=annotation.anchor_resolution,point=annotation.anchor?.preview_point,surface=annotation.anchor?.surface==="preview"&&point?`预览画面 · ${Math.round(point.x*100)}% 横向 · ${Math.round(point.y*100)}% 纵向`:`时间线 · ${annotation.anchor?.track_id??"锚点"}`;card.append(node("p",annotation.body,"stage2-copy"),node("small",surface,"muted"));
          if(["current","mapped"].includes(resolution?.status)&&resolution.timeline_version===state.timeline?.version&&resolution.start_ticks!==null){card.append(node("small",`${resolution.status==="mapped"?"已按唯一片段来源映射":"当前锚点"} · ${resolution.clip_id??resolution.track_id}`,"muted"),button("定位到批注",()=>actions.timelineSeek?.(BigInt(resolution.start_ticks)),"ghost"));}
          else card.append(node("small",`原锚点 v${message.timeline_version} · 位置未能唯一映射`,"timeline-annotation-unresolved"));
          entry.append(card);
        }
        const response=node("article","","message assistant");response.dataset.role="assistant";response.dataset.processingStatus=task?.status??"historical";response.append(node("strong","AVE · 处理状态"));
        const status=entry.querySelector(".conversation-status");if(status)response.append(status);
        if(task?.status==="failed"){const sameRequest=selected?.authorization?.request_id===message.request_id;if(sameRequest&&Date.parse(selected.authorization.expires_at)<=Date.now())response.append(button("重新确认原请求授权（范围不变）",()=>actions.reauthorizeRequest?.(message.request_id),"secondary"));response.append(button("重试此任务",()=>actions.retryTimelineAnnotationMessage?.(message.operation_id),"secondary"),button("重新打开编辑",()=>actions.reopenFailedTimelineAnnotations?.(message.operation_id),"ghost"));}
        return task?[entry,response]:[entry];
      }));
      const live=node("article","","message assistant");live.dataset.role="assistant";live.append(node("strong","AVE"),node("p",selected?summary.textContent:"从你的素材和想法开始。发送要求后，AVE 会在授权范围内制作初稿。","conversation-status"));revisions.append(live);if(atEnd)queueMicrotask(()=>{conversationView.scrollTop=conversationView.scrollHeight;});
    }
    const annotationQueueKey=selected?JSON.stringify([state.status.project,selected.authorization.request_id,"timeline-annotation-drafts"]):"";
    const savedAnnotationQueue=annotationQueueKey?state.forms.get(annotationQueueKey):undefined;
    const queuedAnnotations=savedAnnotationQueue?.annotations??[];
    const queueIdentity=JSON.stringify([annotationQueueKey,savedAnnotationQueue??null]);
    if(annotationQueueSignature!==queueIdentity){annotationQueueSignature=queueIdentity;annotationDraftList.replaceChildren(...queuedAnnotations.map((annotation,index)=>{
      const item=node("article","","timeline-annotation-draft"),anchor=annotation.anchor,point=anchor.preview_point,label=anchor.surface==="preview"&&point?`${index+1}. 预览画面 · ${Math.round(point.x*100)}% 横向 · ${Math.round(point.y*100)}% 纵向 · ${anchor.start.value}/${anchor.start.timescale} 秒`:`${index+1}. ${anchor.track_id} · ${anchor.clip_id??"轨道位置"} · ${anchor.start.value}/${anchor.start.timescale} 秒`;
      const heading=node("div","","button-row");heading.append(node("strong",label),button("编辑",()=>editAnnotation(annotation,body=>{actions.updateTimelineAnnotation?.(annotation.annotation_id,body);update();}),"ghost"),button("重新定位",()=>actions.relocateTimelineAnnotation?.(annotation.annotation_id),"ghost"),button("移除此条",()=>actions.removeTimelineAnnotation?.(annotation.annotation_id),"ghost"));
      const body=node("p",annotation.body||"尚未填写批注正文","stage2-copy");
      item.append(heading,body);return item;
    }));}
    const annotationSendPending=state.pending.has("timeline-annotation-send"),annotationSubmissionPending=Boolean(savedAnnotationQueue?.submission);
    const failedSubmission=savedAnnotationQueue?.submission?.schema_version===3?selected?.timeline_annotations?.find(message=>message.operation_id===savedAnnotationQueue.submission.operation_id&&message.processing?.status==="failed"):null;
    const latestFailedSubmission=failedSubmission??selected?.timeline_annotations?.filter(message=>message.schema_version===3&&message.processing?.status==="failed").at(-1)??null;
    annotationQueue.hidden=!selected||queuedAnnotations.length===0;
    for(const control of annotationDraftList.querySelectorAll("textarea,button"))control.disabled=annotationSendPending||annotationSubmissionPending;
    clearAnnotationQueue.disabled=queuedAnnotations.length===0||annotationSendPending||annotationSubmissionPending;
    reopenAnnotationQueue.dataset.operationId=latestFailedSubmission?.operation_id??"";reopenAnnotationQueue.hidden=!latestFailedSubmission;reopenAnnotationQueue.disabled=annotationSendPending||state.pending.has("timeline-annotation-reopen");
    annotationQueueHelp.hidden=queuedAnnotations.length===0;
    annotationQueueHelp.textContent=savedAnnotationQueue?.relocateAnnotationId?"已保留该条批注正文；请在预览画面或时间线上右键选择新的精确锚点。":"右键预览画面可添加带位置的画面批注；右键时间线片段或轨道空白处可添加时间锚点。填写整体要求后一次提交；批注正文与精确锚点会作为独立结构化上下文进入当前创作流程。";
    const canSendAnnotations=Boolean(selected&&draft&&state.authorityCurrent&&draft.timeline_version===state.timeline?.version&&(!state.displayedPreviewTimeline||state.displayedPreviewTimeline.version===state.timeline?.version)&&queuedAnnotations.length>0&&queuedAnnotations.length<=20&&queuedAnnotations.every(item=>typeof item.body==="string"&&item.body.trim())&&composerText.value.trim());
    sendAnnotationQueue.textContent=savedAnnotationQueue?.submission?"重试组合任务":"提交要求与批注";sendAnnotationQueue.disabled=!canSendAnnotations||annotationSendPending;
    materialList.replaceChildren(node("h3", "获准素材与分析记录"), ...(selected?.authorization.asset_ids ?? []).map(id => node("p", `${state.media.find(item => item.asset_id === id)?.display_name ?? "所选素材"} · ${selected.materials.some(item => item.asset_id === id) ? "已有准备记录" : "尚未准备"}`, "stage2-copy")), ...(selected?.observations ?? []).map(item => node("p", `意图 ${item.revision} · ${item.span_count} 个片段 · ${item.sample_count} 份采样 · ${item.evidence_count} 条证据`, "stage2-copy")));
    draftDetails.replaceChildren(node("p", draft ? `作品 v${draft.timeline_version} · 基于 v${draft.base_timeline_version} · 对应要求 ${draft.revision}\n${draft.source.kind === "manual" ? draft.source.raw_text : "由记录中的模型调用生成"}` : "生成后可在此选择、渲染和采用独立版本。", "stage2-copy"));
    if(draft&&!rendered)draftDetails.append(node("p","此版修改已保存，尚无可播放画面。点击“制作预览与成片”完成制作后再观看或导出。","stage2-copy"));
    if(draft?.soundtrack?.items.length){const sound=draft.soundtrack;draftDetails.append(node("p",`配乐来源：${sound.items.map(item=>`${item.title} / ${item.author} / ${item.license.spdx}`).join("；")}`,"stage2-copy"),...sound.reasons.map(reason=>node("p",`选曲理由：${reason}`,"stage2-copy")));
      const credits=node("textarea");credits.readOnly=true;credits.value=sound.publish_text||sound.source_text;credits.setAttribute("aria-label","发布署名文本");const copy=button("复制音频来源与署名",async()=>{try{await navigator.clipboard.writeText(credits.value);copy.textContent="署名已复制";}catch(error){reportError(error);credits.select();copy.textContent=`复制未完成：${error.message}；可选中文本复制`;}});draftDetails.append(credits,copy);
      for(const item of sound.alternatives){const choice=button(`试听替代：${item.title}`,()=>actions.libraryAlternative(item.resource_id));draftDetails.append(choice);}
    }
    if (rendered) {draftDetails.append(node("p", `预览检查：${qcLabel(rendered.preview.qc.status)} · 成片检查：${qcLabel(rendered.master.qc.status)}`, "stage2-copy"));const rows=creationQcRows(rendered);draftDetails.append(...rows.map(issue=>node("p",issue.text,"stage2-risk")));if(rows.length){const technical=node("details");technical.append(node("summary","技术检查记录"),...rows.map(issue=>node("p",`${issue.targets.join("/")} · ${issue.code} · ${issue.severity} · ${issue.blocker?"阻止导出":"不阻止导出"}`,"stage2-copy")));draftDetails.append(technical);}}
    const catalog=workspace?.profile_contexts;
    availableContexts.replaceChildren(node("h3","自学习帮助与开关"),node("p",({unconfigured:"自学习默认开启；首次提交反馈后，会按本作品、当前创作服务和30天期限建立本地档案范围。你可在下方关闭。",disabled:"自学习与档案使用已关闭。重新开启时需核对具体作品、数据和服务范围。",expired:"档案授权已到期；需重新核对范围。",empty:"目前没有已学习经验；获准反馈会形成可查看、可遗忘的情境经验。",available:"选择情境查询已有经验；当前要求始终优先于个人档案。"})[catalog?.mode]??"自学习默认开启；仅在明确授权反馈数据后生效。","stage2-copy"),node("p","默认范围：当前作品的对话反馈、已确认的创作模型服务、保留30天。不导入历史，不学习手动修改或版本采用。关闭后停止新的后台学习并禁用档案个性化；遗忘操作会移除已学习来源及其派生经验。","stage2-copy"));
    for(const context of catalog?.contexts??[]){const choose=button(`选用情境：${context}`,()=>{query.controls.contexts.value=context;query.save();});choose.dataset.profileContext=context;availableContexts.append(choose);}
    principles.replaceChildren(node("h3", workspace?.profile ? `经验状态：${({unconfigured:"尚未授权",disabled:"已关闭",empty:"还没有习惯",no_match:"没有适用经验",personalized:"已读取适用经验"})[workspace.profile.snapshot.mode]??workspace.profile.snapshot.mode}` : "未请求个人档案"), ...(workspace?.profile?.snapshot.principles ?? []).map(item => {const entry=node("div","","stage2-copy");entry.append(node("p",item.statement));const contexts=node("p",`适用情境：${item.contexts.join("、")}`);contexts.dataset.profileContexts=JSON.stringify(item.contexts);entry.append(contexts,button("使用这些情境查询",()=>{query.controls.contexts.value=item.contexts.join("，");query.save();actions.profileQuery(query.values());}));return entry;}), ...(selected?.learning ?? []).map(item => node("p", `学习记录：${({registered:"已纳入档案",unregistered:"待登记",excluded:"已排除"})[item.registration?.state] ?? (item.response_saved ? "结果已保存，尚未读取档案状态" : "尚无已保存结果")}`, "stage2-copy")));
    const chatView=["material","profile"].includes(state.creationView)?state.creationView:"request";
    for (const [key, view] of views) { view.hidden = key==="drafts"?state.workspacePage!=="history":chatView!==key; tabs.get(key).classList.toggle("active", chatView === key);view.classList.toggle("conversation-view",key==="request"); }
    title.querySelector("h2").textContent=({request:"对话",drafts:"历史版本",material:"制作记录",profile:"个人档案"})[state.creationView];
    for (const item of forms) item.submit.disabled = state.status.project === "not-open" || state.pending.has(item.id) || (["manual","caption","precision"].includes(item.id) && (state.pending.has("revise") || !state.authorityCurrent || draft?.timeline_version!==state.timeline?.version)) || (!selected && ["revise","manual","caption","precision","learn"].includes(item.id));
    forgetPrinciples.submit.disabled ||= managementPrinciples.length === 0;
    newRequest.hidden=state.status.project==="not-open";request.element.hidden=Boolean(selected);revise.element.hidden=!selected;requestSelect.hidden=(workspace?.requests.length??0)<2;
    produce.disabled=!selected || Boolean(selected?.active_run);exportPanel.disabled=!rendered;exportView.setProject(state.status.project);
    cancel.disabled = !selected || selected.status === "cancelled"; revoke.disabled = !selected || selected.revoked;
    prepare.disabled = !selected || state.pending.has("prepare"); observe.disabled = !selected || state.pending.has("observe") || Boolean(selected?.active_run); generate.disabled = !selected || state.pending.has("generate") || state.pending.has("revise") || !state.authorityCurrent || Boolean(selected?.active_run);
    render.hidden=Boolean(rendered);renderSelect.hidden=(draft?.renders.length??0)<2;render.disabled = !draft || state.pending.has("render"); preview.disabled = !rendered || state.pending.has("preview"); adopt.disabled = !draft || adoptionBusy || draft.draft_id === selected?.adopted_draft_id;
    retryRender.hidden = !state.failedRenderAttempts.has(JSON.stringify([state.status.project,state.selectedRequestId,state.selectedDraftId])); retryRender.disabled = render.disabled;
  }
  const annotationDialog=node("dialog","","annotation-dialog");annotationDialog.setAttribute("aria-label","编辑批注");
  const annotationForm=node("form"),annotationTitle=node("h2","添加批注"),annotationAnchor=node("p","","annotation-anchor-card"),annotationBody=node("textarea");annotationBody.required=true;annotationBody.setAttribute("aria-label","批注正文");
  const annotationCancel=button("取消",()=>annotationDialog.close()),annotationSave=node("button","加入待发送队列","primary");annotationSave.type="submit";
  annotationForm.append(annotationTitle,node("p","先收集批注，再与整体要求一起发送。","muted"),annotationAnchor,annotationBody,annotationCancel,annotationSave);annotationDialog.append(annotationForm);
  let annotationCommit=null,annotationOwner=null,annotationFocus=null;
  annotationForm.addEventListener("submit",event=>{event.preventDefault();if(!annotationBody.value.trim()||!annotationCommit)return;if(annotationOwner!==JSON.stringify([state.status.project,state.selectedRequestId,state.timeline?.version])){reportError("批注所属作品或版本已变化，请取消后重新定位；正文仍保留。");return;}try{annotationCommit(annotationBody.value.trim());annotationDialog.close();}catch(error){reportError(error);}});
  annotationDialog.addEventListener("close",()=>{annotationCommit=null;if(annotationFocus?.isConnected&&!annotationFocus.closest("[hidden],[inert]"))annotationFocus.focus({preventScroll:true});});
  function editAnnotation(annotation,commit){annotationFocus=document.activeElement;annotationOwner=JSON.stringify([state.status.project,state.selectedRequestId,state.timeline?.version]);annotationCommit=commit;annotationBody.value=annotation.body;const anchor=annotation.anchor;annotationAnchor.textContent=`${anchor.surface==="preview"?"预览画面":"时间线"} · ${anchor.clip_id??anchor.track_id} · ${anchor.start.value}/${anchor.start.timescale} 秒${anchor.preview_point?` · 画面 (${anchor.preview_point.x}, ${anchor.preview_point.y})`:""}`;annotationDialog.showModal();annotationBody.focus();}
  update(); return { node: section, dock, prepareRequestComposer, historyNode:views.get("drafts"), annotationDialog, editAnnotation, refinement, inspector, exportNode:exportView.node, setExportPageMode:exportView.setPageMode, closeExport:notify=>exportView.close(true,notify), destroy:()=>{annotationDialog.remove();for(const url of waveUrls.splice(0))URL.revokeObjectURL(url);wavePreview.replaceChildren();exportView.destroy();}, update, showExport, prepareAnnotationRestore(value){
    return annotationRecoveryComposerText(composerText.value,value.request_text);
  }, restoreAnnotationRequest(value){
    composerText.value=annotationRecoveryComposerText(composerText.value,value.request_text);saveComposer();const refs=new Set(value.preserve_refs??[]);for(const option of revise.controls.preserve_refs.options)option.selected=refs.has(option.value);
  }, referenceClip(selection){
    const sourceTimeline=state.displayedPreviewTimeline??state.timeline;if(selection.timeline_version!==sourceTimeline?.version)throw new Error("所选镜头不属于当前观看版本，请重新选择镜头。");const track=sourceTimeline?.tracks.find(item=>item.track_id===selection.track_id),index=track?.clips.findIndex(item=>item.clip_id===selection.clip_id);if(index===undefined||index<0)return;
    composerText.value+=(composerText.value?"\n":"")+"关于作品 v"+sourceTimeline.version+" 的"+(track.kind==="video"?"镜头":"音频")+" "+(index+1)+"：";saveComposer();composerText.focus();composerText.setSelectionRange(composerText.value.length,composerText.value.length);
  },refineClip(selection){refinement.open=true;if(selection){manual.controls.target.value=JSON.stringify([selection.track_id,selection.clip_id]);manual.save();precision.controls.target.value=JSON.stringify([selection.track_id,selection.clip_id]);precision.save();}scrollTo(precision.element);} };

}
