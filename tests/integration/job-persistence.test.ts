import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject, putObjectAndRegister, createPersistentJob, readPersistentJob, readPersistentJobByIdempotency, startPersistentJob, updatePersistentJobProgress, finishPersistentJob, recoverPersistentJobs, readPersistentJobAttempts, recordPersistentRenderDiagnostic, readPersistentRenderDiagnostic, listCreationRenderFailures } from "../../packages/platform/project-storage/src/public.js";
import { JobEngine, type JobStore } from "../../packages/platform/job-engine/src/public.js";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";

function storeFor(session: any): JobStore {
  const projectId = session.manifest.project_id;
  return {
    create: (record) => createPersistentJob(session, projectId, record) as any,
    read: (jobId) => readPersistentJob(session, jobId) as any,
    findByIdempotency: (key) => readPersistentJobByIdempotency(session, projectId, key) as any,
    start: (jobId) => startPersistentJob(session, jobId) as any,
    progress: (jobId, value) => updatePersistentJobProgress(session, jobId, value),
    finish: (jobId, result) => finishPersistentJob(session, jobId, result) as any,
    recover: () => recoverPersistentJobs(session, projectId) as any,
  };
}

const root = await mkdtemp(resolve(tmpdir(), "ave-job-persistence-"));
async function exercise(root: string): Promise<void> {
  let session: any = await createProject(root);
  let engine: any = new JobEngine(storeFor(session));
  let runs = 0;
  const first = await engine.execute("fixture.success.v1", { value: 1 }, "idem-success", async ({ progress }: { progress: (value: number) => void }) => { runs += 1; progress(0.5); return { status: "succeeded", outputs: [{ object_ref: "object:success" }] }; });
  assert.equal(first.job.state, "SUCCEEDED");
  assert.equal(runs, 1);
  const duplicate = await engine.execute("fixture.success.v1", { value: 1 }, "idem-success", async () => { runs += 1; return { status: "succeeded", outputs: [{ object_ref: "unexpected" }] }; });
  assert.equal(duplicate.reused, true);
  assert.equal(runs, 1);
  assert.equal(readPersistentJobAttempts(session, first.job.job_id).length, 1);

  const temporary = await engine.execute("fixture.retry.v1", { value: 2 }, "idem-retry", async () => ({ status: "failed", diagnostics: [{ code: "RESOURCE_EXHAUSTED", message: "temporary" }] }));
  assert.equal(temporary.job.state, "RETRYABLE_FAILED");
  const retried = await engine.execute("fixture.retry.v1", { value: 2 }, "idem-retry", async () => ({ status: "succeeded", outputs: [{ object_ref: "object:retry" }] }));
  assert.equal(retried.job.state, "SUCCEEDED");
  assert.equal(readPersistentJobAttempts(session, retried.job.job_id).length, 2);

  const blocked = await engine.execute("fixture.invalid.v1", { value: 3 }, "idem-invalid", async () => ({ status: "failed", diagnostics: [{ code: "INVALID_INPUT", message: "bad input" }] }));
  assert.equal(blocked.job.state, "BLOCKED");
  await assert.rejects(() => engine.execute("fixture.invalid.v1", { value: 3 }, "idem-invalid", async () => ({ status: "succeeded" })), /BLOCKED/);

  const crashed = await engine.execute("fixture.crash.v1", { value: 7 }, "idem-crash", async () => { throw new Error("WORKER_CRASH: worker exited unexpectedly"); });
  assert.equal(crashed.job.state, "BLOCKED", "crash recovery is not retryable unless the task policy explicitly declares idempotency");

  const cancelled = new AbortController();
  const cancelledPromise = engine.execute("fixture.cancel.v1", { value: 4 }, "idem-cancel", async ({ signal }: { signal: AbortSignal }) => new Promise((resolve) => signal.addEventListener("abort", () => resolve({ status: "cancelled" }), { once: true })), { signal: cancelled.signal });
  cancelled.abort();
  assert.equal((await cancelledPromise).job.state, "CANCELLED");

  const waitingAbort = new AbortController();
  const waiting = engine.execute("fixture.wait-cancel.v1", {}, "idem-wait-cancel", async ({ signal }: { signal: AbortSignal }) => {
    await new Promise<void>((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("CANCELLED: resource wait cancelled", { cause: signal.reason })), { once: true }));
    return { status: "succeeded" };
  }, { signal: waitingAbort.signal });
  waitingAbort.abort(new Error("user cancelled waiting"));
  const waitingResult = await waiting;
  assert.equal(waitingResult.job.state, "CANCELLED");
  assert.equal(waitingResult.result.status, "cancelled");
  assert.match(waitingResult.job.error_message, /resource wait cancelled.*user cancelled waiting/);

  const fakeCancel = await engine.execute("fixture.fake-cancel.v1", {}, "idem-fake-cancel", async () => { throw new Error("CANCELLED: untrusted failure"); });
  assert.equal(fakeCancel.job.state, "BLOCKED", "error text without the trusted abort signal is not cancellation");
  const unconfirmedAbort = new AbortController();
  const unconfirmed = engine.execute("fixture.unconfirmed.v1", {}, "idem-unconfirmed", async ({ signal }: { signal: AbortSignal }) => {
    await new Promise<void>((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("WORKER_TERMINATION_UNCONFIRMED: owner still running")), { once: true }));
    return { status: "succeeded" };
  }, { signal: unconfirmedAbort.signal });
  unconfirmedAbort.abort();
  const unconfirmedResult = await unconfirmed;
  assert.equal(unconfirmedResult.job.state, "BLOCKED", "cancellation cannot mask an unconfirmed producer");
  assert.equal(unconfirmedResult.job.error_class, "WORKER_TERMINATION_UNCONFIRMED");

  const recoverable = createPersistentJob(session, session.manifest.project_id, { job_id: "job-recoverable", task_type: "fixture.recover.v1", idempotency_key: "idem-recoverable", input_hash: "a".repeat(64), input: { value: 5 }, idempotent: true });
  const render = createPersistentJob(session, session.manifest.project_id, { job_id: "job-render-diagnostic", task_type: "render.timeline.v1", idempotency_key: "idem-render-diagnostic", input_hash: "c".repeat(64), input: {}, idempotent: true });
  for (const [request_id, operation_id] of [["request-a", "operation-a"], ["request-b", "operation-b"]]) {
    await putObjectAndRegister(session, session.manifest.project_id, Buffer.from(JSON.stringify({ schema_version: 1, request_id, operation_id, draft_id: "draft-1", error: { code: "TIMEOUT" } })), { object_ref_id: `failure:${operation_id}`, object_type: "creation_render_failure", version: 1, relation_key: operation_id });
  }
  assert.deepEqual(listCreationRenderFailures(session, session.manifest.project_id, "request-a").map((item: any) => item.operation_id), ["operation-a"]);
  assert.throws(() => listCreationRenderFailures(session, "other-project", "request-a"), /CREATION_FAILURE_PROJECT_INVALID/);
  startPersistentJob(session, render.job_id);
  recordPersistentRenderDiagnostic(session, render.job_id, { stage: "preview", operation: "video_encode", state: "running", frame: 83, elapsed_ms: 4271, exit_code: null, stderr_tail: "Invalid data in /home/private/input.mp4 token=secret" });
  assert.throws(() => recordPersistentRenderDiagnostic(session, render.job_id, { stage: "preview", operation: "video_encode", state: "running", frame: NaN, elapsed_ms: 1, exit_code: null, stderr_tail: "" }), /INVALID_RENDER_DIAGNOSTIC/);
  startPersistentJob(session, recoverable.job_id);
  const nonIdempotent = createPersistentJob(session, session.manifest.project_id, { job_id: "job-non-idempotent", task_type: "fixture.nonidempotent.v1", idempotency_key: "idem-nonidempotent", input_hash: "b".repeat(64), input: { value: 6 }, idempotent: false });
  startPersistentJob(session, nonIdempotent.job_id);
  await session.close();
  engine = undefined;
  session = undefined;

  let reopened: any = await openProject(root);
  const diagnostic = readPersistentRenderDiagnostic(reopened, render.job_id);
  assert.equal(diagnostic.frame, 83);
  assert.equal(diagnostic.elapsed_ms, 4271);
  assert.equal(diagnostic.stage, "preview");
  assert.equal(diagnostic.operation, "video_encode");
  assert.equal(diagnostic.attempt, 1);
  assert.equal(readPersistentRenderDiagnostic(reopened, render.job_id, 1)?.frame, 83);
  assert.equal(readPersistentRenderDiagnostic(reopened, render.job_id, 2), null);
  assert.throws(() => readPersistentRenderDiagnostic(reopened, render.job_id, 0), /INVALID_RENDER_DIAGNOSTIC_ATTEMPT/);
  assert.match(diagnostic.stderr_tail, /Invalid data/);
  assert.doesNotMatch(diagnostic.stderr_tail, /private|input\.mp4|secret/);
  const recovered = recoverPersistentJobs(reopened, reopened.manifest.project_id);
  assert.equal(recovered.find((job: any) => job.job_id === recoverable.job_id)?.state, "RECOVERING");
  assert.equal(recovered.find((job: any) => job.job_id === nonIdempotent.job_id)?.state, "RECOVERING");
  let restartedEngine: any = new JobEngine(storeFor(reopened));
  const resumed = await restartedEngine.execute("fixture.recover.v1", { value: 5 }, "idem-recoverable", async () => ({ status: "succeeded", outputs: [{ object_ref: "object:recovered" }] }));
  assert.equal(resumed.job.state, "SUCCEEDED");
  await assert.rejects(() => restartedEngine.execute("fixture.nonidempotent.v1", { value: 6 }, "idem-nonidempotent", async () => ({ status: "succeeded" })), /BLOCKED/);
  await reopened.close();
  restartedEngine = undefined;
  reopened = undefined;

  console.log("job persistence and host recovery check passed");
}

try {
  await exercise(root);
} finally {
  if (typeof global.gc === "function") global.gc();
  await new Promise((resolve) => setTimeout(resolve, 150));
  await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}
