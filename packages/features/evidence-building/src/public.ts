export const featureId = "evidence-building" as const;
import type { Event, MaterialSufficiency } from "../../../core/editorial-core/src/public.js";
export type EvidenceBuildingCommand = Readonly<{ type: string; payload: unknown }>;
export type EvidenceBuildingQuery = Readonly<{ type: string; parameters?: Readonly<Record<string, unknown>> }>;
export type EvidenceBuildingFeatureDescriptor = Readonly<{ feature_id: typeof featureId; label: "evidence building"; owner: "project-host"; layers: readonly ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] }>;
export const descriptor: EvidenceBuildingFeatureDescriptor = Object.freeze({ feature_id: featureId, label: "evidence building", owner: "project-host", layers: ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] as const });
export function validateEvidenceReferences(evidenceIds: readonly string[], knownEvidence: ReadonlySet<string>): void { if (evidenceIds.length === 0 || evidenceIds.some((id) => !knownEvidence.has(id))) throw new Error("all evidence references must be known"); }
export function approveEvent(event: Event, knownEvidence: ReadonlySet<string>, sufficiency: MaterialSufficiency): Event { validateEvidenceReferences(event.evidence_ids, knownEvidence); if (sufficiency.status !== "sufficient") throw new Error("insufficient material blocks event approval"); return { ...event, status: "approved" }; }
