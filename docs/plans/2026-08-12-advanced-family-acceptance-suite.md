# Advanced Family Real-Media Acceptance Suite

This ExecPlan is the living delivery record for `WP-ADV-002`.

## Purpose / Big Picture

Produce the original ACC-001 through ACC-011 acceptance suite as eleven separate real encoded videos. The user must be able to open one folder, watch each case, and know exactly which behavior and failure boundary is being demonstrated. A standalone visual imitation is insufficient: every claimed operation must travel through committed Timeline, RenderGraph, Project Host and Worker execution.

## Progress

- [x] 2026-08-12 Confirmed the prior accepted combined showcase intentionally did not close ACC-001 through ACC-011.
- [x] 2026-08-12 Enumerated the exact scenario, fixture, observation and failure assertion for all eleven cases.
- [x] Register and start `WP-ADV-002`.
- [x] Implement the bounded executable semantics and fail-closed tests used by the retained suite.
- [x] Generate and machine-verify eleven retained real-media Masters in one folder.
- [x] Run focused and aggregate repository gates and write immutable PRECHECK Evidence.
- [ ] Deliver the folder for user visual/audio acceptance.

## Surprises & Discoveries

- The authorized external fixture directory contains the original AV excerpt, a second visual excerpt, narration and music derivatives, so the suite can exercise multi-source and multi-track cases without adding unlicensed media.
- The existing accepted showcase executes bounded subsets, while nested/compound/adjustment rendering, subject matte, graphic scenes, the wider transition family and full color transforms remain explicit blockers.

## Decision Log

- 2026-08-12: Use eleven independent outputs rather than a montage so each original acceptance is inspectable without ambiguity.
- 2026-08-12: Respect the user's instruction not to perform subjective viewing; machine validation is limited to contracts, encoded stream facts, hashes, objective frame/audio measurements and persistence.
- 2026-08-12: Store retained media outside Git and record only hashes and attribution in Evidence.

## Outcomes & Retrospective

Eleven independent retained Masters are machine-verified. Human review remains pending, and the explicitly listed bounded representations do not erase broader catalogue debt.

## Context and Orientation

The acceptance authority is `docs/program/editing-execution-v1/ACCEPTANCE_MATRIX.yaml`. Timeline semantics live in `packages/core/timeline-core`, graph resolution in `packages/core/render-graph`, Host authority in `packages/platform/project-host`, and execution in `apps/worker-host/src/worker_host/render/graph_compiler.py`. The real driver is under `tests/integration/` and writes only to the explicitly supplied external review root.

## Plan of Work

### M1 Formal semantics and negative gates

Add the narrow typed data and resolver/compiler routes required by the eleven stated scenarios. Each new public interface avoids `any`. Unsupported variants retain explicit blocker codes.

### M2 Per-family real projects

Create one project and committed Timeline per ACC. Import authorized local media through Project Host, render Preview/Master with identical target-neutral semantics, persist results and reopen.

### M3 Objective verification and handoff

Probe every Master, assert duration/streams/operation markers and family-specific measurements, hash all artifacts, write one review index, then execute full repository gates and PRECHECK Evidence.

## Concrete Steps

Run focused Timeline, RenderGraph and Worker tests while implementing. Run the new advanced-family real acceptance command with `AVE_REAL_MEDIA_MANIFEST` and a new external review root. Then run `pnpm run check`, documentation gates and `git diff --check`.

## Validation and Acceptance

Machine acceptance requires eleven successfully encoded Masters, matching Preview/Master semantic hashes, verified Original sources, reopen persistence and every specified negative case. Subjective picture, audio and pacing acceptance belongs exclusively to the user.

## Idempotence and Recovery

Each invocation requires a fresh output directory and never overwrites a retained review suite. A failed case cannot publish a successful bundle or mutate its prior Timeline version.

## Artifacts and Notes

Expected external artifacts are `ACC-001.mp4` through `ACC-011.mp4`, `INDEX.md`, `acceptance-report.json` and per-case machine reports.

## Interfaces and Dependencies

No new backend or network service is introduced. The work depends on the accepted Foundation authority path and the licensed media already documented by the external manifest.
