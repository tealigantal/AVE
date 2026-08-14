# WO-PIPE-001 Intelligence-to-Timeline Integration

Status: candidate ready for governed promotion; not in the active programme. Proposed acceptance:
`ACC-PIPE-001` plus capability-specific real-media/human acceptance owned by
the promoted package.

## Goal and motivation

Adapt one approved semantic Edit Intent through the existing Project Host
Edit IR, resolver, Command/Commit and RenderGraph/QC path with complete
provenance and fail-closed behavior. This is the first point where approved
creative intelligence may become a Timeline change.

## Inputs and dependencies

Exact approved Creative Contract, Story Plan, Decision Record and Edit Intent
versions; current Timeline/media/capability snapshots; existing Contracts,
Edit IR, Timeline Core, RenderGraph, ExecutionPlan and QC. Depends on
`WO-INT-003` and executed Evidence for every required editing capability—not
merely schemas or tool availability.

## Outputs and modified paths

Host-owned semantic-intent adapter and provenance links under
`packages/platform/project-host/**`; pure mapping/validation under
`packages/core/edit-ir/**`; consume the semantic Edit Intent contract generated
by `WO-INT-003` without adding another intent schema;
atomic persistence under `packages/platform/project-storage/**` and
`database/migrations/**`; `tests/property/intelligence-edit-adapter.test.ts`,
`tests/integration/intelligence-pipeline-host.test.ts`,
`tests/integration/intelligence-pipeline-real.test.ts`, docs and `package.json`.
All other paths—including Timeline Core, RenderGraph and Worker—are forbidden
in this first adapter slice; unsupported capabilities block.

## Runtime and failure contract

```text
approved semantic Edit Intent
  -> Contract validation and exact-ref resolution
  -> preconditions/protected ranges/capability routing
  -> ordinary Timeline Commands and execution Edit IR
  -> in-memory simulation and validation
  -> one Project Host CommitPlan transaction
  -> same-semantic Preview/Master plans, render and QC
```

Stale base version, missing evidence/source, invalid target, protected ref,
unsupported semantic, compiler mismatch, Preview/Master divergence or storage
fault leaves Timeline, events and authoritative artifacts unchanged. Rebase
must re-resolve and require renewed approval when semantic effects change.

## Non-goals

Bypassing Project Host, direct model/Skill Commands, silent fallback, claiming
unsupported editing families, automatic delivery or an unconstrained agent.

## Acceptance and tests

- one approved intent compiles deterministically and commits atomically with
  exact story/decision/evidence provenance;
- undo/redo/reopen preserve both Timeline semantics and provenance;
- identical retry is idempotent and conflicting retry blocks;
- every failure above proves zero Timeline/event/artifact mutation;
- Preview/Master share target-neutral semantic identity and explicit resolver
  decisions; QC/blocker evidence is persisted;
- run `pnpm run intelligence-pipeline:test` (the three focused tests above),
  `pnpm run contracts:check`, `pnpm run contracts:compatibility`,
  `pnpm run contracts:clean`, `pnpm run typecheck`, `pnpm run architecture`
  and `pnpm run docs:check`, plus
  authorized real-media/human review required by the affected capabilities.

Passing synthetic mapping tests marks the adapter tested at most. User-facing
editing capability is accepted only by the corresponding real Evidence gates.

Completion Evidence: `EVD-<YYYYMMDD>-WO-PIPE-001-COMPLETE`, with intent/commit/
render provenance, blocked zero-mutation cases, idempotent retry, reopen and the
authorized real-media/human review artifacts required by used capabilities.
