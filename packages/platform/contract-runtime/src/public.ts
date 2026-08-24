import type { ValidateFunction } from "ajv";
import { creativeSkillOutputValidator, presetApplicationRecordValidator, presetDefinitionValidator, presetSelectionValidator } from "./generated/preset-validators.mjs";
import type { CreativeSkillOutputV1 } from "../../../../contracts/generated/typescript/preset/creative-skill-output.v1.js";
import type { PresetApplicationRecordV1 } from "../../../../contracts/generated/typescript/preset/preset-application-record.v1.js";
import type { PresetDefinitionV1 } from "../../../../contracts/generated/typescript/preset/preset-definition.v1.js";
import type { PresetSelectionV1 } from "../../../../contracts/generated/typescript/preset/preset-selection.v1.js";
import { creativeContractV1Validator, creativeContractV2Validator, materialEvidencePackV1Validator, creativeSkillDefinitionV1Validator, skillEvaluationV1Validator, durationBlueprintV1Validator, durationFeasibilityV1Validator, directionCardV1Validator, storyProposalV2Validator, approvedStoryPlanV2Validator, decisionRecordV1Validator, editorialEditIntentV1Validator, feedbackDiagnosisV2Validator, stage2PermissionRequestV1Validator, stage2PermissionPolicySnapshotV1Validator, stage2PermissionDecisionV1Validator } from "./generated/creative-context-validators.mjs";
import type { CreativeContract } from "../../../../contracts/generated/typescript/editorial/creative-contract.v1.js";
import type { CreativeContractV2 } from "../../../../contracts/generated/typescript/editorial/creative-contract.v2.js";
import type { MaterialEvidencePackV1 } from "../../../../contracts/generated/typescript/editorial/material-evidence-pack.v1.js";
import type { CreativeSkillDefinitionV1 } from "../../../../contracts/generated/typescript/editorial/creative-skill-definition.v1.js";
import type { SkillEvaluationV1 } from "../../../../contracts/generated/typescript/editorial/skill-evaluation.v1.js";
import type { DurationBlueprintV1 } from "../../../../contracts/generated/typescript/editorial/duration-blueprint.v1.js";
import type { DurationFeasibilityV1 } from "../../../../contracts/generated/typescript/editorial/duration-feasibility.v1.js";
import type { DirectionCardV1 } from "../../../../contracts/generated/typescript/editorial/direction-card.v1.js";
import type { StoryProposalV2 } from "../../../../contracts/generated/typescript/editorial/story-proposal.v2.js";
import type { ApprovedStoryPlanV2 } from "../../../../contracts/generated/typescript/editorial/approved-story-plan.v2.js";
import type { DecisionRecordV1 } from "../../../../contracts/generated/typescript/editorial/decision-record.v1.js";
import type { EditorialEditIntentV1 } from "../../../../contracts/generated/typescript/editorial/editorial-edit-intent.v1.js";
import type { FeedbackDiagnosisV2 } from "../../../../contracts/generated/typescript/editorial/feedback-diagnosis.v2.js";
import type { Stage2PermissionRequestV1 } from "../../../../contracts/generated/typescript/editorial/stage2-permission-request.v1.js";
import type { Stage2PermissionPolicySnapshotV1 } from "../../../../contracts/generated/typescript/editorial/stage2-permission-policy-snapshot.v1.js";
import type { Stage2PermissionDecisionV1 } from "../../../../contracts/generated/typescript/editorial/stage2-permission-decision.v1.js";

export type SchemaVersion = 1 | 2;
export type ContractEnvelope = Readonly<{ schema_version: SchemaVersion }>;
export function assertSchemaVersion(value: unknown, expected: SchemaVersion = 1): asserts value is ContractEnvelope { if (!value || typeof value !== "object" || (value as any).schema_version !== expected) throw new Error(`unsupported schema version; expected ${expected}`); }
export function parseContractJson(json: string, expected: SchemaVersion = 1): ContractEnvelope { let value: unknown; try { value = JSON.parse(json); } catch { throw new Error("invalid contract JSON"); } assertSchemaVersion(value, expected); return value; }

function assertContract<T>(validate: ValidateFunction, value: unknown, code: string): asserts value is T {
  if (validate(value)) return;
  const detail = (validate.errors ?? []).map((error) => `${error.instancePath || "/"}:${error.keyword}:${error.message ?? "invalid"}`).join("|");
  throw new Error(`${code}:${detail || "invalid"}`);
}

