# RenderGraph v2 Hardening ExecPlan

## Purpose / Big Picture

Replace PR #4 with a reviewable hardening branch in which a committed Timeline cannot lose semantics silently between RenderGraph, the Host execution plan, Worker compilation, output persistence, and recovery. Preview and Master share one semantic graph while retaining distinct target and source constraints.

## Progress

- [x] Created `codex/rendergraph-v2-hardening` from `origin/codex/rendergraph-v2-adapters`.
- [x] Read the full corrective work order and current authority chain.
- [x] Confirmed the existing `tested` CAP/ACC status exceeds observable evidence.
- [x] Complete the PR-review and repository implementation audit.
- [x] Correct Timeline validation, automation, TimeMap, and affected ranges at the domain layer.
- [x] Correct timeline-aware video composition, track state, audio mixing, and unsupported blockers.
- [x] Make ExecutionPlan, resolver decisions, capability snapshot, hashes, and cache inputs an enforced cross-language contract.
- [x] Implement atomic and idempotent Render Bundle persistence and failure recovery.
- [x] Add media, property, contract, integration, and failure-injection tests.
- [x] Reconcile CAP/ACC state, ADRs, Debt, and specifications with actual support.
- [x] Create EVD-20260802-WP-RENDER-002 from the passing pre-completion command matrix.
- [x] Complete/sync/check the work package and pass the full `pnpm run check` repository matrix.
- [x] Push, open replacement PR #5, comment on PR #4, and observe all initial remote checks pass.
- [x] Validate and fix all four additional Codex review findings on ellipse geometry, Sequence timebase, cross-language numeric canonicalization and effect-blocker persistence.
- [x] Rerun the complete local matrix for `ad2ce06`, then add Host/Worker ellipse blocker regressions in `ba8a6dd`.
- [x] Rerun the complete local matrix for `ba8a6dd` and refresh Evidence/code fingerprint.
- [x] Record the remote handoff state known at package completion; live PR and CI status is intentionally not treated as durable repository state.

## Surprises & Discoveries

- PR #4 persisted execution plans after Worker execution, but the submitted Worker request contains only the graph and output directory.
- The programme marks every implemented v1 capability and ACC-001 through ACC-015 as tested even where its notes explicitly deny complete execution evidence.
- Existing completion tooling promotes every capability and acceptance owned by a package to tested; this must not be used to overclaim partially blocked scope.
- `pnpm run docs:start -- WP-RENDER-002` passes a literal `--` to the current script under pnpm 11; direct invocation was required to establish the active package. The script contract needs a regression fix before completion.
- All 22 PR #4 inline review threads remain unresolved and non-outdated even though its checks are green; every substantive finding is valid against the PR head.
- The existing FFmpeg compiler globally concatenated audio and omitted timeline gaps; a decimal formatter also converted integer millisecond delays such as 2000 to 2. Media probes exposed both defects.
- No authorized real-media fixture exists in the repository and `AVE_REAL_MEDIA_PATHS` is unset. The final real-media suite must remain blocked rather than substituting generated media.
- A post-open Codex review found four valid gaps: ellipse masks were compiled as rectangles, the graph used the first source stream's timescale when a root Sequence timebase existed, Python reserialization could spell exponent numbers differently from JavaScript, and unregistered effects threw before blocker persistence. All required another fail-closed correction cycle.

## Decision Log

- 2026-08-02: Use WP-RENDER-002 as the sole active correction owner; WP-PRESET-001 remains pending.
- 2026-08-02: Preserve the full v1 scope and prefer explicit blockers over shallow implementations for nested, compound, adjustment, automation-render, and tracked-mask semantics that cannot be completely executed and verified in this package.
- 2026-08-02: Treat generated synthetic fixtures only as synthetic evidence; real-media acceptance remains separately qualified unless an authorized repository fixture is discovered and exercised.
- 2026-08-02: ExecutionPlan is a mandatory Host-to-Worker authorization contract; Worker recomputes all semantic/cache/plan identities and never resolves around a missing plan.
- 2026-08-02: Completed and blocked render attempts are persisted as cardinality-checked atomic bundles with content-addressed outputs and idempotent identity.
- 2026-08-02: Downgrade every v1 CAP/ACC claim that still depends on unimplemented semantics to blocked, while retaining tested status only for RenderGraph execution infrastructure and ACC-012 through ACC-015.
- 2026-08-02: Bind Worker verification to structural equality plus hashes of the exact Host canonical bytes, avoiding a second numeric text authority while retaining independent semantic/cache reconstruction and tamper rejection.

