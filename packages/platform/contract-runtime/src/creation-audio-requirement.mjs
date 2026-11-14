import { CreationError, validateCreationState } from "./creation-session.mjs";

const fail = (code, detail) => { throw new CreationError(code, detail); };
const integer = value => {
  if (typeof value === "bigint") return value;
  if (typeof value === "string" && /^-?\d+n$/.test(value)) return BigInt(value.slice(0, -1));
  if (Number.isSafeInteger(value)) return BigInt(value);
  return fail("CREATION_AUDIO_INTENT_INVALID", "invalid exact Timeline integer");
};

/** Source boundary proof. The caller must supply a freshly fingerprinted probe. */
export function creationSourceTrackBoundary(asset, fresh) {
  const bad = () => fail("CREATION_SOURCE_TRACK_BOUNDARY_UNPROVEN", "complete contiguous decoded source audio bounds are required");
  if (!asset || asset.algorithm !== "sha256" || !/^[a-f0-9]{64}$/.test(asset.digest) || asset.asset_id !== `asset:sha256:${asset.digest}` || fresh?.asset_id !== asset.asset_id || !Number.isSafeInteger(asset.byte_length) || asset.byte_length <= 0) fail("CREATION_SOURCE_TRACK_IDENTITY_INVALID", "persisted and freshly inspected source identities must match");
  const derive = probe => {
    if (!probe || !Array.isArray(probe.streams) || !probe.timing?.streams) return bad();
    const streams = probe.streams.filter(item => item?.codec_type === "audio");
    if (!streams.length) fail("CREATION_SOURCE_TRACK_MISSING", "source has no audio stream");
    if (streams.length !== 1) fail("CREATION_STREAM_AMBIGUOUS", "source has multiple audio streams");
    const stream = streams[0], timing = probe.timing.streams[String(stream.index)], decoded = timing?.decoded_audio_bounds;
    const match = typeof stream.time_base === "string" ? /^(\d+)\/(\d+)$/.exec(stream.time_base) : null;
    if (!Number.isSafeInteger(stream.index) || stream.index < 0 || !match || BigInt(match[1]) <= 0n || BigInt(match[2]) <= 0n || timing?.time_base !== stream.time_base || decoded?.method !== "decoded-contiguous-samples-v1") return bad();
    const values = [stream.duration_ts, timing.duration_ts, decoded.start_pts, decoded.end_pts, decoded.sample_rate, decoded.sample_count];
    if (values.some(value => !Number.isSafeInteger(Number(value)) || !/^-?\d+$/.test(String(value)))) return bad();
    const [duration, observedDuration, first, last, rate, count] = values.map(value => BigInt(value));
    const declaredStart = stream.start_pts === undefined ? first : /^-?\d+$/.test(String(stream.start_pts)) ? BigInt(stream.start_pts) : -1n;
    if (duration <= 0n || duration !== observedDuration || first < 0n || last <= first || rate <= 0n || count <= 0n || declaredStart !== first || declaredStart + duration !== last || String(stream.sample_rate) !== String(rate) || timing.frame_count !== decoded.frame_count || String(timing.first_frame_pts) !== String(first) || (last - first) * BigInt(match[1]) * rate !== count * BigInt(match[2])) return bad();
    return { stream_index: stream.index, start_pts: String(first), end_pts: String(last), time_base: { numerator: String(BigInt(match[1])), denominator: String(BigInt(match[2])) }, sample_rate: String(rate), sample_count: String(count) };
  };
  const persisted = derive(asset.stream_facts), current = derive(fresh.probe);
  if (JSON.stringify(persisted) !== JSON.stringify(current)) fail("CREATION_SOURCE_TRACK_BOUNDARY_REBOUND", "persisted and freshly inspected audio boundaries differ");
  return { version: 1, asset_id: asset.asset_id, byte_length: asset.byte_length, ...persisted };
}

/** Local revision actions are not model statements or data permissions. */
export function resolveCreationAmbientRequirementAtRevision(state, revision = state?.revisions?.length) {
  validateCreationState(state);
  if (!Number.isSafeInteger(revision) || revision < 1 || revision > state.revisions.length) fail("REQUEST_REVISION_STALE", "ambient action revision is unavailable");
  for (let index = revision - 1; index >= 0; index--) {
    const item = state.revisions[index];
    if (item.ambient_requirement_update) return { status: item.ambient_requirement_update.value === "require" ? "required" : "cleared", action_revision: item.revision };
  }
  return { status: "unspecified", action_revision: null };
}

