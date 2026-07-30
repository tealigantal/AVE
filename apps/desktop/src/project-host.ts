// The storage package is currently a runtime .mjs boundary; its public API is verified by integration tests.
// @ts-expect-error no emitted declaration exists for the runtime-only storage module yet.
import { createProject, openProject } from "../../../packages/platform/project-storage/src/project-storage.mjs";
import { applyCommand } from "../../../packages/core/timeline-core/src/public.js";
import { validateAssemblyCut } from "../../../packages/core/editorial-core/src/public.js";
import { compileAssemblyToEditIR } from "../../../packages/core/editorial-core/src/public.js";
import { sourceRange } from "../../../packages/core/media-identity/src/public.js";
import { validateRoughCutPatch } from "../../../packages/core/editorial-core/src/public.js";
import { validateDelivery, approvePrivacy, approveRights } from "../../../packages/core/editorial-core/src/public.js";
import { validateExportRegistration, validateExportProfile, exportCapabilities } from "../../../packages/core/editorial-core/src/public.js";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { reviewFeedback, validateCompare, validateReactionTiming } from "../../../packages/core/editorial-core/src/public.js";
import { inverseCommand } from "../../../packages/core/timeline-core/src/public.js";
// @ts-expect-error runtime .mjs storage boundary has no declaration file yet.
import { commitTimeline, readLatestTimeline, readTimelineAtVersion, readLatestTimelineCommand, registerRender, readLatestRender, registerEvidence, readEvidence, registerApprovedStoryPlan, readApprovedStoryPlan, registerAssemblyCut, readAssemblyCut, registerReviewArtifact, readReviewArtifact, registerReactionTiming, readReactionTiming, registerDeliveryRecord, readDeliveryRecord, registerExport, readExport } from "../../../packages/platform/project-storage/src/project-storage.mjs";
import type { Timeline, TimelineCommand, Track } from "../../../packages/core/timeline-core/src/public.js";
// @ts-expect-error runtime .mjs render boundary has no declaration file yet.
import { renderPreviewMaster, qcMaster } from "../../../packages/platform/render-service/src/render-service.mjs";
import { resolve } from "node:path";

export type ProjectHostStatus = Readonly<{ project: string; timeline: string; render: string; qc: string }>;

function revive(value: unknown): unknown {
  if (typeof value === "string" && /^-?\d+n$/.test(value)) return BigInt(value.slice(0, -1));
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, revive(item)]));
  return value;
}

export class ProjectHostSession {
  private session: { manifest: { project_id: string }; db: { prepare(sql: string): { get(): unknown } }; close(): Promise<void> } | undefined;
  private currentStatus: ProjectHostStatus = { project: "not-open", timeline: "no-version", render: "idle", qc: "not-run" };
  private redoCommand: { command: TimelineCommand; baseVersion: number } | undefined;
  private projectDirectory: string | undefined;

  async open(projectDirectory: string): Promise<ProjectHostStatus> {
    if (this.session) await this.close();
    const session = await openProject(projectDirectory);
    this.session = session;
    this.projectDirectory = projectDirectory;
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
    this.currentStatus = { project: session.manifest.project_id, timeline: "no-version", render: "idle", qc: "not-run" };
    return this.currentStatus;
  }

  async close(): Promise<void> {
    if (!this.session) return;
    await this.session.close();
    this.session = undefined;
    this.projectDirectory = undefined;
    this.redoCommand = undefined;
    this.currentStatus = { project: "not-open", timeline: "no-version", render: "idle", qc: "not-run" };
  }

  status(): ProjectHostStatus {
    return this.currentStatus;
  }

