// The Host owns saved issues. Local entries remain unsaved until acknowledged.
let dialog, details, note, includeHandled, previousFocus, journal;
const records = new Map();
const recoveryLabels = { retry: "重新执行对应操作", "choose-source": "重新选择正确来源", "reopen-project": "重新打开作品", "free-space": "释放磁盘空间后重试", "check-permission": "检查来源与授权", "view-details": "查看详细记录，再决定如何处理" };
const project = () => journal?.projectId() ?? "";
const text = value => value instanceof Error ? value.message : typeof value === "string" ? value : value && typeof value.message === "string" ? `${value.code}: ${value.message}` : String(value);
const identity = value => value.issue_id ? `${value.project_id}:${value.issue_id}` : `${value.project_id}:${value.message}`;
const pendingSaves = new Map();
function retain(value) {
  const previous = records.get(identity(value));
  if (!previous || !value.revision || value.revision >= (previous.revision ?? 0)) records.set(identity(value), value);
}
function publishIssueChange() { window.dispatchEvent(new CustomEvent("ave:issue-journal-updated")); }
function publishOperationFailure(message, scope, operationType) {
  window.dispatchEvent(new CustomEvent("ave:operation-error", { detail: { message, project_id: scope, operation_type: operationType } }));
}
function visibleItems(scope, showHandled) {
  return [...records.values()].filter(item => (!item.project_id || item.project_id === scope) && (showHandled || !item.status || item.status === "open")).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}
export function configureErrorJournal(value) {
  journal = value;
  return () => { if (journal === value) { journal = undefined; if (dialog?.open) dialog.close(); } };
}
export function restoreErrorHistory(projectId, items) {
  for (const item of items) {
    if (item.project_id !== projectId) throw new Error("问题记录不属于当前作品。");
    const message = `${item.code}: ${item.message}`;
    for (const [key, local] of records) if (!local.issue_id && local.project_id === projectId && local.message === message) records.delete(key);
    retain({ ...item, message });
  }
  publishIssueChange();
  if (dialog?.open) renderDialog();
}
function saveLocal(value) {
  if (!journal || !value.project_id || value.issue_id) return Promise.resolve();
  const key = identity(value), pending = pendingSaves.get(key);
  if (pending) return pending;
  if (value.saving) return Promise.reject(new Error("问题记录显示正在保存，但没有可等待的保存任务。"));
  const bound = journal; value.saving = true; value.save_error = ""; publishIssueChange();
  const saving = (async () => {
    try {
      const message = value.message.startsWith(`${value.code}:`) ? value.message.slice(value.code.length + 1).trim() : value.message;
      const saved = await bound.report(value.project_id, { code: value.code, message, operation_type: value.operation_type });
      records.delete(identity(value)); retain({ ...saved, message: `${saved.code}: ${saved.message}` });
    } catch (error) { value.save_error = `这条问题尚未保存：${text(error)}`; }
    finally { value.saving = false; pendingSaves.delete(key); publishIssueChange(); if (dialog?.open) renderDialog(); }
  })();
  pendingSaves.set(key, saving);
  return saving;
}

