---
evidence_id: EVD-20260828-WP-CA-MERGE-029-PRECHECK
date: 2026-08-28
work_package_id: WP-CA-MERGE-029
repository_commit: worktree-approved-story-immutable-authority-precheck
code_fingerprint: 104192469a65fc581a856a09cb78772b86c6aa5531bf5a7eea49cb6f6f763946
capability_ids: [CAP-CA-STORY-001, CAP-CA-PIPELINE-001, CAP-CA-PRODUCT-001]
acceptance_ids: [ACC-CA-INT-003-STORY, ACC-CA-PIPE-001, ACC-CA-PRODUCT-001]
commands: ["pnpm run stage2:check", "pnpm run workbench:host:test", "pnpm run ipc:boundary", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:architecture:test", "pnpm run docs:fingerprint:test", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows local checkout; generated deterministic Stage 2 media, SQLite, desktop Host, IPC, Worker render and filesystem race fixtures"
artifacts: ["Product generation emits the exact trusted planned Beat count with strictly positive RationalTime budgets and deterministic role and total preservation", "Story evaluation and approval bind the same current Duration plan while the semantic compiler requires complete bijective per-Beat unit-speed Evidence coverage", "missing duplicate overlapping ranged audio-promise retimed and non-neutral destination variants reject before authoritative Timeline mutation", "Project-owned immutable Original publication is no-clobber identity-bound single-link and read-only with explicit permission restoration and cleanup compensation", "fault-injected temporary close failure leaves no owned temporary or final inode and session close waits accepted same-asset mutation tails", "execution-bound Render persists the exact execution id and source authority and publishes no Bundle run or result after content policy execution or Promise-continuation rebound", "desktop media projection exposes only public Original and Proxy locations while the Product workspace digest binds visible Evidence identity and lifecycle", "focused Stage 2 type Contract architecture documentation Workbench and IPC gates pass; independent source review reports no P0 or P1"]
remaining_risks: ["Complete repository and synthetic final acceptance must run after PRECHECK Evidence reconciliation.", "Authorized external inputs are unavailable: Pipeline requires AVE_REAL_MEDIA_MANIFEST, while Product requires AVE_STAGE2_PRODUCT_PROJECT and AVE_STAGE2_PRODUCT_REVIEW_ROOT. Their real-media and direct human acceptance remain tested rather than passed and DEBT-CA-STAGE2-003 stays active.", "Exact-head remote security and check jobs plus review-thread refresh remain required after push.", "The local filesystem guarantee is bounded to AVE processes cooperating through the project lock; a non-cooperating same-user pathname attacker and power-loss parent-directory durability are outside this claim.", "No PR merge is authorized."]
---

# WP-CA-MERGE-029 precheck

The approved Story now determines the exact first-cut Beat coverage and duration,
while immutable Original and execution-bound Render authority fail closed across
normal local concurrency and compensation paths.
