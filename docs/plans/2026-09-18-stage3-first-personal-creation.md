# Stage3 first real personalized creation — ExecPlan

## Current checkpoint state (2026-09-24)

Latest user-selected design is integrated. Full check 38154 and final synthetic
92736 exited 0 on a74347cd30895542f7f4345d01acaa9680350c09e2a253cce0d57e8319895fa9. Evidence: [EVD-20260924-S3-SELECTED-DESIGN-GATES](../evidence/runs/EVD-20260924-S3-SELECTED-DESIGN-GATES.md).
Real checkpoint is incomplete: configured multimodal service returns HTTP 401;
local installed model is text-only. Same WP is blocked with active Debt, seven
real acceptance rows blocked. No new commit/push/PR; task branch retained.
Real outputs/recording and held-out semantics await usable model configuration.
Historical progress below is retained and is not the current interface contract.

## Purpose / Big Picture

Deliver the user's first reviewable real personalized creative loop, then stop
for external review. This is not completion of Stage3 or its six candidate
capabilities. Programme owner: WP-S3-INTEGRATION-001; root is sole source writer.

## Context and Orientation

Started from clean `codex/stage3-document-plan` at `3521aa8` (planning commit on
`1434d00`). Fresh fetch shows remote main `19e7945` merged PR26. No planning PR
was found; no merge is performed. Task branch: `codex/stage3-first-personal-creation`.
Authority: Stage3 plan, candidate index, ADR-0028, Creative Intelligence Runtime,
Creative Quality Benchmark C1–C9. The starting snapshot used Stage2 fixed Story
generation, single inward feedback trim and reference-only desktop edits. Current
engineering changes and retained failures are recorded below; Desktop now uses
the Creation entry, with production-model/real-input work still outstanding.

## Progress

- [x] Read authority chain, inspect clean Git baseline and fresh remote PR state.
- [x] Request missing real inputs and current data/model/cost consent together.
- [x] Register first integration programme/package, dependencies and allowed paths.
- [x] Run docs:start and validate registration (docs:check passed before source edits).
- [x] Request/revision/draft foundation: focused Fixture tests use actual Host/SQLite,
  injected persistence failure, no wrong events and reopen; targeted Gateway tests pass.
- [x] Read-only review and fixes; compiler/profile/Host fixture integration.
- [x] Full repository check and final synthetic gate on fingerprint 610444b2b4109b8c47d9d63e04c1e76f781a35850b7e1d3fddfa6b0e05c880e8.
- [x] Persistent budget/Host lifecycle fixes and full check/final synthetic on fingerprint b8cbf558f1bf353377b9c3b9ba3c39f9deb99cda01af79df9526e45e403dc135 (2026-09-20).
- [x] Public source-bound generation through actual Host/Worker/SQLite and local HTTP fixtures; generation/lifecycle review fixes and Stage3 focused gates (2026-09-23).
- [x] Full check and final synthetic on fingerprint 2e3849dfb8f6b4c1f226315b374b8d8f1a33b50393412e694486ba2b1a9c9375 (2026-09-24).
- [x] Implement request/draft/race and model budget/error boundaries; targeted
  engineering evidence is recorded below, separate from real provider approval.
- [x] Integrate Host feedback/profile/observation/generation/manual rendering and
  current Desktop request/draft controls; controlled engineering journeys pass.
- [x] Current Desktop full check (65366) and final synthetic (7930) passed on
  948dfa0219b5a78c1cfc7254b57a291df503603d80c96811d5e73b0a0ec8fd82.
- [ ] Supply approved real inputs/design and implement the selected production
  model counting/tariff/media configuration, then validate the real workspace.
- [ ] Execute C1/C2/C3/C6 joint path plus involved C4/C8/C9; save original failures.
- [ ] Complete targeted review, repository gates, real artifacts and reopen.
- [ ] Commit/push task branch, draft PR, final handoff; stop without merging.

## Surprises & Discoveries

- Actual preload files differ from candidate path; registered exact consumers.
- Host stores model provider configuration but never calls it for main generation.
- Gateway checks token use only after response, lacks cancellation, and loses
  original errors when wrapping provider failures. This is not sufficient authorization.
- Only a DeepSeek credential-presence flag was observed; no secret was printed.
  Presence does not authorize calls. No external call has been made.

## Decision Log

- Reuse existing programme tooling with one new integration package; never mark
  all candidate S3 packages done because one joint path works.
- Keep checked-in private-input inventories free of paths/content; exact private
  inputs and model diagnostics belong in an authorized external evidence directory.
- Preserve selected agent model/reasoning settings; read-only agents inherit them.
- Prefer current object/reference/event persistence without changing project format.

## Plan of Work

First establish actual request and commit invariants. Then connect model-derived
material/creative plans to existing Commands and target-specific render pipeline,
consuming the profile owner and correction observations. Connect exact approved
HTML after it is available. Validate the first representative source-supported
case early; no invented C3 facts. Update this record at recoverable checkpoints.

## Concrete Steps

`pnpm docs:start -- WP-S3-INTEGRATION-001`, `pnpm run docs:check`; implement and
execute named focused tests. Register new exact test scripts as they exist.
Run `pnpm run check` and `pnpm run acceptance:final:synthetic` for final source.
Real commands are registered only after implemented and after bounded consent.

## Validation and Acceptance

Fixture races prove exact cause and no wrong Timeline/event commit; real model
and media establish actual creative output; Electron captures establish the
workbench/reopen path. None implies human aesthetic acceptance. Preserve old
failed runs, current exact source fingerprint and source/target artifacts.

## Idempotence and Recovery

Request/revision/base/effect identity is immutable. Replayed request conflicts
fail; cancellation or newer intent/base invalidates old candidates. Profile
deletion/final use follows user-coordination then project-lock order. Existing
projects and originals are preserved; no automatic migration or cleanup.

## Artifacts and Notes

External inputs pending: consented history/reference; two independent held-out
new-project source sets; approved HTML with expected SHA-256 from Workspace
Design; provider/model, allowed data fields, retention, fee and call ceilings.
Desktop/Documents/Downloads filename search did not locate approved HTML or
Stage3-authorized source sets. Unrelated discovered media is not authorized.

## Interfaces and Dependencies

S3-01 owns request/revision/draft shared identity. S3-02 supplies correction and
principle provenance; S3-03 owns user-profile DB; S3-04 generates and compiles;
S3-05 projects Host truth into the approved workbench. Existing timeline edit
IR/CommitPlan, immutable media and semantic render identities remain mandatory.

## Outcomes & Retrospective

In progress. No Stage3 real creative capability, real film or acceptance claimed.

### Recoverable implementation record — 2026-09-18

New `creation-session.v1` contract and generated TS/Python/runtime validators;
trusted Host request channel, immutable revisions/cancellation and private
compiler-to-draft commit seam. Storage uses existing v2 object refs, checks CAS
inside the Timeline transaction, binds draft to run/Timeline/Edit IR, and keeps
playback/adoption independent. Read-only review found storage semantic checks,
history immutability and IR binding missing in the first version; fixed and added
negative assertions. No desktop/model generation entry has switched yet, so
single-version Stage2 replacement is still unfinished.

Observed failures retained: first typecheck exposed generator `null` becoming
`unknown`; fixed null generation for TS/Python rather than editing generated
files. Second fixture run correctly failed after error moved to a typed code;
assertion now checks the exact code. Host test used nonexistent track `name`
property; typecheck rejected it and test now uses supported opacity.

Passed so far: contracts:check (62 contracts), typecheck after contract/gateway
changes, architecture, existing model-gateway:test, Stage3 request property,
draft storage and trusted Host tests. These are independent boundary results,
not the final source/gates or real-media evidence. No model network calls/cost.
Next: finish targeted gateway tests, local profile owner and deletion coordination,
then integrate source-bound generation/compiler and approved workspace.

### Recoverable boundary integration record — 2026-09-18 (second implementation record)

Added one exclusive user-profile owner with current-consent filtering, one-off
exception selection, source deletion and a short serialization gate for actual
network dispatch/final synchronous project commit. User DB mechanics remain in
project-storage; the logical profile owner never opens project.sqlite. Deletion
tests cover both ordering directions, secure removal from the live DB and reopen.

Added creation-plan schema/validators and exact RationalTime compilation for
source-bound unequal shots, linked sound/J-cut, captions, reframe and supported
grade. Host initialization accepts an explicit sequence timebase. Content
preservation is an Edit IR precondition, distinct from unchanged hard protected
refs; caption-only changed ranges preserve unrelated range locks. Host integration
fixtures now exercise real IR/CommitPlan/SQLite/reopen and deletion-before-commit.
No arbitrary equal split or fixed narrative template was added.

Read-only reviewers identified and root fixed: preserved clip movement rejected
by old protection; zero fades invalid; absolute source PTS incorrectly required
to align to output frames; caption relative preservation; whole-track caption
lock false positive; omitted prior transform/effect semantics; failed/paused runs
remaining committable; gate denial misreported as sent; known usage lost on
cancel/truncation; cancellation during successful audit returned success.
First rerun exposed error ordering hiding REQUEST_REVISION_STALE behind a generic
run-state failure; moved the state guard after specific stale checks and retained
the precise assertions. All fixes are code/input changes before rerun, not retries
of an unchanged failing run.

Current passed: stage3:check (request/property/Host/storage, Gateway, profile,
compiler-to-Host suites), model-gateway:test, typecheck (64 generated contracts),
architecture (298 scanned source files). These are controlled fixtures. New
Stage3 tests are registered in both required_tests and repository check.

Still unfinished: source understanding and real model main call; cumulative
token/cost reservation ledger; verified model-derived learning/correction;
render-ready output/QC binding and workbench single-version replacement. No
real Stage3 output, screen recording, external model use, call expense or human
acceptance exists. Exact design, authorized history plus two held-out source
sets, provider/model/data scope and call/fee ceilings remain requested inputs.
Before their arrival, finish regression gates and persist truthful partial
Evidence; do not call docs:complete, commit/push as completed, or create a
checkpoint-ready PR. Dedicated branch: codex/stage3-first-personal-creation,
base 3521aa8 (reviewed planning branch, not merged by this task).

