---
evidence_id: EVD-20260825-WP-CA-MERGE-008-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-008
repository_commit: worktree-single-story-authority-precheck
code_fingerprint: 9f1d64d45c234b46ee77653b336b0e89fd006961e0324e290ac6f0a9dd76ac02
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run typecheck", "pnpm run story-intelligence:test", "pnpm run stage2-product-workspace:test", "pnpm run stage2:check", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; seventh and eighth PR review threads"
artifacts: ["one selected Direction per exact candidate set", "one approved Story Plan per exact proposal set", "Product repeat approval closes before Host execution", "forced stale prechecks reach atomic guard with zero authority writes"]
remaining_risks: ["Full repository and synthetic acceptance gates remain to run.", "Final-head PR checks and review-thread resolution remain required."]
---

# WP-CA-MERGE-008 precheck

Exact candidate sets now have one Host authority even under stale prechecks or
concurrent requests, while malicious approval rebound remains visible first.
