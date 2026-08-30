# Registered Transform Automation Execution

This ExecPlan is the living delivery record for `WP-KF-002`.

## Purpose / Big Picture

Deliver one honest advanced editing primitive: transform property paths already
registered by Timeline Core become explicit, measurable RenderGraph and Worker
execution. A creator can commit, render and reopen the curves without authority
drift. This package owns only `ACC-035`.

## Progress

- [x] 2026-08-23 Inspect Timeline registration, RenderGraph blockers, Worker
  compilation and current focused tests.
- [x] 2026-08-23 Withdraw the misleading advanced-family video task while
  preserving its bounded tests and blocked matrices.
- [x] 2026-08-23 Register and activate `WP-KF-002`.
- [x] 2026-08-23 Define exact units, ranges, defaults, anchor order and evaluation behavior
  for the registered numeric transform paths.
- [x] Extend RenderGraph and Worker execution without adding a parallel path.
- [x] Add success, failure-closure, Commit/reopen and encoded-media assertions.
- [x] Run focused and aggregate validation and create current-fingerprint
  PRECHECK Evidence.
- [x] Produce authorized real-media Preview/Master PRECHECK artifacts with
  machine measurements, failure injection and deterministic reopen rerender.
- [x] Record the human rejection of v9, reproduce the visible vertical jitter
  and separate frame-clock mismatch from the review fixture's path reversal.
- [x] Make the rotation pivot surface inherit clip timestamps/cadence, add
  per-frame cadence regression, close the monotonic-geometry assertion gap and
  retain the replacement v12 Preview/Master/reopen artifacts.
- [x] Record the renewed human rejection of v12: the target still appeared to
  twitch, four seconds was too short, and the review showed descent only.
- [x] Replace the review lane with retained v15: ten seconds with stable top and
  bottom holds, zero-slope eased descent and ascent, phase trajectory gates and
  an agent visual review of two complete playback loops.
- [x] Close independent-review gaps by replacing the two-pixel bounding-box
  tolerance with a quarter-pixel luma-weighted center gate, requiring zero
  adjacent decoded-frame duplicates during descent/ascent and retaining v17.
- [x] Confirm v17 is byte-identical to the v16 artifact inspected for two full
  FFplay loops without visible twitch.
- [x] Record the user's rejection of retained v17 at 30 fps and v19 at 60 fps:
  motion still looked stepped even though the earlier trajectory gates passed.
- [x] Repair the Render Profile contract so Worker uses declared cadence before
  dynamic transforms, finite holds, gaps, canvases and final output timing;
  bound the rotation surface to the transformed source envelope.
- [x] Identify integer-pixel overlay placement as the remaining visible step,
  add bounded 2x/Lanczos placement for safe position-only animation, and keep
  combined transform/alpha semantics on their independently tested path.
- [x] Retain v31 as a twelve-second 120 fps position-smoothness sample with
  Preview/Master/reopen hash parity, zero direction reversals and zero adjacent
  or 30 fps-equivalent duplicates in either motion core; visually inspect a
  byte-identical v30 Master through a complete playback cycle.
- [x] Close the final independent-review blocker by re-probing position-only
  source geometry, checking doubled transformed content as well as doubled
  canvas against the per-axis/area budget, and adding large-source and maximum
  scale-envelope rejection regressions; retain byte-identical v32.
- [x] Record the user's rejection of v32: motion was improved but still did not
  look like continuous 120 fps playback.
- [x] Replace the safe opaque in-canvas position lane with per-frame linear
  fractional translation; retain 2x/Lanczos for edge-crossing or alpha-bearing
  sources and prove both dispatch paths.
- [x] Retain v38 with Preview/Master/reopen hash parity, 476/475 distinct frames
  in the two 480-frame eased moves, zero motion-core adjacent/two-frame repeats,
  zero quarter-pixel reverse steps and a byte-identical agent-played v36 Master.
- [x] 2026-08-23 Complete the required user review of the retained v38 artifacts; the user explicitly accepted the final smoothness result.
- [x] 2026-08-23 Reconcile `ACC-035`, capability notes and Debt without promoting
  `ACC-001/002`; create COMPLETE Evidence and complete the package.

