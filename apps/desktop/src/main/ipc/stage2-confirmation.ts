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

export async function confirmStage2FeedbackWithDialog(raw: unknown, showMessageBox: (options: Stage2ConfirmationOptions) => Promise<Readonly<{ response: number }>>): Promise<void> {
  const input = raw as any, target = input?.target, trim = target?.trim_duration, proposed = target?.proposed_source;
  const exactKeys = (value: unknown, keys: readonly string[], label: string) => {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value as object).sort().join(",") !== [...keys].sort().join(",")) throw new Error(`FEEDBACK_CONFIRMATION_INVALID:${label}`);
  };
  exactKeys(input, ["alternatives", "base_execution_id", "confidence", "diagnosis_id", "feedback_text", "intent_id", "reason", "target"], "input");
  exactKeys(target, ["clip_id", "proposed_source", "track_id", "trim_duration"], "target");
  exactKeys(trim, ["schema_version", "timescale", "value"], "trim-duration");
  exactKeys(proposed, ["asset_id", "end", "start"], "proposed-source");
  if (!input.feedback_text?.trim() || !input.reason?.trim() || trim.schema_version !== 1 || !Number.isSafeInteger(trim.value) || trim.value <= 0 || !Number.isSafeInteger(trim.timescale) || trim.timescale <= 0 || !Number.isSafeInteger(proposed.end?.timescale) || proposed.end.timescale <= 0) throw new Error("FEEDBACK_CONFIRMATION_INVALID");
  const sourceUnits = BigInt(trim.value) * BigInt(proposed.end.timescale), divisor = BigInt(trim.timescale);
  if (sourceUnits % divisor !== 0n || sourceUnits / divisor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("FEEDBACK_TRIM_TIMEBASE_NOT_EXACT:native-confirmation");
  const options: Stage2ConfirmationOptions = { type: "warning", title: "AVE 精确反馈确认", message: "请确认精确裁剪时长与源 PTS", detail: [`目标：${target.track_id}/${target.clip_id}`, `精确时长：${trim.value}/${trim.timescale} 秒`, `精确源 PTS 裁剪：${sourceUnits / divisor} @ ${proposed.end.timescale}`, `修订源范围：${proposed.start.value}/${proposed.start.timescale} → ${proposed.end.value}/${proposed.end.timescale}`, `反馈：${input.feedback_text.trim()}`, `理由：${input.reason.trim()}`].join("\n"), buttons: ["取消", "确认创建反馈修订"], defaultId: 0, cancelId: 0, noLink: true };
  const result = await showMessageBox(options);
  assertStage2DialogResponse(result.response);
}

export async function confirmStage2ActionWithDialog(host: Stage2ConfirmationHost, raw: unknown, showMessageBox: (options: Stage2ConfirmationOptions) => Promise<Readonly<{ response: number }>>): Promise<EditorialIntentExecutionReview | undefined> {
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
