# Creative Plan to Timeline Pipeline

`Creative Contract + Material Evidence Pack + approved Story Plan + selected
Style/Trend advice → approved semantic Edit Intent → Host-owned bounded adapter
→ exact execution approval → CommandEditIntent → Resolve/Preconditions →
CommandEditIR → simulation → validation → CommitPlan → Project Host commit`.

The compiler binds every edit operation to beat and evidence IDs, protected
ranges and a reason. It uses RationalTime and the current Timeline version.
Conflicts, unavailable source identity or unsupported semantics fail closed;
successful commits retain undo/redo, provenance and a comparable prior version.

The implemented v1 adapter is deliberately narrow: only `select_evidence`
compiles. It requires every approved Story Beat to be covered exactly once in
approved order; one Beat may use multiple non-overlapping Evidence ranges, but
their unit-speed RationalTime sum must equal that Beat's approved duration.
Missing or duplicate Beat coverage, overlapping ranges, insufficient source,
inexact timebase conversion, range overrides, `preserve_audio`, retime, loop,
freeze or fill block the whole execution. Proposal-only fields are never
silently omitted.

The source material stays on one disabled reference track. Ordinary `add_clip`
commands target one unambiguous, enabled and empty output video track whose
visual, transition, automation, lock and audio-routing state is neutral; an
enabled solo state elsewhere also blocks compilation. Product review and the
compiler share that predicate. The final render-active extent must therefore
equal the complete approved Story, after which Host preflights target-specific
Preview/Master plans against one semantic graph identity.

Semantic proposal approval and Timeline execution approval are separate. The
read-only preparation result exposes compiler/base/final/source/semantic
digests but no Commands. `editorial_edit_intent.execute` binds that complete
compiled effect through the Stage 2 human channel. Host resolves every exact
authority again before atomically retaining the execution Permission Decision,
CommandEditIR, Timeline and immutable execution record. Identical execution-ID
retries return that record; rebound IDs or effects fail closed.

Stage ownership, approval and fail-closed semantics are defined in
[`CREATIVE_INTELLIGENCE_RUNTIME.md`](../intelligence/CREATIVE_INTELLIGENCE_RUNTIME.md).
The execution boundary decision is in
[`ADR-0022`](../decisions/ADR-0022-semantic-intent-execution-adapter.md).
