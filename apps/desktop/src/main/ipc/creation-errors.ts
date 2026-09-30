import { CreationError } from "../../../../../packages/platform/contract-runtime/src/public.js";
import { ProfileError } from "../../../../../packages/platform/user-profile-store/src/public.js";
import { DesktopLifecycleError } from "../project-session-manager.js";
import { ModelGatewayError } from "../../../../../packages/platform/model-gateway/src/public.js";

const messages: Readonly<Record<string,string>> = {
  DESKTOP_AUTHORIZATION_CANCELLED: "已取消授权，未执行这次操作。",
  DESKTOP_EXPORT_CANCELLED: "已取消导出，未保存新的成片文件。已保存的作品版本仍保留。",
  DESKTOP_RECENT_INDEX_INVALID: "近期作品记录已损坏，原记录没有清空。请查看本地错误记录；仍可通过打开作品选择项目。",
  DESKTOP_RECENT_INPUT_INVALID: "近期作品请求无效，未打开其他作品。",
  DESKTOP_RECENT_NOT_FOUND: "此作品不在当前本地用户的近期列表中，请通过打开作品重新选择。",
  DESKTOP_RECENT_PROJECT_CHANGED: "这个位置的项目身份已变化，未恢复任务。请通过打开作品重新确认位置。",
  DESKTOP_RECENT_SAVE_FAILED_AFTER_OPEN: "作品已成功打开，但近期列表保存失败。项目内容仍保留，请查看本地错误记录。",
  CREATION_PLANNING_QUERY_ID_MISMATCH: "创作规划回复的查询编号不匹配，本次制作已停止。",
  DESKTOP_SESSION_STALE: "项目或窗口已变化，此响应不再适用于当前会话；请读取当前状态。",
  REQUEST_AUTHORIZATION_REVIEW_STALE: "确认期间项目、素材或请求发生变化，请重新核对授权。",
  PROFILE_CONTROL_REVIEW_STALE: "确认期间档案或遗忘影响范围发生变化，请重新核对。",
  REQUEST_REVISION_STALE: "已有新的创作要求，旧结果未提交。",
  REQUEST_BASE_STALE: "作品已被修改，旧结果未提交；请基于当前作品补充要求。",
  REQUEST_CANCELLED: "本次制作已取消。",
  REQUEST_REVOKED: "本次授权已撤销。",
  REQUEST_EXPIRED: "本次授权已过期，需要新的明确授权。",
  PROFILE_CONSENT_EXPIRED: "档案学习或保留期限已到期，请重新核对范围。",
  PROFILE_CONFIGURATION_REQUIRED: "尚未配置本地创作档案。",
  MODEL_CONFIGURATION_INVALID: "模型配置不完整或与所需能力不匹配。",
  MODEL_PROVIDER_FAILED: "模型服务未能完成这次请求，本次制作已停止。已保存的作品版本仍保留；请查看本地记录中的具体原因。",
  MODEL_CANCELLED: "该模型调用已取消；已经发送的请求仍可能计费。",
  CREATION_OBSERVATION_POLICY_REQUIRED: "尚未配置真实素材采样范围。",
  CREATION_RENDER_ATTEMPT_FAILED: "上次渲染失败已保留；修正原因后需明确发起新的渲染尝试。",
  CREATION_PACING_GOAL_UNMET: "方案的平均镜头时长没有增加，或出现比参考作品更短的镜头，未满足这次舒展节奏要求；本次制作已停止，原作品仍保留。",
  CREATION_PACING_MAPPING_REQUIRED: "逐个延长镜头需要明确对应的参考片段；当前无法可靠对应，本次制作已停止。",
  CREATION_PACING_PRESERVATION_CONFLICT: "更长镜头的要求与当前受保护片段的时长冲突；请明确要保留原片段还是调整这项节奏要求。",
  CREATION_PACING_BASE_REQUIRED: "无法读取用于比较节奏的作品或完整镜头时长，本次制作已停止。",
  CREATION_PACING_REFERENCE_REQUIRED: "请先打开并观看要比较节奏的作品版本；当前没有可验证的参考记录，本次制作已停止。",
  CREATION_PACING_REFERENCE_STALE: "节奏参考版本已发生变化，旧方案未提交。",
  CREATION_PACING_BUDGET_INVALID: "节奏约束与实际参考作品不一致，本次制作已停止，具体原因已保留。",
  CREATION_PLANNING_RECEIPT_REBOUND: "创作确认与本次已核验的选材记录不匹配，制作已停止。",
  CREATION_PLANNING_EXCHANGE_INVALID: "模型没有按当前规划步骤返回有效方案，本次制作已停止，原始返回已保留。",
  CREATION_PLANNING_BUDGET_EXCEEDED: "本次有限规划未得到可提交的可行方案，制作已停止；不会自动重复调用模型。",
  CREATION_DURATION_TARGET_UNMET: "生成方案的总时长不符合当前要求，本次制作已停止。",
  CREATION_SHOT_GOAL_UNMET: "生成方案的镜头数量不符合明确要求，本次制作已停止，原作品仍保留。",
  CREATION_SHOT_GOAL_INVALID: "镜头数量需要是有效的正整数，请调整这项要求。",
  CREATION_SELECTION_GOAL_UNMET: "这份方案只改变了时长，没有按要求重新选材或排序，本次制作已停止，原作品仍保留。",
  CREATION_PRESERVATION_GOAL_UNMET: "生成方案改变了你明确要求保留的画面范围、顺序或色彩设置，本次制作已停止，原作品仍保留。",
  CREATION_REFRAME_UNSUPPORTED: "方案选择的构图方式不适用于当前画幅，本次制作已停止。",
  CREATION_TRANSFORM_BOUNDS_INVALID: "方案的缩放或平移超出当前画面范围，本次制作已停止。",
  CREATION_DURATION_TARGET_INEXACT: "当前精确时长无法用作品的完整帧表示，请调整时长要求。",
  CREATION_TIME_INEXACT: "需要精确保留的片段或字幕时间无法对齐作品帧边界，本次制作已停止。",
  CREATION_DECISION_CAPACITY_INSUFFICIENT: "生成方案选择的可用素材区间不足以安排目标时长，本次制作已停止。",
  CREATION_DECISION_WINDOW_INVALID: "生成方案包含无效的素材时间区间，本次制作已停止。",
  CONTRACT_CREATION_DECISION_INVALID: "模型返回的创作方案不符合当前格式，原始结果已保留，本次制作已停止。",
};
export function creationErrorResult(fallback: string,error: unknown) {
  const typed = error instanceof CreationError || error instanceof ProfileError || error instanceof DesktopLifecycleError || error instanceof ModelGatewayError;
  const candidate = typed ? error.code : error instanceof Error ? error.message.split(":",1)[0]! : "";
  const code = /^(?:CREATION|REQUEST|DRAFT|PROFILE|MODEL|TIMELINE|DESKTOP|RENDER|QC|WORKER|SOURCE|MEDIA|CONTRACT)_[A-Z0-9_]+$/.test(candidate) ? candidate : fallback;
  const reason = error instanceof ModelGatewayError && error.cause instanceof CreationError ? messages[error.cause.code] : undefined;
  return { ok: false as const, error: { code, message: (reason ? `${reason} ` : "") + (messages[code] ?? `操作未完成（${code}）。请核对当前状态与授权；具体原因保留在本地记录中。`) } };
}
