// Percentages refer to the currently rendering target, not the entire job.
// A missing or invalid measurement remains indeterminate.
export function renderProgress(production) {
  const value = production?.render_progress;
  if (!value || !["preview", "master"].includes(value.target) || typeof value.fraction !== "number" || !Number.isFinite(value.fraction) || value.fraction < 0 || value.fraction > 1) return null;
  const percent = Math.floor(value.fraction * 100);
  const target = value.target === "preview" ? "预览" : "成片";
  return { fraction: value.fraction, label: `${target}画面编码 ${percent}%` };
}

// Only structured, non-sensitive facts published by Host are displayed.
// Missing values are deliberately omitted rather than inferred.
export function failureFacts(failure) {
  if (!failure || typeof failure !== "object") return [];
  const result = [], phase = { admission: "准备", "material-preparation": "素材准备", observation: "素材分析", "generation-and-commit": "生成初稿", "preview-master-render": "视频渲染", "authorized-feedback-learning": "反馈整理" }[failure.phase];
  if (phase) result.push(`发生阶段：${phase}`);
  if (typeof failure.code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(failure.code)) result.push(`错误代码：${failure.code}`);
  const details = failure.details;
  if (!details || typeof details !== "object") { if (failure.phase === "preview-master-render") result.push("可展示的程序诊断：未记录"); return result; }
  if (details.target === "preview" || details.target === "master") result.push(`输出类型：${details.target === "preview" ? "预览" : "成片"}`);
  const operation = { source_prepare: "准备画面素材", graph_compile: "准备画面处理流程", video_encode: "画面编码", audio_measure: "音频测量", audio_normalize: "音频标准化", audio_verify: "音频复测", output_collect: "整理输出文件" }[details.operation];
  if (operation) result.push(`最后记录步骤：${operation}`);
  if (Number.isFinite(details.elapsed_seconds) && details.elapsed_seconds >= 0) result.push(`已运行：${Math.floor(details.elapsed_seconds)} 秒`);
  if (Number.isFinite(details.timeout_seconds) && details.timeout_seconds > 0) result.push(`任务等待上限：${Math.floor(details.timeout_seconds)} 秒`);
  if (Number.isSafeInteger(details.frame) && details.frame >= 0) result.push(`已处理帧数：${details.frame}`);
  if (Number.isFinite(details.media_seconds) && details.media_seconds >= 0) result.push(`已处理时长：${details.media_seconds.toFixed(1)} 秒`);
  if (Number.isSafeInteger(details.exit_code)) result.push(`处理程序退出码：${details.exit_code}`);
  if (failure.phase === "preview-master-render") result.push(typeof details.diagnostic_summary === "string" && details.diagnostic_summary.trim() ? `程序诊断：\n${details.diagnostic_summary}` : "可展示的程序诊断：未记录");
  return result;
}
