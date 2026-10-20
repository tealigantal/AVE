import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createProject, openProject } from "../../packages/platform/project-storage/src/project-storage.mjs";
import {
  listCreationConversationRevisionEvents,
  readTimelineAnnotationMessages,
  readTimelineAnnotationProcessingByOperation,
  registerTimelineAnnotationMessage,
  registerTimelineAnnotationProcessingEvent,
} from "../../packages/platform/project-storage/src/timeline-annotations.mjs";

const fixedTime = "2026-10-09T12:00:00.000Z";
const annotation = (body, value = 15) => ({
  schema_version: 2,
  annotation_id: randomUUID(),
  anchor: { surface: "timeline", track_id: "video-main", clip_id: "clip-a", start: { schema_version: 1, value, timescale: 30 }, end: null, preview_point: null },
  body,
});
const submit = (projectId, requestId = "request-a") => ({
  schema_version: 3,
  operation_id: randomUUID(),
  message_id: randomUUID(),
  project_id: projectId,
  request_id: requestId,
  draft_id: "draft-a",
  expected_revision: 1,
  timeline_version: 2,
  request_text: "保留第一镜头并调整音乐进入。",
  preserve_refs: [],
  profile_query: null,
  annotations: [annotation("检查第一镜头"), annotation("保留原声")],
});
function seedLegacyMessage(session, projectId, input, createdAt) {
  const eventId = Number(session.db.prepare("SELECT COALESCE(MAX(event_id),0) AS event_id FROM project_events").get().event_id) + 1;
  const message = { ...input, conversation_revision: eventId, created_at: createdAt };
  const eventType = input.schema_version === 1 ? "conversation.timeline_annotation.created" : "conversation.timeline_annotation.v2.created";
  session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?,?,?,?)").run(projectId, eventType, JSON.stringify(message), createdAt);
  return message;
}

