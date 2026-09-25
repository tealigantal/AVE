import { app, dialog } from "electron";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCompositionRoot, registerCompositionRoot } from "./composition-root.js";
import { registerAppProtocol } from "./protocol-handler.js";
import { registerAppLifecycle, registerAppShutdown } from "./app-lifecycle.js";
import type { DesktopContext } from "./types.js";

export function bootstrap(): void {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  const root = resolve(currentDirectory, "../../../..");
  let context: DesktopContext | undefined;
  void app.whenReady().then(async () => {
    context = await createCompositionRoot(dialog, resolve(app.getPath("userData"), "creator-profile"));
    registerAppShutdown(context.sessions);
    try {
      registerCompositionRoot(context);
      registerAppProtocol(resolve(root, "apps/desktop/src/renderer"));
      registerAppLifecycle(currentDirectory, context.sessions);
    } catch (cause) {
      try { await context.sessions.shutdown(); } catch (cleanup) { throw new AggregateError([cause, cleanup], "Desktop registration and shutdown failed", { cause }); }
      throw cause;
    }
  }).catch(error => {
    console.error("AVE startup failed", error);
    dialog.showErrorBox("AVE 无法启动", error instanceof Error ? error.message : String(error));
    if (!context || context.sessions.shutdownComplete) app.quit();
  });
}
