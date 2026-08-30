# WP-CA-STAB-004: Exact feedback RationalTime closure

## Outcome

Issue #15 removes the renderer's rounded seconds-to-PTS feedback trim conversion. A user-provided trim duration is one exact RationalTime declaration that is checked before native confirmation, persisted in Feedback Diagnosis, propagated into the local Edit Intent, revalidated by Project Host, compiled into the Command Edit IR and committed unchanged to the Timeline source range.

## Scope and boundaries

- Allowed: feedback contracts and generated validators, feedback policy/compiler/Host code, the Stage 2 desktop feedback request and native confirmation, and the focused property/integration/architecture tests listed in the Work Order and manifest.
- Forbidden: storage ownership changes, Worker/renderer execution changes, compatibility inputs, real-media acceptance, Stage Exit and Release claims.
- Inputs: a current Stage 2 output clip, a positive user decimal duration, and the clip's exact source PTS timescale.
- Output: an exact trim represented as RationalTime and exact source PTS; an unrepresentable or unsafe request is rejected before Diagnosis, Intent, Approval or Timeline writes.

## Invariants and implementation order

1. Parse user decimal text without floating-point conversion; reduce it into safe RationalTime and accept it only when its product with the source timescale is integral and safe.
2. Bind the exact RationalTime and derived PTS delta into Diagnosis and Intent; require the Host to recompute the same delta from the current target before persisting.
3. Display the exact duration, source range and PTS delta in the native confirmation before feedback creation; cancellation and all validation failures write nothing.
4. Recheck the persisted declaration during Edit IR compilation and require the exact proposed source range, operation declaration and final Timeline range to agree.
5. Cover 24 Hz rejection for 0.1 s, representable 24 Hz, 30000/1001, VFR-like source timebases, large safe PTS, MAX_SAFE boundaries, negative/zero, full removal, reopen and zero-write failures.

## Definition of Done

The only desktop feedback path and Host path reject approximation, retain exact RationalTime/PTS identity through all persisted artifacts and Timeline execution, have focused/full/remote green validation and a merged Issue #15 PR. This package makes no real-media or human-acceptance claim.
