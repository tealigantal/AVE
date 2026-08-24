import { BrowserWindow } from "electron";
import type { IpcMainInvokeEvent, OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { DesktopContext } from "../types.js";
import { parseStage2ProductActionInput, stage2ProductActionTargetId } from "../../../../../packages/platform/project-host/src/public.js";
import { assertStage2DialogResponse } from "./stage2-confirmation.js";

export function showOpenDialogForEvent(context: DesktopContext, event: IpcMainInvokeEvent, options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  const parent = BrowserWindow.fromWebContents(event.sender);
  return parent ? context.dialog.showOpenDialog(parent, options) : context.dialog.showOpenDialog(options);
}

export async function confirmStage2ActionForEvent(context: DesktopContext, event: IpcMainInvokeEvent, raw: unknown): Promise<void> {
  const input = parseStage2ProductActionInput(raw), { action, workspace_digest: workspaceDigest } = input, reason = input.reason.trim();
  const workspace = context.host.readStage2Workspace() as any;
  if (!workspaceDigest || workspace.workspace_digest !== workspaceDigest) throw new Error("PRODUCT_WORKSPACE_STALE");
  if (!reason) throw new Error("PRODUCT_ACTION_REASON_REQUIRED");
  const targetId = stage2ProductActionTargetId(input), lines: string[] = [];
  if (action === "direction.select") {
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
  } else throw new Error("PRODUCT_ACTION_UNSUPPORTED");
  lines.push(`Workspace：${workspaceDigest.slice(0, 16)}`, `理由：${reason}`);
  const parent = BrowserWindow.fromWebContents(event.sender);
  const options = { type: "warning" as const, title: "AVE 精确人工审批", message: "请在主进程确认当前版本与精确效果", detail: lines.filter(Boolean).join("\n"), buttons: ["取消", action === "feedback.reject" ? "确认拒绝" : "确认批准"], defaultId: 0, cancelId: 0, noLink: true };
  const automatedProductReviewRejection = action === "feedback.reject"
    && process.env.AVE_ELECTRON_PRODUCT_REVIEW === "1"
    && process.env.AVE_ELECTRON_PRODUCT_REVIEW_REJECT_CONFIRM === "1";
  if (automatedProductReviewRejection) {
    assertStage2DialogResponse(1);
    return;
  }
  const result = parent ? await context.dialog.showMessageBox(parent, options) : await context.dialog.showMessageBox(options);
  assertStage2DialogResponse(result.response);
}
