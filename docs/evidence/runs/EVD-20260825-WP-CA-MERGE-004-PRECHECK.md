---
evidence_id: EVD-20260825-WP-CA-MERGE-004-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-004
repository_commit: worktree-stage2-dynamic-workspace-precheck
code_fingerprint: 11507b46e269c2044e0dce6a439f815356c43a7bd8a9244627f0b575f40f7428
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run typecheck", "pnpm run stage2-product-workspace:test", "pnpm run stage2:check", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; four confirmed PR review threads"
artifacts: ["dynamic Material Pack and dependent artifact workspace views", "dynamic approval expiry and digest binding", "distinct exact approval attempt identities", "fail-closed unsafe RationalTime editable-target projection", "focused Stage 2 aggregate passed"]
remaining_risks: ["Full repository and synthetic acceptance gates remain to run.", "Final-head PR checks and review-thread resolution remain required."]
---

# WP-CA-MERGE-004 precheck

The Product workspace now projects the same dynamic current/stale decisions
used by Host action prechecks. Regressions prove closure before approval writes,
recoverable exact retry, expiry visibility and safe RationalTime projection.
