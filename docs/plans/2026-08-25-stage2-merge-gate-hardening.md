# Stage 2 merge-gate and Evidence fingerprint hardening

## Purpose / Big Picture

Make the current Stage 2 branch independently merge-verifiable without adding
unsupported editing semantics. `WP-CA-MERGE-029` closes the exact-head findings
that approved Story duration was discarded during Timeline compilation and
Product Story generation emitted fewer Beats than its Duration Feasibility.
The repaired head must preserve complete exact unit-speed Story timing or fail
closed, generate the planned Beat count, and keep programme claims bound to the
evidence that remains valid.

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
- [x] 2026-08-26 Push the exact WP024 head and pass that SHA's remote gates;
  the required refresh found WP025, so thread resolution was correctly
  deferred while PR #10 remained open.
- [x] 2026-08-26 Close the exact-head non-candidate Direction/Story selection
  finding through `WP-CA-MERGE-025`; only current candidate cards may be
  selected or approved.
- [x] 2026-08-26 Complete WP025 Evidence and pass focused, full repository,
  synthetic, documentation and independent-review local gates at fingerprint
  `e233643cf3ff333aeaf2a073e5a38f46c1a2908d0345ca48fde7a8d848a776ce`.
- [x] 2026-08-26 Implement `WP-AUDIO-CI-001`: normalize compressor inputs,
  isolate corrected Ducking output under v3/r13, preserve v2/r12 compatibility,
  and make exact Bundle retry plus Stage 2 publication identity fail closed.
- [x] 2026-08-26 Pass focused Worker, RenderGraph, Contract, Project Host,
  Stage 2, static-analysis and architecture gates, including repeated encoded
  tail recovery and corrupted-Bundle rejection.
- [x] 2026-08-26 Reconcile final Evidence, complete `WP-AUDIO-CI-001`, and pass
  the completed-state full and synthetic gates at fingerprint
  `120012cb4e44ae3e0b443528583f32ad618395f5a1beb046bb1f71e0a599310e`.
- [x] 2026-08-26 Commit and push repaired head
  `8e0a15b99681670438599d8806aab757651fdd2b`; local and remote refs match and
  PR #10 remains open. GitHub Actions did not create a run because the official
  service status entered a major outage before the push.
- [x] 2026-08-27 Implement the `WP-CA-MERGE-026` layered Evidence, Product
  Material, Skill, Duration and Direction identities; preserve generic Creative
  Context compatibility and stale audit history.
- [x] 2026-08-27 Replace persistence-order current Pack selection with exact
  Host authority projection, cascade both Pack and Direction ambiguity through
  the Product chain, and align Renderer controls with those fail-closed states.
- [x] 2026-08-27 Pass the focused Creative Context, Product workspace,
  Renderer, Workbench Host, typecheck and architecture gates, including exact
  legacy-object and isolated two-authority zero-write regressions.
- [x] 2026-08-27 Freeze fingerprint
  `a3caf66d5cf80bd2a7c22e8aed0d8eee5d7b389d6a68e53334e7b758b71395a4`,
  reconcile PRECHECK and COMPLETE Evidence, complete WP26, and pass full,
  synthetic and independent-review local gates with no P0/P1/P2.
- [x] 2026-08-27 Commit and push WP26 as
  `9677a42543c3e1d968d7ec1f7380061d1c60b941`; the exact remote head passed
  both `security` and `check`, and PR #10 remained open.
- [x] 2026-08-27 Refresh unresolved review threads and independently confirm
  one Product duration dead-end (P1) and one desktop permission projection
  error (P2); select a Product-only exact resolver and narrow safe-row repair.
- [x] 2026-08-27 Implement the shared Product duration resolver at create,
  approve and material-generation boundaries, repair the safe media projection,
  and pass focused Product, Creative Context, IPC, desktop, Electron, type and
  architecture gates including zero-write regressions.
- [x] 2026-08-27 Strengthen independent proof with SQLite total-change
  snapshots, a non-unit-timescale RationalTime approval and an executable pure
  safe-row projection test before publishing the replacement PRECHECK
  fingerprint.
- [x] 2026-08-27 Freeze fingerprint
  `4529ba136066f712766599018250ae44a2c40a7e8b7fbe9969014c810777f9eb`,
  publish R2 PRECHECK Evidence, and pass documentation, full repository,
  synthetic final acceptance and independent code/test review gates.
