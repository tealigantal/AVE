export function jobsPanel(state) {
  const section = document.createElement("section"); section.className = "panel jobs-panel";
  const jobs = state.jobs ?? [];
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">BACKGROUND JOBS</p><h2>后台任务</h2></div><span class="badge">${jobs.length} 个</span></div>`;
  if (jobs.length === 0) { const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = state.status.project === "not-open" ? "打开项目后显示任务状态。" : "暂无后台任务。"; section.append(empty); }
  for (const job of jobs) { const row = document.createElement("div"); row.className = "job-row"; row.innerHTML = `<strong>${job.task_type}</strong><span>${job.state} · ${Math.round(Number(job.progress ?? 0) * 100)}%</span>`; section.append(row); }
  return section;
}
