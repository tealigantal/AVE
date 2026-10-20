# ADR-0044: Persist Timeline Annotations in the Project Event Log

- Status: Accepted
- Date: 2026-10-09

## Context

P4 annotations must survive reopen, join the request's shared conversation, carry
exact RationalTime anchors, and commit their message and annotations atomically.
Project Storage currently accepts only the exact project-format-v2 schema
identity. Adding a SQLite table to the v2 baseline would make existing v2
projects fail that identity check, and the current architecture has no v2
migration path.

The existing `project_events` table is append-only, has a monotonic event ID,
and is written in the same SQLite transaction as each creation-state revision.
Its payload is project-owned and written only through Project Host.

## Considered Options

1. Add a `timeline_annotations` table to the v2 baseline. Rejected because it
   changes the schema identity and prevents previously created v2 projects from
   opening without a separately authorized project-format successor.
2. Store annotations only in Renderer workspace preferences. Rejected because
   they would not be Host-authorized conversation records and could not be
   committed or replayed with a durable message receipt.
3. Append one typed annotation-message event for each submitted batch.
   Selected because it reuses the existing transaction and order authority
   without changing the database schema.

## Decision

Project Host validates a versioned submission against the current authorized
request, draft, request revision, Timeline version, track/clip and exact anchor
range. A single `conversation.timeline_annotation.created` event contains the
complete typed message and its annotations. The event ID is the conversation
revision. One submit operation creates one event, even when the user queued
multiple annotations.

`operation_id`, `message_id`, and each `annotation_id` are stable. An identical
operation retry returns the original event; a rebound operation or reused
identity with different content fails. Renderer drafts remain separate from
ordinary creation text and are cleared only after the Host returns the matching
committed receipt.

On read, the Host resolves clip anchors only when source identity and exact
source range establish one current location. A point or range that crosses a
split, was removed, or has multiple candidate locations stays attached to its
original Timeline and is reported unresolved. Track-only anchors remain
current only when the track structure is unchanged. Annotation text is
untrusted user content and is not sent to the model or compiled as an edit.

## Rationale

The event log preserves atomicity, replay identity and deterministic ordering
while leaving the current v2 schema digest unchanged. Host validation remains
the trust boundary; UI coordinates are reduced to an exact Timeline RationalTime
before IPC and are never accepted as persisted authority.

## Consequences

- No SQL table or project-format version change is introduced.
- Existing v2 project files retain their schema identity and remain openable.
- Each message is bounded to 20 annotations and 4,000 characters per body; a
  request is bounded to 1,000 persisted annotation messages.
- Persisted annotations are immutable. Draft annotations may be edited,
  removed or cleared before one combined send.
- A future event compaction or retention change needs its own compatibility
  review; this ADR does not authorize deletion of user annotations.

## Migration

None. Existing projects contain no annotation events and need no rewrite.
Readers ignore no recognized annotation event and reject malformed recognized
payloads. Unknown unrelated event types remain untouched.

## Rollback

Remove or disable the annotation UI entrypoint in a future application build;
do not delete existing events. Older project-format-v2 builds may ignore the
new event type and continue to open the unchanged schema.
