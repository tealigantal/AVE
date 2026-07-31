import { BrowserWindow } from "electron";
import { join } from "node:path";
import type { ProjectSessionManager } from "./project-session-manager.js";

export function createWindow(currentDirectory: string, sessions: ProjectSessionManager): BrowserWindow {
  const window = new BrowserWindow({
    webPreferences: {
      preload: join(currentDirectory, "../preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  sessions.registerWindow(window);
  window.on("closed", () => sessions.unregisterWindow(window));
  void window.loadURL("app://renderer/index.html");
  return window;
}
