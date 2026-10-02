import { ipcMain } from "electron";
import { validateSender } from "../validate-sender.js";
import type { DesktopContext } from "../types.js";
import { createRequestDispatcher } from "./request-dispatcher.js";
import { showOpenDialogForEvent, showSaveDialogForEvent, showCreationConfirmationForEvent } from "./dialog.js";
import { creationErrorResult } from "./creation-errors.js";
export function registerIpc(context:DesktopContext):void {
 const dispatch=createRequestDispatcher(context,{open:(_c,e,o,v)=>showOpenDialogForEvent(context,e,o,v),save:(_c,e,o,v)=>showSaveDialogForEvent(context,e,o,v),confirm:(e,o,v)=>showCreationConfirmationForEvent(context,e,o,v)});
 for(const channel of ["project.query","project.command","system.choose-files","system.choose-directory","system.flush-complete"]) ipcMain.handle(channel,async(event,raw:unknown)=>{try { validateSender(event,context.sessions); return await dispatch(channel,event,raw); } catch(error) {console.error("AVE IPC sender denied",error); return creationErrorResult("SYSTEM_REQUEST_FAILED",error);} });
}
