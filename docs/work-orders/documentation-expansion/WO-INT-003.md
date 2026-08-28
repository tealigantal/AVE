# WO-INT-003 Story Planner and Semantic Edit Intent

Status: promoted and active as `WP-CA-INT-003`. Governed acceptances:
`ACC-CA-INT-003-STORY` and `ACC-CA-INT-003-INTENT`.

## Goal and motivation

Produce comparable evidence-bound Story Plan candidates, approve one exact
version, record decisions and generate a semantic Edit Intent that has no
Timeline authority. This removes ambiguity between a creative plan and the
existing command-bearing execution intent.

## Inputs and dependencies

Approved Creative Contract and Material Evidence Pack; Skill Evaluations;
optional exact Style/Trend refs; Duration Blueprint; current Timeline and
capability snapshot. Depends on `WO-INT-001`, `WO-INT-002`, current editorial
v1 contracts and existing Project Host evidence/story boundaries.

## Outputs and modified paths

- additive `direction-card.v1`, `story-proposal.v2`,
  `approved-story-plan.v2`, `decision-record.v1` and
  `editorial-edit-intent.v1` schemas under
  `contracts/schemas/editorial/**`, with generated bindings;
- pure plan/evaluation/intent rules in `packages/core/editorial-core/**`;
- `packages/features/story-planning/**` and
  `packages/features/edit-intent-generation/**`;
- Project Host approval/registration plus Project Storage additive persistence
  and current-baseline storage under their existing paths;
- `tests/property/story-intelligence.test.ts`,
  `tests/integration/story-intelligence-host.test.ts` and
  `tests/integration/story-intelligence-storage.test.mjs`, docs and
  `package.json`. All other paths are forbidden.

## Runtime and failure contract

Project Host assembles exact refs, Model Gateway may propose contract-validated
Direction Cards and Story candidates, deterministic rules enforce coverage/
constraints, and user approval pins one Direction then one Story digest.
`StoryProposalV2` is candidate wire state; `ApprovedStoryPlanV2` references and
freezes its approved payload. Intent generation emits registered semantic
operations only. Unknown evidence, insufficient hard coverage, stale approval,
base-version conflict, protected refs or unsupported semantics returns a
candidate blocker and leaves Timeline/events/commands unchanged.

## Non-goals

Direct Command/Commit, autonomous approval, Style/Trend ingestion, full recut
after local feedback, or claiming unsupported execution.

## Acceptance and tests

- generate at least two reproducible candidates with alternatives and complete
  beat evidence; hard requirements and missing evidence fail closed;
- approval/rejection is exact-version, persisted and recoverable;
- every Decision Record retains evidence, reason, confidence and alternatives;
- semantic Edit Intent uses RationalTime, protected refs and current base
  version, contains no Commands/backend strings, and stale re-resolution cannot
  bypass renewed approval;
- schema current-identity rejection, deterministic ranking, Project Host
  integration, persistence/reopen, idempotency and zero-Timeline-mutation tests;
- run `pnpm run story-intelligence:test` (the three focused tests above) plus
  `pnpm run contracts:check`, `pnpm run contracts:identity`,
  `pnpm run contracts:clean`, `pnpm run typecheck`, `pnpm run architecture`
  and `pnpm run docs:check`.

This package can test semantic intent readiness; executable editing remains
owned by `WO-PIPE-001` and its real capability/Evidence gates.

Completion Evidence: `EVD-<YYYYMMDD>-WO-INT-003-COMPLETE`, including comparable
Direction/Story candidates, exact approvals, invalid model fixtures, stale
intent rejection, persistence and zero Timeline mutation.
