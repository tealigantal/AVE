import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { renderPreviewMaster, qcMaster } from "../../packages/platform/render-service/src/render-service.mjs";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-render-service-")); const original = resolve("tests/fixtures/generated/p0-vfr.mp4");
try { const outputs = await renderPreviewMaster(original, root); assert.ok(outputs.preview.endsWith("preview.mp4")); assert.ok(outputs.master.endsWith("master.mp4")); assert.equal((await qcMaster(outputs.master)).status, "passed"); assert.equal((await qcMaster(resolve(root, "proxy-master.mp4")).catch(() => ({ status: "blocked" }))).status, "blocked"); } finally { await rm(root, { recursive: true, force: true }); }
console.log("render service check passed");
