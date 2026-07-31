import type { CommandHandler } from "../types.js";

export function registerEditorialHandlers(commands: Map<string, CommandHandler>, host: Record<string, (...args: any[]) => unknown>): void {
  commands.set("project.evidence.register", (request) => { host.registerEvidence(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.story.approve", (request) => { host.registerApprovedStoryPlan(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.assembly.register", (request) => { host.registerAssemblyCut(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.assembly.compile", (request) => { const payload = request.payload as { assembly_id?: string; track_id?: string; base_version?: number } | undefined; return host.compileAssemblyToTimeline(payload?.assembly_id as string, payload?.track_id as string, payload?.base_version as number); });
  commands.set("project.rough-cut.apply", (request) => { const payload = request.payload as { patch?: unknown; track_id?: string } | undefined; return host.applyRoughCutPatch(payload?.patch, payload?.track_id as string); });
  commands.set("project.review.diagnosis", (request) => { const payload = request.payload as { diagnosis?: unknown; issues?: unknown[] } | undefined; host.registerFeedbackDiagnosis(payload?.diagnosis, payload?.issues ?? []); return host.status(); });
  commands.set("project.review.compare", (request) => { host.registerCompare(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.review.reaction", (request) => { host.registerReactionTiming(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.delivery.privacy", (request) => { host.registerPrivacy(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.delivery.rights", (request) => { host.registerRights(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.delivery.manifest", (request) => { host.registerDelivery(request.payload as Record<string, unknown> ?? {}); return host.status(); });
}
