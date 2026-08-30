# WP-CA-UNIFY-006 Single current project format and database baseline

## Outcome

Replace the historical migration chain with one current project-format v2
baseline. New projects initialize that schema atomically; every non-v2 project
or database fails before any project data is changed.

## Required behavior

- `project.json` declares only `project_format_version: 2`.
- `project.sqlite` is created from one authoritative v2 baseline and records
  that exact format identity.
- Opening a project requires the manifest and database to agree on v2 before
  normal write-affecting pragmas or application operations run.
- Historical migration files, migration ledgers, backup-and-retry behavior,
  legacy object backfills and fault-injection branches are removed.
- Contracts, generated bindings, CLI inspection, storage APIs, tests and
  architecture documentation describe the same current format.

## Non-goals

No import or conversion of old projects, desktop route redesign, E2E harness,
real-media acceptance or merge.

## Validation

Run contract identity/cleanliness, storage, recovery, Host persistence,
foundation, CLI, type, architecture and documentation gates. Complete with an
exact fingerprint Evidence record and independent read-only review.
