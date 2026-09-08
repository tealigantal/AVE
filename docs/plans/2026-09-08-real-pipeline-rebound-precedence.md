# Real Pipeline rebound-reason precedence ExecPlan

Completed execution record. Earlier pause, active and blocked checkpoints below
are historical and superseded by the final completion record. The current
work package is governed by [generated current work](../current/WORK.md),
not by those earlier checkpoints.

## Goal

Repair the specific real-media Pipeline failure where changing only the
supplied source-identity digest is rejected by the generic execution-binding
check before the specific source-identity check can run.

## Progress

- 2026-09-08: Authorized real Pipeline reproduced the failure on current main
  baseline: expected `SEMANTIC_RENDER_SOURCE_IDENTITY_REBOUND`, received
  `SEMANTIC_RENDER_EXECUTION_REBOUND`. The synthetic Pipeline suite passes
  because this real-media-only assertion is not exercised there.
- 2026-09-08: After restoring per-field rebound precedence, the normal real
  render exposed a second masked test defect: its replay omitted the verified
  source geometry that is part of the execution-bound plan. The repair derives
  width and height from immutable Original probe metadata.
- 2026-09-08: With exact replay restored, QC correctly found a one-second black
  gap after an accepted inward trim. The compiler shortened the target but left
  later contiguous clips at their previous starts. The real-media lane now
  records the already-exercised explicit rejection of that feedback and renders
  the intact accepted first cut. The synthetic lane retains accepted-feedback,
  atomic-recovery and undo/redo coverage. No unscoped ripple behavior is added.
- 2026-09-08: The focused synthetic Pipeline and feedback suites, typecheck and
  architecture checks passed. The authorized real Pipeline produced matching
  QC-passed 60-second Preview and Master artifacts in a repository-external
  review root. Direct Electron and human acceptance remain owned by
  `WP-CA-REAL-001`.

## Decision

Keep fail-closed behavior. Narrow the execution-row lookup to identity and
Timeline authority, then retain explicit checks for source identity, semantic
graph and plans in their existing ordered validations. This preserves rejection
and zero persistence while restoring the diagnostic contract.

## Validation and recovery

Run the focused Pipeline suite and the authorized real Pipeline. If the real
Pipeline passes, do not claim acceptance; resume `WP-CA-REAL-001` for Product
and direct-human review. No media, local manifest, source copy or review output
is tracked by Git.
