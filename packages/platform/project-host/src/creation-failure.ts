/** Project a saved production error to a bounded, user-facing explanation.
 * Raw diagnostics, paths, stack traces and provider responses stay in Host.
 */
type FailureDetails = { target?: "preview" | "master"; operation?: "video_encode" | "audio_measure" | "audio_normalize" | "audio_verify" | "output_collect"; elapsed_seconds?: number; timeout_seconds?: number; frame?: number; exit_code?: number; diagnostic_summary?: string };
export type CreationFailure = Readonly<{ phase: string; code: string; message: string; details?: Readonly<FailureDetails> }>;

const friendly: Readonly<Record<string, string>> = {
  CREATION_LOW_RESOURCE_RENDER_UNAVAILABLE: "当前低资源模式暂不支持作品中的部分剪辑效果，本次未生成成片。已保存的作品仍在。",
  CREATION_PREVIEW_ADAPTATION_UNSUPPORTED: "当前低资源预览暂不支持这个作品中的部分画面或效果，本次未生成成片。已保存的作品仍在。",
  CREATION_PROXY_CACHE_CORRUPT: "预览缓存无法通过完整性检查，本次未生成成片。已保存的作品和原素材仍在；请查看本地问题记录。",
  RENDER_SEGMENT_CACHE_CORRUPT: "分段缓存未通过完整性检查，制作已停止。已保存的作品和原素材仍在；请查看本地问题记录。",
  CREATION_OBSERVATION_MEMORY_BUDGET_EXCEEDED: "素材分析样本超过当前低资源模式的处理预算，本次分析已停止，未发送模型请求。原素材和已保存的作品仍在。",
  MEDIA_IMAGE_RESOURCE_EXHAUSTED: "当前低资源模式无法安全处理这张图片，图片尺寸或内容超过处理预算。本次处理已停止，原素材保留。",
  STILL_PROXY_RESOURCE_EXHAUSTED: "当前低资源模式无法安全生成这张图片的预览，图片尺寸或内容超过处理预算。本次处理已停止，原素材保留。",
  MEDIA_IMAGE_PNG_INVALID: "这张 PNG 图片未通过完整性或格式校验，本次处理已停止，原素材保留。",
  MEDIA_IMAGE_PNG_UNSUPPORTED: "这张 PNG 图片包含当前低资源模式无法安全保留的信息，本次处理已停止，原素材保留。",
  CREATION_PREVIEW_TIMEOUT: "预览画面制作超时，预览尚未完成。已保存的作品仍在；请检查素材和画面设置后再试。",
  CREATION_MASTER_TIMEOUT: "成片制作超时，成片尚未完成。已保存的作品仍在；请检查素材和画面设置后再试。",
  CREATION_RENDER_TIMEOUT: "画面制作超时，预览或成片尚未完成。已保存的作品仍在；请检查素材和画面设置后再试。",
  CREATION_RENDER_QC_BLOCKED: "画面或声音未通过制作检查，未生成可用成片。已保存的作品仍在；请检查素材和声音设置。",
  WORKER_CRASH: "媒体处理程序意外退出，制作未完成。已保存的作品仍在；请稍后重试。",
  ENOSPC: "存储空间不足，制作未完成。请释放空间后重试；已保存的作品仍在。",
  EACCES: "素材或保存位置无法访问，制作未完成。请检查文件是否可读取。",
  EPERM: "素材或保存位置无法访问，制作未完成。请检查文件是否可读取。",
  ENOENT: "制作时找不到所需文件，制作未完成。请检查素材是否仍可访问。",
  FFMPEG_ENCODER_UNAVAILABLE: "视频编码器不可用，画面制作未完成。请检查本机媒体处理组件。",
  FFMPEG_INPUT_INVALID: "素材无法被媒体处理程序识别，画面制作未完成。请检查素材文件是否完整及格式是否支持。",
  MODEL_PROVIDER_FAILED: "连接创作模型时发生问题，制作未完成。请检查网络或服务状态后再试。",
  MODEL_OUTPUT_INVALID: "模型返回内容未通过格式或内容校验，制作已停止。原素材和已保存的作品仍在；请查看本地问题记录。",
  MODEL_TIMEOUT: "创作模型响应超时，制作未完成。请检查网络或服务状态后再试。",
};
const phases = new Set(["admission", "material-preparation", "observation", "generation-and-commit", "preview-master-render", "authorized-feedback-learning"]);
const phaseNames: Readonly<Record<string, string>> = { admission: "开始制作", "material-preparation": "素材准备", observation: "素材分析", "generation-and-commit": "初稿生成", "preview-master-render": "画面制作", "authorized-feedback-learning": "创作经验整理" };

