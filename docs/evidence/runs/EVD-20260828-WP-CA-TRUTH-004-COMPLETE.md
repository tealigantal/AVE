---
evidence_id: EVD-20260828-WP-CA-TRUTH-004-COMPLETE
date: 2026-08-28
work_package_id: WP-CA-TRUTH-004
repository_commit: worktree-cross-platform-immutable-media-precision-complete
code_fingerprint: a11397c06392299650e8b49cff93bcad00a73d93bd8cbcf8e20b7a6a0d9fd280
capability_ids: [CAP-CA-PRODUCT-001, CAP-CA-EXIT-001]
acceptance_ids: [ACC-CA-PRODUCT-001, ACC-CA-EXIT-001]
commands: ["pnpm run stage2-product-workspace:test", "pnpm run check", "pnpm run docs:sync", "pnpm run docs:check", "git diff --check", "independent read-only source review", "independent read-only governance review"]
result: passed
environment: "Windows Node 22 local checkout; numeric immutable-media mtime restoration with Linux precision semantics"
artifacts: ["four exact numeric-seconds fixture restoration paths", "stale-before-restore and sufficient-after-restore assertions", "complete repository check", "TRUTH-004 to REAL-001 dependency binding"]
remaining_risks: ["Exact pushed-SHA Linux CI is a WP-CA-EXIT-002 gate and remains to run after push.", "WP-CA-REAL-001 remains blocked on absent authorized external inputs.", "WP-CA-EXIT-002 cannot start and the branch is not merge-ready.", "No PR merge is authorized."]
---

# WP-CA-TRUTH-004 complete

The immutable-media recovery fixture now restores the persisted fractional
mtime through numeric seconds on every path. The Host's exact size, mtime and
content-hash identity checks remain unchanged. The Stage 2 Product gate, full
repository check and independent source/governance reviews passed with no
remaining P0/P1/P2 in this package.
