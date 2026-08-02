# ADR-0010 Versioned ExecutionPlan Worker Contract

## Status

Accepted for WP-RENDER-002.

## Context

RenderGraph v2 previously allowed Project Host to resolve an adapter while sending only a graph to Worker. Worker could therefore compile a different interpretation, and persisted plans described intent after execution rather than authorizing it. Canonical hashing also depended on ordinary JSON behavior, which is not stable for `bigint`, key order, non-finite numbers, or cross-language recomputation.

Project Host remains the authority for project state and target/source selection. Worker remains an untrusted media executor that must not access SQLite or infer missing decisions.

## Considered Options

1. Let Worker resolve capabilities independently. This creates two authorities and permits Preview/Master or Host/Worker drift.
2. Pass an informal plan beside the graph and trust Host hashes. This does not detect protocol tampering or implementation drift.
3. Make a versioned ExecutionPlan the mandatory cross-language request contract and require Worker to recompute every identity before compilation.

## Decision

Adopt option 3. Project Host resolves one `render-execution-plan` schema-version 2 document for each target. It contains the semantic manifest and hash, target, profile, selected adapter and version, sorted capability snapshot, one resolver decision per semantic node, input identities, cache key and plan ID. Worker accepts `render-timeline-request` schema-version 1 only when the graph and plan are both present and schema-valid.

Worker independently canonicalizes the semantic payload, recomputes the semantic hash, cache key and plan ID, verifies target and adapter constraints, and requires exactly one execute decision for every executable node with no blocked diagnostic. Missing, extra, conflicting or tampered fields fail before FFmpeg compilation. Results and output manifests carry the accepted plan, semantic and cache identities back to Host.

Canonical serialization recursively sorts object keys, tags arbitrary-precision integers, normalizes negative zero, rejects non-finite numbers, undefined values and cycles, and is implemented equivalently in TypeScript and Python. JSON Schemas under `contracts/schemas` are the protocol authority; generated bindings are derived artifacts.

## Authority, Compatibility and Migration

The Timeline and semantic RenderGraph remain backend-neutral authority. Project Host is the sole resolver authority; Worker validates and executes but cannot change the plan. Existing internal graph schema-version 1 remains readable inside the new request. The new ExecutionPlan is an additive versioned protocol, but requests that omit it are intentionally rejected rather than compatibility-filled. No database backfill is required; new render attempts use the new contract.

## Consequences and Failure Semantics

Host and Worker drift becomes a deterministic protocol failure instead of a potentially plausible render. Unsupported semantics produce structured resolver blockers and are persisted without Worker submission. Cache identities now include target, profile, range, adapter version and sorted source/input identities. A backend upgrade requires an explicit capability-snapshot and adapter-version change, producing a new plan/cache identity.

## Security

Worker receives only resolved paths and immutable plan data. It gains no SQLite, project-state or model-SDK access. Rejecting undeclared nodes prevents request injection from silently expanding the executable filter graph.

## Testing

Contract generation/compatibility and TS-to-Python-to-schema round trips cover all new schemas. Negative Worker tests cover missing plans, semantic-hash tampering, target mismatch, cache mismatch and missing decision coverage. Property tests cover deterministic key order, track order and source identity.

## Rollback

Rollback requires reverting Host, Worker and contract schemas together. Render attempts created under the new protocol remain auditable by their immutable plan/output manifests; they must not be rewritten as legacy requests.

## Date

2026-08-02
