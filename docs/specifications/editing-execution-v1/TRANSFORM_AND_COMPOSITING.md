# Transform and Compositing

## Purpose
Define canvas transforms and layered compositing. ## Scope
CAP-XFORM-001 and CAP-COMP-001. ## Non-goals
No backend-specific filter strings. ## Capability IDs
CAP-XFORM-001, CAP-COMP-001. ## Domain Objects
Transform, Crop, Canvas, Layer, Matte, BlendMode. ## Schema Requirements
Typed coordinate/color/alpha spaces and safe area. ## Timeline Commands
Set transform/crop/blend/matte/track order. ## CommandEditIR Mapping
CommandEditIR property patches target clip or track. ## RenderGraph Mapping
Transform/composite nodes are explicit. ## Backend Mapping
Registry maps blend/matte semantics. ## Validation Rules
Defined alpha and bounds; no matte cycle. ## Persistence/Migration Impact
Persist coordinate-space version. ## Error Semantics
Unsupported blend cannot silently normalize. ## Preview/Master Rules
Same stacking/alpha semantics. ## Fallback/Bake/Blocker
Declared bake or blocker. ## Acceptance Scenarios
ACC-001, ACC-002, ACC-006, ACC-011. ## Open Questions
Corner-pin sampling.

## WP-RENDER-002 Executable Boundary

The FFmpeg adapter preserves track order, gaps, clip timeline placement, enabled/solo state and static scale/x/y placement on a transparent canvas. `scale_x` and `scale_y` execute independently with the omitted axis fixed at 1. Delayed overlays use explicit layer timing and do not truncate the base track. Automation-driven transforms, anchor/original-size behavior, tracked mattes, non-normal blend modes, nested sequences, compounds and adjustment tracks are blockers rather than normalized or dropped operations.

## WP-VLOG-001 Static Reframe Contract

`StaticReframeV1` is a clip-persistent, schema-version 1 setting with `crop_fill`, `contain` and `blurred_background` modes plus normalized `focal_x` and `focal_y` in `[0,1]`. It requires a 9:16 output profile and compiles to the existing transform/canvas adapter; it is not a second transform system. Preview and Master preserve one target-neutral node while source and resolution remain target-specific. Reframe cannot be combined with an additional clip Transform in v1 because the composition order would be ambiguous. Dynamic tracking, detection, keyframes, optical flow and subject-aware composition remain blocked.

## WP-KF-002 Registered Transform Automation Contract

`ACC-035` executes clip-target numeric curves for the following registered
property paths. This table is a bounded execution contract and does not promote
the complete transform or keyframe capability families.

| Path | Unit and valid value | Omitted value |
| --- | --- | --- |
| `transform.x` | finite output-canvas pixels | `0` |
| `transform.y` | finite output-canvas pixels | `0` |
| `transform.scale_x` | finite multiplier greater than zero | `1` |
| `transform.scale_y` | finite multiplier greater than zero | `1` |
| `transform.rotation` | finite degrees; positive is clockwise in image coordinates | `0` |
| `transform.anchor_x` | normalized pre-transform source width in `[0,1]` | `0` |
| `transform.anchor_y` | normalized pre-transform source height in `[0,1]` | `0` |
| `transform.opacity` | alpha multiplier in `[0,1]` | `1` |

`x/y` locate the anchor on the output canvas. Crop and flip, when supported by
a future composed contract, precede scale. Scale and rotation share the same
anchor; the transformed anchor is then placed at `x/y`; opacity multiplies the
resulting alpha. A curve overrides a static value for the same property and
otherwise the supported static value or table default applies. Endpoint hold
is authoritative.

For `ACC-035`, automation combined with StaticReframe, any `fit` mode, crop or
flip is an explicit resolver blocker because those composition semantics have
not been accepted together. Static anchor remains under its existing blocker;
anchor automation is evaluated from its curve and omitted-axis default. A
non-transform curve, track-target curve, missing source or unverified Master
Original also blocks. Preview and Master share the exact target-neutral curves,
defaults and composition order; neither target may clamp, normalize, sample or
drop a property silently.

Transform automation targets only a visible clip on a video track. Timeline
Core rejects a transform curve aimed at an audio clip or a whole track before
Timeline/event mutation; RenderGraph and Worker retain the same fail-closed
guard.

### ACC-035 Raster and Resource Boundary

The semantic scale remains a positive real multiplier, while encoded pixels
necessarily have integer dimensions. This bounded lane defines that conversion
explicitly: for each positive axis, encoded size is
`floor(selected_source_dimension * evaluated_scale)`. The complete curve must
produce at least one pixel on each axis. This is declared rasterization, not a
silent minimum clamp or an even-dimension normalization.

Source geometry comes from the Host-verified probe for the target-specific
selected Original or Proxy. `selected_width/height` are excluded from the
target-neutral Semantic Render Manifest but retained in target-specific input
identity/cache material; Worker re-probes the actual file and rejects a
geometry mismatch.

