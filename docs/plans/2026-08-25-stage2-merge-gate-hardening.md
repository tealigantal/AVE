# Stage 2 merge-gate and Evidence fingerprint hardening

## Purpose / Big Picture

Make the current Stage 2 branch independently merge-verifiable without adding
features. A pull request for the repaired final SHA must execute all
deterministic Stage 2 tests, while Evidence must bind the governance programs
and critical root build/architecture configuration that define completion.

## Progress

- [x] 2026-08-25 Read the branch review, repository authority chain, current
  programme state, CI workflow, fingerprint implementation and tests.
- [x] 2026-08-25 Register the narrow governed package and freeze its allowed
  paths and non-goals.
- [x] 2026-08-25 Start `WP-CA-MERGE-001` and implement the merge-gate repairs,
  including the newly exposed deterministic-test portability fixes.
- [x] 2026-08-25 Pass focused Stage 2, fingerprint and CI topology tests plus
  the complete repository gate and synthetic final acceptance at fingerprint
  `47dde9be2ea0bec13681993400808ad94f7b67bbae70cfe3fe34a612f270ec64`.
- [x] 2026-08-25 Create final current-fingerprint Evidence, reconcile both
  programmes, complete `WP-CA-MERGE-001`, and pass independent final review
  with no P0/P1/P2 implementation or governance blocker.
- [ ] PR #10 is open; push the `WP-CA-MERGE-002` final head and wait for that
  exact commit's `security` and `check` jobs to pass.
- [x] 2026-08-25 Repair the first PR security run's exact historical-Evidence
  path-scan failure through `WP-CA-MERGE-002`; local exact scan, CI contract,
  full repository check and synthetic acceptance pass at fingerprint
  `ca4f4cb782b7ea5d2f8b54b291bd738ce6ff8f6bdfe0ed4963c4578c38652140`.
- [x] Repair the twice-reproduced Linux/FFmpeg 120 fps final-boundary frame
  failure through `WP-KF-CI-001` without weakening the exact 240-frame
  acceptance assertion; local full and synthetic gates pass at fingerprint
  `7896f01c663f110a610d024041ec0e21a1892ad04a3485b2fc26358b5e13b30e`.
- [x] Close the four confirmed PR review threads through `WP-CA-MERGE-004`:
  dynamic workspace expiry/staleness, post-confirmation approval retry, and
  fail-closed unsafe RationalTime projection; local focused, full and
  synthetic gates pass at fingerprint
  `11507b46e269c2044e0dce6a439f815356c43a7bd8a9244627f0b575f40f7428`.
- [x] 2026-08-25 Close the two late render/Renderer review findings through
  `WP-CA-MERGE-012`; focused, full and synthetic gates pass at fingerprint
  `e651d0cdac4d397f86eda9ee379b64d5c76ca30c6c8c141a84988471ef355e3b`.
- [x] 2026-08-25 Close the independent-review opacity proof gap and obtain a
  final read-only verdict of no P0/P1/P2.
- [x] 2026-08-25 Close the three late exact-review, Contract-authority and
  Preview-byte-integrity findings through `WP-CA-MERGE-013`; focused, full
  repository and synthetic final gates pass at fingerprint
  `41e2bf5fca22bc02ad15fd00ecf39bcc0b61db7311d57b434096739bee354c77`.
- [x] 2026-08-25 Close the independent-review Host bypass and behavioral proof
  gaps through `WP-CA-MERGE-014`; focused, full repository and synthetic final
  gates pass at fingerprint
  `bc3157bc459df99367445b7a6c788edcfb3cf1f6b7ce0b63ea82c6fdf2e06da3`.
- [x] 2026-08-25 Close the late exact-render-binding and one-unit static-
  position findings through `WP-CA-MERGE-015`; focused, full repository and
  synthetic final gates pass at fingerprint
  `8b9a0477bafe33654849323df87685d63bb334bed5cc43acf469710bd0df925a`.
- [x] 2026-08-25 Close the Contract-entry and execution-bound-render findings
  through `WP-CA-MERGE-018`; focused, full repository and synthetic final gates
  pass at fingerprint
  `c8e324ac8f648c380c85029023a2a1622a429b2813ef749e6e82a463a1149a30`.
