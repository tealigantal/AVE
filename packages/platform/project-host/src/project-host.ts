import { createProject, openProject, commitTimeline, commitTimelinePlan, readLatestTimeline, readTimelineAtVersion, readLatestTimelineCommand, readTimelineRedo, readPresetApplication, listPresetApplications, registerPresetApplicationBlocker, registerRender, readLatestRender, registerRenderBundle, listRenderResults, registerAssetLocation, listAssetLocations, listAssetLocationsForAssets, registerMediaAsset, registerMediaRelation, registerMediaDependency as persistMediaDependency, markMediaDependenciesStale, listMediaDependencies, registerEvidence, readEvidence, listApprovedStoryPlans, readApprovedStoryPlan, registerApprovedStoryPlan, registerAssemblyCut, readAssemblyCut, listReviewArtifacts, readReviewArtifact, registerReviewArtifact, listRenderManifests, registerReactionTiming, readReactionTiming, listDeliveryRecords, registerDeliveryRecord, readDeliveryRecord, registerExport, listExports, readExport, putObjectAndRegister, registerModelRun, listModelRuns, createPersistentJob, readPersistentJob, readPersistentJobByIdempotency, listPersistentJobs, startPersistentJob, updatePersistentJobProgress, finishPersistentJob, recoverPersistentJobs } from "../../project-storage/src/public.js";
import { applyCommand, assertValidTimeline, inverseCommand, commitPlanPayload, createCommitPlan, simulateCommands } from "../../../core/timeline-core/src/public.js";
import { validateAssemblyCut, compileAssemblyToEditIR } from "../../../features/assembly-cut/src/public.js";
import { validateStoryProposal } from "../../../features/story-planning/src/public.js";
import { validateRoughCutPatch } from "../../../features/rough-cut/src/public.js";
import { validateDelivery, approveRights, validateExportRegistration, validateExportProfile, exportCapabilities } from "../../../features/delivery/src/public.js";
import { approvePrivacy } from "../../../features/privacy/src/public.js";
import { reviewFeedback, validateCompare, validateReactionTiming } from "../../../features/feedback/src/public.js";
import { assetIdFromFingerprint, sourceRange, type AssetId, type ContentFingerprint } from "../../../core/media-identity/src/public.js";
import { createHash } from "node:crypto";
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
import { resolveCommandEditIntent, type CommandEditIntent, type CommandEditIR, type EditPrecondition, type EditProducer } from "../../../core/edit-ir/src/public.js";
import { divideRounded, rationalTime } from "../../../core/timebase/src/public.js";

export type ProjectHostStatus = Readonly<{ project: string; timeline: string; render: string; qc: string }>;
export type QcRequirements = Readonly<{ loudness?: Readonly<{ target_lufs: number; tolerance_lufs?: number; true_peak_db?: number }>; planned_freeze?: boolean; planned_silence?: boolean; subtitle_bounds?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; missing_effects?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; sponsor?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; privacy?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }> }>;
export function renderBundleIdentity(previewCacheKey: string, masterCacheKey: string, qcRequirements: QcRequirements = {}, provenanceKey?: string): string { return createHash("sha256").update(canonicalSerialize({ preview_cache_key: previewCacheKey, master_cache_key: masterCacheKey, qc_requirements: qcRequirements, ...(provenanceKey ? { provenance_key: provenanceKey } : {}) })).digest("hex"); }
export type TimelineRenderOptions = Readonly<{ sources: readonly RenderSourceRef[]; outputDirectory?: string; profile?: RenderProfile; range?: RenderRange; qcRequirements?: QcRequirements }>;
export type ProjectHostOptions = Readonly<{
  modelProvider?: ModelProvider;
  model?: string;
  provider?: string;
  presetDefinitions?: readonly PresetDefinition[];
  trustedPresetDigests?: readonly string[];
  revokedPresetDigests?: readonly string[];
  presetLicenseStatuses?: Readonly<Record<string, "unknown" | "pending" | "approved" | "expired" | "revoked">>;
}>;
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
    verification_status?: string;
    source_asset_id?: string;
    fingerprint?: Readonly<{ algorithm?: string; digest?: string; byte_length?: number }>;
    file_stat?: Readonly<{ size?: number; mtime_ms?: number }>;
    probe?: unknown;
    proxy_map?: unknown;
  }>;
}>;
const IDEMPOTENT_WORKER_TASKS = new Set(["analysis.v1", "media.probe.v1", "media.decode_check.v1", "media.fingerprint.v1", "media.proxy.v1", "media.proxy.map.v1", "media.thumbnail.v1", "media.waveform.v1", "render.preview.v1", "render.master.v1", "render.timeline.v1", "qc.master.v1"]);

