import { strict as assert } from "node:assert";
import { PresetRegistry, builtInPresetDefinitions, createBuiltInPresetRegistry, migratePresetSelection, presetDigest, resolveCreativeSkill, timelineCommandSemanticCapabilities, type CreativeSkillOutput, type PresetDefinition, type PresetResolutionContext } from "../../packages/core/preset-core/src/public.js";
import { assertCreativeSkillOutputV1, assertPresetDefinitionV1 } from "../../packages/platform/contract-runtime/src/public.js";

const capabilities = new Map([
  ["timeline.transform", { preview: true, master: true }],
  ["fallback.transform", { preview: true, master: true }]
]);
const context = (overrides: Partial<PresetResolutionContext> = {}): PresetResolutionContext => ({
  trusted_definition_digests: new Set(),
  revoked_definition_digests: new Set(),
  license_statuses: new Map([["ave-built-in", "approved"]]),
  available_asset_ids: new Set(),
  trusted_bake_asset_ids: new Set(),
  capabilities,
  ...overrides
});
const output = (overrides: Partial<CreativeSkillOutput> = {}): CreativeSkillOutput => ({
  schema_version: 1,
  application_id: "application-motion-1",
  skill_id: "skill.motion",
  skill_version: 1,
  base_timeline_version: 0,
  composition_policy: "ordered",
  selections: [{ schema_version: 1, selection_id: "selection-motion-1", preset_id: "motion.static_transform", preset_version: 1, parameters: { x: 0.25 }, bindings: { track_id: "v1", clip_id: "clip-1" } }],
  ...overrides
});

const registry = createBuiltInPresetRegistry();
const first = resolveCreativeSkill(output(), registry, context());
const second = resolveCreativeSkill(output(), registry, context());
assert.equal(first.status, "ready");
assert.deepEqual(first, second, "the same typed selection and context must resolve deterministically");
assert.deepEqual(first.commands.map((command) => command.type), ["set_transform"]);
assert.deepEqual((first.commands[0] as any).transform, { x: 0.25, y: 0, scale_x: 1, scale_y: 1, rotation: 0, opacity: 1, fit: "fit" });
assert.equal(first.definition_pins[0].definition_digest.length, 64);
assert.equal(first.policy_decisions.every((decision) => decision.outcome === "approved"), true);
assert.equal(resolveCreativeSkill(output({ selections: [{ ...output().selections[0], parameters: { unknown: 1 } }] }), registry, context()).diagnostics.some((diagnostic) => diagnostic.code === "PRESET_PARAMETER_UNKNOWN"), true);
assert.equal(resolveCreativeSkill(output({ selections: [{ ...output().selections[0], preset_version: 99 }] }), registry, context()).diagnostics.some((diagnostic) => diagnostic.code === "PRESET_VERSION_UNAVAILABLE"), true);

assert.throws(() => assertCreativeSkillOutputV1({ ...output(), commands: [{ type: "raw_backend", filter: "movie=/etc/passwd" }] }), /CONTRACT_CREATIVE_SKILL_OUTPUT_INVALID/);

