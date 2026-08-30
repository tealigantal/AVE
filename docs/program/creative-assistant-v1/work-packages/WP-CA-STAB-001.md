# WP-CA-STAB-001: Project Host clock authority for Material Evidence Pack expiry

## Outcome

Issue #16 makes Material Evidence Pack expiry a single Project Host-clock decision across creation, reads, workspace projections and reopened sessions.  The boundary expires at `expiry <= now` and never relies on the process wall clock for business authority.

## Scope and boundaries

- Allowed: `packages/platform/project-host/**`, `tests/integration/creative-context-host.test.ts`, this Work Package, the named ExecPlan, programme/Evidence records, and generated current outputs through `docs:sync`.
- Forbidden: Contracts, storage schema, desktop/renderer and Worker code, unrelated time systems, archive content, compatibility paths, real-media acceptance, Stage Exit and Release claims.
- Inputs: persisted Material Evidence Packs, injected `ProjectHostOptions.now`, approved Contract/Evidence/media fixtures, and the existing reopen recovery path.
- Outputs: one Host-clock expiry predicate, focused regression coverage, current Evidence and a completed governed package.

## Invariants and implementation order

The Project Host remains the sole business-state authority; stored pack payloads and their identities do not change. Wall-clock use is allowed only where it is non-authoritative audit data, and no partial write may occur when expiry rejects an assembly.

1. Register and start this package, then add a failing deterministic regression using a Host clock earlier and later than the machine clock.
2. Route assembly, dynamic lifecycle projection, workspace/list/read and reopen checks through the injected Host clock using the exact `expiry <= now` boundary.
3. Preserve current persistence and retry semantics; prove the failed expiry path has zero writes.
4. Run focused, full, synthetic and remote checks; record executed evidence before completing the package.

## Validation and stop conditions

Focused coverage proves create/read/workspace/reopen behavior before one millisecond, at equality, and after one millisecond; it also proves a Host earlier/later than machine behavior and zero partial writes.  Full checks are `pnpm run check` and `pnpm run acceptance:final:synthetic`.

Stop without completion if repairing expiry requires changing persisted identity, Contract/schema compatibility, an unrelated time authority, or cannot establish deterministic reopen behavior.

## Definition of Done

The Issue has a completed Work Package, current-fingerprint Evidence, green focused/full/remote gates, a merged PR and no Stage Exit or Release assertion.
