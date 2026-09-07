---
evidence_id: EVD-20260907-WP-CA-SEC-001-COMPLETE
date: 2026-09-07
work_package_id: WP-CA-SEC-001
repository_commit: codex/issue-23-fast-uri-security
code_fingerprint: 72ceb01ac346631953198ea5bba0c4bdb71f2a44af2096c3f5d421788e02c67f
scope_fingerprint: 2fbf8927c78f76d4e9cbed534b01b54693a4462df35cfaff94e4c3bdd48ababc
capability_ids: [CAP-CA-SEC-001]
acceptance_ids: [ACC-CA-SEC-001]
result: passed
---

# Issue 23 patched dependency validation

Authority: executed security repair Evidence, owned by WP-CA-SEC-001 and linked from its ExecPlan. This records new execution, not legacy applicability migration.

## Reproduction

On origin/main baseline a1176e7e2ed502519fd394a6716674862fd9c080, `pnpm audit --audit-level high` exited 1 with four high fast-uri advisories (GHSA-5jgf-p345-68v8, GHSA-f65p-4m7j-42xc, GHSA-fph4-wmhf-6fwf, GHSA-jqff-g426-hqxp). The existing override selected 3.1.5. AVE exploitability was not established.

## Repair and executed validation

Only the existing override changed to 3.1.6; pnpm regenerated the dependency lockfile. No contract or runtime-generated validator bytes changed. No CI/security check was weakened.

The following completed with exit 0 on Windows using pnpm 11.19.0:

- `pnpm install --lockfile-only`
- `pnpm install --frozen-lockfile`
- `pnpm audit --audit-level high`: No known vulnerabilities found.
- `pnpm run contracts:generate`
- `pnpm run contracts:check`: 61 schemas, 61 valid and 61 invalid examples.
- `pnpm run contracts:identity`: filename/id/version identity and 61 cross-language roundtrips passed.
- `pnpm run contracts:clean`: all generated contracts and runtime validators clean.
- `pnpm run docs:sync` and `pnpm run docs:check`
- `pnpm run check`: full repository gate, including Stage 2, authority/zero-write, reopen/recovery, Worker and encoded media tests.
- `pnpm run acceptance:final:synthetic`: final acceptance synthetic slice passed; real media was not claimed.

## Boundaries

Current Contracts, Host/SQLite ownership, RationalTime and media behavior are unchanged. Existing negative contract examples and full failure/recovery tests remain enforced. PR #22 is parked for separate regression repair and integration. Remote exact-head checks are still required before this branch merges. Fresh real-media and direct-human acceptance remain pending. Stage Exit: NOT CLAIMED. Release: NOT CLAIMED.
