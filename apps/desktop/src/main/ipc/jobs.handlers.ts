import type { QueryHandler } from "../types.js";

export function registerJobHandlers(queries: Map<string, QueryHandler>, host: { status(): unknown; listJobs(): readonly unknown[] }): void { queries.set("project.jobs.status", () => host.status()); queries.set("project.jobs.list", () => host.listJobs()); }
