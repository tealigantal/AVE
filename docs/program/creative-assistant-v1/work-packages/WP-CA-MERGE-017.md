# WP-CA-MERGE-017 Feedback target behavioral proof closure

## Outcome

Provide executable Renderer evidence that multi-clip feedback binds the chosen
clip and rejects absent or stale target identities before a Host command.

## Scope

- Extract deterministic feedback request preparation from the workbench action.
- Prove selection of the second editable target produces its exact track, clip,
  asset and source range.
- Prove empty and stale target keys throw before the action reaches `command()`.
- Reconcile programme fingerprints and Evidence without promoting status.

## Non-goals

- No visible UX, Host, IPC, contract, persistence or Timeline behavior change.
- No merge authorization.

## Validation

Run focused Renderer and Product tests, typecheck, architecture, full repository
check, synthetic final acceptance, documentation and fingerprint checks,
allowed-path audit, independent review and exact-head PR checks.
