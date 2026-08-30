---
evidence_id: EVD-20260827-WP-CA-MERGE-028-PRECHECK
date: 2026-08-27
work_package_id: WP-CA-MERGE-028
repository_commit: worktree-story-positive-duration-precheck
code_fingerprint: b87ec9d4760577eba026216c555dafb9cee84dad77fec3392d2a1c4c6746adf2
capability_ids: [CAP-CA-STORY-001]
acceptance_ids: [ACC-CA-INT-003-STORY]
commands: ["pnpm run story-intelligence:test", "pnpm run stage2-product-workspace:test", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows local checkout; isolated Story property and Project Host SQLite fixtures plus generated P0 Stage 2 media fixture"
artifacts: ["Story evaluation rejects a zero-length beat even when another beat preserves the exact feasible total", "Story approval independently rejects an exact-digest legacy or forged zero-beat candidate before creating a Decision or Plan", "positive 1 over 1000 and 59999 over 1000 RationalTime beats preserve their exact values and remain valid", "Project Host rejection leaves SQLite total_changes unchanged", "the existing 60-second Stage 2 Product journey and contract drift gates pass", "independent code and test review report no P0 P1 or P2"]
remaining_risks: ["Full repository and synthetic completed-state gates remain to run after final Evidence publication.", "Independent governance review and exact-head remote CI remain required.", "Private real-media status is unchanged and no expanded creative capability is claimed.", "No PR merge is authorized."]
---

# WP-CA-MERGE-028 precheck

Story Beat duration is now strictly positive at both evaluation and approval,
with exact positive fractional durations preserved and Host rejection proven
database-wide write-free.
