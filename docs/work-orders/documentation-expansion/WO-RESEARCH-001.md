# WO-RESEARCH-001 Reviewed Video Knowledge

Status: candidate ready for governed promotion; not in the active programme. Proposed acceptance:
`ACC-RESEARCH-001`.

## Goal and motivation

Turn permitted, time-coded video observations into immutable reviewed
VideoPattern knowledge with counterexamples, rights and provenance, without
treating popularity as quality or copying protected expression.

## Inputs and dependencies

`VIDEO_KNOWLEDGE_MODEL.md`, research pipeline/style-analysis documents,
authorized source fixtures and `WO-DOC-001`. Live source use additionally
requires explicit source/legal authorization.

## Outputs and modified paths

Additive video-observation/inference/pattern schemas under
`contracts/schemas/editorial/**`; generated bindings; pure validation and
aggregation plus the first read-only built-in catalog port under
`packages/core/editorial-core/src/knowledge/video/**`; Project Host registration,
content-addressed snapshot persistence and current-baseline atomic write under
`packages/platform/project-host/**`, `packages/platform/project-storage/**` and
`database/project-format-v2.sql`; `tests/property/video-knowledge.test.ts`,
`tests/integration/video-knowledge-host.test.ts`,
`tests/integration/video-knowledge-storage.test.mjs`, docs and `package.json`.
Worker analyzer protocol is a separate Work Order. All other paths are forbidden.

## Runtime and failure contract

Automated analysis produces candidates, review separates observation from
inference, and only a validated publication path creates a Pattern version.
Missing rights, source/time identity, provenance, counterexamples or review
blocks publication. Revocation blocks new selection but preserves historical
pins. Failure cannot create Skill, Story, Edit Intent or Timeline state.

## Non-goals

Scraping, downloading/rehosting media, training, live trend retrieval, private
media upload, causality claims and editing execution.

## Acceptance and tests

Positive/negative Schema fixtures; exact RationalTime/source refs; deterministic
aggregation; conflicting evidence and counterexamples; immutable version pins;
rights/revocation/retirement; repository reopen/idempotency; architecture
boundary; run `pnpm run video-knowledge:test` (the three focused tests above),
`pnpm run contracts:check`, `pnpm run contracts:identity`,
`pnpm run contracts:clean`, `pnpm run typecheck`, `pnpm run architecture` and
`pnpm run docs:check`. Real-source acceptance
must retain legal/source evidence and never expose local media paths.

Completion Evidence: `EVD-<YYYYMMDD>-WO-RESEARCH-001-COMPLETE`, including source
rights, time-coded observation/inference fixtures, counterexamples, retirement,
project snapshot and reopen results.
