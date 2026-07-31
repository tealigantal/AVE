import type { QueryHandler } from "../types.js";

export function registerQcHandlers(queries: Map<string, QueryHandler>, host: { status(): unknown; listQcIssues(): readonly unknown[] }): void { queries.set("project.qc.status", () => host.status()); queries.set("project.qc.issues", () => host.listQcIssues()); }