test("timeline annotation batch is atomic, append-only, replayable and survives reopen", async t => {
  const root = await mkdtemp(resolve(tmpdir(), "ave-annotation-storage-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const projectRoot = resolve(root, "project");
  let session = await createProject(projectRoot);
  const projectId = session.manifest.project_id;
  const input = submit(projectId);
  const initialEvents = Number(session.db.prepare("SELECT COUNT(*) AS count FROM project_events").get().count);
  const eventForRevision = (requestId, sequence, digest) => session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?,?,?,?)")
    .run(projectId, "creation.state.saved", JSON.stringify({ request_id: requestId, sequence, object_hash: digest }), fixedTime);
  const digest1 = "a".repeat(64), digest2 = "b".repeat(64);
  const revisionEvent1 = Number(eventForRevision("request-a", 1, digest1).lastInsertRowid);
  const revisionEvent2 = Number(eventForRevision("request-a", 2, digest2).lastInsertRowid);

  const first = registerTimelineAnnotationMessage(session, projectId, input, fixedTime);
  assert.equal(first.replayed, false);
  assert.equal(first.message.annotations.length, 2);
  assert.equal(first.processing.status, "queued");
  assert.ok(first.message.conversation_revision < Number(session.db.prepare("SELECT MAX(event_id) AS id FROM project_events").get().id));
  assert.equal(Number(session.db.prepare("SELECT COUNT(*) AS count FROM project_events").get().count), initialEvents + 4);

  const replay = registerTimelineAnnotationMessage(session, projectId, input, "2026-10-09T12:01:00.000Z");
  assert.equal(replay.replayed, true);
  assert.deepEqual(replay.message, first.message);
  assert.equal(Number(session.db.prepare("SELECT COUNT(*) AS count FROM project_events").get().count), initialEvents + 4);
  assert.deepEqual(readTimelineAnnotationProcessingByOperation(session, projectId, input.operation_id), first.processing);

  const changedBody = structuredClone(input);
  changedBody.annotations[0].body = "尝试重绑正文";
  assert.throws(() => registerTimelineAnnotationMessage(session, projectId, changedBody, fixedTime), /TIMELINE_ANNOTATION_OPERATION_CONFLICT/);
  const reboundMessageId = { ...submit(projectId), operation_id: randomUUID(), message_id: input.message_id };
  assert.throws(() => registerTimelineAnnotationMessage(session, projectId, reboundMessageId, fixedTime), /TIMELINE_ANNOTATION_IDENTITY_CONFLICT/);

  const editable = registerTimelineAnnotationMessage(session, projectId, submit(projectId, "request-editable"), fixedTime);
  const failedStatus = registerTimelineAnnotationProcessingEvent(session, projectId, {
    schema_version: 1, operation_id: editable.message.operation_id, request_id: editable.message.request_id,
    target_revision: editable.message.expected_revision + 1, status: "failed", failure: { code: "MODEL_REJECTED", message: "可编辑失败正文" }, updated_at: fixedTime,
  });
  const superseded = registerTimelineAnnotationProcessingEvent(session, projectId, {
    schema_version: 1, operation_id: editable.message.operation_id, request_id: editable.message.request_id,
    target_revision: editable.message.expected_revision + 1, status: "superseded", updated_at: "2026-10-09T12:00:01.000Z",
  });
  assert.equal(failedStatus.event.status, "failed");
  assert.equal(superseded.event.status, "superseded");
  assert.equal(registerTimelineAnnotationProcessingEvent(session, projectId, { ...superseded.event, updated_at: "2026-10-09T12:00:03.000Z" }).replayed, true, "reopening the same failed operation is idempotent");
  assert.equal(readTimelineAnnotationProcessingByOperation(session, projectId, editable.message.operation_id).status, "superseded");
  assert.throws(() => registerTimelineAnnotationProcessingEvent(session, projectId, {
    schema_version: 1, operation_id: editable.message.operation_id, request_id: editable.message.request_id,
    target_revision: editable.message.expected_revision + 1, status: "processing", updated_at: "2026-10-09T12:00:02.000Z",
  }), /TIMELINE_ANNOTATION_PROCESSING_TRANSITION_INVALID/);

  const revisions = listCreationConversationRevisionEvents(session, projectId, "request-a", [
    { value: { sequence: 1, authorization: { request_id: "request-a" }, revisions: [{ revision: 1 }] }, ref: { digest: digest1 } },
    { value: { sequence: 2, authorization: { request_id: "request-a" }, revisions: [{ revision: 1 }, { revision: 2 }] }, ref: { digest: digest2 } },
    { value: { sequence: 3, authorization: { request_id: "request-a" }, revisions: [{ revision: 1 }, { revision: 2 }] }, ref: { digest: "c".repeat(64) } },
  ]);
  assert.equal(revisions.get(1), revisionEvent1);
  assert.equal(revisions.get(2), revisionEvent2);
  assert.ok(first.message.conversation_revision > revisionEvent2);

  session.db.exec("CREATE TEMP TRIGGER fail_annotation BEFORE INSERT ON project_events WHEN NEW.event_type='conversation.timeline_annotation.processing.v1.updated' BEGIN SELECT RAISE(ABORT, 'ANNOTATION_DISK_FAILURE'); END");
  const failed = submit(projectId, "request-b");
  const beforeFailure = Number(session.db.prepare("SELECT COUNT(*) AS count FROM project_events WHERE event_type='conversation.timeline_annotation.v3.created'").get().count);
  assert.throws(() => registerTimelineAnnotationMessage(session, projectId, failed, fixedTime), /ANNOTATION_DISK_FAILURE/);
  assert.equal(Number(session.db.prepare("SELECT COUNT(*) AS count FROM project_events WHERE event_type='conversation.timeline_annotation.v3.created'").get().count), beforeFailure);
  session.db.exec("DROP TRIGGER fail_annotation");

  await session.close();
  session = await openProject(projectRoot);
  assert.deepEqual(readTimelineAnnotationMessages(session, projectId, "request-a"), [first.message]);
  await session.close();
});

test("preview annotation v2 is stored as a versioned event beside readable v1 history", async t => {
  const root = await mkdtemp(resolve(tmpdir(), "ave-annotation-v2-storage-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const projectRoot = resolve(root, "project");
  let session = await createProject(projectRoot);
  const projectId = session.manifest.project_id;
  const oldInput = {
    schema_version: 1, operation_id: randomUUID(), message_id: randomUUID(), project_id: projectId,
    request_id: "request-mixed", draft_id: "draft-a", expected_revision: 1, timeline_version: 2,
    annotations: [{ schema_version: 1, annotation_id: randomUUID(), anchor: { track_id: "video-main", clip_id: "clip-a", start: { schema_version: 1, value: 15, timescale: 30 }, end: null }, body: "保留旧时间锚点" }],
  };
  const oldMessage = seedLegacyMessage(session, projectId, oldInput, fixedTime);
  const preview = {
    schema_version: 2,
    annotation_id: randomUUID(),
    anchor: { surface: "preview", track_id: "video-main", clip_id: "clip-a", start: { schema_version: 1, value: 1, timescale: 2 }, end: null, preview_point: { x: 0.27, y: 0.73 } },
    body: "保留这个画面位置",
  };
  const previewInput = {
    schema_version: 2, operation_id: randomUUID(), message_id: randomUUID(), project_id: projectId,
    request_id: "request-mixed", draft_id: "draft-a", expected_revision: 1, timeline_version: 2, annotations: [preview],
  };
  const previewMessage = seedLegacyMessage(session, projectId, previewInput, fixedTime);
  assert.equal(registerTimelineAnnotationMessage(session, projectId, oldInput, "2026-10-09T12:01:00.000Z").replayed, true);
  assert.equal(registerTimelineAnnotationMessage(session, projectId, previewInput, "2026-10-09T12:01:00.000Z").replayed, true);
  const currentRequired = { schema_version: 2, operation_id: randomUUID(), message_id: randomUUID(), project_id: projectId, request_id: "request-mixed", draft_id: "draft-a", expected_revision: 1, timeline_version: 2, annotations: [{ ...annotation("旧版本新提交") }] };
  assert.throws(() => registerTimelineAnnotationMessage(session, projectId, currentRequired, fixedTime), /TIMELINE_ANNOTATION_CURRENT_SUBMIT_REQUIRED/);
  assert.equal(previewMessage.schema_version, 2);
  assert.equal(session.db.prepare("SELECT event_type FROM project_events WHERE event_id=?").get(previewMessage.conversation_revision).event_type, "conversation.timeline_annotation.v2.created");
  assert.deepEqual(readTimelineAnnotationMessages(session, projectId, "request-mixed"), [oldMessage, previewMessage]);

  await session.close();
  session = await openProject(projectRoot);
  const reopened = readTimelineAnnotationMessages(session, projectId, "request-mixed");
  assert.deepEqual(reopened, [oldMessage, previewMessage]);
  assert.deepEqual(reopened[1].annotations[0].anchor.preview_point, { x: 0.27, y: 0.73 });
  await session.close();
});
