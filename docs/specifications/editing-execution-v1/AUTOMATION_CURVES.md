# Automation Curves

## Purpose

Define deterministic animated property evaluation.

## Scope

`CAP-KF-001` time spaces, curves, tangents and value kinds. `WP-KF-002`
accepts only the bounded clip-target numeric transform slice in `ACC-035`.

## Non-goals

No untyped expression engine. Track-target execution, non-transform property
execution and a general control-point Bézier solver are not part of `ACC-035`.

## Capability IDs

`CAP-KF-001`.

## Domain Objects

AutomationCurve, Keyframe, Tangent, PropertyPath.

## Schema Requirements

Times are integer Timeline ticks. For a clip-target curve, zero is the first
frame of the clip and every keyframe must be in
`[0, clip.timeline_duration]`. They are not sequence-absolute timestamps.
Typed values are authoritative. v1 endpoint behavior is a single endpoint
hold; the unused `before`/`after` policy fields are rejected rather than
exposed with indistinguishable semantics.

## Timeline Commands

Set/clear keyframe and curve commands are CommitPlan operations. A target may
have at most one curve for a property path across track-owned and clip-owned
curve collections. A rejected duplicate, invalid time or invalid curve does
not increment Timeline version or append an event.

## CommandEditIR Mapping

CommandEditIntent addresses registered property paths resolved in
CommandEditIR.

## RenderGraph Mapping

Each executable curve becomes its own explicit automation node and resolver
decision. Node time is converted to the graph Timeline timescale without
changing its clip-local meaning. Non-transform and track-target curves produce
blockers rather than disappearing.

## Backend Mapping

The adapter declares interpolation support. `hold` returns the left value;
`linear` interpolates by the exact segment ratio. The v1 interpolation named
`bezier` is a normalized cubic Hermite segment, not a two-dimensional temporal
control-point curve:

- `u = (time - left.time) / (right.time - left.time)`;
- an explicit tangent has positive normalized handle time and a signed
  property-unit value delta;
- tangent slope is `value / time`;
- an omitted tangent uses `right.value - left.value`;
- the interpolation declared by the left keyframe owns the following segment.

`hold`, `linear` and `bezier` are the complete v1 interpolation registry.
Unknown runtime strings are rejected even for a one-keyframe curve; they never
fall through to linear evaluation. Worker expressions retain keyframe times as
exact integer/timescale fractions rather than converting absolute ticks to
floating-point seconds.

Preview and Master use the same formula. Backend decimal formatting may not
change the target-neutral curve payload or endpoint behavior.

## Validation Rules

Strictly monotonic non-negative time, finite values and tangents, registered
property paths, value-kind agreement, hold-only boolean/string interpolation,
and numeric-only Hermite tangents are required. Tangent time zero or negative
is invalid. Tangent handle times greater than one remain valid because
previously persisted curves use them to express a flatter normalized slope.
Timeline and Worker use the same `1e-12` near-degenerate Hermite derivative
threshold. For bounded numeric properties, derivative roots
inside every Hermite segment are evaluated so an in-range pair of endpoints
cannot hide an out-of-range overshoot. BigInt ratios are scaled before
conversion and never convert absolute timestamps to Number.

## Persistence/Migration Impact

Versioned curves require migration. The existing Timeline persistence is used
by `ACC-035`; close/reopen must preserve ids, ticks, values, interpolation and
tangents exactly.

## Error Semantics

Unknown path or interpolation, wrong kind, invalid tangent, duplicate
target/path, invalid clip-local time, non-visible transform target or
bounded-property overshoot blocks before commit or successful publication.

## Preview/Master Rules

Identical evaluator semantics and one target-neutral curve payload. Source
selection and encoded resolution may differ by target.

## Fallback/Bake/Blocker

Bake only declared sampled curves; otherwise blocker. `ACC-035` has no silent
sampling, clamping, path dropping or default substitution.

## Acceptance Scenarios

`ACC-001`, bounded by `ACC-035` for `WP-KF-002`.

## Open Questions

Sampling tolerance for future backends that cannot execute the analytic v1
formula remains open; it is not used by the FFmpeg lane in `ACC-035`.
