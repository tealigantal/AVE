# Backend Adapters

## Purpose
Define adapter and capability registry boundary. ## Scope
CAP-RENDER-001 and CAP-TRANS-001 mapping. ## Non-goals
No MLT adoption decision. ## Capability IDs
CAP-RENDER-001, CAP-TRANS-001. ## Domain Objects
Adapter, RegistryEntry, ExecutionPlan, Error. ## Schema Requirements
Backend/version/capability/parameter mapping. ## Timeline Commands
None. ## Edit IR Mapping
IR remains backend-neutral. ## RenderGraph Mapping
Adapter consumes graph subtrees. ## Backend Mapping
FFmpeg retained; MLT candidate; Graphic Bake/AI Asset I/O defined. ## Validation Rules
Capability/version and determinism checked. ## Persistence/Migration Impact
Pin backend version in manifest. ## Error Semantics
Unsupported/transient/input/QC taxonomy. ## Preview/Master Rules
No semantic divergence. ## Fallback/Bake/Blocker
Mandatory resolver output. ## Acceptance Scenarios
ACC-012, ACC-014, ACC-015. ## Open Questions
MLT official validation.

## WP-RENDER-002 Correctness Contract

Project Host is the resolver authority. It pins `worker-media@v1` and a sorted capability snapshot in each schema-version 2 ExecutionPlan. Worker recomputes the semantic hash, target-specific cache key and plan ID, verifies decision coverage and rejects blocked or mismatched plans before compilation. There is no compatibility path that invents a missing plan or lets Worker silently choose another adapter.

The FFmpeg adapter currently executes the explicitly tested subset: timeline-aware placement/z-order, static transform, per-track video/audio state, multitrack audio mix/gain/mute/solo, trim, constant speed, hold and reverse. Nested/compound/adjustment, automation-driven transform, tracked masks, complete transition/color/graphics families, variable speed ramps, ducking and loudness normalization remain explicit blockers. MLT remains a candidate only and is not a fallback claim.
