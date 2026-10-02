import { exportDialog } from "./export-dialog.js";
export function creationQcRows(rendered) {
  const grouped=new Map();
  for(const [key,target] of [["preview","预览"],["master","成片"]])for(const issue of rendered[key].qc.issues){const identity=JSON.stringify([issue.code,issue.severity,issue.blocker]);if(!grouped.has(identity))grouped.set(identity,{...issue,targets:[]});grouped.get(identity).targets.push(target);}
  return [...grouped.values()].map(issue=>({...issue,text:`${issue.targets.join("与")}：${issue.code==="SILENCE"?`检测到静音（${issue.blocker?"未通过检查，请核对声音":"提示，此项不阻止导出"}）`:`${issue.blocker?"未通过检查":"检查提示"} · ${issue.code}（${({warning:"警告",error:"错误",info:"信息"})[issue.severity]??issue.severity}）`}`}));
}
const statusLabels = { received: "已收到", adjusting: "正在调整", rendering: "正在渲染", watchable: "可以看片", paused: "已暂停", cancelled: "已取消", failed: "制作失败", superseded: "已有新要求" };
const qcLabel = value => value === "passed" ? "通过" : value === "failed" ? "未通过" : value;
export const creationDataLabels = { request: "本次要求", timeline: "当前作品", evidence: "素材观察", frames: "抽帧", audio: "音频", transcript: "转写", profile: "个性化原则" };
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
const button = (label, action, tone = "secondary") => { const value = node("button", label, tone); value.type = "button"; value.addEventListener("click", action); return value; };
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
  const composer=node("div","","creation-composer"),composerHome=node("div","","composer-home"),dock=node("div","","dock-composer");
  dock.setAttribute("aria-label","随时输入修改意见");
  const reopen=button("完整对话",()=>actions.showView("request"),"ghost");dock.append(reopen);
  const closePanel=button("收起",()=>actions.toggleConversation(),"ghost");heading.append(closePanel);
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
    element.addEventListener("submit", event => { event.preventDefault(); if (submit.disabled) return; save(); if (element.reportValidity()) action(values()); });
    forms.push({ id, submit, sync: () => {
      const key = JSON.stringify([state.status.project, scope === "project" ? "" : state.selectedRequestId, id]);
      if (activeScope === key && activeGeneration===(state.formsGeneration??0)) return; if(activeGeneration===(state.formsGeneration??0))save(); activeScope = key;activeGeneration=state.formsGeneration??0;
      const prior = state.forms.get(key) ?? {};
      for (const [name, , , initial = ""] of fields) { const control = controls[name]; if (control.type === "checkbox") control.checked = prior[name] ?? Boolean(initial); else if (!control.multiple) control.value = prior[name] ?? initial; }
    } });
    return { element, controls, submit, values, save, saved: () => state.forms.get(activeScope) ?? {} };
  }
  const request = form("request", "begin", "告诉我，你想怎样讲这个故事", [
    ["original_text", "创作要求（保留原话）", "textarea"], ["asset_ids", "本次允许使用的素材", "select"],
    ["provider", "模型服务"], ["model", "模型名称"], ["audio_library", "使用内置免费音频库自动配乐（可手动替换，音效需明确请求）", "checkbox"],
    ["expires_at", "本次授权有效至", "datetime-local", new Date(Date.now()+86400000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)], ["protected_refs", "保护这些镜头（可选）", "select"],
  ], "授权并开始制作", values => actions.begin({ ...values, allowed_data: dataControls.filter(control => control.checked).map(control => control.name) }), "project");
  request.controls.asset_ids.multiple = true; request.controls.protected_refs.multiple = true;
  const authorizationDetails=node("details"),authorizationSummary=node("summary","本次创作的素材、服务与权限"); authorizationDetails.append(authorizationSummary);authorizationDetails.open=false;const serviceNote=node("p","","model-service-note");authorizationDetails.append(serviceNote);
  for(const name of ["asset_ids","provider","model","expires_at","protected_refs","audio_library"]) authorizationDetails.append(request.controls[name].parentElement);
  request.element.insertBefore(authorizationDetails,request.submit);
  const allAssets=button("选择全部已导入素材",()=>{for(const option of request.controls.asset_ids.options)option.selected=true;request.save();});authorizationDetails.insertBefore(allAssets,request.controls.asset_ids.parentElement);
  const scopeNote=node("p","授权后自动准备、分析、生成与渲染；制作时仍可继续补充要求。","muted");request.element.insertBefore(scopeNote,authorizationDetails);request.element.insertBefore(request.submit,authorizationDetails);
  const dataFieldset = node("fieldset"), dataControls = [];
  dataFieldset.append(node("legend", "允许发送给模型的数据"));
  for (const [key, label] of Object.entries(creationDataLabels)) { const input = node("input"); input.type = "checkbox"; input.name = key; const wrapper = node("label", label); wrapper.prepend(input); dataFieldset.append(wrapper); dataControls.push(input); input.addEventListener("change", () => {state.forms.set(JSON.stringify([state.status.project,"allowed_data"]), dataControls.filter(control => control.checked).map(control => control.name));actions.saveUi();}); }
  authorizationDetails.append(dataFieldset);
  const revise = form("request", "revise", "补充要求或纠正理解", [["raw_text", "补充或纠正的原话", "textarea"], ["preserve_refs", "保护这些镜头（可选）", "select"]], "提交并继续制作", actions.revise);
  revise.controls.preserve_refs.multiple=true;
  const requestActions = node("div", "", "button-row"), cancel = button("取消当前制作", () => actions.cancel(false)), revoke = button("撤销本次授权", () => actions.cancel(true)); requestActions.append(cancel, revoke); views.get("request").append(requestActions);
  const revisions = node("div", "", "conversation-log");revisions.setAttribute("role","log");revisions.setAttribute("aria-label","修改意见与制作动态");
  const reviseSettings=node("details","","composer-settings");reviseSettings.append(node("summary","保护镜头与授权操作"),revise.controls.preserve_refs.parentElement,requestActions);
  revise.element.append(reviseSettings);request.element.classList.add("composer-form");revise.element.classList.add("composer-form");
  request.controls.original_text.placeholder="告诉 AVE，你想讲怎样的故事…";revise.controls.raw_text.placeholder="想怎么改？也可以先选中一个镜头。";
  request.controls.original_text.parentElement.classList.add("composer-input");revise.controls.raw_text.parentElement.classList.add("composer-input");
  composer.append(request.element,revise.element);composerHome.append(composer);views.get("request").append(revisions,composerHome);
  for(const field of [request.controls.original_text,revise.controls.raw_text])field.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!event.repeat)field.form.requestSubmit();}});
  const materialList = node("div", "", "stage2-section"), includeAudio = node("input"); includeAudio.type = "checkbox";
  const audioLabel = node("label", "此次分析包含获准音频"); audioLabel.prepend(includeAudio);
  const produce = button("继续制作可播放版本",()=>actions.produce(),"primary"); views.get("material").append(produce);
  const prepare = button("准备获准素材", actions.prepare), observe = button("分析真实素材", () => actions.observe(includeAudio.checked)), generate = button("生成可编辑初稿", actions.generate, "primary");
  const technical=node("details"),technicalSummary=node("summary","分阶段制作与诊断");technical.append(technicalSummary,audioLabel,prepare,observe,generate);views.get("material").append(materialList,technical);
  const historyList=node("div","","history-list");historyList.setAttribute("aria-label","已保存的作品版本");views.get("drafts").append(historyList);
  const renderSelect = node("select"); renderSelect.setAttribute("aria-label", "渲染版本"); renderSelect.dataset.creation = "render-select"; renderSelect.addEventListener("change", () => actions.selectRender(renderSelect.value));
  const draftDetails = node("div", "", "stage2-section"), render = button("制作预览与成片", actions.renderDraft, "primary"), preview = button("观看此版", actions.loadPreview), adopt = button("采用此版", actions.adopt);
  const retryRender = button("原因修正后，开始新渲染尝试", actions.retryRender);
  const versionActions=node("div","","button-row version-actions");versionActions.append(render,retryRender,preview,adopt);const selectedVersion=node("div","","selected-version-actions");selectedVersion.append(renderSelect,draftDetails,versionActions);views.get("drafts").append(selectedVersion);
  const exportView=exportDialog(identity=>actions.exportDraft(identity));
  const showExport=()=>{const selected=state.workspace?.requests.find(item=>item.authorization.request_id===state.selectedRequestId),draft=selected?.drafts.find(item=>item.draft_id===state.selectedDraftId),render=draft?.renders.find(item=>item.render_id===state.selectedRenderId);if(!render)return;const cover=state.previewCovers?.get(JSON.stringify([state.status.project,draft.draft_id,render.render_id,render.preview.output_hash]))?.[0]?.image;exportView.open({project_id:state.status.project,request_id:selected.authorization.request_id,draft_id:draft.draft_id,render_id:render.render_id,timeline_version:draft.timeline_version,preview_qc:qcLabel(render.preview.qc.status),master_qc:qcLabel(render.master.qc.status),cover});};
  const exportPanel=button("导出所选作品",showExport,"ghost");selectedVersion.append(exportPanel);
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
  const refinement=node("details","","refinement-panel");refinement.append(node("summary","精修镜头与字幕"),manual.element,captions.element);
  captions.controls.caption_target.addEventListener("change",()=>{const target=JSON.parse(captions.controls.caption_target.value||"null"),caption=state.timeline?.tracks.find(track=>track.track_id===target?.[0])?.captions.find(caption=>caption.caption_id===target?.[1]);if(caption){captions.controls.caption_text.value=caption.text;captions.save();}});
  const query = form("profile", "profile-query", "本项目使用哪些经验", [["contexts", "适用情境（逗号分隔）"], ["exceptions", "这次不采用的习惯（可选）", "select"]], "读取适用经验", actions.profileQuery, "project");
  query.controls.exceptions.multiple=true;
  query.element.append(button("仅查看项目", () => actions.profileQuery(null)));
  const availableContexts=node("div","","stage2-section");availableContexts.setAttribute("aria-label","档案中可用的情境");const principles = node("div", "", "stage2-section"); views.get("profile").append(availableContexts,principles);
  const configure = form("profile", "profile-configure", "学习与保留范围", [["source_project_ids", "允许从哪些作品学习", "select"], ["data_types", "允许学习的操作", "select"], ["external_provider", "档案学习使用的模型服务", "select"], ["retention_until", "保留截止时间", "datetime-local", new Date(Date.now()+30*86400000-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)], ["enabled", "启用学习", "checkbox"]], "核对学习范围", actions.configureProfile, "project");
  configure.controls.source_project_ids.multiple=true;configure.controls.data_types.multiple=true;
  const learn = form("profile", "learn", "将选定经验纳入档案", [["kind", "经验类型", "select"], ["raw_text", "历史或手动经验说明", "textarea"], ["correction_ids", "明确纠正哪些习惯（可选）", "select"]], "学习所选经验", actions.learn);
  learn.controls.correction_ids.multiple=true;
  options(learn.controls.kind, [["selection","采用所选版本"],["feedback","所选版本对应的反馈"],["manual_diff","所选手动修改"],["history_reference","当前项目的获准历史或参考"]], "");
  const forget = form("profile", "forget", "遗忘作品带来的经验", [["source_project_ids", "要遗忘的来源作品", "select"]], "核对并遗忘", actions.forget, "project");
  forget.controls.source_project_ids.multiple=true;
  const forgetPrinciples=form("profile","forget-principles","撤回这次学习产生的经验",[["principle_ids","要撤回的经验","select"]],"核对关联影响并撤回",actions.forget,"project");forgetPrinciples.controls.principle_ids.multiple=true;forgetPrinciples.element.append(node("p","同一次学习产生的相关经验及依赖它们的纠正后继也会被排除。确认窗口会列出实际影响范围；此前作品仍保留。","stage2-copy"));
  let dataProject = null,dataGeneration=-1,combinationScope="",combinationGeneration=-1;
  const saveCombination=()=>{if(!combinationScope)return;state.forms.set(combinationScope,{source_draft_id:combinationSource.value,raw_text:combinationText.value,selections:selectedCombination.map(item=>({...item}))});actions.saveUi();};
  function update() {
    for (const item of forms) item.sync();
    if (state.status.model_service) {
      request.controls.provider.value = state.status.model_service.provider;
      request.controls.model.value = state.status.model_service.model;
      request.controls.provider.readOnly = true; request.controls.model.readOnly = true;request.controls.provider.parentElement.hidden=true;request.controls.model.parentElement.hidden=true;serviceNote.textContent=`使用已配置服务：${state.status.model_service.provider} / ${state.status.model_service.model}`;
    }

    if (dataProject !== state.status.project || dataGeneration!==(state.formsGeneration??0)) { dataProject = state.status.project;dataGeneration=state.formsGeneration??0; const selected = state.forms.get(JSON.stringify([dataProject,"allowed_data"])) ?? []; dataControls.forEach(control => { control.checked = selected.includes(control.name); }); }
    const key=JSON.stringify([state.status.project,state.selectedRequestId,"combination"]);if(combinationScope!==key||combinationGeneration!==(state.formsGeneration??0)){combinationScope=key;combinationGeneration=state.formsGeneration??0;const saved=state.forms.get(key);selectedCombination.splice(0,selectedCombination.length,...(saved?.selections??[]));combinationText.value=saved?.raw_text??"";if(saved?.source_draft_id)queueMicrotask(()=>{if(combinationScope===key&&state.selectedRequestId)actions.inspectCombination(saved.source_draft_id);});}
    authorizationSummary.textContent=`素材与授权范围 · ${request.controls.asset_ids.selectedOptions.length} 份素材 / ${dataControls.filter(item=>item.checked).length} 类数据`;
    section.dataset.view=state.creationView;
    const workspace = state.workspace, selected = workspace?.requests.find(item => item.authorization.request_id === state.selectedRequestId), draft = selected?.drafts.find(item => item.draft_id === state.selectedDraftId), rendered = draft?.renders.find(item => item.render_id === state.selectedRenderId);
    const historyIdentity=JSON.stringify([selected?.drafts.map(item=>[item.draft_id,item.timeline_version,item.renders.length]),state.selectedDraftId,selected?.viewed_draft_id,selected?.adopted_draft_id,state.previewCoverRevision]);
    historyList.dataset.selectedDraftId=state.selectedDraftId;views.get("drafts").classList.add("history-view");
    if(historyList.dataset.identity!==historyIdentity){const focusedCard=historyList.contains(document.activeElement)?document.activeElement.dataset.creationDraft:null;historyList.dataset.identity=historyIdentity;historyList.replaceChildren(...[...(selected?.drafts??[])].reverse().map(item=>{const card=button("",()=>actions.selectDraft(item.draft_id),"history-version"),labels=[item.draft_id===selected.adopted_draft_id?"已采用":"",item.draft_id===selected.viewed_draft_id?"已观看":"",item.draft_id===selected.latest_draft_id?"最新草稿":""].filter(Boolean);card.dataset.creationDraft=item.draft_id;card.dataset.timelineVersion=String(item.timeline_version);card.setAttribute("aria-pressed",String(item.draft_id===state.selectedDraftId));const render=item.renders.at(-1),covers=render?state.previewCovers?.get(JSON.stringify([state.status.project,item.draft_id,render.render_id,render.preview.output_hash])):null;const cover=node("div","","history-cover");if(covers?.length){for(const frame of covers.slice(0,4)){const image=node("img");image.src=frame.image;image.alt=`作品 v${item.timeline_version} 的实际镜头帧`;cover.append(image);}}else cover.append(node("span",item.renders.length?"观看后显示实际画面":"尚无可播放画面"));card.append(cover);card.append(node("strong",`v${item.timeline_version} · ${item.source.kind==="manual"?"手动精修":"创作草稿"}`),node("span",labels.join(" · ")||`对应要求 ${item.revision}`),node("small",item.renders.length?"画面已就绪":"尚无可播放画面"));return card;}));if(focusedCard)[...historyList.children].find(card=>card.dataset.creationDraft===focusedCard)?.focus({preventScroll:true});}
    const phases={admission:"核对创作范围","material-preparation":"准备获准素材",observation:"分析画面与声音","generation-and-commit":"生成与校验初稿","preview-master-render":"制作预览与成片","authorized-feedback-learning":"整理获准的反馈经验"};
    summary.textContent = ["failed","cancelled"].includes(selected?.status) ? statusLabels[selected.status] : selected?.production ? phases[selected.production.phase]??selected.production.phase : workspace ? `v${workspace.timeline_version} · ${statusLabels[selected?.status] ?? "未选择请求"}` : "尚未读取工作区";
    options(requestSelect, (workspace?.requests ?? []).map(item => [item.authorization.request_id, `${item.authorization.original_text.slice(0,50)} · ${statusLabels[item.status] ?? item.status}`]), state.selectedRequestId);
    options(request.controls.asset_ids, authorizationAssets(state.media).map((item, index) => [item.asset_id, `${index + 1}. ${item.display_name ?? "素材"}`]), request.saved().asset_ids ?? [], true);
    options(compareSelect,(selected?.drafts??[]).filter(item=>item.draft_id!==state.selectedDraftId).map(item=>[item.draft_id,`作品 v${item.timeline_version}`]),compareSelect.value);
    options(combinationSource,(selected?.drafts??[]).map(item=>[item.draft_id,`作品 v${item.timeline_version}`]),state.forms.get(combinationScope)?.source_draft_id??"");
    combinationClips.replaceChildren();
    if(state.combinationSource?.draft_id===combinationSource.value)for(const track of state.combinationSource.timeline.tracks)for(const [index,clip]of track.clips.entries()){if(track.kind!=="video")continue;const add=button(`加入镜头 ${index+1}`,()=>{selectedCombination.push({draft_id:combinationSource.value,clip_id:clip.clip_id});saveCombination();update();});add.disabled=selectedCombination.some(item=>item.draft_id===combinationSource.value&&item.clip_id===clip.clip_id);combinationClips.append(add);}
    combinationList.replaceChildren(...selectedCombination.map((item,index)=>{const version=selected?.drafts.find(draft=>draft.draft_id===item.draft_id)?.timeline_version;return button(`${index+1}. 来自 v${version} 的镜头 · 移除`,()=>{selectedCombination.splice(index,1);saveCombination();update();});}));
    compareButton.disabled=!draft||!compareSelect.value;combinationSubmit.disabled=!selectedCombination.length||!draft||!state.authorityCurrent||draft.timeline_version!==state.timeline?.version||state.pending.has("combine");const adoption=actions.adoptionAvailability(),adoptionBusy=["adopt","undo-adopt","redo-adopt"].some(key=>state.pending.has(key));undo.disabled=!adoption.undo||adoptionBusy;redo.disabled=!adoption.redo||adoptionBusy;
    options(renderSelect, (draft?.renders ?? []).map((item, index) => [item.render_id, `输出 ${index + 1} · 预览 ${qcLabel(item.preview.qc.status)} / 成片 ${qcLabel(item.master.qc.status)}`]), state.selectedRenderId);
    const clipOptions=(state.timeline?.tracks ?? []).flatMap(track=>track.clips.map((clip,index)=>[clip.clip_id,`${track.kind==="video"?"镜头":"音频"} ${index+1}`]));
    const protectionOptions=[...clipOptions,...(state.timeline?.tracks??[]).flatMap(track=>(track.captions??[]).map(caption=>[caption.caption_id,`字幕：${caption.text}`]))];
    for(const target of [request,revise,manual]) { const key=target===request?"protected_refs":"preserve_refs";options(target.controls[key],protectionOptions,target.saved()[key]??[],true);target.controls[key].parentElement.hidden=protectionOptions.length===0; }
    const managementPrinciples=workspace?.profile?workspace.profile.management_principles:[];
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
    options(captions.controls.caption_target,(state.timeline?.tracks??[]).flatMap(track=>(track.captions??[]).map((caption,index)=>[JSON.stringify([track.track_id,caption.caption_id]),`${index+1}. ${caption.text}`])),captions.saved().caption_target??"");
    manual.element.querySelector("h3").textContent=`精修当前编辑版 v${state.timeline?.version??0}${state.displayedPreviewTimeline&&state.displayedPreviewTimeline.version!==state.timeline?.version?`（正在看片 v${state.displayedPreviewTimeline.version}）`:""}`;
    restoreButton.disabled=!draft||draft.timeline_version===state.timeline?.version||state.pending.has("restore");const editAvailable=actions.editAvailability();undoEdit.disabled=!editAvailable.undo||draft?.timeline_version!==state.timeline?.version||state.pending.has("restore");redoEdit.disabled=!editAvailable.redo||draft?.timeline_version!==state.timeline?.version||state.pending.has("restore");
    options(manual.controls.target, (state.timeline?.tracks ?? []).flatMap(track => track.clips.map((clip, index) => [JSON.stringify([track.track_id,clip.clip_id]), `${track.kind === "video" ? "画面" : "音频"} · 第 ${index + 1} 个片段`])), manual.saved().target ?? "");
    const conversationIdentity=JSON.stringify([selected?.authorization.request_id,selected?.revisions,summary.textContent],(_,value)=>typeof value==="bigint"?String(value):value);
    if(revisions.dataset.identity!==conversationIdentity){const atEnd=revisions.scrollHeight-revisions.scrollTop-revisions.clientHeight<40;revisions.dataset.identity=conversationIdentity;
      revisions.replaceChildren(...(selected?.revisions ?? []).map(item => {const entry=node("article","","conversation-entry");entry.append(node("span",`你 · 要求 ${item.revision}`,"conversation-author"),node("p",item.raw_text,"stage2-copy"));if(item.preserve_refs.length)entry.append(node("p",`保留：${item.preserve_refs.map(ref=>protectionOptions.find(item=>item[0]===ref)?.[1]??"已记录的保护对象").join("、")}`,"muted"));return entry;}));
      revisions.append(node("p",selected?summary.textContent:"从你的素材和想法开始。发送要求后，AVE 会在授权范围内制作初稿。","conversation-status"));if(atEnd)revisions.scrollTop=revisions.scrollHeight;
    }
    materialList.replaceChildren(node("h3", "获准素材与分析记录"), ...(selected?.authorization.asset_ids ?? []).map(id => node("p", `${state.media.find(item => item.asset_id === id)?.display_name ?? "所选素材"} · ${selected.materials.some(item => item.asset_id === id) ? "已有准备记录" : "尚未准备"}`, "stage2-copy")), ...(selected?.observations ?? []).map(item => node("p", `意图 ${item.revision} · ${item.span_count} 个片段 · ${item.sample_count} 份采样 · ${item.evidence_count} 条证据`, "stage2-copy")));
    draftDetails.replaceChildren(node("p", draft ? `作品 v${draft.timeline_version} · 基于 v${draft.base_timeline_version} · 对应要求 ${draft.revision}\n${draft.source.kind === "manual" ? draft.source.raw_text : "由记录中的模型调用生成"}` : "生成后可在此选择、渲染和采用独立版本。", "stage2-copy"));
    if(draft?.soundtrack?.items.length){const sound=draft.soundtrack;draftDetails.append(node("p",`配乐来源：${sound.items.map(item=>`${item.title} / ${item.author} / ${item.license.spdx}`).join("；")}`,"stage2-copy"),...sound.reasons.map(reason=>node("p",`选曲理由：${reason}`,"stage2-copy")));
      const credits=node("textarea");credits.readOnly=true;credits.value=sound.publish_text||sound.source_text;credits.setAttribute("aria-label","发布署名文本");const copy=button("复制音频来源与署名",async()=>{try{await navigator.clipboard.writeText(credits.value);copy.textContent="署名已复制";}catch(error){credits.select();copy.textContent=`复制未完成：${error.message}；可选中文本复制`;}});draftDetails.append(credits,copy);
      for(const item of sound.alternatives){const choice=button(`试听替代：${item.title}`,()=>actions.libraryAlternative(item.resource_id));draftDetails.append(choice);}
    }
    if (rendered) {draftDetails.append(node("p", `预览检查：${qcLabel(rendered.preview.qc.status)} · 成片检查：${qcLabel(rendered.master.qc.status)}`, "stage2-copy"));const rows=creationQcRows(rendered);draftDetails.append(...rows.map(issue=>node("p",issue.text,"stage2-risk")));if(rows.length){const technical=node("details");technical.append(node("summary","技术检查记录"),...rows.map(issue=>node("p",`${issue.targets.join("/")} · ${issue.code} · ${issue.severity} · ${issue.blocker?"阻止导出":"不阻止导出"}`,"stage2-copy")));draftDetails.append(technical);}}
    const catalog=workspace?.profile_contexts;
    availableContexts.replaceChildren(node("h3","已有经验的适用情境"),node("p",({unconfigured:"尚未授权个人档案。",disabled:"学习与档案使用已关闭。",expired:"档案授权已到期。",empty:"当前没有可用的已学习情境。",available:"选择情境填入上方查询，再明确读取本次适用经验。"})[catalog?.mode]??"尚未配置本地档案。","stage2-copy"));
    for(const context of catalog?.contexts??[]){const choose=button(`选用情境：${context}`,()=>{query.controls.contexts.value=context;query.save();});choose.dataset.profileContext=context;availableContexts.append(choose);}
    principles.replaceChildren(node("h3", workspace?.profile ? `经验状态：${({unconfigured:"尚未授权",disabled:"已关闭",empty:"还没有习惯",no_match:"没有适用经验",personalized:"已读取适用经验"})[workspace.profile.snapshot.mode]??workspace.profile.snapshot.mode}` : "未请求个人档案"), ...(workspace?.profile?.snapshot.principles ?? []).map(item => {const entry=node("div","","stage2-copy");entry.append(node("p",item.statement));const contexts=node("p",`适用情境：${item.contexts.join("、")}`);contexts.dataset.profileContexts=JSON.stringify(item.contexts);entry.append(contexts,button("使用这些情境查询",()=>{query.controls.contexts.value=item.contexts.join("，");query.save();actions.profileQuery(query.values());}));return entry;}), ...(selected?.learning ?? []).map(item => node("p", `学习记录：${({registered:"已纳入档案",unregistered:"待登记",excluded:"已排除"})[item.registration?.state] ?? (item.response_saved ? "结果已保存，尚未读取档案状态" : "尚无已保存结果")}`, "stage2-copy")));
    const docked=!state.conversationOpen||state.creationView!=="request",mount=docked?dock:composerHome;dock.hidden=!docked;
    if(composer.parentElement!==mount){const focused=document.activeElement,inside=composer.contains(focused),start=inside&&"selectionStart"in focused?focused.selectionStart:null,end=inside&&"selectionEnd"in focused?focused.selectionEnd:null;mount.append(composer);if(inside){focused.focus({preventScroll:true});if(start!==null)focused.setSelectionRange(start,end);}}
    for (const [key, view] of views) { view.hidden = state.creationView !== key; tabs.get(key).classList.toggle("active", state.creationView === key);view.classList.toggle("conversation-view",key==="request"); }
    title.querySelector("h2").textContent=({request:"对话",drafts:"历史版本",material:"制作记录",profile:"个人档案"})[state.creationView];
    for (const item of forms) item.submit.disabled = state.status.project === "not-open" || state.pending.has(item.id) || (["manual","caption"].includes(item.id) && (state.pending.has("revise") || !state.authorityCurrent || draft?.timeline_version!==state.timeline?.version)) || (!selected && ["revise","manual","caption","learn"].includes(item.id));
    newRequest.hidden=state.status.project==="not-open";request.element.hidden=Boolean(selected);revise.element.hidden=!selected;requestSelect.hidden=(workspace?.requests.length??0)<2;
    produce.disabled=!selected || Boolean(selected?.active_run);exportPanel.disabled=!rendered;exportView.setProject(state.status.project);
    cancel.disabled = !selected || selected.status === "cancelled"; revoke.disabled = !selected || selected.revoked;
    prepare.disabled = !selected || state.pending.has("prepare"); observe.disabled = !selected || state.pending.has("observe") || Boolean(selected?.active_run); generate.disabled = !selected || state.pending.has("generate") || state.pending.has("revise") || !state.authorityCurrent || Boolean(selected?.active_run);
    render.hidden=Boolean(rendered);renderSelect.hidden=(draft?.renders.length??0)<2;render.disabled = !draft || state.pending.has("render"); preview.disabled = !rendered || state.pending.has("preview"); adopt.disabled = !draft || adoptionBusy || draft.draft_id === selected?.adopted_draft_id;
    retryRender.hidden = !state.failedRenderAttempts.has(JSON.stringify([state.status.project,state.selectedRequestId,state.selectedDraftId])); retryRender.disabled = render.disabled;
  }
  update(); return { node: section, dock, refinement, exportNode:exportView.node, destroy:()=>exportView.destroy(), update, showExport, referenceClip(selection){
    const sourceTimeline=state.displayedPreviewTimeline??state.timeline;if(selection.timeline_version!==sourceTimeline?.version)throw new Error("所选镜头不属于当前观看版本，请重新选择镜头。");const track=sourceTimeline?.tracks.find(item=>item.track_id===selection.track_id),index=track?.clips.findIndex(item=>item.clip_id===selection.clip_id);if(index===undefined||index<0)return;
    const composer=state.selectedRequestId?revise:request,field=state.selectedRequestId?revise.controls.raw_text:request.controls.original_text;field.value+=`${field.value?"\n":""}关于作品 v${sourceTimeline.version} 的${track.kind==="video"?"镜头":"音频"} ${index+1}：`;composer.save();field.focus();field.setSelectionRange(field.value.length,field.value.length);
  },refineClip(selection){refinement.open=true;if(selection){manual.controls.target.value=JSON.stringify([selection.track_id,selection.clip_id]);manual.save();}scrollTo(manual.element);} };

}
