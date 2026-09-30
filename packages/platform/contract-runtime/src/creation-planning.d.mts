import type { CreationDecisionV1 } from "../../../../contracts/generated/typescript/editorial/creation-decision.v1.js";
import type { CreationPlanningExchangeV3 } from "../../../../contracts/generated/typescript/editorial/creation-planning-exchange.v3.js";
import type { RationalTime } from "../../../../contracts/generated/typescript/common/rational-time.v1.js";
export type PlanningQuery = Readonly<Required<Pick<CreationPlanningExchangeV3, "exchange_version" | "query_id" | "target_duration_ticks" | "selection">> & { kind: "measure_selection" }>;
export type PlanningSourceChoice = { kind: "catalog_option"; option_id: string } | { kind: "custom_window"; source_window: CreationDecisionV1["shots"][number]["source_window"] };
export type PlanningCreative = Omit<CreationDecisionV1, "decision_version" | "target_duration_ticks" | "shots"> & { shots: Omit<CreationDecisionV1["shots"][number], "source_window" | "timing">[] };
export type PlanningFinal = Readonly<{ exchange_version: 3; kind: "final"; measured_query_id: string; measurement_receipt_digest: string; creative: PlanningCreative }>;
export type PlanningExchange = PlanningQuery | PlanningFinal;
export type PlanningUsage = Readonly<{ input: number; output: number; total?: number }>;
export type PlanningTransport = Readonly<{ wire_digest: string; input_bytes: number; target?: Readonly<{ role: "vision" | "transcription" | "sound" | "planner"; provider: string; model: string; endpoint: string; digest: string; sample_id?: string }> }>;
export type PlanningRawOutput = Readonly<{ representation: "provider-text" | "canonical-json"; payload: string; utf8_bytes: number; sha256: string }>;
export type PlanningInput = Readonly<{ context: unknown; media: readonly [] }>;
export type PlanningMeasurement = Readonly<{ tool: "measure_creation_selection"; query_id: string; target_duration_ticks: string; selection: readonly Readonly<{ selection_id: string; timing_kind: "weighted" | "exact"; capacity_ticks: string; allocated_duration_ticks?: string | null; exact_reserved_ticks: string; minimum_ticks: string; visual_anchors_in_declared_window: readonly Readonly<{ evidence_id: string; sample_at: RationalTime }>[]; grounding_note: string }>[]; total_capacity_ticks: string; allocated_duration_ticks?: string | null; exact_reserved_ticks: string; minimum_required_ticks: string; deficit_ticks: string; minimum_excess_ticks: string; capacity_feasible: boolean; pacing_feasible?: boolean; pacing_mean_increased?: boolean; pacing_minimum_shot_ticks?: string; pacing_violating_selection_ids?: readonly string[]; final_validation_required: true }>;
export type CompletedPlanningMeasurement = Readonly<{ exchange: PlanningQuery; measurement: PlanningMeasurement }>;
export type PlanningRound = Readonly<{ model_snapshot: string; input: PlanningInput; input_hash: string; transport: PlanningTransport; provider_output: PlanningRawOutput; exchange: PlanningExchange; output_hash: string; token_usage?: PlanningUsage; reasoning_observation?: Readonly<{ content_observed: boolean; tokens: number | null }>; measurement?: PlanningMeasurement }>;
export type CreationPlanningProof = Readonly<{ protocol: "planning-exchange-v3"; root_input_digest: string; rounds: readonly PlanningRound[] }>;
export type PlanningPending = { round: number; input: PlanningInput; input_hash: string; transport?: PlanningTransport; provider_output?: PlanningRawOutput; token_usage?: PlanningUsage };
export type CreationPlanningDiagnostic = Readonly<{ protocol: "planning-exchange-v3"; root_input_digest: string; root_input: Readonly<{ context: unknown; media: readonly unknown[] }>; rounds: readonly PlanningRound[]; pending: PlanningPending | null }>;
export const CREATION_PLANNING_PROTOCOL: Readonly<{ protocol: "planning-exchange-v3"; tool: "measure_creation_selection"; max_measurements: 2; max_physical_calls: 3 }>;
export function assertCreationPlanningExchangeV3(value: unknown): asserts value is PlanningExchange;
export type SourceChoiceCatalogEntry = Readonly<{ option_id: string; span_id: string; asset_id: string; evidence_id: string; description: string; uncertain: boolean; sample_at: RationalTime; source_window: CreationDecisionV1["shots"][number]["source_window"] | null; maximum_duration_ticks: string; unavailable_reason: string | null }>;
export function buildCreationSourceChoiceCatalog(context: unknown): readonly SourceChoiceCatalogEntry[];
export function resolveCreationSourceChoice(choice: PlanningSourceChoice, context: unknown): CreationDecisionV1["shots"][number]["source_window"];
export function resolveCreationPlanningFinal(final: unknown, root: unknown, exchanges: readonly CompletedPlanningMeasurement[]): CreationDecisionV1;
export function creationPlanningResponseSchema(decisionSchema: unknown, phase?: "measure-only" | "measure-or-final" | "final-only"): Readonly<Record<string, unknown>>;
export function deriveCreationPlanningInput(root: unknown, exchanges: readonly CompletedPlanningMeasurement[]): { context: Readonly<Record<string, unknown>> & { planning_exchange: { protocol: "planning-exchange-v3"; root_input_digest: string; round: number; exchanges: readonly CompletedPlanningMeasurement[]; response_schema: Readonly<Record<string, unknown>> } }; media: [] };
export function measureCreationSelection(query: unknown, context: unknown): PlanningMeasurement;
export function validateCreationPlanningProof(state: unknown, ticket: unknown, input: unknown, output: unknown, audit: unknown): void;

export function resolveRejectedCreationPlanningFinal(final: unknown, diagnostic: unknown): CreationDecisionV1;

export const CREATION_PLANNING_PROJECTION_VERSION: "phase-specific-v1";


export const CREATION_PLANNING_QUERY_IDENTITY: "host-root-round-v1";
export function assertCreationPlanningRoundIdentity(input: { context: unknown }, exchange: PlanningExchange): void;

export function creationPlanningMeasurementReceipt(root: unknown, exchange: PlanningQuery, measurement: PlanningMeasurement): string;
