# WP-CA-MERGE-027 Product Contract duration and media permission projection closure

## Outcome

Prevent the shipped Stage 2 Product journey from approving a Creative Contract
whose exact RationalTime target has no unique published, trusted built-in
Duration Blueprint, and preserve the authoritative media permission state in
the desktop-safe media projection.

## Scope

- Resolve a Product Contract target only against published and trusted built-in
  Duration Blueprints using exact integer RationalTime equality.
- Apply the same resolver before Product Contract creation, before Product
  approval writes, and again at material-generation preparation so legacy,
  generic-API and catalog-drift paths fail closed.
- Reject unsupported or ambiguous Product targets without registering a
  Contract successor, human approval or permission decision.
- Keep supported built-in duration targets on the existing Product journey.
- Project `metadata.permission_state` through one pure safe-row boundary into
  the existing desktop media shape while continuing to omit the rest of
  permission decision metadata.
- Add focused regressions for unsupported create, legacy review approval,
  supported catalog targets, generation-time revalidation and executable
  authorized/denied/absent safe-row projection with exact output keys.
- Reconcile the shared editing and creative-assistant fingerprint and Evidence
  without changing any capability or acceptance status.

## Non-goals

- No change to generic `CreativeContractV2` validity, registration or approval.
- No nearest-duration selection, rounding, coercion or custom Blueprint.
- No Duration Blueprint catalog, evaluator, Contract schema, SQLite schema,
  permission authority, preload, Renderer, Worker or public IPC-shape change.
- No exposure of permission actor, policy, approval or decision metadata.
- No private real-media claim and no PR merge authorization.

## Design decision

The Stage 2 Product journey is a narrower consumer of the general Creative
Contract model. Its Product-only resolver treats the built-in published and
trusted Duration Blueprint catalog as the sole generation authority and uses
BigInt cross multiplication for exact RationalTime comparison. Exactly one
match is required. Creation rejects an impossible Product request early;
approval repeats the check before any authorization write for Contracts
introduced through lower-level APIs; material generation repeats it as a
consumer-side authority check for catalog drift. Generic Contracts remain
legal and readable outside this Product journey.

Media permission state remains owned and persisted inside location metadata.
The pure IPC safe-row projection copies only that scalar state to the already
defined top-level desktop field; it does not forward the internal permission
decision object. The IPC boundary separately proves the registered media query
uses that exact projection.

This closes boundary inconsistencies inside ADR-0019, ADR-0021 and ADR-0023 and
does not require a new architecture decision.

## Validation

Run the Product action and Creative Context suites, IPC and desktop boundaries,
Workbench Host and Electron runtime tests, typecheck, architecture and
documentation gates, the complete repository check, synthetic final
acceptance, allowed-path audit, independent review, and exact-head remote
CI/review verification.
