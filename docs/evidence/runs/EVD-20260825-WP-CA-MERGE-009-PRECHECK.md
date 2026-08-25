---
evidence_id: EVD-20260825-WP-CA-MERGE-009-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-009
repository_commit: worktree-preconfirmation-story-closure-precheck
code_fingerprint: e598d0abbc398fa6599412de558a832528a8fa84daa6a35ae756479368097eaa
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run typecheck", "pnpm run stage2-product-workspace:test", "pnpm run desktop:boundary", "pnpm run stage2:check", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; independent-review P1 correction"
artifacts: ["duplicate Story approval closes before native showMessageBox", "behavioral regression observes zero dialog and perform calls", "Host execution guard remains defense in depth", "desktop architecture check enforces guard ordering"]
remaining_risks: ["Full repository and synthetic acceptance gates remain to run.", "Final-head PR checks and review-thread closure remain required."]
---

# WP-CA-MERGE-009 precheck

The desktop confirmation path now rejects an already-approved Story candidate
set before presenting native human review or invoking the Host action.