export function projectCreationFailure(record: unknown, state: Readonly<{ status: string; sequence: number; revisions: readonly unknown[] }>): CreationFailure | null {
  if (state.status !== "failed" || !record || typeof record !== "object" || Array.isArray(record)) return null;
  const item = record as Record<string, unknown>;
  if (item.input_revision !== state.revisions.length || item.failure_state_sequence !== state.sequence || typeof item.phase !== "string" || !phases.has(item.phase)) return null;
  const codes: string[] = [], diagnostics: Record<string, unknown>[] = [], seen = new Set<object>();
  function collect(value: unknown, depth: number): void {
    if (!value || typeof value !== "object" || depth > 8 || seen.has(value as object)) return;
    seen.add(value as object);
    const error = value as Record<string, unknown>;
    if (error.render_diagnostic && typeof error.render_diagnostic === "object" && !Array.isArray(error.render_diagnostic)) diagnostics.push(error.render_diagnostic as Record<string, unknown>);
    if (typeof error.code === "string") codes.push(error.code);
    if (typeof error.message === "string") {
      const prefix = /^([A-Z][A-Z0-9_]*):/.exec(error.message)?.[1];
      if (prefix) codes.push(prefix);
      // Unsupported bounded semantics are distinct from actual memory exhaustion.
      const blockers = error.code === "CREATION_RENDER_PREFLIGHT_BLOCKED" ? error.message : prefix === "RENDER_RESOLVER_BLOCKED" ? error.message.slice("RENDER_RESOLVER_BLOCKED:".length) : "";
      if ((item.phase === "preview-master-render" || error.code === "CREATION_RENDER_PREFLIGHT_BLOCKED") && /^[A-Z0-9_]+(?:,[A-Z0-9_]+)*$/.test(blockers) && blockers.split(",").some(code => ["BOUNDED_LINEAR_UNVERIFIED", "BOUNDED_LINEAR_UNSUPPORTED"].includes(code))) codes.push("CREATION_LOW_RESOURCE_RENDER_UNAVAILABLE");
      // Only classify exact well-known media errors; never expose this text.
      // Keep the check restricted to rendering, not arbitrary model outputs.
      if (item.phase === "preview-master-render") {
        const message = error.message.slice(-8000);
        if (/\b(?:RENDER_SEGMENT|BOUNDED_LINEAR)_DISK_SPACE_INSUFFICIENT\b/.test(message)) codes.push("ENOSPC");
        if (/\bRENDER_SEGMENT_CACHE_CORRUPT\b/.test(message)) codes.push("RENDER_SEGMENT_CACHE_CORRUPT");
        if (/\bNo space left on device\b/i.test(message)) codes.push("ENOSPC");
        if (/\bPermission denied\b/i.test(message)) codes.push("EACCES");
        if (/\bNo such file or directory\b/i.test(message)) codes.push("ENOENT");
        if (/\bUnknown encoder\b/i.test(message)) codes.push("FFMPEG_ENCODER_UNAVAILABLE");
        if (/\bInvalid data found when processing input\b/i.test(message)) codes.push("FFMPEG_INPUT_INVALID");
      }
    }
    collect(error.cause, depth + 1);
    if (Array.isArray(error.errors)) for (const child of error.errors.slice(0, 16)) collect(child, depth + 1);
  }
  collect(item.error, 0);
  const priority = ["CREATION_PREVIEW_TIMEOUT", "CREATION_MASTER_TIMEOUT", "CREATION_RENDER_TIMEOUT", "ENOSPC", "EACCES", "EPERM", "ENOENT", "CREATION_OBSERVATION_MEMORY_BUDGET_EXCEEDED", "MEDIA_IMAGE_RESOURCE_EXHAUSTED", "STILL_PROXY_RESOURCE_EXHAUSTED", "MEDIA_IMAGE_PNG_INVALID", "MEDIA_IMAGE_PNG_UNSUPPORTED", "CREATION_LOW_RESOURCE_RENDER_UNAVAILABLE", "CREATION_PREVIEW_ADAPTATION_UNSUPPORTED", "CREATION_PROXY_CACHE_CORRUPT", "RENDER_SEGMENT_CACHE_CORRUPT", "FFMPEG_ENCODER_UNAVAILABLE", "FFMPEG_INPUT_INVALID", "CREATION_RENDER_QC_BLOCKED", "WORKER_CRASH", "MODEL_TIMEOUT", "MODEL_OUTPUT_INVALID", "MODEL_PROVIDER_FAILED"];
  let code = priority.find(candidate => codes.includes(candidate));
  if (!code && item.phase === "preview-master-render" && (codes.includes("TIMEOUT") || codes.includes("WORKER_JOB_TIMEOUT"))) code = "CREATION_RENDER_TIMEOUT";
  const details: FailureDetails = {};
  const codeTarget = code === "CREATION_PREVIEW_TIMEOUT" ? "preview" : code === "CREATION_MASTER_TIMEOUT" ? "master" : null;
  const phaseTarget = item.render_phase === "render:preview" ? "preview" : item.render_phase === "render:master" ? "master" : null;
  if (codeTarget && phaseTarget && codeTarget !== phaseTarget) return null;
  const target = codeTarget ?? phaseTarget;
  const diagnostic = item.phase === "preview-master-render" ? diagnostics.find(value => (value.stage === "preview" || value.stage === "master") && (!target || value.stage === target)) : undefined;
  if (target) details.target = target;
  if (diagnostic) {
    details.target = diagnostic.stage as "preview" | "master";
    if (["video_encode", "audio_measure", "audio_normalize", "audio_verify", "output_collect"].includes(String(diagnostic.operation))) details.operation = diagnostic.operation as FailureDetails["operation"];
    if (Number.isSafeInteger(diagnostic.elapsed_ms) && (diagnostic.elapsed_ms as number) >= 0) details.elapsed_seconds = (diagnostic.elapsed_ms as number) / 1000;
    // deadline_ms is the Worker client deadline, including communication
    // grace; it is not the FFmpeg subprocess timeout.
    if (Number.isSafeInteger(diagnostic.deadline_ms) && (diagnostic.deadline_ms as number) > 0) details.timeout_seconds = (diagnostic.deadline_ms as number) / 1000;
    if (Number.isSafeInteger(diagnostic.frame) && (diagnostic.frame as number) >= 0) details.frame = diagnostic.frame as number;
    if (Number.isSafeInteger(diagnostic.exit_code)) details.exit_code = diagnostic.exit_code as number;
    // Never project arbitrary ffmpeg output: even relative names and metadata
    // may contain private data. Only known error signatures become fixed text.
    const tail = typeof diagnostic.stderr_tail === "string" ? diagnostic.stderr_tail.slice(-2048) : "";
    if (/\bNo space left on device\b/i.test(tail)) details.diagnostic_summary = "媒体处理报告存储空间不足。";
    else if (/\bPermission denied\b/i.test(tail)) details.diagnostic_summary = "媒体处理报告文件访问被拒绝。";
    else if (/\bInvalid data found when processing input\b/i.test(tail)) details.diagnostic_summary = "媒体处理无法识别输入数据。";
    else if (/\bUnknown encoder\b/i.test(tail)) details.diagnostic_summary = "媒体处理报告编码器不可用。";
  }
  const rawCode = codes.find(value => /^[A-Z][A-Z0-9_]{0,79}$/.test(value));
  const unknownMessage = rawCode
    ? `${phaseNames[item.phase]}未完成（错误代码：${rawCode}）；现有记录没有可确认的更细原因。已保存的作品仍在。`
    : `${phaseNames[item.phase]}未完成；记录中没有错误代码和可确认的具体原因。已保存的作品仍在。`;
  return { phase: item.phase, code: code ?? rawCode ?? "CREATION_FAILURE_UNKNOWN", message: code ? friendly[code]! : unknownMessage, ...(Object.keys(details).length ? { details } : {}) };
}
