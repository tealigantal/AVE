---
evidence_id: EVD-20260827-WP-CA-MERGE-026-PRECHECK
date: 2026-08-27
work_package_id: WP-CA-MERGE-026
repository_commit: worktree-timeline-bound-material-regeneration-precheck
code_fingerprint: bfa324b5c4f1d87361a6df686340abd7162a9bfc9a17d3882a9ee6ea078e6c38
capability_ids: [CAP-CA-PRODUCT-001, CAP-CA-UX-001]
acceptance_ids: [ACC-CA-PRODUCT-001, ACC-CA-UX-001]
commands: ["pnpm run stage2-product-workspace:test", "pnpm run stage2-workspace-renderer:test", "pnpm run workbench:host:test", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "pnpm run docs:sync", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows local checkout; synthetic desktop Stage 2 project and generated P0 VFR fixture"
artifacts: ["material generation identity now includes the authoritative Timeline version", "an unrelated track-property edit advances Timeline v0 to v1 and makes the old Material Pack and Direction cards stale", "the existing current-candidate Renderer rule keeps Direction regeneration available with stale history", "regeneration reuses the exact current material permission but requests fresh approval for the new Timeline-bound Evidence set", "the new Timeline snapshot publishes a distinct sufficient Material Pack and two distinct current candidate Directions without object-version conflict", "same-workspace interrupted-generation retry remains covered", "focused Product Renderer Host type and architecture gates pass"]
remaining_risks: ["Full repository and synthetic completed-state gates remain to run after final Evidence publication.", "Exact-head remote Actions remain unavailable during GitHub's reported Actions outage and must be verified after recovery.", "Private real-media status is unchanged and no expanded creative capability is claimed.", "No PR merge is authorized."]
---

# WP-CA-MERGE-026 precheck

Material generation now derives a new immutable identity from each exact
Timeline authority while preserving same-workspace idempotency. The focused
desktop recovery regression and static gates pass at the frozen source
fingerprint.
