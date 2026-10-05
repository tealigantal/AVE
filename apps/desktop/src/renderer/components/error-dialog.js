// The Host owns saved issues. Local entries remain unsaved until acknowledged.
let dialog, details, note, includeHandled, previousFocus, journal;
const records = new Map();
const recoveryLabels = { retry: "重新执行对应操作", "choose-source": "重新选择正确来源", "reopen-project": "重新打开作品", "free-space": "释放磁盘空间后重试", "check-permission": "检查来源与授权", "view-details": "查看详细记录，再决定如何处理" };
const project = () => journal?.projectId() ?? "";
const text = value => value instanceof Error ? value.message : typeof value === "string" ? value : value && typeof value.message === "string" ? `${value.code}: ${value.message}` : String(value);
const identity = value => value.issue_id ? `${value.project_id}:${value.issue_id}` : `${value.project_id}:${value.message}`;
function retain(value) {
  const previous = records.get(identity(value));
  if (!previous || !value.revision || value.revision >= (previous.revision ?? 0)) records.set(identity(value), value);
}
export function configureErrorJournal(value) { journal = value; return () => { if (journal === value) { journal = undefined; if (dialog?.open) dialog.close(); } }; }
export function restoreErrorHistory(projectId, items) {
  for (const item of items) {
    if (item.project_id !== projectId) throw new Error("问题记录不属于当前作品。");
    const message = `${item.code}: ${item.message}`;
    for (const [key, local] of records) if (!local.issue_id && local.project_id === projectId && local.message === message) records.delete(key);
    retain({ ...item, message });
  }
  if (dialog?.open) render();
}
async function saveLocal(value) {
  if (!journal || !value.project_id || value.saving || value.issue_id) return;
  const bound = journal; value.saving = true; value.save_error = "";
  try {
    const message = value.message.startsWith(`${value.code}:`) ? value.message.slice(value.code.length + 1).trim() : value.message;
    const saved = await bound.report(value.project_id, { code: value.code, message, operation_type: value.operation_type });
    records.delete(identity(value)); retain({ ...saved, message: `${saved.code}: ${saved.message}` });
  } catch (error) { value.save_error = `这条问题尚未保存：${text(error)}`; }
  finally { value.saving = false; if (dialog?.open) render(); }
}
function render() {
  const scope = project();
  const items = [...records.values()].filter(item => (!item.project_id || item.project_id === scope) && (includeHandled.checked || !item.status || item.status === "open")).sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  details.replaceChildren();
  if (!items.length) { const empty = document.createElement("p"); empty.textContent = "当前没有未处理的问题。"; details.append(empty); }
  for (const item of items) {
    const card = document.createElement("article"); card.className = "workspace-issue-card";
    const heading = document.createElement("strong"), message = document.createElement("p"), preserved = document.createElement("p"), recovery = document.createElement("p"), technical = document.createElement("details"), summary = document.createElement("summary"), body = document.createElement("pre");
    heading.textContent = item.subject?.label ?? "当前操作"; message.textContent = item.message;
    preserved.className = "muted"; preserved.textContent = item.preserved ?? "未确认的操作结果不会被标记为完成。";
    recovery.textContent = `建议：${recoveryLabels[item.recovery] ?? "查看对应操作及详细记录"}`;
    summary.textContent = "技术详情"; body.textContent = `错误码：${item.code}\n操作：${item.operation_type}\n最近发生：${new Date(item.updated_at).toLocaleString()}\n记录状态：${({ open: "未处理", resolved: "已标记解决", dismissed: "已关闭提示" })[item.status] ?? "尚未保存"}\n出现次数：${item.count}`;
    technical.append(summary, body); card.append(heading, message, preserved, recovery, technical);
    if (item.issue_id && item.status === "open" && journal) {
      for (const [label, status] of [["标记已解决", "resolved"], ["关闭此条提示", "dismissed"]]) {
        const button = document.createElement("button"); button.type = "button"; button.textContent = label;
        button.onclick = async () => {
          button.disabled = true;
          try { const saved = await journal.acknowledge(item.project_id, { issue_id: item.issue_id, expected_revision: item.revision, status }); retain({ ...saved, message: `${saved.code}: ${saved.message}` }); render(); }
          catch (error) { note.textContent = `问题状态未能保存：${text(error)}`; button.disabled = false; }
        }; card.append(button);
      }
    } else if (!item.issue_id) {
      const state = document.createElement("p"); state.className = "stage2-risk"; state.textContent = item.save_error || (item.saving ? "正在保存这条问题…" : "这条问题尚未保存，刷新前请保留详情。"); card.append(state);
      if (item.project_id && !item.saving && journal) { const retry = document.createElement("button"); retry.type = "button"; retry.textContent = "重试保存问题"; retry.onclick = () => { void saveLocal(item); }; card.append(retry); }
    } details.append(card);
  }
}
export function showErrorHistory() {
  if (!dialog?.isConnected) {
    dialog = document.createElement("dialog"); dialog.className = "persistent-error-dialog"; dialog.setAttribute("aria-label", "问题记录");
    const title = document.createElement("h2"); title.textContent = "问题记录";
    note = document.createElement("p"); note.textContent = "已保存的问题可在刷新、重开后查看。关闭提示会保留历史，未处理的问题不会因其他操作成功而消失。";
    const filter = document.createElement("label"); includeHandled = document.createElement("input"); includeHandled.type = "checkbox"; includeHandled.onchange = render; filter.append(includeHandled, " 包括已处理的问题");
    details = document.createElement("div"); details.className = "workspace-issue-list"; details.setAttribute("aria-live", "polite");
    const close = document.createElement("button"); close.type = "button"; close.textContent = "返回当前操作"; close.onclick = () => { dialog.close(); if (previousFocus?.isConnected) previousFocus.focus(); };
    dialog.addEventListener("cancel", event => event.preventDefault()); dialog.append(title, note, filter, details, close); document.body.append(dialog);
  }
  render(); if (!dialog.open) { previousFocus = document.activeElement; dialog.showModal(); }
  const scope = project(), bound = journal;
  if (scope && bound) void bound.list(scope).then(items => { if (journal === bound && project() === scope) restoreErrorHistory(scope, items); }, error => { if (project() === scope) note.textContent = `问题历史未能读取：${text(error)}。当前页面记录仍保留。`; });
}
export function reportError(error, context = {}) {
  const message = text(error); if (!message) return;
  const scope = context.project_id ?? error?.issue?.project_id ?? project();
  if (error?.issue) { restoreErrorHistory(scope, [error.issue]); if (scope === project()) showErrorHistory(); return; }
  const known = [...records.values()].find(item => item.project_id === scope && item.message === message && item.status === "open");
  if (known) { if (!known.issue_id) known.count++; if (dialog?.open) render(); return; }
  const matched = /^([A-Z][A-Z0-9_]+):/.exec(message);
  const value = { project_id: scope, message, code: matched?.[1] ?? "RENDERER_OPERATION_FAILED", operation_type: context.operation_type ?? "renderer.operation", count: 1, updated_at: new Date().toISOString(), status: "open", save_error: error?.journal_error ?? "" };
  retain(value); if (scope === project() || !scope) showErrorHistory(); if (!error?.journal_error) void saveLocal(value);
}
window.addEventListener("error", event => reportError(event.error ?? event.message));
window.addEventListener("unhandledrejection", event => reportError(event.reason));