export function assertPresetDefinitionV1(value: unknown): asserts value is PresetDefinitionV1 { assertContract<PresetDefinitionV1>(presetDefinitionValidator, value, "CONTRACT_PRESET_DEFINITION_INVALID"); }
export function assertPresetSelectionV1(value: unknown): asserts value is PresetSelectionV1 { assertContract<PresetSelectionV1>(presetSelectionValidator, value, "CONTRACT_PRESET_SELECTION_INVALID"); }
export function assertCreativeSkillOutputV1(value: unknown): asserts value is CreativeSkillOutputV1 { assertContract<CreativeSkillOutputV1>(creativeSkillOutputValidator, value, "CONTRACT_CREATIVE_SKILL_OUTPUT_INVALID"); }
export function assertPresetApplicationRecordV1(value: unknown): asserts value is PresetApplicationRecordV1 { assertContract<PresetApplicationRecordV1>(presetApplicationRecordValidator, value, "CONTRACT_PRESET_APPLICATION_RECORD_INVALID"); }
export function assertCreativeContractV1(value: unknown): asserts value is CreativeContract { assertContract<CreativeContract>(creativeContractV1Validator, value, "CONTRACT_CREATIVE_CONTRACT_V1_INVALID"); }
export function assertCreativeContractV2(value: unknown): asserts value is CreativeContractV2 { assertContract<CreativeContractV2>(creativeContractV2Validator, value, "CONTRACT_CREATIVE_CONTRACT_V2_INVALID"); }
export function assertMaterialEvidencePackV1(value: unknown): asserts value is MaterialEvidencePackV1 { assertContract<MaterialEvidencePackV1>(materialEvidencePackV1Validator, value, "CONTRACT_MATERIAL_EVIDENCE_PACK_V1_INVALID"); }
export function assertCreativeSkillDefinitionV1(value: unknown): asserts value is CreativeSkillDefinitionV1 { assertContract<CreativeSkillDefinitionV1>(creativeSkillDefinitionV1Validator, value, "CONTRACT_CREATIVE_SKILL_DEFINITION_V1_INVALID"); }
export function assertSkillEvaluationV1(value: unknown): asserts value is SkillEvaluationV1 { assertContract<SkillEvaluationV1>(skillEvaluationV1Validator, value, "CONTRACT_SKILL_EVALUATION_V1_INVALID"); }
export function assertDurationBlueprintV1(value: unknown): asserts value is DurationBlueprintV1 { assertContract<DurationBlueprintV1>(durationBlueprintV1Validator, value, "CONTRACT_DURATION_BLUEPRINT_V1_INVALID"); }
export function assertDurationFeasibilityV1(value: unknown): asserts value is DurationFeasibilityV1 { assertContract<DurationFeasibilityV1>(durationFeasibilityV1Validator, value, "CONTRACT_DURATION_FEASIBILITY_V1_INVALID"); }
export function assertDirectionCardV1(value: unknown): asserts value is DirectionCardV1 { assertContract<DirectionCardV1>(directionCardV1Validator, value, "CONTRACT_DIRECTION_CARD_V1_INVALID"); }
export function assertStoryProposalV2(value: unknown): asserts value is StoryProposalV2 { assertContract<StoryProposalV2>(storyProposalV2Validator, value, "CONTRACT_STORY_PROPOSAL_V2_INVALID"); }
export function assertApprovedStoryPlanV2(value: unknown): asserts value is ApprovedStoryPlanV2 { assertContract<ApprovedStoryPlanV2>(approvedStoryPlanV2Validator, value, "CONTRACT_APPROVED_STORY_PLAN_V2_INVALID"); }
export function assertDecisionRecordV1(value: unknown): asserts value is DecisionRecordV1 { assertContract<DecisionRecordV1>(decisionRecordV1Validator, value, "CONTRACT_DECISION_RECORD_V1_INVALID"); }
export function assertEditorialEditIntentV1(value: unknown): asserts value is EditorialEditIntentV1 { assertContract<EditorialEditIntentV1>(editorialEditIntentV1Validator, value, "CONTRACT_EDITORIAL_EDIT_INTENT_V1_INVALID"); }
export function assertFeedbackDiagnosisV2(value: unknown): asserts value is FeedbackDiagnosisV2 { assertContract<FeedbackDiagnosisV2>(feedbackDiagnosisV2Validator, value, "CONTRACT_FEEDBACK_DIAGNOSIS_V2_INVALID"); }
export function assertStage2PermissionRequestV1(value: unknown): asserts value is Stage2PermissionRequestV1 { assertContract<Stage2PermissionRequestV1>(stage2PermissionRequestV1Validator, value, "CONTRACT_STAGE2_PERMISSION_REQUEST_V1_INVALID"); }
export function assertStage2PermissionPolicySnapshotV1(value: unknown): asserts value is Stage2PermissionPolicySnapshotV1 { assertContract<Stage2PermissionPolicySnapshotV1>(stage2PermissionPolicySnapshotV1Validator, value, "CONTRACT_STAGE2_PERMISSION_POLICY_SNAPSHOT_V1_INVALID"); }
export function assertStage2PermissionDecisionV1(value: unknown): asserts value is Stage2PermissionDecisionV1 { assertContract<Stage2PermissionDecisionV1>(stage2PermissionDecisionV1Validator, value, "CONTRACT_STAGE2_PERMISSION_DECISION_V1_INVALID"); }
