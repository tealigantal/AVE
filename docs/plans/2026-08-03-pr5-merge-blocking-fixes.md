# PR #5 Merge-blocking Semantic Correctness Fixes

## Objective

Close the five final-head review findings on PR #5 without expanding the claimed editing-execution-v1 capability boundary.

## Scope

- Fail closed before Worker submission for transitions whose source-handle semantics are not executable.
- Fail closed for unsupported time-map pitch policy.
- Execute independently supplied transform scale axes with exact validation.
- Honor the authoritative Timeline duration when trailing gaps or captions extend beyond the last clip.
- Add Host, Worker and encoded-media regression evidence and reconcile programme status.

## Invariants

- Unsupported committed semantics persist a blocker bundle and never reach FFmpeg.
- Worker independently rejects a plan that bypasses Host blockers.
- Preview and Master share semantic decisions.
- No capability is promoted beyond the observable acceptance evidence.

## Validation

- `pnpm run render-graph:test`
- `pnpm run timeline-render:test`
- `pnpm run worker:render-graph:test`
- `pnpm run worker:render-correctness:test`
- `pnpm run docs:check`
- `pnpm run check`

## Progress

- 2026-08-03: Review findings reproduced from final HEAD `ee63abc`; implementation pending.
- 2026-08-03: Host blockers, Worker defenses, independent scale execution and authoritative trailing duration implemented; focused RenderGraph, Worker protocol/media, Timeline render, lint and type checks passed.
