---
evidence_id: EVD-20260825-WP-CA-MERGE-015-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-015
repository_commit: worktree-exact-render-binding-and-unit-position-precheck
code_fingerprint: 8b9a0477bafe33654849323df87685d63bb334bed5cc43acf469710bd0df925a
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run stage2-product-workspace:test", "pnpm run worker:render-correctness:test", "pnpm run stage2:check", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "ruff check apps/worker-host/src apps/worker-host/tests", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; exact render binding and unit-position closure"
artifacts: ["unbound same-Timeline render remains stale", "Preview and Master exact binding must match one committed execution", "trusted render path persists the verified execution binding", "encoded x:1 and y:1 use geometry overlay while unit scale remains identity", "focused Stage 2, Worker correctness, typecheck and architecture gates passed"]
remaining_risks: ["Full repository and synthetic acceptance gates remain to run.", "Independent review, final-head PR checks and review-thread closure remain required."]
---

# WP-CA-MERGE-015 precheck

Render currency now requires persisted exact execution-plan identity, and
one-unit static positions remain visible geometry operations.