### External-input stop — 2026-09-18

[Engineering-pass/input-blocked Evidence](../evidence/runs/EVD-20260918-S3-ENGINEERING-PASS-INPUT-BLOCKED.md)
records full check and final synthetic exit 0. The final review also fixed caption
paint-order range coverage, unsafe fade integers and cancellation before replay
write. The first full check failed when prefixed protection denied first creation
of a future protected output; code now distinguishes creation from mutation, and
both the targeted Stage2 workspace rerun and final full check passed. Earlier
Evidence retains the failure and prior fingerprints.

Package is blocked, all real C1/C2/C3/C4/C6/C8/C9 acceptance remains blocked,
capability stays specified. No new source commit/push or draft PR. No real Stage3
model/media result or recording exists. This stop does not complete the goal.
Required external inputs are listed above; substantive implementation remainder
is explicit, not assigned to external inputs as if already finished. Resume this
same package after recording the inputs: set blocked to ready, run docs:start,
and continue from the tested local working tree without overwriting it. Do not
start a new checkpoint or merge the planning branch.

### Resume independent implementation — 2026-09-20

The earlier whole-goal block was too broad: missing real-input/fee/design
authorization blocks the corresponding real execution and visual work, while
independent Host orchestration and cumulative budget work can continue. The
user goal has resumed; this same package returned through ready + docs:start,
with the same scope and sole root writer. Historical blocked Evidence is kept.
The external input debt remains active and real acceptances remain blocked.

Next implement persistent per-attempt reservations and immutable settlements
inside request state, with final dispatch under profile coordination, no refund
for unknown sent usage, late-result accounting after cancellation/revision,
and no duplicate dispatch after reopen. Then connect actual evidence-bound
generation/compilation and render/QC identity. No paid call or private upload
is authorized by this resumption. Record progress before ending a goal turn;
do not treat the external acceptance debt as a reason to stop independent work.

### Persistent budgets and bounded model lifecycle — 2026-09-20

Implemented immutable request-level call reservations and settlements. Actual
adapter serialization supplies wire digest, bytes and an explicitly configured
input token bound before the profile-coordinated synchronous reservation/send.
Retries consume separate reservations; revisions/reopen preserve totals. Unknown
sent usage retains its full bound; observed overuse is recorded before further
dispatch/commit is denied. Estimated tariff bounds remain separate from actual
billing, which has not been obtained. Real provider counting/pricing policy is
still an external configuration requirement, with no guessed fallback.

Read-only review reproduced mutable input changing after authorization hashing
and found close waiting only for Gateway rather than final Host validation.
Root fixed context ownership and complete-operation draining. Further review
found loss of persisted abort cause and a provider ignoring cancellation hanging
forever. Root added structured reason codes, bounded cancellation waiting,
consumed late rejection and no late persistence. Tests explicitly distinguish
already known usage from responses arriving after local cancellation; the latter
retain unknown consumption instead of waiting indefinitely for accounting.

Passed after fixes: stage3:check (now includes budget property/Host suites),
typecheck, architecture (300 sources), model-gateway:test, git diff --check.
All model transport tests used local fixtures; no network/model fee/private data.
Current whole-repository gates are pending, not inherited from 09-18. Evidence:
[budget/lifecycle precheck](../evidence/runs/EVD-20260920-S3-BUDGET-LIFECYCLE.md).

Next: connect the public Host generation path using Host-resolved evidence and
actual probe bounds, with a Host-owned output envelope to avoid input-digest
self-reference, then recheck profile/source/request identity at atomic commit.
The existing Worker analysis path normalizes supplied observations and does not
prove model material understanding. Render/QC must bind this draft directly,
without fabricating Stage2 execution approval. Workbench, actual learning and
real-media checkpoint remain unfinished. This package and goal stay active.

The final follow-up abort-window fix also passed its targeted test. Full `check`
and `acceptance:final:synthetic` then exited 0 on the new fingerprint above;
[current engineering Evidence](../evidence/runs/EVD-20260920-S3-BUDGET-GATES.md)
records the exact source and local log hashes. Current branch remains uncommitted
at base 3521aa8; no checkpoint PR or real acceptance is claimed. Continue the
public generation/source/learning/render path from this tested working tree.

### Public generation and session lifecycle — 2026-09-23

Public generateCreationDraft now binds Host-resolved project observations,
actual rational stream bounds, authorized held immutable files, current profile
selection and an explicit model output schema to one fixed request/base. Actual
adapter output is retained locally and compiled/preflighted before guarded
atomic Timeline/draft persistence. Encoded synthetic two-source tests cover
unequal cuts, sound/caption/color changes, preserved later-shot content, manual
and forged-identity rejection, reopen and cancellation after successful commit.
No remote model or real private creative material has been used.

Read-only review fixes removed private sequence/LUT/profile-query fields from
outbound context, constrained color to actually supported tagged sources,
rejected loss of unrepresented old grades, stopped late fingerprint from
starting probe after cancellation, and serialized Host open/create/close.
Both read-only reviewers found no remaining blocker in these fixes. The first
typecheck and actual color-fixture failure, their causes and fixes are retained
in [generation precheck Evidence](../evidence/runs/EVD-20260923-S3-GENERATION-PRECHECK.md).
Stage3 suites, typecheck, architecture and whitespace checks pass. Full current
repository gates are next; no inherited green claim from the 09-20 source.

Next implement the trusted Stage3 material-permission entry and actual model
observations/learning, then bind rendered Preview/Master/QC directly to the
stored generation/draft without Stage2 approval fabrication. The production
workspace remains on its old entry and needs one consistent replacement, using
the exact approved design when supplied. Source generation currently validates
existing authorized immutable locations; tests create those with explicit
fixture setup, which is not a production authorization interface. Real input,
learning/design/provider/data/budget debts remain active. Do not complete the
package or claim a real checkpoint PR. Branch HEAD still 3521aa8; edits remain
uncommitted and recoverable here.

Both full gates subsequently passed on the precheck fingerprint; the exact
commands and log hashes are in [generation gates](../evidence/runs/EVD-20260924-S3-GENERATION-GATES.md).
The input questions were presented together again while independent work
continued; no answer or real call authorization has arrived.

Read-only preparation identified the next concrete seams. Add a trusted
prepareCreationMaterial entry limited to existing request asset IDs and exact
imported original location identity. Reuse the immutable mutation permit and
copy/protection logic; atomically persist a real Stage3 request-bound material
receipt and both source permissions. The existing Stage2 material entry requires
Contract/human approval and is not the Stage3 entry. Do not abandon a copying
producer on cancellation: finish compensation/fd release before operation drain.

For rendering, extract the common body of renderTimeline to accept a fixed
stored draft Timeline and Host-built authority; reuse execution/QC/bundle checks
without fabricating executionBinding. Bind the generation's exact immutable
sources and target plan IDs, atomically publish draft/render/QC receipt with
watchable state, and preserve independent adopted/viewed pointers. Historical
draft playback must verify its own saved output hash, never fall back to latest.
Existing render code actually runs Master QC; separate Preview QC must be
executed if claimed. These are next implementation steps, not completed results.

### Trusted material preparation — 2026-09-24

Implemented public prepareCreationMaterial with a real request-bound receipt,
actual imported-source inspection, protected immutable copy and one permission/
location/receipt transaction. Cancellation drains pending writes and cleanup;
denial/revision/revoke races cannot commit stale permission. Retry and reopen
preserve receipt identity, and another request does not churn prior grants.
Generation now selects the current request's source pair, including when another
request chose a second imported location for the same content. Windows cleanup
restores readonly protection through the held inode even after stat/lstat fails.

Both read-only reviewers' specific findings were fixed. Targeted tests cover
real encoded synthetic bytes, actual Worker/SQLite/files, fault-specific reasons
and zero incorrect commits. stage3:check, typecheck (65 contracts), architecture
(305 sources) and git diff --check passed. Original generation/file-access,
missing-export, request-fixture, revoke-reason and branded-type failures are
retained in [material precheck](../evidence/runs/EVD-20260924-S3-MATERIAL-PRECHECK.md).
Full current gates are pending and must not inherit the older source's pass.

The user's explanation request is answered: missing external inputs block the
dependent real run, not independent implementation; engineering fixture passes
are not the real creation checkpoint. No new input/fee/upload authorization has
arrived. No actual model call, real film/recording, commit/push/PR or completed
candidate. Branch HEAD remains 3521aa8; all changes remain recoverable locally.

Next: finish the shared-helper regression and current full gates, then implement
the stored-draft render/QC binding described above plus actual observation and
authorized learning. Workbench integration must use the approved design when
available. Keep package/goal active and real acceptance debt explicit.

The shared Stage2 workspace/actions regression and both full gates subsequently
exited 0 on fingerprint 61d23ce4aeec8dd720a126e993496524c25c87cf0d4be006f15dddf8bb70d4fc.
[Material gate Evidence](../evidence/runs/EVD-20260924-S3-MATERIAL-GATES.md) retains
the exact command/log identities. Allowed-path audit found no outside changes.
Next implementation remains the actual observation/learning and stored-draft
render/QC/workbench chain; passing this batch does not close the checkpoint.

### Stored-draft render integration in progress — 2026-09-24

The Host now renders the saved draft Timeline through the shared target-specific
render path, runs separate Preview and Master QC, and publishes their bundle,
draft receipt and watchable state in one guarded transaction. Playback resolves
the saved draft's exact output reference and verifies its bytes. These changes
remain uncommitted and are not covered by the earlier material gate Evidence.