const marketplace: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "marketplace.motion", trust_source: "marketplace", license: { license_id: "market-license", attribution_required: true, attribution_text: "Motion by Vendor" } };
const marketplaceRegistry = new PresetRegistry([marketplace]);
const marketplaceOutput = output({ selections: [{ ...output().selections[0], preset_id: marketplace.preset_id }] });
const marketplaceResolution = resolveCreativeSkill(marketplaceOutput, marketplaceRegistry, context({ license_statuses: new Map([["market-license", "approved"]]) }));
assert.equal(marketplaceResolution.status, "blocked");
assert.equal(marketplaceResolution.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_MARKETPLACE_QUARANTINED"), true);
const builtInDigest = presetDigest(builtInPresetDefinitions[0]);
assert.equal(Object.isFrozen(builtInPresetDefinitions[0].parameter_schema[0]), true, "exported repository built-ins must be deeply immutable before registry creation");
assert.throws(() => { (builtInPresetDefinitions[0].parameter_schema[0] as any).default = 3; }, TypeError);
assert.equal(resolveCreativeSkill(output(), registry, context({ revoked_definition_digests: new Set([builtInDigest]) })).diagnostics.some((diagnostic) => diagnostic.code === "PRESET_DEFINITION_REVOKED"), true);

const localFallback: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "local.motion.fallback", trust_source: "project_local", semantic_nodes: [{ semantic_id: "premium-transform", capability: "premium.transform", unsupported_route: "fallback", route_detail: "timeline.transform" }], license: { license_id: "project-license", attribution_required: false } };
const localRegistry = new PresetRegistry([localFallback]);
const localDigest = presetDigest(localFallback);
const localOutput = output({ selections: [{ ...output().selections[0], preset_id: localFallback.preset_id }] });
const localReady = resolveCreativeSkill(localOutput, localRegistry, context({ trusted_definition_digests: new Set([localDigest]), license_statuses: new Map([["project-license", "approved"]]) }));
assert.equal(localReady.status, "ready");
assert.equal(localReady.routing_decisions.every((decision) => decision.outcome === "fallback"), true);
assert.equal(resolveCreativeSkill(localOutput, localRegistry, context({ license_statuses: new Map([["project-license", "approved"]]) })).diagnostics.some((diagnostic) => diagnostic.code === "PRESET_DEFINITION_UNTRUSTED"), true);
for (const licenseState of ["unknown", "pending", "expired", "revoked"] as const) {
  const denied = resolveCreativeSkill(localOutput, localRegistry, context({ trusted_definition_digests: new Set([localDigest]), license_statuses: new Map([["project-license", licenseState]]) }));
  assert.equal(denied.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_LICENSE_NOT_APPROVED"), true, `license ${licenseState} must block`);
}

const bakedAssetId = `asset:sha256:${"a".repeat(64)}`;
const localBake: PresetDefinition = { ...localFallback, preset_id: "local.motion.bake", semantic_nodes: [{ semantic_id: "premium-transform", capability: "premium.transform", unsupported_route: "bake", route_detail: bakedAssetId }], assets: [{ asset_id: bakedAssetId, license_id: "asset-license", required: true }] };
const bakeRegistry = new PresetRegistry([localBake]);
const bakeDigest = presetDigest(localBake);
const bakeOutput = output({ selections: [{ ...output().selections[0], preset_id: localBake.preset_id }] });
const bakeContext = context({ trusted_definition_digests: new Set([bakeDigest]), license_statuses: new Map([["project-license", "approved"], ["asset-license", "approved"]]), available_asset_ids: new Set([bakedAssetId]), trusted_bake_asset_ids: new Set([bakedAssetId]) });
assert.equal(resolveCreativeSkill(bakeOutput, bakeRegistry, bakeContext).routing_decisions.every((decision) => decision.outcome === "block" && decision.detail === "PRESET_BAKE_EXECUTION_UNAVAILABLE"), true);
assert.equal(resolveCreativeSkill(bakeOutput, bakeRegistry, context({ trusted_definition_digests: new Set([bakeDigest]), license_statuses: new Map([["project-license", "approved"], ["asset-license", "approved"]]) })).status, "blocked");

const previewBlocked: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "motion.preview_blocked", trust_source: "project_local", preview_policy: { mode: "block" } };
const previewBlockedResolution = resolveCreativeSkill(output({ selections: [{ ...output().selections[0], preset_id: previewBlocked.preset_id }] }), new PresetRegistry([previewBlocked]), context({ trusted_definition_digests: new Set([presetDigest(previewBlocked)]) }));
assert.equal(previewBlockedResolution.status, "blocked");
assert.equal(previewBlockedResolution.routing_decisions.some((decision) => decision.target === "preview" && decision.outcome === "block"), true);

