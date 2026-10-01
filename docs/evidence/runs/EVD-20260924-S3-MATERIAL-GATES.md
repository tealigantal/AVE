---
evidence_id: EVD-20260924-S3-MATERIAL-GATES
date: 2026-09-24
code_fingerprint: 61d23ce4aeec8dd720a126e993496524c25c87cf0d4be006f15dddf8bb70d4fc
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: engineering_pass_real_checkpoint_unfinished
---
# Material preparation regression gates

Follow-up to [material precheck](EVD-20260924-S3-MATERIAL-PRECHECK.md), retaining
its original failures, fixes and narrow claims. WP-S3-INTEGRATION-001 and the
[ExecPlan](../../plans/2026-09-18-stage3-first-personal-creation.md) remain active.

On Windows/PowerShell, Node 22.16.0 and pnpm 11.9.0, both full commands exited 0
on the fingerprint above. The final fingerprint was independently recomputed
after both commands; no source change occurred during the runs.

| Command | Result | Local log basename | SHA-256 |
| --- | --- | --- | --- |
| `pnpm run check` | exit 0 | `ave-stage3-material-check-20260924.log` | `8ffb98db2ec54eb460e267b51e334c3b135146c4ac90e14c3589869bba6fa97a` |
| `pnpm run acceptance:final:synthetic` | exit 0; synthetic slice only | `ave-stage3-material-synthetic-20260924.log` | `808ee2be19b86adf6d26d7db235b2963715d55f148e292583e025e6bcde27184` |

Logs remain in the local OS temporary directory, outside Git. Earlier targeted
passes include stage3:check, stage2-product-workspace:test, typecheck (65
contracts), architecture (305 sources), docs:check and git diff --check. The
shared immutable-file helper changes therefore also passed the existing Stage2
permission/copy/product regression and the full media/render checks. Read-only
review fixes and fixture-bound scope are recorded in precheck Evidence.

Allowed-path audit found no out-of-scope changes. No checker or assertion was
weakened; generated contracts/current documents were produced by existing tools.
No new model, thinking setting, private media, remote model call or expense was
introduced. Review agents remained read-only; root wrote all shared changes.

This is not the requested real checkpoint: actual model material understanding,
authorized learning and held-out application, draft-bound Preview/Master/QC and
the approved workbench journey remain unfinished. Source/learning/design and
provider/data/budget inputs remain unanswered. No personalized film/recording,
source commit/push, draft PR, merge, release or Stage3 candidate completion.
The branch still has base HEAD 3521aa8 and recoverable working-tree changes.
