---
evidence_id: EVD-20260907-WP-CA-STAB-005-REVIEW-PRECHECK
date: 2026-09-07
work_package_id: WP-CA-STAB-005
repository_commit: codex/issue-14-feedback-target-eligibility
code_fingerprint: 897ca1d5cd1c536b107c7b411d1ef6b054340313445b3560dfc00a23ea4d0e2a
capability_ids: [CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001]
acceptance_ids: [ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001]
result: passed
---

# Issue 14 corrected-source local validation

Authority: executed repository Evidence, linked from the STAB-005 ExecPlan. This fresh record is required because the earlier completion record lacks its declared full gates and the reviewed source had two reproducible behavior gaps. It does not rewrite historical Evidence.

Branch: `codex/issue-14-feedback-target-eligibility`; PR: [22](https://github.com/tealigantal/AVE/pull/22). Environment: Windows, Node 22.16.0, pnpm 11.19.0, repository-managed synthetic fixtures.

## Reproduction and corrections

The new workspace regression failed before correction: ordinary material choices contained only `ordinary`, omitting `speed`, `map`, `duration` and `timebase`. After correction it retains all five and independently reports the four compiler rejection reasons for feedback. Workspace projection is deterministic and survives reopen.

Both workspace and pre-write Host now use the same bounded pure lineage traversal. Missing ancestors and cycles expose no feedback choices, change the workspace digest and reject generation with `FEEDBACK_BASE_EXECUTION_LINEAGE_INVALID`. Snapshot comparisons prove zero Diagnosis, Intent, permission, Timeline, command, event and Render writes during rejection. Restoring the original execution restores eligibility and digest. Pure tests prove a 64-node chain succeeds and a 65-node chain discards all partially collected targets.

## Executed gates

All commands below completed with exit code 0 on this source fingerprint:

- `node --expose-gc --import tsx tests/integration/stage2-product-workspace.test.ts`
- `pnpm run intelligence-pipeline:test`
- `pnpm run edit-ir:test`
- `pnpm run typecheck`
- `pnpm run docs:sync`
- `node scripts/docs/migrate-evidence-scope-index.mjs` (applicability bookkeeping only, not acceptance)
- `pnpm install --frozen-lockfile`
- `pnpm run check`, including docs sync/check, docs architecture/fingerprint, Stage 2 aggregate, architecture, contract identity/roundtrip, desktop runtime, storage, Worker and media correctness gates
- `pnpm run acceptance:final:synthetic` — `final acceptance synthetic slice passed; real media was not claimed`
- `git diff --check`

## Remaining gates

STAB-005 remains active until remote validation of this corrected source is recorded. The earlier successful CI run 33310556332 belongs to commit 639e73b and is not proof of this revision. Fresh real-media/direct-human acceptance and Stage Exit remain pending under DEBT-CA-STAGE2-003. Release: NOT CLAIMED.
