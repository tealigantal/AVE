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
    stop() {
      if (child.killed) return;
      if (process.platform === "win32" && child.pid) {
        const terminator = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
        terminator.on("error", () => child.kill());
      } else child.kill();
    },
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
  let client;
  return {
    submit(taskType, input, control = {}) {
      client ??= createPersistentWorkerClient(workerOptions);
      return client.submit(taskType, input, control);
    },
    async close() {
      const current = client;
      client = undefined;
      if (current) await current.close();
    },
  };
}

export function createPersistentWorkerClient(workerOptions) {
  let worker;
  let ready;
  let generation = 0;
  let closed = false;

  const ensureWorker = async () => {
    if (closed) throw new Error("WORKER_CLIENT_CLOSED");
    if (!worker) {
      const next = startWorker(workerOptions);
      worker = next;
      generation += 1;
      next.send({ protocol_version: 1, message_type: "handshake" });
      ready = next.waitForMessage((message) => message.message_type === "handshake", 5000).then(() => next).catch((error) => {
        resetAfterCrash(next);
        throw error;
      });
    }
    return ready;
  };

  const resetAfterCrash = (failedWorker) => {
    if (worker === failedWorker) {
      failedWorker.stop();
      worker = undefined;
      ready = undefined;
    }
  };

  const submitAttempt = async (taskType, input, control) => {
    const active = await ensureWorker();
    const jobId = control.jobId ?? `worker-${randomUUID()}`;
    const requestId = `${jobId}:g${generation}:${randomUUID()}`;
    pending.add(jobId);
    let abortHandler;
    active.send({ protocol_version: 1, message_type: "job", request_id: requestId, job_id: jobId, payload: { task_type: taskType, ...input } });
    if (control.signal) {
      abortHandler = () => active.cancel(jobId);
      if (control.signal.aborted) abortHandler();
      else control.signal.addEventListener("abort", abortHandler, { once: true });
    }
    try {
      const deadline = Date.now() + (control.timeoutMs ?? Number(input?.timeout_seconds ?? 300) * 1000 + 5000);
      while (true) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error("WORKER_JOB_TIMEOUT");
        const result = await active.waitForMessage((message) => message.request_id === requestId || (!message.request_id && message.job_id === jobId), remaining);
        if (result.message_type === "progress") { control.onProgress?.(result.payload?.progress ?? 0); continue; }
        if (result.message_type === "job_result") return result;
      }
    } catch (error) {
      if (error instanceof Error && (/timeout/i.test(error.message) || error.message === "WORKER_JOB_TIMEOUT")) {
        active.cancel(jobId);
        const cancelDeadline = Date.now() + 2000;
        let acknowledged = false;
        try {
          while (Date.now() < cancelDeadline) {
            const acknowledgement = await active.waitForMessage((message) => message.request_id === requestId || (!message.request_id && message.job_id === jobId), cancelDeadline - Date.now());
            if (acknowledgement.message_type === "job_result") { acknowledged = true; break; }
          }
        } catch { /* cancellation acknowledgement is best effort after timeout */ }
        if (!acknowledged) resetAfterCrash(active);
        throw new Error(`TIMEOUT: worker job ${jobId} exceeded its deadline`);
      }
      if (error instanceof Error && error.message.includes("WORKER_CRASH")) resetAfterCrash(active);
      throw error;
    } finally {
      pending.delete(jobId);
      if (control.signal && abortHandler) control.signal.removeEventListener("abort", abortHandler);
    }
  };

  const pending = new Set();
  return {
    get generation() { return generation; },
    async submit(taskType, input, control = {}) {
      try {
        return await submitAttempt(taskType, input, control);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("WORKER_CRASH")) throw error;
        if (control.idempotent !== true) throw error;
        return submitAttempt(taskType, input, control);
      }
    },
    async close() {
      closed = true;
      const active = worker;
      worker = undefined;
      ready = undefined;
      for (const jobId of pending) active?.cancel(jobId);
      if (pending.size > 0) await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
      active?.stop();
    },
  };
}