function activeAudioClips(context, timeline) {
  const solo = timeline.tracks.some(track => track.enabled !== false && track.solo === true);
  return timeline.tracks.filter(track => track.enabled !== false && track.muted !== true && (!solo || track.solo === true)).flatMap(track => track.clips.flatMap(clip => {
    const route = track.audio_routing?.find(item => item.source_clip_id === clip.clip_id);
    if (route?.muted || (clip.gain_db ?? 0) + (route?.gain_db ?? 0) <= -96 || clip.kind === "image") return [];
    if (context.audio_requirement_projection === "source-evidence-v2" && ((clip.kind !== undefined && clip.kind !== "media") || clip.speed || clip.time_map || clip.compound_clip_ids?.length || clip.nested_sequence_id || clip.boundary_fades?.audio_fade_in || clip.boundary_fades?.audio_fade_out)) return [];
    if (context.audio_requirement_projection === "source-evidence-v2") {
      const grid = timeline.sequence?.timebase, source = clip.source;
      if (!grid || integer(grid.value) <= 0n || integer(grid.timescale) <= 0n || integer(source.timescale) <= 0n || (integer(source.end_pts) - integer(source.start_pts)) * integer(grid.timescale) !== integer(clip.timeline_duration) * integer(grid.value) * integer(source.timescale)) return [];
    }
    if ((track.automation_curves?.length ?? 0) || (track.keyframes?.length ?? 0) || (clip.automation_curves?.length ?? 0) || (clip.keyframes?.length ?? 0) || (clip.effects?.length ?? 0) || (track.effects ?? []).some(effect => effect.enabled !== false && effect.clip_id === clip.clip_id && effect.kind !== "grayscale")) return [];
    return [clip];
  }));
}

function coveredAudioEvidence(context, eligible, id, kind) {
  return context.source_spans.some(span => span.has_audio === true && eligible.some(clip => clip.source.asset_id === span.asset_id && clip.semantic_sidecar?.evidence_refs.includes(span.span_id) && (span.observations ?? []).some(obs => {
    if (obs.evidence_id !== id || obs.uncertain !== false || (kind === "speech" ? obs.kind !== "transcript" : obs.kind !== "audio_event" || (kind === "ambient" ? obs.event_kind !== "ambient" : !["ambient", "speech", "music"].includes(obs.event_kind)) || obs.signal?.nonzero !== true) || !/^-?\d+$/.test(String(obs.start_pts)) || !/^-?\d+$/.test(String(obs.end_pts)) || !/^[1-9]\d*$/.test(String(obs.timescale))) return false;
    const source = clip.source, scale = BigInt(obs.timescale), start = BigInt(obs.start_pts), end = BigInt(obs.end_pts), sourceScale = integer(source.timescale);
    return integer(source.start_pts) * scale <= start * sourceScale && integer(source.end_pts) * scale >= end * sourceScale;
  })));
}

/** A full-track proof covers one explicitly identified source requirement. */
export function isSelectedSourceTrackRequirement(context, requirement) {
  const asset = context?.source_track_retention?.asset_id;
  return context?.source_track_retention?.version === 1 && /^asset:sha256:[a-f0-9]{64}$/.test(asset ?? "") && requirement?.kind === "source_audio" && Array.isArray(requirement.evidence_ids) && requirement.evidence_ids.length === 1 && requirement.evidence_ids[0] === `source-track:${asset}`;
}

export function assertCreationAudioIntentTimeline(context, query, timeline) {
  if (!["source-evidence-v1", "source-evidence-v2"].includes(context?.audio_requirement_projection)) return;
  if (context.source_track_retention?.version === 1) assertCreationSourceTrackTimeline(context.source_track_retention.boundary, timeline);
  const intent = query?.audio_intent;
  if (!intent || !["required", "not_requested"].includes(intent.status) || !Array.isArray(intent.requirements)) fail("CREATION_AUDIO_INTENT_INVALID", "missing verified audio interpretation");
  if (intent.status === "not_requested") return;
  const eligible = activeAudioClips(context, timeline);
  if (intent.requirements.filter(requirement => isSelectedSourceTrackRequirement(context, requirement)).length > 1) fail("CREATION_AUDIO_INTENT_AMBIGUOUS", "one selected source-track proof cannot satisfy multiple independent sound requirements");
  for (const requirement of intent.requirements) if (!isSelectedSourceTrackRequirement(context, requirement) && !requirement.evidence_ids.every(id => coveredAudioEvidence(context, eligible, id, requirement.kind))) fail("CREATION_AUDIO_REQUIREMENT_UNMET", "requested source sound is not active on the simulated timeline");
}

