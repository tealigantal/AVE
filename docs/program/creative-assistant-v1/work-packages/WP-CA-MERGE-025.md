# WP-CA-MERGE-025 Terminal Direction and Story selection UI closure

## Outcome

Close the final-head PR review finding that stale, rejected, selected, or
approved Direction and Story cards can still appear selectable or expose an
approval action that Project Host will reject.

## Scope

- Derive card selection and approval controls from the current Host-projected
  lifecycle on every render.
- Make only `candidate` Direction and Story cards interactive.
- Treat a retained Renderer selection as current only while the exact selected
  card remains a candidate; clear or ignore it when workspace authority moves
  the card to a terminal or stale lifecycle.
- Expose Direction or Story approval only for an exact current candidate and
  only after at least two current candidates exist and the corresponding
  current decision does not already exist.
- Keep the governed generation/retry control available when an interrupted
  Direction or Story generation leaves fewer than two current candidates;
  stale or rejected history must not hide that recovery path.
- Preserve stale, rejected, selected, and approved cards as visible status
  evidence without presenting them as executable controls.
- Add direct Renderer control-state and source-boundary regressions.
- Reconcile the shared fingerprint and Evidence without changing Host,
  Contract, editing capability, or acceptance status.

## Non-goals

- No Project Host, storage, Contract, permission, Timeline, rendering, Worker,
  generation, or approval-policy change.
- No new auto-selection, hidden retry, or client-side project authority.
- No private real-media claim and no PR merge authorization.

## Design decision

Renderer derives one comparison state from the current Host-projected cards.
At least two `candidate` cards and no current decision are required before any
card becomes selectable; a retained local ID is discarded unless it names one
of those exact candidates. Fewer than two candidates is a recoverable
generation state, not an approvable comparison, so the existing governed
generation action remains visible until the pair is complete. Terminal cards
remain visible for audit context but have no click handler.

## Validation

Run the Stage 2 Renderer property and workbench boundary suites, typecheck,
architecture gates, documentation checks, full repository check, synthetic
final acceptance, allowed-path audit, independent review, and exact-head remote
CI/review verification.
