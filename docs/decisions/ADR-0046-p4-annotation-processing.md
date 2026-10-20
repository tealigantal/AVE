# ADR-0046: Process Combined Request and Timeline Annotation Batches

- Status: Accepted
- Date: 2026-10-12

## Context

The workbench must submit an ordinary creative request and its queued timeline
annotations as one user action. The existing v1/v2 annotation events only saved
messages; treating that receipt as completed editing would be false, and sending
their bodies as unstructured prompt text would lose exact anchors and authority
boundaries. The current creative pipeline already owns planning, typed edit
compilation, commit, Preview/Master rendering and authorization checks.

## Considered Options

1. Keep annotations as history-only messages. Rejected because the request is
   for actual editing feedback, not only comments.
2. Ask the model to return executable edits from renderer-supplied prompt text.
   Rejected because the renderer cannot own source facts, edit commands or
   commit authority.
3. Persist a versioned combined user message and a separate append-only task
   status stream, then feed bounded structured anchors through the existing
   Host generation path. Selected.

## Decision

The current submit/message contract is v3. It includes the whole-work request
text, protected references and up to 20 v2 annotations in one stable operation.
Project Host verifies the current actor, request revision, exact draft,
Timeline version, authorization and every anchor before storing the message.
Storage appends the message and its initial `queued` status atomically. A
separate status event records `processing`, `failed`, `resolved` or
`superseded`; the resolved receipt names the committed draft, Timeline version
and render.

Host advances the request once and invokes the existing `produceCreation`
pipeline. The model receives the current user requirement and a separately
typed, bounded array of anchor-resolved annotations. The annotations remain
untrusted user data. They cannot authorize sources, bypass policy, or supply
executable commands. The established planning, Command/Commit and
Preview/Master paths remain authoritative.

Retries reuse the same operation and exact message body. A retry resumes the
same target revision and cannot create a second user revision or message.
Failures retain the task, root error and queued annotations for query/retry.
The user can reopen a failed task for editing: Host appends a `superseded`
status, then the UI preserves bodies and anchors in a new local batch with fresh
annotation identities. The user may revise text or reposition each anchor
without mutating the failed message. A superseded task cannot be retried.
Successful processing records the real output receipt and removes that batch
from the active marker layer; its message and resolvable historical anchors
remain available in conversation history. `resolved` and `superseded` are
terminal.

Readers continue to validate and project historical v1/v2 messages exactly as
stored. They may be replayed only when the same operation and full prior body
already exist. New writes require v3; a v1/v2 payload cannot create a new event
or generation task. Unsent local v1/v2 drafts are upgraded in memory to v2
annotations and submitted in a new v3 envelope without changing their bodies.

## Rationale

The combined message gives the conversation one user action while the separate
status stream distinguishes saving, processing and actual completion. Durable
operation identity lets a lost response resume safely. Host-owned context and
the existing pipeline preserve authorization and editing invariants.

## Consequences

- No project database format migration is required; all records remain in the
  append-only project event log.
- A successful message receipt alone does not mean the edit is complete.
- A failed task remains visible and retryable until the user explicitly reopens it for editing.
- Historical v1/v2 event schemas and payloads remain unchanged.
- Active timeline/preview markers reflect only queued, processing or failed
  v3 tasks; resolved and superseded anchors remain reachable from history.

## Migration

Existing v1/v2 rows remain readable and immutable. Previously saved, unsent UI
drafts retain annotation bodies and receive fresh v3 operation/message IDs when
the user submits the combined request. An existing v1/v2 operation is never
reinterpreted as a new processing task.

## Rollback

Disable the v3 submit route and retain all v3 message/status events for future
readers. Do not rewrite old or new event payloads into another schema version.
