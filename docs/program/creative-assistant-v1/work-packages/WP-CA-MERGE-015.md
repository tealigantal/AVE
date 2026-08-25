# WP-CA-MERGE-015 Exact render binding and unit-position closure

## Outcome

Make Stage 2 render currency depend on persisted exact execution-plan binding
and render one-unit static positions through the geometry path.

## Scope

- Persist the verified execution binding on Preview and Master render results.
- Mark an otherwise same-Timeline render stale unless both targets carry one
  exact binding matching a committed execution's semantic graph, source
  identity and Preview/Master plan IDs.
- Treat `x: 1` and `y: 1` as position changes while retaining `scale_x: 1` and
  `scale_y: 1` as identity values.
- Add deterministic workspace and encoded-media regressions.
- Reconcile both programme fingerprints and Evidence without promoting status.

## Non-goals

- No schema, migration, contract or render-format change.
- No new editing capability or change to accepted transform scope.
- No merge authorization.

## Validation

Run focused Stage 2 Product and Worker media-correctness tests, typecheck,
architecture, full repository check, synthetic final acceptance, documentation
and fingerprint checks, allowed-path audit, independent review and exact-head
PR checks.
