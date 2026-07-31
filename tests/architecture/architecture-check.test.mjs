import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { checkRepository } from "../../tools/architecture-check/check.mjs";

async function fixture(files) {
  const root = await mkdtemp(resolve(tmpdir(), "ave-architecture-"));
  for (const [relativePath, source] of Object.entries(files)) {
    const target = resolve(root, relativePath);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, source, "utf8");
  }
  return root;
}
async function rejects(files, expected) {
  const root = await fixture(files);
  try { await assert.rejects(() => checkRepository(root), expected); }
  finally { await rm(root, { recursive: true, force: true }); }
}

await rejects({ "packages/core/bad.ts": 'import { readFile } from "node:fs";' }, /Core imports or references/);
await rejects({ "apps/desktop/src/renderer/bad.ts": 'import storage from "../../../packages/platform/project-storage/src/public.js";' }, /Renderer crosses/);
await rejects({ "apps/worker-host/src/worker_host/bad.py": 'import sqlite3\nconnection = sqlite3.connect("project.sqlite")' }, /Worker Host accesses SQLite/);
await rejects({ "apps/dev-cli/src/bad.ts": 'import { execFile } from "node:child_process"; execFile("ffprobe");' }, /Application directly starts media subprocesses/);
await rejects({ "packages/platform/render-service/src/bad.mjs": 'import { spawn } from "node:child_process"; spawn("ffmpeg");' }, /Node Platform starts or references media subprocesses/);
await rejects({ "packages/core/a.ts": 'import { x } from "../platform/demo/src/internal.js";' }, /Core cannot depend on Platform/);
await rejects({
  "packages/platform/a/src/a.ts": 'const run = (name) => name; run("ffmpeg");',
  "packages/platform/b/src/b.ts": 'const run = (name) => name; run("ffmpeg");',
}, /multiple FFmpeg/);

const validRoot = await fixture({
  "packages/core/good.ts": 'export const value = 1;',
  "packages/platform/demo/src/public.ts": 'export const value = 1;',
  "packages/platform/worker-client/src/public.ts": 'import { spawn } from "node:child_process"; export { spawn };',
  "packages/platform/demo/src/consumer.ts": 'import { value } from "./public.js"; export { value };',
});
try { await checkRepository(validRoot); } finally { await rm(validRoot, { recursive: true, force: true }); }
console.log("architecture regression checks passed");
