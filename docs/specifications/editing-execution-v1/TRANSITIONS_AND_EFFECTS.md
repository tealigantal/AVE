# Transitions and Effects

## Purpose
Define registered transition/effect semantics. ## Scope
CAP-TRANS-001. ## Non-goals
No arbitrary effect strings. ## Capability IDs
CAP-TRANS-001. ## Domain Objects
Transition, EffectInstance, EffectSchema, Handle. ## Schema Requirements
Versioned ID, typed/ranged parameters, alpha/color semantics. ## Timeline Commands
Attach/remove/reorder effect and transition. ## Edit IR Mapping
Only registry IDs and values resolve. ## RenderGraph Mapping
Two-input transition and parameterized effect nodes. ## Backend Mapping
Each registry entry declares preview/master mappings. ## Validation Rules
Input count, handle overlap and parameter range. ## Persistence/Migration Impact
Pin effect version and migration. ## Error Semantics
Missing registry/version blocks. ## Preview/Master Rules
Same semantic parameters. ## Fallback/Bake/Blocker
Mandatory declared resolver result. ## Acceptance Scenarios
ACC-003, ACC-015. ## Open Questions
Plugin sandbox policy.

## Current executable boundary

Transitions require explicit source-handle semantics that preserve both incoming and outgoing requested media ranges. Until that model is implemented, every transition is a Host resolver blocker and Worker rejects transition nodes defensively; FFmpeg `xfade` plus cloned tail padding is not an acceptable substitute. Registered static effects remain governed separately by their adapter declarations.
