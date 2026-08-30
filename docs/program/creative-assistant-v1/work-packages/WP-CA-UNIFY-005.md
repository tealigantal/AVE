# WP-CA-UNIFY-005 Single current Render and Worker execution identity

## Outcome

Use one current `worker-media` adapter identity and one current Worker release
identity for every Render execution. Remove graph-dependent selection of older
adapter/Worker identities and reject any non-current identity before execution.

## Required behavior

- Every Preview and Master ExecutionPlan uses `worker-media@v3`.
- Every successful Render reports `ave-worker-host-r13`.
- Contract schemas accept only the current adapter identity.
- Cache, plan, capability snapshot, Host provenance and Worker validation bind
  the same current identity for every graph, including graphs without Ducking.
- Inputs declaring v2 or an older Worker identity fail closed; no conversion,
  dual execution or old-cache reuse path remains.

## Non-goals

No project database baseline replacement, desktop route redesign, real-media
acceptance or merge.

## Validation

Run contract, RenderGraph, Worker protocol/media/correctness, Vlog toolkit,
Render persistence/bundle/Timeline, type, architecture and documentation gates,
then complete with exact fingerprint Evidence and independent read-only review.