/** Resolve only Host-backed import issues whose exact source item succeeded. */
export async function resolveRecoveredImportIssues(batch) {
  const scope = batch?.project_id, bound = journal;
  if (!bound || !scope || scope !== project()) throw new Error("导入问题恢复属于其他作品，未修改问题记录。");
  if (!Array.isArray(batch.items)) throw new Error("导入批次缺少素材结果，未修改问题记录。");
  const targets = new Map();
  for (const item of batch.items) {
    if (item.status !== "imported" && item.status !== "duplicate") continue;
    if (typeof item.display_name !== "string" || !Array.isArray(item.issues)) throw new Error("成功导入项缺少可核对的失败历史，未修改问题记录。");
    for (const attempt of item.issues) {
      const failure = attempt?.error;
      if (!failure || typeof failure.code !== "string" || typeof failure.message !== "string") throw new Error("导入失败历史格式无效，未修改问题记录。");
      const message = `${item.display_name}：${failure.message}`;
      targets.set(JSON.stringify([failure.code, message]), { code: failure.code, message });
    }
  }
  if (!targets.size) return 0;
  const local = [...records.values()].filter(value => {
    if (value.project_id !== scope || value.operation_type !== "media.import") return false;
    const message = value.message.startsWith(`${value.code}:`) ? value.message.slice(value.code.length + 1).trim() : value.message;
    return targets.has(JSON.stringify([value.code, message]));
  });
  await Promise.all(local.map(value => pendingSaves.get(identity(value)) ?? Promise.resolve()));
  const unsaved = [...records.values()].filter(value => {
    if (value.project_id !== scope || value.operation_type !== "media.import" || value.issue_id) return false;
    const message = value.message.startsWith(`${value.code}:`) ? value.message.slice(value.code.length + 1).trim() : value.message;
    return targets.has(JSON.stringify([value.code, message]));
  });
  for (const value of unsaved) throw new Error(value.save_error || `关联导入问题 ${value.code} 尚未写入作品历史。`);
  if (journal !== bound || project() !== scope) throw new Error("作品已切换，未更新导入问题记录。");
  const saved = await bound.list(scope);
  if (!Array.isArray(saved)) throw new Error("作品问题历史返回格式无效，未更新导入问题记录。");
  const matching = saved.filter(item => item.project_id === scope && item.status === "open" && item.operation_type === "media.import" && targets.has(JSON.stringify([item.code, item.message])));
  const resolved = [];
  for (const item of matching) {
    if (journal !== bound || project() !== scope) throw new Error("作品已切换，未更新导入问题记录。");
    const updated = await bound.acknowledge(scope, { issue_id: item.issue_id, expected_revision: item.revision, status: "resolved" });
    if (updated.project_id !== scope || updated.issue_id !== item.issue_id || updated.status !== "resolved" || updated.revision <= item.revision) throw new Error("作品未确认导入问题已解决。");
    resolved.push(updated);
  }
  if (resolved.length) restoreErrorHistory(scope, resolved);
  return resolved.length;
}
function issueCard(item, rerender, setNote) {
  const card = document.createElement("article"); card.className = "workspace-issue-card";
  const heading = document.createElement("strong"), subject = document.createElement("p"), message = document.createElement("p"), preserved = document.createElement("p"), recovery = document.createElement("p"), technical = document.createElement("details"), summary = document.createElement("summary"), body = document.createElement("pre");
  heading.textContent = item.subject?.label ?? "当前操作";
  if (item.subject) { subject.className = "workspace-issue-subject"; subject.textContent = `关联对象：${item.subject.kind} · ${item.subject.label}（${item.subject.id}）`; }
  message.textContent = item.message;
  preserved.className = "muted"; preserved.textContent = item.preserved ?? "未确认的操作结果不会被标记为完成。";
  recovery.textContent = `建议：${recoveryLabels[item.recovery] ?? "查看对应操作及详细记录"}`;
  summary.textContent = "技术详情"; body.textContent = `错误码：${item.code}\n操作：${item.operation_type}\n最近发生：${new Date(item.updated_at).toLocaleString()}\n记录状态：${({ open: "未处理", resolved: "已标记解决", dismissed: "已关闭提示" })[item.status] ?? "尚未保存"}\n出现次数：${item.count}`;
  technical.append(summary, body); card.append(heading, subject, message, preserved, recovery, technical);
  if (item.issue_id && item.status === "open" && journal) {
    for (const [label, status] of [["标记已解决", "resolved"], ["关闭此条提示", "dismissed"]]) {
      const button = document.createElement("button"); button.type = "button"; button.textContent = label;
      button.onclick = async () => {
        button.disabled = true;
        try { const saved = await journal.acknowledge(item.project_id, { issue_id: item.issue_id, expected_revision: item.revision, status }); retain({ ...saved, message: `${saved.code}: ${saved.message}` }); publishIssueChange(); rerender(); }
        catch (error) { setNote(`问题状态未能保存：${text(error)}`); button.disabled = false; }
      };
      card.append(button);
    }
  } else if (!item.issue_id) {
    const state = document.createElement("p"); state.className = "stage2-risk"; state.textContent = item.save_error || (item.saving ? "正在保存这条问题…" : "这条问题尚未保存，刷新前请保留详情。"); card.append(state);
    if (item.project_id && !item.saving && journal) { const retry = document.createElement("button"); retry.type = "button"; retry.textContent = "重试保存问题"; retry.onclick = () => { void saveLocal(item); }; card.append(retry); }
  }
  return card;
}
function renderDialog() {
  const items = visibleItems(project(), includeHandled.checked);
  details.replaceChildren();
  if (!items.length) { const empty = document.createElement("p"); empty.textContent = "当前没有未处理的问题。"; details.append(empty); }
  for (const item of items) details.append(issueCard(item, renderDialog, message => { note.textContent = message; }));
}
export function showErrorHistory() {
  if (!dialog?.isConnected) {
    dialog = document.createElement("dialog"); dialog.className = "persistent-error-dialog"; dialog.setAttribute("aria-label", "问题记录");
    const title = document.createElement("h2"); title.textContent = "问题记录";
    note = document.createElement("p"); note.textContent = "关闭短提示不会删除记录；未处理问题也不会因其他操作成功而消失。";
    const filter = document.createElement("label"); includeHandled = document.createElement("input"); includeHandled.type = "checkbox"; includeHandled.onchange = renderDialog; filter.append(includeHandled, " 包括已处理的问题");
    details = document.createElement("div"); details.className = "workspace-issue-list"; details.setAttribute("aria-live", "polite");
    const close = document.createElement("button"); close.type = "button"; close.textContent = "返回当前操作"; close.onclick = () => { dialog.close(); if (previousFocus?.isConnected) previousFocus.focus(); };
    dialog.addEventListener("cancel", event => event.preventDefault()); dialog.append(title, note, filter, details, close); document.body.append(dialog);
  }
  renderDialog(); if (!dialog.open) { previousFocus = document.activeElement; dialog.showModal(); }
  const scope = project(), bound = journal;
  if (scope && bound) void bound.list(scope).then(items => { if (journal === bound && project() === scope) restoreErrorHistory(scope, items); }, error => { if (project() === scope) note.textContent = `问题历史未能读取：${text(error)}。当前页面记录仍保留。`; });
}

