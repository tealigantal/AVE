# Static Native-Size Anchor Placement ExecPlan

This ExecPlan is the living delivery record for `WP-XFORM-002`.

## Purpose / Big Picture

Turn the existing explicit static-anchor and `fit: original` blockers into one
honest transform tool. A committed clip should preserve logical Original pixel
size, place a normalized anchor at declared canvas coordinates, render
equivalent Preview/Master geometry and survive reopen. This package owns only
`ACC-036` and does not complete the transform family.

## Progress

- [x] 2026-08-23 Select the next package from the concrete
  `DEBT-RENDER-002-B` blocker seam after `WP-KF-002` completion.
- [x] 2026-08-23 Register `ACC-036` and `WP-XFORM-002` with narrow paths and
  explicit non-goals.
- [x] 2026-08-23 Defer the package from active to ready before implementation
  after the user explicitly prioritized Stage 2; no capability or acceptance
  status changed.
- [ ] Trace Original/proxy display geometry from Project Host into each
  target-specific RenderGraph and ExecutionPlan.
- [ ] Specify and implement static anchor/original-size composition and bounded
  resource preflight without a parallel transform path.
- [ ] Add focused graph, Worker encoded-media, Host commit/reopen and negative
  publication tests.
- [ ] Produce repository-external Preview/Master PRECHECK artifacts and perform
  machine plus human review.
- [ ] Create COMPLETE Evidence, reconcile only `ACC-036`, and complete the
  package without promoting `ACC-001/002` or `CAP-XFORM-001`.

## Surprises & Discoveries

- Timeline already carries all required static fields; the missing behavior is
  an explicit resolver/Worker execution gap rather than a missing product type.
- Preview proxy dimensions cannot redefine `fit: original`; both targets need
  the same logical Original geometry while keeping distinct source identity.

## Decision Log

- 2026-08-23: Choose static native-size anchor placement as the next bounded
  task because its blockers are concrete and adjacent to the accepted
  transform execution seam.
- 2026-08-23: Define `fit: original` from logical Original display dimensions,
  not whichever Proxy happens to be selected for Preview.
- 2026-08-23: Keep automation, StaticReframe, crop/flip, detection and dynamic
  reframe out of `ACC-036` so a single tool cannot imply family completion.

## Outcomes & Retrospective

Pending implementation and evidence.

## Context and Orientation

Timeline Transform types live in `packages/core/timeline-core/src/public.ts`.
Resolver blockers live in `packages/core/render-graph/src/public.ts`. Worker
transform compilation lives in
`apps/worker-host/src/worker_host/render/graph_compiler.py`. Project Host owns
source authority, commit and publication.

## Plan of Work

First trace which Original and selected-source dimensions are already available
to target-specific plans. Then define one static composition order and resource
envelope, remove only the two bounded blockers, compile through the existing
Worker transform path, and prove encoded geometry plus failure closure.

## Concrete Steps

1. Inspect RenderGraph source parameters, Host media authority and Worker probe
   comparison for Preview proxy and Master Original.
2. Add target-specific logical Original geometry needed by the existing
   transform node without changing target-neutral semantic identity.
3. Execute original-size raster restore, scale/rotation/opacity, normalized
   anchor placement and x/y translation in the registered Worker path.
4. Add exact-pixel and normalized-geometry assertions, reopen persistence and
   missing/mismatched/over-budget failure cases.
5. Run focused and aggregate gates, create real PRECHECK artifacts, review,
   reconcile Evidence and complete through the documentation protocol.

## Validation and Acceptance

Run `render-graph:test`, `worker:render-graph:test`,
`worker:render-correctness:test`, `timeline-render:test`,
`acceptance:static-native-transform:real`, `typecheck`, `architecture`, the full
`check`, documentation gates and `git diff --check`. Acceptance requires exact
encoded placement, target-neutral Preview/Master semantics, verified Original
authority, reopen identity, failure closure and bounded human review.

## Idempotence and Recovery

Tests and local real-media runs use fresh temporary or repository-external
roots. Failed validation or rendering publishes no successful Bundle and does
not change the last committed Timeline. Generated current documents change only
through `docs:sync`.

## Artifacts and Notes

Retain only hashes and portable measurements in repository Evidence. Do not
copy, commit or publish user media or absolute local paths in generated current
documents.

## Interfaces and Dependencies

Reuse Timeline Command/Commit, Semantic Render Manifest, target-specific
RenderGraphs/ExecutionPlans, Project Host source authority and the existing
FFmpeg Worker. No new contract, persistence migration, backend, dependency or
desktop surface is authorized.
