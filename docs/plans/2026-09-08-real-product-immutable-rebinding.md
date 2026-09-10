# Real Product copied-project immutable Original rebinding ExecPlan

Completed execution record. Earlier pause, active and blocked checkpoints below
are historical and superseded by the final completion record. The current
work package is governed by [generated current work](../current/WORK.md),
not by those earlier checkpoints.

## Goal

Repair the real Product fixture so its copied review project owns a current
immutable Original before Material Evidence assembly.

## Discovery

- 2026-09-08: The authorized real Product run copied its source project, then
  stopped at `material immutable source is unavailable or stale` before Electron
  review. The source and copied project both reference identical authorized
  bytes and SHA-256; the stored immutable location belongs to the source
  project's internal directory, so Host correctly rejects it for the copy.
- 2026-09-09: Rebinding created the copied project's own immutable Original and
  reached render QC. The verified Original is audible after its initial 1.4
  seconds, but the 60-second multi-clip Master becomes silent after the opening
  material. The emitted graph has exact contiguous ranges; independently
  reproducing its FFmpeg audio filter shows that padding every delayed clip to
  the whole timeline before `amix` truncates the later inputs.

## Decision

Use the existing exact material-permission flow against the copied project's
current original location. That creates a new project-owned immutable snapshot
and preserves the Host's ownership/path invariant instead of bypassing it.

For a same-track multi-clip audio mix, retain every exact clip span through
`amix` and apply the already-existing output padding only after mixing. This
keeps intentional timeline placement, gaps and the final duration behavior
without making QC accept silence.

The resulting bytes differ for the same semantic graph, so `worker-media@v4`
cannot remain cache-compatible. Advance the one current internal adapter to v5
across Contract source, generated bindings, plan/cache identity, Worker
provenance and Host/storage validation; historical v4 artifacts remain
historical rather than being represented as v5 output.

## Validation and recovery

Run the focused Worker media-correctness regression and real Product lane using
a fresh external review root, then the synthetic Product suite, typecheck, sync
and documentation check. Preserve external failed review roots and do not
commit media or their paths.

## Pause checkpoint — 2026-09-09

Work is intentionally paused at the user's request. This package remains
**active** and has no passing evidence or completion claim.

- The copied-product rebinding is verified to reach `renderTimeline`; it no
  longer stops on the source project's immutable Original path.
- The fresh external Product r8 root fails QC with
  `RENDER_QC_BLOCKED:SILENCE`. Its immutable Original is demonstrably audible
  after an initial 1.4 seconds, while both generated renders become silent at
  approximately 12.043 seconds through 60 seconds.
- Captured bound graph inputs are exact and contiguous (0–8, 8–20, 20–29,
  29–37, 37–45, 45–52 and 52–60 seconds). A standalone FFmpeg reproduction
  proves the compiler's current per-clip
  `adelay,apad=whole_dur,atrim` before `amix` loses delayed inputs. The intended
  correction is to mix delayed exact spans first and retain only the existing
  final output padding.
- The working tree contains an **unvalidated partial implementation** of that
  compiler correction and the required v4→v5 / r14→r15 cache-provenance change.
  Generated Contract bindings, affected assertions, Worker regression, and
  authoritative current-version documentation have not yet been updated; no
  synthetic, contract, type, Worker or real Product acceptance command has
  been run after the partial change.
- `pnpm docs:sync` ran at this checkpoint. `pnpm docs:check` then failed with
  `latest evidence fingerprint mismatch creative-assistant-v1`, as expected
  while the only attached evidence predates the unvalidated partial code
  change. This is recorded failure evidence, not a documentation-gate pass.

Resume from this checkpoint by finishing the version-aligned change set,
generating Contract artifacts, adding the two-contiguous-audio regression, and
then using a new external review root. Do not reuse r8 as passing evidence.

## Resume execution — 2026-09-09

User approved completing this package with only the latest v5/r15 identities,
without compatibility or migration. The package now includes the required
Worker execution_plan.py and uses the existing worker:render-correctness:test
script. Existing unrelated worktree changes are preserved.

### Progress

- [x] Read authorities, classify as initialized important project, audit pause.
- [x] Start current package and repair its allowed-path/test-name omissions.
- [x] Finish current-only identity generation and exact-span audio composition.
- [x] Prove contiguous audio, intentional gaps and existing ducking behavior.
- [x] Run fresh external Product/Electron review and current repository gates.
- [x] Record final-fingerprint Evidence, complete this repair and return REAL-001.

### Validation and acceptance

Generate Contract artifacts, then run Contract identity/clean checks, render
property/Worker/protocol tests, basic Vlog, bundle, timeline and Product tests.
Run the real Product route in a fresh external root and verify complete output
duration, audio, QC, review and reopen. Run check and final synthetic acceptance;
record executed results only. Direct human Stage Exit remains REAL-001 work.

### Interfaces and dependencies

Keep existing v2 shapes; the sole current adapter is worker-media@v5 and sole
render Worker provenance is ave-worker-host-r15. No new dependency or adapter.
Host continues to own immutable Originals, exact authorization and publication.

### Idempotence and recovery

Keep failed external roots; every Product attempt uses a new root. Do not
convert old results or reuse old cache identities. Preserve previous worktree
hunks, historical Evidence and source media. Regenerate all derived artifacts.

### Decision log

Restore the pre-existing storage profile type check: removing it is unrelated
to audio repair. Keep exact source spans before same-track mixing and only pad
the completed output. No authority boundary changes or new ADR are required.

### Outcomes and retrospective

Pending executed verification and independent review.

### Discovery — fresh Product r9

The exact-span repair passes the new encoded-audio regression; restoring the
old filter in an isolated temporary Worker copy fails at 2.1 seconds with zero
440-Hz amplitude. Existing ducking and timeline regressions also pass.

