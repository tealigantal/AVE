---
evidence_id: EVD-20260828-WP-CA-MERGE-030-R2-PRECHECK
date: 2026-08-28
work_package_id: WP-CA-MERGE-030
repository_commit: worktree-cross-platform-immutable-stat-r2-precheck
code_fingerprint: c1a1acb1a47f773583c766d38fc1f51497f395fe4fb3e9821297c0a8c2a27fff
capability_ids: [CAP-CA-CONTEXT-001]
acceptance_ids: [ACC-CA-INT-000-EVIDENCE]
commands: ["pnpm run creative-context:test", "pnpm run typecheck", "pnpm run stage2:check", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:architecture:test", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows Node 22 local checkout plus isolated Linux Node filesystem timestamp probe"
artifacts: ["This R2 Evidence corrects the first WP30 PRECHECK conclusion after independent review found that writable fixture mode could mask the intended hash path", "the corruption fixture now restores immutable protection and proves size mtime and mode exactly match registered authority before rejection", "an instrumented Worker boundary observes media.fingerprint.v1 against the immutable path before the expected stale-media result", "Creative Context Stage 2 type architecture and multi-programme governance gates pass", "production Project Host stat hash permission and filesystem authority code remains unchanged", "independent read-only review reports the P1 proof gap closed and no allowed-path violation"]
remaining_risks: ["The complete repository check and synthetic final acceptance must be repeated at the R2 fingerprint.", "The replacement exact head must pass remote security and check on GitHub Node 22/Linux.", "Authorized external Pipeline and Product real-media inputs remain unavailable and their status is unchanged.", "One non-blocking P2 regression-coverage follow-up from WP29 remains: combine a pre-link main failure with temporary-handle close failure and separately fault-inject a post-chmod internal failure.", "No PR merge is authorized."]
---

# WP-CA-MERGE-030 R2 precheck

R2 restores the immutable protection state and directly observes full content
hashing, superseding the first PRECHECK's incomplete proof without rewriting it.
