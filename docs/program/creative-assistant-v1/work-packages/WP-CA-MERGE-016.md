# WP-CA-MERGE-016 Explicit feedback clip targeting

## Outcome

Require the creator to choose the exact editable Timeline clip before a local
feedback revision can be created.

## Scope

- Show every current editable video target in the Stage 2 feedback form.
- Keep the target unset until the creator makes an explicit selection.
- Resolve the submitted target by its exact track and clip identity and reject
  missing or stale selections before sending a Host command.
- Add deterministic Renderer regressions for target identity and form wiring.
- Reconcile programme fingerprints and Evidence without promoting status.

## Non-goals

- No Timeline, persistence, contract, IPC or Host behavior change.
- No natural-language target inference.
- No merge authorization.

## Validation

Run the Stage 2 Renderer and Product workspace tests, typecheck, architecture,
full repository check, synthetic final acceptance, documentation and
fingerprint checks, allowed-path audit, independent review and exact-head PR
checks.