Fresh real Product r9 still blocks SILENCE, but source and rendered output now
share only the original's initial silent interval; the prior 12-to-60-second
loss is gone. Select the authorized fixture's audible 2..62-second range using
integer source ticks, retaining a complete 60-second Story and unchanged QC.
Use a new external root for the next attempt. No original bytes are changed.

### Discovery — fresh Product r10

The full-duration render and QC now pass. Electron correctly rejects the copied
Pipeline fixture's noncanonical track topology. The disposable Product fixture
will rebuild empty tracks via Host Commands using the existing desktop track
constant, assert that topology before expensive rendering, and prepare a new
execution on video-main. This is test setup only, not production conversion.
The next fresh root retains source-byte, full-duration and QC invariants.

### Validation checkpoint — 2026-09-09

- Contract check, identity, roundtrip, generated cleanliness, typecheck,
  architecture, Worker lint/typecheck, render graph/bundle/protocol/correctness,
  basic Vlog toolkit, timeline render and Product synthetic gates passed.
- All check script components after its two Evidence-metadata preconditions
  passed in declared order, including full Stage 2 and foundation synthetic
  acceptance. This is component execution, not yet a passing `pnpm run check`.
- `pnpm run acceptance:final:synthetic` passed. It does not claim real media.
- `git diff --check` passed.
- `docs:check` currently fails the expected impacted capability scope and latest
  Evidence fingerprint checks. Fresh executed-evidence records are still due;
  historical applicability entries will not be rewritten to disguise changes.
- Product r11 stopped on unavailable imported-location probe metadata before
  rendering. The fixture now directly probes the Original for its exact range
  bound; Host independently validates authorized content as before.
- Product r12 reached current Preview playback, then feedback timed out. The
  Renderer requires an explicit target selection, but the old Electron harness
  fills only text/duration and leaves the target placeholder selected. No
  permission, production UI or QC change is needed. Requested user scope
  authorization for the existing test-owned Electron harness file.

Independent read-only review found no new P0/P1 implementation defect. Its
recommended exact r15 assertions and Worker v4 rejection regression have been
implemented and exercised in the component replay.

## Recoverable blocked checkpoint — 2026-09-09

Full pnpm run check exited 0; final synthetic acceptance and diff whitespace
checks passed. Evidence: EVD-20260909-WP-CA-REAL-003-HARNESS-BLOCKED. Scope-specific supplemental
regression Evidence remains in the preceding REGRESSION-PRECHECK record.

The package is blocked with DEBT-CA-REAL-003-HARNESS pending the requested user
scope extension. No completion, real Product acceptance or Stage Exit claim
was made. Historical evidence and applicability index entries were preserved.

### Remaining concrete work

After scope authorization, add the existing Electron harness and its matching
desktop-boundary test to this package. Set package status ready, start it with
docs:start, then select an explicit current editable output target, use a valid
one-second form input with requestSubmit, and narrowly simulate its exact
feedback creation and rejection confirmations. Reject every other dialog.
Compare stale-history IDs across reopen, verify the current execution/render
and new feedback/decision identities, and fail promptly on harness errors.
Update SYSTEM_ARCHITECTURE's test-only confirmation description.

Use a new external Product root after r12; preserve all failures. Run the real
Product route and affected gates, record new final-fingerprint Evidence and
resolve this Debt. Only then complete REAL-003 and restore REAL-001 for actual
human acceptance. No media, private paths, commit, push or publication belongs
to this checkpoint.

## Authorized harness resume — 2026-09-09

User confirmed adding the existing Electron harness and matching desktop
boundary test. Resume the same important-project repair, retaining current
production authority and all prior changes. Complete explicit feedback target
selection, valid exact one-second form submission, bounded test confirmations,
failure diagnostics and current/history reopen assertions, then rerun fresh
real Product acceptance and record final Evidence.

### Harness validation checkpoint

The authorized harness uses a Main-derived exact target and dialog detail,
valid one-second native form submission, one-shot creation/rejection, and
reopen history comparisons. The boundary test exercises the actual dialog
Proxy in an isolated in-memory VM: wrong detail/default/cancel/noLink/type/
title/buttons/mode, old intent, execution/workspace rebound and concurrent
rejection replay are denied. Desktop boundary, Electron smoke, typecheck and
architecture checks run against the current harness.

Real r13 created feedback but attempted the effect-preview action while the
UI was still busy; waiting for an enabled current button fixes that test race.
The next fresh r14 run verifies the remaining full journey.

### Read-consistency observation

Real r14 persisted the new feedback creation and rejection, then a polling
workspace read crossed that commit and failed with the exact
PRODUCT_WORKSPACE_CHANGED_DURING_READ conflict. The harness now bounds
read-only retries of that precise conflict to its existing polling deadline;
commands are never retried and Host consistency checks are unchanged.
The new r15 attempt tests the final review and reopen flow.

## Final validated checkpoint — 2026-09-09

Fresh Product r16 passed the full automated feedback/rejection/reopen journey.
Both targets encode 60 seconds with passing QC under v5/r15. Final pnpm run
check and acceptance:final:synthetic exited 0; independent read-only review
found no blocker. Final Evidence: EVD-20260909-WP-CA-REAL-003-COMPLETE.
The exact scoped harness debt is resolved. Complete this repair and return
REAL-001 to current Pipeline reconciliation and direct human review. Automated
playback start is not proof of a human watching the entire encoded output.

`pnpm docs:complete -- WP-CA-REAL-003 EVD-20260909-WP-CA-REAL-003-COMPLETE`
exited 0. REAL-001 is dependency-ready for handoff.
