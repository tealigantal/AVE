import { app, BrowserWindow } from "electron";
import type { ProjectSessionManager } from "./project-session-manager.js";
import { createWindow } from "./window-manager.js";

export function registerAppLifecycle(currentDirectory: string, sessions: ProjectSessionManager): void {
  app.whenReady().then(() => {
    createWindow(currentDirectory, sessions);
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow(currentDirectory, sessions);
    });
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
