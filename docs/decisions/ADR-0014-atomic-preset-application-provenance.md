# ADR-0014 Atomic Preset Application Provenance

## Status

Accepted for WP-PRESET-001.

## Context

A successful Preset application changes the Timeline through several Commands and must retain the exact definition, selection, resolved defaults, trust/license/asset decisions, declared semantic capabilities and Preview/Master routing. Persisting provenance after Timeline commit could leave an authoritative edit without its audit record; persisting it before commit could leave a false successful application after a version conflict or crash.

## Considered Options

1. Store only the expanded Commands. This preserves output but loses the reason, exact definition and trust/license decisions.
2. Store the application record in a separate transaction. This permits partial state and ambiguous recovery.
3. Stage a content-addressed application object, include its identity in CommitPlan semantic references, and register its object reference and event in the same Project Storage transaction as Timeline snapshot, Commands and CommitPlan.

## Decision

Adopt option 3 for successful applications. Project Host resolves and simulates the full ordered selection set, checks the supplied base Timeline version and creates one CommitPlan. It resolves the candidate Timeline's `RenderSourceRef` values from persisted verified Original/Proxy and probe facts, then rebuilds target-specific Preview/Master RenderGraphs, verifies their target-neutral semantic payload/hash is equal, and resolves one ExecutionPlan per graph before commit. Project Storage registers the immutable `preset_application` object reference in the same SQLite transaction as the Timeline version and CommitPlan. The record contains base/final version, exact definition pins and digests, resolved parameters, application context, canonical command payload and hashes, asset/license/trust decisions, declared capabilities, target-neutral semantic expectation, authoritative candidate source-identity hash, candidate Preview/Master plan IDs/cache keys/decisions and explicit links from every declared semantic to executing RenderGraph node IDs.

A subsequent formal `renderTimeline` for that exact Timeline version has Worker re-probe the actual Original and Proxy paths, ignores caller audio claims, rejects divergent target audio and verifies that actual Original identity still matches the persisted candidate authority. It then revalidates the Preset record's semantic graph hash and node links against the actual Preview/Master ExecutionPlans before Worker render submission. Successful output manifests persist a `preset_application_link` naming the application, candidate source/plans, actual source/plans/cache keys and verified link count. The bundle identity includes this provenance. Candidate and actual plan IDs may differ because target sources or profiles differ, but they may not be confused or left unlinked.

Blocked resolution never mutates Timeline state. Host persists a separate content-addressed blocked application record and structured diagnostics. Repeating the same application ID with identical content is idempotent; different content under the same ID fails closed.

Preview and Master must have the same target-neutral semantic expectation. Target-specific source/profile/adapter decisions may differ only when they remain semantically equivalent. Source and audio identity may not be fabricated: missing Original, unusable Proxy-only identity, divergent Original/Proxy audio probes and required audio excluded by enabled/muted/solo/routing state fail closed. Bake succeeds only for a trusted content-addressed artifact with acceptable licensing; otherwise it blocks. No node may be silently omitted.

Atomic artifact metadata is descriptive only. It is rejected before staging if it contains `object_ref_id`, `object_type`, `version`, `relation_key` or `byte_length`; authoritative descriptors win during row construction, and the commit event references the rows actually inserted.

## Rationale

The transaction preserves auditability and Command/Commit authority without a new database migration. Existing object storage and object references already provide immutable content identity and recovery behavior.

## Consequences

`commitTimelinePlan` gains an optional atomic artifact-registration input while preserving old callers. Invalid identity metadata fails before object staging. A later staging or transaction failure may leave an unreferenced content-addressed object, which is non-authoritative and recoverable through the existing orphan mechanism. Blocked application records are intentionally retained as audit evidence.

## Migration

No schema migration is required. Existing projects can register new object types in `object_refs`. Older Timeline versions remain readable and have no fabricated Preset provenance.

## Rollback

Stop creating new application records and ignore the additional object type in old application code. Retain stored objects and references; destructive removal would erase audit history.

## Date

2026-08-11
