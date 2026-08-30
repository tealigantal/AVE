# WP-CA-UNIFY-004 Current contract integrity and Render schema identity

## Outcome

Make every current Render contract's filename, `$id`, title, generated binding
and `schema_version` agree. Replace mismatched names directly; do not retain old
schema aliases, duplicate examples, generated bindings or reference adapters.

## Required behavior

- Semantic Render Manifest, Render Execution Plan and Render Output Manifest
  use their actual current schema identity everywhere.
- Worker request schemas reference only the current Render contract identity.
- Contract generation removes renamed orphan bindings and clean-check rejects
  any extra generated output.
- Current RenderGraph and execution protocol tests consume one exact contract
  graph without fallback references.

## Non-goals

No Worker adapter/release unification, database baseline replacement, desktop
route redesign, real-media acceptance or merge.

## Validation

Run contract generation/check/round-trip/clean gates, RenderGraph and Worker
protocol tests, Render service and Timeline render tests, type, architecture and
documentation gates, then complete with exact fingerprint Evidence and an
independent read-only review.
