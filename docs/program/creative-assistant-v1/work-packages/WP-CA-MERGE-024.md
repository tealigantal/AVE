# WP-CA-MERGE-024 Feedback timebase and programme publication integrity closure

## Outcome

Close the two late PR review findings without broadening Stage 2 behavior: an
implicit mixed-timescale feedback trim must fail before it can corrupt Timeline
duration, and every managed multi-file programme publication must recover to a
complete old or complete committed state after ordinary failure or process
termination.

## Scope

- Derive the effective Timeline tick from the explicit sequence timebase or the
  first clip's implicit source timescale, and accept feedback trims only when
  that RationalTime unit is exactly equivalent to the target source tick.
- Preserve the normal implicit same-timescale path and exact equivalent
  RationalTime encodings; reject mixed implicit timescales before producing a
  command or mutating Timeline state.
- Reject non-unit speed, TimeMap, and non-bijective source-to-Timeline duration
  targets until a future retime-aware trim command can preserve their mapping.
- Publish programme authority and generated-current files under one root lock
  with a durable before-image journal, a single commit point, and idempotent
  recovery before any managed read.
- Make each start, completion, or sync transition one recoverable publication
  batch, including generated current files and every programme state.
- Add deterministic ordinary-failure, forced-process-exit, committed-recovery,
  idempotent-recovery, unknown-content, and lock regressions.
- Reconcile the shared programme fingerprint and append exact validation
  Evidence without changing capability or acceptance status.

## Non-goals

- No general cross-timescale or retime-aware Timeline conversion, Timeline
  command/schema, Renderer, Worker, storage, permission, or desktop behavior
  change.
- No versioned-directory migration or new external transaction dependency.
- No private real-media claim and no PR merge authorization.

## Design decision

The feedback compiler compares RationalTime units by exact integer
cross-multiplication. It also proves the current source-duration to
Timeline-duration mapping is exactly one-to-one and rejects speed or TimeMap
semantics. General conversion would require a retime-aware Timeline command,
undo/redo semantics, persistence, rendering, and acceptance work outside this
repair.

Programme transitions hold one SQLite `BEGIN IMMEDIATE` mutex across recovery,
read, validation, mutation, derivation, and one publication batch. A strict
before-image journal is durably replaced through `staging`, `prepared`, and
`committed`; the journal phase is the single commit point. Recovery validates
every path, hash, before-image and reserved-directory artifact before it
changes any target. Strict UUID journal temporaries form a programme-owned,
non-authoritative namespace so a torn self-write can be removed without
parsing; all other unknown names and non-ordinary artifacts fail closed. The
recovery then either restores the complete old set or retains the complete
committed set. SQLite is already available from the repository's
Node 22 runtime and avoids a stale PID-file takeover race without adding an
external dependency.

## Validation

Run the feedback-revision and documentation-governance suites, typecheck,
architecture gates, complete repository check, synthetic final acceptance,
documentation checks, allowed-path audit, independent review, and exact-head
remote CI/review verification.
