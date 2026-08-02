import { createProject, openProject, commitTimeline, commitTimelinePlan, readLatestTimeline, readTimelineAtVersion, readLatestTimelineCommand, readTimelineRedo, registerRender, readLatestRender, registerRenderResult, listRenderResults, registerAssetLocation, listAssetLocations, registerEvidence, readEvidence, listApprovedStoryPlans, readApprovedStoryPlan, registerApprovedStoryPlan, registerAssemblyCut, readAssemblyCut, listReviewArtifacts, readReviewArtifact, registerReviewArtifact, registerRenderManifest, listRenderManifests, registerReactionTiming, readReactionTiming, listDeliveryRecords, registerDeliveryRecord, readDeliveryRecord, registerExport, listExports, readExport, putObjectAndRegister, registerModelRun, listModelRuns, createPersistentJob, readPersistentJob, readPersistentJobByIdempotency, listPersistentJobs, startPersistentJob, updatePersistentJobProgress, finishPersistentJob, recoverPersistentJobs } from "../../project-storage/src/public.js";
import { applyCommand, assertValidTimeline, inverseCommand, commitPlanPayload, createCommitPlan, simulateCommands } from "../../../core/timeline-core/src/public.js";
import { validateAssemblyCut, compileAssemblyToEditIR } from "../../../features/assembly-cut/src/public.js";
import { validateStoryProposal } from "../../../features/story-planning/src/public.js";
import { validateRoughCutPatch } from "../../../features/rough-cut/src/public.js";
import { validateDelivery, approveRights, validateExportRegistration, validateExportProfile, exportCapabilities } from "../../../features/delivery/src/public.js";
import { approvePrivacy } from "../../../features/privacy/src/public.js";
import { reviewFeedback, validateCompare, validateReactionTiming } from "../../../features/feedback/src/public.js";
import { sourceRange } from "../../../core/media-identity/src/public.js";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
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

export type ProjectHostStatus = Readonly<{ project: string; timeline: string; render: string; qc: string }>;
export type QcRequirements = Readonly<{ loudness?: Readonly<{ target_lufs: number; tolerance_lufs?: number }>; subtitle_bounds?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; missing_effects?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; sponsor?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }>; privacy?: Readonly<{ satisfied: boolean; message?: string; evidence?: readonly string[] }> }>;
export type TimelineRenderOptions = Readonly<{ sources: readonly RenderSourceRef[]; outputDirectory?: string; profile?: RenderProfile; range?: RenderRange; qcRequirements?: QcRequirements }>;
export type ProjectHostOptions = Readonly<{ modelProvider?: ModelProvider; model?: string; provider?: string }>;

function revive(value: unknown): unknown {
  if (typeof value === "string" && /^-?\d+n$/.test(value)) return BigInt(value.slice(0, -1));
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, revive(item)]));
  return value;
}

