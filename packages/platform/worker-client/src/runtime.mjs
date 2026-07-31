import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function assertWorkerMessage(value) {
  if (!value || typeof value !== "object" || (typeof value.type !== "string" && typeof value.message_type !== "string")) throw new Error("invalid worker protocol message");
}

export function startWorker(options) {
  const child = spawn(options.command, options.args ?? [], { cwd: options.cwd, stdio: ["pipe", "pipe", "pipe"] });
  let buffer = "";
  const messages = [];
  const waiters = [];
  let stderr = "";
  let exited = false;
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("exit", (code, signal) => { exited = true; const error = new Error(`WORKER_CRASH: worker exited with code=${code ?? "null"} signal=${signal ?? "null"}`); for (const waiter of waiters.splice(0)) { clearTimeout(waiter.timer); waiter.reject(error); } });
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let parsed;
      try { parsed = JSON.parse(line); } catch (error) { child.emit("worker-protocol-error", error); continue; }
      assertWorkerMessage(parsed);
      const waiterIndex = waiters.findIndex((waiter) => waiter.predicate(parsed));
      if (waiterIndex >= 0) {
        const waiter = waiters.splice(waiterIndex, 1)[0];
        clearTimeout(waiter.timer);
        waiter.resolve(parsed);
      } else messages.push(parsed);
    }
  });
  const waitForMessage = (predicate, timeoutMs = 5000) => {
    if (exited) return Promise.reject(new Error("WORKER_CRASH: worker has exited"));
    const existingIndex = messages.findIndex(predicate);
    if (existingIndex >= 0) return Promise.resolve(messages.splice(existingIndex, 1)[0]);
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => { const index = waiters.findIndex((waiter) => waiter.timer === timer); if (index >= 0) waiters.splice(index, 1); reject(new Error(`worker response timeout after ${timeoutMs}ms`)); }, timeoutMs);
      waiters.push({ predicate, resolve: resolvePromise, reject, timer });
    });
  };
  return {
    child,
    messages,
    get stderr() { return stderr; },
    send(message) { assertWorkerMessage(message); child.stdin.write(`${JSON.stringify(message)}\n`); },
    waitFor(requestId, timeoutMs = 5000) { return waitForMessage((message) => (message.request_id ?? message.job_id) === requestId, timeoutMs); },
    waitForMessage,
    cancel(jobId) { this.send({ protocol_version: 1, message_type: "cancel", job_id: jobId }); },
    stop() { if (!child.killed) child.kill(); },
  };
}

function defaultWorkerOptions() {
  const root = resolve(import.meta.dirname, "../../../../");
  const script = resolve(root, "apps/worker-host/src/worker_host/main.py");
  if (!existsSync(script)) throw new Error(`worker host entrypoint not found: ${script}`);
  return { command: process.env.AVE_PYTHON ?? "python", args: [script], cwd: root };
}

export function createLocalWorkerJobPort(options = {}) {
  const workerOptions = { ...defaultWorkerOptions(), ...options };
  return {
    async submit(taskType, input, control = {}) {
      const jobId = control.jobId ?? `worker-${randomUUID()}`;
      const worker = startWorker(workerOptions);
      let abortHandler;
      try {
        worker.send({ protocol_version: 1, message_type: "handshake" });
        await worker.waitForMessage((message) => message.message_type === "handshake");
        worker.send({ protocol_version: 1, message_type: "job", job_id: jobId, payload: { task_type: taskType, ...input } });
        if (control.signal) { abortHandler = () => worker.cancel(jobId); if (control.signal.aborted) abortHandler(); else control.signal.addEventListener("abort", abortHandler, { once: true }); }
        let result;
        do { result = await worker.waitFor(jobId, control.timeoutMs ?? Number(input?.timeout_seconds ?? 300) * 1000 + 5000); if (result.message_type === "progress") control.onProgress?.(result.payload?.progress ?? 0); } while (result.message_type !== "job_result");
        return result;
      } finally {
        if (control.signal && abortHandler) control.signal.removeEventListener("abort", abortHandler);
        worker.stop();
      }
    },
  };
}
