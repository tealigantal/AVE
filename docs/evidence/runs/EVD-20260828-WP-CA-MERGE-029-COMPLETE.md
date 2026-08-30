---
evidence_id: EVD-20260828-WP-CA-MERGE-029-COMPLETE
date: 2026-08-28
work_package_id: WP-CA-MERGE-029
repository_commit: worktree-approved-story-immutable-authority-complete
code_fingerprint: 104192469a65fc581a856a09cb78772b86c6aa5531bf5a7eea49cb6f6f763946
capability_ids: [CAP-CA-STORY-001, CAP-CA-PIPELINE-001, CAP-CA-PRODUCT-001]
acceptance_ids: [ACC-CA-INT-003-STORY, ACC-CA-PIPE-001, ACC-CA-PRODUCT-001]
commands: ["pnpm run stage2:check", "pnpm run workbench:host:test", "pnpm run ipc:boundary", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:architecture:test", "pnpm run docs:fingerprint:test", "pnpm run docs:sync", "pnpm run docs:sync -- --check", "pnpm run docs:check", "pnpm run check", "pnpm run acceptance:final:synthetic", "pnpm run intelligence-pipeline:real", "pnpm run stage2-product-workspace:real", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed
environment: "Windows local checkout; deterministic generated Stage 2 media, SQLite, desktop Host, IPC, Worker render and filesystem race fixtures; authorized external real-media inputs absent"
artifacts: ["Product material and Story templates deterministically preserve the trusted planned Beat count with strictly positive exact RationalTime budgets", "approved Story compilation requires complete bijective per-Beat unit-speed Evidence coverage and produces an exact neutral first-cut extent through the existing command and CommitPlan path", "missing duplicate overlapping insufficient ranged audio-promise retimed protected and non-neutral variants reject before authoritative Timeline mutation", "Project Host exclusively publishes a single-link read-only immutable Original by retained handle and no-clobber hard link, then rechecks exact identity stat mode and permission inside the atomic transaction", "identity-bound compensation preserves replacement files, restores an uncommitted prior mode, reports cleanup failures, removes a newly created inode after races and leaves no residue after injected temporary close failure", "same-asset mutations serialize and session close waits accepted and queued tails while rejecting new work", "execution-bound Render persists and revalidates exact execution Contract Story Pack policy immutable row content graph and plan authority before work and immediately before blocked completed or reused publication", "content policy execution and Promise-continuation races publish zero Render Bundle run or result", "desktop IPC exposes only public Original and Proxy rows while the workspace token binds Product-visible Evidence digest and lifecycle", "full repository check and synthetic final acceptance pass at the exact source fingerprint", "the two real lanes were executed and failed closed only on their absent authorized external inputs, so no real-media success is claimed", "independent source and Windows NTFS review report no blocking defect"]
remaining_risks: ["Pipeline real-media revalidation still requires AVE_REAL_MEDIA_MANIFEST; Product real-media and direct human review require AVE_STAGE2_PRODUCT_PROJECT and AVE_STAGE2_PRODUCT_REVIEW_ROOT. DEBT-CA-STAGE2-003 remains active and Pipeline/Product stay tested.", "Exact-head remote security and check jobs plus review-thread refresh remain required after push.", "The local filesystem guarantee is bounded to AVE processes cooperating through the project lock; a non-cooperating same-user pathname attacker and power-loss parent-directory durability remain outside this claim.", "No PR merge is authorized."]
---

# WP-CA-MERGE-029 complete

The approved Story is now the exact first-cut authority, with deterministic
planned Beats, immutable Project-owned media and execution-bound Render
publication closed across normal local concurrency, rollback and reopen paths.
