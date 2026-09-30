import { contextBridge, ipcRenderer } from "electron";
import type { CommandEnvelope, CommandResult, ProjectApi, QueryEnvelope, QueryResult } from "../../../packages/platform/project-api/src/public.js";

const api: Pick<ProjectApi, "query" | "command" | "subscribe"> & { subscribeProjectEvents(listener: Parameters<ProjectApi["subscribe"]>[0]): () => void; chooseFiles(request?: unknown): Promise<unknown>; chooseDirectory(): Promise<unknown>; onBeforeClose(listener: (value: { token: string }) => void): () => void; acknowledgeClose(value: { token: string; ok: boolean; message?: string }): Promise<unknown> } = {
  query: <T>(request: QueryEnvelope) => ipcRenderer.invoke("project.query", request) as Promise<QueryResult<T>>,
  command: <T>(request: CommandEnvelope) => ipcRenderer.invoke("project.command", request) as Promise<CommandResult<T>>,
  subscribe: (listener) => { const wrapped = (_event: unknown, payload: unknown) => listener(payload as never); ipcRenderer.on("project.event", wrapped); return () => ipcRenderer.removeListener("project.event", wrapped); },
  subscribeProjectEvents: (listener) => { const wrapped = (_event: unknown, payload: unknown) => listener(payload as never); ipcRenderer.on("project.event", wrapped); return () => ipcRenderer.removeListener("project.event", wrapped); },
  chooseFiles: (request?: unknown) => ipcRenderer.invoke("system.choose-files", request),
  chooseDirectory: () => ipcRenderer.invoke("system.choose-directory"),
  onBeforeClose: listener => { const wrapped = (_event: unknown, payload: unknown) => listener(payload as { token: string }); ipcRenderer.on("system.before-close", wrapped); return () => ipcRenderer.removeListener("system.before-close", wrapped); },
  acknowledgeClose: value => ipcRenderer.invoke("system.flush-complete", value),
};
contextBridge.exposeInMainWorld("projectApi", api);
