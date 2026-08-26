import { parseStage2ProductActionInput, parseStage2ProductGenerationInput, stage2ProductActionTargetId, type EditorialIntentExecutionReview, type Stage2ProductGenerationReview } from "../../../../../packages/platform/project-host/src/public.js";

type Stage2ConfirmationHost = Readonly<{
  prepareStage2ProductActionReview(input: unknown): Promise<EditorialIntentExecutionReview | undefined>;
  prepareStage2ProductGenerationReview(input: unknown): Promise<Stage2ProductGenerationReview>;
  readStage2Workspace(): Promise<unknown>;
}>;

export type Stage2ConfirmationOptions = Readonly<{
  type: "warning";
  title: string;
  message: string;
  detail: string;
  buttons: readonly string[];
  defaultId: number;
  cancelId: number;
  noLink: boolean;
}>;

export function assertStage2DialogResponse(response: number): void {
  if (response !== 1) throw new Error("PRODUCT_HUMAN_REVIEW_CANCELLED");
}

export function assertStage2PreConfirmationAvailable(action: string, workspace: Readonly<{ contract?: Readonly<{ status?: string }> | null; approved_plans?: readonly Readonly<{ status?: string }>[] }>): void {
  if (action === "contract.approve" && workspace.contract?.status === "approved") throw new Error("PRODUCT_CONTRACT_ALREADY_APPROVED");
  if (action === "story.approve" && workspace.approved_plans?.some((item) => item.status === "approved")) throw new Error("PRODUCT_STORY_CANDIDATE_SET_ALREADY_APPROVED");
}

export function stage2ExecutionReviewLines(review: EditorialIntentExecutionReview | undefined): string[] {
  if (!review) return [];
  return [`精确效果：${review.effect_digest}`, `编译效果：${review.compiled_effect_digest}`, `源身份：${review.source_identity_digest}`, `Timeline：v${review.base_timeline_version} → v${review.expected_final_timeline_version}`, `语义图：${review.semantic_graph_hash}`];
}

export async function afterStage2HumanConfirmation<T, Confirmed = void>(confirm: () => Promise<Confirmed>, perform: (confirmed: Confirmed) => Promise<T> | T): Promise<T> {
  const confirmed = await confirm();
  return perform(confirmed);
}