The latest targeted run initially failed with
`CREATION_RENDER_OUTPUT_REFERENCE_MISSING`: the new receipt check incorrectly
required render_output.version = 1, while the existing immutable render-output
writer records SQL NULL. This was a checker implementation error, not missing
media. The transaction rolled back. The check now enforces the existing NULL
protocol while retaining project/reference/type/relation/hash/object-store
identity checks. Read-only review confirmed that storage convention.

After this code correction, `node --expose-gc --import tsx
tests/integration/stage3-render-host.test.ts` exited 0. It uses actual encoded
synthetic motion/audio and actual Worker dual rendering/QC, with a local model
response fixture. Assertions cover paused-draft reopen/render, atomic publication
failure with no completed bundle/receipt, explicit failed state, corrected-input
new attempt, successful reuse, historical playback, missing actual output
reference despite retained bytes, byte corruption and cancellation drain. This
is targeted engineering evidence, not a private-media or actual-model acceptance.

Remaining work in this batch: pass explicit target dimensions/fps/duration and
AV-sync limits to QC; verify cleanup-after-commit reuse and source-producer drain
faults; finish the Worker termination barrier so timeout/close cannot release
ownership before a file-producing process exits. Register the render suite in
the Stage3 command, complete targeted review, refresh Evidence/fingerprints and
run the required current gates. The first real checkpoint still also requires
actual authorized observation/learning, workbench interactions and held-out
project validation. External material/design/provider/data/budget inputs remain
unanswered. No completed package, real output/recording, commit, push or PR is
claimed; HEAD remains 3521aa8 and the goal stays active.

### Render/QC and OS producer drain precheck — 2026-09-24

The render slice above now passes stage3:check including the new render/drain
suite, typecheck, architecture and existing Worker/foundation/CLI tests. QC
receives actual target dimensions/fps/duration and stream-duration limits; real
incorrect encoded files are rejected without publication. Cleanup-after-commit,
post-COMMIT acknowledgement failure, two retained failure records, source-fstat
FD release and parallel source inspection drain all have explicit regressions.

Worker now has a real local process owner: Windows Job and Linux subreaper.
Timeout/cancel/close/retry await tree drain; no acknowledgement or unconfirmed
termination cannot release Host staging, handles or project session. Windows
Node tests and Windows/Linux Python owner smoke pass; Linux Node was unavailable
and is not claimed. Read-only review fixes and all original failures are in
[render precheck Evidence](../evidence/runs/EVD-20260924-S3-RENDER-PRECHECK.md).
Five narrowly related existing/new test/CLI paths were registered before edits;
single active package and root-only writing remain unchanged.

Current source fingerprint is aff1a208281d5f58837cb0ac966a5e5d9b71eacb9fe4128011e8a509eea77bd8.
Next run the required current full gates after synchronizing Evidence bindings.
Then continue actual observation/authorized learning and workbench/API replacement
toward the original C1/C2/C3/C6 loop, without waiting for a per-function approval.
The real source/learning/design/provider/data/budget inputs remain unanswered;
no real model call, private upload, film/recording, commit/push/PR or candidate
completion is claimed. This goal remains active and the real checkpoint unproven.

The first Evidence-binding publication invocation passed a plain object to
writeJsonFiles, which requires entry tuples; it failed before any write with
`entries.map is not a function`. The corrected caller uses Object.entries;
the existing tool was unchanged. Publication, docs:sync and docs:check then
passed. Full check is running against the precheck source fingerprint, with its
local log retained outside Git; no full-gate pass is claimed yet.

The first full check failed at Stage2 Product's exact-immutable-reference
negative assertion: allSettled preserved the nested source errors but hid their
stable codes in its aggregate message. The Host now includes those codes and
retains all causes. The existing stage2-product-workspace:test then passed
without assertion changes. [Follow-up Evidence](../evidence/runs/EVD-20260924-S3-RENDER-REVIEW-FIX.md)
retains the failed log hash and current source fingerprint
a93c2bdbf61aa7bbe210df824690be22ac2e7acfcaa3b390ca8b4aaff62e9359.
Full gates must run again on this corrected source with a new log, preserving
the original failure.

Read-only implementation lookup confirms the next real seams: analysis.v1 only
normalizes supplied records and current Gateway adapters send JSON text; neither
is actual source understanding. Add a reference-only observation entry with real
PTS-bound extraction and explicitly supported media wire content. Profile learn
has no production caller or trusted long-term correction path yet; raw historical
learning needs its own source/field/provider/budget authorization, not reuse of
the already-learned-principle dispatch permission. Reuse the current profile
snapshot/send/commit coordination for held-out application. These are next tasks,
not new completed capabilities or a reduction of the original checkpoint.

Both full gates subsequently exited 0 on source fingerprint
a93c2bdbf61aa7bbe210df824690be22ac2e7acfcaa3b390ca8b4aaff62e9359.
[Render gate Evidence](../evidence/runs/EVD-20260924-S3-RENDER-GATES.md) retains
the exact command/log hashes; the original failed log was not overwritten.
The final source fingerprint was independently recomputed after the runs.
Continue the observation/learning/desktop seams above from this tested working
tree. No new external input or fee/upload authorization has arrived. HEAD is
still 3521aa8, no source commit/push/PR, and this is not the real checkpoint.

### Actual media sampling and model transport — 2026-09-24

The explanation-only previous goal turn made no implementation progress. This
turn revalidated the active package and continued independent source work; no
external input or model/data/fee authorization has arrived. Root remains the
sole writer and both existing reviewers retained their inherited settings.

Added the actual Worker media.sample.v1 request/result contracts and extraction:
explicit source digest/stream/rational ranges; decoded frame index/PTS/timebase
verification; continuous PCM16 audio samples; source rehash; byte budget;
exclusive output creation; batch rollback and cancellation. Worker workspace
cleanup no longer swallows errors. Exception-group leaves cross the protocol
with individual reasons and tracebacks. A sampled frame proves only its stated
actual display interval, never the whole requested window or inferred dialogue.

ModelInput is now one explicit context/media envelope, including migrated Host
and test callers. Media input validates sample identities, bytes/digests and
geometry; Host derives frames/audio permission from it. The existing adapter
sends actual image/audio blocks with a model-bound media counting policy and
one fixed serialized wire. Qwen uses audio Data URLs; unverified audio adapter
support fails before dispatch. No actual provider/model has been selected here.

New stage3:sampling:test uses actual encoded VFR video with nonzero starting PTS,
AVI with 1001/30000 timebase, WAV audio and off-grid 44100 Hz MKV. It verifies
exact decoded samples, missing/partial range failure, budget and source mismatch,
batch cleanup/collision retention, cancellation after a real sample, combined
handler/cleanup errors, real PNG/WAV wire bytes, model/media counting exclusions,
and zero Host reservations/sends without attachment permissions. HTTP responses
are local fixtures. Sampling, gateway, budget, typecheck (68 contracts),
architecture (311 sources), Python lint/typecheck, existing Worker media/analysis
and foundation tests have passed. Full Stage3 regression is running; full gates
on this changed source remain pending.

Original failures: typecheck found a duplicate local content name; sampling's
first import exposed missing standalone-validator export registration; the new
negative test incorrectly expected Worker submit to reject instead of inspecting
its explicit failed result; later typecheck required a validated result cast,
ruff required an explicit BaseExceptionGroup import and mypy a list annotation.
Code/caller fixes preceded reruns. Read-only review additionally found exception
groups losing root causes in Worker responses, audio asettb potentially masking
off-grid source times, and Qwen audio using bare base64. All were corrected with
specific regressions; reviewers found no remaining blocker in this batch.

Next: finish current gates and Evidence, then wire trusted Host observation to
real prepared-material samples and bounded model calls. Validate model output
against actual sample IDs and observed ranges; atomically publish observation,
Evidence and successful run completion without draft/pointer changes. A new
generation ticket must bind the resulting Evidence and observation receipt.
Then continue authorized learning/correction and desktop integration. Missing
external inputs block only dependent real execution. Goal/package remain active;
no real film/recording, source commit/push/PR or Stage3 completion is claimed.

Read-only lookup refined the next step: final observation ticket creation follows
actual sampling, because its input digest includes the exact media bytes. Before
sampling, retain the outer request operation, material guard and held source;
after sampling use the existing counted run. registerCreationModelResult and
storage registerEvidence support an outer owned transaction; registerCreationState
does not. Observation publication must guard a dedicated adjusting-to-received
transition clearing only active_run, with no draft or pointer changes.

Source spans and semantic observation coverage must be separate: no real scene
detector exists today. Add actual scene-change scan as candidate boundaries, not
narrative; preserve exact sampled visual intervals and actual audio coverage.
Update generation resolver, prompt and compiler together so editable source
ranges do not silently become full semantic coverage. Dialogue captions need
audio/time binding, not only substring inclusion. The explicit desktop search
for the named approved HTML still found no matching file in this turn.

The full Stage3 regression, pnpm run check and acceptance:final:synthetic all
subsequently exited 0 on fingerprint
8217d6d39b53ed239c6e2af2865656bbe42f516d60004ec295c394efbcdea169.
[Sampling gate Evidence](../evidence/runs/EVD-20260924-S3-SAMPLING-GATES.md)
records the retained local logs and exact hashes. No source changed during the
full gates. The allowed-path audit found no outside changes; final documentation
publication does not promote Stage3 or close the real checkpoint. Continue the
Host observation/source-span/learning/desktop work above. No pending process or
remote call remains from this batch; HEAD remains 3521aa8 and changes are local.

### Source observation to generation integration — 2026-09-24

Continued the same active package and root-only source writing, with inherited
GPT-6 High read-only reviewers. No external input/fee/data authorization has
arrived. HEAD remains 3521aa8; all changes remain local and no planning PR was
merged. The following replaces the previously pending observation integration,
not the outstanding actual-model/workbench/personal-learning acceptance.