## Surprises & Discoveries

- Timeline Core already registers numeric x/y, scale x/y, rotation, anchor x/y
  and opacity and validates numeric Bézier tangents.
- RenderGraph deliberately admits only x/y automation today.
- Worker automation expressions are likewise limited to x/y, providing a
  concrete seam rather than a speculative subsystem.
- Static manual vertical reframe is already a separate bounded tool; automatic
  subject-aware reframe requires a materially different package.
- The existing Worker rotation used `rotw(iw)` / `roth(ih)`, although FFmpeg
  expects the angle; a local 0-degree probe changed a 64x32 frame to 55x62.
- FFmpeg pad expressions cannot use frame time, while overlay, scale, rotate
  and geq can. A scale-envelope-sized surface was unsafe for extreme ratios;
  the accepted lane instead uses a fixed transparent surface derived from the
  bounded output-canvas diagonal.
- Initial Worker scaling silently clamped results to two pixels and quantized
  both axes to even dimensions. The accepted contract now declares positive
  `floor(source_dimension * scale)` rasterization and rejects sub-pixel or
  over-budget envelopes before FFmpeg allocation.
- Human review rejected v9 because the target visibly moved up and down. The
  encoded stream itself had 120 evenly spaced 30 fps timestamps, but the
  rotation pivot used an independent FFmpeg `color` source whose implicit rate
  was 25 fps while the clip and output canvas were 30 fps.
- The v9 fixture also moved both anchor axes from 0.25 to 0.75 while moving y
  only 80 pixels. Its geometric center therefore moved down and then back up;
  the old three-frame assertion allowed that reversal. R2 derives the pivot
  surface from the transformed clip stream and uses a smaller dynamic anchor
  range with a strictly down-moving review fixture.
- The retained external v12 R2 PRECHECK has identical Preview/Master/reopen
  Master SHA-256, passed QC, measured 120 frames with one 1/30-second cadence,
  and enforces start < middle < end vertical geometry, but the user still saw
  twitching and rejected its short one-way review story.
- The retained external v15 R3 PRECHECK runs for 300 frames at 30 fps. Phase
  measurements prove stable holds, descent and ascent without reverse steps
  over two pixels, while Preview/Master/reopen Master remain byte-identical.
  Agent visual review of two complete FFplay loops found no visible twitch;
  independent review nevertheless found that its two-pixel threshold was too
  permissive for the stated no-twitch claim.
- R4 measures decoded luma-weighted centers, rejects reverse motion over one
  quarter pixel, and hashes every decoded moving frame. Retained v17 records
  zero qualifying reverse steps and zero adjacent duplicates in both moving
  phases. It is byte-identical to visually reviewed v16.
- `RenderProfile.fps` was present in the graph contract but Worker ignored it:
  source clocks, held frames, gaps, canvases and transform evaluation still
  inherited or hard-coded 30 fps. Raising only the encoded output rate therefore
  duplicated already-rasterized positions and could not make motion smoother.
- A direct 120 fps render initially exposed excess work in the rotation path:
  its transparent surface was sized from the entire canvas diagonal. Using the
  already-bounded maximum transformed source envelope preserves pivot safety
  while avoiding unnecessary transparent pixels.
- Simultaneous scale, rotation, moving anchor and opacity made the visual sample
  unsuitable for judging position cadence because integer raster-size changes
  introduced symmetric midpoint centroid steps even when the position curve
  never reversed. The review lane now isolates position; Worker correctness
  still verifies every property individually and in combination.
- At 120 fps, integer overlay coordinates still produced 60/30 fps-equivalent
  repeats. The safe position-only path now places at 2x resolution and downsizes
  with Lanczos. Retained v32 has no adjacent or two-frame repeats in the 3.4
  second core of either four-second move; remaining identical frames occur only
  in the declared 0.3-second zero-velocity Bézier edge windows.
- Final independent review found that the first 2x gate bounded only the doubled
  canvas. A legal large source or maximum scale envelope could still create
  doubled content beyond the existing per-axis/area budget. R5 now re-probes
  position-only source geometry and blocks if either doubled canvas or doubled
  transformed content is over budget; both failure shapes have regressions.
