---
evidence_id: EVD-20260825-WP-CA-PRODUCT-002-R2-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-PRODUCT-002
repository_commit: worktree-stage2-product-exact-target-r2-precheck
code_fingerprint: 20d4108635acb92b51b518a98e9e40203583c772a47ca27a023ffb4f23fa5f87
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002]
acceptance_ids: [ACC-CA-PRODUCT-002]
commands: ["pnpm run typecheck", "pnpm run stage2-product-workspace:test", "pnpm run desktop:boundary", "pnpm run architecture", "pnpm run stage2-product-workspace:real with explicit repository-external source and fresh review-root environment", "root-agent review-after-recovery visual inspection"]
result: focused_exact_action_target_and_real_electron_precheck_passed
environment: "Windows local checkout; authorized real source; isolated real Electron v21 review project; no deployment or publication"
artifacts: ["action-discriminated Product payload parser shared by native dialog and Host", "dual-ID Host zero-write regression", "v21 dual-ID desktop action closed before approval or Timeline writes", "v21 visible local-effect preview and explicit rejection", "feedback_revision.reject Permission Decision", "visible revision rejected card", "Timeline v6 unchanged by rejection", "undo v7 redo v8", "stale Preview cleanup", "exact reopen workspace digest f3cb2797ec5184af1ee095fee5a4093d3a53a63949994c2edc5e31a93fbd2912"]
remaining_risks: ["The full current-fingerprint repository gate is pending.", "Independent review must confirm that exact action parsing closes the native-dialog-to-Host target mismatch and introduces no new P1/P2 issue."]
---

# WP-CA-PRODUCT-002 R2 PRECHECK

The action payload is now a five-way discriminated union with exact runtime
keys. The native main-process dialog and Project Host use the same parser and
target resolver, so a payload cannot display `selected_id` while acting on a
different `intent_id`. Unit/integration coverage proves the dual-ID payload
fails before approvals, permissions, artifacts, events or Timeline writes.

The fresh v21 Electron journey repeats that malicious payload through the real
preload/main route and proves it is closed with unchanged Timeline and approval
count. The journey then previews and visibly rejects the exact new scoped
revision, records its Permission Decision, and preserves undo/redo/reopen stale
closure. Full and independent closure remain pending.