/** Host-backed issue history as a normal switchable workbench page. */
export function createErrorRecoveryPage() {
  const section = document.createElement("section"); section.className = "workspace-issues-page"; section.setAttribute("aria-label", "问题与恢复");
  const header = document.createElement("div"), title = document.createElement("h2"), description = document.createElement("p"), note = document.createElement("p"), filter = document.createElement("label"), checkbox = document.createElement("input"), list = document.createElement("div"), refreshButton = document.createElement("button");
  header.className = "workspace-issues-header"; title.textContent = "问题与恢复"; description.className = "muted"; description.textContent = "失败提示会短暂显示；问题、受影响对象和下一步恢复建议保留在这里。"; note.setAttribute("role", "status"); checkbox.type = "checkbox"; checkbox.onchange = draw; filter.append(checkbox, " 包括已处理的问题"); list.className = "workspace-issue-list"; refreshButton.type = "button"; refreshButton.className = "secondary"; refreshButton.textContent = "重新读取"; refreshButton.onclick = () => { void refresh(); }; header.append(title, refreshButton); section.append(header, description, note, filter, list);
  let disposed = false, generation = 0;
  function draw() {
    if (disposed) return;
    const values = visibleItems(project(), checkbox.checked);
    list.replaceChildren();
    if (!values.length) { const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = "当前没有未处理的问题。"; list.append(empty); }
    for (const item of values) list.append(issueCard(item, draw, message => { note.textContent = message; }));
  }
  async function refresh() {
    const ticket = ++generation, scope = project(), bound = journal;
    note.textContent = scope ? "正在读取问题记录…" : "打开作品后可查看问题记录。"; draw();
    if (!scope || !bound) return;
    try { const items = await bound.list(scope); if (!disposed && ticket === generation && project() === scope) { restoreErrorHistory(scope, items); note.textContent = "问题记录已与当前作品同步。"; draw(); } }
    catch (error) { if (!disposed && ticket === generation && project() === scope) note.textContent = `问题历史未能读取：${text(error)}。当前页面记录仍保留。`; }
  }
  const onIssuesChanged = () => draw(); window.addEventListener("ave:issue-journal-updated", onIssuesChanged);
  draw(); void refresh();
  return { node: section, refresh, destroy() { disposed = true; generation++; window.removeEventListener("ave:issue-journal-updated", onIssuesChanged); } };
}
export function reportError(error, context = {}) {
  const message = text(error); if (!message) return;
  const scope = context.project_id ?? error?.issue?.project_id ?? project();
  if (error?.issue) { restoreErrorHistory(scope, [error.issue]); publishOperationFailure(message, scope, context.operation_type ?? error.issue.operation_type); return; }
  const known = [...records.values()].find(item => item.project_id === scope && item.message === message && item.status === "open");
  if (known) { if (!known.issue_id) known.count++; publishIssueChange(); publishOperationFailure(message, scope, context.operation_type ?? known.operation_type); if (dialog?.open) renderDialog(); return; }
  const matched = /^([A-Z][A-Z0-9_]+):/.exec(message);
  const value = { project_id: scope, message, code: matched?.[1] ?? "RENDERER_OPERATION_FAILED", operation_type: context.operation_type ?? "renderer.operation", count: 1, updated_at: new Date().toISOString(), status: "open", save_error: error?.journal_error ?? "" };
  retain(value); publishIssueChange(); publishOperationFailure(message, scope, value.operation_type); if (!error?.journal_error) void saveLocal(value);
}
window.addEventListener("error", event => reportError(event.error ?? event.message));
window.addEventListener("unhandledrejection", event => reportError(event.reason));
