---
evidence_id: EVD-20260823-PROGRAMME-STATUS-R6-PRECHECK
date: 2026-08-23
work_package_id: WP-KF-002
repository_commit: worktree-programme-status-r6-audit
code_fingerprint: fb1d3b3ff08033f0fea4f9e284851743bb1589fa45151da63d9c1426423acc0e
capability_ids: [CAP-TL-001, CAP-KF-001, CAP-XFORM-001, CAP-COMP-001, CAP-TIME-001, CAP-TRANS-001, CAP-COLOR-001, CAP-MASK-001, CAP-TEXT-001, CAP-AUDIO-001, CAP-RENDER-001, CAP-PRESET-001, CAP-FND-001]
acceptance_ids: [ACC-001, ACC-002, ACC-003, ACC-004, ACC-005, ACC-006, ACC-007, ACC-008, ACC-009, ACC-010, ACC-011, ACC-012, ACC-013, ACC-014, ACC-015, ACC-016, ACC-017, ACC-018, ACC-019, ACC-020, ACC-021, ACC-022, ACC-023, ACC-024, ACC-025, ACC-026, ACC-027, ACC-028, ACC-029, ACC-030, ACC-031, ACC-032, ACC-033, ACC-034, ACC-035]
commands: ["pnpm run acceptance:transform-automation:real with fresh run-20260823-v38", "FFplay byte-identical v36 Master for two complete twelve-second playback cycles", "pnpm run worker:render-correctness:test", "pnpm run worker:render-graph:test", "pnpm run worker:python:lint", "pnpm run worker:python:typecheck", "pnpm run typecheck", "pnpm run timeline-render:test", "pnpm run docs:sync", "pnpm run docs:check", "pnpm run check", "git diff --check"]
result: current_fingerprint_status_reconciled_without_capability_promotion
environment: "Windows local checkout; current worktree source, tests, machine-readable programme and generated current-state documents; no deployment, model call, network service or media publication"
artifacts: ["current CAPABILITY_MATRIX and ACCEPTANCE_MATRIX", "current STATE and generated current status/debt/work/validation", "active WP-KF-002 R6 fractional-position machine and agent-visual PRECHECK", "immutable prior user-rejection artifacts and superseded PRECHECK Evidence retained at their original fingerprints"]
remaining_risks: ["This status Evidence does not replace the acceptance-specific Evidence required to implement, test or accept any capability.", "The aggregate pnpm run check passed every gate through current Worker media correctness but twice stopped at an unrelated existing Basic Vlog ducking recovery amplitude assertion; isolated execution passed once and later reproduced the same nondeterminism. No out-of-scope test was changed.", "Broad advanced capabilities and ACC-001 through ACC-011 remain blocked where the current matrices say blocked.", "WP-KF-002 and ACC-035 remain active/blocked pending retained v38 user review."]
---

# Editing Execution v1 current-fingerprint R6 status PRECHECK

This record binds unchanged programme capability statuses, active Debt and
generated navigation to the R6 source fingerprint after replacing the
half-pixel position-only path with bounded direct fractional translation for
safe opaque inputs. It supersedes R5 only as the matrix's current-fingerprint
status reference; it does not rewrite historical Evidence and promotes no
capability.

Capability-specific implementation and acceptance remain governed by their
own Evidence. `ACC-035` has 120 fps machine and agent-visual PRECHECK artifacts
but remains blocked pending user review. Both parent capability families and
all unrelated blocked programme scopes retain their status.
