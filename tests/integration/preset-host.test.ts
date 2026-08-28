import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { ProjectHostSession as ProjectHostSessionType } from "../../packages/platform/project-host/src/public.js";
import { sourceRange } from "../../packages/core/media-identity/src/public.js";
import { createCommitPlan, type Timeline } from "../../packages/core/timeline-core/src/public.js";
import { builtInPresetDefinitions, PresetRegistry, presetDigest, type CreativeSkillOutput, type PresetDefinition } from "../../packages/core/preset-core/src/public.js";
import { commitTimelinePlan, putObjectAndRegister, registerAssetLocation } from "../../packages/platform/project-storage/src/public.js";

const mutableFs = fs as any;
const originalReadFileSync = mutableFs.readFileSync;
const originalStatSync = mutableFs.statSync;
let unrelatedFilesystemInspections = 0;
const trapUnrelated = (operation: (...args: any[]) => any) => (...args: any[]) => {
  if (String(args[0]).includes("unrelated-never-read-")) { unrelatedFilesystemInspections += 1; throw new Error("UNRELATED_ASSET_INSPECTED"); }
  return operation(...args);
};
mutableFs.readFileSync = trapUnrelated(originalReadFileSync);
mutableFs.statSync = trapUnrelated(originalStatSync);
syncBuiltinESMExports();
const { ProjectHostSession } = await import("../../packages/platform/project-host/src/public.js");

const projectDirectory = await mkdtemp(resolve(tmpdir(), "ave-preset-host-"));
const missingSourceDirectory = await mkdtemp(resolve(tmpdir(), "ave-preset-missing-source-"));
const proxyOnlyDirectory = await mkdtemp(resolve(tmpdir(), "ave-preset-proxy-only-"));
const mutedAudioDirectory = await mkdtemp(resolve(tmpdir(), "ave-preset-muted-audio-"));
const soloAudioDirectory = await mkdtemp(resolve(tmpdir(), "ave-preset-solo-audio-"));
const proxyAudioMismatchDirectory = await mkdtemp(resolve(tmpdir(), "ave-preset-proxy-audio-mismatch-"));
const duplicateRoutingDirectory = await mkdtemp(resolve(tmpdir(), "ave-preset-duplicate-routing-"));
const sourceBytes = Buffer.from("authoritative-preset-source", "utf8");
const asset = `asset:sha256:${createHash("sha256").update(sourceBytes).digest("hex")}` as any;
const marketplace: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "marketplace.motion.host", trust_source: "marketplace", license: { license_id: "market-license", attribution_required: true, attribution_text: "Motion by Vendor" } };
const localFallback: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "local.motion.host_fallback", trust_source: "project_local", semantic_nodes: [{ semantic_id: "premium-transform", capability: "premium.transform", unsupported_route: "fallback", route_detail: "timeline.transform" }], license: { license_id: "project-license", attribution_required: false } };
const semanticForgery: PresetDefinition = { ...localFallback, preset_id: "local.motion.host_semantic_forgery", semantic_nodes: [{ semantic_id: "premium-transform", capability: "premium.transform", unsupported_route: "fallback", route_detail: "timeline.audio" }] };
const requiredAssetId = `asset:sha256:${"f".repeat(64)}`;
const localAsset: PresetDefinition = { ...builtInPresetDefinitions[0], preset_id: "local.motion.host_asset", trust_source: "project_local", assets: [{ asset_id: requiredAssetId, license_id: "asset-license", required: true }], license: { license_id: "project-license", attribution_required: false } };
const hiddenEffectsDefinition: PresetDefinition = { ...builtInPresetDefinitions[2], preset_id: "local.basic_vlog.host_hidden_effects", trust_source: "project_local", semantic_nodes: [{ semantic_id: "static_reframe", capability: "timeline.static_reframe", unsupported_route: "block" }], license: { license_id: "project-license", attribution_required: false } };
const skill = (applicationId: string, baseVersion: number, x = 0.25, presetId = "motion.static_transform", fit = "fit"): CreativeSkillOutput => ({ schema_version: 1, application_id: applicationId, skill_id: "skill.motion", skill_version: 1, base_timeline_version: baseVersion, composition_policy: "ordered", selections: [{ schema_version: 1, selection_id: "selection-motion", preset_id: presetId, preset_version: 1, parameters: { x, fit }, bindings: { track_id: "v1", clip_id: "clip-1" } }] });
const registerVerifiedLocation = async (host: ProjectHostSessionType, assetId: string, locationRef: string, locationType: "original" | "proxy" = "original", hasAudio = false, proxyMap?: unknown): Promise<void> => {
  const info = await stat(locationRef);
  const digest = createHash("sha256").update(await readFile(locationRef)).digest("hex");
  registerAssetLocation((host as any).session, host.status().project, { asset_location_id: `${host.status().project}:${assetId}:${locationType}:${digest.slice(0, 8)}`, asset_id: assetId, location_type: locationType, location_ref: locationRef, verified_at: new Date().toISOString(), metadata: { verification_status: "verified", ...(locationType === "proxy" ? { source_asset_id: assetId } : {}), fingerprint: { algorithm: "sha256", digest, byte_length: info.size }, file_stat: { size: info.size, mtime_ms: info.mtimeMs }, probe: { streams: hasAudio ? [{ codec_type: "audio" }] : [{ codec_type: "video" }] }, ...(proxyMap ? { proxy_map: proxyMap } : {}) } });
};

