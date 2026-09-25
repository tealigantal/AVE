import type { CreationPlanV1 } from "../../../../contracts/generated/typescript/editorial/creation-plan.v1.js";
import { sourceRange, type AssetId } from "../../media-identity/src/public.js";
import { simulateCommands, type AudioRouting, type Caption, type Clip, type Grade, type Timeline, type TimelineCommand } from "../../timeline-core/src/public.js";

export type CreationSourceObservation = Readonly<{ evidence_id: string; kind: "visual" | "audio" | "transcript"; start_pts: bigint; end_pts: bigint; timescale: bigint; text: string; uncertain: boolean }>;
export type CreationSourceSpan = Readonly<{ span_id: string; asset_id: AssetId; start_pts: bigint; end_pts: bigint; timescale: bigint; has_video: boolean; has_audio: boolean; observations: readonly CreationSourceObservation[]; color_context?: Grade["context"] }>;
export type CreationCompileContext = Readonly<{ request_id: string; revision: number; input_digest: string; authorized_asset_ids: readonly string[]; protected_refs: readonly string[]; principle_ids: readonly string[]; spans: readonly CreationSourceSpan[] }>;
type WireTime = Readonly<{ schema_version: 1; value: number; timescale: number }>;
const fail = (code: string, detail: string): never => { throw new Error(`${code}:${detail}`); };
const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => typeof item === "bigint" ? `${item}n` : item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

/** Content preservation permits placement to follow earlier edits, never source/effect changes. */
export function assertPreservedCreationContent(before: Timeline, after: Timeline, refs: readonly string[]): void {
  const locate = (timeline: Timeline, ref: string): unknown => {
    const matches: unknown[] = [];
    for (const track of timeline.tracks) {
      if (ref === track.track_id || ref === `track:${track.track_id}`) matches.push(track);
      for (const clip of track.clips) if (ref === clip.clip_id || ref === `clip:${clip.clip_id}`) matches.push({ track_id: track.track_id, ...clip, timeline_start: undefined, semantic_sidecar: clip.semantic_sidecar ? { ...clip.semantic_sidecar, metadata: undefined } : undefined });
      for (const caption of track.captions ?? []) if (ref === caption.caption_id || ref === `caption:${caption.caption_id}`) {
        const audioAnchor = caption.semantic_sidecar?.labels?.find(label => label.startsWith("audio-anchor:"))?.slice(13);
        const anchorId = audioAnchor ?? caption.semantic_sidecar?.labels?.find(label => label.startsWith("shot:"))?.slice(5);
        const anchor = anchorId ? timeline.tracks.flatMap(item => item.clips).find(clip => clip.clip_id === anchorId) : undefined;
        if (anchorId && !anchor) fail("CREATION_PRESERVATION_ANCHOR_MISSING", ref);
        matches.push({ track_id: track.track_id, ...caption, timeline_start: caption.timeline_start - (anchor?.timeline_start ?? 0n) });
      }
    }
    if (matches.length !== 1) fail("CREATION_PRESERVATION_REFERENCE_INVALID", ref);
    return matches[0];
  };
  for (const ref of refs) if (canonical(locate(before, ref)) !== canonical(locate(after, ref))) fail("CREATION_PROTECTED_CONTENT_CHANGED", ref);
}

