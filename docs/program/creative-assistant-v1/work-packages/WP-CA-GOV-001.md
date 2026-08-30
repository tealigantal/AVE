# WP-CA-GOV-001 Multi-programme Governance Bootstrap

## Goal

Allow Stage 2 to run in its own governed programme while preserving one global
active Work Package, one generated current-state route and all existing
editing-execution-v1 history.

## Required behavior

- Discover programmes only from `PROGRAM_REGISTRY.yaml`.
- Enforce globally unique programme, Work Package, capability and acceptance IDs.
- Resolve cross-programme dependencies and keep ready packages non-active.
- Make `docs:start` and `docs:complete` resolve one exact package and update
  only its programme state plus the registry focus.
- Generate current status/work/validation/debt and document index across all
  programmes without hand edits.
- Fail before writes on ambiguity, incomplete dependencies or multiple active
  packages.

## Non-goals

No application source, contracts, database, model, media, Timeline, render or
Stage 2 runtime behavior changes.

## Definition of Done

`ACC-CA-GOV-001` passes focused governance, negative fixtures, generated drift,
fingerprint and diff checks. COMPLETE Evidence exists and the governed
completion sequence selects `WP-CA-INT-000` as ready without silently starting it.