Geometry automation in `ACC-035` is bounded to a positive integer output canvas
with each dimension at most 1920 and total area at most 1920x1080. Dynamic
scaled width/height may each be at most four times the output axis and scaled
area at most sixteen times output area. If rotation is ever non-zero, the
complete x/y curve bounds must keep the pivot inside the output canvas. Rotation
uses a fixed transparent square of side
`2 * ceil(hypot(maximum_transformed_source_width,
maximum_transformed_source_height))`. The maximum transformed source envelope
is already bounded by the resource preflight; the pivot surface therefore does
not allocate against the larger output-canvas diagonal when the source is
small, and it is never sized from an unbounded scale ratio.

Missing geometry, sub-pixel scale, excessive canvas or scale envelope, and an
out-of-canvas rotating pivot produce explicit resolver/Worker blockers. These
bounds are part of this accepted slice; 4K geometry automation and broader
composition remain unimplemented rather than being silently degraded.

The rotation pivot surface must inherit the transformed clip stream's frame
timestamps and cadence. An independent synthetic surface with its own default
frame rate is not a valid implementation because it can update scale, anchor
and rotation on a different clock from the output canvas.

The target Render Profile frame rate is an execution input, not output-only
metadata. It must be finite and within the supported `1..120` range. Visual
sources, held-frame clocks, transparent canvases, gaps and transition inputs
use that cadence, and a dynamic transform stream is normalized to the profile
timebase before any curve expression is evaluated. Duplicating already
transformed 30 fps frames into a 120 fps output is not valid high-refresh
execution. Modern graphs with authoritative Timeline duration also end on a
profile-rate timebase; a stationary terminal frame may be absent only when the
encoded duration boundary falls exactly before that final sample.

FFmpeg overlay coordinates rasterize to integer pixels. For the bounded case
where only position varies, scale/rotation/anchor are constant, opacity is one,
the transformed content remains at least one pixel inside every output edge,
the target-specific source probe reports a registered opaque pixel format, and
no earlier mask operation can introduce alpha,
Worker places the layer once on a transparent profile-rate canvas and applies a
per-frame destination translation with linear fractional-pixel interpolation.
The continuous x/y curve is evaluated directly on the profile frame number;
integer overlay placement is not re-evaluated for every frame. This avoids the
half-pixel ceiling of the prior 2x/Lanczos path while retaining one target-rate
frame clock.

If the content can cross the output edge or the source pixel format may carry
alpha, Worker retains the bounded 2x/Lanczos placement path. It re-probes the
target-specific source before either decision; missing or mismatched geometry
and any required doubled canvas/content envelope outside the limits block with
`AUTOMATION_POSITION_SUPERSAMPLE_RESOURCE_LIMIT` rather than silently falling
back to integer placement. Dynamic scale, rotation, anchor or opacity keeps the
original RGBA path because applying the position-only optimization there would
change those properties' raster/alpha semantics. Layer and pivot overlays
repeat the final available frame through their declared interval; `shortest`
or pass-through end behavior must not truncate or flash the Timeline boundary.

The retained smoothness review may isolate position while keeping the other
registered transform paths constant. That review must use 120 fps encoded
Preview/Master, prove no reverse steps over one quarter pixel, no adjacent or
30 fps-equivalent repeats in the motion core, and allow identical frames only
inside the declared zero-velocity edge-easing window. Separate Worker media
correctness tests must continue to prove combined and per-property scale,
rotation, anchor and multiplicative-opacity execution.

## WP-XFORM-002 Static Native-Size Anchor Contract

`ACC-036` is a bounded static transform contract. `fit: original` means the
Host-verified logical Original display width and height before transform; it
does not mean the dimensions of a selected Preview proxy. Preview may decode a
proxy, but must resample it to the same logical Original geometry used by
Master before applying the static transform. Source selection, decode quality
and ExecutionPlan remain target-specific while the Transform payload and
normalized output geometry remain target-neutral.

`anchor_x/y` are normalized coordinates over that pre-transform raster in
`[0,1]`, defaulting to zero. Independent scale is applied around the anchor,
then clockwise rotation in image coordinates, then `x/y` places the transformed
anchor on the output canvas; opacity multiplies the resulting alpha. Original
size never implies contain, fill, centering, crop or canvas growth. Content may
be clipped by the fixed output canvas when the declared placement requires it.

The complete static raster/rotation envelope must pass the existing bounded
per-axis and area preflight before FFmpeg allocation. Missing or mismatched
logical Original geometry, an unverifiable Master source, invalid anchor,
sub-pixel or over-budget output and unsupported composition block explicitly.
Automation, StaticReframe, crop, flip and other fit modes cannot be combined
with this contract. Those semantics remain future work rather than silent
normalization.
