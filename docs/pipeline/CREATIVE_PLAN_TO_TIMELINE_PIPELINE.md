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
compiles, and it maps one exact approved Story beat/Evidence pair to an ordinary
`add_clip` command on one unambiguous enabled video track. It orders operations
by approved beat order, converts source ranges through exact RationalTime, and
preflights target-specific Preview/Master plans against one semantic graph
identity. Pacing, semantic trim, reorder, title placement and audio emphasis
block the whole execution; proposal-only operations are never silently omitted.

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
