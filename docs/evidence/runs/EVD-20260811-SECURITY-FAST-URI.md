---
evidence_id: EVD-20260811-SECURITY-FAST-URI
date: 2026-08-11
work_package_id: repository-security-maintenance
repository_commit: worktree-before-security-fix-publication
code_fingerprint: 4f4a3dbec316dd0f0e81b0ef057ab96f0dd92e379e5ec63db0580b851ddfcda9
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026]
commands: ["pnpm install --frozen-lockfile", "pnpm why fast-uri", "pnpm audit --audit-level high", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run typecheck", "pnpm run architecture", "pnpm run ci:workflow:test", "pnpm run check", "pnpm run acceptance:final:synthetic", "pnpm run docs:check"]
result: security_advisory_resolved_and_regression_validation_passed
environment: "Windows local checkout and GitHub Draft PR #7; pnpm 11 frozen lockfile; synthetic fixtures; no media or user project data changed"
artifacts: ["pnpm-workspace.yaml override fast-uri:3.1.5", "pnpm-lock.yaml fast-uri@3.1.5 sha512-gHwA1O9LDIcKunMKhObS/HimwtehO1nPUECKAu5TpKgaO19fcWEl4bliWe1jWxVFvIXztJjjQ4L8XQ1EU9f7Jw==", "EVD-20260811-WP-PRESET-001-COMPLETE"]
remaining_risks: ["This dependency-only regression run does not promote any blocked editing capability or replace historical human media acceptance.", "The workspace override must remain aligned with future ajv upgrades until all supported resolutions are patched."]
---

# fast-uri security maintenance evidence

The single repository-wide high-severity advisory was traced to `fast-uri@3.1.4` through `ajv@8.20.0` and `ajv-formats@3.0.1`. Because `ajv` declares `fast-uri ^3.0.1`, the workspace-level pnpm override and lockfile now resolve the compatible patched release `3.1.5`. A frozen install reproduces that resolution, `pnpm why fast-uri` reports one patched version, and the unchanged high-severity audit gate reports no known vulnerabilities.

Contract validation, generated binding compatibility, TypeScript checking, architecture checks, CI workflow topology, the complete repository check and synthetic final acceptance passed under the new repository fingerprint. No application source, protocol, workflow threshold, media, database or user project data changed.

This record revalidates current capability statuses after a dependency-only fingerprint change. It preserves the accepted Preset conclusion recorded by `EVD-20260811-WP-PRESET-001-COMPLETE` and preserves every existing blocked capability and Debt without promotion.
