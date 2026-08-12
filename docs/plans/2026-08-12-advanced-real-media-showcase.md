# Advanced Real-Media Showcase

This ExecPlan is the living delivery record for `WP-ADV-001`. It follows `PLANS.md` and remains one continuous implementation, validation, real render and human-review delivery.

## Purpose / Big Picture

The user has already accepted AVE's basic Vlog picture and audio result. The requested outcome is now a genuinely advanced encoded edit, not another Foundation or basic-tool acceptance. AVE must execute an intentionally visible combination of advanced Timeline semantics through the formal Project Host, RenderGraph and Worker path, retain Preview/Master and QC outside the repository, and give the user the actual outputs for subjective acceptance.

The review cut must visibly exercise animated transform/keyframes, layered composition, time remap, two-input transitions, color work, masks, animated word/graphic text and a multi-track audio mix. Machine tests prove determinism, persistence, fail-closed behavior and measurable media facts; only the user decides whether the creative result is accepted.

## Progress

- [x] 2026-08-12 Confirmed the prior Foundation delivery cannot satisfy this request: advanced families remain explicit RenderGraph blockers.
- [x] 2026-08-12 Read the v1 advanced specifications, ACC-001 through ACC-011, current debts and current Host/Worker implementation.
- [x] 2026-08-12 Registered and started `WP-ADV-001` with combined human-review acceptance `ACC-034`.
- [x] 2026-08-12 Implemented the bounded advanced execution slice through the formal authority path.
- [x] 2026-08-12 Focused advanced synthetic, authorized real-media and complete aggregate repository validation passed.
- [x] 2026-08-12 Retained Preview/Master, QC, contact sheet and a plain-language edit sheet outside the repository for human review.
- [x] 2026-08-12 User review found the subtitle too low and the 5.5-second cut too short; revised the formal edit to an approximately 10.5-second review cut with captions at 68% frame height and two-second word highlights.
- [x] 2026-08-12 User review found overlapping base/highlight captions and duplicated source audio. Replaced highlight composition with mutually exclusive windows and duplicated Dialogue/Music buses with one continuous preserve-pitch audio clip, boundary fades and Master normalization.
- [ ] Publish one Draft PR; keep creative acceptance pending until the user reviews the encoded output.

## Surprises & Discoveries

- The Timeline domain already persists most advanced objects and the Worker already contains partial static color, rectangle mask, word-caption and time-map compilation.
- RenderGraph deliberately inserts blocker nodes for all automation, every transition, tracked/ellipse/feather masks, nested/compound/adjustment clips and several transform semantics.
- The earlier all-tools real run was a Foundation authority exercise using only the bounded basic Vlog slice; its name did not mean all v1 advanced capabilities executed.
- Atomic CommitPlan simulation previously validated every intermediate command, making an overlapping clip plus its transition impossible to express in any order. Batch simulation now validates the final state while the one-command API remains strict.
- The Windows FFmpeg 7.1.1 `xfade` path requires both inputs to be rebuilt to a common CFR/AVTB after time remap; matching timestamps alone are insufficient.
- FFmpeg crop supports per-frame x/y expressions but not animated width/height. Tracked rectangle position executes; animated tracking size remains an explicit Worker blocker.
- Failed real runs now surface their Worker diagnostic through Project Host instead of being misreported as a missing render output.

## Decision Log

- 2026-08-12: Use one new governed work package in the existing `editing-execution-v1` programme; the repository tooling remains single-programme.
- 2026-08-12: Treat the user's message as explicit authorization to widen beyond the Foundation non-goals and implement an advanced real-media showcase.
- 2026-08-12: Use the formal Host -> committed Timeline -> RenderGraph -> Worker route. A standalone FFmpeg demo cannot count as product capability.
- 2026-08-12: Do not claim every variant in the broad v1 catalogue from one showcase. Capability/acceptance status changes require their complete original assertions; the new human-review acceptance is separately tracked.
- 2026-08-12: Preserve legacy adjacent transition projects as valid persisted Timelines but keep them resolver-blocked; only explicit-overlap Cross Dissolve with exact duration/handles executes.
- 2026-08-12: Retain the external v9 review project as the final human-review bundle. Earlier v1-v8 attempts are local diagnostics, not Evidence or acceptance artifacts.
- 2026-08-12: Treat v9 as superseded by user feedback. Retain external revision v12 as the final longer safe-area-caption review bundle without overwriting prior outputs; v10-v11 were local revision diagnostics.
- 2026-08-12: Treat v12 as superseded by the overlap feedback. Retain external revision v19 as the next human-review bundle; v13-v18 are failed or superseded local diagnostics and are not acceptance artifacts.
- 2026-08-12: Do not claim Dialogue/Music ducking for this review because the authorized source contains one already-mixed audio stream. Use one continuous audio producer and document the limitation explicitly in the timecoded review sheet.

