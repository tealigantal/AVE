# ADR-0012 Preset and Skill Authority and Expansion

## Status

Accepted for WP-PRESET-001; authority boundary hardened by WP-PRESET-002.

## Context

AVE needs reusable Motion, Transition, Effect, Color, Title, Subtitle, Audio and Composition Presets without creating a second Timeline, RenderGraph or backend authority. The existing `basic_vertical_vlog@1` compiler is a fixed compatibility slice. Allowing a Preset or Creative Skill to emit arbitrary Timeline Commands, RenderGraph nodes, executable code or raw FFmpeg/MLT strings would bypass Contract, Command/Commit and resolver boundaries.

## Considered Options

1. Let Skills emit backend filters or RenderGraph nodes. This is flexible but bypasses authoritative Timeline semantics and cannot guarantee Preview/Master parity.
2. Let definitions contain arbitrary Timeline Command templates. This avoids backend strings but still exposes the complete mutation surface to untrusted data.
3. Make definitions pure data, make Skills emit typed exact-version selections, and resolve selections through audited built-in compiler identifiers into ordinary Timeline Commands.

## Decision

Adopt option 3. JSON Schema is the sole protocol source, generated TypeScript/Python bindings are consumed by the implementation, and Project Host validates external definitions and Creative Skill output through Contract Runtime/AJV before Preset Core. `packages/core/preset-core` owns immutable definition registration, cross-field/business parameter validation, ordered Skill selection validation and deterministic compilation. Definitions contain metadata, parameter schemas, bindings, declared semantic capabilities and routing policy, but no executable code, command arrays, RenderGraph nodes, shell, URL download or backend strings.

Creative Skills output only versioned `CreativeSkillOutput` containing a base Timeline version and ordered `PresetSelection` records. Preset Core resolves exact definitions and returns ordinary Timeline Commands plus diagnostics and provenance. Project Host alone may simulate and commit those Commands.

Declared subgraphs are semantic expectations used to verify the graph produced from the committed Timeline. They never inject nodes directly. A Preset compiler may emit only the audited primitive setter union; structural, restore and container Commands that could smuggle nested Timeline state fail closed. After each selection compiles, an exhaustive admitted-Command-to-capability classifier proves that every actual emitted capability is authorized by both the compiler attestation and that exact definition's routed execute/fallback declarations. Any forbidden Command or undeclared effect blocks the whole application and publishes no Commands. The authoritative path remains Selection IR → Resolver → Timeline Commands → Command/Commit → Timeline → RenderGraph.

## Rationale

The decision makes third-party or model-generated input structurally incapable of acquiring mutation or backend authority. It also keeps the existing Timeline, RenderGraph and Worker path as the only executable media pipeline.

## Consequences

New preset categories require an audited compiler identifier backed by repository code. A data-only external definition can be inspected and quarantined but cannot introduce executable behavior. Underlying editing capabilities may still block; the Preset interface must report that without claiming the content is executable.

## Migration

`compileBasicVlogPreset` remains as a compatibility adapter to the registered `basic_vertical_vlog@1` definition. Existing selection contracts and Timeline snapshots remain valid.

## Rollback

The new core package and contracts can be removed while retaining the old compatibility compiler. No stored Timeline requires the registry for rendering because successful applications persist expanded Commands and Timeline state.

## Date

2026-08-11
