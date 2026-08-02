# WP-RENDER-002 RenderGraph v2 correctness, execution contract and evidence hardening

## User-visible outcome

Committed Timeline semantics are either executed identically in Preview and Master or rejected before Worker execution with a persisted structured blocker. Time remap, timeline placement, multitrack audio, execution contracts, semantic hashes, cache keys, and render persistence must be deterministic and recoverable.

## Capability and acceptance scope

This correction package re-audits CAP-TL-001 through CAP-RENDER-001 and ACC-001 through ACC-015. It does not shrink the v1 product scope. Incomplete capabilities are downgraded to `specified` or `blocked`; they are not silently treated as executed.

## Dependency

WP-RENDER-001. This package contains that baseline and corrects its implementation and evidence claims.

## Allowed paths

The machine-readable manifest is authoritative. The package includes contracts, Timeline and RenderGraph core, Project Host and Storage, contract runtime and Worker client, Worker Host, tests, documentation tooling, documentation, and the root package command surface.

## Plan

`docs/plans/2026-08-02-rendergraph-v2-hardening.md`.

## Failure conditions

Stop rather than claim completion if multitrack audio remains globally concatenated, timeline placement or A/V remap can diverge, the Worker cannot validate the Host plan, persistence is not atomic and idempotent, canonical hashes drift, unsupported semantics are ignored, generated documents need manual edits, or synthetic evidence would need to be presented as real media.

## Definition of done

All still-valid Critical and Major review findings are fixed with regression evidence; Host-generated execution plans are schema-validated Worker contracts; render bundles are atomic and recoverable; media-level assertions prove time, placement, overlay, and audio behavior; machine-readable CAP/ACC state matches actual evidence; required validation and replacement-PR checks pass.
