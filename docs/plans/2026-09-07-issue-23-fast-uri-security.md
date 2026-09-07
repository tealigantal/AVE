# Issue #23 security repair ExecPlan

## Goal

Restore mandatory dependency security without weakening current contracts or widening product scope. See the registered WP-CA-SEC-001 for paths and gates.

## Progress

- 2026-09-07: User authorized repair. Created branch from latest origin/main; parked clean PR #22 branch. Remote audit reports four high fast-uri advisories, patched in 3.1.6. No parallel writers.

## Decisions

Use a dedicated security package and PR before resuming #14; preserve the existing current-major override. No architecture change is intended, so no new ADR is required.

## Validation and recovery

Run failing audit, regenerate lock, frozen install, patched audit, contract gates, full check and synthetic acceptance. Preserve exact exit codes. Recover from this branch and programme state; never reset or force push.

## Outcomes

Local implementation and all required local gates passed; see [Evidence](../evidence/runs/EVD-20260907-WP-CA-SEC-001-COMPLETE.md). Full check and final synthetic acceptance exited 0. Exact-head remote integration and cleanup remain pending. Stage Exit and Release are not claimed.

- Review correction: clarified local package completion versus subsequent remote integration; see [gate clarification](../evidence/runs/EVD-20260907-WP-CA-SEC-001-GATE-CLARIFICATION.md). Remote check/security passed the first head; the documentation correction requires a fresh exact-head remote run.
