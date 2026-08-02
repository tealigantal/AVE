# ADR-0011 Atomic Render Bundle Persistence

## Status

Accepted for WP-RENDER-002.

## Context

A Preview/Master render is one logical publication, but the prior path could persist a render run, results, execution plans and output manifests in separate calls. A crash could leave an apparently successful partial render, duplicate retries, mutable output paths, or orphaned object references. Project Host must remain the sole SQLite writer and Worker must never open `project.sqlite`.

## Considered Options

1. Keep independent inserts and repair partial state on reopen. Recovery cannot prove which subset was authoritative.
2. Wrap only database rows in a transaction while retaining mutable Worker paths. Database consistency would not protect media identity or missing files.
3. Stage verified content-addressed objects, then register the complete logical bundle in one SQLite transaction with an idempotency identity and cleanup on failure.

## Decision

Adopt option 3. Migration 0019 introduces `render_bundles` as the logical publication record. A completed bundle contains exactly one render run, Preview and Master results, two execution plans and two output manifests. A blocked bundle contains the two target plans plus a blocker manifest and contains no render run or media result.

Host verifies each Worker result's plan ID, semantic hash, cache key and output SHA-256 before registration. Storage copies media and manifests into immutable content-addressed object storage, then inserts all render, result, object-reference, manifest, event and bundle rows inside one SQLite transaction. The bundle ID and idempotency key derive from stable target cache identities. Retrying identical content returns the existing bundle; the same key with different content fails closed.

## Authority, Schema Version and Compatibility

Project Host owns transaction orchestration; Project Storage owns SQLite/object-store implementation; Worker only returns candidate artifacts. Database schema version advances to 19. Existing projects migrate forward on open, and older render rows remain readable. New bundle readers do not reinterpret old independent rows as atomic bundles. The bundle format stores versioned plan/output manifest objects, so future schema versions can coexist without mutating historical objects.

## Consequences and Failure Semantics

An application-visible completed bundle can no longer contain only Preview or only Master. Insert failures at the render, result or manifest boundary roll back every row and remove newly staged orphan objects. Hash mismatch, output collision, idempotency conflict or incomplete cardinality fails before publication. Close/reopen reads the same immutable object identities and source links.

## Security and Data Handling

Only Host/Storage can write project state. Content hashes are recomputed rather than trusted from Worker. User originals are referenced through existing project media authority and are not copied into repository fixtures or documentation evidence.

## Testing

Failure-injection tests cover render, result and manifest insertion boundaries, object cleanup, retry equality, retry conflict, blocked bundles and close/reopen recovery. Integration tests additionally verify Preview/Master plan/output cardinality and content-addressed result paths.

## Migration and Old-Project Impact

Migration 0019 is additive and runs during project open. It does not rewrite existing render results. Old projects continue to open and can create new atomic bundles; old independent renders remain historical records without a bundle claim.

## Rollback

Application rollback can ignore the additive table, but should not delete it or its object references. A later forward version can resume reading the stored schema-versioned manifests. Destructive down-migration is not supported because it would discard audit history.

## Date

2026-08-02
