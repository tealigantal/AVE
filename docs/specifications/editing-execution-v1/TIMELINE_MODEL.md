# Timeline Model

## Purpose
Define authoritative versioned timeline objects and commands. ## Scope
CAP-TL-001 objects, tracks, nesting and CommitPlan. ## Non-goals
No renderer UI behavior. ## Capability IDs
CAP-TL-001. ## Domain Objects
Sequence, Track, Clip, Transition, CompoundClip, NestedSequence. ## Schema Requirements
Contracts use IDs, RationalTime, version and discriminated object kinds. ## Timeline Commands
Validated atomic add/remove/replace/move/trim/roll/ripple/slip/slide/split/group/link/nest/property commands. ## Edit IR Mapping
Intent resolves to commands, never direct mutation. ## RenderGraph Mapping
Committed sequence supplies ordered graph inputs. ## Backend Mapping
Adapters consume graph only. ## Validation Rules
No overlap/lock/version/cycle violations. ## Persistence/Migration Impact
Host-only SQLite migrations retain legacy sequence versions. ## Error Semantics
Conflict/invalid/locked are explicit. ## Preview/Master Rules
Same committed version. ## Fallback/Bake/Blocker
Unsupported object blocks. ## Acceptance Scenarios
ACC-011, ACC-013. ## Open Questions
Compound edit UI policy.
