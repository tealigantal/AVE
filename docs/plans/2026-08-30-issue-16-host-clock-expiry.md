# ExecPlan: Issue #16 Project Host clock expiry

## Objective

Make the injected Project Host clock the sole business authority for Material Evidence Pack expiry, with a deterministic boundary and no partial persistence on rejected assembly.

## Progress

- [x] Rebuild current baseline and create the dedicated Issue #16 branch.
- [x] Locate mixed wall-clock and injected-clock expiry checks.
- [x] Register/start WP-CA-STAB-001 and record the failing regression.
- [x] Implement one Host-clock predicate and cover creation, reads, workspace and reopen.
- [x] Validate and record local Evidence.
- [ ] Complete the package, publish, merge and clean the branch.

## Validation and recovery

All changes remain in the Work Package allowlist. The regression uses an injected deterministic clock; it does not depend on machine time or real media. If a check fails, retain the failure evidence, repair only the owned Host/test scope and re-run it. No failed expiry attempt may leave a Material Evidence Pack write.

## Discoveries

- `assembleMaterialEvidencePackInternal` validates `expires_at` with `Date.now()`.
- `materialEvidencePackView` currently evaluates the same expiry twice: once with `Date.now()` and again with `this.now()`.

## Decision log

- Use the existing `ProjectHostOptions.now` injection, not a new clock abstraction or storage/schema change.

## Outcome and retrospective

Pending.
