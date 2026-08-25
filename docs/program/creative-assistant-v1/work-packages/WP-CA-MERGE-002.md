# WP-CA-MERGE-002 Historical Evidence machine-path security compatibility

## Outcome

Make the existing machine-absolute-path security scan pass without editing
append-only Evidence and without excluding the Evidence directory as a whole.

## Scope

- Add exact workflow exclusions for the six immutable `WP-KF-002` precheck
  records containing retained local review roots.
- Extend the CI topology contract so the complete exception set is exact and
  every excepted Evidence file is pinned by normalized SHA-256.
- Refresh the shared fingerprint and both programme Evidence bindings, then
  require a new final-head PR run.

## Non-goals

- No edits to historical Evidence content.
- No wildcard or directory-wide Evidence exclusion.
- No product, runtime, contract, database, media, Worker or Renderer changes.
- No merge authorization.

## Validation

Run `ci:workflow:test`, reproduce the workflow `git grep` locally, synchronize
and check documentation, run the full repository and synthetic acceptance
gates, audit allowed paths, and require final-head PR `security` and `check`
jobs to pass after publication.
