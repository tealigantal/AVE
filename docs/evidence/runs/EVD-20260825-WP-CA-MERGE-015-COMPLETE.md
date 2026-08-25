---
evidence_id: EVD-20260825-WP-CA-MERGE-015-COMPLETE
date: 2026-08-25
work_package_id: WP-CA-MERGE-015
repository_commit: worktree-exact-render-binding-and-unit-position-complete
code_fingerprint: 8b9a0477bafe33654849323df87685d63bb334bed5cc43acf469710bd0df925a
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run stage2-product-workspace:test", "pnpm run worker:render-correctness:test", "pnpm run stage2:check", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "ruff check apps/worker-host/src apps/worker-host/tests", "pnpm run check", "pnpm run acceptance:final:synthetic", "pnpm run docs:sync", "pnpm run docs:check", "node scripts/docs/fingerprint.mjs"]
result: passed
environment: "Windows local checkout; exact render binding and unit-position closure"
artifacts: ["unbound same-Timeline Preview/Master remains stale", "both target results persist one exact verified execution binding", "workspace strictly matches binding timeline, semantic graph, source identity and both plan IDs to a committed execution", "two targets carrying the same wrong binding timeline remain stale", "encoded x:1 and y:1 render through geometry overlay", "full repository and synthetic final gates passed"]
remaining_risks: ["Final-head GitHub Actions and remote review-thread closure remain required.", "The dedicated Electron E2E harness debt remains active."]
---

# WP-CA-MERGE-015 complete

Stage 2 render currency is exact-execution-bound, and one-unit static positions
remain visible through the Worker geometry path.