- [x] 2026-08-26 Implement the `WP-CA-MERGE-022` desktop generation chain,
  exact child-approval review, exact feedback Contract binding, and Host-owned
  locked-target projection.
- [x] 2026-08-26 Replace the invalid lock test fixture with public Timeline
  commands and close the resulting multi-beat render canvas gap through one
  shared, authoritative execution profile.
- [x] 2026-08-26 Close the material-permission async verification race by
  revalidating Contract, location and approval authority immediately before
  atomic commit; controlled Contract-successor and newer-deny interleavings
  preserve the winning state.
- [ ] 2026-08-26 Reconcile final Evidence, pass the complete local gates and
  independent review, push the exact repaired SHA, and wait for remote PR jobs.
- [ ] 2026-08-26 Close the post-push three-candidate subset bypass through
  `WP-CA-MERGE-023`, republish a new exact head, and repeat remote verification.
- [x] 2026-08-26 Bind duplicate guards to prior Decision `candidate_refs`,
  project rejected remainders, pass direct-Host zero-write regressions, full
  repository gates, synthetic final acceptance and independent review at
  fingerprint `0ce96940d73c22c852d0f294d187c6a0d06565526200815416e740bf12ce50fa`.
- [x] 2026-08-26 Close the late implicit feedback-timebase and partial
  programme-publication findings through `WP-CA-MERGE-024`, using exact
  fail-closed tick comparison and recoverable single-batch publication.
- [x] 2026-08-26 Pass focused fault-injection, full repository, synthetic and
  independent-review local gates at fingerprint
  `818eebe9e32a6cf539750c327fb6b57671fbeaec53f5743349d8ab959e93e691`.
- [ ] 2026-08-26 Push the exact WP024 head, pass that SHA's remote gates, then
  refresh and resolve review threads; keep PR #10 open.

## Surprises & Discoveries

- The reusable GitHub workflow already runs `pnpm run check`; the missing
  coverage is in the default script aggregation, not workflow topology.
- The shared repository fingerprint updates both registered programmes, so a
  truthful repair must refresh editing-execution-v1 as well as
  creative-assistant-v1 current Evidence bindings.
- Stage 2 is product-complete but has no active package; this post-exit package
  is required to preserve the one-active-package and allowed-path invariants.
- The newly reachable Story Host test assumed migration 26 was globally latest,
  although feedback migration 27 already exists; its assertion must target the
  owned 24-26 migration set instead of the repository maximum.
- `intelligence-pipeline:test` included a real-media test requiring private
  environment variables. The deterministic Host/property lane must remain in
  `:test`, with the real-media lane retained separately as `:real`.
- The first-ever PR run for this branch exposed six immutable transform-review
  Evidence records with historical machine-local absolute artifact roots. Preserve the
  records and add only exact hash-pinned scan exceptions; do not weaken the scan
  to exclude all Evidence.
- On the final-head PR run and its failed-job rerun, Ubuntu's FFmpeg produced
  239 frames for the exact two-second 120 fps Worker fixture. The declared
  timeline requires 240; accepting 239 would weaken the established boundary.
- After the repaired final-head CI became green, the explicit remote-thread
  audit found three P1 and one P2 Codex review findings that GitHub's merge
  state did not enforce. All four reproduce against `95d109a` and require
  semantic closure before the branch can be reported as review-clean.
- The first locked-target regression attempted to replace an immutable
  same-version Timeline snapshot and failed on object-store foreign-key
  integrity. Public lock commands are the reachable product path and correctly
  invalidate the earlier execution before feedback evaluation.
- Multi-beat execution exposed that a name-only render profile could pass Host
  planning but fail in Worker composition. The exact Original geometry must be
  part of both planning and final render profile derivation.
- Material identity verification yielded after its initial authorization
  checks. A Contract successor or newer exact material decision could otherwise
  win during verification and then be overwritten by the stale request.
- A three-candidate comparison leaves two original candidate rows visible after
  the first decision. Checking only the selected artifact lets that remainder
  masquerade as a new candidate set even though the prior Decision Record
  already preserves the complete immutable comparison.
