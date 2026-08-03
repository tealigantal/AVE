# WP-RENDER-003: PR #5 Final Review Correctness Fixes

## Outcome

Close the five final-head PR #5 findings without widening editing-execution-v1 claims: single-track position must execute, unsupported color context must block, LUT bytes must match the planned digest, failed pre-transaction staging must clean orphan objects, and QC policy must participate in bundle identity.

## Allowed Paths

`packages/core/render-graph/**`, `packages/platform/project-host/**`, `packages/platform/project-storage/**`, `apps/worker-host/**`, `tests/**`, `docs/**`, and `scripts/docs/**`.

## Acceptance

Each finding has a focused regression. Existing blocked capability scope remains blocked. The relevant package tests, documentation checks, and full repository check pass before completion.
