import { DesktopLifecycleError } from "./project-session-manager.js";
import type { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";

async function closeAfterFailure(host: ProjectHostSession, cause: unknown): Promise<never> {
  try { await host.close(); } catch (cleanup) { throw new AggregateError([cause,cleanup], "Project entry and cleanup failed", { cause }); }
  throw cause;
}
export async function createCreationProject(host: ProjectHostSession, projectDirectory: string): Promise<unknown> {
  await host.create(projectDirectory);
  try { return host.initializeCreationTimeline(); } catch (cause) { return closeAfterFailure(host,cause); }
}
export async function openCreationProject(host: ProjectHostSession, projectDirectory: string, expectedProjectId?: string): Promise<unknown> {
  await host.open(projectDirectory, { deferJobRecovery: true, requireCreationTimeline: true });
  try { if (expectedProjectId !== undefined && host.status().project !== expectedProjectId) throw new DesktopLifecycleError("DESKTOP_RECENT_PROJECT_CHANGED", "recent directory now contains another project; no jobs were recovered"); host.recoverOpenJobs(); return host.status(); } catch (cause) { return closeAfterFailure(host,cause); }
}
