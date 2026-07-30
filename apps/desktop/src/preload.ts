import { contextBridge, ipcRenderer } from "electron";
import type { CommandEnvelope, CommandResult, ProjectApi, QueryEnvelope, QueryResult } from "../../../packages/platform/project-api/src/public.js";

const api: Pick<ProjectApi, "query" | "command"> = {
  query: <T>(request: QueryEnvelope) => ipcRenderer.invoke("project.query", request) as Promise<QueryResult<T>>,
  command: <T>(request: CommandEnvelope) => ipcRenderer.invoke("project.command", request) as Promise<CommandResult<T>>,
};
contextBridge.exposeInMainWorld("projectApi", api);