- The user still perceived v32's half-pixel placement steps. A 480-frame probe
  measured 20 adjacent repeats and substantially less-uniform frame-to-frame
  displacement on the 2x path. Per-pixel generic equations removed the repeats
  but were too slow for production use because the full curve expression was
  evaluated for every RGBA pixel. A per-frame perspective translation retained
  direct fractional placement at practical render speed.
- Premultiply/unpremultiply around the fractional translation introduced
  luma-centroid reversals near eased edges. Direct plane interpolation removed
  those reversals for opaque sources; possible-alpha sources therefore stay on
  the existing bounded 2x RGBA path instead of using the opaque optimization.
- The current-fingerprint aggregate check passed all R6 and Worker media gates
  but twice stopped later at the existing Basic Vlog ducking recovery amplitude
  assertion. Its isolated command passed once and later reproduced the same
  nondeterminism; the out-of-scope test was not weakened or edited.

## Decision Log

- 2026-08-23: Introduce `ACC-035` for this bounded primitive; keep the broader
  `ACC-001` and `ACC-002` blocked.
- 2026-08-23: Reuse Timeline Command/Commit, Semantic Render Manifest,
  target-specific RenderGraphs/ExecutionPlans and the existing FFmpeg Worker.
- 2026-08-23: Add no production dependency, persistence migration or alternate
  render path.
- 2026-08-23: Define Bézier-named v1 interpolation as the existing normalized
  cubic Hermite formula, with positive tangent time, derivative-root range
  validation and no silent clamp.
- 2026-08-23: Define clip-local curve ticks, one target/property curve, x/y as
  output-canvas anchor coordinates, positive scale, clockwise degrees,
  normalized anchor and multiplicative opacity. StaticReframe, fit, crop and
  flip combinations remain blocked in this slice.
- 2026-08-23: Reject unknown interpolation and transform automation on track or
  audio targets at Timeline authority; Worker keeps a defense-in-depth guard.
- 2026-08-23: Bound geometry automation to <=1920 per axis and <=1920x1080
  area, a four-axis/sixteen-area scale envelope, verified source geometry, and
  an in-canvas rotating pivot. Selected raster dimensions are target-specific,
  not target-neutral semantics.
- 2026-08-23: A rotation pivot surface inherits the transformed clip stream's
  timestamps and cadence; an independent synthetic clock is invalid. Human
  review geometry must be monotonic at its declared checkpoints when the review
  question promises one-direction movement.
- 2026-08-23: The retained review story must expose both directions long enough
  to inspect them: top hold, eased descent, bottom hold, eased ascent and final
  top hold. Phase-level trajectory gates supplement checkpoint geometry.
- 2026-08-23: Encoded motion gates use luma-weighted decoded-frame centers with
  a quarter-pixel compression-noise boundary and require zero adjacent decoded
  duplicates during both moving phases; a two-pixel bbox threshold is invalid
  for the no-twitch claim.
- 2026-08-23: Target Render Profile cadence must drive visual clocks and dynamic
  transform evaluation before rasterization. Output-only frame duplication is
  invalid evidence of high-refresh execution.
- 2026-08-23: Use bounded 2x placement only when position is the sole varying
  transform and opacity is one. Keep dynamic scale, rotation, anchor and alpha
  on the original path and prove them separately rather than changing their
  semantics to make a demonstration look smoother.
- 2026-08-23: Position supersampling is admissible only after verified source
  geometry proves both the doubled canvas and doubled transformed content fit
  the existing per-axis and pixel-area budget. Over-budget inputs block
  explicitly; resource safety may not be inferred from canvas size alone.
- 2026-08-23: Prefer direct per-frame linear fractional translation for safely
  in-canvas position-only animation when the probed source format is explicitly
  opaque. Preserve the bounded 2x/Lanczos path for edge-crossing and possible
  alpha inputs; do not trade alpha correctness for the smoothness sample.
- 2026-08-23: Accept only `ACC-035` after the user approved retained v38.
  Keep `CAP-KF-001`, `CAP-XFORM-001`, `ACC-001` and `ACC-002` blocked because
  the broader families and their original assertions remain incomplete.

