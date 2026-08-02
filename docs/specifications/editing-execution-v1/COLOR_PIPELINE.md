# Color Pipeline

## Purpose
Define color managed correction and transforms. ## Scope
CAP-COLOR-001. ## Non-goals
No implicit color-space conversion. ## Capability IDs
CAP-COLOR-001. ## Domain Objects
ColorContext, Grade, LUTRef, Curve, HDRProfile. ## Schema Requirements
Input/working/output space, bit depth, ranges and LUT hash. ## Timeline Commands
Apply grade/adjustment clip. ## Edit IR Mapping
Typed grade operations. ## RenderGraph Mapping
Color transform and grade nodes. ## Backend Mapping
Adapter declares OCIO/LUT support. ## Validation Rules
Known transforms and legal ranges. ## Persistence/Migration Impact
Pin LUT identity/version. ## Error Semantics
Missing LUT/space blocks. ## Preview/Master Rules
Same transform semantics. ## Fallback/Bake/Blocker
Declared bake/block. ## Acceptance Scenarios
ACC-009. ## Open Questions
HDR metadata policy.
