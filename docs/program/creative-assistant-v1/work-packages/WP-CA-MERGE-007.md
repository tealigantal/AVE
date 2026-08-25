# WP-CA-MERGE-007 Feedback media-authority workspace closure

## Outcome

Expose a feedback Intent as stale before confirmation when its approved Story's
exact Material Evidence Pack or Original-media identity is no longer current.

## Scope

- Preserve the feedback-specific Timeline/Story bypass required after an
  accepted prior execution.
- Rebind feedback workspace status to the exact approved Story and its current
  dynamic Material Evidence Pack view.
- Add regression coverage for Original-media identity change, visible stale
  reason, workspace digest change, and zero-write Product action rejection.

## Non-goals

- No permission-policy, contract, storage schema or authorization change.
- No relaxation of execution-time source verification.
- No new editing capability or broader Stage 2 scope.
- No merge authorization.

## Validation

Run focused Stage 2 tests, typecheck, full repository check, synthetic final
acceptance, documentation/fingerprint checks, allowed-path audit, independent
review and final-head PR checks.
