import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const read = (path) => readFile(resolve(root, path), "utf8");
const registry = await read("apps/worker-host/src/worker_host/registry.py");
for (const task of ["media.probe.v1", "media.proxy.v1", "media.proxy.map.v1", "render.timeline.v1", "qc.master.v1"]) assert.match(registry, new RegExp(task.replaceAll(".", "\\.")));
for (const removed of ["render.preview.v1", "render.master.v1"]) assert.doesNotMatch(registry, new RegExp(removed.replaceAll(".", "\\.")), `${removed} must not bypass the current ExecutionPlan route`);
for (const path of ["packages/platform/project-host/src/project-host.ts", "packages/platform/render-service/src/render-service.mjs"]) {
  const source = await read(path);
  assert.doesNotMatch(source, /node:child_process|(?:spawn|execFile|run)\s*\([^)]*["'](?:ffmpeg|ffprobe)["']/i, `${path} starts media subprocesses`);
}
const workerSource = await read("apps/worker-host/src/worker_host/main.py");
assert.doesNotMatch(workerSource, /sqlite|project\.sqlite/i);
const runtime = await read("apps/worker-host/src/worker_host/runtime/engine.py");
for (const required of ["handshake", "progress", "cancel", "temporary_workspace", "TIMEOUT", "CANCELLED"]) assert.match(runtime, new RegExp(required));
const client = await read("packages/platform/worker-client/src/runtime.mjs");
assert.match(client, /node:child_process/);
console.log("worker boundary check passed");