- A raw source-duration delta is a valid Timeline duration only when the tick
  units are exactly equivalent and the clip has a one-to-one, unit-speed,
  TimeMap-free source mapping. A timescale-only guard would still corrupt
  reachable retimed clips.
- A rollback inside the low-level writer was insufficient because start and
  completion previously published programme authority and generated current
  state in two separate batches. Crash consistency requires one mutex and one
  journaled batch around the complete high-level transition.
- PID-file stale takeover has an unavoidable check/delete/acquire race, while
  separate prepared/committed marker files introduce another torn cleanup
  state. The repository's Node 22 SQLite runtime provides crash-released OS
  locking, and one atomically replaced phase journal supplies a single commit
  point.

## Decision Log

- 2026-08-25: Put `stage2:check` inside `pnpm run check` so every existing PR,
  main and release verification caller receives the same deterministic gate.
- 2026-08-25: Bump the fingerprint framing version when expanding its source
  universe; this prevents old and new scope from being mistaken as equivalent.
- 2026-08-25: Record the Electron harness placement as debt only. Moving it is
  explicitly outside the review's minimum merge list.
- 2026-08-25: Keep private real-media validation out of `stage2:check`; split
  the existing pipeline script rather than weakening or skipping its local
  real acceptance lane.
- 2026-08-25: Treat immutable historical Evidence path exceptions as an exact
  allowlist protected by normalized SHA-256, matching the existing two-record
  policy rather than editing append-only records.
- 2026-08-25: Preserve the exact 240-frame RationalTime boundary by appending
  one finite cloned tail frame before final profile-rate conversion and then
  trimming to the calculated frame count; do not accept the Linux 239-frame
  result as equivalent.
- 2026-08-25: Make Product workspace reads asynchronous so they can reuse the
  same identity-aware dynamic views as Host mutations; bind dynamic status into
  the digest, use a unique identity per human confirmation attempt, and omit
  unsafe numeric Timeline targets instead of rounding them.
- 2026-08-26: Exercise track and range locks only through Project Host Timeline
  commands. A lock advances Timeline, so feedback against the earlier execution
  must first fail as `FEEDBACK_BASE_EXECUTION_NOT_CURRENT`; the workspace proves
  the more specific unavailable reason independently.
- 2026-08-26: Use the single authoritative Original geometry shared by all
  active video assets as the bounded Stage 2 execution canvas. Missing or mixed
  geometry fails before approval instead of selecting an arbitrary asset.
- 2026-08-26: Treat async media identity verification as a read phase only.
  Re-read the exact Contract head and full location state, then evaluate the
  stored human approval after the await and commit synchronously; any rebound
  fails without a stale material-permission decision.
- 2026-08-26: Use prior Decision Record `candidate_refs`, not the selected
  artifact or caller-supplied subset, as the durable candidate-set identity for
  duplicate Direction and Story guards.
- 2026-08-26: Keep feedback trim support deliberately narrow: exact
  RationalTime equivalence plus exact one-to-one source/Timeline duration is
  accepted; mixed units, non-unit speed and every TimeMap fail before command
  compilation until a retime-aware command is governed and accepted.
- 2026-08-26: Serialize every managed programme read and transition with a
  SQLite `BEGIN IMMEDIATE` mutex and publish one strict before-image journaled
  batch. The atomically replaced journal phase is the commit record; unknown or
  forged authoritative transaction artifacts are retained and fail closed.
  Strict UUID journal temporaries are explicitly programme-owned and
  non-authoritative, so even a torn write is safely removable before recovery.

## Outcomes & Retrospective

The local repair and all review-driven closures through `WP-CA-MERGE-024` are
implemented, and all required local gates pass. Feedback trims now require an
exact one-to-one RationalTime mapping, while each managed programme transition
publishes one crash-recoverable authority and generated-current batch. Every
deterministic Stage 2 suite remains in the default check chain; private real
media and power-loss or unreliable-network-filesystem durability remain outside
this claim. Only commit, publication, exact-head remote CI and review-thread
closure remain.

## Context and Orientation

