# WP-CA-MERGE-012 Late render and rejected-intent closure

## Outcome

Preserve ordinary clip framing for opacity-only automation and keep a rejected
feedback Intent terminal in the Stage 2 Renderer after approval expiry.

## Scope

- Classify only geometry-affecting automation as a geometry transform in the
  Worker graph compiler.
- Add encoded-media comparison proving opacity-only automation preserves the
  baseline fill/crop framing while changing alpha.
- Derive Renderer intent controls from Host-projected candidate/rejected status,
  not only the current rejection decision TTL.
- Add a Renderer property regression for terminal rejection and candidate paths.
- Reconcile both programme fingerprints without promoting capability status.

## Non-goals

- No change to automation contracts, transform semantics or accepted scope.
- No change to Host rejection authority, approval TTL or storage.
- No new UI action, schema, dependency or public API.
- No merge authorization.

## Validation

Run Worker render correctness, Stage 2 Renderer/Product tests, typecheck, full
repository check, synthetic final acceptance, documentation/fingerprint checks,
allowed-path audit, independent review and final-head PR checks.
