---
evidence_id: EVD-20260828-WP-CA-MERGE-030-PRECHECK
date: 2026-08-28
work_package_id: WP-CA-MERGE-030
repository_commit: worktree-cross-platform-immutable-stat-precheck
code_fingerprint: 67ddb30617710583727dd70c4462f8cd416612ccfa37803b80723a2b54e5ca04
capability_ids: [CAP-CA-CONTEXT-001]
acceptance_ids: [ACC-CA-INT-000-EVIDENCE]
commands: ["pnpm run creative-context:test", "pnpm run stage2:check", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:architecture:test", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows Node 22 local checkout plus isolated Linux Node filesystem timestamp probe"
artifacts: ["GitHub Actions run 33097064400 exact head 922d07ca failed only because Linux mtimeMs replay moved one millisecond before the intended content-hash assertion", "rounding persisted mtimeMs reconstructs the integer-millisecond Date originally supplied by Project Host and preserves strict Linux mtimeMs equality", "Creative Context and complete Stage 2 aggregate pass with the exact stat-equality and content-hash corruption assertions unchanged", "type architecture and multi-programme governance transition gates pass", "production Project Host stat hash permission and filesystem authority code is unchanged"]
remaining_risks: ["Documentation fingerprint reconciliation, complete repository check and synthetic final acceptance remain to run.", "The replacement exact head must pass remote security and check on GitHub Node 22/Linux.", "Authorized external Pipeline and Product real-media inputs remain unavailable and their status is unchanged.", "One non-blocking P2 regression-coverage follow-up from WP29 remains: combine a pre-link main failure with temporary-handle close failure and separately fault-inject a post-chmod internal failure.", "No PR merge is authorized."]
---

# WP-CA-MERGE-030 precheck

The immutable-content corruption fixture now replays Project Host's original
integer-millisecond timestamp portably while retaining exact stat disguise and
full content-hash detection.