## Outcomes & Retrospective

The corrected path now fails closed across Timeline validation, resolver coverage, Host-to-Worker plan verification, encoded FFmpeg semantics and atomic persistence. The original synthetic media, protocol, property and fault-injection matrix passed, and the full repository `pnpm run check` passed again after all four review fixes through `ba8a6dd` with code fingerprint `64437ea9...6185`. At the recorded handoff, replacement PR #5 fully contained PR #4 and its initial Acceptance, Architecture, CI, Contracts, Golden/Integration, Security, Worker and CodeRabbit statuses had passed; PR #4 had received a supersession comment. Those statements are a historical snapshot, not the authority for current GitHub PR or CI state. The work does not claim the full editing-execution-v1 feature surface: CAP-TL through CAP-AUDIO and ACC-001 through ACC-011 remain blocked where their broad scenarios exceed the executed subset. Real-media final acceptance also remains blocked because no authorized repository fixture or configured local path was available.

## Context and Orientation

The authoritative flow is committed Timeline in `packages/core/timeline-core` to `packages/core/render-graph`, resolved by Project Host, executed through the schema-bound Worker client and `apps/worker-host`, and atomically persisted by `packages/platform/project-storage`. Project Host remains the sole SQLite writer. Worker never opens `project.sqlite`. Contracts under `contracts/schemas` are cross-language authority; generated outputs are never hand-edited.

## Plan of Work

1. Turn all PR #4 review findings and the work-order stop conditions into a source-and-test checklist.
2. Repair pure Timeline algorithms and validation first so invalid or unsupported semantics cannot enter rendering.
3. Build a target-neutral semantic graph that retains placement, track state, source identity, and explicit resolver decisions.
4. Version and generate the Host-to-Worker request/result protocol, then make Worker recompute and validate hashes, cache keys, adapter support, and decisions before compiling.
5. Compile timeline-aware video and audio with media-level duration, frame, pixel, and energy assertions.
6. Register one Render Bundle using object staging plus one database transaction; inject failures at every required boundary and prove retry/reopen behavior.
7. Reconcile specifications, capabilities, acceptance, active Debt, ADRs, Evidence, and generated current files from actual results.
8. Commit logical slices, run all repository and CI-equivalent checks, create the replacement PR, and wait for its checks without merging.

## Concrete Steps

Use the commands declared in `package.json` and `.github/workflows/*.yml`. The minimum matrix is the work order's pnpm command list plus generated contract tests, Worker protocol/media tests, render-bundle failure injection, deterministic hash properties, and `pnpm run check`. Record exact observed results in the new Evidence file; never infer success from script existence.

## Validation and Acceptance

Acceptance requires real FFmpeg/ffprobe output for TimeMap A/V duration, delayed overlay frame samples, multitrack audio energy and duration, Preview/Master semantic equality, Worker plan-tamper rejection, canonical hash properties, transaction rollback, object cleanup, idempotent retry, and close/reopen bundle recovery. Unsupported v1 semantics must fail before execution and persist their diagnostic. Real-media acceptance is claimed only if an authorized non-synthetic fixture is found and executed.

## Idempotence and Recovery

The branch is additive over PR #4 and can be rebased onto its untouched head. Contract generation and docs sync must be repeatable. Render Bundle retries reuse a stable idempotency key; same identity with different content conflicts. On interruption, resume from this Progress list, `git status`, the active WP, and the latest recorded validation results. No PR is merged or closed automatically.

## Artifacts and Notes

Expected durable artifacts include WP-RENDER-002, generated contract bindings, two ADRs for the Worker execution contract and Render Bundle persistence, active Debt for deliberately blocked v1 semantics, one correction Evidence record, media probe/frame/audio reports, and the replacement PR body.

## Interfaces and Dependencies

JSON Schema Draft 2020-12 is the protocol source. TypeScript and Python bindings are generated. FFmpeg/ffprobe remain Worker-only runtime dependencies. SQLite and object-store writes remain Project Host/Storage-only. No new production dependency or security boundary is authorized by this plan.
