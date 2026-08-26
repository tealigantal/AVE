---
evidence_id: EVD-20260826-WP-CA-MERGE-024-PRECHECK
date: 2026-08-26
work_package_id: WP-CA-MERGE-024
repository_commit: worktree-feedback-timebase-publication-precheck
code_fingerprint: 818eebe9e32a6cf539750c327fb6b57671fbeaec53f5743349d8ab959e93e691
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run feedback-revision:test", "pnpm exec tsx tests/property/intelligence-edit-adapter.test.ts", "pnpm run docs:architecture:test", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows local checkout; deterministic feedback-timebase and crash-recoverable programme publication precheck"
artifacts: ["implicit mixed-timescale trim rejects before command compilation", "exact equivalent RationalTime ticks preserve the supported trim path", "speed TimeMap and non-bijective duration mappings reject fail-closed", "SQLite mutex serializes managed readers and writers", "single phase journal recovers ordinary failures and hard process exits to a complete old or committed set", "start completion and sync each publish one recoverable batch", "strict non-authoritative journal temp namespace recovers torn self-writes", "independent implementation reviews report no P0 P1 or P2"]
remaining_risks: ["Full repository and synthetic final gates remain to run.", "Exact-head remote security and check jobs plus final review-thread refresh remain required.", "Crash testing covers process termination on the local filesystem, not power loss or unreliable network filesystems.", "Private real Electron/media inputs are unavailable; no new real-media claim is made.", "No PR merge is authorized."]
---

# WP-CA-MERGE-024 precheck

Exact feedback time mapping and recoverable single-batch programme publication
pass focused fault, type, architecture, and independent-review gates at the
current shared fingerprint.
