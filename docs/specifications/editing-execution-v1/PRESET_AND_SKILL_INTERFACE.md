# Preset and Skill Interface

## Purpose

Constrain creative automation to audited composable primitives while preserving Project Host, Timeline Command/Commit, one Semantic Render Manifest, and target-specific Preview/Master RenderGraph and ExecutionPlan authority.

## Scope

CAP-PRESET-001 covers Motion, Transition, Effect, Color, Title, Subtitle, Audio and Composition Presets. The interface includes immutable identity/version, restricted parameter schemas/defaults, declared semantic capabilities, bindings, aspect/minimum-duration constraints, content-addressed assets, license/trust state, Preview behavior and explicit fallback/bake/blocker policy.

## Non-goals

- No raw FFmpeg/MLT strings, shell, executable JS/Python/WASM, runtime URL downloads, arbitrary Timeline Command arrays or direct RenderGraph nodes.
- No claim that Graphic Bake, AI Asset or an external Marketplace is executable.
- No implicit version upgrade or retroactive Timeline rewrite.

## Domain objects

### PresetDefinitionV1

A pure-data definition contains `preset_id`, integer `preset_version`, category, compiler identifier, restricted parameter schema/defaults, input bindings, declared semantic subgraph/capabilities, aspect ratios, optional RationalTime minimum duration, asset requirements, license declaration, trust source, Preview policy and unsupported-route policy. Registry identity is the exact ID/version plus canonical SHA-256 definition digest.

### PresetSelectionV1

A selection contains an application-local selection ID, exact Preset ID/version, typed parameter values and declared input bindings. Unknown fields and unknown parameters fail. Selection never carries a Command, graph node, backend string or executable payload.

### CreativeSkillOutputV1

A Skill output contains `skill_id`, `skill_version`, `application_id`, `base_timeline_version` and an ordered non-empty list of Preset selections. Ordering is deterministic. A Skill cannot apply or commit its result.

### PresetApplicationRecordV1

The immutable record contains selection/Skill input, exact definition pins/digests, resolved defaults, application context, trust/license/asset decisions, the canonical compiled-command payload and hashes, declared semantic expectation, Preview/Master routing, authoritative candidate source-identity hash, candidate Preview/Master plan IDs and cache keys, ExecutionPlan decisions and declared-semantic-to-RenderGraph-node links, base/final Timeline versions and success/block diagnostics. A later formal render does not relabel these candidate plans as the executed plans: both output manifests carry an application link that names the candidate identities, the actual render source identity and actual Preview/Master plan/cache identities.

## Registry and validation

The JSON Schemas under `contracts/schemas/preset/**` are the sole protocol source. Generated TypeScript/Python bindings derive from those Schemas; handwritten duplicates are forbidden. Project Host applies Contract Runtime/AJV validation to external definitions and current Preset / `CreativeSkillOutputV1` Skill Output before Preset Core receives them. `packages/core/preset-core` is pure, performs no I/O and owns only cross-field/business validation after that boundary. It registers exact immutable definitions and audited compiler identifiers. Re-registering identical content is idempotent; rebinding an exact ID/version to another digest fails. Built-in definitions are trusted. Project-local definitions require their exact digest in Host-authoritative trust context. Marketplace definitions default to quarantine.

Parameter validation uses a deliberately restricted scalar schema for boolean, number, integer, string and enum values. The Contract boundary rejects unknown fields, malformed or empty bindings, invalid IDs, non-finite numbers and illegal enums; Preset Core rejects unknown parameters, invalid defaults and values outside definition constraints. Compiler implementations receive resolved values and bindings and can return only the audited primitive setter Command union.

## Trust, license and assets

Definitions cannot load assets or code. Asset requirements use content-addressed identity. Project Host queries only the current definitions' declared asset IDs and consumes a persisted Worker-produced fingerprint, verification state, file stat and probe result; it neither hashes media bytes nor scans unrelated registered locations during Preset resolution. Unknown, pending, expired or revoked license state; missing, changed, stale or mismatched asset identity; revoked definition; or a non-current exact version blocks new application. The repository does not choose a Marketplace signing root or legal license allowlist in this package.

Trusted digests and license statuses are explicit Host-session policy inputs for a new application. The immutable application record persists the decision and its subjects for audit, but this package does not claim a persistent approval UI/actor or authorize a later application from historical approval alone.

## Timeline Commands and CommandEditIR mapping

The authoritative path is:

```text
Preset / CreativeSkillOutputV1 Skill Output
  -> Preset Core validation and deterministic expansion
  -> ordinary Timeline Commands
  -> CommandEditIntent / CommandEditIR
  -> Project Host simulation / CommitPlan
  -> committed Timeline
  -> Semantic Render Manifest
       -> Preview RenderGraph / Preview ExecutionPlan
       -> Master RenderGraph / Master ExecutionPlan
```

