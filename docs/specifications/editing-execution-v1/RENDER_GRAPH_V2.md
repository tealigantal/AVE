# RenderGraph V2

## Purpose
Define authoritative execution graph and media/cache behavior. ## Scope
CAP-RENDER-001. ## Non-goals
No backend-owned project state. ## Capability IDs
CAP-RENDER-001. ## Domain Objects
RenderGraph, Node, Profile, CacheKey, OutputManifest. ## Schema Requirements
Version, deterministic hashes, source/proxy/original identity. ## Timeline Commands
No direct graph mutation; graph derives from committed timeline. ## Edit IR Mapping
Resolved intent contributes typed graph nodes. ## RenderGraph Mapping
This specification owns graph versioning. ## Backend Mapping
Resolver picks versioned adapter. ## Validation Rules
No dangling/cyclic nodes; master original links required. ## Persistence/Migration Impact
Host persists manifests/jobs only. ## Error Semantics
Classified structured diagnostics. ## Preview/Master Rules
Shared graph semantics. ## Fallback/Bake/Blocker
Resolver decision in manifest. ## Acceptance Scenarios
ACC-012 to ACC-015. ## Open Questions
Cache quota.
