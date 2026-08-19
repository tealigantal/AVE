# QC and Acceptance

## Purpose
Define evidence-based execution acceptance. ## Scope
All CAP-* acceptance mapping. ## Non-goals
No acceptance by schema existence. ## Capability IDs
CAP-RENDER-001, CAP-AUDIO-001. ## Domain Objects
AcceptanceResult, QCReport, EvidenceRef. ## Schema Requirements
Fingerprint, command, observable result and risk. ## Timeline Commands
None. ## CommandEditIR Mapping
Record committed version. ## RenderGraph Mapping
Record graph/backend manifest. ## Backend Mapping
Compare adapters by declared tolerance. ## Validation Rules
Every claimed state has Evidence. ## Persistence/Migration Impact
Evidence append-only. ## Error Semantics
Failure is preserved, not overwritten. ## Preview/Master Rules
Compare semantic output. ## Fallback/Bake/Blocker
Assert declared result. ## Acceptance Scenarios
ACC-001 through ACC-015. ## Open Questions
Visual diff policy.

## WP-VLOG-001 Focused Acceptance

ACC-016 through ACC-019 require actual encoded synthetic media. Assertions cover 9:16 geometry, mode-specific pixels and focal crop movement; input/output LUFS and true peak; Music attenuation during Dialogue and smooth recovery; frame brightness and audio amplitude ramps; Preview/Master semantic identity; cache invalidation; Host/Worker validation; persistence; Undo/Redo; no-audio behavior; and failed-publication atomicity. These focused records do not promote ACC-003 or the broader advanced capability families.