const localVersion: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "local.motion.versioned", trust_source: "project_local" };
const registryConflict = new PresetRegistry([localVersion]);
assert.throws(() => registryConflict.register({ ...localVersion, parameter_schema: [...localVersion.parameter_schema, { parameter_id: "new", type: "number", required: false, default: 1 }] }), /PRESET_VERSION_DIGEST_CONFLICT/);
assert.throws(() => assertPresetDefinitionV1({ ...localVersion, parameter_schema: [{ ...localVersion.parameter_schema[0], executable_code: "return process.env" }] }), /CONTRACT_PRESET_DEFINITION_INVALID/);
assert.throws(() => new PresetRegistry([{ ...builtInPresetDefinitions[0], preset_id: "forged.built_in" }]), /PRESET_BUILT_IN_PROVENANCE_FORBIDDEN/);
const mutableDefinition: PresetDefinition = { ...localVersion, preset_id: "local.motion.immutable", parameter_schema: localVersion.parameter_schema.map((parameter) => ({ ...parameter })) };
const immutableRegistry = new PresetRegistry([mutableDefinition]);
const immutablePin = immutableRegistry.definitions()[0];
(mutableDefinition.parameter_schema[0] as any).default = 3;
const immutableOutput = output({ selections: [{ ...output().selections[0], preset_id: mutableDefinition.preset_id, parameters: {} }] });
const immutableResolution = resolveCreativeSkill(immutableOutput, immutableRegistry, context({ trusted_definition_digests: new Set([immutablePin.definition_digest]), license_statuses: new Map([["ave-built-in", "approved"]]) }));
assert.equal(immutableResolution.resolved_selections[0].parameters.x, 0);
assert.equal(immutableResolution.definition_pins[0].definition_digest, immutablePin.definition_digest);
const targetVersion: PresetDefinition = { ...localVersion, preset_version: 2 };
const migrationRegistry = new PresetRegistry([localVersion, targetVersion]);
const migrationSource = { ...output().selections[0], preset_id: localVersion.preset_id };
const migrated = migratePresetSelection(migrationSource, { preset_id: targetVersion.preset_id, preset_version: 2 }, migrationRegistry, (parameters) => ({ ...parameters, x: 0.5 }));
assert.equal(migrated.preset_version, 2);
assert.equal(migrated.parameters.x, 0.5);
assert.equal(migrationSource.preset_version, 1, "migration must not silently mutate the pinned source selection");

const timed: PresetDefinition = { ...localVersion, preset_id: "local.motion.timed", minimum_duration: { schema_version: 1, value: 2, timescale: 1 } };
const timedRegistry = new PresetRegistry([timed]);
const timedOutput = output({ selections: [{ ...output().selections[0], preset_id: timed.preset_id }] });
const timedDigest = presetDigest(timed);
assert.equal(resolveCreativeSkill(timedOutput, timedRegistry, context({ trusted_definition_digests: new Set([timedDigest]), timeline_duration: { value: 60n, timescale: 30n } })).status, "ready");
assert.equal(resolveCreativeSkill(timedOutput, timedRegistry, context({ trusted_definition_digests: new Set([timedDigest]), timeline_duration: { value: 59n, timescale: 30n } })).diagnostics.some((diagnostic) => diagnostic.code === "PRESET_DURATION_TOO_SHORT"), true);
assert.throws(() => assertCreativeSkillOutputV1(null), /CONTRACT_CREATIVE_SKILL_OUTPUT_INVALID/);
assert.throws(() => assertCreativeSkillOutputV1(output({ selections: [{ ...output().selections[0], parameters: { x: null as any } }] })), /CONTRACT_CREATIVE_SKILL_OUTPUT_INVALID/, "an explicit null must fail the Contract boundary");

for (const invalid of [
  output({ selections: [{ ...output().selections[0], bindings: { track_id: 123 as any, clip_id: true as any } }] }),
  output({ selections: [{ ...output().selections[0], bindings: { track_id: "", clip_id: "clip-1" } }] }),
  output({ selections: [{ ...output().selections[0], preset_id: "INVALID ID" }] }),
  output({ selections: [{ ...output().selections[0], parameters: { x: Number.NaN } }] }),
  { ...output(), unexpected: true },
]) assert.throws(() => assertCreativeSkillOutputV1(invalid), /CONTRACT_CREATIVE_SKILL_OUTPUT_INVALID/);
assert.throws(() => assertPresetDefinitionV1({ ...localVersion, category: "illegal-enum" }), /CONTRACT_PRESET_DEFINITION_INVALID/);

