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

## WP-RENDER-002 Correctness Contract

The schema-version 2 semantic manifest is target-neutral and canonically serialized with recursively sorted keys and tagged arbitrary-precision integers. Its hash covers every executable source, trim, placement, track-state, audio, time-map and sink semantic. Preview and Master reuse that hash while target, profile, range, adapter version and sorted input identities produce distinct cache keys and plan IDs.

Every semantic node has exactly one resolver decision. Unsupported semantics are graph blockers and are persisted without Worker submission; they are never omitted from a supposedly successful graph. Execution requires the versioned schemas for diagnostics, capability snapshots, resolver decisions, semantic manifests, ExecutionPlans, Worker request/progress/result and output manifests.

A completed render publishes only as an atomic Render Bundle with both targets and immutable output objects. A blocked attempt publishes only its plans and diagnostics. Real-media acceptance is separate from encoded synthetic-media evidence and cannot be inferred from a passing synthetic suite.

The Worker uses the Host-declared `timeline_total_duration` as the authoritative output bound after validating it is consistent across sources and not shorter than any clip. Explicit trailing gaps and captions therefore remain present after the last media clip.

## WP-VLOG-001 Identity and Execution

Static reframe, clip fades, Dialogue/Music ducking and Master loudness are explicit target-neutral nodes. Their complete versioned parameters participate in the semantic manifest/hash; the cache key additionally includes target, profile and source identities including declared audio availability. Preview and Master must therefore share the semantic hash but have distinct plan/cache identities. Worker mirrors the canonical identity and defensively validates every range before FFmpeg. Output manifests may include structured audio-normalization measurements. Missing audio is an explicit result, while invalid settings or roles fail before output publication.
