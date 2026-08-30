# WP-CA-FEEDBACK-001 Feedback diagnosis to scoped encoded revision

## Goal

Implement the next Stage 2 vertical slice: retain one exact user feedback item
against the accepted first cut, diagnose one bounded issue, derive and preview
one local semantic revision, reject without Timeline mutation or execute only
after exact approval, then render, undo and reopen the accepted revision.

## Authority and compatibility

The normative product flow is `docs/pipeline/FEEDBACK_TO_EDIT_PIPELINE.md`; the
reasoning and approval boundaries are in `docs/intelligence/EDITING_REASONING_SYSTEM.md`
and `docs/ux/REVIEW_APPROVAL_MODEL.md`. This programme package is the current
implementation authority. Existing source, contracts, tests and Evidence
outrank explanatory examples when they conflict.

Feedback diagnosis is inert project data, not a Timeline command. An accepted
patch becomes a new version-bound semantic Editorial Edit Intent and must reuse
the existing Project Host adapter, `CommandEditIntent`, `CommandEditIR`,
CommitPlan, Semantic Render Manifest and Preview/Master/QC path. Project Host is
the only SQLite writer. Timeline Core, RenderGraph, Worker and Model Gateway are
frozen and may only be consumed through their current public contracts.

The first slice is deliberately narrow: one deterministic local revision over
an existing clip using an editing primitive with executed Foundation Evidence.
Unsupported, ambiguous or widened feedback blocks explicitly. Style/Trend
retrieval is optional under the active Stage 2 plan and is not a dependency.

## Acceptance

`ACC-CA-FEEDBACK-001` requires exact feedback/diagnosis/base-execution/Timeline
binding, deterministic local patch generation, non-mutating preview, explicit
rejection, separate exact execution approval, one atomic Host commit,
idempotent retry, undo/redo/reopen and same-semantic Preview/Master output.

Empty or ambiguous feedback, stale execution or Timeline, missing Evidence or
Original, unknown/protected target, unsupported or widened patch, approval
rebinding, Preview/Master divergence and injected storage failure must leave
Timeline, commands, events and authoritative render artifacts unchanged.
Explicit rejection is the sole exception: it may append only its exact audit
Permission Decision and event while leaving Timeline, commands and render
artifacts unchanged.

Synthetic tests can establish the typed diagnosis and adapter behavior only.
Completion requires an authorized real-media revision and human acceptance of
the exact retained revised Master.

## Scope boundaries

Allowed and forbidden paths are machine-readable in
`docs/program/creative-assistant-v1/EXECUTION_MANIFEST.yaml`. This package may
add one strict additive feedback-diagnosis v2 Contract while preserving legacy
v1, generated bindings and
persistence, feedback/revision feature logic, the minimal supported Edit IR
compiler extension, Host orchestration, permission rows and focused tests. It
must not add client-side project authority, a second Edit Intent schema, direct
Timeline writes, arbitrary model tools, external acquisition, automatic full
recut, delivery or publication.