## Outcomes & Retrospective

R6 implementation, strengthened machine PRECHECK and agent visual PRECHECK are complete.
Human review rejected superseded v9 and v12 artifacts: v9 exposed an internal
25/30 fps pivot-surface clock mismatch and a reversing fixture, while v12 was
too short and showed only descent. Retained v15 adds a ten-second top/down/
bottom/up/top story and deterministic reopen. Independent review then exposed
R3's permissive two-pixel bbox threshold. R4 retained v17 records zero
quarter-pixel reverse steps and zero adjacent duplicates during descent/ascent;
it is byte-identical to v16, which the agent inspected for two complete loops
without seeing vertical twitch. The user nevertheless rejected v17's visible
30 fps cadence and the subsequent 60 fps v19 sample. R5 fixes the ignored
profile-rate execution contract and integer position quantization, but the user
still rejected v32's half-pixel path. R6 retains v38, a twelve-second 120 fps
position-only review using direct fractional translation for the probed opaque,
in-canvas source. It has 476/475 distinct frames in the two 480-frame moves,
zero motion-core repeats, zero qualifying reverse steps and deterministic
Preview/Master/reopen hashes. A byte-identical v36 Master was played through
the complete loop. Edge-crossing and possible-alpha sources keep the bounded
2x fallback, including doubled-content resource gates. Combined registered
properties remain covered by Worker media tests rather than the smoothness
sample. The user accepted retained v38, so `ACC-035` and `WP-KF-002` complete
for this bounded primitive. Parent `CAP-KF-001`, `CAP-XFORM-001`, `ACC-001`
and `ACC-002` remain blocked; no family-level promotion is claimed. The
final aggregate `pnpm run check` passed. Two earlier attempts exposed an
unrelated Basic Vlog ducking recovery nondeterminism; that history remains
recorded and the out-of-scope test was not weakened inside this package.

## Context and Orientation

Property registration and validation live in
`packages/core/timeline-core/src/automation.ts`. RenderGraph resolution lives in
`packages/core/render-graph/src/public.ts`. FFmpeg automation compilation lives
in `apps/worker-host/src/worker_host/render/graph_compiler.py`. Project Host
remains the commit and publication authority.

## Plan of Work

### M1 Freeze the bounded transform contract

Specify exact property units, valid ranges, omitted/default behavior, anchor
composition order and Bézier evaluation. Non-transform property paths remain
explicit blockers.

### M2 Extend execution and preserve failure closure

Emit one explicit resolver decision per curve and compile deterministic Worker
expressions for registered transform properties. Route all mutation through the
current Host CommitPlan path and prove rejected input cannot mutate Timeline or
publish a successful bundle.

### M3 Verify encoded output and reopen

Render authorized original-backed media, measure representative frames for each
property, reopen the project, rerender, and compare target-neutral semantic
identity and deterministic observable output.

## Concrete Steps

Start with `timeline-core:test`, `render-graph:test` and `timeline-render:test`.
Extend Worker correctness coverage and add
`acceptance:transform-automation:real` before PRECHECK. Then run the manifest
gates, `pnpm run check`, `pnpm run docs:sync`, `pnpm run docs:check`, and
`git diff --check`.

## Validation and Acceptance

Success requires committed and reopened curves, visible encoded transform
changes, shared Preview/Master semantic identity and verified-Original Master
provenance. Negative cases cover invalid tangents, non-finite or out-of-range
values, mismatched value kinds, unknown paths, missing sources and publication
failure. Marker strings alone are not evidence.

## Idempotence and Recovery

Identical retries must not create duplicate Timeline versions or render
records. Failed renders leave the last committed Timeline recoverable and do
not publish a successful bundle. Real acceptance uses a fresh external output
directory and never overwrites retained artifacts.

## Artifacts and Notes

Evidence retains only hashes, semantic identities, objective measurements and
licensed source attribution. Media remains outside Git.

## Interfaces and Dependencies

No new external service, model backend, schema authority, migration or
production dependency is planned. If implementation requires work outside the
allowed paths, stop and amend the governed package before continuing.