Added media.scene_scan.v1: actual decoded frame PTS, duration and pixel-change
scores produce candidate spans, preserving native timebases and display bounds.
These spans are neither semantic facts nor generated narrative. Host observation
holds authorized prepared sources, extracts actual PNG/WAV samples, checks exact
sample descriptors and bytes before model dispatch, and then creates the ticket
bound to that fixed input. The model response must cover the exact sample IDs;
frame observations cannot invent transcription. Publication atomically binds the
ModelRun, sample objects, derived Evidence, receipt and adjusting-to-received
state without changing drafts, adopted/watched pointers or the Timeline.

The creation object journal now spans owned SQLite transactions and new object
files. A confirmed rollback removes only newly written unreferenced objects;
post-COMMIT acknowledgement errors retain committed files. Original operation
and cleanup failures remain separate causes. Historical receipt reads validate
object relations, bytes, exact input/output/audit/ledger and grants without
requiring the historical request to remain active or unchanged.

Generation accepts only observation_refs, replacing direct evidence_refs. Plan
sources use span_id, with actual editable source ranges separate from measured
visual/audio/transcript coverage. Duplicate spans are rejected before dispatch.
Saved generation reads bind the receipt list and plan to the exact recorded
model input/output; substituting another valid same-span receipt fails before
rendering. Verbatim captions require exact transcript text and timing mapped to
the actual audible embedded or independent audio clip. A supported J-cut may
place that caption before the associated visual shot; preserving it follows the
sound anchor across tracks. Editorial captions explicitly have no audio anchor.

Passed targeted tests so far: expanded observation Host faults, creation/compiler,
source/material/generation/lifecycle suite, and actual dual-target render/QC plus
Windows producer drain. The render result precedes the final stronger generation
reader and needs refresh. The final generation Host test subsequently passed,
including duplicate receipt rejection, old input rejection and receipt-swap
tampering with no Worker dispatch. No real provider call occurred: actual local
FFmpeg/SQLite/Worker paths use controlled local HTTP responses.

Original failures retained: external schema fragment generated an undefined
ticket type (fixed codegen resolution); Host projectDirectory capture/type error;
observation transition proof shadowed the existing authorization error (reordered
guard); a negative test matched message but omitted the error code; a type export
was emitted as a runtime export; and the standalone plan validator export was
missing. Fixes preceded reruns. Review found and fixed unbound sample metadata,
lost Worker error on cancellation, and valid-receipt substitution during read.

The new VFR scene test initially expected seven decoded frames and failed with
six. Independent reproduction found seven encoded packets but the PTS 4500 tail
packet was marked discard by the MP4 edit list: its original PTS 2900 equals the
right-open end of media_time 400 plus duration 2500, with zero final stts duration.
Default ffprobe decodes PTS 2000,2100,2400,2700,3200,3800, ending at 3900. A
diagnostic-only advanced_editlist override exposes the discarded frame; production
demuxing stays unchanged. The regression now independently probes default decoded
frames before comparing the scan, and additionally checks 1001/30000 AVI scanning.
This input-expectation fix still awaits its rerun at this entry.

Next: finish sampling/render/type/architecture/Python checks and focused review;
write fresh fingerprint-bound Evidence and run required repository gates on this
source. Then continue authorized learning/correction and desktop integration.
Actual history plus two independent source sets, learning scope, approved design
original, provider/model/data permission and a bounded fee/counting policy remain
unanswered. Goal/package remain active; no checkpoint completion, real film or
recording, source commit/push/PR, merge or release is claimed.

Final focused verification for the observation batch passed: stage3:check,
refreshed stage3:render:test, typecheck (72 contracts), architecture (313 sources),
Python lint and typecheck (28 files), and git diff --check. The VFR test now checks
the known seven packet PTS, filters explicit discard flags, and compares all
remaining packets by PTS with default decoded frames; the scan must match every
decoded frame and its measured final duration. This fixture has one H.264 access
unit per packet; the assertion is not a production rule for arbitrary codecs.
This makes FFmpeg edit-list handling observable without hard-coding a decoder
version's discard decision. That final sampling test also passed separately.
Read-only review found no remaining blocker for this batch. Full changed-source
repository gates are next; no acceptance status has been advanced.

The read-only next-step audit found that ProfileRepository already stores scopes,
exceptions and forgetting and generation already consumes guarded snapshots.
The missing production link is trusted saved learning event -> actual extraction
-> recoverable profile registration, followed by Main's single repository owner.
Existing snapshot dispatch must not be reused for first learning: its provider
check applies only to nonempty principles, so learning needs an unconditional
source/data-type/provider permit bound to consent and deletion generations.
Persist the model result before profile registration and recover by event identity;
do not claim atomicity across the two databases. Keep source events independent
of old profile/model summaries, preserve original user wording and actual changes,
and validate held-out behavior in actual Timeline and renders. These backend
changes can continue without the missing external media/design/fee inputs.

The observation batch's full pnpm run check and acceptance:final:synthetic
subsequently exited 0 on unchanged source fingerprint
886bcaedb39445e36268279b8e47c1a7b024a2a334e540fb03f0850b5a6c732e.
[Observation gate Evidence](../evidence/runs/EVD-20260924-S3-OBSERVATION-GATES.md)
records exact local log hashes. All current targeted and required engineering
checks passed; no source changed during the gates. The allowed-path audit found
118 changed governed paths and no outside change before final Evidence
publication. The next work is the trusted learning extraction/registration and
desktop integration described above, not another unchanged gate rerun. No
process or remote call remains from this batch; HEAD is still 3521aa8, with
no source commit/push/PR. The actual-model/private-media checkpoint is unfinished
and goal/package stay active.

### Trusted learning integration started — 2026-09-24

The previous goal turn made source and validation progress; its gate fingerprint
is retained above. Revalidated the same branch/head, active package and actual
working tree. Root alone writes source. Registered stage3-learning.ts before
implementation; it will own the typed Host projection, not a new storage owner.

The next implementation fixes the missing trusted selection -> fixed historical
event -> bounded extraction -> persistent result -> recoverable profile registration
path. A learning permit must always check source/data-type/provider/retention and
consent/deletion generations, including an empty profile. It must coordinate final
send and registration without holding the queue across network waits. Every model
principle must cite a whitelisted event fact; no-inference is an explicit analyzed
outcome, not a fabricated preference. Fixed state/IR readers retain actual user
wording, viewed/before/after versions, requested preservation and verified unchanged
content separately. Manual producer labels alone are not trusted preference input.

Targeted read-only review further confirms that long-term correction needs a
successor that excludes the superseded generalization from future snapshots; a
one-off exception must leave the long-term principle intact. Original model/profile
summaries are excluded from new learning source projections. Tests must distinguish
project result persistence, profile registration and later actual work changes,
including both commit-acknowledgement loss cases and deletion-before-send/register.
All of this remains independent implementation; missing real materials, scope,
design and external provider/data/cost authorization have not been answered.

Implemented the learning-specific ProfileRepository permit, immediate-send and
short project-commit coordination, source/data/provider/retention checks, exact
evidence whitelist and result-bound idempotent registration. An explicit
no-inference reason is persisted without inventing a principle. Registration
identity survives a committed-write acknowledgement error and can be queried
without granting a new send. Host's existing counted model runner now accepts
this permit independently of generation snapshots. The public learning-source
projection and end-to-end Host entry still need wiring; no production learning
or real-model success is claimed at this point.

Expanded stage3:profile:test passed with actual SQLite: empty-profile denied
send, unapproved source/data, invented evidence, no-inference replay, write failure,
post-COMMIT acknowledgement failure, deletion-before-send/commit/registration,
physical deletion and reopen. Read-only review found a mutable deletion-scope
array retained across the queue; it is now copied before admission, and a test
mutates the caller's original array and verifies the original deletion scope and
subsequent reopen behavior. That test passed after the fix.

Original failures: typecheck's generator initially received Windows UNKNOWN
while opening creative-context-validators.mjs. A subsequent read/write-access
open succeeded, bytes/hash were recorded, and contracts:clean confirmed all
72 generated outputs matched their schemas; no checker was changed. After the
Host permit branch was added, TypeScript required narrowing ModelInput.context
from unknown before reading learning_event. Fixed that boundary check; direct
tsc then passed. Full changed-source gates are not yet run for this learning batch.

The fixed historical learning-source projection now has an actual Host/SQLite
integration test. It preserves raw wording, caption style and numeric-looking
caption text, binds exact state/IR/Timeline versions and hashes, removes previous
profile/model sidecar summaries, and reproduces the same event after reopen.
Model decisions may cite only selected fact IDs; explicit no-inference remains
valid. Event/decision/result contracts generate 75 schemas; learning result
publication and the public Host extraction entry are still not connected.

Read-only review found and root repaired three factual-projection defects:
normal compiler-created independent audio routing was incorrectly rejected;
track reordering lost its compositing order; and strict unchanged objects were
mixed with content-preservation checks that allow movement. The projection now
includes real audio routes and track/child order, checks complete track children
for strict equality, and records content_preserved_refs separately. Manual IR
content-preserved preconditions are read along with protected_refs. A changed
caption cannot make its entire parent track appear unchanged. Preservation
violations cannot also declare that reference strictly unchanged.

Regression tests use the actual compiler and Host commits to change independent
audio bus/gain, reorder overlapping same-z-index video tracks, and move a clip
while preserving its content. They assert concrete before/after values, absence
from strict unchanged when appropriate, and exact event equality after reopen.
A protected-track caption change throws CREATION_PROTECTED_CONTENT_CHANGED and
leaves timeline_versions unchanged. These are controlled SQLite/Timeline fixtures,
not real-model preference learning or actual film acceptance.

