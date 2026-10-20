import {
  timelineAnnotationMessageV1Validator,
  timelineAnnotationSubmitV1Validator,
  timelineAnnotationMessageV2Validator,
  timelineAnnotationSubmitV2Validator,
  timelineAnnotationSubmitV3Validator,
  timelineAnnotationMessageV3Validator,
  timelineAnnotationProcessingV1Validator,
} from "../../contract-runtime/src/public.mjs";

const EVENT_TYPE_V1 = "conversation.timeline_annotation.created";
const EVENT_TYPE_V2 = "conversation.timeline_annotation.v2.created";
const EVENT_TYPE_V3 = "conversation.timeline_annotation.v3.created";
const PROCESSING_EVENT_TYPE = "conversation.timeline_annotation.processing.v1.updated";
const EVENT_TYPES = [EVENT_TYPE_V1, EVENT_TYPE_V2, EVENT_TYPE_V3];
const REVISION_EVENT_TYPE = "creation.state.saved";

function eventTypeForVersion(version) {
  if (version === 1) return EVENT_TYPE_V1;
  if (version === 2) return EVENT_TYPE_V2;
  if (version === 3) return EVENT_TYPE_V3;
  throw new Error("TIMELINE_ANNOTATION_VERSION_UNSUPPORTED");
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function submittedContent(value) {
  return {
    schema_version: value.schema_version,
    operation_id: value.operation_id,
    message_id: value.message_id,
    project_id: value.project_id,
    request_id: value.request_id,
    draft_id: value.draft_id,
    expected_revision: value.expected_revision,
    timeline_version: value.timeline_version,
    annotations: value.annotations,
    ...(value.schema_version === 3 ? { request_text: value.request_text, preserve_refs: value.preserve_refs, profile_query: value.profile_query } : {}),
  };
}

function readMessages(session, projectId) {
  if (session.manifest.project_id !== projectId) throw new Error("TIMELINE_ANNOTATION_PROJECT_MISMATCH");
  const rows = session.db.prepare(`SELECT event_id,event_type,payload_json,created_at FROM project_events WHERE project_id=? AND event_type IN (${EVENT_TYPES.map(() => "?").join(",")}) ORDER BY event_id`).all(projectId, ...EVENT_TYPES);
  const messages = rows.map(row => {
    let message;
    try { message = JSON.parse(row.payload_json); }
    catch (cause) { throw new Error("TIMELINE_ANNOTATION_EVENT_CORRUPT", { cause }); }
    const expectedEventType = message?.schema_version === 1 ? EVENT_TYPE_V1 : message?.schema_version === 2 ? EVENT_TYPE_V2 : message?.schema_version === 3 ? EVENT_TYPE_V3 : null;
    const validMessage = message?.schema_version === 1
      ? timelineAnnotationMessageV1Validator(message)
      : message?.schema_version === 2
        ? timelineAnnotationMessageV2Validator(message)
        : message?.schema_version === 3 && timelineAnnotationMessageV3Validator(message);
    if (!validMessage
      || row.event_type !== expectedEventType
      || message.project_id !== projectId
      || !Number.isSafeInteger(row.event_id)
      || message.conversation_revision !== row.event_id
      || message.created_at !== row.created_at) throw new Error("TIMELINE_ANNOTATION_EVENT_CORRUPT");
    return message;
  });
  const operations = new Set(), messageIds = new Set(), annotationIds = new Set();
  for (const message of messages) {
    if (operations.has(message.operation_id) || messageIds.has(message.message_id)) throw new Error("TIMELINE_ANNOTATION_IDENTITY_REBOUND");
    operations.add(message.operation_id);
    messageIds.add(message.message_id);
    for (const annotation of message.annotations) {
      if (annotationIds.has(annotation.annotation_id)) throw new Error("TIMELINE_ANNOTATION_IDENTITY_REBOUND");
      annotationIds.add(annotation.annotation_id);
    }
  }
  return messages;
}

export function readTimelineAnnotationMessages(session, projectId, requestId = null) {
  return readMessages(session, projectId).filter(message => requestId === null || message.request_id === requestId);
}

export function readTimelineAnnotationMessageByOperation(session, projectId, operationId) {
  return readMessages(session, projectId).find(message => message.operation_id === operationId) ?? null;
}

export function readTimelineAnnotationProcessingEvents(session, projectId, requestId = null) {
  if (session.manifest.project_id !== projectId) throw new Error("TIMELINE_ANNOTATION_PROJECT_MISMATCH");
  const messages = new Map(readMessages(session, projectId).filter(message => message.schema_version === 3).map(message => [message.operation_id, message]));
  const rows = session.db.prepare("SELECT event_id,event_type,payload_json,created_at FROM project_events WHERE project_id=? AND event_type=? ORDER BY event_id").all(projectId, PROCESSING_EVENT_TYPE);
  const latest = new Map();
  for (const row of rows) {
    let event;
    try { event = JSON.parse(row.payload_json); }
    catch (cause) { throw new Error("TIMELINE_ANNOTATION_PROCESSING_EVENT_CORRUPT", { cause }); }
    const message = messages.get(event?.operation_id), previous = latest.get(event?.operation_id) ?? null;
    if (row.event_type !== PROCESSING_EVENT_TYPE
      || !timelineAnnotationProcessingV1Validator(event)
      || event.updated_at !== row.created_at
      || !Number.isSafeInteger(row.event_id)
      || !message
      || event.request_id !== message.request_id
      || event.target_revision !== message.expected_revision + 1) throw new Error("TIMELINE_ANNOTATION_PROCESSING_EVENT_CORRUPT");
    const allowed = previous === null
      ? event.status === "queued"
      : previous.status === "queued" ? ["processing", "failed"].includes(event.status)
        : previous.status === "processing" ? ["failed", "resolved"].includes(event.status)
          : previous.status === "failed" ? ["processing", "superseded"].includes(event.status)
            : false;
    if (!allowed) throw new Error("TIMELINE_ANNOTATION_PROCESSING_TRANSITION_INVALID");
    latest.set(event.operation_id, event);
  }
  if ([...messages.values()].some(message => !latest.has(message.operation_id))) throw new Error("TIMELINE_ANNOTATION_PROCESSING_EVENT_MISSING");
  return [...latest.values()].filter(event => requestId === null || event.request_id === requestId);
}

export function readTimelineAnnotationProcessingByOperation(session, projectId, operationId) {
  return readTimelineAnnotationProcessingEvents(session, projectId).find(event => event.operation_id === operationId) ?? null;
}

/** Exact, validated mapping from every stored user revision to its Host event order. */
export function listCreationConversationRevisionEvents(session, projectId, requestId, history) {
  if (session.manifest.project_id !== projectId || !Array.isArray(history) || !requestId) throw new Error("CREATION_CONVERSATION_IDENTITY_INVALID");
  const rows = session.db.prepare("SELECT event_id,payload_json FROM project_events WHERE project_id=? AND event_type=? ORDER BY event_id").all(projectId, REVISION_EVENT_TYPE);
  const events = rows.map(row => {
    let payload;
    try { payload = JSON.parse(row.payload_json); }
    catch (cause) { throw new Error("CREATION_CONVERSATION_EVENT_CORRUPT", { cause }); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)
      || Object.keys(payload).sort().join(",") !== "object_hash,request_id,sequence"
      || typeof payload.request_id !== "string"
      || !Number.isSafeInteger(payload.sequence) || payload.sequence < 1
      || !/^[0-9a-f]{64}$/.test(payload.object_hash)
      || !Number.isSafeInteger(row.event_id) || row.event_id < 1) throw new Error("CREATION_CONVERSATION_EVENT_CORRUPT");
    return { event_id: row.event_id, ...payload };
  }).filter(event => event.request_id === requestId);
  const snapshots = history.map(saved => {
    const sequence = saved?.value?.sequence, digest = saved?.ref?.digest;
    if (!Number.isSafeInteger(sequence) || sequence < 1 || saved.value?.authorization?.request_id !== requestId || !Array.isArray(saved.value?.revisions) || !/^[0-9a-f]{64}$/.test(digest ?? "")) throw new Error("CREATION_CONVERSATION_HISTORY_INVALID");
    const matches = events.filter(event => event.sequence === sequence && event.object_hash === digest);
    if (matches.length > 1) throw new Error("CREATION_CONVERSATION_REVISION_UNBOUND");
    return { sequence, value: saved.value, event_id: matches[0]?.event_id ?? null };
  }).sort((left, right) => left.sequence - right.sequence);
  if (new Set(snapshots.map(snapshot => snapshot.sequence)).size !== snapshots.length) throw new Error("CREATION_CONVERSATION_REVISION_UNBOUND");
  const latest = snapshots.at(-1);
  const revisions = new Map();
  for (const revision of latest?.value.revisions ?? []) {
    if (!Number.isSafeInteger(revision.revision) || revision.revision < 1 || revisions.has(revision.revision)) throw new Error("CREATION_CONVERSATION_HISTORY_INVALID");
    const firstSnapshot = snapshots.find(snapshot => snapshot.value.revisions.some(item => item.revision === revision.revision));
    if (!firstSnapshot || !Number.isSafeInteger(firstSnapshot.event_id)) throw new Error("CREATION_CONVERSATION_REVISION_UNBOUND");
    revisions.set(revision.revision, firstSnapshot.event_id);
  }
  if (revisions.size !== latest?.value.revisions.length) throw new Error("CREATION_CONVERSATION_REVISION_UNBOUND");
  return revisions;
}

