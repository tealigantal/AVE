---
evidence_id: EVD-20260824-WP-CA-UX-001-R1-COMPLETE
date: 2026-08-24
work_package_id: WP-CA-UX-001
repository_commit: worktree-stage2-ux-evaluation-r1-complete
code_fingerprint: bf9e9248e8d399bc22047196b01523bbd8ed0c953501eb40c5662b90ac2d8f07
capability_ids: [CAP-CA-UX-001]
acceptance_ids: [ACC-CA-UX-001]
commands: ["pnpm run stage2-product-workspace:real with explicit repository-external source and fresh review-root environment", "root-agent five-capture visual inspection", "pnpm run check", "pnpm run docs:sync", "pnpm run docs:check", "git diff --check"]
result: retracted_missing_same_journey_scoped_revision_decision
environment: "Windows local checkout; exact authorized real source; isolated real Electron/Chromium v18 review project; evaluation-only docs scope; no Product code changes, deployment or publication"
artifacts: ["user explicit acceptance of exact v17 Product workspace on 2026-08-24", "run-20260824-v18 reproducibility journey", "four same-version Contract Evidence Direction and Review views", "two Direction and two Story candidates", "current three-second Preview played in Electron", "execution-bound Preview Master and passed QC", "scoped local feedback preview", "invalid payload and stale Preview query closed", "undo v7 redo v8 and exact reopen digest cb716e02c327384c7878bbf83e52216c34842ad86227aa192405286f7605c27e", "stale media and feedback state visibly closed", "complete repository check passed"]
remaining_risks: ["P1: the v18 journey previewed its newly created scoped revision but performed undo and redo without explicitly rejecting or approving and executing that revision.", "The evaluation cannot pass until the same Electron journey records a visible exact decision with authoritative Timeline facts."]
---

# WP-CA-UX-001 R1 COMPLETE Evaluation

RETRACTED: independent final review found that v18 previewed but did not decide
the newly requested scoped revision. This record is retained for audit history
but is not referenced as passing Evidence.

The representative creator outcome is the user's explicit acceptance of the
exact v17 Product workspace after earlier direct visual reviews had rejected
imperceptible, short or visibly unsmooth results. That acceptance therefore
follows meaningful scrutiny rather than an automated proxy. This evaluation
consumes, but does not duplicate or broaden, Product R5 acceptance.

The docs-only package independently repeated the authorized-real-media journey
as v18 and inspected all five current captures. The rubric passes:

| Dimension | Result | Current evidence |
| --- | --- | --- |
| Clarity | passed | Four labeled views share one visible workspace identity; two Direction and two Story cards make alternatives distinguishable. |
| Control | passed | Exact actions remain behind native main-process confirmation; reject/cancel paths do not grant renderer authority. |
| Visible result | passed | Electron plays the current three-second Preview; Review shows exact execution-bound Preview, Master and passed QC. |
| Failure closure | passed | Invalid payload and stale digest queries close; recovery view marks old Render and feedback input as expired rather than current. |
| Recovery | passed | Undo moves v6 to v7, redo to v8, clears stale local/media preview state and reopen reproduces Timeline v8 plus the same workspace digest. |

The full current-fingerprint repository gate also passes. No application source
or test was changed inside this evaluation package. The remaining step is the
separate final programme reconciliation.
