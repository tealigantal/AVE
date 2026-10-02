import type { dialog } from "electron";
import type { DesktopContext } from "./types.js";
import { createHostContext } from "./host-context.js";
import { registerIpc } from "./ipc/register-ipc.js";
// Shared creationCredential stays Host-owned; native and browser transports never receive it.
export async function createCompositionRoot(dialogService:typeof dialog,profileDirectory:string):Promise<DesktopContext> {return {...await createHostContext(profileDirectory),dialog:dialogService};}
export function registerCompositionRoot(context:DesktopContext):void {registerIpc(context);}
