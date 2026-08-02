# Audio Pipeline

## Purpose
Define deterministic multitrack audio and QC. ## Scope
CAP-AUDIO-001. ## Non-goals
No hidden loudness normalization. ## Capability IDs
CAP-AUDIO-001. ## Domain Objects
AudioClip, Bus, Envelope, DuckingRule, QCReport. ## Schema Requirements
Sample rate/channel layout and RationalTime mapping. ## Timeline Commands
Gain/pan/envelope/fade/routing operations. ## Edit IR Mapping
Intent targets named buses and typed effects. ## RenderGraph Mapping
Audio mix/effect/QC nodes. ## Backend Mapping
Adapter declares filter and pitch capabilities. ## Validation Rules
Sample trim, channels and A/V sync. ## Persistence/Migration Impact
Persist envelopes and measurement reports. ## Error Semantics
Missing audio/clipping explicit. ## Preview/Master Rules
Same mix semantics. ## Fallback/Bake/Blocker
Declared render or blocker. ## Acceptance Scenarios
ACC-004, ACC-010. ## Open Questions
Loudness target profiles.

## WP-RENDER-002 Executable Boundary

Audio clips are source-trimmed, remapped with the corresponding video ratio, delayed to their Timeline placement, mixed per track, then mixed across tracks. Gain, audio-enabled, mute and solo state are enforced before output. Global concatenation of Timeline audio is forbidden. Ducking, automation envelopes, pan, routing buses and loudness normalization remain blocked until their specified observable and QC assertions are implemented.
