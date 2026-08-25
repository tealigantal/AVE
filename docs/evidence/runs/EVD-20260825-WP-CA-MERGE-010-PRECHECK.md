---
evidence_id: EVD-20260825-WP-CA-MERGE-010-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-010
repository_commit: worktree-structural-json-equality-precheck
code_fingerprint: a09f2236400eb353d60ac61cc02328262f2ba6b06ea2f342728323ebe8880d04
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run contracts:generate", "pnpm run story-intelligence:test", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run typecheck", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; ninth remote PR review thread"
artifacts: ["standalone validator embeds dependency-free structural JSON equality", "property-order-independent duplicate Direction refs fail uniqueItems", "schemas and public contract shapes remain unchanged", "generated-clean and cross-language roundtrip pass"]
remaining_risks: ["Full repository and synthetic acceptance gates remain to run.", "Final-head PR checks and review-thread closure remain required."]
---

# WP-CA-MERGE-010 precheck

Generated standalone validators now compare JSON objects structurally for
`uniqueItems`, independent of property insertion order.
