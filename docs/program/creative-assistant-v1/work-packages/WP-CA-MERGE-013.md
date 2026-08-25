# WP-CA-MERGE-013 Exact review and authority integrity closure

## Outcome

Bind desktop execution confirmation to the exact prepared effect, enforce one
project-wide Creative Contract authority, and reject corrupted current Preview
bytes before they reach the Renderer.

## Scope

- Prepare and display the exact Edit Intent execution review before the native
  confirmation, then require the Host execution to match that review.
- Reject a second Creative Contract family through the Host and fail closed
  when a legacy or bypassed project contains multiple Contract heads.
- Verify current Preview bytes against the bound Preview render-result hash
  before returning them to the Renderer.
- Add deterministic Host/Desktop and architecture regressions for all three
  closures.
- Reconcile current Evidence without promoting capability status.

## Non-goals

- No contract, schema, storage migration or public Renderer payload change.
- No change to approval policy, Timeline semantics or render formats.
- No destructive repair of legacy ambiguous Contract data.
- No merge authorization.

## Validation

Run Stage 2 Product workspace/actions tests, typecheck, architecture checks,
full repository check, synthetic final acceptance, documentation/fingerprint
checks, allowed-path audit, independent review and exact final-head PR checks.