- [x] 2026-08-27 Publish COMPLETE Evidence for both programmes and complete
  `WP-CA-MERGE-027` with no capability or acceptance status promotion.
- [x] 2026-08-27 Push `WP-CA-MERGE-027` as
  `4e163fb894c005cf35808ba8c8773d55aadd59f5`; its exact `security` and `check`
  jobs passed while PR #10 remained open.
- [x] 2026-08-27 Refresh the exact-head review and confirm one new P2: a
  zero-length Story Beat can be compensated by another beat and reach approval.
- [x] 2026-08-27 Start `WP-CA-MERGE-028`, enforce the Story-only positive
  duration invariant at evaluation and approval, and prove Host zero-write
  rejection.
- [x] 2026-08-27 Freeze fingerprint
  `b87ec9d4760577eba026216c555dafb9cee84dad77fec3392d2a1c4c6746adf2`,
  reconcile PRECHECK Evidence, and pass focused, full repository, synthetic
  final acceptance and independent code/test review with no P0/P1/P2.
- [x] 2026-08-27 Publish COMPLETE Evidence, complete WP28, repeat completed-state
  full repository and synthetic gates, and pass independent governance review
  after correcting its stale ExecPlan status finding.
- [x] 2026-08-27 Commit and push the final WP28 head, pass its exact remote
  `security` and `check` jobs, then resolve only review threads demonstrably
  closed by that head.
- [x] 2026-08-27 Push WP28 as
  `b28ff1874c441a8588a5fd5e4df56d3159f51141` and pass exact-head remote
  `security` and `check`; the required thread refresh exposed one P1 Story
  duration-compilation gap and one P2 Product planned-Beat-count gap.
- [x] 2026-08-27 Start `WP-CA-MERGE-029`, implement complete unit-speed Story
  compilation and deterministic planned-Beat generation, correct invalidated
  acceptance claims, and pass focused type, Pipeline, Product, Workbench and
  IPC gates.
- [x] 2026-08-27 Close the independent terminal findings: non-neutral output
  state, undefined range/audio semantics, legacy authorization without an
  immutable snapshot, over-broad immutable permissions, incomplete workspace
  Evidence identity and internal media projection leakage.
- [x] 2026-08-28 Close immutable-snapshot publication, identity, cleanup,
  protection-recovery, session-close and execution-bound Render publication
  races; pass the focused type and Product action regressions after the final
  Promise-continuation fix.
- [x] 2026-08-28 Pass the complete governed validation matrix and synthetic
  final acceptance, execute both private real lanes to their explicit
  missing-input blockers, publish COMPLETE Evidence, and complete WP29 at
  fingerprint `104192469a65fc581a856a09cb78772b86c6aa5531bf5a7eea49cb6f6f763946`.
- [ ] 2026-08-28 Commit and push one exact WP29 head, pass its remote `security`
  and `check` jobs, and refresh every review thread without merging.

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
- The first green WP024 remote head exposed one remaining Renderer-only P2:
  Host correctly marks stale and rejected candidates unavailable, but retained
  local selection IDs let the UI keep offering actions that the Host must
  reject.
- The same control path must distinguish a complete comparison from an
  interrupted generation. One remaining candidate is not approvable because
  Host requires two, but hiding generation whenever any historical card exists
  also removes the supported retry path.
- The WP025 completed-state full gate exposed an older Basic Vlog ducking
  defect: the same graph and cache identity produced multiple PCM/output hashes,
  and Music sometimes became silent around 3.0-3.6 seconds while the final
  `apad` preserved a misleading four-second container. Isolated and audio-only
  replays reproduce it, so this is a real Worker P1 rather than a Renderer
  regression or measurement-only flake.
- Independent upgrade replay proved the corrected Ducking graph still collides
  with an existing bad v2 output, and the same cache identity would also
  conflict at atomic Render Bundle registration. The implementation repair is
  therefore incomplete until the affected adapter identity advances.
- Binding material regeneration only to Timeline version closes Timeline-stale
  replay but not a same-content, same-path Original relink. The exact current
  location authority used by material permission must share the generation
  identity boundary, otherwise stale Evidence IDs can still conflict during
  the user-visible recovery path.
- Timeline and location alone are still insufficient: exact Creative Skill and
  Duration definitions plus material, evaluator, allocator and Story template
  authorities must each participate in the immutable layer they govern. A
  dynamic stale label without a fresh storage identity only converts drift into
  an unrecoverable version conflict.
