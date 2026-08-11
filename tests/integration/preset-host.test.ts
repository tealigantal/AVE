import { strict as assert } from "node:assert";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { ProjectHostSession } from "../../packages/platform/project-host/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { builtInPresetDefinitions, migratePresetSelection, PresetRegistry, presetDigest, type CreativeSkillOutput, type PresetDefinition } from "../../packages/core/preset-core/src/public.js";
import { putObjectAndRegister, registerAssetLocation } from "../../packages/platform/project-storage/src/public.js";

const projectDirectory = await mkdtemp(resolve(tmpdir(), "ave-preset-host-"));
const migrationDirectory = await mkdtemp(resolve(tmpdir(), "ave-preset-migration-"));
const asset = `asset:sha256:${"e".repeat(64)}` as any;
const marketplace: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "marketplace.motion.host", trust_source: "marketplace", license: { license_id: "market-license", attribution_required: true, attribution_text: "Motion by Vendor" } };
const localFallback: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "local.motion.host_fallback", trust_source: "project_local", semantic_nodes: [{ semantic_id: "premium-transform", capability: "premium.transform", unsupported_route: "fallback", route_detail: "timeline.transform" }], license: { license_id: "project-license", attribution_required: false } };
const semanticForgery: PresetDefinition = { ...localFallback, preset_id: "local.motion.host_semantic_forgery", semantic_nodes: [{ semantic_id: "premium-transform", capability: "premium.transform", unsupported_route: "fallback", route_detail: "timeline.audio" }] };
const requiredAssetId = `asset:sha256:${"f".repeat(64)}`;
const localAsset: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "local.motion.host_asset", trust_source: "project_local", assets: [{ asset_id: requiredAssetId, license_id: "asset-license", required: true }], license: { license_id: "project-license", attribution_required: false } };
const migrationV1: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "local.motion.host_migration", trust_source: "project_local", license: { license_id: "project-license", attribution_required: false } };
const migrationV2: PresetDefinition = { ...migrationV1, preset_version: 2 };
const skill = (applicationId: string, baseVersion: number, x = 0.25, presetId = "motion.static_transform", fit = "fit"): CreativeSkillOutput => ({ schema_version: 1, application_id: applicationId, skill_id: "skill.motion", skill_version: 1, base_timeline_version: baseVersion, composition_policy: "ordered", selections: [{ schema_version: 1, selection_id: "selection-motion", preset_id: presetId, preset_version: 1, parameters: { x, fit }, bindings: { track_id: "v1", clip_id: "clip-1" } }] });

