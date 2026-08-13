# ADR-0017 Bounded advanced FFmpeg execution

- Status: Accepted
- Date: 2026-08-12

## Context

AVE persisted advanced Timeline objects but blocked every automation curve and transition before Worker execution. A real advanced review cut requires executable semantics without allowing arbitrary FFmpeg strings or silently treating a narrow showcase as the complete v1 catalogue.

## Decision

The existing FFmpeg adapter gains a bounded advanced subset:

- registered numeric `transform.x` and `transform.y` automation compiles to deterministic per-frame overlay expressions;
- explicit-overlap `dissolve`, `cross_dissolve` and `fade` transitions execute only when Timeline validation proves exact adjacency, overlap and duration;
- corrected rectangular tracking samples animate mask position when width and height are constant;
- existing time-map, Rec.709 8-bit grade, word caption, multitrack ducking/fades and loudness nodes may compose in the same graph.

CommitPlan batch simulation validates the final atomic state so a clip overlap and its transition can be created together. The public one-command API still validates every completed command immediately. Worker mirrors all supported-kind, handle and tracking constraints. Legacy adjacent transitions remain valid persisted data but resolver-blocked.

## Rationale

This preserves the Project Host and RenderGraph authority chain, keeps unsupported semantics fail-closed and produces real user-reviewable output without a parallel demo renderer.

## Consequences

Cross Dissolve inputs are rebuilt to common CFR/AVTB before FFmpeg `xfade`. Animated mask size, ellipse/feather masks, other transition families, unsupported automation properties, optical flow/change-pitch and the remaining broad catalogue still block. Capability matrices therefore remain blocked until their original full acceptance scenarios pass.

## Migration

No database migration is required. Existing Timeline JSON remains readable. The new `automation` RenderNode is internal to the current RenderGraph schema and is covered by semantic hashing and Worker validation.

## Rollback

Restore resolver blockers for the bounded nodes and revert batch-final CommitPlan validation. Existing projects remain readable; advanced renders would block rather than silently change.