The new test is registered as stage3:learning:test and appended to stage3:check;
no existing checker or assertion was removed. Current targeted results passed:
stage3:learning:test, stage3:profile:test, contracts:check (75 valid plus 75 invalid
examples), direct TypeScript check, and git diff --check. The preceding typecheck
successfully generated 75 contracts but found the test's unbranded AssetId string;
the fixture now uses assetIdFromFingerprint and the TypeScript check passes.
Earlier schema generation rejected missing explicit array type under AJV strict
mode; the decision schema was corrected, not the validator configuration.
The original Windows generator I/O failure and all review findings remain recorded.
Architecture also passed, scanning 315 source files.
The final inherited-setting read-only review found no remaining blocker in this
source projection/protection batch and confirmed the regression coverage. It did
not run tests and did not review or accept a completed real learning loop.

Next: connect exact event/result project publication to bounded extraction and
recoverable profile registration; add acknowledgement-loss, cancellation/deletion
and actual observe/generate/learn/held-out fixture paths, then correction/successor
and Main ownership. Fresh fingerprint-bound Evidence and full repository gates
remain pending for this learning batch; the previous observation gate fingerprint
is not proof of these edits. No real external call, commit, push, PR or completion
claim. Missing media/history scope, design original and bounded provider/data/cost
authorization still block their dependent real checkpoint work only.

### Durable learning and held-out execution — 2026-09-24

Previous turn was progress: source-fact fixes and exact Host/SQLite regressions.
The public Host learning entry now coordinates fixed event/attempt identity,
counted model dispatch, durable response, atomic extraction result/run completion,
then separate profile registration. Added the concrete attempt contract to retain
the original permit, ticket and timestamps before dispatch; it is not a second
state owner. Host validation runs inside queued profile registration. Extraction
and registration failures remain visible, and retries read the exact persistent
result rather than calling the model again. Current code generates 76 contracts.

Targeted Host tests passed with controlled adapter responses and two actual
SQLite databases: learned and no-inference outcomes, invalid evidence with no
registration, project/profile write failures, both COMMIT acknowledgement losses,
reopen, concurrent request admission, queued cancel/revise/close and deletion.
Read-only review found two additional recovery defects: the no-resend guard was
conditional on active_run being cleared, and generic crash recovery invalidated
an already durable learning response. Both are fixed. A double storage-failure
test leaves active_run intact and still refuses a second send. A separate real
child process exits with 77 immediately after ModelRun COMMIT; reopening reuses
that response with zero new sends and preserves one exact registration. Recovery
only preserves a verified learning response; explicit cancellation is not undone.
The inherited-setting read-only review found those fixes closed.

The first held-out media integration attempt failed correctly with
CREATION_RENDER_QC_BLOCKED / FREEZE_FRAME for both Preview and Master: constant
color test inputs had no motion. Retain this original failure. The fixture input
has been changed to independently encoded moving testsrc2 sources with distinct
hues/frequencies; production QC and assertions remain unchanged. Revalidation of
the fixed input is next. This test will cover actual work changes and renders
under a learned principle, an explicit one-work exception and later forgetting;
its provider responses are controlled fixtures, not real semantic acceptance.
The moving-input rerun passed the render QC boundary and then exposed the new
test's incorrect receipt accessor (`value` instead of the public API's `receipt`);
TypeScript independently reported the same mismatch. Fixed the test consumer to
the existing single API, leaving production render behavior unchanged.


Learning batch closeout: all four focused learning tests, stage3:check and
stage2:check passed. The previous goal turn was a verified wait on full check
session 76509, not a restarted run. That check subsequently exited 0; final
synthetic session 30196 also exited 0. Exact fingerprint and terminal log hashes
are in EVD-20260924-S3-LEARNING-GATES. The held-out fixture proves actual Timeline and
Master differences, actual Preview/Master with passing QC, exception, forgetting and bounded reopen; it does
not prove real-model interpretation or private-media acceptance.

Next implementation is explicit long-term correction within the active package:
fixed user-selected predecessors, atomic successor registration, old-snapshot
invalidation, recoverable exact result identity, and dependency-specific forgetting
that cannot resurrect an already corrected wrong principle. Old outcome bodies
and hashes remain immutable. No new architecture owner or check bypass is needed.
Root remains the only writer; readonly review inherits the selected settings.

### Explicit correction and dependent forgetting — 2026-09-24

Implemented one current correction input across Schema/examples/generated types,
Host input/parser, fixed event/source, attempt/result readback and ProfileRepository.
User-selected predecessor identities and outcome digests stay in the local permit;
the model sees only their bound digest alongside actual source facts. Registration
atomically adds immutable successor facts, their exact relation and predecessor
disable markers. No-inference explicitly fails replacement without withdrawing the
old principle. Concurrent replacement conflicts; unrelated registration can complete.
Historical replay returns its original identity and cannot reactivate old content.

Forgetting follows exact event dependencies and removes complete affected outcomes
to preserve digest integrity. Minimal event exclusions and nontext disabled IDs
prevent relearning or resurrection; unrelated events in dependent projects remain.
Narrowed source consent also filters descendants, so a successor cannot launder
an unauthorized predecessor. No new database owner, graph service or validator
bypass was introduced; all changed files remain in existing allowed paths.

Targeted checks passed: actual SQLite profile correction (competition, write failure,
COMMIT acknowledgement loss, historical replay, source narrowing, physical deletion
and both forgetting directions across reopen); actual Host correction (trusted
targets, original wording, forged response denial, no-inference, durable-result
reopen with zero resend, exact historical replay and unchanged works); held-out
actual Worker/Preview/Master/QC now includes narrowed correction and keeps shots
and audio unchanged. The latter still uses synthetic moving media and model fixtures.
The two new tests are appended to existing stage3 profile/learning scripts.

Original development failures retained: TypeScript required control-flow narrowing
for a missing correction predecessor; fail is now a declared never-returning function.
That exposed Array.isArray narrowing the readonly outcome to any[]; the internal
principle list now has its explicit EditingPrinciple type. Direct tsc, original
profile regression and 76-schema valid/invalid contract checks then passed.
Read-only review found no blocker in the correction/registration/deletion slice;
it did not run tests or claim a real creative checkpoint. Full changed-source gates
remain pending. Desktop ownership/integration and authorized real inputs remain next.

Correction regression completed: stage3:check exited 0 (session 44221), architecture
scanned 320 source files, contracts:clean matched all 76 contracts. The current
source fingerprint is db7021c298b7dee61cbd53270629a4ef3dd9af0315ba37adae4305b578a660b2;
EVD-20260924-S3-CORRECTION-PRECHECK records the terminal scoped log and 20 unchanged
capability-status applicability bindings. docs:sync and docs:check passed. Source
is frozen for full check session 45146, logging to OS TEMP
ave-stage3-correction-check-20260924.log. This is a confirmed live process; keep
polling that handle, do not restart on an observation timeout. Current full-suite
completion and final synthetic acceptance for this fingerprint remain unproven.

Read-only Desktop investigation identified the next concrete integration scope:
one Main-owned persistent ProfileRepository injected into Host; session epochs and
admission rejection before/after native-dialog waits; actual operation drain, Host
close then profile close, and a single retryable quit coordinator. Project switches
retain the profile owner. Existing two-track Stage2 topology/workspace/IPC/Renderer
consumers must be replaced together. Keep current visuals pending exact design.
Before implementation register the still-missing bootstrap.ts, app-lifecycle.ts,
window-manager.ts, validate-sender.ts and apps/desktop/src/electron.d.ts paths;
the current electron-stage2-harness.ts caller and desktop-boundary.mjs assertions
also require an explicit scope decision for the interface replacement. Preserve
equivalent or stronger authority/failure assertions rather than deleting checks.

The read-only interface audit narrows that decision: replace the whole current
product route/approval/workspace chain, including old Stage2Product Host facades;
do not keep aliases or auto-confirm old gates. Independent domain contracts and
necessary immutable historical readers are not deleted merely for a Stage2 name.
The actual desktop-boundary runtime harness negative tests must survive as new
request-authority, budget, stale-response, protected-edit and draft-binding tests.
Also inspect/register tests/integration/stage2-electron-review.ts and the existing
stage2-product-workspace-real.test.ts consumer if changed, so no advertised current
desktop entry silently remains on a removed harness. Desktop:boundary remains in
storage:check and the full check; this is test migration, never gate removal.


Correction full-gate closeout: original full check session 45146 and final synthetic
session 60762 both terminated with exit 0. The unchanged source fingerprint and
terminal log hashes are in EVD-20260924-S3-CORRECTION-GATES; no live validation handle remains.
The user asked for an explanation of the Desktop lifecycle issue. Root and the
read-only runtime reviewer verified three related source paths: IPC validates
only before a native-dialog wait; importMedia inspects asynchronously then uses
the current session; quit does not drain all entered operations. Separately,
Host clears its session before storage close succeeds, so a failed checkpoint,
database close or lock release can leave cleanup unrepeatable. No user-data
corruption or injected-failure reproduction is claimed. Next implementation must
bind operation ownership through waits, close admission and drain actual tasks,
then close Host/profile with retryable cleanup. Register the previously listed
Desktop paths before edits. The original goal remains active and incomplete.


### Desktop lifecycle integration scope registration — 2026-09-24

The previous turn made progress: correction full gates became terminal, evidence
was published and docs checks passed. Source edits resume only now. Within the
same active first-loop integration package, register the additional concrete Main
bootstrap/lifecycle/window/sender/type files and the existing Electron harness and
its current review consumers, plus desktop-boundary assertions. These are needed
for one persistent Main profile owner, actual operation drain and retryable close,
and the subsequent single current request/draft product entry replacement.

Additional allowed paths:
- apps/desktop/src/main/bootstrap.ts
- apps/desktop/src/main/app-lifecycle.ts
- apps/desktop/src/main/window-manager.ts
- apps/desktop/src/main/validate-sender.ts
- apps/desktop/src/electron.d.ts
- tests/integration/electron-stage2-harness.ts
- tests/architecture/desktop-boundary.mjs
- tests/integration/stage2-electron-review.ts
- tests/integration/stage2-product-workspace-real.test.ts

