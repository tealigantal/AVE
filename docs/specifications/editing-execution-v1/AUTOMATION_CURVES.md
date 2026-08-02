# Automation Curves

## Purpose
Define deterministic animated property evaluation. ## Scope
CAP-KF-001 time spaces, curves, tangents and value kinds. ## Non-goals
No untyped expression engine. ## Capability IDs
CAP-KF-001. ## Domain Objects
AutomationCurve, Keyframe, Tangent, PropertyPath. ## Schema Requirements
RationalTime, typed values and boundary policy. ## Timeline Commands
Set/clear keyframe and curve commands are CommitPlan operations. ## Edit IR Mapping
Intent addresses registered property paths. ## RenderGraph Mapping
Curves become sampled/analytic node parameters. ## Backend Mapping
Adapter declares interpolation support. ## Validation Rules
Monotonic time and finite ranges. ## Persistence/Migration Impact
Versioned curves require migration. ## Error Semantics
Unknown path/tangent blocks. ## Preview/Master Rules
Identical evaluator semantics. ## Fallback/Bake/Blocker
Bake only declared sampled curves; otherwise blocker. ## Acceptance Scenarios
ACC-001. ## Open Questions
Sampling tolerance.
