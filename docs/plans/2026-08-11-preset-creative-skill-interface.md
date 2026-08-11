# Preset and Creative Skill Interface ExecPlan

## Purpose / Big Picture

Deliver the complete executable portion of `WP-PRESET-001`: audited, immutable Preset definitions and typed Creative Skill selections that deterministically compile to ordinary Timeline Commands, pass through Project Host Command/Commit, persist provenance atomically, and preserve identical Preview/Master semantics. Built-in definitions may execute. Project-local or marketplace definitions remain quarantined unless an explicit trusted definition hash and approved license/asset context are available. This plan does not claim that an external marketplace, Graphic Bake backend, AI Asset backend, or the editing capabilities beneath currently blocked presets are available.

## Context and Orientation

The repository is on `codex/wp-preset-001` from a clean `main` baseline. `WP-PRESET-001` is already active and permits changes only under `contracts/**`, `packages/**`, `tests/**`, and `docs/**`; `apps/worker-host/**` is forbidden. The current `compileBasicVlogPreset` function is a fixed compatibility compiler for `basic_vertical_vlog@1`. `ACC-015` proves only generic RenderGraph blocker persistence and is not sufficient evidence for `CAP-PRESET-001`.

Project Host remains the sole project-state and SQLite authority. Preset expansion cannot inject RenderGraph nodes or backend strings. It produces ordinary Timeline Commands, which are simulated and committed before the authoritative Timeline is compiled into the existing RenderGraph. Exact versions and definition hashes are pinned; no automatic migration occurs.

## Plan of Work

1. Strengthen the work-package contract and acceptance matrix so generic Preset capability cannot be completed with the historical ACC-015 evidence.
2. Add versioned Preset Definition, Preset Selection, Creative Skill Output and Preset Application Record contracts with valid and invalid examples.
3. Implement a pure `preset-core` registry/resolver with immutable version registration, restricted parameter schemas, deterministic compilation, trust/license/asset checks and structured routing decisions.
4. Retain `compileBasicVlogPreset` as a compatibility adapter backed by the new registry rather than a second rule set.
5. Add Project Host resolve/apply boundaries. Successful applications atomically persist a content-addressed application record with the Timeline CommitPlan; blocked applications persist a blocker record and leave Timeline state unchanged.
6. Verify declared semantic capabilities against both Preview and Master without inserting a second RenderGraph path. Unsupported Graphic Bake, AI Asset or editing semantics remain explicit blockers.
7. Add contract, property, Host, storage, version-conflict, undo/redo and close/reopen coverage using existing package commands.
8. Run focused and full validation. Create an immutable PRECHECK Evidence record and a draft PR when machine validation reaches the user-review boundary. Do not run `docs:complete` until the user accepts the review bundle.

## Concrete Steps

- Maintain all changes inside the active package Allowed Paths.
- Generate contracts with `pnpm run contracts:generate`; never hand-edit `contracts/generated/**`.
- Exercise the new property coverage through `pnpm run timeline-core:test` and Host coverage through `pnpm run timeline:host:test` so no root package-script edit is required.
- Run `pnpm run contracts:check`, `pnpm run contracts:compatibility`, `pnpm run contracts:clean`, `pnpm run edit-ir:test`, `pnpm run timeline-core:test`, `pnpm run render-graph:test`, `pnpm run commit-plan:test`, `pnpm run timeline:host:test`, `pnpm run undo-redo:test`, `pnpm run project-recovery:test`, `pnpm run storage:check`, `pnpm run typecheck`, `pnpm run architecture`, `pnpm run docs:check`, `pnpm run acceptance:final:synthetic`, and `pnpm run check`.
- Run `pnpm audit --audit-level high`. Treat the existing `fast-uri` advisory as a separate package/path blocker; do not weaken the security gate.
- Create `EVD-20260811-WP-PRESET-001-PRECHECK` only after the implementation fingerprint and executed results are known.
- Open a draft PR with the local review instructions. Keep `WP-PRESET-001` active until manual acceptance.

## Validation and Acceptance

- ACC-020: generic immutable Preset registration, parameter defaults/schema validation, exact ID/version lookup and stable definition digest.
- ACC-021: Creative Skill output accepts only typed ordered selections and parameters; raw Timeline Commands, RenderGraph nodes, executable code and backend strings cannot enter the system.
- ACC-022: exact version pinning, explicit migration, trust, license and asset identity checks; tampered, unavailable, untrusted, pending, expired or revoked inputs fail closed.
- ACC-023: successful application compiles ordinary Commands, commits once, persists a content-addressed application record, survives undo/redo and close/reopen, and rejects a stale base version without partial state.
- ACC-024: declared semantic capabilities receive explicit Preview/Master execute/fallback/bake/block decisions; both targets retain one target-neutral semantic expectation.
- ACC-025: application record and Timeline CommitPlan are atomically associated; fault, retry and conflict paths do not produce half-applied Timeline state or duplicate application history.
- Manual review: the user checks representative Preview/Master output, subjective visual/audio behavior, attribution clarity and comprehensibility of fallback/blocker messages. Until then the package remains active.

## Idempotence and Recovery

Contract generation and documentation synchronization are repeatable. Registry registration accepts identical content for an existing exact version and rejects a different digest. Application IDs are idempotent for identical content and conflict on different content. Timeline version conflicts fail before mutation. Content blobs staged before a failed SQLite transaction remain ordinary recoverable object-store orphans and never become authoritative references. Resume from the Progress section and rerun the nearest focused command.

