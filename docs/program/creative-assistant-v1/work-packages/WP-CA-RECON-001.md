# WP-CA-RECON-001: Stage 2 Synthetic Reconciliation

Authority: programme integration verification, required by the continuous Stage 2 goal. This independent package reconciles the merged Issue chain; it does not redefine product scope.

## Outcome and scope

Verify the merged #12, #16, #11, #13, #15, #14 and security #23 changes together. Runtime, contracts, storage, permissions and product behavior are frozen. Only the existing product integration test may be strengthened where matrix evidence is incomplete. No skip/todo/only, test permissions bypass, private media, Stage 3 or new capability implementation.

## Verification matrix

| Dimensions | Executable coverage |
| --- | --- |
| 1-3: 30s minimum, 60s minimum, two distinct Stories | stage2-product-actions minimum fixture and exact Evidence ordering assertions |
| 4-6: Direction selection, Story approval, semantic Intent | stage2-product-actions and intelligence-pipeline-host |
| 7-8: complete Story duration and every Beat | product actions, intelligence-edit-adapter exact duration assertions |
| 9-10: single Asset and multiple Assets | single generated Product journey plus explicitly verified multi-Asset prepared sources and bound renders |
| 11-14: execution-bound Preview/Master, shared semantic identity, QC | product actions and current Render binding/Worker output assertions |
| 15-16: exact feedback trim, unsupported target | stage2-workspace, edit-ir, intelligence-edit-adapter and pipeline Host |
| 17: controlled Host clock | creative-context-host expiry boundary and reopen assertions |
| 18-22: rejection, stale authority, retry, reopen/recovery, zero partial writes | product actions, pipeline Host, permission Host and recovery suites |
| 23-24: one current major, current authority scan | docs:fingerprint:test and docs:check interface drift gates |
| 25: canonical desktop journey | electron:runtime:test test-owned harness plus production boundary checks; automated only |

## Execution and completion

Inspect assertions rather than infer coverage from test names. Strengthen missing synthetic coverage without runtime changes. Run stage2:check, check, acceptance:final:synthetic and diff checks with known exit codes. Record exact source/scope fingerprint and per-dimension evidence. Locally complete only after all synthetic gates pass; then independently pass final-head remote check/security, merge and clean the branch. Fresh real-media and direct-human acceptance remain mandatory for later REAL/EXIT packages; no accepted promotion or Release claim here.
