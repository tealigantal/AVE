import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPreviewTimelineAnnotation,
  currentClipConversationAnnotation,
  prepareTimelineAnnotationSubmission,
  previewPointAtClientPoint,
  timelineAnnotationV2,
  timelineTickAtMediaTime,
} from "../../apps/desktop/src/renderer/features/timeline-annotation-queue.js";

test("current-clip conversation binds exact range and rejects lost or stale selection", () => {
  const timeline={version:7,sequence:{timebase:{value:1001n,timescale:30000n}},tracks:[{track_id:"main",clips:[{clip_id:"shot",timeline_start:30n,timeline_duration:90n}]}]};
  timeline.tracks.push({track_id:"captions",clips:[],captions:[{caption_id:"caption",timeline_start:30n,timeline_duration:90n}]});
  const caption=currentClipConversationAnnotation(timeline,{timeline_version:7,track_id:"captions",caption_id:"caption"},"改字幕",()=>"caption-scope");
  assert.equal(caption.anchor.clip_id,null);assert.equal(caption.anchor.track_id,"captions");assert.match(caption.body,/caption/);
  const selected={timeline_version:7,track_id:"main",clip_id:"shot"};
  const annotation=currentClipConversationAnnotation(timeline,selected,"保留动作",()=>"scope-id");
  assert.deepEqual(annotation.anchor,{surface:"timeline",track_id:"main",clip_id:"shot",start:{schema_version:1,value:1001,timescale:1000},end:{schema_version:1,value:1001,timescale:250},preview_point:null});
  assert.match(annotation.body,/仅当前片段/);
  for(const invalid of [null,{...selected,timeline_version:6},{...selected,clip_id:"deleted"}])assert.throws(()=>currentClipConversationAnnotation(timeline,invalid,"要求"),/未改为整部作品/);
});

test("legacy timeline annotations upgrade to the strict v2 timeline surface", () => {
  const annotation = { schema_version: 1, annotation_id: "a", anchor: { track_id: "video-main", clip_id: null, start: { schema_version: 1, value: 1, timescale: 30 }, end: null }, body: "留意画面" };
  assert.deepEqual(timelineAnnotationV2(annotation), {
    schema_version: 2, annotation_id: "a",
    anchor: { surface: "timeline", track_id: "video-main", clip_id: null, start: { schema_version: 1, value: 1, timescale: 30 }, end: null, preview_point: null },
    body: "留意画面",
  });
  const projected = { schema_version: 2, annotation_id: "p", anchor: { surface: "preview", track_id: "video-main", clip_id: "clip", start: { schema_version: 1, value: 1, timescale: 30 }, end: null, preview_point: { x: 0.5, y: 0.5 } }, body: "保留正文", anchor_resolution: { status: "unresolved", timeline_version: 4 } };
  const { anchor_resolution: _projectionOnly, ...storedProjection } = projected;
  assert.deepEqual(timelineAnnotationV2(projected), storedProjection, "workspace-only anchor projections are stripped before a new contract-bound write");
});

test("preview point maps only to decoded video pixels and persists an exact timeline anchor", () => {
  const rect = { left: 10, top: 20, width: 400, height: 300 };
  assert.equal(previewPointAtClientPoint(200, 35, rect, 1600, 900), null, "letterbox is not part of the rendered frame");
  assert.deepEqual(previewPointAtClientPoint(210, 170, rect, 1600, 900), { x: 0.5, y: 0.5 });
  assert.equal(timelineTickAtMediaTime(0.5, { value: 1n, timescale: 30n }), 15n);
  assert.equal(timelineTickAtMediaTime(Number.POSITIVE_INFINITY, { value: 1n, timescale: 30n }), null);

  const timeline = {
    sequence: { timebase: { value: 1n, timescale: 30n } },
    tracks: [
      { track_id: "video-main", kind: "video", clips: [{ clip_id: "main", timeline_start: 0n, timeline_duration: 100n }] },
      { track_id: "video-pip-1", kind: "video", clips: [{ clip_id: "overlay", timeline_start: 10n, timeline_duration: 20n }] },
    ],
  };
  const annotation = createPreviewTimelineAnnotation(timeline, 15n, { x: 0.5, y: 0.5 }, () => "preview-id");
  assert.deepEqual(annotation, {
    schema_version: 2,
    annotation_id: "preview-id",
    anchor: { surface: "preview", track_id: "video-pip-1", clip_id: "overlay", start: { schema_version: 1, value: 1, timescale: 2 }, end: null, preview_point: { x: 0.5, y: 0.5 } },
    body: "",
  });
});

test("new annotation submissions bind the request and annotation batch to one stable v3 identity", () => {
  const queue = { annotations: [{ schema_version: 1, annotation_id: "a", anchor: { track_id: "video-main", clip_id: null, start: { schema_version: 1, value: 0, timescale: 1 }, end: null }, body: "批注" }], submission: null };
  let id = 0;
  const createId = () => `id-${++id}`;
  const binding = { project_id: "p", request_id: "r", draft_id: "d", expected_revision: 1, timeline_version: 2 };
  const content = { request_text: "整体要求", preserve_refs: ["clip-a"], profile_query: null };
  const submission = prepareTimelineAnnotationSubmission(queue, binding, content, createId);
  assert.equal(submission.schema_version, 3);
  assert.equal(submission.annotations[0].schema_version, 2);
  assert.equal(submission.annotations[0].anchor.surface, "timeline");
  assert.equal(submission.request_text, content.request_text);
  assert.equal(prepareTimelineAnnotationSubmission({ ...queue, submission }, binding, content, createId).operation_id, submission.operation_id);
  assert.throws(() => prepareTimelineAnnotationSubmission({ ...queue, annotations: [{ ...queue.annotations[0], body: "changed" }], submission }, binding, content, createId), /TIMELINE_ANNOTATION_SUBMISSION_CONTENT_REBOUND/);
  assert.throws(() => prepareTimelineAnnotationSubmission({ ...queue, submission }, binding, { ...content, request_text: "different" }, createId), /TIMELINE_ANNOTATION_SUBMISSION_CONTENT_REBOUND/);
});
