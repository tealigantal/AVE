import type { BrowserWindow, dialog } from "electron";
import type { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";
import { createEventBus } from "../../../../packages/platform/project-api/src/public.js";
import type { CommandEnvelope, QueryEnvelope } from "../../../../packages/platform/project-api/src/public.js";
import { ProjectSessionManager } from "./project-session-manager.js";

export type EventBus = ReturnType<typeof createEventBus>;
export type DesktopContext = Readonly<{ host: ProjectHostSession; sessions: ProjectSessionManager; dialog: typeof dialog; events: EventBus; stage2ReviewCredential: object }>;
export type QueryHandler = (request: QueryEnvelope, event: Electron.IpcMainInvokeEvent) => Promise<unknown> | unknown;
export type CommandHandler = (request: CommandEnvelope, event: Electron.IpcMainInvokeEvent) => Promise<unknown> | unknown;
export type SystemHandler = (request: unknown, event: Electron.IpcMainInvokeEvent) => Promise<unknown> | unknown;
export type WindowFactory = () => BrowserWindow;
