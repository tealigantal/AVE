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
  let stderrTruncated = false;
  const stderrLimit = 16 * 1024;
  const drainMarker = `\nAVE_WORKER_OWNER_DRAINED:${ownerToken}\n`;
  let drainMarkerTail = "";
  let ownerDrained = false;
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
  child.stderr.on("data", (chunk) => {
    // The drain receipt must survive log truncation and chunk boundaries. It
    // is owner-token bound and is independent of the user-visible tail.
    const scan = drainMarkerTail + chunk;
    if (scan.includes(drainMarker)) ownerDrained = true;
    drainMarkerTail = scan.slice(-(drainMarker.length - 1));
    stderr += chunk;
    if (stderr.length > stderrLimit) { stderr = stderr.slice(-stderrLimit); stderrTruncated = true; }
  });
  child.on("error", (error) => { transportError = error; });
  child.stdin.on("error", (error) => { transportError = error; });
  child.on("close", (code, signal) => {
    exited = true;
    terminalError = new Error(ownerDrained ? `WORKER_CRASH: worker exited with code=${code ?? "null"} signal=${signal ?? "null"}` : `WORKER_TERMINATION_UNCONFIRMED: process owner exited with code=${code ?? "null"} signal=${signal ?? "null"}`, { cause: transportError ?? (stderr ? new Error(`${stderrTruncated ? "[earlier stderr omitted]\n" : ""}${stderr}`) : undefined) });
    if (ownerDrained) resolveTermination(); else rejectTermination(terminalError);
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
  const { resourceGate, ...overrides } = options;
  const workerOptions = { ...defaultWorkerOptions(), ...overrides };
  let client;
  let closing;
  let closingController = new AbortController();
  const operations = new Set();
  return {
    get terminationUnconfirmed() { return client?.terminationUnconfirmed === true; },
    get terminationFailure() { return client?.terminationFailure; },
    submit(taskType, input, control = {}) {
      if (closing) return Promise.reject(new Error("WORKER_CLIENT_CLOSING"));
      if (!resourceGate) {
        client ??= createPersistentWorkerClient(workerOptions);
        return client.submit(taskType, input, control);
      }
      const waitingSignal = control.signal ? AbortSignal.any([closingController.signal, control.signal]) : closingController.signal;
      const operation = (async () => {
        const release = await resourceGate.acquire(waitingSignal);
        try {
          if (closing) throw new Error("WORKER_CLIENT_CLOSING");
          if (control.signal?.aborted) throw new Error("CANCELLED: worker job cancelled before dispatch", { cause: control.signal.reason });
          client ??= createPersistentWorkerClient(workerOptions);
          try { return await client.submit(taskType, input, control); }
          catch (error) {
            if (client?.terminationUnconfirmed) resourceGate.poison(new Error("WORKER_TERMINATION_UNCONFIRMED: resource producer has not drained", { cause: error }));
            throw error;
          }
        } finally { release(); }
      })();
      operations.add(operation);
      operation.then(() => operations.delete(operation), () => operations.delete(operation));
      return operation;
    },
    close() {
      if (!closing) {
        const current = client;
        closingController.abort(new Error("WORKER_CLIENT_CLOSING"));
        closing = (async () => {
          try { if (current) await current.close(); }
          catch (error) {
            if (current?.terminationUnconfirmed) resourceGate?.poison(new Error("WORKER_TERMINATION_UNCONFIRMED: resource producer has not drained", { cause: error }));
            throw error;
          }
          await Promise.allSettled([...operations]);
          client = undefined;
        })().then(() => { closingController = new AbortController(); closing = undefined; });
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
    // A cancelling job may have to terminate this shared process. Keep new
    // dispatches outside that generation until its producer has been drained.
    let active;
    for (;;) {
      if (closed) throw new Error("WORKER_CLIENT_CLOSED");
      if (control.signal?.aborted) throw new Error("CANCELLED: worker job cancelled before dispatch", { cause: control.signal.reason });
      const draining = [...pending].filter(job => job.cancelling);
      if (draining.length) { await Promise.all(draining.map(job => job.drained)); continue; }
      active = await ensureWorker();
      if (worker === active && !active.stopped && !resetting && ![...pending].some(job => job.cancelling)) break;
    }
    if (closed) throw new Error("WORKER_CLIENT_CLOSED");
    if (control.signal?.aborted) throw new Error("CANCELLED: worker job cancelled before dispatch", { cause: control.signal.reason });
    const jobId = control.jobId ?? `worker-${randomUUID()}`;
    const requestId = `${jobId}:g${generation}:${randomUUID()}`;
    let finishDrain;
    const pendingJob = { jobId, active, cancelling: false, drained: new Promise(resolve => { finishDrain = resolve; }) };
    pending.add(pendingJob);
    let abortHandler;
    let abortTimer;
    let abortDrain;
    try {
      active.send({ protocol_version: 1, message_type: "job", request_id: requestId, job_id: jobId, payload: { task_type: taskType, ...input } });
      if (control.signal) {
        abortHandler = () => {
          pendingJob.cancelling = true;
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
      const bounded = (taskType === "render.timeline.v1" || taskType === "render.segment.v1" || taskType === "render.segment.assemble.v1") && input?.execution_plan?.execution_policy?.mode === "bounded-linear-v1";
      const inactivityMs = control.timeoutMs ?? Number(input?.timeout_seconds ?? 300) * 1000 + 5000;
      const maximumBoundedMs = 24 * 60 * 60 * 1000;
      const absoluteMs = bounded ? (control.absoluteTimeoutMs ?? maximumBoundedMs) : inactivityMs;
      if (!Number.isSafeInteger(inactivityMs) || inactivityMs < 1 || !Number.isSafeInteger(absoluteMs) || absoluteMs < 1 || bounded && absoluteMs > maximumBoundedMs) throw new Error("WORKER_DEADLINE_INVALID");
      const maximumDeadline = performance.now() + absoluteMs;
      let inactivityDeadline = performance.now() + inactivityMs;
      let lastProgress = 0;
      while (true) {
        const remaining = Math.ceil(Math.min(maximumDeadline, inactivityDeadline) - performance.now());
        if (remaining <= 0) throw new Error("WORKER_JOB_TIMEOUT");
        const result = await active.waitForMessage((message) => message.request_id === requestId || (!message.request_id && message.job_id === jobId), remaining);
        if (result.message_type === "progress") {
          if (Object.hasOwn(result.payload ?? {}, "diagnostic")) { control.onDiagnostic?.(result.payload.diagnostic); continue; }
          const value = result.payload?.progress;
          if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) throw new Error("WORKER_PROGRESS_INVALID");
          // Only forward movement of a bounded render extends its inactivity
          // deadline. Duplicate progress or diagnostic heartbeats cannot keep a
          // stalled job alive, and a separate absolute limit always applies.
          if (bounded && value > lastProgress) { lastProgress = value; inactivityDeadline = performance.now() + inactivityMs; }
          control.onProgress?.(value); continue;
        }
        if (result.message_type === "job_result") return result;
      }
    } catch (error) {
      if (error instanceof Error && (/timeout/i.test(error.message) || error.message === "WORKER_JOB_TIMEOUT")) {
        pendingJob.cancelling = true;
        if (!active.stopped) active.cancel(jobId);
        const cancelDeadline = Date.now() + 2000;
        let acknowledged = false;
        let cancelError;
        try {
          while (Date.now() < cancelDeadline) {
            const acknowledgement = await active.waitForMessage((message) => message.request_id === requestId || (!message.request_id && message.job_id === jobId), cancelDeadline - Date.now());
            if (acknowledgement.message_type === "progress" && Object.hasOwn(acknowledgement.payload ?? {}, "diagnostic")) { control.onDiagnostic?.(acknowledgement.payload.diagnostic); continue; }
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
      if (control.signal && abortHandler) control.signal.removeEventListener("abort", abortHandler);
      try { if (abortDrain) await abortDrain; }
      finally { pending.delete(pendingJob); finishDrain(); }
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
