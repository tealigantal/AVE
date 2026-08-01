import { ipcMain } from "electron";
import { assertCommandEnvelope, assertQueryEnvelope } from "../../../../../packages/platform/project-api/src/public.js";
import type { CommandEnvelope, QueryEnvelope } from "../../../../../packages/platform/project-api/src/public.js";
import { registerProjectHandlers } from "./project.handlers.js";
import { registerTimelineHandlers } from "./timeline.handlers.js";
import { registerMediaHandlers } from "./media.handlers.js";
import { registerEditorialHandlers } from "./editorial.handlers.js";
import { registerRenderHandlers } from "./render.handlers.js";
import { registerQcHandlers } from "./qc.handlers.js";
import { registerJobHandlers } from "./jobs.handlers.js";
import { validateProjectSession, validateSender } from "../validate-sender.js";
import type { CommandHandler, DesktopContext, QueryHandler, SystemHandler } from "../types.js";

function errorResult(code: string, error: unknown): { ok: false; error: { code: string; message: string } } { return { ok: false, error: { code, message: error instanceof Error ? error.message : String(error) } }; }

export function registerIpc(context: DesktopContext): void {
  const queries = new Map<string, QueryHandler>();
  const commands = new Map<string, CommandHandler>();
  const systems = new Map<string, SystemHandler>();
  registerProjectHandlers(queries, commands, context);
  registerTimelineHandlers(commands, context.host);
  registerMediaHandlers(commands, systems, context);
  registerEditorialHandlers(commands, context.host as unknown as Record<string, (...args: any[]) => unknown>);
  registerRenderHandlers(commands, context, context.host as unknown as Record<string, (...args: any[]) => unknown>);
  registerQcHandlers(queries, context.host);
  registerJobHandlers(queries, context.host);

  ipcMain.handle("project.query", async (event, raw: unknown) => {
    try { assertQueryEnvelope(raw); const request = raw as QueryEnvelope; validateProjectSession(event, context.sessions, request.project_id); const handler = queries.get(request.query_type); if (!handler) return errorResult("UNKNOWN_QUERY", new Error("query is not implemented by this host")); return { ok: true, data: await handler(request, event) }; }
    catch (error) { return errorResult("QUERY_FAILED", error); }
  });
  ipcMain.handle("project.command", async (event, raw: unknown) => {
    try { assertCommandEnvelope(raw); const request = raw as CommandEnvelope; validateProjectSession(event, context.sessions, request.project_id); const handler = commands.get(request.command_type); if (!handler) return errorResult("UNKNOWN_COMMAND", new Error("command is not implemented by this host")); const data = await handler(request, event); const returnedProjectId = data && typeof data === "object" && "project" in data && typeof (data as { project?: unknown }).project === "string" ? (data as { project: string }).project : ""; const eventValue = { event_type: request.command_type, project_id: request.project_id || returnedProjectId, payload: data }; if (eventValue.project_id) { context.events.publish(eventValue); context.sessions.broadcast("project.event", eventValue); } return { ok: true, data }; }
    catch (error) { return errorResult("COMMAND_FAILED", error); }
  });
  for (const [channel, handler] of systems) ipcMain.handle(channel, async (event, request: unknown) => { try { validateSender(event, context.sessions); return { ok: true, data: await handler(request, event) }; } catch (error) { return errorResult("SYSTEM_REQUEST_FAILED", error); } });
}