No second package is activated, no candidate completion is claimed, and required
checks remain. Root is the sole writer. Read-only reviewers inspect cleanup stages
and Desktop races. Existing allowed Host/storage/profile/test paths cover the
related cleanup fixes and fault tests; no visual redesign or external call is
included. Before source changes the last passing fingerprint is the correction
gates fingerprint; new implementation requires new validation and Evidence.


### Desktop operation lifetime and retryable cleanup — 2026-09-24

Implemented Main's single persistent ProfileRepository, request/window/project
session identity and actual handler drain, isolated native-dialog cancellation,
Host-before-profile shutdown and explicit retry after cleanup failure. Startup
installs its quit barrier before IPC/protocol/window registration. Storage close
retains checkpoint/DB/lock progress and Host retains its retiring session. Media
import verifies its captured session after asynchronous work. Root remained the
only writer; read-only review found and root fixed the startup-registration
failure branch before claiming targeted validation.

Original development failures: a direct tsc command incorrectly named missing
tsconfig.json (TS5058); the corrected tsconfig.base.json passed. The first new
Desktop test supplied an empty profile context (PROFILE_QUERY_INVALID) and its
failure cleanup retained a test gate, causing unsettled top-level await. The test
now releases all controlled gates even on failure and supplies the required
explicit context; production validation was not weakened.

Removing forced success exits exposed actual Electron shutdown failure. Diagnostic
runs reached will-quit but were killed by the watchdog, which correctly failed.
Separating the second quit onto setImmediate did not by itself fix that failure.
Minimal Electron ESM/async-quit/protocol/SQLite cases exited normally. A preserved
uncaughtExceptionMonitor stack identified unregisterWindow reading destroyed
webContents during the closed event. Window registration now captures the ID
while alive; closed only uses that ID. The same actual runtime then naturally
exited 0 with native quit and no uncaught exception. Original/fixed terminal log
hashes are in EVD-20260924-S3-DESKTOP-LIFECYCLE-PRECHECK; no app.exit/process.exit/watchdog
success replacement was introduced. The existing real-product Electron runner
now also waits for natural shutdown instead of killing at a journey marker.

Passed: three new close/Desktop/bootstrap tests (stage3:desktop:test), existing
Host lifecycle regression, direct tsc, architecture, desktop:boundary and actual
Electron runtime. No new interface, schema or current product entry is claimed
complete. Current source fingerprint: 029314d0e58a42b72bcead8606da5d21bf4c5206111562c3b39590cbfc8a01a6. Source is frozen
for stage3:check session 49021 and stage2:check session 82138; preserve those live
handles rather than restarting on an observation timeout. Full check/final
synthetic remain pending; exact Stage3 Desktop request/draft product replacement
and the authorized real-media/model journey are still required next work.


Desktop scoped regressions are now terminal: stage3:check session 49021 and
stage2:check session 82138 both exited 0; storage:check also exited 0. Read-only
review of the fixed bootstrap and destroyed-window paths found no remaining
blocker in those paths. Source stays frozen for the required full check and final
synthetic acceptance. Completed OS TEMP log SHA-256 values:
- ave-stage3-desktop-stage2-20260924.log: 2457aa87da4752ee3ce276ba7a576e04e77d8838f5382530c4f5743026be78b5
- ave-stage3-desktop-stage3-20260924.log: 66ec9e0ff9feef325b876cbe8d40ed3d2d567795face78b93887a0144a787b17
- ave-stage3-desktop-storage-20260924.log: 64f7b0b23fd6111aa0769c3bfbbbae35e3365b0523c4555c629688ed4ad654b4

Next product-entry work has concrete read-only findings: composition lacks a
trusted creation model/counting/observation policy, so it correctly cannot make
Stage3 model calls yet; Stage2 fixed topology must be replaced for multi-track
Stage3 reopen. Add a safe Host workspace projection over stored requests, material,
observation, draft/render and learning identities. Main should call current S3
methods directly, sharing the same request budget across observe/generate/learn.
Replace reference-only manual editing and Stage2 workspace consumers together;
keep actual playback/adoption separate, ordinary revision/cancel available during
work and unsent input intact. Profile correction needs exact local predecessor
outcome identities, not a model-written summary or a forged Renderer provenance.
No old product alias or automatic historical authorization is part of the target.

Full check is now confirmed live as session 70992, logging to OS TEMP
ave-stage3-desktop-check-20260924.log. Poll this same handle; do not restart on
an observation timeout. Source fingerprint remains 029314d0e58a42b72bcead8606da5d21bf4c5206111562c3b39590cbfc8a01a6. Final synthetic acceptance has not started.

Desktop full gates are now terminal: full check session 70992 exited 0, then
final synthetic session 2596 exited 0. Both original process handles were
observed without restarting; source fingerprint remained unchanged afterward.
EVD-20260924-S3-DESKTOP-LIFECYCLE-GATES records terminal log hashes and the exact
engineering/real-acceptance boundary. No source was changed during these gates.

The user asked for an explanation; the recent native shutdown failure was
explained with its original destroyed-webContents stack, the prior forced-exit
test masking, the stable-window-ID fix and actual natural-exit verification.
The original goal remains active. No checkpoint or package is completed.

Next implementation detail from read-only review: manual editing must atomically
publish a truthful manual-source draft and execution receipt alongside the real
EditIR/Timeline. Current generation-only storage/render/learning readers must be
replaced coherently; borrowing a model run or a subsequent non-atomic draft write
is invalid. Workspace projection must preserve exact historical selection-state
sequence/digest, actual submitted edit refs and profile predecessor result_digest.
Profile controls and predecessor selection should come from one repository queue
read; extraction persisted in the project is distinct from profile registration.
Root remains the sole source writer. Existing input debt and next Desktop product
work remain outstanding; no new paid call or private-data transmission occurred.

### Manual draft integration in the active package — 2026-09-24

Implement the already registered S3-01/04 manual-edit path inside the existing
Host/storage/request/runtime files, editorial contracts/examples/generation and
stage3 integration tests. Replace generation-only draft provenance and render
references with one explicit model/manual source contract and draft execution
receipt. No new helper path, database migration or package activation is needed.
The root is the sole writer; both reviewers are read-only. Required verification
includes consecutive edits in one intent revision, independent audio/caption
changes with preserved shots, actual dual render/QC and reopen, old model denial,
unauthorized-source zero commit, atomic failure and acknowledgement recovery.

Manual draft implementation is now present: strict source union, one current
draft execution receipt, shared atomic candidate publication and source holding,
manual Host entry, full model-provenance checks, render/learning readers and exact
replay. Internal review found preservation wrongly treated as a hard lock; root
fixed Host and storage together. Positive actual movement and negative source/
caption changes now pass. A second review confirmed the focused fix. PCM spectrum
proves the independent WAV enters the output; call IDs and manual provenance
remain truthful. No Renderer/product-entry completion is claimed.

Original development failures: TypeScript exposed a missing validator export,
incorrect producer literal (user instead of existing manual), and old learning
field consumers. The generator registration initially inserted an indexed schema
mid-list; root restored existing indices and explicitly exported the new validator.
The first render regression failed the old generation exact-key guard; the guard
now checks the single current execution shape. First real-WAV manual test failed
CREATION_MEDIA_BOUNDS_REQUIRED because WAV had no container start_pts; actual
contiguous decoded audio frames/sample counts now supply and verify that interval.
No fallback zero or changed test material was used. The test QC field type was
also corrected after TypeScript rejected the unknown value. Failures were followed
by source/input corrections, not unchanged reruns.

Source frozen at c55ffddc13efcdcf7bf0d4628e4e1baf64889bda43d59924bf91707480fc68b3.
Targeted final manual test session 98985 exited 0; log SHA-256 c8365094e9ce496851f60fbf05412d0cb8318c984763f8f05e3389703e5c6a32.
Iteration stage3:check session 5641 exited 0, but review changes overlapped it,
so full check will repeat that suite against the frozen source.
EVD-20260924-S3-MANUAL-DRAFT-PRECHECK records exact scope and remaining real-work limits.
Next required product work is the safe persistent workspace projection plus
Desktop single-version request/draft/learning controls and actual creation-model
policy. External input debt remains unchanged; independent implementation can
continue. No package/candidate/acceptance status was promoted.

Manual-draft full gates are terminal: check session 36503 and final synthetic
session 96215 exited 0 through their original handles. Source stayed frozen at
c55ffddc13efcdcf7bf0d4628e4e1baf64889bda43d59924bf91707480fc68b3
and was rechecked after both gates. EVD-20260924-S3-MANUAL-DRAFT-GATES preserves
the terminal log hashes and the engineering/real-acceptance distinction.

Next safe workspace projection must enumerate exact historical state references
for adoption (not substitute the latest state), actual execution/edit references,
and independent render/QC receipts. Profile workspace reads must use one queue
state for consent, snapshot, predecessor result digests and batch registrations.
Missing registration and explicit source/event forgetting are distinct states;
historical project extraction must not resurrect excluded principle bodies.
Root remains sole writer; read-only reviewers supplied these findings without
running tests or changing files. The external input debt remains unchanged.

### Persistent workspace projection — 2026-09-24

Registered the exact Host helper before implementation. Build one validated
project snapshot and one profile queue read; expose explicit user statements,
historical adoption refs, actual draft/edit/render refs, and separate extraction,
registration and exclusion states. Recheck Host session and snapshot after the
profile await. No raw model context, local path, sample bytes or forgotten
principle body crosses the projection. This is part of the active integration
package and does not change visual design or authorize external calls.

Workspace projection and literal-text repair are implemented and focused tests
passed, with two read-only reviews. Host reads exact persistent history and one
profile queue state; it rejects stale project responses and does not resurrect
forgotten bodies. Actual synthetic-media manual test now uses literal caption
1n: original generic revival failed with caption.text.trim; after restricting
revival to timing fields, the same edit/render/QC/reopen path passes. Logs and
other original development failures are preserved in EVD-20260924-S3-WORKSPACE-PRECHECK.

