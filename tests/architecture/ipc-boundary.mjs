import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const files = {
  main: await readFile(resolve(root, "apps/desktop/src/main/main.ts"), "utf8"),
  register: await readFile(resolve(root, "apps/desktop/src/main/ipc/register-ipc.ts"), "utf8"),
  sender: await readFile(resolve(root, "apps/desktop/src/main/validate-sender.ts"), "utf8"),
  protocol: await readFile(resolve(root, "apps/desktop/src/main/protocol-handler.ts"), "utf8"),
  preload: await readFile(resolve(root, "apps/desktop/src/preload.ts"), "utf8"),
  projectHandlers: await readFile(resolve(root, "apps/desktop/src/main/ipc/project.handlers.ts"), "utf8"),
  projectMediaProjection: await readFile(resolve(root, "apps/desktop/src/main/ipc/project-media-projection.ts"), "utf8"),
};
assert.doesNotMatch(files.main, /ipcMain|commandType|queryType/);
assert.match(files.register, /ipcMain\.handle\("project\.query"/);
assert.match(files.register, /ipcMain\.handle\("project\.command"/);
for (const handler of ["project.handlers", "timeline.handlers", "media.handlers", "editorial.handlers", "render.handlers", "qc.handlers", "jobs.handlers"]) assert.match(files.register, new RegExp(handler.replace(".", "\\.")));
assert.match(files.sender, /app:\/\/renderer/);
assert.doesNotMatch(files.sender, /file:\/\//);
assert.match(files.protocol, /protocol\.handle\("app"/);
for (const api of ["subscribeProjectEvents", "chooseFiles", "chooseDirectory"]) assert.match(files.preload, new RegExp(api));
assert.match(files.projectHandlers, /import \{ safeMediaRows \} from "\.\/project-media-projection\.js"/);
assert.match(files.projectHandlers, /safeMediaRows\(context\.host\.listMedia\(\)\)/);
assert.match(files.projectMediaProjection, /USER_VISIBLE_MEDIA_LOCATION_TYPES\s*=\s*new Set\(\["original", "proxy"\]\)/);
assert.match(files.projectMediaProjection, /permission_state:\s*row\.metadata\?\.permission_state/);
assert.doesNotMatch(files.projectMediaProjection, /permission_state:\s*row\.permission_state/);
assert.doesNotMatch(files.projectMediaProjection, /permission_decision/);
console.log("IPC boundary check passed");
