---
evidence_id: EVD-20260828-WP-CA-MERGE-030-COMPLETE
date: 2026-08-28
work_package_id: WP-CA-MERGE-030
repository_commit: worktree-cross-platform-immutable-stat-complete
code_fingerprint: 5d0950683f3ef4391b92a0959012b38804da761167308c8c840929fe8f122715
capability_ids: [CAP-CA-CONTEXT-001]
acceptance_ids: [ACC-CA-INT-000-EVIDENCE]
commands: ["pnpm run creative-context:test", "pnpm run typecheck", "pnpm run stage2:check", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:architecture:test", "pnpm run docs:fingerprint:test", "pnpm run docs:sync", "pnpm run docs:check", "pnpm run check", "pnpm run acceptance:final:synthetic", "node scripts/docs/fingerprint.mjs", "git diff --check", "WP30 allowed-path audit"]
result: passed
environment: "Windows Node 22 local checkout; deterministic synthetic media; isolated Linux timestamp probe; no private media"
artifacts: ["Linux floating-point mtime replay is repaired by reconstructing the integer-millisecond Date originally supplied by Project Host", "the corruption fixture strictly restores registered size mtime and immutable protection before identity verification", "Worker media.fingerprint.v1 returns successfully and its digest exactly equals the controlled corrupted bytes before fail-closed stale-media rejection", "Creative Context Stage 2 type architecture Contracts storage Worker encoded-media Timeline Host complete repository and synthetic final gates pass", "all changed and untracked paths are inside WP30 allowed_paths and no production source differs from head 922d07ca", "independent final review reports no P0 P1 or new P2 in R3"]
remaining_risks: ["The pushed replacement exact head must pass remote security and check on GitHub Node 22/Linux before the branch is reported ready for review.", "Authorized external Pipeline and Product real-media inputs remain unavailable; real-media and direct human status remains tested and DEBT-CA-STAGE2-003 stays active.", "One non-blocking WP29 regression-coverage follow-up remains: combine a pre-link main failure with temporary-handle close failure and separately fault-inject a post-chmod internal failure.", "No PR merge is authorized."]
---

# WP-CA-MERGE-030 complete

The strict immutable-content regression is portable and now proves the exact
successful corrupted-content hash rather than a timestamp, permission or Worker
failure shortcut.
