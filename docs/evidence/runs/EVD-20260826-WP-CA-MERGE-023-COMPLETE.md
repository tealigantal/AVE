---
evidence_id: EVD-20260826-WP-CA-MERGE-023-COMPLETE
date: 2026-08-26
work_package_id: WP-CA-MERGE-023
repository_commit: worktree-candidate-set-decision-complete
code_fingerprint: 0ce96940d73c22c852d0f294d187c6a0d06565526200815416e740bf12ce50fa
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run stage2-product-workspace:test", "pnpm run story-intelligence:test", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "pnpm run docs:sync -- --check", "pnpm run docs:check", "pnpm run check", "pnpm run acceptance:final:synthetic", "git diff --check", "node scripts/docs/fingerprint.mjs"]
result: passed
environment: "Windows local checkout; full repository immutable candidate-set validation"
artifacts: ["Direction and Story decisions use prior immutable candidate_refs instead of caller subsets", "A selected from A B C makes exact B and C workspace candidates rejected", "desktop B C retries close before native confirmation and approval persistence", "direct Host B C retries with exact approvals preserve all mutation counts", "selected Direction and Approved Story authorities remain current", "pre-await post-await and in-transaction duplicate guards remain active", "typecheck architecture full repository and synthetic final gates pass", "independent review reports no P0 P1 or P2"]
remaining_risks: ["Private real Electron/media acceptance inputs remain unavailable; no new real-media claim is made.", "Exact-head remote security and check jobs remain required.", "Review threads must be refreshed against the pushed final SHA before closure.", "No PR merge is authorized."]
---

# WP-CA-MERGE-023 complete

The complete immutable candidate-set guard, user projection, public Host
zero-write regressions, repository gate and synthetic acceptance pass at the
final fingerprint.
