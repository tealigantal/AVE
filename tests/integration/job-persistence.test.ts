import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject, createPersistentJob, readPersistentJob, readPersistentJobByIdempotency, startPersistentJob, updatePersistentJobProgress, finishPersistentJob, recoverPersistentJobs, readPersistentJobAttempts } from "../../packages/platform/project-storage/src/public.js";
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

  const recoverable = createPersistentJob(session, session.manifest.project_id, { job_id: "job-recoverable", task_type: "fixture.recover.v1", idempotency_key: "idem-recoverable", input_hash: "a".repeat(64), input: { value: 5 }, idempotent: true });
  startPersistentJob(session, recoverable.job_id);
  const nonIdempotent = createPersistentJob(session, session.manifest.project_id, { job_id: "job-non-idempotent", task_type: "fixture.nonidempotent.v1", idempotency_key: "idem-nonidempotent", input_hash: "b".repeat(64), input: { value: 6 }, idempotent: false });
  startPersistentJob(session, nonIdempotent.job_id);
  await session.close();
  engine = undefined;
  session = undefined;

  let reopened: any = await openProject(root);
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
