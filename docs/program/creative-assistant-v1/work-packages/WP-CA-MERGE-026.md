# WP-CA-MERGE-026 Authority-bound material regeneration closure

## Outcome

Let the shipped Stage 2 desktop journey regenerate a fresh immutable Material
Evidence Pack and Direction comparison after any exact generation authority
changes, without rebinding an older identity, selecting history by insertion
order, or leaving downstream actions open under an ambiguous authority.

## Scope

- Bind the exact authoritative Timeline version and current Original location
  identity into the deterministic material generation identity.
- Bind the Product evidence generator, material assembler/template/policy,
  exact Creative Skill Definition and invocation/evaluator/policy, exact Duration
  Blueprint and allocator/policy, and Story evaluator/template/policy into
  separate deterministic identity layers.
- Persist one Product material-authority marker in the Pack input fingerprint
  and provenance while retaining the existing fingerprint and lifecycle
  semantics of the generic Creative Context API.
- Derive fresh Evidence, Coverage, Material Pack, Creative Skill Evaluation,
  Duration Feasibility and Direction identities for the new Timeline snapshot.
- Preserve exact same-workspace idempotency and interrupted-generation retry.
- Keep prior stale packs and Direction cards as immutable audit history while
  projecting the exact semantically current Pack and Direction chain rather
  than using creation time or array position.
- Expose the exact current Pack ref to the Renderer, and show no current Pack
  when Host authority is ambiguous.
- Cascade active Pack or Direction-selection ambiguity through Direction,
  Story, Approved Plan and Edit Intent projections so every downstream Product
  generation, approval and execution action fails closed.
- Verify that an unrelated Timeline property change and a same-content,
  same-path Original relink each make the old chain stale, keep the Renderer
  generation recovery control available, and publish a new sufficient pack
  plus two current candidate Directions.
- Verify a realistic pre-repair Product Pack/Evaluation/Duration/Direction
  chain becomes stale and can be rebuilt, a trailing stale Pack cannot become
  current, and a caller-chosen Product-like generic Pack ID remains generic.
- Reconcile the shared editing and creative-assistant fingerprint and Evidence
  without changing any capability or acceptance status.

## Non-goals

- No Timeline, storage, Contract, permission, Evidence schema, Creative Skill
  definition, Duration Blueprint, Renderer action, IPC, Worker, render, or
  contract-schema change.
- No mutation or supersession of historical immutable editorial artifacts.
- No private real-media claim and no PR merge authorization.

## Design decision

`MaterialEvidencePackV1.timeline_version` and its availability records make the
complete Timeline snapshot and exact current Original location part of pack
validity, even when the selected clip's source range and media content are
unchanged. Evidence identity therefore binds those facts plus the Product
evidence generator that assigns statement ranges. A distinct Product material
authority marker binds assembler/template/policy and is persisted in both the
Pack fingerprint and provenance. Skill, Duration and Direction identities then
bind their own exact immutable definitions and Host evaluator/policy versions.
This layered model keeps retries within one authority snapshot idempotent while
allowing any changed layer to publish a fresh immutable object instead of
colliding with version 1.

The Product marker is opt-in and does not alter the generic Creative Context
fingerprint. Historical Product Packs are recognized by their reserved Pack
and Evidence namespaces; a generic caller-selected Pack ID alone grants no
Product authority. Workspace projection selects a Pack only from exact active
Direction refs or a unique sufficient Pack, exposes that exact ref to the
Renderer, preserves stale history, and closes the complete downstream chain
when active Pack or selected-Direction authority is ambiguous. With multiple
sufficient Packs but no active Direction, an exact reviewed material request
may establish a deterministic new current chain instead of deadlocking.

## Validation

Run the Stage 2 Product action, generic Creative Context and Renderer property
suites, workbench Host, typecheck, architecture and documentation gates, the
complete repository check, synthetic final acceptance, allowed-path audit,
independent review, and exact-head remote CI/review verification.
