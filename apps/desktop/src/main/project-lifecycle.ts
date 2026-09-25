import type { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";

async function closeAfterFailure(host: ProjectHostSession, cause: unknown): Promise<never> {
  try { await host.close(); } catch (cleanup) { throw new AggregateError([cause,cleanup], "Project entry and cleanup failed", { cause }); }
  throw cause;
}
export async function createCreationProject(host: ProjectHostSession, projectDirectory: string): Promise<unknown> {
  await host.create(projectDirectory);
  try { return host.initializeCreationTimeline(); } catch (cause) { return closeAfterFailure(host,cause); }
}
export async function openCreationProject(host: ProjectHostSession, projectDirectory: string): Promise<unknown> {
  await host.open(projectDirectory, { deferJobRecovery: true, requireCreationTimeline: true });
  try { host.recoverOpenJobs(); return host.status(); } catch (cause) { return closeAfterFailure(host,cause); }
}
