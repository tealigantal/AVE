import { createProject, openProject, commitTimeline, commitTimelinePlan, readLatestTimeline, readTimelineAtVersion, readLatestTimelineCommand, readTimelineRedo, readPresetApplication, listPresetApplications, registerPresetApplicationBlocker, readLatestRender, registerRenderBundle, readRenderBundleByIdempotency, listRenderResults, registerAssetLocation, setAssetLocationPermission, listAssetLocations, listAssetLocationsForAssets, registerMediaAsset, registerMediaRelation, registerMediaDependency as persistMediaDependency, markMediaDependenciesStale, listMediaDependencies, registerEvidence, listReviewArtifacts, readReviewArtifact, registerReviewArtifact, listRenderManifests, registerReactionTiming, readReactionTiming, listDeliveryRecords, registerDeliveryRecord, readDeliveryRecord, registerExport, listExports, readExport, readObjectSync, putObjectAndRegister, listModelRuns, createPersistentJob, readPersistentJob, readPersistentJobByIdempotency, listPersistentJobs, startPersistentJob, updatePersistentJobProgress, finishPersistentJob, recoverPersistentJobs } from "../../project-storage/src/public.js";
import { applyCommand, assertValidTimeline, inverseCommand, commitPlanPayload, createCommitPlan, simulateCommands } from "../../../core/timeline-core/src/public.js";
import { compileAssemblyCutToCommandEditIntent, validateAssemblyCutV2, type ApprovedAssemblyEvidence, type AssemblyCutV2 } from "../../../features/assembly-cut/src/public.js";
import { validateRoughCutPatch } from "../../../features/rough-cut/src/public.js";
import { validateDelivery, approveRights, validateExportRegistration, validateExportProfile, exportCapabilities } from "../../../features/delivery/src/public.js";
import { approvePrivacy } from "../../../features/privacy/src/public.js";
import { createFeedbackRevisionIntent, diagnoseFeedbackRevision, validateCompare, validateFeedbackDiagnosisV2, validateReactionTiming, type FeedbackRevisionDiagnosisInput } from "../../../features/feedback/src/public.js";
import { assetIdFromFingerprint, sourceRange, type AssetId, type ContentFingerprint } from "../../../core/media-identity/src/public.js";
import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants, fstatSync, lstatSync, statSync, type BigIntStats } from "node:fs";
import { link, lstat, mkdir, open, readFile, rm, stat, type FileHandle } from "node:fs/promises";
import type { Timeline, TimelineCommand, Track } from "../../../core/timeline-core/src/public.js";
import { qcMaster } from "../../render-service/src/public.js";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { JobEngine, hashJobInput, type JobStore } from "../../job-engine/src/public.js";
import { createLocalWorkerJobPort, type WorkerJobPort } from "../../worker-client/src/public.js";
import { buildTimelineRenderGraph, canonicalSerialize, renderGraphPayload, resolveExecutionPlan, semanticGraphPayload, timelineRenderCapabilities, validateGraph, type ExecutionPlan, type RenderProfile, type RenderRange, type RenderSourceRef } from "../../../core/render-graph/src/public.js";
import type { ModelProvider } from "../../model-gateway/src/public.js";
import { exportEdl } from "../../../adapters/edl-adapter/src/public.js";
import { exportFcpXml } from "../../../adapters/fcpxml-adapter/src/public.js";
import { exportOtio } from "../../../adapters/otio-adapter/src/public.js";
import { exportWebPreview, validateTimelineRoundtrip } from "../../../adapters/web-preview-adapter/src/public.js";
import { importOtio } from "../../../adapters/otio-adapter/src/public.js";
import { importFcpXml } from "../../../adapters/fcpxml-adapter/src/public.js";
import { importEdl } from "../../../adapters/edl-adapter/src/public.js";
import { canonicalPresetPayload, createBuiltInPresetRegistry, presetDigest, resolveCreativeSkill, type CreativeSkillOutput, type PresetDefinition, type PresetResolution, type PresetResolutionContext } from "../../../core/preset-core/src/public.js";
import { assertCreativeSkillOutputV1, assertPresetApplicationRecordV1, assertPresetDefinitionV1 } from "../../contract-runtime/src/public.js";
import type { PresetApplicationRecordV1 } from "../../../../contracts/generated/typescript/preset/preset-application-record.v1.js";
import { compileApprovedEditorialIntent, compileFeedbackRevision, feedbackTrimTargetUnavailableReason, resolveCommandEditIntent, semanticFirstCutDestinationViolation, SEMANTIC_INTENT_COMPILER_ID, SEMANTIC_INTENT_COMPILER_VERSION, type ApprovedSemanticEvidence, type CommandEditIntent, type CommandEditIR, type EditPrecondition, type EditProducer, type SemanticIntentCompilation } from "../../../core/edit-ir/src/public.js";
import { divideRounded, rationalTime } from "../../../core/timebase/src/public.js";
import { readCreativeContractVersion, readCreativeContractHead, listCreativeContractVersions, listCreativeContractHeads, registerCreativeContractVersion, registerCreativeContractDecision, readCreativeContractDecision, readEvidenceObject, readMediaAsset, registerMaterialEvidencePack, readMaterialEvidencePack, readMaterialEvidencePackByInput, listMaterialEvidencePacks, readStage2WorkspaceSnapshot, registerCreativeSkillDefinition, readCreativeSkillDefinition, listCreativeSkillDefinitions, readCreativeSkillDefinitionControl, setCreativeSkillDefinitionAvailability, registerSkillEvaluation, readSkillEvaluation, readSkillEvaluationByInput, listSkillEvaluations, registerDurationBlueprint, readDurationBlueprint, listDurationBlueprints, registerDurationFeasibility, readDurationFeasibility, readDurationFeasibilityByInput, listDurationFeasibilities, registerEditorialArtifact, registerEditorialArtifactBatch, readEditorialArtifact, readEditorialArtifactByInput, listEditorialArtifacts, readCoverageMatrix, readStage2PermissionPolicySnapshot, readStage2PermissionDecision, readStage2PermissionDecisionByInput, listStage2PermissionDecisions, registerStage2PermissionAuthorization, registerStage2HumanApproval, readStage2HumanApproval, runStage2AtomicMutation, readIntelligenceEditExecution, registerFeedbackDiagnosis, readFeedbackDiagnosis, readFeedbackDiagnosisByInput, listFeedbackDiagnoses } from "../../project-storage/src/public.js";
import { CREATIVE_SKILL_EVALUATOR_VERSION, CREATIVE_SKILL_POLICY_VERSION, DURATION_ALLOCATOR_VERSION, DURATION_MATERIAL_POLICY_VERSION, DURATION_POLICY_VERSION, STORY_APPROVAL_VERSION, STORY_EVALUATOR_VERSION, STORY_POLICY_VERSION, allocateDurationBeatBudgets, allocateDurationRoleBudgets, approveStoryProposalV2, builtInCreativeSkillDefinitions, builtInDurationBlueprints, canonicalEditorialObject, createDirectionCard, editorialObjectDigest, evaluateCreativeSkill, evaluateDurationFeasibility, evaluateStoryProposal, selectDirectionCard, validateCreativeSkillDefinition, validateDurationBlueprint, validateDurationFeasibilityInput, validateSkillEvaluationInput, type CoverageMatrix, type CreativeContractV2, type DirectionCardInput, type DirectionSelectionInput, type DurationBeatBudget, type DurationFeasibilityInput, type MaterialEvidencePackV1, type SkillEvaluationInput, type StoryApprovalInput, type StoryProposalInput } from "../../../core/editorial-core/src/public.js";
import { canonicalCreativeContext, createCreativeContractDraft, validateCreativeContractV2, validateMaterialEvidencePack } from "./creative-context.js";
import { assertApprovedStoryPlanV2, assertCreativeContractV2, assertDecisionRecordV1, assertDirectionCardV1, assertEditorialEditIntentV1, assertFeedbackDiagnosisV2, assertMaterialEvidencePackV1, assertCreativeSkillDefinitionV1, assertSkillEvaluationV1, assertStoryProposalV2, assertDurationBlueprintV1, assertDurationFeasibilityV1, assertStage2PermissionRequestV1, assertStage2PermissionPolicySnapshotV1, assertStage2PermissionDecisionV1 } from "../../contract-runtime/src/public.js";
import { EDITORIAL_INTENT_GENERATOR_VERSION, EDITORIAL_INTENT_POLICY_VERSION, generateEditorialEditIntent, type EditorialEditIntentInput } from "../../../features/edit-intent-generation/src/public.js";
import { createBuiltInStage2PermissionPolicySnapshot, createStage2PermissionDecision, evaluateStage2Permission, permissionRefKey, permissionRequestFingerprint, stage2PermissionEffectDigest, STAGE2_PERMISSION_POLICY_VERSION, type Stage2PermissionDecisionV1, type Stage2PermissionRequestV1, type Stage2PermissionTypedRef } from "../../../features/permission-enforcement/src/public.js";
import { approveEvidence } from "../../project-storage/src/public.js";

export type ProjectHostStatus = Readonly<{ project: string; timeline: string; render: string; qc: string }>;
export type QcRequirements = Readonly<{ loudness?: Readonly<{ target_lufs: number; tolerance_lufs?: number; true_peak_db?: number }>; planned_freeze?: boolean; planned_silence?: boolean; subtitle_bounds?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; missing_effects?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; sponsor?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; privacy?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }> }>;
export function renderBundleIdentity(previewCacheKey: string, masterCacheKey: string, qcRequirements: QcRequirements = {}, provenanceKey?: string): string { return createHash("sha256").update(canonicalSerialize({ preview_cache_key: previewCacheKey, master_cache_key: masterCacheKey, qc_requirements: qcRequirements, ...(provenanceKey ? { provenance_key: provenanceKey } : {}) })).digest("hex"); }
export type TimelineRenderOptions = Readonly<{ sources: readonly RenderSourceRef[]; outputDirectory?: string; profile?: RenderProfile; range?: RenderRange; qcRequirements?: QcRequirements; executionBinding?: Readonly<{ execution_id: string; timeline_version: number; semantic_graph_hash: string; preview_plan_id: string; master_plan_id: string; source_identity_digest: string }> }>;
export type ProjectHostOptions = Readonly<{
  modelProvider?: ModelProvider;
  model?: string;
  provider?: string;
  presetDefinitions?: readonly PresetDefinition[];
  trustedPresetDigests?: readonly string[];
  revokedPresetDigests?: readonly string[];
  presetLicenseStatuses?: Readonly<Record<string, "unknown" | "pending" | "approved" | "expired" | "revoked">>;
  stage2HumanReviewChannels?: readonly Readonly<{ credential: object; actor_id: string }>[];
  now?: () => number;
}>;
export type Stage2HumanApprovalDraft = Readonly<{ approval_id: string; action: Stage2PermissionRequestV1["action"]; subject_ref: Stage2PermissionTypedRef; context_refs: readonly Stage2PermissionTypedRef[]; requested_data_fields: readonly string[]; affected_scope: readonly string[]; effect_digest: string; reason: string; expires_at: string }>;
export type EditorialIntentHostInput = Omit<EditorialEditIntentInput, "approved_story_ref" | "decision_refs" | "contract_ref" | "capability_snapshot_ref" | "available_capabilities" | "base_timeline_version" | "protected_refs"> & Readonly<{ plan_id: string; decision_ids: readonly string[]; capability_snapshot_id: string }>;
export type EditorialIntentExecutionIdentity = Readonly<{ execution_id: string; intent_id: string; proposal_approval_decision_id: string }>;
export type EditorialIntentExecutionInput = EditorialIntentExecutionIdentity & Readonly<{ execution_approval_id: string; reason: string }>;
export type EditorialIntentExecutionReview = Readonly<{ execution_id: string; compiler_id: string; compiler_version: number; subject_ref: Stage2PermissionTypedRef; context_refs: readonly Stage2PermissionTypedRef[]; requested_data_fields: readonly string[]; affected_scope: readonly string[]; base_timeline_version: number; expected_final_timeline_version: number; compiled_effect_digest: string; source_identity_digest: string; semantic_graph_hash: string; effect_digest: string }>;
export type FeedbackRevisionHostInput = Omit<FeedbackRevisionDiagnosisInput, "base_execution_ref" | "base_timeline_ref" | "authority_refs" | "target" | "created_at"> & Readonly<{ intent_id: string; base_execution_id: string; target: Readonly<{ track_id: string; clip_id: string; proposed_source: FeedbackRevisionDiagnosisInput["target"]["proposed_source"]; trim_duration: FeedbackRevisionDiagnosisInput["target"]["trim_duration"] }>; created_at?: string }>;
export type FeedbackRevisionPreview = Readonly<{ diagnosis_ref: Readonly<{ object_id: string; object_version: number; digest: string }>; intent_ref: Readonly<{ object_id: string; object_version: number; digest: string }>; base_execution_ref: Readonly<{ object_id: string; object_version: number; digest: string }>; base_timeline_version: number; expected_final_timeline_version: number; affected_scope: readonly string[]; effect: SemanticIntentCompilation["effect"]; compiled_effect_digest: string }>;
type MaterialEvidencePackAssemblyInput = Readonly<{ pack_id: string; object_version?: number; contract_ref: Readonly<{ object_id: string; object_version: number; digest: string }>; evidence_ids: readonly string[]; coverage_matrix: CoverageMatrix; expected_media_verified_at: Readonly<Record<string, string>>; policy_version: string; timeline_version?: number; created_at?: string; expires_at?: string }>;
export type Stage2ProductActionInput =
  | Readonly<{ action: "contract.approve"; workspace_digest: string; reason: string; contract_id: string }>
  | Readonly<{ action: "direction.select"; workspace_digest: string; reason: string; selected_id: string }>
  | Readonly<{ action: "story.approve"; workspace_digest: string; reason: string; selected_id: string }>
  | Readonly<{ action: "intent.approve"; workspace_digest: string; reason: string; intent_id: string }>
  | Readonly<{ action: "feedback.reject"; workspace_digest: string; reason: string; intent_id: string }>
  | Readonly<{ action: "intent.execute"; workspace_digest: string; reason: string; intent_id: string; proposal_approval_decision_id: string }>;

const STAGE2_PRODUCT_ACTION_KEYS = Object.freeze({
  "contract.approve": ["action", "contract_id", "reason", "workspace_digest"],
  "direction.select": ["action", "reason", "selected_id", "workspace_digest"],
  "story.approve": ["action", "reason", "selected_id", "workspace_digest"],
  "intent.approve": ["action", "intent_id", "reason", "workspace_digest"],
  "feedback.reject": ["action", "intent_id", "reason", "workspace_digest"],
  "intent.execute": ["action", "intent_id", "proposal_approval_decision_id", "reason", "workspace_digest"]
} satisfies Record<Stage2ProductActionInput["action"], readonly string[]>);
const MATERIAL_EVIDENCE_ASSEMBLER_VERSION = "creative-context-v1";
const STAGE2_PRODUCT_EVIDENCE_GENERATOR_VERSION = "stage2-product-evidence-v2";
const STAGE2_PRODUCT_MATERIAL_TEMPLATE_VERSION = "stage2-product-material-v2";
const STAGE2_PRODUCT_DIRECTION_TEMPLATE_VERSION = "stage2-product-direction-v1";
const STAGE2_PRODUCT_STORY_TEMPLATE_VERSION = "stage2-product-story-v2";
const stage2ProductDirectionTemplateRef = (): string => `product-direction-template:${STAGE2_PRODUCT_DIRECTION_TEMPLATE_VERSION}`;
const stage2ProductDirectionTemplateRefs = (value: Readonly<{ provenance?: Readonly<{ input_refs?: readonly string[] }> }>): readonly string[] => (value.provenance?.input_refs ?? []).filter((reference) => reference.startsWith("product-direction-template:"));
const stage2ProductStoryTemplateRef = (): string => `product-story-template:${STAGE2_PRODUCT_STORY_TEMPLATE_VERSION}`;
const stage2ProductStoryTemplateRefs = (value: Readonly<{ provenance?: Readonly<{ input_refs?: readonly string[] }> }>): readonly string[] => (value.provenance?.input_refs ?? []).filter((reference) => reference.startsWith("product-story-template:"));
const stage2ProductMaterialAuthorityRef = (): string => `product-material-authority:${editorialObjectDigest({ evidence_generator_version: STAGE2_PRODUCT_EVIDENCE_GENERATOR_VERSION, assembler_version: MATERIAL_EVIDENCE_ASSEMBLER_VERSION, material_policy_version: CREATIVE_SKILL_POLICY_VERSION, template_version: STAGE2_PRODUCT_MATERIAL_TEMPLATE_VERSION })}`;
const stage2ProductMaterialAuthorityRefs = (pack: MaterialEvidencePackV1): readonly string[] => pack.provenance.input_refs.filter((reference) => reference.startsWith("product-material-authority:"));
const isStage2ProductMaterialPack = (pack: MaterialEvidencePackV1): boolean => stage2ProductMaterialAuthorityRefs(pack).length > 0 || pack.pack_id.startsWith("product-pack-") && pack.evidence_refs.length > 0 && pack.evidence_refs.every((reference) => reference.evidence_id.startsWith("product-scene-"));
const originalLocationAuthorityIdentity = (location: Readonly<{ asset_location_id: string; location_ref: string; verified_at?: string | null }>): string => createHash("sha256").update(`${location.asset_location_id}\0${location.location_ref}\0${location.verified_at ?? ""}`).digest("hex");
const stage2ImmutableOriginalPath = (projectDirectory: string, assetId: string): string => {
  const digest = assetId.match(/^asset:sha256:([0-9a-f]{64})$/)?.[1];
  if (!digest) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_ASSET_INVALID");
  return resolve(projectDirectory, "originals", "sha256", digest.slice(0, 2), digest);
};
const stage2ImmutableOriginalAuthorityRef = (location: PersistedAssetLocation): string => `${STAGE2_IMMUTABLE_ORIGINAL_REF_PREFIX}${editorialObjectDigest({ asset_id: location.asset_id, asset_location_id: location.asset_location_id, location_ref: location.location_ref, source_asset_location_id: location.metadata?.source_asset_location_id, source_location_identity: location.metadata?.source_location_identity, fingerprint: location.metadata?.fingerprint })}`;
const stage2ImmutableOriginalRefs = (pack: MaterialEvidencePackV1): ReadonlySet<string> => new Set(pack.provenance.input_refs.filter((reference) => reference.startsWith(STAGE2_IMMUTABLE_ORIGINAL_REF_PREFIX)));

function stage2ProductExactUnits(value: Readonly<{ value: number; timescale: number }>, targetTimescale: number, errorCode: string): number {
  if (!Number.isSafeInteger(value.value) || value.value <= 0 || !Number.isSafeInteger(value.timescale) || value.timescale <= 0 || !Number.isSafeInteger(targetTimescale) || targetTimescale <= 0) throw new Error(errorCode);
  const numerator = BigInt(value.value) * BigInt(targetTimescale), denominator = BigInt(value.timescale);
  if (numerator % denominator !== 0n) throw new Error(errorCode);
  const units = numerator / denominator;
  if (units <= 0n || units > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(errorCode);
  return Number(units);
}
function stage2ProductExactDurationEqual(left: Readonly<{ value: number; timescale: number }>, right: Readonly<{ value: number; timescale: number }>): boolean {
  return BigInt(left.value) * BigInt(right.timescale) === BigInt(right.value) * BigInt(left.timescale);
}
function exactPositiveDurationSumEquals(values: readonly Readonly<{ value: number; timescale: number }>[], target: Readonly<{ value: number; timescale: number }>): boolean {
  if (!Number.isSafeInteger(target.value) || target.value <= 0 || !Number.isSafeInteger(target.timescale) || target.timescale <= 0) return false;
  let numerator = 0n, denominator = 1n;
  for (const value of values) {
    if (!Number.isSafeInteger(value.value) || value.value <= 0 || !Number.isSafeInteger(value.timescale) || value.timescale <= 0) return false;
    numerator = numerator * BigInt(value.timescale) + BigInt(value.value) * denominator;
    denominator *= BigInt(value.timescale);
  }
  return numerator * BigInt(target.timescale) === BigInt(target.value) * denominator;
}
function stage2ProductEqualDurationBeatIndices(budgets: readonly DurationBeatBudget[]): readonly number[] | null {
  const groups: number[][] = [];
  budgets.forEach((budget, index) => {
    const group = groups.find((candidate) => {
      const first = budgets[candidate[0]!]!;
      return stage2ProductExactDurationEqual(first.duration, budget.duration);
    });
    if (group) group.push(index); else groups.push([index]);
  });
  return groups.find((group) => group.length > 1) ?? null;
}
function stage2ProductDistinctEvidenceOrder<T>(budgets: readonly DurationBeatBudget[], chronologyEvidence: readonly T[]): Readonly<{ evidence: readonly T[]; changed_indices: readonly number[] }> {
  if (budgets.length !== chronologyEvidence.length || new Set(chronologyEvidence.map((item) => String((item as any)?.evidence_id))).size !== chronologyEvidence.length) throw new Error("PRODUCT_GENERATION_DISTINCT_STORY_ALTERNATIVE_UNAVAILABLE");
  const changedIndices = stage2ProductEqualDurationBeatIndices(budgets);
  if (!changedIndices) throw new Error("PRODUCT_GENERATION_DISTINCT_STORY_ALTERNATIVE_UNAVAILABLE");
  const evidence = [...chronologyEvidence];
  changedIndices.forEach((targetIndex, offset) => { evidence[targetIndex] = chronologyEvidence[changedIndices[(offset + 1) % changedIndices.length]!]!; });
  if (evidence.every((item, index) => String((item as any)?.evidence_id) === String((chronologyEvidence[index] as any)?.evidence_id))) throw new Error("PRODUCT_GENERATION_DISTINCT_STORY_ALTERNATIVE_UNAVAILABLE");
  return { evidence, changed_indices: [...changedIndices] };
}

export function parseStage2ProductActionInput(value: unknown): Stage2ProductActionInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("PRODUCT_ACTION_PAYLOAD_INVALID");
  const record = value as Record<string, unknown>;
  const action = record.action;
  if (typeof action !== "string" || !Object.prototype.hasOwnProperty.call(STAGE2_PRODUCT_ACTION_KEYS, action)) throw new Error("PRODUCT_ACTION_UNSUPPORTED");
  assertExactInputKeys(record, STAGE2_PRODUCT_ACTION_KEYS[action as Stage2ProductActionInput["action"]], "stage2_product.action");
  if (Object.values(record).some((item) => typeof item !== "string")) throw new Error("PRODUCT_ACTION_PAYLOAD_INVALID");
  return record as Stage2ProductActionInput;
}

export function stage2ProductActionTargetId(input: Stage2ProductActionInput): string {
  return "selected_id" in input ? input.selected_id : "contract_id" in input ? input.contract_id : input.intent_id;
}

export type Stage2ProductContractDraftInput = Readonly<{
  workspace_digest: string;
  creator_goal: string;
  audience: readonly string[];
  platforms: readonly string[];
  target_duration_seconds: number;
  requirements: readonly string[];
  desired_traits: readonly string[];
  forbidden_misrepresentation: readonly string[];
  privacy_policy_ref: Readonly<{ object_id: string; object_version: number; digest: string }>;
  rights_policy_ref: Readonly<{ object_id: string; object_version: number; digest: string }>;
  protected_refs: readonly string[];
  allowed_transformations: readonly string[];
  forbidden_outcomes: readonly string[];
}>;

export type Stage2ProductRenderInput = Readonly<{ workspace_digest: string; execution_id: string }>;
export type Stage2ProductGenerationInput =
  | Readonly<{ stage: "material"; workspace_digest: string; reason: string; target: Readonly<{ track_id: string; clip_id: string }>; evidence_statements: readonly string[] }>
  | Readonly<{ stage: "story" | "intent"; workspace_digest: string; reason: string }>;
export type Stage2ProductGenerationApprovalReview = Readonly<{ action: "material_permission.record" | "evidence.approve"; subject_ref: Stage2PermissionTypedRef; context_refs: readonly Stage2PermissionTypedRef[]; requested_data_fields: readonly string[]; affected_scope: readonly string[]; effect_digest: string; reason: string }>;
export type Stage2ProductGenerationReview = Readonly<{ schema_version: 1; stage: Stage2ProductGenerationInput["stage"]; workspace_digest: string; effect_digest: string; approval_bundle: readonly Stage2ProductGenerationApprovalReview[]; summary: readonly string[] }>;

const STAGE2_PRODUCT_GENERATION_KEYS = Object.freeze({
  material: ["evidence_statements", "reason", "stage", "target", "workspace_digest"],
  story: ["reason", "stage", "workspace_digest"],
  intent: ["reason", "stage", "workspace_digest"],
} satisfies Record<Stage2ProductGenerationInput["stage"], readonly string[]>);

export function parseStage2ProductGenerationInput(value: unknown): Stage2ProductGenerationInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("PRODUCT_GENERATION_PAYLOAD_INVALID");
  const record = value as Record<string, unknown>, stage = record.stage;
  if (typeof stage !== "string" || !Object.prototype.hasOwnProperty.call(STAGE2_PRODUCT_GENERATION_KEYS, stage)) throw new Error("PRODUCT_GENERATION_STAGE_UNSUPPORTED");
  assertExactInputKeys(record, STAGE2_PRODUCT_GENERATION_KEYS[stage as Stage2ProductGenerationInput["stage"]], "stage2_product.generate");
  if (typeof record.workspace_digest !== "string" || !/^[a-f0-9]{64}$/.test(record.workspace_digest) || typeof record.reason !== "string" || !record.reason.trim() || record.reason !== record.reason.trim()) throw new Error("PRODUCT_GENERATION_PAYLOAD_INVALID");
  if (stage === "material") {
    assertExactInputKeys(record.target, ["clip_id", "track_id"], "stage2_product.generate.target");
    const target = record.target as Record<string, unknown>;
    if (typeof target.track_id !== "string" || !target.track_id.trim() || typeof target.clip_id !== "string" || !target.clip_id.trim() || !Array.isArray(record.evidence_statements) || record.evidence_statements.length === 0 || record.evidence_statements.some((item) => typeof item !== "string" || !item.trim() || item !== item.trim()) || new Set(record.evidence_statements).size !== record.evidence_statements.length) throw new Error("PRODUCT_GENERATION_MATERIAL_INPUT_INVALID");
  }
  return record as Stage2ProductGenerationInput;
}
type DeepReadonly<T> = T extends (...args: never[]) => unknown ? T : T extends readonly (infer Item)[] ? readonly DeepReadonly<Item>[] : T extends object ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> } : T;
type GeneratedPresetApplicationRecord = DeepReadonly<PresetApplicationRecordV1>;
type GeneratedPresetRenderValidation = NonNullable<GeneratedPresetApplicationRecord["render_validation"]>;
export type PresetRenderValidation = GeneratedPresetRenderValidation & Readonly<Required<Pick<GeneratedPresetRenderValidation, "source_identity_hash" | "preview_plan_id" | "master_plan_id" | "preview_cache_key" | "master_cache_key">>>;
export type PresetApplicationRecord = Omit<GeneratedPresetApplicationRecord, "render_validation"> & Readonly<{ render_validation?: PresetRenderValidation }>;
export type PresetApplicationContext = PresetApplicationRecord["application_context"];
export type PresetSemanticLink = PresetRenderValidation["semantic_links"][number];
type PresetApplicationRenderLink = Readonly<{
  schema_version: 1;
  application_id: string;
  timeline_version: number;
  semantic_graph_hash: string;
  candidate_source_identity_hash: string;
  actual_source_identity_hash: string;
  candidate_preview_plan_id: string;
  candidate_master_plan_id: string;
  actual_preview_plan_id: string;
  actual_master_plan_id: string;
  actual_preview_cache_key: string;
  actual_master_cache_key: string;
  verified_semantic_links: number;
}>;

type PersistedAssetLocation = Readonly<{
  asset_location_id: string;
  asset_id: string;
  location_type: string;
  location_ref: string;
  verified_at?: string | null;
  metadata?: Readonly<{
    permission_state?: "authorized" | "denied" | "unknown" | "unavailable";
    permission_decision?: Readonly<{ permission_state: "authorized" | "denied" | "unknown" | "unavailable"; actor_id: string; decided_at: string; policy_ref: Readonly<{ object_id: string; object_version: number; digest: string }> }>;
    verification_status?: string;
    source_asset_id?: string;
    fingerprint?: Readonly<{ algorithm?: string; digest?: string; byte_length?: number }>;
    file_stat?: Readonly<{ size?: number; mtime_ms?: number }>;
    probe?: unknown;
    proxy_map?: unknown;
    immutable_content?: boolean;
    source_asset_location_id?: string;
    source_location_identity?: string;
  }>;
}>;
const IDEMPOTENT_WORKER_TASKS = new Set(["analysis.v1", "media.probe.v1", "media.decode_check.v1", "media.fingerprint.v1", "media.proxy.v1", "media.proxy.map.v1", "media.thumbnail.v1", "media.waveform.v1", "render.timeline.v1", "qc.master.v1"]);
const CREATIVE_CONTEXT_IDENTITY_CONCURRENCY = 2;
const HOST_SEMANTIC_CAPABILITIES = new Set(["semantic-evidence-selection"]);
const STAGE2_IMMUTABLE_ORIGINAL_REF_PREFIX = "stage2-immutable-original:";
const STAGE2_IMMUTABLE_ORIGINAL_FILE_MODE = 0o400;
const STAGE2_IMMUTABLE_ORIGINAL_CLEANUP_MODE = 0o600;

type Stage2ImmutableFileIdentity = Readonly<{ dev: bigint; ino: bigint }>;
type Stage2ImmutableFileSnapshot = Readonly<{ identity: Stage2ImmutableFileIdentity; size: bigint; mtime_ns: bigint }>;
type PreparedImmutableOriginal = Readonly<{ location: PersistedAssetLocation; created_path: boolean; file_handle: FileHandle; file_identity: Stage2ImmutableFileIdentity; file_snapshot: Stage2ImmutableFileSnapshot; restore_mode_on_failure?: number }>;
const stage2ImmutableFileIdentity = (entry: Pick<BigIntStats, "dev" | "ino">): Stage2ImmutableFileIdentity => ({ dev: entry.dev, ino: entry.ino });
const stage2ImmutableFileIdentityMatches = (left: Stage2ImmutableFileIdentity, right: Stage2ImmutableFileIdentity): boolean => left.ino > 0n && right.ino > 0n && left.ino === right.ino && (process.platform === "win32" || left.dev === right.dev);
const stage2ImmutableFileSnapshot = (entry: Pick<BigIntStats, "dev" | "ino" | "size" | "mtimeNs">): Stage2ImmutableFileSnapshot => ({ identity: stage2ImmutableFileIdentity(entry), size: entry.size, mtime_ns: entry.mtimeNs });
const stage2ImmutableFileSnapshotMatches = (left: Stage2ImmutableFileSnapshot, right: Stage2ImmutableFileSnapshot): boolean => stage2ImmutableFileIdentityMatches(left.identity, right.identity) && left.size === right.size && left.mtime_ns === right.mtime_ns;
const stage2ImmutableFileModeIsCurrent = (entry: Pick<BigIntStats, "mode">): boolean => process.platform === "win32" ? (entry.mode & 0o222n) === 0n : (entry.mode & 0o777n) === BigInt(STAGE2_IMMUTABLE_ORIGINAL_FILE_MODE);

type MediaFingerprintOutput = Readonly<{ kind: "media.fingerprint"; algorithm: "sha256"; digest: string; byte_length: number }>;
type MediaProbeOutput = Readonly<{ kind: "media.probe"; value: unknown }>;
type WorkerResult<Output> = Readonly<{ status?: string; outputs?: readonly Output[]; diagnostics?: readonly Readonly<{ code?: string; message?: string }>[] }>;
export type VerifiedMediaCandidate = Readonly<{ asset_id: AssetId; fingerprint: ContentFingerprint; path: string; verified_at: string; file_stat: Readonly<{ size: number; mtime_ms: number }>; probe: unknown }>;
export type AtomicEditArtifact = Readonly<{ object_ref_id: string; object_type: string; version?: number; relation_key?: string; value: unknown; metadata?: Readonly<Record<string, unknown>> }>;
type PreparedEdit = Readonly<{ ir: CommandEditIR; timeline: Timeline; plan: ReturnType<typeof createCommitPlan>["plan"] }>;
type PreparedEditorialIntentExecution = Readonly<{ review: EditorialIntentExecutionReview; compilation: SemanticIntentCompilation; prepared: PreparedEdit; proposal_approval: any; source_refs: readonly RenderSourceRef[]; preview_plan_id: string; master_plan_id: string }>;

function versionedRefMatches(left: any, right: any): boolean {
  return Boolean(left && right && left.object_id === right.object_id && left.object_version === right.object_version && left.digest === right.digest);
}

function resolveStage2ProductDurationBlueprint(targetDuration: CreativeContractV2["target_duration"]): (typeof builtInDurationBlueprints)[number] {
  if (!Number.isSafeInteger(targetDuration?.value) || targetDuration.value < 1 || !Number.isSafeInteger(targetDuration?.timescale) || targetDuration.timescale < 1) throw new Error("PRODUCT_CONTRACT_TARGET_DURATION_UNSUPPORTED_OR_AMBIGUOUS");
  const targetValue = BigInt(targetDuration.value), targetTimescale = BigInt(targetDuration.timescale);
  const candidates = builtInDurationBlueprints.filter((candidate) => candidate.status === "published" && candidate.governance.trust_status === "trusted" && BigInt(candidate.target_duration.value) * targetTimescale === targetValue * BigInt(candidate.target_duration.timescale));
  if (candidates.length !== 1) throw new Error("PRODUCT_CONTRACT_TARGET_DURATION_UNSUPPORTED_OR_AMBIGUOUS");
  return candidates[0]!;
}

function timelineDigest(timeline: Timeline): string {
  return createHash("sha256").update(canonicalSerialize(timeline)).digest("hex");
}

function timelineSourceRangeContract(source: Readonly<{ asset_id: string; start_pts: bigint; end_pts: bigint; timescale: bigint }>): FeedbackRevisionDiagnosisInput["target"]["original_source"] {
  const values = [source.start_pts, source.end_pts, source.timescale];
  if (values.some((value) => value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) || source.timescale < 1n) throw new Error("FEEDBACK_SOURCE_RANGE_NOT_CONTRACT_SAFE");
  return { asset_id: source.asset_id, start: { schema_version: 1, value: Number(source.start_pts), timescale: Number(source.timescale) }, end: { schema_version: 1, value: Number(source.end_pts), timescale: Number(source.timescale) } };
}


function assertExactInputKeys(value: unknown, expectedKeys: readonly string[], label: string): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`PERMISSION_INPUT_INVALID:${label}`);
  const actual = Object.keys(value as Record<string, unknown>).sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw new Error(`PERMISSION_INPUT_EXTRA_OR_MISSING_FIELD:${label}`);
}

const STAGE2_EXECUTION_AUTHORITY_KEYS = new Set([
  "argv", "backend", "command", "commands", "command_edit_ir", "commit_plan", "executable", "execution_plan",
  "ffmpeg_args", "model_sdk", "render_graph", "rendergraph", "shell", "timeline_command", "timeline_commands", "worker_task"
]);

function assertNoStage2ExecutionAuthority(value: unknown, seen = new Set<unknown>()): void {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) throw new Error("PERMISSION_EXECUTION_PAYLOAD_CYCLIC");
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) assertNoStage2ExecutionAuthority(item, seen);
  } else {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const normalized = key.trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (STAGE2_EXECUTION_AUTHORITY_KEYS.has(normalized)) throw new Error(`PERMISSION_EXECUTION_FIELD_FORBIDDEN:${key}`);
      assertNoStage2ExecutionAuthority(item, seen);
    }
  }
  seen.delete(value);
}

function persistedLocationIsCurrent(location: PersistedAssetLocation): boolean {
  const digest = location.asset_id.match(/^asset:sha256:([0-9a-f]{64})$/)?.[1];
  const fingerprint = location.metadata?.fingerprint;
  const storedStat = location.metadata?.file_stat;
  const identityMatches = location.location_type === "proxy" ? location.metadata?.source_asset_id === location.asset_id && /^[0-9a-f]{64}$/.test(fingerprint?.digest ?? "") : fingerprint?.digest === digest;
  if (!digest || !location.verified_at || location.metadata?.verification_status !== "verified" || fingerprint?.algorithm !== "sha256" || !identityMatches || !Number.isSafeInteger(fingerprint.byte_length) || !Number.isSafeInteger(storedStat?.size) || typeof storedStat?.mtime_ms !== "number") return false;
  try {
    const current = statSync(location.location_ref);
    return current.isFile() && current.size === fingerprint.byte_length && current.size === storedStat.size && current.mtimeMs === storedStat.mtime_ms;
  } catch { return false; }
}

function persistedProbeAudioState(location: PersistedAssetLocation): boolean | undefined {
  const probe = location.metadata?.probe as { streams?: readonly Readonly<{ codec_type?: string }>[]; timing?: { streams?: Record<string, Readonly<{ codec_type?: string }>> } } | undefined;
  const streams = probe?.streams ?? Object.values(probe?.timing?.streams ?? {});
  if (!probe || streams.length === 0) return undefined;
  return streams.some((stream) => stream.codec_type === "audio");
}

function probeVideoGeometry(probe: unknown): Readonly<{ width: number; height: number }> | undefined {
  const streams = (probe as { streams?: readonly Readonly<{ codec_type?: string; width?: unknown; height?: unknown }>[] } | undefined)?.streams;
  const video = streams?.find((stream) => stream.codec_type === "video");
  if (typeof video?.width !== "number" || typeof video.height !== "number" || !Number.isSafeInteger(video.width) || !Number.isSafeInteger(video.height) || video.width <= 0 || video.height <= 0) return undefined;
  return { width: video.width, height: video.height };
}

function revive(value: unknown): unknown {
  if (typeof value === "string" && /^-?\d+n$/.test(value)) return BigInt(value.slice(0, -1));
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, revive(item)]));
  return value;
}

function reviveProxyMap(value: any): any {
  const integer = (item: bigint | number | string): bigint => typeof item === "string" && item.endsWith("n") ? BigInt(item.slice(0, -1)) : BigInt(item);
  const time = (point: any) => ({ value: integer(point.value), timescale: integer(point.timescale) });
  return { schema_version: 1, original_timebase: integer(value.original_timebase), proxy_timebase: integer(value.proxy_timebase), segments: (value.segments ?? []).map((segment: any) => ({ original_start: time(segment.original_start), original_end: time(segment.original_end), proxy_start: time(segment.proxy_start), proxy_end: time(segment.proxy_end) })), ...(value.audio ? { audio: { original_sample_rate: integer(value.audio.original_sample_rate), proxy_sample_rate: integer(value.audio.proxy_sample_rate) } } : {}) };
}

function resolveTimelineRenderPlans(timeline: Timeline, sources: ReadonlyMap<string, RenderSourceRef>, profile: RenderProfile, range?: RenderRange): Readonly<{ previewGraph: ReturnType<typeof buildTimelineRenderGraph>; masterGraph: ReturnType<typeof buildTimelineRenderGraph>; previewPlan: ExecutionPlan; masterPlan: ExecutionPlan }> {
  const build = (target: "preview" | "master") => {
    const graph = buildTimelineRenderGraph(timeline, sources, target, profile, range);
    const issues = validateGraph(graph, timelineRenderCapabilities, target).filter((issue) => issue.code !== "UNSUPPORTED_CAPABILITY");
    if (issues.length) throw new Error(`RENDER_GRAPH_INVALID:${issues.map((issue) => issue.code).join(",")}`);
    return graph;
  };
  const previewGraph = build("preview"), masterGraph = build("master");
  return { previewGraph, masterGraph, previewPlan: resolveExecutionPlan(previewGraph, "preview"), masterPlan: resolveExecutionPlan(masterGraph, "master") };
}

function renderSourceIdentityHash(sources: Iterable<RenderSourceRef>): string {
  const identity = [...sources].sort((left, right) => left.asset_ref.localeCompare(right.asset_ref)).map((source) => ({ asset_ref: source.asset_ref, original_object_ref: source.original_object_ref ?? null, proxy_object_ref: source.proxy_object_ref ?? null, source_timescale: source.source_timescale, original_timescale: source.original_timescale ?? null, proxy_timescale: source.proxy_timescale ?? null, proxy_map: source.proxy_map ?? null, has_audio: source.has_audio ?? null }));
  return presetDigest(identity);
}

function editorialRenderSourceIdentity(sources: Iterable<RenderSourceRef>): readonly unknown[] {
  return [...sources].sort((left, right) => left.asset_ref.localeCompare(right.asset_ref)).map((source) => ({ asset_ref: source.asset_ref, original_ref: source.original_ref ?? null, original_object_ref: source.original_object_ref ?? null, source_timescale: source.source_timescale.toString(), original_timescale: source.original_timescale?.toString() ?? null, original_width: source.original_width ?? null, original_height: source.original_height ?? null, has_audio: source.has_audio ?? null }));
}

function editorialExecutionRenderProfile(timeline: Timeline, sources: readonly RenderSourceRef[]): RenderProfile {
  const sourceByAsset = new Map(sources.map((source) => [source.asset_ref, source]));
  const videoAssetIds = [...new Set(timeline.tracks.filter((track) => track.kind === "video" && track.enabled !== false).flatMap((track) => track.clips.map((clip) => clip.source.asset_id)))].sort();
  if (videoAssetIds.length === 0) return { name: "semantic-intent-preflight" };
  const geometries = new Map<string, Readonly<{ width: number; height: number }>>();
  for (const assetId of videoAssetIds) {
    const source = sourceByAsset.get(assetId), width = source?.original_width, height = source?.original_height;
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || Number(width) < 1 || Number(height) < 1) throw new Error(`SEMANTIC_RENDER_PROFILE_GEOMETRY_UNAVAILABLE:${assetId}`);
    geometries.set(`${width}x${height}`, { width: Number(width), height: Number(height) });
  }
  if (geometries.size !== 1) throw new Error(`SEMANTIC_RENDER_PROFILE_GEOMETRY_AMBIGUOUS:${[...geometries.keys()].sort().join(",")}`);
  const geometry = [...geometries.values()][0]!;
  return { name: "semantic-intent-preflight", width: geometry.width, height: geometry.height };
}

function plannedBoundaryFadeIntervals(timeline: Timeline): readonly Readonly<{ start: Readonly<{ value: string; timescale: string }>; end: Readonly<{ value: string; timescale: string }> }>[] {
  const activeClips = timeline.tracks.filter((track) => track.enabled !== false && track.kind === "video").flatMap((track) => track.clips);
  const tickValue = timeline.sequence?.timebase?.value ?? 1n;
  const timelineTimescale = timeline.sequence?.timebase?.timescale ?? activeClips[0]?.source.timescale ?? 1n;
  const time = (value: bigint, timescale: bigint): Readonly<{ value: string; timescale: string }> => ({ value: `${value}n`, timescale: `${timescale}n` });
  const add = (left: Readonly<{ value: bigint; timescale: bigint }>, right: Readonly<{ value: bigint; timescale: bigint }>, direction: 1n | -1n = 1n): Readonly<{ value: bigint; timescale: bigint }> => ({ value: left.value * right.timescale + direction * right.value * left.timescale, timescale: left.timescale * right.timescale });
  return activeClips.flatMap((clip) => {
    const intervals: Array<Readonly<{ start: Readonly<{ value: string; timescale: string }>; end: Readonly<{ value: string; timescale: string }> }>> = [];
    const start = { value: clip.timeline_start * tickValue, timescale: timelineTimescale };
    const end = { value: (clip.timeline_start + clip.timeline_duration) * tickValue, timescale: timelineTimescale };
    if (clip.boundary_fades?.video_fade_in) { const intervalEnd = add(start, clip.boundary_fades.video_fade_in); intervals.push({ start: time(start.value, start.timescale), end: time(intervalEnd.value, intervalEnd.timescale) }); }
    if (clip.boundary_fades?.video_fade_out) { const intervalStart = add(end, clip.boundary_fades.video_fade_out, -1n); intervals.push({ start: time(intervalStart.value, intervalStart.timescale), end: time(end.value, end.timescale) }); }
    return intervals;
  });
}

export class ProjectHostSession {
  private session: { manifest: { project_id: string }; db: { prepare(sql: string): { get(): unknown } }; close(): Promise<void> } | undefined;
  private currentStatus: ProjectHostStatus = { project: "not-open", timeline: "no-version", render: "idle", qc: "not-run" };
  private projectDirectory: string | undefined;
  private jobEngine: JobEngine | undefined;
  private readonly workerPort = createLocalWorkerJobPort();
  private readonly modelProvider: ModelProvider | undefined;
  private readonly modelName: string;
  private readonly modelProviderName: string;
  private readonly presetRegistry = createBuiltInPresetRegistry();
  private readonly trustedPresetDigests: ReadonlySet<string>;
  private readonly revokedPresetDigests: ReadonlySet<string>;
  private readonly presetLicenseStatuses: ReadonlyMap<string, "unknown" | "pending" | "approved" | "expired" | "revoked">;
  private readonly stage2HumanReviewChannels = new WeakMap<object, string>();
  private readonly now: () => number;
  private creativeContextIdentityActive = 0;
  private readonly creativeContextIdentityWaiters: Array<() => void> = [];
  private readonly immutableOriginalMutationTails = new Map<string, Promise<void>>();
  private closing = false;
  private closeOperation: Promise<void> | undefined;

  constructor(options: ProjectHostOptions = {}) {
    this.modelProvider = options.modelProvider;
    this.modelName = options.model ?? "qwen-plus";
    this.modelProviderName = options.provider ?? "qwen";
    for (const definition of options.presetDefinitions ?? []) { assertPresetDefinitionV1(definition); this.presetRegistry.register(definition); }
    this.trustedPresetDigests = new Set(options.trustedPresetDigests ?? []);
    this.revokedPresetDigests = new Set(options.revokedPresetDigests ?? []);
    this.presetLicenseStatuses = new Map(Object.entries({ "ave-built-in": "approved" as const, ...(options.presetLicenseStatuses ?? {}) }));
    this.now = options.now ?? Date.now;
    for (const channel of options.stage2HumanReviewChannels ?? []) { if (!channel.credential || typeof channel.credential !== "object" || !channel.actor_id.trim()) throw new Error("Stage 2 human review channel is invalid"); this.stage2HumanReviewChannels.set(channel.credential, channel.actor_id); }
  }

  private configureJobEngine(session: { manifest: { project_id: string }; db: any }): void {
    const projectId = session.manifest.project_id;
    const store: JobStore = {
      create: (record) => createPersistentJob(session, projectId, record) as any,
      read: (jobId) => readPersistentJob(session, jobId) as any,
      findByIdempotency: (key) => readPersistentJobByIdempotency(session, projectId, key) as any,
      start: (jobId) => startPersistentJob(session, jobId) as any,
      progress: (jobId, value) => updatePersistentJobProgress(session, jobId, value),
      finish: (jobId, result) => finishPersistentJob(session, jobId, result) as any,
      recover: () => recoverPersistentJobs(session, projectId) as any,
    };
    this.jobEngine = new JobEngine(store);
    this.jobEngine.recover();
  }

  private persistentWorkerPort(): WorkerJobPort {
    return { submit: (taskType, input, control) => this.submitWorkerJob(taskType, input, control) };
  }

  private async submitWorkerJob<TInput, TResult>(taskType: string, input: TInput, control?: { jobId?: string; signal?: AbortSignal; timeoutMs?: number; onProgress?: (value: number) => void }, idempotencyKeyOverride?: string): Promise<TResult> {
    const idempotent = IDEMPOTENT_WORKER_TASKS.has(taskType);
    if (!this.jobEngine) return this.workerPort.submit<TInput, TResult>(taskType, input, { ...control, idempotent });
    const idempotencyKey = idempotencyKeyOverride ?? `${taskType}:${hashJobInput(input)}`;
    const execution = await this.jobEngine.execute(taskType, input, idempotencyKey, ({ job_id, signal, progress }) => this.workerPort.submit<TInput, any>(taskType, input, { ...control, jobId: job_id, signal, onProgress: progress, idempotent }) as any, { jobId: control?.jobId, signal: control?.signal, idempotent });
    let result: any = execution.result;
    if (taskType === "render.timeline.v1" && execution.reused && !result?.metrics) {
      const fresh = await this.workerPort.submit<TInput, any>(taskType, input, { ...control, idempotent });
      if (!fresh?.status || fresh.status === "succeeded") {
        if (!Array.isArray(result?.outputs) || !Array.isArray(fresh?.outputs) || canonicalSerialize(result.outputs) !== canonicalSerialize(fresh.outputs)) throw new Error("RENDER_JOB_REPLAY_MISMATCH");
      }
      result = fresh;
    }
    if (result?.status && result.status !== "succeeded") { const diagnostic = result.diagnostics?.[0]; throw new Error(`${diagnostic?.code ?? "WORKER_JOB_FAILED"}:${diagnostic?.message ?? result.status}`); }
    return result as TResult;
  }

  async open(projectDirectory: string, options: Readonly<{ deferJobRecovery?: boolean }> = {}): Promise<ProjectHostStatus> {
    if (this.session) await this.close();
    const session = await openProject(projectDirectory);
    this.session = session;
    this.projectDirectory = projectDirectory;
    if (!options.deferJobRecovery) this.configureJobEngine(session);
    const latest = readLatestTimeline(session, session.manifest.project_id);
    const version = latest ? (JSON.parse(latest) as { version?: number }).version : undefined;
    const latestRender = readLatestRender(session, session.manifest.project_id) as { qc_status?: string } | undefined;
    this.currentStatus = { project: session.manifest.project_id, timeline: version === undefined ? "no-version" : `v${version}`, render: latestRender ? "available" : "idle", qc: latestRender?.qc_status ?? "not-run" };
    return this.currentStatus;
  }

  recoverOpenJobs(): void {
    if (!this.session) throw new Error("project is not open");
    if (!this.jobEngine) this.configureJobEngine(this.session);
  }

  async create(projectDirectory: string): Promise<ProjectHostStatus> {
    if (this.session) await this.close();
    const session = await createProject(projectDirectory);
    this.session = session;
    this.projectDirectory = projectDirectory;
    this.configureJobEngine(session);
    this.currentStatus = { project: session.manifest.project_id, timeline: "no-version", render: "idle", qc: "not-run" };
    return this.currentStatus;
  }

  async close(): Promise<void> {
    if (this.closeOperation) return this.closeOperation;
    const session = this.session;
    if (!session) return;
    this.closing = true;
    const operation = (async () => {
      await Promise.all([...this.immutableOriginalMutationTails.values()].map((tail) => tail.catch(() => undefined)));
      try { await this.workerPort.close?.(); }
      finally { await session.close(); }
    })();
    this.closeOperation = operation;
    try { await operation; }
    finally {
      if (this.session === session) {
        this.session = undefined;
        this.projectDirectory = undefined;
        this.jobEngine = undefined;
        this.currentStatus = { project: "not-open", timeline: "no-version", render: "idle", qc: "not-run" };
      }
      this.closing = false;
      this.closeOperation = undefined;
    }
  }

  status(): ProjectHostStatus {
    return this.currentStatus;
  }

  readTimelineSnapshot(): unknown {
    if (!this.session) return null;
    const raw = readLatestTimeline(this.session, this.session.manifest.project_id);
    return raw ? revive(JSON.parse(raw)) : null;
  }

  readTimelineDiff(): unknown {
    if (!this.session) return null;
    const current = this.readTimelineSnapshot() as any;
    if (!current) return null;
    if (current.version === 0) return { from_version: null, to_version: 0, added_clip_ids: [], removed_clip_ids: [], changed_clip_ids: [] };
    const previousRaw = readTimelineAtVersion(this.session, this.session.manifest.project_id, current.version - 1);
    if (!previousRaw) throw new Error("timeline previous version unavailable");
    const previous = revive(JSON.parse(previousRaw)) as any;
    const clips = (timeline: any) => new Map((timeline.tracks ?? []).flatMap((track: any) => (track.clips ?? []).map((clip: any) => [clip.clip_id, JSON.stringify(clip, (_, value) => typeof value === "bigint" ? `${value}n` : value)])));
    const before = clips(previous); const after = clips(current);
    return { from_version: previous.version, to_version: current.version, added_clip_ids: [...after.keys()].filter((id) => !before.has(id)), removed_clip_ids: [...before.keys()].filter((id) => !after.has(id)), changed_clip_ids: [...after.keys()].filter((id) => before.has(id) && before.get(id) !== after.get(id)) };
  }

  async readLatestPreview(): Promise<unknown> {
    if (!this.session) return null;
    const latest = readLatestRender(this.session, this.session.manifest.project_id) as { preview_path?: string } | undefined;
    if (!latest?.preview_path) return null;
    const bytes = await readFile(latest.preview_path);
    return { mime: "video/mp4", bytes: Uint8Array.from(bytes) };
  }

  async readCurrentStage2Preview(workspaceDigest: string): Promise<unknown> {
    if (!this.session) return null;
    const before = await this.readStage2Workspace() as any;
    if (before.workspace_digest !== workspaceDigest) throw new Error("PRODUCT_WORKSPACE_STALE");
    if (before.review?.render?.binding_status !== "current") throw new Error("PRODUCT_PREVIEW_STALE");
    const latest = readLatestRender(this.session, this.session.manifest.project_id) as { render_id?: string; preview_path?: string } | undefined;
    if (!latest?.preview_path || latest.render_id !== before.review.render.render_id || Number(before.review.render.timeline_version) !== Number(before.timeline?.version)) throw new Error("PRODUCT_PREVIEW_BINDING_MISMATCH");
    const expected = before.review.render_results.find((item: any) => item.render_id === latest.render_id && item.target === "preview" && Number(item.timeline_version) === Number(before.review.render.timeline_version));
    if (!expected || typeof expected.output_hash !== "string" || !/^[a-f0-9]{64}$/.test(expected.output_hash)) throw new Error("PRODUCT_PREVIEW_BINDING_MISMATCH");
    const bytes = await readFile(latest.preview_path);
    if (createHash("sha256").update(bytes).digest("hex") !== expected.output_hash) throw new Error("PRODUCT_PREVIEW_HASH_MISMATCH");
    const after = await this.readStage2Workspace() as any;
    const afterExpected = after.review?.render_results?.find((item: any) => item.render_id === latest.render_id && item.target === "preview" && Number(item.timeline_version) === Number(after.review?.render?.timeline_version));
    if (after.workspace_digest !== workspaceDigest || after.review?.render?.binding_status !== "current" || after.review.render.render_id !== latest.render_id || afterExpected?.output_hash !== expected.output_hash) throw new Error("PRODUCT_WORKSPACE_STALE");
    return { mime: "video/mp4", bytes: Uint8Array.from(bytes), workspace_digest: workspaceDigest, render_id: latest.render_id, timeline_version: Number(after.review.render.timeline_version), execution_id: after.review.render.bound_execution_id };
  }

  listJobs(): readonly unknown[] { return this.session ? listPersistentJobs(this.session, this.session.manifest.project_id) : []; }

  listMedia(): readonly unknown[] { return this.session ? listAssetLocations(this.session, this.session.manifest.project_id) : []; }

  latestRender(): unknown { return this.session ? readLatestRender(this.session, this.session.manifest.project_id) : null; }
  listQcIssues(): readonly unknown[] { const render = this.latestRender() as { qc_report_json?: string } | null; if (!render?.qc_report_json) return []; const report = JSON.parse(render.qc_report_json) as { issues?: readonly unknown[] }; return report.issues ?? []; }
  listRenderResults(): readonly unknown[] { return this.session ? listRenderResults(this.session, this.session.manifest.project_id) : []; }
  listReviewArtifacts(): readonly unknown[] { return this.session ? listReviewArtifacts(this.session, this.session.manifest.project_id) : []; }
  listRenderManifests(): readonly unknown[] { return this.session ? listRenderManifests(this.session, this.session.manifest.project_id) : []; }
  listDeliveryRecords(): readonly unknown[] { return this.session ? listDeliveryRecords(this.session, this.session.manifest.project_id) : []; }
  listExports(): readonly unknown[] { return this.session ? listExports(this.session, this.session.manifest.project_id) : []; }
  listModelRuns(): readonly unknown[] { return this.session ? listModelRuns(this.session, this.session.manifest.project_id) : []; }
  listPresetApplications(): readonly unknown[] { return this.session ? listPresetApplications(this.session, this.session.manifest.project_id) : []; }
  listMediaDependencies(): readonly unknown[] { return this.session ? listMediaDependencies(this.session, this.session.manifest.project_id) : []; }
  async readStage2Workspace(): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const workspaceRevision = this.stage2PersistenceRevision();
    const raw = readStage2WorkspaceSnapshot(this.session, this.session.manifest.project_id) as any;
    if (raw.contracts.length > 1) throw new Error("PRODUCT_CONTRACT_AUTHORITY_AMBIGUOUS");
    const timeline = raw.timeline_json ? revive(JSON.parse(raw.timeline_json)) as any : null;
    const reference = (row: any, id: string, status = row?.lifecycle_status ?? row?.value?.status ?? "available") => ({ object_id: id, object_version: Number(row?.value?.object_version ?? 1), digest: row?.object_hash ?? "", status, stale_reasons: Array.isArray(row?.stale_reasons) ? [...row.stale_reasons] : [] });
    const contractCards = raw.contracts.map((row: any) => ({
      ...reference(row, row.value.contract_id),
      creator_goal: row.value.creator_goal,
      audience: [...row.value.audience],
      platforms: [...row.value.platforms],
      target_duration: { ...row.value.target_duration },
      requirements: row.value.requirements.map((item: any) => ({ requirement_id: item.requirement_id, kind: item.kind, statement: item.statement, priority: item.priority })),
      desired_traits: [...row.value.voice_and_identity.desired_traits],
      forbidden_misrepresentation: [...row.value.voice_and_identity.forbidden_misrepresentation],
      privacy_policy_ref: { ...row.value.privacy_policy_ref },
      rights_policy_ref: { ...row.value.rights_policy_ref },
      protected_refs: [...row.value.protected_refs],
      allowed_transformations: [...row.value.allowed_transformations],
      forbidden_outcomes: [...row.value.forbidden_outcomes],
      unresolved_assumptions: [...row.value.provenance.unresolved_assumptions],
    }));
    const currentContract = [...contractCards].sort((left, right) => right.object_version - left.object_version)[0] ?? null;
    const matchesContract = (value: any) => !currentContract || !value?.contract_ref || (value.contract_ref.object_id === currentContract.object_id && value.contract_ref.object_version === currentContract.object_version && value.contract_ref.digest === currentContract.digest);
    const evidenceCards = raw.evidence.map((row: any) => ({
      ...reference(row, row.value.evidence_id, row.value.review_status),
      evidence_type: row.value.analysis_type,
      asset_id: row.value.asset_id,
      range: { start_pts: row.value.start_pts, end_pts: row.value.end_pts, timescale: row.value.timescale },
      content: row.value.analysis_type === "scene" ? row.value.label : row.value.text,
      review: row.value.review ? { actor_id: row.value.review.actor_id, approved_at: row.value.review.approved_at, reason: row.value.review.reason } : null,
    }));
    const identityCache = new Map<string, Promise<boolean>>();
    const materialRows = await Promise.all(raw.material_packs.map((row: any) => this.materialEvidencePackView(row, identityCache))) as any[];
    const materialCards = materialRows.filter((row: any) => matchesContract(row.value)).map((row: any) => ({
      ...reference(row, row.value.pack_id),
      contract_ref: { ...row.value.contract_ref },
      evidence_count: row.value.evidence_refs.length,
      covered_requirement_ids: [...row.value.sufficiency.covered_requirement_ids],
      missing_requirement_ids: [...row.value.sufficiency.missing_requirement_ids],
      conflicting_requirement_ids: [...row.value.sufficiency.conflicting_requirement_ids],
      availability: row.value.availability.map((item: any) => ({ asset_id: item.asset_id, permission_state: item.permission_state, verified_at: item.verified_at })),
    }));
    const artifactCards = Object.fromEntries(await Promise.all(Object.entries(raw.artifacts).map(async ([kind, rows]) => [kind, await Promise.all((rows as any[]).filter((row) => matchesContract(row.value)).map(async (row) => {
      const dynamicRow = kind === "editorial_edit_intent" && row.value?.feedback_diagnosis_ref ? row : await this.editorialArtifactView(row, kind, identityCache);
      const value = dynamicRow.value, id = value.direction_id ?? value.proposal_id ?? value.plan_id ?? value.decision_id ?? value.intent_id ?? value.snapshot_id;
      const feedbackRejected = kind === "editorial_edit_intent" && value.feedback_diagnosis_ref && this.feedbackRevisionRejected({ object_type: "editorial_edit_intent", object_id: value.intent_id, object_version: value.object_version, digest: dynamicRow.object_hash });
      const rejectedByCompletedDecision = ["direction_card", "story_proposal_v2"].includes(kind) && value.status === "candidate" && (raw.artifacts.decision_record ?? []).some((decision: any) => {
        const matchingType = kind === "direction_card" ? decision.value?.decision_type === "direction_selection" : ["story_approval", "override"].includes(decision.value?.decision_type);
        return matchingType && ["approved", "overridden"].includes(decision.value?.status) && (decision.value?.rejected_refs ?? []).some((reference: any) => reference.object_id === id && reference.object_version === value.object_version && reference.digest === dynamicRow.object_hash);
      });
      const feedbackStaleReasons: string[] = [];
      if (kind === "editorial_edit_intent" && value.feedback_diagnosis_ref) {
        const approvedPlan = (raw.artifacts.approved_story_plan_v2 ?? []).find((candidate: any) => candidate.value?.plan_id === value.approved_story_ref?.object_id && Number(candidate.value?.object_version ?? 1) === value.approved_story_ref?.object_version);
        if (!approvedPlan || approvedPlan.object_hash !== value.approved_story_ref?.digest) feedbackStaleReasons.push("feedback_story_changed");
        else {
          const material = materialCards.find((candidate: any) => versionedRefMatches(candidate, approvedPlan.value.material_pack_ref));
          const blockingMaterialReasons = material?.stale_reasons?.filter((reason: string) => reason !== "timeline_version_changed") ?? [];
          if (!material || (material.status !== "sufficient" && blockingMaterialReasons.length > 0)) feedbackStaleReasons.push("feedback_material_authority_changed");
        }
        const diagnosis = raw.feedback_diagnoses.find((candidate: any) => candidate.value?.diagnosis_id === value.feedback_diagnosis_ref.object_id && Number(candidate.value?.object_version ?? 1) === value.feedback_diagnosis_ref.object_version);
        if (!diagnosis || diagnosis.object_hash !== value.feedback_diagnosis_ref.digest) feedbackStaleReasons.push("feedback_diagnosis_changed");
        else {
          if (!timeline || Number(diagnosis.value.base_timeline_ref?.version) !== Number(timeline.version)) feedbackStaleReasons.push("feedback_base_timeline_changed");
          const track = timeline?.tracks.find((candidate: any) => candidate.track_id === diagnosis.value.target?.track_id), clip = track?.clips.find((candidate: any) => candidate.clip_id === diagnosis.value.target?.clip_id);
          const original = diagnosis.value.target?.original_source;
          if (!clip || clip.source.asset_id !== original?.asset_id || Number(clip.source.start_pts) !== Number(original?.start?.value) || Number(clip.source.end_pts) !== Number(original?.end?.value) || Number(clip.source.timescale) !== Number(original?.end?.timescale)) feedbackStaleReasons.push("feedback_target_changed");
        }
      }
      const effectiveRow = feedbackRejected
        ? { ...dynamicRow, lifecycle_status: "rejected" }
        : feedbackStaleReasons.length ? { ...dynamicRow, lifecycle_status: "stale", stale_reasons: [...new Set([...(dynamicRow.stale_reasons ?? []), ...feedbackStaleReasons])].sort() }
          : rejectedByCompletedDecision && dynamicRow.lifecycle_status === "candidate" ? { ...dynamicRow, lifecycle_status: "rejected" }
            : dynamicRow;
      return {
        ...reference(effectiveRow, id),
        title: value.title ?? null,
        thesis: value.thesis ?? null,
        audience_promise: value.audience_promise ?? null,
        decision_type: value.decision_type ?? null,
        reason: value.reason ?? null,
        risks: Array.isArray(value.risks) ? [...value.risks] : [],
        alternatives: Array.isArray(value.alternatives) ? value.alternatives.map((item: any) => typeof item === "string" ? item : { ...item }) : [],
        confidence: value.confidence ? { ...value.confidence, basis: [...(value.confidence.basis ?? [])] } : null,
        contract_ref: value.contract_ref ? { ...value.contract_ref } : null,
        material_pack_ref: value.material_pack_ref ? { ...value.material_pack_ref } : null,
        direction_ref: value.direction_ref ? { ...value.direction_ref } : null,
        approved_story_ref: value.approved_story_ref ? { ...value.approved_story_ref } : null,
        beats: Array.isArray(value.beats) ? value.beats.map((beat: any) => ({ beat_id: beat.beat_id, role: beat.role, purpose: beat.purpose, desired_emotion: beat.desired_emotion, target_duration: { ...beat.target_duration }, evidence_count: (beat.evidence_refs ?? []).length })) : [],
        operations: Array.isArray(value.operations) ? value.operations.map((operation: any) => ({ operation_id: operation.operation_id, kind: operation.kind, target_refs: [...operation.target_refs], reason: operation.reason, expected_effect: operation.expected_effect })) : [],
        feedback_diagnosis_ref: value.feedback_diagnosis_ref ? { ...value.feedback_diagnosis_ref } : null,
      };
    }))])));
    const feedbackCards = raw.feedback_diagnoses.map((row: any) => ({
      ...reference(row, row.value.diagnosis_id),
      category: row.value.category,
      feedback_text: row.value.feedback.text,
      target: { track_id: row.value.target.track_id, clip_id: row.value.target.clip_id, operation: row.value.target.operation, original_source: { ...row.value.target.original_source }, proposed_source: { ...row.value.target.proposed_source } },
      reason: row.value.reason,
      alternatives: [...row.value.alternatives],
      confidence: { ...row.value.confidence, basis: [...row.value.confidence.basis] },
    }));
    const executions = raw.executions.map((row: any) => {
      const staleReasons: string[] = [];
      if (row.value.status === "committed") {
        if (!currentContract || currentContract.status !== "approved" || !versionedRefMatches(currentContract, row.value.contract_ref)) staleReasons.push("execution_contract_authority_changed");
        const story = (raw.artifacts.approved_story_plan_v2 ?? []).find((item: any) => item.value?.plan_id === row.value.story_ref?.object_id && Number(item.value?.object_version ?? 1) === row.value.story_ref?.object_version && item.object_hash === row.value.story_ref?.digest && item.lifecycle_status === "approved" && versionedRefMatches(item.value?.contract_ref, row.value.contract_ref));
        if (!story) staleReasons.push("execution_story_authority_changed");
        const material = story?.value?.material_pack_ref ? materialCards.find((item: any) => versionedRefMatches(item, story.value.material_pack_ref)) : undefined;
        const blockingMaterialReasons = material?.stale_reasons?.filter((reason: string) => reason !== "timeline_version_changed") ?? [];
        if (!material || material.status !== "sufficient" && (material.status !== "stale" || blockingMaterialReasons.length > 0)) staleReasons.push("execution_material_authority_changed");
      }
      return { execution_id: row.execution_id, digest: row.object_hash, status: staleReasons.length ? "stale" : row.value.status, stale_reasons: [...new Set(staleReasons)].sort(), intent_ref: { ...row.value.intent_ref }, ...(row.value.base_execution_ref ? { base_execution_ref: { ...row.value.base_execution_ref } } : {}), final_timeline_version: row.value.final_timeline_version, semantic_graph_hash: row.value.semantic_graph_hash, source_identity_digest: row.value.source_identity_digest, preview_plan_id: row.value.preview_plan_id, master_plan_id: row.value.master_plan_id, affected_scope: [...row.value.affected_scope], created_at: row.created_at };
    });
    const renderTimelineVersion = raw.render_results.length ? Math.max(...raw.render_results.map((row: any) => Number(row.timeline_version))) : null;
    const renderResults = raw.render_results.map((row: any) => ({ render_result_id: row.render_result_id, render_id: row.render_id, target: row.target, timeline_version: row.timeline_version, graph_hash: row.graph_hash, output_hash: row.output_hash, created_at: row.created_at }));
    const renderVersion = raw.render?.timeline_version ?? renderTimelineVersion;
    const boundRenderRows = raw.render ? raw.render_results.filter((item: any) => item.render_id === raw.render.render_id && Number(item.timeline_version) === Number(renderVersion)) : [];
    const previewRenderBinding = boundRenderRows.find((item: any) => item.target === "preview")?.profile?.stage2_execution_binding, masterRenderBinding = boundRenderRows.find((item: any) => item.target === "master")?.profile?.stage2_execution_binding;
    const renderBindingsMatch = previewRenderBinding && masterRenderBinding && editorialObjectDigest(previewRenderBinding) === editorialObjectDigest(masterRenderBinding);
    const renderBindingTimelineMatches = renderBindingsMatch && Number.isSafeInteger(previewRenderBinding.timeline_version) && previewRenderBinding.timeline_version === Number(renderVersion);
    const renderExecution = renderBindingTimelineMatches ? executions.find((item: any) => item.status === "committed" && item.execution_id === previewRenderBinding.execution_id && Number(item.final_timeline_version) === previewRenderBinding.timeline_version && item.semantic_graph_hash === previewRenderBinding.semantic_graph_hash && item.source_identity_digest === previewRenderBinding.source_identity_digest && item.preview_plan_id === previewRenderBinding.preview_plan_id && item.master_plan_id === previewRenderBinding.master_plan_id) : undefined;
    const renderTargets = boundRenderRows.map((item: any) => item.target);
    const renderStaleReasons = raw.render ? [...(!timeline || Number(renderVersion) !== Number(timeline.version) ? ["timeline_version_changed"] : []), ...(!renderExecution ? ["approved_execution_unavailable"] : []), ...(!renderTargets.includes("preview") || !renderTargets.includes("master") ? ["preview_master_pair_incomplete"] : [])] : [];
    const render = raw.render ? { render_id: raw.render.render_id, timeline_version: renderVersion, qc_status: raw.render.qc_status, binding_status: renderStaleReasons.length ? "stale" : "current", stale_reasons: renderStaleReasons, bound_execution_id: renderExecution?.execution_id ?? null, created_at: raw.render.created_at } : null;
    const currentExecution = timeline ? executions.find((item: any) => item.status === "committed" && Number(item.final_timeline_version) === Number(timeline.version)) : null;
    const approvalRows = await Promise.all(raw.permission_decisions.filter((row: any) => row.value?.classification === "exact_human_approved").map((row: any) => this.stage2PermissionDecisionView(row, identityCache))) as any[];
    const approvals = approvalRows.map((row: any) => ({ decision_id: row.value.decision_id, digest: row.object_hash, action: row.value.action, status: row.lifecycle_status, stale_reasons: [...(row.stale_reasons ?? [])], subject_ref: { ...row.value.subject_ref }, created_at: row.created_at }));
    const dynamicIdentity = (item: any) => ({ object_id: item.object_id, object_version: item.object_version, digest: item.digest, status: item.status, stale_reasons: [...(item.stale_reasons ?? [])] });
    const stableIdentities = (items: readonly any[]): readonly any[] => [...items].sort((left, right) => canonicalEditorialObject(left).localeCompare(canonicalEditorialObject(right)));
    const baseIdentity = { project_id: raw.project_id, contract_refs: stableIdentities(contractCards.map(dynamicIdentity)), evidence_refs: stableIdentities(evidenceCards.map(dynamicIdentity)), material_refs: stableIdentities(materialCards.map(dynamicIdentity)), artifact_refs: stableIdentities(Object.values(artifactCards).flat().map(dynamicIdentity)), feedback_refs: stableIdentities(feedbackCards.map(dynamicIdentity)), execution_refs: stableIdentities(executions.map((item: any) => ({ execution_id: item.execution_id, digest: item.digest, status: item.status, stale_reasons: item.stale_reasons }))), approval_refs: stableIdentities(approvals.map((item: any) => ({ decision_id: item.decision_id, digest: item.digest, status: item.status, stale_reasons: item.stale_reasons }))), timeline_version: timeline?.version ?? null, render_ref: render, render_refs: stableIdentities(renderResults) };
    const safeTimelineInteger = (value: unknown): number | null => typeof value === "bigint"
      ? value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null
      : typeof value === "number" && Number.isSafeInteger(value) ? value : null;
    const currentExecutionLineageIntentIds = new Set<string>();
    if (currentExecution) {
      const executionById = new Map(executions.map((item: any) => [item.execution_id, item]));
      let lineage: any = currentExecution;
      for (let depth = 0; lineage && depth < 64; depth += 1) {
        if (typeof lineage.intent_ref?.object_id === "string") currentExecutionLineageIntentIds.add(lineage.intent_ref.object_id);
        const baseExecutionId = lineage.base_execution_ref?.object_id;
        if (!baseExecutionId) break;
        lineage = executionById.get(baseExecutionId);
      }
    }
    const editableTargetProjection = timeline?.tracks.flatMap((track: any) => track.kind === "video" ? track.clips.map((clip: any) => {
      const unavailableReason = feedbackTrimTargetUnavailableReason(timeline, track, clip, currentContract?.protected_refs ?? []);
      if (unavailableReason) return { unavailable: { track_id: track.track_id, clip_id: clip.clip_id, reason: unavailableReason } };
      const start = safeTimelineInteger(clip.source.start_pts), end = safeTimelineInteger(clip.source.end_pts), timescale = safeTimelineInteger(clip.source.timescale);
      if (start === null || end === null || timescale === null || timescale <= 0) return { unavailable: { track_id: track.track_id, clip_id: clip.clip_id, reason: "rational_time_out_of_safe_number_range" } };
      return { target: { track_id: track.track_id, clip_id: clip.clip_id, asset_id: clip.source.asset_id, source: { start: { schema_version: 1, value: start, timescale }, end: { schema_version: 1, value: end, timescale } } } };
    }) : []) ?? [];
    const editableTargets = editableTargetProjection.flatMap((item: any) => item.target ? [item.target] : []), unavailableEditableTargets = editableTargetProjection.flatMap((item: any) => item.unavailable ? [item.unavailable] : []);
    const currentExecutionOutput = (target: any) => target.track_id === "video-main" && Boolean(currentExecution) && (() => { const track = timeline?.tracks.find((item: any) => item.track_id === target.track_id), clip = track?.clips.find((item: any) => item.clip_id === target.clip_id); return Boolean(clip?.clip_id.startsWith("semantic:") && typeof clip.semantic_sidecar?.metadata?.intent_id === "string" && currentExecutionLineageIntentIds.has(clip.semantic_sidecar.metadata.intent_id)); })();
    const feedbackEditableTargets = editableTargets.filter(currentExecutionOutput), feedbackUnavailableTargets = [...unavailableEditableTargets.filter((item: any) => item.track_id === "video-main"), ...editableTargets.filter((item: any) => item.track_id === "video-main" && !currentExecutionOutput(item)).map((item: any) => ({ track_id: item.track_id, clip_id: item.clip_id, reason: "not_current_execution_output" }))];
    const directionHeads = [...new Map((artifactCards.direction_card ?? []).sort((left: any, right: any) => left.object_version - right.object_version).map((item: any) => [item.object_id, item])).values()];
    const currentPacks = materialCards.filter((item: any) => item.status === "sufficient");
    const activeDirectionPackKeys = new Set(directionHeads.filter((item: any) => ["candidate", "selected"].includes(item.status) && item.material_pack_ref).map((item: any) => `${item.material_pack_ref.object_id}@${item.material_pack_ref.object_version}#${item.material_pack_ref.digest}`));
    const packsWithCurrentDirections = currentPacks.filter((item: any) => activeDirectionPackKeys.has(`${item.object_id}@${item.object_version}#${item.digest}`));
    const packAuthorityAmbiguityReason = packsWithCurrentDirections.length > 1
      ? "multiple_active_material_packs"
      : packsWithCurrentDirections.length === 0 && currentPacks.length > 1 ? "multiple_sufficient_material_packs" : null;
    const packAuthorityAmbiguous = packAuthorityAmbiguityReason !== null;
    const currentPack = packsWithCurrentDirections.length === 1 ? packsWithCurrentDirections[0] : currentPacks.length === 1 ? currentPacks[0] : null;
    const packScopedDirections = directionHeads.filter((item: any) => !currentPack || versionedRefMatches(item.material_pack_ref, currentPack) || !["candidate", "selected"].includes(item.status));
    const directionSelectionAmbiguous = packScopedDirections.filter((item: any) => item.status === "selected").length > 1;
    const authorityStaleReason = packAuthorityAmbiguous ? "material_pack_authority_ambiguous" : directionSelectionAmbiguous ? "direction_selection_authority_ambiguous" : null;
    const closeForAuthorityAmbiguity = (items: readonly any[]): readonly any[] => !authorityStaleReason ? items : items.map((item: any) => ["candidate", "selected", "approved"].includes(item.status) ? { ...item, status: "stale", stale_reasons: [...new Set([...(item.stale_reasons ?? []), authorityStaleReason])].sort() } : item);
    const directions = closeForAuthorityAmbiguity(packScopedDirections);
    const selectedDirection = directions.find((item: any) => item.status === "selected");
    const scopedStories = (artifactCards.story_proposal_v2 ?? []).filter((item: any) => !selectedDirection || versionedRefMatches(item.direction_ref, selectedDirection));
    const stories = closeForAuthorityAmbiguity(scopedStories);
    const scopedApprovedPlans = (artifactCards.approved_story_plan_v2 ?? []).filter((item: any) => !selectedDirection || versionedRefMatches(item.direction_ref, selectedDirection));
    const approvedPlans = closeForAuthorityAmbiguity(scopedApprovedPlans);
    const currentPlans = approvedPlans.filter((item: any) => item.status === "approved");
    const currentPlan = currentPlans.length === 1 ? currentPlans[0] : null;
    const scopedIntents = (artifactCards.editorial_edit_intent ?? []).filter((item: any) => !currentPlan || versionedRefMatches(item.approved_story_ref, currentPlan));
    const intents = closeForAuthorityAmbiguity(scopedIntents);
    const materialAuthority = { status: packAuthorityAmbiguous ? "ambiguous" : currentPack ? "current" : "unavailable", ambiguity_reason: packAuthorityAmbiguityReason, current_pack_ref: currentPack ? { object_id: currentPack.object_id, object_version: currentPack.object_version, digest: currentPack.digest } : null };
    const directionAuthority = { status: directionSelectionAmbiguous ? "ambiguous" : selectedDirection ? "selected" : "unselected", selected_direction_ref: selectedDirection ? { object_id: selectedDirection.object_id, object_version: selectedDirection.object_version, digest: selectedDirection.digest } : null };
    const identity = { ...baseIdentity, material_authority: materialAuthority, direction_authority: directionAuthority, feedback_target_support: { editable: feedbackEditableTargets.map((item: any) => [item.track_id, item.clip_id]), unavailable: feedbackUnavailableTargets.map((item: any) => [item.track_id, item.clip_id, item.reason]) } };
    this.assertStage2PersistenceRevision(workspaceRevision, "PRODUCT_WORKSPACE_CHANGED_DURING_READ");
    return Object.freeze({ schema_version: 1, workspace_digest: editorialObjectDigest(identity), project_id: raw.project_id, timeline: timeline ? { version: timeline.version, track_count: timeline.tracks.length, clip_count: timeline.tracks.reduce((count: number, track: any) => count + track.clips.length, 0), editable_targets: editableTargets, unavailable_editable_targets: unavailableEditableTargets, feedback_editable_targets: feedbackEditableTargets, unavailable_feedback_targets: feedbackUnavailableTargets } : null, contract: currentContract, contracts: contractCards, evidence: evidenceCards, material_packs: materialCards, material_authority: materialAuthority, direction_authority: directionAuthority, directions, stories, approved_plans: approvedPlans, decisions: artifactCards.decision_record ?? [], intents, feedback: feedbackCards, executions, approvals, review: { render, render_results: renderResults, current_execution_id: currentExecution?.execution_id ?? null } });
  }

  async createStage2ProductContractDraft(input: Stage2ProductContractDraftInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["allowed_transformations", "audience", "creator_goal", "desired_traits", "forbidden_misrepresentation", "forbidden_outcomes", "platforms", "privacy_policy_ref", "protected_refs", "requirements", "rights_policy_ref", "target_duration_seconds", "workspace_digest"], "stage2_product.contract.create");
    const workspace = await this.readStage2Workspace() as any;
    if (workspace.workspace_digest !== input.workspace_digest) throw new Error("PRODUCT_WORKSPACE_STALE");
    if (workspace.contract) throw new Error("PRODUCT_CONTRACT_ALREADY_EXISTS");
    const exactStrings = (value: unknown, label: string, minimum = 0): readonly string[] => {
      if (!Array.isArray(value) || value.length < minimum || value.some((item) => typeof item !== "string" || !item.trim() || item !== item.trim()) || new Set(value).size !== value.length) throw new Error(`PRODUCT_CONTRACT_${label}_INVALID`);
      return value;
    };
    const exactPolicyRef = (value: unknown, label: string): Readonly<{ object_id: string; object_version: number; digest: string }> => {
      assertExactInputKeys(value, ["digest", "object_id", "object_version"], `stage2_product.contract.${label}`);
      const reference = value as Record<string, unknown>;
      if (typeof reference.object_id !== "string" || !reference.object_id.trim() || !Number.isSafeInteger(reference.object_version) || Number(reference.object_version) < 1 || typeof reference.digest !== "string" || !/^[0-9a-f]{64}$/.test(reference.digest)) throw new Error(`PRODUCT_CONTRACT_${label.toUpperCase()}_INVALID`);
      return reference as { object_id: string; object_version: number; digest: string };
    };
    if (typeof input.creator_goal !== "string" || !input.creator_goal.trim() || input.creator_goal !== input.creator_goal.trim()) throw new Error("PRODUCT_CONTRACT_CREATOR_GOAL_INVALID");
    if (!Number.isSafeInteger(input.target_duration_seconds) || input.target_duration_seconds < 1) throw new Error("PRODUCT_CONTRACT_TARGET_DURATION_INVALID");
    const targetDuration = { schema_version: 1 as const, value: input.target_duration_seconds, timescale: 1 };
    resolveStage2ProductDurationBlueprint(targetDuration);
    const projectId = this.session.manifest.project_id;
    const contractId = `product-contract-${editorialObjectDigest({ project_id: projectId, authority: "creative-contract" }).slice(0, 24)}`;
    const requirements = exactStrings(input.requirements, "REQUIREMENTS", 1).map((statement, index) => ({ requirement_id: `requirement-${index + 1}`, kind: "hard" as const, statement, priority: 100 }));
    const contract: CreativeContractV2 = {
      schema_version: 2,
      contract_id: contractId,
      project_id: projectId,
      object_version: 1,
      status: "review",
      creator_goal: input.creator_goal,
      audience: exactStrings(input.audience, "AUDIENCE", 1),
      platforms: exactStrings(input.platforms, "PLATFORMS", 1),
      target_duration: targetDuration,
      requirements,
      voice_and_identity: { desired_traits: exactStrings(input.desired_traits, "DESIRED_TRAITS"), forbidden_misrepresentation: exactStrings(input.forbidden_misrepresentation, "FORBIDDEN_MISREPRESENTATION") },
      privacy_policy_ref: exactPolicyRef(input.privacy_policy_ref, "privacy_policy_ref"),
      rights_policy_ref: exactPolicyRef(input.rights_policy_ref, "rights_policy_ref"),
      approval_policy: { mode: "explicit_user", actor_kind: "user" },
      protected_refs: exactStrings(input.protected_refs, "PROTECTED_REFS"),
      allowed_transformations: exactStrings(input.allowed_transformations, "ALLOWED_TRANSFORMATIONS"),
      forbidden_outcomes: exactStrings(input.forbidden_outcomes, "FORBIDDEN_OUTCOMES"),
      created_at: new Date(this.now()).toISOString(),
      provenance: { producer: "user", source_id: contractId, source_version: "1", policy_version: "desktop-product-contract-v1", input_refs: [], unresolved_assumptions: [] }
    };
    return this.registerCreativeContractDraft(contract);
  }

  async renderStage2ProductExecution(input: Stage2ProductRenderInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["execution_id", "workspace_digest"], "stage2_product.execution.render");
    if (typeof input.execution_id !== "string" || !input.execution_id.trim() || typeof input.workspace_digest !== "string" || !/^[0-9a-f]{64}$/.test(input.workspace_digest)) throw new Error("PRODUCT_EXECUTION_RENDER_PAYLOAD_INVALID");
    const workspace = await this.readStage2Workspace() as any;
    if (workspace.workspace_digest !== input.workspace_digest) throw new Error("PRODUCT_WORKSPACE_STALE");
    if (workspace.review.current_execution_id !== input.execution_id) throw new Error("PRODUCT_EXECUTION_RENDER_UNAVAILABLE_OR_STALE");
    const row = readIntelligenceEditExecution(this.session, this.session.manifest.project_id, input.execution_id) as any;
    if (!row || row.value?.status !== "committed" || Number(row.value.final_timeline_version) !== Number(workspace.timeline?.version)) throw new Error("PRODUCT_EXECUTION_RENDER_UNAVAILABLE_OR_STALE");
    const sourceRefs = row.value.source_refs;
    if (!Array.isArray(sourceRefs) || sourceRefs.length === 0) throw new Error("PRODUCT_EXECUTION_RENDER_SOURCES_INVALID");
    const positiveBigInt = (value: unknown, label: string): bigint => { if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) throw new Error(`PRODUCT_EXECUTION_RENDER_${label}_INVALID`); return BigInt(value); };
    const sources: RenderSourceRef[] = sourceRefs.map((source: any) => {
      if (!source || typeof source !== "object" || typeof source.asset_ref !== "string" || !source.asset_ref || typeof source.original_ref !== "string" || !source.original_ref || typeof source.original_object_ref !== "string" || !source.original_object_ref) throw new Error("PRODUCT_EXECUTION_RENDER_SOURCE_IDENTITY_INVALID");
      const width = source.original_width, height = source.original_height, hasAudio = source.has_audio;
      if ((width !== null && (!Number.isSafeInteger(width) || width < 1)) || (height !== null && (!Number.isSafeInteger(height) || height < 1)) || (hasAudio !== null && typeof hasAudio !== "boolean")) throw new Error("PRODUCT_EXECUTION_RENDER_SOURCE_IDENTITY_INVALID");
      return { asset_ref: source.asset_ref, original_ref: source.original_ref, original_object_ref: source.original_object_ref, source_timescale: positiveBigInt(source.source_timescale, "SOURCE_TIMESCALE"), original_timescale: positiveBigInt(source.original_timescale, "ORIGINAL_TIMESCALE"), ...(width === null ? {} : { original_width: width }), ...(height === null ? {} : { original_height: height }), ...(hasAudio === null ? {} : { has_audio: hasAudio }) };
    });
    const timeline = this.readTimelineSnapshot() as Timeline | null;
    if (!timeline || timeline.version !== Number(row.value.final_timeline_version)) throw new Error("PRODUCT_EXECUTION_RENDER_UNAVAILABLE_OR_STALE");
    const executionBinding = { execution_id: input.execution_id, timeline_version: Number(row.value.final_timeline_version), semantic_graph_hash: row.value.semantic_graph_hash, preview_plan_id: row.value.preview_plan_id, master_plan_id: row.value.master_plan_id, source_identity_digest: row.value.source_identity_digest };
    if (!Number.isSafeInteger(executionBinding.timeline_version) || [executionBinding.execution_id, executionBinding.semantic_graph_hash, executionBinding.preview_plan_id, executionBinding.master_plan_id, executionBinding.source_identity_digest].some((value) => typeof value !== "string" || !value)) throw new Error("PRODUCT_EXECUTION_RENDER_BINDING_INVALID");
    return this.renderTimeline({ sources, profile: editorialExecutionRenderProfile(timeline, sources), executionBinding });
  }

  private async prepareStage2ProductGenerationInternal(rawInput: Stage2ProductGenerationInput): Promise<Readonly<{ input: Stage2ProductGenerationInput; review: Stage2ProductGenerationReview; plan: any }>> {
    if (!this.session) throw new Error("project is not open");
    const input = parseStage2ProductGenerationInput(rawInput), workspace = await this.readStage2Workspace() as any;
    if (workspace.workspace_digest !== input.workspace_digest) throw new Error("PRODUCT_WORKSPACE_STALE");
    const contractCard = workspace.contract;
    if (!contractCard || contractCard.status !== "approved") throw new Error("PRODUCT_GENERATION_CONTRACT_UNAVAILABLE");
    const projectId = this.session.manifest.project_id, contractRow = readCreativeContractVersion(this.session, projectId, contractCard.object_id, contractCard.object_version) as any;
    if (!contractRow || contractRow.object_hash !== contractCard.digest || contractRow.lifecycle_status !== "approved") throw new Error("PRODUCT_GENERATION_CONTRACT_UNAVAILABLE");
    const contractRef = { object_id: contractCard.object_id, object_version: contractCard.object_version, digest: contractCard.digest };
    if (input.stage === "material") {
      if (workspace.material_authority?.ambiguity_reason === "multiple_active_material_packs") throw new Error("PRODUCT_GENERATION_MATERIAL_AUTHORITY_AMBIGUOUS");
      if (workspace.direction_authority?.status === "ambiguous") throw new Error("PRODUCT_GENERATION_DIRECTION_AUTHORITY_AMBIGUOUS");
      const rawTimeline = readLatestTimeline(this.session, projectId); if (!rawTimeline) throw new Error("PRODUCT_GENERATION_TIMELINE_UNAVAILABLE");
      const timeline = revive(JSON.parse(rawTimeline)) as Timeline, targetCard = workspace.timeline?.editable_targets?.find((item: any) => item.track_id === input.target.track_id && item.clip_id === input.target.clip_id);
      const track = timeline.tracks.find((item) => item.track_id === input.target.track_id), clip = track?.clips.find((item) => item.clip_id === input.target.clip_id);
      if (!targetCard || !track || track.kind !== "video" || !clip || clip.source.asset_id !== targetCard.asset_id) throw new Error("PRODUCT_GENERATION_TARGET_UNAVAILABLE");
      if (track.enabled !== false) throw new Error("PRODUCT_GENERATION_SOURCE_TRACK_MUST_BE_DISABLED");
      const outputTracks = timeline.tracks.filter((item) => item.kind === "video" && item.enabled !== false);
      if (outputTracks.length !== 1 || outputTracks[0]!.locked === true) throw new Error("PRODUCT_GENERATION_OUTPUT_TRACK_UNAVAILABLE_OR_AMBIGUOUS");
      const destinationViolation = semanticFirstCutDestinationViolation(timeline, outputTracks[0]!.track_id);
      if (destinationViolation?.kind === "render_active_content") throw new Error(`PRODUCT_GENERATION_DESTINATION_TIMELINE_NOT_EMPTY:${destinationViolation.track_id}`);
      if (destinationViolation?.kind === "non_neutral_timeline_state") throw new Error(`PRODUCT_GENERATION_DESTINATION_TIMELINE_NOT_NEUTRAL:${destinationViolation.field}`);
      if (destinationViolation) throw new Error(`PRODUCT_GENERATION_DESTINATION_TRACK_NOT_NEUTRAL:${destinationViolation.track_id}:${destinationViolation.field}`);
      const source = timelineSourceRangeContract(clip.source), sourceLength = source.end.value - source.start.value;
      const blueprint = resolveStage2ProductDurationBlueprint(contractRow.value.target_duration);
      const definitionCandidates = builtInCreativeSkillDefinitions.filter((candidate) => { const control = readCreativeSkillDefinitionControl(this.session!, projectId, candidate.skill_id, candidate.skill_version) as any; return candidate.status === "published" && candidate.governance.trust_status === "trusted" && candidate.governance.license_status === "approved" && (!control || control.availability === "active"); });
      if (definitionCandidates.length !== 1) throw new Error("PRODUCT_GENERATION_CREATIVE_SKILL_DEFINITION_UNAVAILABLE_OR_AMBIGUOUS");
      const definition = definitionCandidates[0]!;
      if (String(CREATIVE_SKILL_POLICY_VERSION) !== String(DURATION_MATERIAL_POLICY_VERSION)) throw new Error("PRODUCT_GENERATION_MATERIAL_POLICY_INCOMPATIBLE");
      const requiredEvidence = Math.max(blueprint.beat_count.minimum, blueprint.ending_contract.minimum_evidence_count, blueprint.beat_roles.reduce((sum, role) => sum + role.minimum_evidence_count, 0));
      if (input.evidence_statements.length < requiredEvidence || input.evidence_statements.length > blueprint.beat_count.maximum) throw new Error(`PRODUCT_GENERATION_EVIDENCE_INSUFFICIENT:${requiredEvidence}:${blueprint.beat_count.maximum}`);
      const roleAllocation = allocateDurationRoleBudgets(blueprint), plannedBeatCount = Math.min(blueprint.beat_count.maximum, Math.max(blueprint.beat_count.minimum, input.evidence_statements.length));
      const materialBeatBudgets = allocateDurationBeatBudgets({ planned_beat_count: plannedBeatCount, allocated_roles: roleAllocation.allocated_roles });
      if (materialBeatBudgets.length !== input.evidence_statements.length) throw new Error("PRODUCT_GENERATION_DURATION_BEAT_PLAN_INVALID");
      if (!contractRow.value.allowed_transformations.includes("reorder") || !stage2ProductEqualDurationBeatIndices(materialBeatBudgets)) throw new Error("PRODUCT_GENERATION_DISTINCT_STORY_ALTERNATIVE_UNAVAILABLE");
      const materialBeatSourceUnits = materialBeatBudgets.map((beat) => stage2ProductExactUnits(beat.duration, source.start.timescale, "PRODUCT_GENERATION_SOURCE_TIMEBASE_UNREPRESENTABLE")), requiredSourceLength = materialBeatSourceUnits.reduce((sum, value) => sum + value, 0);
      if (!Number.isSafeInteger(requiredSourceLength) || sourceLength < requiredSourceLength) throw new Error(`PRODUCT_GENERATION_SOURCE_DURATION_INSUFFICIENT:${requiredSourceLength}:${sourceLength}`);
      const locations = (listAssetLocationsForAssets(this.session, projectId, [clip.source.asset_id]) as PersistedAssetLocation[]).filter((candidate) => candidate.location_type === "original");
      const currentAuthorities = (await Promise.all(locations.map(async (location) => {
        const immutableLocation = this.immutableOriginalForSource(location);
        const immutableContentCurrent = Boolean(immutableLocation && await this.persistedLocationHasCurrentIdentity(immutableLocation));
        const mutableContentCurrent = immutableContentCurrent || await this.persistedLocationHasCurrentIdentity(location);
        return { location, immutableLocation, immutableContentCurrent, current: immutableContentCurrent || mutableContentCurrent };
      }))).filter((item) => item.current);
      if (currentAuthorities.length !== 1 || !currentAuthorities[0]?.location.verified_at) throw new Error("PRODUCT_GENERATION_ORIGINAL_UNAVAILABLE_OR_AMBIGUOUS");
      const { location, immutableLocation, immutableContentCurrent } = currentAuthorities[0], locationIdentity = originalLocationAuthorityIdentity(location), definitionRef = { object_id: definition.skill_id, object_version: definition.skill_version, digest: definition.definition_digest }, blueprintRef = { object_id: blueprint.blueprint_id, object_version: blueprint.blueprint_version, digest: blueprint.definition_digest }, materialPolicyVersion = CREATIVE_SKILL_POLICY_VERSION, materialAuthorityRef = stage2ProductMaterialAuthorityRef();
      const beatPlanDigest = editorialObjectDigest(materialBeatBudgets), evidenceIdentity = editorialObjectDigest({ project_id: projectId, contract_ref: contractRef, timeline_version: timeline.version, original_location_identity: locationIdentity, target: { track_id: track.track_id, clip_id: clip.clip_id, source }, evidence_statements: input.evidence_statements, beat_plan_digest: beatPlanDigest, generator_version: STAGE2_PRODUCT_EVIDENCE_GENERATOR_VERSION }), materialIdentity = editorialObjectDigest({ evidence_identity: evidenceIdentity, authority_ref: materialAuthorityRef }), skillInvocation = { context_tags: ["personal-story", "reaction-evidenced"], parameter_values: { intensity: "moderate" } }, skillIdentity = editorialObjectDigest({ material_identity: materialIdentity, definition_ref: definitionRef, invocation: skillInvocation, evaluator_version: CREATIVE_SKILL_EVALUATOR_VERSION, policy_version: CREATIVE_SKILL_POLICY_VERSION }), durationIdentity = editorialObjectDigest({ material_identity: materialIdentity, blueprint_ref: blueprintRef, allocator_version: DURATION_ALLOCATOR_VERSION, policy_version: DURATION_POLICY_VERSION }), directionIdentity = editorialObjectDigest({ material_identity: materialIdentity, skill_identity: skillIdentity, duration_identity: durationIdentity, evaluator_version: STORY_EVALUATOR_VERSION, policy_version: STORY_POLICY_VERSION, template_version: STAGE2_PRODUCT_DIRECTION_TEMPLATE_VERSION }), generationAuthority = { material: { authority_ref: materialAuthorityRef, evidence_generator_version: STAGE2_PRODUCT_EVIDENCE_GENERATOR_VERSION, assembler_version: MATERIAL_EVIDENCE_ASSEMBLER_VERSION, policy_version: materialPolicyVersion, template_version: STAGE2_PRODUCT_MATERIAL_TEMPLATE_VERSION, beat_plan_digest: beatPlanDigest }, creative_skill: { definition_ref: definitionRef, invocation: skillInvocation, evaluator_version: CREATIVE_SKILL_EVALUATOR_VERSION, policy_version: CREATIVE_SKILL_POLICY_VERSION }, duration: { blueprint_ref: blueprintRef, allocator_version: DURATION_ALLOCATOR_VERSION, material_policy_version: DURATION_MATERIAL_POLICY_VERSION, policy_version: DURATION_POLICY_VERSION }, story: { evaluator_version: STORY_EVALUATOR_VERSION, policy_version: STORY_POLICY_VERSION, direction_template_version: STAGE2_PRODUCT_DIRECTION_TEMPLATE_VERSION, story_template_version: STAGE2_PRODUCT_STORY_TEMPLATE_VERSION } }, directionIds = [`product-direction-evidence-${directionIdentity.slice(0, 20)}`, `product-direction-chronology-${directionIdentity.slice(0, 20)}`] as const;
      if (workspace.directions.some((item: any) => ["candidate", "selected"].includes(item.status) && !directionIds.includes(item.object_id))) throw new Error("PRODUCT_GENERATION_DIRECTIONS_ALREADY_AVAILABLE");
      let evidenceCursor = source.start.value;
      const evidence = input.evidence_statements.map((statement, index) => {
        const start = evidenceCursor, end = start + materialBeatSourceUnits[index]!; evidenceCursor = end;
        return { evidence_id: `product-scene-${evidenceIdentity.slice(0, 18)}-${index + 1}`, analysis_type: "scene", asset_id: clip.source.asset_id, start_pts: start, end_pts: end, timescale: source.start.timescale, evidence_version: 1, review_status: "candidate", label: statement };
      });
      const requirements = contractRow.value.requirements.filter((item: any) => item.kind === "hard"), coverage: CoverageMatrix = { schema_version: 1, matrix_id: `product-coverage-${evidenceIdentity.slice(0, 24)}`, rows: requirements.map((requirement: any, index: number) => ({ requirement_id: requirement.requirement_id, evidence_ids: evidence.filter((_item, evidenceIndex) => evidenceIndex % Math.max(1, requirements.length) === index % Math.max(1, requirements.length)).map((item) => item.evidence_id).length ? evidence.filter((_item, evidenceIndex) => evidenceIndex % Math.max(1, requirements.length) === index % Math.max(1, requirements.length)).map((item) => item.evidence_id) : [evidence[index % evidence.length]!.evidence_id], status: "covered" as const })) };
      const evidenceCoverage = evidence.map((item) => ({ evidence_id: item.evidence_id, statement: item.label, requirement_ids: coverage.rows.filter((row) => row.evidence_ids.includes(item.evidence_id)).map((row) => row.requirement_id), range: { start: item.start_pts, end: item.end_pts, timescale: item.timescale } }));
      const permissionSubject: Stage2PermissionTypedRef = { object_type: "creative_contract", ...contractRef }, permissionEffect = { asset_id: location.asset_id, asset_location_id: location.asset_location_id, location_identity: locationIdentity, permission_state: "authorized" as const, policy_ref: contractRow.value.rights_policy_ref };
      const originalPermissionCurrent = location.metadata?.permission_state === "authorized" && location.metadata?.permission_decision?.permission_state === "authorized" && versionedRefMatches(location.metadata.permission_decision.policy_ref, contractRow.value.rights_policy_ref);
      const permissionCurrent = Boolean(originalPermissionCurrent && immutableLocation && immutableContentCurrent && immutableLocation.metadata?.permission_state === "authorized" && immutableLocation.metadata?.permission_decision?.permission_state === "authorized" && versionedRefMatches(immutableLocation.metadata.permission_decision.policy_ref, contractRow.value.rights_policy_ref) && this.stage2ImmutableLocationIsCurrent(immutableLocation));
      const evidenceStates = evidence.map((candidate) => {
        const row = readEvidenceObject(this.session!, candidate.evidence_id) as any, candidateDigest = editorialObjectDigest(candidate), { review: _review, ...storedBase } = row?.value ?? {};
        if (row && (editorialObjectDigest({ ...storedBase, review_status: "candidate" }) !== candidateDigest || !["candidate", "approved"].includes(row.value.review_status))) throw new Error(`PRODUCT_GENERATION_EVIDENCE_CONFLICT:${candidate.evidence_id}`);
        return { candidate, candidateDigest, needsApproval: row?.value?.review_status !== "approved" };
      });
      const approvalBundle: Stage2ProductGenerationApprovalReview[] = [];
      if (!permissionCurrent) approvalBundle.push({ action: "material_permission.record", subject_ref: permissionSubject, context_refs: [], requested_data_fields: ["asset_id", "location_identity", "policy_ref", "reason"], affected_scope: [permissionRefKey(permissionSubject)], effect_digest: stage2PermissionEffectDigest("material_permission.record", permissionEffect), reason: "record exact material permission authorized" });
      for (const state of evidenceStates.filter((item) => item.needsApproval)) {
        const subject: Stage2PermissionTypedRef = { object_type: "evidence_object", object_id: state.candidate.evidence_id, object_version: 1, digest: state.candidateDigest }, effect = { evidence_id: state.candidate.evidence_id, evidence_version: 1, review_digest: state.candidateDigest, outcome: "approved", reason: input.reason };
        approvalBundle.push({ action: "evidence.approve", subject_ref: subject, context_refs: [], requested_data_fields: ["reason", "review_digest"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("evidence.approve", effect), reason: input.reason });
      }
      const permissionSummary = permissionCurrent
        ? `素材授权：当前精确 Original 与项目不可变快照均已 authorized，本次不会重复授权`
        : originalPermissionCurrent
          ? `素材授权：现有 Original 授权缺少当前项目不可变快照；确认后将重新绑定授权并创建快照`
          : `素材授权：确认后将当前精确 Original 标记为 authorized 并创建项目不可变快照`;
      const summary = [`素材：${track.track_id}/${clip.clip_id} · ${clip.source.asset_id}`, `源范围：${source.start.value}–${source.end.value}/${source.start.timescale}`, permissionSummary, `权利策略：${contractRow.value.rights_policy_ref.object_id}@${contractRow.value.rights_policy_ref.object_version}#${contractRow.value.rights_policy_ref.digest}`, `生成权威：${definitionRef.object_id}@${definitionRef.object_version} · ${blueprintRef.object_id}@${blueprintRef.object_version} · ${CREATIVE_SKILL_EVALUATOR_VERSION}/${DURATION_ALLOCATOR_VERSION}/${STORY_EVALUATOR_VERSION}`, ...evidenceCoverage.map((item, index) => `Evidence ${item.evidence_id}：${evidenceStates[index]!.needsApproval ? "确认后逐条批准" : "当前已批准，本次复用"}“${item.statement}” · ${item.range.start}–${item.range.end}/${item.range.timescale} · 覆盖 ${item.requirement_ids.join("、")}`), `将生成两个可比较 Direction，仍需后续人工选择。`];
      const effect = { stage: input.stage, workspace_digest: input.workspace_digest, contract_ref: contractRef, location: { asset_id: location.asset_id, asset_location_id: location.asset_location_id, verified_at: location.verified_at }, evidence: evidenceCoverage, coverage, definition_ref: definitionRef, blueprint_ref: blueprintRef, generation_authority: generationAuthority, approval_bundle: approvalBundle, reason: input.reason };
      const review: Stage2ProductGenerationReview = { schema_version: 1, stage: input.stage, workspace_digest: input.workspace_digest, effect_digest: editorialObjectDigest(effect), approval_bundle: approvalBundle, summary };
      return { input, review, plan: { contractRow, contractRef, timeline, track, clip, source, location, evidenceStates, coverage, definition, definitionRef, blueprint, blueprintRef, materialPolicyVersion, materialAuthorityRef, materialIdentity, materialBeatBudgets, skillInvocation, skillIdentity, durationIdentity, directionIdentity, generationAuthority, directionIds, permissionCurrent } };
    }
    if (input.stage === "story") {
      const selected = workspace.directions.find((item: any) => item.status === "selected"); if (!selected) throw new Error("PRODUCT_GENERATION_SELECTED_DIRECTION_UNAVAILABLE");
      const directionRow = readEditorialArtifact(this.session, projectId, "direction_card", selected.object_id, selected.object_version) as any;
      if (!directionRow || directionRow.object_hash !== selected.digest) throw new Error("PRODUCT_GENERATION_SELECTED_DIRECTION_UNAVAILABLE");
      const packRow = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, directionRow.value.material_pack_ref.object_id, directionRow.value.material_pack_ref.object_version)) as any, durationRow = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, directionRow.value.duration_feasibility_ref.object_id)) as any;
      const evaluationRows = await Promise.all(directionRow.value.skill_evaluation_refs.map((reference: any) => this.skillEvaluationView(readSkillEvaluation(this.session!, projectId, reference.object_id, reference.object_version))));
      if (!packRow || packRow.lifecycle_status !== "sufficient" || !durationRow || durationRow.lifecycle_status !== "feasible" || evaluationRows.some((row: any) => !row || row.lifecycle_status !== "applicable")) throw new Error("PRODUCT_GENERATION_STORY_CONTEXT_UNAVAILABLE");
      const storyBeatBudgets = allocateDurationBeatBudgets(durationRow.value), orderedEvidence = [...packRow.value.evidence_refs].sort((left: any, right: any) => {
        const comparison = BigInt(left.range.start.value) * BigInt(right.range.start.timescale) - BigInt(right.range.start.value) * BigInt(left.range.start.timescale);
        return comparison < 0n ? -1 : comparison > 0n ? 1 : left.evidence_id.localeCompare(right.evidence_id);
      });
      if (storyBeatBudgets.length !== durationRow.value.planned_beat_count || orderedEvidence.length !== storyBeatBudgets.length) throw new Error("PRODUCT_GENERATION_EVIDENCE_BEAT_COUNT_MISMATCH");
      storyBeatBudgets.forEach((beat, index) => {
        const reference = orderedEvidence[index], rangeDuration = reference?.range?.end?.value - reference?.range?.start?.value;
        if (!reference || reference.range.start.timescale !== reference.range.end.timescale || rangeDuration !== stage2ProductExactUnits(beat.duration, reference.range.start.timescale, "PRODUCT_GENERATION_EVIDENCE_TIMEBASE_UNREPRESENTABLE")) throw new Error(`PRODUCT_GENERATION_EVIDENCE_DURATION_MISMATCH:${reference?.evidence_id ?? index}`);
      });
      if (!contractRow.value.allowed_transformations.includes("reorder")) throw new Error("PRODUCT_GENERATION_DISTINCT_STORY_ALTERNATIVE_UNAVAILABLE");
      const alternative = stage2ProductDistinctEvidenceOrder(storyBeatBudgets, orderedEvidence), alternativeEvidence = alternative.evidence;
      storyBeatBudgets.forEach((beat, index) => {
        const reference = alternativeEvidence[index] as any, rangeDuration = reference?.range?.end?.value - reference?.range?.start?.value;
        if (!reference || reference.range.start.timescale !== reference.range.end.timescale || rangeDuration !== stage2ProductExactUnits(beat.duration, reference.range.start.timescale, "PRODUCT_GENERATION_EVIDENCE_TIMEBASE_UNREPRESENTABLE")) throw new Error("PRODUCT_GENERATION_DISTINCT_STORY_ALTERNATIVE_UNAVAILABLE");
      });
      const storyTemplateRef = stage2ProductStoryTemplateRef(), storyIdentity = editorialObjectDigest({ direction_ref: { object_id: directionRow.value.direction_id, object_version: directionRow.value.object_version, digest: directionRow.object_hash }, duration_ref: directionRow.value.duration_feasibility_ref, story_template_ref: storyTemplateRef }), storyIds = [`product-story-evidence-${storyIdentity.slice(0, 20)}`, `product-story-chronology-${storyIdentity.slice(0, 20)}`] as const;
      if (workspace.stories.some((item: any) => item.status === "candidate" && !storyIds.includes(item.object_id))) throw new Error("PRODUCT_GENERATION_STORIES_ALREADY_AVAILABLE");
      const beatPlanDigest = editorialObjectDigest(storyBeatBudgets), evidenceOrderDigest = editorialObjectDigest({ chronology: orderedEvidence.map((item: any) => item.evidence_id), equal_duration_alternative: alternativeEvidence.map((item: any) => item.evidence_id), changed_indices: alternative.changed_indices }), changedEvidence = alternative.changed_indices.map((index) => (orderedEvidence[index] as any).evidence_id).join("、"), summary = [`已选 Direction：${selected.title}`, `精确 Direction：${selected.object_id}@${selected.object_version}#${selected.digest}`, `Evidence：${orderedEvidence.length} 条`, `计划 Beat：${durationRow.value.planned_beat_count} 个`, `Story 模板：${storyTemplateRef}`, `候选差异：仅在精确同长的 Beat 内调整 ${changedEvidence}；另一候选保持来源时间顺序。`, `将从同一 Evidence/Duration 上下文生成两套可执行且不同的 Story，仍需后续人工批准。`];
      const review: Stage2ProductGenerationReview = { schema_version: 1, stage: input.stage, workspace_digest: input.workspace_digest, effect_digest: editorialObjectDigest({ stage: input.stage, workspace_digest: input.workspace_digest, direction_ref: { object_id: selected.object_id, object_version: selected.object_version, digest: selected.digest }, material_pack_ref: directionRow.value.material_pack_ref, duration_feasibility_ref: directionRow.value.duration_feasibility_ref, story_template_ref: storyTemplateRef, beat_plan_digest: beatPlanDigest, evidence_order_digest: evidenceOrderDigest, reason: input.reason }), approval_bundle: [], summary };
      return { input, review, plan: { contractRow, contractRef, directionRow, packRow, durationRow, evaluationRows, storyIds, storyBeatBudgets, orderedEvidence, alternativeEvidence, storyTemplateRef } };
    }
    const planCard = workspace.approved_plans.find((item: any) => item.status === "approved"); if (!planCard) throw new Error("PRODUCT_GENERATION_APPROVED_STORY_UNAVAILABLE");
    const planRow = readEditorialArtifact(this.session, projectId, "approved_story_plan_v2", planCard.object_id, planCard.object_version) as any;
    if (!planRow || planRow.object_hash !== planCard.digest) throw new Error("PRODUCT_GENERATION_APPROVED_STORY_UNAVAILABLE");
    const intentIdentity = editorialObjectDigest({ plan_ref: { object_id: planRow.value.plan_id, object_version: planRow.value.object_version, digest: planRow.object_hash }, decision_ref: planRow.value.decision_ref }), intentId = `product-intent-${intentIdentity.slice(0, 24)}`, existingIntent = workspace.intents.find((item: any) => !item.feedback_diagnosis_ref && item.object_id === intentId && item.status === "candidate");
    if (workspace.intents.some((item: any) => !item.feedback_diagnosis_ref && (!existingIntent || item.object_id !== intentId))) throw new Error("PRODUCT_GENERATION_INTENT_ALREADY_AVAILABLE");
    const summary = [`Approved Story：${planCard.object_id}@${planCard.object_version}#${planCard.digest}`, `Beat：${planRow.value.beats.length} 个`, `将生成仅含 semantic-evidence-selection 的候选 Edit Intent；不会修改 Timeline。`];
    const review: Stage2ProductGenerationReview = { schema_version: 1, stage: input.stage, workspace_digest: input.workspace_digest, effect_digest: editorialObjectDigest({ stage: input.stage, workspace_digest: input.workspace_digest, plan_ref: { object_id: planCard.object_id, object_version: planCard.object_version, digest: planCard.digest }, decision_ref: planRow.value.decision_ref, reason: input.reason }), approval_bundle: [], summary };
    return { input, review, plan: { contractRow, contractRef, planRow, intentIdentity, intentId, existingIntent } };
  }

  async prepareStage2ProductGenerationReview(rawInput: Stage2ProductGenerationInput): Promise<Stage2ProductGenerationReview> {
    return (await this.prepareStage2ProductGenerationInternal(rawInput)).review;
  }

  async performStage2ProductGeneration(channelCredential: object, rawInput: Stage2ProductGenerationInput, confirmedReview?: Stage2ProductGenerationReview): Promise<unknown> {
    if (!this.stage2HumanReviewChannels.has(channelCredential)) throw new Error("PERMISSION_HUMAN_CHANNEL_UNTRUSTED");
    const prepared = await this.prepareStage2ProductGenerationInternal(rawInput);
    if (!confirmedReview || editorialObjectDigest(confirmedReview) !== editorialObjectDigest(prepared.review)) throw new Error("PRODUCT_GENERATION_REVIEW_REQUIRED_OR_STALE");
    if (!this.session) throw new Error("project is not open");
    const { input, plan } = prepared, projectId = this.session.manifest.project_id;
    const registerApproval = async (approval: Stage2ProductGenerationApprovalReview): Promise<string> => {
      const approvalId = `product-generation-${approval.effect_digest.slice(0, 16)}-${randomUUID()}`;
      await this.registerStage2HumanApproval(channelCredential, { approval_id: approvalId, action: approval.action, subject_ref: approval.subject_ref, context_refs: approval.context_refs, requested_data_fields: approval.requested_data_fields, affected_scope: approval.affected_scope, effect_digest: approval.effect_digest, reason: approval.reason, expires_at: new Date(this.now() + 10 * 60_000).toISOString() });
      return approvalId;
    };
    if (input.stage === "material") {
      const { contractRow, contractRef, timeline, location, evidenceStates, coverage, definition, definitionRef, blueprint, blueprintRef, materialPolicyVersion, materialAuthorityRef, materialIdentity, materialBeatBudgets, skillInvocation, skillIdentity, durationIdentity, directionIds, permissionCurrent } = plan;
      if (!permissionCurrent) {
        const approval = prepared.review.approval_bundle.find((item) => item.action === "material_permission.record"); if (!approval) throw new Error("PRODUCT_GENERATION_APPROVAL_BUNDLE_INCOMPLETE");
        const approvalId = await registerApproval(approval);
        await this.recordMaterialPermission({ asset_id: location.asset_id, asset_location_id: location.asset_location_id, permission_state: "authorized", contract_ref: contractRef, approval_id: approvalId, policy_ref: contractRow.value.rights_policy_ref });
      }
      const currentOriginal = (listAssetLocationsForAssets(this.session, projectId, [location.asset_id]) as PersistedAssetLocation[]).find((candidate) => candidate.asset_location_id === location.asset_location_id && candidate.location_type === "original"), currentImmutable = currentOriginal ? this.immutableOriginalForSource(currentOriginal) : undefined;
      if (!currentOriginal || !currentImmutable || currentOriginal.metadata?.permission_state !== "authorized" || currentOriginal.metadata.permission_decision?.permission_state !== "authorized" || !versionedRefMatches(currentOriginal.metadata.permission_decision.policy_ref, contractRow.value.rights_policy_ref) || currentImmutable.metadata?.permission_state !== "authorized" || currentImmutable.metadata.permission_decision?.permission_state !== "authorized" || !versionedRefMatches(currentImmutable.metadata.permission_decision.policy_ref, contractRow.value.rights_policy_ref) || !this.stage2ImmutableLocationIsCurrent(currentImmutable) || !(await this.persistedLocationHasCurrentIdentity(currentImmutable))) throw new Error("PRODUCT_GENERATION_IMMUTABLE_ORIGINAL_UNAVAILABLE_OR_STALE");
      for (const state of evidenceStates) {
        const { candidate, candidateDigest, needsApproval } = state;
        let row = readEvidenceObject(this.session, candidate.evidence_id) as any;
        if (!row) { this.registerEvidence(candidate); row = readEvidenceObject(this.session, candidate.evidence_id) as any; }
        const { review: _review, ...storedBase } = row?.value ?? {};
        if (!row || editorialObjectDigest({ ...storedBase, review_status: "candidate" }) !== candidateDigest || !["candidate", "approved"].includes(row.value.review_status)) throw new Error(`PRODUCT_GENERATION_EVIDENCE_CONFLICT:${candidate.evidence_id}`);
        if (needsApproval) {
          const approval = prepared.review.approval_bundle.find((item) => item.action === "evidence.approve" && item.subject_ref.object_id === candidate.evidence_id && item.subject_ref.digest === candidateDigest); if (!approval) throw new Error("PRODUCT_GENERATION_APPROVAL_BUNDLE_INCOMPLETE");
          const approvalId = await registerApproval(approval);
          await this.approveEvidence({ evidence_id: candidate.evidence_id, evidence_version: 1, review_digest: candidateDigest, approval_id: approvalId, reason: input.reason });
        }
      }
      const createdAt = contractRow.value.created_at, pack = await this.assembleStage2ProductMaterialEvidencePack({ pack_id: `product-pack-${materialIdentity.slice(0, 24)}`, contract_ref: contractRef, evidence_ids: evidenceStates.map((item: any) => item.candidate.evidence_id), coverage_matrix: coverage, expected_media_verified_at: { [location.asset_id]: location.verified_at }, policy_version: materialPolicyVersion, timeline_version: timeline.version, created_at: createdAt }) as any, packRef = { object_id: pack.value.pack_id, object_version: pack.value.object_version, digest: pack.object_hash };
      this.pinBuiltInCreativeSkillDefinition(definition.skill_id, definition.skill_version);
      const evaluation = await this.evaluateCreativeSkillKnowledge({ evaluation_id: `product-evaluation-${skillIdentity.slice(0, 24)}`, definition_ref: definitionRef, contract_ref: contractRef, material_pack_ref: packRef, context_tags: skillInvocation.context_tags, parameter_values: skillInvocation.parameter_values, evaluated_at: createdAt }) as any, evaluationRef = { object_id: evaluation.value.evaluation_id, object_version: evaluation.value.object_version, digest: evaluation.object_hash };
      this.pinBuiltInDurationBlueprint(blueprint.blueprint_id, blueprint.blueprint_version);
      const duration = await this.evaluateDurationBlueprint({ feasibility_id: `product-duration-${durationIdentity.slice(0, 24)}`, blueprint_ref: blueprintRef, contract_ref: contractRef, material_pack_ref: packRef, evaluated_at: createdAt }) as any;
      if (duration.value.result !== "feasible") throw new Error(`PRODUCT_GENERATION_DURATION_BLOCKED:${duration.value.blockers.join(",")}`);
      const evaluatedBeatBudgets = allocateDurationBeatBudgets(duration.value);
      if (editorialObjectDigest(evaluatedBeatBudgets) !== editorialObjectDigest(materialBeatBudgets)) throw new Error("PRODUCT_GENERATION_DURATION_BEAT_PLAN_REBOUND");
      const durationRef = { object_id: duration.value.feasibility_id, object_version: duration.value.object_version, digest: duration.object_hash }, requirementSummary = contractRow.value.requirements.filter((item: any) => item.kind === "hard").map((item: any) => item.statement).join("；");
      await this.createStoryDirection({ direction_id: directionIds[0], title: `证据优先：${contractRow.value.creator_goal}`, thesis: `以已批准素材证据回应：${requirementSummary}`, contract_ref: contractRef, material_pack_ref: packRef, skill_evaluation_refs: [evaluationRef], duration_feasibility_ref: durationRef, expected_benefits: ["每个硬要求绑定已批准 Evidence"], risks: [], alternatives: [], confidence: { score: 0.9, basis: ["当前 Material Evidence Pack 覆盖全部硬要求"] }, created_at: createdAt });
      await this.createStoryDirection({ direction_id: directionIds[1], title: `时间顺序：${contractRow.value.creator_goal}`, thesis: `按当前素材顺序呈现并回应：${requirementSummary}`, contract_ref: contractRef, material_pack_ref: packRef, skill_evaluation_refs: [evaluationRef], duration_feasibility_ref: durationRef, expected_benefits: ["来源顺序清晰且证据可追溯"], risks: ["时间顺序可能弱化转折"], alternatives: [], confidence: { score: 0.8, basis: ["全部陈述已由用户逐条确认"] }, created_at: createdAt });
      return this.readStage2Workspace();
    }
    if (input.stage === "story") {
      const { contractRow, contractRef, directionRow, packRow, durationRow, evaluationRows, storyIds, storyBeatBudgets, orderedEvidence, alternativeEvidence, storyTemplateRef } = plan, packRef = directionRow.value.material_pack_ref, durationRef = directionRow.value.duration_feasibility_ref, directionRef = { object_id: directionRow.value.direction_id, object_version: directionRow.value.object_version, digest: directionRow.object_hash }, evaluationRefs = directionRow.value.skill_evaluation_refs, coverage = readCoverageMatrix(this.session, projectId, packRow.value.coverage_matrix_ref) as CoverageMatrix | null;
      if (!coverage) throw new Error("PRODUCT_GENERATION_COVERAGE_UNAVAILABLE");
      const rows = new Map(coverage.rows.map((item) => [item.requirement_id, item])), hardRequirements = contractRow.value.requirements.filter((item: any) => item.kind === "hard");
      const beats = (chronology: boolean, evidenceOrder: readonly any[]) => storyBeatBudgets.map((budget: DurationBeatBudget, index: number, sequence: readonly DurationBeatBudget[]) => {
        const evidence = evidenceOrder[index];
        const ownedRequirements = hardRequirements.filter((requirement: any) => rows.get(requirement.requirement_id)?.evidence_ids.includes(evidence.evidence_id)), requirementIds = ownedRequirements.map((item: any) => item.requirement_id), ref = { object_id: evidence.evidence_id, object_version: evidence.evidence_version, digest: evidence.content_digest };
        const emotion = durationRow.value.emotional_curve[Math.min(durationRow.value.emotional_curve.length - 1, Math.floor(index * durationRow.value.emotional_curve.length / sequence.length))];
        return { beat_id: `${chronology ? "chronology" : "equal-duration-alternative"}-${budget.role_id}-${budget.role_beat_index + 1}`, role: budget.role_id, purpose: ownedRequirements.length ? ownedRequirements.map((item: any) => item.statement).join("；") : `推进 ${budget.role_id}`, target_duration: { ...budget.duration }, evidence_refs: [ref], alternative_evidence_refs: [], coverage_requirement_ids: requirementIds, entry_state: index === 0 ? "open" : `state-${index}`, exit_state: index === sequence.length - 1 ? "resolved" : `state-${index + 1}`, desired_emotion: emotion.phase, continuity_constraints: index === 0 ? [] : [`承接 state-${index}`], reason: chronology ? `按来源时间顺序以已批准 Evidence 支持 ${budget.role_id}` : `在精确同长 Beat 内调整已批准 Evidence 顺序以支持 ${budget.role_id}`, confidence: { score: chronology ? 0.86 : 0.86, basis: ["Evidence、Coverage、planned Beat count 与 Duration 均为当前精确引用"] }, risks: [], unresolved_assumptions: [] };
      });
      const base = { direction_ref: directionRef, contract_ref: contractRef, material_pack_ref: packRef, skill_evaluation_refs: evaluationRefs, duration_feasibility_ref: durationRef, risks: [], alternatives: [], created_at: directionRow.value.created_at };
      await this.proposeStage2ProductStoryV2({ ...base, proposal_id: storyIds[0], thesis: `在精确同长 Beat 间调整素材顺序：${directionRow.value.thesis}`, audience_promise: `以可追溯的等时长替代顺序回应${contractRow.value.creator_goal}`, beats: beats(false, alternativeEvidence), risks: ["精确同长 Beat 间的 Evidence 顺序不同于来源时间顺序"] });
      await this.proposeStage2ProductStoryV2({ ...base, proposal_id: storyIds[1], thesis: `按素材顺序呈现：${directionRow.value.thesis}`, audience_promise: `以可追溯顺序回应${contractRow.value.creator_goal}`, beats: beats(true, orderedEvidence), risks: ["时间顺序可能弱化转折"] });
      void evaluationRows;
      return this.readStage2Workspace();
    }
    const { planRow, intentIdentity, intentId, existingIntent } = plan;
    if (existingIntent) return this.readStage2Workspace();
    await this.generateEditorialIntent({ plan_id: planRow.value.plan_id, decision_ids: [planRow.value.decision_ref.object_id], capability_snapshot_id: `product-capabilities-${intentIdentity.slice(0, 24)}`, intent_id: intentId, operations: planRow.value.beats.map((beat: any, index: number) => ({ operation_id: `select-${beat.beat_id}`, kind: "select_evidence", target_refs: [`beat:${beat.beat_id}`, `evidence:${beat.evidence_refs[0].object_id}`], parameter_values: { priority: index + 1 }, expected_effect: `将已批准 Evidence ${beat.evidence_refs[0].object_id} 绑定到 ${beat.role}`, required_capabilities: ["semantic-evidence-selection"], unsupported_policy: "block" })), preconditions: ["Timeline 与 Approved Story 保持当前"], reason: input.reason, alternatives: ["保持当前 Timeline"], risks: [], confidence: { score: 0.9, basis: ["每个操作绑定 Approved Story 中的精确 Evidence"] }, actor: { actor_id: "project-host", actor_kind: "policy" }, created_at: planRow.value.created_at });
    return this.readStage2Workspace();
  }

  async prepareStage2ProductActionReview(rawInput: Stage2ProductActionInput): Promise<EditorialIntentExecutionReview | undefined> {
    if (!this.session) throw new Error("project is not open");
    const input = parseStage2ProductActionInput(rawInput);
    if (input.action !== "intent.execute") return undefined;
    if (!input.reason.trim()) throw new Error("PRODUCT_ACTION_REASON_REQUIRED");
    const workspace = await this.readStage2Workspace() as any;
    if (workspace.workspace_digest !== input.workspace_digest) throw new Error("PRODUCT_WORKSPACE_STALE");
    const visibleIntent = workspace.intents.find((item: any) => item.object_id === input.intent_id);
    if (!visibleIntent || visibleIntent.status !== "candidate") throw new Error("PRODUCT_INTENT_UNAVAILABLE_OR_STALE");
    const executionId = `product-execution-${editorialObjectDigest({ workspace_digest: input.workspace_digest, intent_id: input.intent_id, proposal_approval_decision_id: input.proposal_approval_decision_id }).slice(0, 24)}`;
    return this.prepareEditorialIntentExecution({ execution_id: executionId, intent_id: input.intent_id, proposal_approval_decision_id: input.proposal_approval_decision_id });
  }

  async performStage2ProductAction(channelCredential: object, rawInput: Stage2ProductActionInput, confirmedExecutionReview?: EditorialIntentExecutionReview): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const input = parseStage2ProductActionInput(rawInput);
    if (!input.reason.trim()) throw new Error("PRODUCT_ACTION_REASON_REQUIRED");
    const workspace = await this.readStage2Workspace() as any;
    if (workspace.workspace_digest !== input.workspace_digest) throw new Error("PRODUCT_WORKSPACE_STALE");
    if (input.action === "story.approve" && workspace.approved_plans.some((item: any) => item.status === "approved")) throw new Error("PRODUCT_STORY_CANDIDATE_SET_ALREADY_APPROVED");
    if (["intent.approve", "intent.execute", "feedback.reject"].includes(input.action)) {
      const visibleIntent = workspace.intents.find((item: any) => item.object_id === stage2ProductActionTargetId(input));
      if (!visibleIntent || visibleIntent.status !== "candidate") throw new Error("PRODUCT_INTENT_UNAVAILABLE_OR_STALE");
    }
    const projectId = this.session.manifest.project_id;
    const registerApproval = async (action: Stage2PermissionRequestV1["action"], subject: Stage2PermissionTypedRef, contexts: readonly Stage2PermissionTypedRef[], requestedFields: readonly string[], scope: readonly string[], effectDigest: string, approvalReason = input.reason): Promise<string> => {
      const approvalId = `product-approval-${effectDigest.slice(0, 16)}-${randomUUID()}`;
      await this.registerStage2HumanApproval(channelCredential, { approval_id: approvalId, action, subject_ref: subject, context_refs: contexts, requested_data_fields: requestedFields, affected_scope: scope, effect_digest: effectDigest, reason: approvalReason, expires_at: new Date(this.now() + 10 * 60_000).toISOString() });
      return approvalId;
    };
    if (input.action === "contract.approve") {
      const contract = workspace.contract;
      if (!contract || contract.object_id !== input.contract_id || !["draft", "review"].includes(contract.status)) throw new Error("PRODUCT_CONTRACT_UNAVAILABLE_OR_STALE");
      const contractRow = readCreativeContractVersion(this.session, projectId, contract.object_id, contract.object_version) as any;
      if (!contractRow || contractRow.object_hash !== contract.digest || !["draft", "review"].includes(contractRow.lifecycle_status)) throw new Error("PRODUCT_CONTRACT_UNAVAILABLE_OR_STALE");
      resolveStage2ProductDurationBlueprint(contractRow.value.target_duration);
      const subject: Stage2PermissionTypedRef = { object_type: "creative_contract", object_id: contract.object_id, object_version: contract.object_version, digest: contract.digest };
      const effect = { contract_id: contract.object_id, object_version: contract.object_version, review_digest: contract.digest, outcome: "approved" };
      const effectDigest = stage2PermissionEffectDigest("creative_contract.approve", effect);
      const approvalId = await registerApproval("creative_contract.approve", subject, [], ["reason", "review_digest"], [permissionRefKey(subject)], effectDigest, "approve exact Creative Contract review");
      return this.approveCreativeContract({ contract_id: contract.object_id, object_version: contract.object_version, review_digest: contract.digest, approval_id: approvalId });
    }
    if (input.action === "direction.select") {
      if (!input.selected_id) throw new Error("PRODUCT_DIRECTION_SELECTION_REQUIRED");
      const rawRows = workspace.directions.filter((item: any) => item.status === "candidate").map((item: any) => readEditorialArtifact(this.session!, projectId, "direction_card", item.object_id, item.object_version)) as any[];
      const selectedRow = rawRows.find((row) => row?.value?.direction_id === input.selected_id); if (!selectedRow || rawRows.length < 2) throw new Error("PRODUCT_DIRECTION_COMPARISON_UNAVAILABLE");
      const directionIds = rawRows.map((row) => row.value.direction_id); if (this.directionCandidateSetWasSelected(projectId, directionIds)) throw new Error("DIRECTION_CANDIDATE_SET_ALREADY_SELECTED");
      const contractRef = selectedRow.value.contract_ref, subject: Stage2PermissionTypedRef = { object_type: "direction_card", object_id: selectedRow.value.direction_id, object_version: selectedRow.value.object_version, digest: selectedRow.object_hash }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "material_evidence_pack", ...selectedRow.value.material_pack_ref }, { object_type: "duration_feasibility", ...selectedRow.value.duration_feasibility_ref }];
      const candidateRefs = rawRows.map((row) => ({ object_id: row.value.direction_id, object_version: row.value.object_version, digest: row.object_hash })).sort((left, right) => left.object_id.localeCompare(right.object_id)), reviewDigest = selectedRow.object_hash, decisionId = `product-direction-${editorialObjectDigest({ workspace_digest: input.workspace_digest, candidate_refs: candidateRefs, selected_direction_id: input.selected_id }).slice(0, 24)}`, effect = { direction_ids: rawRows.map((row) => row.value.direction_id).sort(), candidate_refs: candidateRefs, selected_direction_id: input.selected_id, decision_id: decisionId, reason: input.reason, review_digest: reviewDigest }, effectDigest = stage2PermissionEffectDigest("direction_card.select", effect), approvalId = await registerApproval("direction_card.select", subject, contexts, ["alternatives", "reason", "review_digest", "selected_ref"], [permissionRefKey(subject)], effectDigest);
      return this.selectStoryDirectionInternal(directionIds, { approval_id: approvalId, decision_id: decisionId, reason: input.reason, review_digest: reviewDigest, selected_direction_id: input.selected_id }, candidateRefs);
    }
    if (input.action === "story.approve") {
      if (!input.selected_id) throw new Error("PRODUCT_STORY_SELECTION_REQUIRED");
      const rawRows = workspace.stories.filter((item: any) => item.status === "candidate").map((item: any) => readEditorialArtifact(this.session!, projectId, "story_proposal_v2", item.object_id, item.object_version)) as any[];
      const selectedRow = rawRows.find((row) => row?.value?.proposal_id === input.selected_id); if (!selectedRow || rawRows.length < 2) throw new Error("PRODUCT_STORY_COMPARISON_UNAVAILABLE");
      const proposalIds = rawRows.map((row) => row.value.proposal_id); if (this.storyCandidateSetWasApproved(projectId, proposalIds)) throw new Error("STORY_CANDIDATE_SET_ALREADY_APPROVED");
      const contractRef = selectedRow.value.contract_ref, subject: Stage2PermissionTypedRef = { object_type: "story_proposal_v2", object_id: selectedRow.value.proposal_id, object_version: selectedRow.value.object_version, digest: selectedRow.object_hash }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "direction_card", ...selectedRow.value.direction_ref }, { object_type: "material_evidence_pack", ...selectedRow.value.material_pack_ref }, { object_type: "duration_feasibility", ...selectedRow.value.duration_feasibility_ref }];
      const candidateRefs = rawRows.map((row) => ({ object_id: row.value.proposal_id, object_version: row.value.object_version, digest: row.object_hash })).sort((left, right) => left.object_id.localeCompare(right.object_id)), reviewDigest = selectedRow.object_hash, identityDigest = editorialObjectDigest({ workspace_digest: input.workspace_digest, candidate_refs: candidateRefs, selected_proposal_id: input.selected_id }), decisionId = `product-story-${identityDigest.slice(0, 24)}`, planId = `product-plan-${identityDigest.slice(0, 24)}`, effect = { proposal_ids: rawRows.map((row) => row.value.proposal_id).sort(), candidate_refs: candidateRefs, selected_proposal_id: input.selected_id, decision_id: decisionId, plan_id: planId, reason: input.reason, review_digest: reviewDigest }, effectDigest = stage2PermissionEffectDigest("story_plan.approve", effect), approvalId = await registerApproval("story_plan.approve", subject, contexts, ["alternatives", "reason", "review_digest", "selected_ref"], [permissionRefKey(subject)], effectDigest);
      return this.approveStoryCandidatesInternal(proposalIds, { approval_id: approvalId, decision_id: decisionId, plan_id: planId, reason: input.reason, review_digest: reviewDigest, selected_proposal_id: input.selected_id }, candidateRefs);
    }
    if (!input.intent_id) throw new Error("PRODUCT_INTENT_REQUIRED");
    const intentRow = readEditorialArtifact(this.session, projectId, "editorial_edit_intent", input.intent_id, 1) as any;
    if (!intentRow || intentRow.lifecycle_status !== "candidate") throw new Error("PRODUCT_INTENT_UNAVAILABLE_OR_STALE");
    const intentRef: Stage2PermissionTypedRef = { object_type: "editorial_edit_intent", object_id: intentRow.value.intent_id, object_version: intentRow.value.object_version, digest: intentRow.object_hash };
    if (input.action === "intent.approve") {
      const contractRef = intentRow.value.contract_ref, decisionRefs = intentRow.value.decision_refs as readonly Readonly<{ object_id: string; object_version: number; digest: string }>[], contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "approved_story_plan_v2", ...intentRow.value.approved_story_ref }, ...decisionRefs.map((reference) => ({ object_type: "decision_record" as const, ...reference })), { object_type: "capability_snapshot", ...intentRow.value.capability_snapshot_ref }];
      if (intentRow.value.feedback_diagnosis_ref) { const diagnosis = readFeedbackDiagnosis(this.session, projectId, intentRow.value.feedback_diagnosis_ref.object_id, intentRow.value.feedback_diagnosis_ref.object_version) as any; if (!diagnosis || diagnosis.object_hash !== intentRow.value.feedback_diagnosis_ref.digest) throw new Error("PRODUCT_FEEDBACK_DIAGNOSIS_REBOUND"); contexts.push({ object_type: "feedback_diagnosis", ...intentRow.value.feedback_diagnosis_ref }, { object_type: "intelligence_edit_execution", ...diagnosis.value.base_execution_ref }); }
      const scope = [...new Set<string>(intentRow.value.operations.flatMap((operation: any): string[] => operation.target_refs ?? []))].sort(), effect = { intent_ref: intentRef, expected_effects: intentRow.value.operations.map((operation: any) => ({ operation_id: operation.operation_id, expected_effect: operation.expected_effect, target_refs: operation.target_refs })), reason: input.reason, review_digest: intentRow.object_hash }, effectDigest = stage2PermissionEffectDigest("editorial_edit_intent.approve", effect), approvalId = await registerApproval("editorial_edit_intent.approve", intentRef, contexts, ["expected_effects", "reason", "review_digest"], scope, effectDigest);
      return this.approveEditorialIntent({ intent_id: input.intent_id, approval_id: approvalId, reason: input.reason, review_digest: intentRow.object_hash });
    }
    if (input.action === "feedback.reject") {
      if (!intentRow.value.feedback_diagnosis_ref) throw new Error("PRODUCT_FEEDBACK_INTENT_REQUIRED"); const diagnosis = readFeedbackDiagnosis(this.session, projectId, intentRow.value.feedback_diagnosis_ref.object_id, intentRow.value.feedback_diagnosis_ref.object_version) as any; if (!diagnosis || diagnosis.object_hash !== intentRow.value.feedback_diagnosis_ref.digest) throw new Error("PRODUCT_FEEDBACK_DIAGNOSIS_REBOUND");
      const contexts: Stage2PermissionTypedRef[] = [{ object_type: "feedback_diagnosis", ...intentRow.value.feedback_diagnosis_ref }, { object_type: "intelligence_edit_execution", ...diagnosis.value.base_execution_ref }, { object_type: "creative_contract", ...intentRow.value.contract_ref }, { object_type: "approved_story_plan_v2", ...intentRow.value.approved_story_ref }], effect = { intent_ref: intentRef, diagnosis_ref: contexts[0], reason: input.reason, review_digest: intentRow.object_hash }, effectDigest = stage2PermissionEffectDigest("feedback_revision.reject", effect), approvalId = await registerApproval("feedback_revision.reject", intentRef, contexts, ["reason", "review_digest"], diagnosis.value.affected_scope, effectDigest);
      return this.rejectFeedbackRevision({ intent_id: input.intent_id, approval_id: approvalId, reason: input.reason, review_digest: intentRow.object_hash });
    }
    if (input.action !== "intent.execute" || !input.proposal_approval_decision_id) throw new Error("PRODUCT_EXECUTION_APPROVAL_REQUIRED");
    if (!confirmedExecutionReview) throw new Error("PRODUCT_EXECUTION_REVIEW_REQUIRED");
    const executionId = `product-execution-${editorialObjectDigest({ workspace_digest: input.workspace_digest, intent_id: input.intent_id, proposal_approval_decision_id: input.proposal_approval_decision_id }).slice(0, 24)}`, review = await this.prepareEditorialIntentExecution({ execution_id: executionId, intent_id: input.intent_id, proposal_approval_decision_id: input.proposal_approval_decision_id });
    if (editorialObjectDigest(confirmedExecutionReview) !== editorialObjectDigest(review)) throw new Error("PRODUCT_EXECUTION_REVIEW_STALE");
    const approvalId = await registerApproval("editorial_edit_intent.execute", review.subject_ref, review.context_refs, review.requested_data_fields, review.affected_scope, review.effect_digest);
    return this.executeApprovedEditorialIntent({ execution_id: executionId, intent_id: input.intent_id, proposal_approval_decision_id: input.proposal_approval_decision_id, execution_approval_id: approvalId, reason: input.reason });
  }
  registerMediaDependency(assetId: AssetId, artifactRefId: string, dependencyId = `${assetId}:${artifactRefId}`): void { if (!this.session) throw new Error("project is not open"); persistMediaDependency(this.session, this.session.manifest.project_id, { dependency_id: dependencyId, asset_id: assetId, artifact_ref_id: artifactRefId }); }

  private presetResolutionContext(timeline: Timeline, output: CreativeSkillOutput, applicationContext: PresetApplicationContext = {}): PresetResolutionContext {
    const capabilities = new Map([...timelineRenderCapabilities].map(([name, capability]) => [name, { preview: capability.preview === true, master: capability.master === true }]));
    const declaredAssetIds = new Set<string>();
    for (const selection of output.selections) for (const asset of this.presetRegistry.find(selection.preset_id, selection.preset_version)?.definition.assets ?? []) declaredAssetIds.add(asset.asset_id);
    const verifiedAssets = new Set<string>();
    const declaredLocations = declaredAssetIds.size === 0 ? [] : listAssetLocationsForAssets(this.session!, this.session!.manifest.project_id, [...declaredAssetIds]) as readonly PersistedAssetLocation[];
    for (const location of declaredLocations) if (declaredAssetIds.has(location.asset_id) && location.location_type === "original" && persistedLocationIsCurrent(location)) verifiedAssets.add(location.asset_id);
    const sequence = timeline.sequence;
    const timelineDuration = timeline.tracks.flatMap((track) => track.clips).reduce<bigint>((maximum, clip) => maximum > clip.timeline_start + clip.timeline_duration ? maximum : clip.timeline_start + clip.timeline_duration, 0n);
    return { trusted_definition_digests: this.trustedPresetDigests, revoked_definition_digests: this.revokedPresetDigests, license_statuses: this.presetLicenseStatuses, available_asset_ids: verifiedAssets, trusted_bake_asset_ids: new Set(), capabilities, ...(applicationContext.aspect_ratio ? { aspect_ratio: applicationContext.aspect_ratio } : {}), ...(timelineDuration > 0n && sequence?.timebase ? { timeline_duration: { value: timelineDuration * sequence.timebase.value, timescale: sequence.timebase.timescale } } : {}) };
  }

  private presetRenderSources(timeline: Timeline): Readonly<{ sources?: ReadonlyMap<string, RenderSourceRef>; source_identity_hash?: string; diagnostics: PresetResolution["diagnostics"] }> {
    const clips = timeline.tracks.flatMap((track) => track.clips);
    const assetIds = new Set(clips.map((clip) => clip.source.asset_id));
    const locations = listAssetLocationsForAssets(this.session!, this.session!.manifest.project_id, [...assetIds]) as readonly PersistedAssetLocation[];
    const sources = new Map<string, RenderSourceRef>();
    const diagnostics: Array<Readonly<{ code: string; message: string }>> = [];
    for (const assetId of assetIds) {
      const matches = locations.filter((location) => location.asset_id === assetId && persistedLocationIsCurrent(location));
      const original = matches.find((location) => location.location_type === "original");
      const proxy = matches.find((location) => location.location_type === "proxy");
      if (!original) {
        if (proxy) {
          diagnostics.push({ code: "MASTER_ORIGINAL_REQUIRED", message: `Preset render validation requires a verified Original: ${assetId}` });
          if (!proxy.metadata?.proxy_map) diagnostics.push({ code: "PROXY_MAP_REQUIRED", message: `Preset render validation requires a persisted ProxyMap: ${assetId}` });
        } else diagnostics.push({ code: "PRESET_RENDER_SOURCE_MISSING", message: `Preset render validation has no verified source: ${assetId}` });
        continue;
      }
      const sourceTimescale = clips.find((clip) => clip.source.asset_id === assetId)!.source.timescale;
      const originalHasAudio = persistedProbeAudioState(original);
      if (originalHasAudio === undefined) {
        diagnostics.push({ code: "PRESET_AUDIO_IDENTITY_UNVERIFIED", message: `Preset render validation requires persisted Original audio probe facts: ${assetId}` });
        continue;
      }
      const originalGeometry = probeVideoGeometry(original.metadata?.probe);
      const base: RenderSourceRef = { asset_ref: assetId, original_ref: original.location_ref, original_object_ref: original.asset_location_id, source_timescale: sourceTimescale, original_timescale: sourceTimescale, ...(originalGeometry ? { original_width: originalGeometry.width, original_height: originalGeometry.height } : {}), has_audio: originalHasAudio };
      if (proxy?.metadata?.proxy_map) {
        try {
          const proxyHasAudio = persistedProbeAudioState(proxy);
          if (proxyHasAudio === undefined) { diagnostics.push({ code: "PRESET_PROXY_AUDIO_UNVERIFIED", message: `Preset render validation requires persisted Proxy audio probe facts: ${assetId}` }); continue; }
          if (proxyHasAudio !== originalHasAudio) { diagnostics.push({ code: "PRESET_PROXY_AUDIO_MISMATCH", message: `Preset render validation cannot represent divergent Original/Proxy audio identity: ${assetId}` }); continue; }
          const proxyMap = reviveProxyMap(proxy.metadata.proxy_map);
          const proxyGeometry = probeVideoGeometry(proxy.metadata?.probe);
          sources.set(assetId, { ...base, proxy_ref: proxy.location_ref, proxy_object_ref: proxy.asset_location_id, proxy_timescale: proxyMap.proxy_timebase, proxy_map: proxyMap, ...(proxyGeometry ? { proxy_width: proxyGeometry.width, proxy_height: proxyGeometry.height } : {}) });
          continue;
        } catch { /* an invalid optional proxy falls back to the verified Original */ }
      }
      sources.set(assetId, base);
    }
    if (diagnostics.length > 0) return { diagnostics };
    return { sources, source_identity_hash: renderSourceIdentityHash(sources.values()), diagnostics: [] };
  }

  private linkPresetApplicationToRender(timeline: Timeline, sources: Iterable<RenderSourceRef>, previewPlan: ExecutionPlan, masterPlan: ExecutionPlan): PresetApplicationRenderLink | undefined {
    const envelope = ([...listPresetApplications(this.session!, this.session!.manifest.project_id)] as Array<{ record_type?: string; value?: unknown }>).reverse().find((candidate) => {
      const value = candidate.value as { status?: string; final_timeline_version?: number } | undefined;
      return candidate.record_type === "preset_application" && value?.status === "applied" && value.final_timeline_version === timeline.version;
    });
    if (!envelope?.value) return undefined;
    assertPresetApplicationRecordV1(envelope.value);
    const application = envelope.value as PresetApplicationRecord;
    const validation = application.render_validation;
    const candidateResolution = this.presetRenderSources(timeline);
    if (!candidateResolution.sources || candidateResolution.diagnostics.length > 0) throw new Error(`PRESET_RENDER_APPLICATION_LINK_MISMATCH:${application.application_id}:candidate_source`);
    const actualSources = new Map([...sources].map((source) => [source.asset_ref, source]));
    if (actualSources.size !== candidateResolution.sources.size || [...candidateResolution.sources].some(([assetId, candidate]) => {
      const actual = actualSources.get(assetId);
      return !actual || actual.original_ref !== candidate.original_ref || actual.source_timescale !== candidate.source_timescale || actual.has_audio !== candidate.has_audio;
    })) throw new Error(`PRESET_RENDER_APPLICATION_LINK_MISMATCH:${application.application_id}:source_authority`);
    if (!validation || validation.semantic_graph_hash !== previewPlan.semantic_graph_hash || validation.semantic_graph_hash !== masterPlan.semantic_graph_hash) throw new Error(`PRESET_RENDER_APPLICATION_LINK_MISMATCH:${application.application_id}:semantic_graph`);
    for (const link of validation.semantic_links) {
      const plan = link.target === "preview" ? previewPlan : masterPlan;
      const actualNodes = new Set(plan.decisions.filter((decision) => decision.capability === link.actual_capability && decision.outcome !== "block").map((decision) => decision.node_id));
      if (link.actual_node_ids.length === 0 || !link.actual_node_ids.every((nodeId) => actualNodes.has(nodeId))) throw new Error(`PRESET_RENDER_APPLICATION_LINK_MISMATCH:${application.application_id}:${link.semantic_id}:${link.target}`);
    }
    return {
      schema_version: 1,
      application_id: application.application_id,
      timeline_version: timeline.version,
      semantic_graph_hash: validation.semantic_graph_hash,
      candidate_source_identity_hash: validation.source_identity_hash,
      actual_source_identity_hash: renderSourceIdentityHash(sources),
      candidate_preview_plan_id: validation.preview_plan_id,
      candidate_master_plan_id: validation.master_plan_id,
      actual_preview_plan_id: previewPlan.plan_id,
      actual_master_plan_id: masterPlan.plan_id,
      actual_preview_cache_key: previewPlan.cache_key,
      actual_master_cache_key: masterPlan.cache_key,
      verified_semantic_links: validation.semantic_links.length,
    };
  }

  private validatePresetRender(timeline: Timeline, resolution: PresetResolution, applicationContext: PresetApplicationContext): Readonly<{ validation?: PresetRenderValidation; diagnostics: PresetResolution["diagnostics"] }> {
    try {
      const sourceResolution = this.presetRenderSources(timeline);
      if (!sourceResolution.sources || sourceResolution.diagnostics.length > 0) return { diagnostics: sourceResolution.diagnostics };
      const sourceMap = sourceResolution.sources;
      const effectiveCapabilities = new Set(resolution.routing_decisions.filter((decision) => decision.outcome === "execute" || decision.outcome === "fallback").map((decision) => decision.outcome === "fallback" ? decision.detail! : decision.capability));
      const soloActive = timeline.tracks.some((track) => track.enabled !== false && track.solo === true);
      const activeAudioTracks = timeline.tracks.filter((track) => track.enabled !== false && track.muted !== true && (!soloActive || track.solo === true));
      const hasUsableAudio = activeAudioTracks.some((track) => track.clips.some((clip) => track.audio_routing?.find((routing) => routing.source_clip_id === clip.clip_id)?.muted !== true && sourceMap.get(clip.source.asset_id)?.has_audio === true));
      if (effectiveCapabilities.has("timeline.audio_master") && timeline.master_loudness?.enabled !== false && !hasUsableAudio) return { diagnostics: [{ code: "PRESET_AUDIO_SOURCE_UNAVAILABLE", message: "Master loudness Preset requires a verified audio source" }] };
      if (effectiveCapabilities.has("timeline.audio_mix") && timeline.dialogue_music_ducking?.enabled !== false) {
        const roles = new Set(activeAudioTracks.filter((track) => track.kind === "audio").flatMap((track) => track.clips.map((clip) => ({ clip, routing: track.audio_routing?.find((routing) => routing.source_clip_id === clip.clip_id) }))).filter(({ clip, routing }) => routing?.muted !== true && sourceMap.get(clip.source.asset_id)?.has_audio === true).map(({ routing }) => routing?.bus ?? "embedded"));
        if (!["dialogue", "narration"].some((role) => roles.has(role as "dialogue" | "narration")) || !roles.has("music")) return { diagnostics: [{ code: "PRESET_DUCKING_INPUTS_UNAVAILABLE", message: "Dialogue/Music ducking requires verified Dialogue or Narration and Music inputs" }] };
      }
      const ratio = applicationContext.aspect_ratio?.match(/^([1-9][0-9]*):([1-9][0-9]*)$/);
      const profile: RenderProfile = { name: "preset-application-validation", ...(ratio ? { width: Number(ratio[1]), height: Number(ratio[2]) } : {}) };
      const { previewPlan: preview, masterPlan: master } = resolveTimelineRenderPlans(timeline, sourceMap, profile);
      const diagnostics: Array<Readonly<{ code: string; message: string; selection_id?: string }>> = [];
      const semanticLinks: PresetSemanticLink[] = [];
      for (const plan of [preview, master]) for (const issue of plan.diagnostics.filter((item) => item.severity === "blocker")) diagnostics.push({ code: issue.code, message: `${plan.target} render validation blocked: ${issue.message}` });
      if (preview.semantic_graph_hash !== master.semantic_graph_hash) diagnostics.push({ code: "PRESET_PREVIEW_MASTER_SEMANTIC_MISMATCH", message: "Preview and Master semantic graph hashes differ" });
      for (const declared of resolution.routing_decisions) {
        if (declared.outcome === "block" || declared.outcome === "bake") continue;
        const plan = declared.target === "preview" ? preview : master;
        const expectedCapability = declared.outcome === "fallback" ? declared.detail : declared.capability;
        const matching = expectedCapability ? plan.decisions.filter((decision) => decision.capability === expectedCapability && decision.outcome !== "block") : [];
        const clipId = resolution.resolved_selections.find((selection) => selection.selection_id === declared.selection_id)?.bindings.clip_id;
        const clipMatching = clipId ? matching.filter((decision) => decision.node_id.includes(`clip-${clipId}-`)) : [];
        const actual = clipMatching.length > 0 ? clipMatching : matching;
        if (!expectedCapability || actual.length === 0) diagnostics.push({ code: "PRESET_DECLARED_SEMANTIC_MISSING", message: `${declared.target} graph does not execute declared ${declared.outcome} capability ${expectedCapability ?? declared.capability}`, selection_id: declared.selection_id });
        else semanticLinks.push({ selection_id: declared.selection_id, semantic_id: declared.semantic_id, target: declared.target, declared_outcome: declared.outcome, declared_capability: declared.capability, actual_capability: expectedCapability, actual_node_ids: actual.map((decision) => decision.node_id) });
      }
      return { validation: { semantic_graph_hash: preview.semantic_graph_hash, source_identity_hash: sourceResolution.source_identity_hash!, preview_plan_id: preview.plan_id, master_plan_id: master.plan_id, preview_cache_key: preview.cache_key, master_cache_key: master.cache_key, preview_decisions: preview.decisions, master_decisions: master.decisions, semantic_links: semanticLinks }, diagnostics };
    } catch (error) {
      return { diagnostics: [{ code: "PRESET_RENDER_VALIDATION_FAILED", message: error instanceof Error ? error.message : "Preset render validation failed" }] };
    }
  }

  resolveCreativeSkill(output: CreativeSkillOutput, applicationContext: PresetApplicationContext = {}): PresetResolution {
    assertCreativeSkillOutputV1(output);
    const timeline = this.readTimelineSnapshot() as Timeline | null;
    if (!timeline) throw new Error("timeline is not initialized");
    return resolveCreativeSkill(output, this.presetRegistry, this.presetResolutionContext(timeline, output, applicationContext));
  }

  private prepareEdit(intent: CommandEditIntent, base: Timeline): PreparedEdit {
    const resolvedIntent = resolveCommandEditIntent(intent, base);
    const draft = createCommitPlan(base, resolvedIntent.commands, { semantic_refs: resolvedIntent.semantic_refs });
    const unlockingTracks = new Set(resolvedIntent.commands.flatMap((command) => command.type === "set_track_properties" && command.properties.locked === false ? [command.track_id] : []));
    for (const range of draft.plan.affected_ranges) {
      const track = base.tracks.find((candidate) => candidate.track_id === range.track_id);
      if (track?.locked === true && !unlockingTracks.has(range.track_id)) throw new Error(`EDIT_TRACK_LOCKED:${range.track_id}`);
      const lock = track?.locks?.find((candidate) => range.start < candidate.end && candidate.start < range.end);
      if (lock && !resolvedIntent.commands.some((command) => command.type === "unlock_range" && command.track_id === range.track_id && command.lock_id === lock.lock_id)) throw new Error(`EDIT_RANGE_LOCKED:${lock.lock_id}`);
    }
    const ir: CommandEditIR = { ...resolvedIntent, affected_ranges: draft.plan.affected_ranges };
    const planHash = createHash("sha256").update(commitPlanPayload(draft.plan)).digest("hex");
    return { ir, timeline: draft.timeline, plan: { ...draft.plan, plan_hash: planHash } };
  }

  private commitPreparedEdit(prepared: PreparedEdit, redo: { commands: readonly TimelineCommand[]; baseVersion: number } | null = null, artifacts: readonly AtomicEditArtifact[] = []): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    const projectId = this.session.manifest.project_id;
    const irArtifact: AtomicEditArtifact = { object_ref_id: `${projectId}:edit-ir:${prepared.ir.edit_ir_id}`, object_type: "edit_ir", version: prepared.timeline.version, relation_key: prepared.ir.edit_ir_id, value: prepared.ir, metadata: { actor_id: prepared.ir.actor.actor_id, producer: prepared.ir.actor.producer, reason: prepared.ir.reason } };
    commitTimelinePlan(this.session, projectId, prepared.timeline, prepared.plan, redo, [irArtifact, ...artifacts]);
    this.currentStatus = { ...this.currentStatus, timeline: `v${prepared.timeline.version}` };
    return this.currentStatus;
  }

  executeEdit(intent: CommandEditIntent, artifacts: readonly AtomicEditArtifact[] = []): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    const timeline = this.readTimelineSnapshot() as Timeline | null;
    if (!timeline) throw new Error("timeline is not initialized");
    return this.commitPreparedEdit(this.prepareEdit(intent, timeline), null, artifacts);
  }

  applyCreativeSkill(output: CreativeSkillOutput, applicationContext: PresetApplicationContext = {}): PresetApplicationRecord {
    if (!this.session) throw new Error("project is not open");
    assertCreativeSkillOutputV1(output);
    const timeline = this.readTimelineSnapshot() as Timeline | null;
    if (!timeline) throw new Error("timeline is not initialized");
    const resolution = resolveCreativeSkill(output, this.presetRegistry, this.presetResolutionContext(timeline, output, applicationContext));
    if (!resolution.application_id) throw new Error(resolution.diagnostics[0]?.code ?? "CREATIVE_SKILL_OUTPUT_INVALID");
    const existing = readPresetApplication(this.session, this.session.manifest.project_id, resolution.application_id) as { value?: PresetApplicationRecord } | null;
    if (existing?.value) {
      assertPresetApplicationRecordV1(existing.value);
      if (existing.value.selection_hash !== resolution.selection_hash || canonicalPresetPayload(existing.value.application_context) !== canonicalPresetPayload(applicationContext)) throw new Error(`preset application id conflict: ${resolution.application_id}`);
      return existing.value;
    }
    const definitionByPin = new Map<string, PresetDefinition>();
    for (const definition of this.presetRegistry.definitions()) {
      const entry = this.presetRegistry.find(definition.preset_id, definition.preset_version);
      if (entry) definitionByPin.set(`${definition.preset_id}@${definition.preset_version}`, entry.definition);
    }
    const attribution = resolution.definition_pins.flatMap((pin) => {
      const definition = definitionByPin.get(`${pin.preset_id}@${pin.preset_version}`);
      return definition?.license.attribution_required ? [{ preset_id: pin.preset_id, license_id: definition.license.license_id, ...(definition.license.attribution_text ? { attribution_text: definition.license.attribution_text } : {}) }] : [];
    });
    const conflictDiagnostic = timeline.version === resolution.base_timeline_version ? [] : [{ code: "TIMELINE_VERSION_CONFLICT", message: `timeline version conflict: expected ${timeline.version}, received ${resolution.base_timeline_version}` }];
    const diagnostics = Object.freeze([...resolution.diagnostics, ...conflictDiagnostic]);
    const blockedRecord = (blockedDiagnostics: PresetResolution["diagnostics"], renderValidation?: PresetRenderValidation): PresetApplicationRecord => ({ schema_version: 1, application_id: resolution.application_id, status: "blocked", skill_id: output.skill_id, skill_version: output.skill_version, composition_policy: output.composition_policy, application_context: { ...applicationContext }, base_timeline_version: resolution.base_timeline_version, selections: output.selections, resolved_selections: resolution.resolved_selections, selection_hash: resolution.selection_hash, command_payload: canonicalPresetPayload(resolution.commands), command_hash: resolution.command_hash, semantic_expectation_hash: resolution.semantic_expectation_hash, definition_pins: resolution.definition_pins, policy_decisions: resolution.policy_decisions, routing_decisions: resolution.routing_decisions, ...(renderValidation ? { render_validation: renderValidation } : {}), diagnostics: blockedDiagnostics, attribution });
    if (resolution.status === "blocked" || conflictDiagnostic.length > 0) {
      const blocked = blockedRecord(diagnostics);
      assertPresetApplicationRecordV1(blocked);
      registerPresetApplicationBlocker(this.session, this.session.manifest.project_id, blocked);
      return blocked;
    }
    const presetIntent: CommandEditIntent = { intent_id: `preset-${resolution.application_id}`, base_version: timeline.version, actor: { actor_id: output.skill_id, producer: "preset" }, targets: resolution.commands.map((command) => ({ ...( "track_id" in command ? { track_id: command.track_id } : {}), ...( "clip_id" in command ? { clip_id: command.clip_id } : {}) })), commands: resolution.commands, semantic_refs: [`preset-application:${resolution.application_id}`, `preset-selection-hash:${resolution.selection_hash}`, `preset-semantic-hash:${resolution.semantic_expectation_hash}`], preconditions: [{ kind: "timeline_version", version: timeline.version }], protected_refs: [], provenance: { source_id: output.skill_id, source_version: output.skill_version, correlation_id: resolution.application_id }, reason: "apply validated Creative Skill Preset selections", expected_effects: resolution.routing_decisions.map((decision) => `${decision.target}:${decision.outcome}:${decision.capability}`) };
    let prepared: PreparedEdit;
    try { prepared = this.prepareEdit(presetIntent, timeline); }
    catch (error) { const blocked = blockedRecord([{ code: "PRESET_TIMELINE_VALIDATION_FAILED", message: error instanceof Error ? error.message : "Preset Timeline validation failed" }]); assertPresetApplicationRecordV1(blocked); registerPresetApplicationBlocker(this.session, this.session.manifest.project_id, blocked); return blocked; }
    const renderCheck = this.validatePresetRender(prepared.timeline, resolution, applicationContext);
    if (renderCheck.diagnostics.length > 0) { const blocked = blockedRecord(renderCheck.diagnostics, renderCheck.validation); assertPresetApplicationRecordV1(blocked); registerPresetApplicationBlocker(this.session, this.session.manifest.project_id, blocked); return blocked; }
    const planHash = prepared.plan.plan_hash;
    const record: PresetApplicationRecord = { schema_version: 1, application_id: resolution.application_id, status: "applied", skill_id: output.skill_id, skill_version: output.skill_version, composition_policy: output.composition_policy, application_context: { ...applicationContext }, base_timeline_version: resolution.base_timeline_version, final_timeline_version: prepared.timeline.version, selections: output.selections, resolved_selections: resolution.resolved_selections, selection_hash: resolution.selection_hash, command_payload: canonicalPresetPayload(resolution.commands), command_hash: resolution.command_hash, semantic_expectation_hash: resolution.semantic_expectation_hash, definition_pins: resolution.definition_pins, policy_decisions: resolution.policy_decisions, routing_decisions: resolution.routing_decisions, render_validation: renderCheck.validation!, diagnostics, commit_plan_hash: planHash, attribution };
    assertPresetApplicationRecordV1(record);
    this.commitPreparedEdit(prepared, null, [{ object_ref_id: `${this.session.manifest.project_id}:preset-application:${resolution.application_id}`, object_type: "preset_application", version: prepared.timeline.version, relation_key: resolution.application_id, value: record, metadata: { selection_hash: resolution.selection_hash, command_hash: resolution.command_hash } }]);
    return record;
  }

  exportTimeline(format: "otio" | "fcpxml" | "edl" | "web-preview"): unknown {
    const timeline = this.readTimelineSnapshot() as Timeline | null;
    if (!timeline) throw new Error("timeline is not initialized");
    if (format === "otio") return exportOtio(timeline);
    if (format === "fcpxml") return exportFcpXml(timeline);
    if (format === "edl") return exportEdl(timeline);
    return exportWebPreview(timeline);
  }
  validateTimelineExport(format: "otio" | "fcpxml" | "edl", document: unknown): readonly unknown[] {
    const original = this.readTimelineSnapshot() as Timeline | null;
    if (!original) throw new Error("timeline is not initialized");
    const imported = format === "otio" ? importOtio(document as any) : format === "fcpxml" ? importFcpXml(document as any) : importEdl(document as any);
    return validateTimelineRoundtrip(original, imported);
  }

  private async inspectMediaCandidate(inputPath: string, persistence: "persistent" | "ephemeral" = "persistent"): Promise<VerifiedMediaCandidate> {
    const before = await stat(inputPath);
    const inspectionInput = { input_path: inputPath }, inspectionId = persistence === "persistent" ? randomUUID() : null;
    const fingerprintResult = persistence === "ephemeral"
      ? await this.workerPort.submit<{ input_path: string }, WorkerResult<MediaFingerprintOutput>>("media.fingerprint.v1", { input_path: inputPath }, { idempotent: false })
      : await this.submitWorkerJob<{ input_path: string }, WorkerResult<MediaFingerprintOutput>>("media.fingerprint.v1", inspectionInput, undefined, `media.fingerprint.v1:${hashJobInput(inspectionInput)}:inspection:${inspectionId}`);
    const fingerprintOutput = fingerprintResult.outputs?.find((output): output is MediaFingerprintOutput => output.kind === "media.fingerprint");
    if (!fingerprintOutput?.digest || fingerprintOutput.algorithm !== "sha256" || !/^[0-9a-f]{64}$/.test(fingerprintOutput.digest)) throw new Error("MEDIA_FINGERPRINT_INVALID");
    const probeResult = persistence === "ephemeral"
      ? await this.workerPort.submit<{ input_path: string }, WorkerResult<MediaProbeOutput>>("media.probe.v1", { input_path: inputPath }, { idempotent: false })
      : await this.submitWorkerJob<{ input_path: string }, WorkerResult<MediaProbeOutput>>("media.probe.v1", inspectionInput, undefined, `media.probe.v1:${hashJobInput(inspectionInput)}:inspection:${inspectionId}`);
    const probeOutput = probeResult.outputs?.find((output): output is MediaProbeOutput => output.kind === "media.probe");
    const after = await stat(inputPath);
    const byteLength = Number(fingerprintOutput.byte_length);
    if (!after.isFile() || !Number.isSafeInteger(byteLength) || byteLength !== after.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error("MEDIA_CHANGED_DURING_VERIFICATION");
    const fingerprint: ContentFingerprint = { algorithm: "sha256", digest: fingerprintOutput.digest, byte_length: BigInt(byteLength) };
    return { asset_id: assetIdFromFingerprint(fingerprint), fingerprint, path: inputPath, verified_at: new Date().toISOString(), file_stat: { size: after.size, mtime_ms: after.mtimeMs }, probe: probeOutput?.value ?? null };
  }

  private async persistedLocationHasCurrentIdentity(location: PersistedAssetLocation): Promise<boolean> {
    if (!persistedLocationIsCurrent(location)) return false;
    const fingerprint = location.metadata?.fingerprint;
    const release = await this.acquireCreativeContextIdentityPermit();
    try {
      const before = await stat(location.location_ref);
      const result = await this.workerPort.submit<{ input_path: string }, WorkerResult<MediaFingerprintOutput>>("media.fingerprint.v1", { input_path: location.location_ref }, { idempotent: false });
      const output = result.outputs?.find((candidate): candidate is MediaFingerprintOutput => candidate.kind === "media.fingerprint");
      const after = await stat(location.location_ref);
      return Boolean(
        output
        && output.algorithm === "sha256"
        && output.digest === fingerprint?.digest
        && output.byte_length === fingerprint?.byte_length
        && before.isFile()
        && after.isFile()
        && before.size === after.size
        && before.mtimeMs === after.mtimeMs,
      );
    } catch { return false; }
    finally { release(); }
  }

  private immutableOriginalForSource(source: PersistedAssetLocation): PersistedAssetLocation | undefined {
    if (!this.session || !this.projectDirectory) throw new Error("project is not open");
    const expectedPath = stage2ImmutableOriginalPath(this.projectDirectory, source.asset_id);
    return (listAssetLocationsForAssets(this.session, this.session.manifest.project_id, [source.asset_id]) as PersistedAssetLocation[]).find((candidate) => candidate.location_type === "immutable_original"
      && candidate.location_ref === expectedPath
      && candidate.metadata?.immutable_content === true
      && candidate.metadata?.source_asset_location_id === source.asset_location_id
      && candidate.metadata?.source_location_identity === originalLocationAuthorityIdentity(source));
  }

  private assertStage2ImmutablePathAncestorsSafe(targetPath: string, allowMissing = false): void {
    if (!this.projectDirectory) throw new Error("project is not open");
    const projectRoot = resolve(this.projectDirectory), target = resolve(targetPath), targetRelative = relative(projectRoot, target);
    if (!targetRelative || isAbsolute(targetRelative) || targetRelative === ".." || targetRelative.startsWith(`..${sep}`)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PATH_UNSAFE");
    let current = projectRoot;
    for (const component of ["", ...targetRelative.split(sep).slice(0, -1)]) {
      if (component) current = resolve(current, component);
      try {
        const entry = lstatSync(current, { bigint: true });
        if (!entry.isDirectory() || entry.isSymbolicLink()) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PATH_UNSAFE");
      } catch (error) {
        if (allowMissing && (error as { code?: string }).code === "ENOENT") return;
        throw error;
      }
    }
  }

  private async copyIntoStage2ImmutableHandle(sourcePath: string, destination: FileHandle): Promise<void> {
    const source = await open(sourcePath, fsConstants.O_RDONLY), buffer = Buffer.allocUnsafe(1024 * 1024);
    let position = 0;
    try {
      while (true) {
        const { bytesRead } = await source.read(buffer, 0, buffer.byteLength, position);
        if (bytesRead === 0) break;
        if (position > Number.MAX_SAFE_INTEGER - bytesRead) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_TOO_LARGE");
        let written = 0;
        while (written < bytesRead) {
          const result = await destination.write(buffer, written, bytesRead - written, position + written);
          if (result.bytesWritten < 1) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_COPY_FAILED");
          written += result.bytesWritten;
        }
        position += bytesRead;
      }
      await destination.truncate(position);
    } finally { await source.close(); }
  }

  private async removePreparedImmutableOriginal(path: string, expectedIdentity: Stage2ImmutableFileIdentity, maximumLinks = 1n): Promise<void> {
    let pathEntry: BigIntStats;
    try { pathEntry = await lstat(path, { bigint: true }); }
    catch (error) { if ((error as { code?: string }).code === "ENOENT") return; throw error; }
    const pathIdentity = stage2ImmutableFileIdentity(pathEntry);
    if (!stage2ImmutableFileIdentityMatches(pathIdentity, expectedIdentity)) return;
    if (!pathEntry.isFile() || pathEntry.isSymbolicLink() || pathEntry.nlink < 1n || pathEntry.nlink > maximumLinks) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_COMPENSATION_UNSAFE");
    const flags = process.platform === "win32" ? fsConstants.O_RDONLY : fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW;
    let handle: FileHandle;
    try { handle = await open(path, flags); }
    catch (error) { if ((error as { code?: string }).code === "ENOENT") return; throw new Error(`STAGE2_IMMUTABLE_ORIGINAL_COMPENSATION_FAILED:${(error as { code?: string }).code ?? "OPEN"}`); }
    const originalMode = Number(pathEntry.mode & 0o777n);
    let madeWritable = false;
    try {
      const opened = await handle.stat({ bigint: true });
      if (!opened.isFile() || opened.nlink < 1n || opened.nlink > maximumLinks || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(opened), expectedIdentity)) return;
      if (process.platform === "win32" && (opened.mode & 0o222n) === 0n) { await handle.chmod(STAGE2_IMMUTABLE_ORIGINAL_CLEANUP_MODE); madeWritable = true; }
      const currentHandle = await handle.stat({ bigint: true }), currentPath = await lstat(path, { bigint: true });
      if (!currentPath.isFile() || currentPath.isSymbolicLink() || currentPath.nlink < 1n || currentPath.nlink > maximumLinks || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(currentHandle), expectedIdentity) || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(currentPath), expectedIdentity)) {
        if (madeWritable) await handle.chmod(originalMode).catch(() => undefined);
        return;
      }
      try { await rm(path, { force: false }); }
      catch (error) {
        if (madeWritable) await handle.chmod(originalMode).catch(() => undefined);
        throw new Error(`STAGE2_IMMUTABLE_ORIGINAL_COMPENSATION_FAILED:${(error as { code?: string }).code ?? "REMOVE"}`);
      }
      if (madeWritable) await handle.chmod(originalMode).catch(() => undefined);
      try {
        const remaining = await lstat(path, { bigint: true });
        if (stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(remaining), expectedIdentity)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_COMPENSATION_FAILED:REMAINS");
      } catch (error) { if ((error as { code?: string }).code !== "ENOENT") throw error; }
    } finally { await handle.close(); }
  }

  private async restorePreparedImmutableOriginalProtection(path: string, handle: FileHandle, expectedIdentity: Stage2ImmutableFileIdentity, expectedSnapshot: Stage2ImmutableFileSnapshot, mode: number): Promise<void> {
    let pathEntry: BigIntStats;
    try { pathEntry = await lstat(path, { bigint: true }); }
    catch (error) { if ((error as { code?: string }).code === "ENOENT") return; throw error; }
    const handleEntry = await handle.stat({ bigint: true }), pathSnapshot = stage2ImmutableFileSnapshot(pathEntry), handleSnapshot = stage2ImmutableFileSnapshot(handleEntry);
    if (!pathEntry.isFile() || pathEntry.isSymbolicLink() || pathEntry.nlink !== 1n || !handleEntry.isFile() || handleEntry.nlink !== 1n || !stage2ImmutableFileIdentityMatches(pathSnapshot.identity, expectedIdentity) || !stage2ImmutableFileSnapshotMatches(pathSnapshot, expectedSnapshot) || !stage2ImmutableFileSnapshotMatches(handleSnapshot, expectedSnapshot)) return;
    await handle.chmod(mode);
    const restoredHandle = await handle.stat({ bigint: true }), restoredPath = await lstat(path, { bigint: true }), restoredHandleMode = Number(restoredHandle.mode & 0o777n), restoredPathMode = Number(restoredPath.mode & 0o777n);
    const modeMatches = process.platform === "win32" ? (restoredHandleMode & 0o222) === (mode & 0o222) && (restoredPathMode & 0o222) === (mode & 0o222) : restoredHandleMode === mode && restoredPathMode === mode;
    if (!modeMatches || !stage2ImmutableFileSnapshotMatches(stage2ImmutableFileSnapshot(restoredHandle), expectedSnapshot) || !stage2ImmutableFileSnapshotMatches(stage2ImmutableFileSnapshot(restoredPath), expectedSnapshot)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_COMPENSATION_FAILED:PROTECTION_RESTORE");
  }

  private assertPreparedImmutableOriginalCurrent(prepared: PreparedImmutableOriginal): void {
    this.assertStage2ImmutablePathAncestorsSafe(prepared.location.location_ref);
    const pathEntry = lstatSync(prepared.location.location_ref, { bigint: true }), handleEntry = fstatSync(prepared.file_handle.fd, { bigint: true });
    const pathSnapshot = stage2ImmutableFileSnapshot(pathEntry), handleSnapshot = stage2ImmutableFileSnapshot(handleEntry);
    if (!pathEntry.isFile() || pathEntry.isSymbolicLink() || pathEntry.nlink !== 1n || !handleEntry.isFile() || handleEntry.nlink !== 1n || !stage2ImmutableFileModeIsCurrent(pathEntry) || !stage2ImmutableFileModeIsCurrent(handleEntry) || !stage2ImmutableFileIdentityMatches(pathSnapshot.identity, prepared.file_identity) || !stage2ImmutableFileSnapshotMatches(pathSnapshot, prepared.file_snapshot) || !stage2ImmutableFileSnapshotMatches(handleSnapshot, prepared.file_snapshot)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_CHANGED_BEFORE_COMMIT");
  }

  private async prepareImmutableOriginal(source: PersistedAssetLocation): Promise<PreparedImmutableOriginal> {
    if (!this.session || !this.projectDirectory) throw new Error("project is not open");
    const projectId = this.session.manifest.project_id, finalPath = stage2ImmutableOriginalPath(this.projectDirectory, source.asset_id), temporaryPath = resolve(this.projectDirectory, "temp", `immutable-original-${randomUUID()}`);
    if (resolve(source.location_ref) === finalPath) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PATH_UNSAFE");
    let createdPath = false, createdIdentity: Stage2ImmutableFileIdentity | undefined, retainedFinal: Readonly<{ handle: FileHandle; identity: Stage2ImmutableFileIdentity; snapshot: Stage2ImmutableFileSnapshot; verified: VerifiedMediaCandidate; restore_mode_on_failure?: number }> | undefined;
    const finalEntry = (): BigIntStats | null => {
      this.assertStage2ImmutablePathAncestorsSafe(finalPath, true);
      try {
        const entry = lstatSync(finalPath, { bigint: true });
        if (!entry.isFile() || entry.isSymbolicLink() || entry.nlink !== 1n) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PATH_UNSAFE");
        return entry;
      } catch (error) {
        if ((error as { code?: string }).code === "ENOENT") return null;
        throw error;
      }
    };
    const inspectAndProtectFinal = async (expectedIdentity?: Stage2ImmutableFileIdentity): Promise<Readonly<{ handle: FileHandle; identity: Stage2ImmutableFileIdentity; snapshot: Stage2ImmutableFileSnapshot; verified: VerifiedMediaCandidate; restore_mode_on_failure?: number }>> => {
      this.assertStage2ImmutablePathAncestorsSafe(finalPath);
      const flags = process.platform === "win32" ? fsConstants.O_RDONLY : fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW, handle = await open(finalPath, flags);
      let protectionToRestore: Readonly<{ identity: Stage2ImmutableFileIdentity; snapshot: Stage2ImmutableFileSnapshot; mode: number }> | undefined;
      try {
        const openedBefore = await handle.stat({ bigint: true }), pathBefore = await lstat(finalPath, { bigint: true });
        const openedIdentity = stage2ImmutableFileIdentity(openedBefore), pathIdentity = stage2ImmutableFileIdentity(pathBefore), baseline = stage2ImmutableFileSnapshot(openedBefore);
        if (!openedBefore.isFile() || openedBefore.nlink !== 1n || !pathBefore.isFile() || pathBefore.isSymbolicLink() || pathBefore.nlink !== 1n || !stage2ImmutableFileIdentityMatches(openedIdentity, pathIdentity) || expectedIdentity && !stage2ImmutableFileIdentityMatches(openedIdentity, expectedIdentity)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PATH_UNSAFE");
        const verified = await this.inspectMediaCandidate(finalPath, "ephemeral");
        if (verified.asset_id !== source.asset_id) throw new Error(`STAGE2_IMMUTABLE_ORIGINAL_IDENTITY_MISMATCH:${source.asset_id}`);
        const openedAfter = await handle.stat({ bigint: true }), pathAfter = await lstat(finalPath, { bigint: true }), afterSnapshot = stage2ImmutableFileSnapshot(openedAfter);
        if (!openedAfter.isFile() || openedAfter.nlink !== 1n || !pathAfter.isFile() || pathAfter.isSymbolicLink() || pathAfter.nlink !== 1n || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(pathAfter), openedIdentity) || !stage2ImmutableFileSnapshotMatches(baseline, afterSnapshot) || verified.file_stat.size !== Number(openedAfter.size)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_CHANGED_DURING_VERIFICATION");
        const restoreModeOnFailure = stage2ImmutableFileModeIsCurrent(openedBefore) ? undefined : Number(openedBefore.mode & 0o777n);
        if (restoreModeOnFailure !== undefined) protectionToRestore = { identity: openedIdentity, snapshot: afterSnapshot, mode: restoreModeOnFailure };
        await handle.chmod(STAGE2_IMMUTABLE_ORIGINAL_FILE_MODE);
        this.assertStage2ImmutablePathAncestorsSafe(finalPath);
        const protectedHandle = await handle.stat({ bigint: true }), protectedPath = await lstat(finalPath, { bigint: true }), protectedSnapshot = stage2ImmutableFileSnapshot(protectedHandle);
        if (!protectedHandle.isFile() || protectedHandle.nlink !== 1n || !protectedPath.isFile() || protectedPath.isSymbolicLink() || protectedPath.nlink !== 1n || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(protectedPath), openedIdentity) || !stage2ImmutableFileSnapshotMatches(afterSnapshot, protectedSnapshot) || !stage2ImmutableFileModeIsCurrent(protectedHandle) || !stage2ImmutableFileModeIsCurrent(protectedPath)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PROTECTION_FAILED");
        return { handle, identity: openedIdentity, snapshot: protectedSnapshot, verified, ...(restoreModeOnFailure === undefined ? {} : { restore_mode_on_failure: restoreModeOnFailure }) };
      } catch (error) {
        const compensationFailures: unknown[] = [];
        if (protectionToRestore) {
          try { await this.restorePreparedImmutableOriginalProtection(finalPath, handle, protectionToRestore.identity, protectionToRestore.snapshot, protectionToRestore.mode); } catch (restoreError) { compensationFailures.push(restoreError); }
        }
        try { await handle.close(); } catch (closeError) { compensationFailures.push(closeError); }
        if (compensationFailures.length > 0) throw new AggregateError([error, ...compensationFailures], "STAGE2_IMMUTABLE_ORIGINAL_COMPENSATION_FAILED");
        throw error;
      }
    };
    try {
      if (!finalEntry()) {
        this.assertStage2ImmutablePathAncestorsSafe(finalPath, true); this.assertStage2ImmutablePathAncestorsSafe(temporaryPath, true);
        await mkdir(dirname(finalPath), { recursive: true }); await mkdir(dirname(temporaryPath), { recursive: true });
        this.assertStage2ImmutablePathAncestorsSafe(finalPath); this.assertStage2ImmutablePathAncestorsSafe(temporaryPath);
        let temporaryHandle: FileHandle | undefined, temporaryIdentity: Stage2ImmutableFileIdentity | undefined, temporaryOperationFailed = false, temporaryOperationError: unknown;
        try {
          temporaryHandle = await open(temporaryPath, "wx", STAGE2_IMMUTABLE_ORIGINAL_CLEANUP_MODE);
          const opened = await temporaryHandle.stat({ bigint: true }); temporaryIdentity = stage2ImmutableFileIdentity(opened);
          if (!opened.isFile() || opened.nlink !== 1n || opened.ino <= 0n) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PATH_UNSAFE");
          await this.copyIntoStage2ImmutableHandle(source.location_ref, temporaryHandle);
          const copiedTimes = await temporaryHandle.stat({ bigint: true });
          await temporaryHandle.utimes(new Date(Number(copiedTimes.atimeNs / 1_000_000n)), new Date(Number(copiedTimes.mtimeNs / 1_000_000n))); await temporaryHandle.sync(); await temporaryHandle.chmod(STAGE2_IMMUTABLE_ORIGINAL_CLEANUP_MODE);
          const copiedBefore = await temporaryHandle.stat({ bigint: true }), copiedPathBefore = await lstat(temporaryPath, { bigint: true }), copiedBaseline = stage2ImmutableFileSnapshot(copiedBefore);
          if (!copiedBefore.isFile() || copiedBefore.nlink !== 1n || !copiedPathBefore.isFile() || copiedPathBefore.isSymbolicLink() || copiedPathBefore.nlink !== 1n || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(copiedBefore), temporaryIdentity) || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(copiedPathBefore), temporaryIdentity)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PATH_UNSAFE");
          const copied = await this.inspectMediaCandidate(temporaryPath, "ephemeral");
          const copiedAfter = await temporaryHandle.stat({ bigint: true }), copiedPathAfter = await lstat(temporaryPath, { bigint: true });
          if (copied.asset_id !== source.asset_id) throw new Error(`STAGE2_IMMUTABLE_ORIGINAL_IDENTITY_MISMATCH:${source.asset_id}`);
          if (!copiedAfter.isFile() || copiedAfter.nlink !== 1n || !copiedPathAfter.isFile() || copiedPathAfter.isSymbolicLink() || copiedPathAfter.nlink !== 1n || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(copiedAfter), temporaryIdentity) || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(copiedPathAfter), temporaryIdentity) || !stage2ImmutableFileSnapshotMatches(copiedBaseline, stage2ImmutableFileSnapshot(copiedAfter)) || copied.file_stat.size !== Number(copiedAfter.size)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_CHANGED_DURING_VERIFICATION");
          try {
            await link(temporaryPath, finalPath); createdPath = true; createdIdentity = temporaryIdentity;
            const linkedHandle = await temporaryHandle.stat({ bigint: true }), linkedPath = await lstat(finalPath, { bigint: true });
            if (linkedHandle.nlink !== 2n || linkedPath.nlink !== 2n || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(linkedHandle), temporaryIdentity) || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(linkedPath), temporaryIdentity)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PUBLICATION_FAILED");
            await rm(temporaryPath, { force: false });
            await temporaryHandle.chmod(STAGE2_IMMUTABLE_ORIGINAL_FILE_MODE); await temporaryHandle.sync();
            const publishedHandle = await temporaryHandle.stat({ bigint: true }), publishedPath = await lstat(finalPath, { bigint: true });
            if (publishedHandle.nlink !== 1n || publishedPath.nlink !== 1n || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(publishedHandle), temporaryIdentity) || !stage2ImmutableFileIdentityMatches(stage2ImmutableFileIdentity(publishedPath), temporaryIdentity) || !stage2ImmutableFileModeIsCurrent(publishedHandle) || !stage2ImmutableFileModeIsCurrent(publishedPath)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PUBLICATION_FAILED");
          } catch (error) {
            const code = (error as { code?: string }).code;
            if (code !== "EEXIST" && !createdPath && ["EXDEV", "ENOTSUP", "EOPNOTSUPP", "EPERM"].includes(code ?? "")) throw new Error(`STAGE2_IMMUTABLE_ORIGINAL_FILESYSTEM_UNSUPPORTED:${code}`);
            if (code !== "EEXIST" || createdPath || !finalEntry()) throw error;
          }
        } catch (error) { temporaryOperationFailed = true; temporaryOperationError = error; }
        const temporaryCleanupFailures: unknown[] = [];
        try { await temporaryHandle?.close(); } catch (error) { temporaryCleanupFailures.push(error); }
        if (temporaryIdentity) {
          try { await this.removePreparedImmutableOriginal(temporaryPath, temporaryIdentity, 2n); } catch (error) { temporaryCleanupFailures.push(error); }
        }
        if (temporaryOperationFailed) {
          if (temporaryCleanupFailures.length > 0) throw new AggregateError([temporaryOperationError, ...temporaryCleanupFailures], "STAGE2_IMMUTABLE_ORIGINAL_TEMP_CLEANUP_FAILED");
          throw temporaryOperationError;
        }
        if (temporaryCleanupFailures.length === 1) throw temporaryCleanupFailures[0];
        if (temporaryCleanupFailures.length > 1) throw new AggregateError(temporaryCleanupFailures, "STAGE2_IMMUTABLE_ORIGINAL_TEMP_CLEANUP_FAILED");
      }
      retainedFinal = await inspectAndProtectFinal(createdIdentity);
      const sourceIdentity = originalLocationAuthorityIdentity(source), sourceKey = createHash("sha256").update(source.asset_location_id).digest("hex").slice(0, 16), verified = retainedFinal.verified;
      const location: PersistedAssetLocation = { asset_location_id: `${projectId}:${source.asset_id}:immutable:${sourceKey}`, asset_id: source.asset_id, location_type: "immutable_original", location_ref: finalPath, verified_at: verified.verified_at, metadata: { verification_status: "verified", immutable_content: true, source_asset_location_id: source.asset_location_id, source_location_identity: sourceIdentity, fingerprint: { algorithm: "sha256", digest: verified.fingerprint.digest, byte_length: Number(verified.fingerprint.byte_length) }, file_stat: verified.file_stat, probe: verified.probe ?? source.metadata?.probe } };
      if (!this.stage2ImmutableLocationIsCurrent(location)) throw new Error("STAGE2_IMMUTABLE_ORIGINAL_PROTECTION_FAILED");
      return { location, created_path: createdPath, file_handle: retainedFinal.handle, file_identity: retainedFinal.identity, file_snapshot: retainedFinal.snapshot, ...(retainedFinal.restore_mode_on_failure === undefined ? {} : { restore_mode_on_failure: retainedFinal.restore_mode_on_failure }) };
    } catch (error) {
      const compensationFailures: unknown[] = [];
      if (retainedFinal?.restore_mode_on_failure !== undefined && !createdPath) {
        try { await this.restorePreparedImmutableOriginalProtection(finalPath, retainedFinal.handle, retainedFinal.identity, retainedFinal.snapshot, retainedFinal.restore_mode_on_failure); } catch (restoreError) { compensationFailures.push(restoreError); }
      }
      try { await retainedFinal?.handle.close(); } catch (closeError) { compensationFailures.push(closeError); }
      if (createdPath && createdIdentity) { try { await this.removePreparedImmutableOriginal(finalPath, createdIdentity, 2n); } catch (cleanupError) { compensationFailures.push(cleanupError); } }
      if (compensationFailures.length > 0) throw new AggregateError([error, ...compensationFailures], "STAGE2_IMMUTABLE_ORIGINAL_COMPENSATION_FAILED");
      throw error;
    }
  }

  private stage2ImmutableLocationIsCurrent(location: PersistedAssetLocation): boolean {
    if (!this.projectDirectory || location.location_type !== "immutable_original") return false;
    try {
      this.assertStage2ImmutablePathAncestorsSafe(location.location_ref);
      const entry = lstatSync(location.location_ref, { bigint: true });
      return Boolean(entry.isFile()
        && !entry.isSymbolicLink()
        && entry.nlink === 1n
        && stage2ImmutableFileModeIsCurrent(entry)
        && location.metadata?.immutable_content === true
        && location.location_ref === stage2ImmutableOriginalPath(this.projectDirectory, location.asset_id)
        && typeof location.metadata?.source_asset_location_id === "string"
        && /^[0-9a-f]{64}$/.test(location.metadata?.source_location_identity ?? "")
        && persistedLocationIsCurrent(location));
    } catch { return false; }
  }

  private async acquireCreativeContextIdentityPermit(): Promise<() => void> {
    if (this.creativeContextIdentityActive < CREATIVE_CONTEXT_IDENTITY_CONCURRENCY) {
      this.creativeContextIdentityActive += 1;
    } else {
      await new Promise<void>((resolve) => this.creativeContextIdentityWaiters.push(resolve));
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.creativeContextIdentityWaiters.shift();
      if (next) next();
      else this.creativeContextIdentityActive -= 1;
    };
  }

  private currentIdentityForLocation(location: PersistedAssetLocation, cache: Map<string, Promise<boolean>>): Promise<boolean> {
    if (location.location_type === "immutable_original" && !this.stage2ImmutableLocationIsCurrent(location)) return Promise.resolve(false);
    const key = `${location.asset_location_id}:${location.verified_at ?? ""}:${location.location_ref}`;
    const existing = cache.get(key);
    if (existing) return existing;
    const verification = this.persistedLocationHasCurrentIdentity(location);
    cache.set(key, verification);
    return verification;
  }

  private async acquireImmutableOriginalMutationPermit(assetId: string): Promise<() => void> {
    if (this.closing) throw new Error("project is closing");
    const previous = this.immutableOriginalMutationTails.get(assetId) ?? Promise.resolve();
    let releaseGate!: () => void;
    const gate = new Promise<void>((resolveGate) => { releaseGate = resolveGate; });
    const tail = previous.catch(() => undefined).then(() => gate);
    this.immutableOriginalMutationTails.set(assetId, tail);
    await previous.catch(() => undefined);
    if (this.closing) { releaseGate(); if (this.immutableOriginalMutationTails.get(assetId) === tail) this.immutableOriginalMutationTails.delete(assetId); throw new Error("project is closing"); }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      releaseGate();
      if (this.immutableOriginalMutationTails.get(assetId) === tail) this.immutableOriginalMutationTails.delete(assetId);
    };
  }

  private persistOriginalCandidate(candidate: VerifiedMediaCandidate): PersistedAssetLocation {
    if (!this.session) throw new Error("project is not open");
    const projectId = this.session.manifest.project_id;
    registerMediaAsset(this.session, projectId, { asset_id: candidate.asset_id, algorithm: candidate.fingerprint.algorithm, digest: candidate.fingerprint.digest, byte_length: Number(candidate.fingerprint.byte_length), stream_facts: candidate.probe });
    const pathIdentity = createHash("sha256").update(resolve(candidate.path)).digest("hex").slice(0, 16);
    const location: PersistedAssetLocation = { asset_location_id: `${projectId}:${candidate.asset_id}:original:${pathIdentity}`, asset_id: candidate.asset_id, location_type: "original", location_ref: candidate.path, verified_at: candidate.verified_at, metadata: { verification_status: "verified", fingerprint: { algorithm: "sha256", digest: candidate.fingerprint.digest, byte_length: Number(candidate.fingerprint.byte_length) }, file_stat: candidate.file_stat, probe: candidate.probe } };
    registerAssetLocation(this.session, projectId, location);
    return location;
  }

  async importMedia(paths: readonly string[]): Promise<readonly unknown[]> {
    if (!this.session) throw new Error("project is not open");
    if (paths.length === 0) throw new Error("没有选择素材");
    const imported = [];
    for (const inputPath of paths) {
      const candidate = await this.inspectMediaCandidate(inputPath);
      const location = this.persistOriginalCandidate(candidate);
      imported.push({ ...location, probe: candidate.probe });
    }
    return imported;
  }

  async recordMaterialPermission(input: Readonly<{ asset_id: AssetId; asset_location_id: string; permission_state: "authorized" | "denied"; contract_ref: Readonly<{ object_id: string; object_version: number; digest: string }>; approval_id: string; policy_ref: Readonly<{ object_id: string; object_version: number; digest: string }> }>): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["approval_id", "asset_id", "asset_location_id", "contract_ref", "permission_state", "policy_ref"], "material_permission");
    assertExactInputKeys(input.contract_ref, ["digest", "object_id", "object_version"], "material_permission.contract_ref");
    assertExactInputKeys(input.policy_ref, ["digest", "object_id", "object_version"], "material_permission.policy_ref");
    if (!['authorized', 'denied'].includes(input.permission_state) || typeof input.policy_ref?.object_id !== "string" || !input.policy_ref.object_id || !Number.isSafeInteger(input.policy_ref.object_version) || input.policy_ref.object_version < 1 || typeof input.policy_ref.digest !== "string" || !/^[0-9a-f]{64}$/.test(input.policy_ref.digest)) throw new Error("material permission decision is invalid");
    const releaseMutation = await this.acquireImmutableOriginalMutationPermit(input.asset_id);
    try {
    const assertCurrentContractAuthority = () => {
      const contract = readCreativeContractVersion(this.session!, this.session!.manifest.project_id, input.contract_ref.object_id, input.contract_ref.object_version) as any, head = readCreativeContractHead(this.session!, this.session!.manifest.project_id, input.contract_ref.object_id) as any;
      if (!contract || !head || contract.object_hash !== input.contract_ref.digest || head.object_version !== input.contract_ref.object_version || head.object_hash !== input.contract_ref.digest || contract.lifecycle_status !== "approved" || !versionedRefMatches(contract.value.rights_policy_ref, input.policy_ref)) throw new Error("material permission Contract authority is unavailable or stale");
    };
    assertCurrentContractAuthority();
    const location = (listAssetLocationsForAssets(this.session, this.session.manifest.project_id, [input.asset_id]) as PersistedAssetLocation[]).find((candidate) => candidate.asset_location_id === input.asset_location_id && candidate.location_type === "original");
    if (!location) throw new Error("material permission target is unavailable or stale");
    const locationAuthorityDigest = editorialObjectDigest(location), subject = { object_type: "creative_contract" as const, ...input.contract_ref }, permissionGate = (currentLocation: PersistedAssetLocation) => {
      const effect = { asset_id: input.asset_id, asset_location_id: input.asset_location_id, location_identity: originalLocationAuthorityIdentity(currentLocation), permission_state: input.permission_state, policy_ref: input.policy_ref };
      return this.stage2Gate({ action: "material_permission.record", subject_ref: subject, requested_data_fields: ["asset_id", "location_identity", "policy_ref", "reason"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("material_permission.record", effect), reason: `record exact material permission ${input.permission_state}`, approval_id: input.approval_id, retain: false }) as any;
    };
    permissionGate(location);
    const persistenceRevision = this.stage2PersistenceRevision();
    let preparedImmutable: PreparedImmutableOriginal | undefined;
    try {
      if (input.permission_state === "authorized") {
        if (!(await this.persistedLocationHasCurrentIdentity(location))) throw new Error("material permission target is unavailable or stale");
        preparedImmutable = await this.prepareImmutableOriginal(location);
      }
      assertCurrentContractAuthority();
      this.assertStage2PersistenceRevision(persistenceRevision, "material permission target is unavailable or stale");
      const currentLocation = (listAssetLocationsForAssets(this.session, this.session.manifest.project_id, [input.asset_id]) as PersistedAssetLocation[]).find((candidate) => candidate.asset_location_id === input.asset_location_id && candidate.location_type === "original");
      if (!currentLocation || editorialObjectDigest(currentLocation) !== locationAuthorityDigest) throw new Error("material permission target is unavailable or stale");
      const gate = permissionGate(currentLocation), human = gate.request.approval;
      const existingImmutable = this.immutableOriginalForSource(currentLocation), immutableLocation = preparedImmutable?.location ?? existingImmutable;
      return runStage2AtomicMutation(this.session, () => {
        this.assertStage2PersistenceRevision(persistenceRevision, "material permission target is unavailable or stale");
        if (preparedImmutable) this.assertPreparedImmutableOriginalCurrent(preparedImmutable);
        this.retainStage2Gate(gate);
        const primary = setAssetLocationPermission(this.session!, this.session!.manifest.project_id, input.asset_id, input.asset_location_id, { asset_id: input.asset_id, asset_location_id: input.asset_location_id, permission_state: input.permission_state, actor_id: human.actor_id, decided_at: human.approved_at, policy_ref: input.policy_ref });
        if (immutableLocation) {
          if (preparedImmutable) registerAssetLocation(this.session!, this.session!.manifest.project_id, immutableLocation);
          setAssetLocationPermission(this.session!, this.session!.manifest.project_id, input.asset_id, immutableLocation.asset_location_id, { asset_id: input.asset_id, asset_location_id: immutableLocation.asset_location_id, permission_state: input.permission_state, actor_id: human.actor_id, decided_at: human.approved_at, policy_ref: input.policy_ref });
        }
        return primary;
      });
    } catch (error) {
      const failedPrepared = preparedImmutable;
      preparedImmutable = undefined;
      const compensationFailures: unknown[] = [];
      if (failedPrepared) {
        if (failedPrepared.restore_mode_on_failure !== undefined && !failedPrepared.created_path) {
          try { await this.restorePreparedImmutableOriginalProtection(failedPrepared.location.location_ref, failedPrepared.file_handle, failedPrepared.file_identity, failedPrepared.file_snapshot, failedPrepared.restore_mode_on_failure); } catch (restoreError) { compensationFailures.push(restoreError); }
        }
        try { await failedPrepared.file_handle.close(); } catch (closeError) { compensationFailures.push(closeError); }
        if (failedPrepared.created_path) {
          try { await this.removePreparedImmutableOriginal(failedPrepared.location.location_ref, failedPrepared.file_identity); } catch (cleanupError) { compensationFailures.push(cleanupError); }
        }
      }
      if (compensationFailures.length > 0) throw new AggregateError([error, ...compensationFailures], "STAGE2_IMMUTABLE_ORIGINAL_COMPENSATION_FAILED");
      throw error;
    } finally { await preparedImmutable?.file_handle.close(); }
    } finally { releaseMutation(); }
  }

  async relinkOriginal(expectedAssetId: AssetId, candidatePath: string): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const candidate = await this.inspectMediaCandidate(candidatePath);
    if (candidate.asset_id !== expectedAssetId) {
      markMediaDependenciesStale(this.session, this.session.manifest.project_id, expectedAssetId, `ORIGINAL_CONTENT_CHANGED:${candidate.asset_id}`);
      throw new Error(`ORIGINAL_CONTENT_CHANGED:${expectedAssetId}:${candidate.asset_id}`);
    }
    return this.persistOriginalCandidate(candidate);
  }

  async registerProxyCandidate(originalAssetId: AssetId, candidatePath: string, proxyMap: unknown): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const candidate = await this.inspectMediaCandidate(candidatePath);
    if (candidate.asset_id === originalAssetId) throw new Error("PROXY_CONTENT_IDENTITY_MUST_DIFFER");
    const projectId = this.session.manifest.project_id;
    registerMediaAsset(this.session, projectId, { asset_id: candidate.asset_id, algorithm: candidate.fingerprint.algorithm, digest: candidate.fingerprint.digest, byte_length: Number(candidate.fingerprint.byte_length), stream_facts: candidate.probe });
    const pathIdentity = createHash("sha256").update(resolve(candidate.path)).digest("hex").slice(0, 16);
    const location = { asset_location_id: `${projectId}:${originalAssetId}:proxy:${pathIdentity}`, asset_id: originalAssetId, location_type: "proxy", location_ref: candidate.path, verified_at: candidate.verified_at, metadata: { verification_status: "verified", source_asset_id: originalAssetId, proxy_asset_id: candidate.asset_id, fingerprint: { algorithm: "sha256", digest: candidate.fingerprint.digest, byte_length: Number(candidate.fingerprint.byte_length) }, file_stat: candidate.file_stat, probe: candidate.probe, proxy_map: proxyMap } };
    registerAssetLocation(this.session, projectId, location);
    registerMediaRelation(this.session, projectId, { relation_id: `${projectId}:${originalAssetId}:${candidate.asset_id}`, original_asset_id: originalAssetId, proxy_asset_id: candidate.asset_id, proxy_location_id: location.asset_location_id, proxy_map: proxyMap });
    return location;
  }

  initializeTimeline(tracks: readonly Track[]): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    if (this.currentStatus.timeline !== "no-version") throw new Error("timeline already initialized");
    const timeline: Timeline = { version: 0, tracks };
    assertValidTimeline(timeline);
    commitTimeline(this.session, this.session.manifest.project_id, timeline, { type: "initialize", tracks }, 0);
    this.currentStatus = { ...this.currentStatus, timeline: "v0" };
    return this.currentStatus;
  }

  private commitCommands(base: Timeline, commands: readonly TimelineCommand[], metadata: { semantic_refs?: readonly string[]; producer?: EditProducer; actor_id?: string; provenance_id?: string; reason?: string; expected_effects?: readonly string[]; preconditions?: readonly EditPrecondition[]; protected_refs?: readonly string[] } = {}, redo: { commands: readonly TimelineCommand[]; baseVersion: number } | null = null): ProjectHostStatus {
    const identity = createHash("sha256").update(canonicalSerialize({ base_version: base.version, commands, semantic_refs: metadata.semantic_refs ?? [], producer: metadata.producer ?? "manual" })).digest("hex").slice(0, 24);
    const intent: CommandEditIntent = { intent_id: `edit-${identity}`, base_version: base.version, actor: { actor_id: metadata.actor_id ?? "local-user", producer: metadata.producer ?? "manual" }, targets: commands.map((command) => ({ ...( "track_id" in command ? { track_id: command.track_id } : {}), ...( "clip_id" in command ? { clip_id: command.clip_id } : {}) })), commands, semantic_refs: metadata.semantic_refs ?? [], preconditions: metadata.preconditions ?? [{ kind: "timeline_version", version: base.version }], protected_refs: metadata.protected_refs ?? [], provenance: { source_id: metadata.provenance_id ?? metadata.producer ?? "manual" }, reason: metadata.reason ?? "apply Timeline commands through Project Host", expected_effects: metadata.expected_effects ?? commands.map((command) => command.type) };
    return this.commitPreparedEdit(this.prepareEdit(intent, base), redo);
  }

  applyTimelineCommand(command: TimelineCommand, baseVersion: number): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    const raw = readLatestTimeline(this.session, this.session.manifest.project_id);
    if (!raw) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(raw)) as Timeline;
    if (timeline.version !== baseVersion) throw new Error(`timeline version conflict: expected ${timeline.version}, received ${baseVersion}`);
    if (timeline.version !== baseVersion) throw new Error(`timeline version conflict: expected ${timeline.version}, received ${baseVersion}`);
    return this.commitCommands(timeline, [command]);
  }

  applyTimelineCommands(commands: readonly TimelineCommand[], baseVersion: number, semanticRefs: readonly string[] = []): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    const raw = readLatestTimeline(this.session, this.session.manifest.project_id); if (!raw) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(raw)) as Timeline;
    if (timeline.version !== baseVersion) throw new Error(`timeline version conflict: expected ${timeline.version}, received ${baseVersion}`);
    return this.commitCommands(timeline, commands, { semantic_refs: semanticRefs });
  }

  undoTimeline(): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    const currentRaw = readLatestTimeline(this.session, this.session.manifest.project_id);
    if (!currentRaw) throw new Error("nothing to undo");
    const current = revive(JSON.parse(currentRaw)) as Timeline;
    if (current.version <= 0) throw new Error("nothing to undo");
    const previousRaw = readTimelineAtVersion(this.session, this.session.manifest.project_id, current.version - 1);
    const commandRow = readLatestTimelineCommand(this.session, this.session.manifest.project_id) as { command_json?: string; base_version?: number } | undefined;
    if (!previousRaw || !commandRow?.command_json || commandRow.base_version !== current.version - 1) throw new Error("undo history is unavailable");
    const previous = revive(JSON.parse(previousRaw)) as Timeline;
    const stored = revive(JSON.parse(commandRow.command_json)) as TimelineCommand | { commands: readonly TimelineCommand[] };
    const commands = "commands" in stored ? stored.commands : [stored];
    const states: Timeline[] = [previous]; let state = previous;
    for (const command of commands) { state = applyCommand(state, command); states.push(state); }
    let inverseState = current; const inverses: TimelineCommand[] = [];
    for (let index = commands.length - 1; index >= 0; index -= 1) { const inverse = inverseCommand(states[index], commands[index]); inverses.push(inverse); inverseState = applyCommand(inverseState, inverse); }
    return this.commitCommands(current, inverses, {}, { commands, baseVersion: current.version + 1 });
  }

  redoTimeline(): ProjectHostStatus {
    if (!this.session) throw new Error("nothing to redo");
    const raw = readLatestTimeline(this.session, this.session.manifest.project_id);
    if (!raw) throw new Error("nothing to redo");
    const current = revive(JSON.parse(raw)) as Timeline;
    const storedRedo = readTimelineRedo(this.session, this.session.manifest.project_id) as { commands?: unknown; baseVersion?: number } | null;
    if (!storedRedo?.commands || storedRedo.baseVersion === undefined) throw new Error("nothing to redo");
    const redoCommands = revive(storedRedo.commands) as readonly TimelineCommand[];
    if (current.version !== storedRedo.baseVersion) throw new Error("redo history is stale");
    return this.commitCommands(current, redoCommands);
  }

  async renderTimeline(options: TimelineRenderOptions): Promise<{ status: ProjectHostStatus; render_id: string; preview: unknown; master: unknown }> {
    if (!this.session || !this.projectDirectory) throw new Error("project is not open");
    const raw = readLatestTimeline(this.session, this.session.manifest.project_id);
    if (!raw) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(raw)) as Timeline;
    if (options.executionBinding && timeline.version !== options.executionBinding.timeline_version) throw new Error(`SEMANTIC_RENDER_TIMELINE_REBOUND:${timeline.version}`);
    const assertExecutionBindingStillCurrent = (): any => {
      if (!options.executionBinding || !this.session) return null;
      const currentRaw = readLatestTimeline(this.session, this.session.manifest.project_id);
      const currentTimeline = currentRaw ? revive(JSON.parse(currentRaw)) as Timeline : null;
      if (!currentTimeline || currentTimeline.version !== options.executionBinding.timeline_version) throw new Error(`SEMANTIC_RENDER_TIMELINE_REBOUND:${currentTimeline?.version ?? "missing"}`);
      const snapshot = readStage2WorkspaceSnapshot(this.session, this.session.manifest.project_id) as any;
      const match = snapshot.executions.find((row: any) => row.execution_id === options.executionBinding!.execution_id && row.value?.execution_id === options.executionBinding!.execution_id && row.value?.status === "committed" && Number(row.value.final_timeline_version) === options.executionBinding!.timeline_version && row.value.semantic_graph_hash === options.executionBinding!.semantic_graph_hash && row.value.preview_plan_id === options.executionBinding!.preview_plan_id && row.value.master_plan_id === options.executionBinding!.master_plan_id && row.value.source_identity_digest === options.executionBinding!.source_identity_digest);
      if (!match) throw new Error("SEMANTIC_RENDER_EXECUTION_REBOUND");
      return match;
    };
    const duplicateAssetRef = options.sources.find((source, index) => options.sources.findIndex((candidate) => candidate.asset_ref === source.asset_ref) !== index)?.asset_ref;
    if (duplicateAssetRef) throw new Error(`RENDER_SOURCE_DUPLICATE:${duplicateAssetRef}`);
    const outputDirectory = options.outputDirectory ?? resolve(this.projectDirectory, "renders");
    const worker = this.persistentWorkerPort();
    const probeAudio = (probe: any, assetRef: string): boolean => {
      const streams = probe?.streams ?? Object.values(probe?.timing?.streams ?? {});
      if (!probe || !Array.isArray(streams) || streams.length === 0) throw new Error(`RENDER_SOURCE_PROBE_INVALID:${assetRef}`);
      return streams.some((stream: any) => stream.codec_type === "audio");
    };
    const resolvedSources = await Promise.all(options.sources.map(async (source) => {
      const assetId = source.asset_ref as AssetId;
      let locations = listAssetLocationsForAssets(this.session!, this.session!.manifest.project_id, [source.asset_ref]) as readonly PersistedAssetLocation[];
      const requiredOriginalType = options.executionBinding ? "immutable_original" : "original";
      let original = options.executionBinding
        ? locations.find((location) => location.location_type === requiredOriginalType && location.asset_location_id === source.original_object_ref && location.location_ref === source.original_ref)
        : locations.filter((location) => location.location_type === requiredOriginalType).find((location) => location.location_ref === source.original_ref) ?? locations.find((location) => location.location_type === requiredOriginalType && persistedLocationIsCurrent(location));
      if (!original) {
        if (options.executionBinding) throw new Error(`SEMANTIC_RENDER_IMMUTABLE_ORIGINAL_REQUIRED:${source.asset_ref}`);
        if (!source.original_ref) throw new Error(`MASTER_ORIGINAL_REQUIRED:${source.asset_ref}`);
        original = await this.relinkOriginal(assetId, source.original_ref) as PersistedAssetLocation;
        locations = listAssetLocationsForAssets(this.session!, this.session!.manifest.project_id, [source.asset_ref]) as readonly PersistedAssetLocation[];
      }
      if (options.executionBinding && (original.metadata?.permission_state !== "authorized" || original.metadata.permission_decision?.permission_state !== "authorized" || !this.stage2ImmutableLocationIsCurrent(original))) throw new Error(`SEMANTIC_RENDER_ORIGINAL_UNAUTHORIZED:${source.asset_ref}`);
      const verifiedOriginal = await this.inspectMediaCandidate(original.location_ref, "ephemeral");
      if (verifiedOriginal.asset_id !== assetId) {
        markMediaDependenciesStale(this.session!, this.session!.manifest.project_id, assetId, `ORIGINAL_CONTENT_CHANGED:${verifiedOriginal.asset_id}`);
        throw new Error(`MASTER_ORIGINAL_IDENTITY_MISMATCH:${source.asset_ref}`);
      }
      let proxy = locations.filter((location) => location.location_type === "proxy").find((location) => location.location_ref === source.proxy_ref) ?? locations.find((location) => location.location_type === "proxy" && persistedLocationIsCurrent(location));
      let proxyMap = source.proxy_map;
      if (source.proxy_ref && source.proxy_ref !== original.location_ref && !proxy) {
        if (!proxyMap) {
          const mapResult = await worker.submit<any, any>("media.proxy.map.v1", { original_path: original.location_ref, proxy_path: source.proxy_ref }, { idempotent: true });
          const candidateMap = mapResult.outputs?.find((output: any) => output.kind === "proxy-map")?.proxy_map;
          if (!candidateMap) throw new Error(`PROXY_MAP_MISSING:${source.asset_ref}`);
          proxyMap = reviveProxyMap(candidateMap);
        }
        proxy = await this.registerProxyCandidate(assetId, source.proxy_ref, proxyMap) as PersistedAssetLocation;
      }
      let verifiedProxy: VerifiedMediaCandidate | undefined;
      if (proxy) {
        verifiedProxy = await this.inspectMediaCandidate(proxy.location_ref, "ephemeral");
        if (verifiedProxy.fingerprint.digest !== proxy.metadata?.fingerprint?.digest || proxy.metadata?.source_asset_id !== source.asset_ref) throw new Error(`PROXY_IDENTITY_MISMATCH:${source.asset_ref}`);
        proxyMap ??= proxy.metadata?.proxy_map ? reviveProxyMap(proxy.metadata.proxy_map) : undefined;
      }
      const originalGeometry = probeVideoGeometry(verifiedOriginal.probe);
      const proxyGeometry = probeVideoGeometry(verifiedProxy?.probe);
      const resolvedSource: RenderSourceRef = { ...source, original_ref: original.location_ref, original_object_ref: original.asset_location_id, original_timescale: source.original_timescale ?? source.source_timescale, ...(originalGeometry ? { original_width: originalGeometry.width, original_height: originalGeometry.height } : {}), ...(proxy ? { proxy_ref: proxy.location_ref, proxy_object_ref: proxy.asset_location_id } : {}), ...(proxyGeometry ? { proxy_width: proxyGeometry.width, proxy_height: proxyGeometry.height } : {}), ...(proxyMap ? { proxy_map: proxyMap } : {}) };
      const originalAudio = probeAudio(verifiedOriginal.probe, resolvedSource.asset_ref);
      const proxyAudio = verifiedProxy ? probeAudio(verifiedProxy.probe, resolvedSource.asset_ref) : originalAudio;
      if (originalAudio !== undefined && proxyAudio !== undefined && originalAudio !== proxyAudio) throw new Error(`RENDER_SOURCE_AUDIO_IDENTITY_MISMATCH:${resolvedSource.asset_ref}`);
      const hasAudio = originalAudio ?? proxyAudio;
      return hasAudio === undefined ? resolvedSource : { ...resolvedSource, has_audio: hasAudio };
    }));
    const authoritativeSources = [...resolvedSources].sort((left, right) => left.asset_ref.localeCompare(right.asset_ref));
    const sources = new Map(authoritativeSources.map((source) => [source.asset_ref, source]));
    if (sources.size !== authoritativeSources.length) throw new Error("RENDER_SOURCE_DUPLICATE");
    const assertExecutionRenderSourcesStillCurrent = async (): Promise<string | null> => {
      if (!options.executionBinding) return null;
      const executionRow = assertExecutionBindingStillCurrent();
      return this.assertEditorialExecutionRenderAuthorityCurrent(executionRow, authoritativeSources);
    };
    const assertExecutionRenderPublicationRevision = (authorityRevision: string | null): void => {
      if (authorityRevision !== null) this.assertStage2PersistenceRevision(authorityRevision, "SEMANTIC_RENDER_EXECUTION_AUTHORITY_REBOUND");
    };
    assertExecutionRenderPublicationRevision(await assertExecutionRenderSourcesStillCurrent());
    const { previewGraph, masterGraph, previewPlan, masterPlan } = resolveTimelineRenderPlans(timeline, sources, options.profile ?? { name: "timeline-render" }, options.range);
    if (options.executionBinding) {
      const actualSourceIdentityDigest = editorialObjectDigest(editorialRenderSourceIdentity(resolvedSources));
      if (actualSourceIdentityDigest !== options.executionBinding.source_identity_digest) throw new Error("SEMANTIC_RENDER_SOURCE_IDENTITY_REBOUND");
      if (previewPlan.semantic_graph_hash !== options.executionBinding.semantic_graph_hash || masterPlan.semantic_graph_hash !== options.executionBinding.semantic_graph_hash) throw new Error("SEMANTIC_RENDER_GRAPH_REBOUND");
      if (previewPlan.plan_id !== options.executionBinding.preview_plan_id || masterPlan.plan_id !== options.executionBinding.master_plan_id) throw new Error("SEMANTIC_RENDER_PLAN_REBOUND");
    }
    if (previewPlan.diagnostics.length || masterPlan.diagnostics.length) {
      const authorityRevision = await assertExecutionRenderSourcesStillCurrent();
      const blockerKey = createHash("sha256").update(canonicalSerialize({ preview: previewPlan, master: masterPlan })).digest("hex");
      assertExecutionRenderPublicationRevision(authorityRevision);
      registerRenderBundle(this.session, this.session.manifest.project_id, { schema_version: 1, bundle_id: `bundle-blocked-${blockerKey.slice(0, 24)}`, idempotency_key: `blocked:${blockerKey}`, state: "blocked", results: [], manifests: [{ manifest_id: `blocked-${blockerKey.slice(0, 24)}-execution-preview`, manifest_type: "execution_plan", value: previewPlan }, { manifest_id: `blocked-${blockerKey.slice(0, 24)}-execution-master`, manifest_type: "execution_plan", value: masterPlan }, { manifest_id: `blocked-${blockerKey.slice(0, 24)}-diagnostics`, manifest_type: "blocker_manifest", value: { schema_version: 1, diagnostics: [...previewPlan.diagnostics, ...masterPlan.diagnostics] } }] });
      throw new Error(`RENDER_RESOLVER_BLOCKED:${[...previewPlan.diagnostics, ...masterPlan.diagnostics].map((diagnostic) => diagnostic.code).join(",")}`);
    }
    const semanticGraphHash = createHash("sha256").update(semanticGraphPayload(previewGraph)).digest("hex");
    if (semanticGraphHash !== createHash("sha256").update(semanticGraphPayload(masterGraph)).digest("hex")) throw new Error("RENDER_SEMANTIC_DIVERGENCE");
    const presetApplicationLink = this.linkPresetApplicationToRender(timeline, authoritativeSources, previewPlan, masterPlan);
    const graphHash = (graph: unknown) => createHash("sha256").update(renderGraphPayload(graph as any)).digest("hex");
    const workerVersionForPlan = (_plan: ExecutionPlan): string => "ave-worker-host-r14";
    const persistedRenderProfile = (profile: Readonly<Record<string, unknown>> | undefined) => { const { stage2_execution_binding: _untrusted, ...baseProfile } = profile ?? {}; return { ...baseProfile, ...(options.executionBinding ? { stage2_execution_binding: { ...options.executionBinding } } : {}) }; };
    const publicationProvenanceKey = options.executionBinding ? presetDigest({ preset_application_link: presetApplicationLink ?? null, stage2_execution_binding: options.executionBinding }) : presetApplicationLink ? presetDigest(presetApplicationLink) : undefined;
    const bundleKey = renderBundleIdentity(previewPlan.cache_key, masterPlan.cache_key, options.qcRequirements, publicationProvenanceKey);
    const renderId = `render-${bundleKey.slice(0, 24)}`;
    const first = authoritativeSources[0];
    const originalRefs = authoritativeSources.filter((source) => source.original_ref || source.original_object_ref).map((source) => ({ asset_ref: source.asset_ref, ref: source.original_ref, object_ref: source.original_object_ref }));
    const proxyRefs = authoritativeSources.filter((source) => source.proxy_ref || source.proxy_object_ref).map((source) => ({ asset_ref: source.asset_ref, ref: source.proxy_ref, object_ref: source.proxy_object_ref, proxy_map: source.proxy_map }));
    const completedBundle = readRenderBundleByIdempotency(this.session, this.session.manifest.project_id, `render:${bundleKey}`) as any;
    if (completedBundle) {
      const invalid = (): never => { throw new Error("RENDER_BUNDLE_REUSE_INVALID"); };
      const { bundle_object_hash: bundleObjectHash, content_hash: bundleContentHash, created_at: _bundleCreatedAt, ...persistedBundle } = completedBundle;
      if (!/^[0-9a-f]{64}$/.test(bundleObjectHash ?? "") || createHash("sha256").update(canonicalSerialize(persistedBundle)).digest("hex") !== bundleObjectHash || !/^[0-9a-f]{64}$/.test(bundleContentHash ?? "")) invalid();
      const contentIdentity = { ...persistedBundle, results: Array.isArray(persistedBundle.results) ? persistedBundle.results.map(({ output_path: _outputPath, ...result }: any) => result) : persistedBundle.results };
      if (createHash("sha256").update(canonicalSerialize(contentIdentity)).digest("hex") !== bundleContentHash) invalid();
      if (completedBundle.schema_version !== 1 || completedBundle.state !== "completed" || completedBundle.bundle_id !== `bundle-${bundleKey.slice(0, 24)}` || completedBundle.render?.render_id !== renderId || completedBundle.render?.qc_report?.status !== "passed" || !Array.isArray(completedBundle.results) || completedBundle.results.length !== 2 || !Array.isArray(completedBundle.manifests) || completedBundle.manifests.length !== 4) invalid();
      const restored = await Promise.all(([{ target: "preview", graph: previewGraph, plan: previewPlan }, { target: "master", graph: masterGraph, plan: masterPlan }] as const).map(async ({ target, graph, plan }) => {
        const result = completedBundle.results.find((candidate: any) => candidate?.target === target);
        const storedPlan = completedBundle.manifests.find((candidate: any) => candidate?.manifest_type === "execution_plan" && candidate?.value?.target === target)?.value;
        const outputManifest = completedBundle.manifests.find((candidate: any) => candidate?.manifest_type === "output_manifest" && candidate?.value?.target === target)?.value;
        const expectedWorkerVersion = workerVersionForPlan(plan);
        const expectedOutputPath = typeof result?.output_hash === "string" ? resolve(this.projectDirectory!, "objects", "sha256", result.output_hash.slice(0, 2), result.output_hash) : "";
        if (!result || !storedPlan || !outputManifest || canonicalSerialize(storedPlan) !== canonicalSerialize(plan) || result.render_id !== renderId || result.render_result_id !== `${renderId}-${target}` || result.timeline_version !== timeline.version || result.graph_hash !== graphHash(graph) || canonicalSerialize(result.render_graph) !== canonicalSerialize(graph) || canonicalSerialize(result.original_refs) !== canonicalSerialize(originalRefs) || canonicalSerialize(result.proxy_refs) !== canonicalSerialize(proxyRefs) || canonicalSerialize(result.profile) !== canonicalSerialize(persistedRenderProfile(graph.profile)) || typeof result.output_path !== "string" || !/^[0-9a-f]{64}$/.test(result.output_hash ?? "") || result.output_object_hash !== result.output_hash || resolve(result.output_path) !== expectedOutputPath || result.worker_version !== expectedWorkerVersion || outputManifest.schema_version !== 2 || outputManifest.render_id !== renderId || outputManifest.semantic_graph_hash !== semanticGraphHash || outputManifest.execution_plan_id !== plan.plan_id || outputManifest.cache_key !== plan.cache_key || outputManifest.output_hash !== result.output_hash || outputManifest.worker_version !== result.worker_version || outputManifest.backend_version !== result.ffmpeg_version || canonicalSerialize(outputManifest.diagnostics ?? []) !== canonicalSerialize(plan.diagnostics) || canonicalSerialize(outputManifest.preset_application_link ?? null) !== canonicalSerialize(presetApplicationLink ?? null)) invalid();
        let bytes: Buffer;
        try { bytes = await readFile(result.output_path); } catch { invalid(); }
        const actualHash = createHash("sha256").update(bytes!).digest("hex");
        if (actualHash !== result.output_hash) invalid();
        const audioNodes = graph.nodes.filter((node) => node.kind === "audio" && node.parameters?.enabled !== false && node.parameters?.muted !== true && graph.nodes.some((source) => source.kind === "source" && source.parameters?.clip_id === node.parameters?.clip_id && source.parameters?.has_audio !== false));
        const roles = new Set(audioNodes.map((node) => String(node.parameters?.audio_role ?? "embedded")));
        const duckingEnabled = graph.nodes.some((node) => node.kind === "audio_mix" && node.parameters?.enabled === true);
        const duckingStatus = audioNodes.length === 0 ? "no_audio" : !duckingEnabled ? "disabled" : !roles.has("dialogue") && !roles.has("narration") ? "no_dialogue" : !roles.has("music") ? "no_music" : "applied";
        return { target, result, workerResult: { status: "succeeded", outputs: [{ kind: "render", path: result.output_path, hash: result.output_hash, source_kind: target === "master" ? "original" : "proxy", target, execution_plan_id: plan.plan_id, semantic_graph_hash: plan.semantic_graph_hash, cache_key: plan.cache_key }], metrics: { worker_version: result.worker_version, ffmpeg_version: result.ffmpeg_version, execution_plan_id: plan.plan_id, semantic_graph_hash: plan.semantic_graph_hash, cache_key: plan.cache_key, output_hash: result.output_hash, audio_normalization: outputManifest.audio_normalization ?? null, ducking_status: duckingStatus, reused_bundle: true } } };
      }));
      const preview = restored.find((item) => item.target === "preview")?.workerResult ?? invalid();
      const master = restored.find((item) => item.target === "master")?.workerResult ?? invalid();
      if (completedBundle.render.preview_path !== restored.find((item) => item.target === "preview")?.result.output_path || completedBundle.render.master_path !== restored.find((item) => item.target === "master")?.result.output_path) invalid();
      const authorityRevision = await assertExecutionRenderSourcesStillCurrent();
      assertExecutionRenderPublicationRevision(authorityRevision);
      this.currentStatus = { ...this.currentStatus, render: "available", qc: "passed" };
      return { status: this.currentStatus, render_id: renderId, preview, master };
    }
    const submit = (graph: any, plan: ExecutionPlan) => worker.submit<any, any>("render.timeline.v1", { graph: JSON.parse(renderGraphPayload(graph)), execution_plan: JSON.parse(canonicalSerialize(plan)), output_dir: outputDirectory });
    const previewResult = await submit(previewGraph, previewPlan);
    const masterResult = await submit(masterGraph, masterPlan);
    const outputOf = async (result: any, plan: ExecutionPlan) => { const output = result.outputs?.find((candidate: any) => candidate.kind === "render") ?? (() => { throw new Error("worker result missing render output"); })(); if (output.execution_plan_id !== plan.plan_id || output.semantic_graph_hash !== plan.semantic_graph_hash || output.cache_key !== plan.cache_key) throw new Error("WORKER_OUTPUT_PLAN_MISMATCH"); const metrics = result.metrics; if (!metrics || metrics.execution_plan_id !== plan.plan_id || metrics.semantic_graph_hash !== plan.semantic_graph_hash || metrics.cache_key !== plan.cache_key) throw new Error("WORKER_METRICS_PLAN_MISMATCH"); if (metrics.worker_version !== workerVersionForPlan(plan) || typeof metrics.ffmpeg_version !== "string" || !metrics.ffmpeg_version) throw new Error("WORKER_PROVENANCE_MISMATCH"); const actual = createHash("sha256").update(await readFile(output.path)).digest("hex"); if (output.hash !== actual || metrics.output_hash !== actual) throw new Error("WORKER_OUTPUT_HASH_MISMATCH"); return { ...output, hash: actual }; };
    const previewOutput = await outputOf(previewResult, previewPlan);
    const masterOutput = await outputOf(masterResult, masterPlan);
    const firstSource = authoritativeSources[0];
    const timelineLoudness = timeline.master_loudness?.enabled ? { target_lufs: timeline.master_loudness.target_lufs, tolerance_lufs: timeline.master_loudness.tolerance_lufs, true_peak_db: timeline.master_loudness.true_peak_db } : options.qcRequirements?.loudness;
    const report = await qcMaster(masterOutput.path, worker, "original", { require_audio: authoritativeSources.some((source) => source.has_audio !== false), source_identity: firstSource ? { source_kind: "original", asset_id: firstSource.asset_ref, object_ref: firstSource.original_object_ref, render_graph_source_kind: "original" } : undefined, render_graph_sources: authoritativeSources.map((source) => ({ asset_id: source.asset_ref, source_kind: "original", object_ref: source.original_object_ref })), qc_requirements: options.qcRequirements ?? {}, loudness: timelineLoudness, audio_normalization: masterResult.metrics?.audio_normalization, planned_black_intervals: plannedBoundaryFadeIntervals(timeline) });
    if (report.status !== "passed") {
      const authorityRevision = await assertExecutionRenderSourcesStillCurrent();
      assertExecutionRenderPublicationRevision(authorityRevision);
      registerRenderBundle(this.session, this.session.manifest.project_id, { schema_version: 1, bundle_id: `bundle-blocked-${bundleKey.slice(0, 24)}`, idempotency_key: `blocked-qc:${bundleKey}`, state: "blocked", results: [], manifests: [{ manifest_id: `${renderId}-execution-preview`, manifest_type: "execution_plan", value: previewPlan }, { manifest_id: `${renderId}-execution-master`, manifest_type: "execution_plan", value: masterPlan }, { manifest_id: `${renderId}-qc-blocker`, manifest_type: "blocker_manifest", value: { schema_version: 1, code: "RENDER_QC_BLOCKED", qc_report: report } }] });
      this.currentStatus = { ...this.currentStatus, render: "blocked", qc: "blocked" };
      throw new Error(`RENDER_QC_BLOCKED:${report.issues.map((issue: any) => issue.code).join(",")}`);
    }
    const results = ([["preview", previewGraph, previewResult, previewOutput], ["master", masterGraph, masterResult, masterOutput]] as const).map(([target, graph, result, output]) => ({ render_result_id: `${renderId}-${target}`, render_id: renderId, target, timeline_version: timeline.version, graph_hash: graphHash(graph), render_graph: graph, original_refs: originalRefs, proxy_refs: proxyRefs, profile: persistedRenderProfile(graph.profile), worker_version: result.metrics?.worker_version ?? "unknown", ffmpeg_version: result.metrics?.ffmpeg_version ?? "unknown", output_path: output.path, output_hash: output.hash }));
    const manifests = [{ manifest_id: `${renderId}-execution-preview`, manifest_type: "execution_plan", value: previewPlan }, { manifest_id: `${renderId}-execution-master`, manifest_type: "execution_plan", value: masterPlan }, ...([["preview", previewPlan, previewResult, previewOutput], ["master", masterPlan, masterResult, masterOutput]] as const).map(([target, plan, result, output]) => ({ manifest_id: `${renderId}-output-${target}`, manifest_type: "output_manifest", value: { schema_version: 2, render_id: renderId, target, semantic_graph_hash: semanticGraphHash, execution_plan_id: plan.plan_id, cache_key: plan.cache_key, output_hash: output.hash, worker_version: result.metrics?.worker_version ?? "unknown", backend_version: result.metrics?.ffmpeg_version ?? "unknown", diagnostics: plan.diagnostics, ...(presetApplicationLink ? { preset_application_link: presetApplicationLink } : {}), ...(result.metrics?.audio_normalization ? { audio_normalization: result.metrics.audio_normalization } : {}) } }))];
    const authorityRevision = await assertExecutionRenderSourcesStillCurrent();
    assertExecutionRenderPublicationRevision(authorityRevision);
    registerRenderBundle(this.session, this.session.manifest.project_id, { schema_version: 1, bundle_id: `bundle-${bundleKey.slice(0, 24)}`, idempotency_key: `render:${bundleKey}`, state: "completed", render: { render_id: renderId, original_path: first?.original_ref ?? "", proxy_path: first?.proxy_ref ?? first?.original_ref ?? "", preview_path: previewOutput.path, master_path: masterOutput.path, qc_report: report }, results, manifests });
    this.currentStatus = { ...this.currentStatus, render: "available", qc: "passed" };
    return { status: this.currentStatus, render_id: renderId, preview: previewResult, master: masterResult };
  }

  registerEvidence(evidence: Record<string, unknown>): void {
    if (!this.session) throw new Error("project is not open");
    assertNoStage2ExecutionAuthority(evidence);
    if (evidence.review_status !== undefined && evidence.review_status !== "candidate") throw new Error("EVIDENCE_HUMAN_APPROVAL_REQUIRED");
    const candidate: Record<string, unknown> = { ...evidence, evidence_version: Number.isSafeInteger(evidence.evidence_version) ? Number(evidence.evidence_version) : 1, review_status: "candidate" }, evidenceId = typeof candidate.evidence_id === "string" ? candidate.evidence_id : "invalid", objectVersion = Number(candidate.evidence_version), subject: Stage2PermissionTypedRef = { object_type: "evidence_object", object_id: evidenceId, object_version: objectVersion, digest: editorialObjectDigest(candidate) };
    const gate = this.stage2Gate({ action: "evidence.register", subject_ref: subject, requested_data_fields: ["evidence"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("evidence.register", candidate), reason: "register validated Evidence candidate", retain: false });
    this.commitStage2Mutation(gate, () => registerEvidence(this.session!, this.session!.manifest.project_id, candidate), "business_first");
  }

  approveEvidence(input: Readonly<{ evidence_id: string; evidence_version: number; review_digest: string; approval_id: string; reason: string }>): unknown {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["approval_id", "evidence_id", "evidence_version", "reason", "review_digest"], "evidence.approve");
    const candidate = readEvidenceObject(this.session, input.evidence_id) as any;
    if (!candidate || candidate.project_id !== this.session.manifest.project_id || candidate.object_hash !== input.review_digest || candidate.value?.review_status !== "candidate" || Number(candidate.value?.evidence_version) !== input.evidence_version || !input.reason.trim()) throw new Error("Evidence approval target is unavailable or stale");
    const subject: Stage2PermissionTypedRef = { object_type: "evidence_object", object_id: input.evidence_id, object_version: input.evidence_version, digest: input.review_digest }, effect = { evidence_id: input.evidence_id, evidence_version: input.evidence_version, review_digest: input.review_digest, outcome: "approved", reason: input.reason }, gate = this.stage2Gate({ action: "evidence.approve", subject_ref: subject, requested_data_fields: ["reason", "review_digest"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("evidence.approve", effect), reason: input.reason, approval_id: input.approval_id, retain: false }) as any, human = gate.request.approval;
    return this.commitStage2Mutation(gate, () => approveEvidence(this.session!, this.session!.manifest.project_id, input.evidence_id, input.review_digest, { approval_id: input.approval_id, actor_id: human.actor_id, approved_at: human.approved_at, reason: input.reason }));
  }

  private stage2QueryProjection(row: any, subject: Stage2PermissionTypedRef, allowedFields: readonly string[]): Readonly<Record<string, unknown>> {
    const effectiveFields = Array.isArray(row?.stale_reasons) && !allowedFields.includes("stale_reasons") ? [...allowedFields, "stale_reasons"] : allowedFields, result: Record<string, unknown> = {};
    if (effectiveFields.includes("object_id")) result.object_id = subject.object_id;
    if (effectiveFields.includes("object_version")) result.object_version = subject.object_version;
    if (effectiveFields.includes("digest")) result.digest = subject.digest;
    if (effectiveFields.includes("lifecycle_status")) result.lifecycle_status = row.lifecycle_status ?? row.value?.status ?? row.value?.review_status ?? "available";
    if (effectiveFields.includes("scores") && row.value?.scores !== undefined) result.scores = row.value.scores;
    if (effectiveFields.includes("result") && row.value?.result !== undefined) result.result = row.value.result;
    for (const field of ["action", "classification", "failure_result", "reason_code"] as const) if (effectiveFields.includes(field) && row.value?.[field] !== undefined) result[field] = row.value[field];
    if (effectiveFields.includes("scope") && Array.isArray(row.value?.affected_scope)) result.scope = [...row.value.affected_scope];
    if (effectiveFields.includes("stale_reasons") && Array.isArray(row.stale_reasons)) result.stale_reasons = [...row.stale_reasons];
    if (effectiveFields.includes("comparison_fields")) result.comparison_fields = Object.fromEntries(["title", "thesis", "confidence", "risks", "alternatives", "reason", "status"].filter((key) => row.value?.[key] !== undefined).map((key) => [key, row.value[key]]));
    return Object.freeze(result);
  }

  readEvidence(evidenceId: string): unknown {
    if (!this.session) throw new Error("project is not open");
    const row = readEvidenceObject(this.session, evidenceId) as any; if (!row) return null; const subject: Stage2PermissionTypedRef = { object_type: "evidence_object", object_id: evidenceId, object_version: Number(row.value?.evidence_version ?? 1), digest: row.object_hash }, fields = ["digest", "lifecycle_status", "object_id", "object_version"]; this.stage2Gate({ action: "creative_context.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("creative_context.query", { subject }), reason: "bounded Evidence query", retain: false }); return this.stage2QueryProjection(row, subject, fields);
  }

  createCreativeContractDraft(input: Parameters<typeof createCreativeContractDraft>[0]): CreativeContractV2 {
    if (!this.session) throw new Error("project is not open");
    if (input.project_id !== this.session.manifest.project_id) throw new Error("creative contract project mismatch");
    const draft = createCreativeContractDraft(input);
    assertCreativeContractV2(draft);
    validateCreativeContractV2(draft);
    return draft;
  }

  registerCreativeContractDraft(contract: CreativeContractV2): unknown {
    if (!this.session) throw new Error("project is not open");
    assertCreativeContractV2(contract);
    if (contract.project_id !== this.session.manifest.project_id) throw new Error("creative contract project mismatch");
    if (!['draft', 'review'].includes(contract.status) || contract.approval) throw new Error("only an unapproved creative contract draft/review can be registered");
    validateCreativeContractV2(contract);
    const projectHeads = listCreativeContractHeads(this.session, this.session.manifest.project_id) as any[];
    if (projectHeads.some((candidate) => candidate.value?.contract_id !== contract.contract_id)) throw new Error("CREATIVE_CONTRACT_PROJECT_AUTHORITY_CONFLICT");
    const head = readCreativeContractHead(this.session, this.session.manifest.project_id, contract.contract_id) as any;
    if (!head) {
      if (contract.object_version !== 1 || contract.supersedes_ref) throw new Error("initial creative contract must be version 1 without a supersedes reference");
    } else if (head.object_version !== contract.object_version) {
      const supersedes = contract.supersedes_ref;
      if (contract.object_version !== head.object_version + 1 || supersedes?.object_id !== contract.contract_id || supersedes.object_version !== head.object_version || supersedes.digest !== head.object_hash) throw new Error("creative contract successor does not bind the exact current head");
    }
    const subjectRef: Stage2PermissionTypedRef = { object_type: "creative_contract", object_id: contract.contract_id, object_version: contract.object_version, digest: editorialObjectDigest(contract) }, scope = [permissionRefKey(subjectRef)], effectDigest = stage2PermissionEffectDigest("creative_contract.register_draft", contract);
    const gate = this.stage2Gate({ action: "creative_contract.register_draft", subject_ref: subjectRef, requested_data_fields: ["contract"], affected_scope: scope, effect_digest: effectDigest, reason: "register validated Creative Contract draft", retain: false });
    return this.commitStage2Mutation(gate, () => registerCreativeContractVersion(this.session!, this.session!.manifest.project_id, contract), "business_first");
  }

  readCreativeContract(contractId: string, objectVersion?: number): unknown {
    if (!this.session) throw new Error("project is not open");
    const row = objectVersion === undefined ? readCreativeContractHead(this.session, this.session.manifest.project_id, contractId) : readCreativeContractVersion(this.session, this.session.manifest.project_id, contractId, objectVersion) as any;
    if (!row) return null; const subject = { object_type: "creative_contract" as const, object_id: row.value.contract_id, object_version: row.value.object_version, digest: row.object_hash }, fields = ["digest", "lifecycle_status", "object_id", "object_version"]; this.stage2Gate({ action: "creative_context.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("creative_context.query", { subject }), reason: "bounded Creative Contract query", retain: false }); return this.stage2QueryProjection(row, subject, fields);
  }

  listCreativeContractVersions(contractId: string): readonly unknown[] {
    if (!this.session) throw new Error("project is not open");
    const fields = ["digest", "lifecycle_status", "object_id", "object_version"], rows = listCreativeContractVersions(this.session, this.session.manifest.project_id, contractId) as any[]; return rows.map((row) => { const subject = { object_type: "creative_contract" as const, object_id: row.value.contract_id, object_version: row.value.object_version, digest: row.object_hash }; this.stage2Gate({ action: "creative_context.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("creative_context.query", { subject }), reason: "bounded Creative Contract list query", retain: false }); return this.stage2QueryProjection(row, subject, fields); });
  }

  approveCreativeContract(input: Readonly<{ contract_id: string; object_version: number; review_digest: string; approval_id: string }>): unknown {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["approval_id", "contract_id", "object_version", "review_digest"], "creative_contract.approve");
    const projectId = this.session.manifest.project_id;
    const review = readCreativeContractVersion(this.session, projectId, input.contract_id, input.object_version) as any;
    if (!review || !['draft', 'review'].includes(review.lifecycle_status)) throw new Error("creative contract review version is unavailable");
    const head = readCreativeContractHead(this.session, projectId, input.contract_id) as any;
    if (head?.lifecycle_status === "approved" && head.object_version === input.object_version + 1 && head.value?.supersedes_ref?.digest === input.review_digest) { const subject = { object_type: "creative_contract" as const, object_id: input.contract_id, object_version: input.object_version, digest: input.review_digest }, effect = { contract_id: input.contract_id, object_version: input.object_version, review_digest: input.review_digest, outcome: "approved" }, gate = this.stage2Gate({ action: "creative_contract.approve", subject_ref: subject, requested_data_fields: ["reason", "review_digest"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("creative_contract.approve", effect), reason: "approve exact Creative Contract review", approval_id: input.approval_id, retain: false }); this.retainStage2Gate(gate); return head; }
    if (!head || head.object_version !== input.object_version || head.object_hash !== input.review_digest || review.object_hash !== input.review_digest) throw new Error("creative contract approval is stale or digest-rebound");
    const source = review.value as CreativeContractV2;
    if (source.approval_policy.mode !== "explicit_user" || source.approval_policy.actor_kind !== "user") throw new Error("creative contract approval policy cannot auto-approve Stage 2");
    const subject = { object_type: "creative_contract" as const, object_id: source.contract_id, object_version: source.object_version, digest: review.object_hash }, effect = { contract_id: input.contract_id, object_version: input.object_version, review_digest: input.review_digest, outcome: "approved" }, gate = this.stage2Gate({ action: "creative_contract.approve", subject_ref: subject, requested_data_fields: ["reason", "review_digest"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("creative_contract.approve", effect), reason: "approve exact Creative Contract review", approval_id: input.approval_id, retain: false }) as any, human = gate.request.approval;
    const approved: CreativeContractV2 = { ...source, object_version: source.object_version + 1, status: "approved", supersedes_ref: { object_id: source.contract_id, object_version: source.object_version, digest: review.object_hash }, approval: { actor_id: human.actor_id, actor_kind: "user", approved_at: human.approved_at, review_digest: input.review_digest } };
    assertCreativeContractV2(approved);
    validateCreativeContractV2(approved);
    return this.commitStage2Mutation(gate, () => registerCreativeContractVersion(this.session!, projectId, approved));
  }

  rejectCreativeContract(input: Readonly<{ decision_id: string; contract_id: string; object_version: number; object_digest: string; approval_id: string; reason: string }>): unknown {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["approval_id", "contract_id", "decision_id", "object_digest", "object_version", "reason"], "creative_contract.reject");
    const projectId = this.session.manifest.project_id;
    const candidate = readCreativeContractVersion(this.session, projectId, input.contract_id, input.object_version) as any;
    const head = readCreativeContractHead(this.session, projectId, input.contract_id) as any;
    if (!candidate || !head || !['draft', 'review'].includes(candidate.lifecycle_status) || head.object_version !== candidate.object_version || head.object_hash !== candidate.object_hash || candidate.object_hash !== input.object_digest || !input.reason.trim()) throw new Error("creative contract rejection target is invalid or stale");
    const subject = { object_type: "creative_contract" as const, object_id: input.contract_id, object_version: input.object_version, digest: input.object_digest }, effect = { decision_id: input.decision_id, contract_id: input.contract_id, object_version: input.object_version, object_digest: input.object_digest, outcome: "rejected", reason: input.reason }, gate = this.stage2Gate({ action: "creative_contract.reject", subject_ref: subject, requested_data_fields: ["reason", "review_digest"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("creative_contract.reject", effect), reason: input.reason, approval_id: input.approval_id, retain: false }) as any, human = gate.request.approval;
    return this.commitStage2Mutation(gate, () => registerCreativeContractDecision(this.session!, projectId, { schema_version: 1, decision_id: input.decision_id, decision_type: "creative_contract_review", contract_id: input.contract_id, object_version: input.object_version, object_digest: input.object_digest, outcome: "rejected", actor_id: human.actor_id, decided_at: human.approved_at, reason: input.reason }));
  }

  readCreativeContractDecision(decisionId: string): unknown {
    if (!this.session) throw new Error("project is not open");
    const row = readCreativeContractDecision(this.session, this.session.manifest.project_id, decisionId) as any; if (!row?.value) return null; const subject = { object_type: "creative_contract" as const, object_id: row.value.contract_id, object_version: row.value.object_version, digest: row.value.object_digest }, fields = ["digest", "lifecycle_status", "object_id", "object_version"]; this.stage2Gate({ action: "creative_context.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("creative_context.query", { subject, decision_id: decisionId }), reason: "bounded Creative Contract review Decision query", retain: false }); return this.stage2QueryProjection(row, subject, fields);
  }

  async assembleMaterialEvidencePack(input: MaterialEvidencePackAssemblyInput): Promise<unknown> {
    if (Object.prototype.hasOwnProperty.call(input as object, "authority_ref")) throw new Error("MATERIAL_PACK_PRODUCT_AUTHORITY_IS_HOST_OWNED");
    return this.assembleMaterialEvidencePackInternal(input);
  }

  private async assembleStage2ProductMaterialEvidencePack(input: MaterialEvidencePackAssemblyInput): Promise<unknown> {
    return this.assembleMaterialEvidencePackInternal(input, stage2ProductMaterialAuthorityRef());
  }

  private async assembleMaterialEvidencePackInternal(input: MaterialEvidencePackAssemblyInput, authorityRef?: string): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const projectId = this.session.manifest.project_id;
    const contractRow = readCreativeContractVersion(this.session, projectId, input.contract_ref.object_id, input.contract_ref.object_version) as any;
    const head = readCreativeContractHead(this.session, projectId, input.contract_ref.object_id) as any;
    if (!contractRow || contractRow.lifecycle_status !== "approved" || contractRow.object_hash !== input.contract_ref.digest || !head || head.object_hash !== contractRow.object_hash) throw new Error("material pack contract is unapproved or stale");
    const contract = contractRow.value as CreativeContractV2;
    assertCreativeContractV2(contract);
    if (authorityRef !== undefined && authorityRef !== stage2ProductMaterialAuthorityRef()) throw new Error("material pack authority reference is invalid");
    if (input.evidence_ids.length === 0 || new Set(input.evidence_ids).size !== input.evidence_ids.length) throw new Error("material pack evidence IDs must be nonempty and unique");
    const evidenceRefs = input.evidence_ids.map((evidenceId) => {
      const evidence = readEvidenceObject(this.session!, evidenceId) as any;
      if (!evidence || evidence.project_id !== projectId || evidence.value.review_status !== "approved" || !Number.isInteger(evidence.value.evidence_version) || evidence.value.evidence_version < 1 || !Number.isInteger(evidence.value.timescale) || evidence.value.timescale < 1) throw new Error(`material evidence is unknown or unapproved: ${evidenceId}`);
      return { evidence_id: evidenceId, evidence_type: evidence.analysis_type, evidence_version: evidence.value.evidence_version, asset_id: evidence.asset_id, range: { start: { schema_version: 1 as const, value: evidence.start_pts, timescale: evidence.value.timescale }, end: { schema_version: 1 as const, value: evidence.end_pts, timescale: evidence.value.timescale } }, review_status: "approved" as const, content_digest: evidence.object_hash };
    }).sort((left, right) => left.evidence_id.localeCompare(right.evidence_id));
    const assetIds = [...new Set(evidenceRefs.map((reference) => reference.asset_id))].sort();
    const persistenceRevision = this.stage2PersistenceRevision();
    const identityCache = new Map<string, Promise<boolean>>();
    const resolvedAvailability = await Promise.all(assetIds.map(async (assetId) => {
      const asset = readMediaAsset(this.session!, projectId, assetId) as any;
      const expectedVerifiedAt = input.expected_media_verified_at[assetId];
      const candidates = (listAssetLocationsForAssets(this.session!, projectId, [assetId]) as PersistedAssetLocation[]).filter((candidate) => candidate.location_type === "original" && candidate.verified_at === expectedVerifiedAt && candidate.metadata?.permission_state === "authorized" && candidate.metadata.permission_decision?.permission_state === "authorized" && versionedRefMatches(candidate.metadata.permission_decision.policy_ref, contract.rights_policy_ref));
      if (!asset || asset.asset_id !== assetId || !expectedVerifiedAt || candidates.length !== 1) throw new Error(`material media fact is unavailable or stale (including ambiguous): ${assetId}`);
      const location = candidates[0]!, immutable = this.immutableOriginalForSource(location);
      if (!immutable || immutable.metadata?.permission_state !== "authorized" || immutable.metadata.permission_decision?.permission_state !== "authorized" || !versionedRefMatches(immutable.metadata.permission_decision.policy_ref, contract.rights_policy_ref) || !(await this.currentIdentityForLocation(immutable, identityCache))) throw new Error(`material immutable source is unavailable or stale: ${assetId}`);
      const permissionState = location.metadata?.permission_state ?? "unknown";
      return { availability: { asset_id: assetId, original_identity: assetId, permission_state: permissionState, verified_at: location.verified_at }, immutable_ref: stage2ImmutableOriginalAuthorityRef(immutable) };
    }));
    const availability = resolvedAvailability.map((item) => item.availability), immutableOriginalRefs = resolvedAvailability.map((item) => item.immutable_ref).sort();
    this.assertStage2PersistenceRevision(persistenceRevision, "material pack authority is unavailable or stale");
    const evidenceIds = new Set(evidenceRefs.map((reference) => reference.evidence_id));
    const rows = [...input.coverage_matrix.rows].sort((left, right) => left.requirement_id.localeCompare(right.requirement_id));
    const requirementIds = new Set(contract.requirements.map((requirement) => requirement.requirement_id));
    if (new Set(rows.map((row) => row.requirement_id)).size !== rows.length || rows.some((row) => !requirementIds.has(row.requirement_id))) throw new Error("coverage matrix contains duplicate or unknown requirements");
    if (rows.some((row) => row.evidence_ids.some((id) => !evidenceIds.has(id)))) throw new Error("coverage matrix references evidence outside the pack");
    if (rows.some((row) => row.status === "covered" && row.evidence_ids.length === 0)) throw new Error("covered requirement lacks approved evidence");
    const covered = rows.filter((row) => row.status === "covered").map((row) => row.requirement_id);
    const missing = rows.filter((row) => row.status === "missing").map((row) => row.requirement_id);
    const conflicting = rows.filter((row) => row.status === "conflict").map((row) => row.requirement_id);
    const hardIds = contract.requirements.filter((requirement) => requirement.kind === "hard").map((requirement) => requirement.requirement_id);
    for (const hardId of hardIds) if (!rows.some((row) => row.requirement_id === hardId)) missing.push(hardId);
    const normalizedCoverage = { ...input.coverage_matrix, rows };
    const coverageDigest = createHash("sha256").update(canonicalCreativeContext(normalizedCoverage)).digest("hex");
    const assembledAt = input.created_at ?? new Date().toISOString();
    const assembledMs = Date.parse(assembledAt);
    if (!Number.isFinite(assembledMs)) throw new Error("material pack creation time is invalid");
    if (input.expires_at) {
      const expiryMs = Date.parse(input.expires_at);
      if (!Number.isFinite(expiryMs) || expiryMs <= assembledMs || expiryMs <= this.now()) throw new Error("material pack expiry is stale or invalid");
    }
    const contextInput = { contract_ref: input.contract_ref, evidence_refs: evidenceRefs, coverage_matrix_ref: { object_id: input.coverage_matrix.matrix_id, object_version: 1, digest: coverageDigest }, sufficiency: { covered_requirement_ids: [...new Set(covered)].sort(), missing_requirement_ids: [...new Set(missing)].sort(), conflicting_requirement_ids: [...new Set(conflicting)].sort() }, availability, immutable_original_refs: immutableOriginalRefs, policy_snapshot: { policy_version: input.policy_version, privacy_policy_ref: contract.privacy_policy_ref, rights_policy_ref: contract.rights_policy_ref }, ...(authorityRef === undefined ? {} : { authority_ref: authorityRef }), timeline_version: input.timeline_version ?? null, expires_at: input.expires_at ?? null };
    const inputFingerprint = createHash("sha256").update(canonicalCreativeContext(contextInput)).digest("hex");
    const rawTimeline = readLatestTimeline(this.session, projectId);
    const currentTimeline = rawTimeline ? revive(JSON.parse(rawTimeline)) as Timeline : null;
    if (currentTimeline && input.timeline_version === undefined) throw new Error("material pack must bind the current Timeline version");
    if (input.timeline_version !== undefined && (!currentTimeline || currentTimeline.version !== input.timeline_version)) throw new Error("material pack Timeline version is stale");
    const existing = readMaterialEvidencePackByInput(this.session, projectId, inputFingerprint) as any;
    if (existing && existing.lifecycle_status !== "stale" && existing.lifecycle_status !== "superseded") return existing;
    const pack: MaterialEvidencePackV1 = { schema_version: 1, pack_id: input.pack_id, project_id: projectId, object_version: input.object_version ?? 1, status: missing.length || conflicting.length ? "insufficient" : "sufficient", contract_ref: input.contract_ref, ...(input.timeline_version === undefined ? {} : { timeline_version: input.timeline_version }), evidence_refs: evidenceRefs, moment_refs: [], event_refs: [], coverage_matrix_ref: contextInput.coverage_matrix_ref, sufficiency: contextInput.sufficiency, availability: availability as any, policy_snapshot: contextInput.policy_snapshot, input_fingerprint: inputFingerprint, created_at: assembledAt, ...(input.expires_at ? { expires_at: input.expires_at } : {}), provenance: { producer: "project-host", source_version: MATERIAL_EVIDENCE_ASSEMBLER_VERSION, policy_version: input.policy_version, input_refs: [input.contract_ref.digest, ...evidenceRefs.map((reference) => reference.content_digest), coverageDigest, ...immutableOriginalRefs, ...(authorityRef ? [authorityRef] : [])], unresolved_assumptions: [] } };
    assertMaterialEvidencePackV1(pack);
    validateMaterialEvidencePack(pack, contract);
    const subject = { object_type: "creative_contract" as const, ...input.contract_ref }, effectDigest = stage2PermissionEffectDigest("material_evidence_pack.assemble", pack);
    return runStage2AtomicMutation(this.session, () => {
      this.assertStage2PersistenceRevision(persistenceRevision, "material pack authority is unavailable or stale");
      const freshContract = readCreativeContractVersion(this.session!, projectId, input.contract_ref.object_id, input.contract_ref.object_version) as any, freshHead = readCreativeContractHead(this.session!, projectId, input.contract_ref.object_id) as any;
      if (!freshContract || !freshHead || freshContract.object_hash !== input.contract_ref.digest || freshContract.lifecycle_status !== "approved" || freshHead.object_version !== input.contract_ref.object_version || freshHead.object_hash !== input.contract_ref.digest || freshHead.lifecycle_status !== "approved") throw new Error("material pack authority is unavailable or stale");
      this.assertMaterialPackImmutableSourcesCurrent(pack, "material pack authority is unavailable or stale");
      const gate = this.stage2Gate({ action: "material_evidence_pack.assemble", subject_ref: subject, requested_data_fields: ["availability", "coverage_matrix_ref", "evidence_refs", "policy_snapshot"], affected_scope: [permissionRefKey(subject)], effect_digest: effectDigest, reason: "assemble Host-derived Material Evidence Pack", retain: false });
      this.retainStage2Gate(gate);
      return registerMaterialEvidencePack(this.session!, projectId, pack, { coverage_matrix: normalizedCoverage });
    });
  }

  private async materialEvidencePackView(row: any, identityCache = new Map<string, Promise<boolean>>()): Promise<any> {
    if (!this.session || !row) return row;
    const projectId = this.session.manifest.project_id;
    const pack = row.value as MaterialEvidencePackV1;
    const staleReasons: string[] = [];
    const head = readCreativeContractHead(this.session, projectId, pack.contract_ref.object_id) as any;
    if (!head || head.object_version !== pack.contract_ref.object_version || head.object_hash !== pack.contract_ref.digest) staleReasons.push("creative_contract_head_changed");
    if (!head?.value || pack.policy_snapshot.policy_version !== pack.provenance.policy_version || !versionedRefMatches(pack.policy_snapshot.privacy_policy_ref, head.value.privacy_policy_ref) || !versionedRefMatches(pack.policy_snapshot.rights_policy_ref, head.value.rights_policy_ref)) staleReasons.push("policy_snapshot_changed");
    const productMaterialPack = isStage2ProductMaterialPack(pack), productAuthorityRefs = stage2ProductMaterialAuthorityRefs(pack);
    if (productMaterialPack && pack.provenance.source_version !== MATERIAL_EVIDENCE_ASSEMBLER_VERSION) staleReasons.push("material_assembler_authority_changed");
    if (productMaterialPack && (productAuthorityRefs.length !== 1 || productAuthorityRefs[0] !== stage2ProductMaterialAuthorityRef())) staleReasons.push("product_material_authority_changed");
    if (productMaterialPack && (pack.policy_snapshot.policy_version !== CREATIVE_SKILL_POLICY_VERSION || pack.policy_snapshot.policy_version !== DURATION_MATERIAL_POLICY_VERSION)) staleReasons.push("material_policy_authority_changed");
    if (pack.timeline_version !== undefined) {
      const raw = readLatestTimeline(this.session, projectId);
      const timeline = raw ? revive(JSON.parse(raw)) as Timeline : null;
      if (!timeline || timeline.version !== pack.timeline_version) staleReasons.push("timeline_version_changed");
    }
    for (const reference of pack.evidence_refs) {
      const evidence = readEvidenceObject(this.session, reference.evidence_id) as any;
      if (!evidence || evidence.object_hash !== reference.content_digest || evidence.value?.review_status !== "approved" || evidence.value?.evidence_version !== reference.evidence_version) staleReasons.push(`evidence_changed:${reference.evidence_id}`);
    }
    const immutableRefs = stage2ImmutableOriginalRefs(pack);
    for (const availability of pack.availability) {
      const all = listAssetLocationsForAssets(this.session, projectId, [availability.asset_id]) as PersistedAssetLocation[];
      const originals = all.filter((candidate) => candidate.location_type === "original" && candidate.verified_at === availability.verified_at && candidate.metadata?.permission_state === "authorized" && candidate.metadata.permission_decision?.permission_state === "authorized" && versionedRefMatches(candidate.metadata.permission_decision.policy_ref, pack.policy_snapshot.rights_policy_ref));
      const candidates = all.filter((candidate) => candidate.location_type === "immutable_original" && originals.some((original) => candidate.metadata?.source_asset_location_id === original.asset_location_id && candidate.metadata?.source_location_identity === originalLocationAuthorityIdentity(original)) && immutableRefs.has(stage2ImmutableOriginalAuthorityRef(candidate)) && candidate.metadata?.permission_state === "authorized" && candidate.metadata.permission_decision?.permission_state === "authorized" && versionedRefMatches(candidate.metadata.permission_decision.policy_ref, pack.policy_snapshot.rights_policy_ref));
      const current = await Promise.all(candidates.map(async (candidate) => ({ candidate, current: await this.currentIdentityForLocation(candidate, identityCache) })));
      const locations = current.filter((result) => result.current).map((result) => result.candidate);
      if (originals.length !== 1 || locations.length !== 1) staleReasons.push(`media_changed:${availability.asset_id}`);
    }
    if (pack.expires_at) { const expiryMs = Date.parse(pack.expires_at); if (!Number.isFinite(expiryMs)) staleReasons.push("pack_expiry_invalid"); else if (expiryMs <= this.now()) staleReasons.push("pack_expired"); }
    return staleReasons.length ? { ...row, lifecycle_status: "stale", stale_reasons: [...new Set(staleReasons)].sort() } : row;
  }

  private assertMaterialPackImmutableSourcesCurrent(pack: MaterialEvidencePackV1, errorMessage: string): void {
    if (!this.session) throw new Error("project is not open");
    const projectId = this.session.manifest.project_id, immutableRefs = stage2ImmutableOriginalRefs(pack);
    for (const availability of pack.availability) {
      const all = listAssetLocationsForAssets(this.session, projectId, [availability.asset_id]) as PersistedAssetLocation[];
      const originals = all.filter((candidate) => candidate.location_type === "original" && candidate.verified_at === availability.verified_at && candidate.metadata?.permission_state === "authorized" && candidate.metadata.permission_decision?.permission_state === "authorized" && versionedRefMatches(candidate.metadata.permission_decision.policy_ref, pack.policy_snapshot.rights_policy_ref));
      const immutable = all.filter((candidate) => candidate.location_type === "immutable_original" && originals.some((original) => candidate.metadata?.source_asset_location_id === original.asset_location_id && candidate.metadata?.source_location_identity === originalLocationAuthorityIdentity(original)) && immutableRefs.has(stage2ImmutableOriginalAuthorityRef(candidate)) && candidate.metadata?.permission_state === "authorized" && candidate.metadata.permission_decision?.permission_state === "authorized" && versionedRefMatches(candidate.metadata.permission_decision.policy_ref, pack.policy_snapshot.rights_policy_ref) && this.stage2ImmutableLocationIsCurrent(candidate));
      if (originals.length !== 1 || immutable.length !== 1) throw new Error(errorMessage);
    }
  }

  private assertCurrentMaterialPackReference(projectId: string, reference: Readonly<{ object_id: string; object_version: number; digest: string }>, errorMessage: string): any {
    if (!this.session) throw new Error("project is not open");
    const row = readMaterialEvidencePack(this.session, projectId, reference.object_id, reference.object_version) as any, expiryMs = row?.value?.expires_at ? Date.parse(row.value.expires_at) : null;
    if (!row || row.object_hash !== reference.digest || row.value?.object_version !== reference.object_version || row.lifecycle_status !== "sufficient" || expiryMs !== null && (!Number.isFinite(expiryMs) || expiryMs <= this.now())) throw new Error(errorMessage);
    this.assertMaterialPackImmutableSourcesCurrent(row.value, errorMessage);
    return row;
  }

  async readMaterialEvidencePack(packId: string, objectVersion?: number): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const row = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, this.session.manifest.project_id, packId, objectVersion ?? null)) as any; if (!row) return null; const subject = { object_type: "material_evidence_pack" as const, object_id: row.value.pack_id, object_version: row.value.object_version, digest: row.object_hash }, fields = ["digest", "lifecycle_status", "object_id", "object_version"]; this.stage2Gate({ action: "creative_context.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("creative_context.query", { subject }), reason: "bounded Material Evidence Pack query", retain: false }); return this.stage2QueryProjection(row, subject, fields);
  }

  async listMaterialEvidencePacks(): Promise<readonly unknown[]> {
    if (!this.session) throw new Error("project is not open");
    const identityCache = new Map<string, Promise<boolean>>();
    const fields = ["digest", "lifecycle_status", "object_id", "object_version"], rows = await Promise.all(listMaterialEvidencePacks(this.session, this.session.manifest.project_id).map((row: unknown) => this.materialEvidencePackView(row, identityCache))) as any[]; return rows.map((row) => { const subject = { object_type: "material_evidence_pack" as const, object_id: row.value.pack_id, object_version: row.value.object_version, digest: row.object_hash }; this.stage2Gate({ action: "creative_context.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("creative_context.query", { subject }), reason: "bounded Material Evidence Pack list query", retain: false }); return this.stage2QueryProjection(row, subject, fields); });
  }

  pinBuiltInCreativeSkillDefinition(skillId: string, skillVersion: number): unknown {
    if (!this.session) throw new Error("project is not open");
    const definition = builtInCreativeSkillDefinitions.find((candidate) => candidate.skill_id === skillId && candidate.skill_version === skillVersion);
    if (!definition) throw new Error("creative skill definition is unknown or untrusted");
    assertCreativeSkillDefinitionV1(definition);
    validateCreativeSkillDefinition(definition);
    if (definition.status !== "published" || definition.governance.trust_status !== "trusted" || definition.governance.license_status !== "approved") throw new Error("creative skill definition is unavailable");
    const subject = { object_type: "creative_skill_definition" as const, object_id: definition.skill_id, object_version: definition.skill_version, digest: definition.definition_digest };
    const gate = this.stage2Gate({ action: "creative_skill_definition.pin", subject_ref: subject, requested_data_fields: ["definition_ref"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("creative_skill_definition.pin", definition), reason: "pin trusted built-in Creative Skill Definition", retain: false });
    const pinned = this.commitStage2Mutation(gate, () => registerCreativeSkillDefinition(this.session!, this.session!.manifest.project_id, definition), "business_first");
    const control = readCreativeSkillDefinitionControl(this.session, this.session.manifest.project_id, definition.skill_id, definition.skill_version) as any;
    if (!control || control.availability !== "active") throw new Error("creative skill definition is retired or revoked");
    return pinned;
  }

  readCreativeSkillDefinition(skillId: string, skillVersion: number): unknown {
    if (!this.session) throw new Error("project is not open");
    const row = readCreativeSkillDefinition(this.session, this.session.manifest.project_id, skillId, skillVersion) as any; if (!row) return null; const subject = { object_type: "creative_skill_definition" as const, object_id: skillId, object_version: skillVersion, digest: row.definition_digest }, fields = ["digest", "lifecycle_status", "object_id", "object_version", "scores"]; this.stage2Gate({ action: "creative_skill_knowledge.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("creative_skill_knowledge.query", { subject }), reason: "bounded Creative Skill Definition query", retain: false }); return this.stage2QueryProjection(row, subject, fields);
  }

  listCreativeSkillDefinitions(): readonly unknown[] {
    if (!this.session) throw new Error("project is not open");
    const fields = ["digest", "lifecycle_status", "object_id", "object_version", "scores"], rows = listCreativeSkillDefinitions(this.session, this.session.manifest.project_id) as any[]; return rows.map((row) => { const subject = { object_type: "creative_skill_definition" as const, object_id: row.value.skill_id, object_version: row.value.skill_version, digest: row.definition_digest }; this.stage2Gate({ action: "creative_skill_knowledge.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("creative_skill_knowledge.query", { subject }), reason: "bounded Creative Skill Definition list query", retain: false }); return this.stage2QueryProjection(row, subject, fields); });
  }

  withdrawCreativeSkillDefinition(skillId: string, skillVersion: number, availability: "retired" | "revoked", reason: string): unknown {
    if (!this.session) throw new Error("project is not open");
    const row = readCreativeSkillDefinition(this.session, this.session.manifest.project_id, skillId, skillVersion) as any; if (!row) throw new Error("creative skill definition is unavailable"); const subject = { object_type: "creative_skill_definition" as const, object_id: skillId, object_version: skillVersion, digest: row.definition_digest };
    const gate = this.stage2Gate({ action: "creative_skill_definition.withdraw", subject_ref: subject, requested_data_fields: ["availability", "reason"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("creative_skill_definition.withdraw", { skillId, skillVersion, availability, reason }), reason, retain: false });
    return this.commitStage2Mutation(gate, () => setCreativeSkillDefinitionAvailability(this.session!, this.session!.manifest.project_id, skillId, skillVersion, availability, reason));
  }

  async evaluateCreativeSkillKnowledge(input: SkillEvaluationInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    validateSkillEvaluationInput(input);
    const projectId = this.session.manifest.project_id;
    const currentDefinition = builtInCreativeSkillDefinitions.find((candidate) => candidate.skill_id === input.definition_ref.object_id && candidate.skill_version === input.definition_ref.object_version && candidate.definition_digest === input.definition_ref.digest);
    if (!currentDefinition || currentDefinition.status !== "published" || currentDefinition.governance.trust_status !== "trusted" || currentDefinition.governance.license_status !== "approved") throw new Error("creative skill definition is no longer available in the trusted catalog");
    const definitionControl = readCreativeSkillDefinitionControl(this.session, projectId, input.definition_ref.object_id, input.definition_ref.object_version) as any;
    if (!definitionControl || definitionControl.availability !== "active") throw new Error("creative skill definition is retired or revoked");
    const definitionRow = readCreativeSkillDefinition(this.session, projectId, input.definition_ref.object_id, input.definition_ref.object_version) as any;
    if (!definitionRow || definitionRow.definition_digest !== input.definition_ref.digest || definitionRow.lifecycle_status !== "published" || definitionRow.trust_status !== "trusted" || definitionRow.license_status !== "approved") throw new Error("creative skill definition is unavailable or rebound");
    assertCreativeSkillDefinitionV1(definitionRow.value);
    validateCreativeSkillDefinition(definitionRow.value);
    const contractRow = readCreativeContractVersion(this.session, projectId, input.contract_ref.object_id, input.contract_ref.object_version) as any;
    const contractHead = readCreativeContractHead(this.session, projectId, input.contract_ref.object_id) as any;
    if (!contractRow || contractRow.lifecycle_status !== "approved" || contractRow.object_hash !== input.contract_ref.digest || !contractHead || contractHead.object_hash !== contractRow.object_hash) throw new Error("creative skill Contract is unapproved or stale");
    assertCreativeContractV2(contractRow.value);
    const persistenceRevision = this.stage2PersistenceRevision();
    const packRow = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, input.material_pack_ref.object_id, input.material_pack_ref.object_version)) as any;
    this.assertStage2PersistenceRevision(persistenceRevision, "creative skill evaluation authority is unavailable or stale");
    if (!packRow || packRow.lifecycle_status !== "sufficient" || packRow.object_hash !== input.material_pack_ref.digest || packRow.value.project_id !== projectId || packRow.value.contract_ref.object_id !== input.contract_ref.object_id || packRow.value.contract_ref.object_version !== input.contract_ref.object_version || packRow.value.contract_ref.digest !== input.contract_ref.digest) throw new Error("creative skill Material Evidence Pack is insufficient, stale or rebound");
    assertMaterialEvidencePackV1(packRow.value);
    const evaluation = evaluateCreativeSkill(definitionRow.value, contractRow.value, packRow.value, input);
    assertSkillEvaluationV1(evaluation);
    const existing = readSkillEvaluationByInput(this.session, projectId, evaluation.input_fingerprint) as any;
    if (existing && existing.lifecycle_status !== "stale") return this.skillEvaluationView(existing);
    const subject = { object_type: "creative_skill_definition" as const, object_id: input.definition_ref.object_id, object_version: input.definition_ref.object_version, digest: input.definition_ref.digest }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...input.contract_ref }, { object_type: "material_evidence_pack", ...input.material_pack_ref }], scope = [subject, ...contexts].map(permissionRefKey).sort();
    return runStage2AtomicMutation(this.session, () => {
      this.assertStage2PersistenceRevision(persistenceRevision, "creative skill evaluation authority is unavailable or stale");
      this.assertCurrentMaterialPackReference(projectId, input.material_pack_ref, "creative skill evaluation authority is unavailable or stale");
      const gate = this.stage2Gate({ action: "skill_evaluation.evaluate", subject_ref: subject, context_refs: contexts, requested_data_fields: ["diagnostics", "input_refs", "scores"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("skill_evaluation.evaluate", evaluation), reason: "run deterministic Creative Skill evaluation", retain: false });
      this.retainStage2Gate(gate);
      return registerSkillEvaluation(this.session!, projectId, evaluation);
    });
  }

  private async skillEvaluationView(row: any, identityCache = new Map<string, Promise<boolean>>()): Promise<any> {
    if (!this.session || !row) return row;
    const projectId = this.session.manifest.project_id;
    const evaluation = row.value as any;
    const staleReasons: string[] = [];
    const definition = readCreativeSkillDefinition(this.session, projectId, evaluation.definition_ref.object_id, evaluation.definition_ref.object_version) as any;
    if (!definition || definition.definition_digest !== evaluation.definition_ref.digest || definition.lifecycle_status !== "published" || definition.trust_status !== "trusted" || definition.license_status !== "approved") staleReasons.push("definition_unavailable");
    const currentDefinition = builtInCreativeSkillDefinitions.find((candidate) => candidate.skill_id === evaluation.definition_ref.object_id && candidate.skill_version === evaluation.definition_ref.object_version && candidate.definition_digest === evaluation.definition_ref.digest);
    if (!currentDefinition || currentDefinition.status !== "published" || currentDefinition.governance.trust_status !== "trusted" || currentDefinition.governance.license_status !== "approved") staleReasons.push("definition_catalog_changed");
    const definitionControl = readCreativeSkillDefinitionControl(this.session, projectId, evaluation.definition_ref.object_id, evaluation.definition_ref.object_version) as any;
    if (!definitionControl || definitionControl.availability !== "active") staleReasons.push("definition_withdrawn");
    if (evaluation.provenance?.evaluator_version !== CREATIVE_SKILL_EVALUATOR_VERSION || evaluation.provenance?.policy_version !== CREATIVE_SKILL_POLICY_VERSION) staleReasons.push("evaluation_authority_changed");
    const contractHead = readCreativeContractHead(this.session, projectId, evaluation.contract_ref.object_id) as any;
    if (!contractHead || contractHead.object_version !== evaluation.contract_ref.object_version || contractHead.object_hash !== evaluation.contract_ref.digest) staleReasons.push("creative_contract_head_changed");
    const pack = readMaterialEvidencePack(this.session, projectId, evaluation.material_pack_ref.object_id, evaluation.material_pack_ref.object_version) as any;
    const packView = await this.materialEvidencePackView(pack, identityCache);
    if (!packView || packView.object_hash !== evaluation.material_pack_ref.digest || packView.lifecycle_status !== "sufficient" || packView.value?.project_id !== projectId || packView.value?.contract_ref?.object_id !== evaluation.contract_ref.object_id || packView.value?.contract_ref?.object_version !== evaluation.contract_ref.object_version || packView.value?.contract_ref?.digest !== evaluation.contract_ref.digest) staleReasons.push("material_pack_changed");
    return staleReasons.length ? { ...row, lifecycle_status: "stale", stale_reasons: [...new Set(staleReasons)].sort() } : row;
  }

  async readSkillEvaluation(evaluationId: string, objectVersion?: number): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const row = await this.skillEvaluationView(readSkillEvaluation(this.session, this.session.manifest.project_id, evaluationId, objectVersion ?? null)) as any; if (!row) return null; const subject = { object_type: "skill_evaluation" as const, object_id: row.value.evaluation_id, object_version: row.value.object_version, digest: row.object_hash }, fields = ["digest", "lifecycle_status", "object_id", "object_version", "scores"]; this.stage2Gate({ action: "creative_skill_knowledge.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("creative_skill_knowledge.query", { subject }), reason: "bounded Skill Evaluation query", retain: false }); return this.stage2QueryProjection(row, subject, fields);
  }

  async listSkillEvaluations(): Promise<readonly unknown[]> {
    if (!this.session) throw new Error("project is not open");
    const identityCache = new Map<string, Promise<boolean>>();
    const fields = ["digest", "lifecycle_status", "object_id", "object_version", "scores"], rows = await Promise.all(listSkillEvaluations(this.session, this.session.manifest.project_id).map((row: unknown) => this.skillEvaluationView(row, identityCache))) as any[]; return rows.map((row) => { const subject = { object_type: "skill_evaluation" as const, object_id: row.value.evaluation_id, object_version: row.value.object_version, digest: row.object_hash }; this.stage2Gate({ action: "creative_skill_knowledge.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("creative_skill_knowledge.query", { subject }), reason: "bounded Skill Evaluation list query", retain: false }); return this.stage2QueryProjection(row, subject, fields); });
  }

  pinBuiltInDurationBlueprint(blueprintId: string, blueprintVersion: number): unknown {
    if (!this.session) throw new Error("project is not open");
    const blueprint = builtInDurationBlueprints.find((candidate) => candidate.blueprint_id === blueprintId && candidate.blueprint_version === blueprintVersion);
    if (!blueprint) throw new Error("duration blueprint is unknown or untrusted");
    assertDurationBlueprintV1(blueprint);
    validateDurationBlueprint(blueprint);
    if (blueprint.status !== "published" || blueprint.governance.trust_status !== "trusted") throw new Error("duration blueprint is unavailable");
    const subject = { object_type: "duration_blueprint" as const, object_id: blueprint.blueprint_id, object_version: blueprint.blueprint_version, digest: blueprint.definition_digest };
    const gate = this.stage2Gate({ action: "duration_blueprint.pin", subject_ref: subject, requested_data_fields: ["blueprint_ref"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("duration_blueprint.pin", blueprint), reason: "pin trusted built-in Duration Blueprint", retain: false });
    return this.commitStage2Mutation(gate, () => registerDurationBlueprint(this.session!, this.session!.manifest.project_id, blueprint), "business_first");
  }

  readDurationBlueprint(blueprintId: string, blueprintVersion: number): unknown {
    if (!this.session) throw new Error("project is not open");
    const row = readDurationBlueprint(this.session, this.session.manifest.project_id, blueprintId, blueprintVersion) as any; if (!row) return null; const subject = { object_type: "duration_blueprint" as const, object_id: blueprintId, object_version: blueprintVersion, digest: row.definition_digest }, fields = ["digest", "lifecycle_status", "object_id", "object_version", "result"]; this.stage2Gate({ action: "duration_knowledge.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("duration_knowledge.query", { subject }), reason: "bounded Duration Blueprint query", retain: false }); return this.stage2QueryProjection(row, subject, fields);
  }

  listDurationBlueprints(): readonly unknown[] {
    if (!this.session) throw new Error("project is not open");
    const fields = ["digest", "lifecycle_status", "object_id", "object_version", "result"], rows = listDurationBlueprints(this.session, this.session.manifest.project_id) as any[]; return rows.map((row) => { const subject = { object_type: "duration_blueprint" as const, object_id: row.value.blueprint_id, object_version: row.value.blueprint_version, digest: row.definition_digest }; this.stage2Gate({ action: "duration_knowledge.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("duration_knowledge.query", { subject }), reason: "bounded Duration Blueprint list query", retain: false }); return this.stage2QueryProjection(row, subject, fields); });
  }

  async evaluateDurationBlueprint(input: DurationFeasibilityInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    validateDurationFeasibilityInput(input);
    const projectId = this.session.manifest.project_id;
    const currentBlueprint = builtInDurationBlueprints.find((candidate) => candidate.blueprint_id === input.blueprint_ref.object_id && candidate.blueprint_version === input.blueprint_ref.object_version && candidate.definition_digest === input.blueprint_ref.digest);
    if (!currentBlueprint || currentBlueprint.status !== "published" || currentBlueprint.governance.trust_status !== "trusted") throw new Error("duration blueprint is no longer available in the trusted catalog");
    const blueprintRow = readDurationBlueprint(this.session, projectId, input.blueprint_ref.object_id, input.blueprint_ref.object_version) as any;
    if (!blueprintRow || blueprintRow.lifecycle_status !== "published" || blueprintRow.definition_digest !== input.blueprint_ref.digest) throw new Error("duration blueprint is unavailable or rebound");
    assertDurationBlueprintV1(blueprintRow.value);
    validateDurationBlueprint(blueprintRow.value);
    const contractRow = readCreativeContractVersion(this.session, projectId, input.contract_ref.object_id, input.contract_ref.object_version) as any;
    const contractHead = readCreativeContractHead(this.session, projectId, input.contract_ref.object_id) as any;
    if (!contractRow || contractRow.lifecycle_status !== "approved" || contractRow.object_hash !== input.contract_ref.digest || !contractHead || contractHead.object_version !== contractRow.object_version || contractHead.object_hash !== contractRow.object_hash) throw new Error("duration Contract is unapproved or stale");
    assertCreativeContractV2(contractRow.value);
    const persistenceRevision = this.stage2PersistenceRevision();
    const packRow = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, input.material_pack_ref.object_id, input.material_pack_ref.object_version)) as any;
    this.assertStage2PersistenceRevision(persistenceRevision, "duration evaluation authority is unavailable or stale");
    if (!packRow || packRow.lifecycle_status !== "sufficient" || packRow.object_hash !== input.material_pack_ref.digest || packRow.value.project_id !== projectId || packRow.value.contract_ref.object_id !== input.contract_ref.object_id || packRow.value.contract_ref.object_version !== input.contract_ref.object_version || packRow.value.contract_ref.digest !== input.contract_ref.digest) throw new Error("duration Material Evidence Pack is insufficient, stale or rebound");
    assertMaterialEvidencePackV1(packRow.value);
    const feasibility = evaluateDurationFeasibility(blueprintRow.value, contractRow.value, packRow.value, input);
    assertDurationFeasibilityV1(feasibility);
    const existing = readDurationFeasibilityByInput(this.session, projectId, feasibility.input_fingerprint) as any;
    if (existing && existing.lifecycle_status !== "stale") return this.durationFeasibilityView(existing);
    const subject = { object_type: "duration_blueprint" as const, object_id: input.blueprint_ref.object_id, object_version: input.blueprint_ref.object_version, digest: input.blueprint_ref.digest }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...input.contract_ref }, { object_type: "material_evidence_pack", ...input.material_pack_ref }], scope = [subject, ...contexts].map(permissionRefKey).sort();
    return runStage2AtomicMutation(this.session, () => {
      this.assertStage2PersistenceRevision(persistenceRevision, "duration evaluation authority is unavailable or stale");
      this.assertCurrentMaterialPackReference(projectId, input.material_pack_ref, "duration evaluation authority is unavailable or stale");
      const gate = this.stage2Gate({ action: "duration_feasibility.evaluate", subject_ref: subject, context_refs: contexts, requested_data_fields: ["diagnostics", "input_refs", "result"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("duration_feasibility.evaluate", feasibility), reason: "run deterministic Duration feasibility", retain: false });
      this.retainStage2Gate(gate);
      return registerDurationFeasibility(this.session!, projectId, feasibility);
    });
  }

  private async durationFeasibilityView(row: any, identityCache = new Map<string, Promise<boolean>>()): Promise<any> {
    if (!this.session || !row) return row;
    const projectId = this.session.manifest.project_id, feasibility = row.value as any;
    const staleReasons: string[] = [];
    const blueprint = readDurationBlueprint(this.session, projectId, feasibility.blueprint_ref.object_id, feasibility.blueprint_ref.object_version) as any;
    if (!blueprint || blueprint.lifecycle_status !== "published" || blueprint.definition_digest !== feasibility.blueprint_ref.digest) staleReasons.push("duration_blueprint_unavailable");
    const currentBlueprint = builtInDurationBlueprints.find((candidate) => candidate.blueprint_id === feasibility.blueprint_ref.object_id && candidate.blueprint_version === feasibility.blueprint_ref.object_version && candidate.definition_digest === feasibility.blueprint_ref.digest);
    if (!currentBlueprint || currentBlueprint.status !== "published" || currentBlueprint.governance.trust_status !== "trusted") staleReasons.push("duration_blueprint_catalog_changed");
    if (feasibility.provenance?.allocator_version !== DURATION_ALLOCATOR_VERSION || feasibility.provenance?.policy_version !== DURATION_POLICY_VERSION) staleReasons.push("duration_authority_changed");
    const contractHead = readCreativeContractHead(this.session, projectId, feasibility.contract_ref.object_id) as any;
    if (!contractHead || contractHead.object_version !== feasibility.contract_ref.object_version || contractHead.object_hash !== feasibility.contract_ref.digest) staleReasons.push("creative_contract_head_changed");
    const pack = readMaterialEvidencePack(this.session, projectId, feasibility.material_pack_ref.object_id, feasibility.material_pack_ref.object_version) as any;
    const packView = await this.materialEvidencePackView(pack, identityCache);
    if (!packView || packView.object_hash !== feasibility.material_pack_ref.digest || packView.lifecycle_status !== "sufficient" || packView.value?.project_id !== projectId || packView.value?.contract_ref?.object_id !== feasibility.contract_ref.object_id || packView.value?.contract_ref?.object_version !== feasibility.contract_ref.object_version || packView.value?.contract_ref?.digest !== feasibility.contract_ref.digest) staleReasons.push("material_pack_changed");
    return staleReasons.length ? { ...row, lifecycle_status: "stale", stale_reasons: [...new Set(staleReasons)].sort() } : row;
  }

  async readDurationFeasibility(feasibilityId: string): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const row = await this.durationFeasibilityView(readDurationFeasibility(this.session, this.session.manifest.project_id, feasibilityId)) as any; if (!row) return null; const subject = { object_type: "duration_feasibility" as const, object_id: row.value.feasibility_id, object_version: row.value.object_version, digest: row.object_hash }, fields = ["digest", "lifecycle_status", "object_id", "object_version", "result"]; this.stage2Gate({ action: "duration_knowledge.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("duration_knowledge.query", { subject }), reason: "bounded Duration Feasibility query", retain: false }); return this.stage2QueryProjection(row, subject, fields);
  }

  async listDurationFeasibilities(): Promise<readonly unknown[]> {
    if (!this.session) throw new Error("project is not open");
    const identityCache = new Map<string, Promise<boolean>>();
    const fields = ["digest", "lifecycle_status", "object_id", "object_version", "result"], rows = await Promise.all(listDurationFeasibilities(this.session, this.session.manifest.project_id).map((row: unknown) => this.durationFeasibilityView(row, identityCache))) as any[]; return rows.map((row) => { const subject = { object_type: "duration_feasibility" as const, object_id: row.value.feasibility_id, object_version: row.value.object_version, digest: row.object_hash }; this.stage2Gate({ action: "duration_knowledge.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("duration_knowledge.query", { subject }), reason: "bounded Duration Feasibility list query", retain: false }); return this.stage2QueryProjection(row, subject, fields); });
  }

  private async editorialArtifactView(row: any, artifactType: string, identityCache = new Map<string, Promise<boolean>>()): Promise<any> {
    if (!this.session || !row) return row;
    const projectId = this.session.manifest.project_id, value = row.value as any, staleReasons: string[] = [];
    const matches = (candidate: any, reference: any): boolean => Boolean(candidate && reference && candidate.object_hash === reference.digest && candidate.value && (candidate.value.object_version ?? candidate.value.blueprint_version) === reference.object_version);
    const contractRef = value.contract_ref ?? (artifactType === "decision_record" ? value.subject_ref : undefined);
    if (contractRef) { const head = readCreativeContractHead(this.session, projectId, contractRef.object_id) as any; if (!head || head.object_version !== contractRef.object_version || head.object_hash !== contractRef.digest || head.lifecycle_status !== "approved") staleReasons.push("creative_contract_head_changed"); }
    if (["direction_card", "story_proposal_v2"].includes(artifactType) && (value.provenance?.source_version !== STORY_EVALUATOR_VERSION || value.provenance?.policy_version !== STORY_POLICY_VERSION)) staleReasons.push("story_authority_changed");
    if (artifactType === "decision_record" && (value.authority?.evaluator_version !== STORY_EVALUATOR_VERSION || value.authority?.policy_version !== STORY_POLICY_VERSION)) staleReasons.push("story_decision_authority_changed");
    if (artifactType === "approved_story_plan_v2" && (value.provenance?.source_version !== STORY_APPROVAL_VERSION || value.provenance?.policy_version !== STORY_POLICY_VERSION)) staleReasons.push("story_approval_authority_changed");
    if (artifactType === "editorial_edit_intent" && (value.provenance?.source_version !== EDITORIAL_INTENT_GENERATOR_VERSION || value.provenance?.policy_version !== EDITORIAL_INTENT_POLICY_VERSION)) staleReasons.push("editorial_intent_authority_changed");
    if (["direction_card", "story_proposal_v2"].includes(artifactType)) {
      const pack = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, value.material_pack_ref.object_id, value.material_pack_ref.object_version) as any, identityCache);
      if (!matches(pack, value.material_pack_ref) || pack.lifecycle_status !== "sufficient") staleReasons.push("material_pack_changed");
      if (artifactType === "direction_card") { const templateRefs = stage2ProductDirectionTemplateRefs(value), productDirection = templateRefs.length > 0 || Boolean(pack?.value && isStage2ProductMaterialPack(pack.value)); if (productDirection && (templateRefs.length !== 1 || templateRefs[0] !== stage2ProductDirectionTemplateRef())) staleReasons.push("product_direction_template_authority_changed"); }
      if (artifactType === "story_proposal_v2") { const templateRefs = stage2ProductStoryTemplateRefs(value), productStory = templateRefs.length > 0 || Boolean(pack?.value && isStage2ProductMaterialPack(pack.value)); if (productStory && (templateRefs.length !== 1 || templateRefs[0] !== stage2ProductStoryTemplateRef())) staleReasons.push("product_story_template_authority_changed"); }
      const duration = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, value.duration_feasibility_ref.object_id) as any, identityCache);
      if (!matches(duration, value.duration_feasibility_ref) || duration.lifecycle_status !== "feasible") staleReasons.push("duration_feasibility_changed");
      if (artifactType === "story_proposal_v2" && duration?.value) {
        if (value.beats?.length !== duration.value.planned_beat_count) staleReasons.push("story_planned_beat_count_changed");
        if (!Array.isArray(value.beats) || !exactPositiveDurationSumEquals(value.beats.map((beat: any) => beat.target_duration), duration.value.target_duration) || !exactPositiveDurationSumEquals([value.duration_budget], duration.value.target_duration)) staleReasons.push("story_duration_authority_changed");
      }
      for (const reference of value.skill_evaluation_refs ?? []) { const evaluation = await this.skillEvaluationView(readSkillEvaluation(this.session, projectId, reference.object_id, reference.object_version) as any, identityCache); if (!matches(evaluation, reference) || evaluation.lifecycle_status !== "applicable") staleReasons.push(`skill_evaluation_changed:${reference.object_id}`); }
    }
    if (artifactType === "direction_card" && value.status === "selected") {
      const reference = value.selection_decision_ref, decision = reference ? await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "decision_record", reference.object_id, reference.object_version) as any, "decision_record", identityCache) : null;
      if (!matches(decision, reference) || decision.lifecycle_status !== "approved" || decision.value?.decision_type !== "direction_selection" || !decision.value?.selected_refs?.some((candidate: any) => candidate.object_id === value.direction_id && candidate.object_version === value.object_version - 1)) staleReasons.push("direction_selection_decision_changed");
    }
    if (artifactType === "decision_record") {
      const localType = value.decision_type === "direction_selection" ? "direction_card" : ["story_approval", "override"].includes(value.decision_type) ? "story_proposal_v2" : null;
      const candidateKeys = new Set<string>((value.candidate_refs ?? []).map((reference: any) => canonicalEditorialObject(reference))), outcomeRefs = [...(value.selected_refs ?? []), ...(value.rejected_refs ?? [])], outcomeKeys = new Set<string>(outcomeRefs.map((reference: any) => canonicalEditorialObject(reference)));
      if (!localType || candidateKeys.size !== (value.candidate_refs ?? []).length || outcomeKeys.size !== outcomeRefs.length || candidateKeys.size !== outcomeKeys.size || [...candidateKeys].some((key) => !outcomeKeys.has(key))) staleReasons.push("decision_outcomes_changed");
      else for (const reference of value.candidate_refs ?? []) { const target = readEditorialArtifact(this.session, projectId, localType, reference.object_id, reference.object_version) as any; if (!matches(target, reference)) staleReasons.push(`decision_candidate_changed:${reference.object_id}`); }
      const [packRef, durationRef] = value.evidence_refs ?? [], pack = packRef ? await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, packRef.object_id, packRef.object_version) as any, identityCache) : null, duration = durationRef ? await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, durationRef.object_id) as any, identityCache) : null;
      if (!matches(pack, packRef) || pack.lifecycle_status !== "sufficient") staleReasons.push("decision_material_pack_changed");
      if (!matches(duration, durationRef) || duration.lifecycle_status !== "feasible") staleReasons.push("decision_duration_feasibility_changed");
    }
    if (["story_proposal_v2", "approved_story_plan_v2"].includes(artifactType)) { const direction = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "direction_card", value.direction_ref.object_id, value.direction_ref.object_version) as any, "direction_card", identityCache); if (!matches(direction, value.direction_ref) || direction.lifecycle_status !== "selected") staleReasons.push("direction_changed"); }
    if (artifactType === "approved_story_plan_v2") {
      const proposal = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "story_proposal_v2", value.proposal_ref.object_id, value.proposal_ref.object_version) as any, "story_proposal_v2", identityCache), decision = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "decision_record", value.decision_ref.object_id, value.decision_ref.object_version) as any, "decision_record", identityCache), duration = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, value.duration_feasibility_ref.object_id) as any, identityCache);
      if (!matches(proposal, value.proposal_ref) || proposal.lifecycle_status !== "candidate") staleReasons.push("story_proposal_changed");
      if (!matches(decision, value.decision_ref) || !["approved", "overridden"].includes(decision.lifecycle_status) || !decision.value?.selected_refs?.some((reference: any) => matches(proposal, reference) && canonicalEditorialObject(reference) === canonicalEditorialObject(value.proposal_ref))) staleReasons.push("story_decision_changed");
      if (!matches(duration, value.duration_feasibility_ref) || duration.lifecycle_status !== "feasible" || value.beats?.length !== duration.value?.planned_beat_count) staleReasons.push("story_planned_beat_count_changed");
      if (duration?.value && (!Array.isArray(value.beats) || !exactPositiveDurationSumEquals(value.beats.map((beat: any) => beat.target_duration), duration.value.target_duration) || !exactPositiveDurationSumEquals([value.duration_budget], duration.value.target_duration))) staleReasons.push("story_duration_authority_changed");
    }
    if (artifactType === "editorial_edit_intent") {
      const plan = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "approved_story_plan_v2", value.approved_story_ref.object_id, value.approved_story_ref.object_version) as any, "approved_story_plan_v2", identityCache); if (!matches(plan, value.approved_story_ref) || plan.lifecycle_status !== "approved") staleReasons.push("approved_story_changed");
      for (const reference of value.decision_refs ?? []) { const decision = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "decision_record", reference.object_id, reference.object_version) as any, "decision_record", identityCache); if (!matches(decision, reference) || !["approved", "overridden"].includes(decision.lifecycle_status)) staleReasons.push(`decision_changed:${reference.object_id}`); }
      const capability = readEditorialArtifact(this.session, projectId, "capability_snapshot", value.capability_snapshot_ref.object_id, value.capability_snapshot_ref.object_version) as any, expectedCapabilities = [...HOST_SEMANTIC_CAPABILITIES].sort(); if (!matches(capability, value.capability_snapshot_ref) || capability.value?.producer !== "project-host" || capability.value?.source_version !== EDITORIAL_INTENT_GENERATOR_VERSION || capability.value?.policy_version !== EDITORIAL_INTENT_POLICY_VERSION || canonicalEditorialObject(capability.value?.capabilities) !== canonicalEditorialObject(expectedCapabilities)) staleReasons.push("capability_snapshot_changed");
      const rawTimeline = readLatestTimeline(this.session, projectId), currentVersion = rawTimeline ? Number((JSON.parse(rawTimeline) as any).version) : null; if (currentVersion !== value.base_timeline_version) staleReasons.push("timeline_version_changed");
    }
    return staleReasons.length ? { ...row, lifecycle_status: "stale", stale_reasons: [...new Set(staleReasons)].sort() } : row;
  }

  async createStoryDirection(input: DirectionCardInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    const persistenceRevision = this.stage2PersistenceRevision();
    const contract = readCreativeContractVersion(this.session, projectId, input.contract_ref.object_id, input.contract_ref.object_version) as any, pack = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, input.material_pack_ref.object_id, input.material_pack_ref.object_version)) as any, duration = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, input.duration_feasibility_ref.object_id)) as any;
    const evaluations = await Promise.all(input.skill_evaluation_refs.map((reference) => this.skillEvaluationView(readSkillEvaluation(this.session!, projectId, reference.object_id, reference.object_version)) as Promise<any>));
    this.assertStage2PersistenceRevision(persistenceRevision, "story direction context is unavailable or stale");
    if (!contract || contract.object_hash !== input.contract_ref.digest || contract.lifecycle_status !== "approved" || !pack || pack.object_hash !== input.material_pack_ref.digest || pack.lifecycle_status !== "sufficient" || !duration || duration.object_hash !== input.duration_feasibility_ref.digest || duration.lifecycle_status !== "feasible" || evaluations.some((evaluation, index) => !evaluation || evaluation.object_hash !== input.skill_evaluation_refs[index]!.digest || evaluation.lifecycle_status !== "applicable")) throw new Error("story direction context is unavailable or stale");
    assertCreativeContractV2(contract.value); assertMaterialEvidencePackV1(pack.value); assertDurationFeasibilityV1(duration.value); evaluations.forEach((evaluation) => assertSkillEvaluationV1(evaluation.value));
    const createdDirection = createDirectionCard(input, contract.value, pack.value, evaluations.map((evaluation) => evaluation.value), duration.value), direction = isStage2ProductMaterialPack(pack.value) ? { ...createdDirection, provenance: { ...createdDirection.provenance, input_refs: [...createdDirection.provenance.input_refs, stage2ProductDirectionTemplateRef()] } } : createdDirection; assertDirectionCardV1(direction);
    const existing = readEditorialArtifactByInput(this.session, projectId, "direction_card", direction.input_fingerprint) as any; if (existing && existing.lifecycle_status !== "stale") { if (existing.object_hash !== editorialObjectDigest(direction)) throw new Error("direction input fingerprint rebound"); return this.editorialArtifactView(existing, "direction_card"); }
    const subject = { object_type: "creative_contract" as const, ...input.contract_ref }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "material_evidence_pack", ...input.material_pack_ref }, ...input.skill_evaluation_refs.map((reference) => ({ object_type: "skill_evaluation" as const, ...reference })), { object_type: "duration_feasibility", ...input.duration_feasibility_ref }], scope = [subject, ...contexts].map(permissionRefKey).sort();
    return runStage2AtomicMutation(this.session, () => {
      this.assertStage2PersistenceRevision(persistenceRevision, "story direction context is unavailable or stale");
      this.assertCurrentMaterialPackReference(projectId, input.material_pack_ref, "story direction context is unavailable or stale");
      const gate = this.stage2Gate({ action: "direction_card.generate", subject_ref: subject, context_refs: contexts, requested_data_fields: ["audit_metadata", "bounded_context", "candidate"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("direction_card.generate", direction), reason: "generate deterministic Direction candidate", retain: false });
      this.retainStage2Gate(gate);
      return registerEditorialArtifact(this.session!, projectId, "direction_card", direction);
    });
  }

  private directionCandidateSetWasSelected(projectId: string, directionIds: readonly string[]): boolean {
    if (!this.session) throw new Error("project is not open"); const candidateIds = new Set(directionIds);
    return listEditorialArtifacts(this.session, projectId, "decision_record").some((row: any) => row.value?.decision_type === "direction_selection" && ["approved", "overridden"].includes(row.value?.status) && (row.value?.candidate_refs ?? []).some((reference: any) => candidateIds.has(reference.object_id)));
  }

  private storyCandidateSetWasApproved(projectId: string, proposalIds: readonly string[]): boolean {
    if (!this.session) throw new Error("project is not open"); const candidateIds = new Set(proposalIds);
    return listEditorialArtifacts(this.session, projectId, "decision_record").some((row: any) => ["story_approval", "override"].includes(row.value?.decision_type) && ["approved", "overridden"].includes(row.value?.status) && (row.value?.candidate_refs ?? []).some((reference: any) => candidateIds.has(reference.object_id)));
  }

  private readStoryPersistedAuthority(projectId: string, context: Pick<StoryProposalInput, "contract_ref" | "direction_ref" | "duration_feasibility_ref" | "material_pack_ref" | "skill_evaluation_refs">, proposalRefs: readonly Readonly<{ object_id: string; object_version: number; digest: string }>[] = []): any {
    if (!this.session) throw new Error("project is not open");
    const contract = readCreativeContractVersion(this.session, projectId, context.contract_ref.object_id, context.contract_ref.object_version) as any;
    const contractHead = readCreativeContractHead(this.session, projectId, context.contract_ref.object_id) as any;
    const direction = readEditorialArtifact(this.session, projectId, "direction_card", context.direction_ref.object_id, context.direction_ref.object_version) as any;
    const directionDecisionRef = direction?.value?.selection_decision_ref;
    const directionDecision = directionDecisionRef ? readEditorialArtifact(this.session, projectId, "decision_record", directionDecisionRef.object_id, directionDecisionRef.object_version) as any : null;
    const pack = readMaterialEvidencePack(this.session, projectId, context.material_pack_ref.object_id, context.material_pack_ref.object_version) as any;
    const coverage = pack?.value?.coverage_matrix_ref ? readCoverageMatrix(this.session, projectId, pack.value.coverage_matrix_ref) : null;
    const evidence = [...(pack?.value?.evidence_refs ?? [])].sort((left: any, right: any) => left.evidence_id.localeCompare(right.evidence_id)).map((reference: any) => readEvidenceObject(this.session!, reference.evidence_id));
    const assetIds = [...new Set<string>((pack?.value?.availability ?? []).map((item: any) => item.asset_id))].sort();
    const media = assetIds.map((assetId) => readMediaAsset(this.session!, projectId, assetId));
    const locations = (listAssetLocationsForAssets(this.session, projectId, assetIds) as PersistedAssetLocation[]).slice().sort((left, right) => `${left.asset_id}:${left.asset_location_id}:${left.verified_at ?? ""}`.localeCompare(`${right.asset_id}:${right.asset_location_id}:${right.verified_at ?? ""}`));
    const duration = readDurationFeasibility(this.session, projectId, context.duration_feasibility_ref.object_id) as any;
    const durationBlueprintRef = duration?.value?.blueprint_ref;
    const durationBlueprint = durationBlueprintRef ? readDurationBlueprint(this.session, projectId, durationBlueprintRef.object_id, durationBlueprintRef.object_version) : null;
    const durationCatalog = durationBlueprintRef ? builtInDurationBlueprints.find((candidate) => candidate.blueprint_id === durationBlueprintRef.object_id && candidate.blueprint_version === durationBlueprintRef.object_version) ?? null : null;
    const evaluations = context.skill_evaluation_refs.map((reference) => readSkillEvaluation(this.session!, projectId, reference.object_id, reference.object_version) as any);
    const evaluationAuthorities = evaluations.map((row: any, index: number) => {
      const definitionRef = row?.value?.definition_ref;
      return {
        reference: context.skill_evaluation_refs[index],
        row,
        definition: definitionRef ? readCreativeSkillDefinition(this.session!, projectId, definitionRef.object_id, definitionRef.object_version) : null,
        control: definitionRef ? readCreativeSkillDefinitionControl(this.session!, projectId, definitionRef.object_id, definitionRef.object_version) : null,
        catalog: definitionRef ? builtInCreativeSkillDefinitions.find((candidate) => candidate.skill_id === definitionRef.object_id && candidate.skill_version === definitionRef.object_version) ?? null : null,
      };
    });
    const proposals = proposalRefs.map((reference) => readEditorialArtifact(this.session!, projectId, "story_proposal_v2", reference.object_id, reference.object_version));
    const rawTimeline = pack?.value?.timeline_version === undefined ? null : readLatestTimeline(this.session, projectId);
    return { assetIds, contract, contractHead, coverage, direction, directionDecision, duration, durationBlueprint, durationCatalog, evaluationAuthorities, evidence, locations, media, pack, proposals, rawTimeline };
  }

  private assertStoryPersistedAuthority(projectId: string, context: Pick<StoryProposalInput, "contract_ref" | "direction_ref" | "duration_feasibility_ref" | "material_pack_ref" | "skill_evaluation_refs">, authority: any, errorMessage: string): Readonly<{ contract: any; coverage: CoverageMatrix; direction: any; duration: any; evaluations: readonly any[]; pack: any }> {
    const matches = (row: any, reference: any): boolean => Boolean(row && reference && row.object_hash === reference.digest && row.value?.object_version === reference.object_version);
    const { contract, contractHead, coverage, direction, duration, pack } = authority;
    const evaluations = (authority.evaluationAuthorities ?? []).map((item: any) => item.row);
    const directionContextMatches = direction && versionedRefMatches(direction.value?.contract_ref, context.contract_ref) && versionedRefMatches(direction.value?.material_pack_ref, context.material_pack_ref) && versionedRefMatches(direction.value?.duration_feasibility_ref, context.duration_feasibility_ref) && canonicalEditorialObject(direction.value?.skill_evaluation_refs ?? []) === canonicalEditorialObject(context.skill_evaluation_refs);
    const durationContextMatches = duration && versionedRefMatches(duration.value?.contract_ref, context.contract_ref) && versionedRefMatches(duration.value?.material_pack_ref, context.material_pack_ref);
    const evaluationsMatch = evaluations.length === context.skill_evaluation_refs.length && evaluations.every((row: any, index: number) => matches(row, context.skill_evaluation_refs[index]) && row.lifecycle_status === "applicable" && versionedRefMatches(row.value?.contract_ref, context.contract_ref) && versionedRefMatches(row.value?.material_pack_ref, context.material_pack_ref));
    const packExpiryCurrent = !pack?.value?.expires_at || Number.isFinite(Date.parse(pack.value.expires_at)) && Date.parse(pack.value.expires_at) > this.now();
    if (!matches(contract, context.contract_ref) || contract.lifecycle_status !== "approved" || !contractHead || contractHead.object_version !== context.contract_ref.object_version || contractHead.object_hash !== context.contract_ref.digest || contractHead.lifecycle_status !== "approved" || !matches(direction, context.direction_ref) || direction.lifecycle_status !== "selected" || !directionContextMatches || !matches(pack, context.material_pack_ref) || pack.lifecycle_status !== "sufficient" || pack.value?.project_id !== projectId || !versionedRefMatches(pack.value?.contract_ref, context.contract_ref) || !packExpiryCurrent || !matches(duration, context.duration_feasibility_ref) || duration.lifecycle_status !== "feasible" || duration.value?.result !== "feasible" || !durationContextMatches || !evaluationsMatch || !coverage || editorialObjectDigest(coverage) !== pack.value?.coverage_matrix_ref?.digest) throw new Error(errorMessage);
    return { contract, coverage: coverage as CoverageMatrix, direction, duration, evaluations, pack };
  }

  private storyPersistedAuthorityDigest(projectId: string, context: Pick<StoryProposalInput, "contract_ref" | "direction_ref" | "duration_feasibility_ref" | "material_pack_ref" | "skill_evaluation_refs">, proposalRefs: readonly Readonly<{ object_id: string; object_version: number; digest: string }>[] = []): string {
    return editorialObjectDigest(this.readStoryPersistedAuthority(projectId, context, proposalRefs));
  }

  async selectStoryDirection(directionIds: readonly string[], input: Omit<DirectionSelectionInput, "actor_id" | "actor_kind" | "selected_at"> & Readonly<{ approval_id: string }>): Promise<unknown> {
    return this.selectStoryDirectionInternal(directionIds, input);
  }

  private async currentProductCandidateRefs(artifactType: "direction_card" | "story_proposal_v2", authority: any): Promise<readonly Readonly<{ object_id: string; object_version: number; digest: string }>[]> {
    if (!this.session) throw new Error("project is not open");
    const completedDecisions = (listEditorialArtifacts(this.session, this.session.manifest.project_id, "decision_record") as any[]).filter((row) => artifactType === "direction_card" ? row.value?.decision_type === "direction_selection" : ["story_approval", "override"].includes(row.value?.decision_type)).filter((row) => ["approved", "overridden"].includes(row.value?.status));
    const rejectedByDecision = (row: any): boolean => completedDecisions.some((decision) => (decision.value?.rejected_refs ?? []).some((reference: any) => reference.object_id === (row.value?.direction_id ?? row.value?.proposal_id) && reference.object_version === row.value?.object_version && reference.digest === row.object_hash));
    const sameAuthority = (row: any): boolean => row.lifecycle_status === "candidate"
      && !rejectedByDecision(row)
      && versionedRefMatches(row.value?.contract_ref, authority.contract_ref)
      && versionedRefMatches(row.value?.material_pack_ref, authority.material_pack_ref)
      && versionedRefMatches(row.value?.duration_feasibility_ref, authority.duration_feasibility_ref)
      && (artifactType !== "story_proposal_v2" || versionedRefMatches(row.value?.direction_ref, authority.direction_ref));
    const heads = new Map<string, any>();
    for (const row of listEditorialArtifacts(this.session, this.session.manifest.project_id, artifactType) as any[]) {
      const id = row.value?.direction_id ?? row.value?.proposal_id, current = heads.get(id);
      if (!current || Number(row.value?.object_version) > Number(current.value?.object_version)) heads.set(id, row);
    }
    const rows = await Promise.all([...heads.values()].map((row) => this.editorialArtifactView(row, artifactType))) as any[];
    return rows
      .filter(sameAuthority)
      .map((row) => ({ object_id: row.value.direction_id ?? row.value.proposal_id, object_version: row.value.object_version, digest: row.object_hash }))
      .sort((left, right) => left.object_id.localeCompare(right.object_id));
  }

  private async assertProductCandidateSetCurrent(artifactType: "direction_card" | "story_proposal_v2", authority: any, expected: readonly Readonly<{ object_id: string; object_version: number; digest: string }>[], errorMessage: string): Promise<void> {
    const normalized = expected.slice().sort((left, right) => left.object_id.localeCompare(right.object_id));
    if (editorialObjectDigest(await this.currentProductCandidateRefs(artifactType, authority)) !== editorialObjectDigest(normalized)) throw new Error(errorMessage);
  }

  private async selectStoryDirectionInternal(directionIds: readonly string[], input: Omit<DirectionSelectionInput, "actor_id" | "actor_kind" | "selected_at"> & Readonly<{ approval_id: string }>, expectedProductCandidateRefs?: readonly Readonly<{ object_id: string; object_version: number; digest: string }>[]): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    assertExactInputKeys(input, ["approval_id", "decision_id", "reason", "review_digest", "selected_direction_id"], "direction_card.select");
    const rawRows = directionIds.map((directionId) => readEditorialArtifact(this.session!, projectId, "direction_card", directionId, 1)) as any[];
    if (rawRows.some((row) => !row || row.lifecycle_status !== "candidate")) throw new Error("direction selection candidate is unavailable or stale"); rawRows.forEach((row) => assertDirectionCardV1(row.value));
    const contractRef = rawRows[0]!.value.contract_ref, contract = readCreativeContractVersion(this.session, projectId, contractRef.object_id, contractRef.object_version) as any; if (!contract || contract.object_hash !== contractRef.digest || contract.lifecycle_status !== "approved") throw new Error("direction selection Contract is unavailable or stale"); assertCreativeContractV2(contract.value);
    const selectedRow = rawRows.find((row) => row.value.direction_id === input.selected_direction_id); if (!selectedRow) throw new Error("direction selection target is unavailable");
    const persistenceRevision = this.stage2PersistenceRevision();
    if (expectedProductCandidateRefs) await this.assertProductCandidateSetCurrent("direction_card", selectedRow.value, expectedProductCandidateRefs, "PRODUCT_WORKSPACE_CANDIDATE_SET_STALE");
    const subject = { object_type: "direction_card" as const, object_id: selectedRow.value.direction_id, object_version: selectedRow.value.object_version, digest: selectedRow.object_hash }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "material_evidence_pack", ...selectedRow.value.material_pack_ref }, { object_type: "duration_feasibility", ...selectedRow.value.duration_feasibility_ref }], effect = { direction_ids: [...directionIds].sort(), candidate_refs: rawRows.map((row) => ({ object_id: row.value.direction_id, object_version: row.value.object_version, digest: row.object_hash })).sort((left, right) => left.object_id.localeCompare(right.object_id)), selected_direction_id: input.selected_direction_id, decision_id: input.decision_id, reason: input.reason, review_digest: input.review_digest };
    const evaluatePermission = () => this.stage2Gate({ action: "direction_card.select", subject_ref: subject, context_refs: contexts, requested_data_fields: ["alternatives", "reason", "review_digest", "selected_ref"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("direction_card.select", effect), reason: input.reason, approval_id: input.approval_id, retain: false }) as any, permission = evaluatePermission(), human = permission.request.approval;
    if (this.directionCandidateSetWasSelected(projectId, directionIds)) throw new Error("DIRECTION_CANDIDATE_SET_ALREADY_SELECTED");
    const rows = await Promise.all(rawRows.map((row) => this.editorialArtifactView(row, "direction_card"))) as any[]; if (rows.some((row) => row.lifecycle_status !== "candidate")) throw new Error("direction selection candidate is unavailable or stale"); if (this.directionCandidateSetWasSelected(projectId, directionIds)) throw new Error("DIRECTION_CANDIDATE_SET_ALREADY_SELECTED");
    this.assertStage2PersistenceRevision(persistenceRevision, "direction selection candidate is unavailable or stale");
    const result = selectDirectionCard(rows.map((row) => row.value), { ...input, actor_id: human.actor_id, actor_kind: "user", selected_at: human.approved_at }, contract.value); assertDecisionRecordV1(result.decision); assertDirectionCardV1(result.direction);
    const [decision, direction] = runStage2AtomicMutation(this.session, () => {
      if (this.directionCandidateSetWasSelected(projectId, directionIds)) throw new Error("DIRECTION_CANDIDATE_SET_ALREADY_SELECTED");
      this.assertStage2PersistenceRevision(persistenceRevision, "direction selection candidate is unavailable or stale");
      this.assertCurrentMaterialPackReference(projectId, selectedRow.value.material_pack_ref, "direction selection candidate is unavailable or stale");
      const freshPermission = evaluatePermission(), freshHuman = freshPermission.request.approval, freshResult = selectDirectionCard(rawRows.map((row) => row.value), { ...input, actor_id: freshHuman.actor_id, actor_kind: "user", selected_at: freshHuman.approved_at }, contract.value); assertDecisionRecordV1(freshResult.decision); assertDirectionCardV1(freshResult.direction);
      if (editorialObjectDigest(freshResult.decision) !== editorialObjectDigest(result.decision) || editorialObjectDigest(freshResult.direction) !== editorialObjectDigest(result.direction)) throw new Error("direction selection candidate is unavailable or stale");
      this.retainStage2Gate(freshPermission);
      return registerEditorialArtifactBatch(this.session!, projectId, [{ artifact_type: "decision_record", value: freshResult.decision }, { artifact_type: "direction_card", value: freshResult.direction }]);
    }) as any[];
    return { decision, direction };
  }

  async proposeStoryV2(input: StoryProposalInput): Promise<unknown> {
    assertExactInputKeys(input, ["alternatives", "audience_promise", "beats", "contract_ref", "created_at", "direction_ref", "duration_feasibility_ref", "material_pack_ref", "proposal_id", "risks", "skill_evaluation_refs", "thesis"], "story_proposal.generate");
    return this.proposeStoryV2Internal(input, []);
  }

  private async proposeStage2ProductStoryV2(input: StoryProposalInput): Promise<unknown> {
    return this.proposeStoryV2Internal(input, [stage2ProductStoryTemplateRef()]);
  }

  private async proposeStoryV2Internal(input: StoryProposalInput, generationAuthorityRefs: readonly string[]): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    if (new Set(generationAuthorityRefs).size !== generationAuthorityRefs.length || generationAuthorityRefs.some((reference) => !reference.trim())) throw new Error("story generation authority references are invalid");
    const persistedAuthorityDigest = this.storyPersistedAuthorityDigest(projectId, input);
    const direction = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "direction_card", input.direction_ref.object_id, input.direction_ref.object_version), "direction_card") as any;
    const contract = readCreativeContractVersion(this.session, projectId, input.contract_ref.object_id, input.contract_ref.object_version) as any, pack = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, input.material_pack_ref.object_id, input.material_pack_ref.object_version)) as any, duration = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, input.duration_feasibility_ref.object_id)) as any;
    const evaluations = await Promise.all(input.skill_evaluation_refs.map((reference) => this.skillEvaluationView(readSkillEvaluation(this.session!, projectId, reference.object_id, reference.object_version)) as Promise<any>));
    if (!direction || direction.object_hash !== input.direction_ref.digest || direction.lifecycle_status !== "selected" || !contract || contract.object_hash !== input.contract_ref.digest || contract.lifecycle_status !== "approved" || !pack || pack.object_hash !== input.material_pack_ref.digest || pack.lifecycle_status !== "sufficient" || !duration || duration.object_hash !== input.duration_feasibility_ref.digest || duration.lifecycle_status !== "feasible" || evaluations.some((evaluation, index) => !evaluation || evaluation.object_hash !== input.skill_evaluation_refs[index]!.digest || evaluation.lifecycle_status !== "applicable")) throw new Error("story proposal context is unavailable or stale");
    const productMaterial = isStage2ProductMaterialPack(pack.value), expectedProductAuthority = stage2ProductStoryTemplateRef();
    if (productMaterial && generationAuthorityRefs.length === 0) throw new Error("PRODUCT_STORY_GENERATION_REQUIRES_HOST_TEMPLATE_AUTHORITY");
    if (generationAuthorityRefs.length > 0 && (!productMaterial || generationAuthorityRefs.length !== 1 || generationAuthorityRefs[0] !== expectedProductAuthority)) throw new Error("story generation authority references are invalid");
    const coverage = readCoverageMatrix(this.session, projectId, pack.value.coverage_matrix_ref) as CoverageMatrix | null; if (!coverage) throw new Error("story coverage matrix is unavailable or stale");
    const withGenerationAuthority = (evaluated: any): any => generationAuthorityRefs.length === 0 ? evaluated : { ...evaluated, input_fingerprint: editorialObjectDigest({ story_input_fingerprint: evaluated.input_fingerprint, generation_authority_refs: generationAuthorityRefs, evaluator_version: STORY_EVALUATOR_VERSION, policy_version: STORY_POLICY_VERSION }), provenance: { ...evaluated.provenance, input_refs: [...evaluated.provenance.input_refs, ...generationAuthorityRefs] } };
    const evaluated = evaluateStoryProposal(input, direction.value, contract.value, pack.value, coverage, evaluations.map((evaluation) => evaluation.value), duration.value), proposal = withGenerationAuthority(evaluated); assertStoryProposalV2(proposal);
    const existing = readEditorialArtifactByInput(this.session, projectId, "story_proposal_v2", proposal.input_fingerprint) as any; if (existing && existing.lifecycle_status !== "stale") { if (existing.object_hash !== editorialObjectDigest(proposal)) throw new Error("story proposal input fingerprint rebound"); return this.editorialArtifactView(existing, "story_proposal_v2"); }
    const subject = { object_type: "direction_card" as const, ...input.direction_ref }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...input.contract_ref }, { object_type: "material_evidence_pack", ...input.material_pack_ref }, ...input.skill_evaluation_refs.map((reference) => ({ object_type: "skill_evaluation" as const, ...reference })), { object_type: "duration_feasibility", ...input.duration_feasibility_ref }], scope = [subject, ...contexts].map(permissionRefKey).sort();
    return runStage2AtomicMutation(this.session, () => {
      const freshAuthority = this.readStoryPersistedAuthority(projectId, input);
      if (editorialObjectDigest(freshAuthority) !== persistedAuthorityDigest) throw new Error("story proposal context is unavailable or stale");
      const fresh = this.assertStoryPersistedAuthority(projectId, input, freshAuthority, "story proposal context is unavailable or stale");
      const freshProposal = withGenerationAuthority(evaluateStoryProposal(input, fresh.direction.value, fresh.contract.value, fresh.pack.value, fresh.coverage, fresh.evaluations.map((evaluation) => evaluation.value), fresh.duration.value)); assertStoryProposalV2(freshProposal);
      if (editorialObjectDigest(freshProposal) !== editorialObjectDigest(proposal)) throw new Error("story proposal context is unavailable or stale");
      const gate = this.stage2Gate({ action: "story_proposal.generate", subject_ref: subject, context_refs: contexts, requested_data_fields: ["audit_metadata", "bounded_context", "candidate"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("story_proposal.generate", freshProposal), reason: "generate deterministic Story Proposal", retain: false });
      this.retainStage2Gate(gate);
      return registerEditorialArtifact(this.session!, projectId, "story_proposal_v2", freshProposal);
    });
  }

  async approveStoryCandidates(proposalIds: readonly string[], input: Omit<StoryApprovalInput, "actor_id" | "actor_kind" | "approved_at"> & Readonly<{ approval_id: string }>): Promise<unknown> {
    return this.approveStoryCandidatesInternal(proposalIds, input);
  }

  private async approveStoryCandidatesInternal(proposalIds: readonly string[], input: Omit<StoryApprovalInput, "actor_id" | "actor_kind" | "approved_at"> & Readonly<{ approval_id: string }>, expectedProductCandidateRefs?: readonly Readonly<{ object_id: string; object_version: number; digest: string }>[]): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    assertExactInputKeys(input, ["approval_id", "decision_id", "plan_id", "reason", "review_digest", "selected_proposal_id"], "story_plan.approve");
    if (proposalIds.length < 2 || new Set(proposalIds).size !== proposalIds.length) throw new Error("story approval requires unique proposal IDs");
    const rawRows = proposalIds.map((proposalId) => readEditorialArtifact(this.session!, projectId, "story_proposal_v2", proposalId, 1)) as any[];
    if (rawRows.some((row) => !row || row.lifecycle_status !== "candidate")) throw new Error("story approval candidate is unavailable or stale"); rawRows.forEach((row) => assertStoryProposalV2(row.value));
    const contractRef = rawRows[0]!.value.contract_ref, contract = readCreativeContractVersion(this.session, projectId, contractRef.object_id, contractRef.object_version) as any; if (!contract || contract.object_hash !== contractRef.digest || contract.lifecycle_status !== "approved") throw new Error("story approval Contract is unavailable or stale"); assertCreativeContractV2(contract.value);
    const selectedRow = rawRows.find((row) => row.value.proposal_id === input.selected_proposal_id); if (!selectedRow) throw new Error("story approval target is unavailable");
    const persistenceRevision = this.stage2PersistenceRevision();
    if (expectedProductCandidateRefs) await this.assertProductCandidateSetCurrent("story_proposal_v2", selectedRow.value, expectedProductCandidateRefs, "PRODUCT_WORKSPACE_CANDIDATE_SET_STALE");
    const candidateRefs = rawRows.map((row) => ({ object_id: row.value.proposal_id, object_version: row.value.object_version, digest: row.object_hash })), persistedAuthorityDigest = this.storyPersistedAuthorityDigest(projectId, selectedRow.value, candidateRefs);
    const duration = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, selectedRow.value.duration_feasibility_ref.object_id) as any);
    if (!duration || duration.object_hash !== selectedRow.value.duration_feasibility_ref.digest || duration.value.object_version !== selectedRow.value.duration_feasibility_ref.object_version || duration.lifecycle_status !== "feasible") throw new Error("story approval Duration Feasibility is unavailable or stale"); assertDurationFeasibilityV1(duration.value);
    const subject = { object_type: "story_proposal_v2" as const, object_id: selectedRow.value.proposal_id, object_version: selectedRow.value.object_version, digest: selectedRow.object_hash }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "direction_card", ...selectedRow.value.direction_ref }, { object_type: "material_evidence_pack", ...selectedRow.value.material_pack_ref }, { object_type: "duration_feasibility", ...selectedRow.value.duration_feasibility_ref }], effect = { proposal_ids: [...proposalIds].sort(), candidate_refs: candidateRefs.slice().sort((left, right) => left.object_id.localeCompare(right.object_id)), selected_proposal_id: input.selected_proposal_id, decision_id: input.decision_id, plan_id: input.plan_id, reason: input.reason, review_digest: input.review_digest }, evaluatePermission = () => this.stage2Gate({ action: "story_plan.approve", subject_ref: subject, context_refs: contexts, requested_data_fields: ["alternatives", "reason", "review_digest", "selected_ref"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("story_plan.approve", effect), reason: input.reason, approval_id: input.approval_id, retain: false }) as any, permission = evaluatePermission(), human = permission.request.approval;
    if (this.storyCandidateSetWasApproved(projectId, proposalIds)) throw new Error("STORY_CANDIDATE_SET_ALREADY_APPROVED");
    const rows = await Promise.all(rawRows.map((row) => this.editorialArtifactView(row, "story_proposal_v2"))) as any[]; if (rows.some((row) => row.lifecycle_status !== "candidate")) throw new Error("story approval candidate is unavailable or stale"); if (this.storyCandidateSetWasApproved(projectId, proposalIds)) throw new Error("STORY_CANDIDATE_SET_ALREADY_APPROVED");
    this.assertStage2PersistenceRevision(persistenceRevision, "story approval candidate is unavailable or stale");
    const result = approveStoryProposalV2(rows.map((row) => row.value), { ...input, actor_id: human.actor_id, actor_kind: "user", approved_at: human.approved_at }, contract.value, duration.value); assertDecisionRecordV1(result.decision); assertApprovedStoryPlanV2(result.plan);
    const [decision, plan] = runStage2AtomicMutation(this.session, () => {
      if (this.storyCandidateSetWasApproved(projectId, proposalIds)) throw new Error("STORY_CANDIDATE_SET_ALREADY_APPROVED");
      this.assertStage2PersistenceRevision(persistenceRevision, "story approval candidate is unavailable or stale");
      const freshAuthority = this.readStoryPersistedAuthority(projectId, selectedRow.value, candidateRefs);
      if (editorialObjectDigest(freshAuthority) !== persistedAuthorityDigest) throw new Error("story approval candidate is unavailable or stale");
      const fresh = this.assertStoryPersistedAuthority(projectId, selectedRow.value, freshAuthority, "story approval candidate is unavailable or stale");
      const freshRows = freshAuthority.proposals as any[];
      if (freshRows.length !== candidateRefs.length || freshRows.some((row, index) => !row || row.object_hash !== candidateRefs[index]!.digest || row.value?.object_version !== candidateRefs[index]!.object_version || row.lifecycle_status !== "candidate")) throw new Error("story approval candidate is unavailable or stale");
      const freshPermission = evaluatePermission(), freshHuman = freshPermission.request.approval;
      const freshResult = approveStoryProposalV2(freshRows.map((row) => row.value), { ...input, actor_id: freshHuman.actor_id, actor_kind: "user", approved_at: freshHuman.approved_at }, fresh.contract.value, fresh.duration.value); assertDecisionRecordV1(freshResult.decision); assertApprovedStoryPlanV2(freshResult.plan);
      if (editorialObjectDigest(freshResult.decision) !== editorialObjectDigest(result.decision) || editorialObjectDigest(freshResult.plan) !== editorialObjectDigest(result.plan)) throw new Error("story approval candidate is unavailable or stale");
      this.retainStage2Gate(freshPermission);
      return registerEditorialArtifactBatch(this.session!, projectId, [{ artifact_type: "decision_record", value: freshResult.decision }, { artifact_type: "approved_story_plan_v2", value: freshResult.plan }]);
    }) as any[];
    return { decision, plan };
  }

  async generateEditorialIntent(input: EditorialIntentHostInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    const persistenceRevision = this.stage2PersistenceRevision();
    const planRow = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "approved_story_plan_v2", input.plan_id, 1), "approved_story_plan_v2") as any; if (!planRow || planRow.lifecycle_status !== "approved") throw new Error("approved Story Plan is unavailable or stale"); assertApprovedStoryPlanV2(planRow.value);
    const decisionRows = await Promise.all(input.decision_ids.map((decisionId) => this.editorialArtifactView(readEditorialArtifact(this.session!, projectId, "decision_record", decisionId, 1), "decision_record"))) as any[]; if (decisionRows.some((row) => !row || !["approved", "overridden"].includes(row.lifecycle_status))) throw new Error("Editorial Edit Intent decision is unavailable or stale"); decisionRows.forEach((row) => assertDecisionRecordV1(row.value));
    this.assertStage2PersistenceRevision(persistenceRevision, "Editorial Edit Intent authority is unavailable or stale");
    const rawTimeline = readLatestTimeline(this.session, projectId); if (!rawTimeline) throw new Error("timeline is not initialized"); const baseTimelineVersion = Number((JSON.parse(rawTimeline) as any).version);
    const contract = readCreativeContractVersion(this.session, projectId, planRow.value.contract_ref.object_id, planRow.value.contract_ref.object_version) as any; if (!contract || contract.object_hash !== planRow.value.contract_ref.digest || contract.lifecycle_status !== "approved") throw new Error("Editorial Edit Intent Contract is unavailable or stale"); assertCreativeContractV2(contract.value);
    const capabilities = [...HOST_SEMANTIC_CAPABILITIES].sort(), snapshotBase = { schema_version: 1 as const, snapshot_id: input.capability_snapshot_id, object_version: 1, capabilities, created_at: input.created_at, producer: "project-host" as const, source_version: EDITORIAL_INTENT_GENERATOR_VERSION, policy_version: EDITORIAL_INTENT_POLICY_VERSION }, snapshot = { ...snapshotBase, input_fingerprint: editorialObjectDigest(snapshotBase) }, snapshotRef = { object_id: snapshot.snapshot_id, object_version: 1, digest: editorialObjectDigest(snapshot) };
    const planRef = { object_id: planRow.value.plan_id, object_version: planRow.value.object_version, digest: planRow.object_hash }, decisionRefs = decisionRows.map((row) => ({ object_id: row.value.decision_id, object_version: row.value.object_version, digest: row.object_hash }));
    const intent = generateEditorialEditIntent(planRow.value, decisionRows.map((row) => row.value), { ...input, base_timeline_version: baseTimelineVersion, approved_story_ref: planRef, decision_refs: decisionRefs, contract_ref: planRow.value.contract_ref, capability_snapshot_ref: snapshotRef, available_capabilities: new Set(capabilities), protected_refs: contract.value.protected_refs }); assertEditorialEditIntentV1(intent);
    const subject = { object_type: "approved_story_plan_v2" as const, ...planRef }, contexts: Stage2PermissionTypedRef[] = [...decisionRefs.map((reference) => ({ object_type: "decision_record" as const, ...reference })), { object_type: "creative_contract", ...planRow.value.contract_ref }, { object_type: "capability_snapshot", ...snapshotRef }], scope = [subject, ...contexts].map(permissionRefKey).sort();
    const [, persistedIntent] = runStage2AtomicMutation(this.session, () => {
      this.assertStage2PersistenceRevision(persistenceRevision, "Editorial Edit Intent authority is unavailable or stale");
      this.assertCurrentMaterialPackReference(projectId, planRow.value.material_pack_ref, "Editorial Edit Intent authority is unavailable or stale");
      const gate = this.stage2Gate({ action: "editorial_edit_intent.generate", subject_ref: subject, context_refs: contexts, requested_data_fields: ["alternatives", "approved_story_ref", "decision_refs", "operations", "reason", "risks"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("editorial_edit_intent.generate", intent), reason: input.reason, retain: false });
      const persisted = registerEditorialArtifactBatch(this.session!, projectId, [{ artifact_type: "capability_snapshot", value: snapshot }, { artifact_type: "editorial_edit_intent", value: intent }]);
      this.retainStage2Gate(gate);
      return persisted;
    }) as any[];
    return persistedIntent;
  }

  async createFeedbackRevision(input: FeedbackRevisionHostInput): Promise<Readonly<{ diagnosis: unknown; intent: unknown }>> {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["alternatives", "base_execution_id", "confidence", ...(input.created_at ? ["created_at"] : []), "diagnosis_id", "feedback_text", "intent_id", "reason", "target"], "feedback_revision.generate");
    const projectId = this.session.manifest.project_id, execution = readIntelligenceEditExecution(this.session, projectId, input.base_execution_id) as any;
    if (!execution || execution.value?.status !== "committed") throw new Error("FEEDBACK_BASE_EXECUTION_UNAVAILABLE");
    const rawTimeline = readLatestTimeline(this.session, projectId); if (!rawTimeline) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(rawTimeline)) as Timeline;
    if (execution.value.final_timeline_version !== timeline.version) throw new Error("FEEDBACK_BASE_EXECUTION_NOT_CURRENT");
    const track = timeline.tracks.find((candidate) => candidate.track_id === input.target.track_id), clip = track?.clips.find((candidate) => candidate.clip_id === input.target.clip_id);
    if (!track || track.kind !== "video" || !clip) throw new Error("FEEDBACK_TARGET_UNAVAILABLE");
    assertExactInputKeys(input.target, ["clip_id", "proposed_source", "track_id", "trim_duration"], "feedback_revision.target");
    const rationalToSourceUnits = (value: Readonly<{ schema_version: 1; value: number; timescale: number }>, label: string): bigint => {
      if (value.schema_version !== 1 || !Number.isSafeInteger(value.value) || value.value <= 0 || !Number.isSafeInteger(value.timescale) || value.timescale <= 0) throw new Error(`FEEDBACK_TRIM_TIME_INVALID:${label}`);
      const numerator = BigInt(value.value) * clip.source.timescale, denominator = BigInt(value.timescale);
      if (numerator % denominator !== 0n) throw new Error(`FEEDBACK_TRIM_TIMEBASE_NOT_EXACT:${label}`);
      return numerator / denominator;
    };
    const sourceRangeToUnits = (value: Readonly<{ schema_version: 1; value: number; timescale: number }>, label: string): bigint => {
      if (value.schema_version !== 1 || !Number.isSafeInteger(value.value) || value.value < 0 || !Number.isSafeInteger(value.timescale) || value.timescale <= 0) throw new Error(`FEEDBACK_TRIM_TIME_INVALID:${label}`);
      const numerator = BigInt(value.value) * clip.source.timescale, denominator = BigInt(value.timescale);
      if (numerator % denominator !== 0n) throw new Error(`FEEDBACK_TRIM_TIMEBASE_NOT_EXACT:${label}`);
      return numerator / denominator;
    };
    const proposedStart = sourceRangeToUnits(input.target.proposed_source.start, "proposed-start"), proposedEnd = sourceRangeToUnits(input.target.proposed_source.end, "proposed-end"), trimDuration = rationalToSourceUnits(input.target.trim_duration, "trim-duration");
    if (input.target.proposed_source.asset_id !== clip.source.asset_id || proposedStart !== clip.source.start_pts || trimDuration <= 0n || proposedEnd !== clip.source.end_pts - trimDuration || proposedEnd <= proposedStart) throw new Error("FEEDBACK_TRIM_DURATION_REBOUND");
    const executionIntentIds = new Set<string>(), executionIds = new Set<string>(); let lineage = execution;
    for (let depth = 0; lineage && depth < 64; depth += 1) {
      const executionId = lineage.value?.execution_id; if (typeof executionId !== "string" || executionIds.has(executionId)) throw new Error("FEEDBACK_BASE_EXECUTION_LINEAGE_INVALID"); executionIds.add(executionId);
      const intentId = lineage.value?.intent_ref?.object_id; if (typeof intentId === "string") executionIntentIds.add(intentId);
      const baseExecutionId = lineage.value?.base_execution_ref?.object_id; if (!baseExecutionId) break;
      const base = readIntelligenceEditExecution(this.session, projectId, baseExecutionId) as any;
      if (!base) throw new Error("FEEDBACK_BASE_EXECUTION_LINEAGE_INVALID");
      lineage = base;
    }
    if (lineage?.value?.base_execution_ref?.object_id) throw new Error("FEEDBACK_BASE_EXECUTION_LINEAGE_INVALID");
    const clipIntentId = clip.semantic_sidecar?.metadata?.intent_id;
    if (track.track_id !== "video-main" || !clip.clip_id.startsWith("semantic:") || typeof clipIntentId !== "string" || !executionIntentIds.has(clipIntentId)) throw new Error("FEEDBACK_TARGET_NOT_EXECUTION_OUTPUT");
    const executionContractRef = execution.value.contract_ref, executionContract = readCreativeContractVersion(this.session, projectId, executionContractRef?.object_id, executionContractRef?.object_version) as any, contractHeads = listCreativeContractHeads(this.session, projectId) as any[], contractHead = contractHeads.length === 1 ? contractHeads[0] : null;
    if (!executionContractRef || !executionContract || executionContract.object_hash !== executionContractRef.digest || executionContract.lifecycle_status !== "approved" || !contractHead || contractHead.value?.contract_id !== executionContractRef.object_id || contractHead.object_version !== executionContractRef.object_version || contractHead.object_hash !== executionContractRef.digest) throw new Error("FEEDBACK_CONTRACT_AUTHORITY_UNAVAILABLE_OR_STALE");
    const unavailableReason = feedbackTrimTargetUnavailableReason(timeline, track, clip, executionContract.value.protected_refs ?? []);
    if (unavailableReason) throw new Error(`FEEDBACK_TARGET_UNAVAILABLE:${unavailableReason}`);
    const baseIntentRow = readEditorialArtifact(this.session, projectId, "editorial_edit_intent", execution.value.intent_ref?.object_id, execution.value.intent_ref?.object_version) as any;
    if (!baseIntentRow || baseIntentRow.object_hash !== execution.value.intent_ref?.digest) throw new Error("FEEDBACK_BASE_INTENT_REBOUND");
    assertEditorialEditIntentV1(baseIntentRow.value);
    const existingDiagnosis = readFeedbackDiagnosis(this.session, projectId, input.diagnosis_id, 1) as any, createdAt = input.created_at ?? existingDiagnosis?.value?.created_at ?? new Date(this.now()).toISOString();
    const authorityRefs = { approved_story_ref: execution.value.story_ref, decision_refs: execution.value.decision_refs, evidence_refs: execution.value.evidence_refs, contract_ref: execution.value.contract_ref, capability_snapshot_ref: execution.value.capability_snapshot_ref };
    const diagnosis = diagnoseFeedbackRevision({ diagnosis_id: input.diagnosis_id, feedback_text: input.feedback_text, base_execution_ref: { object_id: input.base_execution_id, object_version: 1, digest: execution.object_hash }, base_timeline_ref: { version: timeline.version, digest: timelineDigest(timeline) }, target: { track_id: input.target.track_id, clip_id: input.target.clip_id, original_source: timelineSourceRangeContract(clip.source), proposed_source: input.target.proposed_source, trim_duration: input.target.trim_duration }, authority_refs: authorityRefs, reason: input.reason, alternatives: input.alternatives, confidence: input.confidence, created_at: createdAt });
    assertFeedbackDiagnosisV2(diagnosis);
    const intent = createFeedbackRevisionIntent(diagnosis, baseIntentRow.value, { intent_id: input.intent_id, created_at: createdAt }); assertEditorialEditIntentV1(intent);
    const diagnosisRef: Stage2PermissionTypedRef = { object_type: "feedback_diagnosis", object_id: diagnosis.diagnosis_id, object_version: diagnosis.object_version, digest: editorialObjectDigest(diagnosis) };
    const contexts: Stage2PermissionTypedRef[] = [{ object_type: "intelligence_edit_execution", ...diagnosis.base_execution_ref }, { object_type: "approved_story_plan_v2", ...authorityRefs.approved_story_ref }, ...authorityRefs.decision_refs.map((reference: any) => ({ object_type: "decision_record" as const, ...reference })), ...authorityRefs.evidence_refs.map((reference: any) => ({ object_type: "evidence_object" as const, ...reference })), { object_type: "creative_contract", ...authorityRefs.contract_ref }, { object_type: "capability_snapshot", ...authorityRefs.capability_snapshot_ref }];
    const scope = [diagnosisRef, ...contexts].map(permissionRefKey).sort(), gate = this.stage2Gate({ action: "feedback_revision.generate", subject_ref: diagnosisRef, context_refs: contexts, requested_data_fields: ["diagnosis", "intent", "preview_effect", "reason"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("feedback_revision.generate", { diagnosis, intent }), reason: input.reason, retain: false });
    return this.commitStage2Mutation(gate, () => {
      const persistedDiagnosis = registerFeedbackDiagnosis(this.session!, projectId, diagnosis);
      const persistedIntent = registerEditorialArtifact(this.session!, projectId, "editorial_edit_intent", intent);
      return { diagnosis: persistedDiagnosis, intent: persistedIntent };
    }, "business_first");
  }

  private loadFeedbackRevisionCompilation(intentRow: any, timeline: Timeline): Readonly<{ compilation: SemanticIntentCompilation; diagnosis: any; execution: any; evidence: readonly ApprovedSemanticEvidence[] }> {
    if (!this.session || !intentRow?.value?.feedback_diagnosis_ref) throw new Error("FEEDBACK_REVISION_DIAGNOSIS_UNAVAILABLE");
    const projectId = this.session.manifest.project_id, reference = intentRow.value.feedback_diagnosis_ref;
    const diagnosis = readFeedbackDiagnosis(this.session, projectId, reference.object_id, reference.object_version) as any;
    if (!diagnosis || diagnosis.object_hash !== reference.digest) throw new Error("FEEDBACK_REVISION_DIAGNOSIS_REBOUND");
    assertFeedbackDiagnosisV2(diagnosis.value); validateFeedbackDiagnosisV2(diagnosis.value);
    const execution = readIntelligenceEditExecution(this.session, projectId, diagnosis.value.base_execution_ref.object_id) as any;
    if (!execution || execution.object_hash !== diagnosis.value.base_execution_ref.digest || diagnosis.value.base_execution_ref.object_version !== 1) throw new Error("FEEDBACK_BASE_EXECUTION_REBOUND");
    const planRow = readEditorialArtifact(this.session, projectId, "approved_story_plan_v2", intentRow.value.approved_story_ref.object_id, intentRow.value.approved_story_ref.object_version) as any;
    if (!planRow || planRow.object_hash !== intentRow.value.approved_story_ref.digest) throw new Error("FEEDBACK_STORY_REBOUND"); assertApprovedStoryPlanV2(planRow.value);
    const evidence: ApprovedSemanticEvidence[] = diagnosis.value.authority_refs.evidence_refs.map((evidenceRef: any) => {
      const row = readEvidenceObject(this.session!, evidenceRef.object_id) as any;
      if (!row || row.object_hash !== evidenceRef.digest || Number(row.value?.evidence_version ?? 1) !== evidenceRef.object_version || row.value?.review_status !== "approved") throw new Error(`FEEDBACK_EVIDENCE_UNAVAILABLE_OR_STALE:${evidenceRef.object_id}`);
      return { evidence_id: row.value.evidence_id, evidence_version: Number(row.value.evidence_version ?? 1), object_hash: row.object_hash, asset_id: row.value.asset_id, start_pts: row.value.start_pts, end_pts: row.value.end_pts, timescale: row.value.timescale, review_status: "approved" as const };
    });
    const compilation = compileFeedbackRevision({ intent: intentRow.value, intent_digest: intentRow.object_hash, plan: planRow.value, plan_digest: planRow.object_hash, evidence, timeline, timeline_digest: timelineDigest(timeline), diagnosis: diagnosis.value, diagnosis_digest: diagnosis.object_hash, base_execution_digest: execution.object_hash });
    return { compilation, diagnosis, execution, evidence };
  }

  async previewFeedbackRevision(intentId: string): Promise<FeedbackRevisionPreview> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    const intentRow = readEditorialArtifact(this.session, projectId, "editorial_edit_intent", intentId, 1) as any; if (!intentRow) throw new Error("FEEDBACK_REVISION_INTENT_UNAVAILABLE"); assertEditorialEditIntentV1(intentRow.value);
    const rawTimeline = readLatestTimeline(this.session, projectId); if (!rawTimeline) throw new Error("timeline is not initialized"); const timeline = revive(JSON.parse(rawTimeline)) as Timeline;
    const loaded = this.loadFeedbackRevisionCompilation(intentRow, timeline), prepared = this.prepareEdit(loaded.compilation.command_intent, timeline), diagnosisRef = intentRow.value.feedback_diagnosis_ref!;
    return { diagnosis_ref: { ...diagnosisRef }, intent_ref: { object_id: intentRow.value.intent_id, object_version: intentRow.value.object_version, digest: intentRow.object_hash }, base_execution_ref: { ...loaded.diagnosis.value.base_execution_ref }, base_timeline_version: timeline.version, expected_final_timeline_version: prepared.timeline.version, affected_scope: [...loaded.compilation.effect.affected_scope], effect: loaded.compilation.effect, compiled_effect_digest: editorialObjectDigest({ effect: loaded.compilation.effect, commit_plan_hash: prepared.plan.plan_hash, expected_final_timeline_version: prepared.timeline.version }) };
  }

  private feedbackRevisionRejected(intentRef: Stage2PermissionTypedRef): boolean {
    if (!this.session) throw new Error("project is not open");
    return listStage2PermissionDecisions(this.session, this.session.manifest.project_id).some((row: any) => row.value?.action === "feedback_revision.reject"
      && row.value?.classification === "exact_human_approved"
      && permissionRefKey(row.value.subject_ref) === permissionRefKey(intentRef));
  }

  async rejectFeedbackRevision(input: Readonly<{ intent_id: string; approval_id: string; reason: string; review_digest: string }>): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); assertExactInputKeys(input, ["approval_id", "intent_id", "reason", "review_digest"], "feedback_revision.reject");
    const projectId = this.session.manifest.project_id, intentRow = readEditorialArtifact(this.session, projectId, "editorial_edit_intent", input.intent_id, 1) as any;
    if (!intentRow || intentRow.object_hash !== input.review_digest || !intentRow.value?.feedback_diagnosis_ref) throw new Error("FEEDBACK_REJECTION_TARGET_UNAVAILABLE_OR_STALE");
    const diagnosis = readFeedbackDiagnosis(this.session, projectId, intentRow.value.feedback_diagnosis_ref.object_id, intentRow.value.feedback_diagnosis_ref.object_version) as any;
    if (!diagnosis || diagnosis.object_hash !== intentRow.value.feedback_diagnosis_ref.digest) throw new Error("FEEDBACK_REJECTION_DIAGNOSIS_REBOUND");
    const subject: Stage2PermissionTypedRef = { object_type: "editorial_edit_intent", object_id: intentRow.value.intent_id, object_version: intentRow.value.object_version, digest: intentRow.object_hash };
    const contexts: Stage2PermissionTypedRef[] = [{ object_type: "feedback_diagnosis", ...intentRow.value.feedback_diagnosis_ref }, { object_type: "intelligence_edit_execution", ...diagnosis.value.base_execution_ref }, { object_type: "creative_contract", ...intentRow.value.contract_ref }, { object_type: "approved_story_plan_v2", ...intentRow.value.approved_story_ref }];
    const effect = { intent_ref: subject, diagnosis_ref: contexts[0], reason: input.reason, review_digest: input.review_digest };
    return this.stage2Gate({ action: "feedback_revision.reject", subject_ref: subject, context_refs: contexts, requested_data_fields: ["reason", "review_digest"], affected_scope: [...diagnosis.value.affected_scope], effect_digest: stage2PermissionEffectDigest("feedback_revision.reject", effect), reason: input.reason, approval_id: input.approval_id });
  }

  async approveEditorialIntent(input: Readonly<{ intent_id: string; approval_id: string; reason: string; review_digest: string }>): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    assertExactInputKeys(input, ["approval_id", "intent_id", "reason", "review_digest"], "editorial_edit_intent.approve");
    const rawIntentRow = readEditorialArtifact(this.session, projectId, "editorial_edit_intent", input.intent_id, 1) as any; if (!rawIntentRow || rawIntentRow.lifecycle_status !== "candidate" || rawIntentRow.object_hash !== input.review_digest) throw new Error("Editorial Edit Intent approval target is unavailable or stale"); assertEditorialEditIntentV1(rawIntentRow.value);
    const intentRow = rawIntentRow;
    const exactIntentRef: Stage2PermissionTypedRef = { object_type: "editorial_edit_intent", object_id: intentRow.value.intent_id, object_version: intentRow.value.object_version, digest: intentRow.object_hash };
    if (intentRow.value.feedback_diagnosis_ref && this.feedbackRevisionRejected(exactIntentRef)) throw new Error("FEEDBACK_REVISION_REJECTED");
    const contractRef = intentRow.value.contract_ref, planRef = intentRow.value.approved_story_ref, decisionRefs = intentRow.value.decision_refs as readonly Readonly<{ object_id: string; object_version: number; digest: string }>[], capabilityRef = intentRow.value.capability_snapshot_ref;
    const contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "approved_story_plan_v2", ...planRef }, ...decisionRefs.map((reference) => ({ object_type: "decision_record" as const, ...reference })), { object_type: "capability_snapshot", ...capabilityRef }];
    if (intentRow.value.feedback_diagnosis_ref) {
      const diagnosis = readFeedbackDiagnosis(this.session, projectId, intentRow.value.feedback_diagnosis_ref.object_id, intentRow.value.feedback_diagnosis_ref.object_version) as any;
      if (!diagnosis || diagnosis.object_hash !== intentRow.value.feedback_diagnosis_ref.digest) throw new Error("Editorial Edit Intent feedback diagnosis is unavailable or stale");
      contexts.push({ object_type: "feedback_diagnosis", ...intentRow.value.feedback_diagnosis_ref }, { object_type: "intelligence_edit_execution", ...diagnosis.value.base_execution_ref });
    }
    const scope = [...new Set<string>(intentRow.value.operations.flatMap((operation: any): string[] => Array.isArray(operation?.target_refs) ? operation.target_refs : []))].sort(), contract = readCreativeContractVersion(this.session, projectId, contractRef.object_id, contractRef.object_version) as any; if (!contract || contract.object_hash !== contractRef.digest || contract.lifecycle_status !== "approved") throw new Error("Editorial Edit Intent Contract authority is unavailable or stale");
    const subject = exactIntentRef, effect = { intent_ref: subject, expected_effects: intentRow.value.operations.map((operation: any) => ({ operation_id: operation.operation_id, expected_effect: operation.expected_effect, target_refs: operation.target_refs })), reason: input.reason, review_digest: input.review_digest };
    const evaluatePermission = () => this.stage2Gate({ action: "editorial_edit_intent.approve", subject_ref: subject, context_refs: contexts, requested_data_fields: ["expected_effects", "reason", "review_digest"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("editorial_edit_intent.approve", effect), reason: input.reason, approval_id: input.approval_id, protected_refs: contract.value.protected_refs, retain: false });
    evaluatePermission(); const persistenceRevision = this.stage2PersistenceRevision();
    const current = intentRow.value.feedback_diagnosis_ref ? rawIntentRow : await this.editorialArtifactView(rawIntentRow, "editorial_edit_intent") as any; if (current.lifecycle_status !== "candidate") throw new Error("Editorial Edit Intent approval target is unavailable or stale");
    this.assertStage2PersistenceRevision(persistenceRevision, "Editorial Edit Intent approval target is unavailable or stale");
    return runStage2AtomicMutation(this.session, () => {
      this.assertStage2PersistenceRevision(persistenceRevision, "Editorial Edit Intent approval target is unavailable or stale");
      const freshIntent = readEditorialArtifact(this.session!, projectId, "editorial_edit_intent", input.intent_id, 1) as any, freshContract = readCreativeContractVersion(this.session!, projectId, contractRef.object_id, contractRef.object_version) as any, freshContractHead = readCreativeContractHead(this.session!, projectId, contractRef.object_id) as any;
      if (!freshIntent || freshIntent.object_hash !== input.review_digest || freshIntent.lifecycle_status !== "candidate" || !freshContract || freshContract.object_hash !== contractRef.digest || freshContract.lifecycle_status !== "approved" || !freshContractHead || freshContractHead.object_version !== contractRef.object_version || freshContractHead.object_hash !== contractRef.digest || freshContractHead.lifecycle_status !== "approved") throw new Error("Editorial Edit Intent approval target is unavailable or stale");
      if (!intentRow.value.feedback_diagnosis_ref) { const freshPlan = readEditorialArtifact(this.session!, projectId, "approved_story_plan_v2", planRef.object_id, planRef.object_version) as any; if (!freshPlan || freshPlan.object_hash !== planRef.digest || freshPlan.lifecycle_status !== "approved") throw new Error("Editorial Edit Intent approval target is unavailable or stale"); this.assertCurrentMaterialPackReference(projectId, freshPlan.value.material_pack_ref, "Editorial Edit Intent approval target is unavailable or stale"); }
      if (intentRow.value.feedback_diagnosis_ref && this.feedbackRevisionRejected(exactIntentRef)) throw new Error("FEEDBACK_REVISION_REJECTED");
      return this.retainStage2Gate(evaluatePermission());
    });
  }

  private async prepareEditorialIntentExecutionInternal(input: EditorialIntentExecutionIdentity): Promise<PreparedEditorialIntentExecution> {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["execution_id", "intent_id", "proposal_approval_decision_id"], "editorial_edit_intent.execute.prepare");
    if (!input.execution_id.trim()) throw new Error("SEMANTIC_EXECUTION_ID_INVALID");
    const projectId = this.session.manifest.project_id;
    const rawIntent = readEditorialArtifact(this.session, projectId, "editorial_edit_intent", input.intent_id, 1) as any;
    const intentRow = rawIntent?.value?.feedback_diagnosis_ref ? rawIntent : await this.editorialArtifactView(rawIntent, "editorial_edit_intent") as any;
    if (!intentRow || intentRow.lifecycle_status !== "candidate") throw new Error("SEMANTIC_INTENT_UNAVAILABLE_OR_STALE");
    assertEditorialEditIntentV1(intentRow.value);
    const intentRef: Stage2PermissionTypedRef = { object_type: "editorial_edit_intent", object_id: intentRow.value.intent_id, object_version: intentRow.value.object_version, digest: intentRow.object_hash };
    if (intentRow.value.feedback_diagnosis_ref && this.feedbackRevisionRejected(intentRef)) throw new Error("FEEDBACK_REVISION_REJECTED");
    const proposalRaw = readStage2PermissionDecision(this.session, projectId, input.proposal_approval_decision_id, 1) as any;
    const proposalApproval = await this.stage2PermissionDecisionView(proposalRaw) as any;
    if (!proposalApproval || proposalApproval.lifecycle_status === "stale" || proposalApproval.value?.action !== "editorial_edit_intent.approve" || proposalApproval.value?.classification !== "exact_human_approved" || permissionRefKey(proposalApproval.value.subject_ref) !== permissionRefKey(intentRef)) throw new Error("SEMANTIC_PROPOSAL_APPROVAL_UNAVAILABLE_OR_STALE");
    const rawPlanRow = readEditorialArtifact(this.session, projectId, "approved_story_plan_v2", intentRow.value.approved_story_ref.object_id, intentRow.value.approved_story_ref.object_version) as any, planRow = intentRow.value.feedback_diagnosis_ref ? rawPlanRow : await this.editorialArtifactView(rawPlanRow, "approved_story_plan_v2") as any;
    if (!planRow || planRow.lifecycle_status !== "approved" || planRow.object_hash !== intentRow.value.approved_story_ref.digest) throw new Error("SEMANTIC_STORY_UNAVAILABLE_OR_STALE");
    assertApprovedStoryPlanV2(planRow.value);
    const authorityRefs: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...intentRow.value.contract_ref }, { object_type: "approved_story_plan_v2", ...intentRow.value.approved_story_ref }, ...intentRow.value.decision_refs.map((reference: any) => ({ object_type: "decision_record" as const, ...reference })), { object_type: "capability_snapshot", ...intentRow.value.capability_snapshot_ref }];
    if (intentRow.value.feedback_diagnosis_ref) {
      const diagnosis = readFeedbackDiagnosis(this.session, projectId, intentRow.value.feedback_diagnosis_ref.object_id, intentRow.value.feedback_diagnosis_ref.object_version) as any;
      if (!diagnosis || diagnosis.object_hash !== intentRow.value.feedback_diagnosis_ref.digest) throw new Error("FEEDBACK_REVISION_DIAGNOSIS_REBOUND");
      authorityRefs.push({ object_type: "feedback_diagnosis", ...intentRow.value.feedback_diagnosis_ref }, { object_type: "intelligence_edit_execution", ...diagnosis.value.base_execution_ref });
    }
    const authorityRows = await Promise.all(authorityRefs.map((reference) => this.stage2PermissionReferenceView(reference)));
    if (authorityRows.some((row) => !row)) {
      if (!intentRow.value.feedback_diagnosis_ref) throw new Error("SEMANTIC_AUTHORITY_REF_UNAVAILABLE_OR_STALE");
      for (const [index, row] of authorityRows.entries()) if (!row) { const reference = authorityRefs[index]!; if (!["approved_story_plan_v2", "decision_record", "capability_snapshot"].includes(reference.object_type)) throw new Error("FEEDBACK_AUTHORITY_REF_UNAVAILABLE_OR_STALE"); const raw = readEditorialArtifact(this.session, projectId, reference.object_type, reference.object_id, reference.object_version) as any; if (!raw || raw.object_hash !== reference.digest || ["rejected", "superseded"].includes(raw.lifecycle_status)) throw new Error("FEEDBACK_AUTHORITY_REF_UNAVAILABLE_OR_STALE"); }
    }
    const evidence: ApprovedSemanticEvidence[] = [];
    for (const reference of intentRow.value.evidence_refs as readonly Readonly<{ object_id: string; object_version: number; digest: string }>[]) {
      const row = readEvidenceObject(this.session, reference.object_id) as any;
      if (!row || row.object_hash !== reference.digest || Number(row.value?.evidence_version ?? 1) !== reference.object_version || row.value?.review_status !== "approved") throw new Error(`SEMANTIC_EVIDENCE_UNAVAILABLE_OR_STALE:${reference.object_id}`);
      evidence.push({ evidence_id: row.value.evidence_id, evidence_version: Number(row.value.evidence_version ?? 1), object_hash: row.object_hash, asset_id: row.value.asset_id, start_pts: row.value.start_pts, end_pts: row.value.end_pts, timescale: row.value.timescale, review_status: "approved" });
    }
    const rawTimeline = readLatestTimeline(this.session, projectId); if (!rawTimeline) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(rawTimeline)) as Timeline;
    const compilation = intentRow.value.feedback_diagnosis_ref ? this.loadFeedbackRevisionCompilation(intentRow, timeline).compilation : compileApprovedEditorialIntent({ intent: intentRow.value, intent_digest: intentRow.object_hash, plan: planRow.value, plan_digest: planRow.object_hash, evidence, timeline });
    const prepared = this.prepareEdit(compilation.command_intent, timeline);
    const packRow = readMaterialEvidencePack(this.session, projectId, planRow.value.material_pack_ref.object_id, planRow.value.material_pack_ref.object_version) as any;
    if (!packRow || packRow.object_hash !== planRow.value.material_pack_ref.digest) throw new Error("SEMANTIC_MATERIAL_PACK_UNAVAILABLE_OR_STALE");
    this.assertMaterialPackImmutableSourcesCurrent(packRow.value, "SEMANTIC_MATERIAL_PACK_UNAVAILABLE_OR_STALE");
    const immutableRefs = stage2ImmutableOriginalRefs(packRow.value);
    const assetTimescales = new Map<string, bigint>(); for (const item of evidence) if (!assetTimescales.has(item.asset_id)) assetTimescales.set(item.asset_id, BigInt(item.timescale));
    const sourceRefs: RenderSourceRef[] = [];
    for (const [assetRef, sourceTimescale] of [...assetTimescales].sort(([left], [right]) => left.localeCompare(right))) {
      const locations = listAssetLocationsForAssets(this.session, projectId, [assetRef]) as readonly PersistedAssetLocation[];
      const original = locations.find((location) => location.location_type === "immutable_original" && immutableRefs.has(stage2ImmutableOriginalAuthorityRef(location)) && location.metadata?.permission_state === "authorized" && location.metadata.permission_decision?.permission_state === "authorized" && versionedRefMatches(location.metadata.permission_decision.policy_ref, packRow.value.policy_snapshot.rights_policy_ref) && this.stage2ImmutableLocationIsCurrent(location));
      if (!original) throw new Error(`SEMANTIC_ORIGINAL_UNAVAILABLE:${assetRef}`);
      const verifiedOriginal = await this.inspectMediaCandidate(original.location_ref, "ephemeral");
      if (verifiedOriginal.asset_id !== assetRef) throw new Error(`SEMANTIC_ORIGINAL_IDENTITY_MISMATCH:${assetRef}`);
      const verifiedStreams = (verifiedOriginal.probe as { streams?: readonly Readonly<{ codec_type?: string }>[]; timing?: { streams?: Record<string, Readonly<{ codec_type?: string }>> } } | undefined)?.streams ?? Object.values((verifiedOriginal.probe as { timing?: { streams?: Record<string, Readonly<{ codec_type?: string }>> } } | undefined)?.timing?.streams ?? {});
      const authoritativeProbe = verifiedStreams.length ? verifiedOriginal.probe : original.metadata?.probe;
      const streams = (authoritativeProbe as { streams?: readonly Readonly<{ codec_type?: string }>[]; timing?: { streams?: Record<string, Readonly<{ codec_type?: string }>> } } | undefined)?.streams ?? Object.values((authoritativeProbe as { timing?: { streams?: Record<string, Readonly<{ codec_type?: string }>> } } | undefined)?.timing?.streams ?? {});
      const originalHasAudio = streams.length ? streams.some((stream) => stream.codec_type === "audio") : undefined;
      const originalGeometry = probeVideoGeometry(authoritativeProbe);
      if (originalHasAudio === undefined) throw new Error(`SEMANTIC_ORIGINAL_AUDIO_IDENTITY_UNAVAILABLE:${assetRef}`);
      sourceRefs.push({ asset_ref: assetRef, original_ref: original.location_ref, original_object_ref: original.asset_location_id, source_timescale: sourceTimescale, original_timescale: sourceTimescale, ...(originalGeometry ? { original_width: originalGeometry.width, original_height: originalGeometry.height } : {}), has_audio: originalHasAudio });
    }
    const renderPreflight = resolveTimelineRenderPlans(prepared.timeline, new Map(sourceRefs.map((source) => [source.asset_ref, source])), editorialExecutionRenderProfile(prepared.timeline, sourceRefs));
    const renderBlockers = [...renderPreflight.previewPlan.diagnostics, ...renderPreflight.masterPlan.diagnostics];
    if (renderBlockers.length) throw new Error(`SEMANTIC_RENDER_PREFLIGHT_BLOCKED:${renderBlockers.map((diagnostic) => diagnostic.code).join(",")}`);
    const previewSemanticHash = createHash("sha256").update(semanticGraphPayload(renderPreflight.previewGraph)).digest("hex"), masterSemanticHash = createHash("sha256").update(semanticGraphPayload(renderPreflight.masterGraph)).digest("hex");
    if (previewSemanticHash !== masterSemanticHash || renderPreflight.previewPlan.semantic_graph_hash !== renderPreflight.masterPlan.semantic_graph_hash) throw new Error("SEMANTIC_PREVIEW_MASTER_DIVERGENCE");
    const sourceIdentityDigest = editorialObjectDigest(editorialRenderSourceIdentity(sourceRefs));
    const compiledEffectDigest = editorialObjectDigest({ compilation: compilation.effect, commit_plan_hash: prepared.plan.plan_hash, expected_final_timeline_version: prepared.timeline.version, semantic_graph_hash: previewSemanticHash });
    const proposalRef: Stage2PermissionTypedRef = { object_type: "permission_decision", object_id: proposalApproval.value.decision_id, object_version: proposalApproval.value.object_version, digest: proposalApproval.object_hash };
    const contextRefs: Stage2PermissionTypedRef[] = [...authorityRefs, proposalRef, ...evidence.map((item) => ({ object_type: "evidence_object" as const, object_id: item.evidence_id, object_version: item.evidence_version, digest: item.object_hash }))];
    const requestedDataFields = ["base_timeline_version", "compiled_effect_digest", "reason", "review_digest", "source_identity_digest"] as const;
    const executionEffect = { execution_id: input.execution_id, intent_ref: intentRef, proposal_approval_ref: proposalRef, compiler_id: compilation.effect.compiler_id, compiler_version: compilation.effect.compiler_version, base_timeline_version: timeline.version, expected_final_timeline_version: prepared.timeline.version, compiled_effect_digest: compiledEffectDigest, source_identity_digest: sourceIdentityDigest, semantic_graph_hash: previewSemanticHash, preview_plan_id: renderPreflight.previewPlan.plan_id, master_plan_id: renderPreflight.masterPlan.plan_id };
    const review: EditorialIntentExecutionReview = { execution_id: input.execution_id, compiler_id: compilation.effect.compiler_id, compiler_version: compilation.effect.compiler_version, subject_ref: intentRef, context_refs: contextRefs, requested_data_fields: requestedDataFields, affected_scope: compilation.effect.affected_scope, base_timeline_version: timeline.version, expected_final_timeline_version: prepared.timeline.version, compiled_effect_digest: compiledEffectDigest, source_identity_digest: sourceIdentityDigest, semantic_graph_hash: previewSemanticHash, effect_digest: stage2PermissionEffectDigest("editorial_edit_intent.execute", executionEffect) };
    return { review, compilation, prepared, proposal_approval: proposalApproval, source_refs: sourceRefs, preview_plan_id: renderPreflight.previewPlan.plan_id, master_plan_id: renderPreflight.masterPlan.plan_id };
  }

  private async assertEditorialExecutionRenderAuthorityCurrent(executionRow: any, sourceRefs: readonly RenderSourceRef[]): Promise<string> {
    if (!this.session || !executionRow?.value) throw new Error("SEMANTIC_RENDER_EXECUTION_AUTHORITY_REBOUND");
    const authorityRevision = this.stage2PersistenceRevision();
    await this.assertEditorialRenderSourcesCurrent(sourceRefs);
    const projectId = this.session.manifest.project_id, execution = executionRow.value;
    const contract = readCreativeContractVersion(this.session, projectId, execution.contract_ref?.object_id, execution.contract_ref?.object_version) as any, contractHead = readCreativeContractHead(this.session, projectId, execution.contract_ref?.object_id) as any;
    if (!contract || !contractHead || contract.object_hash !== execution.contract_ref?.digest || contractHead.object_version !== execution.contract_ref?.object_version || contractHead.object_hash !== execution.contract_ref?.digest || contract.lifecycle_status !== "approved" || contractHead.lifecycle_status !== "approved") throw new Error("SEMANTIC_RENDER_EXECUTION_AUTHORITY_REBOUND");
    const story = readEditorialArtifact(this.session, projectId, "approved_story_plan_v2", execution.story_ref?.object_id, execution.story_ref?.object_version) as any;
    if (!story || story.object_hash !== execution.story_ref?.digest || story.lifecycle_status !== "approved" || !versionedRefMatches(story.value?.contract_ref, execution.contract_ref)) throw new Error("SEMANTIC_RENDER_EXECUTION_AUTHORITY_REBOUND");
    const pack = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, story.value.material_pack_ref?.object_id, story.value.material_pack_ref?.object_version)) as any;
    const blockingPackReasons = pack?.stale_reasons?.filter((reason: string) => reason !== "timeline_version_changed") ?? [];
    if (!pack || pack.object_hash !== story.value.material_pack_ref?.digest || !versionedRefMatches(pack.value?.contract_ref, execution.contract_ref) || pack.lifecycle_status !== "sufficient" && (pack.lifecycle_status !== "stale" || blockingPackReasons.length > 0)) throw new Error("SEMANTIC_RENDER_EXECUTION_AUTHORITY_REBOUND");
    const immutableRefs = stage2ImmutableOriginalRefs(pack.value);
    for (const source of sourceRefs) {
      const location = (listAssetLocationsForAssets(this.session, projectId, [source.asset_ref]) as readonly PersistedAssetLocation[]).find((candidate) => candidate.location_type === "immutable_original" && candidate.asset_location_id === source.original_object_ref && candidate.location_ref === source.original_ref);
      if (!location || !pack.value.availability.some((item: any) => item.asset_id === source.asset_ref) || !immutableRefs.has(stage2ImmutableOriginalAuthorityRef(location)) || location.metadata?.permission_state !== "authorized" || location.metadata.permission_decision?.permission_state !== "authorized" || !versionedRefMatches(location.metadata.permission_decision.policy_ref, pack.value.policy_snapshot.rights_policy_ref)) throw new Error(`SEMANTIC_RENDER_EXECUTION_AUTHORITY_REBOUND:${source.asset_ref}`);
    }
    this.assertStage2PersistenceRevision(authorityRevision, "SEMANTIC_RENDER_EXECUTION_AUTHORITY_REBOUND");
    return authorityRevision;
  }

  private async assertEditorialRenderSourcesCurrent(sourceRefs: readonly RenderSourceRef[]): Promise<void> {
    if (!this.session) throw new Error("project is not open");
    const projectId = this.session.manifest.project_id;
    await Promise.all(sourceRefs.map(async (source) => {
      const location = (listAssetLocationsForAssets(this.session!, projectId, [source.asset_ref]) as readonly PersistedAssetLocation[]).find((candidate) => candidate.location_type === "immutable_original" && candidate.asset_location_id === source.original_object_ref && candidate.location_ref === source.original_ref && candidate.metadata?.permission_state === "authorized" && candidate.metadata.permission_decision?.permission_state === "authorized" && this.stage2ImmutableLocationIsCurrent(candidate));
      if (!location) throw new Error(`SEMANTIC_ORIGINAL_UNAVAILABLE_OR_STALE:${source.asset_ref}`);
      const verified = await this.inspectMediaCandidate(location.location_ref, "ephemeral");
      if (verified.asset_id !== source.asset_ref) throw new Error(`SEMANTIC_ORIGINAL_IDENTITY_MISMATCH:${source.asset_ref}`);
    }));
  }

  async prepareEditorialIntentExecution(input: EditorialIntentExecutionIdentity): Promise<EditorialIntentExecutionReview> { return (await this.prepareEditorialIntentExecutionInternal(input)).review; }

  async executeApprovedEditorialIntent(input: EditorialIntentExecutionInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["execution_approval_id", "execution_id", "intent_id", "proposal_approval_decision_id", "reason"], "editorial_edit_intent.execute");
    const projectId = this.session.manifest.project_id, existing = readIntelligenceEditExecution(this.session, projectId, input.execution_id) as any;
    if (existing) { const value = existing.value; if (value.intent_ref?.object_id !== input.intent_id || value.proposal_approval_ref?.object_id !== input.proposal_approval_decision_id || value.execution_approval_id !== input.execution_approval_id || value.reason !== input.reason) throw new Error("SEMANTIC_EXECUTION_ID_CONFLICT"); return value; }
    const persistenceRevision = this.stage2PersistenceRevision();
    const preparedExecution = await this.prepareEditorialIntentExecutionInternal({ execution_id: input.execution_id, intent_id: input.intent_id, proposal_approval_decision_id: input.proposal_approval_decision_id });
    const review = preparedExecution.review;
    if (preparedExecution.compilation.effect.feedback_diagnosis_ref && this.feedbackRevisionRejected(review.subject_ref)) throw new Error("FEEDBACK_REVISION_REJECTED");
    await this.assertEditorialRenderSourcesCurrent(preparedExecution.source_refs);
    this.assertStage2PersistenceRevision(persistenceRevision, "SEMANTIC_EXECUTION_AUTHORITY_UNAVAILABLE_OR_STALE");
    const evaluatePermission = () => this.stage2Gate({ action: "editorial_edit_intent.execute", subject_ref: review.subject_ref, context_refs: review.context_refs, requested_data_fields: review.requested_data_fields, affected_scope: review.affected_scope, effect_digest: review.effect_digest, reason: input.reason, approval_id: input.execution_approval_id, protected_refs: preparedExecution.compilation.command_intent.protected_refs, retain: false }) as any; evaluatePermission();
    return runStage2AtomicMutation(this.session, () => {
      this.assertStage2PersistenceRevision(persistenceRevision, "SEMANTIC_EXECUTION_AUTHORITY_UNAVAILABLE_OR_STALE");
      if (preparedExecution.compilation.effect.feedback_diagnosis_ref && this.feedbackRevisionRejected(review.subject_ref)) throw new Error("FEEDBACK_REVISION_REJECTED");
      const currentTimeline = readLatestTimeline(this.session!, projectId), currentIntent = readEditorialArtifact(this.session!, projectId, "editorial_edit_intent", review.subject_ref.object_id, review.subject_ref.object_version) as any;
      if (!currentTimeline || Number((JSON.parse(currentTimeline) as any).version) !== review.base_timeline_version || !currentIntent || currentIntent.object_hash !== review.subject_ref.digest || currentIntent.lifecycle_status !== "candidate") throw new Error("SEMANTIC_EXECUTION_AUTHORITY_UNAVAILABLE_OR_STALE");
      if (!preparedExecution.compilation.effect.feedback_diagnosis_ref) { const currentPlan = readEditorialArtifact(this.session!, projectId, "approved_story_plan_v2", preparedExecution.compilation.effect.story_ref.object_id, preparedExecution.compilation.effect.story_ref.object_version) as any; if (!currentPlan || currentPlan.object_hash !== preparedExecution.compilation.effect.story_ref.digest || currentPlan.lifecycle_status !== "approved") throw new Error("SEMANTIC_EXECUTION_AUTHORITY_UNAVAILABLE_OR_STALE"); this.assertCurrentMaterialPackReference(projectId, currentPlan.value.material_pack_ref, "SEMANTIC_EXECUTION_AUTHORITY_UNAVAILABLE_OR_STALE"); }
      const permission = this.retainStage2Gate(evaluatePermission()) as any;
      const value = { schema_version: 1, execution_id: input.execution_id, status: "committed", intent_ref: review.subject_ref, proposal_approval_ref: { object_id: preparedExecution.proposal_approval.value.decision_id, object_version: preparedExecution.proposal_approval.value.object_version, digest: preparedExecution.proposal_approval.object_hash }, execution_permission_ref: { object_id: permission.value.decision_id, object_version: permission.value.object_version, digest: permission.object_hash }, execution_approval_id: input.execution_approval_id, compiler_id: review.compiler_id, compiler_version: review.compiler_version, base_timeline_version: review.base_timeline_version, final_timeline_version: preparedExecution.prepared.timeline.version, compiled_effect_digest: review.compiled_effect_digest, source_identity_digest: review.source_identity_digest, semantic_graph_hash: review.semantic_graph_hash, preview_plan_id: preparedExecution.preview_plan_id, master_plan_id: preparedExecution.master_plan_id, commit_plan_hash: preparedExecution.prepared.plan.plan_hash, command_edit_ir_id: preparedExecution.prepared.ir.edit_ir_id, command_edit_ir_object_ref_id: `${projectId}:edit-ir:${preparedExecution.prepared.ir.edit_ir_id}`, story_ref: preparedExecution.compilation.effect.story_ref, decision_refs: preparedExecution.compilation.effect.decision_refs, evidence_refs: preparedExecution.compilation.effect.evidence_refs, contract_ref: preparedExecution.compilation.effect.contract_ref, capability_snapshot_ref: preparedExecution.compilation.effect.capability_snapshot_ref, ...(preparedExecution.compilation.effect.feedback_diagnosis_ref ? { feedback_diagnosis_ref: preparedExecution.compilation.effect.feedback_diagnosis_ref } : {}), ...(preparedExecution.compilation.effect.base_execution_ref ? { base_execution_ref: preparedExecution.compilation.effect.base_execution_ref } : {}), affected_scope: review.affected_scope, source_refs: editorialRenderSourceIdentity(preparedExecution.source_refs), reason: input.reason, created_at: new Date(this.now()).toISOString() };
      const artifact: AtomicEditArtifact = { object_ref_id: `${projectId}:intelligence-edit-execution:${input.execution_id}`, object_type: "intelligence_edit_execution", version: preparedExecution.prepared.timeline.version, relation_key: input.execution_id, value, metadata: { intent_id: input.intent_id, compiled_effect_digest: review.compiled_effect_digest, commit_plan_hash: preparedExecution.prepared.plan.plan_hash } };
      this.commitPreparedEdit(preparedExecution.prepared, null, [artifact]);
      return value;
    });
  }

  async readStoryArtifact(artifactType: "direction_card" | "story_proposal_v2" | "approved_story_plan_v2" | "decision_record" | "editorial_edit_intent", artifactId: string, objectVersion = 1): Promise<unknown> { if (!this.session) throw new Error("project is not open"); const row = await this.editorialArtifactView(readEditorialArtifact(this.session, this.session.manifest.project_id, artifactType, artifactId, objectVersion), artifactType) as any; if (!row) return null; const subject: Stage2PermissionTypedRef = { object_type: artifactType, object_id: artifactId, object_version: objectVersion, digest: row.object_hash }, fields = ["comparison_fields", "digest", "lifecycle_status", "object_id", "object_version"]; this.stage2Gate({ action: "story_artifact.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("story_artifact.query", { subject }), reason: "bounded Story artifact query", retain: false }); return this.stage2QueryProjection(row, subject, fields); }
  async listStoryArtifacts(artifactType: "direction_card" | "story_proposal_v2" | "approved_story_plan_v2" | "decision_record" | "editorial_edit_intent"): Promise<readonly unknown[]> { if (!this.session) throw new Error("project is not open"); const fields = ["comparison_fields", "digest", "lifecycle_status", "object_id", "object_version"], rows = await Promise.all(listEditorialArtifacts(this.session, this.session.manifest.project_id, artifactType).map((row: unknown) => this.editorialArtifactView(row, artifactType))) as any[]; return rows.map((row) => { const subject: Stage2PermissionTypedRef = { object_type: artifactType, object_id: row.value.direction_id ?? row.value.proposal_id ?? row.value.plan_id ?? row.value.decision_id ?? row.value.intent_id, object_version: row.value.object_version, digest: row.object_hash }; this.stage2Gate({ action: "story_artifact.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("story_artifact.query", { subject }), reason: "bounded Story artifact list query", retain: false }); return this.stage2QueryProjection(row, subject, fields); }); }

  private feedbackDiagnosisView(row: any): any {
    if (!row || !this.session) return row; const stale: string[] = [];
    try {
      assertFeedbackDiagnosisV2(row.value); validateFeedbackDiagnosisV2(row.value);
      const execution = readIntelligenceEditExecution(this.session, this.session.manifest.project_id, row.value.base_execution_ref.object_id) as any;
      if (!execution || execution.object_hash !== row.value.base_execution_ref.digest) stale.push("base_execution_changed");
      const rawTimeline = readLatestTimeline(this.session, this.session.manifest.project_id), timeline = rawTimeline ? revive(JSON.parse(rawTimeline)) as Timeline : null;
      if (!timeline || timeline.version !== row.value.base_timeline_ref.version || timelineDigest(timeline) !== row.value.base_timeline_ref.digest) stale.push("base_timeline_changed");
    } catch (error) { stale.push(`feedback_diagnosis_invalid:${error instanceof Error ? error.message : "unknown"}`); }
    return stale.length ? { ...row, lifecycle_status: "stale", stale_reasons: [...new Set(stale)].sort() } : row;
  }

  async readFeedbackDiagnosis(diagnosisId: string, objectVersion = 1): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const row = this.feedbackDiagnosisView(readFeedbackDiagnosis(this.session, this.session.manifest.project_id, diagnosisId, objectVersion)) as any; if (!row) return null;
    const subject: Stage2PermissionTypedRef = { object_type: "feedback_diagnosis", object_id: diagnosisId, object_version: objectVersion, digest: row.object_hash }, fields = ["diagnosis", "digest", "lifecycle_status", "object_id", "object_version"];
    this.stage2Gate({ action: "feedback_diagnosis.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("feedback_diagnosis.query", { subject }), reason: "bounded Feedback Diagnosis query", retain: false });
    return this.stage2QueryProjection(row, subject, fields);
  }

  async listFeedbackDiagnoses(): Promise<readonly unknown[]> {
    if (!this.session) throw new Error("project is not open"); const fields = ["diagnosis", "digest", "lifecycle_status", "object_id", "object_version"];
    return listFeedbackDiagnoses(this.session, this.session.manifest.project_id).map((raw: unknown) => this.feedbackDiagnosisView(raw)).map((row: any) => { const subject: Stage2PermissionTypedRef = { object_type: "feedback_diagnosis", object_id: row.value.diagnosis_id, object_version: row.value.object_version, digest: row.object_hash }; this.stage2Gate({ action: "feedback_diagnosis.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("feedback_diagnosis.query", { subject }), reason: "bounded Feedback Diagnosis list query", retain: false }); return this.stage2QueryProjection(row, subject, fields); });
  }

  private async stage2PermissionReferenceView(reference: Stage2PermissionTypedRef, identityCache = new Map<string, Promise<boolean>>()): Promise<any> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id; let row: any;
    if (reference.object_type === "creative_contract") { row = readCreativeContractVersion(this.session, projectId, reference.object_id, reference.object_version) as any; const head = readCreativeContractHead(this.session, projectId, reference.object_id) as any; if (!row || !head || head.object_version !== reference.object_version || head.object_hash !== reference.digest) return null; }
    else if (reference.object_type === "evidence_object") row = readEvidenceObject(this.session, reference.object_id) as any;
    else if (reference.object_type === "material_evidence_pack") row = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, reference.object_id, reference.object_version) as any, identityCache);
    else if (reference.object_type === "creative_skill_definition") { row = readCreativeSkillDefinition(this.session, projectId, reference.object_id, reference.object_version) as any; const control = readCreativeSkillDefinitionControl(this.session, projectId, reference.object_id, reference.object_version) as any; if (!control || control.availability !== "active") return null; }
    else if (reference.object_type === "skill_evaluation") row = await this.skillEvaluationView(readSkillEvaluation(this.session, projectId, reference.object_id, reference.object_version) as any, identityCache);
    else if (reference.object_type === "duration_blueprint") row = readDurationBlueprint(this.session, projectId, reference.object_id, reference.object_version) as any;
    else if (reference.object_type === "duration_feasibility") row = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, reference.object_id) as any, identityCache);
    else if (reference.object_type === "permission_decision") row = await this.stage2PermissionDecisionView(readStage2PermissionDecision(this.session, projectId, reference.object_id, reference.object_version) as any, identityCache);
    else if (reference.object_type === "feedback_diagnosis") row = this.feedbackDiagnosisView(readFeedbackDiagnosis(this.session, projectId, reference.object_id, reference.object_version) as any);
    else if (reference.object_type === "intelligence_edit_execution") { const execution = readIntelligenceEditExecution(this.session, projectId, reference.object_id) as any; row = execution && reference.object_version === 1 ? { ...execution, lifecycle_status: execution.value?.status } : null; }
    else row = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, reference.object_type, reference.object_id, reference.object_version) as any, reference.object_type, identityCache);
    const referenceDigest = reference.object_type === "creative_skill_definition" || reference.object_type === "duration_blueprint" ? row?.definition_digest : row?.object_hash;
    if (!row || referenceDigest !== reference.digest || row.lifecycle_status === "stale" || ["rejected", "superseded"].includes(row.lifecycle_status)) return null;
    return row;
  }

  private async stage2PermissionAuthority(request: Stage2PermissionRequestV1, identityCache = new Map<string, Promise<boolean>>()): Promise<Readonly<{ current_ref_keys: ReadonlySet<string>; authoritative_scope: readonly string[]; protected_refs: readonly string[]; now_ms: number }>> {
    const refs = [request.subject_ref, ...request.context_refs], rows = await Promise.all(refs.map((reference) => this.stage2PermissionReferenceView(reference, identityCache)));
    const current = new Set<string>(); rows.forEach((row, index) => { if (row) current.add(permissionRefKey(refs[index]!)); });
    const feedbackBound = request.context_refs.some((reference) => reference.object_type === "feedback_diagnosis") && request.context_refs.some((reference) => reference.object_type === "intelligence_edit_execution");
    if (feedbackBound) for (const reference of refs) {
      if (!["editorial_edit_intent", "approved_story_plan_v2", "decision_record", "capability_snapshot"].includes(reference.object_type)) continue;
      const raw = readEditorialArtifact(this.session!, this.session!.manifest.project_id, reference.object_type, reference.object_id, reference.object_version) as any;
      if (raw?.object_hash === reference.digest && !["rejected", "superseded"].includes(raw.lifecycle_status)) current.add(permissionRefKey(reference));
    }
    if (["creative_contract.approve", "creative_contract.reject"].includes(request.action) && request.subject_ref.object_type === "creative_contract") { const reviewed = readCreativeContractVersion(this.session!, this.session!.manifest.project_id, request.subject_ref.object_id, request.subject_ref.object_version) as any; if (reviewed?.object_hash === request.subject_ref.digest) current.add(permissionRefKey(request.subject_ref)); }
    if (request.action === "evidence.approve" && request.subject_ref.object_type === "evidence_object") { const reviewed = readEvidenceObject(this.session!, request.subject_ref.object_id) as any; if (reviewed?.object_hash === request.subject_ref.digest || reviewed?.value?.review?.review_digest === request.subject_ref.digest) current.add(permissionRefKey(request.subject_ref)); }
    const snapshot = createBuiltInStage2PermissionPolicySnapshot(), policyRow = snapshot.rows.find((item) => item.action === request.action), scopeIntent = rows[0]?.value ?? (feedbackBound && request.subject_ref.object_type === "editorial_edit_intent" ? (readEditorialArtifact(this.session!, this.session!.manifest.project_id, "editorial_edit_intent", request.subject_ref.object_id, request.subject_ref.object_version) as any)?.value : null);
    const semanticIntentScope: string[] | null = ["editorial_edit_intent.approve", "editorial_edit_intent.execute", "feedback_revision.reject"].includes(request.action) && Array.isArray(scopeIntent?.operations) ? [...new Set<string>(scopeIntent.operations.flatMap((operation: any): string[] => Array.isArray(operation?.target_refs) ? operation.target_refs.filter((value: unknown): value is string => typeof value === "string") : []))].sort() : null;
    const authoritativeScope = semanticIntentScope ?? (policyRow?.affected_scope_mode === "none" ? [] : policyRow?.affected_scope_mode === "exact_subject" ? [permissionRefKey(request.subject_ref)] : refs.map(permissionRefKey).sort());
    let contract: any = rows.find((row, index) => refs[index]?.object_type === "creative_contract")?.value;
    if (!contract) {
      const contractRef = rows.map((row) => row?.value?.contract_ref ?? (row?.value?.decision_type ? row.value.subject_ref : null)).find(Boolean);
      if (contractRef) contract = (readCreativeContractVersion(this.session!, this.session!.manifest.project_id, contractRef.object_id, contractRef.object_version) as any)?.value;
    }
    const protectedRefs = Array.isArray(contract?.protected_refs) ? contract.protected_refs.filter((value: unknown): value is string => typeof value === "string") : [];
    return { current_ref_keys: current, authoritative_scope: authoritativeScope, protected_refs: protectedRefs, now_ms: this.now() };
  }

  private async stage2PermissionDecisionView(row: any, identityCache = new Map<string, Promise<boolean>>()): Promise<any> {
    if (!row || !this.session) return row; const value = row.value as Stage2PermissionDecisionV1, stale: string[] = [];
    try {
      assertStage2PermissionDecisionV1(value);
      const snapshot = readStage2PermissionPolicySnapshot(this.session, this.session.manifest.project_id, value.policy_snapshot_ref.object_id, value.policy_snapshot_ref.object_version) as any, builtIn = createBuiltInStage2PermissionPolicySnapshot();
      if (!snapshot || snapshot.object_hash !== value.policy_snapshot_ref.digest || snapshot.value?.policy_version !== STAGE2_PERMISSION_POLICY_VERSION || editorialObjectDigest(snapshot.value) !== editorialObjectDigest(builtIn)) stale.push("permission_policy_changed");
      const request: Stage2PermissionRequestV1 = { schema_version: 1, request_id: value.decision_id.replace(/^permission:/, ""), actor: value.actor, action: value.action, subject_ref: value.subject_ref, context_refs: value.context_refs, policy_snapshot_ref: value.policy_snapshot_ref, effect_digest: value.effect_digest, requested_data_fields: value.allowed_data_fields, affected_scope: value.affected_scope, reason: value.request_reason, requested_at: value.created_at, ...(value.approval ? { approval: value.approval } : {}) };
      const evaluation = evaluateStage2Permission(request, builtIn, await this.stage2PermissionAuthority(request, identityCache));
      if (evaluation.classification !== value.classification || evaluation.reason_code !== value.reason_code) stale.push(`permission_reclassified:${evaluation.reason_code}`);
      if (value.approval && this.now() > Date.parse(value.approval.expires_at)) stale.push("approval_expired");
    } catch (error) { stale.push(`permission_invalid:${error instanceof Error ? error.message : "unknown"}`); }
    return stale.length ? { ...row, lifecycle_status: "stale", stale_reasons: [...new Set(stale)].sort() } : row;
  }

  async registerStage2HumanApproval(channelCredential: object, input: Stage2HumanApprovalDraft): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["action", "affected_scope", "approval_id", "context_refs", "effect_digest", "expires_at", "reason", "requested_data_fields", "subject_ref"], "human_approval");
    const actorId = this.stage2HumanReviewChannels.get(channelCredential); if (!actorId) throw new Error("PERMISSION_HUMAN_CHANNEL_UNTRUSTED");
    const snapshot = createBuiltInStage2PermissionPolicySnapshot(), policyRef = { object_id: snapshot.snapshot_id, object_version: snapshot.object_version, digest: editorialObjectDigest(snapshot) }, nowMs = this.now(), approvedAt = new Date(nowMs).toISOString();
    if (!Number.isFinite(Date.parse(input.expires_at)) || Date.parse(input.expires_at) <= nowMs) throw new Error("PERMISSION_APPROVAL_EXPIRY_INVALID");
    const request: Stage2PermissionRequestV1 = { schema_version: 1, request_id: `approval-${input.approval_id}`, actor: { actor_id: actorId, actor_kind: "human_user" }, action: input.action, subject_ref: { ...input.subject_ref }, context_refs: input.context_refs.map((reference) => ({ ...reference })), policy_snapshot_ref: policyRef, effect_digest: input.effect_digest, requested_data_fields: [...input.requested_data_fields], affected_scope: [...input.affected_scope], reason: input.reason, requested_at: approvedAt };
    assertStage2PermissionRequestV1(request);
    const persistenceRevision = this.stage2PersistenceRevision(), authority = await this.stage2PermissionAuthority(request);
    this.assertStage2PersistenceRevision(persistenceRevision, "PERMISSION_APPROVAL_TARGET_STALE");
    const assertApprovalTarget = (candidateAuthority: Readonly<{ current_ref_keys: ReadonlySet<string>; authoritative_scope: readonly string[]; protected_refs: readonly string[]; now_ms: number }>): void => {
      const evaluation = evaluateStage2Permission(request, snapshot, candidateAuthority);
      if (evaluation.classification !== "exact_human_approval_required") { const missing = [request.subject_ref, ...request.context_refs].filter((reference) => !candidateAuthority.current_ref_keys.has(permissionRefKey(reference))).map((reference) => `${reference.object_type}:${reference.object_id}`).join(","); throw new Error(`PERMISSION_APPROVAL_TARGET_INVALID:${evaluation.reason_code}${missing ? `:${missing}` : ""}`); }
    };
    assertApprovalTarget(authority);
    const approval = { approval_id: input.approval_id, action: input.action, actor_id: actorId, actor_kind: "human_user" as const, request_fingerprint: permissionRequestFingerprint(request), subject_ref: { ...input.subject_ref }, context_refs: input.context_refs.map((reference) => ({ ...reference })), policy_snapshot_ref: policyRef, effect_digest: input.effect_digest, affected_scope: [...input.affected_scope].sort(), review_digest: input.effect_digest, approved_at: approvedAt, expires_at: input.expires_at };
    return runStage2AtomicMutation(this.session, () => {
      this.assertStage2PersistenceRevision(persistenceRevision, "PERMISSION_APPROVAL_TARGET_STALE");
      const commitNow = this.now();
      if (Date.parse(input.expires_at) <= commitNow) throw new Error("PERMISSION_APPROVAL_EXPIRY_INVALID");
      for (const reference of [request.subject_ref, ...request.context_refs]) if (reference.object_type === "material_evidence_pack") this.assertCurrentMaterialPackReference(this.session!.manifest.project_id, reference, "PERMISSION_APPROVAL_TARGET_STALE");
      assertApprovalTarget({ ...authority, now_ms: commitNow });
      return registerStage2HumanApproval(this.session!, this.session!.manifest.project_id, approval);
    });
  }

  private stage2Gate(input: Readonly<{ action: Stage2PermissionRequestV1["action"]; subject_ref: Stage2PermissionTypedRef; context_refs?: readonly Stage2PermissionTypedRef[]; requested_data_fields: readonly string[]; affected_scope: readonly string[]; effect_digest: string; reason: string; approval_id?: string; current_ref_keys?: ReadonlySet<string>; protected_refs?: readonly string[]; retain?: boolean }>): unknown {
    if (!this.session) throw new Error("project is not open");
    const snapshot = createBuiltInStage2PermissionPolicySnapshot(), policyRef = { object_id: snapshot.snapshot_id, object_version: snapshot.object_version, digest: editorialObjectDigest(snapshot) }, contextRefs = input.context_refs ?? [], now = new Date(this.now()).toISOString();
    const storedApproval = input.approval_id ? readStage2HumanApproval(this.session, this.session.manifest.project_id, input.approval_id) as any : null;
    if (input.approval_id && (!storedApproval || storedApproval.action !== input.action)) throw new Error("PERMISSION_APPROVAL_RECORD_UNAVAILABLE");
    const approval = storedApproval ? (({ action: _action, ...value }: any) => value)(storedApproval) : undefined;
    const actor = approval ? { actor_id: approval.actor_id, actor_kind: "human_user" as const } : { actor_id: "project-host", actor_kind: "project_host" as const };
    const queryActions = new Set<Stage2PermissionRequestV1["action"]>(["creative_context.query", "creative_skill_knowledge.query", "duration_knowledge.query", "story_artifact.query", "feedback_diagnosis.query", "permission_decision.query"]), requestedDataFields = queryActions.has(input.action) && !input.requested_data_fields.includes("stale_reasons") ? [...input.requested_data_fields, "stale_reasons"] : [...input.requested_data_fields];
    const request: Stage2PermissionRequestV1 = { schema_version: 1, request_id: `gate-${input.action}-${input.effect_digest.slice(0, 24)}${approval ? `-${approval.approval_id}` : ""}`, actor, action: input.action, subject_ref: { ...input.subject_ref }, context_refs: contextRefs.map((reference) => ({ ...reference })), policy_snapshot_ref: policyRef, effect_digest: input.effect_digest, requested_data_fields: requestedDataFields, affected_scope: [...input.affected_scope], reason: input.reason, requested_at: now, ...(approval ? { approval } : {}) };
    assertStage2PermissionRequestV1(request); const currentRefKeys = input.current_ref_keys ?? new Set([input.subject_ref, ...contextRefs].map(permissionRefKey));
    const evaluation = evaluateStage2Permission(request, snapshot, { current_ref_keys: currentRefKeys, authoritative_scope: input.affected_scope, protected_refs: input.protected_refs ?? [], now_ms: this.now() });
    if (!["allowed_autonomous", "exact_human_approved"].includes(evaluation.classification)) throw new Error(`PERMISSION_DENIED:${evaluation.reason_code}`);
    if (input.retain === false) return { evaluation, request, snapshot };
    const fingerprint = permissionRequestFingerprint(request), existing = readStage2PermissionDecisionByInput(this.session, this.session.manifest.project_id, fingerprint); if (existing) return existing;
    const decision = createStage2PermissionDecision(request, snapshot, evaluation); assertStage2PermissionDecisionV1(decision);
    return registerStage2PermissionAuthorization(this.session, this.session.manifest.project_id, snapshot, decision);
  }

  private retainStage2Gate(gate: any): unknown {
    if (!this.session || !gate?.request || !gate?.snapshot || !gate?.evaluation) throw new Error("PERMISSION_GATE_RESULT_INVALID");
    const fingerprint = permissionRequestFingerprint(gate.request), existing = readStage2PermissionDecisionByInput(this.session, this.session.manifest.project_id, fingerprint); if (existing) return existing;
    const decision = createStage2PermissionDecision(gate.request, gate.snapshot, gate.evaluation); assertStage2PermissionDecisionV1(decision);
    return registerStage2PermissionAuthorization(this.session, this.session.manifest.project_id, gate.snapshot, decision);
  }

  private stage2PersistenceRevision(): string {
    if (!this.session) throw new Error("project is not open");
    const own = this.session.db.prepare("SELECT total_changes() AS value").get() as any;
    const external = this.session.db.prepare("PRAGMA data_version").get() as any;
    if (!Number.isSafeInteger(own?.value) || !Number.isSafeInteger(external?.data_version)) throw new Error("STAGE2_PERSISTENCE_REVISION_UNAVAILABLE");
    return `${own.value}:${external.data_version}`;
  }

  private assertStage2PersistenceRevision(expected: string, errorMessage: string): void {
    if (this.stage2PersistenceRevision() !== expected) throw new Error(errorMessage);
  }

  private commitStage2Mutation<Result>(gate: any, mutation: () => Result, order: "permission_first" | "business_first" = "permission_first"): Result {
    if (!this.session) throw new Error("project is not open");
    return runStage2AtomicMutation(this.session, () => {
      if (order === "permission_first") this.retainStage2Gate(gate);
      const result = mutation();
      if (order === "business_first") this.retainStage2Gate(gate);
      return result;
    }) as Result;
  }

  async readStage2PermissionDecision(decisionId: string): Promise<unknown> { if (!this.session) throw new Error("project is not open"); const row = await this.stage2PermissionDecisionView(readStage2PermissionDecision(this.session, this.session.manifest.project_id, decisionId)) as any; if (!row) return null; const subject: Stage2PermissionTypedRef = { object_type: "permission_decision", object_id: row.value.decision_id, object_version: row.value.object_version, digest: row.object_hash }, fields = ["action", "classification", "digest", "failure_result", "lifecycle_status", "object_id", "object_version", "reason_code", "scope"]; this.stage2Gate({ action: "permission_decision.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("permission_decision.query", { subject }), reason: "bounded Permission Decision query", retain: false }); return this.stage2QueryProjection(row, subject, fields); }
  async listStage2PermissionDecisions(): Promise<readonly unknown[]> { if (!this.session) throw new Error("project is not open"); const fields = ["action", "classification", "digest", "failure_result", "lifecycle_status", "object_id", "object_version", "reason_code", "scope"], rows = await Promise.all(listStage2PermissionDecisions(this.session, this.session.manifest.project_id).map((row: unknown) => this.stage2PermissionDecisionView(row))) as any[]; return rows.map((row) => { const subject: Stage2PermissionTypedRef = { object_type: "permission_decision", object_id: row.value.decision_id, object_version: row.value.object_version, digest: row.object_hash }; this.stage2Gate({ action: "permission_decision.query", subject_ref: subject, requested_data_fields: fields, affected_scope: [], effect_digest: stage2PermissionEffectDigest("permission_decision.query", { subject }), reason: "bounded Permission Decision list query", retain: false }); return this.stage2QueryProjection(row, subject, fields); }); }

  async registerAssemblyCutV2(cut: AssemblyCutV2): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    if (!cut || cut.schema_version !== 2 || !cut.approved_story_ref?.object_id || !Number.isInteger(cut.approved_story_ref.object_version) || !/^[0-9a-f]{64}$/.test(cut.approved_story_ref.digest) || !Array.isArray(cut.clips)) throw new Error("ASSEMBLY_CUT_V2_INVALID");
    const projectId = this.session.manifest.project_id, planRow = readEditorialArtifact(this.session, projectId, "approved_story_plan_v2", cut.approved_story_ref.object_id, cut.approved_story_ref.object_version) as any;
    if (!planRow || planRow.object_hash !== cut.approved_story_ref.digest || planRow.lifecycle_status !== "approved") throw new Error("ASSEMBLY_STORY_UNAVAILABLE_OR_STALE");
    assertApprovedStoryPlanV2(planRow.value);
    const evidence: ApprovedAssemblyEvidence[] = cut.clips.map((clip) => {
      const row = readEvidenceObject(this.session!, clip.evidence_ref.object_id) as any;
      if (!row || row.object_hash !== clip.evidence_ref.digest || Number(row.value?.evidence_version ?? 1) !== clip.evidence_ref.object_version || row.value?.review_status !== "approved") throw new Error("ASSEMBLY_EVIDENCE_UNAVAILABLE_OR_STALE");
      return { evidence_id: row.value.evidence_id, evidence_version: Number(row.value.evidence_version ?? 1), object_hash: row.object_hash, asset_id: row.value.asset_id, start: { schema_version: 1, value: Number(row.value.start_pts), timescale: Number(row.value.timescale) }, end: { schema_version: 1, value: Number(row.value.end_pts), timescale: Number(row.value.timescale) }, review_status: "approved" };
    });
    const validated = validateAssemblyCutV2({ cut, plan: planRow.value, plan_digest: planRow.object_hash, evidence });
    const objectRefId = `${projectId}:assembly-cut-v2:${validated.assembly_id}:v${validated.object_version}`, storageSession = this.session as any;
    const existing = storageSession.db.prepare("SELECT object_hash FROM object_refs WHERE project_id = ? AND object_ref_id = ?").get(projectId, objectRefId) as { object_hash?: string } | undefined;
    const payload = Buffer.from(canonicalEditorialObject(validated));
    if (existing?.object_hash) { const value = JSON.parse(readObjectSync(this.projectDirectory!, existing.object_hash).toString("utf8")); if (canonicalEditorialObject(value) !== canonicalEditorialObject(validated)) throw new Error("ASSEMBLY_CUT_VERSION_CONFLICT"); return { object_hash: existing.object_hash, lifecycle_status: "validated", value }; }
    const object = await putObjectAndRegister(this.session, projectId, payload, { object_ref_id: objectRefId, object_type: "assembly_cut_v2", version: validated.object_version, relation_key: validated.assembly_id, metadata: { approved_story_ref: validated.approved_story_ref } });
    return { object_hash: object.hash, lifecycle_status: "validated", value: validated };
  }

  readAssemblyCutV2(assemblyId: string, objectVersion = 1): unknown {
    if (!this.session) throw new Error("project is not open");
    const projectId = this.session.manifest.project_id, storageSession = this.session as any, row = storageSession.db.prepare("SELECT object_hash FROM object_refs WHERE project_id = ? AND object_type = 'assembly_cut_v2' AND relation_key = ? AND version = ?").get(projectId, assemblyId, objectVersion) as { object_hash?: string } | undefined;
    return row?.object_hash ? { object_hash: row.object_hash, lifecycle_status: "validated", value: JSON.parse(readObjectSync(this.projectDirectory!, row.object_hash).toString("utf8")) } : null;
  }

  executeAssemblyCutV2(input: Readonly<{ assembly_id: string; object_version: number; assembly_digest: string; output_track_id: string; base_timeline_version: number }>): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    const projectId = this.session.manifest.project_id, cutRow = this.readAssemblyCutV2(input.assembly_id, input.object_version) as any;
    if (!cutRow || cutRow.object_hash !== input.assembly_digest || cutRow.lifecycle_status !== "validated") throw new Error("ASSEMBLY_CUT_UNAVAILABLE_OR_STALE");
    const cut = cutRow.value as AssemblyCutV2, planRow = readEditorialArtifact(this.session, projectId, "approved_story_plan_v2", cut.approved_story_ref.object_id, cut.approved_story_ref.object_version) as any;
    if (!planRow || planRow.object_hash !== cut.approved_story_ref.digest || planRow.lifecycle_status !== "approved") throw new Error("ASSEMBLY_STORY_UNAVAILABLE_OR_STALE");
    assertApprovedStoryPlanV2(planRow.value);
    const raw = readLatestTimeline(this.session, projectId); if (!raw) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(raw)) as Timeline;
    if (timeline.version !== input.base_timeline_version) {
      const editRefId = `${projectId}:edit-ir:assembly:${cut.assembly_id}:v${cut.object_version}`, storageSession = this.session as any;
      const existing = storageSession.db.prepare("SELECT object_hash FROM object_refs WHERE project_id = ? AND object_ref_id = ? AND object_type = 'edit_ir'").get(projectId, editRefId) as { object_hash?: string } | undefined;
      if (timeline.version === input.base_timeline_version + 1 && existing?.object_hash) { const ir = revive(JSON.parse(readObjectSync(this.projectDirectory!, existing.object_hash).toString("utf8"))) as CommandEditIR; if (ir.schema_version === 2 && ir.base_version === input.base_timeline_version && ir.actor.producer === "assembly" && ir.provenance.correlation_id === input.assembly_digest && ir.commands.length > 0 && ir.commands.every((command) => command.type === "add_clip" && command.track_id === input.output_track_id)) return this.currentStatus; }
      throw new Error(`EDIT_VERSION_CONFLICT:${input.base_timeline_version}:${timeline.version}`);
    }
    const intent = compileAssemblyCutToCommandEditIntent({ cut, cut_digest: cutRow.object_hash, plan: planRow.value, plan_digest: planRow.object_hash, timeline, output_track_id: input.output_track_id });
    return this.commitPreparedEdit(this.prepareEdit(intent, timeline));
  }

  applyRoughCutPatch(patch: any, trackId: string): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    const raw = readLatestTimeline(this.session, this.session.manifest.project_id); if (!raw) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(raw)) as Timeline; const track = timeline.tracks.find((candidate) => candidate.track_id === trackId); if (!track) throw new Error("track not found");
    validateRoughCutPatch(patch, timeline.version, new Set(track.clips.map((clip) => clip.clip_id)));
    if (patch.operations.some((operation: any) => operation.operation === "j_cut" || operation.operation === "l_cut")) throw new Error("J/L cut audio routing is not available");
    const commands: TimelineCommand[] = []; let working = timeline;
    for (const operation of patch.operations) {
      let command: TimelineCommand;
      if (operation.operation === "remove") command = { type: "remove_clip", track_id: trackId, clip_id: operation.clip_id };
      else { const currentTrack = working.tracks.find((candidate) => candidate.track_id === trackId)!; const clip = currentTrack.clips.find((candidate) => candidate.clip_id === operation.clip_id)!; command = { type: "trim_source", track_id: trackId, clip_id: operation.clip_id, source: sourceRange(clip.source.asset_id, operation.source_start_pts, operation.source_end_pts, clip.source.timescale) }; }
      commands.push(command); working = applyCommand(working, command);
    }
    return this.commitCommands(timeline, commands, { semantic_refs: [patch.patch_id], producer: "rough-cut", actor_id: patch.patch_id, provenance_id: patch.patch_id, reason: "apply validated Rough Cut patch", expected_effects: ["rough cut commands applied through Edit IR"] });
  }

  registerCompare(result: any): void { if (!this.session) throw new Error("project is not open"); validateCompare(result); registerReviewArtifact(this.session, this.session.manifest.project_id, { artifact_id: result.compare_id, artifact_type: "compare", value: result }); }
  readReviewArtifact(artifactId: string): unknown { if (!this.session) throw new Error("project is not open"); return readReviewArtifact(this.session, artifactId); }
  registerReactionTiming(reaction: any): void { if (!this.session) throw new Error("project is not open"); const compareArtifact = readReviewArtifact(this.session, reaction.compare_id); if (!compareArtifact || compareArtifact.artifact_type !== "compare") throw new Error("reaction compare not found"); validateReactionTiming(reaction, compareArtifact.value); registerReactionTiming(this.session, this.session.manifest.project_id, reaction); }
  readReactionTiming(reactionId: string): unknown { if (!this.session) throw new Error("project is not open"); return readReactionTiming(this.session, reactionId); }
  registerPrivacy(entry: any): void { if (!this.session) throw new Error("project is not open"); const approved = approvePrivacy(entry); registerDeliveryRecord(this.session, this.session.manifest.project_id, { record_id: approved.entry_id, record_type: "privacy", value: approved }); }
  registerRights(entry: any): void { if (!this.session) throw new Error("project is not open"); const approved = approveRights(entry); registerDeliveryRecord(this.session, this.session.manifest.project_id, { record_id: approved.entry_id, record_type: "rights", value: approved }); }
  registerDelivery(manifest: any): void { if (!this.session) throw new Error("project is not open"); const ready = validateDelivery(manifest); registerDeliveryRecord(this.session, this.session.manifest.project_id, { record_id: ready.delivery_id, record_type: "delivery", value: ready }); }
  readDeliveryRecord(recordId: string): unknown { if (!this.session) throw new Error("project is not open"); return readDeliveryRecord(this.session, recordId); }
  validateExportProfile(capabilityId: string, profile: any): void { const capability = exportCapabilities[capabilityId]; if (!capability) throw new Error("export capability not found"); validateExportProfile(profile, capability); }
  async registerExportFile(deliveryId: string, qcReportId: string, exportId: string, filePath: string, mediaType = "video/mp4"): Promise<unknown> { if (!this.session) throw new Error("project is not open"); const deliveryRecord = readDeliveryRecord(this.session, deliveryId); if (!deliveryRecord || deliveryRecord.record_type !== "delivery") throw new Error("delivery not found"); const bytes = await readFile(filePath); const sha256 = createHash("sha256").update(bytes).digest("hex"); const registration = { schema_version: 1, export_id: exportId, delivery_id: deliveryId, path: filePath, sha256, media_type: mediaType, qc_report_id: qcReportId }; validateExportRegistration(registration as any, deliveryRecord.value, qcReportId); await registerExport(this.session, this.session.manifest.project_id, registration); return readExport(this.session, exportId); }

}
