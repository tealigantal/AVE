export const featureId = "sponsor" as const;
export type SponsorCommand = Readonly<{ type: string; payload: unknown }>;
export type SponsorQuery = Readonly<{ type: string; parameters?: Readonly<Record<string, unknown>> }>;
export type SponsorFeatureDescriptor = Readonly<{ feature_id: typeof featureId; label: "sponsor"; owner: "project-host"; layers: readonly ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] }>;
export const descriptor: SponsorFeatureDescriptor = Object.freeze({ feature_id: featureId, label: "sponsor", owner: "project-host", layers: ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] as const });
