# Issue #14: compiler-aligned feedback target eligibility

## Goal

Close the gap between the target list shown to a Stage 2 user and the existing Feedback trim compiler's fail-closed support boundary.

## Milestones

1. Extract the compiler support classification and map stable reason codes into the Host workspace projection.
2. Rebind `createFeedbackRevision` to the same classification before any persistent write.
3. Render unavailable-target reasons without making unsupported targets selectable.
4. Prove unsupported and stale inputs create no Diagnosis or Intent, then complete package evidence and Development Integration.

## Progress

- 2026-09-07: Reopened STAB-005 on the existing PR #22 branch after three actionable review findings. Remote checks passed the previous head, but do not prove these corrections.
- Reproduced ordinary material choices disappearing for speed, TimeMap, duration mismatch and source timebase mismatch. The same regression passes after separating protection from trim support.
- Workspace and pre-write Host validation now share bounded lineage traversal. Missing ancestors, cycles and overflow discard the entire collected lineage. Integration tests prove unavailable UI targets, digest invalidation, no authoritative writes and restoration; pure tests cover the exact 64/65-node boundary.
- Focused workspace, compiler, Host pipeline, typecheck and edit-ir tests passed. Frozen installation, full local check (including Stage 2) and final synthetic acceptance completed with exit 0; see [review precheck](../evidence/runs/EVD-20260907-WP-CA-STAB-005-REVIEW-PRECHECK.md). New remote checks remain pending for the corrected source.

## Surprises & Discoveries

The first completion record omitted required gate evidence. Keep it as history and supersede it with a fresh record after explicit successful exit codes. The protected ending clip is unavailable because of `contract_protected`; its semantic identity alone does not make it selectable.

## Decision Log

Keep ordinary `editable_targets` for material generation and feedback-specific arrays for scoped trim. Reuse the shared protection predicate and add only compiler restrictions to feedback. Keep the existing 64-node Host lineage limit and make the workspace agree.

## Validation and Recovery

Run focused tests, frozen installation, docs sync/check, full check and final synthetic acceptance. Complete with new Evidence, push normally to PR #22, resolve fixed threads and merge only the final checked SHA. Resume on this same unmerged branch; preserve generated boundaries and historical Evidence. Real-media/direct-human acceptance remains separately pending.

## Outcomes & Retrospective

Corrected-source full check and final synthetic acceptance passed with exit 0; see [final Evidence](../evidence/runs/EVD-20260907-WP-CA-STAB-005-FINAL.md). Exact-head remote integration remains pending.

- 2026-09-07: Integrated merged security PR #24, reproduced an exact-timestamp fixture failure, and preseeded the controlled immutable recovery fixture before Host verification. Production authority checks are unchanged. Focused product actions, full check and final synthetic acceptance passed.