- Creation time and array order are not Pack authority. Project Host must derive
  the current Pack from exact active Direction refs or uniqueness, expose that
  exact ref to the Renderer, preserve stale history, and fail the complete
  Direction-to-Intent chain closed when the authority is ambiguous.
- The generic Creative Context API intentionally retains its pre-existing input
  fingerprint and snapshot lifecycle. Product assembler/template/policy drift
  is carried by an explicit Product material marker; a caller-chosen
  `product-pack-*` ID alone cannot opt a generic Pack into Product policy.
- A global r13 provenance label would also change old non-Ducking bundle
  content without changing its v2 idempotency key. Provenance must therefore
  follow the selected adapter track, not only the Worker binary revision.
- Host-level repeated render currently reuses a persisted Job record that keeps
  outputs but not Worker metrics, then fails mandatory output verification.
  Exact completed Render Bundle reuse is the existing ADR-0011 authority and
  must short-circuit this lossy Job replay before media-render submission,
  after fresh source verification.
- An unbound render and an approved Stage 2 execution can share the same media
  plans but not the same publication claim. Exact execution binding therefore
  belongs in Bundle provenance and persisted result profile validation.
- Path-only completed fingerprint/probe Jobs can hide a same-path, same-length
  source replacement across render calls. Bundle reuse therefore needs fresh
  Worker-derived source identity and probe facts, not only stat equality or a
  cached Job result.
- A metrics-less completed render Job is not itself a reusable Worker result.
  Re-execution may recover metrics only when every fresh output ref exactly
  matches the persisted refs; otherwise the plan/cache identity must fail
  closed without publication.
- Matching output refs are still insufficient if fresh metrics claim a Worker,
  plan or cache identity that does not match the selected adapter. Publication
  must validate both output and metrics provenance before writing any Bundle.
- Bundle replay must prove that the loaded Bundle object and identity payload
  match their stored hashes and that each output is the expected project-local
  content-addressed object with adapter-specific Worker provenance.
- Source argument order is not semantic. Persist and compare authoritative
  source refs in asset-identity order so equivalent calls cannot disagree on
  Bundle content under one plan/cache key.
- Windows reports different BigInt device values for a pathname and an open
  handle to the same NTFS file, while the BigInt inode/file ID remains stable.
  Windows identity therefore compares the non-zero inode plus link count;
  POSIX retains device-plus-inode identity.
- Node's portable filesystem API cannot provide handle-relative ancestor and
  unlink operations on every supported platform. The immutable snapshot claim
  is therefore bounded to AVE processes cooperating through the existing
  project lock; a non-cooperating same-user pathname ABA attacker and parent
  directory fsync under power loss remain outside this package.
- Protecting an existing writable snapshot before the atomic permission commit
  is itself an authority-affecting change. If a later revision check loses, the
  old mode must be restored; otherwise a failed request could silently make an
  earlier Pack current.
- A final asynchronous Render authority helper can pass and still yield once
  to its caller before Bundle registration. Returning the verified persistence
  revision and synchronously checking it in that continuation closes the last
  same-Host publication window.

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
- 2026-08-26: Derive Direction and Story controls exclusively from current
  Host lifecycle plus comparison cardinality. Terminal cards remain visible
  and inert; zero or one current candidate retains generation recovery, while
  two or more current candidates enable exact selection and approval.
- 2026-08-26: Normalize both ducking compressor inputs after exact-duration
  pad/trim with `asetnsamples=n=1024:p=0`. A single-thread filter graph still
  produced three hashes, while fixed equal frame boundaries produced one
  correct hash in 30 consecutive runs without padding an extra final frame.
  Permanent acceptance must inspect fixed late windows and repeated same-plan
  hashes; duration or best-of-window checks cannot stand in for tail integrity.
- 2026-08-26: Advance only enabled Ducking graphs to `worker-media@v3` and keep
  unaffected graphs on v2. Host and Worker must derive the same selection,
  legacy v2 Ducking requests fail closed, v3 provenance advances to r13, and
  unchanged v2 execution retains r12-compatible bundle content. This
  invalidates only defective Ducking outputs instead of rebinding all existing
  Stage 2 execution plans or breaking their idempotent retries.
- 2026-08-26: Resolve exact completed render retries from the immutable atomic
  Bundle after current execution-binding and stored identity verification.
  Do not weaken output-hash checks or treat outputs-only Job replay as a full
  Worker result.
