# WP-RENDER-001 RenderGraph v2 and adapters

## User-visible outcome
Creators see identical semantic Preview/Master and explicit failures. ## Capability IDs
CAP-RENDER-001. ## Specifications
RENDER_GRAPH_V2.md, BACKEND_ADAPTERS.md, QC_AND_ACCEPTANCE.md. ## Current repository gap
P0 graph does not prove v2 resolver/cache/adapters. ## Allowed paths
Manifest allowed paths. ## Forbidden paths
Manifest forbidden paths. ## Contract changes
Graph/adapter manifests. ## Timeline changes
Derived only. ## Edit IR changes
Backend-neutral. ## RenderGraph changes
V2 graph/resolver. ## Backend changes
FFmpeg retained; candidates bounded. ## Migration
Host-persisted manifests. ## Tests
timeline-render:test, acceptance:final:synthetic. ## Acceptance
ACC-012 to ACC-015. ## Evidence requirements
EVD output and error paths. ## Failure conditions
Proxy master/silent omission. ## Definition of Done
Deterministic recovery and explicit resolver result.
