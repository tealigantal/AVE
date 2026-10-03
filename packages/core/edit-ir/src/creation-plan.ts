import type { CreationPlanV1 } from "../../../../contracts/generated/typescript/editorial/creation-plan.v1.js";
import { sourceRange, type AssetId } from "../../media-identity/src/public.js";
import { simulateCommands, type AudioRouting, type Caption, type Clip, type Grade, type Timeline, type TimelineCommand } from "../../timeline-core/src/public.js";

export type CreationSourceObservation = Readonly<{ evidence_id: string; kind: "visual" | "audio" | "transcript"; start_pts: bigint; end_pts: bigint; timescale: bigint; text: string; uncertain: boolean }>;
export type CreationSourceSpan = Readonly<{ span_id: string; asset_id: AssetId; start_pts: bigint; end_pts: bigint; timescale: bigint; audio_coverage_receipt?: Readonly<{object_ref_id:string;digest:string}>; has_image?: boolean; has_video: boolean; has_audio: boolean; observations: readonly CreationSourceObservation[]; color_context?: Grade["context"]; video_geometry?: Readonly<{ width: number; height: number }> }>;
export type CreationCompileContext = Readonly<{ request_id: string; revision: number; input_digest: string; authorized_asset_ids: readonly string[]; protected_refs: readonly string[]; principle_ids: readonly string[]; spans: readonly CreationSourceSpan[]; caption_layout_version?: 1 }>;
type WireTime = Readonly<{ schema_version: 1; value: number; timescale: number }>;
const fail = (code: string, detail: string): never => { throw new Error(`${code}:${detail}`); };
const canonical = (value: unknown): string => JSON.stringify(value, (_key, item) => typeof item === "bigint" ? `${item}n` : item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

/** Only the losslessly representable creation subset, never a defaulted transform. */
export function creationStaticTransform(transform: Clip["transform"]): Extract<NonNullable<CreationPlanV1["shots"][number]["reframe"]>, { mode: "static_transform"|"manual_static_transform" }> | null {
  if (!transform) return null;
  if(Object.keys(transform).sort().join(",")==="scale_x,scale_y,x,y"&&transform.scale_x===transform.scale_y&&Number.isFinite(transform.scale_x)&&transform.scale_x!>=1&&transform.scale_x!<=2&&Number.isSafeInteger(transform.x)&&Number.isSafeInteger(transform.y)&&transform.x!%2===0&&transform.y!%2===0&&transform.x!<=0&&transform.y!<=0)return {mode:"static_transform",scale:transform.scale_x!,x:transform.x!,y:transform.y!};
  if(Object.keys(transform).some(key=>!["x","y","scale_x","scale_y","rotation"].includes(key))||[transform.x,transform.y,transform.scale_x,transform.scale_y,transform.rotation].some(value=>!Number.isFinite(value))||transform.scale_x!<0.1||transform.scale_x!>4||transform.scale_y!<0.1||transform.scale_y!>4)return null;
  return {mode:"manual_static_transform",x:transform.x!,y:transform.y!,scale_x:transform.scale_x!,scale_y:transform.scale_y!,rotation:transform.rotation!};
}

export function assertCreationStaticTransform(reframe: NonNullable<CreationPlanV1["shots"][number]["reframe"]>, geometry: CreationSourceSpan["video_geometry"]): void {
  if(reframe.mode!=="static_transform"&&reframe.mode!=="manual_static_transform")return;
  if(!geometry||!Number.isSafeInteger(geometry.width)||!Number.isSafeInteger(geometry.height)||geometry.width<=0||geometry.height<=0)fail("CREATION_TRANSFORM_GEOMETRY_REQUIRED","verified native source dimensions required");
  if(reframe.mode==="manual_static_transform"){if([reframe.x,reframe.y,reframe.scale_x,reframe.scale_y,reframe.rotation].some(value=>!Number.isFinite(value))||reframe.scale_x<0.1||reframe.scale_x>4||reframe.scale_y<0.1||reframe.scale_y>4)fail("CREATION_TRANSFORM_BOUNDS_INVALID","manual static transform is outside the registered basic range");return;}
  const {width,height}=geometry!;
  if(!Number.isFinite(reframe.scale)||reframe.scale<1||reframe.scale>2||!Number.isSafeInteger(reframe.x)||!Number.isSafeInteger(reframe.y)||reframe.x%2!==0||reframe.y%2!==0||reframe.x>0||reframe.y>0||reframe.x<width-Math.floor(width*reframe.scale)||reframe.y<height-Math.floor(height*reframe.scale))fail("CREATION_TRANSFORM_BOUNDS_INVALID","static scale and even placement must cover the unchanged native canvas");
}

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
  if (context.caption_layout_version !== undefined && context.caption_layout_version !== 1) fail("CAPTION_LAYOUT_VERSION_UNSUPPORTED", String(context.caption_layout_version));
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
    if ("kind" in source) fail("CREATION_STREAM_MISSING","static image is not temporal audio/video");
    const temporal = source as Exclude<typeof source,{kind:"image"}>;
    const evidence = spans.get(temporal.span_id);
    if (!evidence || evidence.asset_id !== source.asset_id || !context.authorized_asset_ids.includes(source.asset_id)) throw new Error(`CREATION_SOURCE_DENIED:${source.span_id}`);
    if (kind === "video" ? !evidence.has_video : !evidence.has_audio) fail("CREATION_STREAM_MISSING", source.asset_id);
    for (const time of [temporal.start, temporal.end]) {
      if (!Number.isSafeInteger(time.value) || !Number.isSafeInteger(time.timescale) || time.timescale <= 0) fail("CREATION_TIME_INVALID", source.span_id);
    }
    // Evidence scales are representations, not media frame grids. Re-express
    // exact endpoints on a common rational scale; never snap or round them.
    const gcd = (a: bigint, b: bigint): bigint => b === 0n ? a : gcd(b, a % b);
    const scale = [evidence.timescale, BigInt(temporal.start.timescale), BigInt(temporal.end.timescale)].reduce((a, b) => a / gcd(a, b) * b);
    const pts = (time: WireTime) => BigInt(time.value) * (scale / BigInt(time.timescale));
    const start = pts(temporal.start), end = pts(temporal.end);
    if (start < evidence.start_pts * (scale / evidence.timescale) || end > evidence.end_pts * (scale / evidence.timescale) || end <= start) fail("CREATION_SOURCE_RANGE_INVALID", source.span_id);
    const supported = evidence.observations.some(item => kind === "video" ? item.kind === "visual" && item.start_pts * scale < end * item.timescale && item.end_pts * scale > start * item.timescale : item.kind === "audio" && item.start_pts * scale <= start * item.timescale && item.end_pts * scale >= end * item.timescale);
    const measuredAudio=kind==="audio" && evidence.audio_coverage_receipt && /^[a-f0-9]{64}$/.test(evidence.audio_coverage_receipt.digest) && Boolean(evidence.audio_coverage_receipt.object_ref_id);
    if (!supported && !measuredAudio) fail("CREATION_SOURCE_UNOBSERVED", `${source.span_id}:${kind}`);
    const numerator = (end - start) * timebase.timescale, denominator = scale * timebase.value;
    if (numerator % denominator !== 0n) fail("CREATION_TIME_INEXACT", source.span_id);
    return { evidence, source: sourceRange(evidence.asset_id, start, end, scale), duration: numerator / denominator };
  };
  if (context.protected_refs.some(ref => !plan.preserve_refs.includes(ref))) fail("CREATION_PROTECTION_OMITTED", "model omitted required preservation");
  if (plan.applied_principle_ids.some(id => !context.principle_ids.includes(id))) fail("CREATION_PRINCIPLE_UNKNOWN", "plan cited a principle outside its snapshot");
  const ids = new Set<string>();
  const unique = (id: string) => { if (ids.has(id)) fail("CREATION_OBJECT_DUPLICATE", id); ids.add(id); };
  // Model object names are semantic identities. Timeline structural IDs share
  // one namespace, so the Host allocates physical identities without changing
  // source choices, timing or the immutable planning response. Existing managed
  // objects keep their physical IDs for protection, association and reopen.
  const managedTracks = new Set(["video-main", "audio-dialogue", "audio-music", "audio-narration", "audio-sfx"]);
  const reserved = new Set<string>(managedTracks);
  const identityKeys = new Set(["sequence_id", "track_id", "clip_id", "caption_id", "grade_id", "mask_id", "effect_id", "keyframe_id", "curve_id", "gap_id", "transition_id", "routing_id", "lock_id"]);
  const reserveExisting = (value: unknown): void => {
    if (Array.isArray(value)) { value.forEach(reserveExisting); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) { if (identityKeys.has(key) && typeof item === "string") reserved.add(item); else reserveExisting(item); }
  };
  reserveExisting(base);
  const proposedIds = new Set([...plan.shots.map(item => item.shot_id), ...plan.audio.map(item => item.audio_id), ...plan.captions.map(item => item.caption_id)]);
  const allocate = (preferred: string): string => { let candidate = preferred, index = 0; while (reserved.has(candidate) || proposedIds.has(candidate)) candidate = `${preferred}:${++index}`; reserved.add(candidate); return candidate; };
  const physical = new Map<string, string>();
  for (const [kind, id] of [...plan.shots.map(item => ["clip", item.shot_id] as const), ...plan.audio.map(item => ["clip", item.audio_id] as const), ...plan.captions.map(item => ["caption", item.caption_id] as const)]) {
    const existing = base.tracks.filter(track => managedTracks.has(track.track_id)).some(track => kind === "clip" ? track.clips.some(item => item.clip_id === id) : track.captions?.some(item => item.caption_id === id));
    physical.set(id, existing || !reserved.has(id) ? id : allocate(`creation:${kind}:${id}`));
  }
  for (const id of physical.values()) reserved.add(id);
  const objectId = (id: string): string => physical.get(id)!;
  const shots = new Map<string, Clip>();
  const layout=plan.retained_layout;
  if(layout&&(layout.base_timeline_version!==base.version||layout.placements.length!==plan.shots.length))fail("CREATION_LAYOUT_REBOUND","retained layout must bind this complete picture version");
  let cursor = 0n;
  for (const shot of plan.shots) {
    unique(shot.shot_id);
    const image = 'kind' in shot.source && shot.source.kind === 'image';
    let item: ReturnType<typeof evidenceFor>;
    if (image) {
      const evidence=spans.get(shot.source.span_id);
      if (!evidence?.has_image || evidence.asset_id !== shot.source.asset_id || !context.authorized_asset_ids.includes(shot.source.asset_id) || !evidence.observations.some(observation=>observation.kind==='visual')) fail('CREATION_SOURCE_DENIED',shot.source.span_id);
      if (!Number.isSafeInteger(shot.duration_ticks) || shot.duration_ticks! < 1) fail('CREATION_IMAGE_DURATION_REQUIRED',shot.shot_id);
      const duration=BigInt(shot.duration_ticks!); item={evidence:evidence!,source:sourceRange(evidence!.asset_id,0n,duration*timebase.value,timebase.timescale),duration};
    } else item = evidenceFor(shot.source, "video");
    if (shot.color && !item.evidence.color_context) fail("CREATION_COLOR_CONTEXT_MISSING", shot.shot_id);
    if (shot.reframe) assertCreationStaticTransform(shot.reframe, item.evidence.video_geometry);
    const placement=layout?.placements.find(p=>p.shot_id===shot.shot_id),old=base.tracks.filter(t=>t.track_id==="video-main"&&t.kind==="video").flatMap(t=>t.clips).find(c=>c.clip_id===shot.shot_id);
    if(layout&&(!placement||!old||BigInt(placement.start_ticks)!==old.timeline_start||BigInt(placement.duration_ticks)!==item.duration||old.timeline_duration!==item.duration||!image&&(old.source.asset_id!==item.source.asset_id||old.source.start_pts*item.source.timescale!==item.source.start_pts*old.source.timescale||old.source.end_pts*item.source.timescale!==item.source.end_pts*old.source.timescale)||image&&old.source.asset_id!==item.source.asset_id))fail("CREATION_LAYOUT_REBOUND","retained picture identity, source or placement changed");
    const start=placement?BigInt(placement.start_ticks):cursor;
    const clip: Clip = { clip_id: objectId(shot.shot_id), ...(image ? {kind:"image" as const}:{}), source: placement?old!.source:item.source, timeline_start: start, timeline_duration: item.duration, gain_db: shot.embedded_gain_db,
      ...(shot.reframe?.mode === "static_transform" ? { transform: { scale_x: shot.reframe.scale, scale_y: shot.reframe.scale, x: shot.reframe.x, y: shot.reframe.y } } : shot.reframe?.mode === "manual_static_transform" ? {transform:{x:shot.reframe.x,y:shot.reframe.y,scale_x:shot.reframe.scale_x,scale_y:shot.reframe.scale_y,rotation:shot.reframe.rotation}} : shot.reframe ? { static_reframe: { schema_version: 1, ...shot.reframe } as const } : {}),
      ...(shot.color ? { grade: { grade_id: old?.grade?.grade_id ?? allocate(`grade:${objectId(shot.shot_id)}`), ...shot.color, context: item.evidence.color_context! } } : {}),
      semantic_sidecar: placement&&old?.semantic_sidecar?old.semantic_sidecar:{ semantic_id: shot.shot_id, labels: ["stage3-creation"], evidence_refs: [shot.source.span_id], metadata: { purpose: shot.purpose } } };
    shots.set(shot.shot_id, clip); cursor=start+item.duration;
  }
  if(layout){if(cursor>BigInt(layout.duration_ticks))fail("CREATION_LAYOUT_REBOUND","picture outside retained extent");cursor=BigInt(layout.duration_ticks);}
  const desired = new Map<string, { kind: "video" | "audio"; clips: Clip[]; captions: Caption[] }>([["video-main", { kind: "video", clips: [...shots.values()], captions: [] }]]);
  for (const role of ["dialogue", "music", "narration", "sfx"] as const) desired.set(`audio-${role}`, { kind: "audio", clips: [], captions: [] });
  for (const audio of plan.audio) {
    unique(audio.audio_id);
    const shot = shots.get(audio.shot_id);
    if (!shot) throw new Error(`CREATION_AUDIO_SHOT_UNKNOWN:${audio.shot_id}`);
    const item = evidenceFor(audio.source, "audio"), start = shot.timeline_start + ticks(audio.offset, audio.audio_id);
    if (![audio.fade_in.value, audio.fade_out.value, audio.fade_in.timescale, audio.fade_out.timescale].every(Number.isSafeInteger)) fail("CREATION_TIME_INVALID", audio.audio_id);
    const fadeIn = BigInt(audio.fade_in.value), fadeOut = BigInt(audio.fade_out.value), inScale = BigInt(audio.fade_in.timescale), outScale = BigInt(audio.fade_out.timescale);
    if (inScale <= 0n || outScale <= 0n || start < 0n || start + item.duration > cursor || fadeIn < 0n || fadeOut < 0n || (fadeIn * outScale + fadeOut * inScale) * timebase.timescale > item.duration * timebase.value * inScale * outScale) fail("CREATION_AUDIO_RANGE_INVALID", audio.audio_id);
    desired.get(`audio-${audio.role}`)!.clips.push({ clip_id: objectId(audio.audio_id), media_kind: "audio", source: item.source, timeline_start: start, timeline_duration: item.duration, gain_db: audio.gain_db, link_group_id: shot.clip_id,
      ...(fadeIn > 0n || fadeOut > 0n ? { boundary_fades: { schema_version: 1 as const, ...(fadeIn > 0n ? { audio_fade_in: { value: BigInt(audio.fade_in.value), timescale: BigInt(audio.fade_in.timescale) } } : {}), ...(fadeOut > 0n ? { audio_fade_out: { value: BigInt(audio.fade_out.value), timescale: BigInt(audio.fade_out.timescale) } } : {}) } } : {}),
      semantic_sidecar: { semantic_id: audio.audio_id, labels: [audio.role, `shot:${shot.clip_id}`], evidence_refs: [audio.source.span_id], metadata: { purpose: audio.purpose } } });
  }
  desired.get("video-main")!.captions = plan.captions.map(caption => {
    unique(caption.caption_id);
    const shot = shots.get(caption.shot_id);
    if (!shot) throw new Error(`CREATION_CAPTION_SHOT_UNKNOWN:${caption.shot_id}`);
    const offset = ticks(caption.offset, caption.caption_id), duration = ticks(caption.duration, caption.caption_id), start = shot.timeline_start + offset;
    if (start < 0n || duration <= 0n || start + duration > cursor) fail("CREATION_CAPTION_RANGE_INVALID", caption.caption_id);
    if (caption.kind === "manual_editorial") {const prior=base.tracks.flatMap(t=>t.captions??[]).find(c=>c.caption_id===caption.caption_id);if(!prior||prior.semantic_sidecar?.metadata?.precision_authored_caption!=="true"||prior.text!==caption.text||prior.timeline_start!==start||prior.timeline_duration!==duration||caption.audio_anchor!==null||canonical(caption.evidence_ids)!==canonical(prior.semantic_sidecar?.evidence_refs??[]))fail("CREATION_MANUAL_CAPTION_REBOUND",caption.caption_id);return prior!;}
    const refs = caption.evidence_ids.map(id => { const value = observed.find(item => item.evidence_id === id); if (!value || !context.authorized_asset_ids.includes(value.asset_id)) throw new Error(`CREATION_CAPTION_EVIDENCE_UNKNOWN:${id}`); return value; });
    if (caption.kind === "editorial" && (caption.audio_anchor !== null || offset < 0n || offset + duration > shot.timeline_duration)) fail("CREATION_CAPTION_RANGE_INVALID", caption.caption_id);
    let anchor: Clip | undefined;
    if (caption.kind === "verbatim") {
      if (!caption.audio_anchor) fail("CREATION_CAPTION_AUDIO_REQUIRED", caption.caption_id);
      anchor = caption.audio_anchor!.kind === "embedded" ? shots.get(caption.audio_anchor!.id) : [...desired.values()].filter(item => item.kind === "audio").flatMap(item => item.clips).find(item => item.clip_id === objectId(caption.audio_anchor!.id));
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
    const existing = base.tracks.flatMap(track => track.captions ?? []).find(item => item.caption_id === caption.caption_id);
    // Retained captions keep their persisted layout and every author style;
    // a model edit must not silently reformat a protected historical caption.
    const style = existing ? existing.style : context.caption_layout_version === 1 ? { layout_version: 1 } : undefined;
    return { caption_id: objectId(caption.caption_id), text: caption.text, timeline_start: start, timeline_duration: duration, ...(style ? { style } : {}), ...(existing?.words&&existing.text===caption.text&&existing.timeline_start===start&&existing.timeline_duration===duration?{words:existing.words}:{}), semantic_sidecar: { semantic_id: existing?.semantic_sidecar?.semantic_id ?? caption.caption_id, labels: [`shot:${shot.clip_id}`, caption.kind, ...(anchor ? [`audio-anchor:${anchor.clip_id}`] : [])], evidence_refs: [...caption.evidence_ids],...(existing?.semantic_sidecar?.metadata?.precision_authored_caption==="true"?{metadata:{precision_authored_caption:"true"}}:{}) } };
  });
  // Manual association and audition state have no implicit model reset. Preserve
  // their explicit metadata; placement/source/gain remain the typed proposal.
  for(const target of desired.values())for(let index=0;index<target.clips.length;index++){
    const next=target.clips[index]!,old=base.tracks.flatMap(track=>track.clips).find(clip=>clip.clip_id===next.clip_id);if(!old)continue;
    const manual=Object.fromEntries(Object.entries(old.semantic_sidecar?.metadata??{}).filter(([key])=>key.startsWith("precision_")));
    if(manual.precision_solo_gain!==undefined&&next.gain_db!==old.gain_db){manual.precision_solo_gain=next.gain_db===undefined?"absent":String(next.gain_db);}
    const equivalentSource=old.source.asset_id===next.source.asset_id&&old.source.start_pts*next.source.timescale===next.source.start_pts*old.source.timescale&&old.source.end_pts*next.source.timescale===next.source.end_pts*old.source.timescale;
    const retained:Clip={...next,...(equivalentSource?{source:old.source}:{}),...(next.grade&&old.grade?{grade:{...next.grade,grade_id:old.grade.grade_id}}:{}),...(old.media_kind?{media_kind:old.media_kind}:{}),...(old.kind==="media"?{kind:"media" as const}:{}),...(next.semantic_sidecar?{semantic_sidecar:{...next.semantic_sidecar,semantic_id:old.semantic_sidecar?.semantic_id??next.semantic_sidecar.semantic_id,...(Object.keys(manual).length?{metadata:{...next.semantic_sidecar.metadata,...manual}}:{})}}:{})};
    if(manual.precision_solo_gain!==undefined&&manual.precision_solo_selected!=="true") (retained as any).gain_db=-96;
    if(manual.precision_association==="detached"){delete (retained as any).link_group_id;if(retained.semantic_sidecar)(retained as any).semantic_sidecar={...retained.semantic_sidecar,labels:retained.semantic_sidecar.labels.filter(label=>!label.startsWith("shot:"))};}
    target.clips[index]=retained;
  }
  const protectedRefs = new Set([...context.protected_refs, ...plan.preserve_refs]);
  const commands: TimelineCommand[] = [];
  for (const [trackId, target] of desired) {
    const track = base.tracks.find(item => item.track_id === trackId);
    const routing: AudioRouting[] = target.kind === "audio" ? target.clips.map(clip => track?.audio_routing?.find(route=>route.source_clip_id===clip.clip_id) ?? ({ routing_id: allocate(`routing:${clip.clip_id}`), source_clip_id: clip.clip_id, bus: trackId.slice(6) as "dialogue" | "music" | "narration" | "sfx" })) : [];
    if (!track) { if (target.clips.length) commands.push({ type: "add_track", track: { track_id: trackId, kind: target.kind, clips: target.clips, captions: target.captions, ...(target.kind === "audio" ? { audio_routing: routing } : {}) } }); continue; }
    if (track.kind !== target.kind) fail("CREATION_TRACK_KIND_INVALID", trackId);
    if (track.enabled === false || (track.opacity !== undefined && track.opacity !== 1) || track.effects?.length || track.transitions?.length || track.automation_curves?.length || track.audio_routing?.some(route => route.bus !== trackId.slice(6))) fail("CREATION_TRACK_SEMANTICS_UNREPRESENTED", trackId);
    const trackCommands: TimelineCommand[] = [];
    if(target.kind==="video"&&!layout&&(track.gaps?.length??0)>0)trackCommands.push({type:"set_track_properties",track_id:trackId,properties:{gaps:[]}});
    for (const old of track.clips) {
      const next = target.clips.find(item => item.clip_id === old.clip_id);
      const identical = next && canonical(next) === canonical(old);
      const content = (clip: Clip) => ({ ...clip, timeline_start: undefined, semantic_sidecar: clip.semantic_sidecar ? { ...clip.semantic_sidecar, metadata: undefined } : undefined });
      if ((!next || canonical(content(next)) !== canonical(content(old))) && (protectedRefs.has(old.clip_id) || protectedRefs.has(`clip:${old.clip_id}`))) fail("CREATION_PROTECTED_CONTENT_CHANGED", old.clip_id);
      if (!identical && (old.grade?.lut_path || old.grade?.brightness !== undefined || old.grade?.gamma !== undefined || old.effects?.length || old.automation_curves?.length || old.mask || old.time_map || old.speed || old.keyframes?.length || old.transform && !creationStaticTransform(old.transform) || old.compound_clip_ids?.length || old.nested_sequence_id || old.kind && old.kind !== "media" && old.kind !== "image" || target.kind === "video" && old.boundary_fades)) fail("CREATION_EXISTING_SEMANTICS_UNREPRESENTED", old.clip_id);
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
