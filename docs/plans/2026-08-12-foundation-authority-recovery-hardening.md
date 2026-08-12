# Foundation Authority, Recovery and Single Edit Path Hardening

This ExecPlan is a living record for `WP-FND-001`. It follows `PLANS.md` and is self-contained. The package stays one continuous delivery and one PR even though implementation is divided into independently verifiable milestones.

## Purpose / Big Picture

AVE already has an accepted P0 media loop and bounded Render/Preset evidence, but several foundational authority paths are still transitional. This package makes time conversion exact and bounded, makes media identity content-based through relink and staleness, keeps one persistent Worker with explicit recovery rules, routes every editing producer through typed Edit IR and one Project Host commit use case, and makes migration/object/project recovery fail closed. Preview and Master continue to share one semantic graph; Master must resolve a currently verified Original.

The user-visible outcome is that moved or changed media, Worker crashes, cancelled FFmpeg tasks, concurrent edits, failed migrations, interrupted object publication and project reopen either recover deterministically or produce a durable explicit blocker without silently changing the Timeline.

## Progress

- [x] 2026-08-12 M0 read-only authority/code/Evidence audit completed.
- [x] 2026-08-12 Baseline `7087e290382df7928ec6d1212af9cc533a414020` recorded; frozen install, `pnpm run check` and `pnpm run acceptance:final:synthetic` passed.
- [x] 2026-08-12 `AVE_REAL_MEDIA_MANIFEST` recorded as unavailable; real-media acceptance is an external gate, not a synthetic substitute.
- [x] 2026-08-12 Registered and started `WP-FND-001` with `CAP-FND-001` and `ACC-028` through `ACC-033`.
- [x] 2026-08-12 M1 exact timebase and bounded ProxyMap implemented and focused tests passed.
- [x] 2026-08-12 M2 content identity, relink and stale propagation implemented and focused tests passed.
- [x] 2026-08-12 M3 persistent Worker and explicit Job recovery implemented and focused tests passed.
- [x] 2026-08-12 M4 single Edit IR and Project Host commit path implemented and focused tests passed.
- [x] 2026-08-12 M5 transactional storage/recovery and synthetic foundation acceptance implemented; real-media lane remains externally blocked by the unavailable manifest.
- [x] 2026-08-12 Immutable implemented-pending Evidence created and all repository gates passed; governed completion remains correctly blocked on real media.
- [x] 2026-08-12 Implementation committed and pushed; Draft PR #8 published for human review.
- [x] 2026-08-12 Authorized real-media Host path passed after content-verified relink; Preview, Master, QC and reopened project are retained outside the repository for human review.
- [x] 2026-08-12 User accepted the retained Foundation picture output.
- [x] 2026-08-12 Full registered tool suite and the existing 12.1-second real Basic Vlog multi-tool review flow passed on a fresh project.
- [ ] User review of the final all-tools Preview/Master, followed by COMPLETE Evidence and governed closure.

## Surprises & Discoveries

- The Python Worker runtime is already multi-job capable, but `createLocalWorkerJobPort()` starts, handshakes and stops one process for every submission.
- `ProxyMap` validation rejects overlap but accepts gaps; mapping silently extrapolates using the first or previous segment.
- Assembly compilation still constructs unknown media ranges at a fixed `30n` timescale.
- Existing Preset rendering validates persisted source facts more strictly than the general `renderTimeline` path; the general Master path still accepts caller-declared original paths.
- Migration files are replayed directly during open without a pre-migration backup or per-migration failure restoration.
- Governance tooling supports only `editing-execution-v1`, so a second programme would create an unsupported fork.
- `ACC-001` through `ACC-027` are occupied; the next contiguous group is `ACC-028` through `ACC-033`.
- Strict verified-Original rendering exposed old integration fixtures that forged Asset IDs; those fixtures now import real generated media before editing/rendering.
- Reopening a persisted ProxyMap exposed JSON BigInt strings such as `15360n`; the Host revival boundary now accepts canonical persisted BigInt strings instead of passing the suffix to `BigInt()`.
- The encoded Basic Vlog Python lane has a pre-existing signal-analysis flake in its ducking recovery sample; the Host half of that lane passes and no assertion was weakened. The final full suite will determine whether it reproduces.
- Independent final review found an unrelated `set_track_properties` lock bypass and a strict Worker envelope/result mismatch; both were fixed and covered before publication. Timeout without cancel acknowledgement now retires the Worker tree, and non-empty legacy databases are backed up even without a migration table.
- The first retained real-media attempt correctly blocked on `SILENCE`: the selected narrated source itself is silent from approximately 2.45 seconds through its end, and the Master preserved that interval. The final review run uses the separately attributed video-only excerpt, so audio absence is a source fact and QC records a non-blocking no-audio observation.
- The user correctly recalled that the licensed fixture set includes audio. A corrected v4 Original remuxes the accepted six-second picture with a six-second AAC excerpt from the same attributed CC BY 3.0 work; QC passes with no issues and no one-second silence interval, while user audio review remains pending.
- The legacy P0 direct-Worker real lane omitted probed `has_audio` facts and assumed every video input carried audio; a mixed audio/no-audio pair exposed an FFmpeg missing-stream failure. The test now binds the real probe fact and asserts that Worker-only Proxy candidates do not become Host authority. The formal all-tools Host lane separately proves three Original plus two typed Proxy locations after reopen.

