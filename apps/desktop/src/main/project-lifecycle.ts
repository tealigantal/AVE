import type { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";
import { ensureCanonicalStage2Timeline } from "./stage2-timeline.js";

export async function createCanonicalStage2Project(host: ProjectHostSession, projectDirectory: string): Promise<unknown> {
  await host.create(projectDirectory);
  try { return await ensureCanonicalStage2Timeline(host); }
  catch (error) { await host.close(); throw error; }
}

export async function openCanonicalStage2Project(host: ProjectHostSession, projectDirectory: string): Promise<unknown> {
  await host.open(projectDirectory, { deferJobRecovery: true });
  try { const status = await ensureCanonicalStage2Timeline(host); host.recoverOpenJobs(); return status; }
  catch (error) { await host.close(); throw error; }
}