export async function confirmStage2ActionWithDialog(host: Stage2ConfirmationHost, raw: unknown, showMessageBox: (options: Stage2ConfirmationOptions) => Promise<Readonly<{ response: number }>>, automatedFeedbackRejection = false): Promise<EditorialIntentExecutionReview | undefined> {
  const input = parseStage2ProductActionInput(raw), { action, workspace_digest: workspaceDigest } = input, reason = input.reason.trim();
  const executionReview = await host.prepareStage2ProductActionReview(input);
  const workspace = await host.readStage2Workspace() as any;
  if (!workspaceDigest || workspace.workspace_digest !== workspaceDigest) throw new Error("PRODUCT_WORKSPACE_STALE");
  if (!reason) throw new Error("PRODUCT_ACTION_REASON_REQUIRED");
  assertStage2PreConfirmationAvailable(action, workspace);
  const targetId = stage2ProductActionTargetId(input), lines: string[] = [];
  if (action === "contract.approve") {
    const target = workspace.contract;
    if (!target || target.object_id !== targetId || !["draft", "review"].includes(target.status)) throw new Error("PRODUCT_CONTRACT_UNAVAILABLE_OR_STALE");
    const ref = (value: any) => `${value.object_id}@${value.object_version}#${value.digest}`;
    lines.push(
      `批准 Contract：${target.object_id} · v${target.object_version}`,
      `精确摘要：${target.digest}`,
      `创作目标：${target.creator_goal}`,
      `受众：${target.audience.join("、")}`,
      `平台：${target.platforms.join("、")}`,
      `目标时长：${target.target_duration.value / target.target_duration.timescale} 秒`,
      `要求：${target.requirements.map((item: any) => `[${item.kind}] ${item.statement}`).join("；")}`,
      `隐私策略：${ref(target.privacy_policy_ref)}`,
      `权利策略：${ref(target.rights_policy_ref)}`,
      `允许变换：${target.allowed_transformations.join("、") || "无"}`,
      `保护引用：${target.protected_refs.join("、") || "无"}`,
      `禁止误述：${target.forbidden_misrepresentation.join("、") || "无"}`,
      `禁止结果：${target.forbidden_outcomes.join("、") || "无"}`
    );
  } else if (action === "direction.select") {
    const target = workspace.directions.find((item: any) => item.object_id === targetId && item.status === "candidate");
    if (!target || workspace.directions.filter((item: any) => item.status === "candidate").length < 2) throw new Error("PRODUCT_DIRECTION_COMPARISON_UNAVAILABLE");
    lines.push(`选择方向：${target.title}`, target.thesis ?? "");
  } else if (action === "story.approve") {
    const target = workspace.stories.find((item: any) => item.object_id === targetId && item.status === "candidate");
    if (!target || workspace.stories.filter((item: any) => item.status === "candidate").length < 2) throw new Error("PRODUCT_STORY_COMPARISON_UNAVAILABLE");
    lines.push(`批准故事：${target.thesis}`, target.audience_promise ?? "");
  } else if (["intent.approve", "intent.execute", "feedback.reject"].includes(action)) {
    const target = workspace.intents.find((item: any) => item.object_id === targetId && item.status === "candidate");
    if (!target) throw new Error("PRODUCT_INTENT_UNAVAILABLE_OR_STALE");
    const label = action === "intent.approve" ? "批准精确 Edit Intent" : action === "intent.execute" ? "执行已批准 Edit Intent" : "拒绝反馈修订";
    lines.push(`${label}：${target.object_id}`);
    for (const operation of target.operations) lines.push(`${operation.kind} — ${operation.expected_effect ?? operation.reason ?? "未提供效果说明"} — ${operation.target_refs.join("、")}`);
    lines.push(...stage2ExecutionReviewLines(executionReview));
  } else throw new Error("PRODUCT_ACTION_UNSUPPORTED");
  lines.push(`Workspace：${workspaceDigest.slice(0, 16)}`, `理由：${reason}`);
  const options: Stage2ConfirmationOptions = { type: "warning", title: "AVE 精确人工审批", message: "请在主进程确认当前版本与精确效果", detail: lines.filter(Boolean).join("\n"), buttons: ["取消", action === "feedback.reject" ? "确认拒绝" : "确认批准"], defaultId: 0, cancelId: 0, noLink: true };
  if (automatedFeedbackRejection && action === "feedback.reject") {
    assertStage2DialogResponse(1);
    return executionReview;
  }
  const result = await showMessageBox(options);
  assertStage2DialogResponse(result.response);
  return executionReview;
}

export async function confirmStage2GenerationWithDialog(host: Stage2ConfirmationHost, raw: unknown, showMessageBox: (options: Stage2ConfirmationOptions) => Promise<Readonly<{ response: number }>>): Promise<Stage2ProductGenerationReview> {
  const input = parseStage2ProductGenerationInput(raw);
  const review = await host.prepareStage2ProductGenerationReview(input);
  const workspace = await host.readStage2Workspace() as any;
  if (workspace.workspace_digest !== input.workspace_digest || review.workspace_digest !== input.workspace_digest) throw new Error("PRODUCT_WORKSPACE_STALE");
  const stageLabel = input.stage === "material" ? "Evidence / Direction" : input.stage === "story" ? "Story" : "Edit Intent";
  const approvalLines = review.approval_bundle.map((approval) => `精确子审批：${approval.action} · ${approval.subject_ref.object_type}:${approval.subject_ref.object_id}@${approval.subject_ref.object_version}#${approval.subject_ref.digest} · scope ${approval.affected_scope.join("、") || "无"} · effect ${approval.effect_digest} · 理由 ${approval.reason}`);
  const options: Stage2ConfirmationOptions = {
    type: "warning",
    title: "AVE 精确人工确认",
    message: `确认生成 ${stageLabel}`,
    detail: [...review.summary, ...approvalLines, `精确效果：${review.effect_digest}`, `Workspace：${input.workspace_digest.slice(0, 16)}`, `理由：${input.reason}`].join("\n"),
    buttons: ["取消", "确认生成"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  };
  const result = await showMessageBox(options);
  assertStage2DialogResponse(result.response);
  return review;
}
