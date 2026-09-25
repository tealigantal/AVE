import { BrowserWindow } from "electron";
import type { IpcMainInvokeEvent, OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { DesktopContext } from "../types.js";
import type { DesktopOperation } from "../project-session-manager.js";
import type { CreationConfirmationOptions } from "./creation-confirmation.js";

export function showOpenDialogForEvent(context: DesktopContext,event: IpcMainInvokeEvent,operation: DesktopOperation,options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  const parent=BrowserWindow.fromWebContents(event.sender);
  return context.sessions.waitForDialog(operation,()=>parent?context.dialog.showOpenDialog(parent,options):context.dialog.showOpenDialog(options));
}
export function showCreationConfirmationForEvent(context: DesktopContext,event: IpcMainInvokeEvent,operation: DesktopOperation,options: CreationConfirmationOptions): Promise<Readonly<{response:number}>> {
  const parent=BrowserWindow.fromWebContents(event.sender);
  return context.sessions.waitForDialog(operation,()=>parent?context.dialog.showMessageBox(parent,options):context.dialog.showMessageBox(options));
}
