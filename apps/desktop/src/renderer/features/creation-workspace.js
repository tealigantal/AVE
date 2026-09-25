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
    commands.push({ type: "add_caption", track_id: track.track_id, caption: { caption_id: `caption:${operationId}`, text: values.caption_text, timeline_start: exactTicks(values.caption_start, timeline.sequence?.timebase), timeline_duration: duration } });
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
  title.append(node("p", "CREATIVE WORKSPACE", "eyebrow"), node("h2", "个人创作工作区"));
  const summary = node("span", "", "badge"); heading.append(title, summary); section.append(heading);
  const requestSelect = node("select"); requestSelect.setAttribute("aria-label", "当前创作请求"); requestSelect.dataset.creation = "request-select";
  requestSelect.addEventListener("change", () => actions.selectRequest(requestSelect.value)); section.append(requestSelect);
  const nav = node("nav", "", "stage2-tabs"), views = new Map(), tabs = new Map();
  for (const [key, label] of [["request", "要求与修订"], ["material", "素材与生成"], ["drafts", "作品与修改"], ["profile", "经验与学习"]]) {
    const tab = button(label, () => { state.creationView = key; update(); }); tab.dataset.creationView = key; tabs.set(key, tab); nav.append(tab);
    const view = node("div", "", "stage2-view"); views.set(key, view);
  }
  section.append(nav, ...views.values());
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
    let activeScope = "";
    const save = () => { if (activeScope) state.forms.set(activeScope, values()); };
    element.addEventListener("input", save); element.addEventListener("change", save);
    element.addEventListener("submit", event => { event.preventDefault(); if (submit.disabled) return; save(); if (element.reportValidity()) action(values()); });
    forms.push({ id, submit, sync: () => {
      const key = JSON.stringify([state.status.project, scope === "project" ? "" : state.selectedRequestId, id]);
      if (activeScope === key) return; save(); activeScope = key;
      const prior = state.forms.get(key) ?? {};
      for (const [name, , , initial = ""] of fields) { const control = controls[name]; if (control.type === "checkbox") control.checked = prior[name] ?? Boolean(initial); else if (!control.multiple) control.value = prior[name] ?? initial; }
    } });
    return { element, controls, submit, values, save, saved: () => state.forms.get(activeScope) ?? {} };
  }
  const request = form("request", "begin", "开始一个创作请求", [
    ["original_text", "创作要求（保留原话）", "textarea"], ["asset_ids", "本次允许使用的素材", "select"],
    ["provider", "模型服务"], ["model", "模型名称"],
    ["expires_at", "授权截止时间", "datetime-local"], ["protected_refs", "不得改变的对象 ID（可留空）", "textarea"],
  ], "核对并授权创作", values => actions.begin({ ...values, allowed_data: dataControls.filter(control => control.checked).map(control => control.name) }), "project");
  request.controls.asset_ids.multiple = true;
  const dataFieldset = node("fieldset"), dataControls = [];
  dataFieldset.append(node("legend", "允许发送给模型的数据"));
  for (const [key, label] of Object.entries(creationDataLabels)) { const input = node("input"); input.type = "checkbox"; input.name = key; const wrapper = node("label", label); wrapper.prepend(input); dataFieldset.append(wrapper); dataControls.push(input); input.addEventListener("change", () => state.forms.set(JSON.stringify([state.status.project,"allowed_data"]), dataControls.filter(control => control.checked).map(control => control.name))); }
  request.element.insertBefore(dataFieldset, request.submit);
  const revise = form("request", "revise", "补充要求或纠正理解", [["raw_text", "补充或纠正的原话", "textarea"], ["preserve_refs", "本次不应改变的对象 ID", "textarea"]], "提交新要求", actions.revise);
  const requestActions = node("div", "", "button-row"), cancel = button("取消当前制作", () => actions.cancel(false)), revoke = button("撤销本次授权", () => actions.cancel(true)); requestActions.append(cancel, revoke); views.get("request").append(requestActions);
  const revisions = node("div", "", "stage2-section"); views.get("request").append(revisions);
  const materialList = node("div", "", "stage2-section"), includeAudio = node("input"); includeAudio.type = "checkbox";
  const audioLabel = node("label", "此次分析包含获准音频"); audioLabel.prepend(includeAudio);
  const prepare = button("准备获准素材", actions.prepare), observe = button("分析真实素材", () => actions.observe(includeAudio.checked)), generate = button("生成可编辑初稿", actions.generate, "primary");
  views.get("material").append(materialList, audioLabel, prepare, observe, generate);
  const draftSelect = node("select"); draftSelect.setAttribute("aria-label", "作品版本"); draftSelect.dataset.creation = "draft-select"; draftSelect.addEventListener("change", () => actions.selectDraft(draftSelect.value));
  const renderSelect = node("select"); renderSelect.setAttribute("aria-label", "渲染版本"); renderSelect.dataset.creation = "render-select"; renderSelect.addEventListener("change", () => actions.selectRender(renderSelect.value));
  const draftDetails = node("div", "", "stage2-section"), render = button("渲染 Preview 与 Master", actions.renderDraft, "primary"), preview = button("加载所选 Preview", actions.loadPreview), adopt = button("采用此版", actions.adopt);
  const retryRender = button("原因修正后，开始新渲染尝试", actions.retryRender);
  views.get("drafts").append(draftSelect, renderSelect, draftDetails, render, retryRender, preview, adopt);
  const manual = form("drafts", "manual", "直接修改当前作品", [
    ["target", "具体镜头", "select"], ["raw_text", "实际修改与保留要求", "textarea"], ["placement_text", "移动到第几秒（留空不改）"], ["gain_db", "音量 dB（留空不改）"],
    ["caption_text", "新增字幕原文（留空不加）", "textarea"], ["caption_start", "字幕开始秒数"], ["caption_duration", "字幕时长秒数"], ["preserve_refs", "不应改变的对象 ID", "textarea"],
  ], "保存手动修改版", actions.manual);
  const query = form("profile", "profile-query", "本项目使用哪些经验", [["contexts", "适用情境（逗号分隔）"], ["exceptions", "仅本项目不采用的原则 ID", "textarea"]], "读取适用经验", actions.profileQuery, "project");
  query.element.append(button("仅查看项目", () => actions.profileQuery(null)));
  const principles = node("div", "", "stage2-section"); views.get("profile").append(principles);
  form("profile", "profile-configure", "学习与保留范围", [["source_project_ids", "允许学习的来源项目 ID", "textarea"], ["data_types", "经验类型：feedback、manual_diff、selection、history_reference"], ["external_provider", "获准模型服务（留空表示不允许外传）"], ["retention_until", "保留截止时间", "datetime-local"], ["enabled", "启用学习", "checkbox"]], "核对学习范围", actions.configureProfile, "project");
  const learn = form("profile", "learn", "将选定经验纳入档案", [["kind", "经验类型", "select"], ["raw_text", "历史或手动经验说明", "textarea"], ["correction_ids", "此次明确纠正的旧原则 ID（可留空）", "textarea"]], "学习所选经验", actions.learn);
  options(learn.controls.kind, [["selection","采用所选版本"],["feedback","所选版本对应的反馈"],["manual_diff","所选手动修改"],["history_reference","当前项目的获准历史或参考"]], "");
  form("profile", "forget", "遗忘来源经验", [["source_project_ids", "要遗忘的来源项目 ID", "textarea"]], "核对并遗忘", actions.forget, "project");
  let dataProject = null;
  function update() {
    for (const item of forms) item.sync();
    if (state.status.model_service) {
      request.controls.provider.value = state.status.model_service.provider;
      request.controls.model.value = state.status.model_service.model;
      request.controls.provider.readOnly = true; request.controls.model.readOnly = true;
    }

    if (dataProject !== state.status.project) { dataProject = state.status.project; const selected = state.forms.get(JSON.stringify([dataProject,"allowed_data"])) ?? []; dataControls.forEach(control => { control.checked = selected.includes(control.name); }); }
    const workspace = state.workspace, selected = workspace?.requests.find(item => item.authorization.request_id === state.selectedRequestId), draft = selected?.drafts.find(item => item.draft_id === state.selectedDraftId), rendered = draft?.renders.find(item => item.render_id === state.selectedRenderId);
    summary.textContent = workspace ? `v${workspace.timeline_version} · ${statusLabels[selected?.status] ?? "未选择请求"}` : "尚未读取工作区";
    options(requestSelect, (workspace?.requests ?? []).map(item => [item.authorization.request_id, `${item.authorization.original_text.slice(0,50)} · ${statusLabels[item.status] ?? item.status}`]), state.selectedRequestId);
    options(request.controls.asset_ids, authorizationAssets(state.media).map((item, index) => [item.asset_id, `${index + 1}. ${item.display_name ?? "素材"}`]), request.saved().asset_ids ?? [], true);
    options(draftSelect, (selected?.drafts ?? []).map(item => [item.draft_id, `v${item.timeline_version} · ${item.source.kind === "manual" ? "手动修改" : "模型草稿"}${item.draft_id === selected.adopted_draft_id ? " · 已采用" : ""}${item.draft_id === selected.viewed_draft_id ? " · 已播放" : ""}`]), state.selectedDraftId);
    options(renderSelect, (draft?.renders ?? []).map((item, index) => [item.render_id, `输出 ${index + 1} · 预览 ${qcLabel(item.preview.qc.status)} / 成片 ${qcLabel(item.master.qc.status)}`]), state.selectedRenderId);
    options(manual.controls.target, (state.timeline?.tracks ?? []).flatMap(track => track.clips.map((clip, index) => [JSON.stringify([track.track_id,clip.clip_id]), `${track.kind === "video" ? "画面" : "音频"} · 第 ${index + 1} 个片段`])), manual.saved().target ?? "");
    revisions.replaceChildren(...(selected?.revisions ?? []).map(item => node("p", `要求 ${item.revision}：${item.raw_text}\n保留：${item.preserve_refs.join("、") || "无额外指定"}`, "stage2-copy")));
    materialList.replaceChildren(node("h3", "获准素材与分析记录"), ...(selected?.authorization.asset_ids ?? []).map(id => node("p", `${state.media.find(item => item.asset_id === id)?.display_name ?? "所选素材"} · ${selected.materials.some(item => item.asset_id === id) ? "已有准备记录" : "尚未准备"}`, "stage2-copy")), ...(selected?.observations ?? []).map(item => node("p", `意图 ${item.revision} · ${item.span_count} 个片段 · ${item.sample_count} 份采样 · ${item.evidence_count} 条证据`, "stage2-copy")));
    draftDetails.replaceChildren(node("p", draft ? `作品 v${draft.timeline_version} · 基于 v${draft.base_timeline_version} · 对应要求 ${draft.revision}\n${draft.source.kind === "manual" ? draft.source.raw_text : "由记录中的模型调用生成"}` : "生成后可在此选择、渲染和采用独立版本。", "stage2-copy"));
    if (rendered) draftDetails.append(node("p", `预览检查：${qcLabel(rendered.preview.qc.status)} · 成片检查：${qcLabel(rendered.master.qc.status)}`, "stage2-copy"), ...[...rendered.preview.qc.issues,...rendered.master.qc.issues].map(issue => node("p", `${issue.code} · ${issue.severity}`, "stage2-risk")));
    principles.replaceChildren(node("h3", workspace?.profile ? `经验状态：${workspace.profile.snapshot.mode}` : "未请求个人档案"), ...(workspace?.profile?.snapshot.principles ?? []).map(item => node("p", `${item.principle_id}：${item.statement}`, "stage2-copy")), ...(selected?.learning ?? []).map(item => node("p", `经验 ${item.operation_id}：${item.registration?.state ?? (item.response_saved ? "结果已保存，尚未读取档案状态" : "尚无已保存结果")}`, "stage2-copy")));
    for (const [key, view] of views) { view.hidden = state.creationView !== key; tabs.get(key).classList.toggle("active", state.creationView === key); }
    for (const item of forms) item.submit.disabled = state.status.project === "not-open" || state.pending.has(item.id) || (item.id === "manual" && (state.pending.has("revise") || !state.authorityCurrent)) || (!selected && ["revise","manual","learn"].includes(item.id));
    cancel.disabled = !selected || selected.status === "cancelled"; revoke.disabled = !selected || selected.revoked;
    prepare.disabled = !selected || state.pending.has("prepare"); observe.disabled = !selected || state.pending.has("observe") || Boolean(selected?.active_run); generate.disabled = !selected || state.pending.has("generate") || state.pending.has("revise") || !state.authorityCurrent || Boolean(selected?.active_run);
    render.disabled = !draft || state.pending.has("render"); preview.disabled = !rendered || state.pending.has("preview"); adopt.disabled = !draft || draft.draft_id === selected?.adopted_draft_id;
    retryRender.hidden = !state.failedRenderAttempts.has(JSON.stringify([state.status.project,state.selectedRequestId,state.selectedDraftId])); retryRender.disabled = render.disabled;
  }
  update(); return { node: section, update };
}
