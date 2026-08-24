import { app, dialog } from "electron";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCompositionRoot, registerCompositionRoot } from "./composition-root.js";
import { registerAppProtocol } from "./protocol-handler.js";
import { registerAppLifecycle } from "./app-lifecycle.js";

export function bootstrap(): void {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  const root = resolve(currentDirectory, "../../../..");
  const context = createCompositionRoot(dialog);
  registerCompositionRoot(context);
  app.whenReady().then(() => registerAppProtocol(resolve(root, "apps/desktop/src/renderer")));
  registerAppLifecycle(currentDirectory, context.sessions, context.host);
}
