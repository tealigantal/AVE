import type { BrowserWindow } from "electron";
import type { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";

export class ProjectSessionManager {
  private readonly windows = new Map<number, BrowserWindow>();

  constructor(private readonly host: ProjectHostSession) {}

  registerWindow(window: BrowserWindow): void { this.windows.set(window.webContents.id, window); }
  unregisterWindow(window: BrowserWindow): void { this.windows.delete(window.webContents.id); }
  hasWindow(windowId: number): boolean { return this.windows.has(windowId); }
  activeProjectId(): string { const project = this.host.status().project; return project === "not-open" ? "" : project; }
  broadcast(channel: string, payload: unknown): void { for (const window of this.windows.values()) window.webContents.send(channel, payload); }
}
