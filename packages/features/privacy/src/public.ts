export const featureId = "privacy" as const;
import type { PrivacyLedgerEntry } from "../../../core/editorial-core/src/public.js";
export type PrivacyCommand = Readonly<{ type: string; payload: unknown }>;
export type PrivacyQuery = Readonly<{ type: string; parameters?: Readonly<Record<string, unknown>> }>;
export type PrivacyFeatureDescriptor = Readonly<{ feature_id: typeof featureId; label: "privacy"; owner: "project-host"; layers: readonly ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] }>;
export const descriptor: PrivacyFeatureDescriptor = Object.freeze({ feature_id: featureId, label: "privacy", owner: "project-host", layers: ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] as const });
export function approvePrivacy(entry: PrivacyLedgerEntry): PrivacyLedgerEntry { if (entry.status !== "pending") throw new Error("privacy entry is not pending"); if (entry.classification !== "public" && entry.action === "none") throw new Error("non-public asset requires privacy action"); return { ...entry, status: "approved" }; }
