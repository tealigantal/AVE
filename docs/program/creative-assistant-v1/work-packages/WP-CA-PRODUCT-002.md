# WP-CA-PRODUCT-002 Representative desktop feedback-decision closure

## Goal

Close the one P1 proof gap in the representative Product journey: after the
desktop user creates and previews a new scoped feedback revision, the same real
Electron journey must explicitly reject it or approve and execute it before
undo/redo/reopen recovery.

## Narrow implementation boundary

The repair may change only the Product-review Electron automation, its exact
main-process test confirmation hook, the Product Host action parser, the real
journey and zero-write action assertions, and governed documentation. The Host
parser is in scope because independent review found that a payload containing
both `selected_id` and `intent_id` could make the native dialog describe one
object while the Host acted on another. The parser must enforce an exact,
action-specific payload shape and provide the same target to the dialog and
Host. It may not add feedback semantics, modify renderer UX, bypass validated
preload/main IPC, grant renderer authority, or change Timeline, Edit IR,
RenderGraph, Worker, storage or Contracts.

The automated confirmation hook may confirm only `feedback.reject`, only when
the dedicated real Product-review environment is active. It cannot approve or
execute an edit and cannot exist as a general production bypass.

## Acceptance

`ACC-CA-PRODUCT-002` requires the exact new feedback card to show a visible
rejection decision in the same Electron journey, with Timeline version
unchanged and a retained `feedback_revision.reject` approval record. Existing
Preview playback, invalid-payload closure, undo/redo stale cleanup and exact
reopen assertions must continue to pass. A dual-ID or otherwise mismatched
action payload must fail before approval, permission, artifact, event or
Timeline writes.
