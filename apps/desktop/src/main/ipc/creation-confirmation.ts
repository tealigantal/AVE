import type { ProjectHostSession, CreationAuthorizationReview, CreationReauthorizationReview } from "../../../../../packages/platform/project-host/src/public.js";
import type { ProfileConsent, ProfileConsentReview, ProfileDeletionReview, ProfileRepository } from "../../../../../packages/platform/user-profile-store/src/public.js";
import { DesktopLifecycleError } from "../project-session-manager.js";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type CreationConfirmationOptions = Readonly<{
  type: "warning"; title: string; message: string; detail: string;
  buttons: string[]; defaultId: 0; cancelId: 0; noLink: true;
}>;
type ShowConfirmation = (options: CreationConfirmationOptions) => Promise<Readonly<{ response: number }>>;
type CurrentOperation = () => void;
type AuthorizationHost = Pick<ProjectHostSession, "prepareCreationRequestAuthorization" | "beginCreationRequest">;
type ReauthorizationHost = Pick<ProjectHostSession, "prepareCreationRequestReauthorization" | "reauthorizeCreationRequest">;
type ConsentOwner = Pick<ProfileRepository, "prepareConsent" | "configure" | "prepareDeletion" | "forgetSources" | "preparePrincipleDeletion" | "forgetPrinciples">;
const dataNames: Record<string, string> = { request: "本次要求", timeline: "当前作品与时间线", evidence: "素材观察与证据", profile: "创作偏好", frames: "素材抽帧", audio: "素材音频", transcript: "转写", feedback: "反馈原话", manual_diff: "手动修改", selection: "采用选择", history_reference: "获准历史或参考" };
const names = (values: readonly string[]) => values.map(value => dataNames[value] ?? value).join("、");
// Terms are tied to the configured receiving services; changing services requires
// a fresh notice. The record never contains request text or media identifiers.
async function acceptCreationTerms(directory: string, deployment: CreationAuthorizationReview["deployment"], show: ShowConfirmation, assertCurrent: CurrentOperation, selectedDetail?: string): Promise<void> {
  const identity = createHash("sha256").update(JSON.stringify(deployment)).digest("hex");
  const record = JSON.stringify({ version: 1, deployment: identity }) + "\n";
  const path = join(directory, `creation-terms-v1-${identity}.json`);
  try { if (await readFile(path, "utf8") === record) { assertCurrent(); if (selectedDetail) await confirm(show, assertCurrent, "AVE 使用说明", "确认本次模型配置", selectedDetail, "确认并继续"); return; } throw new Error("Invalid creation terms record"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  await confirm(show, assertCurrent, "AVE 使用说明", "开始使用创作功能", "创作时，你导入并选择的素材及创作要求会用于制作作品。画面和相关创作信息可能发送至你配置的模型服务；音频、转写和创作偏好按作品中的选择使用。后台学习可在档案中关闭和管理。请仅导入有权使用的素材。" + (selectedDetail ? `\n\n${selectedDetail}` : ""), "同意并继续");
  await mkdir(directory, { recursive: true });
  assertCurrent();
  try { await writeFile(path, record, { flag: "wx", mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST" || await readFile(path, "utf8") !== record) throw error; }
  assertCurrent();
}
async function confirm(show: ShowConfirmation, assertCurrent: CurrentOperation, title: string, message: string, detail: string, button: string): Promise<void> {
  assertCurrent();
  const result = await show({ type: "warning", title, message, detail, buttons: ["取消", button], defaultId: 0, cancelId: 0, noLink: true });
  assertCurrent();
  if (result.response !== 1) throw new DesktopLifecycleError("DESKTOP_AUTHORIZATION_CANCELLED", "用户取消了本次授权");
}
export async function confirmCreationRequest(host: AuthorizationHost, credential: object, raw: Parameters<ProjectHostSession["beginCreationRequest"]>[1], show: ShowConfirmation, assertCurrent: CurrentOperation, termsDirectory: string) {
  assertCurrent();
  const input = structuredClone(raw), review = host.prepareCreationRequestAuthorization(credential, input);
  const roles: Record<string, string> = { vision: "画面分析", planner: "创作规划", transcription: "音频转写", sound: "声音分析" };
  const selectedDetail = input.model_deployment_digest ? (review.deployment?.routes?.length ? review.deployment.routes.map(route => `${roles[route.role] ?? route.role}：${route.provider} / ${route.model}\n${route.endpoint}`).join("\n\n") : `模型服务：${input.provider} / ${input.model}\n${review.deployment?.endpoint ?? ""}`) : undefined;
  await acceptCreationTerms(termsDirectory, review.deployment, show, assertCurrent, selectedDetail);
  assertCurrent();
  const state = host.beginCreationRequest(credential, input, review);
  return { request_id: state.authorization.request_id, sequence: state.sequence };
}
export async function confirmCreationReauthorization(host: ReauthorizationHost, credential: object, requestId: string, show: ShowConfirmation, assertCurrent: CurrentOperation, termsDirectory: string) {
  assertCurrent();
  const review = host.prepareCreationRequestReauthorization(credential, requestId);
  await acceptCreationTerms(termsDirectory, review.authorization.deployment, show, assertCurrent);
  assertCurrent();
  return host.reauthorizeCreationRequest(credential, review);
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
    "新用户默认仅学习当前作品中明确提交的反馈，使用本次已授权服务，保留30天；不会扫描历史。其他来源、历史引用和长期纠正仍需明确选择，可随时关闭或遗忘。",
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
    review.selected_principle_ids.length ? "撤回选定原则关联的整条学习经验及依赖后继（同一经验中的其他原则也会移除）：" : `遗忘来源项目：\n${review.source_project_ids.join("\n")}`,
    review.removed_principles.map(item => `• ${item.statement}（${item.contexts.join("、")}；来源作品 ${item.source_project_id}）`).join("\n"),
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

export async function confirmPrincipleDeletion(profile: ConsentOwner, credential: object, raw: readonly string[], show: ShowConfirmation, assertCurrent: CurrentOperation) {
  const ids = structuredClone(raw); assertCurrent();
  const review = await profile.preparePrincipleDeletion(credential, ids);
  await confirm(show, assertCurrent, "AVE 撤回经验", "确认撤回选定原则所属经验与依赖经验", profileDeletionDetail(review), "确认撤回关联经验");
  return profile.forgetPrinciples(credential, ids, assertCurrent, review);
}
