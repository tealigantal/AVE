# WP-VLOG-001 Basic Vlog toolkit

## User-visible outcome

Creators can turn landscape clips into a static 9:16 composition, normalize Master loudness, duck Music under Dialogue/Narration, and apply single-clip video/audio boundary fades without enabling advanced professional editing scope.

## Capability and acceptance IDs

This package contributes bounded executable slices to CAP-XFORM-001, CAP-AUDIO-001, CAP-TRANS-001, CAP-RENDER-001 and CAP-PRESET-001. Its focused acceptance records are ACC-016 through ACC-019. Broad capability blockers remain authoritative outside these slices.

## Specifications and contracts

The governing specifications are TRANSFORM_AND_COMPOSITING.md, AUDIO_PIPELINE.md, TRANSITIONS_AND_EFFECTS.md, PRESET_AND_SKILL_INTERFACE.md, RENDER_GRAPH_V2.md and QC_AND_ACCEPTANCE.md. Every cross-boundary settings object is versioned in JSON Schema and generated for TypeScript and Python.

## Implementation boundary

- Reuse Timeline Command/Commit, the existing Transform/Audio Routing/Effect model, unified RenderGraph, ExecutionPlan identity and Worker FFmpeg adapter.
- Keep Project Host as the sole project-state authority and SQLite writer.
- Treat Preview and Master as the same target-neutral semantics with target-specific source/profile/cache identities.
- Publish no partial Render Bundle after validation, Worker or QC failure.

## Explicit non-goals

No Cross Dissolve, source-handle transition model, subject detection, dynamic tracking/reframe, automatic keyframes, optical flow, general automation curves, arbitrary bus graph, AI mastering or advanced transition family.

## Tests and evidence

Run the package-specific synthetic FFmpeg acceptance plus contract generation/compatibility/clean checks, Timeline and Host persistence/undo tests, RenderGraph/ExecutionPlan/cache tests, Worker lint/type/render/QC tests, storage and bundle atomicity tests, synthetic final acceptance and the complete repository check. Evidence must state observed pixels, loudness/true peak, ducking interval levels, fade frame/amplitude ramps, persistence results and unchanged blockers.

## Definition of done

All four focused acceptance IDs are evidence-backed and tested; invalid input blocks at Schema/Host and Worker layers; semantic/cache identities change with every setting; Preview/Master agree; close/reopen and undo/redo preserve state; synthetic encoded media proves output; broad advanced capabilities remain blocked.
