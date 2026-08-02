# Transform and Compositing

## Purpose
Define canvas transforms and layered compositing. ## Scope
CAP-XFORM-001 and CAP-COMP-001. ## Non-goals
No backend-specific filter strings. ## Capability IDs
CAP-XFORM-001, CAP-COMP-001. ## Domain Objects
Transform, Crop, Canvas, Layer, Matte, BlendMode. ## Schema Requirements
Typed coordinate/color/alpha spaces and safe area. ## Timeline Commands
Set transform/crop/blend/matte/track order. ## Edit IR Mapping
Property patches target clip or track. ## RenderGraph Mapping
Transform/composite nodes are explicit. ## Backend Mapping
Registry maps blend/matte semantics. ## Validation Rules
Defined alpha and bounds; no matte cycle. ## Persistence/Migration Impact
Persist coordinate-space version. ## Error Semantics
Unsupported blend cannot silently normalize. ## Preview/Master Rules
Same stacking/alpha semantics. ## Fallback/Bake/Blocker
Declared bake or blocker. ## Acceptance Scenarios
ACC-001, ACC-002, ACC-006, ACC-011. ## Open Questions
Corner-pin sampling.
