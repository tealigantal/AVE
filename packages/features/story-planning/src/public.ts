export const featureId = "story-planning" as const;
export type StoryPlanningCommand = Readonly<{ type: string; payload: unknown }>;
export type StoryPlanningQuery = Readonly<{ type: string; parameters?: Readonly<Record<string, unknown>> }>;
export type StoryPlanningFeatureDescriptor = Readonly<{ feature_id: typeof featureId; label: "story planning"; owner: "project-host"; layers: readonly ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] }>;
export const descriptor: StoryPlanningFeatureDescriptor = Object.freeze({ feature_id: featureId, label: "story planning", owner: "project-host", layers: ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] as const });
export { approveStoryProposalV2, createDirectionCard, evaluateStoryProposal, rankStoryProposals, selectDirectionCard } from "../../../core/editorial-core/src/public.js";
export type { DirectionCardInput, DirectionSelectionInput, StoryApprovalInput, StoryBeatCandidate, StoryProposalInput } from "../../../core/editorial-core/src/public.js";
