# WP-CA-MERGE-010 Structural JSON equality validator closure

## Outcome

Make generated standalone Stage 2 validators enforce JSON Schema
`uniqueItems` independently of object property insertion order.

## Scope

- Replace the generated runtime's order-sensitive JSON string comparison with
  recursive structural JSON equality.
- Regenerate the Creative Context standalone validator through its canonical
  generator; never hand-edit the generated artifact.
- Add a regression using duplicate Direction evidence refs whose properties
  have different insertion order.
- Reconcile both programme fingerprints without promoting capability status.

## Non-goals

- No schema, contract shape, public API or storage change.
- No new dependency or general-purpose non-JSON equality semantics.
- No Product, Renderer, Worker or Timeline behavior change.
- No merge authorization.

## Validation

Run Story property tests, contract generation/clean/roundtrip gates, typecheck,
full repository check, synthetic final acceptance, documentation/fingerprint
checks, allowed-path audit, independent review and final-head PR checks.
