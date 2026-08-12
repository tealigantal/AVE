# WP-FND-001 Foundation Authority, Recovery and Single Edit Path Hardening

## User-visible outcome

Moved or changed media, Worker failures, edits from any producer, failed migrations and interrupted project operations recover deterministically or fail with an explicit durable blocker. No path, Proxy, model, feature or Worker can become project authority.

## Capability ID

- CAP-FND-001

## Specifications and plan

- `docs/specifications/editing-execution-v1/FOUNDATION_AUTHORITY_RECOVERY.md`
- `docs/plans/2026-08-12-foundation-authority-recovery-hardening.md`
- ADR-0015 and ADR-0016

## Dependencies

- WP-VLOG-002
- WP-PRESET-002

## Allowed and forbidden paths

Allowed paths are the exact machine-readable list in `EXECUTION_MANIFEST.yaml`. Generated contracts change only through codegen. `docs/current/**` and `docs/DOCUMENT_INDEX.md` change only through `docs:sync`.

Forbidden paths are `apps/desktop/**` and `docs/archive/**`.

## Required behavior

- RationalTime and conversions are exact, explicitly rounded and ProxyMap never extrapolates across a gap or outside its range.
- Content identity, Original/Proxy locations, stream facts, relink and stale propagation are Host-validated and persisted.
- One persistent Worker supports multiple jobs; only declared-idempotent jobs automatically recover.
- Every edit producer reaches one typed Edit IR to CommitPlan Project Host use case.
- Migration, object, lock, job and Timeline recovery are transactional and fail closed.
- Preview/Master share semantics and Master resolves only a currently verified Original.

## Tests and acceptance

The focused lane is `pnpm run acceptance:foundation:synthetic`; the authorized external-media lane is `pnpm run acceptance:foundation:real`. Acceptance IDs are ACC-028 through ACC-033. All commands listed in the manifest are mandatory final gates.

## Evidence requirements

Create immutable Evidence containing the final code fingerprint, exact commands/results, migration and recovery facts, synthetic artifacts and the external manifest digest without local paths. If the real manifest is unavailable, create pending/blocker Evidence, keep ACC-033 blocked and do not run `docs:complete`.

## Failure conditions

- Time is silently truncated or ProxyMap extrapolates.
- A path/name becomes Asset identity, Proxy satisfies Original, or changed content remains fresh.
- A non-idempotent job restarts automatically or cancel leaves FFmpeg running.
- A Feature/Model/Preset commits Timeline outside the unified use case.
- A failed edit, migration or object publication leaves partial authority state.
- Master uses an unverified Original or falls back to Proxy.

## Definition of Done

ACC-028 through ACC-033 pass against the current fingerprint, all required repository checks pass, COMPLETE Evidence exists, governed completion succeeds, the one branch is committed and pushed, and one Draft PR is opened. Without authorized real media, all repository-verifiable work is delivered in the Draft PR but the package remains active with explicit external blocker state.