type MediaFingerprintOutput = Readonly<{ kind: "media.fingerprint"; algorithm: "sha256"; digest: string; byte_length: number }>;
type MediaProbeOutput = Readonly<{ kind: "media.probe"; value: unknown }>;
type WorkerResult<Output> = Readonly<{ status?: string; outputs?: readonly Output[]; diagnostics?: readonly Readonly<{ code?: string; message?: string }>[] }>;
export type VerifiedMediaCandidate = Readonly<{ asset_id: AssetId; fingerprint: ContentFingerprint; path: string; verified_at: string; file_stat: Readonly<{ size: number; mtime_ms: number }>; probe: unknown }>;
export type AtomicEditArtifact = Readonly<{ object_ref_id: string; object_type: string; version?: number; relation_key?: string; value: unknown; metadata?: Readonly<Record<string, unknown>> }>;
type PreparedEdit = Readonly<{ ir: CommandEditIR; timeline: Timeline; plan: ReturnType<typeof createCommitPlan>["plan"] }>;

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

  constructor(options: ProjectHostOptions = {}) {
    this.modelProvider = options.modelProvider;
    this.modelName = options.model ?? "qwen-plus";
    this.modelProviderName = options.provider ?? "qwen";
    for (const definition of options.presetDefinitions ?? []) { assertPresetDefinitionV1(definition); this.presetRegistry.register(definition); }
    this.trustedPresetDigests = new Set(options.trustedPresetDigests ?? []);
    this.revokedPresetDigests = new Set(options.revokedPresetDigests ?? []);
    this.presetLicenseStatuses = new Map(Object.entries({ "ave-built-in": "approved" as const, ...(options.presetLicenseStatuses ?? {}) }));
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
      const base: RenderSourceRef = { asset_ref: assetId, original_ref: original.location_ref, original_object_ref: original.asset_location_id, source_timescale: sourceTimescale, original_timescale: sourceTimescale, has_audio: originalHasAudio };
      if (proxy?.metadata?.proxy_map) {
        try {
          const proxyHasAudio = persistedProbeAudioState(proxy);
          if (proxyHasAudio === undefined) { diagnostics.push({ code: "PRESET_PROXY_AUDIO_UNVERIFIED", message: `Preset render validation requires persisted Proxy audio probe facts: ${assetId}` }); continue; }
          if (proxyHasAudio !== originalHasAudio) { diagnostics.push({ code: "PRESET_PROXY_AUDIO_MISMATCH", message: `Preset render validation cannot represent divergent Original/Proxy audio identity: ${assetId}` }); continue; }
          const proxyMap = reviveProxyMap(proxy.metadata.proxy_map);
          sources.set(assetId, { ...base, proxy_ref: proxy.location_ref, proxy_object_ref: proxy.asset_location_id, proxy_timescale: proxyMap.proxy_timebase, proxy_map: proxyMap });
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
      if (proxy) {
        const verifiedProxy = await this.inspectMediaCandidate(proxy.location_ref);
        if (verifiedProxy.fingerprint.digest !== proxy.metadata?.fingerprint?.digest || proxy.metadata?.source_asset_id !== source.asset_ref) throw new Error(`PROXY_IDENTITY_MISMATCH:${source.asset_ref}`);
        proxyMap ??= proxy.metadata?.proxy_map ? reviveProxyMap(proxy.metadata.proxy_map) : undefined;
      }
      const resolvedSource: RenderSourceRef = { ...source, original_ref: original.location_ref, original_object_ref: original.asset_location_id, ...(proxy ? { proxy_ref: proxy.location_ref, proxy_object_ref: proxy.asset_location_id } : {}), ...(proxyMap ? { proxy_map: proxyMap } : {}) };
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
    registerEvidence(this.session, this.session.manifest.project_id, evidence);
  }

  readEvidence(evidenceId: string): unknown {
    if (!this.session) throw new Error("project is not open");
    return readEvidence(this.session, evidenceId);
  }

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