## Decision Log

- 2026-08-12: Keep the work in `editing-execution-v1`; the existing documentation tools are single-programme and both latest Vlog and Preset packages are dependencies.
- 2026-08-12: `WP-FND-001` owns only `CAP-FND-001`; no blocked advanced editing capability changes status through this package.
- 2026-08-12: Preserve public compatibility facades, but route their mutations through the typed Foundation use case. New public interfaces contain no `any`.
- 2026-08-12: Treat Worker jobs as non-idempotent unless a task policy explicitly declares otherwise.
- 2026-08-12: If `AVE_REAL_MEDIA_MANIFEST` remains unavailable, finish all repository-verifiable work, create immutable pending/blocker Evidence, keep the WP active and CAP state `implemented_pending_real_media_acceptance`, and open a Draft PR without running `docs:complete`.
- 2026-08-12: After the user authorized the real run, reuse the previously attributed repository-external CC BY 3.0 fixture, retain a new review project outside Git, and keep acceptance pending until the user inspects the actual encoded output.

## Outcomes & Retrospective

Repository-verifiable implementation is complete for ACC-028 through ACC-032: exact time authority, content relink/staleness, persistent Worker recovery, unified Edit IR commit and transactional storage recovery all pass the focused synthetic lane. Migration 0020 adds immutable media facts/relations/dependencies; stable lifecycle and authority choices are recorded in ADR-0015/0016.

The authorized real-media machine lanes now pass Foundation import/relink authority, the P0 two-source/adapter path, and a fresh 12.1-second all-tools Basic Vlog project. The final review bundle combines real Original/Proxy media, two reframing modes, video and audio fades, caption, dialogue/music routing, ducking, loudness normalization, Preset provenance, Preview/Master, QC and reopen. User review of that final bundle remains pending, so no COMPLETE Evidence or `docs:complete` is permitted yet. The retained review project and media stay outside the repository.

## Context and Orientation

The authority chain is `AGENTS.md`, `PROJECT_GOAL.md`, product scope, stable architecture, the machine-readable programme, this package/specification, then generated current state. Generated `docs/current/*`, `docs/DOCUMENT_INDEX.md` and generated contract bindings are never hand-edited.

Relevant implementation boundaries are:

- `packages/core/timebase`: RationalTime, PTS/frame/sample conversion and ProxyMap.
- `packages/core/media-identity`: immutable content identity, typed locations and source relations.
- `packages/core/edit-ir`: typed intent/IR/preconditions/provenance and deterministic compilation.
- `packages/platform/worker-client` and `packages/platform/job-engine`: persistent process routing and recovery policy.
- `packages/platform/project-host`: sole state authority and the one edit/relink/render use-case boundary.
- `packages/platform/project-storage` and `database/migrations`: sole SQLite writer adapter, locks, backups, object publication and recovery.
- `apps/worker-host`: protocol-only stdout, task execution and FFmpeg process cancellation.

## Plan of Work

### M0 Baseline and acceptance contract

