export { readMediaSceneIndex, type DecodedFrameIndex } from "./scene-evidence.mjs";
export type ProjectStorageBoundary = Readonly<{ databaseFile: string; objectStoreDirectory: string }>;
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { recordPersistentRenderDiagnostic, readPersistentRenderDiagnostic, listCreationRenderFailures } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { readCreationLearningEvent, readCreationLearningAttempt, registerCreationLearningAttempt, readCreationLearningModelResult, readCreationLearningResult, registerCreationLearningResult, hasRecoverableCreationLearning } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { readCreationObservation, registerCreationObservation, validateCreationObservationOutput, creationObservationSpans, creationMaterialObservationSpans, validateCreationObservationSamples, validatedObservationPcm } from "./project-storage.mjs";
export { openVerifiedObservationAudioFile, type VerifiedObservationAudioFile } from "./observation-audio-file.mjs";
export { registerCreationAudioStreamRoot, selectCreationAudioStreamChunk, assertCurrentCreationAudioStreamSelection, reserveCreationAudioStreamCall, settleCreationAudioStreamCall, recoverCreationAudioStreamCall, recoverCreationAudioStreamCallIfPresent, type CreationAudioStreamSelection } from "./creation-audio-stream-store.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { listCreationProductionFailures, readCreationState, readCreationGuardState, readCreationLearningObject, listCreationStates, registerCreationState, creationStateArtifact, readCreationWorkspaceSnapshot, creationWorkspaceReadIdentity, captureCreationRead } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { findCreationPlanningResumeCandidate, registerCreationPlanningResume, readCreationPlanningResume } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { readCreationAudioMeasurement, readCreationRetainedAudio, readCreationMaterial, listCreationMaterials, registerCreationMaterial } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { recoverCreationRenderReadiness, readCreationDraftExecution, readCreationRender, listCreationRenders, hasCreationRenderFailure } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { openUserProfileDatabase } from "./user-profile-storage.mjs";
export type ProjectManifest = Readonly<{ project_id: string; project_format_version: 2; database: "project.sqlite"; created_at: string; portable: boolean }>;
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { registerModelRun, listModelRuns, readModelRun, registerCreationModelResult } from "./project-storage.mjs";

// Runtime implementation remains inside this package; consumers use this public entrypoint.
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { registerCreationProxyFile, registerRenderSegmentCheckpoint, readRenderSegmentCheckpoint } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { createProject, openProject, putObject, putObjectSync, putObjectAndRegister, registerObjectRef, readObject, readObjectSync, listOrphanObjects, auditObjectStore, commitTimeline, commitTimelinePlan, readLatestTimeline, readTimelineAtVersion, readLatestTimelineCommand, readTimelineRedo, readPresetApplication, listPresetApplications, registerPresetApplicationBlocker, readLatestRender, readLatestRenderResult, listRenderResults, registerRenderBundle, registerRenderBundleAsync, readRenderBundle, readRenderBundleByIdempotency, registerAssetLocation, setAssetLocationPermission, listAssetLocations, listAssetLocationsForAssets, registerMediaAsset, readMediaAsset, registerMediaRelation, registerMediaDependency, markMediaDependenciesStale, listMediaDependencies, registerEvidence, readEvidence, readEvidenceObject, listEvidenceObjects, registerCreativeContractVersion, readCreativeContractVersion, readCreativeContractHead, listCreativeContractVersions, listCreativeContractHeads, registerCreativeContractDecision, readCreativeContractDecision, registerMaterialEvidencePack, readMaterialEvidencePack, readMaterialEvidencePackByInput, listMaterialEvidencePacks, readStage2WorkspaceSnapshot, registerCreativeSkillDefinition, readCreativeSkillDefinition, listCreativeSkillDefinitions, readCreativeSkillDefinitionControl, setCreativeSkillDefinitionAvailability, registerSkillEvaluation, readSkillEvaluation, readSkillEvaluationByInput, listSkillEvaluations, registerReviewArtifact, listReviewArtifacts, readReviewArtifact, listRenderManifests, registerReactionTiming, readReactionTiming, registerDeliveryRecord, listDeliveryRecords, readDeliveryRecord, registerExport, listExports, readExport, createPersistentJob, readPersistentJobByIdempotency, readPersistentJob, listPersistentJobs, readPersistentJobAttempts, startPersistentJob, updatePersistentJobProgress, finishPersistentJob, recoverPersistentJobs } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { registerDurationBlueprint, readDurationBlueprint, listDurationBlueprints, registerDurationFeasibility, readDurationFeasibility, readDurationFeasibilityByInput, listDurationFeasibilities } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { registerEditorialArtifact, registerEditorialArtifactBatch, readEditorialArtifact, readEditorialArtifactByInput, listEditorialArtifacts, listEditorialArtifactEdges, readCoverageMatrix } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { readStage2PermissionPolicySnapshot, readStage2PermissionDecision, readStage2PermissionDecisionByInput, listStage2PermissionDecisions, listStage2PermissionDecisionEdges } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { registerFeedbackDiagnosis, readFeedbackDiagnosis, readFeedbackDiagnosisByInput, listFeedbackDiagnoses, listFeedbackDiagnosisEdges } from "./project-storage.mjs";
// Host-authority mutators are exported only because repository architecture
// requires cross-package imports through public.ts; their runtime boundary
// independently validates policy, classification, refs and fingerprints.
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { registerStage2PermissionAuthorization, registerStage2HumanApproval, readStage2HumanApproval, runStage2AtomicMutation } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { readIntelligenceEditExecution } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { approveEvidence } from "./project-storage.mjs";

// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { readCreationUiState, saveCreationUiState } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { listCreationConversationRevisionEvents, readTimelineAnnotationRevisionMessage, readTimelineAnnotationMessages, readTimelineAnnotationMessageByOperation, readTimelineAnnotationProcessingEvents, readTimelineAnnotationProcessingByOperation, registerTimelineAnnotationMessage, registerTimelineAnnotationProcessingEvent } from "./timeline-annotations.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { registerOriginalMedia, registerImportedMedia, saveMediaImportBatch, readMediaImportBatch, listMediaImportBatches, readMediaImportSource, listMediaImportSources } from "./project-storage.mjs";
// @ts-expect-error runtime .mjs boundary intentionally has no generated declaration.
export { deleteProjectFiles } from "./project-storage.mjs";
