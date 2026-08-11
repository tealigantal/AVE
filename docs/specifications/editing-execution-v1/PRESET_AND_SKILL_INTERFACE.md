# Preset and Skill Interface

## Purpose

Constrain creative automation to audited composable primitives while preserving Project Host, Timeline Command/Commit and unified RenderGraph authority.

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

The immutable record contains selection/Skill input, exact definition pins/digests, resolved defaults, application context, trust/license/asset decisions, the canonical compiled-command payload and hashes, declared semantic expectation, Preview/Master routing, actual ExecutionPlan decisions and declared-semantic-to-RenderGraph-node links, base/final Timeline versions and success/block diagnostics.

## Registry and validation

`packages/core/preset-core` is pure and performs no I/O. It registers exact immutable definitions and audited compiler identifiers. Re-registering identical content is idempotent; rebinding an exact ID/version to another digest fails. Built-in definitions are trusted. Project-local definitions require their exact digest in Host-authoritative trust context. Marketplace definitions default to quarantine.

Parameter validation uses a deliberately restricted scalar schema for boolean, number, integer, string and enum values. It rejects unknown fields, non-finite numbers, invalid defaults and values outside declared constraints. Compiler implementations receive resolved values and bindings and can return only ordinary Timeline Commands.

## Trust, license and assets

Definitions cannot load assets or code. Asset requirements use content-addressed identity. Unknown, pending, expired or revoked license state; missing or mismatched asset identity; revoked definition; unavailable exact version; or absent explicit migration blocks new application. The repository does not choose a Marketplace signing root or legal license allowlist in this package.

Trusted digests and license statuses are explicit Host-session policy inputs for a new application. The immutable application record persists the decision and its subjects for audit, but this package does not claim a persistent approval UI/actor or authorize a later application from historical approval alone.

## Timeline Commands and Edit IR mapping

The authoritative path is:

```text
CreativeSkillOutput / PresetSelection IR
  -> Preset Core validation and deterministic expansion
  -> ordinary Timeline Commands
  -> Project Host simulation / CommitPlan
  -> committed Timeline
  -> RenderGraph
```

The application record identity is included in CommitPlan `semantic_refs`. A successful application commits all Commands once against `base_timeline_version`. Any conflict or validation failure leaves Timeline unchanged.

## RenderGraph mapping

The declared subgraph is a target-neutral semantic expectation and never an executable graph fragment. Resolution produces one explicit decision for Preview and Master for every declared capability. Preview and Master may select different source/profile/adapter identities only when semantic expectation is unchanged. Silent omission is forbidden.

Fallback must be semantically equivalent. Semantic dependencies fail closed when an upstream node blocks. Bake requires a trusted content-addressed artifact and acceptable license; because Graphic Bake and AI Asset backends are unavailable, those routes block. Any capability unavailable on either target blocks application. A successful routing declaration is insufficient by itself: Host rebuilds the candidate Timeline's real Preview and Master RenderGraphs, resolves both ExecutionPlans, requires equal target-neutral semantic hashes and records the actual node IDs that satisfy each declared semantic.

## Persistence and migration

Successful application provenance and the Timeline CommitPlan are registered in the same Project Storage transaction using existing content-addressed object storage and object references. Blocked attempts persist a separate application record without Timeline mutation. Identical application retries are idempotent; different content with the same application ID conflicts.

Definitions remain exact-version immutable. Old Timelines render from expanded committed state even when the registry changes. Migration is an explicit old-pin-to-new-pin operation producing a new selection, record and Commit; project open never migrates silently.

## Acceptance

- ACC-015: generic execute/fallback/bake/block routing never silently omits semantics.
- ACC-016: existing narrow `basic_vertical_vlog@1` static manual reframe evidence.
- ACC-020: generic immutable registry and parameter validation.
- ACC-021: typed Creative Skill selection and deterministic safe compilation.
- ACC-022: trust, license, asset, exact version and migration failures.
- ACC-023: Project Host application, undo/redo and close/reopen persistence.
- ACC-024: Preview/Master declared semantic equivalence and explicit routing.
- ACC-025: application provenance and Timeline commit atomicity/idempotence.
- ACC-026: user review of representative output, attribution and diagnostics.

## Existing Basic Vlog compatibility

The existing `basic_vertical_vlog@1` definition selects only `StaticReframeV1`, `MasterLoudnessNormalizationV1`, `DialogueMusicDuckingV1` and `ClipBoundaryFadesV1` settings and compiles them to ordinary Timeline Commands. It cannot create dynamic tracking, invent a bus graph or represent clip fades as transitions. Its old API remains a compatibility adapter and its evidence does not complete the broader interface by itself.

## Deferred decisions

External Marketplace root keys, signature rotation/revocation service, network package retrieval, license allowlist/legal interpretation, third-party executable Skill code and historical-render behavior after a later legal revocation require separate product/security/legal decisions. Safe current behavior is quarantine and block.
