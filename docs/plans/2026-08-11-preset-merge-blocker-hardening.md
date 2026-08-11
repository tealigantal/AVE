# Preset merge-blocker hardening ExecPlan

## Purpose / Big Picture

Repair five independently confirmed merge blockers in PR #7 without widening the Preset product surface: prevent compiler commands from exercising undeclared semantic authority, make JSON Schema plus generated bindings the contract source at the Project Host boundary, stop synchronous whole-project media hashing, validate candidate Preset renders from persisted authoritative media identity, and prevent atomic artifact metadata from overriding storage identity. A failed validation must leave the Timeline unchanged and preserve an accurate blocker record when the input has crossed the contract boundary.

## Context and Orientation

`WP-PRESET-001` is completed historically, but its accepted claims were invalidated by a later adversarial review. `STATE.yaml` has no active work package and the governance script cannot restart a completed package, so this follow-up uses `WP-PRESET-002`. The repair depends on `WP-PRESET-001` and retains its data-only, Project Host-authoritative architecture. Old Evidence is immutable and remains historical; this work produces a new Evidence record tied to the repaired fingerprint.

The relevant runtime path is `contracts/schemas/preset/**` -> generated TypeScript/Python bindings -> `packages/platform/contract-runtime` -> `packages/core/preset-core` -> `packages/platform/project-host` -> `packages/platform/project-storage`. RenderGraph remains derived from the candidate Timeline. `apps/worker-host/**` is forbidden for this package: existing import-time Worker fingerprints and persisted asset-location verification are consumed, while changed or insufficient media identity fails closed for a later Worker verification job.

## Plan of Work

1. Add and start `WP-PRESET-002`, mark CAP-PRESET-001 blocked during repair, and record this plan as the active recovery path.
2. Repair generated contract bindings and add AJV validators in Contract Runtime. Project Host validates definitions and Creative Skill input before business resolution; Preset Core imports generated contract types and retains only cross-field/business validation that JSON Schema cannot express.
3. Add an exhaustive Timeline Command-to-semantic-capability classifier. Compile each selection before authorization and reject every actual capability not declared by that exact definition with `PRESET_COMPILER_UNDECLARED_EFFECT`; blocked output contains no Commands.
4. Replace Project Host whole-project `readFileSync` hashing with declared-asset-only checks against persisted Worker fingerprint identity, verification timestamp and stat metadata. Missing, changed or stale identity blocks and does not trigger synchronous media reads.
5. Resolve candidate RenderSourceRefs from persisted original/proxy locations and probe facts. No fabricated original, audio flag or identity is allowed. Missing Original, proxy-only without mapping, target-divergent audio state, and no usable audio after enabled/muted/solo/routing selection produce accurate blockers. Application records retain candidate source/plan identities; subsequent formal output manifests link those identities to the actual render sources and Preview/Master plans.
6. Reject reserved atomic artifact metadata keys before staging, retain authoritative values after metadata merging, and build event references from inserted rows.
7. Add the five requested negative regressions plus authoritative source cases and contract/schema acceptance-set parity tests.
8. Run focused gates, full checks, synthetic acceptance, licensed local real-media review and dependency audit. Create a new immutable Evidence record, reconcile matrices, complete the package, and request independent review before moving PR #7 from Draft to Ready.

## Concrete Steps

- `pnpm docs:start -- WP-PRESET-002`
- `pnpm run contracts:generate`
- Focused: `pnpm run contracts:check`, `pnpm run contracts:compatibility`, `pnpm run contracts:clean`, `pnpm run timeline-core:test`, `pnpm run render-graph:test`, `pnpm run commit-plan:test`, `pnpm run timeline:host:test`, `pnpm run storage:check`
- Recovery: `pnpm run undo-redo:test`, `pnpm run project-recovery:test`
- Repository: `pnpm run typecheck`, `pnpm run architecture`, `pnpm run check`, `pnpm run acceptance:final:synthetic`
- Real media: `pnpm run acceptance:basic-vlog:real-review`
- Security: `pnpm audit --audit-level high`
- Closure: create `EVD-20260811-WP-PRESET-002-COMPLETE`, reconcile machine-readable matrices and fingerprint, then `pnpm docs:complete -- WP-PRESET-002 EVD-20260811-WP-PRESET-002-COMPLETE`, `pnpm docs:sync`, `pnpm docs:check`

## Validation and Acceptance

- A trusted project-local definition using `timeline.basic_vlog.v1` while declaring only `timeline.static_reframe` returns `PRESET_COMPILER_UNDECLARED_EFFECT`, emits no Commands and does not advance Timeline state.
- Applying an asset-free Transform Preset in a project containing many unrelated locations performs no file content reads and does not inspect unrelated paths.
- Non-string or empty binding values, illegal IDs, non-finite numbers, illegal enums and unknown fields are rejected by the same Contract Runtime acceptance set as the Schemas.
- No-audio Original, audio excluded by mute/solo, divergent Proxy audio, missing Original and proxy-only media yield source-accurate blockers; a valid persisted Original produces candidate Preview/Master identities without fabricated source facts, and a later formal render persists an application-to-actual-plan link.
- Reserved atomic metadata identity fields are rejected before commit; no Timeline version, object ref or commit event is published.
- Existing success, migration, idempotency, undo/redo, reopen, Preview/Master and real-media behavior remains valid.

