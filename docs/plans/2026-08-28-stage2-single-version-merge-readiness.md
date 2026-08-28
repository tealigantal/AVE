# Stage 2 Single-Version Merge Readiness ExecPlan

## Purpose / Big Picture

Complete Stage 2 on one coherent development baseline and prepare its branch
for merge to `main` without merging it. A creator must be able to start from a
fresh project, import authorized real media, approve the current Contract,
inspect Evidence, compare Direction and Story candidates, execute the complete
approved Story, review exact Preview/Master/QC, decide scoped feedback, reopen
the project and accept the same visible result. No AVE-owned older format is
upgraded, backfilled, dual-read or retained as a product route.

## Progress

- [x] 2026-08-28 Audit current programme, Git/PR state, version parity and the
  ordinary desktop user journey.
- [x] 2026-08-28 Commit and push the isolated WP30 portability checkpoint as
  `1099ea2` without claiming Stage 2 exit.
- [x] Reopen Stage 2 truth and accept the single-current-version ADR.
- [x] Move Foundation Assembly onto current Story/CommandEditIR authority.
- [x] Collapse Editorial runtime and contracts to their single current version.
- [x] Collapse Render/Worker execution to one current identity.
- [x] Replace project migrations with one current project-format baseline.
- [x] Deliver one canonical desktop Stage 2 topology and product route.
- [ ] Move Electron automation into a dedicated production-free E2E harness.
- [ ] Reconcile all current product, architecture and programme authorities.
- [ ] Pass fresh-project real-media and direct human acceptance.
- [ ] Pass final EXIT, exact-SHA CI and review-thread merge-readiness gates.

## Surprises & Discoveries

- Package completion and product exit diverged: 41 packages were recorded
  complete while Pipeline and Product remained tested and two Stage 2 debts
  remained active.
- The prior ordinary desktop initializer created one enabled source track while
  the Host required a disabled reference track and one enabled empty neutral
  output track. `WP-CA-PRODUCT-003` replaced it with the exact two-track route
  and rejects every non-canonical project without mutation.
- The repository contains four Editorial v1/v2 pairs, Render v2/v3 and Worker
  r12/r13 branches, EditIR v1 beside CommandEditIR v2, and migrations 1 through
  27 with legacy backfill.
- A fresh full-check replay initially appeared to stop at
  `stage2-product-actions.test.ts`; direct observation showed that the test was
  CPU-active while executing real Render, immutable-media rebound and race
  closure cases and completed successfully in about 80 seconds.
- WP30 exact commit `1099ea2` passed remote `security` and `check`. The branch
  moved forward only after that recoverable checkpoint was independently green.
- The earlier 292-second observation was not reproduced after the single-version
  packages. No forced process exit or weakened assertion was introduced; the
  exact action suite now terminates normally and is retained as an EXIT gate.
- Project format v2 now initializes from one atomic baseline. The migration
  ledger, 23 historical migration files, old Story tables, backup/retry,
  backfill and CLI migration route were deleted; non-v2 identity is rejected
  before normal database writes.

## Decision Log

- 2026-08-28: Development has no backward-compatibility requirement. Keep one
  current version per logical protocol and reject older input without mutation.
- 2026-08-28: Preserve version fields needed for schema identity, optimistic
  concurrency, immutable references, cache provenance and audit; remove only
  acceptance or conversion of older AVE-owned formats.
- 2026-08-28: Preserve historical ADR, Work Package and Evidence records as
  immutable facts. A new ADR supersedes their compatibility decisions.
- 2026-08-28: Use sequential governed packages so each authority change has a
  bounded rollback point and independently executable acceptance.

## Outcomes & Retrospective

In progress. Completion requires the real user journey and exact merge-ready
Git/CI state, not only schemas or synthetic tests.

## Context and Orientation

The Project Host is the only project-state and SQLite write authority.
Contracts are generated from `contracts/schemas`; generated bindings are never
hand edited. Current programme truth is under
`docs/program/creative-assistant-v1`, generated current state is under
`docs/current`, and immutable Evidence is under `docs/evidence/runs`.

The implementation sequence is:

1. `WP-CA-UNIFY-001`: governance truth and ADR.
2. `WP-CA-UNIFY-002`: current Story/Assembly/CommandEditIR path.
3. `WP-CA-UNIFY-003`: current Editorial contracts and runtime.
4. `WP-CA-UNIFY-004`: contract integrity and Render schema identity.
5. `WP-CA-UNIFY-005`: one Render/Worker execution identity.
6. `WP-CA-UNIFY-006`: one project-format/database baseline.
7. `WP-CA-PRODUCT-003`: canonical desktop topology and route.
8. `WP-CA-E2E-001`: production-free Electron E2E harness.
9. `WP-CA-TRUTH-001`: final source/document truth reconciliation.
10. `WP-CA-REAL-001`: fresh-project real-media and human acceptance.
11. `WP-CA-EXIT-002`: final exit and merge preparation.

## Plan of Work

First supersede compatibility policy and reopen programme truth. Move retained
Foundation assembly behavior to the current Stage 2 Story and CommandEditIR
authority before deleting old schemas or tables. Then remove old Editorial
contracts and runtime routes, repair schema identity and integrity tooling,
collapse Render/Worker identity, and build one current project database schema.
After those data boundaries stabilize, replace the desktop dual path with one
canonical topology and move all automated Electron review control out of
production. Reconcile current authorities, then execute a fresh-project real
media journey and final branch audit.

## Concrete Steps

For each package: register it as ready with a complete allowance, run
`pnpm docs:start -- <WP-ID>`, make only allowed changes, run its focused and
failure gates, sync the current fingerprint, create append-only COMPLETE or
BLOCKED Evidence, bind the Evidence in its owned matrices, run
`pnpm docs:complete -- <WP-ID> <EVIDENCE-ID>` only when acceptance truly passes,
and commit a recoverable checkpoint. High-risk packages repeat the complete
repository and synthetic-final gates and receive independent read-only review.

## Validation and Acceptance

Final acceptance requires one current major per logical AVE-owned contract;
one Worker adapter and Worker release identity; one current project format with
explicit rejection of every other format; one desktop Stage 2 route; no test
or auto-confirm environment hooks in production; exact full approved-Story
duration in Preview and Master; QC and semantic/execution hashes bound to the
same Timeline; scoped feedback accept/reject behavior; reopen identity; direct
human review; no active Stage 2 debt; a clean worktree; exact pushed SHA with
green `security` and `check`; and no unresolved current review finding.

## Idempotence and Recovery

Documentation start/sync operations are idempotent. Contract generation is
deterministic. Each package is committed before the next begins. Older project
formats are never destructively migrated; opening them fails before writes.
Failed real-media or human acceptance keeps its package open or blocked with
Evidence and Debt. No command in this plan merges the PR.

## Artifacts and Notes

Private media, local paths and credentials remain outside Git. Repository
Evidence stores portable identifiers, hashes, commands and decisions only.

## Interfaces and Dependencies

Project Host owns contracts, approvals, project data and atomic Timeline
commit. Renderer is a query/action client. Worker executes only the current
closed task protocol and never owns project data. Preview and Master derive
separate target-specific RenderGraphs from one Semantic Render Manifest. The
Host-owned semantic adapter may emit only current CommandEditIntent and
CommandEditIR.
