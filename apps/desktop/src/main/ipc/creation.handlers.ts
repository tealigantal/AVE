import { writeFile } from "node:fs/promises";
import type { RequestSource } from "../types.js";
import type { Timeline } from "../../../../../packages/core/timeline-core/src/public.js";
import type { DesktopOperation } from "../project-session-manager.js";
import { DesktopLifecycleError } from "../project-session-manager.js";
import type { CommandHandler, HostContext, QueryHandler } from "../types.js";
import { confirmCreationRequest, confirmProfileConsent, confirmProfileDeletion, confirmPrincipleDeletion, type CreationConfirmationOptions } from "./creation-confirmation.js";
import type { ShowSaveDialog } from "./request-dispatcher.js";

type Show = (event: RequestSource, operation: DesktopOperation, options: CreationConfirmationOptions) => Promise<Readonly<{ response: number }>>;
function exact(value: unknown, keys: readonly string[]): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) throw new DesktopLifecycleError("DESKTOP_CREATION_INPUT_INVALID", "创作操作参数不完整或包含未知字段");
  return structuredClone(value) as Record<string, any>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new DesktopLifecycleError("DESKTOP_CREATION_INPUT_INVALID", "必须明确指定操作对象");
  return value;
}
function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new DesktopLifecycleError("DESKTOP_CREATION_INPUT_INVALID", "必须指定有效的意图版本");
  return value as number;
}
function strings(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string" || !item.trim()) || new Set(value).size !== value.length) throw new DesktopLifecycleError("DESKTOP_CREATION_INPUT_INVALID", "对象列表必须明确且不重复");
  return value;
}

/** Display/edit fields only: no source paths, arbitrary metadata, LUT paths or sidecars. */
export function creationTimelineProjection(value: unknown) {
  const timeline = value as Timeline | null;
  if (!timeline) return null;
  return {
    version: timeline.version,
    sequence: timeline.sequence ? { sequence_id: timeline.sequence.sequence_id, timebase: timeline.sequence.timebase ? { ...timeline.sequence.timebase } : null } : null,
    tracks: timeline.tracks.map(track => ({ track_id: track.track_id, kind: track.kind, enabled: track.enabled, locked: track.locked, muted: track.muted,
      clips: track.clips.map(clip => ({ clip_id: clip.clip_id, source: { asset_id: clip.source.asset_id, start_pts: clip.source.start_pts, end_pts: clip.source.end_pts, timescale: clip.source.timescale }, timeline_start: clip.timeline_start, timeline_duration: clip.timeline_duration, gain_db: clip.gain_db })),
      captions: (track.captions ?? []).map(caption => ({ caption_id: caption.caption_id, text: caption.text, timeline_start: caption.timeline_start, timeline_duration: caption.timeline_duration })),
    })),
  };
}

