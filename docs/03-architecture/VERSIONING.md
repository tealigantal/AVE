# Versioning

## Principles

AVE versions authority boundaries, not only files. Every approval and derived
artifact pins the exact inputs it relied on so stale or conflicting work is
rejected rather than silently rebased.

## Versioned identities

- project and Timeline logical version;
- immutable media content identity plus mutable verified location;
- Creative Contract, Material Evidence Pack, Story Plan, Decision Record, and Edit
  Intent versions or digests;
- contract/schema and generated-binding version;
- current Preset Definition and `CreativeSkillOutputV1` identity, version, and
  digest;
- future Creative Skill Definition ID, version, and digest;
- Semantic Render Manifest hash, target-specific RenderGraph and ExecutionPlan identity, backend/capability
  snapshot, cache identity, and OutputManifest;
- model, policy, research snapshot, knowledge source, and evaluation version.

## Current development protocol rule

For AVE-owned, unreleased protocols, each relative schema family has exactly
one current major. A non-current identity is rejected before authoritative
writes: there is no migration, conversion, dual-read, alias, or backfill.
Development projects may stop opening after a baseline replacement; create a
new current-format project. This rule does not apply to external exchange
formats, retained Evidence/Git history, or a future released-product policy
adopted by a separate ADR.

Version fields still provide schema discrimination, optimistic concurrency,
immutable identity, stale detection, cache identity, execution provenance, and
audit. They do not authorize reading an old format.

## Staleness and invalidation

Changes to media content, creator constraints, rights, evidence, Timeline base,
capability snapshot, Skill definition, or approval invalidate dependent
artifacts according to explicit relationships. Stale proposals remain auditable
but cannot be committed or delivered.

## Time and retries

RationalTime is authoritative for media coordinates. Wall-clock timestamps are
audit metadata only. Idempotent retry preserves logical identity; same identity
with different content is a conflict.
