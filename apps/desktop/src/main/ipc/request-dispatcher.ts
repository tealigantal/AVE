import type { OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { CreationConfirmationOptions } from "./creation-confirmation.js";
import { DesktopLifecycleError, type DesktopOperation } from "../project-session-manager.js";
import { assertCommandEnvelope, assertQueryEnvelope } from "../../../../../packages/platform/project-api/src/public.js";
import type { CommandEnvelope, QueryEnvelope } from "../../../../../packages/platform/project-api/src/public.js";
import { registerProjectHandlers } from "./project.handlers.js";
import { registerCreationHandlers } from "./creation.handlers.js";
import { registerMediaHandlers } from "./media.handlers.js";
import { registerJobHandlers } from "./jobs.handlers.js";
import type { CommandHandler, HostContext, RequestSource, QueryHandler, SystemHandler } from "../types.js";
import { creationErrorResult } from "./creation-errors.js";
import { randomUUID } from "node:crypto";

const projectIndependentQueries = new Set(["app.status", "app.projects.recent", "app.projects.recycle-bin"]);
const projectIndependentCommands = new Set([
  "project.create", "project.open", "project.open-recent",
  "project.recycle-bin.move", "project.recycle-bin.restore", "project.recycle-bin.restore-all",
  "project.recycle-bin.permanently-delete", "project.recycle-bin.permanently-delete-all",
]);

function errorResult(code: string, error: unknown): { ok: false; error: { code: string; message: string } } {
  // Full causes remain local to Main; Renderer receives only a safe diagnostic.
  console.error(`[AVE ${code}]`,error);
  return creationErrorResult(code,error);
}

export type ShowOpenDialog = (context: HostContext, event: RequestSource, operation: DesktopOperation, options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
export type ShowSaveDialog = (context: HostContext, event: RequestSource, operation: DesktopOperation, options: Readonly<{title:string;defaultPath:string;filters:{name:string;extensions:string[]}[]}>) => Promise<Readonly<{canceled:boolean;filePath?:string}>>;
export type RequestDialogs = Readonly<{open:ShowOpenDialog; save:ShowSaveDialog; confirm:(event:RequestSource,operation:DesktopOperation,options:CreationConfirmationOptions)=>Promise<Readonly<{response:number}>>}>;
export function createRequestDispatcher(context: HostContext, dialogs: RequestDialogs) {
  let lastSessionRefresh: { projectId: string; at: number } | undefined;
  const failed = async (fallback: string, error: unknown, event: RequestSource, raw: unknown) => {
    if (error instanceof DesktopLifecycleError && error.code === "DESKTOP_SESSION_STALE") {
      const projectId = context.sessions.activeProjectId(), now = Date.now();
      if (!lastSessionRefresh || lastSessionRefresh.projectId !== projectId || now - lastSessionRefresh.at >= 250) {
        lastSessionRefresh = { projectId, at: now };
        context.sessions.broadcast("project.event", { event_type: "project.session.changed", payload: {} });
      }
      return { ok: false, error: { code: error.code, message: "作品已切换，正在同步当前作品。" } };
    }
    if (error instanceof DesktopLifecycleError && error.code === "DESKTOP_DIALOG_CANCELLED") return creationErrorResult(fallback, error);
    const result = errorResult(fallback, error);
    const request = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const type = request.query_type ?? request.command_type;
    // Preserve sender/project authorization even while recording a rejected call.
    if (!context.sessions.hasWindow(event.sender.id) || request.project_id !== context.host.status().project || typeof type !== "string" || type.startsWith("project.issues.") || /CANCELLED|STALE|REVOKED/.test(result.error.code)) return result;
    try {
      const issue = await context.host.recordWorkspaceIssue({ operation_id: typeof request.command_id === "string" ? request.command_id : randomUUID(), operation_type: type, code: result.error.code, message: result.error.message, payload: request.payload });
      return { ...result, error: { ...result.error, issue } };
    } catch (auditError) {
      console.error("[AVE ISSUE_SAVE_FAILED]", auditError);
      return { ...result, error: { ...result.error, journal_error: "这条问题未能保存，请保留当前页面。" } };
    }
  };
  const routes = new Map<string, (event:RequestSource,raw:unknown)=>Promise<unknown>>();
  const queries = new Map<string, QueryHandler>();
  const commands = new Map<string, CommandHandler>();
  const systems = new Map<string, SystemHandler>();
  registerProjectHandlers(queries, commands, context, dialogs.open, dialogs.confirm);
  registerCreationHandlers(queries, commands, context, dialogs.confirm, dialogs.save);
  registerMediaHandlers(commands, systems, context, dialogs.open, queries);
  registerJobHandlers(queries, context.host);
  systems.set("system.flush-complete", (request, event) => context.sessions.acknowledgeInputFlush(event.sender.id, request));

  routes.set("project.query", async (event, raw: unknown) => {
    try {
      assertQueryEnvelope(raw); const request = raw as QueryEnvelope;
      if (!context.sessions.hasWindow(event.sender.id)) throw new Error("unregistered request session");
      const handler = queries.get(request.query_type);
      if (!handler) return errorResult("UNKNOWN_QUERY", new Error("query is not implemented by this host"));
      const projectIndependent = projectIndependentQueries.has(request.query_type);
      const operation = context.sessions.capture(event.sender.id, projectIndependent ? context.sessions.activeProjectId() : request.project_id, !projectIndependent);
      const data = await context.sessions.run(operation, () => handler(request, event, operation));
      context.sessions.assertCurrent(operation);
      return { ok: true, data };
    }
    catch (error) { return failed("QUERY_FAILED", error, event, raw); }
  });
  routes.set("project.command", async (event, raw: unknown) => {
    try {
      assertCommandEnvelope(raw); const request = raw as CommandEnvelope;
      if (!context.sessions.hasWindow(event.sender.id)) throw new Error("unregistered request session");
      const handler = commands.get(request.command_type);
      if (!handler) return errorResult("UNKNOWN_COMMAND", new Error("command is not implemented by this host"));
      const projectIndependent = projectIndependentCommands.has(request.command_type);
      const operation = context.sessions.capture(event.sender.id, projectIndependent ? context.sessions.activeProjectId() : request.project_id, !projectIndependent);
      const data = await context.sessions.run(operation, () => handler(request, event, operation));
      context.sessions.assertCurrent(operation);
      const returnedProjectId = data && typeof data === "object" && "project" in data && typeof (data as { project?: unknown }).project === "string" ? (data as { project: string }).project : "";
      const eventValue = { event_type: request.command_type, project_id: returnedProjectId || request.project_id, payload: {} };
      if (eventValue.project_id && context.sessions.isCurrent(operation)) { context.events.publish(eventValue); context.sessions.broadcast("project.event", eventValue); }
      return { ok: true, data };
    }
    catch (error) { return failed("COMMAND_FAILED", error, event, raw); }
  });
  for (const [channel, handler] of systems) routes.set(channel, async (event, request: unknown) => {
    try {
      if (!context.sessions.hasWindow(event.sender.id)) throw new Error("unregistered request session");
      // System requests do not carry a project ID, but their lifecycle still
      // belongs to the currently active project session. Capturing an empty
      // ID while a project is open incorrectly rejects flush acknowledgements
      // and native file chooser requests as stale.
      const operation = context.sessions.capture(event.sender.id, context.sessions.activeProjectId(), false);
      const data = await context.sessions.run(operation, () => handler(request, event, operation));
      context.sessions.assertCurrent(operation);
      return { ok: true, data };
    } catch (error) { return errorResult("SYSTEM_REQUEST_FAILED", error); }
  });
  return async (channel:string, event:RequestSource, raw:unknown) => { const route=routes.get(channel); if(!route) return errorResult("UNKNOWN_CHANNEL",new Error("unknown channel")); return route(event,raw); };
}
