export const featureId = "reference-analysis" as const;
import type { AnalysisSegment, Observation } from "../../../core/editorial-core/src/public.js";
export type ReferenceAnalysisCommand = Readonly<{ type: string; payload: unknown }>;
export type ReferenceAnalysisQuery = Readonly<{ type: string; parameters?: Readonly<Record<string, unknown>> }>;
export type ReferenceAnalysisFeatureDescriptor = Readonly<{ feature_id: typeof featureId; label: "reference analysis"; owner: "project-host"; layers: readonly ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] }>;
export const descriptor: ReferenceAnalysisFeatureDescriptor = Object.freeze({ feature_id: featureId, label: "reference analysis", owner: "project-host", layers: ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"] as const });
export function observationFromAnalysis(segment: AnalysisSegment): Observation { if (segment.end_pts <= segment.start_pts) throw new Error("analysis segment range must be positive"); if (!segment.text.trim()) throw new Error("analysis segment must contain explicit output"); return { schema_version: 1, observation_id: `${segment.source}:${segment.segment_id}`, asset_id: segment.asset_id, start_pts: segment.start_pts, end_pts: segment.end_pts, statement: segment.text }; }
