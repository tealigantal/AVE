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

## WP-VLOG-001 Thin Preset Boundary

The basic vertical Vlog preset may select only the versioned `StaticReframeV1`, `MasterLoudnessNormalizationV1`, `DialogueMusicDuckingV1` and `ClipBoundaryFadesV1` settings and compile them to ordinary Timeline Commands. It cannot emit raw FFmpeg strings, create dynamic tracking, invent a bus graph or represent clip fades as transitions. This evidence covers only this constrained compiler surface and does not complete the broader Preset/Creative Skill marketplace scope.
