# ADR-0026: Development Integration, Stage Exit, and Release Gates

## Context

`main` is AVE's continuing development-integration branch, while release has a separate workflow. Stage 2 still requires authorized real media, complete duration, and direct human acceptance; making those external inputs a precondition for every development merge prevents a bounded PR from closing. That separation must not weaken CI, security, Project Host authority, or data integrity.

## Decision

Development Integration permits an open, non-draft PR into `main` only from its exact final head SHA after required check/security jobs pass, no conflict or P0 authority/data/safety defect remains, current contracts/generated bindings/code and authority documents agree, and every AVE-owned contract family has one current major. Capability, Acceptance, and Debt must remain truthful: tested is not accepted. Bounded P1/P2 work must be independently recorded.

Stage Exit is the claim that Stage 2 is complete. It still requires WP-CA-REAL-001, complete authorized real-media Pipeline and Electron journeys, scoped feedback, Preview/Master/QC, reopen/recovery, direct human acceptance, closed applicable Stage Debt, and Evidence matching the exact source fingerprint.

Release Gate requires the applicable Stage Exit, successful release/security workflows, and matching release identity and notes. A development baseline is never described as accepted or released.

## Consequences

`main` may receive verified development work without private media availability; the missing real-media/direct-human Stage Exit remains explicit. Auto-merge is allowed only at the final verified SHA. Required CI/security failure, dual current-version runtime paths, Host/SQLite authority bypass, destructive project format behavior, build failure, or an applicable P0/security change request are integration blockers.

## Rollback and supersession

Rollback reverts this governance change as a whole; it does not restore an old interface or hidden compatibility reader. This ADR changes merge-gate meaning only: ADR-0025's one-current-version rule and WP-CA-REAL-001 requirements stay in force.