/** One append-only Host event is the atomic message plus batched annotations. */
export function registerTimelineAnnotationMessage(session, projectId, submit, createdAt) {
  const validSubmit = submit?.schema_version === 1
    ? timelineAnnotationSubmitV1Validator(submit)
    : submit?.schema_version === 2
      ? timelineAnnotationSubmitV2Validator(submit)
      : submit?.schema_version === 3 && timelineAnnotationSubmitV3Validator(submit);
  const eventType = [1, 2, 3].includes(submit?.schema_version) ? eventTypeForVersion(submit.schema_version) : null;
  if (session.manifest.project_id !== projectId || !validSubmit || !eventType || submit.project_id !== projectId) throw new Error("TIMELINE_ANNOTATION_INPUT_INVALID");
  const submittedAnnotationIds = submit.annotations.map(annotation => annotation.annotation_id);
  if (new Set(submittedAnnotationIds).size !== submittedAnnotationIds.length) throw new Error("TIMELINE_ANNOTATION_IDENTITY_CONFLICT");
  const submitted = submittedContent(submit);
  session.db.exec("BEGIN IMMEDIATE");
  try {
    const messages = readMessages(session, projectId);
    const operation = messages.find(message => message.operation_id === submit.operation_id);
    if (operation) {
      if (canonical(submittedContent(operation)) !== canonical(submitted)) throw new Error("TIMELINE_ANNOTATION_OPERATION_CONFLICT");
      session.db.exec("COMMIT");
      return { message: operation, replayed: true };
    }
    if (submit.schema_version !== 3) throw new Error("TIMELINE_ANNOTATION_CURRENT_SUBMIT_REQUIRED");
    if (messages.some(message => message.message_id === submit.message_id || message.annotations.some(item => submit.annotations.some(annotation => annotation.annotation_id === item.annotation_id)))) throw new Error("TIMELINE_ANNOTATION_IDENTITY_CONFLICT");
    if (messages.filter(message => message.request_id === submit.request_id).length >= 1000) throw new Error("TIMELINE_ANNOTATION_MESSAGE_LIMIT");
    const sequence = session.db.prepare("SELECT COALESCE(MAX(event_id),0) AS event_id FROM project_events").get().event_id;
    const retained = session.db.prepare("SELECT seq FROM sqlite_sequence WHERE name='project_events'").get()?.seq ?? 0;
    const conversationRevision = Math.max(Number(sequence), Number(retained)) + 1;
    if (!Number.isSafeInteger(conversationRevision) || conversationRevision < 1) throw new Error("TIMELINE_ANNOTATION_REVISION_INVALID");
    const message = { ...submitted, conversation_revision: conversationRevision, created_at: createdAt };
    const validMessage = message.schema_version === 3 && timelineAnnotationMessageV3Validator(message);
    if (!validMessage) throw new Error("TIMELINE_ANNOTATION_MESSAGE_INVALID");
    const result = session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?,?,?,?)").run(projectId, eventType, JSON.stringify(message), createdAt);
    if (Number(result.lastInsertRowid) !== conversationRevision) throw new Error("TIMELINE_ANNOTATION_REVISION_RACE");
    const processing = { schema_version: 1, operation_id: message.operation_id, request_id: message.request_id, target_revision: message.expected_revision + 1, status: "queued", updated_at: createdAt };
    if (!timelineAnnotationProcessingV1Validator(processing)) throw new Error("TIMELINE_ANNOTATION_PROCESSING_INVALID");
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?,?,?,?)").run(projectId, PROCESSING_EVENT_TYPE, JSON.stringify(processing), createdAt);
    session.db.exec("COMMIT");
    return { message, processing, replayed: false };
  } catch (error) {
    if (session.db.isTransaction) session.db.exec("ROLLBACK");
    throw error;
  }
}

