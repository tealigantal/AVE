export const skillEvaluationProposalSchema: Readonly<Record<string, unknown>>;
export function assertSkillRoot(context: any): void;
export function validateSkillEvaluations(context: any, evaluations: any): Extract<import("../../../../contracts/generated/typescript/editorial/skill-evaluation.v2.js").SkillEvaluationV2, { context_kind: "creation-planning" }>[];
export function projectCreativeSkills(context: any, exchanges: any[]): any;
export function assertCreativeSkillEffects(context: any, exchanges: any[], decision: any, resourceSpans?: readonly any[]): void;
export function bindSkillEffectProposalSchema(context: any, exchanges: any[], schema: any): void;
