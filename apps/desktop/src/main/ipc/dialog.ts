import { BrowserWindow } from "electron";
import type { IpcMainInvokeEvent, OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { DesktopContext } from "../types.js";
import type { DesktopOperation } from "../project-session-manager.js";
import type { CreationConfirmationOptions } from "./creation-confirmation.js";

export type ShowSaveDialogForEvent = (context: DesktopContext, event: IpcMainInvokeEvent, operation: DesktopOperation, options: Readonly<{ title: string; defaultPath: string; filters: { name: string; extensions: string[] }[] }>) => Promise<Readonly<{ canceled: boolean; filePath?: string }>>;
export const showSaveDialogForEvent: ShowSaveDialogForEvent = (context, event, operation, options) => {
  const parent = BrowserWindow.fromWebContents(event.sender);
  return context.sessions.waitForDialog(operation, () => parent ? context.dialog.showSaveDialog(parent, options) : context.dialog.showSaveDialog(options));
};

export function showOpenDialogForEvent(context: DesktopContext,event: IpcMainInvokeEvent,operation: DesktopOperation,options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  const parent=BrowserWindow.fromWebContents(event.sender);
  return context.sessions.waitForDialog(operation,()=>parent?context.dialog.showOpenDialog(parent,options):context.dialog.showOpenDialog(options));
}
export function showCreationConfirmationForEvent(context: DesktopContext,event: IpcMainInvokeEvent,operation: DesktopOperation,options: CreationConfirmationOptions): Promise<Readonly<{response:number}>> {
  const parent=BrowserWindow.fromWebContents(event.sender);
  return context.sessions.waitForDialog(operation,()=>parent?context.dialog.showMessageBox(parent,options):context.dialog.showMessageBox(options));
}
