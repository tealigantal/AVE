import type { QueryHandler } from "../types.js";

export function registerJobHandlers(queries: Map<string, QueryHandler>, host: { status(): unknown; listJobs(): readonly unknown[] }): void { queries.set("project.jobs.status", () => host.status()); queries.set("project.jobs.list", () => host.listJobs().map((row: any) => ({ job_id: row.job_id, task_type: row.task_type, state: row.state, progress: row.progress, created_at: row.created_at, updated_at: row.updated_at }))); }
