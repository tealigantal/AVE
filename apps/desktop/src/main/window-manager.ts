import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import type { ProjectSessionManager } from "./project-session-manager.js";

export function createWindow(currentDirectory: string, sessions: ProjectSessionManager): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 980,
    minHeight: 720,
    webPreferences: {
      preload: join(currentDirectory, "../preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const windowId = sessions.registerWindow(window);
  window.on("close", event => {
    if (process.platform !== "darwin" && !sessions.shutdownComplete && BrowserWindow.getAllWindows().length === 1) {
      event.preventDefault();
      app.quit();
    }
  });
  window.on("closed", () => sessions.unregisterWindow(windowId));
  void window.loadURL("app://renderer/index.html");
  return window;
}
