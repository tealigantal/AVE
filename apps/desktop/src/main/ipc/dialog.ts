import { BrowserWindow } from "electron";
import type { IpcMainInvokeEvent, OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { DesktopContext } from "../types.js";
import type { EditorialIntentExecutionReview, Stage2ProductGenerationReview } from "../../../../../packages/platform/project-host/src/public.js";
import { confirmStage2ActionWithDialog, confirmStage2GenerationWithDialog } from "./stage2-confirmation.js";

export function showOpenDialogForEvent(context: DesktopContext, event: IpcMainInvokeEvent, options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  const parent = BrowserWindow.fromWebContents(event.sender);
  return parent ? context.dialog.showOpenDialog(parent, options) : context.dialog.showOpenDialog(options);
}

export async function confirmStage2ActionForEvent(context: DesktopContext, event: IpcMainInvokeEvent, raw: unknown): Promise<EditorialIntentExecutionReview | undefined> {
  const parent = BrowserWindow.fromWebContents(event.sender);
  const showMessageBox = (options: Parameters<typeof context.dialog.showMessageBox>[0]) => parent ? context.dialog.showMessageBox(parent, options) : context.dialog.showMessageBox(options);
  const automatedProductReviewRejection = process.env.AVE_ELECTRON_PRODUCT_REVIEW === "1" && process.env.AVE_ELECTRON_PRODUCT_REVIEW_REJECT_CONFIRM === "1";
  return confirmStage2ActionWithDialog(context.host, raw, showMessageBox as any, automatedProductReviewRejection);
}

export async function confirmStage2GenerationForEvent(context: DesktopContext, event: IpcMainInvokeEvent, raw: unknown): Promise<Stage2ProductGenerationReview> {
  const parent = BrowserWindow.fromWebContents(event.sender);
  const showMessageBox = (options: Parameters<typeof context.dialog.showMessageBox>[0]) => parent ? context.dialog.showMessageBox(parent, options) : context.dialog.showMessageBox(options);
  return confirmStage2GenerationWithDialog(context.host, raw, showMessageBox as any);
}
