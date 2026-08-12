import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { startWorker } from "../../packages/platform/worker-client/src/public.js";
import { JobEngine, type JobStore } from "../../packages/platform/job-engine/src/public.js";
import { createProject, openProject, createPersistentJob, readPersistentJob, readPersistentJobByIdempotency, startPersistentJob, updatePersistentJobProgress, finishPersistentJob, recoverPersistentJobs } from "../../packages/platform/project-storage/src/public.js";

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

const root = await mkdtemp(resolve(tmpdir(), "ave-worker-crash-recovery-"));
let session: any;
try {
  session = await createProject(root);
  const engine = new JobEngine(storeFor(session));
  const crashed = await engine.execute("fixture.process-crash.v1", { value: 17 }, "idem-process-crash", async ({ job_id }) => {
    const worker = startWorker({ command: process.execPath, args: ["-e", "process.stdin.on('data', () => process.exit(17))"] });
    try {
      worker.send({ type: "request", request_id: job_id });
      await worker.waitFor(job_id, 2000);
      throw new Error("worker unexpectedly returned a response");
    } finally {
      worker.stop();
    }
  });
  assert.equal(crashed.job.state, "BLOCKED", "undeclared idempotency must fail closed after Worker crash");
  assert.equal(crashed.job.error_class, "WORKER_CRASH");
  assert.equal(crashed.job.attempt, 1);

  const recoverable = createPersistentJob(session, session.manifest.project_id, { job_id: "job-process-recovery", task_type: "fixture.process-recovery.v1", idempotency_key: "idem-process-recovery", input_hash: "d".repeat(64), input: { value: 23 }, idempotent: true });
  startPersistentJob(session, recoverable.job_id);
  await session.close();
  session = undefined;
  session = await openProject(root);
  const recovered = recoverPersistentJobs(session, session.manifest.project_id).find((job: any) => job.job_id === recoverable.job_id);
  assert.equal(recovered?.state, "RECOVERING");
  const restarted = new JobEngine(storeFor(session));
  const resumed = await restarted.execute("fixture.process-recovery.v1", { value: 23 }, "idem-process-recovery", async () => ({ status: "succeeded", outputs: [{ object_ref: "object:recovered-after-process-crash" }] }));
  assert.equal(resumed.job.state, "SUCCEEDED");
  assert.equal(resumed.job.attempt, 2);
  console.log("worker process crash and persistent recovery check passed");
} finally {
  if (session) await session.close();
  if (typeof global.gc === "function") global.gc();
  await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 });
}
