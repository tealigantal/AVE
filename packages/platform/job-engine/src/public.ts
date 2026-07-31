import { createHash, randomUUID } from "node:crypto";

export type JobState = "PENDING" | "READY" | "RUNNING" | "RECOVERING" | "PAUSED" | "WAITING_FOR_USER" | "RETRYABLE_FAILED" | "BLOCKED" | "SUCCEEDED" | "CANCELLED";
export type Job = { job_id: string; state: JobState; attempts: number; idempotency_key: string; payload: unknown };
export type PersistentJob = Readonly<{ job_id: string; project_id: string; task_type: string; idempotency_key: string; input_hash: string; input: unknown; state: JobState; idempotent: boolean | number; attempt: number; progress: number; error_class: string | null; error_message: string | null; output_refs: readonly unknown[]; created_at: string; started_at: string | null; completed_at: string | null }>;
export type JobStore = {
  create(record: { job_id: string; task_type: string; idempotency_key: string; input_hash: string; input: unknown; idempotent?: boolean }): PersistentJob;
  read(jobId: string): PersistentJob | null;
  findByIdempotency(key: string): PersistentJob | null;
  start(jobId: string): PersistentJob;
  progress(jobId: string, value: number): void;
  finish(jobId: string, result: { state: JobState; error_class?: string; error_message?: string; output_refs?: readonly unknown[] }): PersistentJob;
  recover(): readonly PersistentJob[];
};

const terminal = new Set<JobState>(["SUCCEEDED", "CANCELLED"]);
const transitions: Record<JobState, readonly JobState[]> = {
  PENDING: ["READY", "CANCELLED"], READY: ["RUNNING", "CANCELLED"], RUNNING: ["PAUSED", "WAITING_FOR_USER", "RETRYABLE_FAILED", "BLOCKED", "SUCCEEDED", "CANCELLED", "RECOVERING"],
  RECOVERING: ["RUNNING", "BLOCKED", "CANCELLED"], PAUSED: ["READY", "CANCELLED"], WAITING_FOR_USER: ["READY", "CANCELLED"], RETRYABLE_FAILED: ["READY", "BLOCKED", "CANCELLED"], BLOCKED: ["READY", "CANCELLED"], SUCCEEDED: [], CANCELLED: [],
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

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  if (typeof value === "bigint") return `${value}n`;
  return value;
}

export function hashJobInput(input: unknown): string { return createHash("sha256").update(JSON.stringify(stable(input))).digest("hex"); }
export function classifyJobError(error: unknown): { error_class: string; retryable: boolean; message: string } {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/^([A-Z][A-Z0-9_]+):\s*(.*)$/);
  const error_class = match?.[1] ?? "WORKER_ERROR";
  return { error_class, retryable: error_class === "TEMPORARY_PROVIDER_ERROR" || error_class === "RESOURCE_EXHAUSTED", message: match?.[2] ?? message };
}

export type JobRunContext = { job_id: string; signal: AbortSignal; progress(value: number): void };
export type JobRunResult = { status: "succeeded" | "cancelled" | "failed"; outputs?: readonly unknown[]; diagnostics?: readonly { code?: string; message?: string }[] };

export class JobEngine {
  constructor(private readonly store: JobStore) {}

  recover(): readonly PersistentJob[] { return this.store.recover(); }

  async execute(taskType: string, input: unknown, idempotencyKey: string, run: (context: JobRunContext) => Promise<JobRunResult>, options: { jobId?: string; idempotent?: boolean; signal?: AbortSignal } = {}): Promise<{ job: PersistentJob; reused: boolean; result: JobRunResult }> {
    const existing = this.store.findByIdempotency(idempotencyKey);
    if (existing?.state === "SUCCEEDED") return { job: existing, reused: true, result: { status: "succeeded", outputs: existing.output_refs } };
    if (existing?.state === "RECOVERING" && !Boolean(existing.idempotent)) { const blocked = this.store.finish(existing.job_id, { state: "BLOCKED", error_class: "NON_IDEMPOTENT_RECOVERY", error_message: "non-idempotent job cannot resume after host restart" }); throw new Error(`job ${blocked.job_id} is BLOCKED`); }
    if (existing?.state === "BLOCKED" || existing?.state === "CANCELLED") throw new Error(`job ${existing.job_id} is ${existing.state}`);
    const created = existing ?? this.store.create({ job_id: options.jobId ?? randomUUID(), task_type: taskType, idempotency_key: idempotencyKey, input_hash: hashJobInput(input), input, idempotent: options.idempotent !== false });
    const running = this.store.start(created.job_id);
    const controller = new AbortController();
    const external = options.signal;
    const abort = () => controller.abort(external?.reason);
    if (external) { if (external.aborted) abort(); else external.addEventListener("abort", abort, { once: true }); }
    try {
      const result = await run({ job_id: running.job_id, signal: controller.signal, progress: (value) => this.store.progress(running.job_id, value) });
      if (result.status === "succeeded") return { job: this.store.finish(running.job_id, { state: "SUCCEEDED", output_refs: result.outputs ?? [] }), reused: false, result };
      if (result.status === "cancelled") return { job: this.store.finish(running.job_id, { state: "CANCELLED", error_class: "CANCELLED", error_message: "job cancelled" }), reused: false, result };
      const diagnostic = result.diagnostics?.[0]; const classified = classifyJobError(new Error(`${diagnostic?.code ?? "WORKER_ERROR"}: ${diagnostic?.message ?? "worker job failed"}`));
      const state: JobState = classified.retryable ? "RETRYABLE_FAILED" : "BLOCKED";
      return { job: this.store.finish(running.job_id, { state, error_class: classified.error_class, error_message: classified.message }), reused: false, result };
    } catch (error) {
      const classified = classifyJobError(error); const state: JobState = classified.retryable || (classified.error_class === "WORKER_CRASH" && Boolean(running.idempotent)) ? "RETRYABLE_FAILED" : "BLOCKED";
      return { job: this.store.finish(running.job_id, { state, error_class: classified.error_class, error_message: classified.message }), reused: false, result: { status: "failed", diagnostics: [{ code: classified.error_class, message: classified.message }] } };
    } finally { if (external) external.removeEventListener("abort", abort); }
  }
}

export async function dispatchJob(job: Job, send: (message: { message_type: "job"; job_id: string; payload: unknown }) => void, waitFor: (jobId: string) => Promise<{ status?: string; [key: string]: unknown }>, cancel?: () => void): Promise<{ job: Job; result: unknown }> {
  let current = transitionJob(transitionJob(job, "READY"), "RUNNING");
  try { send({ message_type: "job", job_id: current.job_id, payload: current.payload }); const result = await waitFor(current.job_id); if (result.status === "succeeded") return { job: transitionJob(current, "SUCCEEDED"), result }; if (result.status === "cancelled") return { job: transitionJob(current, "CANCELLED"), result }; return { job: transitionJob(current, "RETRYABLE_FAILED"), result }; }
  catch (error) { cancel?.(); return { job: transitionJob(current, "RETRYABLE_FAILED"), result: { status: "failed", error: error instanceof Error ? error.message : String(error) } }; }
}
