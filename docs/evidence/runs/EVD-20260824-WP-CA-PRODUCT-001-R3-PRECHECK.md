---
evidence_id: EVD-20260824-WP-CA-PRODUCT-001-R3-PRECHECK
date: 2026-08-24
work_package_id: WP-CA-PRODUCT-001
repository_commit: worktree-stage2-product-workspace-r3-precheck
code_fingerprint: bf9e9248e8d399bc22047196b01523bbd8ed0c953501eb40c5662b90ac2d8f07
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001]
commands: ["pnpm run architecture", "pnpm run stage2-product-workspace:test", "pnpm run typecheck", "pnpm run stage2-product-workspace:real", "root-agent visual inspection of the current recovery capture", "independent read-only review"]
result: rational_time_projection_repair_and_current_real_electron_v17_precheck_passed
environment: "Windows local checkout; repository-external authorized real source copied into isolated Product review project; real Electron/Chromium; no deployment or publication"
artifacts: ["floating duration_seconds removed from authoritative Host projection", "exact source start and end RationalTime retained", "architecture check passed across 276 source files", "Product Host actions and workspace tests passed", "authorized-real-media Electron run-20260824-v17 passed", "prior final independent review found no remaining P0 P1 or P2"]
remaining_risks: ["The complete repository gate must be rerun after this new current-fingerprint Evidence is bound.", "The user must inspect and accept the exact Product workspace and native main-process confirmation before ACC-CA-PRODUCT-001 may pass.", "WO-UX-001 and the final Stage 2 exit audit remain pending."]
---

# WP-CA-PRODUCT-001 R3 PRECHECK

The first full-gate attempt exposed one architecture violation in the workspace
projection: a derived floating `duration_seconds` field. The field was unused
by the Product journey and has been removed; exact RationalTime source bounds
remain. Architecture, focused Product, type and fresh real Electron v17 checks
pass at this fingerprint. Product acceptance is still held at the direct human
workspace/native-confirmation gate.
