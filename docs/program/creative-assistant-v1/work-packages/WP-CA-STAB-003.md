# WP-CA-STAB-003: Prepared Timeline render-source coverage

## Outcome

Issue #13 determines whether the current canonical Project Host path can legally use a prepared-Timeline Asset not present in Story Evidence. If it can, Render Source resolution must cover every such Asset before commit. If the current topology excludes it, executable coverage must prove that relation without adding unreachable source-resolution code.

## Scope and boundaries

- Allowed: `packages/platform/project-host/**`, `tests/integration/stage2-product-actions.test.ts`, programme/Evidence records, this ExecPlan, and generated current output through `docs:sync`.
- Forbidden: Contract/schema/storage/Worker/Desktop changes, Blueprint changes, compatibility paths, real-media acceptance, Stage Exit and Release claims.
- Inputs: current approved Contract, Material Evidence Pack, approved Story and Intent, prepared `CommandEditIntent` Timeline, and immutable Original authority.
- Output: deterministic source resolution from `prepared.timeline` with a canonical multi-Asset regression.

## Invariants and implementation order

Every Render Source remains Host-owned and must have a current immutable Original, matching identity, current rights authorization, probe-derived source timescale, geometry and audio facts. Preview and Master retain one source identity. Source failure occurs before any Timeline/execution commit and writes nothing.

1. Establish whether a canonical Product execution can place an Asset B when Story Evidence references only A.
2. Add the focused regression for the reachable result: complete pre-commit resolution if it is legal, or an executable topology proof if it is not.
3. Retain all existing immutable Original, rights, current-identity, probe, audio and geometry checks, plus missing-source and atomic execution closure.
4. Run required focused/full/gated validation and record truthful synthetic Evidence.

## Definition of Done

The Issue has a completed governed package, executable coverage of the canonical prepared-Timeline source relation, preserved zero-write source failure, green focused/full/remote gates, a merged PR and no real-media, Stage Exit or Release assertion.
