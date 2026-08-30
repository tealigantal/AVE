# WP-CA-MERGE-004 Dynamic Stage 2 workspace closure

## Outcome

Ensure the Product workspace exposes the same current/stale truth that Project
Host action prechecks enforce, supports an exact human retry after a failed
post-confirmation mutation, and never rounds authoritative RationalTime into an
editable target.

## Scope

- Project Material Evidence Packs, dependent Story/Edit artifacts and
  Permission Decisions through their existing dynamic Host views.
- Bind dynamic status and stale reasons into the workspace digest so an old UI
  snapshot cannot remain current after expiry or authority changes.
- Give each product confirmation attempt a distinct approval identity so a
  durable approval from a failed mutation cannot poison a later exact retry.
- Omit unsafe numeric Timeline ranges from editable targets and expose an
  explicit fail-closed reason instead of converting beyond MAX_SAFE_INTEGER.
- Add regression coverage for expiry, dependent staleness, retry and unsafe
  RationalTime projection.

## Non-goals

- No permission-policy, contract, database schema or authorization change.
- No relaxation of exact-human confirmation or action prechecks.
- No new editing capability or broader Stage 2 scope.
- No merge authorization.

## Validation

Run the Stage 2 product workspace/action tests, typecheck, full repository
check, synthetic final acceptance, documentation and fingerprint checks,
allowed-path audit, independent review and final-head PR checks.
