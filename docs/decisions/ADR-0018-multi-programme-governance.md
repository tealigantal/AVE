# ADR-0018 Multi-programme governance and one global active Work Package

- Status: Accepted
- Date: 2026-08-23

## Context

Stage 2 is a separate product-intelligence programme, while all documentation
tools are hard-coded to `editing-execution-v1` and may silently activate a
ready package. Reusing an unrelated transform package would violate allowed
paths; creating parallel generated status would violate the authority map.

## Considered Options

1. Put Stage 2 inside editing-execution-v1.
2. Create a second programme with separate current documents.
3. Register multiple programmes behind one global active-package and generated
   current-state route.

## Decision

Use `docs/program/PROGRAM_REGISTRY.yaml` to declare governed programmes. IDs
are globally unique, cross-programme dependencies are explicit, and at most one
Work Package is active globally. `docs:start`/`docs:complete` resolve an exact
package across the registry. Ready packages remain backlog and are never
silently activated. Existing generated current/index files render all
programmes and identify the selected programme/package.

## Rationale

This preserves one status authority and all editing programme history while
allowing Stage 2 its own scope, matrices, state and package paths.

## Consequences

Documentation tooling and its architecture tests become registry-aware.
Programme state remains separate, while code fingerprint and global active
rules are shared. Programme switching is a governed metadata transition, not
product-state mutation.

Affected authorities are `docs/program/PROGRAM_REGISTRY.yaml`, each registered
programme manifest/matrices/STATE, the single generated `docs/current/**` route
and generated `docs/DOCUMENT_INDEX.md`. Existing programme files remain
compatible; no application contract or project database is changed.

## Failure Behavior

One shared topology validator runs before sync, start or complete writes. It
rejects duplicate global programme, directory, Work Package, capability or
acceptance IDs; unknown or incomplete cross-programme dependencies; multiple
global active packages; manifest/STATE disagreement; and registry/active
disagreement. Logical rejection leaves registry, manifests, states and every
generated file byte-identical. Ready discovery is read-only and never selects
or activates backlog.

Writes are pre-rendered and staged to temporary sibling files before per-file
atomic rename. This prevents truncated individual JSON/Markdown files; a
process or operating-system failure between multiple renames is recoverable by
rerunning sync from validated machine-readable authority and is not claimed as
a global filesystem transaction.

## Validation

Architecture fixtures execute sync/start/complete against temporary Git-backed
two-programme repositories. They cover valid start/complete, duplicate global
IDs, unknown and incomplete dependencies, double active, STATE mismatch,
failure byte-identity, two ready packages with no implicit activation and
generated programme navigation. Repository `docs:sync`, `docs:check`,
`docs:architecture:test` and `docs:fingerprint:test` remain mandatory closure
gates.

## Follow-up Work Orders

`WP-CA-INT-000` is the first consumer of cross-programme dependency resolution
and starts only after this governance package completes. Later Stage 2 Work
Packages are added to `creative-assistant-v1`; unfinished editing work such as
`WP-XFORM-002` remains independently ready and is never auto-selected.

## Migration

Register existing editing-execution-v1 unchanged, move unfinished
`WP-XFORM-002` from active to ready, and register creative-assistant-v1 with the
governance bootstrap active. No product database or media migration occurs.

## Rollback

Remove creative-assistant-v1 and the registry, restore the single-programme
tooling and set WP-XFORM-002 active again. Existing programme and Evidence
files remain readable.