try {
  assert.throws(() => new ProjectHostSession({ presetDefinitions: [{ ...builtInPresetDefinitions[0], preset_id: "forged.host_builtin" }] }), /PRESET_BUILT_IN_PROVENANCE_FORBIDDEN/);
  const hostOptions = { presetDefinitions: [marketplace, localFallback, semanticForgery, localAsset, hiddenEffectsDefinition], trustedPresetDigests: [presetDigest(localFallback), presetDigest(semanticForgery), presetDigest(localAsset), presetDigest(hiddenEffectsDefinition)], presetLicenseStatuses: { "market-license": "approved" as const, "project-license": "approved" as const, "asset-license": "approved" as const } };
  const host = new ProjectHostSession(hostOptions);
  await host.create(projectDirectory);
  const sourcePath = resolve(projectDirectory, "source.bin");
  await writeFile(sourcePath, sourceBytes);
  await registerVerifiedLocation(host, asset, sourcePath);
  const sourceProxyPath = resolve(projectDirectory, "source-proxy.bin");
  await writeFile(sourceProxyPath, "authoritative-preset-proxy", "utf8");
  await registerVerifiedLocation(host, asset, sourceProxyPath, "proxy", false, { schema_version: 1, original_timebase: "30", proxy_timebase: "60", segments: [{ original_start: { value: "0", timescale: "30" }, original_end: { value: "30", timescale: "30" }, proxy_start: { value: "0", timescale: "60" }, proxy_end: { value: "60", timescale: "60" } }] });
  for (let index = 0; index < 64; index += 1) registerAssetLocation((host as any).session, host.status().project, { asset_location_id: `unrelated-${index}`, asset_id: `asset:sha256:${index.toString(16).padStart(64, "0")}`, location_type: "original", location_ref: resolve(projectDirectory, `unrelated-never-read-${index}.mov`), metadata: {} });
  host.initializeTimeline([{ track_id: "v1", kind: "video", clips: [{ clip_id: "clip-1", source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }]);
  const applied = host.applyCreativeSkill(skill("application-applied", 0));
  assert.equal(applied.status, "applied");
  assert.equal(applied.final_timeline_version, 1);
  assert.ok(applied.render_validation?.semantic_graph_hash);
  assert.ok(applied.render_validation?.source_identity_hash);
  assert.match(applied.render_validation!.preview_plan_id, /^plan-preview-/);
  assert.match(applied.render_validation!.master_plan_id, /^plan-master-/);
  assert.notEqual(applied.render_validation!.preview_plan_id, applied.render_validation!.master_plan_id);
  assert.equal(applied.render_validation?.preview_decisions.some((decision) => decision.capability === "source.proxy" && decision.outcome === "execute"), true);
  assert.equal(applied.render_validation?.master_decisions.some((decision) => decision.capability === "source.original" && decision.outcome === "execute"), true);
  assert.equal(unrelatedFilesystemInspections, 0, "an asset-free Preset must not inspect unrelated registered media paths");
  assert.deepEqual(applied.application_context, {});
  assert.equal(applied.render_validation?.preview_decisions.some((decision) => decision.capability === "timeline.transform" && decision.outcome === "execute"), true);
  assert.equal(applied.render_validation?.semantic_links.some((link) => link.target === "preview" && link.declared_capability === "timeline.transform" && link.actual_capability === "timeline.transform" && link.actual_node_ids.length > 0), true);
  assert.throws(() => host.applyCreativeSkill(skill("application-applied", 0, 0.25), { aspect_ratio: "9:16" }), /preset application id conflict/);
  assert.equal(host.status().timeline, "v1");
  assert.equal((host.readTimelineSnapshot() as any).tracks[0].clips[0].transform.x, 0.25);
  assert.equal(host.applyCreativeSkill(skill("application-applied", 0)).commit_plan_hash, applied.commit_plan_hash, "same application must be idempotent");
  assert.equal(host.status().timeline, "v1");
  assert.throws(() => host.applyCreativeSkill(skill("application-applied", 1, 0.75)), /preset application id conflict/);

  const hiddenEffects = host.applyCreativeSkill({ schema_version: 1, application_id: "application-hidden-effects", skill_id: "skill.hidden_effects", skill_version: 1, base_timeline_version: 1, composition_policy: "ordered", selections: [{ schema_version: 1, selection_id: "selection-hidden-effects", preset_id: hiddenEffectsDefinition.preset_id, preset_version: 1, parameters: {}, bindings: { track_id: "v1", clip_id: "clip-1" } }] }, { aspect_ratio: "9:16" });
  assert.equal(hiddenEffects.status, "blocked");
  assert.equal(hiddenEffects.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_COMPILER_UNDECLARED_EFFECT"), true);
  assert.equal(host.status().timeline, "v1", "undeclared compiler effects must not mutate the Timeline");
  assert.throws(() => host.applyCreativeSkill({ ...skill("application-invalid-binding", 1), selections: [{ ...skill("application-invalid-binding", 1).selections[0], bindings: { track_id: 123 as any, clip_id: true as any } }] }), /CONTRACT_CREATIVE_SKILL_OUTPUT_INVALID/);
  assert.equal(host.status().timeline, "v1", "Contract-invalid bindings must fail before Timeline mutation");

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

  const noAudio = host.applyCreativeSkill({ schema_version: 1, application_id: "application-no-audio", skill_id: "skill.audio", skill_version: 1, base_timeline_version: 2, composition_policy: "ordered", selections: [{ schema_version: 1, selection_id: "selection-no-audio", preset_id: "audio.master_loudness", preset_version: 1, parameters: {}, bindings: {} }] });
  assert.equal(noAudio.status, "blocked");
  assert.equal(noAudio.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_AUDIO_SOURCE_UNAVAILABLE"), true);
  assert.equal(host.status().timeline, "v2");

  const mutedAudioHost = new ProjectHostSession();
  await mutedAudioHost.create(mutedAudioDirectory);
  const mutedSourceBytes = Buffer.from("verified-but-muted-audio-source", "utf8");
  const mutedAsset = `asset:sha256:${createHash("sha256").update(mutedSourceBytes).digest("hex")}`;
  const mutedSourcePath = resolve(mutedAudioDirectory, "muted-source.bin");
  await writeFile(mutedSourcePath, mutedSourceBytes);
  await registerVerifiedLocation(mutedAudioHost, mutedAsset, mutedSourcePath, "original", true);
  mutedAudioHost.initializeTimeline([{ track_id: "muted-video", kind: "video", muted: true, clips: [{ clip_id: "muted-clip", source: sourceRange(mutedAsset as any, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }]);
  const mutedAudio = mutedAudioHost.applyCreativeSkill({ schema_version: 1, application_id: "application-muted-audio", skill_id: "skill.audio", skill_version: 1, base_timeline_version: 0, composition_policy: "ordered", selections: [{ schema_version: 1, selection_id: "selection-muted-audio", preset_id: "audio.master_loudness", preset_version: 1, parameters: {}, bindings: {} }] });
  assert.equal(mutedAudio.status, "blocked");
  assert.equal(mutedAudio.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_AUDIO_SOURCE_UNAVAILABLE"), true);
  assert.equal(mutedAudioHost.status().timeline, "v0", "muted-only audio must block before Timeline mutation");
  await mutedAudioHost.close();

  const soloAudioHost = new ProjectHostSession();
  await soloAudioHost.create(soloAudioDirectory);
  const silentAssetBytes = Buffer.from("solo-silent-source", "utf8");
  const soloSilentAsset = `asset:sha256:${createHash("sha256").update(silentAssetBytes).digest("hex")}`;
  const soloSilentPath = resolve(soloAudioDirectory, "solo-silent.bin");
  const nonSoloAudioBytes = Buffer.from("non-solo-audio-source", "utf8");
  const nonSoloAudioAsset = `asset:sha256:${createHash("sha256").update(nonSoloAudioBytes).digest("hex")}`;
  const nonSoloAudioPath = resolve(soloAudioDirectory, "non-solo-audio.bin");
  await writeFile(soloSilentPath, silentAssetBytes); await writeFile(nonSoloAudioPath, nonSoloAudioBytes);
  await registerVerifiedLocation(soloAudioHost, soloSilentAsset, soloSilentPath, "original", false);
  await registerVerifiedLocation(soloAudioHost, nonSoloAudioAsset, nonSoloAudioPath, "original", true);
  soloAudioHost.initializeTimeline([{ track_id: "solo-video", kind: "video", solo: true, clips: [{ clip_id: "solo-silent-clip", source: sourceRange(soloSilentAsset as any, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }, { track_id: "non-solo-audio", kind: "audio", clips: [{ clip_id: "non-solo-audio-clip", media_kind: "audio", source: sourceRange(nonSoloAudioAsset as any, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }]);
  const soloAudio = soloAudioHost.applyCreativeSkill({ schema_version: 1, application_id: "application-solo-audio", skill_id: "skill.audio", skill_version: 1, base_timeline_version: 0, composition_policy: "ordered", selections: [{ schema_version: 1, selection_id: "selection-solo-audio", preset_id: "audio.master_loudness", preset_version: 1, parameters: {}, bindings: {} }] });
  assert.equal(soloAudio.status, "blocked");
  assert.equal(soloAudio.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_AUDIO_SOURCE_UNAVAILABLE"), true);
  assert.equal(soloAudioHost.status().timeline, "v0", "audio excluded by RenderGraph solo selection must not authorize audio semantics");
  await soloAudioHost.close();

  const proxyAudioMismatchHost = new ProjectHostSession();
  await proxyAudioMismatchHost.create(proxyAudioMismatchDirectory);
  const proxyMismatchOriginalBytes = Buffer.from("proxy-mismatch-original", "utf8");
  const proxyMismatchAsset = `asset:sha256:${createHash("sha256").update(proxyMismatchOriginalBytes).digest("hex")}`;
  const proxyMismatchOriginalPath = resolve(proxyAudioMismatchDirectory, "original.bin");
  const proxyMismatchProxyPath = resolve(proxyAudioMismatchDirectory, "proxy.bin");
  await writeFile(proxyMismatchOriginalPath, proxyMismatchOriginalBytes); await writeFile(proxyMismatchProxyPath, "proxy-without-audio", "utf8");
  await registerVerifiedLocation(proxyAudioMismatchHost, proxyMismatchAsset, proxyMismatchOriginalPath, "original", true);
  await registerVerifiedLocation(proxyAudioMismatchHost, proxyMismatchAsset, proxyMismatchProxyPath, "proxy", false, { schema_version: 1, original_timebase: "30", proxy_timebase: "30", segments: [{ original_start: { value: "0", timescale: "30" }, original_end: { value: "30", timescale: "30" }, proxy_start: { value: "0", timescale: "30" }, proxy_end: { value: "30", timescale: "30" } }] });
  proxyAudioMismatchHost.initializeTimeline([{ track_id: "v1", kind: "video", clips: [{ clip_id: "clip-1", source: sourceRange(proxyMismatchAsset as any, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }]);
  const proxyAudioMismatch = proxyAudioMismatchHost.applyCreativeSkill(skill("application-proxy-audio-mismatch", 0));
  assert.equal(proxyAudioMismatch.status, "blocked");
  assert.equal(proxyAudioMismatch.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_PROXY_AUDIO_MISMATCH"), true);
  assert.equal(proxyAudioMismatchHost.status().timeline, "v0", "target-divergent Proxy audio identity must fail closed");
  await proxyAudioMismatchHost.close();

  const duplicateRoutingHost = new ProjectHostSession();
  await duplicateRoutingHost.create(duplicateRoutingDirectory);
  const duplicateVideoBytes = Buffer.from("duplicate-routing-video", "utf8"), duplicateDialogueBytes = Buffer.from("duplicate-routing-dialogue", "utf8"), duplicateMusicBytes = Buffer.from("duplicate-routing-music", "utf8");
  const duplicateVideoAsset = `asset:sha256:${createHash("sha256").update(duplicateVideoBytes).digest("hex")}`, duplicateDialogueAsset = `asset:sha256:${createHash("sha256").update(duplicateDialogueBytes).digest("hex")}`, duplicateMusicAsset = `asset:sha256:${createHash("sha256").update(duplicateMusicBytes).digest("hex")}`;
  const duplicateVideoPath = resolve(duplicateRoutingDirectory, "video.bin"), duplicateDialoguePath = resolve(duplicateRoutingDirectory, "dialogue.bin"), duplicateMusicPath = resolve(duplicateRoutingDirectory, "music.bin");
  await writeFile(duplicateVideoPath, duplicateVideoBytes); await writeFile(duplicateDialoguePath, duplicateDialogueBytes); await writeFile(duplicateMusicPath, duplicateMusicBytes);
  await registerVerifiedLocation(duplicateRoutingHost, duplicateVideoAsset, duplicateVideoPath, "original", false); await registerVerifiedLocation(duplicateRoutingHost, duplicateDialogueAsset, duplicateDialoguePath, "original", true); await registerVerifiedLocation(duplicateRoutingHost, duplicateMusicAsset, duplicateMusicPath, "original", true);
  duplicateRoutingHost.initializeTimeline([{ track_id: "v1", kind: "video", clips: [{ clip_id: "clip-1", source: sourceRange(duplicateVideoAsset as any, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }, { track_id: "dialogue", kind: "audio", clips: [{ clip_id: "dialogue-clip", media_kind: "audio", source: sourceRange(duplicateDialogueAsset as any, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }], audio_routing: [{ routing_id: "dialogue-first", source_clip_id: "dialogue-clip", bus: "embedded" }, { routing_id: "dialogue-hidden", source_clip_id: "dialogue-clip", bus: "dialogue" }] }, { track_id: "music", kind: "audio", clips: [{ clip_id: "music-clip", media_kind: "audio", source: sourceRange(duplicateMusicAsset as any, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }], audio_routing: [{ routing_id: "music-first", source_clip_id: "music-clip", bus: "embedded" }, { routing_id: "music-hidden", source_clip_id: "music-clip", bus: "music" }] }]);
  const duplicateRouting = duplicateRoutingHost.applyCreativeSkill({ schema_version: 1, application_id: "application-duplicate-routing", skill_id: "skill.basic", skill_version: 1, base_timeline_version: 0, composition_policy: "ordered", selections: [{ schema_version: 1, selection_id: "selection-duplicate-routing", preset_id: "basic_vertical_vlog", preset_version: 1, parameters: { video_fade_in: 1, fade_timescale: 30 }, bindings: { track_id: "v1", clip_id: "clip-1" } }] }, { aspect_ratio: "9:16" });
  assert.equal(duplicateRouting.status, "blocked");
  assert.equal(duplicateRouting.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_DUCKING_INPUTS_UNAVAILABLE"), true);
  assert.equal(duplicateRoutingHost.status().timeline, "v0", "routing entries ignored by RenderGraph must not authorize Ducking");
  await duplicateRoutingHost.close();

  const storageSession = (host as any).session;
  const storageTimeline = host.readTimelineSnapshot() as Timeline;
  const storageDraft = createCommitPlan(storageTimeline, [{ type: "set_transform", track_id: "v1", clip_id: "clip-1", transform: { x: 0.61 } }]);
  const commitEventsBefore = (storageSession.db.prepare("SELECT COUNT(*) AS count FROM project_events WHERE event_type = 'timeline.commit_plan.committed'").get() as { count: number }).count;
  for (const reserved of ["object_ref_id", "object_type", "version", "relation_key", "byte_length"] as const) {
    const objectRefId = `${host.status().project}:reserved-metadata:${reserved}`;
    assert.throws(() => commitTimelinePlan(storageSession, host.status().project, storageDraft.timeline, storageDraft.plan, null, [{ object_ref_id: objectRefId, object_type: "test_artifact", version: storageDraft.timeline.version, relation_key: reserved, value: { reserved }, metadata: { [reserved]: reserved === "byte_length" || reserved === "version" ? 1 : `forged-${reserved}` } }]), /atomic artifact metadata field is reserved/);
    assert.equal((storageSession.db.prepare("SELECT COUNT(*) AS count FROM object_refs WHERE object_ref_id = ?").get(objectRefId) as { count: number }).count, 0);
  }
  assert.equal((storageSession.db.prepare("SELECT COUNT(*) AS count FROM project_events WHERE event_type = 'timeline.commit_plan.committed'").get() as { count: number }).count, commitEventsBefore);
  assert.equal((host.readTimelineSnapshot() as Timeline).version, 2, "reserved metadata must fail before Timeline publication");

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
  assert.equal(host.listPresetApplications().length, 10);
  assert.equal(host.undoTimeline().timeline, "v3");
  assert.equal(host.redoTimeline().timeline, "v4");
  assert.equal((host.readTimelineSnapshot() as any).tracks[0].clips[0].transform.x, 0.6);
  assert.equal(host.listPresetApplications().length, 10, "undo and redo must not erase immutable application provenance");
  await host.close();

  const reopened = new ProjectHostSession(hostOptions);
  await reopened.open(projectDirectory);
  assert.equal(reopened.status().timeline, "v4");
  const records = reopened.listPresetApplications() as readonly any[];
  assert.deepEqual(records.map((record) => record.value.status), ["applied", "blocked", "blocked", "blocked", "blocked", "blocked", "blocked", "applied", "blocked", "blocked"]);
  assert.equal(records[0].value.definition_pins[0].preset_id, "motion.static_transform");
  assert.equal(records[0].value.routing_decisions.every((decision: any) => decision.outcome === "execute"), true);
  await reopened.close();

  const missingSourceHost = new ProjectHostSession();
  await missingSourceHost.create(missingSourceDirectory);
  missingSourceHost.initializeTimeline([{ track_id: "v1", kind: "video", clips: [{ clip_id: "clip-1", source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }]);
  const missingSource = missingSourceHost.applyCreativeSkill(skill("application-missing-source", 0));
  assert.equal(missingSource.status, "blocked");
  assert.equal(missingSource.diagnostics.some((diagnostic) => diagnostic.code === "PRESET_RENDER_SOURCE_MISSING"), true);
  assert.equal(missingSourceHost.status().timeline, "v0");
  await missingSourceHost.close();

  const proxyOnlyHost = new ProjectHostSession();
  await proxyOnlyHost.create(proxyOnlyDirectory);
  const proxyPath = resolve(proxyOnlyDirectory, "proxy.bin");
  await writeFile(proxyPath, "derived-proxy", "utf8");
  await registerVerifiedLocation(proxyOnlyHost, asset, proxyPath, "proxy");
  proxyOnlyHost.initializeTimeline([{ track_id: "v1", kind: "video", clips: [{ clip_id: "clip-1", source: sourceRange(asset, 0n, 30n, 30n), timeline_start: 0n, timeline_duration: 30n }] }]);
  const proxyOnly = proxyOnlyHost.applyCreativeSkill(skill("application-proxy-only", 0));
  assert.equal(proxyOnly.status, "blocked");
  assert.equal(proxyOnly.diagnostics.some((diagnostic) => diagnostic.code === "MASTER_ORIGINAL_REQUIRED"), true);
  assert.equal(proxyOnly.diagnostics.some((diagnostic) => diagnostic.code === "PROXY_MAP_REQUIRED"), true);
  assert.equal(proxyOnlyHost.status().timeline, "v0");
  await proxyOnlyHost.close();
} finally {
  mutableFs.readFileSync = originalReadFileSync;
  mutableFs.statSync = originalStatSync;
  syncBuiltinESMExports();
  if (typeof global.gc === "function") global.gc();
  await new Promise((done) => setTimeout(done, 50));
  await rm(projectDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(missingSourceDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(proxyOnlyDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(mutedAudioDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(soloAudioDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(proxyAudioMismatchDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  await rm(duplicateRoutingDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

console.log("preset host integration check passed");
