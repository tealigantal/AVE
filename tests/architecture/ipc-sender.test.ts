import { strict as assert } from "node:assert";
import { validateRendererUrl } from "../../apps/desktop/src/main/validate-sender.js";

assert.doesNotThrow(() => validateRendererUrl("app://renderer/index.html"));
for (const url of ["file:///index.html", "app://evil/index.html", "app://renderer.evil/index.html", "https://renderer/index.html"]) assert.throws(() => validateRendererUrl(url), /untrusted/);
console.log("IPC sender validation check passed");
