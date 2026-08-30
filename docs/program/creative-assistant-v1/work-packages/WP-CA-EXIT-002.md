# WP-CA-EXIT-002 Stage 2 final exit and release-candidate preparation

## Outcome

Prove Stage 2 meets final stage-exit and release-candidate conditions. This is
not the ordinary Development Integration gate.

## Required behavior

- Require `WP-CA-REAL-001` complete Evidence and no active Stage 2 debt.
- Run the complete repository and final acceptance gates on the exact source
  fingerprint and reconcile every current capability, acceptance and document.
- Require full real-media, direct-human and Stage Debt closure; tested status is
  never silently promoted to accepted.
- Preserve one current version per AVE-owned protocol and reject all older
  identities without migration, dual reads or compatibility routes.

## Non-goal

This package does not merge the branch or authorize any merge action.

## Validation

Run `pnpm run check`, final synthetic acceptance, documentation gates, clean
worktree and exact-SHA remote CI/review verification.