- 2026-08-26: Keep media plan/cache identity independent of human approval,
  while hashing exact Stage 2 execution binding into Bundle publication
  provenance. A metrics-less legacy Job replay cannot authorize publication;
  re-execute Worker under immutable output checks when no exact Bundle exists.
- 2026-08-26: Treat render-time media verification as a live authority check.
  Bypass path-only Job replay for both fingerprint and probe, derive audio facts
  from that same fresh inspection, and fail before rendering when content no
  longer matches its registered asset identity. User import/relink/proxy
  operations still persist auditable Jobs, but each inspection receives a new
  invocation identity and therefore never treats a path as content identity.
- 2026-08-26: Accept metrics recovery from a persisted render Job only when the
  fresh Worker outputs canonically equal the stored output refs. For Bundle
  replay, verify the Bundle object/content hashes, graph/source/profile identity,
  canonical content-addressed paths and v2/r12 or v3/r13 provenance before
  reading output bytes.
- 2026-08-26: Before initial publication, bind fresh Worker metrics to the exact
  plan id, semantic hash, cache key, output hash and adapter-specific Worker
  version. Matching output refs cannot authorize forged or drifted provenance.
- 2026-08-27: The post-push review arrived while GitHub Actions was unavailable
  and showed that a Timeline-stale Material Pack cannot reuse its old immutable
  identity. Bind material generation identity to the exact Timeline version;
  retain the WP025 current-candidate recovery rule for the stale UI history.
- 2026-08-27: Expand `WP-CA-MERGE-026` from two source-authority fields to a
  layered generation identity: Evidence facts/generator, Product material
  marker, exact Skill, exact Duration and Story template. Persist the Product
  marker in Pack fingerprint plus provenance, but keep generic Creative Context
  fingerprints backward compatible.
- 2026-08-27: Replace wall-clock/array Pack selection with Host-owned semantic
  authority. Renderer consumes the exact projected current ref; multiple active
  Packs or selected Directions stale the complete downstream Product chain,
  while an exact reviewed generation can recover a no-active-Direction Pack
  ambiguity.
- 2026-08-27: Do not add an ADR for WP26. The repair narrows deterministic
  identity and current-authority projection inside the accepted ADR-0019,
  ADR-0020 and ADR-0023 boundaries; it changes no schema, storage ownership,
  IPC surface, permission model or public Contract.
- 2026-08-27: Keep general Creative Contracts independent of the Product
  Duration catalog. Enforce unique published/trusted Blueprint support only at
  Product creation, Product approval and Product material generation, using
  exact integer RationalTime equality and zero-write rejection.
- 2026-08-27: Preserve the existing desktop media shape by projecting only
  `metadata.permission_state`; do not expose the permission decision metadata
  or change storage and Host authority. No new ADR is required.
- 2026-08-27: Keep zero-valued RationalTime legal outside Story semantics. The
  module-private Story fraction check can require a strictly positive numerator
  at both proposal evaluation and approval without schema, storage or version
  changes. Preserve arbitrary positive fractions such as `1/1000` second.
- 2026-08-27: The accepted three-second first-cut Evidence did not preserve its
  approved 60-second Story. `select_evidence` has no retime, loop or fill
  authority, so the safe repair is complete per-Beat unit-speed equality or
  pre-write rejection; prior Pipeline/Product human Evidence must be
  revalidated rather than grandfathered.
- 2026-08-27: Treat `planned_beat_count` as a feasibility invariant. Split
  Product role budgets deterministically and version only the Product Story
  template, avoiding an unrelated Direction/global Story invalidation.
- 2026-08-27: An empty output track can still suppress or alter the approved
  first cut through mute, solo, opacity, blend, effects or automation. Product
  review and compiler execution must share one exact neutral-destination
  predicate; `range` and `preserve_audio` remain unsupported until their
  semantics can be proven from approved inputs.
- 2026-08-27: A legacy mutable Original permission is not current authority
  without the Project-owned immutable snapshot. Creation belongs only after
  explicit confirmation, with strict read-only publication and cleanup across
  every pre-commit failure path.
- 2026-08-27: Product-visible Evidence lifecycle changes must invalidate the
  workspace token. Internal immutable media remains a Host/render concern and
  is filtered at the existing desktop IPC projection, not from Host storage or
  Renderer state after exposure.
- 2026-08-28: Publish immutable Originals only by an exclusive private handle
  and a same-volume no-clobber hard link, retain the final handle through the
  SQLite transaction, and bind cleanup or protection restoration to the exact
  file identity. Unsupported filesystems fail closed; no overwrite/rename
  fallback is permitted.
