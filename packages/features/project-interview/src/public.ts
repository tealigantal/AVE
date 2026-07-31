export const featureId = "project-interview" as const;
import type { Interpretation, Observation } from "../../../core/editorial-core/src/public.js";
export type ProjectInterviewCommand = Readonly<{ type: string; payload: unknown }>;
export type ProjectInterviewQuery = Readonly<{ type: string; parameters?: Readonly<Record<string, unknown>> }>;
export type ProjectInterviewFeatureDescriptor = Readonly<{ feature_id: typeof featureId; label: "project interview"; owner: "project-host"; layers: readonly ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] }>;
export const descriptor: ProjectInterviewFeatureDescriptor = Object.freeze({ feature_id: featureId, label: "project interview", owner: "project-host", layers: ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] as const });
export function validateObservation(observation: Observation): void { if (observation.end_pts <= observation.start_pts) throw new Error("observation range must be positive"); if (!observation.statement.trim()) throw new Error("observation statement is required"); }
export function validateInterpretation(interpretation: Interpretation, observations: ReadonlySet<string>): void { if (interpretation.evidence_ids.length === 0 || interpretation.evidence_ids.some((id) => !observations.has(id))) throw new Error("interpretation requires known evidence"); if (interpretation.confidence < 0 || interpretation.confidence > 1) throw new Error("confidence must be between 0 and 1"); }
export function approveInterpretation(interpretation: Interpretation, observations: ReadonlySet<string>): Interpretation { validateInterpretation(interpretation, observations); return { ...interpretation, review_status: "approved" }; }