  initializeTimeline(tracks: readonly Track[]): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    if (this.currentStatus.timeline !== "no-version") throw new Error("timeline already initialized");
    const timeline: Timeline = { version: 0, tracks };
    commitTimeline(this.session, this.session.manifest.project_id, timeline, { type: "initialize", tracks }, 0);
    this.currentStatus = { ...this.currentStatus, timeline: "v0" };
    return this.currentStatus;
  }

  applyTimelineCommand(command: TimelineCommand, baseVersion: number): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    const raw = readLatestTimeline(this.session, this.session.manifest.project_id);
    if (!raw) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(raw)) as Timeline;
    if (timeline.version !== baseVersion) throw new Error(`timeline version conflict: expected ${timeline.version}, received ${baseVersion}`);
    const next = applyCommand(timeline, command);
    commitTimeline(this.session, this.session.manifest.project_id, next, command, baseVersion);
    this.currentStatus = { ...this.currentStatus, timeline: `v${next.version}` };
    this.redoCommand = undefined;
    return this.currentStatus;
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
    const original = revive(JSON.parse(commandRow.command_json)) as TimelineCommand;
    const inverse = inverseCommand(previous, original);
    const next = applyCommand(current, inverse);
    commitTimeline(this.session, this.session.manifest.project_id, next, inverse, current.version);
    this.redoCommand = { command: original, baseVersion: next.version };
    this.currentStatus = { ...this.currentStatus, timeline: `v${next.version}` };
    return this.currentStatus;
  }

  redoTimeline(): ProjectHostStatus {
    if (!this.session || !this.redoCommand) throw new Error("nothing to redo");
    const raw = readLatestTimeline(this.session, this.session.manifest.project_id);
    if (!raw) throw new Error("nothing to redo");
    const current = revive(JSON.parse(raw)) as Timeline;
    if (current.version !== this.redoCommand.baseVersion) throw new Error("redo history is stale");
    const next = applyCommand(current, this.redoCommand.command);
    commitTimeline(this.session, this.session.manifest.project_id, next, this.redoCommand.command, current.version);
    this.redoCommand = undefined;
    this.currentStatus = { ...this.currentStatus, timeline: `v${next.version}` };
    return this.currentStatus;
  }

  async render(originalPath: string): Promise<ProjectHostStatus> {
    if (!this.session || !this.projectDirectory) throw new Error("project is not open");
    const outputs = await renderPreviewMaster(originalPath, resolve(this.projectDirectory, "renders"));
    const report = await qcMaster(outputs.master);
    registerRender(this.session, this.session.manifest.project_id, { render_id: `render-${Date.now()}`, original_path: originalPath, proxy_path: outputs.proxy, preview_path: outputs.preview, master_path: outputs.master, qc_report: report });
    this.currentStatus = { ...this.currentStatus, render: "available", qc: report.status === "passed" ? "passed" : "blocked" };
    return this.currentStatus;
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
    const cut = this.readAssemblyCut(assemblyId) as any;
    if (!cut) throw new Error("assembly cut not found");
    const operations = compileAssemblyToEditIR(cut);
    let version = baseVersion;
    let timelineStatus = this.currentStatus;
    for (const operation of operations) {
      const duration = operation.end_pts - operation.start_pts;
      const command = { type: "add_clip" as const, track_id: trackId, clip: { clip_id: operation.clip_id, source: sourceRange(operation.asset_id, operation.start_pts, operation.end_pts, 30n), timeline_start: 0n, timeline_duration: duration } };
      timelineStatus = this.applyTimelineCommand(command, version);
      version += 1;
    }
    return timelineStatus;
  }

  applyRoughCutPatch(patch: any, trackId: string): ProjectHostStatus {
    if (!this.session) throw new Error("project is not open");
    const raw = readLatestTimeline(this.session, this.session.manifest.project_id); if (!raw) throw new Error("timeline is not initialized");
    const timeline = revive(JSON.parse(raw)) as Timeline; const track = timeline.tracks.find((candidate) => candidate.track_id === trackId); if (!track) throw new Error("track not found");
    validateRoughCutPatch(patch, timeline.version, new Set(track.clips.map((clip) => clip.clip_id)));
    if (patch.operations.some((operation: any) => operation.operation === "j_cut" || operation.operation === "l_cut")) throw new Error("J/L cut audio routing is not available");
    let version = timeline.version; let result = this.currentStatus;
    for (const operation of patch.operations) {
      if (operation.operation === "remove") result = this.applyTimelineCommand({ type: "remove_clip", track_id: trackId, clip_id: operation.clip_id }, version);
      else { const currentRaw = readLatestTimeline(this.session, this.session.manifest.project_id); const current = revive(JSON.parse(currentRaw)) as Timeline; const currentTrack = current.tracks.find((candidate) => candidate.track_id === trackId)!; const clip = currentTrack.clips.find((candidate) => candidate.clip_id === operation.clip_id)!; result = this.applyTimelineCommand({ type: "trim_source", track_id: trackId, clip_id: operation.clip_id, source: sourceRange(clip.source.asset_id, operation.source_start_pts, operation.source_end_pts, clip.source.timescale) }, version); }
      version += 1;
    }
    return result;
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
