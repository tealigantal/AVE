# WP-XFORM-002 Static Native-Size Anchor Placement

## User-visible outcome

A creator can place a clip at its logical Original pixel size with a normalized
static anchor, commit the edit, render matching Preview and verified-Original
Master geometry, and reopen the project without the placement changing.

## Capability and acceptance IDs

- `CAP-XFORM-001`
- `ACC-036`

This is one bounded static transform tool. Completing it does not establish
full `CAP-XFORM-001`, `ACC-001` or `ACC-002`.

## Current code boundary

- Timeline `Transform` already admits `x`, `y`, independent scale, rotation,
  `anchor_x/y`, opacity and `fit: original`.
- RenderGraph currently emits explicit
  `TRANSFORM_ANCHOR_RENDER_UNSUPPORTED` and
  `TRANSFORM_ORIGINAL_SIZE_RENDER_UNSUPPORTED` blockers.
- Worker has the registered transform execution seam and verified source probe
  facts, but rejects static anchor before compilation.

## Specifications and plan

- `docs/specifications/editing-execution-v1/TRANSFORM_AND_COMPOSITING.md`
- `docs/plans/2026-08-23-static-native-size-anchor.md`

## Dependencies

- `WP-FND-001`
- `WP-KF-002`

The withdrawn `WP-ADV-002` package is not a dependency.

## Required behavior

- `fit: original` uses Host-verified logical Original display dimensions as
  the pre-transform raster size for both targets; a Preview proxy is resampled
  to that logical geometry rather than redefining the semantic size.
- `anchor_x/y` are normalized pre-transform coordinates in `[0,1]`, default to
  zero when omitted, and `x/y` place the transformed anchor on the output
  canvas.
- Independent scale, static rotation and opacity compose in the existing
  transform order without an implicit contain, crop or center operation.
- Preview and Master share one target-neutral Transform payload and measurable
  normalized geometry while retaining target-specific sources and plans.
- Commit/reopen preserves the exact static Transform and provenance.
- Missing or mismatched Original geometry, invalid anchors, unsafe raster
  envelopes and unsupported combinations block before successful publication.

## Explicit non-goals

- Automation combined with `fit: original` or static anchors.
- StaticReframe, crop, flip, Fit/Fill/Stretch composition.
- Subject detection, tracking, dynamic reframe, corner pin or safe-area tools.
- 4K or otherwise unbounded raster allocation.
- Completing `CAP-XFORM-001`, `ACC-001` or `ACC-002`.
- Desktop UI, model calls, network services, contracts or database migrations.

## Evidence requirements

Create current-fingerprint PRECHECK and COMPLETE Evidence with exact committed
Transform values, Host-verified Original geometry, target-specific selected
source facts, encoded Preview/Master geometry and hashes, close/reopen results,
resource preflight and negative publication outcomes. Use authorized
repository-external media and keep it outside Git. Human review is limited to
the exact native-size anchor-placement artifact.

## Definition of Done

`ACC-036` passes encoded geometry, Preview/Master semantic identity,
commit/reopen, resource bounds, failure closure, focused and repository gates,
and the exact retained artifact is reviewed without promoting broader
transform or reframe scope.