`package.json` owns the default check chain. `.github/workflows/verify.yml`
invokes that chain in the required `check` job. `scripts/docs/fingerprint.mjs`
computes the shared source fingerprint written by `scripts/docs/sync.mjs` into
both programme state files. Matrix Evidence references and each programme's
latest Evidence must include that exact fingerprint for `docs:check` to pass.

## Plan of Work

First start the package. Then add the Stage 2 aggregate and its CI topology
assertions, expand the fingerprint input policy and regression tests, and run
focused gates. At the stable repaired fingerprint, create append-only Evidence,
add it to every current capability and acceptance row, record the P2 debt,
complete the work package, regenerate current documents and execute full gates.
Finally obtain an independent read-only review, commit, push, create or update
the PR, and verify the remote final SHA and required jobs.

## Concrete Steps

1. `pnpm docs:start -- WP-CA-MERGE-001`
2. Patch only the manifest `allowed_paths`.
3. Run `pnpm run stage2:check`, `pnpm run docs:fingerprint:test`, and
   `pnpm run ci:workflow:test`.
4. Run `pnpm run docs:sync`, calculate the stable fingerprint, create Evidence,
   reconcile matrices/state, and run
   `pnpm docs:complete -- WP-CA-MERGE-001 <EVIDENCE-ID>`.
5. Run `pnpm run docs:sync -- --check`, `pnpm run docs:check`,
   `pnpm run check`, `pnpm run acceptance:final:synthetic`,
   `git diff --check`, and an allowed-path audit.
6. Commit, push, create/update the PR, compare local/remote head, and wait for
   `security` and `check` to pass on that exact SHA.

## Validation and Acceptance

Acceptance requires all eight named Stage 2 suites to be reachable from
`pnpm run check`; each newly covered fingerprint input must change the digest
when modified; both programme states and every claimed capability/acceptance
must bind the final fingerprint; generated documents must be drift-free; no
runtime/product path may change; the PR must report green `security` and `check`
on the pushed final SHA.

## Idempotence and Recovery

Package start and sync are idempotent. Fingerprint tests use isolated temporary
Git repositories. Evidence is append-only; a failed validation keeps the
package active and requires a new Evidence ID only after the fingerprint is
stable. Pushes are non-destructive. No merge occurs in this task.

## Artifacts and Notes

All Evidence is repository-portable and contains no private media or machine
paths. GitHub Actions is external independent execution evidence; local
Evidence remains necessary for the governed programme but cannot replace it.

After the first repaired remote head passed CI, the final review-thread audit
surfaced one additional P1: an exact feedback rejection did not invalidate an
earlier proposal approval. `WP-CA-MERGE-005` closes that path without changing
the permission policy or artifact schema, then repeats the local and remote
final-head gates before the branch can again be reported as ready for review.

Independent review of that closure then found a TOCTOU window between async
execution preparation and atomic commit. `WP-CA-MERGE-006` adds the final
in-transaction rejection check and controlled interleaving coverage rather
than broadening IPC or Host serialization.

The next remote audit identified that the deliberate feedback Timeline/Story
bypass also skipped current Original-media authority in the Product workspace.
`WP-CA-MERGE-007` retains the accepted-feedback semantics while binding visible
feedback status to the exact Story's dynamic Material Evidence Pack.

The next remote audit found that persisted v1 candidates allowed a later or
concurrent second Direction selection and Story approval. `WP-CA-MERGE-008`
adds single-authority candidate-set checks before and inside the atomic write.

Independent review then found that the Product Host guard ran after the desktop
native confirmation. `WP-CA-MERGE-009` closes duplicate Story approval in the
main-process confirmation path before any dialog is shown, while retaining the
Host guard as defense in depth.

The final remote refresh surfaced an order-sensitive equality shim in generated
standalone validators. `WP-CA-MERGE-010` restores JSON Schema `uniqueItems`
structural equality without changing schemas or adding a runtime dependency.

Independent review then exercised cyclic non-JSON inputs against the public
validator and found an unbounded recursion path. `WP-CA-MERGE-011` adds
per-invocation active-pair tracking so invalid cyclic inputs fail closed rather
than raising a stack overflow.

