---
evidence_id: EVD-20260811-REGRESSION-COMPAT
date: 2026-08-11
work_package_id: WP-PRESET-001
repository_commit: worktree-before-draft-pr
code_fingerprint: e8bae703d07a47553b4d6c03bad43cbb9be5a90cc79581959a6a3d6c386e7ef5
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019]
commands: ["pnpm run check", "pnpm run acceptance:final:synthetic", "pnpm run architecture", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run edit-ir:test", "pnpm run render-graph:test", "pnpm run commit-plan:test", "pnpm run timeline-core:test", "pnpm run timeline:host:test", "pnpm run undo-redo:test", "pnpm run project-recovery:test", "pnpm run storage:check"]
result: regression_validation_passed
environment: "Windows local checkout; synthetic fixtures plus separately identified licensed real-media Preset review bundle; no media committed"
artifacts: ["EVD-20260805-WP-VLOG-002-PRECHECK", "EVD-20260805-WP-VLOG-002-COMPLETE", "local-review-bundle:AVE-preset-review-20260811-v5"]
remaining_risks: ["This run revalidates prior capability status under the current code fingerprint; it does not replace the historical human acceptance recorded by the referenced immutable Evidence.", "Existing blocked capabilities and programme Debts remain blocked."]
---

# Current-fingerprint regression compatibility evidence

The complete repository check passed on the final current-fingerprint run. Earlier attempts intermittently failed the pre-existing encoded Basic Vlog Ducking recovery sampling assertion; focused reruns and the final complete run passed without source changes. The current Preset/Creative Skill implementation was exercised together with the existing Timeline, CommitPlan, RenderGraph, Project Host, Project Storage, recovery and synthetic final-acceptance suites. No previously blocked capability was promoted. Historical accepted media conclusions remain in their original immutable Evidence; this record only establishes that the current source fingerprint preserves those tested and blocked boundaries.

The generic Preset path expands into ordinary Timeline Commands and then uses the existing graph and media pipeline. The fresh licensed real-media review bundle is identified separately in the Preset PRECHECK Evidence. No source or rendered media is present in the repository.
