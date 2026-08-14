# WO-TREND-001 Trend Knowledge and Retrieval

Status: candidate ready for governed promotion; not in the active programme. Proposed acceptance:
`ACC-TREND-001`.

## Goal and motivation

Normalize time-qualified Trend Signals into reviewed Trend Patterns and create
an expiring, compatible Trend Pack for one Creative Contract/Evidence snapshot.

## Inputs and dependencies

`TREND_KNOWLEDGE_MODEL.md`, exact source-policy fixtures, approved Creative
Contract/Material Evidence Pack and `WO-RESEARCH-001`. Live connectors require
separate provider, legal, privacy and cost approval.

## Outputs and modified paths

`trend-signal.v1`, `trend-pattern.v1` and `trend-pack.v1` schemas under
`contracts/schemas/editorial/**`; generated bindings; pure freshness,
aggregation, compatibility and built-in catalog port under
`packages/core/editorial-core/src/knowledge/trend/**`;
`packages/features/trend-retrieval/**`; Project Host registration and
content-addressed project snapshot persistence/migration under
`packages/platform/project-host/**`, `packages/platform/project-storage/**` and
`database/migrations/**`; `tests/property/trend-knowledge.test.ts`,
`tests/integration/trend-retrieval-host.test.ts`,
`tests/integration/trend-retrieval-storage.test.mjs`, docs and `package.json`.
All other paths are forbidden.

## Runtime and failure contract

Project Host supplies a bounded query and catalog snapshot. Retrieval rejects
unlicensed/expired/incomparable inputs, preserves conflicting Signals and pins
exact Pattern versions. Provider outage returns `trend_unavailable`; planning
continues without advice unless the approved contract requires it. No Trend
object creates Edit Intent or Timeline mutation.

## Non-goals

Scraping, paid provider purchase, background refresh, private-media upload,
causal popularity claims, automatic style change and editing execution.

## Acceptance and tests

Timestamp/expiry and clock-boundary cases; metric incompatibility; rights and
authenticity risk; contradictory Signals; exact version/digest pins; empty-pack
degradation; stale-pack rejection; deterministic/idempotent retrieval;
persistence/reopen; run `pnpm run trend-retrieval:test` (the three focused
tests above), `pnpm run contracts:check`, `pnpm run contracts:compatibility`,
`pnpm run contracts:clean`, `pnpm run typecheck`, `pnpm run architecture` and
`pnpm run docs:check`.

Completion Evidence: `EVD-<YYYYMMDD>-WO-TREND-001-COMPLETE`, including timestamp
and expiry boundaries, contradictory Signals, empty/unavailable degradation,
project snapshot and reopen results.
