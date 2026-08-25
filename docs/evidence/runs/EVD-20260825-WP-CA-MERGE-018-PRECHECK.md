---
evidence_id: EVD-20260825-WP-CA-MERGE-018-PRECHECK
date: 2026-08-25
work_package_id: WP-CA-MERGE-018
repository_commit: worktree-contract-render-product-closure-precheck
code_fingerprint: c8e324ac8f648c380c85029023a2a1622a429b2813ef749e6e82a463a1149a30
capability_ids: [CAP-CA-GOV-001, CAP-CA-CONTEXT-001, CAP-CA-SKILL-001, CAP-CA-DURATION-001, CAP-CA-STORY-001, CAP-CA-PERMISSION-001, CAP-CA-PIPELINE-001, CAP-CA-FEEDBACK-001, CAP-CA-PRODUCT-001, CAP-CA-PRODUCT-002, CAP-CA-UX-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-GOV-001, ACC-CA-INT-000-CONTRACT, ACC-CA-INT-000-EVIDENCE, ACC-CA-INT-001-SKILL, ACC-CA-INT-002-DURATION, ACC-CA-INT-003-STORY, ACC-CA-INT-003-INTENT, ACC-CA-INT-004-PERMISSION, ACC-CA-PIPE-001, ACC-CA-FEEDBACK-001, ACC-CA-PRODUCT-001, ACC-CA-PRODUCT-002, ACC-CA-UX-001, ACC-CA-EXIT-001]
commands: ["pnpm run stage2-workspace-renderer:test", "pnpm run renderer:workbench:test", "pnpm run workbench:host:test", "pnpm run desktop:boundary", "pnpm run stage2-product-workspace:test", "pnpm run stage2:check", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; deterministic Contract approval and execution-bound render closure"
artifacts: ["fresh Product Contract review derives project version status provenance and explicit-user approval policy in Host", "exact Contract native-review action approves the current digest and persists actor plus review digest", "Renderer submits no project status approval source path profile or render binding authority", "Product render wrapper reconstructs sources and binding from the committed execution", "legacy unbound render is closed in Renderer and Main when Stage 2 authority exists", "focused Stage 2 typecheck and architecture gates passed"]
remaining_risks: ["Full repository and synthetic acceptance gates remain to run.", "The private real Electron/media acceptance command requires AVE_STAGE2_PRODUCT_PROJECT and AVE_STAGE2_PRODUCT_REVIEW_ROOT, which are unavailable in this environment.", "Independent review, final-head PR checks and review-thread closure remain required."]
---

# WP-CA-MERGE-018 precheck

Deterministic Product, Host, Renderer and Main-boundary checks close the two
late P1 paths before full repository validation.
