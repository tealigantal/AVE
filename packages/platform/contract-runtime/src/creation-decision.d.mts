import type { CreationDecisionV1 } from "../../../../contracts/generated/typescript/editorial/creation-decision.v1.js";
import type { CreationPlanV1 } from "../../../../contracts/generated/typescript/editorial/creation-plan.v1.js";
export function assertCreationDecisionV1(value: unknown): asserts value is CreationDecisionV1;
export function compileCreationDecisionV1(decision: unknown, identity: Readonly<Pick<CreationPlanV1, "plan_id" | "request_id" | "revision" | "base_timeline_version" | "input_digest">>, timebase: Readonly<{ value: string | bigint; timescale: string | bigint }>, durationBudget: Readonly<{ minimum_total_ticks: string; maximum_total_ticks: string | null }> | null): CreationPlanV1;

export function allocateCreationSelectionTicks(selections: readonly Pick<CreationDecisionV1["shots"][number], "source_window" | "timing">[], target: bigint, timebase: Readonly<{value:string|bigint;timescale:string|bigint}>): readonly Readonly<{index:number;capacity:bigint;allocated:bigint;weight:bigint}>[];
