---
evidence_id: EVD-20260907-WP-CA-STAB-005-FINAL
date: 2026-09-07
work_package_id: WP-CA-STAB-005
repository_commit: codex/issue-14-feedback-target-eligibility
code_fingerprint: 285c7e29005dd63959254e09715398902e2196f0792ff9532bb61dc2878148a2
capability_ids: [CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001]
acceptance_ids: [ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001]
result: passed
---

# Issue 14 final corrected-source local evidence

This immutable record supersedes incomplete historical completion claims without rewriting them. Branch: codex/issue-14-feedback-target-eligibility; PR #22. Security prerequisite PR #24 was merged, then integrated by a normal merge from origin/main.

## Scope fingerprints

- CAP-CA-FEEDBACK-001 scope_fingerprint: 57e58161b7920171dab5922c521d69178a53a4ac6230f5d77f5d9486f0733100
- CAP-CA-PRODUCT-002 scope_fingerprint: e54068934ac915f0dcebe489d6322386b1673f1785520f5f30ee217e005b8141
- CAP-CA-UX-001 scope_fingerprint: f14f4113a274e8e4c8bfc8fc74cce1c484d26ffdc65737d9ca960760b88b47fc

## Reproduction and outcome

The earlier [review precheck](EVD-20260907-WP-CA-STAB-005-REVIEW-PRECHECK.md) records ordinary material targets being incorrectly removed and partial invalid lineages being advertised. The shared compiler/Host support predicate and separate material/feedback projections fix those cases; missing, cyclic and over-limit lineages fail closed before Diagnosis, Intent, approval, Timeline or Render writes.

Linux runs additionally exposed an intermittent immutable recovery fixture failure (`stale` versus `sufficient`, line 437). The fixture normalized only the input Original, while Host copying created a new timestamp. A new deterministic precondition failed locally before repair: actual immutable mtime 1788764199729, expected normalized mtime 1788764199000. The repaired corruption/recovery fixture is preseeded with a fixed whole-second timestamp before ordinary Host verification/authorization. No private Host method, permission bypass or stored identity is altered. Host still verifies bytes, path, link count and protection. Restored timestamp and SHA-256 are asserted exactly before the original workspace recovery assertions.

## Actual executed gates

On Windows, Node 22.16.0, pnpm 11.19.0:

- Before repair: `node --expose-gc --import tsx tests/integration/stage2-product-actions.test.ts` exited 1 at the new exact-restoration fixture precondition.
- After repair: the same command exited 0, including full product actions, scoped feedback, stale recovery and zero-write assertions.
- `pnpm install --frozen-lockfile` exited 0.
- `pnpm run docs:sync` and `pnpm run docs:check` exited 0.
- `pnpm run check` exited 0, including Stage 2, workspace/compiler/lineage regressions, architecture, contract identity/roundtrip, storage, Worker, encoded media and recovery gates.
- `pnpm run acceptance:final:synthetic` exited 0: final acceptance synthetic slice passed; real media was not claimed.
- `node scripts/docs/migrate-evidence-scope-index.mjs` rebuilt applicability bookkeeping only; it does not rewrite historical Evidence or claim historical real/human acceptance reran. This fresh Evidence is bound only to this work package's three capabilities.

## Remaining integration and acceptance

The exact new PR head must pass remote check/security before merging; past heads do not establish that gate. This is tested software, not fresh authorized real-media or direct-human acceptance. DEBT-CA-STAGE2-003 remains active. Stage Exit: NOT CLAIMED. Release: NOT CLAIMED.
