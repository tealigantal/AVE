# DOC-001 Creative Intelligence Documentation Evolution

## Purpose / Big Picture

Extend AVE's existing product-intelligence blueprint with nine durable topic
views covering creative reasoning, video understanding, event causality,
creative memory, user profiles, skills, quality, agent permissions and staged
product evolution. A future engineer or Codex agent should be able to turn the
views into governed Work Orders without inventing a second Timeline, Edit IR,
project-state or execution model.

This task is documentation-only. It does not implement intelligence, change
programme capability status, complete `WP-ADV-002`, or claim that future-state
objects are current contracts.

## Progress

- [x] Classify the repository as an initialized important project and DOC-001
  as a strategic documentation task.
- [x] Read current product, architecture, programme, active-package, UX and
  product-intelligence authorities.
- [x] Identify the missing historical product-plan source and preserve current
  authorities rather than reconstructing it.
- [x] Add the nine required topic documents under `docs/product-intelligence/`.
- [x] Update the blueprint navigation and DOC work-order boundary.
- [x] Obtain independent consistency and architecture reviews.
- [x] Run documentation, link, whitespace and scope checks and record Evidence.

## Surprises & Discoveries

- The repository already contains a more detailed object model and runtime
  blueprint than the DOC-001 brief assumes. The new documents must therefore
  be extension views, not new protocol authorities.
- `ExecutionPlan` already names the immutable render execution authorization.
  Creative reasoning must use `Creative Action Plan` and hand off through the
  existing semantic Edit Intent path.
- The historical `AI Vlog Co-Editor 产品总计划与系统设计规范 v1.0` named by
  DOC-001 is not present. Its referenced concepts are represented by current
  product/architecture authorities and the retained v2.0 engineering blueprint.

## Decision Log

- Keep `docs/intelligence/OBJECT_MODEL.md` authoritative for future target
  object meanings; the nine documents define topic-specific rules and views.
- Treat Event Causal Graph as a derived, evidence-bound narrative relation
  view, never a replacement for Evidence Graph.
- Treat user, project and skill memory as governed data products registered by
  Project Host, never hidden model state or direct training authority.
- Keep Stage 1 current-state claims bounded to Evidence and generated status;
  later stages are target direction, not promised implementation dates.

## Outcomes & Retrospective

DOC-001 now has all nine required extension views with explicit canonical-doc,
future-state, ownership, approval, failure-closure and Work Order boundaries.
Two independent read-only reviews identified and verified closure of the only
semantic risks: `Creative Action Plan` is a non-persisted presentation grouping,
and Event causality preserves `EventV1` while targeting additive relation/
snapshot contracts with adapters. Documentation synchronization, governance,
architecture, link, whitespace and docs-only scope checks pass. No source,
tests, contracts, programme matrices/state, generated current documents or
capability status changed; `WP-ADV-002` remains unrelated and active.

## Context and Orientation

Current authority order is `PROJECT_GOAL.md`, `docs/product/`,
`docs/architecture/`, `docs/program/`, and generated `docs/current/`. The
product-intelligence blueprint lives at `docs/PRODUCT_INTELLIGENCE_BLUEPRINT.md`;
target objects and orchestration live under `docs/intelligence/`. Timeline
changes remain Project Host-only and use Edit Intent, Edit IR, ordinary
Timeline Commands, CommitPlan, RenderGraph and QC.

## Plan of Work

1. Define each required view with purpose, authority, current-versus-target
   status, inputs/outputs, failure rules, engineering mapping and Work Order
   implications.
2. Cross-link the views to canonical object/runtime/product/architecture docs.
3. Update the existing DOC work order and blueprint map without changing
   programme matrices or generated current state.
4. Validate structure, links, generated-doc drift, architecture governance,
   whitespace and docs-only scope; record immutable DOC Evidence.

## Concrete Steps

Run `pnpm docs:start -- WP-ADV-002` as the repository's idempotent governance
entry while leaving that package unrelated and active. After edits run
`pnpm run docs:sync -- --check`, `pnpm run docs:check`,
`pnpm run docs:architecture:test`, `git diff --check`, a relative Markdown
link scan and a path audit proving no non-document changes.

## Validation and Acceptance

All nine files must exist and answer their named question with actionable
contracts and failure boundaries. Cross-document flow must remain:

```text
Creative Contract -> Evidence Graph / Material Evidence Pack
-> Story Plan / Decision Records -> semantic Edit Intent -> Edit IR
-> Timeline Command / CommitPlan -> RenderGraph -> QC -> human review
```

The work passes only if no document claims implementation, no second execution
or project-state model is introduced, and future Work Orders can identify
inputs, outputs, ownership, approvals, failure closure and Evidence needs.

## Idempotence and Recovery

All changes are additive or focused documentation edits. Re-running document
synchronization must be clean. A failed check is repaired within `docs/**`;
programme state and generated current documents are not hand-edited. Rollback
is deletion of the new uncommitted topic views plus reversal of their focused
navigation/work-order links.

## Artifacts and Notes

Primary artifacts are the nine files under `docs/product-intelligence/`, this
ExecPlan and one `EVD-20260818-DOC-001-*` evidence record.

## Interfaces and Dependencies

Project Host remains orchestration and persistence authority. Contracts remain
the cross-language protocol authority; Model Gateway and Worker only produce
candidates; Timeline Core and RenderGraph remain execution authorities. No
source, test, schema, migration, dependency, provider or network change is in
scope.
