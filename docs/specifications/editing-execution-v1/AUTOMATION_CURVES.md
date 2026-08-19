# Automation Curves

## Purpose
Define deterministic animated property evaluation. ## Scope
CAP-KF-001 time spaces, curves, tangents and value kinds. ## Non-goals
No untyped expression engine. ## Capability IDs
CAP-KF-001. ## Domain Objects
AutomationCurve, Keyframe, Tangent, PropertyPath. ## Schema Requirements
RationalTime and typed values. v1 endpoint behavior is a single authoritative endpoint hold; the unused `before`/`after` policy fields were removed rather than exposed with indistinguishable semantics. ## Timeline Commands
Set/clear keyframe and curve commands are CommitPlan operations. ## CommandEditIR Mapping
CommandEditIntent addresses registered property paths resolved in CommandEditIR. ## RenderGraph Mapping
Curves become sampled/analytic node parameters. ## Backend Mapping
Adapter declares interpolation support. ## Validation Rules
Strictly monotonic time, finite values/tangents, registered property paths, value-kind agreement, hold-only boolean/string interpolation, and numeric-only Bézier tangents. BigInt time ratios are scaled before conversion and do not convert absolute timestamps to Number. ## Persistence/Migration Impact
Versioned curves require migration. ## Error Semantics
Unknown path/tangent blocks. ## Preview/Master Rules
Identical evaluator semantics. ## Fallback/Bake/Blocker
Bake only declared sampled curves; otherwise blocker. ## Acceptance Scenarios
ACC-001. ## Open Questions
Sampling tolerance.