The application record identity is included in CommitPlan `semantic_refs`. A successful application commits all Commands once against `base_timeline_version`. Any conflict or validation failure leaves Timeline unchanged.

Compiler authority is checked after compilation for each selection. Preset compilers may emit only the audited primitive setter union (`set_transform`, `set_static_reframe`, `set_clip_boundary_fades`, `set_master_loudness` and `set_dialogue_music_ducking`); structural, restore and other container Commands that could carry nested hidden state are forbidden. The admitted union maps exhaustively to semantic capabilities, and the actual emitted capability set must be a subset of both the compiler attestation and that exact definition's routed execute/fallback capabilities. `PRESET_COMPILER_UNDECLARED_EFFECT` blocks undeclared admitted effects; `PRESET_COMPILER_COMMAND_FORBIDDEN` blocks any non-admitted Command. Either failure returns no Commands.

## RenderGraph mapping

The declared subgraph is a target-neutral semantic expectation and never an executable graph fragment. Resolution produces one explicit decision for Preview and Master for every declared capability. Preview and Master may select different source/profile/adapter identities only when semantic expectation is unchanged. Silent omission is forbidden.

Fallback must be semantically equivalent. Semantic dependencies fail closed when an upstream node blocks. Bake requires a trusted content-addressed artifact and acceptable license; because Graphic Bake and AI Asset backends are unavailable, those routes block. Any capability unavailable on either target blocks application. A successful routing declaration is insufficient by itself: Host resolves `RenderSourceRef` values only from current persisted Original/Proxy identity and probe facts, rebuilds target-specific Preview/Master RenderGraphs from the candidate Timeline, resolves one ExecutionPlan per graph, requires equal target-neutral semantic payload/hash and records source identity, plan/cache identities and the actual node IDs that satisfy each declared semantic. It never fabricates a source reference or `has_audio`; missing Original, unusable Proxy mapping, divergent Original/Proxy audio facts and audio excluded by enabled/muted/solo/routing state block explicitly. When that committed Timeline is formally rendered, Worker re-probes the actual Original and Proxy paths, Host ignores caller-supplied audio claims, rejects target-divergent audio, verifies the persisted Original authority, and rechecks the recorded semantic hash and every recorded semantic node against the actual ExecutionPlans before Worker render submission. Both successful output manifests persist an application-to-render link containing candidate and actual source/plan identities; a mismatch fails closed instead of publishing an unlinked render.

## Persistence and current-version identity

Successful application provenance and the Timeline CommitPlan are registered in the same Project Storage transaction using existing content-addressed object storage and object references. Atomic artifact metadata cannot supply or override `object_ref_id`, `object_type`, `version`, `relation_key` or `byte_length`; commit events are built from the authoritative rows actually inserted. Blocked attempts persist a separate application record without Timeline mutation. Identical application retries are idempotent; different content with the same application ID conflicts.

Definitions remain exact-version immutable. The development repository contains one current definition for each supported identity. A non-current pin is rejected before application or project mutation; there is no Preset migration API, dual registry read or automatic conversion.

## Acceptance

- ACC-015: generic execute/fallback/bake/block routing never silently omits semantics.
- ACC-016: existing narrow `basic_vertical_vlog@1` static manual reframe evidence.
- ACC-020: generic immutable registry and parameter validation.
- ACC-021: typed `CreativeSkillOutputV1` Preset selection and deterministic safe compilation.
- ACC-022: trust, license, asset and non-current exact-version failures.
- ACC-023: Project Host application, undo/redo and close/reopen persistence.
- ACC-024: Preview/Master declared semantic equivalence and explicit routing.
- ACC-025: application provenance and Timeline commit atomicity/idempotence.
- ACC-026: user review of representative output, attribution and diagnostics.
- ACC-027: adversarial compiler authority, Schema boundary, media identity and atomic storage hardening.

## Current Basic Vlog compiler

The current `basic_vertical_vlog@1` definition selects only `StaticReframeV1`, `MasterLoudnessNormalizationV1`, `DialogueMusicDuckingV1` and `ClipBoundaryFadesV1` settings and compiles them directly to ordinary Timeline Commands. It cannot create dynamic tracking, invent a bus graph or represent clip fades as transitions. Its evidence does not complete the broader interface by itself.

## Deferred decisions

External Marketplace root keys, signature rotation/revocation service, network package retrieval, license allowlist/legal interpretation, third-party executable Skill code and historical-render behavior after a later legal revocation require separate product/security/legal decisions. Safe current behavior is quarantine and block.
