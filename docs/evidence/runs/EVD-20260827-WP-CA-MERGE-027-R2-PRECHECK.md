---
evidence_id: EVD-20260827-WP-CA-MERGE-027-R2-PRECHECK
date: 2026-08-27
work_package_id: WP-CA-MERGE-027
repository_commit: worktree-stage2-duration-permission-closure-r2-precheck
code_fingerprint: 4529ba136066f712766599018250ae44a2c40a7e8b7fbe9969014c810777f9eb
capability_ids: [CAP-CA-CONTEXT-001, CAP-CA-PRODUCT-001, CAP-CA-UX-001]
acceptance_ids: [ACC-CA-INT-000-CONTRACT, ACC-CA-PRODUCT-001, ACC-CA-UX-001]
commands: ["pnpm run stage2-product-workspace:test", "pnpm run creative-context:test", "pnpm run ipc:boundary", "pnpm run desktop:boundary", "pnpm run workbench:host:test", "pnpm run electron:runtime:test", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows local checkout; isolated synthetic Stage 2 Product projects, SQLite total-change snapshots and generated P0 VFR fixture"
artifacts: ["one Product-only resolver uses exact BigInt RationalTime equality against the unique published trusted built-in Duration Blueprint", "45-second Product creation and 90-second Product approval reject with zero total SQLite changes while all six supported catalog targets remain accepted", "a 120 over 2 RationalTime Contract is approved as exactly equivalent to the trusted 60-second Blueprint", "an already generically approved 90-second Contract is rejected again at Product material-generation preparation with zero total SQLite changes", "the pure desktop safe media projection behavior covers authorized denied and absent states with exact key whitelists and no private metadata", "the IPC handler is statically bound to that pure projection", "focused Product Creative Context IPC desktop Electron type and architecture gates pass", "independent code review reports no P0 P1 or P2"]
remaining_risks: ["Full repository and synthetic completed-state gates remain to run after final Evidence publication.", "Independent final test and governance review plus exact-head remote CI remain required.", "Private real-media status is unchanged and no expanded creative capability is claimed.", "No PR merge is authorized."]
---

# WP-CA-MERGE-027 R2 precheck

The strengthened Product and desktop boundary closure proves exact non-unit
RationalTime equivalence, database-wide zero-write rejection and executable
safe-row behavior in addition to the original focused repair.
