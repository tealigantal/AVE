# WP-CA-MERGE-009 Pre-confirmation duplicate Story closure

## Outcome

Prevent a duplicate Product Story approval from showing the native human-review
dialog when the current workspace already exposes an approved Story Plan.

## Scope

- Fail closed in the main-process confirmation path before `showMessageBox`.
- Retain the Host execution guard as a defense-in-depth authority boundary.
- Add behavioral and architecture regression coverage for confirmation ordering
  and zero dialog/perform calls.
- Reconcile both programme fingerprints without promoting editing capability.

## Non-goals

- No supersession or reopening workflow.
- No contract, storage, permission-policy or authorization change.
- No Renderer, Worker or editing-capability change.
- No merge authorization.

## Validation

Run Stage 2 Product tests, desktop boundary, typecheck, full repository check,
synthetic final acceptance, documentation/fingerprint checks, allowed-path
audit, independent review and final-head PR checks.
