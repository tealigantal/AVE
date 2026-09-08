# WP-CA-REAL-002: Real Pipeline rebound-reason precedence

## Outcome

Restore the real-media Pipeline's fail-closed source-identity rebound assertion
without broadening rendering, media import, permission, Timeline or Stage 2
acceptance behavior.

## Scope and invariants

The Project Host must continue to reject every changed execution binding before
render persistence. When `execution_id` or Timeline authority is changed, the
existing execution-rebound result remains authoritative. When the supplied
source-identity digest alone is changed, the Host must reach and report the
specific source-identity rebound result. The real-media lane records its
already-proven explicit rejection of the inward-trim feedback, then renders the
unchanged accepted first cut; this avoids treating a QC-detected black gap as
an accepted output or expanding the product's current trim semantics. The
synthetic lane continues to prove accepted feedback execution, atomic recovery,
undo/redo and reopen. Preview, Master, QC, SQLite authority, immutable Original
checks, and zero-write rejection semantics do not change.

## Validation

Use the existing real Pipeline rebound cases as the focused regression, make
their normal render request reconstruct its profile from verified immutable
Original geometry rather than omitting plan-bound dimensions, and prove an
explicitly rejected feedback decision and the intact accepted first-cut render.
Run the Pipeline synthetic suite, feedback revision suite, then re-run the
authorized real Pipeline. Do not claim real-media
acceptance here: successful Pipeline output returns control to `WP-CA-REAL-001`
for the remaining Product, direct-human, Evidence and Stage Exit work.
