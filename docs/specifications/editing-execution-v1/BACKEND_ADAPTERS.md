# Backend Adapters

## Purpose
Define adapter and capability registry boundary. ## Scope
CAP-RENDER-001 and CAP-TRANS-001 mapping. ## Non-goals
No MLT adoption decision. ## Capability IDs
CAP-RENDER-001, CAP-TRANS-001. ## Domain Objects
Adapter, RegistryEntry, ExecutionPlan, Error. ## Schema Requirements
Backend/version/capability/parameter mapping. ## Timeline Commands
None. ## Edit IR Mapping
IR remains backend-neutral. ## RenderGraph Mapping
Adapter consumes graph subtrees. ## Backend Mapping
FFmpeg retained; MLT candidate; Graphic Bake/AI Asset I/O defined. ## Validation Rules
Capability/version and determinism checked. ## Persistence/Migration Impact
Pin backend version in manifest. ## Error Semantics
Unsupported/transient/input/QC taxonomy. ## Preview/Master Rules
No semantic divergence. ## Fallback/Bake/Blocker
Mandatory resolver output. ## Acceptance Scenarios
ACC-012, ACC-014, ACC-015. ## Open Questions
MLT official validation.
