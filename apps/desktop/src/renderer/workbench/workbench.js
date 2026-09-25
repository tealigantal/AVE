import { command, query, subscribe } from "../api/project-api.js";
import { projectPanel } from "../features/project-panel.js";
import { mediaPanel } from "../features/media-panel.js";
import { jobsPanel } from "../features/jobs-panel.js";
import { timelinePanel } from "../features/timeline-panel.js";
import { playerPanel } from "../features/player-panel.js";
import { diffPanel } from "../features/diff-panel.js";
import { createCreationWorkspace, prepareCreationAuthorization, manualCommands, explicitList } from "../features/creation-workspace.js";
import { createWorkbenchState } from "../state/workbench-state.js";
import { statusCard } from "../components/status-card.js";

export function mountWorkbench(root) {
  const state = createWorkbenchState();
  let disposed = false, epoch = 0, refreshSequence = 0, selectionEpoch = 0, previewSequence = 0, noticeSequence = 0;
  const operationIds = new Map();
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
  const clearPreview = () => { previewSequence++; if (state.previewUrl) URL.revokeObjectURL(state.previewUrl); state.previewUrl = ""; state.previewBinding = null; };
  const changeProject = status => {
    epoch++; selectionEpoch++; clearPreview();
    Object.assign(state, { status, workspace: null, timeline: null, media: [], jobs: [], selectedRequestId: "", selectedDraftId: "", selectedRenderId: "", selectedAssetId: "", profileQuery: null });
    state.pending.clear();
  };
  const chooseDefaults = () => {
    const requests = state.workspace?.requests ?? [];
    if (!requests.some(item => item.authorization.request_id === state.selectedRequestId)) state.selectedRequestId = requests.length === 1 ? requests[0].authorization.request_id : "";
    const request = selectedRequest();
    if (!request?.drafts.some(item => item.draft_id === state.selectedDraftId)) { state.selectedDraftId = request?.adopted_draft_id ?? request?.latest_draft_id ?? ""; state.selectedRenderId = ""; }
    const draft = selectedDraft();
    if (!draft?.renders.some(item => item.render_id === state.selectedRenderId)) state.selectedRenderId = draft?.renders.at(-1)?.render_id ?? "";
  };
  const refresh = async () => {
    const sequence = ++refreshSequence, startedEpoch = epoch;
    state.refreshing = true; state.authorityCurrent = false; update();
    try {
    const status = await query("app.status");
    if (disposed || sequence !== refreshSequence || startedEpoch !== epoch) return null;
    if (!status.ok) { state.notice = status.error.message; update(); return false; }
    if (status.data.project !== state.status.project) changeProject(status.data); else state.status = status.data;
    const scopeEpoch = epoch, id = projectId();
    if (!id) { update(); return true; }
    const results = await Promise.all([
      query("project.creation.workspace", id, { profile_query: state.profileQuery }), query("project.creation.timeline", id, {}), query("project.media.list", id), query("project.jobs.list", id),
    ]);
    if (disposed || sequence !== refreshSequence || scopeEpoch !== epoch || id !== projectId()) return null;
    const keys = ["workspace","timeline","media","jobs"], failures = [];
    results.forEach((result, index) => { if (result.ok) state[keys[index]] = result.data; else { state[keys[index]] = index < 2 ? null : []; failures.push(`${result.error.code}: ${result.error.message}`); } });
    if (!failures.length && state.workspace?.timeline_version !== state.timeline?.version) failures.push("作品版本仍在变化，请刷新后再提交修改。");
    state.authorityCurrent = failures.length === 0;
    chooseDefaults(); if (failures.length) state.notice = failures.join("；"); update(); return failures.length === 0;
    } finally { if (!disposed && sequence === refreshSequence) { state.refreshing = false; update(); } }
  };
  const run = async (key, operation, onSuccess) => {
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
      if (startedSelection === selectionEpoch) onSuccess?.(result.data);
      if (startedSelection === selectionEpoch && startedNotice === noticeSequence) state.notice = "操作已完成。";
      const fresh = await refresh(); if (fresh === false && !disposed && startedEpoch === epoch && startedSelection === selectionEpoch && startedNotice === noticeSequence) { state.notice = `操作已经完成，读取最新状态失败：${state.notice}`; update(); }
    } catch (error) { if (!disposed && startedEpoch === epoch) { let message = `${completed ? "操作已经完成，读取最新状态失败：" : ""}${error instanceof Error ? error.message : String(error)}`; try { await refresh(); } catch (readError) { message += `；读取状态也失败：${readError.message}`; } if (startedEpoch === epoch && startedSelection === selectionEpoch && startedNotice === noticeSequence) state.notice = message; update(); } }
    finally { if (state.pending.get(key) === token) state.pending.delete(key); if (!disposed) update(); }
  };
  const currentInput = () => { const request = requireRequest(); return { request_id: request.authorization.request_id, expected_revision: request.revisions.at(-1).revision }; };
  const observationRefs = () => { const request = requireRequest(), observation = request.observations.at(-1); if (!observation) throw new Error("请先完成当前获准素材的真实分析"); return [observation.ref]; };
  const afterDraft = result => { state.selectedDraftId = result.draft_id; state.selectedRenderId = ""; state.creationView = "drafts"; };
  const lifecycle = type => run("lifecycle", () => command(`project.${type}`, projectId()));
  const actions = {
    create: () => lifecycle("create"), open: () => lifecycle("open"), close: () => lifecycle("close"),
    refresh: () => { const startedEpoch = epoch, sequence = refreshSequence + 1; void refresh().catch(error => { if (!disposed && startedEpoch === epoch && sequence === refreshSequence) { state.notice = error.message; update(); } }); },
    importMedia: () => run("import", () => command("project.media.import", projectId())),
    selectAsset: assetId => { state.selectedAssetId = assetId; update(); },
    selectRequest: id => { selectionEpoch++; clearPreview(); state.selectedRequestId = id; state.selectedDraftId = ""; state.selectedRenderId = ""; chooseDefaults(); update(); },
    selectDraft: id => { selectionEpoch++; clearPreview(); state.selectedDraftId = id; state.selectedRenderId = ""; chooseDefaults(); update(); },
    selectRender: id => { selectionEpoch++; clearPreview(); state.selectedRenderId = id; update(); },
    begin: values => run("begin", () => command("project.creation.begin", projectId(), prepareCreationAuthorization(values, operationId("request", values))), result => { state.selectedRequestId = result.request_id; state.selectedDraftId = ""; state.creationView = "material"; }),
    revise: values => run("revise", () => {
      const request = requireRequest(), prior = request.revisions.at(-1), viewed = request.drafts.find(item => item.draft_id === request.viewed_draft_id);
      return command("project.creation.revise", projectId(), { ...currentInput(), raw_text: values.raw_text, viewed_timeline_version: viewed?.timeline_version ?? null, preserve_refs: [...new Set([...prior.preserve_refs,...explicitList(values.preserve_refs)])] });
    }),
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
    adopt: () => run("adopt", () => command("project.creation.select", projectId(), { request_id: requireRequest().authorization.request_id, draft_id: selectedDraft()?.draft_id, pointer: "adopted" })),
    markViewed: binding => {
      if (binding !== state.previewBinding || binding.project_id !== projectId()) return;
      const request = state.workspace?.requests.find(item => item.authorization.request_id === binding.request_id);
      if (request?.viewed_draft_id === binding.draft_id) return;
      void run("viewed", () => command("project.creation.select", binding.project_id, { request_id: binding.request_id, draft_id: binding.draft_id, pointer: "viewed" }));
    },
    loadPreview: () => run("preview", async () => {
      const request = requireRequest(), draft = selectedDraft(), render = selectedRender(); if (!draft || !render) throw new Error("请选择已渲染的版本");
      const sequence = ++previewSequence, scopeEpoch = epoch, selection = selectionEpoch, id = projectId();
      const binding = { project_id: id, request_id: request.authorization.request_id, draft_id: draft.draft_id, render_id: render.render_id, output_hash: render.preview.output_hash, timeline_version: draft.timeline_version };
      const result = await query("project.creation.preview", id, { request_id: binding.request_id, draft_id: binding.draft_id, render_id: binding.render_id });
      if (disposed || scopeEpoch !== epoch || selection !== selectionEpoch || sequence !== previewSequence) return { ok: true, data: null };
      if (!result.ok) return result;
      if (result.data.output_hash !== binding.output_hash || result.data.timeline_version !== binding.timeline_version) throw new Error("Preview 与所选作品记录不一致");
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      const bytes = result.data.bytes instanceof Uint8Array ? result.data.bytes : new Uint8Array(result.data.bytes);
      state.previewUrl = URL.createObjectURL(new Blob([bytes], { type: result.data.mime_type })); state.previewBinding = binding; update();
      return { ok: true, data: null };
    }),
    profileQuery: values => { try { state.profileQuery = values === null ? null : { contexts: explicitList(values.contexts), except_principle_ids: explicitList(values.exceptions) }; if (state.workspace) state.workspace = { ...state.workspace, profile: null }; actions.refresh(); } catch (error) { state.notice = error.message; update(); } },
    configureProfile: values => run("profile-configure", () => command("project.profile.configure", projectId(), { source_project_ids: explicitList(values.source_project_ids), data_types: explicitList(values.data_types), external_provider: values.external_provider.trim() || null, retention_until: new Date(values.retention_until).toISOString(), enabled: values.enabled })),
    forget: values => run("forget", () => command("project.profile.forget", projectId(), { source_project_ids: explicitList(values.source_project_ids) })),
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
  shell.innerHTML = `<header class="topbar"><div><p class="eyebrow">AVE</p><h1>让素材成为故事</h1></div><span class="connection"><i></i> 本地创作工作台</span></header>`;
  const cards = document.createElement("div"); cards.className = "status-grid";
  const creation = createCreationWorkspace(actions,state), grid = document.createElement("div"); grid.className = "product-shell";
  const library = document.createElement("aside"); library.className = "story-sidebar"; library.setAttribute("aria-label", "项目与素材");
  const player = playerPanel(actions,state), notice = document.createElement("p"); notice.className = "notice"; notice.setAttribute("role", "status");
  const timeline = document.createElement("div"); timeline.className = "timeline-wrap";
  const diagnostics = document.createElement("details"); diagnostics.className = "workspace-diagnostics";
  const diagnosticLabel = document.createElement("summary"); diagnosticLabel.textContent = "制作记录与诊断";
  const diagnosticPanels = document.createElement("div"); diagnosticPanels.className = "panel-grid";
  diagnostics.append(diagnosticLabel,cards,diagnosticPanels);
  grid.append(library,player.node,creation.node,timeline); shell.append(grid,notice,diagnostics); root.replaceChildren(shell);
  function update() {
    if (disposed) return; state.busy = state.pending.has("lifecycle");
    cards.replaceChildren(...[["项目",state.status.project],["时间线",state.status.timeline],["渲染",state.status.render],["QC",state.status.qc]].map(([label,value])=>statusCard(label,value)));
    creation.update(); library.replaceChildren(projectPanel(actions,state),mediaPanel(actions,state)); timeline.replaceChildren(timelinePanel(actions,state));
    diagnosticPanels.replaceChildren(jobsPanel(state),diffPanel(state)); player.update(); notice.textContent = state.notice;
  }
  const unsubscribe = subscribe(event => { if (["project.create","project.open","project.close"].includes(event?.event_type) || !event?.project_id || event.project_id === projectId()) actions.refresh(); });
  update(); actions.refresh();
  return { refresh, destroy() { disposed = true; epoch++; refreshSequence++; unsubscribe(); clearPreview(); player.destroy(); root.replaceChildren(); } };
}