const misleadingFallback: PresetDefinition = { ...localFallback, preset_id: "local.motion.misleading_fallback", semantic_nodes: [{ semantic_id: "premium", capability: "premium.transform", unsupported_route: "fallback", route_detail: "timeline.audio_master" }] };
const misleadingResolution = resolveCreativeSkill(output({ selections: [{ ...output().selections[0], preset_id: misleadingFallback.preset_id }] }), new PresetRegistry([misleadingFallback]), context({ trusted_definition_digests: new Set([presetDigest(misleadingFallback)]), license_statuses: new Map([["project-license", "approved"]]), capabilities: new Map([...capabilities, ["timeline.audio_master", { preview: true, master: true }]]) }));
assert.equal(misleadingResolution.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_COMPILER_SEMANTIC_MISMATCH"), true, "a route cannot claim a capability the selected compiler does not produce");

const hiddenEffectsDefinition: PresetDefinition = { ...builtInPresetDefinitions[2], preset_id: "local.basic_vlog.hidden_effects", trust_source: "project_local", semantic_nodes: [{ semantic_id: "static_reframe", capability: "timeline.static_reframe", unsupported_route: "block" }], license: { license_id: "project-license", attribution_required: false } };
const hiddenEffectsOutput = output({ selections: [{ schema_version: 1, selection_id: "selection-hidden-effects", preset_id: hiddenEffectsDefinition.preset_id, preset_version: 1, parameters: {}, bindings: { track_id: "v1", clip_id: "clip-1" } }] });
const hiddenEffectsResolution = resolveCreativeSkill(hiddenEffectsOutput, new PresetRegistry([hiddenEffectsDefinition]), context({ trusted_definition_digests: new Set([presetDigest(hiddenEffectsDefinition)]), license_statuses: new Map([["project-license", "approved"]]), capabilities: new Map([["timeline.static_reframe", { preview: true, master: true }]]), aspect_ratio: "9:16" }));
assert.equal(hiddenEffectsResolution.status, "blocked");
assert.equal(hiddenEffectsResolution.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_COMPILER_UNDECLARED_EFFECT"), true);
assert.equal(hiddenEffectsResolution.commands.length, 0, "an undeclared compiler effect must discard every command for the blocked application");
assert.throws(() => timelineCommandSemanticCapabilities({ type: "add_clip", track_id: "v1", clip: { clip_id: "hidden-state", transform: { x: 0, y: 0, scale_x: 1, scale_y: 1, rotation: 0, opacity: 1, fit: "fit" }, boundary_fades: { schema_version: 1 }, effects: [] } } as any), /PRESET_COMPILER_COMMAND_FORBIDDEN:add_clip/, "container Commands that can hide nested effects are not admitted Preset compiler output");

const categories = ["motion", "transition", "effect", "color", "title", "subtitle", "audio", "composition"] as const;
const categoryDefinitions = categories.map((category, index): PresetDefinition => ({ ...localVersion, preset_id: `local.category.${category}`, category, compiler_id: `unavailable.category.${index}` }));
const categoryRegistry = new PresetRegistry(categoryDefinitions);
assert.deepEqual(new Set(categoryRegistry.definitions().map((pin) => categoryRegistry.find(pin.preset_id, pin.preset_version)!.definition.category)), new Set(categories), "all declared v1 categories must register without implying executable support");
for (const definition of categoryDefinitions) {
  const unsupported = resolveCreativeSkill(output({ selections: [{ ...output().selections[0], preset_id: definition.preset_id }] }), categoryRegistry, context({ trusted_definition_digests: new Set([presetDigest(definition)]) }));
  assert.equal(unsupported.status, "blocked");
  assert.equal(unsupported.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_COMPILER_UNAVAILABLE"), true);
}

const dependent: PresetDefinition = { ...localVersion, preset_id: "local.motion.dependent", semantic_nodes: [{ semantic_id: "premium", capability: "unavailable.premium", unsupported_route: "block" }, { semantic_id: "transform", capability: "timeline.transform", depends_on: ["premium"], unsupported_route: "block" }] };
const dependentResolution = resolveCreativeSkill(output({ selections: [{ ...output().selections[0], preset_id: dependent.preset_id }] }), new PresetRegistry([dependent]), context({ trusted_definition_digests: new Set([presetDigest(dependent)]) }));
assert.equal(dependentResolution.routing_decisions.filter((decision) => decision.semantic_id === "transform").every((decision) => decision.outcome === "block" && decision.detail === "PRESET_SEMANTIC_DEPENDENCY_BLOCKED:premium"), true);

console.log("preset core property check passed");
