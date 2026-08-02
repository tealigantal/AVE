# Time Remap

## Purpose
Define source-to-timeline temporal mapping. ## Scope
CAP-TIME-001. ## Non-goals
No silent audio desynchronization. ## Capability IDs
CAP-TIME-001. ## Domain Objects
TimeMap, SpeedPoint, Hold, PitchPolicy. ## Schema Requirements
RationalTime segments and mapping continuity. ## Timeline Commands
Set/remove time map. ## Edit IR Mapping
Intent emits typed mapping only. ## RenderGraph Mapping
Time-remap node precedes dependent effects. ## Backend Mapping
Adapter declares reverse/flow/blend support. ## Validation Rules
Valid source range and duration derivation. ## Persistence/Migration Impact
Subtitle/keyframe/audio bindings migrate with map. ## Error Semantics
Unavailable optical flow is explicit. ## Preview/Master Rules
Same mapping; quality may differ. ## Fallback/Bake/Blocker
Declared frame blending/bake/block. ## Acceptance Scenarios
ACC-004. ## Open Questions
Pitch-quality policy.
