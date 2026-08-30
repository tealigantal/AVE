---
evidence_id: EVD-20260825-WP-CA-MERGE-002-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-002
repository_commit: worktree-stage2-security-compat-precheck
code_fingerprint: ca4f4cb782b7ea5d2f8b54b291bd738ce6ff8f6bdfe0ed4963c4578c38652140
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run ci:workflow:test", "exact local machine-path git grep", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; workflow and CI contract only"
artifacts: ["six exact historical Evidence scan exclusions", "normalized SHA-256 pins for all eight immutable Evidence exceptions", "machine-path scan passes without a directory-wide Evidence exclusion"]
remaining_risks: ["Full repository and synthetic acceptance gates remain to run at this fingerprint.", "GitHub Actions must rerun on the repaired final SHA."]
---

# WP-CA-MERGE-002 precheck

The exact scan reproduced the remote failure and now passes with a closed,
hash-protected Evidence allowlist. No historical Evidence content or product
runtime path changed.
