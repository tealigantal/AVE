import { BrowserWindow } from "electron";
import type { IpcMainInvokeEvent, OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { DesktopContext } from "../types.js";

export function showOpenDialogForEvent(context: DesktopContext, event: IpcMainInvokeEvent, options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
  const parent = BrowserWindow.fromWebContents(event.sender);
  return parent ? context.dialog.showOpenDialog(parent, options) : context.dialog.showOpenDialog(options);
}
