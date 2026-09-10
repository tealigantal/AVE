---
evidence_id: EVD-20260909-WP-CA-REAL-003-HARNESS-BLOCKED
date: 2026-09-09
work_package_id: WP-CA-REAL-003
repository_commit: worktree-real-product-audio-verified-harness-blocked
code_fingerprint: fa7c3d69db3eb8788211ab3f290a2bb8ff6d4c3f24b2d572adc51152ca79f857
capability_ids: [CAP-CA-PRODUCT-001]
acceptance_ids: [ACC-CA-PRODUCT-001]
commands: ["pnpm run check", "pnpm run acceptance:final:synthetic", "pnpm run basic-vlog-toolkit:test", "pnpm run worker:render-graph:test", "pnpm run timeline-render:test", "pnpm run stage2-product-workspace:real", "pnpm docs:sync", "pnpm docs:check", "git diff --check"]
result: blocked
environment: "Windows Node 22, Python and local FFmpeg; authorized external fixture and all review roots remain external"
artifacts: ["full pnpm run check passed", "final synthetic acceptance passed", "fresh full-duration current v5/r15 Preview and Master passed unchanged QC", "Electron canonical workspace and current Preview playback reached", "regression scope bindings in EVD-20260909-WP-CA-REAL-003-REGRESSION-PRECHECK"]
remaining_risks: ["Real Product acceptance is incomplete: the old test-owned Electron harness does not select a required feedback target or handle exact feedback-creation confirmation.", "Required harness and matching boundary-test allowed-path extension awaits user authorization.", "Direct human review, REAL-001, Stage Exit, remote CI and publication are not claimed."]
---

# Repair verified; current Electron acceptance harness blocked

The complete repository check command exited 0, including documentation,
Contract, architecture, Stage 2, Worker media, storage, Timeline and foundation
gates. Final synthetic acceptance exited 0. Exact r15 assertions and Worker
rejection of v4 (including a self-consistent old cache identity) also passed.
The final production source is the same source exercised by real r12.

Real r12 reached canonical Electron workspace and current Preview playback
after a full 60-second v5/r15 Preview/Master render passed unchanged QC. Its
feedback-generation timeout is not a render failure: the harness fills only
text and duration while the current UI requires an explicit target selection.
Read-only inspection confirms no new feedback diagnosis or permission record.
The harness also only simulates feedback rejection confirmation, while the
current production route requires a separate exact feedback-creation dialog.
Its quarter-second input bypasses the form's current step constraint.

The remaining narrow test-only change must select a current editable target,
submit a valid exact one-second trim through native form validation, simulate
only that exact feedback creation and subsequent rejection, and compare
pre-close/reopen stale-history IDs rather than require no historical stale
intents in a copied project. Corresponding architecture boundary assertions
and the current architecture description must agree with that narrow test
policy. Production confirmation, open validation and QC must remain unchanged.

Root AGENTS.md prohibits edits outside active allowed_paths unless the user
changes the package. The required existing Electron harness and its matching
boundary test are not currently allowed. Scope approval was requested and no
answer was received at this checkpoint. No edits to those files were made.
DEBT-CA-REAL-003-HARNESS records this blocker. No docs:complete command ran.
