---
evidence_id: EVD-20260825-WP-KF-CI-001-PRECHECK
date: 2026-08-25
work_package_id: WP-KF-CI-001
repository_commit: worktree-high-fps-boundary-precheck
code_fingerprint: 7896f01c663f110a610d024041ec0e21a1892ad04a3485b2fc26358b5e13b30e
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030, ACC-031, ACC-032, ACC-033, ACC-034, ACC-035, ACC-036]
commands: ["pnpm run worker:render-correctness:test", "node scripts/docs/fingerprint.mjs"]
result: passed_precheck
environment: "Windows local checkout; exact Linux failure reproduced twice in GitHub Actions before this repair"
artifacts: ["final video normalization appends one finite cloned boundary frame before target-fps conversion", "exact computed end_frame bound remains 240 for the two-second 120 fps fixture", "Worker media correctness passed without relaxing duration or decoded-frame assertions"]
remaining_risks: ["Full repository and synthetic acceptance gates remain to run at this fingerprint.", "The repaired final SHA must pass Linux GitHub Actions security and check jobs."]
---

# WP-KF-CI-001 precheck

The finite one-frame tail closes FFmpeg's version-dependent final boundary and
the exact frame-count trim prevents extending the declared RationalTime span.
No transform curve, geometry or accepted capability scope changed.
