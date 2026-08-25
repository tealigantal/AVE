---
evidence_id: EVD-20260825-WP-CA-MERGE-012-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-012
repository_commit: worktree-late-render-and-rejected-intent-precheck
code_fingerprint: e651d0cdac4d397f86eda9ee379b64d5c76ca30c6c8c141a84988471ef355e3b
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run worker:render-correctness:test", "pnpm run stage2-workspace-renderer:test", "pnpm run stage2-product-workspace:test", "pnpm run stage2:check", "pnpm run typecheck", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; late remote-review render and rejected-intent closure"
artifacts: ["encoded opacity-only automation preserves baseline fill/crop framing", "Host-terminal rejected Intent exposes no approval execution or feedback controls after decision expiry", "candidate approval and execution paths remain available under their exact states", "Stage 2 aggregate and typecheck passed"]
remaining_risks: ["Full repository and synthetic acceptance gates remain to run.", "Independent review, final-head PR checks and review-thread closure remain required."]
---

# WP-CA-MERGE-012 precheck

Opacity-only automation preserves ordinary clip framing, and the Renderer keeps
Host-terminal rejected feedback Intents visibly closed after decision expiry.
