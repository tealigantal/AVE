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
Valid source range and duration derivation. Speed segments have one exact rational authority: `(source_end-source_start)/(timeline_end-timeline_start) = speed_numerator/speed_denominator`; mismatch is `TIME_MAP_RATIO_MISMATCH`. Segment IDs are unique, clip-local timeline coverage is contiguous, non-final ranges are half-open, and only the final segment includes the overall end. A clip declaring both `speed` and `time_map` is rejected as `TIME_MAP_SPEED_CONFLICT`. ## Persistence/Migration Impact
Subtitle/keyframe/audio bindings migrate with map. ## Error Semantics
Unavailable optical flow is explicit. ## Preview/Master Rules
Same mapping; quality may differ. ## Fallback/Bake/Blocker
Declared frame blending/bake/block. ## Acceptance Scenarios
ACC-004. ## Open Questions
Pitch-quality policy. Worker media execution and media-level A/V acceptance remain owned by WP-RENDER-002.
