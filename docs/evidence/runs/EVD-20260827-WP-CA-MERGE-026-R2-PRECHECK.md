---
evidence_id: EVD-20260827-WP-CA-MERGE-026-R2-PRECHECK
date: 2026-08-27
work_package_id: WP-CA-MERGE-026
repository_commit: worktree-authority-bound-material-regeneration-precheck
code_fingerprint: 2ab964e50724c80f6e917e18061e15d97da16e6d0b1c8efcf41b92f12c8e5495
capability_ids: [CAP-CA-PRODUCT-001, CAP-CA-UX-001]
acceptance_ids: [ACC-CA-PRODUCT-001, ACC-CA-UX-001]
commands: ["pnpm run stage2-product-workspace:test", "pnpm run stage2-workspace-renderer:test", "pnpm run workbench:host:test", "pnpm run typecheck", "pnpm run architecture", "pnpm run architecture:test", "node scripts/docs/fingerprint.mjs", "git diff --check"]
result: passed_precheck
environment: "Windows local checkout; synthetic desktop Stage 2 project and generated P0 VFR fixture"
artifacts: ["material generation identity includes the authoritative Timeline version and hashed current Original location authority", "Timeline v0 to v1 invalidates the old Material Pack and Direction chain and regenerates distinct current identities", "same-content same-path Original relink invalidates the regenerated chain and requests one fresh exact material permission plus fresh Evidence approvals", "relink recovery publishes a distinct sufficient Material Pack and two distinct current candidate Directions without version conflict", "an exact retry against the recovered authority snapshot performs zero writes", "focused Product Renderer Host type and architecture gates pass"]
remaining_risks: ["Full repository and synthetic completed-state gates remain to run after final Evidence publication.", "Exact-head remote Actions remain unavailable during GitHub's reported Actions outage and must be verified after recovery.", "Private real-media status is unchanged and no expanded creative capability is claimed.", "No PR merge is authorized."]
---

# WP-CA-MERGE-026 R2 precheck

Material generation now derives a new immutable chain from either Timeline or
exact Original location authority changes, while exact retries under the same
authority snapshot remain idempotent.
