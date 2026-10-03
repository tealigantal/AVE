import type { CreationPlanV1 as MixedCreationPlan } from '../../../contracts/generated/typescript/editorial/creation-plan.v1.js';
export type TemporalSource = Exclude<MixedCreationPlan['shots'][number]['source'],{kind:'image'}>;
export function temporal(source: MixedCreationPlan['shots'][number]['source']): TemporalSource {
  if ('kind' in source) throw new Error('TEST_EXPECTED_TEMPORAL_SOURCE'); return source;
}
