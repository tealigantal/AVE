# ADR-0045: Persist Preview-Point Annotations in a Versioned Event

- Status: Accepted
- Date: 2026-10-11

## Context

The P4 demo lets a user right-click a position in the actual preview frame and
queue a comment for that point. Annotation contract v1 stores an exact Timeline
time and track/clip identity, but has no field for the clicked image position.
Adding an untyped field to v1 would violate its closed schema and lose contract
fidelity across IPC and storage.

ADR-0044 selected one append-only `project_events` record per submitted batch,
with Project Host validating the request and exact Timeline anchor. This
decision preserves that ownership and storage model while adding normalized
spatial context to the user-authored annotation.

## Considered Options

1. Store the clicked point in Renderer preferences or UI state. Rejected
   because it would not survive reopen or share the annotation message.
2. Add optional coordinates to v1. Rejected because the v1 schemas are closed
   and historical payload meaning must remain stable.
3. Add v2 annotation, submit, and message contracts and append a distinct v2
   event type. Selected to retain strict validation and unambiguous event
   compatibility while keeping the existing project database format.

## Decision

Annotation v2 adds an explicit `surface` (`timeline` or `preview`) and a
`preview_point`. Timeline anchors require a null point. Preview anchors require
normalized `x` and `y` values in `[0, 1]`, a video track, an exact RationalTime
point, and no end range. The renderer derives coordinates from the decoded
video content rectangle, excluding letterbox space. Project Host validates the
video target, current authorization, draft, request revision, Timeline version
and exact temporal range before Project Storage appends the batch as
`conversation.timeline_annotation.v2.created`.

Readers validate both v1 and v2 payloads, require each event type to match its
schema version, and merge the two event streams by their existing event ID.
Historical v1 events are not rewritten. The preview point is annotation
context, not Timeline or render state; it remains attached to the original
annotation when its clip anchor is unresolved. A current or uniquely mapped
anchor may show a marker only at its resolved frame.

## Rationale

The v2 boundary carries the demo's clicked location end to end without
introducing a database migration or elevating renderer state to project
authority. Version-specific events preserve existing readers' ability to
ignore unknown event types while the new reader rejects malformed recognized
events.

## Consequences

- Existing v1 annotations and v1 submissions remain readable and replayable.
- The v1 schema and examples live under `contracts/schemas/legacy/editorial/`
  and the corresponding legacy example directories; their stable `$id` values
  and stored payloads are unchanged. V2 is the sole current annotation contract
  family.
- Newly queued timeline annotations are upgraded to v2 only in the unsent UI
  queue; saved historical event payloads remain unchanged.
- A v2 submit remains one atomic, idempotent, append-only event containing up
  to 20 annotations.
- The normalized point is advisory user context and is never interpreted as a
  transform, crop, or render command.

## Migration

No database migration is required. The project-format-v2 schema identity stays
unchanged. Old builds may leave v2 events unprojected, but must not delete or
rewrite them.

## Rollback

Remove or disable the preview context-menu entry point in a future build. Keep
all v2 events; do not rewrite them as v1 or remove their point data.
