export type WorkerMessage = { type?: string; message_type?: string; request_id?: string; job_id?: string; [key: string]: unknown };
export type WorkerClientOptions = { command: string; args?: string[]; cwd?: string };
export type WorkerJobControl = { jobId?: string; signal?: AbortSignal; timeoutMs?: number; onProgress?: (value: number) => void; idempotent?: boolean };
export type WorkerJobPort = { submit<TInput, TResult>(taskType: string, input: TInput, control?: WorkerJobControl): Promise<TResult>; close?(): Promise<void> };
export { assertWorkerMessage, startWorker, createPersistentWorkerClient, createLocalWorkerJobPort } from "./runtime.mjs";
