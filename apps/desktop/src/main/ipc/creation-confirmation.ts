import type { ProjectHostSession, CreationAuthorizationReview } from "../../../../../packages/platform/project-host/src/public.js";
import type { ProfileConsent, ProfileConsentReview, ProfileDeletionReview, ProfileRepository } from "../../../../../packages/platform/user-profile-store/src/public.js";
import { DesktopLifecycleError } from "../project-session-manager.js";

export type CreationConfirmationOptions = Readonly<{
  type: "warning"; title: string; message: string; detail: string;
  buttons: string[]; defaultId: 0; cancelId: 0; noLink: true;
}>;
type ShowConfirmation = (options: CreationConfirmationOptions) => Promise<Readonly<{ response: number }>>;
type CurrentOperation = () => void;
type AuthorizationHost = Pick<ProjectHostSession, "prepareCreationRequestAuthorization" | "beginCreationRequest">;
type ConsentOwner = Pick<ProfileRepository, "prepareConsent" | "configure" | "prepareDeletion" | "forgetSources">;
const dataNames: Record<string, string> = { request: "本次要求", timeline: "当前作品与时间线", evidence: "素材观察与证据", profile: "创作偏好", frames: "素材抽帧", audio: "素材音频", transcript: "转写", feedback: "反馈原话", manual_diff: "手动修改", selection: "采用选择", history_reference: "获准历史或参考" };
const names = (values: readonly string[]) => values.map(value => dataNames[value] ?? value).join("、");
async function confirm(show: ShowConfirmation, assertCurrent: CurrentOperation, title: string, message: string, detail: string, button: string): Promise<void> {
  assertCurrent();
  const result = await show({ type: "warning", title, message, detail, buttons: ["取消", button], defaultId: 0, cancelId: 0, noLink: true });
  assertCurrent();
  if (result.response !== 1) throw new DesktopLifecycleError("DESKTOP_AUTHORIZATION_CANCELLED", "用户取消了本次授权");
}
export function creationAuthorizationDetail(review: CreationAuthorizationReview): string {
  const input = review.input;
  return [
    `项目：${review.project_id} · 当前版本 v${review.timeline_version}`,
    `要求原文：\n${input.original_text}`,
    `授权素材：\n${input.asset_ids.join("\n")}`,
    `模型服务：${input.provider} / ${input.model}`,
    `接收端：${review.deployment?.endpoint ?? "尚未配置模型服务"}`,
    `可发送的数据：${names(input.allowed_data)}`,
    ...(review.deployment?.routes ? [`分工接收端：\n${review.deployment.routes.map(route => `${route.role}: ${route.provider} / ${route.model} → ${route.endpoint}`).join("\n")}`] : []),
    `不得改变：${input.protected_refs.length ? input.protected_refs.join("、") : "未指定保护对象"}`,
    `有效期：${input.expires_at}`,
    "本次授权包含范围内的素材分析和创作修改；扩大范围需重新授权。",
  ].join("\n\n");
}
export async function confirmCreationRequest(host: AuthorizationHost, credential: object, raw: Parameters<ProjectHostSession["beginCreationRequest"]>[1], show: ShowConfirmation, assertCurrent: CurrentOperation) {
  assertCurrent();
  const input = structuredClone(raw), review = host.prepareCreationRequestAuthorization(credential, input);
  if (review.previous_request_digest === null) await confirm(show, assertCurrent, "AVE 创作请求授权", "确认素材、数据范围与模型服务", creationAuthorizationDetail(review), "授权本次创作");
  assertCurrent();
  const state = host.beginCreationRequest(credential, input, review);
  return { request_id: state.authorization.request_id, sequence: state.sequence };
}
export function profileConsentDetail(review: ProfileConsentReview): string {
  const consent = review.consent;
  return [
    `档案：${review.generation.profile_id} · v${review.generation.version}`,
    `学习：${consent.enabled ? "启用" : "停用"}`,
    `允许的来源项目：\n${consent.source_project_ids.join("\n")}`,
    `允许学习：${names(consent.data_types)}`,
    `可发送至：${consent.external_provider ?? "未授权外部服务"}`,
    `保留至：${consent.retention_until}`,
    "后续学习仍须选择具体经验；开启档案不会自动学习所有历史。",
  ].join("\n\n");
}
export async function confirmProfileConsent(profile: ConsentOwner, credential: object, raw: ProfileConsent, show: ShowConfirmation, assertCurrent: CurrentOperation) {
  const consent = structuredClone(raw); assertCurrent();
  const review = await profile.prepareConsent(credential, consent);
  await confirm(show, assertCurrent, "AVE 学习范围授权", "确认本地创作档案的学习与保留范围", profileConsentDetail(review), "确认学习范围");
  return profile.configure(credential, consent, assertCurrent, review);
}
export function profileDeletionDetail(review: ProfileDeletionReview): string {
  return [
    `档案：${review.generation.profile_id} · v${review.generation.version}`,
    `遗忘来源项目：\n${review.source_project_ids.join("\n")}`,
    `将移除 ${review.removed_events.length} 条经验、${review.removed_principle_ids.length} 条原则，包含依赖这些经验的纠正结果。`,
    "这些来源和受影响经验后续不能重新用于个性化；项目中的作品与历史记录仍保留。",
  ].join("\n\n");
}
export async function confirmProfileDeletion(profile: ConsentOwner, credential: object, raw: readonly string[], show: ShowConfirmation, assertCurrent: CurrentOperation) {
  const sources = structuredClone(raw); assertCurrent();
  const review = await profile.prepareDeletion(credential, sources);
  await confirm(show, assertCurrent, "AVE 遗忘经验", "确认移除指定来源及依赖经验", profileDeletionDetail(review), "确认遗忘");
  return profile.forgetSources(credential, sources, assertCurrent, review);
}
