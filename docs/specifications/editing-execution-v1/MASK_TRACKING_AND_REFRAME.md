# Mask Tracking and Reframe

## Purpose
Define masks, tracking evidence and corrective composition. ## Scope
CAP-MASK-001. ## Non-goals
No unreviewed AI overwrite. ## Capability IDs
CAP-MASK-001. ## Domain Objects
Mask, TrackingData, Confidence, Correction, ReframePolicy. ## Schema Requirements
Typed shape, coordinate space, frame-time samples and model provenance. ## Timeline Commands
Set mask, attach tracking, correct sample, stabilize/reframe. ## Edit IR Mapping
Intent points to registered tracking outputs. ## RenderGraph Mapping
Matte/tracking/reframe nodes. ## Backend Mapping
Backend declares native/bake capability. ## Validation Rules
Lost frames/confidence require policy. ## Persistence/Migration Impact
Asset-linked tracking cache with invalidation. ## Error Semantics
Missing/low-confidence data is explicit. ## Preview/Master Rules
Same tracked path. ## Fallback/Bake/Blocker
Bake or blocker recorded. ## Acceptance Scenarios
ACC-005, ACC-006. ## Open Questions
Model selection.
