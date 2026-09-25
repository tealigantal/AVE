import { app, BrowserWindow, dialog } from "electron";
import type { ProjectSessionManager } from "./project-session-manager.js";
import { createWindow } from "./window-manager.js";

export function registerAppLifecycle(currentDirectory: string, sessions: ProjectSessionManager): void {
  // Bootstrap invokes this after app readiness, so initial window failures
  // propagate to the same startup cleanup boundary as IPC/protocol failures.
  createWindow(currentDirectory, sessions);
  app.on("activate", () => {
    if (sessions.acceptingRequests && BrowserWindow.getAllWindows().length === 0) createWindow(currentDirectory, sessions);
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

export function registerAppShutdown(sessions: ProjectSessionManager): void {
  let pending = false;
  app.on("before-quit", event => {
    if (sessions.shutdownComplete) return;
    event.preventDefault();
    if (pending) return;
    pending = true;
    // Start the second native quit invocation on a separate event-loop turn.
    void sessions.shutdown().then(() => { setImmediate(() => { pending = false; app.quit(); }); }, error => {
      pending = false;
      console.error("AVE shutdown failed", error);
      dialog.showErrorBox("AVE 暂未完成退出", `项目或档案尚未安全关闭。请保留此窗口，处理原因后再次退出。\n${error instanceof Error ? error.message : String(error)}`);
    });
  });
}
