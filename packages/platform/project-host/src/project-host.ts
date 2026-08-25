import { createProject, openProject, commitTimeline, commitTimelinePlan, readLatestTimeline, readTimelineAtVersion, readLatestTimelineCommand, readTimelineRedo, readPresetApplication, listPresetApplications, registerPresetApplicationBlocker, registerRender, readLatestRender, registerRenderBundle, listRenderResults, registerAssetLocation, setAssetLocationPermission, listAssetLocations, listAssetLocationsForAssets, registerMediaAsset, registerMediaRelation, registerMediaDependency as persistMediaDependency, markMediaDependenciesStale, listMediaDependencies, registerEvidence, readEvidence, listApprovedStoryPlans, readApprovedStoryPlan, registerApprovedStoryPlan, registerAssemblyCut, readAssemblyCut, listReviewArtifacts, readReviewArtifact, registerReviewArtifact, listRenderManifests, registerReactionTiming, readReactionTiming, listDeliveryRecords, registerDeliveryRecord, readDeliveryRecord, registerExport, listExports, readExport, putObjectAndRegister, registerModelRun, listModelRuns, createPersistentJob, readPersistentJob, readPersistentJobByIdempotency, listPersistentJobs, startPersistentJob, updatePersistentJobProgress, finishPersistentJob, recoverPersistentJobs } from "../../project-storage/src/public.js";
import { applyCommand, assertValidTimeline, inverseCommand, commitPlanPayload, createCommitPlan, simulateCommands } from "../../../core/timeline-core/src/public.js";
import { validateAssemblyCut, compileAssemblyToEditIR } from "../../../features/assembly-cut/src/public.js";
import { validateStoryProposal } from "../../../features/story-planning/src/public.js";
import { validateRoughCutPatch } from "../../../features/rough-cut/src/public.js";
import { validateDelivery, approveRights, validateExportRegistration, validateExportProfile, exportCapabilities } from "../../../features/delivery/src/public.js";
import { approvePrivacy } from "../../../features/privacy/src/public.js";
import { createFeedbackRevisionIntent, diagnoseFeedbackRevision, reviewFeedback, validateCompare, validateFeedbackDiagnosisV2, validateReactionTiming, type FeedbackRevisionDiagnosisInput } from "../../../features/feedback/src/public.js";
import { assetIdFromFingerprint, sourceRange, type AssetId, type ContentFingerprint } from "../../../core/media-identity/src/public.js";
import { createHash, randomUUID } from "node:crypto";
import { statSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import type { Timeline, TimelineCommand, Track } from "../../../core/timeline-core/src/public.js";
import { renderPreviewMaster, qcMaster } from "../../render-service/src/public.js";
import { resolve } from "node:path";
import { JobEngine, hashJobInput, type JobStore } from "../../job-engine/src/public.js";
import { createLocalWorkerJobPort, type WorkerJobPort } from "../../worker-client/src/public.js";
import { buildTimelineRenderGraph, canonicalSerialize, renderGraphPayload, resolveExecutionPlan, semanticGraphPayload, timelineRenderCapabilities, validateGraph, type ExecutionPlan, type RenderProfile, type RenderRange, type RenderSourceRef } from "../../../core/render-graph/src/public.js";
import { runModel, type ModelProvider } from "../../model-gateway/src/public.js";
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
import { compileApprovedEditorialIntent, compileFeedbackRevision, resolveCommandEditIntent, SEMANTIC_INTENT_COMPILER_ID, SEMANTIC_INTENT_COMPILER_VERSION, type ApprovedSemanticEvidence, type CommandEditIntent, type CommandEditIR, type EditPrecondition, type EditProducer, type SemanticIntentCompilation } from "../../../core/edit-ir/src/public.js";
import { divideRounded, rationalTime } from "../../../core/timebase/src/public.js";
import { readCreativeContractVersion, readCreativeContractHead, listCreativeContractVersions, registerCreativeContractVersion, registerCreativeContractDecision, readCreativeContractDecision, readEvidenceObject, readMediaAsset, registerMaterialEvidencePack, readMaterialEvidencePack, readMaterialEvidencePackByInput, listMaterialEvidencePacks, readStage2WorkspaceSnapshot, registerCreativeSkillDefinition, readCreativeSkillDefinition, listCreativeSkillDefinitions, readCreativeSkillDefinitionControl, setCreativeSkillDefinitionAvailability, registerSkillEvaluation, readSkillEvaluation, readSkillEvaluationByInput, listSkillEvaluations, registerDurationBlueprint, readDurationBlueprint, listDurationBlueprints, registerDurationFeasibility, readDurationFeasibility, readDurationFeasibilityByInput, listDurationFeasibilities, registerEditorialArtifact, registerEditorialArtifactBatch, readEditorialArtifact, readEditorialArtifactByInput, listEditorialArtifacts, readCoverageMatrix, readStage2PermissionPolicySnapshot, readStage2PermissionDecision, readStage2PermissionDecisionByInput, listStage2PermissionDecisions, registerStage2PermissionAuthorization, registerStage2HumanApproval, readStage2HumanApproval, runStage2AtomicMutation, readIntelligenceEditExecution, registerFeedbackDiagnosis, readFeedbackDiagnosis, readFeedbackDiagnosisByInput, listFeedbackDiagnoses } from "../../project-storage/src/public.js";
import { CREATIVE_SKILL_EVALUATOR_VERSION, CREATIVE_SKILL_POLICY_VERSION, DURATION_ALLOCATOR_VERSION, DURATION_POLICY_VERSION, STORY_APPROVAL_VERSION, STORY_EVALUATOR_VERSION, STORY_POLICY_VERSION, approveStoryProposalV2, builtInCreativeSkillDefinitions, builtInDurationBlueprints, canonicalEditorialObject, createDirectionCard, editorialObjectDigest, evaluateCreativeSkill, evaluateDurationFeasibility, evaluateStoryProposal, selectDirectionCard, validateCreativeSkillDefinition, validateDurationBlueprint, validateDurationFeasibilityInput, validateSkillEvaluationInput, type CoverageMatrix, type CreativeContract, type CreativeContractV2, type DirectionCardInput, type DirectionSelectionInput, type DurationFeasibilityInput, type MaterialEvidencePackV1, type SkillEvaluationInput, type StoryApprovalInput, type StoryProposalInput } from "../../../core/editorial-core/src/public.js";
import { canonicalCreativeContext, upgradeCreativeContractV1, validateCreativeContractV2, validateMaterialEvidencePack } from "./creative-context.js";
import { assertApprovedStoryPlanV2, assertCreativeContractV1, assertCreativeContractV2, assertDecisionRecordV1, assertDirectionCardV1, assertEditorialEditIntentV1, assertFeedbackDiagnosisV2, assertMaterialEvidencePackV1, assertCreativeSkillDefinitionV1, assertSkillEvaluationV1, assertStoryProposalV2, assertDurationBlueprintV1, assertDurationFeasibilityV1, assertStage2PermissionRequestV1, assertStage2PermissionPolicySnapshotV1, assertStage2PermissionDecisionV1 } from "../../contract-runtime/src/public.js";
import { EDITORIAL_INTENT_GENERATOR_VERSION, EDITORIAL_INTENT_POLICY_VERSION, generateEditorialEditIntent, type EditorialEditIntentInput } from "../../../features/edit-intent-generation/src/public.js";
import { createBuiltInStage2PermissionPolicySnapshot, createStage2PermissionDecision, evaluateStage2Permission, permissionRefKey, permissionRequestFingerprint, stage2PermissionEffectDigest, STAGE2_PERMISSION_POLICY_VERSION, type Stage2PermissionDecisionV1, type Stage2PermissionRequestV1, type Stage2PermissionTypedRef } from "../../../features/permission-enforcement/src/public.js";
import { approveEvidence } from "../../project-storage/src/public.js";

export type ProjectHostStatus = Readonly<{ project: string; timeline: string; render: string; qc: string }>;
export type QcRequirements = Readonly<{ loudness?: Readonly<{ target_lufs: number; tolerance_lufs?: number; true_peak_db?: number }>; planned_freeze?: boolean; planned_silence?: boolean; subtitle_bounds?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; missing_effects?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; sponsor?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; privacy?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }> }>;
export function renderBundleIdentity(previewCacheKey: string, masterCacheKey: string, qcRequirements: QcRequirements = {}, provenanceKey?: string): string { return createHash("sha256").update(canonicalSerialize({ preview_cache_key: previewCacheKey, master_cache_key: masterCacheKey, qc_requirements: qcRequirements, ...(provenanceKey ? { provenance_key: provenanceKey } : {}) })).digest("hex"); }
export type TimelineRenderOptions = Readonly<{ sources: readonly RenderSourceRef[]; outputDirectory?: string; profile?: RenderProfile; range?: RenderRange; qcRequirements?: QcRequirements; executionBinding?: Readonly<{ timeline_version: number; semantic_graph_hash: string; preview_plan_id: string; master_plan_id: string; source_identity_digest: string }> }>;
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
export type FeedbackRevisionHostInput = Omit<FeedbackRevisionDiagnosisInput, "base_execution_ref" | "base_timeline_ref" | "authority_refs" | "target" | "created_at"> & Readonly<{ intent_id: string; base_execution_id: string; target: Readonly<{ track_id: string; clip_id: string; proposed_source: FeedbackRevisionDiagnosisInput["target"]["proposed_source"] }>; created_at?: string }>;
export type FeedbackRevisionPreview = Readonly<{ diagnosis_ref: Readonly<{ object_id: string; object_version: number; digest: string }>; intent_ref: Readonly<{ object_id: string; object_version: number; digest: string }>; base_execution_ref: Readonly<{ object_id: string; object_version: number; digest: string }>; base_timeline_version: number; expected_final_timeline_version: number; affected_scope: readonly string[]; effect: SemanticIntentCompilation["effect"]; compiled_effect_digest: string }>;
export type Stage2ProductActionInput =
  | Readonly<{ action: "direction.select"; workspace_digest: string; reason: string; selected_id: string }>
  | Readonly<{ action: "story.approve"; workspace_digest: string; reason: string; selected_id: string }>
  | Readonly<{ action: "intent.approve"; workspace_digest: string; reason: string; intent_id: string }>
  | Readonly<{ action: "feedback.reject"; workspace_digest: string; reason: string; intent_id: string }>
  | Readonly<{ action: "intent.execute"; workspace_digest: string; reason: string; intent_id: string; proposal_approval_decision_id: string }>;

