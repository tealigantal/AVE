export type JobState = "PENDING" | "READY" | "RUNNING" | "PAUSED" | "WAITING_FOR_USER" | "RETRYABLE_FAILED" | "BLOCKED" | "SUCCEEDED" | "CANCELLED";

export type Job = { job_id: string; state: JobState; attempts: number; idempotency_key: string; payload: unknown };

const terminal = new Set<JobState>(["SUCCEEDED", "CANCELLED"]);
const transitions: Record<JobState, readonly JobState[]> = {
  PENDING: ["READY", "CANCELLED"], READY: ["RUNNING", "CANCELLED"], RUNNING: ["PAUSED", "WAITING_FOR_USER", "RETRYABLE_FAILED", "SUCCEEDED", "BLOCKED", "CANCELLED"],
  PAUSED: ["READY", "CANCELLED"], WAITING_FOR_USER: ["READY", "CANCELLED"], RETRYABLE_FAILED: ["READY", "BLOCKED", "CANCELLED"], BLOCKED: ["READY", "CANCELLED"], SUCCEEDED: [], CANCELLED: [],
};

export function createJob(job_id: string, idempotency_key: string, payload: unknown): Job {
  if (!job_id || !idempotency_key) throw new Error("job_id and idempotency_key are required");
  return { job_id, idempotency_key, payload, state: "PENDING", attempts: 0 };
}

export function transitionJob(job: Job, next: JobState): Job {
  if (terminal.has(job.state) || !transitions[job.state].includes(next)) throw new Error(`invalid job transition ${job.state} -> ${next}`);
  return { ...job, state: next, attempts: next === "RUNNING" ? job.attempts + 1 : job.attempts };
}

export function isTerminalJob(job: Job): boolean { return terminal.has(job.state); }

export async function dispatchJob(job: Job, send: (message: { message_type: "job"; job_id: string; payload: unknown }) => void, waitFor: (jobId: string) => Promise<{ status?: string; [key: string]: unknown }>, cancel?: () => void): Promise<{ job: Job; result: unknown }> {
  let current = transitionJob(transitionJob(job, "READY"), "RUNNING");
  try {
    send({ message_type: "job", job_id: current.job_id, payload: current.payload });
    const result = await waitFor(current.job_id);
    if (result.status === "succeeded") return { job: transitionJob(current, "SUCCEEDED"), result };
    if (result.status === "cancelled") return { job: transitionJob(current, "CANCELLED"), result };
    return { job: transitionJob(current, "RETRYABLE_FAILED"), result };
  } catch (error) {
    cancel?.();
    return { job: transitionJob(current, "RETRYABLE_FAILED"), result: { status: "failed", error: error instanceof Error ? error.message : String(error) } };
  }
}
