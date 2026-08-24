# WP-KF-002 Registered Transform Automation Execution

## User-visible outcome

A creator can commit and reopen numeric transform automation, then render
Preview and verified-Original Master in which position, scale, rotation, anchor
and opacity visibly follow the same target-neutral curve semantics.

## Capability and acceptance IDs

- `CAP-KF-001`
- `CAP-XFORM-001`
- `ACC-035`

This is a bounded execution slice. Completing it does not establish full
`CAP-KF-001`, full `CAP-XFORM-001`, `ACC-001`, or `ACC-002`.

## Current code boundary

- Timeline Core registers and validates numeric automation paths for x/y,
  independent scale x/y, rotation, anchor x/y and opacity; unknown
  interpolation and non-visible targets reject before commit.
- RenderGraph emits one resolver node per admitted curve and performs
  target-specific raster/resource preflight from Host-verified source geometry.
- Worker evaluates the same Hermite/linear/hold formula, re-probes source
  geometry and pixel format, evaluates dynamic transforms on the target profile
  clock, applies explicit scale rasterization, uses a bounded source-envelope
  rotation surface, and gives safely in-canvas opaque position-only animation a
  direct per-frame fractional translation. Edge-crossing or alpha-bearing
  inputs retain the bounded 2x/Lanczos fallback after doubled canvas/content
  resource preflight.
- Static transform anchor/original-size, 4K geometry automation and dynamic
  subject-aware reframe retain explicit blockers and are not silently
  normalized.

## Specifications and plan

- `docs/specifications/editing-execution-v1/AUTOMATION_CURVES.md`
- `docs/specifications/editing-execution-v1/TRANSFORM_AND_COMPOSITING.md`
- `docs/plans/2026-08-23-registered-transform-automation.md`

## Dependencies

- `WP-FND-001`
- `WP-ADV-001`

`WP-ADV-002` is a blocked historical package and is intentionally not a
dependency.

## Allowed and forbidden paths

The exact narrow paths are in `EXECUTION_MANIFEST.yaml`. `apps/desktop/**`,
`contracts/**`, `database/**`, `packages/platform/project-storage/**`,
`packages/platform/worker-client/**`, and `docs/archive/**` are forbidden.
Generated current documents and `docs/DOCUMENT_INDEX.md` change only through
`docs:sync`.

## Required behavior

- Registered numeric transform automation paths produce explicit RenderGraph
  decisions and visible encoded changes over time.
- Property units, defaults, composition order and anchor semantics are
  deterministic and identical at the target-neutral Preview/Master boundary.
- Project Host commits through the existing CommandEditIntent, CommandEditIR
  and CommitPlan path; close/reopen preserves curves and provenance.
- Invalid tangents, non-finite or out-of-range values, wrong value kinds,
  unknown paths/interpolation, non-visible targets, missing sources, unsafe
  raster/resource envelopes and unsupported combinations fail before
  successful publication.
- Rejected Timeline Commands leave Timeline version, events and artifacts
  unchanged; render blockers publish no successful media bundle.

## Explicit non-goals

- Three-track PiP family acceptance or promotion of `ACC-001`.
- Subject detection, face/object following, dynamic reframe or `ACC-002`.
- Static `fit: original` completion.
- Non-transform automation such as text, effects, masks, audio or time remap.
- Completing either parent capability family.
- Desktop UI, model calls, new network services or a new production dependency.

## Evidence requirements

Create current-fingerprint PRECHECK and COMPLETE Evidence containing exact
commands, Commit/reopen assertions, Preview/Master semantic identities,
per-property Worker measurements, encoded Preview and Master frame
measurements including target-profile cadence before curve evaluation,
monotonic review geometry, decoded-frame duplicate cadence, bounded direct
fractional position sampling and 2x fallback, artifact hashes and all negative outcomes. The
human smoothness sample may isolate position, but combined and isolated
scale/rotation/anchor/opacity execution must remain machine-tested. Use
authorized repository-external media for the real lane and keep it outside Git.

## Definition of Done

`ACC-035` passes success, encoded output, persistence/reopen, Preview/Master
identity and failure-closure assertions. Focused and repository gates pass,
real artifacts are reviewed, and no broader capability or acceptance status is
promoted.
