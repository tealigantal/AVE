import assert from "node:assert/strict";
import { prepareTimelineAnnotationSubmission, timelineAnnotationReceiptMatches } from "../../apps/desktop/src/renderer/features/timeline-annotation-queue.js";

const annotation = {
  schema_version: 1,
  annotation_id: "annotation-1",
  anchor: { track_id: "video-1", clip_id: "clip-1", start: { schema_version: 1, value: 42, timescale: 30 }, end: null },
  body: "保留动作节奏",
} as const;
const binding = { project_id: "project-1", request_id: "request-1", draft_id: "draft-1", expected_revision: 2, timeline_version: 7 };
const content = { request_text: "整体要求", preserve_refs: [] as string[], profile_query: null };
const queue = { schema_version: 1, annotations: [annotation], submission: null as any };
let generatedIds = 0;
const createId = () => `stable-id-${++generatedIds}`;

const firstSubmission = prepareTimelineAnnotationSubmission(queue, binding, content, createId);
queue.submission = firstSubmission;
const ambiguousRetry = prepareTimelineAnnotationSubmission(queue, binding, content, createId);
assert.deepEqual(ambiguousRetry, firstSubmission, "retry keeps the exact durable operation and message identity");
assert.equal(generatedIds, 2, "retry does not allocate a replacement identity");
assert.notEqual(ambiguousRetry.annotations, firstSubmission.annotations, "retry receives a detached payload snapshot");

const resolvedReceipt = { replayed: false, message: firstSubmission, processing: { status: "resolved", result: { draft_id: "draft-result", timeline_version: 8, render_id: "render-result" } } };
assert.equal(timelineAnnotationReceiptMatches(resolvedReceipt, firstSubmission), true);
assert.equal(timelineAnnotationReceiptMatches({ ...resolvedReceipt, replayed: true }, firstSubmission), true);
assert.equal(timelineAnnotationReceiptMatches({ message: firstSubmission, processing: resolvedReceipt.processing }, firstSubmission), false, "receipt must state whether it was replayed");
assert.equal(timelineAnnotationReceiptMatches({ ...resolvedReceipt, message: { ...firstSubmission, timeline_version: 8 } }, firstSubmission), false);
assert.equal(timelineAnnotationReceiptMatches({ ...resolvedReceipt, message: { ...firstSubmission, annotations: [{ ...annotation, body: "changed" }] } }, firstSubmission), false);

const editedQueue = { schema_version: 1, annotations: [{ ...annotation, body: "改为新的批注" }], submission: null as any };
const editedSubmission = prepareTimelineAnnotationSubmission(editedQueue, binding, content, createId);
assert.notEqual(editedSubmission.operation_id, firstSubmission.operation_id, "editing a failed queue starts a new idempotent operation");
assert.notEqual(editedSubmission.message_id, firstSubmission.message_id);
assert.equal(editedSubmission.annotations[0].body, "改为新的批注");

assert.throws(() => prepareTimelineAnnotationSubmission({ ...queue, annotations: editedQueue.annotations }, binding, content, createId), /TIMELINE_ANNOTATION_SUBMISSION_CONTENT_REBOUND/);