## Idempotence and Recovery

Contract generation and documentation synchronization are repeatable. Work-package start is idempotent only while the package is ready/active. Test projects use temporary directories and clean them after assertions. Failed Preset resolution and render linkage create no Timeline mutation. Failed storage descriptor validation happens before artifact staging. Resume from the Progress section and rerun the narrowest failing command. Rollback is ordinary Git reversion; no destructive database migration is planned.

## Artifacts and Notes

Expected artifacts are the new work package, this ExecPlan, schema-generated binding/runtime validation repairs, source and storage fixes, focused regressions, reconciled architecture/specification text, a new immutable Evidence record, and updated PR review instructions. Local real-media paths and bytes remain outside Git.

## Interfaces and Dependencies

- JSON Schema remains the cross-language protocol source; `contracts/generated/**` is generated only.
- Preset Core remains pure and receives contract-valid data; it owns semantic dependency, compiler authority and policy rules.
- Project Host owns media identity consumption, candidate RenderGraph validation and Timeline commit decisions.
- Project Storage owns authoritative object identity and atomic publication.
- No production dependency, schema database migration or Worker protocol change is planned.

## Progress

- 2026-08-11: Confirmed all five findings against HEAD `00744cd`; issues 4 and 5 were independently reproduced despite green existing tests.
- 2026-08-11: Classified the repair as important-project work and established `WP-PRESET-002` because completed `WP-PRESET-001` cannot be restarted.
- 2026-08-11: Implemented Schema-derived types and Host AJV validation, command-derived per-selection authority, declared-asset persisted identity checks, real candidate source/plan validation and reserved atomic metadata rejection.
- 2026-08-11: Focused type, contract, Preset, Host, storage, RenderGraph, CommitPlan, recovery and architecture gates passed; full repository, synthetic, real-media, audit and independent review remain before closure.
- 2026-08-11: The full gate exposed a packaged Electron layout failure when Contract Runtime read repository Schema files and then a missing runtime AJV dependency. Contract generation now emits dependency-free AJV standalone validators; Electron runtime smoke and focused Preset/Host regressions pass.
- 2026-08-11: The repaired fingerprint passed the complete repository check, synthetic final acceptance, 12.1-second licensed real-media review with actual source/plan linkage, and high-severity dependency audit. Independent read-only completion review is in progress.
- 2026-08-11: Independent review found container Commands could hide nested effects, audio availability did not mirror RenderGraph solo/mute rules, Proxy audio probes could diverge, and candidate plans were not linked to formal render plans. Compiler output is now a five-command primitive union; audio checks share active-track semantics and reject divergent probe facts; formal output manifests now verify and persist candidate-to-actual application provenance. Final gates and renewed independent review remain pending.
- 2026-08-11: Renewed render review found duplicate per-clip routing could let Host infer roles that RenderGraph ignores. Host role derivation now uses RenderGraph's first-routing-per-clip rule and the adversarial duplicate-routing application blocks without Timeline mutation.
- 2026-08-11: Final source-link review found duplicate `asset_ref` inputs could affect recorded identity without affecting the Map-built plan. Formal render now rejects duplicates before Worker work and uses one unique source Map for graph, provenance, QC and result references.

## Surprises & Discoveries

- Existing generated Preset TypeScript bindings reference undefined local `$defs` names, so merely importing them would fail typecheck.
- Existing Preset application succeeds without any registered source because validation fabricates an Original and `has_audio: true`.
- Atomic metadata can make the event reference an object ID that was never inserted.

## Decision Log

- Preserve old Evidence as historical and create a new repair Evidence.
- Fail closed on insufficient persisted media identity; do not synchronously hash media in Project Host.
- Keep Worker code out of this repair. Media changes require the existing Worker fingerprint boundary before a later application can succeed.
- Preserve schema v1 compatibility by adding new render-validation identity fields as optional protocol fields while requiring them for newly applied Host records.
- Package generated AJV standalone validators with Contract Runtime so Schema acceptance survives Electron distribution without runtime repository paths or a production AJV dependency.
- Treat Draft-to-Ready as a review transition, never merge authorization.

## Outcomes & Retrospective

All five reported blockers are repaired under fingerprint `83e3fc15fa8c3e1d70bc2028fed99b30cd17ef7430ed87bf9f40c0035ca2633f`. The repair also closed adversarial follow-ups found by independent review: container Command smuggling, solo/mute/routing audio mismatches, divergent Original/Proxy audio, caller-forged formal-render audio, missing candidate-to-actual render provenance, duplicate routing and duplicate source identities. The complete repository check, focused Edit IR, synthetic acceptance, high-severity audit and licensed real-media v11 review passed. Two independent read-only reviewers reported no remaining code merge-blocker. The product surface was not widened: Marketplace execution, executable third-party Skills and unavailable bake backends still fail closed.
