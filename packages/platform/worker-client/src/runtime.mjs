import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function assertWorkerMessage(value) {
  if (!value || typeof value !== "object" || (typeof value.type !== "string" && typeof value.message_type !== "string")) throw new Error("invalid worker protocol message");
}

export function startWorker(options) {
  if (!["win32", "linux"].includes(process.platform)) throw new Error(`WORKER_PROCESS_OWNER_UNSUPPORTED:${process.platform}`);
  const ownerToken = randomUUID();
  const ownerScript = resolve(import.meta.dirname, "process-owner.py");
  const child = spawn(process.env.AVE_PYTHON ?? "python", [ownerScript, ownerToken, options.command, ...(options.args ?? [])], { cwd: options.cwd, stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  let buffer = "";
  const messages = [];
  const waiters = [];
  let stderr = "";
  let exited = false;
  let stopping = false;
  let stopPromise;
  let terminalError;
  let transportError;
  let resolveTermination, rejectTermination;
  const termination = new Promise((resolvePromise, reject) => { resolveTermination = resolvePromise; rejectTermination = reject; });
  // Low-level callers may only wait for a request. Keep the terminal failure
  // available to stop() without creating an unhandled background rejection.
  termination.catch(() => {});
  const rejectWaiters = (error) => { for (const waiter of waiters.splice(0)) { clearTimeout(waiter.timer); waiter.reject(error); } };
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", (error) => { transportError = error; });
  child.stdin.on("error", (error) => { transportError = error; });
  child.on("close", (code, signal) => {
    exited = true;
    const drained = stderr.includes(`\nAVE_WORKER_OWNER_DRAINED:${ownerToken}\n`);
    terminalError = new Error(drained ? `WORKER_CRASH: worker exited with code=${code ?? "null"} signal=${signal ?? "null"}` : `WORKER_TERMINATION_UNCONFIRMED: process owner exited with code=${code ?? "null"} signal=${signal ?? "null"}`, { cause: transportError ?? (stderr ? new Error(stderr) : undefined) });
    if (drained) resolveTermination(); else rejectTermination(terminalError);
    rejectWaiters(terminalError);
  });
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let parsed;
      try { parsed = JSON.parse(line); assertWorkerMessage(parsed); }
      catch (cause) { rejectWaiters(new Error("WORKER_PROTOCOL_INVALID", { cause })); continue; }
      const waiterIndex = waiters.findIndex((waiter) => waiter.predicate(parsed));
      if (waiterIndex >= 0) {
        const waiter = waiters.splice(waiterIndex, 1)[0];
        clearTimeout(waiter.timer);
        waiter.resolve(parsed);
      } else messages.push(parsed);
    }
  });
  const waitForMessage = (predicate, timeoutMs = 5000) => {
    if (terminalError) return Promise.reject(terminalError);
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
    get stopped() { return exited || stopping; },
    get stderr() { return stderr; },
    send(message) { assertWorkerMessage(message); if (exited) throw terminalError; if (stopping) throw new Error("WORKER_STOPPING"); child.stdin.write(`${JSON.stringify(message)}\n`); },
    waitFor(requestId, timeoutMs = 5000) { return waitForMessage((message) => (message.request_id ?? message.job_id) === requestId, timeoutMs); },
    waitForMessage,
    cancel(jobId) { this.send({ protocol_version: 1, message_type: "cancel", job_id: jobId }); },
    stop() {
      if (stopPromise) return stopPromise;
      stopping = true;
      // Destroy instead of end: queued input must not delay EOF behind a Worker
      // that stopped reading. The owner has an independent receive thread.
      child.stdin.destroy();
      stopPromise = new Promise((resolvePromise, reject) => {
        const timer = setTimeout(() => {
          terminalError = new Error("WORKER_TERMINATION_UNCONFIRMED: owner drain deadline exceeded");
          rejectWaiters(terminalError);
          reject(terminalError);
        }, 20000);
        termination.then(() => { clearTimeout(timer); resolvePromise(); }, error => { clearTimeout(timer); reject(error); });
      });
      return stopPromise;
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
  let closing;
  return {
    get terminationUnconfirmed() { return client?.terminationUnconfirmed === true; },
    get terminationFailure() { return client?.terminationFailure; },
    submit(taskType, input, control = {}) {
      if (closing) return Promise.reject(new Error("WORKER_CLIENT_CLOSING"));
      client ??= createPersistentWorkerClient(workerOptions);
      return client.submit(taskType, input, control);
    },
    close() {
      if (!closing) {
        const current = client;
        closing = (async () => { if (current) await current.close(); client = undefined; })().then(() => { closing = undefined; });
      }
      return closing;
    },
  };
}

export function createPersistentWorkerClient(workerOptions) {
  let worker;
  let ready;
  let generation = 0;
  let closed = false;
  let poisoned;
  let resetting;
  let closing;
  const pending = new Set();
  const operations = new Set();

  const ensureWorker = async () => {
    if (closed) throw new Error("WORKER_CLIENT_CLOSED");
    if (poisoned) throw poisoned;
    if (resetting) { await resetting; return ensureWorker(); }
    if (!worker) {
      const next = startWorker(workerOptions);
      worker = next;
      generation += 1;
      next.send({ protocol_version: 1, message_type: "handshake" });
      ready = next.waitForMessage((message) => message.message_type === "handshake", 5000).then(() => next).catch(async (error) => {
        await resetAfterCrash(next, error);
        throw error;
      });
    }
    return ready;
  };

  const resetAfterCrash = async (failedWorker, cause) => {
    if (resetting) return resetting;
    resetting = (async () => {
      try { await failedWorker.stop(); }
      catch (error) { poisoned = new AggregateError([cause, error], "WORKER_TERMINATION_UNCONFIRMED: cannot release failed producer ownership", { cause }); throw poisoned; }
      if (worker === failedWorker) { worker = undefined; ready = undefined; }
    })();
    try { await resetting; } finally { resetting = undefined; }
  };

  const submitAttempt = async (taskType, input, control) => {
    const active = await ensureWorker();
    if (closed) throw new Error("WORKER_CLIENT_CLOSED");
    if (control.signal?.aborted) throw new Error("CANCELLED: worker job cancelled before dispatch", { cause: control.signal.reason });
    const jobId = control.jobId ?? `worker-${randomUUID()}`;
    const requestId = `${jobId}:g${generation}:${randomUUID()}`;
    const pendingJob = { jobId, active };
    pending.add(pendingJob);
    let abortHandler;
    let abortTimer;
    let abortDrain;
    try {
      active.send({ protocol_version: 1, message_type: "job", request_id: requestId, job_id: jobId, payload: { task_type: taskType, ...input } });
      if (control.signal) {
        abortHandler = () => {
          if (!active.stopped) active.cancel(jobId);
          // Cooperative cancellation gets a short terminal-result grace period.
          // If it never acknowledges, drain the same owner, not a new process.
          abortTimer = setTimeout(() => {
            abortDrain = resetAfterCrash(active, control.signal.reason ?? new Error("CANCELLED: worker job cancelled"));
            abortDrain.catch(() => {});
          }, 2000);
        };
        control.signal.addEventListener("abort", abortHandler, { once: true });
      }
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
        if (!active.stopped) active.cancel(jobId);
        const cancelDeadline = Date.now() + 2000;
        let acknowledged = false;
        let cancelError;
        try {
          while (Date.now() < cancelDeadline) {
            const acknowledgement = await active.waitForMessage((message) => message.request_id === requestId || (!message.request_id && message.job_id === jobId), cancelDeadline - Date.now());
            if (acknowledgement.message_type === "job_result") { acknowledged = true; break; }
          }
        } catch (cause) { cancelError = cause; }
        const timeout = new Error(`TIMEOUT: worker job ${jobId} exceeded its deadline`, { cause: cancelError ? new AggregateError([error, cancelError], "Worker deadline and cancellation acknowledgement failed") : error });
        if (!acknowledged) await resetAfterCrash(active, timeout);
        throw timeout;
      }
      // Invalid protocol or failed transport also cannot release a producer.
      await resetAfterCrash(active, error);
      if (control.signal?.aborted) throw new Error("CANCELLED: worker producer drained after cancellation", { cause: new AggregateError([control.signal.reason, error], "Cancellation and worker terminal result") });
      throw error;
    } finally {
      clearTimeout(abortTimer);
      pending.delete(pendingJob);
      if (control.signal && abortHandler) control.signal.removeEventListener("abort", abortHandler);
      if (abortDrain) await abortDrain;
    }
  };

  return {
    get generation() { return generation; },
    get terminationUnconfirmed() { return poisoned !== undefined; },
    get terminationFailure() { return poisoned; },
    submit(taskType, input, control = {}) {
      const operation = (async () => {
        try { return await submitAttempt(taskType, input, control); }
        catch (error) {
          if (poisoned || closed || control.signal?.aborted || !(error instanceof Error) || !error.message.startsWith("WORKER_CRASH") || control.idempotent !== true) throw error;
          return submitAttempt(taskType, input, control);
        }
      })();
      operations.add(operation);
      operation.then(() => operations.delete(operation), () => operations.delete(operation));
      return operation;
    },
    close() {
      closed = true;
      closing ??= (async () => {
        const active = worker, failures = [];
        for (const { jobId, active: producer } of pending) try { if (!producer.stopped) producer.cancel(jobId); } catch (error) { failures.push(error); }
        try { if (active) await active.stop(); } catch (error) { poisoned = error; failures.push(error); }
        await Promise.allSettled([...operations]);
        if (poisoned && !failures.includes(poisoned)) failures.push(poisoned);
        if (failures.length) throw new AggregateError(failures, "WORKER_CLOSE_FAILED", { cause: failures[0] });
        worker = undefined; ready = undefined;
      })();
      return closing;
    },
  };
}
