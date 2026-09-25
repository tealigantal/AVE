import { ipcMain } from "electron";
import { assertCommandEnvelope, assertQueryEnvelope } from "../../../../../packages/platform/project-api/src/public.js";
import type { CommandEnvelope, QueryEnvelope } from "../../../../../packages/platform/project-api/src/public.js";
import { registerProjectHandlers } from "./project.handlers.js";
import { registerCreationHandlers } from "./creation.handlers.js";
import { registerMediaHandlers } from "./media.handlers.js";
import { showOpenDialogForEvent, showCreationConfirmationForEvent } from "./dialog.js";
import { registerJobHandlers } from "./jobs.handlers.js";
import { validateProjectSession, validateSender } from "../validate-sender.js";
import type { CommandHandler, DesktopContext, QueryHandler, SystemHandler } from "../types.js";
import { creationErrorResult } from "./creation-errors.js";

function errorResult(code: string, error: unknown): { ok: false; error: { code: string; message: string } } {
  // Full causes remain local to Main; Renderer receives only a safe diagnostic.
  console.error(`[AVE ${code}]`,error);
  return creationErrorResult(code,error);
}

export function registerIpc(context: DesktopContext): void {
  const queries = new Map<string, QueryHandler>();
  const commands = new Map<string, CommandHandler>();
  const systems = new Map<string, SystemHandler>();
  registerProjectHandlers(queries, commands, context);
  registerCreationHandlers(queries, commands, context, (event, operation, options) => showCreationConfirmationForEvent(context,event,operation,options));
  registerMediaHandlers(commands, systems, context, showOpenDialogForEvent);
  registerJobHandlers(queries, context.host);

  ipcMain.handle("project.query", async (event, raw: unknown) => {
    try {
      assertQueryEnvelope(raw); const request = raw as QueryEnvelope;
      validateProjectSession(event, context.sessions, request.project_id);
      const handler = queries.get(request.query_type);
      if (!handler) return errorResult("UNKNOWN_QUERY", new Error("query is not implemented by this host"));
      const operation = context.sessions.capture(event.sender.id, request.project_id, request.query_type !== "app.status");
      const data = await context.sessions.run(operation, () => handler(request, event, operation));
      context.sessions.assertCurrent(operation);
      return { ok: true, data };
    }
    catch (error) { return errorResult("QUERY_FAILED", error); }
  });
  ipcMain.handle("project.command", async (event, raw: unknown) => {
    try {
      assertCommandEnvelope(raw); const request = raw as CommandEnvelope;
      validateProjectSession(event, context.sessions, request.project_id);
      const handler = commands.get(request.command_type);
      if (!handler) return errorResult("UNKNOWN_COMMAND", new Error("command is not implemented by this host"));
      const operation = context.sessions.capture(event.sender.id, request.project_id, !["project.create", "project.open"].includes(request.command_type));
      const data = await context.sessions.run(operation, () => handler(request, event, operation));
      context.sessions.assertCurrent(operation);
      const returnedProjectId = data && typeof data === "object" && "project" in data && typeof (data as { project?: unknown }).project === "string" ? (data as { project: string }).project : "";
      const eventValue = { event_type: request.command_type, project_id: returnedProjectId || request.project_id, payload: {} };
      if (eventValue.project_id && context.sessions.isCurrent(operation)) { context.events.publish(eventValue); context.sessions.broadcast("project.event", eventValue); }
      return { ok: true, data };
    }
    catch (error) { return errorResult("COMMAND_FAILED", error); }
  });
  for (const [channel, handler] of systems) ipcMain.handle(channel, async (event, request: unknown) => {
    try {
      validateSender(event, context.sessions);
      const operation = context.sessions.capture(event.sender.id, "", false);
      const data = await context.sessions.run(operation, () => handler(request, event, operation));
      context.sessions.assertCurrent(operation);
      return { ok: true, data };
    } catch (error) { return errorResult("SYSTEM_REQUEST_FAILED", error); }
  });
}
