---
evidence_id: EVD-20260823-WP-CA-GOV-001-R2-PRECHECK
date: 2026-08-23
work_package_id: WP-CA-GOV-001
repository_commit: worktree-before-completion-commit
code_fingerprint: c10beca143e28d8729ac346b8cf21b3e8da4aa7b5d55409ab6ca75bedeb0e34e
capability_ids: [CAP-CA-GOV-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-CA-GOV-001]
commands: ["pnpm run docs:sync", "pnpm run docs:architecture:test", "pnpm run docs:fingerprint:test", "pnpm run docs:check"]
result: r2_precheck_passed_pending_current-evidence_recheck
environment: "Windows local checkout plus temporary Git-backed two-programme fixtures; no network, model, production service or media processing"
artifacts: ["shared fail-before-write topology validator", "staged generated/state writes", "sync/start/complete zero-write negative fixtures", "generated registered-programme index"]
remaining_risks: ["The first R2 docs:check correctly rejected the superseded governance fingerprint and is rerun after this PRECHECK becomes current.", "No Stage 2 application capability is implemented by this governance repair."]
---

# WP-CA-GOV-001 R2 PRECHECK

Independent read-only review reopened the package after finding that the first closure tested only a valid snapshot and overstated invalid-state coverage. R2 moves global programme, directory, Work Package, capability and acceptance uniqueness; dependency existence/completion; global active; manifest/STATE; and registry/active validation into one shared gate called by sync, start and complete before any write.

Executable fixtures now create temporary two-programme repositories and call the real sync/start/complete functions. Duplicate IDs, unknown and incomplete dependencies, two active packages and manifest/STATE mismatch are rejected with every registry, manifest, matrix, STATE, current and index file byte-identical before and after. Valid start/complete is exercised, and a no-active/two-ready snapshot proves both backlog entries remain ready while generated WORK and INDEX show both programmes.

Generated and state outputs are pre-rendered, staged to temporary sibling files and individually atomically renamed. ADR-0018 now records affected authorities, compatibility, failure behavior, validation and follow-up Work Orders. The initial R2 `docs:check` failed only because the prior governance Evidence fingerprint was intentionally superseded by these test/source changes.