## Outcomes & Retrospective

The bounded advanced execution slice and encoded review artifact are implemented and machine-verified. The retained Master executes the declared advanced operations through the formal authority path, passes QC and survives reopen. The package remains active solely for the user's creative review; broad v1 variants not exercised here remain explicit blockers.

## Context and Orientation

The authoritative advanced scope is `docs/product/EDITING_CAPABILITY_SCOPE_V1.md`; executable semantics are split across `docs/specifications/editing-execution-v1/`. Timeline objects live in `packages/core/timeline-core`, RenderGraph resolution in `packages/core/render-graph`, Host authority in `packages/platform/project-host`, and FFmpeg execution in `apps/worker-host/src/worker_host/render/graph_compiler.py`.

The existing authorized media manifest and retained media stay outside Git. The final review project will also remain outside the repository. Evidence records only hashes, attribution, semantic facts and repository-relative commands.

## Plan of Work

### M0 Governed acceptance contract

Register `WP-ADV-001`, add `ACC-034` for the combined real-media advanced review, retain the original ACC-001 through ACC-011 as the per-family truth, run `docs:start`, and record the current fingerprint/baseline.

### M1 Advanced semantic execution

Compile typed automation into deterministic transform/opacity expressions, implement explicit transition handles and two-input transition execution, add a bounded variable speed-ramp route with audio synchronization, execute declared color/mask/text/graphic semantics, and extend audio routing/envelopes. Unsupported variants remain structured blockers.

### M2 Authority and persistence

Commit the complete edit through Edit IR/CommitPlan, preserve all advanced semantic objects across reopen, require the same semantic graph for Preview/Master, use verified Originals for Master, and prove failed invalid curves/handles/masks/assets do not mutate Timeline.

### M3 Encoded acceptance

Create focused synthetic fixtures with pixel, timing, audio and metadata assertions. Then use authorized repository-external real media to create a coherent advanced vertical Vlog review cut. Probe streams, duration, loudness/true peak, transition timing and representative frames; persist QC and reopen the project.

### M4 Human handoff

Retain the encoded Preview/Master, review JSON and edit sheet outside Git. Create immutable PRECHECK Evidence and a Draft PR. The work package remains active until the user accepts or rejects the creative output; rejection produces a new render and Evidence rather than rewriting history.

## Concrete Steps

Run focused Timeline/RenderGraph/Worker tests during each slice, then `pnpm run acceptance:advanced:synthetic`, `pnpm run acceptance:advanced:real`, `pnpm run check`, documentation gates and `git diff --check`. Inspect the final encoded files with FFprobe and frame/audio measurements.

## Validation and Acceptance

Machine acceptance requires actual encoded output, Preview/Master semantic-hash equality, Master verified-Original sources, reopen persistence, QC pass, visible/measurable execution of every declared showcase operation, and explicit blockers with zero Timeline mutation for invalid inputs. Human acceptance is the user's visual/audio judgment of the retained Master.

## Idempotence and Recovery

The review root is newly created for each retained run; an existing directory is never overwritten. Render registration remains idempotent by semantic and plan identity. A failed Worker/render attempt cannot publish a successful bundle. Temporary outputs are outside Git and can be removed independently of project authority.

## Artifacts and Notes

Expected external artifacts: `preview.mp4`, `master.mp4`, `ADVANCED-REVIEW.json`, `EDIT-SHEET.md`, QC and representative frame images. Evidence stores hashes rather than machine-local paths.

## Interfaces and Dependencies

No new rendering backend is introduced. The work depends on the accepted Foundation, Preset and bounded Vlog packages and retains Project Host, Contracts, RationalTime, verified Original and Worker protocol invariants.
