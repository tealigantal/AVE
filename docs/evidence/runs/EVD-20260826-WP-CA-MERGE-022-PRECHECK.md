---
evidence_id: EVD-20260826-WP-CA-MERGE-022-PRECHECK
date: 2026-08-26
work_package_id: WP-CA-MERGE-022
repository_commit: worktree-stage2-generation-locked-target-precheck
code_fingerprint: 34f4cf84de30ea08afe8cef07972dfc7e9fe302cc9215cee52122044e723bd06
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run stage2-product-workspace:test", "pnpm run permission-matrix:test", "pnpm run typecheck", "pnpm run workbench:host:test", "pnpm run desktop:boundary", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows local checkout; deterministic Stage 2 Product and real Worker-render precheck"
artifacts: ["desktop generation reaches exact Material, Evidence, Direction, Story and Edit Intent authorities", "native review binds each exact material and Evidence child approval and retry reuse", "partial Direction and Story generation retries deterministically", "multi-beat execution derives one authoritative Original canvas for preflight and final render", "track and range locks use public Timeline commands and exclude feedback targets", "Contract-protected and successor feedback paths fail before writes", "material permission Contract-head and newer-deny interleavings preserve the winning state without stale permission writes", "reopen preserves the exact workspace digest"]
remaining_risks: ["Full repository and synthetic final gates remain to run.", "Private real Electron/media inputs are unavailable; no new real-media claim is made.", "Final independent review and exact-head remote checks remain required."]
---

# WP-CA-MERGE-022 precheck

The desktop-owned generation, exact approval, render, locked-target and
material-permission concurrency paths pass focused current-fingerprint gates.
