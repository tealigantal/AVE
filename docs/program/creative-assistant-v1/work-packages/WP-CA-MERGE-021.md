# WP-CA-MERGE-021 Position automation source-geometry preflight closure

## Outcome

Reject x/y-only transform automation with missing target-specific source
geometry during RenderGraph planning instead of allowing the Worker to discover
the unsupported input after execution starts.

## Scope

- Require positive selected source width and height when position automation is
  requested, using the same resolver blocker already used for scale rastering.
- Prove both missing-geometry rejection and geometry-present acceptance for an
  x-only curve.
- Reconcile shared fingerprints and Evidence without promoting capability or
  acceptance status.

## Non-goals

- No Worker, Timeline, contract, storage or permission-policy change.
- No expansion of supported automation paths or resource envelopes.
- No PR merge authorization.

## Validation

Run the RenderGraph property suite, typecheck, architecture, full repository and
synthetic final gates, docs/fingerprint checks, independent review and exact-head
remote checks.
