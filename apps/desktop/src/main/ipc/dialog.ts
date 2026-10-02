import type { RequestSource } from "../types.js";
import { BrowserWindow, webContents } from "electron";
import type { OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { DesktopContext } from "../types.js";
import type { DesktopOperation } from "../project-session-manager.js";
import type { CreationConfirmationOptions } from "./creation-confirmation.js";

export type ShowSaveDialogForEvent = (context: DesktopContext, event: RequestSource, operation: DesktopOperation, options: Readonly<{ title: string; defaultPath: string; filters: { name: string; extensions: string[] }[] }>) => Promise<Readonly<{ canceled: boolean; filePath?: string }>>;
export const showSaveDialogForEvent: ShowSaveDialogForEvent = (context, event, operation, options) => {
  const sender = webContents.fromId(event.sender.id);
  const parent = sender ? BrowserWindow.fromWebContents(sender) : null;
  return context.sessions.waitForDialog(operation, () => parent ? context.dialog.showSaveDialog(parent, options) : context.dialog.showSaveDialog(options));
};

export function showOpenDialogForEvent(context: DesktopContext,event: RequestSource,operation: DesktopOperation,options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  const sender=webContents.fromId(event.sender.id); const parent=sender?BrowserWindow.fromWebContents(sender):null;
  return context.sessions.waitForDialog(operation,()=>parent?context.dialog.showOpenDialog(parent,options):context.dialog.showOpenDialog(options));
}
export function showCreationConfirmationForEvent(context: DesktopContext,event: RequestSource,operation: DesktopOperation,options: CreationConfirmationOptions): Promise<Readonly<{response:number}>> {
  const sender=webContents.fromId(event.sender.id); const parent=sender?BrowserWindow.fromWebContents(sender):null;
  return context.sessions.waitForDialog(operation,()=>parent?context.dialog.showMessageBox(parent,options):context.dialog.showMessageBox(options));
}
