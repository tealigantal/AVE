# Agent Execution Rules

## Binding relationship

Root `AGENTS.md`, the machine-readable programme, generated current state, and
the active governed Work Order are binding. This file expands those rules; it
does not activate work or widen allowed paths.

## Before work

1. Classify repository lifecycle and task scope.
2. Read the mandatory authority chain and current active package.
3. Confirm Git root, branch, status, allowed/forbidden/generated paths, and user
   task authorization; do not request it again for already assigned work.
4. Inspect existing equivalents before creating new abstractions or documents.
5. Start the governed package and maintain a self-contained ExecPlan.

## Construction rules

- Execute only the current Work Order and its dependency-ready vertical slice.
- Do not implement future packages early or widen scope to adjacent capability.
- Do not create empty interfaces, generic services, or speculative schemas.
- Do not bypass Project Host, Contracts, RationalTime, `CommandEditIR`, Timeline
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

### Current design and historical evidence gates

Validation follows the current approved design and deployment target. A retired
entry or superseded UI requirement must not drive product rollback. Historical
source fingerprints are not claims of current acceptance, and writable paths
are not proof that every historical full-suite command applies to a bounded change.

`docs:check` validates documentation consistency. A stale historical capability
scope may remain explicitly **unverified** when an active
`historical-evidence-applicability` debt records that exact current scope hash,
the affected capabilities, an exit condition and a blocked classification
Evidence record. It emits an unverified warning, not an acceptance result.
Missing records, unreviewed new scope changes and current interface/generated
drift still fail. Do not rewrite historical Evidence or its applicability index
to use this path.

`pnpm run docs:check -- --strict-evidence` retains the strict global applicability
gate for a claim that historical capabilities have been revalidated against
current source. Work-package completion rejects unresolved applicability debt
for its own capabilities and still requires current source-bound Evidence and
the current interaction acceptance policy. Stage Exit and Release require their
applicable strict evidence; development document consistency does not grant
either. Existing Stage2 real-media/duration debt and P4 Browser interaction
requirements remain independent.

## Documentation synchronization

Update product, architecture, plan, validation, progress, debt, and ADR sources
when their owned truth changes. Do not hand-edit generated current documents or
the generated document index. Documentation-only work uses an independent DOC
plan and Evidence and must not advance an unrelated implementation package.

## Completion

Completion requires the Work Order outcome, focused and repository gates,
negative/failure tests, persistence/reopen where relevant, actual automated
interaction/media verification, current Evidence fingerprint, a scoped path audit,
and no unresolved blocking defects. P4/P5 do not require human review, aesthetic
sign-off or repeated authorization. Optional feedback is recorded truthfully. Commit, push, PR, merge, release, and deploy
are separate authorities; never infer one from another.
