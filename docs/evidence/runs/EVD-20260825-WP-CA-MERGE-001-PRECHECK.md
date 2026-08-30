---
evidence_id: EVD-20260825-WP-CA-MERGE-001-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-001
repository_commit: worktree-stage2-merge-gates-precheck
code_fingerprint: 47dde9be2ea0bec13681993400808ad94f7b67bbae70cfe3fe34a612f270ec64
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run docs:fingerprint:test", "pnpm run ci:workflow:test", "pnpm run stage2:check", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; deterministic tests only; no private real media or publication"
artifacts: ["fingerprint v3 covers scripts and critical root configuration", "all eight deterministic Stage 2 suites are reachable from the default check chain", "private intelligence-pipeline real media remains a separate local command", "Story migration regression targets migrations 24-26 without assuming a global latest version", "P2 Electron harness placement recorded as non-blocking debt"]
remaining_risks: ["Full repository and synthetic final acceptance gates remain to run at this fingerprint.", "GitHub Actions has not yet executed on the repaired final SHA.", "The environment-gated Electron acceptance harness remains in production app-lifecycle code pending a separate package."]
---

# WP-CA-MERGE-001 precheck

The focused governance, CI topology and complete deterministic Stage 2 suite
pass under the expanded source fingerprint. This precheck exists to reconcile
generated programme state before the full repository gate; it does not complete
the package, promote product scope, repeat real-media acceptance or replace PR
GitHub Actions evidence.
