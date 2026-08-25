# WP-CA-MERGE-019 WP018 governance and asynchronous render regression closure

## Outcome

Close the independent-review findings against WP018 before publication by
bringing the Contract form stylesheet under explicit work-package authority and
adding behavioral proof for the asynchronous render rebind and desktop Main
boundaries.

## Scope

- Explicitly own the Stage 2 Contract form stylesheet introduced by WP018.
- Add a controlled post-Worker, pre-persistence Timeline/execution rebind test
  proving `SEMANTIC_RENDER_EXECUTION_REBOUND` and zero Render persistence.
- Add behavioral tests that invoke the Contract native-confirmation helper and
  the registered legacy `project.render` command, including zero-dialog closure
  when Stage 2 authority exists.
- Reconcile final fingerprints and Evidence without promoting capability or
  acceptance status.

## Non-goals

- No Contract, render, persistence, Worker, schema or permission-policy redesign.
- No relaxation of Stage 2 authority or legacy-render closure.
- No PR merge authorization.

## Validation

Run focused Host and desktop-boundary behavior tests, typecheck, architecture,
full repository check, synthetic final acceptance, documentation/fingerprint
checks, cumulative and package-specific allowed-path audits, independent review
and exact-head PR checks.
