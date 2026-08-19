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

## Compatibility rules

Readers must either support an older version, use an explicit adapter/migration,
or reject it with a stable diagnostic. “Latest” is never an authoritative pin.
Schema evolution is additive when possible. Destructive or irreversible
migration requires a separate decision and recovery plan.

## Staleness and invalidation

Changes to media content, creator constraints, rights, evidence, Timeline base,
capability snapshot, Skill definition, or approval invalidate dependent
artifacts according to explicit relationships. Stale proposals remain auditable
but cannot be committed or delivered.

## Time and retries

RationalTime is authoritative for media coordinates. Wall-clock timestamps are
audit metadata only. Idempotent retry preserves logical identity; same identity
with different content is a conflict.
