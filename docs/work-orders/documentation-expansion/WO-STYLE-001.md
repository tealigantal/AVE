# WO-STYLE-001 Style Profile and Retrieval

Status: candidate ready for governed promotion; not in the active programme. Proposed acceptance:
`ACC-STYLE-001`.

## Goal and motivation

Extract/retrieve an immutable Style Profile and a project-bound compatibility
report that adapts principles to creator identity and available material
without copying reference expression.

## Inputs and dependencies

`STYLE_KNOWLEDGE_MODEL.md`, exact reviewed VideoPattern refs, approved Creative
Contract and Material Evidence Pack. Depends on `WO-RESEARCH-001` and the
existing Project Host/Contract boundaries.

## Outputs and modified paths

`style-profile.v1` and `style-compatibility-report.v1` schemas under
`contracts/schemas/editorial/**`; generated bindings; pure dimension,
compatibility and built-in catalog port under
`packages/core/editorial-core/src/knowledge/style/**`; a bounded
`packages/features/style-retrieval/**` feature; Project Host registration and
content-addressed project snapshot persistence/migration under
`packages/platform/project-host/**`, `packages/platform/project-storage/**` and
`database/migrations/**`; `tests/property/style-knowledge.test.ts`,
`tests/integration/style-retrieval-host.test.ts`,
`tests/integration/style-retrieval-storage.test.mjs`, docs and `package.json`.
All other paths are forbidden.

## Runtime and failure contract

Project Host supplies exact contract/evidence/catalog refs. Retrieval filters
rights/status/version, then returns per-dimension compatible, adaptable,
conflicting or unknown outcomes with reasons. Missing rights/source identity,
creator-identity conflict or prohibited copying rejects the dimension/profile.
Unavailable retrieval degrades to planning without Style; no Timeline changes.

## Non-goals

Reference acquisition, copyrighted shot/music replication, backend filters,
RenderGraph nodes, Timeline Commands and automatic creator-identity changes.

## Acceptance and tests

Cover all six required dimensions; exact profile/version pins; conflicting
references; unknown dimensions; rights failure; creator-identity protection;
evidence-bound adaptations; deterministic retrieval; persistence/reopen and
idempotency; run `pnpm run style-retrieval:test` (the three focused tests
above), `pnpm run contracts:check`, `pnpm run contracts:compatibility`,
`pnpm run contracts:clean`, `pnpm run typecheck`, `pnpm run architecture` and
`pnpm run docs:check`. Media
extraction accuracy or human style usefulness requires a later real-reference
and human-review Evidence gate.

Completion Evidence: `EVD-<YYYYMMDD>-WO-STYLE-001-COMPLETE`, including exact
profile pins, dimension compatibility/conflicts, rights failures, creator-
identity protection, project snapshot and reopen results.
