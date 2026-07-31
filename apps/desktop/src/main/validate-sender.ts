import type { IpcMainInvokeEvent } from "electron";
import type { ProjectSessionManager } from "./project-session-manager.js";

export const ALLOWED_RENDERER_ORIGIN = "app://renderer";

export function validateRendererUrl(frameUrl: string): void {
  const parsed = new URL(frameUrl);
  if (parsed.protocol !== "app:" || parsed.hostname !== "renderer" || !frameUrl.startsWith(`${ALLOWED_RENDERER_ORIGIN}/`)) throw new Error("untrusted IPC sender origin");
}

export function validateSender(event: IpcMainInvokeEvent, sessions: ProjectSessionManager): void {
  const frameUrl = event.senderFrame?.url ?? "";
  validateRendererUrl(frameUrl);
  if (!sessions.hasWindow(event.sender.id)) throw new Error("untrusted IPC sender window");
}

export function validateProjectSession(event: IpcMainInvokeEvent, sessions: ProjectSessionManager, projectId: string): void {
  validateSender(event, sessions);
  const active = sessions.activeProjectId();
  if (projectId && active && projectId !== active) throw new Error("project session mismatch");
}
