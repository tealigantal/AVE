import type { CreationSessionV1 } from "../../../../contracts/generated/typescript/editorial/creation-session.v1.js";
import type { Timeline } from "../../../core/timeline-core/src/public.js";
export function resolveCreationAmbientRequirementAtRevision(state: CreationSessionV1, revision?: number): Readonly<{ status: "unspecified" | "required" | "cleared"; action_revision: number | null }>;
export function assertCreationAudioIntentTimeline(context: any, query: any, timeline: Timeline): void;
export function creationExplicitAmbientEvidence(context: any): readonly string[];
export function assertCreationExplicitAmbientTimeline(context: any, timeline: Timeline): void;
export function assessCreationAmbientTimeline(context: any, timeline: Timeline): {status: "verified"} | {status: "unverified"; reason: "no-sound-analysis" | "no-verified-ambient-event" | "event-not-covered"};
export function assertCreationSourceTrackTimeline(boundary: any, timeline: Timeline): void;
export function creationSourceTrackBoundary(asset: any, fresh: any): { version: number; asset_id: string; byte_length: number; stream_index: number; start_pts: string; end_pts: string; time_base: { numerator: string; denominator: string }; sample_rate: string; sample_count: string };
