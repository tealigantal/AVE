---
evidence_id: EVD-20260828-WP-CA-MERGE-030-R3-PRECHECK
date: 2026-08-28
work_package_id: WP-CA-MERGE-030
repository_commit: worktree-cross-platform-immutable-stat-r3-precheck
code_fingerprint: 5d0950683f3ef4391b92a0959012b38804da761167308c8c840929fe8f122715
capability_ids: [CAP-CA-CONTEXT-001]
acceptance_ids: [ACC-CA-INT-000-EVIDENCE]
commands: ["pnpm run creative-context:test", "pnpm run typecheck", "pnpm run stage2:check", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:architecture:test", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows Node 22 local checkout plus isolated Linux Node filesystem timestamp probe"
artifacts: ["This R3 Evidence supersedes the R2 submission-only fingerprint observation while preserving the R2 mode and exact-stat corrections", "the fixture reconstructs the Host integer-millisecond timestamp and strictly matches persisted size mtime and immutable mode", "Worker media.fingerprint.v1 must return successfully and its digest must equal the SHA-256 of the controlled corrupted bytes before the expected stale-media rejection counts as proved", "Creative Context Stage 2 type architecture and multi-programme governance gates pass", "production Project Host stat hash permission and filesystem authority code remains unchanged", "independent review reports no P0 or P1 and its final P2 false-positive concern is now closed"]
remaining_risks: ["The complete repository check and synthetic final acceptance must run at the R3 fingerprint.", "The replacement exact head must pass remote security and check on GitHub Node 22/Linux.", "Authorized external Pipeline and Product real-media inputs remain unavailable and their status is unchanged.", "One non-blocking P2 regression-coverage follow-up from WP29 remains: combine a pre-link main failure with temporary-handle close failure and separately fault-inject a post-chmod internal failure.", "No PR merge is authorized."]
---

# WP-CA-MERGE-030 R3 precheck

R3 proves a successful full hash returned the exact corrupted-content digest;
Worker failure can no longer satisfy the regression accidentally.