/** Compiles validated declarative creative output, never model-supplied Commands. */
export function compileCreationPlan(plan: CreationPlanV1, base: Timeline, context: CreationCompileContext): readonly TimelineCommand[] {
  if (plan.request_id !== context.request_id || plan.revision !== context.revision || plan.input_digest !== context.input_digest || plan.base_timeline_version !== base.version) fail("CREATION_PLAN_STALE", "request/revision/input/base mismatch");
  const timebase = base.sequence?.timebase;
  if (!timebase || timebase.value <= 0n || timebase.timescale <= 0n) throw new Error("CREATION_TIMEBASE_REQUIRED: explicit sequence RationalTime required");
  const ticks = (time: WireTime, label: string): bigint => {
    if (!Number.isSafeInteger(time.value) || !Number.isSafeInteger(time.timescale) || time.timescale <= 0) fail("CREATION_TIME_INVALID", label);
    const numerator = BigInt(time.value) * timebase.timescale, denominator = BigInt(time.timescale) * timebase.value;
    if (numerator % denominator !== 0n) fail("CREATION_TIME_INEXACT", label);
    return numerator / denominator;
  };
  const spans = new Map(context.spans.map(item => [item.span_id, item]));
  if (spans.size !== context.spans.length) fail("CREATION_SPAN_DUPLICATE", "source span identity must be unique");
  const observed = context.spans.flatMap(span => span.observations.map(observation => ({ ...observation, asset_id: span.asset_id })));
  const evidenceFor = (source: CreationPlanV1["shots"][number]["source"], kind: "video" | "audio") => {
    const evidence = spans.get(source.span_id);
    if (!evidence || evidence.asset_id !== source.asset_id || !context.authorized_asset_ids.includes(source.asset_id)) throw new Error(`CREATION_SOURCE_DENIED:${source.span_id}`);
    if (kind === "video" ? !evidence.has_video : !evidence.has_audio) fail("CREATION_STREAM_MISSING", source.asset_id);
    const pts = (time: WireTime) => {
      if (!Number.isSafeInteger(time.value) || !Number.isSafeInteger(time.timescale) || time.timescale <= 0) fail("CREATION_TIME_INVALID", source.span_id);
      const value = BigInt(time.value) * evidence.timescale;
      if (value % BigInt(time.timescale) !== 0n) fail("CREATION_SOURCE_PTS_INEXACT", source.span_id);
      return value / BigInt(time.timescale);
    };
    const start = pts(source.start), end = pts(source.end);
    if (start < evidence.start_pts || end > evidence.end_pts || end <= start) fail("CREATION_SOURCE_RANGE_INVALID", source.span_id);
    const supported = evidence.observations.some(item => kind === "video" ? item.kind === "visual" && item.start_pts * evidence.timescale < end * item.timescale && item.end_pts * evidence.timescale > start * item.timescale : item.kind === "audio" && item.start_pts * evidence.timescale <= start * item.timescale && item.end_pts * evidence.timescale >= end * item.timescale);
    if (!supported) fail("CREATION_SOURCE_UNOBSERVED", `${source.span_id}:${kind}`);
    const numerator = (end - start) * timebase.timescale, denominator = evidence.timescale * timebase.value;
    if (numerator % denominator !== 0n) fail("CREATION_TIME_INEXACT", source.span_id);
    return { evidence, source: sourceRange(evidence.asset_id, start, end, evidence.timescale), duration: numerator / denominator };
  };
  if (context.protected_refs.some(ref => !plan.preserve_refs.includes(ref))) fail("CREATION_PROTECTION_OMITTED", "model omitted required preservation");
  if (plan.applied_principle_ids.some(id => !context.principle_ids.includes(id))) fail("CREATION_PRINCIPLE_UNKNOWN", "plan cited a principle outside its snapshot");
  const ids = new Set<string>();
  const unique = (id: string) => { if (ids.has(id)) fail("CREATION_OBJECT_DUPLICATE", id); ids.add(id); };
  const shots = new Map<string, Clip>();
  let cursor = 0n;
  for (const shot of plan.shots) {
    unique(shot.shot_id);
    const item = evidenceFor(shot.source, "video");
    if (shot.color && !item.evidence.color_context) fail("CREATION_COLOR_CONTEXT_MISSING", shot.shot_id);
    const clip: Clip = { clip_id: shot.shot_id, source: item.source, timeline_start: cursor, timeline_duration: item.duration, gain_db: shot.embedded_gain_db,
      ...(shot.reframe ? { static_reframe: { schema_version: 1, ...shot.reframe } as const } : {}),
      ...(shot.color ? { grade: { grade_id: `grade:${shot.shot_id}`, ...shot.color, context: item.evidence.color_context! } } : {}),
      semantic_sidecar: { semantic_id: shot.shot_id, labels: ["stage3-creation"], evidence_refs: [shot.source.span_id], metadata: { purpose: shot.purpose } } };
    shots.set(shot.shot_id, clip); cursor += item.duration;
  }
  const desired = new Map<string, { kind: "video" | "audio"; clips: Clip[]; captions: Caption[] }>([["video-main", { kind: "video", clips: [...shots.values()], captions: [] }]]);
  for (const role of ["dialogue", "music", "narration"] as const) desired.set(`audio-${role}`, { kind: "audio", clips: [], captions: [] });
  for (const audio of plan.audio) {
    unique(audio.audio_id);
    const shot = shots.get(audio.shot_id);
    if (!shot) throw new Error(`CREATION_AUDIO_SHOT_UNKNOWN:${audio.shot_id}`);
    const item = evidenceFor(audio.source, "audio"), start = shot.timeline_start + ticks(audio.offset, audio.audio_id);
    if (![audio.fade_in.value, audio.fade_out.value, audio.fade_in.timescale, audio.fade_out.timescale].every(Number.isSafeInteger)) fail("CREATION_TIME_INVALID", audio.audio_id);
    const fadeIn = BigInt(audio.fade_in.value), fadeOut = BigInt(audio.fade_out.value), inScale = BigInt(audio.fade_in.timescale), outScale = BigInt(audio.fade_out.timescale);
    if (inScale <= 0n || outScale <= 0n || start < 0n || start + item.duration > cursor || fadeIn < 0n || fadeOut < 0n || (fadeIn * outScale + fadeOut * inScale) * timebase.timescale > item.duration * timebase.value * inScale * outScale) fail("CREATION_AUDIO_RANGE_INVALID", audio.audio_id);
    desired.get(`audio-${audio.role}`)!.clips.push({ clip_id: audio.audio_id, media_kind: "audio", source: item.source, timeline_start: start, timeline_duration: item.duration, gain_db: audio.gain_db, link_group_id: audio.shot_id,
      ...(fadeIn > 0n || fadeOut > 0n ? { boundary_fades: { schema_version: 1 as const, ...(fadeIn > 0n ? { audio_fade_in: { value: BigInt(audio.fade_in.value), timescale: BigInt(audio.fade_in.timescale) } } : {}), ...(fadeOut > 0n ? { audio_fade_out: { value: BigInt(audio.fade_out.value), timescale: BigInt(audio.fade_out.timescale) } } : {}) } } : {}),
      semantic_sidecar: { semantic_id: audio.audio_id, labels: [audio.role, `shot:${audio.shot_id}`], evidence_refs: [audio.source.span_id], metadata: { purpose: audio.purpose } } });
  }
  desired.get("video-main")!.captions = plan.captions.map(caption => {
    unique(caption.caption_id);
    const shot = shots.get(caption.shot_id);
    if (!shot) throw new Error(`CREATION_CAPTION_SHOT_UNKNOWN:${caption.shot_id}`);
    const refs = caption.evidence_ids.map(id => { const value = observed.find(item => item.evidence_id === id); if (!value || !context.authorized_asset_ids.includes(value.asset_id)) throw new Error(`CREATION_CAPTION_EVIDENCE_UNKNOWN:${id}`); return value; });
    const offset = ticks(caption.offset, caption.caption_id), duration = ticks(caption.duration, caption.caption_id), start = shot.timeline_start + offset;
    if (start < 0n || duration <= 0n || start + duration > cursor) fail("CREATION_CAPTION_RANGE_INVALID", caption.caption_id);
    if (caption.kind === "editorial" && (caption.audio_anchor !== null || offset < 0n || offset + duration > shot.timeline_duration)) fail("CREATION_CAPTION_RANGE_INVALID", caption.caption_id);
    let anchor: Clip | undefined;
    if (caption.kind === "verbatim") {
      if (!caption.audio_anchor) fail("CREATION_CAPTION_AUDIO_REQUIRED", caption.caption_id);
      anchor = caption.audio_anchor!.kind === "embedded" ? shots.get(caption.audio_anchor!.id) : [...desired.values()].filter(item => item.kind === "audio").flatMap(item => item.clips).find(item => item.clip_id === caption.audio_anchor!.id);
      const sourcePlan = caption.audio_anchor!.kind === "embedded" ? plan.shots.find(item => item.shot_id === caption.audio_anchor!.id) : plan.audio.find(item => item.audio_id === caption.audio_anchor!.id);
      if (!anchor || !sourcePlan || !spans.get(sourcePlan.source.span_id)?.has_audio || anchor.gain_db !== undefined && anchor.gain_db <= -96) fail("CREATION_CAPTION_AUDIO_REQUIRED", caption.caption_id);
      const sound = anchor!;
      const match = refs.some(item => {
        if (item.kind !== "transcript" || item.uncertain || item.text !== caption.text || item.asset_id !== sound.source.asset_id || item.start_pts * sound.source.timescale < sound.source.start_pts * item.timescale || item.end_pts * sound.source.timescale > sound.source.end_pts * item.timescale) return false;
        const mapped = (point: bigint) => { const numerator = (point * sound.source.timescale - sound.source.start_pts * item.timescale) * timebase.timescale, denominator = item.timescale * sound.source.timescale * timebase.value; return numerator % denominator === 0n ? sound.timeline_start + numerator / denominator : null; };
        return mapped(item.start_pts) === start && mapped(item.end_pts) === start + duration;
      });
      if (!match) fail("CREATION_CAPTION_QUOTE_UNSUPPORTED", caption.caption_id);
    }
    return { caption_id: caption.caption_id, text: caption.text, timeline_start: start, timeline_duration: duration, semantic_sidecar: { semantic_id: caption.caption_id, labels: [`shot:${shot.clip_id}`, caption.kind, ...(anchor ? [`audio-anchor:${anchor.clip_id}`] : [])], evidence_refs: [...caption.evidence_ids] } };
  });
  const protectedRefs = new Set([...context.protected_refs, ...plan.preserve_refs]);
  const commands: TimelineCommand[] = [];
  for (const [trackId, target] of desired) {
    const track = base.tracks.find(item => item.track_id === trackId);
    const routing: AudioRouting[] = target.kind === "audio" ? target.clips.map(clip => ({ routing_id: `routing:${clip.clip_id}`, source_clip_id: clip.clip_id, bus: trackId.slice(6) as "dialogue" | "music" | "narration" })) : [];
    if (!track) { if (target.clips.length) commands.push({ type: "add_track", track: { track_id: trackId, kind: target.kind, clips: target.clips, captions: target.captions, ...(target.kind === "audio" ? { audio_routing: routing } : {}) } }); continue; }
    if (track.kind !== target.kind) fail("CREATION_TRACK_KIND_INVALID", trackId);
    if (track.enabled === false || track.muted || track.solo || (track.opacity !== undefined && track.opacity !== 1) || track.effects?.length || track.transitions?.length || track.automation_curves?.length || track.audio_routing?.some(route => route.gain_db !== undefined || route.muted || route.bus !== trackId.slice(6))) fail("CREATION_TRACK_SEMANTICS_UNREPRESENTED", trackId);
    const trackCommands: TimelineCommand[] = [];
    for (const old of track.clips) {
      const next = target.clips.find(item => item.clip_id === old.clip_id);
      const identical = next && canonical(next) === canonical(old);
      const content = (clip: Clip) => ({ ...clip, timeline_start: undefined, semantic_sidecar: clip.semantic_sidecar ? { ...clip.semantic_sidecar, metadata: undefined } : undefined });
      if ((!next || canonical(content(next)) !== canonical(content(old))) && (protectedRefs.has(old.clip_id) || protectedRefs.has(`clip:${old.clip_id}`))) fail("CREATION_PROTECTED_CONTENT_CHANGED", old.clip_id);
      if (!identical && (old.grade?.lut_path || old.grade?.brightness !== undefined || old.grade?.gamma !== undefined || old.effects?.length || old.automation_curves?.length || old.mask || old.time_map || old.speed || old.keyframes?.length || old.transform || old.compound_clip_ids?.length || old.nested_sequence_id || old.kind && old.kind !== "media" || target.kind === "video" && old.boundary_fades)) fail("CREATION_EXISTING_SEMANTICS_UNREPRESENTED", old.clip_id);
      if (!next) trackCommands.push({ type: "remove_clip", track_id: trackId, clip_id: old.clip_id });
      else if (!identical) trackCommands.push({ type: "replace_clip", track_id: trackId, clip_id: old.clip_id, clip: next });
    }
    for (const next of target.clips) if (!track.clips.some(old => old.clip_id === next.clip_id)) trackCommands.push({ type: "add_clip", track_id: trackId, clip: next });
    if (canonical(track.captions ?? []) !== canonical(target.captions)) trackCommands.push({ type: "set_track_properties", track_id: trackId, properties: { captions: target.captions } });
    if (target.kind === "audio" && canonical(track.audio_routing ?? []) !== canonical(routing)) trackCommands.push({ type: "set_track_properties", track_id: trackId, properties: { audio_routing: routing } });
    if (trackCommands.length && (track.locked || protectedRefs.has(trackId) || protectedRefs.has(`track:${trackId}`))) fail("CREATION_PROTECTED_CONTENT_CHANGED", trackId);
    commands.push(...trackCommands);
  }
  // Unrelated tracks remain byte-for-byte unchanged. The Host enforces range locks
  // over actual affected ranges during simulation and final transaction validation.
  assertPreservedCreationContent(base, simulateCommands(base, commands), [...protectedRefs]);
  return commands;
}