/** Evidence is measured from the bound WAV and remains a model assessment. */
export function creationExplicitAmbientEvidence(context) {
  if (context?.audio_requirement_projection !== "source-evidence-v2" || !Array.isArray(context.source_spans)) fail("CREATION_AUDIO_EVIDENCE_INSUFFICIENT", "the explicit ambient requirement needs a v2 source-bound sound observation");
  const candidates = context.source_spans.flatMap(span => (span.observations ?? []).filter(obs => {
    if (span.has_audio !== true || obs.kind !== "audio_event" || obs.event_kind !== "ambient" || obs.uncertain !== false || obs.signal?.nonzero !== true) return false;
    const signal = obs.signal;
    if (!/^asset:sha256:[a-f0-9]{64}$/.test(span.asset_id ?? "") || typeof obs.evidence_id !== "string" || !obs.evidence_id || signal.method !== "pcm16-sample-v1" || signal.source_digest !== span.asset_id.slice("asset:sha256:".length) || !/^[a-f0-9]{64}$/.test(signal.sample_digest ?? "") || !/^[a-f0-9]{64}$/.test(signal.pcm_digest ?? "") || typeof signal.sample_id !== "string" || !signal.sample_id || !Number.isSafeInteger(signal.stream_index) || signal.stream_index < 0 || !Number.isSafeInteger(signal.sample_rate) || signal.sample_rate <= 0 || !Number.isSafeInteger(signal.channels) || signal.channels <= 0 || !Number.isSafeInteger(signal.sample_count) || signal.sample_count <= 0 || !/^\d+$/.test(String(obs.start_pts)) || !/^\d+$/.test(String(obs.end_pts)) || !/^[1-9]\d*$/.test(String(obs.timescale)) || BigInt(obs.end_pts) <= BigInt(obs.start_pts) || (BigInt(obs.end_pts) - BigInt(obs.start_pts)) * BigInt(signal.sample_rate) !== BigInt(signal.sample_count) * BigInt(obs.timescale)) fail("CREATION_AUDIO_EVIDENCE_INSUFFICIENT", "ambient event identity, source time or PCM measurement is invalid");
    return true;
  }).map(obs => obs.evidence_id));
  if (new Set(candidates).size !== candidates.length) fail("CREATION_AUDIO_EVIDENCE_INSUFFICIENT", "ambient event identity is ambiguous");
  return candidates;
}

/** This local guard is independent of the model's request interpretation. */
export function assertCreationExplicitAmbientTimeline(context, timeline) {
  const candidates = creationExplicitAmbientEvidence(context), eligible = activeAudioClips(context, timeline);
  if (!candidates.some(id => coveredAudioEvidence(context, eligible, id, "ambient"))) fail("CREATION_AUDIO_REQUIREMENT_UNMET", "the explicit ambient requirement is not covered by an active source event");
}

/** An uncertain creative outcome is reviewable; malformed claimed evidence is not. */
export function assessCreationAmbientTimeline(context, timeline) {
  if (!context || typeof context !== "object" || ![undefined, "source-evidence-v1", "source-evidence-v2"].includes(context.audio_requirement_projection)) fail("CREATION_AUDIO_EVIDENCE_INSUFFICIENT", "unknown audio evidence projection");
  if (context.audio_requirement_projection !== "source-evidence-v2") return { status: "unverified", reason: "no-sound-analysis" };
  const candidates = creationExplicitAmbientEvidence(context);
  if (!candidates.length) return { status: "unverified", reason: "no-verified-ambient-event" };
  const eligible = activeAudioClips(context, timeline);
  return candidates.some(id => coveredAudioEvidence(context, eligible, id, "ambient"))
    ? { status: "verified" }
    : { status: "unverified", reason: "event-not-covered" };
}

