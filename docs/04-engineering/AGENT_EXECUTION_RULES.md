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
5. Reuse the relevant package and maintain its execution record; governance tooling is not a prerequisite to authorized implementation or testing.

## Construction rules

- Execute the user-authorized scope, reusing the current Work Order when applicable. Keep unrelated work outside scope.
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

`docs:check` validates documentation consistency and reports stale historical
capability evidence as **unverified**, even when its exact changed scope has not
yet been classified. Duplicate current interfaces, missing records, broken current references and generated drift fail. Do not rewrite historical Evidence or claim that warnings establish
current acceptance. The strict mode below continues to reject these unresolved
versions and stale evidence.

`pnpm run docs:check -- --strict-evidence` retains the strict global applicability
check for a claim that historical capabilities have been revalidated against
current source. Record unresolved applicability debt and current evidence
honestly; neither this check nor programme state blocks independent authorized
implementation or the user's requested real-media test. Development document
consistency alone does not establish Stage Exit or Release. Completing a work
package still requires its own evidence, capability and acceptance bindings and
the current code fingerprint; an unrelated historical applicability debt is not
an additional completion veto. Existing Stage2 real-media/duration debt and P4 Browser interaction
requirements remain independent.

## Documentation synchronization

Update product, architecture, plan, validation, progress, debt, and ADR sources
when their owned truth changes. Do not hand-edit generated current documents or
the generated document index. Documentation-only work uses an independent DOC
plan and Evidence and must not advance an unrelated implementation package.

## Completion

Completion requires the requested outcome, focused verification and applicable repository checks,
negative/failure tests, persistence/reopen where relevant, actual automated
interaction/media verification, current Evidence fingerprint, a scoped path audit,
and no unresolved defects that prevent the requested outcome. Unrelated historical documentation failures must be recorded, not used to halt authorized work or misreported as passed. P4/P5 do not require human review, aesthetic
sign-off or repeated authorization. Optional feedback is recorded truthfully. Commit, push, PR, merge, release, and deploy
are separate authorities; never infer one from another.
