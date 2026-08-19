# Final Documentation Governance Freeze

This ExecPlan is the living record for the documentation-only `DOC-003` task.
It freezes Documentation Architecture v1.0 without changing application code,
contracts, programme state, generated current documents, or the active
implementation package `WP-ADV-002`.

## Purpose / Big Picture

Give a first-time repository reader and future Coding Agent one explicit entry
path, one authority map, current/future terminology boundaries, and one durable
rule for future document creation. The outcome is a frozen documentation
structure, not a claim that planned intelligence or blocked editing capability
has been implemented.

## Progress

- [x] Classify AVE as an initialized important project and DOC-003 as an
  independent documentation-governance task.
- [x] Confirm the Git root, requested branch, clean baseline, user-allowed
  paths, generated-file boundaries, and active implementation package.
- [x] Read the repository authority chain, current programme state, prior
  DOC-002 plan/report/Evidence, and active package specifications.
- [x] Complete independent entry/authority, terminology, and current-state
  reviews.
- [x] Add the authority map and reconcile entry documents with the canonical
  reading order.
- [x] Correct remaining current/future terminology conflicts in maintained
  non-historical documents.
- [x] Record final freeze report and independent Evidence.
- [x] Run all documentation, link, formatting, terminology, generated-file,
  and allowed-path gates.

## Surprises & Discoveries

- DOC-002 already created the numbered domain layer and corrected the major
  source-model errors. DOC-003 should freeze and clarify that structure, not
  expand it.
- `docs/DOCUMENT_INDEX.md` is generated and intentionally indexes programme
  classes rather than the numbered navigation layer. The new authority map
  must explain this split; manual index edits would be overwritten.
- Root `PROJECT_GOAL.md` is outside the user-authorized change scope and uses
  legacy singular RenderGraph shorthand. Canonical documentation must define
  that shorthand as shared semantic identity, never one executable graph.
- `docs/CURRENT_STATUS.md` and `docs/CURRENT_WORK.md` are compatibility routes,
  while the generated `docs/current/` files remain the only live authorities.
  Copying live values into the routes would create the duplicate current-state
  system this task is intended to remove.

## Decision Log

- 2026-08-19: Do not run `docs:start` or change implementation programme
  state. DOC-003 uses its own ExecPlan and Evidence; terminology-only
  corrections may update maintained programme prose without changing IDs,
  state, dependencies, allowed paths, acceptance status, or Evidence bindings.
- 2026-08-19: Retain the numbered directories as durable navigation/policy and
  the existing product/architecture/programme/contracts paths as execution
  authorities. Record the relationship in one authority map.
- 2026-08-19: Keep generated `docs/current/**` and
  `docs/DOCUMENT_INDEX.md` byte-identical; improve only their maintained entry
  routes and surrounding governance.
- 2026-08-19: Use `Edit Intent` only for the future semantic proposal;
  `CommandEditIntent` and `CommandEditIR` name the current execution path.
- 2026-08-19: Define one Semantic Render Manifest that fans out to separate
  Preview and Master RenderGraphs and their own ExecutionPlans. Never describe
  one shared executable RenderGraph.
- 2026-08-19: Keep future Creative Skill Definitions distinct from the current
  Preset / `CreativeSkillOutputV1` selection boundary.

## Outcomes & Retrospective

Documentation Architecture v1.0 is frozen. The repository now has one
first-entry chain, one authority relationship, exact Coding Agent reading
rules, non-duplicating current status/work routes, and canonical future/current
terms for Edit Intent, execution IR, rendering, and Skills.

The work preserved the numbered navigation layer and retained execution
authorities rather than forcing a physical migration. Generated current/index
documents, programme state, capability/acceptance status, and Evidence bindings
did not change. Maintained programme prose changed only where required to remove
terminology conflicts. All repository documentation gates, link/scope scans,
state comparisons, and independent final reviews passed. Registered historical,
tooling, formatting, and future-implementation constraints remain explicit in
the freeze report instead of being hidden by a zero-ambiguity claim.

## Context and Orientation

Repository entry begins at `README.md`; discovered agent rules live in
`AGENTS.md`; documentation routing lives in `docs/README.md`; the generated
programme class index is `docs/DOCUMENT_INDEX.md`. Stable goal/product/runtime
authorities remain at `PROJECT_GOAL.md`, `docs/product/`, and
`docs/architecture/`; current programme truth remains in `docs/program/`,
generated `docs/current/`, contracts, and immutable `docs/evidence/`. The
numbered directories `docs/00-vision/` through `docs/08-decisions/` are durable
domain navigation and policy, not replacement programme directories.

## Plan of Work

1. Reconcile the repository entry documents and add one dedicated authority
   map without editing the generated index.
2. Make root AGENTS encode the short required reading order plus the existing
   deeper implementation authority chain and explicit document-change rules.
3. Audit maintained, non-historical Markdown for intent, render, and Skill
   terminology; correct only genuine current/future or graph-identity
   ambiguities.
4. Confirm the current-state routes answer where to find phase, completion,
   active/next work, and prohibitions without copying generated live values.
5. Write the requested final freeze report and an independent DOC-003 Evidence
   record, then execute and record the gates.

## Concrete Steps

Use `rg` for repository-wide term and link inventories. Apply Markdown-only
patches within `README.md`, `AGENTS.md`, `ARCHITECTURE.md`, and `docs/**`. Run:

    pnpm run docs:sync -- --check
    pnpm run docs:check
    pnpm run docs:architecture:test
    pnpm run docs:fingerprint:test
    git diff --check

Also run a repository-relative Markdown-link audit, terminology assertions,
generated-file immutability checks, and a changed-path allowlist audit.

## Validation and Acceptance

Acceptance requires the exact entry chain, one dedicated authority map, no
duplicate architecture authority, explicit current/future terminology,
generated live status/work routes, no source/test/contract/script/database
changes, and a final report whose frozen decisions constrain future document
creation. Passing checks must be recorded as observed results, not intentions.

## Idempotence and Recovery

The task changes Markdown only. Re-running checks must not modify files. If a
wording change proves inaccurate, revert that focused hunk; do not roll back
unrelated DOC-002 work or generated programme state. The authority map and
freeze report are additive and can be reviewed independently.

## Artifacts and Notes

Primary artifacts are `docs/DOCUMENT_AUTHORITY_MAP.md`, focused entry and term
corrections, `docs/FINAL_DOCUMENTATION_FREEZE_REPORT.md`, this ExecPlan, and
`docs/evidence/runs/EVD-20260819-DOC-003-FINAL-DOCUMENTATION-FREEZE.md`.

## Interfaces and Dependencies

This task consumes existing documentation and Git state only. It introduces no
runtime interface, schema, dependency, credential, deployment, publication,
or external side effect. Future changes that alter programme generation,
contracts, architecture ownership, or implementation scope require their own
governed Work Order and applicable ADR.
