export type WorkerMessage = { type?: string; message_type?: string; request_id?: string; job_id?: string; [key: string]: unknown };
export type WorkerClientOptions = { command: string; args?: string[]; cwd?: string };
export function assertWorkerMessage(value: unknown): asserts value is WorkerMessage;
export function startWorker(options: WorkerClientOptions): { child: { kill(): void }; messages: WorkerMessage[]; readonly stderr: string; send(message: WorkerMessage): void; waitFor(requestId: string, timeoutMs?: number): Promise<WorkerMessage>; waitForMessage(predicate: (message: WorkerMessage) => boolean, timeoutMs?: number): Promise<WorkerMessage>; cancel(jobId: string): void; stop(): void };
export function createLocalWorkerJobPort(options?: WorkerClientOptions): { submit<TInput, TResult>(taskType: string, input: TInput, control?: { jobId?: string; signal?: AbortSignal; timeoutMs?: number; onProgress?: (value: number) => void }): Promise<TResult> };
