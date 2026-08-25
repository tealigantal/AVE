---
evidence_id: EVD-20260825-WP-CA-MERGE-011-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-011
repository_commit: worktree-cycle-safe-structural-equality-precheck
code_fingerprint: e7d187fd57cf19423c1d37bad06df10ec615ab9df5169283602f029e30ed5fea
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run contracts:generate", "pnpm run story-intelligence:test", "cyclic validator direct reproduction", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run typecheck", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; independent-review cyclic-input correction"
artifacts: ["cyclic non-JSON Direction refs return validator false without RangeError", "active object-pair tracking is per equality invocation", "property-order-independent JSON duplicate rejection remains intact", "generated-clean and cross-language roundtrip pass"]
remaining_risks: ["Full repository and synthetic acceptance gates remain to run.", "Final-head PR checks and review-thread closure remain required."]
---

# WP-CA-MERGE-011 precheck

Generated validators now reject cyclic non-JSON inputs without stack overflow
while retaining structural equality for acyclic JSON values.
