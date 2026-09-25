import { CreationError } from "../../../../../packages/platform/contract-runtime/src/public.js";
import { ProfileError } from "../../../../../packages/platform/user-profile-store/src/public.js";
import { DesktopLifecycleError } from "../project-session-manager.js";

const messages: Readonly<Record<string,string>> = {
  DESKTOP_AUTHORIZATION_CANCELLED: "已取消授权，未执行这次操作。",
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
  MODEL_CONFIGURATION_INVALID: "模型配置或调用上限不完整。",
  CREATION_OBSERVATION_POLICY_REQUIRED: "尚未配置真实素材采样范围。",
  CREATION_RENDER_ATTEMPT_FAILED: "上次渲染失败已保留；修正原因后需明确发起新的渲染尝试。",
};
export function creationErrorResult(fallback: string,error: unknown) {
  const typed = error instanceof CreationError || error instanceof ProfileError || error instanceof DesktopLifecycleError;
  const candidate = typed ? error.code : error instanceof Error ? error.message.split(":",1)[0]! : "";
  const code = /^(?:CREATION|REQUEST|DRAFT|PROFILE|MODEL|TIMELINE|DESKTOP|RENDER|QC|WORKER|SOURCE|MEDIA|CONTRACT)_[A-Z0-9_]+$/.test(candidate) ? candidate : fallback;
  return { ok: false as const, error: { code, message: messages[code] ?? `操作未完成（${code}）。请核对当前状态与授权；具体原因保留在本地记录中。` } };
}
