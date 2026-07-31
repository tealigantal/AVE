import { InvalidationPlanner, type InvalidationPlan, hash } from "./invalidation-planner.js";

export type DesiredState = Readonly<{ version: number; changes: readonly string[]; values?: Readonly<Record<string, unknown>> }>;
export type CurrentState = Readonly<{ version: number; current?: readonly string[]; heads?: Readonly<Record<string, number>>; approvals?: Readonly<Record<string, Readonly<{ version: number; status: "approved" | "candidate" }>>>; desired_hash?: string }>;
export type Action = Readonly<{ action_id: string; target: string; kind: "recompute"; input_version: number; requires_approval: boolean; approval_inherited: false }>;
export type ActionPlan = Readonly<{ actions: readonly Action[]; approval_resets: readonly string[]; plan_hash: string }>;
export type ReconcileResult = Readonly<{ desired: DesiredState; current: CurrentState; invalidation: InvalidationPlan; action_plan: ActionPlan }>;

const approvalTargets = new Set(["story_plan", "sponsor_plan", "timeline", "render"]);

export class Reconciler {
  constructor(private readonly planner = new InvalidationPlanner()) {}

  reconcile(desired: DesiredState, current: CurrentState): ReconcileResult {
    if (!Number.isInteger(desired.version) || desired.version < 0) throw new Error("desired state version must be non-negative");
    if (!Number.isInteger(current.version) || current.version < 0) throw new Error("current state version must be non-negative");
    const invalidation = this.planner.plan(desired.changes);
    const actions = invalidation.stale.map((target) => ({ action_id: `${desired.version}:${target}`, target, kind: "recompute" as const, input_version: desired.version, requires_approval: approvalTargets.has(target), approval_inherited: false as const }));
    const approvalResets = Object.entries(current.approvals ?? {}).filter(([target, approval]) => invalidation.stale.includes(target) && approval.version !== desired.version).map(([target]) => target).sort();
    const action_plan: ActionPlan = { actions, approval_resets: approvalResets, plan_hash: hash({ desired_version: desired.version, invalidation_hash: invalidation.plan_hash, actions, approval_resets: approvalResets }) };
    return { desired, current, invalidation, action_plan };
  }
}
