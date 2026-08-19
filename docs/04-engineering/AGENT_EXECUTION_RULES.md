# Agent Execution Rules

## Binding relationship

Root `AGENTS.md`, the machine-readable programme, generated current state, and
the active governed Work Order are binding. This file expands those rules; it
does not activate work or widen allowed paths.

## Before work

1. Classify repository lifecycle and task scope.
2. Read the mandatory authority chain and current active package.
3. Confirm Git root, branch, status, allowed/forbidden/generated paths, and user
   authorization.
4. Inspect existing equivalents before creating new abstractions or documents.
5. Start the governed package and maintain a self-contained ExecPlan.

## Construction rules

- Execute only the current Work Order and its dependency-ready vertical slice.
- Do not implement future packages early or widen scope to adjacent capability.
- Do not create empty interfaces, generic services, or speculative schemas.
- Do not bypass Project Host, Contracts, RationalTime, Edit IR, Timeline
  Command/Commit, RenderGraph, storage, or approval boundaries.
- Keep models, Skills, Renderer, Worker, and backends outside state authority.
- Reject unsupported behavior explicitly; never fake it with markers, stubs,
  empty success, or approximate output named as full capability.
- Preserve unrelated user changes and generated-code boundaries.
- Record consequential architecture changes in an ADR before claiming closure.

## Validation rules

Tests must prove the named user-visible and failure-closure boundary. Synthetic
tests do not prove real-media semantics; machine checks do not prove subjective
quality; a health check does not prove the user journey. Record exact commands,
environment, observed output, artifact identity, and remaining risk in Evidence.

## Documentation synchronization

Update product, architecture, plan, validation, progress, debt, and ADR sources
when their owned truth changes. Do not hand-edit generated current documents or
the generated document index. Documentation-only work uses an independent DOC
plan and Evidence and must not advance an unrelated implementation package.

## Completion

Completion requires the Work Order outcome, focused and repository gates,
negative/failure tests, persistence/reopen where relevant, real-media/human
review where required, current Evidence fingerprint, clean allowed-path audit,
and no unresolved blocking review. Commit, push, PR, merge, release, and deploy
are separate authorities; never infer one from another.
