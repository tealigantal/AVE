# ADR-0016 Unified Edit and Content Authority

## Status

Accepted for WP-FND-001 implementation.

## Context

Manual, Assembly, Rough Cut and Preset paths all reached Command/Commit, but constructed plans independently. Media paths and general render sources also retained more authority than the content-identity model permits.

## Considered Options

- Preserve independent plan construction and add local checks.
- Rewrite all features around a new service.
- Add one bounded Project Host use case and translate existing facades into typed intents.

## Decision

Project Host exposes one typed edit execution path from Intent/IR through CommitPlan. Compatibility APIs translate into that path. Asset identity is immutable content; path, Original/Proxy location and stream facts are separate Host-validated records. Master source resolution consumes only a currently verified persisted Original.

## Rationale

A bounded extraction removes authority bypasses while preserving existing public APIs, undo/redo and feature packages.

## Consequences

Edit provenance becomes first-class, preconditions fail before persistence, fixed timebase assumptions are removed and relink/content change can propagate staleness. Advanced editing semantics remain blocked.

## Migration

Existing Timeline snapshots and asset locations remain readable. New location/relation/stale tables are additive and Host use cases backfill facts when media is revalidated.

## Rollback

The new tables are additive. Compatibility facades can remain while the new use case is disabled, but no new direct commit path may be introduced.

## Date

2026-08-12