Rollback is ordinary Git reversion. No database migration is added; application records use existing content-addressed `object_store` and `object_refs`. Existing `basic_vertical_vlog@1` inputs remain compatible.

## Artifacts and Notes

Expected artifacts are four versioned schemas and examples, generated bindings, `packages/core/preset-core`, the compatibility adapter, Host/storage integration, focused tests, ADR-0012 through ADR-0014, reconciled programme matrices/specifications, PRECHECK Evidence and a draft PR. Real or private user media must not be copied into the repository or named by local path in Evidence.

External marketplace signing roots, network retrieval, license allowlists/legal interpretation and third-party executable Skill code are not safely inferable. The implemented policy is quarantine and block; this is a security boundary, not a claim of marketplace completion.

## Interfaces and Dependencies

- `preset-core` depends on Timeline Command types and pure hashing/validation only; it performs no file, database, network, Worker or model access.
- Project Host owns authoritative selection application and receives explicit trust/license policy for each new application. It persists the decision, not an inferred long-lived approval actor.
- Project Storage owns atomic application-record/object-reference persistence.
- RenderGraph remains derived only from committed Timeline state.
- No new production dependency is planned.

## Progress

- 2026-08-11: Classified the task as an important, multi-package product programme and confirmed a clean `main` baseline.
- 2026-08-11: Completed three independent read-only reviews covering architecture, source/test placement and acceptance governance.
- 2026-08-11: Confirmed the bounded executable scope and external marketplace quarantine boundary; created `codex/wp-preset-001` and invoked the already-active package start command idempotently.
- 2026-08-11: Created this ExecPlan and ADR-0012 through ADR-0014 before application source changes.
- 2026-08-11: Added four versioned Preset/Skill/application contracts and generated bindings; implemented the immutable registry, restricted scalar parameter resolver, audited compilers, policy/routing decisions and Basic Vlog compatibility adapter.
- 2026-08-11: Added Project Host resolve/apply APIs and Project Storage atomic application artifacts; property and integration tests now cover idempotency, conflicts, quarantine, fallback/bake/block, stale versions and close/reopen recovery.
- 2026-08-11: Generated a fresh licensed real-media Preview/Master review project through the generic Creative Skill application path. Automated QC passed and the application record survived project reopen. Manual creative review remains pending.
- 2026-08-11: Independent review exposed route/ExecutionPlan drift, shallow definition immutability, forged built-in provenance, unrecorded binding failures and historical Evidence mutation. All in-scope blockers were repaired, historical Evidence restored, and focused regressions added.
- 2026-08-11: Fresh v4 real-media review, synthetic final acceptance and the complete repository check passed. The inherited `fast-uri` audit remains a separately scoped repository security blocker; ACC-026 remains the only Preset acceptance awaiting user judgment.
- 2026-08-11: Final adversarial review found explicit-null defaulting, mutable exported built-ins, unrelated-node semantic-link spoofing and missing Host migration proof. Deep immutability, own-property validation, compiler capability attestations and a v1-to-v2 apply/reopen migration regression repaired all four; the final licensed review bundle was regenerated as v5.

## Surprises & Discoveries

- The work package is active but had no dedicated ExecPlan.
- Its only required acceptance, ACC-015, was already tested using older RenderGraph blocker evidence and cannot prove generic Preset capability.
- The current completion script does not independently verify EVD content, work-package ownership, current fingerprint, required command execution or pending human acceptance.
- The package Allowed Paths exclude root package scripts and documentation tooling, so new tests must be reached through existing governed commands and completion must not rely on weakening the script.
- The remote security workflow currently reports the known `fast-uri <3.1.5` advisory; fixing it requires a separate allowed-path scope.
- Existing licensed local acceptance media was available, so the manual review bundle could exercise the new generic application path without introducing private media into Git.

## Decision Log

- Preset definitions are pure data; executable code, arbitrary Commands, RenderGraph nodes and backend strings are forbidden inputs.
- Creative Skills produce only typed Preset Selection IR.
- Declared subgraphs are validation expectations, not a second graph-authority path.
- Exact version plus definition digest is immutable; migration is explicit and produces a new application.
- Built-in definitions may execute; external definitions default to quarantine/block until Host-authoritative trust and license conditions are satisfied.
- Successful application provenance is stored atomically with the Timeline CommitPlan; blocked attempts are persisted separately without Timeline mutation.
- Manual creative review creates a PR boundary. PRECHECK Evidence remains immutable and the work package stays active until the user accepts.

## Outcomes & Retrospective

The executable WP-PRESET-001 slice is implemented and machine-tested without claiming external Marketplace, Graphic Bake, AI Asset or underlying blocked editing families. The principal review finding was that declared capability availability cannot authorize application: Project Host must validate the candidate Timeline's actual Preview and Master ExecutionPlans and persist exact semantic-to-node links before Commit. A second lesson is that trust applies to canonical deep snapshots and closed provenance, never caller-owned nested objects or self-asserted built-in labels.

The work package intentionally remains active. The user must review the licensed local Preview/Master bundle, attribution and blocker examples for ACC-026. `docs:complete` is forbidden until that acceptance produces a new immutable COMPLETE Evidence record. The known `fast-uri` advisory also remains a merge blocker outside this package's Allowed Paths.