try {
  assert.throws(() => new ProjectHostSession({ presetDefinitions: [{ ...builtInPresetDefinitions[0], preset_id: "forged.host_builtin" }] }), /PRESET_BUILT_IN_PROVENANCE_FORBIDDEN/);
  const hostOptions = { presetDefinitions: [marketplace, localFallback, semanticForgery, localAsset], trustedPresetDigests: [presetDigest(localFallback), presetDigest(semanticForgery), presetDigest(localAsset)], presetLicenseStatuses: { "market-license": "approved" as const, "project-license": "approved" as const, "asset-license": "approved" as const } };
  const host = new ProjectHostSession(hostOptions);
  await host.create(projectDirectory);
  host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [{ clip_id: "clip-1", source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }]);
  const applied = host.applyCreativeSkill(skill("application-applied", 0));
  assert.equal(applied.status, "applied");
  assert.equal(applied.final_timeline_version, 1);
  assert.ok(applied.render_validation?.semantic_graph_hash);
  assert.deepEqual(applied.application_context, {});
  assert.equal(applied.render_validation?.preview_decisions.some((decision) => decision.capability === "timeline.transform" && decision.outcome === "execute"), true);
  assert.equal(applied.render_validation?.semantic_links.some((link) => link.target === "preview" && link.declared_capability === "timeline.transform" && link.actual_capability === "timeline.transform" && link.actual_node_ids.length > 0), true);
  assert.throws(() => host.applyCreativeSkill(skill("application-applied", 0, 0.25), { aspect_ratio: "9:16" }), /preset application id conflict/);
  assert.equal(host.status().timeline, "v1");
  assert.equal((host.readTimelineSnapshot() as any).tracks[0].clips[0].transform.x, 0.25);
  assert.equal(host.applyCreativeSkill(skill("application-applied", 0)).commit_plan_hash, applied.commit_plan_hash, "same application must be idempotent");
  assert.equal(host.status().timeline, "v1");
  assert.throws(() => host.applyCreativeSkill(skill("application-applied", 1, 0.75)), /preset application id conflict/);

  const stale = host.applyCreativeSkill(skill("application-stale", 0));
  assert.equal(stale.status, "blocked");
  assert.equal(stale.diagnostics.some((diagnostic) => diagnostic.code === "TIMELINE_VERSION_CONFLICT"), true);
  assert.equal(host.status().timeline, "v1", "a stale Preset application must not mutate the Timeline");

  const quarantined = host.applyCreativeSkill(skill("application-marketplace", 1, 0.5, marketplace.preset_id));
  assert.equal(quarantined.status, "blocked");
  assert.equal(quarantined.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_MARKETPLACE_QUARANTINED"), true);
  assert.equal(host.status().timeline, "v1", "a quarantined Preset must not mutate the Timeline");

  const unsupportedParameter = host.applyCreativeSkill(skill("application-original-fit", 1, 0.5, "motion.static_transform", "original"));
  assert.equal(unsupportedParameter.status, "blocked");
  assert.equal(unsupportedParameter.diagnostics.some((diagnostic) => diagnostic.code === "TRANSFORM_ORIGINAL_SIZE_RENDER_UNSUPPORTED"), true);
  assert.equal(host.status().timeline, "v1", "a parameter-level RenderGraph blocker must prevent application");

  const missingBindingOutput = skill("application-missing-binding", 1);
  const missingBinding = host.applyCreativeSkill({ ...missingBindingOutput, selections: [{ ...missingBindingOutput.selections[0], bindings: { track_id: "v1", clip_id: "missing-clip" } }] });
  assert.equal(missingBinding.status, "blocked");
  assert.equal(missingBinding.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_TIMELINE_VALIDATION_FAILED"), true);
  assert.equal(host.status().timeline, "v1", "an invalid Timeline binding must persist a blocker without mutation");

  const forgedSemantic = host.applyCreativeSkill(skill("application-semantic-forgery", 1, 0.5, semanticForgery.preset_id));
  assert.equal(forgedSemantic.status, "blocked");
  assert.equal(forgedSemantic.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_COMPILER_SEMANTIC_MISMATCH"), true);
  assert.equal(host.status().timeline, "v1", "an unrelated existing graph capability cannot satisfy a declared Preset semantic");

  const fallback = host.applyCreativeSkill(skill("application-fallback", 1, 0.6, localFallback.preset_id));
  assert.equal(fallback.status, "applied");
  assert.equal(fallback.routing_decisions.every((decision) => decision.outcome === "fallback"), true);
  assert.equal(fallback.render_validation?.preview_decisions.some((decision) => decision.capability === "timeline.transform" && decision.outcome === "execute"), true);
  assert.equal(fallback.render_validation?.semantic_links.every((link) => link.declared_outcome === "fallback" && link.declared_capability === "premium.transform" && link.actual_capability === "timeline.transform"), true);
  assert.equal(host.status().timeline, "v2");

  const tamperedAssetPath = resolve(projectDirectory, "tampered-asset.bin");
  await writeFile(tamperedAssetPath, "not-the-declared-sha256", "utf8");
  registerAssetLocation((host as any).session, host.status().project, { asset_location_id: "tampered-preset-asset", asset_id: requiredAssetId, location_type: "original", location_ref: tamperedAssetPath, metadata: {} });
  const tamperedAsset = host.applyCreativeSkill(skill("application-tampered-asset", 2, 0.7, localAsset.preset_id));
  assert.equal(tamperedAsset.status, "blocked");
  assert.equal(tamperedAsset.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_ASSET_MISSING"), true);
  assert.equal(host.status().timeline, "v2", "a mismatched content-addressed asset must not apply");

  const projectId = host.status().project;
  await putObjectAndRegister((host as any).session, projectId, Buffer.from("fault-injection"), { object_ref_id: `${projectId}:preset-application:application-fault`, object_type: "fault_injection", relation_key: "application-fault" });
  assert.throws(() => host.applyCreativeSkill(skill("application-fault", 2, 0.5)), /atomic artifact id conflict/);
  assert.equal(host.status().timeline, "v2", "an atomic persistence fault must roll back the Timeline commit");
  assert.equal(host.listPresetApplications().length, 8);
  assert.equal(host.undoTimeline().timeline, "v3");
  assert.equal(host.redoTimeline().timeline, "v4");
  assert.equal((host.readTimelineSnapshot() as any).tracks[0].clips[0].transform.x, 0.6);
  assert.equal(host.listPresetApplications().length, 8, "undo and redo must not erase immutable application provenance");
  await host.close();

  const reopened = new ProjectHostSession(hostOptions);
  await reopened.open(projectDirectory);
  assert.equal(reopened.status().timeline, "v4");
  const records = reopened.listPresetApplications() as readonly any[];
  assert.deepEqual(records.map((record) => record.value.status), ["applied", "blocked", "blocked", "blocked", "blocked", "blocked", "applied", "blocked"]);
  assert.equal(records[0].value.definition_pins[0].preset_id, "motion.static_transform");
  assert.equal(records[0].value.routing_decisions.every((decision: any) => decision.outcome === "execute"), true);
  await reopened.close();

  const migrationHost = new ProjectHostSession({ presetDefinitions: [migrationV1, migrationV2], trustedPresetDigests: [presetDigest(migrationV1), presetDigest(migrationV2)], presetLicenseStatuses: { "project-license": "approved" } });
  await migrationHost.create(migrationDirectory);
  migrationHost.initializeTimeline([{ track_id: "v1", kind: "video", clips: [{ clip_id: "clip-1", source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }]);
  const migrationSource = skill("application-migration-v1", 0, 0.2, migrationV1.preset_id);
  const migrationAppliedV1 = migrationHost.applyCreativeSkill(migrationSource);
  assert.equal(migrationAppliedV1.definition_pins[0].preset_version, 1);
  const migratedSelection = migratePresetSelection(migrationSource.selections[0], { preset_id: migrationV2.preset_id, preset_version: 2 }, new PresetRegistry([migrationV1, migrationV2]), (parameters) => ({ ...parameters, x: 0.8 }));
  const migrationAppliedV2 = migrationHost.applyCreativeSkill({ ...migrationSource, application_id: "application-migration-v2", base_timeline_version: 1, selections: [migratedSelection] });
  assert.equal(migrationAppliedV2.status, "applied");
  assert.equal(migrationAppliedV2.final_timeline_version, 2);
  assert.equal(migrationAppliedV2.definition_pins[0].preset_version, 2);
  assert.equal((migrationHost.readTimelineSnapshot() as any).tracks[0].clips[0].transform.x, 0.8);
  await migrationHost.close();
  const migrationReopened = new ProjectHostSession({ presetDefinitions: [migrationV1, migrationV2], trustedPresetDigests: [presetDigest(migrationV1), presetDigest(migrationV2)], presetLicenseStatuses: { "project-license": "approved" } });
  await migrationReopened.open(migrationDirectory);
  assert.deepEqual((migrationReopened.listPresetApplications() as readonly any[]).map((record) => record.value.definition_pins[0].preset_version), [1, 2]);
  await migrationReopened.close();
} finally {
  if (typeof global.gc === "function") global.gc();
  await new Promise((done) => setTimeout(done, 50));
  await rm(projectDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(migrationDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

console.log("preset host integration check passed");
