# Basic Vlog Toolkit ExecPlan

## Purpose / Big Picture

Complete four practical Vlog editing slices on the latest main baseline: static landscape-to-portrait reframe, deterministic Master loudness normalization, constrained Dialogue/Music ducking, and single-clip video/audio boundary fades. The result must use the existing Timeline, RenderGraph V2, ExecutionPlan, Project Host, Worker and atomic Render Bundle path and must not imply that the broader professional editing families are complete.

## Context and Orientation

The repository baseline is commit `1db59b5`. Project Host owns project state and SQLite writes. Timeline changes are versioned Commands and CommitPlans using RationalTime. `packages/core/render-graph` compiles the committed Timeline into target-neutral semantics and target-specific Preview/Master plans. `apps/worker-host` is the only FFmpeg execution boundary. Existing broad capability states remain blocked except CAP-RENDER-001; this package owns only ACC-016 through ACC-019.

## Plan of Work

1. Reconcile specifications and introduce versioned JSON Schemas with valid and invalid examples.
2. Extend Timeline validation and Commands with bounded reframe, mastering, ducking and clip-fade settings.
3. Compile those settings into explicit RenderGraph nodes whose parameters participate in semantic and cache identity.
4. Add Project Host preflight validation, structured blockers, persistence/reopen and failure atomicity coverage.
5. Extend the existing Worker adapter with static canvas composition, constrained sidechain routing, clip-local fades and deterministic Master normalization/QC metrics.
6. Add focused property, contract, integration and real FFmpeg synthetic-media assertions.
7. Run focused and complete validation, independently review the diff, reconcile matrices/debt, add immutable Evidence and complete the work package.

## Concrete Steps

- Start `WP-VLOG-001` before application source edits.
- Run `pnpm run contracts:generate`, then contract check, compatibility and generated-clean validation.
- Run focused Timeline, RenderGraph, Project Host, Worker and package acceptance commands after each slice.
- Run `pnpm run acceptance:final:synthetic` and `pnpm run check` before Evidence.
- Create `EVD-20260804-WP-VLOG-001`, attach the final code fingerprint to current evidence references, complete the work package, sync generated docs and re-run docs checks.
- Create logical commits for reframe, loudness, ducking, fades and final Evidence without pushing or opening/merging a PR.

## Validation and Acceptance

- ACC-016: encoded output is 9:16; crop_fill, contain and blurred_background differ observably; focal point shifts the crop; Preview and Master share composition semantics; Master uses original.
- ACC-017: input and output loudness are measured; Master reaches configured LUFS tolerance without exceeding true peak; missing audio is explicit and deterministic.
- ACC-018: synthetic Music level falls during Dialogue, recovers smoothly afterward, preserves non-dialogue level, duration and A/V sync; missing roles and invalid combinations are deterministic.
- ACC-019: sampled frames and audio windows prove fade-in/out ramps and exact duration; excessive duration blocks before publication; undo/redo/reopen preserve settings.
- Every setting changes the target-neutral semantic identity and target-specific execution cache identity; a failure leaves the prior Timeline and published bundles unchanged.

## Idempotence and Recovery

Contract generation and docs synchronization are repeatable. Tests use generated temporary synthetic media and do not commit user media. Failed Timeline Commands do not advance version. Failed renders do not publish partial bundles. A resumed run starts from the Progress section and re-runs the nearest focused test before continuing. Rollback is ordinary Git reversion of the package commits; no database migration is planned unless repository evidence proves one is required.

## Artifacts and Notes

Expected artifacts include versioned contracts and generated types, Timeline/RenderGraph/Host/Worker implementation, focused tests, package script, specification and programme reconciliation, and `docs/evidence/runs/EVD-20260804-WP-VLOG-001.md`. No user media will be copied or committed.

## Interfaces and Dependencies

The implementation depends on FFmpeg/ffprobe 7.1.1 available on the current Windows machine, existing JSON Schema generation, Project Host Worker submission, RenderGraph V2 canonical identity, Timeline snapshot persistence and atomic Render Bundle registration. No new production dependency is planned.

## Progress

- 2026-08-04: Confirmed a clean latest-main baseline at `1db59b5`, created `codex/basic-vlog-toolkit`, read the authority chain and found existing main has generated-current drift while contract check and TypeScript typecheck pass.
- 2026-08-04: Registered WP-VLOG-001 and focused acceptance IDs; source implementation pending.
- 2026-08-04: Added 46-schema contract coverage and generated 92 TypeScript/Python artifacts, including a thin basic_vertical_vlog preset-to-command compiler.
- 2026-08-04: Implemented Timeline/RenderGraph/Host/Worker semantics, persistence, undo/redo, semantic/cache identity and defensive validation for all four slices.
- 2026-08-04: Real FFmpeg synthetic acceptance proved reframe pixels, measured Master loudness/true peak, ducking attenuation/recovery and A/V fade ramps; focused contract, type, Worker, QC and Host checks pass.
- 2026-08-04: Added precise QC knowledge of declared boundary-fade black intervals so legal fades do not mask internal unplanned black frames or trigger false blockers.

## Surprises & Discoveries

- `STATE.yaml` pointed to pending WP-PRESET-001 even though no manifest package was active; a separate package is required because WP-PRESET-001 forbids Worker changes.
- The merged main baseline reports generated-current document drift; this package will reconcile it through the governed sync path and record it as pre-existing evidence.
- Generated-current drift was CRLF-only on Windows; the docs verifier now compares normalized generated text and its regression test passes without weakening fingerprint checks.

## Decision Log

- Use focused ACC-016 through ACC-019 so bounded Vlog slices can become tested without promoting broad ACC-002, ACC-003 or ACC-010 beyond their evidence.
- Model fades as clip-local effects/settings, never as two-input Transition nodes.
- Reuse audio roles and the existing FFmpeg adapter; do not introduce a general DAW routing system or second render pipeline.

## Outcomes & Retrospective

The bounded toolkit is implemented end to end without a second render path or new production dependency. Focused encoded-media tests pass and broad capability blockers remain explicit. Final repository-wide validation and immutable Evidence are the remaining closeout steps.
