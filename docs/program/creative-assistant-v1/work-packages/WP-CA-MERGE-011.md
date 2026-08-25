# WP-CA-MERGE-011 Cycle-safe structural validator closure

## Outcome

Ensure standalone contract validators reject cyclic non-JSON inputs without a
stack overflow while retaining property-order-independent JSON equality.

## Scope

- Track active object pairs per equality invocation and fail comparison closed
  when a recursive pair is encountered.
- Preserve correct equality for acyclic JSON primitives, arrays and objects.
- Regenerate the canonical Creative Context validator and add cyclic-input
  no-throw rejection coverage.
- Reconcile both programme fingerprints without promoting capability status.

## Non-goals

- No support for serializing or accepting cyclic values.
- No schema, public API, storage or dependency change.
- No Product, Renderer, Worker or Timeline behavior change.
- No merge authorization.

## Validation

Run Story property tests, contract generation/clean/roundtrip gates, typecheck,
full repository check, synthetic final acceptance, documentation/fingerprint
checks, allowed-path audit, independent review and final-head PR checks.
