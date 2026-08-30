import type { ProjectHostSession } from "../../../../packages/platform/project-host/src/public.js";

export const canonicalStage2TimelineTracks = Object.freeze([
  Object.freeze({ track_id: "video-reference", kind: "video" as const, enabled: false, clips: Object.freeze([]) }),
  Object.freeze({ track_id: "video-main", kind: "video" as const, enabled: true, locked: false, muted: false, solo: false, opacity: 1, blend_mode: "normal" as const, clips: Object.freeze([]), gaps: Object.freeze([]), transitions: Object.freeze([]), captions: Object.freeze([]), effects: Object.freeze([]), keyframes: Object.freeze([]), automation_curves: Object.freeze([]), audio_routing: Object.freeze([]), locks: Object.freeze([]) }),
]);

export function assertCanonicalStage2Timeline(timeline: any): void {
  const tracks = timeline?.tracks;
  if (!Array.isArray(tracks) || tracks.length !== 2) throw new Error("PRODUCT_TIMELINE_TOPOLOGY_UNSUPPORTED");
  const reference = tracks.find((track: any) => track.track_id === "video-reference"), output = tracks.find((track: any) => track.track_id === "video-main");
  const referenceExact = reference?.kind === "video" && reference.enabled === false && Array.isArray(reference.clips) && ["locked", "muted", "solo", "opacity", "blend_mode", "gaps", "transitions", "captions", "effects", "keyframes", "automation_curves", "audio_routing", "locks"].every((key) => reference[key] === undefined);
  const outputExact = output?.kind === "video" && output.enabled === true && output.locked === false && output.muted === false && output.solo === false && output.opacity === 1 && output.blend_mode === "normal" && ["gaps", "transitions", "captions", "effects", "keyframes", "automation_curves", "audio_routing", "locks"].every((key) => Array.isArray(output[key]) && output[key].length === 0);
  if (!referenceExact || !outputExact) throw new Error("PRODUCT_TIMELINE_TOPOLOGY_UNSUPPORTED");
}

export async function ensureCanonicalStage2Timeline(host: ProjectHostSession): Promise<unknown> {
  const timeline = host.readTimelineSnapshot();
  if (!timeline) return host.initializeTimeline(canonicalStage2TimelineTracks);
  assertCanonicalStage2Timeline(timeline);
  const output = (timeline as any).tracks.find((track: any) => track.track_id === "video-main");
  if (output.clips.length > 0) {
    const workspace = await host.readStage2Workspace() as any, currentExecutionId = workspace.review?.current_execution_id;
    const executionById = new Map<string, any>((workspace.executions ?? []).map((item: any) => [item.execution_id, item])), executionIntentIds = new Set<string>(), visited = new Set<string>(); let execution: any = executionById.get(currentExecutionId), lineageComplete = false;
    for (let depth = 0; execution && depth < 64; depth += 1) { if (visited.has(execution.execution_id)) break; visited.add(execution.execution_id); if (typeof execution.intent_ref?.object_id === "string") executionIntentIds.add(execution.intent_ref.object_id); const baseExecutionId = execution.base_execution_ref?.object_id; if (!baseExecutionId) { lineageComplete = true; break; } execution = executionById.get(baseExecutionId); }
    if (!currentExecutionId || visited.size === 0 || !lineageComplete || !output.clips.every((clip: any) => clip.clip_id?.startsWith("semantic:") && executionIntentIds.has(clip.semantic_sidecar?.metadata?.intent_id))) throw new Error("PRODUCT_TIMELINE_OUTPUT_AUTHORITY_UNAVAILABLE");
  }
  return host.status();
}