function reviveProxyMap(value: any): any {
  const time = (point: any) => ({ value: BigInt(point.value), timescale: BigInt(point.timescale) });
  return { schema_version: 1, original_timebase: BigInt(value.original_timebase), proxy_timebase: BigInt(value.proxy_timebase), segments: (value.segments ?? []).map((segment: any) => ({ original_start: time(segment.original_start), original_end: time(segment.original_end), proxy_start: time(segment.proxy_start), proxy_end: time(segment.proxy_end) })), ...(value.audio ? { audio: { original_sample_rate: BigInt(value.audio.original_sample_rate), proxy_sample_rate: BigInt(value.audio.proxy_sample_rate) } } : {}) };
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

  constructor(options: ProjectHostOptions = {}) {
    this.modelProvider = options.modelProvider;
    this.modelName = options.model ?? "qwen-plus";
    this.modelProviderName = options.provider ?? "qwen";
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
    if (!this.jobEngine) return this.workerPort.submit<TInput, TResult>(taskType, input, control);
    const idempotencyKey = `${taskType}:${hashJobInput(input)}`;
    const execution = await this.jobEngine.execute(taskType, input, idempotencyKey, ({ job_id, signal, progress }) => this.workerPort.submit<TInput, any>(taskType, input, { ...control, jobId: job_id, signal, onProgress: progress }) as any, { jobId: control?.jobId, signal: control?.signal });
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

  async importMedia(paths: readonly string[]): Promise<readonly unknown[]> {
    if (!this.session) throw new Error("project is not open");
    if (paths.length === 0) throw new Error("没有选择素材");
    const imported = [];
    for (const inputPath of paths) {
      const fingerprint = await this.submitWorkerJob<any, any>("media.fingerprint.v1", { input_path: inputPath });
      const value = fingerprint.outputs?.find((output: any) => output.kind === "media.fingerprint");
      if (!value?.digest || value.algorithm !== "sha256") throw new Error("素材指纹结果无效");
      const probe = await this.submitWorkerJob<any, any>("media.probe.v1", { input_path: inputPath });
      const probeOutput = probe.outputs?.find((output: any) => output.kind === "media.probe");
      const assetId = `asset:sha256:${value.digest}`;
      const location = { asset_location_id: `${this.session.manifest.project_id}:${assetId}:original`, asset_id: assetId, location_type: "original", location_ref: inputPath, metadata: { byte_length: value.byte_length, probe: probeOutput?.value ?? null } };
      registerAssetLocation(this.session, this.session.manifest.project_id, location);
      imported.push({ ...location, probe: probeOutput?.value ?? null });
    }
    return imported;
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

  private commitCommands(base: Timeline, commands: readonly TimelineCommand[], metadata: { semantic_refs?: readonly string[] } = {}, redo: { commands: readonly TimelineCommand[]; baseVersion: number } | null = null): ProjectHostStatus {
    const draft = createCommitPlan(base, commands, metadata);
    const planHash = createHash("sha256").update(commitPlanPayload(draft.plan)).digest("hex");
    const plan = { ...draft.plan, plan_hash: planHash };
    commitTimelinePlan(this.session!, this.session!.manifest.project_id, draft.timeline, plan, redo);
    this.currentStatus = { ...this.currentStatus, timeline: `v${draft.timeline.version}` };
    return this.currentStatus;
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
    const outputDirectory = options.outputDirectory ?? resolve(this.projectDirectory, "renders");
    const worker = this.persistentWorkerPort();
    const resolvedSources = await Promise.all(options.sources.map(async (source) => {
      if (!source.proxy_map && source.original_ref && source.proxy_ref && source.proxy_ref !== source.original_ref) {
        const mapResult = await worker.submit<any, any>("media.proxy.map.v1", { original_path: source.original_ref, proxy_path: source.proxy_ref });
        const proxyMap = mapResult.outputs?.find((output: any) => output.kind === "proxy-map")?.proxy_map;
        if (!proxyMap) throw new Error(`PROXY_MAP_MISSING:${source.asset_ref}`);
        return { ...source, proxy_map: reviveProxyMap(proxyMap) } as RenderSourceRef;
      }
      return source;
    }));
    const sources = new Map(resolvedSources.map((source) => [source.asset_ref, source]));
    const build = (target: "preview" | "master") => {
      const graph = buildTimelineRenderGraph(timeline, sources, target, options.profile ?? { name: target }, options.range);
      const issues = validateGraph(graph, timelineRenderCapabilities, target);
      if (issues.length) throw new Error(`RENDER_GRAPH_INVALID:${issues.map((issue) => issue.code).join(",")}`);
      return graph;
    };
    const previewGraph = build("preview");
    const masterGraph = build("master");
    const previewPlan = resolveExecutionPlan(previewGraph, "preview");
    const masterPlan = resolveExecutionPlan(masterGraph, "master");
    if (previewPlan.diagnostics.length || masterPlan.diagnostics.length) throw new Error(`RENDER_RESOLVER_BLOCKED:${[...previewPlan.diagnostics, ...masterPlan.diagnostics].map((diagnostic) => diagnostic.code).join(",")}`);
    const semanticGraphHash = createHash("sha256").update(semanticGraphPayload(previewGraph)).digest("hex");
    if (semanticGraphHash !== createHash("sha256").update(semanticGraphPayload(masterGraph)).digest("hex")) throw new Error("RENDER_SEMANTIC_DIVERGENCE");
    const graphHash = (graph: unknown) => createHash("sha256").update(renderGraphPayload(graph as any)).digest("hex");
    const submit = (graph: any, plan: ExecutionPlan) => worker.submit<any, any>("render.timeline.v1", { graph: JSON.parse(renderGraphPayload(graph)), execution_plan: JSON.parse(canonicalSerialize(plan)), output_dir: outputDirectory });
    const previewResult = await submit(previewGraph, previewPlan);
    const masterResult = await submit(masterGraph, masterPlan);
    const outputOf = (result: any) => result.outputs?.find((output: any) => output.kind === "render") ?? (() => { throw new Error("worker result missing render output"); })();
    const previewOutput = outputOf(previewResult);
    const masterOutput = outputOf(masterResult);
    const firstSource = resolvedSources[0];
    const report = await qcMaster(masterOutput.path, worker, "original", { require_audio: timeline.tracks.some((track) => track.kind === "audio"), source_identity: firstSource ? { source_kind: "original", asset_id: firstSource.asset_ref, object_ref: firstSource.original_object_ref, render_graph_source_kind: "original" } : undefined, render_graph_sources: resolvedSources.map((source) => ({ asset_id: source.asset_ref, source_kind: "original", object_ref: source.original_object_ref })), qc_requirements: options.qcRequirements ?? {}, loudness: options.qcRequirements?.loudness });
    const renderId = `render-${Date.now()}`;
    const first = options.sources[0];
    registerRender(this.session, this.session.manifest.project_id, { render_id: renderId, original_path: first?.original_ref ?? "", proxy_path: first?.proxy_ref ?? first?.original_ref ?? "", preview_path: previewOutput.path, master_path: masterOutput.path, qc_report: report });
    const originalRefs = resolvedSources.filter((source) => source.original_ref || source.original_object_ref).map((source) => ({ asset_ref: source.asset_ref, ref: source.original_ref, object_ref: source.original_object_ref }));
    const proxyRefs = resolvedSources.filter((source) => source.proxy_ref || source.proxy_object_ref).map((source) => ({ asset_ref: source.asset_ref, ref: source.proxy_ref, object_ref: source.proxy_object_ref, proxy_map: source.proxy_map }));
    const resultFor = (target: "preview" | "master", graph: any, result: any, output: any) => registerRenderResult(this.session!, this.session!.manifest.project_id, { render_result_id: `${renderId}-${target}`, render_id: renderId, target, timeline_version: timeline.version, graph_hash: graphHash(graph), render_graph: graph, original_refs: originalRefs, proxy_refs: proxyRefs, profile: graph.profile ?? {}, worker_version: result.metrics?.worker_version ?? "unknown", ffmpeg_version: result.metrics?.ffmpeg_version ?? "unknown", output_path: output.path, output_hash: createHash("sha256").update(readFileSync(output.path)).digest("hex") });
    resultFor("preview", previewGraph, previewResult, previewOutput);
    resultFor("master", masterGraph, masterResult, masterOutput);
    registerRenderManifest(this.session, this.session.manifest.project_id, { manifest_id: `${renderId}-execution-preview`, manifest_type: "execution_plan", value: { ...previewPlan, semantic_graph_hash: semanticGraphHash } });
    registerRenderManifest(this.session, this.session.manifest.project_id, { manifest_id: `${renderId}-execution-master`, manifest_type: "execution_plan", value: { ...masterPlan, semantic_graph_hash: semanticGraphHash } });
    for (const [target, plan, result, output] of [["preview", previewPlan, previewResult, previewOutput], ["master", masterPlan, masterResult, masterOutput]] as const) registerRenderManifest(this.session, this.session.manifest.project_id, { manifest_id: `${renderId}-output-${target}`, manifest_type: "output_manifest", value: { schema_version: 2, render_id: renderId, target, semantic_graph_hash: semanticGraphHash, execution_plan_id: plan.plan_id, output_hash: createHash("sha256").update(readFileSync(output.path)).digest("hex"), worker_version: result.metrics?.worker_version ?? "unknown", backend_version: result.metrics?.ffmpeg_version ?? "unknown", diagnostics: plan.diagnostics } });
    this.currentStatus = { ...this.currentStatus, render: "available", qc: report.status === "passed" ? "passed" : "blocked" };
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
      const startPts = typeof operation.start_pts === "bigint" ? operation.start_pts : BigInt(operation.start_pts); const endPts = typeof operation.end_pts === "bigint" ? operation.end_pts : BigInt(operation.end_pts);
      const duration = endPts - startPts;
      const command = { type: "add_clip" as const, track_id: trackId, clip: { clip_id: operation.clip_id, source: sourceRange(operation.asset_id, startPts, endPts, 30n), timeline_start: timelineStart, timeline_duration: duration } };
      commands.push(command); timelineStart += duration;
    }
    return this.commitCommands(timeline, commands, { semantic_refs: [assemblyId] });
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
    return this.commitCommands(timeline, commands, { semantic_refs: [patch.patch_id] });
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
