---
evidence_id: EVD-20260811-SECURITY-CI-COMPAT
date: 2026-08-11
work_package_id: repository-security-maintenance
repository_commit: worktree-before-security-ci-compat-publication
code_fingerprint: 7fa5eeb1215b1bdfb6c44fed282bb551d977eba4f6be9910e8c1bf3385dca295
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026]
commands: ["pnpm install --frozen-lockfile", "pnpm why fast-uri", "pnpm audit --audit-level high", "git grep machine absolute paths with exact immutable Evidence exclusions", "pnpm run ci:workflow:test", "pnpm run check", "pnpm run acceptance:final:synthetic", "pnpm run docs:check", "GitHub Actions run 31491170684 security log inspection"]
result: security_fix_and_ci_path_gate_local_validation_passed
environment: "Windows local checkout and GitHub Draft PR #7; pnpm 11 frozen lockfile; synthetic fixtures; no media or user project data changed"
artifacts: ["EVD-20260811-SECURITY-FAST-URI", "EVD-20260811-WP-PRESET-001-COMPLETE", "EVD-20260805-WP-VLOG-002-PRECHECK normalized sha256:f3ace4c03ec46ef31cc65376581a02c8ef5e44ceb67226544241287c5be8a4ef", "EVD-20260805-WP-VLOG-002-COMPLETE normalized sha256:7d9726dfbc161eeb966e85f598d081c2793263690aa7d88595c063ffa334e4a1", "GitHub Actions run 31491170684: vulnerability audit passed before legacy machine-path scan failure"]
remaining_risks: ["Two immutable 2026-08-05 Evidence files retain historical local artifact paths and are excluded by exact filename; broad Evidence exclusions remain forbidden by architecture test.", "This maintenance regression does not promote any blocked editing capability or replace historical human media acceptance."]
---

# security CI compatibility evidence

The first GitHub run after upgrading `fast-uri` proved that frozen Linux installation resolved the patched dependency and `pnpm audit --audit-level high` reported no known vulnerabilities. The next unchanged security step then exposed previously unreachable absolute local paths in two immutable 2026-08-05 Evidence records and an editable historical plan.

The plan now uses a neutral local-review placeholder. The Evidence records were not rewritten: the workflow excludes only their two exact filenames, continues scanning every other non-archive tracked path, and has a regression assertion that requires exactly those two Evidence exclusions and pins both normalized file hashes. The same grep invocation is clean locally.

Frozen installation, the one-version `fast-uri@3.1.5` dependency tree, high-severity audit, workflow topology test, complete repository check, synthetic final acceptance and documentation gates passed under this fingerprint. This record revalidates current capability statuses after the workflow/test fingerprint change while preserving the accepted Preset Evidence and all existing blocked capabilities and Debts.