Source is frozen at 3be884a69d7cdfe55dc99a505ab6dfd1fb8cce7c0a76e76bee372e4648120e4c. Full gates remain pending on this source.
Next coherent product change: replace canonical Stage2 new/open restrictions
with explicit sequence/timebase validation before recovery; replace current IPC
and Renderer consumers together, preserve input/player state and independent
revise/cancel actions, and remove old current-route aliases. Main must not return
raw Host learning/material/observation payloads or broadcast command data. Missing
real inputs still block dependent calls, not this independent implementation.

Workspace full check is live as session 86639, with output retained in OS TEMP
ave-stage3-workspace-check-20260924.log. Poll this exact handle, then final
synthetic on the same frozen source. Source fingerprint is
3be884a69d7cdfe55dc99a505ab6dfd1fb8cce7c0a76e76bee372e4648120e4c.
Desktop replacement must also preserve literal text in stored Timeline reads;
that prerequisite is now fixed and exercised, not left as a planned workaround.

Workspace full gates are terminal: check session 86639 and final synthetic
session 75355 both exited 0 through their original handles. The source fingerprint
remains 3be884a69d7cdfe55dc99a505ab6dfd1fb8cce7c0a76e76bee372e4648120e4c.
EVD-20260924-S3-WORKSPACE-GATES retains log hashes without promoting acceptance.
The user requested an explanation without naming an error; clarification is pending.
The latest literal-caption cause and the engineering/real-loop distinction were
explained. Independent implementation remains available; the goal is not complete
or blocked. Read-only review confirms new/open cannot change alone while current
Renderer commands still target video-reference. Register stage2-material-run.ts
before removing its production Stage2 topology import; preserve historical fixtures
test-side. Host validation must precede recovery writes and cross-check stored
Timeline version identity, not only parse its contents.

### Current Desktop integration in progress — 2026-09-24

Root registered the historical Stage2 fixture consumers before replacing the
production entry. Host now validates typed Timeline structure, exact persisted
version/reference identity, positive sequence timing and creation history before
recovery writes. Legitimate root-track mirrors are supported; divergent mirrors
and invalid speed denominators fail closed. Exact Main-owned native authorization
binds request/profile reviews to current state and guards the final write, including
the asynchronous confirmation gap and the profile serialization queue.

Targeted project-open, request, workspace, recovery, timeline, profile, desktop
lifecycle, native-authorization and actual synthetic-media manual render/QC/reopen
tests passed during implementation. Original failures for root-track mirrors,
zero speed and the confirmation microtask gap were repaired in source; their OS
TEMP logs remain. These are engineering checks, not authorized real-model work.

The current Main/Renderer entry is being replaced coherently. New persistent
request/material/draft/profile forms and player exist, with independent revision,
cancellation, playback and adoption. Legacy production handlers were removed;
historical domain fixtures remain test-owned. Renderer, desktop-boundary and
Electron product harness migrations are still incomplete. The latest Host
workbench test failed because it looked for codec_type in timing.streams; actual
probe.streams supplies the stream identity. Fix that reader before rerunning.
Native-authorization test registration and product/runtime validation remain due.

The earlier workspace-gates fingerprint is historical after these edits. No
current full-gate pass, visual approval, real model call, checkpoint completion,
commit, push or PR is claimed. Missing approved sources/design/provider-data-cost
inputs still block dependent real work, not this ongoing safe implementation.

Desktop migration continued with current IPC/Renderer assertions, a strict
test-only native confirmation whitelist and a new actual Electron engineering
journey. Source fixes include asset-level deduplication, retained form/player
nodes, explicit new-render-attempt identity after known failure, and a latest
refresh barrier for revision-dependent actions. Controlled IPC/real-DOM race
tests are separate from the actual Host/SQLite/media journey. Stage3 required
checks now include native authorization and the current Desktop journey.

The Stage2 domain tests remain. Its retired Desktop real command now fails
immediately with STAGE2_DESKTOP_REVIEW_RETIRED and creates no review/project;
no historical request authority is manufactured (ADR-0028). Registered the
direct real-entry test before splitting that assertion from the unchanged two
domain material gates. Removed the unused old Electron review executor and
replaced its current harness with Creation; historical Evidence stays immutable.

Current original journey failures (all retained in OS TEMP):
- desktop-workspace-initial: UI test observed Host revision before Renderer
  refresh, sent old revision, and received REQUEST_REVISION_STALE with no commit.
  Dependents now wait for latest refresh; test waits for actual enabled controls.
- desktop-workspace-form-fixed: fixture incorrectly protected entire clips while
  asking to change their embedded gain. CREATION_PROTECTED_CONTENT_CHANGED was
  correct; fixture now retains source-range assertions and explicitly protects
  the new caption during the following edit, without relaxing Host protection.
- desktop-workspace-scope-fixed/native-fixed: native fixture rejected exact
  confirmation mismatch. Actual edits/render/QC passed before that point. Root
  corrected fixture asset order to the visible order and added field-difference
  diagnostics; native-diagnostic is the currently running investigation.
- Initial harness compile referred to a nonexistent shutdown callback. It now
  asserts shutdownComplete on actual will-quit, retaining exit/watchdog checks.

Host workbench import/edit/reopen, current Renderer precision/selection tests,
IPC sender/boundaries, Desktop boundary, real-entry denial and Electron smoke
have passed during this iteration. Full current gates remain pending. Trusted
production model counting/tariff/media policy cannot be invented: no production
counter exists and exact provider/model/data/cost inputs are still outstanding.
Main's current model-policy injection remains an uncompleted dependent seam.

The reviewed current Desktop journey is terminal: session 9971 exited 0. It
includes exact native confirmation, actual encoded Preview/Master/QC, two-shot
manual edits with literal caption, independent playback/adoption, cancellation,
and independent Electron reopen. Controlled real-DOM race tests prove both
superseded refresh and failed latest reads send no stale dependent commands;
recovery sends the current revision, and explicit new render attempt changes ID.
New draft completion retains the old loaded Preview and position until the user
loads another. Read-only final review found no remaining blocker in these fixes.

Native fixture mismatch was the exact ISO timestamp representation (Z versus
.000Z), after its asset order was aligned to visible choices. Corrected fixture
input passed without weakening confirmation. An isolated DOM fixture required
UTF-8 HTML. Architecture rejected a textual seconds field's ambiguous name and
compact node property spelling; source now uses placement_text -> exact bigint
ticks and standard property spacing, with no checker mechanism edits.

Source is frozen at 8db385cb2f35a826b6de037ef638a2731430d1465326e930eb43722b9c63a7d5.
EVD-20260924-S3-DESKTOP-WORKSPACE-PRECHECK retains original/final log hashes,
208-path allowed-scope audit, artifact location and unfinished real boundaries.
docs:sync/check passed. Full check has started against this frozen source,
logging to OS TEMP ave-stage3-desktop-workspace-check-20260924.log; final
synthetic is pending. No package, Stage3 acceptance or goal completion claimed.

Full check session 5341 exited 1 at the copied Stage2 authority fixture with
TIMELINE_SNAPSHOT_REFERENCE_REBOUND. Original log remains in OS TEMP
ave-stage3-desktop-workspace-check-20260924.log. The test copied objects and
SQLite but retained source-directory object_store paths. Root repaired only
the fixture: verify each source canonical path and copied hash/length, then
transactionally rebind the copied database before Host open. Production
identity checks and all ambiguity/zero-write assertions stay intact. Read-only
review confirmed both production Timeline writers use canonical identities;
no current project relocation implementation was found. The storage negative
test now asserts the exact current missing-reference error. Focused checks
and renewed source fingerprint/full gates are pending.

Regression follow-up: product-actions session 22325 exited 0. Storage negative,
Stage3 project-open and TypeScript passed. The exact-message assertion now
also finally-closes the fixture and checks zero writes (initial regexp/prefix
mismatch produced a cleanup EBUSY; retained here as a development failure).
Read-only review passed. Source frozen at 948dfa0219b5a78c1cfc7254b57a291df503603d80c96811d5e73b0a0ec8fd82;
EVD-20260924-S3-DESKTOP-WORKSPACE-REGRESSION-FIX retains original failure and corrected logs.
Full check/final synthetic remain pending; real checkpoint stays unfinished.

Current terminal engineering result: full check session 65366 and final
synthetic session 7930 both exited 0 on unchanged source 948dfa0219b5a78c1cfc7254b57a291df503603d80c96811d5e73b0a0ec8fd82.
EVD-20260924-S3-DESKTOP-WORKSPACE-GATES preserves log hashes and current Desktop project
OS TEMP/ave-stage3-desktop-workspace-wSx3ou, actual Preview/Master/QC/reopen
records and visual-evidence limits (draft/profile captures duplicate a frame;
no real recording/design acceptance claimed). Read-only scope audit covered
211 paths before this final document, all registered; no sensitive files found.

Independent implementation and gates are exhausted for the available inputs.
The repeated missing source/learning/design/provider/data/cost boundary now
blocks further meaningful goal work. The package is blocked with active debt,
not complete; no candidate/acceptance promotion, next checkpoint, commit, push
or PR. Resume this same package after the requested external inputs arrive;
implement trusted selected production policy, perform real joint/held-out runs,
and only after those pass deliver the user's requested draft PR checkpoint.


2026-09-24 resumed scope: the user selected the latest Desktop design archive
ave-v12-5-1-apple-cn-refined (SHA-256 858d8d3ed5b97f1c3d50bafe7a71b638b673160a50a718540a62534b0cb54710).
Historical approved Stage2 media and exact output hashes were located again;
local learning rules remain authoritative. User explicitly rejects product data,
call and cost ceilings. Register model-configuration.ts, ADR-0029 and its index
before implementing a single current accounting/capability contract replacement.
Keep exact send consent, durable call auditing, finite technical retries,
cancellation and Host authority. No real provider call or new acceptance yet.
The same WP is active; previous blocked-input conclusion is superseded by this
resumption, not retrospectively rewritten. Main remains the only profile owner.


