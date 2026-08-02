# QC and Acceptance

## Purpose
Define evidence-based execution acceptance. ## Scope
All CAP-* acceptance mapping. ## Non-goals
No acceptance by schema existence. ## Capability IDs
CAP-RENDER-001, CAP-AUDIO-001. ## Domain Objects
AcceptanceResult, QCReport, EvidenceRef. ## Schema Requirements
Fingerprint, command, observable result and risk. ## Timeline Commands
None. ## Edit IR Mapping
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
