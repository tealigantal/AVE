# WP-AUDIO-001 Audio pipeline

## User-visible outcome
Creators obtain controlled mix, ducking and QC. ## Capability IDs
CAP-AUDIO-001. ## Specifications
AUDIO_PIPELINE.md. ## Current repository gap
P0 audio render is not v1 mixing proof. ## Allowed paths
Manifest allowed paths. ## Forbidden paths
Manifest forbidden paths. ## Contract changes
Bus/envelope/QC types. ## Timeline changes
Gain/routing commands. ## Edit IR changes
Typed mix intent. ## RenderGraph changes
Audio graph/QC nodes. ## Backend changes
Filter capability map. ## Migration
Persist measurement. ## Tests
timeline:audio-caption:test, worker:qc:test. ## Acceptance
ACC-004, ACC-010. ## Evidence requirements
EVD with loudness. ## Failure conditions
Clipping/missing channel/desync. ## Definition of Done
Mix and QC observable.
