# WP-PRESET-002 Preset merge-blocker hardening

## User-visible outcome

Preset application is fail-closed and auditable at the actual mutation, contract, media-source and storage boundaries: a definition cannot hide compiler effects, invalid external data cannot bypass Schema validation, unrelated media is never synchronously scanned, render linkage uses persisted source facts, and metadata cannot override authoritative artifact identity.

## Capability IDs

- CAP-PRESET-001

## Specifications

- `docs/specifications/editing-execution-v1/PRESET_AND_SKILL_INTERFACE.md`
- `docs/plans/2026-08-11-preset-merge-blocker-hardening.md`
- ADR-0012, ADR-0013 and ADR-0014

## Current repository gap

Post-completion adversarial review confirmed five gaps in the PR #7 implementation: compiler capabilities are checked only in the declared-to-possible direction; Project Host synchronously hashes every registered asset; Preset Core duplicates Schema types and runtime validation; candidate RenderGraph construction fabricates Original/audio facts; and atomic metadata can override authoritative object identity. Existing green CI does not cover these cases.

## Allowed and forbidden paths

Allowed paths are `contracts/**`, `packages/**`, `tests/**`, `tools/contract-codegen/**`, `docs/**`, and `package.json`. `contracts/generated/**` may be changed only by the generator. `docs/current/**` and `docs/DOCUMENT_INDEX.md` may be changed only by `docs:sync`. `apps/worker-host/**` is forbidden.

## Required behavior

- Actual compiled Command capabilities must be a subset of the exact definition's declared executable/fallback capabilities.
- Project Host validates external Preset definitions and `CreativeSkillOutputV1` Preset / Skill Output through Contract Runtime/AJV before business resolution.
- Asset availability uses only the definition's declared assets and persisted verification identity; no Project Host media content read is permitted.
- Candidate Preview/Master validation uses persisted authoritative RenderSource facts and records actual plan/source identity.
- Atomic artifact metadata cannot set or override identity, relation, version or length fields.

## Tests and acceptance

ACC-015 and ACC-020 through ACC-025 are renewed by ACC-027. Required commands are the focused contract, Preset, RenderGraph, Host, storage and recovery gates, followed by `pnpm run check`, `pnpm run acceptance:final:synthetic`, `pnpm run acceptance:basic-vlog:real-review`, and `pnpm audit --audit-level high`.

## Evidence requirements

Do not mutate existing WP-PRESET-001 Evidence. Create a new immutable `EVD-20260811-WP-PRESET-002-COMPLETE` only after the final source fingerprint and all executed outcomes are known.

## Failure conditions

- Any undeclared compiler effect reaches a CommitPlan.
- Any invalid binding or unknown contract field reaches Preset business compilation.
- Any asset-free application reads unrelated media bytes.
- Any Preset RenderGraph uses fabricated source or audio identity.
- Any metadata field changes the authoritative artifact descriptor or produces an event/reference split.
- A failed path advances the Timeline or persists an applied record.

## Definition of Done

The five negative regressions pass, all renewed acceptance gates carry current-fingerprint Evidence, full synthetic/real-media/security checks pass, an independent review finds no remaining blocking issue, and PR #7 is moved to Ready without merging.
