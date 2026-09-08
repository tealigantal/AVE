# DOC-004 Current-document audit and remote checkpoint

## Purpose / scope

Independent documentation-only work authorized on 2026-09-09. AVE remains an
initialized important project. This living execution record belongs to the
engineering domain; existing implementation plans cannot own a repository-wide
document audit. No implementation package or acceptance is advanced by DOC-004.
Scope: repository documentation, historical/current distinction, generated
state verification, and the user-authorized commit/push without a PR.

## Plan and progress

- [x] Read authority routes, classify scope and inspect Git state.
- [x] Independently review current specifications, root routes and plans.
- [x] Correct stale requirements and preserve immutable historical evidence.
- [x] Run docs sync/check, documentation architecture/fingerprint checks and diff review.
- [x] Record independent Evidence and prepare the verified worktree for the
  authorized commit/push; the resulting Git commit and remote ref are the
  checkpoint record.

## Decisions and discoveries

Keep one current requirement per authority. Historical Evidence, ADRs and
completed package requirements are retained as historical, never rewritten
into evidence for current code. The backend specification still pinned v4/r14
and incorrectly called all ducking/loudness work blocked. The active plan had
outdated missing-input and old-version statements. The prior uncommitted
applicability index retagged historical scope fingerprints; restore existing
HEAD bindings while preserving genuinely new entries.

## Validation and recovery

Run pnpm docs:sync, docs:check, docs:architecture:test, docs:fingerprint:test,
and git diff --check. Source code remains at the already tested fingerprint;
no repeat full-suite run is needed unless that fingerprint changes. Preserve
historical media/Evidence and unrelated work. Push without force to the current
feature branch; do not create PR, merge, or deploy.

## Outcome

Document audit complete; remote checkpoint is the final Git operation.
Evidence: [DOC-004 audit](../evidence/runs/EVD-20260909-DOC-004-CURRENTNESS-AUDIT.md).
Final commit/push success is verified from Git rather than predicted here.


Final review corrected whole-family blocker wording for registered x/y curve
and fixed-size rectangular tracking subsets. All 745 document/metadata files
were inventoried; 477 are archive/Evidence/decision records. No old v1-v4/r10-r14
identity remains in current nonhistorical authority text. Existing 2402
historical index entries match HEAD exactly; only two prior new entries remain.
Changing historical package text would alter its capability scope, so historical
classification is centralized in the authority map and the package text stays
unchanged. An initial parallel docs gate hit the publication lock; sequential
rerun passed. No code changes were made in DOC-004.
