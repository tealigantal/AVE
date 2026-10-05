export function jobsPanel(state) {
  const section = document.createElement("section"); section.className = "panel jobs-panel";
  const jobs = state.jobs ?? [];
  section.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">BACKGROUND JOBS</p><h2>后台任务</h2></div><span class="badge">${jobs.length} 个</span></div>`;
  if (jobs.length === 0) { const empty = document.createElement("p"); empty.className = "muted"; empty.textContent = state.status.project === "not-open" ? "打开项目后显示任务状态。" : "暂无后台任务。"; section.append(empty); }
  const states = { PENDING:"等待处理", READY:"准备就绪", RUNNING:"正在处理", RECOVERING:"正在恢复", PAUSED:"已暂停", WAITING_FOR_USER:"等待你的操作", RETRYABLE_FAILED:"处理失败 · 可重新发起", BLOCKED:"已停止 · 需要处理问题", SUCCEEDED:"已完成", CANCELLED:"已取消" };
  for (const job of jobs) {
    const row = document.createElement("div"); row.className = "job-row";
    const name = document.createElement("strong"); name.textContent = ({ "media.browse.v1":"准备素材预览", "media.sample.v1":"分析素材", "media.scene_scan.v1":"识别画面", "render.preview.v1":"生成预览", "render.master.v1":"生成成片" })[job.task_type] ?? "后台处理"; name.title = job.task_type;
    const status = document.createElement("span");
    const progress = typeof job.progress === "number" && Number.isFinite(job.progress) && job.progress >= 0 && job.progress <= 1;
    status.textContent = states[job.state] ?? "任务状态无法识别";
    if (["RUNNING","RECOVERING"].includes(job.state)) status.textContent += progress ? ` · ${Math.round(job.progress * 100)}%` : " · 进度尚未确认";
    if (job.error_class && !["SUCCEEDED","CANCELLED"].includes(job.state)) status.textContent += ` · ${job.error_class}`;
    row.append(name,status); section.append(row);
  }
  return section;
}
