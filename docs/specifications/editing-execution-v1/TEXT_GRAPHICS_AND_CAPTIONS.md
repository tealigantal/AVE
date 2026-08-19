# Text Graphics and Captions

## Purpose
Define timed text and GraphicScene output. ## Scope
CAP-TEXT-001. ## Non-goals
No dedicated command per decorative style. ## Capability IDs
CAP-TEXT-001. ## Domain Objects
CaptionCue, WordTiming, TextStyle, GraphicScene, AssetRef. ## Schema Requirements
Unicode, font fallback, safe area and style schema. ## Timeline Commands
Add/patch text or graphic clip. ## CommandEditIR Mapping
CommandEditIntent selects typed scene/preset values resolved in CommandEditIR. ## RenderGraph Mapping
Text/graphic node or baked media node. ## Backend Mapping
libass/drawtext/bake mapping is declared. ## Validation Rules
Timing, font/asset availability and CJK/emoji fallback. ## Persistence/Migration Impact
Store asset/license and generated-bake provenance. ## Error Semantics
Missing font/asset explicitly fails. ## Preview/Master Rules
Same layout semantics. ## Fallback/Bake/Blocker
GraphicScene bake or blocker. ## Acceptance Scenarios
ACC-007, ACC-008. ## Open Questions
ASS subset.
