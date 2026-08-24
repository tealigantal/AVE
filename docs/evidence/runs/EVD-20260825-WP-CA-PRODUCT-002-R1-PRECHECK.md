---
evidence_id: EVD-20260825-WP-CA-PRODUCT-002-R1-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-PRODUCT-002
repository_commit: worktree-stage2-product-decision-r1-precheck
code_fingerprint: ede51b288e79b622eb016e8d238473b1ca8c6c39c0a632313a36816ef1723cad
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002]
acceptance_ids: [ACC-CA-PRODUCT-002]
commands: ["pnpm run typecheck", "pnpm run stage2-product-workspace:test", "pnpm run desktop:boundary", "pnpm run architecture", "pnpm run stage2-product-workspace:real with explicit repository-external source and fresh review-root environment", "root-agent review-after-recovery visual inspection"]
result: focused_real_electron_same_journey_rejection_precheck_passed
environment: "Windows local checkout; authorized real source; isolated real Electron v20 review project; no deployment or publication"
artifacts: ["v20 newly created scoped feedback intent", "visible local-effect preview", "renderer Reject this revision action", "review-only main-process exact feedback-reject confirmation", "feedback_revision.reject Permission Decision", "visible revision rejected card", "Timeline v6 unchanged by rejection", "undo v7 redo v8", "stale Preview cleanup", "exact reopen workspace digest a253e37a6d868b37350fb7a96d05c6dd848f2409827a4dfd12706cfbf753dff1"]
remaining_risks: ["The full current-fingerprint repository gate is pending.", "Independent final review must verify that the review-only confirmation hook cannot approve or execute edits and that ACC-CA-UX-001 is now supportable."]
---

# WP-CA-PRODUCT-002 R1 PRECHECK

The v20 real Electron journey closes the P1 behavior gap: after generating and
previewing a new scoped trim proposal, it clicks the visible rejection action,
records the exact `feedback_revision.reject` Permission Decision, displays
`修订已拒绝`, and proves Timeline v6 did not change. Only then does the journey
perform undo to v7, redo to v8, stale-preview cleanup and exact reopen.

The dedicated automation hook is main-process-owned and can confirm only
`feedback.reject` while both Product-review environment flags are present. It
cannot approve a proposal or execute a Timeline edit. Full and independent
closure remain pending, so this Evidence does not yet complete the package or
promote UX.
