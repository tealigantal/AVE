# AVE Documentation Architecture Refactor

This ExecPlan is the living record for the documentation-only `DOC-002` task.
It does not change application behavior, contracts, programme capability status,
acceptance status, or the active engineering package `WP-ADV-002`.

## Purpose / Big Picture

Reorganize AVE's durable knowledge into a nine-domain, AI-native documentation
architecture that lets a future Coding Agent locate product intent, creative
intelligence, stable engineering boundaries, evaluation, security, work-order
rules, and architectural decisions without mistaking future design for current
implementation.

The user explicitly authorizes Markdown and documentation changes only. The
task may create or update `README.md`, `ARCHITECTURE.md`, `AGENTS.md`, and
`docs/**`; it must not change source, tests, contracts, database assets,
scripts, package/configuration files, generated current documents, or the
machine-readable editing programme.

## Progress

- [x] Classify AVE as an already initialized important project and DOC-002 as a
  strategic, cross-document, documentation-only task.
- [x] Confirm a clean worktree on `codex/product-intelligence-docs` at
  `b72fc84` and read the mandatory AVE authority chain.
- [x] Start the existing governance entry with
  `pnpm docs:start -- WP-ADV-002` without attributing DOC-002 to that package.
- [x] Complete the all-Markdown inventory, overlap analysis, conflict review,
  and migration map.
- [x] Create the `docs/00-vision/` through `docs/08-decisions/` durable views.
- [x] Reconcile root navigation and Coding Agent rules.
- [x] Record audit findings, open issues, validation evidence, and final report.
- [x] Run documentation, architecture, link, formatting, and scope gates.

## Surprises & Discoveries

- The requested target topics substantially overlap the product-intelligence
  blueprint and DOC-001 documents already present on this branch. New files
  must be canonical domain views or explicit maps, not parallel protocol
  definitions.
- Existing tooling hard-codes `docs/product/`, `docs/architecture/`,
  `docs/program/`, `docs/current/`, and generated `docs/DOCUMENT_INDEX.md`.
  Because scripts and programme/configuration files are forbidden, physical
  relocation of those authorities would break governance. The numbered layer
  must therefore coexist as the long-term navigation and policy layer while
  linking to retained execution authorities.
- `WP-ADV-002` is still active and ten editing capability families remain
  blocked. Documentation must not imply that creative-intelligence design or
  reorganized files implement those capabilities.
- Independent review found that the first draft incorrectly described one
  target-neutral RenderGraph and treated future semantic Edit Intent as the
  current Host input. Source inspection established the actual pair of
  target-specific Preview/Master RenderGraphs sharing one semantic payload/hash
  and the current `CommandEditIntent` → `CommandEditIR` path; all affected
  documents and Evidence were corrected before completion.

## Decision Log

- 2026-08-19: Treat the user's explicit DOC-002 file scope as the authority for
  root documentation edits; retain the programme package and generated-current
  state unchanged.
- 2026-08-19: Use a non-destructive overlay migration. The numbered hierarchy
  owns long-term domain intent and navigation; current product, architecture,
  programme, specification, Evidence, generated state, and archive locations
  keep their existing responsibilities.
- 2026-08-19: Do not move or rewrite `docs/archive/**`. It is historical context
  and is forbidden by the active programme package.
- 2026-08-19: Treat source and accepted runtime behavior as higher evidence than
  a tidy conceptual phrase. Preserve two RenderGraph instances and separate the
  future semantic-intent adapter from the current command-bearing input.

## Outcomes & Retrospective

Delivered all nine numbered domains, the requested named documents, root
navigation/architecture/agent-rule reconciliation, a canonical terminology
registry, final audit report, open-issue registry, and independent DOC Evidence.
The non-destructive overlay preserved hard-coded programme authorities and all
generated/current files. Documentation, architecture, link, duplicate,
required-artifact, terminology, and docs-only scope checks pass.

The most valuable review correction was rejecting an elegant but false “single
RenderGraph” abstraction and a premature semantic Edit Intent claim. The final
documents now reflect current source: Preview/Master have separate target-
specific RenderGraph instances with one shared semantic payload/hash, and
command-free semantic intent remains a future Host-adapter input.

## Context and Orientation

Durable product goal is `PROJECT_GOAL.md`. Current product scope and stable
runtime architecture remain in `docs/product/` and `docs/architecture/`.
Machine-readable scope and completion live in `docs/program/`; generated status
lives in `docs/current/`; executed facts live in `docs/evidence/`. The future
creative-intelligence blueprint currently spans
`docs/PRODUCT_INTELLIGENCE_BLUEPRINT.md`, `docs/intelligence/`,
`docs/product-intelligence/`, `docs/pipeline/`, `docs/ux/`, and draft
documentation-expansion work orders.

## Plan of Work

1. Inventory every tracked Markdown file and classify it by current role,
   authority, lifecycle, and target domain. Identify duplicate terminology,
   ambiguous authority, stale root aliases, and missing policy coverage.
2. Create the nine numbered domains with one README each. Add the requested
   durable documents as concise, repository-specific contracts that link to
   detailed retained authorities instead of copying them.
3. Define a canonical terminology registry, document authority map, work-order
   template, ADR trigger policy, evaluation model, privacy model, and agent
   execution rules.
4. Update root entry documents so README is orientation, ARCHITECTURE is stable
   architecture, and AGENTS is agent behavior plus mandatory authority order.
5. Write the final report with before/after state, added/modified files,
   migration relationships, architectural gains, Codex impact, and unresolved
   issues.

## Concrete Steps

Use `rg --files -g '*.md'` for the inventory and `rg` term scans for canonical
concepts. Apply only Markdown patches. After edits, run:

    pnpm run docs:sync -- --check
    pnpm run docs:check
    pnpm run docs:architecture:test
    git diff --check

Also run a repository-relative Markdown-link check, scan for non-document
changes, and inspect the rendered table of contents and final diff.

## Validation and Acceptance

The numbered directories and every requested named document must exist. The
documents must answer the six target questions, preserve one definition for
Project Host, Evidence Graph, Edit IR, Timeline, RenderGraph, Creator Model,
and Creative Skill, and clearly label current, specified, accepted, blocked,
and future states. No generated current document or programme matrix may drift.

Acceptance also requires that the final diff contains only permitted Markdown
paths, all relative links resolve, root entry documents have one responsibility
each, and the final report records non-migrated compatibility locations.

## Idempotence and Recovery

The refactor is additive plus focused edits to existing Markdown. Re-running
checks must not change files. If the new hierarchy is rejected, its files and
focused root links can be removed without touching runtime state. Existing
authority paths remain available throughout the change, so rollback does not
require code, schema, database, or programme migration.

## Artifacts and Notes

Primary artifacts are the numbered domain documents,
`docs/FINAL_DOC_REFACTOR_REPORT.md`,
`docs/decisions/OPEN_ISSUES.md`, this ExecPlan, and one independent DOC
Evidence record under `docs/evidence/runs/`.

## Interfaces and Dependencies

This task consumes existing documentation and repository structure only. It
introduces no process, database, protocol, agent runtime, model provider,
dependency, credential, deployment, or external side effect. Any future work
that promotes a target object to a contract or persistence format must use a
new governed work package and, where triggered, an ADR.
