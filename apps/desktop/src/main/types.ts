import type { BrowserWindow, dialog } from "electron";
import type { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";
import { createEventBus } from "../../../../packages/platform/project-api/src/public.js";
import type { CommandEnvelope, QueryEnvelope } from "../../../../packages/platform/project-api/src/public.js";
import { ProjectSessionManager, type DesktopOperation } from "./project-session-manager.js";
import type { ProfileRepository } from "../../../../packages/platform/user-profile-store/src/public.js";

export type EventBus = ReturnType<typeof createEventBus>;
export type DesktopContext = Readonly<{ host: ProjectHostSession; profile: ProfileRepository; sessions: ProjectSessionManager; dialog: typeof dialog; events: EventBus; creationCredential: object; modelService?: Readonly<{ provider: string; model: string }> | null }>;
export type QueryHandler = (request: QueryEnvelope, event: Electron.IpcMainInvokeEvent, operation: DesktopOperation) => Promise<unknown> | unknown;
export type CommandHandler = (request: CommandEnvelope, event: Electron.IpcMainInvokeEvent, operation: DesktopOperation) => Promise<unknown> | unknown;
export type SystemHandler = (request: unknown, event: Electron.IpcMainInvokeEvent, operation: DesktopOperation) => Promise<unknown> | unknown;
export type WindowFactory = () => BrowserWindow;
