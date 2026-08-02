# Preset and Skill Interface

## Purpose
Constrain creative automation to composable primitives. ## Scope
CAP-PRESET-001. ## Non-goals
No raw backend-string generation. ## Capability IDs
CAP-PRESET-001. ## Domain Objects
Motion/Transition/Effect/Color/Title/Subtitle/Audio/CompositionPreset. ## Schema Requirements
ID/version/schema/default/subgraph/dependencies/aspect/duration/inputs/assets/fallback/preview/license. ## Timeline Commands
Preset resolves to ordinary commands. ## Edit IR Mapping
Skill output is preset selection plus typed parameters. ## RenderGraph Mapping
Preset supplies declared subgraph. ## Backend Mapping
Resolver handles declared requirements. ## Validation Rules
Validate licenses, schemas and capabilities. ## Persistence/Migration Impact
Pin preset version. ## Error Semantics
Unavailable preset dependency blocks. ## Preview/Master Rules
Declared preview behavior. ## Fallback/Bake/Blocker
Preset declares route. ## Acceptance Scenarios
ACC-015. ## Open Questions
Marketplace trust.