Record Git SHA/fingerprint, existing debts/Evidence and real-media availability. Register the package, focused commands and six acceptance records. Run `docs:start` only after dependency readiness.

### M1 Timebase and ProxyMap authority

Normalize rationals by GCD, expose exact arithmetic and explicit `exact`, `floor`, `ceil`, `nearest` conversion. Add PTS/frame/sample adapters. Require continuous ordered ProxyMap segments and reject gaps or out-of-range values. Remove Assembly's fixed 30fps assumption by resolving persisted stream timescale. Test VFR, NTSC rates, 44.1/48 kHz, one-frame boundaries, negatives and long-duration error.

### M2 Media identity and relink

Model Original and Proxy locations separately from asset identity. Worker returns streamed fingerprint/probe candidates; Host validates the expected content identity and persists the relation. Relink accepts moved identical content, rejects same-name different bytes, and marks dependent artifacts stale when Original content changes. Proxy cannot satisfy an Original requirement.

### M3 Persistent Worker and Job recovery

Introduce one persistent client lifecycle with one handshake, multiple routed jobs, progress, cancel, timeout and crash generations. Only task policies explicitly marked idempotent may auto-recover; non-idempotent recovery blocks. Keep the existing Worker port facade. Verify FFmpeg cancellation and protocol stdout/stderr separation. Record the stable decision in an ADR.

### M4 Single Edit IR path

Extend Edit IR with base version, actor, targets, semantic/protected references, preconditions, affected ranges, provenance, reason and expected effects. Add a typed Project Host `executeEdit` use case that resolves, checks, compiles, simulates, validates, creates CommitPlan and commits. Manual, Assembly, Rough Cut and Preset compatibility APIs translate into this path. Preserve undo/redo/replay/reopen and version conflicts.

### M5 Storage, recovery and acceptance

Back up before pending migrations, apply each migration transactionally and restore on failure. Harden lock identity, object directory durability/hash auditing and orphan handling. Recover RUNNING jobs according to policy and restore the last committed Timeline. Require persisted verified Original for Master. Add separately runnable synthetic and real Foundation acceptance lanes.

## Concrete Steps

1. Update the machine-readable programme and run `pnpm docs:start -- WP-FND-001`.
2. Implement one milestone at a time and run `pnpm run acceptance:foundation:synthetic` plus the relevant focused suites after each milestone.
3. Run the final command matrix from the work package.
4. If `AVE_REAL_MEDIA_MANIFEST` is available, run the formal Host path and create COMPLETE Evidence; otherwise create pending/blocker Evidence and keep the package active.
5. Reconcile matrices, generate docs, inspect all diffs/status, commit, push and open one Draft PR.

## Validation and Acceptance

`ACC-028` through `ACC-032` require executable synthetic assertions over exact time, relink/stale propagation, persistent Worker recovery, unified Edit IR and storage recovery. `ACC-033` requires an authorized external manifest and the formal Host import/relink/edit/Preview/Master/QC/bundle/reopen path. A missing manifest is blocked, never skipped or passed.

Final commands are those listed in `WP-FND-001`, including contracts, typecheck, architecture, Worker lint/typecheck, both Foundation lanes, final synthetic acceptance and the full `check` suite.

## Idempotence and Recovery

Content-addressed writes and migration backups are repeatable. Identical relink/edit/job retries return the same authoritative result; conflicting identities fail closed. Worker crash replay is limited to declared idempotent tasks. Migration fault injection restores the pre-migration database. A stopped run resumes from Git status, the active package, this Progress section and the latest immutable Evidence; it never edits generated current state directly.

## Artifacts and Notes

Baseline SHA: `7087e290382df7928ec6d1212af9cc533a414020`.

Baseline code fingerprint: `83e3fc15fa8c3e1d70bc2028fed99b30cd17ef7430ed87bf9f40c0035ca2633f`.

Baseline real-media manifest: unavailable in the 2026-08-12 Windows environment. Existing historical media Evidence is scope context only and is not reused as Foundation acceptance.

## Interfaces and Dependencies

The package depends on `WP-VLOG-002` and `WP-PRESET-002`. Contracts remain the cross-language authority, Project Host remains the sole SQLite writer, Worker remains project-state blind, and Timeline changes remain Command/Commit based. No new production dependency is planned.
