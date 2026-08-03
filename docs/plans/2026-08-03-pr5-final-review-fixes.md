# PR #5 Final Review Fixes ExecPlan

## Purpose / Big Picture

Make PR #5 merge-ready by fixing the five valid final-head review findings while preserving the fail-closed RenderGraph and atomic Render Bundle contracts.

## Progress

- [x] Confirm the five unresolved review threads against remote PR #5 and local HEAD `97be803`.
- [x] Start WP-RENDER-003 and implement focused fixes with regression coverage.
- [ ] Run package-specific and full repository validation.
- [ ] Create Evidence, reconcile matrices, complete/sync/check the work package.
- [ ] Commit and push PR #5, resolve the five threads, update the PR description, and close superseded PR #4.

## Surprises & Discoveries

- Green final-head CI did not cover single-track translation, non-default color context, LUT byte identity, pre-transaction staging cleanup, or QC-policy idempotency.
- Local `gh` authentication is stale; GitHub connector access remains available for PR metadata and mutations.
- Re-rendering an identical plan can encounter the existing immutable-output collision boundary because encoded MP4 bytes are not guaranteed byte-identical; QC identity is therefore tested as a pure canonical hash rule rather than by performing an unrelated duplicate encode.

## Decision Log

- 2026-08-03: Create a narrow corrective work package because pending WP-PRESET-001 forbids Worker changes.
- 2026-08-03: Block unsupported non-default color context rather than claim an incomplete color-management implementation.
- 2026-08-03: Include canonical QC requirements in bundle identity rather than separating QC persistence in this narrow correction.

## Validation and Acceptance

Run the focused Worker, Timeline render, and Render Bundle suites first, then `pnpm run check`. Completion requires no unresolved targeted review threads and no capability promotion beyond executed evidence.

## Idempotence, Retry, and Rollback

Repeated render requests with identical plans and QC policy reuse identity. Different QC policy produces a different identity. Any validation or staging failure removes newly created unreferenced objects. Retry after failure remains safe.

## Outcomes & Retrospective

Pending implementation and validation.
