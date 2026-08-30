# WP-CA-UNIFY-003 Single current Editorial contract and runtime authority

## Outcome

Retain exactly one current AVE-owned Editorial contract for each logical
concept. Remove old Story Proposal, Approved Story Plan, Assembly Cut, Creative
Contract and Feedback Diagnosis schemas, generated bindings, validators,
upgrade adapters and tests. Current contracts reject older shapes before any
project write; no translation or dual-read path remains.

## Required behavior

- Creative Contract is constructed and validated directly in its current form.
- Story Proposal, Approved Story Plan and Feedback Diagnosis expose only their
  current schemas and runtime validators.
- AssemblyCutV2 remains the single Assembly authority; the old Assembly schema
  and examples are deleted.
- Contract generation, compatibility policy, clean-tree generation and all
  current Editorial integration paths pass from a clean checkout.
- Historical documents remain immutable history and do not become runtime
  compatibility requirements.

## Non-goals

No Render/Worker identity change, database baseline replacement, desktop route
redesign, real-media acceptance or merge.

## Validation

Run contract generation/check/compatibility/clean gates, current Contract,
Story, Feedback and Pipeline tests, type and architecture checks, then complete
with exact fingerprint Evidence and independent read-only review.
