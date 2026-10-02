import type { OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { CreationConfirmationOptions } from "./creation-confirmation.js";
import type { DesktopOperation } from "../project-session-manager.js";
import { assertCommandEnvelope, assertQueryEnvelope } from "../../../../../packages/platform/project-api/src/public.js";
import type { CommandEnvelope, QueryEnvelope } from "../../../../../packages/platform/project-api/src/public.js";
import { registerProjectHandlers } from "./project.handlers.js";
import { registerCreationHandlers } from "./creation.handlers.js";
import { registerMediaHandlers } from "./media.handlers.js";
import { registerJobHandlers } from "./jobs.handlers.js";
import type { CommandHandler, HostContext, RequestSource, QueryHandler, SystemHandler } from "../types.js";
import { creationErrorResult } from "./creation-errors.js";

function errorResult(code: string, error: unknown): { ok: false; error: { code: string; message: string } } {
  // Full causes remain local to Main; Renderer receives only a safe diagnostic.
  console.error(`[AVE ${code}]`,error);
  return creationErrorResult(code,error);
}

export type ShowOpenDialog = (context: HostContext, event: RequestSource, operation: DesktopOperation, options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
export type ShowSaveDialog = (context: HostContext, event: RequestSource, operation: DesktopOperation, options: Readonly<{title:string;defaultPath:string;filters:{name:string;extensions:string[]}[]}>) => Promise<Readonly<{canceled:boolean;filePath?:string}>>;
export type RequestDialogs = Readonly<{open:ShowOpenDialog; save:ShowSaveDialog; confirm:(event:RequestSource,operation:DesktopOperation,options:CreationConfirmationOptions)=>Promise<Readonly<{response:number}>>}>;
export function createRequestDispatcher(context: HostContext, dialogs: RequestDialogs) {
  const routes = new Map<string, (event:RequestSource,raw:unknown)=>Promise<unknown>>();
  const queries = new Map<string, QueryHandler>();
  const commands = new Map<string, CommandHandler>();
  const systems = new Map<string, SystemHandler>();
  registerProjectHandlers(queries, commands, context, dialogs.open);
  registerCreationHandlers(queries, commands, context, dialogs.confirm, dialogs.save);
  registerMediaHandlers(commands, systems, context, dialogs.open);
  registerJobHandlers(queries, context.host);
  systems.set("system.flush-complete", (request, event) => context.sessions.acknowledgeInputFlush(event.sender.id, request));

  routes.set("project.query", async (event, raw: unknown) => {
    try {
      assertQueryEnvelope(raw); const request = raw as QueryEnvelope;
      if (!context.sessions.hasWindow(event.sender.id)) throw new Error("unregistered request session");
      const handler = queries.get(request.query_type);
      if (!handler) return errorResult("UNKNOWN_QUERY", new Error("query is not implemented by this host"));
      const operation = context.sessions.capture(event.sender.id, request.project_id, !["app.status", "app.projects.recent"].includes(request.query_type));
      const data = await context.sessions.run(operation, () => handler(request, event, operation));
      context.sessions.assertCurrent(operation);
      return { ok: true, data };
    }
    catch (error) { return errorResult("QUERY_FAILED", error); }
  });
  routes.set("project.command", async (event, raw: unknown) => {
    try {
      assertCommandEnvelope(raw); const request = raw as CommandEnvelope;
      if (!context.sessions.hasWindow(event.sender.id)) throw new Error("unregistered request session");
      const handler = commands.get(request.command_type);
      if (!handler) return errorResult("UNKNOWN_COMMAND", new Error("command is not implemented by this host"));
      const operation = context.sessions.capture(event.sender.id, request.project_id, !["project.create", "project.open", "project.open-recent"].includes(request.command_type));
      const data = await context.sessions.run(operation, () => handler(request, event, operation));
      context.sessions.assertCurrent(operation);
      const returnedProjectId = data && typeof data === "object" && "project" in data && typeof (data as { project?: unknown }).project === "string" ? (data as { project: string }).project : "";
      const eventValue = { event_type: request.command_type, project_id: returnedProjectId || request.project_id, payload: {} };
      if (eventValue.project_id && context.sessions.isCurrent(operation)) { context.events.publish(eventValue); context.sessions.broadcast("project.event", eventValue); }
      return { ok: true, data };
    }
    catch (error) { return errorResult("COMMAND_FAILED", error); }
  });
  for (const [channel, handler] of systems) routes.set(channel, async (event, request: unknown) => {
    try {
      if (!context.sessions.hasWindow(event.sender.id)) throw new Error("unregistered request session");
      const operation = context.sessions.capture(event.sender.id, "", false);
      const data = await context.sessions.run(operation, () => handler(request, event, operation));
      context.sessions.assertCurrent(operation);
      return { ok: true, data };
    } catch (error) { return errorResult("SYSTEM_REQUEST_FAILED", error); }
  });
  return async (channel:string, event:RequestSource, raw:unknown) => { const route=routes.get(channel); if(!route) return errorResult("UNKNOWN_CHANNEL",new Error("unknown channel")); return route(event,raw); };
}
