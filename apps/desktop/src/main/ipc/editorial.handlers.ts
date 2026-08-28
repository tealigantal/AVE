import type { CommandHandler } from "../types.js";

export function registerEditorialHandlers(commands: Map<string, CommandHandler>, host: Record<string, (...args: any[]) => unknown>): void {
  commands.set("project.evidence.register", (request) => { host.registerEvidence(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.assembly.v2.register", (request) => host.registerAssemblyCutV2(request.payload as Record<string, unknown> ?? {}));
  commands.set("project.assembly.v2.execute", (request) => host.executeAssemblyCutV2(request.payload as Record<string, unknown> ?? {}));
  commands.set("project.rough-cut.apply", (request) => { const payload = request.payload as { patch?: unknown; track_id?: string } | undefined; return host.applyRoughCutPatch(payload?.patch, payload?.track_id as string); });
  commands.set("project.review.compare", (request) => { host.registerCompare(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.review.reaction", (request) => { host.registerReactionTiming(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.delivery.privacy", (request) => { host.registerPrivacy(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.delivery.rights", (request) => { host.registerRights(request.payload as Record<string, unknown> ?? {}); return host.status(); });
  commands.set("project.delivery.manifest", (request) => { host.registerDelivery(request.payload as Record<string, unknown> ?? {}); return host.status(); });
}
