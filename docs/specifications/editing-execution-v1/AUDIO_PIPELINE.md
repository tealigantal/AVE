# Audio Pipeline

## Purpose
Define deterministic multitrack audio and QC. ## Scope
CAP-AUDIO-001. ## Non-goals
No hidden loudness normalization. ## Capability IDs
CAP-AUDIO-001. ## Domain Objects
AudioClip, Bus, Envelope, DuckingRule, QCReport. ## Schema Requirements
Sample rate/channel layout and RationalTime mapping. ## Timeline Commands
Gain/pan/envelope/fade/routing operations. ## CommandEditIR Mapping
CommandEditIntent targets named buses and typed effects resolved in CommandEditIR. ## RenderGraph Mapping
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

Audio clips are source-trimmed, remapped with the corresponding video ratio, delayed to their Timeline placement, mixed per track, then mixed across tracks. Gain, audio-enabled, mute and solo state are enforced before output. Global concatenation of Timeline audio is forbidden. General automation envelopes, pan, arbitrary routing buses and the audio scope outside the focused WP-VLOG-001 slice remain blocked until their specified observable and QC assertions are implemented.

## WP-VLOG-001 Executable Audio Slice

`MasterLoudnessNormalizationV1` persists on the Timeline with configurable target LUFS, true-peak ceiling and tolerance. The product default is `-14 LUFS`, `-1 dBTP`, tolerance `1 LU`. Preview uses a lower-cost loudnorm route; Master measures the rendered mix and supplies the measured values to the deterministic formal pass. Worker output metrics, OutputManifest and QCReport carry input/output integrated loudness, input/output true peak, target, ceiling, tolerance and result. A declared source without audio produces `no_audio`, not a crash.

`DialogueMusicDuckingV1` supports one logical Dialogue/Narration sidechain and one Music bus with threshold, ratio, attack, release and maximum reduction. Existing `AudioRouting.bus` roles are constrained to `dialogue`, `narration`, `music` and `embedded`. No Dialogue or no Music is a deterministic no-op status. Music is split into compressed and reduction-floor branches so maximum attenuation is bounded. General routing graphs, automation envelopes, multi-level sidechains and professional mixing remain blocked.
