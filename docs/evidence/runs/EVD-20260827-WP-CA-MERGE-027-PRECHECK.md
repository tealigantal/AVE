---
evidence_id: EVD-20260827-WP-CA-MERGE-027-PRECHECK
date: 2026-08-27
work_package_id: WP-CA-MERGE-027
repository_commit: worktree-stage2-duration-permission-closure-precheck
code_fingerprint: ce3037847fdb62b89ee05b30ea1c26c8deb97f8c9b733b13448767ecdaaa3635
capability_ids: [CAP-CA-CONTEXT-001, CAP-CA-PRODUCT-001, CAP-CA-UX-001]
acceptance_ids: [ACC-CA-INT-000-CONTRACT, ACC-CA-PRODUCT-001, ACC-CA-UX-001]
commands: ["pnpm run stage2-product-workspace:test", "pnpm run creative-context:test", "pnpm run ipc:boundary", "pnpm run desktop:boundary", "pnpm run workbench:host:test", "pnpm run electron:runtime:test", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows local checkout; isolated synthetic Stage 2 Product projects, SQLite zero-write counters and generated P0 VFR fixture"
artifacts: ["one Product-only resolver uses exact BigInt RationalTime equality against the unique published trusted built-in Duration Blueprint", "45-second Product creation rejects before Contract writes while all six supported catalog targets remain accepted", "a generic 90-second review Contract remains valid but Product approval rejects before approval permission or Contract-successor writes", "an already generically approved 90-second Contract is rejected again at Product material-generation preparation without Evidence or editorial writes", "the desktop safe media projection reads metadata.permission_state and continues to omit permission decision metadata", "focused Product Creative Context IPC desktop Electron type and architecture gates pass"]
remaining_risks: ["Full repository and synthetic completed-state gates remain to run after final Evidence publication.", "Independent final review and exact-head remote CI remain required.", "Private real-media status is unchanged and no expanded creative capability is claimed.", "No PR merge is authorized."]
---

# WP-CA-MERGE-027 precheck

The Product journey now accepts only exact uniquely supported Duration targets
at every mutation or generation boundary, while generic Contracts remain
independent and the desktop displays the authoritative media permission state.
