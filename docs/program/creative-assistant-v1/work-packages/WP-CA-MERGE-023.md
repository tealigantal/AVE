# WP-CA-MERGE-023 Immutable candidate-set decision closure

## Outcome

Prevent a previously decided Direction or Story comparison from being decided
again by passing only the still-candidate remainder of its original candidate
set.

## Scope

- Derive the already-decided guard from the immutable `candidate_refs` stored
  in the prior Direction-selection or Story-approval Decision Record.
- Project every exact rejected candidate as rejected in the Host-owned
  workspace, so the desktop no longer offers the remainder as a fresh choice.
- Reject every later requested candidate subset that overlaps the prior
  Decision's complete candidate set, before retaining a new approval or
  writing a second Decision, selected Direction, or Approved Story Plan.
- Preserve the existing pre-await, post-await, and in-transaction checks.
- Add three-candidate regressions proving that choosing A from A/B/C closes a
  later B/C selection or approval with zero project mutation.
- Reconcile the shared programme fingerprint and append exact validation
  Evidence without changing capability or acceptance status.

## Non-goals

- No contract, schema, storage, permission-policy, Renderer, Worker, Timeline,
  model-provider, or desktop interaction change.
- No candidate-generation grouping redesign and no new public authority.
- No private real-media claim and no PR merge authorization.

## Validation

Run the focused Stage 2 Product suite, typecheck, architecture gates, complete
repository check, synthetic final acceptance, documentation checks, allowed-
path audit, independent review, and exact-head remote CI/review verification.
