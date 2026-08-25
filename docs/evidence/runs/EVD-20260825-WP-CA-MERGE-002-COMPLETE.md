---
evidence_id: EVD-20260825-WP-CA-MERGE-002-COMPLETE
date: 2026-08-25
work_package_id: WP-CA-MERGE-002
repository_commit: worktree-stage2-security-compat-complete
code_fingerprint: ca4f4cb782b7ea5d2f8b54b291bd738ce6ff8f6bdfe0ed4963c4578c38652140
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run ci:workflow:test", "exact local machine-path git grep", "pnpm run docs:sync", "pnpm run docs:sync -- --check", "pnpm run docs:check", "pnpm run check", "pnpm run acceptance:final:synthetic", "git diff --check"]
result: passed_complete
environment: "Windows local checkout; workflow and immutable Evidence contract only; no product runtime or private media"
artifacts: ["six exact historical WP-KF-002 Evidence scan exclusions", "normalized SHA-256 pins for all eight immutable Evidence exceptions", "no wildcard or directory-wide Evidence exclusion", "local workflow-equivalent machine-path scan passed", "complete repository and synthetic acceptance gates passed", "both programme bindings refreshed"]
remaining_risks: ["GitHub Actions security and check jobs must pass on the new pushed final SHA.", "No merge is authorized."]
---

# WP-CA-MERGE-002 completion

The first PR security failure is closed locally with an exact, immutable and
hash-protected compatibility allowlist. Historical Evidence remains unchanged,
all other paths remain scanned, and no product capability or runtime behavior
changed.
