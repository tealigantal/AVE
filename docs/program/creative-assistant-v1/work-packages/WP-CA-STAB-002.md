# WP-CA-STAB-002: Minimum-evidence distinct Story candidates

## Outcome

Issue #11 removes the hidden same-role/exact-duration swap prerequisite from Product Story generation. Every upstream-legal, sufficient and plannable minimum-evidence 30-second or 60-second input produces two genuinely distinct, comparable and valid Story candidates without relaxing a Blueprint, Evidence or approval invariant.

## Scope and boundaries

- Allowed: `packages/platform/project-host/**`, `tests/integration/stage2-product-actions.test.ts`, programme/Evidence records, this ExecPlan, and generated current outputs through `docs:sync`.
- Forbidden: Contract/schema changes, database/storage changes, desktop/renderer/Worker code, Blueprint threshold changes, compatibility interfaces, archive content, real-media acceptance, Stage Exit and Release claims.
- Inputs: current approved Contract, sufficient Material Evidence Pack, exact Duration Blueprint feasibility, selected Direction and existing Product Story generation path.
- Outputs: deterministic candidate differentiation that is valid at the 30s and 60s minimum Evidence counts, focused regression coverage and truthful Evidence.

## Invariants and implementation order

Both candidates retain exact Contract, Material Evidence, Duration and Direction authority. Each candidate has positive RationalTime beat durations, exact target duration, valid non-duplicated/non-overlapping Evidence references, Blueprint role/ending-reserve/beat-count conformance and deterministic identity. Truly insufficient inputs fail before any write.

1. Register/start the package and reproduce the hidden same-role/exact-duration prerequisite with the current minimum legal product path.
2. Add 30s and 60s minimum-evidence regressions that require two structurally or allocation-distinct valid candidates.
3. Implement the smallest Host-owned deterministic differentiation; do not increase Evidence minima or mutate Blueprint policy.
4. Prove idempotency, reopen behavior and zero-write failure closure, then run package/full/remote gates.

## Validation and stop conditions

Focused validation covers 30s and 60s minimum legal inputs, exact candidate distinction beyond labels/IDs, all Evidence/Duration/role constraints, deterministic retry/reopen and truly insufficient zero-write failure. Full checks are `pnpm run check` and `pnpm run acceptance:final:synthetic`.

Stop without completion if two candidates require a Contract/schema compatibility path, a lower/higher Blueprint minimum, invalid Evidence reuse/overlap, a non-deterministic allocation, or any partial write on rejection.

## Definition of Done

The Issue has a completed Work Package, current-scope Evidence, green focused/full/remote gates, a merged PR and no Stage Exit or Release assertion.
