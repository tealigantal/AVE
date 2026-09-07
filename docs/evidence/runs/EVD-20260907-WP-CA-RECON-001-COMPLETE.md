---
evidence_id: EVD-20260907-WP-CA-RECON-001-COMPLETE
date: 2026-09-07
work_package_id: WP-CA-RECON-001
repository_commit: codex/stage2-synthetic-reconciliation
code_fingerprint: 504f1cc61d0ae140cb24336f90198c46327d34445d326b46b8824e9b6aa841ce
scope_fingerprint: b80185844ceb5e740f2065ae8b5710a8345ae1d017c342f2c303415f4900e683
capability_ids: [CAP-CA-RECON-001]
acceptance_ids: [ACC-CA-RECON-001]
result: passed
---

# Stage 2 synthetic reconciliation

Authority: fresh executed integration Evidence for the dedicated reconciliation package, linked by its ExecPlan. Baseline main 11e1b02 contains independent merged PRs #17, #18, #19, #20, #21, #22 and security #24; their branches were cleaned before this branch began.

## Actual commands and results

Windows, Node 22.16.0, pnpm 11.19.0, repository-generated synthetic media. All completed with exit 0:

- `node --expose-gc --import tsx tests/integration/stage2-product-actions.test.ts`
- `pnpm run docs:sync` and `pnpm run docs:check`
- `pnpm run stage2:check` (independent aggregate run)
- `pnpm install --frozen-lockfile`
- `pnpm run check` (full repository run, including Stage 2, desktop runtime, contracts, media and recovery)
- `pnpm run acceptance:final:synthetic`: final acceptance synthetic slice passed; real media was not claimed.

## Matrix and observed assertion boundaries

Paths below are repository-relative. Each test is included in the executed gates above.

| # | Dimension | Executable evidence |
| --- | --- | --- |
| 1 | 30s minimum Evidence | stage2-product-actions: four-evidence fixture succeeds; one fewer rejects without writes |
| 2 | 60s minimum Evidence | same helper: six-evidence fixture succeeds; one fewer rejects |
| 3 | Two distinct Story candidates | two cards, different Evidence orders, same valid set, no duplicates, reopen digest equality |
| 4 | Direction selection | product actions exact comparison set, user confirmation, subset retry and concurrent-set rejection |
| 5 | Story approval | product actions full Story approval with exact current refs |
| 6 | Semantic Edit Intent | intelligence-pipeline-host and product actions approval/compile/execute path |
| 7 | Complete approved duration | product output sums exactly to 60 * 48000 PTS; adapter validates approved duration |
| 8 | Every Beat duration | product output duration array equals each 8/9-second approved Beat exactly |
| 9 | Single Asset | generated Product journey and 30/60 minimum fixtures retain single-Asset paths |
| 10 | Multiple Assets | two distinct hashes imported/authorized; alternating Story Evidence resolves both prepared Timeline sources before commit |
| 11 | Execution-bound Preview | product bound render rejects missing/stale binding and publishes current Preview |
| 12 | Execution-bound Master | same multi-Asset render resolves immutable Originals and Master plan |
| 13 | Shared semantic identity | exact execution, Timeline, semantic hash, both plan IDs and source digest binding assertions |
| 14 | QC | real synthetic encoded bound render runs QC and checks current published review identity |
| 15 | Exact feedback trim | stage2-workspace and intelligence-edit-adapter cover 24Hz rejection, exact fractions, 30000/1001, VFR-like ticks and safe-integer limits; Host/compiler tests agree |
| 16 | Unsupported target | edit-ir/workspace/pipeline tests cover protection, speed, time maps, timebase and invalid lineage |
| 17 | Host clock | creative-context-host tests injected early/late clock, expiry boundary, stale projection, assembly rejection and reopen |
| 18 | Feedback rejection | product actions, pipeline Host and automated Electron harness reject revision without Timeline mutation |
| 19 | Stale authority | material, Contract, candidate, execution and source races reject stale operations |
| 20 | Idempotent retry | repeated review/generation/execution and storage retry assertions |
| 21 | Reopen/recovery | product workspace, pipeline execution, project recovery and final synthetic gates |
| 22 | Zero partial writes | count/snapshot equality for invalid permissions, target, source, confirmation and execution cases |
| 23 | Single current Contract major | docs fingerprint current-interface regressions and contract identity/check |
| 24 | Current authority document scan | docs:check and docs:fingerprint:test current-interface scanning assertions |
| 25 | Canonical desktop journey | electron:runtime:test executes the test-owned harness against production desktop; boundary tests ensure native confirmation and Host ownership |

## Coverage strengthening

The pre-existing main fixture was single-Asset. This package adds a separately hashed remuxed media file, imports and authorizes it through the Host, and alternates its Evidence with the first asset. The initial expanded test failed because an old assertion assumed source-array index zero was always Asset A. The corrected assertion finds Asset A by identity and checks the complete two-Asset set. The full product render/feedback/reopen flow then passed. Production code, contracts and permission rules are unchanged. No skip/todo/only or new authority bypass was added.

Applicability index regeneration is explicitly index-only bookkeeping, not historical reacceptance. This Evidence is attached only to the dedicated reconciliation capability; no product capability is promoted to accepted.

## Remaining gates

Exact-head remote check/security and integration/branch cleanup remain mandatory after local package completion. Authorized real-media and direct-human acceptance remain absent from this synthetic proof. DEBT-CA-STAGE2-003 stays active; WP-CA-REAL-001 and WP-CA-EXIT-002 are not completed. Stage Exit: NOT CLAIMED. Release: NOT CLAIMED.