export function registerCreationHandlers(queries: Map<string, QueryHandler>, commands: Map<string, CommandHandler>, context: HostContext, show: Show, save: ShowSaveDialog): void {
  const host = context.host, credential = context.creationCredential;
  queries.set("project.creation.workspace", request => host.readCreationWorkspace(credential, request.payload as any));
  queries.set("project.creation.timeline", request => { exact(request.payload, []); return creationTimelineProjection(host.readTimelineSnapshot()); });
  queries.set("project.creation.draft.timeline", request => creationTimelineProjection(host.readCreationDraftTimeline(credential, request.payload as any)));
  queries.set("project.creation.ui", request => { exact(request.payload, []); return host.readCreationUi(credential); });
  commands.set("project.creation.ui.save", request => host.saveCreationUi(credential, request.payload as any));
  commands.set("project.creation.export", async (request, event, operation) => {
    const input = exact(request.payload, ["request_id", "draft_id", "render_id"]);
    const selected = { request_id: text(input.request_id), draft_id: text(input.draft_id), render_id: text(input.render_id) };
    const output = host.readCreationDraftMaster(credential, selected);
    const options = { title: "导出所选作品", defaultPath: `AVE-v${output.timeline_version}.mp4`, filters: [{ name: "MP4 视频", extensions: ["mp4"] }] };
    const destination = await save(context, event, operation, options);
    context.sessions.assertCurrent(operation);
    if (destination.canceled || !destination.filePath) throw new DesktopLifecycleError("DESKTOP_EXPORT_CANCELLED", "已取消导出");
    const verified = host.readCreationDraftMaster(credential, selected);
    if (verified.output_hash !== output.output_hash) throw new DesktopLifecycleError("CREATION_EXPORT_HASH_MISMATCH", "导出期间作品发生变化");
    await writeFile(destination.filePath, verified.bytes, { flag: "wx" });
    return { output_hash: verified.output_hash, timeline_version: verified.timeline_version };
  });
  queries.set("project.creation.preview", request => host.readCreationDraftPreview(credential, request.payload as any));
  commands.set("project.creation.begin", (request, event, operation) => confirmCreationRequest(host, credential, request.payload as any, options => show(event, operation, options), () => context.sessions.assertCurrent(operation)));
  commands.set("project.creation.revise", request => {
    const input = exact(request.payload, ["request_id", "expected_revision", "raw_text", "viewed_timeline_version", "preserve_refs"]);
    const state = host.reviseCreationRequest(credential, text(input.request_id), revision(input.expected_revision), { raw_text: text(input.raw_text), viewed_timeline_version: input.viewed_timeline_version, preserve_refs: strings(input.preserve_refs) });
    return { request_id: state.authorization.request_id, sequence: state.sequence };
  });
  commands.set("project.creation.cancel", request => {
    const input = exact(request.payload, ["request_id", "revoke"]);
    if (typeof input.revoke !== "boolean") throw new DesktopLifecycleError("DESKTOP_CREATION_INPUT_INVALID", "撤销授权必须是明确的布尔值");
    const state = host.cancelCreationRequest(credential, text(input.request_id), input.revoke);
    return { request_id: state.authorization.request_id, sequence: state.sequence };
  });
  commands.set("project.creation.material.prepare", async request => {
    const result = await host.prepareCreationMaterial(credential, request.payload as any);
    return { operation_id: result.value.operation_id, digest: result.object_hash, asset_id: result.value.asset_id };
  });
  commands.set("project.creation.observe", async request => {
    const result = await host.observeCreationMaterial(credential, request.payload as any);
    return { observation_ref: result.ref };
  });
  commands.set("project.creation.produce", request => host.produceCreation(credential, request.payload as any));
  commands.set("project.creation.generate", async request => {
    const result = await host.generateCreationDraft(credential, request.payload as any);
    return { draft_id: result.draft_id, timeline_version: result.state.drafts.find(draft => draft.draft_id === result.draft_id)!.timeline_version };
  });
  commands.set("project.creation.caption", async request => {
    const result = await host.editCreationCaption(credential, request.payload as any);
    return { draft_id: result.draft_id, timeline_version: result.edit_ref.timeline_version, edit_ref: result.edit_ref };
  });
  commands.set("project.creation.restore", async request => {
    const result = await host.restoreCreationDraft(credential, request.payload as any);
    return { draft_id: result.draft_id, timeline_version: result.edit_ref.timeline_version, edit_ref: result.edit_ref };
  });
  commands.set("project.creation.combine", async request => {
    const result = await host.combineCreationDrafts(credential, request.payload as any);
    return { draft_id: result.draft_id, timeline_version: result.edit_ref.timeline_version, edit_ref: result.edit_ref };
  });
  commands.set("project.creation.manual", async request => {
    const result = await host.editCreationDraft(credential, request.payload as any);
    return { draft_id: result.draft_id, timeline_version: result.edit_ref.timeline_version, edit_ref: result.edit_ref };
  });
  commands.set("project.creation.render", async request => {
    const result = await host.renderCreationDraft(credential, request.payload as any);
    return { operation_id: result.receipt.operation_id, draft_id: result.receipt.draft_id, render_id: result.receipt.bundle.render_id };
  });
  commands.set("project.creation.select", request => {
    const input = exact(request.payload, ["request_id", "draft_id", "pointer"]);
    const state = host.selectCreationVersion(credential, text(input.request_id), text(input.draft_id), input.pointer);
    return { request_id: state.authorization.request_id, sequence: state.sequence };
  });
  commands.set("project.creation.learn", async request => {
    const result = await host.learnCreationExperience(credential, request.payload as any);
    return { operation_id: result.result.operation_id, registration: { profile_id: result.registration.profile_id, registered_version: result.registration.registered_version } };
  });
  commands.set("project.profile.configure", (request, event, operation) => confirmProfileConsent(context.profile, credential, request.payload as any, options => show(event, operation, options), () => context.sessions.assertCurrent(operation)));
  commands.set("project.profile.forget", async (request, event, operation) => {
    const selectedPrinciples = Boolean(request.payload && typeof request.payload === "object" && "principle_ids" in request.payload);
    const input = exact(request.payload, [selectedPrinciples ? "principle_ids" : "source_project_ids"]);
    const receipt = selectedPrinciples
      ? await confirmPrincipleDeletion(context.profile, credential, strings(input.principle_ids), options => show(event, operation, options), () => context.sessions.assertCurrent(operation))
      : await confirmProfileDeletion(context.profile, credential, strings(input.source_project_ids), options => show(event, operation, options), () => context.sessions.assertCurrent(operation));
    return { profile_id: receipt.profile_id, version: receipt.version, deletion_generation: receipt.deletion_generation, excluded_sources: receipt.excluded_sources, removed_principles: receipt.removed_principles, removed_event_keys: receipt.removed_event_keys };
  });
}
