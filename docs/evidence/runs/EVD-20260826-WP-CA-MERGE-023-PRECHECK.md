---
evidence_id: EVD-20260826-WP-CA-MERGE-023-PRECHECK
date: 2026-08-26
work_package_id: WP-CA-MERGE-023
repository_commit: worktree-candidate-set-decision-precheck
code_fingerprint: 0ce96940d73c22c852d0f294d187c6a0d06565526200815416e740bf12ce50fa
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run stage2-product-workspace:test", "pnpm run story-intelligence:test", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows local checkout; deterministic three-candidate authority precheck"
artifacts: ["Direction A selected from A B C projects B and C as rejected", "Story A approved from A B C projects B and C as rejected", "prior Decision candidate_refs close B C subset retries", "desktop confirmation closes before a second Direction dialog", "direct Host subset calls with exact approvals persist zero additional approval permission artifact Timeline or event rows", "selected Direction and Approved Story authority remain current"]
remaining_risks: ["Full repository and synthetic final gates remain to run.", "Final independent review and exact-head remote checks remain required.", "Private real Electron/media inputs are unavailable; no new real-media claim is made."]
---

# WP-CA-MERGE-023 precheck

The immutable Decision candidate-set guard and three-candidate zero-write
regressions pass focused current-fingerprint gates.
