# WP-CA-MERGE-006 Atomic rejected feedback execution closure

## Outcome

Close the time-of-check/time-of-use window between asynchronous execution
preparation and the atomic Timeline commit for an exact rejected feedback
revision.

## Scope

- Recheck the exact feedback rejection inside the synchronous atomic mutation,
  before retaining execution permission or committing Timeline state.
- Add a controlled interleaving regression that pauses execution preparation,
  commits rejection, resumes execution and proves zero execution mutation.
- Cover Product approval/execution and direct Host approval/preparation/execution
  after rejection.

## Non-goals

- No global Host/IPC serialization change.
- No permission-policy, contract, storage schema or authorization change.
- No new editing capability or broader Stage 2 scope.
- No merge authorization.

## Validation

Run focused Stage 2 tests, typecheck, full repository check, synthetic final
acceptance, documentation/fingerprint checks, allowed-path audit, independent
review and final-head PR checks.
