# WP-KF-CI-001 Exact High-Frame-Rate Timeline Boundary

## Outcome

Make the accepted 120 fps transform lane encode the exact frame count implied
by its RationalTime duration on supported FFmpeg versions, including the Linux
CI runtime that currently stops one stationary boundary frame early.

## Scope

- Preserve the declared timeline duration and target profile cadence through
  final Worker video normalization.
- Bound the normalized stream to the exact computed frame count without
  weakening the existing motion, duplicate-frame or duration assertions.
- Re-run Worker media correctness, repository gates and synthetic acceptance,
  then refresh the shared fingerprint and Evidence bindings.

## Non-goals

- No change to transform curves, geometry, user-visible motion or accepted
  capability scope.
- No contract, database, desktop, dependency or deployment change.
- No relaxation from 240 expected frames to 239 frames.
- No merge authorization.

## Validation

Run the Worker media-correctness test, full repository check, synthetic final
acceptance, documentation synchronization/checks, allowed-path audit and the
final-head PR `security` and `check` jobs.
