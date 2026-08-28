# WP-CA-EXIT-002 Stage 2 final exit and merge preparation

## Outcome

Prove the current branch is a complete Stage 2 candidate ready to merge into
`main`, without merging it.

## Required behavior

- Require `WP-CA-REAL-001` complete Evidence and no active Stage 2 debt.
- Run the complete repository and final acceptance gates on the exact source
  fingerprint and reconcile every current capability, acceptance and document.
- Commit and push a clean branch, then require green remote `security` and
  `check` jobs for the exact pushed SHA and no unresolved current review P0/P1.
- Preserve one current version per AVE-owned protocol and reject all older
  identities without migration, dual reads or compatibility routes.

## Non-goal

This package does not merge the branch or authorize any merge action.

## Validation

Run `pnpm run check`, final synthetic acceptance, documentation gates, clean
worktree and exact-SHA remote CI/review verification.
