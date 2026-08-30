# WP-CA-MERGE-008 Single-authority Story decision closure

## Outcome

Ensure one exact Direction candidate set has at most one selected authority and
one exact Story Proposal set has at most one approved Story Plan.

## Scope

- Reject later direct Host selection/approval attempts for an already-decided
  candidate set.
- Recheck inside the atomic transaction before permission or artifact writes so
  concurrent requests cannot both commit.
- Close Product Story approval before Host execution when an approved plan is
  already visible.
- Add zero-write regression coverage using fresh approvals and identifiers.

## Non-goals

- No supersession or reopening workflow.
- No permission-policy, contract, storage schema or authorization change.
- No new editing capability or broader Stage 2 scope.
- No merge authorization.

## Validation

Run Story and Stage 2 product tests, typecheck, full repository check, synthetic
final acceptance, documentation/fingerprint checks, allowed-path audit,
independent review and final-head PR checks.
