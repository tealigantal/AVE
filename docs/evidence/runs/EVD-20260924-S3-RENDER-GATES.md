---
evidence_id: EVD-20260924-S3-RENDER-GATES
date: 2026-09-24
code_fingerprint: a93c2bdbf61aa7bbe210df824690be22ac2e7acfcaa3b390ca8b4aaff62e9359
repository_commit: 3521aa8a5d019fb49dd486a11a424bc937857db1
result: engineering_pass_real_checkpoint_unfinished
---
# Saved-draft rendering regression gates

Follow-up to [render precheck](EVD-20260924-S3-RENDER-PRECHECK.md) and
[source error repair](EVD-20260924-S3-RENDER-REVIEW-FIX.md). The original full-gate
failure remains in its separate local log and immutable Evidence. Its code fix
and targeted passing regression preceded the new full run.

On Windows/PowerShell, Node 22.16.0, both required full commands exited 0 on the
fingerprint above. Source was frozen during these runs and recomputed afterwards.

| Command | Result | Local log basename | SHA-256 |
| --- | --- | --- | --- |
| `pnpm run check` | exit 0 | `ave-stage3-render-check-r2-20260924.log` | `1377e2773948cbc539e05ddda5d68aa0bebfa11ea60d697c7effb926b65f3861` |
| `pnpm run acceptance:final:synthetic` | exit 0; synthetic slice | `ave-stage3-render-synthetic-20260924.log` | `808ee2be19b86adf6d26d7db235b2963715d55f148e292583e025e6bcde27184` |

Logs are in the local OS temporary directory, outside Git. Full check includes
the Stage2 regression, all Stage3 suites including actual encoded dual render/QC,
Worker ownership/cancellation tests, contract generation/clean checks, typecheck,
architecture, persistent recovery, media correctness and foundation acceptance.
The separate Linux result is only the WSL/Python process-owner smoke, as recorded
in precheck; no Linux Node/full CI result is asserted. The latest allowed-path
audit and git diff --check found no outside source change or whitespace error.

The source error repair did not weaken any assertion. All shared changes were
written by root; reviews were read-only with unchanged inherited settings.
The Host keeps immutable request/draft/source/plan/output bindings, exact
object references, independent adoption/view pointers and explicit failure
diagnostics. Technical QC and synthetic model fixtures remain bounded evidence.

WP-S3-INTEGRATION-001 and the goal stay active. The actual material-observation,
authorized learning/correction, approved-workbench and held-out project journey
remain unfinished; real inputs and bounded data/provider/cost consent are still
missing. No private model/media upload, actual personalized film/recording,
source commit/push, draft PR, merge, release or Stage3 candidate completion.
Branch is codex/stage3-first-personal-creation, with uncommitted implementation
at the unchanged base HEAD above. Continue from the existing
[ExecPlan](../../plans/2026-09-18-stage3-first-personal-creation.md).