/** Exact source participation only; no assertion about classification or mix. */
export function assertCreationSourceTrackTimeline(boundary, timeline) {
  const invalid = () => fail("CREATION_SOURCE_TRACK_UNMET", "the complete selected source track is not continuously active on the simulated Timeline");
  if (!boundary || boundary.version !== 1 || !/^asset:sha256:[a-f0-9]{64}$/.test(boundary.asset_id ?? "") || !timeline?.sequence?.timebase || !Array.isArray(timeline.tracks) || timeline.master_loudness || timeline.dialogue_music_ducking || !/^\d+$/.test(String(boundary.start_pts)) || !/^\d+$/.test(String(boundary.end_pts)) || !/^[1-9]\d*$/.test(String(boundary.time_base?.numerator)) || !/^[1-9]\d*$/.test(String(boundary.time_base?.denominator))) return invalid();
  const grid = timeline.sequence.timebase, tick = integer(grid.value), tickScale = integer(grid.timescale);
  const num = BigInt(boundary.time_base?.numerator ?? "0"), den = BigInt(boundary.time_base?.denominator ?? "0"), start = BigInt(boundary.start_pts), end = BigInt(boundary.end_pts);
  if (tick <= 0n || tickScale <= 0n || num <= 0n || den <= 0n || start < 0n || end <= start) return invalid();
  const solo = timeline.tracks.some(track => track.enabled !== false && track.solo === true), pieces = [], other = [];
  const protectedTracks = timeline.tracks.filter(track => track.track_id === "audio-source-retained");
  if (protectedTracks.length !== 1 || protectedTracks[0].kind !== "audio" || protectedTracks[0].clips?.length !== 1) return invalid();
  const protectedTrack = protectedTracks[0], protectedClip = protectedTrack.clips[0];
  if (protectedClip.source?.asset_id !== boundary.asset_id || protectedClip.semantic_sidecar?.semantic_id !== protectedClip.clip_id || !protectedClip.semantic_sidecar?.labels?.includes("source-track-retention-v1")) return invalid();
  for (const track of timeline.tracks) {
    if (!["video", "audio"].includes(track.kind) || track.enabled === false || track.muted === true || (solo && track.solo !== true)) continue;
    for (const clip of track.clips) {
      if (clip.source?.asset_id !== boundary.asset_id || (clip.kind !== undefined && clip.kind !== "media")) continue;
      const routes = (track.audio_routing ?? []).filter(route => route.source_clip_id === clip.clip_id);
      if (routes.length > 1) return invalid();
      if (routes[0]?.muted === true) continue;
      const position = integer(clip.timeline_start), duration = integer(clip.timeline_duration);
      if (position < 0n || duration <= 0n) return invalid();
      if (track !== protectedTrack || clip !== protectedClip) {
        if (clip.effects?.length || clip.time_map || clip.speed || clip.compound_clip_ids?.length || clip.nested_sequence_id || track.transitions?.length || (track.effects ?? []).some(effect => effect.enabled !== false && effect.kind !== "grayscale")) return invalid();
        other.push({ position, duration });
        continue;
      }
      if (routes.length !== 1 || routes[0].bus !== "embedded") return invalid();
      if ((routes[0]?.gain_db ?? 0) !== 0 || (clip.gain_db ?? 0) !== 0 || clip.speed || clip.time_map || clip.compound_clip_ids?.length || clip.nested_sequence_id || clip.boundary_fades?.audio_fade_in || clip.boundary_fades?.audio_fade_out || clip.effects?.length || clip.keyframes?.length || clip.automation_curves?.length || track.keyframes?.length || track.automation_curves?.length || track.transitions?.length || (track.effects ?? []).some(effect => effect.enabled !== false && effect.kind !== "grayscale")) return invalid();
      const scale = integer(clip.source.timescale), first = integer(clip.source.start_pts), last = integer(clip.source.end_pts);
      if (scale <= 0n || first < 0n || last <= first || position < 0n || duration <= 0n || (last - first) * tickScale !== duration * tick * scale) return invalid();
      pieces.push({ first, last, scale, position, duration });
    }
  }
  pieces.sort((a, b) => a.first * b.scale < b.first * a.scale ? -1 : a.first * b.scale > b.first * a.scale ? 1 : 0);
  if (!pieces.length || pieces[0].first * den !== start * num * pieces[0].scale || pieces.at(-1).last * den !== end * num * pieces.at(-1).scale) return invalid();
  for (let index = 1; index < pieces.length; index++) {
    const previous = pieces[index - 1], current = pieces[index];
    if (previous.last * current.scale !== current.first * previous.scale || previous.position + previous.duration !== current.position) return invalid();
  }
  const audible = [...pieces, ...other].sort((a, b) => a.position < b.position ? -1 : a.position > b.position ? 1 : 0);
  for (let index = 1; index < audible.length; index++) if (audible[index].position < audible[index - 1].position + audible[index - 1].duration) fail("CREATION_SOURCE_TRACK_AUDIO_OVERLAP", "active audio from the selected source overlaps another copy on the Timeline");
}
