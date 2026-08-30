# WO-INT-002 Duration Blueprint

Status: promoted and active as `WP-CA-INT-002`. Governed acceptance:
`ACC-CA-INT-002-DURATION`.

## Goal and motivation

Implement a versioned Duration Blueprint and deterministic feasibility policy
for beat budgets, density, emotional curve and ending reserve across 30-second
to 30-minute plans. Short work must not be a truncated long-video template.

## Inputs and dependencies

`DURATION_BLUEPRINTS.md`, approved Creative Contract and Material Evidence Pack.
Depends on `WO-INT-000` and `WO-INT-001`.

## Outputs and allowed paths

- `contracts/schemas/editorial/duration-blueprint.v1.schema.json` and generated
  bindings;
- pure feasibility/allocation policy in `packages/core/editorial-core/**`;
- Project Host registration and content-addressed persistence under
  `packages/platform/project-host/**`, `packages/platform/project-storage/**`
  and `database/project-format-v2.sql`;
- `tests/property/duration-blueprint.test.ts`,
  `tests/integration/duration-blueprint-host.test.ts`, the exact current-version rejection
  version assertions in `tests/integration/dev-cli.test.mjs` and
  `tests/integration/foundation-acceptance.test.ts`, docs and `package.json`.

All other paths are forbidden.

## Runtime and failure contract

Project Host validates and pins an exact blueprint against Contract duration
and Evidence sufficiency. Allocation is deterministic for the same inputs and
reports variance, missing evidence and impossible ending/beat constraints.
Failure registers no Story Plan or Timeline change.

## Non-goals

Story generation, fixed templates, invented material, Timeline Commands,
rendering or automatic duration approval.

## Acceptance and exact tests

Exercise boundary durations, deterministic allocation, insufficient evidence,
contradictory budgets, exact version pins, idempotent retry and reopen. Run
`pnpm run duration-blueprint:test` (the two focused tests above), contract
gates `pnpm run contracts:check`, `pnpm run contracts:identity` and
`pnpm run contracts:clean`, then `pnpm run typecheck`,
`pnpm run architecture` and `pnpm run docs:check`.

Completion Evidence: `EVD-<YYYYMMDD>-WO-INT-002-COMPLETE`, including duration
boundaries, infeasible/blocked cases, deterministic retry and reopen output.
