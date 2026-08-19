# WP-PRESET-001 Preset and Skill Output interface

## User-visible outcome

Creative automation can select, compose and apply audited reusable Presets without acquiring direct Timeline, RenderGraph, backend, file, database or network authority. The Project Host applies a successful exact-version selection atomically and retains enough provenance to explain and reproduce the edit.

## Capability IDs

- CAP-PRESET-001

## Specifications

- `docs/specifications/editing-execution-v1/PRESET_AND_SKILL_INTERFACE.md`
- `docs/plans/2026-08-11-preset-creative-skill-interface.md`
- ADR-0012, ADR-0013 and ADR-0014

## Current repository gap

`basic_vertical_vlog@1` already proves a narrow fixed compiler that emits four ordinary Timeline Commands. The missing capability is a generic immutable definition registry, typed `CreativeSkillOutputV1` Preset / Skill Output, exact version/digest pinning, trust/license/asset validation, declared semantic routing, Project Host atomic application/provenance and focused human review. Historical ACC-015 evidence proves RenderGraph blocker persistence only and cannot complete this package.

## Allowed and forbidden paths

Use the manifest. `apps/worker-host/**` remains forbidden. Graphic Bake and AI Asset are not available fallbacks in this package.

## Contract changes

Add versioned Preset Definition, Preset Selection, `CreativeSkillOutputV1` and Preset Application Record Schemas. Definitions are pure data and cannot contain executable code, raw Timeline Commands, RenderGraph nodes, shell, network retrieval or backend strings.

## Timeline and CommandEditIR changes

`CreativeSkillOutputV1` contains exact-version ordered Preset selections and typed parameters only. Preset Core deterministically compiles those selections to ordinary Timeline Commands. Project Host simulates and commits one command group against the supplied base version.

## RenderGraph and backend changes

Definitions declare target-neutral semantic capabilities and Preview/Master routing expectations. They never inject graph nodes. The committed Timeline remains the only source for RenderGraph construction. Unsupported capabilities, untrusted Bake assets or unavailable adapters resolve to structured blockers.

## Trust, assets, license and migration

Built-in definitions may execute. A project-local definition requires an exact Host-trusted definition digest. Marketplace definitions default to quarantine. Unknown, pending, expired or revoked license state and missing or mismatched assets block new application. Exact versions never upgrade implicitly; migration is an explicit new selection and Commit.

## Tests and acceptance

Required automated acceptance is ACC-020 through ACC-025 plus renewed generic coverage for ACC-015. ACC-016 remains narrow Basic Vlog evidence. ACC-026 is the user-run creative review boundary; the package remains active and must not run `docs:complete` before it passes.

## Evidence requirements

Create immutable PRECHECK Evidence after the final implementation fingerprint and machine/real-media prechecks are known. Open a draft PR for ACC-026. After user approval, create a separate immutable COMPLETE Evidence record and perform the governed completion sequence.

## Failure conditions

- Definition or Skill input contains executable behavior, Commands, graph nodes or backend strings.
- Exact version/digest, trust, license, asset or capability requirements are unavailable.
- Preview and Master cannot preserve the same target-neutral semantics.
- Any failure produces a partial Timeline commit, missing application record or duplicate non-idempotent history.
- Generated interfaces or passing smoke tests are presented as user capability.

## Definition of Done

ACC-020 through ACC-026 and renewed ACC-015 evidence pass; Project Host atomically commits successful applications and persists blocked attempts without Timeline mutation; undo/redo and close/reopen are verified; generated contracts and documents are synchronized; full checks pass; the user approves the review bundle; and no external Marketplace execution is claimed.
