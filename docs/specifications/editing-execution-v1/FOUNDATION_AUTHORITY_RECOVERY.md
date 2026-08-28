# Foundation Authority, Recovery and Single Edit Path

`CAP-FND-001` defines the reliable authority substrate shared by existing editing capabilities. It does not implement or accept advanced editing semantics.

## Exact time authority

All domain time is normalized `RationalTime`. Conversion to PTS, frames or samples declares `exact`, `floor`, `ceil` or `nearest` rounding. `nearest` resolves a half tie away from zero. Proxy maps are continuous, ordered, non-overlapping and bounded; a gap or value outside the declared range is an error. Frame rate, stream time base and sample rate are distinct values.

## Media identity and relink

An Asset is immutable content identity derived from a streamed cryptographic fingerprint. A path is a typed Original or Proxy location, never the Asset ID. Stream facts and the Original-to-Proxy relation are persisted separately. Worker output is a candidate; Project Host validates the expected identity before persistence. Relink accepts the same bytes at a new location and rejects names or paths whose bytes differ. Changed Original content creates a different identity and makes dependent results stale. A Proxy never satisfies an Original requirement.

## Persistent Worker and jobs

Worker Client owns one long-lived Worker process, performs one handshake per process generation, routes multiple requests/jobs, reports progress, supports cancel and timeout, and restarts after a crash. Automatic recovery is opt-in per idempotent task. Non-idempotent recovery becomes an explicit blocker. Cancelling a media job terminates its FFmpeg subprocess. Worker stdout is protocol-only; logs use stderr.

## Single edit path

Manual, Model, Assembly, Rough Cut and Preset producers currently translate to `CommandEditIntent`. The only implemented authoritative flow is:

`CommandEditIntent -> Resolve/Preconditions -> CommandEditIR -> Simulate -> Validate -> CommitPlan -> Project Host Commit`.

A future command-free semantic Edit Intent requires a Host-owned adapter into `CommandEditIntent`; this specification does not claim that adapter is implemented.

CommandEditIR records base version, actor, targets, semantic references, preconditions, protected references, affected ranges, provenance, reason and expected effects. Presets still compile only into ordinary Timeline Commands. Failed resolution, precondition, simulation or version checks perform no Timeline, Command, application or event mutation.

## Storage and recovery

Project creation installs the one current project-format baseline atomically. Open rejects a non-current format before any write; no database migration or dual-read path exists. Object files use temporary write, fsync, atomic rename and directory durability before a database pointer is committed. Hash verification and orphan reconciliation fail closed. Project locks carry an owner identity and stale locks can be reclaimed without deleting a newer owner's lock. Reopen recovers the last committed Timeline and classifies RUNNING jobs by idempotency.

Preview and Master share one Semantic Render Manifest but use target-specific RenderGraphs and separate ExecutionPlans. Master sources are resolved by Project Host from currently verified persisted Original identity; caller paths and Proxy locations are candidates only.

## Acceptance boundary

`ACC-028` through `ACC-032` are synthetic, focused executable assertions. `ACC-033` runs the formal Project Host path over repository-external authorized media described by `AVE_REAL_MEDIA_MANIFEST`. The manifest and local paths are never committed. Without that manifest the capability remains `implemented_pending_real_media_acceptance` and the work package remains active/blocked.
