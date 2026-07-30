import { spawn } from "node:child_process";

export type WorkerMessage = { type?: string; message_type?: string; request_id?: string; job_id?: string; [key: string]: unknown };
export type WorkerClientOptions = { command: string; args?: string[]; cwd?: string };

export function assertWorkerMessage(value: unknown): asserts value is WorkerMessage {
  if (!value || typeof value !== "object" || (typeof (value as any).type !== "string" && typeof (value as any).message_type !== "string") || (typeof (value as any).request_id !== "string" && typeof (value as any).job_id !== "string")) throw new Error("invalid worker protocol message");
}

export function startWorker(options: WorkerClientOptions) {
  const child = spawn(options.command, options.args ?? [], { cwd: options.cwd, stdio: ["pipe", "pipe", "pipe"] });
  let buffer = "";
  const messages: WorkerMessage[] = [];
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => { buffer += chunk; let index; while ((index = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, index); buffer = buffer.slice(index + 1); if (!line.trim()) continue; const parsed = JSON.parse(line); assertWorkerMessage(parsed); messages.push(parsed); } });
  const waiters = new Map<string, Array<(message: WorkerMessage) => void>>();
  child.stdout.on("data", () => { for (const message of messages) { const key = message.request_id ?? message.job_id; if (!key) continue; for (const resolve of waiters.get(key) ?? []) resolve(message); waiters.delete(key); } });
  return { child, messages, send(message: WorkerMessage) { assertWorkerMessage(message); child.stdin.write(`${JSON.stringify(message)}\n`); }, waitFor(requestId: string, timeoutMs = 5000): Promise<WorkerMessage> { const existing = messages.find((message) => (message.request_id ?? message.job_id) === requestId); if (existing) { messages.splice(messages.indexOf(existing), 1); return Promise.resolve(existing); } return new Promise((resolve, reject) => { const timer = setTimeout(() => { waiters.delete(requestId); reject(new Error(`worker response timeout: ${requestId}`)); }, timeoutMs); const callback = (message: WorkerMessage) => { clearTimeout(timer); const index = messages.indexOf(message); if (index >= 0) messages.splice(index, 1); resolve(message); }; waiters.set(requestId, [...(waiters.get(requestId) ?? []), callback]); }); }, stop() { child.kill(); } };
}