- 2026-08-28: Treat the existing project lock and cooperating AVE sessions as
  the local concurrency boundary. Serialize same-asset snapshot mutations,
  reject new mutations during close, wait for accepted mutation tails, and
  document the stronger hostile-local-process boundary as outside the claim in
  ADR-0024.
- 2026-08-28: Persist the exact execution ID in Stage 2 Render provenance and
  return the final verified persistence revision from asynchronous authority
  checks. Blocked, completed and reused publication paths synchronously recheck
  that revision immediately before their write or successful return.

## Outcomes & Retrospective

All review-driven Stage 2 closures through `WP-CA-MERGE-025` and
`WP-AUDIO-CI-001` are complete. `WP-CA-MERGE-026` is also complete at fingerprint
`a3caf66d5cf80bd2a7c22e8aed0d8eee5d7b389d6a68e53334e7b758b71395a4`:
Product regeneration identities are layered by their real authorities, current
Material/Direction authority is selected semantically, stale history remains
visible, and ambiguous authority disables the complete downstream user path
with zero writes. Focused, documentation, full-repository, synthetic-final and
independent-review gates passed, and the exact pushed head passed remote CI.
The subsequent required review refresh opened `WP-CA-MERGE-027` for two narrow
boundary inconsistencies. That package is now complete at fingerprint
`4529ba136066f712766599018250ae44a2c40a7e8b7fbe9969014c810777f9eb`:
unsupported Product durations fail before writes, exact RationalTime support is
catalog-bound, and the executable desktop projection preserves permission truth
without metadata leakage. Its exact pushed head passed remote CI. The required
review refresh then exposed one further Story-domain P2: an exact total could
contain a zero-length beat. `WP-CA-MERGE-028` is now complete at fingerprint
`b87ec9d4760577eba026216c555dafb9cee84dad77fec3392d2a1c4c6746adf2`:
evaluation and approval reject every non-positive Story duration, positive
fractional RationalTime remains valid, Host rejection is database-wide
write-free, and focused plus completed-state full/synthetic gates pass without
changing generic RationalTime or existing artifact versions. Its exact pushed
head passed remote `security` and `check`; the required review refresh opened
`WP-CA-MERGE-029` for incomplete approved-Story compilation and Product Beat
planning, then expanded the package to close the resulting immutable-source and
Render publication authority boundaries. WP29 is now complete at fingerprint
`104192469a65fc581a856a09cb78772b86c6aa5531bf5a7eea49cb6f6f763946`:
Product generation preserves the exact trusted planned Beat count, compilation
requires complete per-Beat unit-speed Evidence duration, immutable Original
publication and compensation are identity-bound, and execution-bound Render
revalidates exact authority immediately before publication. Focused, full
repository and synthetic final gates pass. The two private real lanes were
executed and failed closed on absent authorized external inputs, so Pipeline
and Product truthfully remain tested under active `DEBT-CA-STAGE2-003`.
Exact-head remote verification and review-thread refresh remain.
Private real media and power-loss or unreliable-network-filesystem durability
remain outside the claim.

## Context and Orientation

`package.json` owns the default check chain. `.github/workflows/verify.yml`
invokes that chain in the required `check` job. `scripts/docs/fingerprint.mjs`
computes the shared source fingerprint written by `scripts/docs/sync.mjs` into
both programme state files. Matrix Evidence references and each programme's
latest Evidence must include that exact fingerprint for `docs:check` to pass.

## Plan of Work

Complete `WP-CA-MERGE-029` as one authority-closure slice. Keep Contracts,
Timeline commands and rendering primitives unchanged; make Duration planned
count, approved Story duration, output neutrality, immutable-source authority
and Product-visible workspace identity authoritative across Product review,
semantic compilation and the existing desktop media projection. Publish only
tested status until corrected authorized media receives new human acceptance,
then push one exact head for PR #10 without merging it.

## Concrete Steps

1. Register and start `WP-CA-MERGE-029`; freeze its exact allowed paths and
   publish append-only PRECHECK Evidence for both programmes.
2. Add shared exact Duration-role allocation reuse and a deterministic Product
   Beat splitter that preserves role and total RationalTime sums.
3. Bind Product material ranges and Product Story template identity to that
   plan; reject insufficient or inexact source duration before persistence.
4. Enforce planned Beat count at Story evaluation and defensive approval,
   including current Duration identity and zero-write Host rejection.
