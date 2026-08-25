---
evidence_id: EVD-20260825-WP-CA-MERGE-020-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-020
repository_commit: worktree-replay-command-governance-precheck
code_fingerprint: 1945f16ba5bcdcb3c02e342e69e5309e600bd4e78b4fe7c1a72c08084e2b69de
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run workbench:host:test", "pnpm run desktop:boundary", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; governance-only replay correction"
artifacts: ["WP019 required test now names the executable workbench:host:test script", "editing R65 and R66 status Evidence use PROGRAMME-STATUS ownership", "focused workbench and desktop boundary commands pass", "generated current documents were refreshed by docs:sync"]
remaining_risks: ["Full docs Stage 2 repository and synthetic gates remain to run.", "Final independent review and exact-head remote checks remain required."]
---

# WP-CA-MERGE-020 precheck

The replay-command and cross-programme Evidence metadata are corrected without
product or test changes.
