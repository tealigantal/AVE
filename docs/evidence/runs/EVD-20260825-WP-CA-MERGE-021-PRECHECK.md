---
evidence_id: EVD-20260825-WP-CA-MERGE-021-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-021
repository_commit: worktree-position-geometry-preflight-precheck
code_fingerprint: ada196465fb453a5d7fba1ca22f98673e62cff9fa39887effe473e5448ea3eaf
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run render-graph:test", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; position automation RenderGraph preflight"
artifacts: ["x/y-only automation with missing selected source geometry produces AUTOMATION_TRANSFORM_SOURCE_GEOMETRY_REQUIRED during plan resolution", "the same x-only curve with exact geometry remains free of that blocker", "Worker behavior is unchanged"]
remaining_risks: ["Full repository and synthetic gates remain to run.", "Final independent review and exact-head remote checks remain required."]
---

# WP-CA-MERGE-021 precheck

Position-only automation now fails before Worker submission when target-specific
source geometry is unavailable.
