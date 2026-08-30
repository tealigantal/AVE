# WP-CA-PIPE-001 Approved semantic Intent to encoded first cut

## Goal

Promote `WO-PIPE-001` as the next Stage 2 vertical package. Adapt one exact,
approved command-free Editorial Edit Intent through Project Host into the
existing `CommandEditIntent` → `CommandEditIR` → simulation/validation →
CommitPlan/Commit path, then produce semantically aligned Preview and Master
outputs with QC and complete provenance.

## Authority and compatibility

Project Host remains the only project-state authority and SQLite writer. The
adapter consumes the existing Editorial Edit Intent contract; it must not add a
second intent schema. Timeline Core, RenderGraph and Worker are frozen in this
slice and may be consumed only through their current public contracts. Only
editing primitives with current executed Evidence may compile; every other
semantic operation blocks explicitly.

Approval to retain a semantic Intent is not approval to mutate Timeline. The
exact compiled effect, base Timeline, affected targets, capabilities and
provenance require an execution approval bound through the Stage 2 permission
policy before commit.

The package therefore owns the narrow additive permission-contract and matrix
change for `editorial_edit_intent.execute`, its generated validators, and the
permission property regression. It does not otherwise reopen the completed
permission package or add a second semantic Intent contract.

## Acceptance

`ACC-CA-PIPE-001` requires deterministic mapping, exact Story/Decision/
Evidence/Contract/Intent provenance, one atomic Host commit, idempotent retry,
undo/redo/reopen, same-semantic Preview/Master plans, persisted QC/blockers and
authorized real-media human review of the exact encoded result.

Stale refs or Timeline, missing Original/evidence, unsupported semantics,
protected targets, compiler mismatch, approval rebinding, Preview/Master
divergence and injected storage failure must leave Timeline, events, commands
and authoritative artifacts unchanged.

Synthetic mapping alone may mark the adapter tested at most. It cannot pass the
acceptance or promote user-facing editing capability without the real encoded
and human Evidence required above.

## Current implementation checkpoint

The v1 `select_evidence` compiler, read-only review projection, distinct
execution permission action, atomic execution record, idempotent retry,
rollback, undo/redo/reopen and Preview/Master preflight are implemented and
covered by focused tests. The first independent review rejected the earlier v3
artifact because it was rendered after undo/redo and was not bound to the
approved execution. The corrected execution-bound Timeline/source/semantic/
plan checks, authorized real-media Preview/Master output and QC pass in
repository-external run `run-20260824-v8`; ordered-frame agent visual review of
that exact three-second v8 Master also passes. The user accepted that exact v8
Master on 2026-08-24. COMPLETE Evidence
`EVD-20260824-WP-CA-PIPE-001-R2-COMPLETE` closes the bounded package; scoped
feedback and the complete Stage 2 user journey remain later work.
