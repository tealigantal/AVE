# ADR-0025 Single current development version

- Status: Accepted
- Date: 2026-08-28

## Context

AVE is still in development and has no released project or protocol version
that must remain readable. The repository nevertheless accepts multiple
versions of the same Editorial objects, chooses between Render adapters and
Worker releases, runs project migrations 1 through 27, backfills legacy rows,
and exposes old and current desktop routes. This creates two sources of truth,
lets older Evidence appear applicable to a replacement runtime, and makes the
ordinary user journey differ from the path under current Stage 2 tests.

Version fields also serve legitimate current purposes: schema discrimination,
optimistic concurrency, immutable object identity, stale detection, cache keys
and execution provenance. Removing those identities would weaken correctness.

## Considered Options

1. Preserve every reader, migration and UI fallback until a later public
   release.
2. Keep dual reads but emit only the newest version.
3. Keep one current version for each logical AVE-owned protocol and reject all
   other versions before mutation, while retaining audit/concurrency identities.
4. Remove all version fields globally.

## Decision

Use option 3.

The current Editorial authorities are Creative Contract v2, Story Proposal v2,
Approved Story Plan v2 and Feedback Diagnosis v2. The current edit authority is
CommandEditIntent to CommandEditIR v2 to simulation, CommitPlan and Commit.
Older Editorial contracts and EditIR v1 are removed rather than upgraded.

Render contracts whose payload already declares schema version 2 become true
v2 files, IDs, titles and references. The replacement execution baseline uses
`adapter_id = "worker-media"` with the single `adapter_version = "v4"`
(displayed as `worker-media@v4`) and one Worker identity
`ave-worker-host-r14` for every supported graph; the previous v2/v3 and r12/r13
branches are not read or reused.

The replacement project format is `project_format_version = 2`, created
directly from one complete current schema. Opening any other project format
returns `UNSUPPORTED_PROJECT_FORMAT` before backup, migration, backfill or
project mutation. Git history, historical ADR and immutable Evidence retain
the development history; runtime migration code does not.

The desktop exposes one Stage 2 workspace, one Host-bound Preview/Master path
and one canonical Timeline topology: disabled source/reference tracks plus one
enabled, empty, neutral output track before generation. Old Story, Review,
Render, Preview, Delivery and workbench fallback routes are removed after any
still-required user result has moved to the current path.

Incoming non-current versions fail with a stable unsupported-version error and
zero authoritative writes. AVE provides no automatic upgrade, conversion,
backfill, dual-read, legacy cache reuse or hidden compatibility mode.

Schema, project, adapter and Worker version fields remain mandatory current
discriminators. Timeline/base/expected versions, object and evidence versions,
policy/compiler/generator identities, supersession references, SQLite data
version and execution provenance remain because they protect concurrency,
immutability, staleness, caching and audit; they do not authorize older formats.

## Rationale

A single baseline is the lowest-risk policy before release. It prevents old
records and caches from being interpreted under new semantics, reduces test
state, and makes documentation, source and the real user journey describe the
same product. A new adapter/Worker identity makes the consolidation itself
observable instead of reusing an identity that historically meant only a
Ducking-specific branch.

## Consequences

Existing development projects, caches and payloads may stop opening. This is
intentional. Developers create a new project on the current baseline. Tests
that once proved migration or compatibility are replaced by fail-before-write
unsupported-version tests and current create/open/reopen/recovery tests.

Historical ADRs, completed Work Packages and Evidence are not edited. Any
compatibility decision in them is superseded for current runtime behavior by
this ADR. External format adapters such as OTIO/FCPXML/EDL remain product
boundaries and are not backward compatibility between AVE-owned versions.

## Migration

There is no data migration. Sequential governed packages first move retained
user outcomes to current authorities, then delete old runtime consumers,
schemas, generated bindings, migrations, backfills, routes and tests. Fresh
real-media and human Evidence is required after the replacement baseline.

## Rollback

Rollback reverts the whole unification package set to one earlier repository
commit. It must not selectively restore an older reader, migration, cache
identity or UI fallback beside the current version. No project data is
converted in place.
