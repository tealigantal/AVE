# Timeline Model

## Purpose
Define authoritative versioned timeline objects and commands. ## Scope
CAP-TL-001 objects, tracks, nesting and CommitPlan. ## Non-goals
No renderer UI behavior. ## Capability IDs
CAP-TL-001. ## Domain Objects
Sequence, Track, Clip, Transition, CompoundClip, NestedSequence. ## Schema Requirements
Contracts use IDs, RationalTime, version and discriminated object kinds. ## Timeline Commands
Validated atomic add/remove/replace/move/trim/roll/ripple/slip/slide/split/group/link/nest/property commands. ## CommandEditIR Mapping
CommandEditIntent resolves to commands in CommandEditIR, never direct mutation. ## RenderGraph Mapping
Committed sequence supplies ordered graph inputs. ## Backend Mapping
Adapters consume graph only. ## Validation Rules
No overlap/lock/version/cycle violations. IDs are unique across Timeline objects; compound children must exist in the same sequence track; parent and nested-sequence references share one cycle graph; transitions require adjacent clips, an exact transition range, and duration strictly shorter than both handles; TimeMap, Automation, Color, Mask, and track-state invariants are validated before Commit. ## Persistence/Migration Impact
Host-only SQLite migrations retain legacy sequence versions. ## Error Semantics
Conflict/invalid/locked are explicit. ## Preview/Master Rules
Same committed version. ## Fallback/Bake/Blocker
Unsupported object blocks. ## Acceptance Scenarios
CommitPlan `affected_ranges` use pre/post clip ranges, real track extents, transition/caption/lock spans, ripple-tail invalidation, and full pre/post invalidation for restore. ACC-011, ACC-013. ## Open Questions
Compound edit UI policy.

## WP-RENDER-002 Executable Boundary

Validation covers globally unique object IDs, parent and nested cycle graphs, compound membership, transitions, automation targets, masks, color, track state and exact TimeMap ratios. Every command family emits real pre/post `affected_ranges`, and failure leaves the in-memory sequence unchanged. Nested sequences, compound clips and adjustment tracks remain valid persisted domain objects but must resolve to explicit blockers until an adapter implements their complete output semantics.

Root Sequence `timebase` is the authority for all Timeline coordinates. RenderGraph converts each integer Timeline tick through the complete RationalTime `value/timescale`; it must not infer Timeline units from any source-media stream. Invalid non-positive Sequence timebases fail validation. Clip placement, gaps, TimeMap execution segments, captions/words, transitions, audio delays and total duration all use the same converted authority.
