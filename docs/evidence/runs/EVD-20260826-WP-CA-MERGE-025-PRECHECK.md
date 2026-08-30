---
evidence_id: EVD-20260826-WP-CA-MERGE-025-PRECHECK
date: 2026-08-26
work_package_id: WP-CA-MERGE-025
repository_commit: worktree-terminal-candidate-ui-precheck
code_fingerprint: e233643cf3ff333aeaf2a073e5a38f46c1a2908d0345ca48fde7a8d848a776ce
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run stage2-workspace-renderer:test", "pnpm run renderer:workbench:test", "pnpm run stage2-product-workspace:test", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows local checkout; terminal and partial Direction Story Renderer control precheck"
artifacts: ["terminal Direction and Story cards remain visible but disabled with no click handler", "retained local selections clear unless they bind an exact current candidate", "comparison approval requires at least two current candidates and no current decision", "partial Direction and Story generation retains the governed retry action", "stale and rejected history does not hide generation recovery", "Direction and Story view plus refresh wiring regressions", "Host partial-generation integration chain passes", "independent final review reports no P0 P1 or P2"]
remaining_risks: ["Full repository and synthetic final gates remain to run.", "Exact-head remote security and check jobs plus a fresh review-thread audit remain required.", "Private real Electron/media inputs are unavailable; no new real-media claim is made.", "No PR merge is authorized."]
---

# WP-CA-MERGE-025 precheck

Current-candidate comparison controls and partial-generation recovery pass
focused Renderer, Host, type, architecture, and independent-review gates.