The next final thread refresh surfaced two earlier late comments: opacity-only
automation changed framing, and an expired rejection decision re-exposed actions
for a Host-terminal rejected Intent. `WP-CA-MERGE-012` closes both rendered user
paths with encoded-media and Renderer property regressions.

The post-WP012 remote refresh then exposed three earlier late comments that had
not appeared in the prior thread query: exact execution preparation occurred
after the native confirmation, multiple Creative Contract families could leave
workspace authority ambiguous, and current Preview bytes were not checked
against their registered output hash. `WP-CA-MERGE-013` closes those three
authority and review-integrity paths without changing contracts or storage.

Independent review then found that the Product Host accepted an omitted
confirmed execution review and that the post-prepare, native-detail and
post-read rebind branches lacked behavioral proof. `WP-CA-MERGE-014` makes the
Host boundary mandatory and closes those evidence gaps.

The next exact-head remote refresh exposed two earlier comments: same-version
renders without an execution binding could be projected as current, and static
`x: 1`/`y: 1` used the scale identity default. `WP-CA-MERGE-015` persists exact
render bindings and separates position from scale defaults.

The post-WP015 remote refresh surfaced one further P2: local feedback silently
bound multi-clip Timelines to the first editable target. `WP-CA-MERGE-016`
requires an explicit clip selection and resolves it by exact track/clip identity
before any Host command is sent. Focused Renderer/Product gates, typecheck,
architecture, full repository check and synthetic final acceptance passed at
fingerprint `b78ca487eb4d504f00325a0e9e75070d8b273ecc6de81854270f1f547e1d2d41`.

Independent review then found the target selection implementation correct but
its regression proof too structural. `WP-CA-MERGE-017` adds executable
two-target selection and empty/stale zero-command assertions without changing
the visible workflow or Host boundary. Focused, full repository and synthetic
final gates passed at fingerprint
`af50def54cb064a0e6d8df8f143f54638d74e218758d1216143fb6bf3b2da056`.

The post-WP017 exact-head thread refresh surfaced two late P1 findings: a new
desktop project had no product path to register and approve its Creative
Contract, and a committed Stage 2 execution had no execution-bound render
action. `WP-CA-MERGE-018` closes both user-journey breaks through the existing
Project Host approval and render-binding authorities, with no implicit approval
or unbound legacy-render fallback.

Independent review of WP018 then found its Contract stylesheet outside the
declared `allowed_paths` and identified missing behavioral proof for the
post-Worker render rebind plus the desktop confirmation/legacy-render guards.
`WP-CA-MERGE-019` owns that stylesheet explicitly and adds the controlled
zero-persistence and Main-boundary regressions before the branch is published.

Final replay review found the WP019 manifest named a nonexistent desktop test
alias even though the actual `workbench:host:test` gate passed and was recorded
in Evidence. `WP-CA-MERGE-020` corrects that governance-only command vocabulary
and refreshes the shared fingerprint without touching product or test code.

The next exact-head thread refresh surfaced one earlier P2: x/y-only position
automation could reach Worker execution without target-specific source geometry.
`WP-CA-MERGE-021` moves that failure into RenderGraph planning and adds exact
missing/present geometry regressions without changing Worker behavior.

The post-WP021 exact-head refresh surfaced two further Product gaps: a desktop
project could approve its Contract but could not drive the existing
Material/Evidence/knowledge/Direction/Story/Intent generation chain, and clips
on locked tracks were still offered as feedback targets. `WP-CA-MERGE-022`
closes both through the existing Host-owned authorities and workspace snapshot,
without changing schemas, permission policy or Timeline execution.

The post-WP022 exact-head thread audit exposed that its predecessor's
single-authority guard checked only selected artifacts. `WP-CA-MERGE-023`
instead reads the complete immutable `candidate_refs` from prior Decision
Records, so the B/C remainder of an already decided A/B/C comparison cannot be
submitted as a new set.

## Interfaces and Dependencies

The package changes only the root script graph, documentation fingerprint
policy, their architecture tests, machine-readable governance, Evidence and
generated documents. It depends on completed `WP-CA-EXIT-001` and the existing
reusable PR workflow.
