export function timelineAnnotationV2(annotation) {
  if (annotation?.schema_version === 2) return {
    schema_version: 2,
    annotation_id: annotation.annotation_id,
    anchor: {
      surface: annotation.anchor.surface,
      track_id: annotation.anchor.track_id,
      clip_id: annotation.anchor.clip_id,
      start: structuredClone(annotation.anchor.start),
      end: annotation.anchor.end === null ? null : structuredClone(annotation.anchor.end),
      preview_point: annotation.anchor.preview_point === null ? null : structuredClone(annotation.anchor.preview_point),
    },
    body: annotation.body,
  };
  if (annotation?.schema_version !== 1 || !annotation.annotation_id || !annotation.anchor?.track_id || !annotation.anchor.start) throw new Error("TIMELINE_ANNOTATION_INPUT_INVALID");
  return {
    schema_version: 2,
    annotation_id: annotation.annotation_id,
    anchor: { ...structuredClone(annotation.anchor), surface: "timeline", preview_point: null },
    body: annotation.body,
  };
}

// Project objects are persisted as canonical JSON, which may reorder object
// keys on readback. Compare JSON structure rather than its insertion order.
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export function timelineAnnotationDataEqual(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

/** A restored draft may be retried only when it is exactly the failed task's batch. */
export function canRetryFailedAnnotationBatch(queue, message) {
  if (!Array.isArray(queue?.annotations) || !Array.isArray(message?.annotations)) return false;
  if (!queue.annotations.length || queue.submission?.operation_id === message.operation_id) return true;
  try {
    return timelineAnnotationDataEqual(
      queue.annotations.map(timelineAnnotationV2),
      message.annotations.map(timelineAnnotationV2),
    );
  } catch {
    return false;
  }
}

/** Keep a nonempty unsent requirement when recovering a failed annotation. */
export function annotationRecoveryComposerText(currentText, failedRequestText) {
  if (typeof failedRequestText !== "string") throw new Error("TIMELINE_ANNOTATION_RECOVERY_REQUEST_INVALID");
  return typeof currentText === "string" && currentText.trim() && currentText !== failedRequestText
    ? currentText
    : failedRequestText;
}

export function prepareTimelineAnnotationSubmission(queue, binding, content, createId = () => globalThis.crypto.randomUUID()) {
  if (queue.submission) {
    if (queue.submission.schema_version !== 3) throw new Error("TIMELINE_ANNOTATION_LEGACY_SUBMISSION_REQUIRES_CONVERSION");
    const annotations = queue.annotations.map(timelineAnnotationV2);
    if (!timelineAnnotationDataEqual(annotations, queue.submission.annotations)
      || queue.submission.request_text !== content.request_text
      || !timelineAnnotationDataEqual(queue.submission.preserve_refs, content.preserve_refs)
      || !timelineAnnotationDataEqual(queue.submission.profile_query, content.profile_query)) throw new Error("TIMELINE_ANNOTATION_SUBMISSION_CONTENT_REBOUND");
    return structuredClone(queue.submission);
  }
  return {
    schema_version: 3,
    operation_id: createId(),
    message_id: createId(),
    project_id: binding.project_id,
    request_id: binding.request_id,
    draft_id: binding.draft_id,
    expected_revision: binding.expected_revision,
    timeline_version: binding.timeline_version,
    request_text: content.request_text,
    preserve_refs: [...content.preserve_refs],
    profile_query: content.profile_query === null ? null : structuredClone(content.profile_query),
    annotations: queue.annotations.map(timelineAnnotationV2),
  };
}

export function timelineTickAtMediaTime(currentTime, timebase) {
  if (!Number.isFinite(currentTime) || currentTime < 0 || !timebase || typeof timebase.value !== "bigint" || typeof timebase.timescale !== "bigint" || timebase.value <= 0n || timebase.timescale <= 0n) return null;
  const tick = currentTime * Number(timebase.timescale) / Number(timebase.value);
  if (!Number.isFinite(tick) || tick > Number.MAX_SAFE_INTEGER) return null;
  return BigInt(Math.floor(tick));
}

export function previewPointAtClientPoint(clientX, clientY, stageRect, videoWidth, videoHeight) {
  if (![clientX, clientY, stageRect?.left, stageRect?.top, stageRect?.width, stageRect?.height, videoWidth, videoHeight].every(Number.isFinite)
    || stageRect.width <= 0 || stageRect.height <= 0 || videoWidth <= 0 || videoHeight <= 0) return null;
  const fit = Math.min(stageRect.width / videoWidth, stageRect.height / videoHeight);
  const width = videoWidth * fit, height = videoHeight * fit;
  const left = stageRect.left + (stageRect.width - width) / 2, top = stageRect.top + (stageRect.height - height) / 2;
  if (clientX < left || clientX > left + width || clientY < top || clientY > top + height) return null;
  const normalize = (value, origin, extent) => Math.max(0, Math.min(1, Math.round(((value - origin) / extent) * 1_000_000) / 1_000_000));
  return { x: normalize(clientX, left, width), y: normalize(clientY, top, height) };
}

export function createPreviewTimelineAnnotation(timeline, tick, previewPoint, createId = () => globalThis.crypto.randomUUID()) {
  if (typeof tick !== "bigint" || tick < 0n || !Number.isFinite(previewPoint?.x) || !Number.isFinite(previewPoint?.y)
    || previewPoint.x < 0 || previewPoint.x > 1 || previewPoint.y < 0 || previewPoint.y > 1) throw new Error("TIMELINE_ANNOTATION_PREVIEW_POINT_INVALID");
  const timebase = timeline?.sequence?.timebase;
  if (!timebase || typeof timebase.value !== "bigint" || typeof timebase.timescale !== "bigint" || timebase.value <= 0n || timebase.timescale <= 0n) throw new Error("TIMELINE_ANNOTATION_TIMEBASE_INVALID");
  let numerator = tick * timebase.value, denominator = timebase.timescale;
  const gcd = (left, right) => { let a = left < 0n ? -left : left, b = right; while (b) [a, b] = [b, a % b]; return a || 1n; };
  const divisor = gcd(numerator, denominator); numerator /= divisor; denominator /= divisor;
  if (numerator > BigInt(Number.MAX_SAFE_INTEGER) || denominator > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("TIMELINE_ANNOTATION_ANCHOR_OVERFLOW");
  const videoTracks = [...(timeline.tracks ?? [])].reverse().filter(track => track.kind === "video" && track.enabled !== false);
  let active = null;
  for (const track of videoTracks) {
    const clip = track.clips.find(item => tick >= item.timeline_start && tick < item.timeline_start + item.timeline_duration);
    if (clip) { active = { track, clip }; break; }
  }
  const track = active?.track ?? videoTracks.find(item => item.track_id === "video-main") ?? videoTracks.at(-1);
  if (!track) throw new Error("TIMELINE_ANNOTATION_PREVIEW_TRACK_MISSING");
  return {
    schema_version: 2,
    annotation_id: createId(),
    anchor: {
      surface: "preview",
      track_id: track.track_id,
      clip_id: active?.clip.clip_id ?? null,
      start: { schema_version: 1, value: Number(numerator), timescale: Number(denominator) },
      end: null,
      preview_point: { x: previewPoint.x, y: previewPoint.y },
    },
    body: "",
  };
}

export function timelineAnnotationReceiptMatches(receipt, submission) {
  const message = receipt?.message;
  return Boolean(
    submission && message
    && (receipt.replayed === true || receipt.replayed === false)
    && message.operation_id === submission.operation_id
    && message.message_id === submission.message_id
    && message.project_id === submission.project_id
    && message.request_id === submission.request_id
    && message.draft_id === submission.draft_id
    && message.expected_revision === submission.expected_revision
    && message.timeline_version === submission.timeline_version
    && message.request_text === submission.request_text
    && timelineAnnotationDataEqual(message.preserve_refs, submission.preserve_refs)
    && timelineAnnotationDataEqual(message.profile_query, submission.profile_query)
    && timelineAnnotationDataEqual(message.annotations, submission.annotations)
    && receipt.processing?.status === "resolved"
    && receipt.processing?.result?.draft_id
    && Number.isSafeInteger(receipt.processing.result.timeline_version)
    && receipt.processing.result.render_id
  );
}

// A scoped conversation uses the same validated, source-bound annotation path as
// an explicit timeline comment. It must never silently fall back to the project.
export function currentClipConversationAnnotation(timeline, selection, body, createId = () => globalThis.crypto.randomUUID()) {
  const track = timeline?.tracks.find(item => item.track_id === selection?.track_id);
  const clip = selection?.caption_id ? track?.captions?.find(item => item.caption_id === selection.caption_id) : track?.clips.find(item => item.clip_id === selection?.clip_id);
  if (!clip || selection.timeline_version !== timeline.version) throw new Error("当前片段已失效，请重新选择后发送；未改为整部作品。");
  const timebase = timeline.sequence.timebase;
  const exact = tick => {
    let value = tick * timebase.value, timescale = timebase.timescale;
    let a = value, b = timescale; while (b) [a, b] = [b, a % b];
    const divisor = a || 1n; value /= divisor; timescale /= divisor;
    if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER) || timescale > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("片段范围超出精确批注边界。");
    return { schema_version: 1, value: Number(value), timescale: Number(timescale) };
  };
  return { schema_version: 2, annotation_id: createId(), anchor: { surface: "timeline", track_id: track.track_id, clip_id: clip.clip_id ?? null, start: exact(clip.timeline_start), end: exact(clip.timeline_start + clip.timeline_duration), preview_point: null }, body: `调整范围：仅当前${selection.caption_id ? `字幕/文字（${selection.caption_id}）` : "片段"}。${body}` };
}