5. Require complete Beat coverage plus exact unit-speed Evidence-duration
   closure in the semantic compiler; prove missing, short and long mappings all
   fail before Timeline writes while a complete exact plan remains executable.
6. Reject non-neutral destinations and undefined operation semantics through a
   shared Product/compiler predicate; require a current immutable Original for
   material authority, bind workspace digest to Evidence state and keep
   internal media rows behind the desktop IPC boundary.
7. Correct Pipeline/Product capability and acceptance status, record the
   real-media revalidation Debt, run focused/full/synthetic gates and
   independent review, then publish COMPLETE Evidence and complete WP29.
8. Commit and push, compare local and remote heads, inspect exact-SHA `security`
   and `check`, refresh review threads and resolve only findings demonstrably
   closed by that head. Do not merge.

## Validation and Acceptance

Acceptance requires Product Story generation to emit exactly the trusted
Duration plan's strictly positive Beat count and exact RationalTime budgets.
The semantic compiler must cover every approved Beat bijectively at unit speed,
reject duplicate, missing, overlapping, ranged, audio-preservation or
non-neutral-destination semantics before Timeline writes, and preserve an
exact 60-second final extent. Material authority must use one Project-owned,
single-link, read-only immutable Original; path, identity, mode, policy,
execution or content drift before commit or Render publication must fail with
no authoritative Bundle, run or result and identity-bound compensation. Both
programme states and every claimed capability/acceptance must bind the final
fingerprint; generated docs and Contracts must be drift-free; focused,
architecture, full and synthetic gates plus independent review must pass; and
the pushed exact SHA must be inspected for remote `security` and `check`
results. Private real-media acceptance remains blocked until its manifest is
provided and must not be reported as passed.

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

The post-WP025 review exposed that material regeneration reused one coarse
identity and that both Host and Renderer could treat the last persisted Pack as
current. `WP-CA-MERGE-026` now uses authority-specific immutable identities,
persists a Product-only material marker, selects the current Pack semantically,
and fails the entire downstream Product chain closed under ambiguity. Generic
Creative Context fingerprint compatibility and stale audit visibility remain
unchanged.

## Interfaces and Dependencies

`WP-CA-MERGE-026` changes Project Host Product-generation identity and workspace
projection, the desktop Stage 2 workspace's current-Pack and generation-control
derivation, their focused integration/property regressions, and governed
programme documents. It depends on completed `WP-CA-MERGE-025`, which depends on
`WP-CA-EXIT-001`. It does not change JSON Schemas, generated Contracts, SQLite
schema or ownership, Timeline/RenderGraph execution, IPC shape, permissions, or
external dependencies. The existing reusable PR workflow remains the remote
verification authority.

`WP-CA-MERGE-027` changes the Project Host's Product-only Contract duration
consumer at create, approve and material-generation boundaries, adds one pure
desktop safe-media projection used by the existing `project.media.list`
handler, and extends the focused Product, Workbench and IPC regressions. It
depends on completed `WP-CA-MERGE-026`. It does not change generic Creative
Contract validity, the Duration Blueprint catalog or evaluator, JSON Schemas,
generated Contracts, SQLite schema or storage ownership, Timeline/RenderGraph
execution, permission authority, the public IPC shape, Worker behavior or
external dependencies. The existing reusable PR workflow remains the remote
verification authority for the completed WP27 head.

`WP-CA-MERGE-028` changes only the Story module's private exact-duration
validation and its property/Host regressions. It depends on completed
`WP-CA-MERGE-027`. It does not change public RationalTime, JSON Schemas,
generated Contracts, artifact versions, SQLite schema, Project Host source,
permission or execution ownership, desktop/Worker behavior or external
dependencies. The existing reusable PR workflow remains the remote verification
authority for the completed WP28 head.

`WP-CA-MERGE-029` changes the existing Duration allocation reuse, Story
evaluation/approval, semantic `select_evidence` compiler and Product-only
material/Story generation boundaries. It also tightens the existing desktop
media projection without changing its public shape. It adds no editing
primitive: exact unit-speed selection into a neutral destination succeeds and
every implicit retime, incomplete Story, non-neutral destination, unsupported
operation promise, missing immutable authority or insufficient source path
fails before authoritative mutation. Product Story template identity changes
without changing Direction identity, JSON Schemas, SQLite, permission policy,
Timeline/RenderGraph/Worker behavior or dependencies.
