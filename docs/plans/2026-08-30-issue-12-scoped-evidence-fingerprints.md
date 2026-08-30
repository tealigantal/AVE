# ExecPlan: Issue #12 scoped Evidence fingerprints

## Objective

Replace the all-repository Evidence applicability gate with a machine-defined impact-scope model, without changing historical acceptance claims or Stage 2 product behavior.

## Progress

- [x] Rebuild current Git/GitHub/programme state and clean merged PR #10 branch.
- [x] Create the Issue #12 branch and register WP-CA-GOV-003.
- [ ] Record ADR and a failing reproduction.
- [ ] Implement applicability, Contract-family and authority-drift gates.
- [ ] Validate, record Evidence, publish, merge and clean the branch.

## Validation and recovery

All changes are limited to the Work Package allowlist. The test model uses temporary repositories and fixtures, so it has no network or private-media dependency. If a gate fails, preserve the failure evidence, repair only the owned scope, and re-run it; never rewrite historical Evidence as fresh acceptance.

## Discoveries

- The prior all-repository `code_fingerprint` is generated from the source roots and is currently used by `docs:check` for every claimed capability.

## Decision log

- Pending ADR: retain repository fingerprint for checkout identity; decide the smallest safe machine-owned applicability scope and explicit legacy index.

## Outcome and retrospective

Pending.
