import type { RecentProjects } from "./recent-projects.js";
import type { BrowserWindow, dialog } from "electron";
import type { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";
import { createEventBus } from "../../../../packages/platform/project-api/src/public.js";
import type { CommandEnvelope, QueryEnvelope } from "../../../../packages/platform/project-api/src/public.js";
import { ProjectSessionManager, type DesktopOperation } from "./project-session-manager.js";
import type { ProfileRepository } from "../../../../packages/platform/user-profile-store/src/public.js";

export type EventBus = ReturnType<typeof createEventBus>;
export type HostContext = Readonly<{ host: ProjectHostSession; recents: RecentProjects; profile: ProfileRepository; sessions: ProjectSessionManager; events: EventBus; creationCredential: object; modelService?: Readonly<{ provider: string; model: string }> | null }>;
export type DesktopContext = HostContext & Readonly<{ dialog: typeof dialog }>;
export type RequestSource = Readonly<{ sender: Readonly<{ id: number }> }>;
export type QueryHandler = (request: QueryEnvelope, event: RequestSource, operation: DesktopOperation) => Promise<unknown> | unknown;
export type CommandHandler = (request: CommandEnvelope, event: RequestSource, operation: DesktopOperation) => Promise<unknown> | unknown;
export type SystemHandler = (request: unknown, event: RequestSource, operation: DesktopOperation) => Promise<unknown> | unknown;
export type WindowFactory = () => BrowserWindow;