Resumed implementation (2026-09-24): removed the unreleased cumulative budget /
tariff / trusted-token-counter interface across contracts, Host, gateway, Main,
Renderer and fixtures. Retained send-before-storage denial (storage must commit
before send), immutable call settlement and unknown actual usage/cost. Main now
injects explicit production model/observation policies, supports configurable
OpenAI-compatible deployments and JSON/SSE, and binds non-secret deployment
identity to request authorization and cache. Redirects are rejected. Read-only
review found and root fixed deployment drift, SSE EOF/cancellation cleanup, HTTP
error-body release and the two-column tab CSS override. Protocol tests cover
open streams, cancellation, truncated/malformed output and actual HTTP redirects.

Selected design archive is retained byte-for-byte in docs/ux/design-reference;
real Renderer now uses its neutral colors, rounded three-column workbench and
secondary timeline. Video/forms stay persistent; no demonstration story/media
or fake application state was copied. Actual Electron visual validation pending.

One read-only DashScope /models request returned HTTP 401 invalid_api_key;
response is OS TEMP/ave-stage3-qwen-model-discovery.json outside Git. No source
media/context was sent and no model generation occurred. User was asked to fix
local multimodal configuration or choose local open-model deployment; other work
continues. This is a live external blocker, not a completed first real loop.

Verification failures preserved: initial TypeScript fixture migration errors;
obsolete token-counter expectation in sampling; fixture wrapper omitted the new
deployment identity; two fixture destructuring sites still sent Host-owned
identity. Corrected only actual consumers/fixtures, not production denial gates.
The accidental contracts:examples generator invocation overwrote curated examples
and was immediately caught by the focused test. Tracked examples had been clean
and were restored from HEAD. Newly authored Stage3 examples were reconstructed
from original root write records in isolated OS TEMP; creation-material/render
fixture pairs were rebuilt against their actual schema references. Current
contracts:check passes all 77 valid and 77 invalid examples; no tracked example
diff remains. Original failed logs and recovery scratch remain outside Git.
Required focused/full gates are being run again after these concrete repairs.

Selected-design targeted validation is now complete: Electron session 30433
exited 0, current fixture playback visible in drafts.png, exact reopen and
request/manual-edit assertions passed. Evidence EVD-20260924-S3-SELECTED-DESIGN-PRECHECK binds fingerprint 50e857cc61961461f912a27ce3cf2d4000201e974bff5ad80477af26dc88fe89.
Full current check and final synthetic are next; 401 provider blocker remains.
No real checkpoint completion or Git delivery is claimed.

Full check 50772 failed at an obsolete Renderer quota-field assertion after all
Stage3 engineering tests passed. Root migrated the exact current scope assertion,
added denial of retired fields, and focused checks passed. Original failure and
regional 401 diagnostics are preserved in EVD-20260924-S3-QUOTA-ASSERTION-FIX; fingerprint 6ac94f108707794376ecfa23cbd19ebbf12bf49078dc1c7d6ef4a090c9ceb1a9. Re-run full
check, then final synthetic; real checkpoint remains incomplete.

Full check 58747 passed the quota assertion but failed the old exact-field
assertion for Main media display_name. Added the new field and explicit basename
privacy checks; focused workbench Host test passed. Evidence EVD-20260924-S3-MEDIA-PROJECTION-FIX, source a74347cd30895542f7f4345d01acaa9680350c09e2a253cce0d57e8319895fa9.
Only this consumer test changed; full gates run again. Existing 401 credentials
match persistent User configuration. Real checkpoint remains blocked externally.

Final resumed-turn outcome: current full check and final synthetic passed; both
failed full runs and specific fixes retained. Root rechecked final Electron
drafts capture and exact source fingerprint. Artifacts are OS TEMP/ave-stage3-
desktop-workspace-zmT87m; no real user film/recording or real model results claimed.
Continue using the next-step sequence in EVD-20260924-S3-SELECTED-DESIGN-GATES after the external model input
arrives. Do not repeat resolved design/material discovery or reintroduce budgets.

2026-09-24 user-selected split-service slice: Qwen vision and text planning, Whisper-compatible multipart transcription, and an independent native-audio chat model for environmental sound. Root is sole writer. Register split-provider.ts, whisper.ts and ADR-0030 before edits. Retain existing schema/Host/Main/Renderer/test allowed paths. Deliver editable local JSON settings and example, real HTTP protocol implementations, per-subcall durable target ledger, exact sample/source time fusion, errors/cancellation/zero-commit tests and current required gates. No download, paid request, or real creative acceptance is implied. No candidate package promotion.


Split-service implementation checkpoint (2026-09-24): added the ordered fusion
proof and shared exact-time reconstruction in contract-runtime, registered before
source writes, plus model-service setup instructions. The one active WP remains
unchanged. Physical calls are individually authorized/settled; split outer audit
cannot overwrite child usage during cancellation. Planner retains its single-call
usage. Root-only fixes followed read-only provider review.
Targeted model/Host observation/Desktop regressions, TypeScript and architecture
passed. The local test includes actual PNG/WAV encoding, multipart/SSE, generation
and reopen; provider responses are controlled fixtures. Earlier type failures,
parser failures, incorrect test wire-count assumption, the original aggregate
result accounting failure and missing transcript test consent remain in OS TEMP
logs. Current source will undergo full check and final synthetic acceptance next.
No task commit, real provider call, deployment or package completion occurred.


Split-service slice final: full check 41312 and final synthetic 39065 exited 0;
source a6e21b719fd8cac6867d3c9939562d31dc4692423a33e2d6ab38c0fd9ee4de3c stayed unchanged. Evidence EVD-20260924-S3-SPLIT-SERVICES-GATES.
Actual fixture Desktop outputs/captures: OS TEMP/ave-stage3-desktop-workspace-8EnbXB.
Configuration framework complete; real providers and private-media semantic
quality remain pending user-filled configuration. Same WP blocked with active
debt, no candidate/Stage3 completion. Stop here; next activation resumes the
approved real case, not another checkpoint. HEAD remains baseline; no commit,
push or PR and no model spend/upload in this slice.


2026-09-25 bounded credential recovery: user explicitly identified Lilsunspot's
saved Qwen key and excluded environment credentials. Root recovered the saved
DashScope key from Lilsunspot's local data backup (two backups contain the same
key), without displaying it or reading any process/User Qwen credential. Official
Beijing /models returned HTTP 200 and listed the configured vision and sound
models. Key is now in both roles of Electron userData/model-services.json, outside
Git. Main's actual userData path was queried via Electron; no source code changed.
Two actual, non-retried Gateway inference calls used only synthetic public test
inputs: qwen3-vl-plus correctly identified a blue square on red (134 tokens), and
qwen3-omni-flash returned a valid acoustic description (134 tokens). The latter
mischaracterized a 440 Hz pure tone as background noise/possible hum or wind;
transport/schema success is NOT acoustic semantic acceptance. Cost was not
returned. Raw key and private contexts are absent from the report. Receipt and
synthetic inputs remain outside Git at OS TEMP/ave-qwen-lilsunspot-20260925.
Whisper is still unconfigured, so the complete split configuration remains
explicitly disabled. This supersedes the old unavailable-Qwen-key blocker only;
first real personalized checkpoint remains blocked. Next: configure a usable
Whisper service, then resume the existing real journey and evaluate acoustic
accuracy on the representative source; no hidden substitution or success claim.


2026-09-25 user explicitly requests local Whisper installation. Resume the same
WP for the bounded deployment and real three-service verification slice. Use an
isolated official Speaches/Faster-Whisper service and model cache outside Git,
loopback-only endpoint, pinned image identity, no changes to existing GP/Gym
containers. Default multilingual small model; configure actual successful device
explicitly. Validate real speech/timestamps and the configured Qwen+Whisper+sound
path before enabling local settings. Maintain real-quality limitations and do
not promote the complete personalized checkpoint from a deployment smoke test.

2026-09-25 local Whisper installation delivered under the same active WP.
Evidence EVD-20260925-S3-LOCAL-WHISPER records pinned service/model identities,
official-digest verification, actual CPU and GPU speech/timestamp tests, and the
three physical calls through configuredSplitModelProvider. Local transcription
is now configured at loopback port 18080 and the saved-key settings are enabled;
Main's actual loader was verified with an empty environment. No source change,
commit, push or PR; fingerprint remains a6e21b719fd8cac6867d3c9939562d31dc4692423a33e2d6ab38c0fd9ee4de3c.
Keep the network failures, failed CPU timestamp baseline and failed empty-bind
HTTP call; corrected conditions and subsequent checks are separately recorded.
The sound service translated speech instead of describing acoustics. Root's
semantic review failed that role despite passing HTTP/schema/fusion. The local
Whisper request is complete; the real personalized checkpoint is not. Continue
by resolving this acoustic behavior and then the existing authorized real case,
held-out learning, exception/forgetting and actual works/reopen/recording checks.

Local-installation closing checks: docs:sync and docs:check passed; no configured
provider key appeared in the 353 changed/untracked existing files scanned.
Service is running with restart-unless-stopped and zero restarts. The app reads
the enabled local configuration on its next start. Original GP/Gym services
remain running. Source-unchanged full check/final synthetic evidence is reused,
not relabelled as real creative quality acceptance.

2026-09-25 user explicitly authorizes an early remote-branch snapshot before the
real checkpoint is complete. Commit the accumulated registered implementation,
tests, selected design source and truthful Evidence on
codex/stage3-first-personal-creation, then push that branch to origin. The scope
audit found 239 meaningful changed/new paths, all allowed, without configured
keys, private media, databases or logs. Source fingerprint still matches the
passed full check/final synthetic record. This publication does not complete the
WP, accept acoustic semantics, merge, release, or start the next checkpoint.
