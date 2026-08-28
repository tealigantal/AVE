import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { qcMaster } from "../../packages/platform/render-service/src/render-service.mjs";
const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-render-service-")); const original = resolve("tests/fixtures/generated/p0-vfr.mp4");
try { assert.equal((await qcMaster(original, undefined, "original")).status, "passed"); assert.equal((await qcMaster(original, undefined, "proxy")).status, "blocked"); } finally { await rm(root, { recursive: true, force: true }); }
console.log("render service check passed");
