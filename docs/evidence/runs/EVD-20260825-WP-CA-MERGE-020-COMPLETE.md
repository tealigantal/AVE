---
evidence_id: EVD-20260825-WP-CA-MERGE-020-COMPLETE
date: 2026-08-25
work_package_id: WP-CA-MERGE-020
repository_commit: worktree-replay-command-governance-complete
code_fingerprint: 1945f16ba5bcdcb3c02e342e69e5309e600bd4e78b4fe7c1a72c08084e2b69de
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run workbench:host:test", "pnpm run desktop:boundary", "pnpm run docs:sync", "pnpm run docs:sync -- --check", "pnpm run docs:check", "pnpm run stage2:check", "pnpm run check", "pnpm run acceptance:final:synthetic", "git diff --check", "node scripts/docs/fingerprint.mjs"]
result: passed
environment: "Windows local checkout; governance-only full repository validation"
artifacts: ["WP019 required_tests uses the verified workbench:host:test script", "editing R65 and R66 Evidence uses PROGRAMME-STATUS ownership", "generated current documents are generator-clean", "Stage 2 full repository and synthetic final acceptance gates pass at the exact fingerprint"]
remaining_risks: ["Private real Electron/media acceptance inputs remain unavailable; no real-media claim is made.", "Exact-head GitHub Actions final review and thread closure remain required.", "No PR merge is authorized."]
---

# WP-CA-MERGE-020 complete

All declared governance commands and programme Evidence ownership are now
replayable and generator-clean.
