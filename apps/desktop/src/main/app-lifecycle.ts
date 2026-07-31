import { app, BrowserWindow } from "electron";
import type { ProjectSessionManager } from "./project-session-manager.js";
import { createWindow } from "./window-manager.js";

export function registerAppLifecycle(currentDirectory: string, sessions: ProjectSessionManager): void {
  app.whenReady().then(() => {
    const window = createWindow(currentDirectory, sessions);
    if (process.env.AVE_ELECTRON_SMOKE === "1") {
      window.webContents.once("did-finish-load", async () => {
        try {
          const result = await window.webContents.executeJavaScript("({ title: document.title, projectApi: typeof window.projectApi === 'object', workbench: Boolean(document.querySelector('.workbench-shell')) })", true);
          console.log(`AVE_ELECTRON_RUNTIME_SMOKE ${JSON.stringify(result)}`);
          const code = result.title === "AVE 工作台" && result.projectApi && result.workbench ? 0 : 1;
          app.quit();
          setTimeout(() => process.exit(code), 250);
        } catch (error) {
          console.error(`AVE_ELECTRON_RUNTIME_SMOKE_FAILED ${error instanceof Error ? error.message : String(error)}`);
          app.quit();
          setTimeout(() => process.exit(1), 250);
        }
      });
    }
    app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(currentDirectory, sessions); });
  });
  app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
}
