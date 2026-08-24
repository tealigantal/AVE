# WO-INT-000 Creative Contract and Material Evidence Pack

Status: promoted as active dependency package `WP-CA-INT-000` after
`WP-CA-GOV-001`. Governed acceptances are `ACC-CA-INT-000-CONTRACT` and
`ACC-CA-INT-000-EVIDENCE`; the promoted Work Package and machine-readable
matrices are authoritative for implementation state.

## Goal and motivation

Add versioned rich Creative Contract and Material Evidence Pack contracts plus
Project Host adapters/persistence so every later intelligence run has one
approved goal and one reproducible sufficiency snapshot. Existing v1 records
remain readable and unchanged.

## Inputs and dependencies

`OBJECT_MODEL.md`, current `creative-contract.v1`, Observation,
Interpretation, Moment, Event, MaterialSufficiency and CoverageMatrix contracts,
Project Host evidence APIs and `WO-DOC-001`.

## Outputs and allowed paths

- `contracts/schemas/editorial/creative-contract.v2.schema.json` and
  `material-evidence-pack.v1.schema.json`;
- generated bindings through `tools/contract-codegen/**` and Contract Runtime;
- pure adapters/sufficiency validation in `packages/core/editorial-core/**`;
- approval, pack assembly and registration in
  `packages/platform/project-host/**`;
- content-addressed object plus additive SQLite refs/migration in
  `packages/platform/project-storage/**` and `database/migrations/**`;
- `tests/property/creative-context.test.ts`,
  `tests/integration/creative-context-host.test.ts`,
  `tests/integration/creative-context-storage.test.mjs`, docs and `package.json`.

All other paths are forbidden. Generated contracts are changed only by their
generator.

## Runtime and failure contract

Project Host upgrades a v1 Contract into an explicit v2 draft, validates user
approval and stores the immutable version. It assembles an Evidence Pack only
from persisted approved Evidence and current media identity/availability.
Unknown refs, hard coverage gaps, conflicts, stale media facts or digest/version
rebinding blocks approval/assembly. Failure leaves approved objects and
Timeline unchanged; an insufficient pack may be persisted only with explicit
blocked status and diagnostics.

## Non-goals

New analysis models, Skill/Style/Trend retrieval, Story generation, Edit Intent,
Timeline mutation, media upload and automatic approval.

## Acceptance and exact tests

- v1 read plus explicit v1-to-v2 draft adapter; no in-place history rewrite;
- approve/reject/supersede exact Contract versions with actor/time;
- assemble deterministic packs with exact RationalTime/evidence/media refs;
- missing/conflicting/stale evidence blocks downstream approval;
- identical retry is idempotent; reopen preserves refs/digests/status;
- run `pnpm run creative-context:test` (the three focused tests above),
  `pnpm run contracts:check`, `pnpm run contracts:compatibility`,
  `pnpm run contracts:clean`, `pnpm run typecheck`, `pnpm run architecture`
  and `pnpm run docs:check`.

Completion Evidence: `EVD-<YYYYMMDD>-WO-INT-000-COMPLETE`, including v1/v2
fixtures, approval actor/digest, blocked zero-mutation cases and reopen output.
