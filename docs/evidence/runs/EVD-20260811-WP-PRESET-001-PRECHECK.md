---
evidence_id: EVD-20260811-WP-PRESET-001-PRECHECK
date: 2026-08-11
work_package_id: WP-PRESET-001
repository_commit: worktree-before-draft-pr
code_fingerprint: e8bae703d07a47553b4d6c03bad43cbb9be5a90cc79581959a6a3d6c386e7ef5
capability_ids: [CAP-PRESET-001, CAP-RENDER-001]
acceptance_ids: [ACC-015, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026]
commands: ["pnpm run check", "pnpm run typecheck", "pnpm run architecture", "pnpm run contracts:generate", "pnpm run contracts:check", "pnpm run contracts:compatibility", "pnpm run contracts:clean", "pnpm run edit-ir:test", "pnpm run timeline-core:test", "pnpm run render-graph:test", "pnpm run commit-plan:test", "pnpm run timeline:host:test", "pnpm run undo-redo:test", "pnpm run project-recovery:test", "pnpm run storage:check", "pnpm run acceptance:final:synthetic", "pnpm run acceptance:basic-vlog:real-review", "pnpm audit --audit-level high"]
result: feature_machine_validation_passed_human_review_pending_repository_security_gate_failed_preexisting
environment: "Windows local checkout; repository tests and licensed CC BY 3.0 real-media derivatives remained local; no media committed"
artifacts: ["local-review-bundle:AVE-preset-review-20260811-v5", "preview.mp4 sha256:58b2f5349f07d5b3815598fb0dff64c8e7484361bf94b886833a5a79ae0e7c73", "master.mp4 sha256:5f735d7bc6f444bc58ac710812dd9174bb6772028897cc4e17a1fbef8a4b6e33", "REVIEW.json sha256:2d2843a8503d98bc12c94083d0aa86dd8e3f17c2deec90d6b91e6eed18519d26", "BLOCKER-EXAMPLES.json sha256:8890bc6f18926af6467f328a0d575c12b1e3d6e601002c358aa320fee240f8c2", "SOURCE-ATTRIBUTION.md sha256:c5d5eae02c13bee686459abfb785a29beab1b457ec96fe96b93fcbafa37a4e80"]
remaining_risks: ["ACC-026 user visual, audio, attribution and diagnostic review remains pending.", "External Marketplace execution, third-party executable Skills, Graphic Bake and AI Asset backends remain unavailable and fail closed.", "The repository-wide audit still reports the pre-existing fast-uri advisory; dependency files are outside this work package's allowed paths."]
---

# WP-PRESET-001 machine precheck evidence

The data-only Preset registry now uses exact ID/version plus a canonical definition digest, canonical deep snapshots and repository-only built-in provenance. Exported repository definitions are deeply frozen before registry creation. Restricted parameter/default validation, every declared category, explicit migration, semantic dependencies, invalid/null Skill output and post-registration mutation were exercised. Explicit null never falls through to a default. A Creative Skill can emit only ordered typed selections; compilation produces ordinary Timeline Commands and rejects arbitrary commands, backend strings and executable fields.

Project Host applies the full ordered command set with one CommitPlan and stores the application record in the same SQLite transaction. The record contains canonical command payload, exact definition pins, application context, policy/routing decisions and explicit links from each declared semantic to actual Preview/Master ExecutionPlan node IDs. Each route must first match the audited capability set emitted by its compiler, so an unrelated existing graph node cannot satisfy a false definition. Invalid Timeline bindings, stale versions, conflicting retries, unsupported parameter-level render semantics and persistence faults leave Timeline unchanged and persist a blocker where business validation completed. An explicit local v1-to-v2 migration produced a second exact pin and Commit, then preserved both application records and the v2 Timeline after close/reopen.

Trust and asset checks fail closed. External definitions cannot self-declare built-in provenance; Marketplace definitions stay quarantined; project-local definitions require their exact digest; unknown, pending, expired or revoked licenses block; and a registered asset whose current bytes do not match its content-addressed identity is unavailable. Graphic Bake remains a blocker because no executable backend exists.

The fresh v5 licensed real-media bundle applied two `basic_vertical_vlog@1` selections through the generic Host path, reopened successfully, produced 360x640 H.264/AAC Preview and original-backed Master of 12.1 seconds, and passed automated QC. Master measured -14.37 LUFS and -1.27 dBTP; dialogue/music Ducking was applied. The repository records only stable hashes and attribution identity, not the media or local filesystem paths.

ACC-020 through ACC-025 are machine-tested. ACC-026 and work-package completion remain open until the user reviews the A/B image composition, fades, caption, audio naturalness, Preview/Master subjective equivalence, attribution and blocker explanations from the draft PR handoff.

The complete repository check passed on the final current-fingerprint run. Earlier attempts intermittently failed the pre-existing encoded Basic Vlog Ducking recovery sampling assertion; focused reruns and the final complete run passed without source changes. The security audit still fails on the inherited `fast-uri >=3.0.0 <3.1.5` advisory through `ajv`; the patched dependency/lock files are outside WP-PRESET-001 Allowed Paths, so this PRECHECK does not conceal or waive that repository-level merge blocker.
