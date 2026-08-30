---
evidence_id: EVD-20260827-WP-CA-MERGE-028-COMPLETE
date: 2026-08-27
work_package_id: WP-CA-MERGE-028
repository_commit: worktree-story-positive-duration-complete
code_fingerprint: b87ec9d4760577eba026216c555dafb9cee84dad77fec3392d2a1c4c6746adf2
capability_ids: [CAP-CA-STORY-001]
acceptance_ids: [ACC-CA-INT-003-STORY]
commands: ["pnpm run story-intelligence:test", "pnpm run stage2-product-workspace:test", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "pnpm run docs:sync -- --check", "pnpm run docs:check", "pnpm run check", "pnpm run acceptance:final:synthetic", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed
environment: "Windows local checkout; isolated Story property and Project Host SQLite fixtures, generated P0 Stage 2 media fixture and complete repository synthetic acceptance"
artifacts: ["one Story-private exact fraction invariant rejects non-positive durations at proposal evaluation and defensive approval", "compensated zero-length beats cannot produce a candidate Decision or approved Story Plan", "positive 1 over 1000 and 59999 over 1000 beats remain exact and valid", "Project Host rejection preserves database-wide total_changes", "existing integer-duration Story approval and the complete Stage 2 Product journey pass", "public RationalTime schema storage Host source and Story artifact versions remain unchanged", "full repository and synthetic final acceptance pass at the exact source fingerprint", "independent code and test review report no P0 P1 or P2"]
remaining_risks: ["Private real-media status is unchanged and no expanded creative capability is claimed.", "Exact-head remote security and check jobs plus targeted review-thread verification remain required after push.", "No PR merge is authorized."]
---

# WP-CA-MERGE-028 complete

Story evaluation and approval now share a strictly positive exact-duration
invariant, while legitimate positive fractional beats and all existing user
journeys remain intact.