export function registerTimelineAnnotationProcessingEvent(session, projectId, event) {
  if (session.manifest.project_id !== projectId || !timelineAnnotationProcessingV1Validator(event)) throw new Error("TIMELINE_ANNOTATION_PROCESSING_INVALID");
  session.db.exec("BEGIN IMMEDIATE");
  try {
    const message = readTimelineAnnotationMessageByOperation(session, projectId, event.operation_id);
    if (!message || message.schema_version !== 3 || message.request_id !== event.request_id || event.target_revision !== message.expected_revision + 1) throw new Error("TIMELINE_ANNOTATION_PROCESSING_MESSAGE_MISMATCH");
    const previous = readTimelineAnnotationProcessingByOperation(session, projectId, event.operation_id);
    if (previous) {
      const previousContent = { ...previous }; delete previousContent.updated_at;
      const nextContent = { ...event }; delete nextContent.updated_at;
      if (canonical(previousContent) === canonical(nextContent)) {
        session.db.exec("COMMIT");
        return { event: previous, replayed: true };
      }
    }
    const allowed = previous === null
      ? event.status === "queued"
      : previous.status === "queued" ? ["processing", "failed"].includes(event.status)
        : previous.status === "processing" ? ["failed", "resolved"].includes(event.status)
        : previous.status === "failed" ? ["processing", "superseded"].includes(event.status)
            : false;
    if (!allowed) throw new Error("TIMELINE_ANNOTATION_PROCESSING_TRANSITION_INVALID");
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?,?,?,?)").run(projectId, PROCESSING_EVENT_TYPE, JSON.stringify(event), event.updated_at);
    session.db.exec("COMMIT");
    return { event, replayed: false };
  } catch (error) {
    if (session.db.isTransaction) session.db.exec("ROLLBACK");
    throw error;
  }
}
