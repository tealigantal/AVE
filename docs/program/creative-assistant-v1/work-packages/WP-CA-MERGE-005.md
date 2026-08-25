# WP-CA-MERGE-005 Rejected feedback execution closure

## Outcome

Make an explicit human rejection of an exact feedback revision a durable,
fail-closed execution boundary in both the Product workspace and Project Host.

## Scope

- Project an exact rejected feedback Intent as rejected instead of candidate.
- Block later approval, preparation and execution that try to reuse a proposal
  approval created before the rejection.
- Preserve append-only Permission Decision audit history and exact subject
  binding; do not mutate the rejected Intent artifact.
- Add regression coverage proving rejection causes no Timeline mutation and no
  subsequent execution permission or business write.

## Non-goals

- No permission-policy, contract, database schema or authorization change.
- No ability to revoke or reopen a rejection.
- No new editing capability or broader Stage 2 scope.
- No merge authorization.

## Validation

Run the Stage 2 product workspace/action tests, typecheck, full repository
check, synthetic final acceptance, documentation and fingerprint checks,
allowed-path audit, independent review and final-head PR checks.