const STAGE2_PRODUCT_ACTION_KEYS = Object.freeze({
  "direction.select": ["action", "reason", "selected_id", "workspace_digest"],
  "story.approve": ["action", "reason", "selected_id", "workspace_digest"],
  "intent.approve": ["action", "intent_id", "reason", "workspace_digest"],
  "feedback.reject": ["action", "intent_id", "reason", "workspace_digest"],
  "intent.execute": ["action", "intent_id", "proposal_approval_decision_id", "reason", "workspace_digest"]
} satisfies Record<Stage2ProductActionInput["action"], readonly string[]>);

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
  return "selected_id" in input ? input.selected_id : input.intent_id;
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
  }>;
}>;
const IDEMPOTENT_WORKER_TASKS = new Set(["analysis.v1", "media.probe.v1", "media.decode_check.v1", "media.fingerprint.v1", "media.proxy.v1", "media.proxy.map.v1", "media.thumbnail.v1", "media.waveform.v1", "render.preview.v1", "render.master.v1", "render.timeline.v1", "qc.master.v1"]);
const CREATIVE_CONTEXT_IDENTITY_CONCURRENCY = 2;
const HOST_SEMANTIC_CAPABILITIES = new Set(["semantic-evidence-selection"]);

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

  private async submitWorkerJob<TInput, TResult>(taskType: string, input: TInput, control?: { jobId?: string; signal?: AbortSignal; timeoutMs?: number; onProgress?: (value: number) => void }): Promise<TResult> {
    const idempotent = IDEMPOTENT_WORKER_TASKS.has(taskType);
    if (!this.jobEngine) return this.workerPort.submit<TInput, TResult>(taskType, input, { ...control, idempotent });
    const idempotencyKey = `${taskType}:${hashJobInput(input)}`;
    const execution = await this.jobEngine.execute(taskType, input, idempotencyKey, ({ job_id, signal, progress }) => this.workerPort.submit<TInput, any>(taskType, input, { ...control, jobId: job_id, signal, onProgress: progress, idempotent }) as any, { jobId: control?.jobId, signal: control?.signal, idempotent });
    if (execution.result?.status && execution.result.status !== "succeeded") { const diagnostic = execution.result.diagnostics?.[0]; throw new Error(`${diagnostic?.code ?? "WORKER_JOB_FAILED"}:${diagnostic?.message ?? execution.result.status}`); }
    return execution.result as TResult;
  }

  async open(projectDirectory: string): Promise<ProjectHostStatus> {
    if (this.session) await this.close();
    const session = await openProject(projectDirectory);
    this.session = session;
    this.projectDirectory = projectDirectory;
    this.configureJobEngine(session);
    const latest = readLatestTimeline(session, session.manifest.project_id);
    const version = latest ? (JSON.parse(latest) as { version?: number }).version : undefined;
    const latestRender = readLatestRender(session, session.manifest.project_id) as { qc_status?: string } | undefined;
    this.currentStatus = { project: session.manifest.project_id, timeline: version === undefined ? "no-version" : `v${version}`, render: latestRender ? "available" : "idle", qc: latestRender?.qc_status ?? "not-run" };
    return this.currentStatus;
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
    if (!this.session) return;
    await this.workerPort.close?.();
    await this.session.close();
    this.session = undefined;
    this.projectDirectory = undefined;
    this.jobEngine = undefined;
    this.currentStatus = { project: "not-open", timeline: "no-version", render: "idle", qc: "not-run" };
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
    const bytes = await readFile(latest.preview_path);
    const after = await this.readStage2Workspace() as any;
    if (after.workspace_digest !== workspaceDigest || after.review?.render?.binding_status !== "current" || after.review.render.render_id !== latest.render_id) throw new Error("PRODUCT_WORKSPACE_STALE");
    return { mime: "video/mp4", bytes: Uint8Array.from(bytes), workspace_digest: workspaceDigest, render_id: latest.render_id, timeline_version: Number(after.review.render.timeline_version), execution_id: after.review.render.bound_execution_id };
  }

  listJobs(): readonly unknown[] { return this.session ? listPersistentJobs(this.session, this.session.manifest.project_id) : []; }

  listMedia(): readonly unknown[] { return this.session ? listAssetLocations(this.session, this.session.manifest.project_id) : []; }

  latestRender(): unknown { return this.session ? readLatestRender(this.session, this.session.manifest.project_id) : null; }
  listQcIssues(): readonly unknown[] { const render = this.latestRender() as { qc_report_json?: string } | null; if (!render?.qc_report_json) return []; const report = JSON.parse(render.qc_report_json) as { issues?: readonly unknown[] }; return report.issues ?? []; }
  listRenderResults(): readonly unknown[] { return this.session ? listRenderResults(this.session, this.session.manifest.project_id) : []; }
  listStoryPlans(): readonly unknown[] { return this.session ? listApprovedStoryPlans(this.session, this.session.manifest.project_id) : []; }
  listReviewArtifacts(): readonly unknown[] { return this.session ? listReviewArtifacts(this.session, this.session.manifest.project_id) : []; }
  listRenderManifests(): readonly unknown[] { return this.session ? listRenderManifests(this.session, this.session.manifest.project_id) : []; }
  listDeliveryRecords(): readonly unknown[] { return this.session ? listDeliveryRecords(this.session, this.session.manifest.project_id) : []; }
  listExports(): readonly unknown[] { return this.session ? listExports(this.session, this.session.manifest.project_id) : []; }
  listModelRuns(): readonly unknown[] { return this.session ? listModelRuns(this.session, this.session.manifest.project_id) : []; }
  listPresetApplications(): readonly unknown[] { return this.session ? listPresetApplications(this.session, this.session.manifest.project_id) : []; }
  listMediaDependencies(): readonly unknown[] { return this.session ? listMediaDependencies(this.session, this.session.manifest.project_id) : []; }
  async readStage2Workspace(): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const raw = readStage2WorkspaceSnapshot(this.session, this.session.manifest.project_id) as any;
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
      const dynamicRow = kind === "editorial_edit_intent" && row.value?.feedback_diagnosis_ref ? row : await this.editorialArtifactView(row, kind);
      const value = dynamicRow.value, id = value.direction_id ?? value.proposal_id ?? value.plan_id ?? value.decision_id ?? value.intent_id ?? value.snapshot_id;
      const feedbackStaleReasons: string[] = [];
      if (kind === "editorial_edit_intent" && value.feedback_diagnosis_ref) {
        const diagnosis = raw.feedback_diagnoses.find((candidate: any) => candidate.value?.diagnosis_id === value.feedback_diagnosis_ref.object_id && Number(candidate.value?.object_version ?? 1) === value.feedback_diagnosis_ref.object_version);
        if (!diagnosis || diagnosis.object_hash !== value.feedback_diagnosis_ref.digest) feedbackStaleReasons.push("feedback_diagnosis_changed");
        else {
          if (!timeline || Number(diagnosis.value.base_timeline_ref?.version) !== Number(timeline.version)) feedbackStaleReasons.push("feedback_base_timeline_changed");
          const track = timeline?.tracks.find((candidate: any) => candidate.track_id === diagnosis.value.target?.track_id), clip = track?.clips.find((candidate: any) => candidate.clip_id === diagnosis.value.target?.clip_id);
          const original = diagnosis.value.target?.original_source;
          if (!clip || clip.source.asset_id !== original?.asset_id || Number(clip.source.start_pts) !== Number(original?.start?.value) || Number(clip.source.end_pts) !== Number(original?.end?.value) || Number(clip.source.timescale) !== Number(original?.end?.timescale)) feedbackStaleReasons.push("feedback_target_changed");
        }
      }
      const effectiveRow = feedbackStaleReasons.length ? { ...dynamicRow, lifecycle_status: "stale", stale_reasons: [...new Set([...(dynamicRow.stale_reasons ?? []), ...feedbackStaleReasons])].sort() } : dynamicRow;
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
    const executions = raw.executions.map((row: any) => ({ execution_id: row.execution_id, digest: row.object_hash, status: row.value.status, intent_ref: { ...row.value.intent_ref }, final_timeline_version: row.value.final_timeline_version, semantic_graph_hash: row.value.semantic_graph_hash, affected_scope: [...row.value.affected_scope], created_at: row.created_at }));
    const renderTimelineVersion = raw.render_results.length ? Math.max(...raw.render_results.map((row: any) => Number(row.timeline_version))) : null;
    const renderResults = raw.render_results.map((row: any) => ({ render_result_id: row.render_result_id, render_id: row.render_id, target: row.target, timeline_version: row.timeline_version, graph_hash: row.graph_hash, output_hash: row.output_hash, created_at: row.created_at }));
    const renderVersion = raw.render?.timeline_version ?? renderTimelineVersion, renderExecution = executions.find((item: any) => item.status === "committed" && Number(item.final_timeline_version) === Number(renderVersion));
    const renderTargets = raw.render ? renderResults.filter((item: any) => item.render_id === raw.render.render_id && Number(item.timeline_version) === Number(renderVersion)).map((item: any) => item.target) : [];
    const renderStaleReasons = raw.render ? [...(!timeline || Number(renderVersion) !== Number(timeline.version) ? ["timeline_version_changed"] : []), ...(!renderExecution ? ["approved_execution_unavailable"] : []), ...(!renderTargets.includes("preview") || !renderTargets.includes("master") ? ["preview_master_pair_incomplete"] : [])] : [];
    const render = raw.render ? { render_id: raw.render.render_id, timeline_version: renderVersion, qc_status: raw.render.qc_status, binding_status: renderStaleReasons.length ? "stale" : "current", stale_reasons: renderStaleReasons, bound_execution_id: renderExecution?.execution_id ?? null, created_at: raw.render.created_at } : null;
    const currentExecution = timeline ? executions.find((item: any) => item.status === "committed" && Number(item.final_timeline_version) === Number(timeline.version)) : null;
    const approvalRows = await Promise.all(raw.permission_decisions.filter((row: any) => row.value?.classification === "exact_human_approved").map((row: any) => this.stage2PermissionDecisionView(row))) as any[];
    const approvals = approvalRows.map((row: any) => ({ decision_id: row.value.decision_id, digest: row.object_hash, action: row.value.action, status: row.lifecycle_status, stale_reasons: [...(row.stale_reasons ?? [])], subject_ref: { ...row.value.subject_ref }, created_at: row.created_at }));
    const dynamicIdentity = (item: any) => ({ object_id: item.object_id, object_version: item.object_version, digest: item.digest, status: item.status, stale_reasons: [...(item.stale_reasons ?? [])] });
    const identity = { project_id: raw.project_id, contract_refs: contractCards.map(dynamicIdentity), material_refs: materialCards.map(dynamicIdentity), artifact_refs: Object.values(artifactCards).flat().map(dynamicIdentity), feedback_refs: feedbackCards.map(dynamicIdentity), execution_refs: executions.map((item: any) => ({ execution_id: item.execution_id, digest: item.digest, status: item.status })), approval_refs: approvals.map((item: any) => ({ decision_id: item.decision_id, digest: item.digest, status: item.status, stale_reasons: item.stale_reasons })), timeline_version: timeline?.version ?? null, render_ids: renderResults.map((item: any) => item.render_result_id) };
    const safeTimelineInteger = (value: unknown): number | null => typeof value === "bigint"
      ? value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : null
      : typeof value === "number" && Number.isSafeInteger(value) ? value : null;
    const editableTargetProjection = timeline?.tracks.flatMap((track: any) => track.kind === "video" ? track.clips.map((clip: any) => {
      const start = safeTimelineInteger(clip.source.start_pts), end = safeTimelineInteger(clip.source.end_pts), timescale = safeTimelineInteger(clip.source.timescale);
      if (start === null || end === null || timescale === null || timescale <= 0) return { unavailable: { track_id: track.track_id, clip_id: clip.clip_id, reason: "rational_time_out_of_safe_number_range" } };
      return { target: { track_id: track.track_id, clip_id: clip.clip_id, asset_id: clip.source.asset_id, source: { start: { schema_version: 1, value: start, timescale }, end: { schema_version: 1, value: end, timescale } } } };
    }) : []) ?? [];
    const editableTargets = editableTargetProjection.flatMap((item: any) => item.target ? [item.target] : []), unavailableEditableTargets = editableTargetProjection.flatMap((item: any) => item.unavailable ? [item.unavailable] : []);
    const currentPack = materialCards.at(-1), directionVersions = (artifactCards.direction_card ?? []).filter((item: any) => !currentPack || versionedRefMatches(item.material_pack_ref, currentPack)), directions = [...new Map(directionVersions.sort((left: any, right: any) => left.object_version - right.object_version).map((item: any) => [item.object_id, item])).values()], selectedDirection = [...directions].reverse().find((item: any) => item.status === "selected"), stories = (artifactCards.story_proposal_v2 ?? []).filter((item: any) => !selectedDirection || versionedRefMatches(item.direction_ref, selectedDirection)), approvedPlans = (artifactCards.approved_story_plan_v2 ?? []).filter((item: any) => !selectedDirection || versionedRefMatches(item.direction_ref, selectedDirection)), currentPlan = approvedPlans.at(-1), intents = (artifactCards.editorial_edit_intent ?? []).filter((item: any) => !currentPlan || versionedRefMatches(item.approved_story_ref, currentPlan));
    return Object.freeze({ schema_version: 1, workspace_digest: editorialObjectDigest(identity), project_id: raw.project_id, timeline: timeline ? { version: timeline.version, track_count: timeline.tracks.length, clip_count: timeline.tracks.reduce((count: number, track: any) => count + track.clips.length, 0), editable_targets: editableTargets, unavailable_editable_targets: unavailableEditableTargets } : null, contract: currentContract, contracts: contractCards, evidence: evidenceCards, material_packs: materialCards, directions, stories, approved_plans: approvedPlans, decisions: artifactCards.decision_record ?? [], intents, feedback: feedbackCards, executions, approvals, review: { render, render_results: renderResults, current_execution_id: currentExecution?.execution_id ?? null } });
  }

  async performStage2ProductAction(channelCredential: object, rawInput: Stage2ProductActionInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const input = parseStage2ProductActionInput(rawInput);
    if (!input.reason.trim()) throw new Error("PRODUCT_ACTION_REASON_REQUIRED");
    const workspace = await this.readStage2Workspace() as any;
    if (workspace.workspace_digest !== input.workspace_digest) throw new Error("PRODUCT_WORKSPACE_STALE");
    if (["intent.approve", "intent.execute", "feedback.reject"].includes(input.action)) {
      const visibleIntent = workspace.intents.find((item: any) => item.object_id === stage2ProductActionTargetId(input));
      if (!visibleIntent || visibleIntent.status !== "candidate") throw new Error("PRODUCT_INTENT_UNAVAILABLE_OR_STALE");
    }
    const projectId = this.session.manifest.project_id;
    const registerApproval = async (action: Stage2PermissionRequestV1["action"], subject: Stage2PermissionTypedRef, contexts: readonly Stage2PermissionTypedRef[], requestedFields: readonly string[], scope: readonly string[], effectDigest: string): Promise<string> => {
      const approvalId = `product-approval-${effectDigest.slice(0, 16)}-${randomUUID()}`;
      await this.registerStage2HumanApproval(channelCredential, { approval_id: approvalId, action, subject_ref: subject, context_refs: contexts, requested_data_fields: requestedFields, affected_scope: scope, effect_digest: effectDigest, reason: input.reason, expires_at: new Date(this.now() + 10 * 60_000).toISOString() });
      return approvalId;
    };
    if (input.action === "direction.select") {
      if (!input.selected_id) throw new Error("PRODUCT_DIRECTION_SELECTION_REQUIRED");
      const rawRows = workspace.directions.filter((item: any) => item.status === "candidate").map((item: any) => readEditorialArtifact(this.session!, projectId, "direction_card", item.object_id, item.object_version)) as any[];
      const selectedRow = rawRows.find((row) => row?.value?.direction_id === input.selected_id); if (!selectedRow || rawRows.length < 2) throw new Error("PRODUCT_DIRECTION_COMPARISON_UNAVAILABLE");
      const contractRef = selectedRow.value.contract_ref, subject: Stage2PermissionTypedRef = { object_type: "direction_card", object_id: selectedRow.value.direction_id, object_version: selectedRow.value.object_version, digest: selectedRow.object_hash }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "material_evidence_pack", ...selectedRow.value.material_pack_ref }, { object_type: "duration_feasibility", ...selectedRow.value.duration_feasibility_ref }];
      const candidateRefs = rawRows.map((row) => ({ object_id: row.value.direction_id, object_version: row.value.object_version, digest: row.object_hash })).sort((left, right) => left.object_id.localeCompare(right.object_id)), reviewDigest = selectedRow.object_hash, decisionId = `product-direction-${editorialObjectDigest({ workspace_digest: input.workspace_digest, candidate_refs: candidateRefs, selected_direction_id: input.selected_id }).slice(0, 24)}`, effect = { direction_ids: rawRows.map((row) => row.value.direction_id).sort(), candidate_refs: candidateRefs, selected_direction_id: input.selected_id, decision_id: decisionId, reason: input.reason, review_digest: reviewDigest }, effectDigest = stage2PermissionEffectDigest("direction_card.select", effect), approvalId = await registerApproval("direction_card.select", subject, contexts, ["alternatives", "reason", "review_digest", "selected_ref"], [permissionRefKey(subject)], effectDigest);
      return this.selectStoryDirection(rawRows.map((row) => row.value.direction_id), { approval_id: approvalId, decision_id: decisionId, reason: input.reason, review_digest: reviewDigest, selected_direction_id: input.selected_id });
    }
    if (input.action === "story.approve") {
      if (!input.selected_id) throw new Error("PRODUCT_STORY_SELECTION_REQUIRED");
      const rawRows = workspace.stories.filter((item: any) => item.status === "candidate").map((item: any) => readEditorialArtifact(this.session!, projectId, "story_proposal_v2", item.object_id, item.object_version)) as any[];
      const selectedRow = rawRows.find((row) => row?.value?.proposal_id === input.selected_id); if (!selectedRow || rawRows.length < 2) throw new Error("PRODUCT_STORY_COMPARISON_UNAVAILABLE");
      const contractRef = selectedRow.value.contract_ref, subject: Stage2PermissionTypedRef = { object_type: "story_proposal_v2", object_id: selectedRow.value.proposal_id, object_version: selectedRow.value.object_version, digest: selectedRow.object_hash }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "direction_card", ...selectedRow.value.direction_ref }, { object_type: "material_evidence_pack", ...selectedRow.value.material_pack_ref }, { object_type: "duration_feasibility", ...selectedRow.value.duration_feasibility_ref }];
      const candidateRefs = rawRows.map((row) => ({ object_id: row.value.proposal_id, object_version: row.value.object_version, digest: row.object_hash })).sort((left, right) => left.object_id.localeCompare(right.object_id)), reviewDigest = selectedRow.object_hash, identityDigest = editorialObjectDigest({ workspace_digest: input.workspace_digest, candidate_refs: candidateRefs, selected_proposal_id: input.selected_id }), decisionId = `product-story-${identityDigest.slice(0, 24)}`, planId = `product-plan-${identityDigest.slice(0, 24)}`, effect = { proposal_ids: rawRows.map((row) => row.value.proposal_id).sort(), candidate_refs: candidateRefs, selected_proposal_id: input.selected_id, decision_id: decisionId, plan_id: planId, reason: input.reason, review_digest: reviewDigest }, effectDigest = stage2PermissionEffectDigest("story_plan.approve", effect), approvalId = await registerApproval("story_plan.approve", subject, contexts, ["alternatives", "reason", "review_digest", "selected_ref"], [permissionRefKey(subject)], effectDigest);
      return this.approveStoryCandidates(rawRows.map((row) => row.value.proposal_id), { approval_id: approvalId, decision_id: decisionId, plan_id: planId, reason: input.reason, review_digest: reviewDigest, selected_proposal_id: input.selected_id });
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
    const executionId = `product-execution-${editorialObjectDigest({ workspace_digest: input.workspace_digest, intent_id: input.intent_id, proposal_approval_decision_id: input.proposal_approval_decision_id }).slice(0, 24)}`, review = await this.prepareEditorialIntentExecution({ execution_id: executionId, intent_id: input.intent_id, proposal_approval_decision_id: input.proposal_approval_decision_id }), approvalId = await registerApproval("editorial_edit_intent.execute", review.subject_ref, review.context_refs, review.requested_data_fields, review.affected_scope, review.effect_digest);
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

  async proposeStory(input: Record<string, unknown>): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    if (!this.modelProvider) throw new Error("MODEL_PROVIDER_NOT_CONFIGURED");
    const projectId = this.session.manifest.project_id;
    const requestId = `model-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await runModel({ request_id: requestId, project_id: projectId, provider: this.modelProviderName, model: this.modelName, prompt_version: "story-proposal@v1", input: { instruction: "Generate a candidate StoryProposal. Do not approve it and do not modify a Timeline.", context: input }, privacy_class: "internal", structured_output: true, budget: { max_total_tokens: 4096 }, output_validator: (output) => validateStoryProposal(output as any) }, this.modelProvider, Date.now(), { policy: { retry: { max_attempts: 2, retryable: () => false } } });
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? `${item}n` : item));
    const inputObject = await putObjectAndRegister(this.session, projectId, encode(input), { object_ref_id: `${projectId}:model-run:${requestId}:input`, object_type: "model_input", relation_key: requestId });
    const outputObject = await putObjectAndRegister(this.session, projectId, encode(result.output), { object_ref_id: `${projectId}:model-run:${requestId}:output`, object_type: "model_output", relation_key: requestId });
    const modelRun = registerModelRun(this.session, projectId, { model_run_id: requestId, input_object_hash: inputObject.hash, output_object_hash: outputObject.hash, status: "SUCCEEDED", metadata: result.audit });
    return { proposal: result.output, model_run: modelRun };
  }

  private async inspectMediaCandidate(inputPath: string): Promise<VerifiedMediaCandidate> {
    const before = await stat(inputPath);
    const fingerprintResult = await this.submitWorkerJob<{ input_path: string }, WorkerResult<MediaFingerprintOutput>>("media.fingerprint.v1", { input_path: inputPath });
    const fingerprintOutput = fingerprintResult.outputs?.find((output): output is MediaFingerprintOutput => output.kind === "media.fingerprint");
    if (!fingerprintOutput?.digest || fingerprintOutput.algorithm !== "sha256" || !/^[0-9a-f]{64}$/.test(fingerprintOutput.digest)) throw new Error("MEDIA_FINGERPRINT_INVALID");
    const probeResult = await this.submitWorkerJob<{ input_path: string }, WorkerResult<MediaProbeOutput>>("media.probe.v1", { input_path: inputPath });
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
    const key = `${location.asset_location_id}:${location.verified_at ?? ""}:${location.location_ref}`;
    const existing = cache.get(key);
    if (existing) return existing;
    const verification = this.persistedLocationHasCurrentIdentity(location);
    cache.set(key, verification);
    return verification;
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
    const contract = readCreativeContractVersion(this.session, this.session.manifest.project_id, input.contract_ref.object_id, input.contract_ref.object_version) as any, head = readCreativeContractHead(this.session, this.session.manifest.project_id, input.contract_ref.object_id) as any;
    if (!contract || !head || contract.object_hash !== input.contract_ref.digest || head.object_hash !== input.contract_ref.digest || contract.lifecycle_status !== "approved" || !versionedRefMatches(contract.value.rights_policy_ref, input.policy_ref)) throw new Error("material permission Contract authority is unavailable or stale");
    const location = (listAssetLocationsForAssets(this.session, this.session.manifest.project_id, [input.asset_id]) as PersistedAssetLocation[]).find((candidate) => candidate.asset_location_id === input.asset_location_id && candidate.location_type === "original");
    if (!location) throw new Error("material permission target is unavailable or stale");
    const subject = { object_type: "creative_contract" as const, ...input.contract_ref }, effect = { asset_id: input.asset_id, asset_location_id: input.asset_location_id, location_identity: createHash("sha256").update(`${location.asset_location_id}\0${location.location_ref}\0${location.verified_at ?? ""}`).digest("hex"), permission_state: input.permission_state, policy_ref: input.policy_ref }, gate = this.stage2Gate({ action: "material_permission.record", subject_ref: subject, requested_data_fields: ["asset_id", "location_identity", "policy_ref", "reason"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("material_permission.record", effect), reason: `record exact material permission ${input.permission_state}`, approval_id: input.approval_id, retain: false }) as any, human = gate.request.approval;
    if (input.permission_state === "authorized" && !(await this.persistedLocationHasCurrentIdentity(location))) throw new Error("material permission target is unavailable or stale");
    return this.commitStage2Mutation(gate, () => setAssetLocationPermission(this.session!, this.session!.manifest.project_id, input.asset_id, input.asset_location_id, { asset_id: input.asset_id, asset_location_id: input.asset_location_id, permission_state: input.permission_state, actor_id: human.actor_id, decided_at: human.approved_at, policy_ref: input.policy_ref }));
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

  async render(originalPath: string, qcRequirements: QcRequirements = {}): Promise<ProjectHostStatus> {
    if (!this.session || !this.projectDirectory) throw new Error("project is not open");
    const [verifiedOriginal] = await this.importMedia([originalPath]);
    if (!verifiedOriginal) throw new Error("VERIFIED_ORIGINAL_REQUIRED");
    const worker = this.persistentWorkerPort();
    const outputs = await renderPreviewMaster(originalPath, resolve(this.projectDirectory, "renders"), worker);
    const report = await qcMaster(outputs.master, worker, "original", { qc_requirements: qcRequirements, loudness: qcRequirements.loudness });
    registerRender(this.session, this.session.manifest.project_id, { render_id: `render-${Date.now()}`, original_path: originalPath, proxy_path: outputs.proxy, preview_path: outputs.preview, master_path: outputs.master, qc_report: report });
    this.currentStatus = { ...this.currentStatus, render: "available", qc: report.status === "passed" ? "passed" : "blocked" };
    return this.currentStatus;
  }

  async renderTimeline(options: TimelineRenderOptions): Promise<{ status: ProjectHostStatus; render_id: string; preview: unknown; master: unknown }> {
    if (!this.session || !this.projectDirectory) throw new Error("project is not open");
    const raw = readLatestTimeline(this.session, this.session.manifest.project_id);
    if (!raw) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(raw)) as Timeline;
    if (options.executionBinding && timeline.version !== options.executionBinding.timeline_version) throw new Error(`SEMANTIC_RENDER_TIMELINE_REBOUND:${timeline.version}`);
    const duplicateAssetRef = options.sources.find((source, index) => options.sources.findIndex((candidate) => candidate.asset_ref === source.asset_ref) !== index)?.asset_ref;
    if (duplicateAssetRef) throw new Error(`RENDER_SOURCE_DUPLICATE:${duplicateAssetRef}`);
    const outputDirectory = options.outputDirectory ?? resolve(this.projectDirectory, "renders");
    const worker = this.persistentWorkerPort();
    const probeAudio = async (path: string, assetRef: string): Promise<boolean> => {
      const result = await worker.submit<any, any>("media.probe.v1", { input_path: path });
      const probe = result.outputs?.find((output: any) => output.kind === "media.probe")?.value;
      const streams = probe?.streams ?? Object.values(probe?.timing?.streams ?? {});
      if (!probe || !Array.isArray(streams) || streams.length === 0) throw new Error(`RENDER_SOURCE_PROBE_INVALID:${assetRef}`);
      return streams.some((stream: any) => stream.codec_type === "audio");
    };
    const resolvedSources = await Promise.all(options.sources.map(async (source) => {
      const assetId = source.asset_ref as AssetId;
      let locations = listAssetLocationsForAssets(this.session!, this.session!.manifest.project_id, [source.asset_ref]) as readonly PersistedAssetLocation[];
      let original = locations.filter((location) => location.location_type === "original").find((location) => location.location_ref === source.original_ref) ?? locations.find((location) => location.location_type === "original" && persistedLocationIsCurrent(location));
      if (!original) {
        if (!source.original_ref) throw new Error(`MASTER_ORIGINAL_REQUIRED:${source.asset_ref}`);
        original = await this.relinkOriginal(assetId, source.original_ref) as PersistedAssetLocation;
        locations = listAssetLocationsForAssets(this.session!, this.session!.manifest.project_id, [source.asset_ref]) as readonly PersistedAssetLocation[];
      }
      if (options.executionBinding && original.metadata?.permission_state !== "authorized") throw new Error(`SEMANTIC_RENDER_ORIGINAL_UNAUTHORIZED:${source.asset_ref}`);
      const verifiedOriginal = await this.inspectMediaCandidate(original.location_ref);
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
        verifiedProxy = await this.inspectMediaCandidate(proxy.location_ref);
        if (verifiedProxy.fingerprint.digest !== proxy.metadata?.fingerprint?.digest || proxy.metadata?.source_asset_id !== source.asset_ref) throw new Error(`PROXY_IDENTITY_MISMATCH:${source.asset_ref}`);
        proxyMap ??= proxy.metadata?.proxy_map ? reviveProxyMap(proxy.metadata.proxy_map) : undefined;
      }
      const originalGeometry = probeVideoGeometry(verifiedOriginal.probe);
      const proxyGeometry = probeVideoGeometry(verifiedProxy?.probe);
      const resolvedSource: RenderSourceRef = { ...source, original_ref: original.location_ref, original_object_ref: original.asset_location_id, original_timescale: source.original_timescale ?? source.source_timescale, ...(originalGeometry ? { original_width: originalGeometry.width, original_height: originalGeometry.height } : {}), ...(proxy ? { proxy_ref: proxy.location_ref, proxy_object_ref: proxy.asset_location_id } : {}), ...(proxyGeometry ? { proxy_width: proxyGeometry.width, proxy_height: proxyGeometry.height } : {}), ...(proxyMap ? { proxy_map: proxyMap } : {}) };
      const originalAudio = await probeAudio(original.location_ref, resolvedSource.asset_ref);
      const proxyAudio = proxy ? await probeAudio(proxy.location_ref, resolvedSource.asset_ref) : originalAudio;
      if (originalAudio !== undefined && proxyAudio !== undefined && originalAudio !== proxyAudio) throw new Error(`RENDER_SOURCE_AUDIO_IDENTITY_MISMATCH:${resolvedSource.asset_ref}`);
      const hasAudio = originalAudio ?? proxyAudio;
      return hasAudio === undefined ? resolvedSource : { ...resolvedSource, has_audio: hasAudio };
    }));
    const sources = new Map(resolvedSources.map((source) => [source.asset_ref, source]));
    if (sources.size !== resolvedSources.length) throw new Error("RENDER_SOURCE_DUPLICATE");
    const authoritativeSources = [...sources.values()];
    const { previewGraph, masterGraph, previewPlan, masterPlan } = resolveTimelineRenderPlans(timeline, sources, options.profile ?? { name: "timeline-render" }, options.range);
    if (options.executionBinding) {
      const actualSourceIdentityDigest = editorialObjectDigest(editorialRenderSourceIdentity(resolvedSources));
      if (actualSourceIdentityDigest !== options.executionBinding.source_identity_digest) throw new Error("SEMANTIC_RENDER_SOURCE_IDENTITY_REBOUND");
      if (previewPlan.semantic_graph_hash !== options.executionBinding.semantic_graph_hash || masterPlan.semantic_graph_hash !== options.executionBinding.semantic_graph_hash) throw new Error("SEMANTIC_RENDER_GRAPH_REBOUND");
      if (previewPlan.plan_id !== options.executionBinding.preview_plan_id || masterPlan.plan_id !== options.executionBinding.master_plan_id) throw new Error("SEMANTIC_RENDER_PLAN_REBOUND");
    }
    if (previewPlan.diagnostics.length || masterPlan.diagnostics.length) {
      const blockerKey = createHash("sha256").update(canonicalSerialize({ preview: previewPlan, master: masterPlan })).digest("hex");
      registerRenderBundle(this.session, this.session.manifest.project_id, { schema_version: 1, bundle_id: `bundle-blocked-${blockerKey.slice(0, 24)}`, idempotency_key: `blocked:${blockerKey}`, state: "blocked", results: [], manifests: [{ manifest_id: `blocked-${blockerKey.slice(0, 24)}-execution-preview`, manifest_type: "execution_plan", value: previewPlan }, { manifest_id: `blocked-${blockerKey.slice(0, 24)}-execution-master`, manifest_type: "execution_plan", value: masterPlan }, { manifest_id: `blocked-${blockerKey.slice(0, 24)}-diagnostics`, manifest_type: "blocker_manifest", value: { schema_version: 1, diagnostics: [...previewPlan.diagnostics, ...masterPlan.diagnostics] } }] });
      throw new Error(`RENDER_RESOLVER_BLOCKED:${[...previewPlan.diagnostics, ...masterPlan.diagnostics].map((diagnostic) => diagnostic.code).join(",")}`);
    }
    const semanticGraphHash = createHash("sha256").update(semanticGraphPayload(previewGraph)).digest("hex");
    if (semanticGraphHash !== createHash("sha256").update(semanticGraphPayload(masterGraph)).digest("hex")) throw new Error("RENDER_SEMANTIC_DIVERGENCE");
    const presetApplicationLink = this.linkPresetApplicationToRender(timeline, authoritativeSources, previewPlan, masterPlan);
    const graphHash = (graph: unknown) => createHash("sha256").update(renderGraphPayload(graph as any)).digest("hex");
    const submit = (graph: any, plan: ExecutionPlan) => worker.submit<any, any>("render.timeline.v1", { graph: JSON.parse(renderGraphPayload(graph)), execution_plan: JSON.parse(canonicalSerialize(plan)), output_dir: outputDirectory });
    const previewResult = await submit(previewGraph, previewPlan);
    const masterResult = await submit(masterGraph, masterPlan);
    const outputOf = async (result: any, plan: ExecutionPlan) => { const output = result.outputs?.find((candidate: any) => candidate.kind === "render") ?? (() => { throw new Error("worker result missing render output"); })(); if (output.execution_plan_id !== plan.plan_id || output.semantic_graph_hash !== plan.semantic_graph_hash || output.cache_key !== plan.cache_key) throw new Error("WORKER_OUTPUT_PLAN_MISMATCH"); const actual = createHash("sha256").update(await readFile(output.path)).digest("hex"); if (output.hash !== actual || result.metrics?.output_hash !== actual) throw new Error("WORKER_OUTPUT_HASH_MISMATCH"); return { ...output, hash: actual }; };
    const previewOutput = await outputOf(previewResult, previewPlan);
    const masterOutput = await outputOf(masterResult, masterPlan);
    const firstSource = authoritativeSources[0];
    const timelineLoudness = timeline.master_loudness?.enabled ? { target_lufs: timeline.master_loudness.target_lufs, tolerance_lufs: timeline.master_loudness.tolerance_lufs, true_peak_db: timeline.master_loudness.true_peak_db } : options.qcRequirements?.loudness;
    const report = await qcMaster(masterOutput.path, worker, "original", { require_audio: authoritativeSources.some((source) => source.has_audio !== false), source_identity: firstSource ? { source_kind: "original", asset_id: firstSource.asset_ref, object_ref: firstSource.original_object_ref, render_graph_source_kind: "original" } : undefined, render_graph_sources: authoritativeSources.map((source) => ({ asset_id: source.asset_ref, source_kind: "original", object_ref: source.original_object_ref })), qc_requirements: options.qcRequirements ?? {}, loudness: timelineLoudness, audio_normalization: masterResult.metrics?.audio_normalization, planned_black_intervals: plannedBoundaryFadeIntervals(timeline) });
    const bundleKey = renderBundleIdentity(previewPlan.cache_key, masterPlan.cache_key, options.qcRequirements, presetApplicationLink ? presetDigest(presetApplicationLink) : undefined);
    const renderId = `render-${bundleKey.slice(0, 24)}`;
    if (report.status !== "passed") {
      registerRenderBundle(this.session, this.session.manifest.project_id, { schema_version: 1, bundle_id: `bundle-blocked-${bundleKey.slice(0, 24)}`, idempotency_key: `blocked-qc:${bundleKey}`, state: "blocked", results: [], manifests: [{ manifest_id: `${renderId}-execution-preview`, manifest_type: "execution_plan", value: previewPlan }, { manifest_id: `${renderId}-execution-master`, manifest_type: "execution_plan", value: masterPlan }, { manifest_id: `${renderId}-qc-blocker`, manifest_type: "blocker_manifest", value: { schema_version: 1, code: "RENDER_QC_BLOCKED", qc_report: report } }] });
      this.currentStatus = { ...this.currentStatus, render: "blocked", qc: "blocked" };
      throw new Error(`RENDER_QC_BLOCKED:${report.issues.map((issue: any) => issue.code).join(",")}`);
    }
    const first = authoritativeSources[0];
    const originalRefs = authoritativeSources.filter((source) => source.original_ref || source.original_object_ref).map((source) => ({ asset_ref: source.asset_ref, ref: source.original_ref, object_ref: source.original_object_ref }));
    const proxyRefs = authoritativeSources.filter((source) => source.proxy_ref || source.proxy_object_ref).map((source) => ({ asset_ref: source.asset_ref, ref: source.proxy_ref, object_ref: source.proxy_object_ref, proxy_map: source.proxy_map }));
    const results = ([["preview", previewGraph, previewResult, previewOutput], ["master", masterGraph, masterResult, masterOutput]] as const).map(([target, graph, result, output]) => ({ render_result_id: `${renderId}-${target}`, render_id: renderId, target, timeline_version: timeline.version, graph_hash: graphHash(graph), render_graph: graph, original_refs: originalRefs, proxy_refs: proxyRefs, profile: graph.profile ?? {}, worker_version: result.metrics?.worker_version ?? "unknown", ffmpeg_version: result.metrics?.ffmpeg_version ?? "unknown", output_path: output.path, output_hash: output.hash }));
    const manifests = [{ manifest_id: `${renderId}-execution-preview`, manifest_type: "execution_plan", value: previewPlan }, { manifest_id: `${renderId}-execution-master`, manifest_type: "execution_plan", value: masterPlan }, ...([["preview", previewPlan, previewResult, previewOutput], ["master", masterPlan, masterResult, masterOutput]] as const).map(([target, plan, result, output]) => ({ manifest_id: `${renderId}-output-${target}`, manifest_type: "output_manifest", value: { schema_version: 2, render_id: renderId, target, semantic_graph_hash: semanticGraphHash, execution_plan_id: plan.plan_id, cache_key: plan.cache_key, output_hash: output.hash, worker_version: result.metrics?.worker_version ?? "unknown", backend_version: result.metrics?.ffmpeg_version ?? "unknown", diagnostics: plan.diagnostics, ...(presetApplicationLink ? { preset_application_link: presetApplicationLink } : {}), ...(result.metrics?.audio_normalization ? { audio_normalization: result.metrics.audio_normalization } : {}) } }))];
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

  upgradeCreativeContractV1(contract: CreativeContract, context: Parameters<typeof upgradeCreativeContractV1>[1]): CreativeContractV2 {
    if (!this.session) throw new Error("project is not open");
    assertCreativeContractV1(contract);
    if (context.project_id !== this.session.manifest.project_id) throw new Error("creative contract project mismatch");
    const upgraded = upgradeCreativeContractV1(contract, context);
    assertCreativeContractV2(upgraded);
    validateCreativeContractV2(upgraded);
    return upgraded;
  }

  registerCreativeContractDraft(contract: CreativeContractV2): unknown {
    if (!this.session) throw new Error("project is not open");
    assertCreativeContractV2(contract);
    if (contract.project_id !== this.session.manifest.project_id) throw new Error("creative contract project mismatch");
    if (!['draft', 'review'].includes(contract.status) || contract.approval) throw new Error("only an unapproved creative contract draft/review can be registered");
    validateCreativeContractV2(contract);
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

  async assembleMaterialEvidencePack(input: Readonly<{ pack_id: string; object_version?: number; contract_ref: Readonly<{ object_id: string; object_version: number; digest: string }>; evidence_ids: readonly string[]; coverage_matrix: CoverageMatrix; expected_media_verified_at: Readonly<Record<string, string>>; policy_version: string; timeline_version?: number; created_at?: string; expires_at?: string }>): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    const projectId = this.session.manifest.project_id;
    const contractRow = readCreativeContractVersion(this.session, projectId, input.contract_ref.object_id, input.contract_ref.object_version) as any;
    const head = readCreativeContractHead(this.session, projectId, input.contract_ref.object_id) as any;
    if (!contractRow || contractRow.lifecycle_status !== "approved" || contractRow.object_hash !== input.contract_ref.digest || !head || head.object_hash !== contractRow.object_hash) throw new Error("material pack contract is unapproved or stale");
    const contract = contractRow.value as CreativeContractV2;
    assertCreativeContractV2(contract);
    if (input.evidence_ids.length === 0 || new Set(input.evidence_ids).size !== input.evidence_ids.length) throw new Error("material pack evidence IDs must be nonempty and unique");
    const evidenceRefs = input.evidence_ids.map((evidenceId) => {
      const evidence = readEvidenceObject(this.session!, evidenceId) as any;
      if (!evidence || evidence.project_id !== projectId || evidence.value.review_status !== "approved" || !Number.isInteger(evidence.value.evidence_version) || evidence.value.evidence_version < 1 || !Number.isInteger(evidence.value.timescale) || evidence.value.timescale < 1) throw new Error(`material evidence is unknown or unapproved: ${evidenceId}`);
      return { evidence_id: evidenceId, evidence_type: evidence.analysis_type, evidence_version: evidence.value.evidence_version, asset_id: evidence.asset_id, range: { start: { schema_version: 1 as const, value: evidence.start_pts, timescale: evidence.value.timescale }, end: { schema_version: 1 as const, value: evidence.end_pts, timescale: evidence.value.timescale } }, review_status: "approved" as const, content_digest: evidence.object_hash };
    }).sort((left, right) => left.evidence_id.localeCompare(right.evidence_id));
    const assetIds = [...new Set(evidenceRefs.map((reference) => reference.asset_id))].sort();
    const identityCache = new Map<string, Promise<boolean>>();
    const availability = await Promise.all(assetIds.map(async (assetId) => {
      const asset = readMediaAsset(this.session!, projectId, assetId) as any;
      const expectedVerifiedAt = input.expected_media_verified_at[assetId];
      const candidates = (listAssetLocationsForAssets(this.session!, projectId, [assetId]) as PersistedAssetLocation[]).filter((candidate) => candidate.location_type === "original" && candidate.verified_at === expectedVerifiedAt && candidate.metadata?.permission_state === "authorized" && candidate.metadata.permission_decision?.permission_state === "authorized" && versionedRefMatches(candidate.metadata.permission_decision.policy_ref, contract.rights_policy_ref));
      const current = await Promise.all(candidates.map(async (candidate) => ({ candidate, current: await this.currentIdentityForLocation(candidate, identityCache) })));
      const locations = current.filter((result) => result.current).map((result) => result.candidate);
      if (!asset || asset.asset_id !== assetId || !expectedVerifiedAt || locations.length !== 1) throw new Error(`material media fact is unavailable or stale (including ambiguous): ${assetId}`);
      const location = locations[0]!;
      const permissionState = location.metadata?.permission_state ?? "unknown";
      return { asset_id: assetId, original_identity: assetId, permission_state: permissionState, verified_at: location.verified_at };
    }));
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
      if (!Number.isFinite(expiryMs) || expiryMs <= assembledMs || expiryMs <= Date.now()) throw new Error("material pack expiry is stale or invalid");
    }
    const contextInput = { contract_ref: input.contract_ref, evidence_refs: evidenceRefs, coverage_matrix_ref: { object_id: input.coverage_matrix.matrix_id, object_version: 1, digest: coverageDigest }, sufficiency: { covered_requirement_ids: [...new Set(covered)].sort(), missing_requirement_ids: [...new Set(missing)].sort(), conflicting_requirement_ids: [...new Set(conflicting)].sort() }, availability, policy_snapshot: { policy_version: input.policy_version, privacy_policy_ref: contract.privacy_policy_ref, rights_policy_ref: contract.rights_policy_ref }, timeline_version: input.timeline_version ?? null, expires_at: input.expires_at ?? null };
    const inputFingerprint = createHash("sha256").update(canonicalCreativeContext(contextInput)).digest("hex");
    const rawTimeline = readLatestTimeline(this.session, projectId);
    const currentTimeline = rawTimeline ? revive(JSON.parse(rawTimeline)) as Timeline : null;
    if (currentTimeline && input.timeline_version === undefined) throw new Error("material pack must bind the current Timeline version");
    if (input.timeline_version !== undefined && (!currentTimeline || currentTimeline.version !== input.timeline_version)) throw new Error("material pack Timeline version is stale");
    const existing = readMaterialEvidencePackByInput(this.session, projectId, inputFingerprint) as any;
    if (existing && existing.lifecycle_status !== "stale" && existing.lifecycle_status !== "superseded") return existing;
    const pack: MaterialEvidencePackV1 = { schema_version: 1, pack_id: input.pack_id, project_id: projectId, object_version: input.object_version ?? 1, status: missing.length || conflicting.length ? "insufficient" : "sufficient", contract_ref: input.contract_ref, ...(input.timeline_version === undefined ? {} : { timeline_version: input.timeline_version }), evidence_refs: evidenceRefs, moment_refs: [], event_refs: [], coverage_matrix_ref: contextInput.coverage_matrix_ref, sufficiency: contextInput.sufficiency, availability: availability as any, policy_snapshot: contextInput.policy_snapshot, input_fingerprint: inputFingerprint, created_at: assembledAt, ...(input.expires_at ? { expires_at: input.expires_at } : {}), provenance: { producer: "project-host", source_version: "creative-context-v1", policy_version: input.policy_version, input_refs: [input.contract_ref.digest, ...evidenceRefs.map((reference) => reference.content_digest), coverageDigest], unresolved_assumptions: [] } };
    assertMaterialEvidencePackV1(pack);
    validateMaterialEvidencePack(pack, contract);
    const subject = { object_type: "creative_contract" as const, ...input.contract_ref }, effectDigest = stage2PermissionEffectDigest("material_evidence_pack.assemble", pack);
    const gate = this.stage2Gate({ action: "material_evidence_pack.assemble", subject_ref: subject, requested_data_fields: ["availability", "coverage_matrix_ref", "evidence_refs", "policy_snapshot"], affected_scope: [permissionRefKey(subject)], effect_digest: effectDigest, reason: "assemble Host-derived Material Evidence Pack", retain: false });
    return this.commitStage2Mutation(gate, () => registerMaterialEvidencePack(this.session!, projectId, pack, { coverage_matrix: normalizedCoverage }));
  }

  private async materialEvidencePackView(row: any, identityCache = new Map<string, Promise<boolean>>()): Promise<any> {
    if (!this.session || !row) return row;
    const projectId = this.session.manifest.project_id;
    const pack = row.value as MaterialEvidencePackV1;
    const staleReasons: string[] = [];
    const head = readCreativeContractHead(this.session, projectId, pack.contract_ref.object_id) as any;
    if (!head || head.object_version !== pack.contract_ref.object_version || head.object_hash !== pack.contract_ref.digest) staleReasons.push("creative_contract_head_changed");
    if (!head?.value || pack.policy_snapshot.policy_version !== pack.provenance.policy_version || !versionedRefMatches(pack.policy_snapshot.privacy_policy_ref, head.value.privacy_policy_ref) || !versionedRefMatches(pack.policy_snapshot.rights_policy_ref, head.value.rights_policy_ref)) staleReasons.push("policy_snapshot_changed");
    if (pack.timeline_version !== undefined) {
      const raw = readLatestTimeline(this.session, projectId);
      const timeline = raw ? revive(JSON.parse(raw)) as Timeline : null;
      if (!timeline || timeline.version !== pack.timeline_version) staleReasons.push("timeline_version_changed");
    }
    if (pack.expires_at) {
      const expiryMs = Date.parse(pack.expires_at);
      if (!Number.isFinite(expiryMs)) staleReasons.push("pack_expiry_invalid");
      else if (expiryMs <= Date.now()) staleReasons.push("pack_expired");
    }
    for (const reference of pack.evidence_refs) {
      const evidence = readEvidenceObject(this.session, reference.evidence_id) as any;
      if (!evidence || evidence.object_hash !== reference.content_digest || evidence.value?.review_status !== "approved" || evidence.value?.evidence_version !== reference.evidence_version) staleReasons.push(`evidence_changed:${reference.evidence_id}`);
    }
    for (const availability of pack.availability) {
      const candidates = (listAssetLocationsForAssets(this.session, projectId, [availability.asset_id]) as PersistedAssetLocation[]).filter((candidate) => candidate.location_type === "original" && candidate.verified_at === availability.verified_at && candidate.metadata?.permission_state === "authorized" && candidate.metadata.permission_decision?.permission_state === "authorized" && versionedRefMatches(candidate.metadata.permission_decision.policy_ref, pack.policy_snapshot.rights_policy_ref));
      const current = await Promise.all(candidates.map(async (candidate) => ({ candidate, current: await this.currentIdentityForLocation(candidate, identityCache) })));
      const locations = current.filter((result) => result.current).map((result) => result.candidate);
      if (locations.length !== 1) staleReasons.push(`media_changed:${availability.asset_id}`);
    }
    return staleReasons.length ? { ...row, lifecycle_status: "stale", stale_reasons: [...new Set(staleReasons)].sort() } : row;
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
    const packRow = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, input.material_pack_ref.object_id, input.material_pack_ref.object_version)) as any;
    if (!packRow || packRow.lifecycle_status !== "sufficient" || packRow.object_hash !== input.material_pack_ref.digest || packRow.value.project_id !== projectId || packRow.value.contract_ref.object_id !== input.contract_ref.object_id || packRow.value.contract_ref.object_version !== input.contract_ref.object_version || packRow.value.contract_ref.digest !== input.contract_ref.digest) throw new Error("creative skill Material Evidence Pack is insufficient, stale or rebound");
    assertMaterialEvidencePackV1(packRow.value);
    const evaluation = evaluateCreativeSkill(definitionRow.value, contractRow.value, packRow.value, input);
    assertSkillEvaluationV1(evaluation);
    const existing = readSkillEvaluationByInput(this.session, projectId, evaluation.input_fingerprint) as any;
    if (existing && existing.lifecycle_status !== "stale") return this.skillEvaluationView(existing);
    const subject = { object_type: "creative_skill_definition" as const, object_id: input.definition_ref.object_id, object_version: input.definition_ref.object_version, digest: input.definition_ref.digest }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...input.contract_ref }, { object_type: "material_evidence_pack", ...input.material_pack_ref }], scope = [subject, ...contexts].map(permissionRefKey).sort();
    const gate = this.stage2Gate({ action: "skill_evaluation.evaluate", subject_ref: subject, context_refs: contexts, requested_data_fields: ["diagnostics", "input_refs", "scores"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("skill_evaluation.evaluate", evaluation), reason: "run deterministic Creative Skill evaluation", retain: false });
    return this.commitStage2Mutation(gate, () => registerSkillEvaluation(this.session!, projectId, evaluation));
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
    const packRow = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, input.material_pack_ref.object_id, input.material_pack_ref.object_version)) as any;
    if (!packRow || packRow.lifecycle_status !== "sufficient" || packRow.object_hash !== input.material_pack_ref.digest || packRow.value.project_id !== projectId || packRow.value.contract_ref.object_id !== input.contract_ref.object_id || packRow.value.contract_ref.object_version !== input.contract_ref.object_version || packRow.value.contract_ref.digest !== input.contract_ref.digest) throw new Error("duration Material Evidence Pack is insufficient, stale or rebound");
    assertMaterialEvidencePackV1(packRow.value);
    const feasibility = evaluateDurationFeasibility(blueprintRow.value, contractRow.value, packRow.value, input);
    assertDurationFeasibilityV1(feasibility);
    const existing = readDurationFeasibilityByInput(this.session, projectId, feasibility.input_fingerprint) as any;
    if (existing && existing.lifecycle_status !== "stale") return this.durationFeasibilityView(existing);
    const subject = { object_type: "duration_blueprint" as const, object_id: input.blueprint_ref.object_id, object_version: input.blueprint_ref.object_version, digest: input.blueprint_ref.digest }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...input.contract_ref }, { object_type: "material_evidence_pack", ...input.material_pack_ref }], scope = [subject, ...contexts].map(permissionRefKey).sort();
    const gate = this.stage2Gate({ action: "duration_feasibility.evaluate", subject_ref: subject, context_refs: contexts, requested_data_fields: ["diagnostics", "input_refs", "result"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("duration_feasibility.evaluate", feasibility), reason: "run deterministic Duration feasibility", retain: false });
    return this.commitStage2Mutation(gate, () => registerDurationFeasibility(this.session!, projectId, feasibility));
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

  private async editorialArtifactView(row: any, artifactType: string): Promise<any> {
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
      const pack = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, value.material_pack_ref.object_id, value.material_pack_ref.object_version) as any);
      if (!matches(pack, value.material_pack_ref) || pack.lifecycle_status !== "sufficient") staleReasons.push("material_pack_changed");
      const duration = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, value.duration_feasibility_ref.object_id) as any);
      if (!matches(duration, value.duration_feasibility_ref) || duration.lifecycle_status !== "feasible") staleReasons.push("duration_feasibility_changed");
      for (const reference of value.skill_evaluation_refs ?? []) { const evaluation = await this.skillEvaluationView(readSkillEvaluation(this.session, projectId, reference.object_id, reference.object_version) as any); if (!matches(evaluation, reference) || evaluation.lifecycle_status !== "applicable") staleReasons.push(`skill_evaluation_changed:${reference.object_id}`); }
    }
    if (artifactType === "direction_card" && value.status === "selected") {
      const reference = value.selection_decision_ref, decision = reference ? await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "decision_record", reference.object_id, reference.object_version) as any, "decision_record") : null;
      if (!matches(decision, reference) || decision.lifecycle_status !== "approved" || decision.value?.decision_type !== "direction_selection" || !decision.value?.selected_refs?.some((candidate: any) => candidate.object_id === value.direction_id && candidate.object_version === value.object_version - 1)) staleReasons.push("direction_selection_decision_changed");
    }
    if (artifactType === "decision_record") {
      const localType = value.decision_type === "direction_selection" ? "direction_card" : ["story_approval", "override"].includes(value.decision_type) ? "story_proposal_v2" : null;
      const candidateKeys = new Set<string>((value.candidate_refs ?? []).map((reference: any) => canonicalEditorialObject(reference))), outcomeRefs = [...(value.selected_refs ?? []), ...(value.rejected_refs ?? [])], outcomeKeys = new Set<string>(outcomeRefs.map((reference: any) => canonicalEditorialObject(reference)));
      if (!localType || candidateKeys.size !== (value.candidate_refs ?? []).length || outcomeKeys.size !== outcomeRefs.length || candidateKeys.size !== outcomeKeys.size || [...candidateKeys].some((key) => !outcomeKeys.has(key))) staleReasons.push("decision_outcomes_changed");
      else for (const reference of value.candidate_refs ?? []) { const target = readEditorialArtifact(this.session, projectId, localType, reference.object_id, reference.object_version) as any; if (!matches(target, reference)) staleReasons.push(`decision_candidate_changed:${reference.object_id}`); }
      const [packRef, durationRef] = value.evidence_refs ?? [], pack = packRef ? await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, packRef.object_id, packRef.object_version) as any) : null, duration = durationRef ? await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, durationRef.object_id) as any) : null;
      if (!matches(pack, packRef) || pack.lifecycle_status !== "sufficient") staleReasons.push("decision_material_pack_changed");
      if (!matches(duration, durationRef) || duration.lifecycle_status !== "feasible") staleReasons.push("decision_duration_feasibility_changed");
    }
    if (["story_proposal_v2", "approved_story_plan_v2"].includes(artifactType)) { const direction = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "direction_card", value.direction_ref.object_id, value.direction_ref.object_version) as any, "direction_card"); if (!matches(direction, value.direction_ref) || direction.lifecycle_status !== "selected") staleReasons.push("direction_changed"); }
    if (artifactType === "approved_story_plan_v2") { const proposal = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "story_proposal_v2", value.proposal_ref.object_id, value.proposal_ref.object_version) as any, "story_proposal_v2"), decision = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "decision_record", value.decision_ref.object_id, value.decision_ref.object_version) as any, "decision_record"); if (!matches(proposal, value.proposal_ref) || proposal.lifecycle_status !== "candidate") staleReasons.push("story_proposal_changed"); if (!matches(decision, value.decision_ref) || !["approved", "overridden"].includes(decision.lifecycle_status) || !decision.value?.selected_refs?.some((reference: any) => matches(proposal, reference) && canonicalEditorialObject(reference) === canonicalEditorialObject(value.proposal_ref))) staleReasons.push("story_decision_changed"); }
    if (artifactType === "editorial_edit_intent") {
      const plan = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "approved_story_plan_v2", value.approved_story_ref.object_id, value.approved_story_ref.object_version) as any, "approved_story_plan_v2"); if (!matches(plan, value.approved_story_ref) || plan.lifecycle_status !== "approved") staleReasons.push("approved_story_changed");
      for (const reference of value.decision_refs ?? []) { const decision = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "decision_record", reference.object_id, reference.object_version) as any, "decision_record"); if (!matches(decision, reference) || !["approved", "overridden"].includes(decision.lifecycle_status)) staleReasons.push(`decision_changed:${reference.object_id}`); }
      const capability = readEditorialArtifact(this.session, projectId, "capability_snapshot", value.capability_snapshot_ref.object_id, value.capability_snapshot_ref.object_version) as any, expectedCapabilities = [...HOST_SEMANTIC_CAPABILITIES].sort(); if (!matches(capability, value.capability_snapshot_ref) || capability.value?.producer !== "project-host" || capability.value?.source_version !== EDITORIAL_INTENT_GENERATOR_VERSION || capability.value?.policy_version !== EDITORIAL_INTENT_POLICY_VERSION || canonicalEditorialObject(capability.value?.capabilities) !== canonicalEditorialObject(expectedCapabilities)) staleReasons.push("capability_snapshot_changed");
      const rawTimeline = readLatestTimeline(this.session, projectId), currentVersion = rawTimeline ? Number((JSON.parse(rawTimeline) as any).version) : null; if (currentVersion !== value.base_timeline_version) staleReasons.push("timeline_version_changed");
    }
    return staleReasons.length ? { ...row, lifecycle_status: "stale", stale_reasons: [...new Set(staleReasons)].sort() } : row;
  }

  async createStoryDirection(input: DirectionCardInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    const contract = readCreativeContractVersion(this.session, projectId, input.contract_ref.object_id, input.contract_ref.object_version) as any, pack = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, input.material_pack_ref.object_id, input.material_pack_ref.object_version)) as any, duration = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, input.duration_feasibility_ref.object_id)) as any;
    const evaluations = await Promise.all(input.skill_evaluation_refs.map((reference) => this.skillEvaluationView(readSkillEvaluation(this.session!, projectId, reference.object_id, reference.object_version)) as Promise<any>));
    if (!contract || contract.object_hash !== input.contract_ref.digest || contract.lifecycle_status !== "approved" || !pack || pack.object_hash !== input.material_pack_ref.digest || pack.lifecycle_status !== "sufficient" || !duration || duration.object_hash !== input.duration_feasibility_ref.digest || duration.lifecycle_status !== "feasible" || evaluations.some((evaluation, index) => !evaluation || evaluation.object_hash !== input.skill_evaluation_refs[index]!.digest || evaluation.lifecycle_status !== "applicable")) throw new Error("story direction context is unavailable or stale");
    assertCreativeContractV2(contract.value); assertMaterialEvidencePackV1(pack.value); assertDurationFeasibilityV1(duration.value); evaluations.forEach((evaluation) => assertSkillEvaluationV1(evaluation.value));
    const direction = createDirectionCard(input, contract.value, pack.value, evaluations.map((evaluation) => evaluation.value), duration.value); assertDirectionCardV1(direction);
    const existing = readEditorialArtifactByInput(this.session, projectId, "direction_card", direction.input_fingerprint) as any; if (existing && existing.lifecycle_status !== "stale") { if (existing.object_hash !== editorialObjectDigest(direction)) throw new Error("direction input fingerprint rebound"); return this.editorialArtifactView(existing, "direction_card"); }
    const subject = { object_type: "creative_contract" as const, ...input.contract_ref }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "material_evidence_pack", ...input.material_pack_ref }, ...input.skill_evaluation_refs.map((reference) => ({ object_type: "skill_evaluation" as const, ...reference })), { object_type: "duration_feasibility", ...input.duration_feasibility_ref }], scope = [subject, ...contexts].map(permissionRefKey).sort();
    const gate = this.stage2Gate({ action: "direction_card.generate", subject_ref: subject, context_refs: contexts, requested_data_fields: ["audit_metadata", "bounded_context", "candidate"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("direction_card.generate", direction), reason: "generate deterministic Direction candidate", retain: false });
    return this.commitStage2Mutation(gate, () => registerEditorialArtifact(this.session!, projectId, "direction_card", direction));
  }

  async selectStoryDirection(directionIds: readonly string[], input: Omit<DirectionSelectionInput, "actor_id" | "actor_kind" | "selected_at"> & Readonly<{ approval_id: string }>): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    assertExactInputKeys(input, ["approval_id", "decision_id", "reason", "review_digest", "selected_direction_id"], "direction_card.select");
    const rawRows = directionIds.map((directionId) => readEditorialArtifact(this.session!, projectId, "direction_card", directionId, 1)) as any[];
    if (rawRows.some((row) => !row || row.lifecycle_status !== "candidate")) throw new Error("direction selection candidate is unavailable or stale"); rawRows.forEach((row) => assertDirectionCardV1(row.value));
    const contractRef = rawRows[0]!.value.contract_ref, contract = readCreativeContractVersion(this.session, projectId, contractRef.object_id, contractRef.object_version) as any; if (!contract || contract.object_hash !== contractRef.digest || contract.lifecycle_status !== "approved") throw new Error("direction selection Contract is unavailable or stale"); assertCreativeContractV2(contract.value);
    const selectedRow = rawRows.find((row) => row.value.direction_id === input.selected_direction_id); if (!selectedRow) throw new Error("direction selection target is unavailable");
    const subject = { object_type: "direction_card" as const, object_id: selectedRow.value.direction_id, object_version: selectedRow.value.object_version, digest: selectedRow.object_hash }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "material_evidence_pack", ...selectedRow.value.material_pack_ref }, { object_type: "duration_feasibility", ...selectedRow.value.duration_feasibility_ref }], effect = { direction_ids: [...directionIds].sort(), candidate_refs: rawRows.map((row) => ({ object_id: row.value.direction_id, object_version: row.value.object_version, digest: row.object_hash })).sort((left, right) => left.object_id.localeCompare(right.object_id)), selected_direction_id: input.selected_direction_id, decision_id: input.decision_id, reason: input.reason, review_digest: input.review_digest };
    const permission = this.stage2Gate({ action: "direction_card.select", subject_ref: subject, context_refs: contexts, requested_data_fields: ["alternatives", "reason", "review_digest", "selected_ref"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("direction_card.select", effect), reason: input.reason, approval_id: input.approval_id, retain: false }) as any, human = permission.request.approval;
    const rows = await Promise.all(rawRows.map((row) => this.editorialArtifactView(row, "direction_card"))) as any[]; if (rows.some((row) => row.lifecycle_status !== "candidate")) throw new Error("direction selection candidate is unavailable or stale");
    const result = selectDirectionCard(rows.map((row) => row.value), { ...input, actor_id: human.actor_id, actor_kind: "user", selected_at: human.approved_at }, contract.value); assertDecisionRecordV1(result.decision); assertDirectionCardV1(result.direction);
    const [decision, direction] = this.commitStage2Mutation(permission, () => registerEditorialArtifactBatch(this.session!, projectId, [{ artifact_type: "decision_record", value: result.decision }, { artifact_type: "direction_card", value: result.direction }])) as any[];
    return { decision, direction };
  }

  async proposeStoryV2(input: StoryProposalInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    const direction = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "direction_card", input.direction_ref.object_id, input.direction_ref.object_version), "direction_card") as any;
    const contract = readCreativeContractVersion(this.session, projectId, input.contract_ref.object_id, input.contract_ref.object_version) as any, pack = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, input.material_pack_ref.object_id, input.material_pack_ref.object_version)) as any, duration = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, input.duration_feasibility_ref.object_id)) as any;
    const evaluations = await Promise.all(input.skill_evaluation_refs.map((reference) => this.skillEvaluationView(readSkillEvaluation(this.session!, projectId, reference.object_id, reference.object_version)) as Promise<any>));
    if (!direction || direction.object_hash !== input.direction_ref.digest || direction.lifecycle_status !== "selected" || !contract || contract.object_hash !== input.contract_ref.digest || contract.lifecycle_status !== "approved" || !pack || pack.object_hash !== input.material_pack_ref.digest || pack.lifecycle_status !== "sufficient" || !duration || duration.object_hash !== input.duration_feasibility_ref.digest || duration.lifecycle_status !== "feasible" || evaluations.some((evaluation, index) => !evaluation || evaluation.object_hash !== input.skill_evaluation_refs[index]!.digest || evaluation.lifecycle_status !== "applicable")) throw new Error("story proposal context is unavailable or stale");
    const coverage = readCoverageMatrix(this.session, projectId, pack.value.coverage_matrix_ref) as CoverageMatrix | null; if (!coverage) throw new Error("story coverage matrix is unavailable or stale");
    const proposal = evaluateStoryProposal(input, direction.value, contract.value, pack.value, coverage, evaluations.map((evaluation) => evaluation.value), duration.value); assertStoryProposalV2(proposal);
    const existing = readEditorialArtifactByInput(this.session, projectId, "story_proposal_v2", proposal.input_fingerprint) as any; if (existing && existing.lifecycle_status !== "stale") { if (existing.object_hash !== editorialObjectDigest(proposal)) throw new Error("story proposal input fingerprint rebound"); return this.editorialArtifactView(existing, "story_proposal_v2"); }
    const subject = { object_type: "direction_card" as const, ...input.direction_ref }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...input.contract_ref }, { object_type: "material_evidence_pack", ...input.material_pack_ref }, ...input.skill_evaluation_refs.map((reference) => ({ object_type: "skill_evaluation" as const, ...reference })), { object_type: "duration_feasibility", ...input.duration_feasibility_ref }], scope = [subject, ...contexts].map(permissionRefKey).sort();
    const gate = this.stage2Gate({ action: "story_proposal.generate", subject_ref: subject, context_refs: contexts, requested_data_fields: ["audit_metadata", "bounded_context", "candidate"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("story_proposal.generate", proposal), reason: "generate deterministic Story Proposal", retain: false });
    return this.commitStage2Mutation(gate, () => registerEditorialArtifact(this.session!, projectId, "story_proposal_v2", proposal));
  }

  async approveStoryCandidates(proposalIds: readonly string[], input: Omit<StoryApprovalInput, "actor_id" | "actor_kind" | "approved_at"> & Readonly<{ approval_id: string }>): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    assertExactInputKeys(input, ["approval_id", "decision_id", "plan_id", "reason", "review_digest", "selected_proposal_id"], "story_plan.approve");
    const rawRows = proposalIds.map((proposalId) => readEditorialArtifact(this.session!, projectId, "story_proposal_v2", proposalId, 1)) as any[];
    if (rawRows.some((row) => !row || row.lifecycle_status !== "candidate")) throw new Error("story approval candidate is unavailable or stale"); rawRows.forEach((row) => assertStoryProposalV2(row.value));
    const contractRef = rawRows[0]!.value.contract_ref, contract = readCreativeContractVersion(this.session, projectId, contractRef.object_id, contractRef.object_version) as any; if (!contract || contract.object_hash !== contractRef.digest || contract.lifecycle_status !== "approved") throw new Error("story approval Contract is unavailable or stale"); assertCreativeContractV2(contract.value);
    const selectedRow = rawRows.find((row) => row.value.proposal_id === input.selected_proposal_id); if (!selectedRow) throw new Error("story approval target is unavailable"); const subject = { object_type: "story_proposal_v2" as const, object_id: selectedRow.value.proposal_id, object_version: selectedRow.value.object_version, digest: selectedRow.object_hash }, contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "direction_card", ...selectedRow.value.direction_ref }, { object_type: "material_evidence_pack", ...selectedRow.value.material_pack_ref }, { object_type: "duration_feasibility", ...selectedRow.value.duration_feasibility_ref }], effect = { proposal_ids: [...proposalIds].sort(), candidate_refs: rawRows.map((row) => ({ object_id: row.value.proposal_id, object_version: row.value.object_version, digest: row.object_hash })).sort((left, right) => left.object_id.localeCompare(right.object_id)), selected_proposal_id: input.selected_proposal_id, decision_id: input.decision_id, plan_id: input.plan_id, reason: input.reason, review_digest: input.review_digest }, permission = this.stage2Gate({ action: "story_plan.approve", subject_ref: subject, context_refs: contexts, requested_data_fields: ["alternatives", "reason", "review_digest", "selected_ref"], affected_scope: [permissionRefKey(subject)], effect_digest: stage2PermissionEffectDigest("story_plan.approve", effect), reason: input.reason, approval_id: input.approval_id, retain: false }) as any, human = permission.request.approval;
    const rows = await Promise.all(rawRows.map((row) => this.editorialArtifactView(row, "story_proposal_v2"))) as any[]; if (rows.some((row) => row.lifecycle_status !== "candidate")) throw new Error("story approval candidate is unavailable or stale");
    const result = approveStoryProposalV2(rows.map((row) => row.value), { ...input, actor_id: human.actor_id, actor_kind: "user", approved_at: human.approved_at }, contract.value); assertDecisionRecordV1(result.decision); assertApprovedStoryPlanV2(result.plan);
    const [decision, plan] = this.commitStage2Mutation(permission, () => registerEditorialArtifactBatch(this.session!, projectId, [{ artifact_type: "decision_record", value: result.decision }, { artifact_type: "approved_story_plan_v2", value: result.plan }])) as any[];
    return { decision, plan };
  }

  async generateEditorialIntent(input: EditorialIntentHostInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id;
    const planRow = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, "approved_story_plan_v2", input.plan_id, 1), "approved_story_plan_v2") as any; if (!planRow || planRow.lifecycle_status !== "approved") throw new Error("approved Story Plan is unavailable or stale"); assertApprovedStoryPlanV2(planRow.value);
    const decisionRows = await Promise.all(input.decision_ids.map((decisionId) => this.editorialArtifactView(readEditorialArtifact(this.session!, projectId, "decision_record", decisionId, 1), "decision_record"))) as any[]; if (decisionRows.some((row) => !row || !["approved", "overridden"].includes(row.lifecycle_status))) throw new Error("Editorial Edit Intent decision is unavailable or stale"); decisionRows.forEach((row) => assertDecisionRecordV1(row.value));
    const rawTimeline = readLatestTimeline(this.session, projectId); if (!rawTimeline) throw new Error("timeline is not initialized"); const baseTimelineVersion = Number((JSON.parse(rawTimeline) as any).version);
    const contract = readCreativeContractVersion(this.session, projectId, planRow.value.contract_ref.object_id, planRow.value.contract_ref.object_version) as any; if (!contract || contract.object_hash !== planRow.value.contract_ref.digest || contract.lifecycle_status !== "approved") throw new Error("Editorial Edit Intent Contract is unavailable or stale"); assertCreativeContractV2(contract.value);
    const capabilities = [...HOST_SEMANTIC_CAPABILITIES].sort(), snapshotBase = { schema_version: 1 as const, snapshot_id: input.capability_snapshot_id, object_version: 1, capabilities, created_at: input.created_at, producer: "project-host" as const, source_version: EDITORIAL_INTENT_GENERATOR_VERSION, policy_version: EDITORIAL_INTENT_POLICY_VERSION }, snapshot = { ...snapshotBase, input_fingerprint: editorialObjectDigest(snapshotBase) }, snapshotRef = { object_id: snapshot.snapshot_id, object_version: 1, digest: editorialObjectDigest(snapshot) };
    const planRef = { object_id: planRow.value.plan_id, object_version: planRow.value.object_version, digest: planRow.object_hash }, decisionRefs = decisionRows.map((row) => ({ object_id: row.value.decision_id, object_version: row.value.object_version, digest: row.object_hash }));
    const intent = generateEditorialEditIntent(planRow.value, decisionRows.map((row) => row.value), { ...input, base_timeline_version: baseTimelineVersion, approved_story_ref: planRef, decision_refs: decisionRefs, contract_ref: planRow.value.contract_ref, capability_snapshot_ref: snapshotRef, available_capabilities: new Set(capabilities), protected_refs: contract.value.protected_refs }); assertEditorialEditIntentV1(intent);
    const subject = { object_type: "approved_story_plan_v2" as const, ...planRef }, contexts: Stage2PermissionTypedRef[] = [...decisionRefs.map((reference) => ({ object_type: "decision_record" as const, ...reference })), { object_type: "creative_contract", ...planRow.value.contract_ref }, { object_type: "capability_snapshot", ...snapshotRef }], scope = [subject, ...contexts].map(permissionRefKey).sort();
    const gate = this.stage2Gate({ action: "editorial_edit_intent.generate", subject_ref: subject, context_refs: contexts, requested_data_fields: ["alternatives", "approved_story_ref", "decision_refs", "operations", "reason", "risks"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("editorial_edit_intent.generate", intent), reason: input.reason, retain: false });
    const [, persistedIntent] = this.commitStage2Mutation(gate, () => registerEditorialArtifactBatch(this.session!, projectId, [{ artifact_type: "capability_snapshot", value: snapshot }, { artifact_type: "editorial_edit_intent", value: intent }]), "business_first") as any[];
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
    const baseIntentRow = readEditorialArtifact(this.session, projectId, "editorial_edit_intent", execution.value.intent_ref?.object_id, execution.value.intent_ref?.object_version) as any;
    if (!baseIntentRow || baseIntentRow.object_hash !== execution.value.intent_ref?.digest) throw new Error("FEEDBACK_BASE_INTENT_REBOUND");
    assertEditorialEditIntentV1(baseIntentRow.value);
    const existingDiagnosis = readFeedbackDiagnosis(this.session, projectId, input.diagnosis_id, 1) as any, createdAt = input.created_at ?? existingDiagnosis?.value?.created_at ?? new Date(this.now()).toISOString();
    const authorityRefs = { approved_story_ref: execution.value.story_ref, decision_refs: execution.value.decision_refs, evidence_refs: execution.value.evidence_refs, contract_ref: execution.value.contract_ref, capability_snapshot_ref: execution.value.capability_snapshot_ref };
    const diagnosis = diagnoseFeedbackRevision({ diagnosis_id: input.diagnosis_id, feedback_text: input.feedback_text, base_execution_ref: { object_id: input.base_execution_id, object_version: 1, digest: execution.object_hash }, base_timeline_ref: { version: timeline.version, digest: timelineDigest(timeline) }, target: { track_id: input.target.track_id, clip_id: input.target.clip_id, original_source: timelineSourceRangeContract(clip.source), proposed_source: input.target.proposed_source }, authority_refs: authorityRefs, reason: input.reason, alternatives: input.alternatives, confidence: input.confidence, created_at: createdAt });
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
    const contractRef = intentRow.value.contract_ref, planRef = intentRow.value.approved_story_ref, decisionRefs = intentRow.value.decision_refs as readonly Readonly<{ object_id: string; object_version: number; digest: string }>[], capabilityRef = intentRow.value.capability_snapshot_ref;
    const contexts: Stage2PermissionTypedRef[] = [{ object_type: "creative_contract", ...contractRef }, { object_type: "approved_story_plan_v2", ...planRef }, ...decisionRefs.map((reference) => ({ object_type: "decision_record" as const, ...reference })), { object_type: "capability_snapshot", ...capabilityRef }];
    if (intentRow.value.feedback_diagnosis_ref) {
      const diagnosis = readFeedbackDiagnosis(this.session, projectId, intentRow.value.feedback_diagnosis_ref.object_id, intentRow.value.feedback_diagnosis_ref.object_version) as any;
      if (!diagnosis || diagnosis.object_hash !== intentRow.value.feedback_diagnosis_ref.digest) throw new Error("Editorial Edit Intent feedback diagnosis is unavailable or stale");
      contexts.push({ object_type: "feedback_diagnosis", ...intentRow.value.feedback_diagnosis_ref }, { object_type: "intelligence_edit_execution", ...diagnosis.value.base_execution_ref });
    }
    const scope = [...new Set<string>(intentRow.value.operations.flatMap((operation: any): string[] => Array.isArray(operation?.target_refs) ? operation.target_refs : []))].sort(), contract = readCreativeContractVersion(this.session, projectId, contractRef.object_id, contractRef.object_version) as any; if (!contract || contract.object_hash !== contractRef.digest || contract.lifecycle_status !== "approved") throw new Error("Editorial Edit Intent Contract authority is unavailable or stale");
    const subject: Stage2PermissionTypedRef = { object_type: "editorial_edit_intent", object_id: intentRow.value.intent_id, object_version: intentRow.value.object_version, digest: intentRow.object_hash }, effect = { intent_ref: subject, expected_effects: intentRow.value.operations.map((operation: any) => ({ operation_id: operation.operation_id, expected_effect: operation.expected_effect, target_refs: operation.target_refs })), reason: input.reason, review_digest: input.review_digest };
    const gate = this.stage2Gate({ action: "editorial_edit_intent.approve", subject_ref: subject, context_refs: contexts, requested_data_fields: ["expected_effects", "reason", "review_digest"], affected_scope: scope, effect_digest: stage2PermissionEffectDigest("editorial_edit_intent.approve", effect), reason: input.reason, approval_id: input.approval_id, protected_refs: contract.value.protected_refs, retain: false });
    const current = intentRow.value.feedback_diagnosis_ref ? rawIntentRow : await this.editorialArtifactView(rawIntentRow, "editorial_edit_intent") as any; if (current.lifecycle_status !== "candidate") throw new Error("Editorial Edit Intent approval target is unavailable or stale");
    return this.retainStage2Gate(gate);
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
    const assetTimescales = new Map<string, bigint>(); for (const item of evidence) if (!assetTimescales.has(item.asset_id)) assetTimescales.set(item.asset_id, BigInt(item.timescale));
    const sourceRefs: RenderSourceRef[] = [];
    for (const [assetRef, sourceTimescale] of [...assetTimescales].sort(([left], [right]) => left.localeCompare(right))) {
      const locations = listAssetLocationsForAssets(this.session, projectId, [assetRef]) as readonly PersistedAssetLocation[];
      const original = locations.find((location) => location.location_type === "original" && location.metadata?.permission_state === "authorized" && persistedLocationIsCurrent(location));
      if (!original) throw new Error(`SEMANTIC_ORIGINAL_UNAVAILABLE:${assetRef}`);
      let authoritativeProbe = original.metadata?.probe, originalHasAudio = persistedProbeAudioState(original);
      if (originalHasAudio === undefined) { const verifiedOriginal = await this.inspectMediaCandidate(original.location_ref); if (verifiedOriginal.asset_id !== assetRef) throw new Error(`SEMANTIC_ORIGINAL_IDENTITY_MISMATCH:${assetRef}`); authoritativeProbe = verifiedOriginal.probe; const streams = (authoritativeProbe as { streams?: readonly Readonly<{ codec_type?: string }>[]; timing?: { streams?: Record<string, Readonly<{ codec_type?: string }>> } } | undefined)?.streams ?? Object.values((authoritativeProbe as { timing?: { streams?: Record<string, Readonly<{ codec_type?: string }>> } } | undefined)?.timing?.streams ?? {}); originalHasAudio = streams.length ? streams.some((stream) => stream.codec_type === "audio") : undefined; }
      const originalGeometry = probeVideoGeometry(authoritativeProbe);
      if (originalHasAudio === undefined) throw new Error(`SEMANTIC_ORIGINAL_AUDIO_IDENTITY_UNAVAILABLE:${assetRef}`);
      sourceRefs.push({ asset_ref: assetRef, original_ref: original.location_ref, original_object_ref: original.asset_location_id, source_timescale: sourceTimescale, original_timescale: sourceTimescale, ...(originalGeometry ? { original_width: originalGeometry.width, original_height: originalGeometry.height } : {}), has_audio: originalHasAudio });
    }
    const renderPreflight = resolveTimelineRenderPlans(prepared.timeline, new Map(sourceRefs.map((source) => [source.asset_ref, source])), { name: "semantic-intent-preflight" });
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

  async prepareEditorialIntentExecution(input: EditorialIntentExecutionIdentity): Promise<EditorialIntentExecutionReview> { return (await this.prepareEditorialIntentExecutionInternal(input)).review; }

  async executeApprovedEditorialIntent(input: EditorialIntentExecutionInput): Promise<unknown> {
    if (!this.session) throw new Error("project is not open");
    assertExactInputKeys(input, ["execution_approval_id", "execution_id", "intent_id", "proposal_approval_decision_id", "reason"], "editorial_edit_intent.execute");
    const projectId = this.session.manifest.project_id, existing = readIntelligenceEditExecution(this.session, projectId, input.execution_id) as any;
    if (existing) { const value = existing.value; if (value.intent_ref?.object_id !== input.intent_id || value.proposal_approval_ref?.object_id !== input.proposal_approval_decision_id || value.execution_approval_id !== input.execution_approval_id || value.reason !== input.reason) throw new Error("SEMANTIC_EXECUTION_ID_CONFLICT"); return value; }
    const preparedExecution = await this.prepareEditorialIntentExecutionInternal({ execution_id: input.execution_id, intent_id: input.intent_id, proposal_approval_decision_id: input.proposal_approval_decision_id });
    const review = preparedExecution.review;
    const gate = this.stage2Gate({ action: "editorial_edit_intent.execute", subject_ref: review.subject_ref, context_refs: review.context_refs, requested_data_fields: review.requested_data_fields, affected_scope: review.affected_scope, effect_digest: review.effect_digest, reason: input.reason, approval_id: input.execution_approval_id, protected_refs: preparedExecution.compilation.command_intent.protected_refs, retain: false }) as any;
    return runStage2AtomicMutation(this.session, () => {
      const permission = this.retainStage2Gate(gate) as any;
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

  private async stage2PermissionReferenceView(reference: Stage2PermissionTypedRef): Promise<any> {
    if (!this.session) throw new Error("project is not open"); const projectId = this.session.manifest.project_id; let row: any;
    if (reference.object_type === "creative_contract") { row = readCreativeContractVersion(this.session, projectId, reference.object_id, reference.object_version) as any; const head = readCreativeContractHead(this.session, projectId, reference.object_id) as any; if (!row || !head || head.object_version !== reference.object_version || head.object_hash !== reference.digest) return null; }
    else if (reference.object_type === "evidence_object") row = readEvidenceObject(this.session, reference.object_id) as any;
    else if (reference.object_type === "material_evidence_pack") row = await this.materialEvidencePackView(readMaterialEvidencePack(this.session, projectId, reference.object_id, reference.object_version) as any);
    else if (reference.object_type === "creative_skill_definition") { row = readCreativeSkillDefinition(this.session, projectId, reference.object_id, reference.object_version) as any; const control = readCreativeSkillDefinitionControl(this.session, projectId, reference.object_id, reference.object_version) as any; if (!control || control.availability !== "active") return null; }
    else if (reference.object_type === "skill_evaluation") row = await this.skillEvaluationView(readSkillEvaluation(this.session, projectId, reference.object_id, reference.object_version) as any);
    else if (reference.object_type === "duration_blueprint") row = readDurationBlueprint(this.session, projectId, reference.object_id, reference.object_version) as any;
    else if (reference.object_type === "duration_feasibility") row = await this.durationFeasibilityView(readDurationFeasibility(this.session, projectId, reference.object_id) as any);
    else if (reference.object_type === "permission_decision") row = await this.stage2PermissionDecisionView(readStage2PermissionDecision(this.session, projectId, reference.object_id, reference.object_version) as any);
    else if (reference.object_type === "feedback_diagnosis") row = this.feedbackDiagnosisView(readFeedbackDiagnosis(this.session, projectId, reference.object_id, reference.object_version) as any);
    else if (reference.object_type === "intelligence_edit_execution") { const execution = readIntelligenceEditExecution(this.session, projectId, reference.object_id) as any; row = execution && reference.object_version === 1 ? { ...execution, lifecycle_status: execution.value?.status } : null; }
    else row = await this.editorialArtifactView(readEditorialArtifact(this.session, projectId, reference.object_type, reference.object_id, reference.object_version) as any, reference.object_type);
    const referenceDigest = reference.object_type === "creative_skill_definition" || reference.object_type === "duration_blueprint" ? row?.definition_digest : row?.object_hash;
    if (!row || referenceDigest !== reference.digest || row.lifecycle_status === "stale" || ["rejected", "superseded"].includes(row.lifecycle_status)) return null;
    return row;
  }

  private async stage2PermissionAuthority(request: Stage2PermissionRequestV1): Promise<Readonly<{ current_ref_keys: ReadonlySet<string>; authoritative_scope: readonly string[]; protected_refs: readonly string[]; now_ms: number }>> {
    const refs = [request.subject_ref, ...request.context_refs], rows = await Promise.all(refs.map((reference) => this.stage2PermissionReferenceView(reference)));
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

  private async stage2PermissionDecisionView(row: any): Promise<any> {
    if (!row || !this.session) return row; const value = row.value as Stage2PermissionDecisionV1, stale: string[] = [];
    try {
      assertStage2PermissionDecisionV1(value);
      const snapshot = readStage2PermissionPolicySnapshot(this.session, this.session.manifest.project_id, value.policy_snapshot_ref.object_id, value.policy_snapshot_ref.object_version) as any, builtIn = createBuiltInStage2PermissionPolicySnapshot();
      if (!snapshot || snapshot.object_hash !== value.policy_snapshot_ref.digest || snapshot.value?.policy_version !== STAGE2_PERMISSION_POLICY_VERSION || editorialObjectDigest(snapshot.value) !== editorialObjectDigest(builtIn)) stale.push("permission_policy_changed");
      const request: Stage2PermissionRequestV1 = { schema_version: 1, request_id: value.decision_id.replace(/^permission:/, ""), actor: value.actor, action: value.action, subject_ref: value.subject_ref, context_refs: value.context_refs, policy_snapshot_ref: value.policy_snapshot_ref, effect_digest: value.effect_digest, requested_data_fields: value.allowed_data_fields, affected_scope: value.affected_scope, reason: value.request_reason, requested_at: value.created_at, ...(value.approval ? { approval: value.approval } : {}) };
      const evaluation = evaluateStage2Permission(request, builtIn, await this.stage2PermissionAuthority(request));
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
    assertStage2PermissionRequestV1(request); const authority = await this.stage2PermissionAuthority(request), evaluation = evaluateStage2Permission(request, snapshot, authority);
    if (evaluation.classification !== "exact_human_approval_required") { const missing = [request.subject_ref, ...request.context_refs].filter((reference) => !authority.current_ref_keys.has(permissionRefKey(reference))).map((reference) => `${reference.object_type}:${reference.object_id}`).join(","); throw new Error(`PERMISSION_APPROVAL_TARGET_INVALID:${evaluation.reason_code}${missing ? `:${missing}` : ""}`); }
    const approval = { approval_id: input.approval_id, action: input.action, actor_id: actorId, actor_kind: "human_user" as const, request_fingerprint: permissionRequestFingerprint(request), subject_ref: { ...input.subject_ref }, context_refs: input.context_refs.map((reference) => ({ ...reference })), policy_snapshot_ref: policyRef, effect_digest: input.effect_digest, affected_scope: [...input.affected_scope].sort(), review_digest: input.effect_digest, approved_at: approvedAt, expires_at: input.expires_at };
    return registerStage2HumanApproval(this.session, this.session.manifest.project_id, approval);
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

  registerApprovedStoryPlan(plan: Record<string, unknown>): void { if (!this.session) throw new Error("project is not open"); registerApprovedStoryPlan(this.session, this.session.manifest.project_id, plan); }
  readApprovedStoryPlan(planId: string): unknown { if (!this.session) throw new Error("project is not open"); return readApprovedStoryPlan(this.session, planId); }

  registerAssemblyCut(cut: Record<string, unknown>): void {
    if (!this.session) throw new Error("project is not open");
    const plan = readApprovedStoryPlan(this.session, cut.approved_plan_id as string) as any;
    if (!plan) throw new Error("assembly plan not found");
    const clips = Array.isArray(cut.clips) ? cut.clips as Array<Record<string, unknown>> : [];
    const evidence = new Set<string>(); for (const clip of clips) for (const id of (Array.isArray(clip.evidence_ids) ? clip.evidence_ids : [])) if (readEvidence(this.session, id as string)) evidence.add(id as string);
    const validated = validateAssemblyCut(cut as any, plan, evidence);
    registerAssemblyCut(this.session, this.session.manifest.project_id, validated);
  }
  readAssemblyCut(assemblyId: string): unknown { if (!this.session) throw new Error("project is not open"); return readAssemblyCut(this.session, assemblyId); }

  compileAssemblyToTimeline(assemblyId: string, trackId: string, baseVersion: number): ProjectHostStatus {
    const cut = revive(this.readAssemblyCut(assemblyId)) as any;
    if (!cut) throw new Error("assembly cut not found");
    const operations = compileAssemblyToEditIR(cut);
    const raw = readLatestTimeline(this.session!, this.session!.manifest.project_id); if (!raw) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(raw)) as Timeline; if (timeline.version !== baseVersion) throw new Error(`timeline version conflict: expected ${timeline.version}, received ${baseVersion}`);
    const targetTrack = timeline.tracks.find((track) => track.track_id === trackId); if (!targetTrack) throw new Error("track not found");
    const commands: TimelineCommand[] = []; let timelineStart = targetTrack.clips.reduce((end, clip) => { const clipEnd = clip.timeline_start + clip.timeline_duration; return clipEnd > end ? clipEnd : end; }, 0n);
    for (const operation of operations) {
      const rawStartPts = typeof operation.start_pts === "bigint" ? operation.start_pts : BigInt(operation.start_pts); const rawEndPts = typeof operation.end_pts === "bigint" ? operation.end_pts : BigInt(operation.end_pts);
      const location = (listAssetLocationsForAssets(this.session!, this.session!.manifest.project_id, [operation.asset_id]) as readonly PersistedAssetLocation[]).find((candidate) => candidate.location_type === "original" && persistedLocationIsCurrent(candidate));
      const video = (location?.metadata?.probe as { streams?: readonly Readonly<{ codec_type?: string; time_base?: string }>[] } | undefined)?.streams?.find((stream) => stream.codec_type === "video");
      const match = video?.time_base?.match(/^(\d+)\/(\d+)$/);
      if (!match) throw new Error(`ASSEMBLY_STREAM_TIMEBASE_REQUIRED:${operation.asset_id}`);
      const timebaseNumerator = BigInt(match[1]); const timebaseDenominator = BigInt(match[2]);
      const startPts = rawStartPts * timebaseNumerator; const endPts = rawEndPts * timebaseNumerator;
      const sourceDuration = rationalTime(endPts - startPts, timebaseDenominator);
      const sequenceTick = timeline.sequence?.timebase;
      const duration = sequenceTick ? divideRounded(sourceDuration.value * sequenceTick.timescale, sourceDuration.timescale * sequenceTick.value, "nearest") : sourceDuration.value;
      const command = { type: "add_clip" as const, track_id: trackId, clip: { clip_id: operation.clip_id, source: sourceRange(operation.asset_id, startPts, endPts, timebaseDenominator), timeline_start: timelineStart, timeline_duration: duration } };
      commands.push(command); timelineStart += duration;
    }
    return this.commitCommands(timeline, commands, { semantic_refs: [assemblyId], producer: "assembly", actor_id: assemblyId, provenance_id: assemblyId, reason: "compile validated Assembly Cut", expected_effects: ["assembly clips added through Edit IR"] });
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

  registerFeedbackDiagnosis(diagnosis: any, issues: readonly any[]): void { if (!this.session) throw new Error("project is not open"); const reviewed = reviewFeedback(diagnosis, issues); registerReviewArtifact(this.session, this.session.manifest.project_id, { artifact_id: reviewed.diagnosis_id, artifact_type: "diagnosis", value: reviewed }); }
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
