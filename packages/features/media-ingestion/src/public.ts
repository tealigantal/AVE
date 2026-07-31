export const featureId = "media-ingestion" as const;
export type MediaIngestionCommand = Readonly<{ type: string; payload: unknown }>;
export type MediaIngestionQuery = Readonly<{ type: string; parameters?: Readonly<Record<string, unknown>> }>;
export type MediaIngestionFeatureDescriptor = Readonly<{ feature_id: typeof featureId; label: "media ingestion"; owner: "project-host"; layers: readonly ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] }>;
export const descriptor: MediaIngestionFeatureDescriptor = Object.freeze({ feature_id: featureId, label: "media ingestion", owner: "project-host", layers: ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] as const });
