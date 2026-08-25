function promptJson(label) { const value = window.prompt(`${label}（输入 JSON）`, "{}"); if (value === null) return null; try { return JSON.parse(value); } catch { throw new Error("JSON 格式无效"); } }

export function editorialPanel(actions, state) {
  const section = document.createElement("section"); section.className = "panel editorial-panel";
  const render = state.renderLatest;
  const stage2Authority = Boolean(state.stage2Workspace?.contract || state.stage2Workspace?.executions?.length || state.stage2Workspace?.intents?.length);
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">EDITORIAL / DELIVERY</p><h2>创作与交付</h2></div><span class="badge">${state.storyPlans.length} Story · ${state.reviewArtifacts.length} Review</span></div><div class="workflow-grid"><div><strong>Story Plan</strong><span>${state.storyPlans.length ? "已有审批计划" : "暂无审批计划"}</span></div><div><strong>Preview / QC</strong><span>${render ? `${render.qc_status ?? "unknown"}` : "尚未渲染"}</span></div><div><strong>Delivery Gate</strong><span>${state.deliveryRecords.length ? "已有登记记录" : "暂无登记"}</span></div><div><strong>Model Runs</strong><span>${state.modelRuns.length} 次候选调用</span></div><div><strong>Export</strong><span>${state.exports.length} 个文件</span></div></div>`;
  const row = document.createElement("div"); row.className = "button-row";
  const add = (label, action, disabled = false) => { const button = document.createElement("button"); button.textContent = label; button.className = "ghost"; button.disabled = state.busy || disabled; button.addEventListener("click", action); row.append(button); };
  add("审批 Story Plan", () => actions.story(promptJson("Story Plan")));
  if (!stage2Authority) add("Preview / QC", actions.render, state.status.project === "not-open");
  add("A/B Compare", () => actions.compare(promptJson("Compare Result")));
  add("Delivery Gate", () => actions.delivery(promptJson("Delivery Manifest")));
  add("登记 Export", actions.export, state.deliveryRecords.length === 0);
  add("生成 AI Story 候选", () => actions.propose(promptJson("候选输入")), state.status.project === "not-open");
  add("刷新 Patch Diff", actions.refresh, state.status.timeline === "no-version");
  if (state.qcIssues.length) { const issues = document.createElement("div"); issues.className = "qc-issues"; issues.innerHTML = `<strong>QC Issues</strong>`; for (const issue of state.qcIssues) { const item = document.createElement("p"); const evidence = Array.isArray(issue.evidence) && issue.evidence.length ? ` · 证据: ${issue.evidence.join(", ")}` : ""; item.textContent = `${issue.code ?? "QC"} · ${issue.blocker === false ? "提示" : "阻断"} · ${issue.message ?? "未提供说明"}${evidence}`; issues.append(item); } section.append(issues); }
  if (state.storyCandidate) { const candidate = document.createElement("pre"); candidate.className = "candidate-output"; candidate.textContent = JSON.stringify(state.storyCandidate, null, 2); section.append(candidate); }
  section.append(row); return section;
}
