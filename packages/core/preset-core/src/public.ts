import { createHash } from "node:crypto";
import { compileBasicVlogPreset, type ClipBoundaryFades, type DialogueMusicDucking, type MasterLoudnessNormalization, type StaticReframe, type TimelineCommand, type Transform } from "../../timeline-core/src/public.js";
import type { CreativeSkillOutputV1 } from "../../../../contracts/generated/typescript/preset/creative-skill-output.v1.js";
import type { PresetDefinitionV1 } from "../../../../contracts/generated/typescript/preset/preset-definition.v1.js";
import type { PresetSelectionV1 } from "../../../../contracts/generated/typescript/preset/preset-selection.v1.js";

type DeepReadonly<T> = T extends (...args: never[]) => unknown ? T : T extends readonly (infer Item)[] ? readonly DeepReadonly<Item>[] : T extends object ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> } : T;
export type PresetDefinition = DeepReadonly<PresetDefinitionV1>;
export type PresetSelection = DeepReadonly<PresetSelectionV1>;
export type CreativeSkillOutput = DeepReadonly<CreativeSkillOutputV1>;
export type PresetCategory = PresetDefinition["category"];
export type PresetScalar = PresetSelection["parameters"][string];
export type PresetParameterSpec = PresetDefinition["parameter_schema"][number];
export type PresetParameterType = PresetParameterSpec["type"];
export type PresetInputSlot = PresetDefinition["input_slots"][number];
export type PresetSemanticNode = PresetDefinition["semantic_nodes"][number];
export type PresetAssetRequirement = PresetDefinition["assets"][number];
export type PresetLicense = PresetDefinition["license"];
export type PresetTargetCapability = Readonly<{ preview: boolean; master: boolean }>;
export type PresetResolutionContext = Readonly<{
  trusted_definition_digests: ReadonlySet<string>;
  revoked_definition_digests: ReadonlySet<string>;
  license_statuses: ReadonlyMap<string, "unknown" | "pending" | "approved" | "expired" | "revoked">;
  available_asset_ids: ReadonlySet<string>;
  trusted_bake_asset_ids: ReadonlySet<string>;
  capabilities: ReadonlyMap<string, PresetTargetCapability>;
  aspect_ratio?: string;
  timeline_duration?: Readonly<{ value: bigint; timescale: bigint }>;
}>;
export type PresetRoutingDecision = Readonly<{ selection_id: string; semantic_id: string; capability: string; target: "preview" | "master"; outcome: "execute" | "fallback" | "bake" | "block"; detail?: string }>;
export type PresetPolicyDecision = Readonly<{ selection_id: string; policy: "trust" | "license" | "asset" | "aspect_ratio" | "duration"; subject: string; outcome: "approved" | "blocked"; detail: string }>;
export type PresetDiagnostic = Readonly<{ code: string; message: string; selection_id?: string }>;
export type PresetDefinitionPin = Readonly<{ preset_id: string; preset_version: number; definition_digest: string }>;
export type ResolvedPresetSelection = Readonly<{ selection_id: string; definition: PresetDefinitionPin; parameters: Readonly<Record<string, PresetScalar>>; bindings: Readonly<Record<string, string>> }>;
export type PresetResolution = Readonly<{
  status: "ready" | "blocked";
  application_id: string;
  base_timeline_version: number;
  definition_pins: readonly PresetDefinitionPin[];
  resolved_selections: readonly ResolvedPresetSelection[];
  routing_decisions: readonly PresetRoutingDecision[];
  policy_decisions: readonly PresetPolicyDecision[];
  commands: readonly TimelineCommand[];
  diagnostics: readonly PresetDiagnostic[];
  selection_hash: string;
  command_hash: string;
  semantic_expectation_hash: string;
}>;

export type PresetCompilerCommand = Extract<TimelineCommand, Readonly<{ type: "set_transform" | "set_static_reframe" | "set_clip_boundary_fades" | "set_master_loudness" | "set_dialogue_music_ducking" }>>;
type PresetCompiler = (selection: ResolvedPresetSelection) => readonly PresetCompilerCommand[];
type RegistryEntry = Readonly<{ definition: PresetDefinition; digest: string }>;

function canonicalValue(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("PRESET_NON_FINITE_NUMBER");
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === "bigint") return { $ave_bigint: value.toString(10) };
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value as Record<string, unknown>).filter((key) => (value as Record<string, unknown>)[key] !== undefined).sort().map((key) => [key, canonicalValue((value as Record<string, unknown>)[key])]));
  throw new Error(`PRESET_UNSUPPORTED_VALUE:${typeof value}`);
}

function deepImmutableCopy<T>(value: T): T {
  if (Array.isArray(value)) return Object.freeze(value.map((item) => deepImmutableCopy(item))) as T;
  if (value && typeof value === "object") return Object.freeze(Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, deepImmutableCopy(item)]))) as T;
  return value;
}

export function canonicalPresetPayload(value: unknown): string { return JSON.stringify(canonicalValue(value)); }
export function presetDigest(value: unknown): string { return createHash("sha256").update(canonicalPresetPayload(value)).digest("hex"); }

function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function keyFor(presetId: string, presetVersion: number): string { return `${presetId}@${presetVersion}`; }

function validateParameterValue(spec: PresetParameterSpec, value: PresetScalar): boolean {
  if (spec.type === "boolean" && typeof value !== "boolean") return false;
  if ((spec.type === "number" || spec.type === "integer") && !finite(value)) return false;
  if (spec.type === "integer" && (!Number.isInteger(value) || !Number.isSafeInteger(value))) return false;
  if (spec.type === "string" && typeof value !== "string") return false;
  if (typeof value === "number" && (spec.minimum !== undefined && value < spec.minimum || spec.maximum !== undefined && value > spec.maximum)) return false;
  if (spec.type === "enum" && (!spec.values || !spec.values.some((candidate) => Object.is(candidate, value)))) return false;
  return true;
}

function validateDefinition(definition: PresetDefinition): void {
  const parameterIds = new Set<string>();
  for (const parameter of definition.parameter_schema) {
    if (parameterIds.has(parameter.parameter_id)) throw new Error("PRESET_PARAMETER_SCHEMA_DUPLICATE");
    parameterIds.add(parameter.parameter_id);
    if (parameter.minimum !== undefined && parameter.maximum !== undefined && parameter.minimum > parameter.maximum) throw new Error("PRESET_PARAMETER_SCHEMA_INVALID");
    if (parameter.type === "enum" && (!Array.isArray(parameter.values) || parameter.values.length === 0)) throw new Error("PRESET_PARAMETER_SCHEMA_INVALID");
    if (parameter.default !== undefined && !validateParameterValue(parameter, parameter.default)) throw new Error("PRESET_PARAMETER_DEFAULT_INVALID");
  }
  const slotIds = new Set<string>();
  for (const slot of definition.input_slots) { if (slotIds.has(slot.slot_id)) throw new Error("PRESET_INPUT_SCHEMA_DUPLICATE"); slotIds.add(slot.slot_id); }
  const semanticIds = new Set<string>();
  for (const node of definition.semantic_nodes) {
    if (semanticIds.has(node.semantic_id)) throw new Error("PRESET_SEMANTIC_SCHEMA_DUPLICATE");
    semanticIds.add(node.semantic_id);
    if (node.unsupported_route !== "block" && !node.route_detail) throw new Error("PRESET_ROUTE_DETAIL_REQUIRED");
  }
  for (const node of definition.semantic_nodes) if ((node.depends_on ?? []).some((dependency: string) => !semanticIds.has(dependency) || dependency === node.semantic_id)) throw new Error("PRESET_SEMANTIC_DEPENDENCY_INVALID");
  const dependencies = new Map(definition.semantic_nodes.map((node) => [node.semantic_id, node.depends_on ?? []]));
  const visit = (id: string, active: Set<string>, complete: Set<string>): void => { if (active.has(id)) throw new Error("PRESET_SEMANTIC_DEPENDENCY_CYCLE"); if (complete.has(id)) return; active.add(id); for (const dependency of dependencies.get(id) ?? []) visit(dependency, active, complete); active.delete(id); complete.add(id); };
  const complete = new Set<string>(); for (const id of semanticIds) visit(id, new Set(), complete);
  if (definition.license.attribution_required && !definition.license.attribution_text) throw new Error("PRESET_LICENSE_ATTRIBUTION_REQUIRED");
  for (const node of definition.semantic_nodes) if (node.unsupported_route === "bake" && !definition.assets.some((asset) => asset.asset_id === node.route_detail)) throw new Error("PRESET_BAKE_ASSET_UNDECLARED");
}

function resolveParameters(definition: PresetDefinition, selection: PresetSelection): Readonly<Record<string, PresetScalar>> {
  const schema = new Map(definition.parameter_schema.map((parameter) => [parameter.parameter_id, parameter]));
  if (Object.keys(selection.parameters).some((key) => !schema.has(key))) throw new Error("PRESET_PARAMETER_UNKNOWN");
  const result: Record<string, PresetScalar> = {};
  for (const parameter of definition.parameter_schema) {
    const value = Object.prototype.hasOwnProperty.call(selection.parameters, parameter.parameter_id) ? selection.parameters[parameter.parameter_id] : parameter.default;
    if (value === undefined) { if (parameter.required) throw new Error("PRESET_PARAMETER_REQUIRED"); continue; }
    if (!validateParameterValue(parameter, value)) throw new Error("PRESET_PARAMETER_INVALID");
    result[parameter.parameter_id] = value;
  }
  return Object.freeze(result);
}

function resolveBindings(definition: PresetDefinition, selection: PresetSelection): Readonly<Record<string, string>> {
  const slots = new Map(definition.input_slots.map((slot) => [slot.slot_id, slot]));
  if (Object.keys(selection.bindings).some((key) => !slots.has(key))) throw new Error("PRESET_BINDING_UNKNOWN");
  for (const value of Object.values(selection.bindings)) if (typeof value !== "string" || value.length === 0) throw new Error("PRESET_BINDING_INVALID");
  for (const slot of definition.input_slots) if (slot.required && !selection.bindings[slot.slot_id]) throw new Error("PRESET_BINDING_REQUIRED");
  return Object.freeze({ ...selection.bindings });
}

function ratioAtLeast(actual: Readonly<{ value: bigint; timescale: bigint }>, minimum: Readonly<{ schema_version: 1; value: number; timescale: number }>): boolean { return actual.value * BigInt(minimum.timescale) >= BigInt(minimum.value) * actual.timescale; }

function evaluatePolicy(entry: RegistryEntry, context: PresetResolutionContext, selectionId: string): Readonly<{ decisions: PresetPolicyDecision[]; diagnostics: PresetDiagnostic[] }> {
  const diagnostics: PresetDiagnostic[] = [];
  const decisions: PresetPolicyDecision[] = [];
  const block = (policy: PresetPolicyDecision["policy"], subject: string, code: string, message: string): void => { decisions.push({ selection_id: selectionId, policy, subject, outcome: "blocked", detail: code }); diagnostics.push({ code, message, selection_id: selectionId }); };
  if (context.revoked_definition_digests.has(entry.digest)) block("trust", entry.digest, "PRESET_DEFINITION_REVOKED", "Preset definition is revoked");
  else if (entry.definition.trust_source === "marketplace") block("trust", entry.digest, "PRESET_MARKETPLACE_QUARANTINED", "Marketplace Presets are quarantined");
  else if (entry.definition.trust_source === "project_local" && !context.trusted_definition_digests.has(entry.digest)) block("trust", entry.digest, "PRESET_DEFINITION_UNTRUSTED", "Project-local Preset digest is not trusted by Project Host");
  else decisions.push({ selection_id: selectionId, policy: "trust", subject: entry.digest, outcome: "approved", detail: entry.definition.trust_source });
  const licenses = new Set([entry.definition.license.license_id, ...entry.definition.assets.map((asset) => asset.license_id)]);
  for (const licenseId of licenses) {
    const status = context.license_statuses.get(licenseId) ?? "unknown";
    if (status !== "approved") block("license", licenseId, "PRESET_LICENSE_NOT_APPROVED", `License is not approved: ${licenseId} (${status})`);
    else decisions.push({ selection_id: selectionId, policy: "license", subject: licenseId, outcome: "approved", detail: status });
  }
  for (const asset of entry.definition.assets) {
    const available = context.available_asset_ids.has(asset.asset_id);
    if (asset.required && !available) block("asset", asset.asset_id, "PRESET_ASSET_MISSING", `Preset asset is unavailable: ${asset.asset_id}`);
    else decisions.push({ selection_id: selectionId, policy: "asset", subject: asset.asset_id, outcome: "approved", detail: available ? "available" : "optional-missing" });
  }
  if (!entry.definition.aspect_ratios.includes("any")) {
    if (!context.aspect_ratio || !entry.definition.aspect_ratios.includes(context.aspect_ratio)) block("aspect_ratio", context.aspect_ratio ?? "unknown", "PRESET_ASPECT_UNSUPPORTED", `Preset does not support aspect ratio ${context.aspect_ratio ?? "unknown"}`);
    else decisions.push({ selection_id: selectionId, policy: "aspect_ratio", subject: context.aspect_ratio, outcome: "approved", detail: "supported" });
  }
  if (entry.definition.minimum_duration) {
    if (!context.timeline_duration || !ratioAtLeast(context.timeline_duration, entry.definition.minimum_duration)) block("duration", "timeline", "PRESET_DURATION_TOO_SHORT", "Timeline duration is unavailable or shorter than the Preset minimum duration");
    else decisions.push({ selection_id: selectionId, policy: "duration", subject: "timeline", outcome: "approved", detail: "minimum-satisfied" });
  }
  return { decisions, diagnostics };
}

function route(entry: RegistryEntry, context: PresetResolutionContext, selectionId: string): PresetRoutingDecision[] {
  const nodes = new Map(entry.definition.semantic_nodes.map((node) => [node.semantic_id, node]));
  const decisions = new Map<string, PresetRoutingDecision>();
  const decide = (semanticId: string, target: "preview" | "master"): PresetRoutingDecision => {
    const key = `${target}:${semanticId}`;
    const cached = decisions.get(key);
    if (cached) return cached;
    const node = nodes.get(semanticId)!;
    const dependencyBlocked = (node.depends_on ?? []).map((dependency) => decide(dependency, target)).find((decision) => decision.outcome === "block");
    let decision: PresetRoutingDecision;
    if (dependencyBlocked) decision = { selection_id: selectionId, semantic_id: node.semantic_id, capability: node.capability, target, outcome: "block", detail: `PRESET_SEMANTIC_DEPENDENCY_BLOCKED:${dependencyBlocked.semantic_id}` };
    else if (target === "preview" && entry.definition.preview_policy.mode === "block") decision = { selection_id: selectionId, semantic_id: node.semantic_id, capability: node.capability, target, outcome: "block", detail: "PRESET_PREVIEW_POLICY_BLOCKED" };
    else if (context.capabilities.get(node.capability)?.[target]) decision = { selection_id: selectionId, semantic_id: node.semantic_id, capability: node.capability, target, outcome: "execute" };
    else if (node.unsupported_route === "fallback" && node.route_detail && context.capabilities.get(node.route_detail)?.[target]) decision = { selection_id: selectionId, semantic_id: node.semantic_id, capability: node.capability, target, outcome: "fallback", detail: node.route_detail };
    else if (node.unsupported_route === "bake") decision = { selection_id: selectionId, semantic_id: node.semantic_id, capability: node.capability, target, outcome: "block", detail: "PRESET_BAKE_EXECUTION_UNAVAILABLE" };
    else decision = { selection_id: selectionId, semantic_id: node.semantic_id, capability: node.capability, target, outcome: "block", detail: node.route_detail ?? `PRESET_CAPABILITY_UNAVAILABLE:${node.capability}` };
    decisions.set(key, decision);
    return decision;
  };
  return entry.definition.semantic_nodes.flatMap((node) => (["preview", "master"] as const).map((target) => decide(node.semantic_id, target)));
}

function numberParameter(selection: ResolvedPresetSelection, key: string): number { const value = selection.parameters[key]; if (typeof value !== "number") throw new Error(`PRESET_COMPILER_PARAMETER:${key}`); return value; }
function booleanParameter(selection: ResolvedPresetSelection, key: string): boolean { const value = selection.parameters[key]; if (typeof value !== "boolean") throw new Error(`PRESET_COMPILER_PARAMETER:${key}`); return value; }
function stringParameter(selection: ResolvedPresetSelection, key: string): string { const value = selection.parameters[key]; if (typeof value !== "string") throw new Error(`PRESET_COMPILER_PARAMETER:${key}`); return value; }
function binding(selection: ResolvedPresetSelection, key: string): string { const value = selection.bindings[key]; if (!value) throw new Error(`PRESET_COMPILER_BINDING:${key}`); return value; }

export function timelineCommandSemanticCapabilities(command: TimelineCommand): readonly string[] {
  switch (command.type) {
    case "set_transform": return ["timeline.transform"];
    case "set_static_reframe": return ["timeline.static_reframe"];
    case "set_clip_boundary_fades": return ["timeline.clip_fade"];
    case "set_master_loudness": return ["timeline.audio_master"];
    case "set_dialogue_music_ducking": return ["timeline.audio_mix"];
    default: throw new Error(`PRESET_COMPILER_COMMAND_FORBIDDEN:${String(command.type)}`);
  }
}

const compilers: ReadonlyMap<string, PresetCompiler> = new Map<string, PresetCompiler>([
  ["timeline.static_transform.v1", (selection) => {
    const transform: Transform = { x: numberParameter(selection, "x"), y: numberParameter(selection, "y"), scale_x: numberParameter(selection, "scale_x"), scale_y: numberParameter(selection, "scale_y"), rotation: numberParameter(selection, "rotation"), opacity: numberParameter(selection, "opacity"), fit: stringParameter(selection, "fit") as Transform["fit"] };
    return [{ type: "set_transform", track_id: binding(selection, "track_id"), clip_id: binding(selection, "clip_id"), transform }];
  }],
  ["timeline.master_loudness.v1", (selection) => [{ type: "set_master_loudness", normalization: { schema_version: 1, enabled: booleanParameter(selection, "enabled"), target_lufs: numberParameter(selection, "target_lufs"), true_peak_db: numberParameter(selection, "true_peak_db"), tolerance_lufs: numberParameter(selection, "tolerance_lufs") } }]],
  ["timeline.basic_vlog.v1", (selection) => {
    const fadeTimescale = BigInt(numberParameter(selection, "fade_timescale"));
    const duration = (key: string): Readonly<{ value: bigint; timescale: bigint }> | undefined => { const value = BigInt(numberParameter(selection, key)); return value > 0n ? { value, timescale: fadeTimescale } : undefined; };
    const reframe: StaticReframe = { schema_version: 1, mode: stringParameter(selection, "reframe_mode") as StaticReframe["mode"], focal_x: numberParameter(selection, "focal_x"), focal_y: numberParameter(selection, "focal_y") };
    const loudness: MasterLoudnessNormalization = { schema_version: 1, enabled: booleanParameter(selection, "loudness_enabled"), target_lufs: numberParameter(selection, "target_lufs"), true_peak_db: numberParameter(selection, "true_peak_db"), tolerance_lufs: numberParameter(selection, "tolerance_lufs") };
    const ducking: DialogueMusicDucking = { schema_version: 1, enabled: booleanParameter(selection, "ducking_enabled"), threshold_db: numberParameter(selection, "threshold_db"), ratio: numberParameter(selection, "ratio"), attack_ms: numberParameter(selection, "attack_ms"), release_ms: numberParameter(selection, "release_ms"), max_reduction_db: numberParameter(selection, "max_reduction_db") };
    const fades: ClipBoundaryFades = { schema_version: 1, ...(duration("video_fade_in") ? { video_fade_in: duration("video_fade_in") } : {}), ...(duration("video_fade_out") ? { video_fade_out: duration("video_fade_out") } : {}), ...(duration("audio_fade_in") ? { audio_fade_in: duration("audio_fade_in") } : {}), ...(duration("audio_fade_out") ? { audio_fade_out: duration("audio_fade_out") } : {}) };
    const trackId = binding(selection, "track_id"), clipId = binding(selection, "clip_id");
    return compileBasicVlogPreset({ schema_version: 1, preset_id: "basic_vertical_vlog", preset_version: 1, track_id: trackId, clip_id: clipId, reframe, loudness, ducking, fades }).map((command) => { timelineCommandSemanticCapabilities(command); return command as PresetCompilerCommand; });
  }]
]);
const compilerSemanticCapabilities: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["timeline.static_transform.v1", new Set(["timeline.transform"])],
  ["timeline.master_loudness.v1", new Set(["timeline.audio_master"])],
  ["timeline.basic_vlog.v1", new Set(["timeline.static_reframe", "timeline.clip_fade", "timeline.audio_mix", "timeline.audio_master"])]
]);

export const builtInPresetDefinitions: readonly PresetDefinition[] = deepImmutableCopy([
  {
    schema_version: 1, preset_id: "motion.static_transform", preset_version: 1, category: "motion", compiler_id: "timeline.static_transform.v1", trust_source: "built_in",
    parameter_schema: [
      { parameter_id: "x", type: "number", required: false, default: 0, minimum: -4, maximum: 4 }, { parameter_id: "y", type: "number", required: false, default: 0, minimum: -4, maximum: 4 },
      { parameter_id: "scale_x", type: "number", required: false, default: 1, minimum: 0.01, maximum: 100 }, { parameter_id: "scale_y", type: "number", required: false, default: 1, minimum: 0.01, maximum: 100 },
      { parameter_id: "rotation", type: "number", required: false, default: 0, minimum: -3600, maximum: 3600 }, { parameter_id: "opacity", type: "number", required: false, default: 1, minimum: 0, maximum: 1 },
      { parameter_id: "fit", type: "enum", required: false, default: "fit", values: ["fit", "fill", "stretch", "original"] }
    ],
    input_slots: [{ slot_id: "track_id", kind: "track", required: true }, { slot_id: "clip_id", kind: "clip", required: true }], semantic_nodes: [{ semantic_id: "transform", capability: "timeline.transform", unsupported_route: "block" }], aspect_ratios: ["any"], assets: [], license: { license_id: "ave-built-in", attribution_required: false }, preview_policy: { mode: "semantic_equivalent" }
  },
  {
    schema_version: 1, preset_id: "audio.master_loudness", preset_version: 1, category: "audio", compiler_id: "timeline.master_loudness.v1", trust_source: "built_in",
    parameter_schema: [{ parameter_id: "enabled", type: "boolean", required: false, default: true }, { parameter_id: "target_lufs", type: "number", required: false, default: -14, minimum: -70, maximum: -5 }, { parameter_id: "true_peak_db", type: "number", required: false, default: -1, minimum: -9, maximum: 0 }, { parameter_id: "tolerance_lufs", type: "number", required: false, default: 1, minimum: 0.01, maximum: 5 }],
    input_slots: [], semantic_nodes: [{ semantic_id: "master_loudness", capability: "timeline.audio_master", unsupported_route: "block" }], aspect_ratios: ["any"], assets: [], license: { license_id: "ave-built-in", attribution_required: false }, preview_policy: { mode: "semantic_equivalent" }
  },
  {
    schema_version: 1, preset_id: "basic_vertical_vlog", preset_version: 1, category: "composition", compiler_id: "timeline.basic_vlog.v1", trust_source: "built_in",
    parameter_schema: [
      { parameter_id: "reframe_mode", type: "enum", required: false, default: "blurred_background", values: ["crop_fill", "contain", "blurred_background"] }, { parameter_id: "focal_x", type: "number", required: false, default: 0.5, minimum: 0, maximum: 1 }, { parameter_id: "focal_y", type: "number", required: false, default: 0.5, minimum: 0, maximum: 1 },
      { parameter_id: "loudness_enabled", type: "boolean", required: false, default: true }, { parameter_id: "target_lufs", type: "number", required: false, default: -14, minimum: -70, maximum: -5 }, { parameter_id: "true_peak_db", type: "number", required: false, default: -1, minimum: -9, maximum: 0 }, { parameter_id: "tolerance_lufs", type: "number", required: false, default: 1, minimum: 0.01, maximum: 5 },
      { parameter_id: "ducking_enabled", type: "boolean", required: false, default: true }, { parameter_id: "threshold_db", type: "number", required: false, default: -30, minimum: -60, maximum: 0 }, { parameter_id: "ratio", type: "number", required: false, default: 8, minimum: 1, maximum: 20 }, { parameter_id: "attack_ms", type: "number", required: false, default: 20, minimum: 1, maximum: 2000 }, { parameter_id: "release_ms", type: "number", required: false, default: 350, minimum: 10, maximum: 5000 }, { parameter_id: "max_reduction_db", type: "number", required: false, default: 12, minimum: 0, maximum: 30 },
      { parameter_id: "fade_timescale", type: "integer", required: false, default: 30, minimum: 1 }, { parameter_id: "video_fade_in", type: "integer", required: false, default: 0, minimum: 0 }, { parameter_id: "video_fade_out", type: "integer", required: false, default: 0, minimum: 0 }, { parameter_id: "audio_fade_in", type: "integer", required: false, default: 0, minimum: 0 }, { parameter_id: "audio_fade_out", type: "integer", required: false, default: 0, minimum: 0 }
    ],
    input_slots: [{ slot_id: "track_id", kind: "track", required: true }, { slot_id: "clip_id", kind: "clip", required: true }],
    semantic_nodes: [{ semantic_id: "static_reframe", capability: "timeline.static_reframe", unsupported_route: "block" }, { semantic_id: "clip_fade", capability: "timeline.clip_fade", unsupported_route: "block" }, { semantic_id: "audio_mix", capability: "timeline.audio_mix", unsupported_route: "block" }, { semantic_id: "audio_master", capability: "timeline.audio_master", unsupported_route: "block" }],
    aspect_ratios: ["9:16"], assets: [], license: { license_id: "ave-built-in", attribution_required: false }, preview_policy: { mode: "semantic_equivalent" }
  }
]);

export class PresetRegistry {
  private readonly entries = new Map<string, RegistryEntry>();
  constructor(definitions: readonly PresetDefinition[] = []) { for (const definition of definitions) this.register(definition); }
  register(definition: PresetDefinition): PresetDefinitionPin {
    if (definition.trust_source === "built_in") throw new Error("PRESET_BUILT_IN_PROVENANCE_FORBIDDEN");
    return this.registerSnapshot(definition);
  }
  registerBuiltInForRepository(definition: PresetDefinition, authority: symbol): PresetDefinitionPin {
    if (authority !== repositoryBuiltInAuthority || definition.trust_source !== "built_in") throw new Error("PRESET_BUILT_IN_PROVENANCE_FORBIDDEN");
    return this.registerSnapshot(definition);
  }
  private registerSnapshot(definition: PresetDefinition): PresetDefinitionPin {
    const snapshot = deepImmutableCopy(definition);
    validateDefinition(snapshot);
    const digest = presetDigest(snapshot), key = keyFor(snapshot.preset_id, snapshot.preset_version), existing = this.entries.get(key);
    if (existing && existing.digest !== digest) throw new Error("PRESET_VERSION_DIGEST_CONFLICT");
    if (!existing) this.entries.set(key, Object.freeze({ definition: snapshot, digest }));
    return { preset_id: snapshot.preset_id, preset_version: snapshot.preset_version, definition_digest: digest };
  }
  find(presetId: string, presetVersion: number): RegistryEntry | undefined { const entry = this.entries.get(keyFor(presetId, presetVersion)); if (entry && presetDigest(entry.definition) !== entry.digest) throw new Error("PRESET_DEFINITION_DIGEST_MISMATCH"); return entry; }
  definitions(): readonly PresetDefinitionPin[] { return [...this.entries.values()].map((entry) => ({ preset_id: entry.definition.preset_id, preset_version: entry.definition.preset_version, definition_digest: entry.digest })); }
}

const repositoryBuiltInAuthority = Symbol("repository-built-in-preset-authority");
export function createBuiltInPresetRegistry(): PresetRegistry { const registry = new PresetRegistry(); for (const definition of builtInPresetDefinitions) registry.registerBuiltInForRepository(definition, repositoryBuiltInAuthority); return registry; }

export function resolveCreativeSkill(output: CreativeSkillOutput, registry: PresetRegistry, context: PresetResolutionContext): PresetResolution {
  const diagnostics: PresetDiagnostic[] = [], definitionPins: PresetDefinitionPin[] = [], resolvedSelections: ResolvedPresetSelection[] = [], routingDecisions: PresetRoutingDecision[] = [], policyDecisions: PresetPolicyDecision[] = [], commands: TimelineCommand[] = [];
  const selectionIds = new Set<string>();
  for (const candidate of output.selections) {
    const selectionId = candidate.selection_id;
    try {
      if (selectionIds.has(selectionId)) throw new Error("PRESET_SELECTION_DUPLICATE");
      selectionIds.add(selectionId);
      const entry = registry.find(candidate.preset_id, candidate.preset_version);
      if (!entry) throw new Error("PRESET_VERSION_UNAVAILABLE");
      const pin = { preset_id: entry.definition.preset_id, preset_version: entry.definition.preset_version, definition_digest: entry.digest };
      definitionPins.push(pin);
      const policy = evaluatePolicy(entry, context, candidate.selection_id); diagnostics.push(...policy.diagnostics); policyDecisions.push(...policy.decisions);
      const parameters = resolveParameters(entry.definition, candidate), bindings = resolveBindings(entry.definition, candidate);
      const resolved: ResolvedPresetSelection = { selection_id: candidate.selection_id, definition: pin, parameters, bindings };
      resolvedSelections.push(resolved);
      const decisions = route(entry, context, candidate.selection_id); routingDecisions.push(...decisions);
      for (const decision of decisions.filter((routeDecision) => routeDecision.outcome === "block")) diagnostics.push({ code: "PRESET_ROUTE_BLOCKED", message: decision.detail ?? `Capability unavailable: ${decision.capability}`, selection_id: candidate.selection_id });
      const compiler = compilers.get(entry.definition.compiler_id);
      if (!compiler) diagnostics.push({ code: "PRESET_COMPILER_UNAVAILABLE", message: `Compiler is unavailable: ${entry.definition.compiler_id}`, selection_id: candidate.selection_id });
      else {
        const compilerCapabilities = compilerSemanticCapabilities.get(entry.definition.compiler_id) ?? new Set<string>();
        const mismatch = decisions.find((decision) => decision.outcome !== "block" && !compilerCapabilities.has(decision.outcome === "fallback" ? decision.detail! : decision.capability));
        if (mismatch) diagnostics.push({ code: "PRESET_COMPILER_SEMANTIC_MISMATCH", message: `Compiler ${entry.definition.compiler_id} cannot produce routed capability ${mismatch.outcome === "fallback" ? mismatch.detail : mismatch.capability}`, selection_id: candidate.selection_id });
        if (diagnostics.every((diagnostic) => diagnostic.selection_id !== candidate.selection_id)) {
          const compiled = compiler(resolved);
          const actualCapabilities = new Set(compiled.flatMap((command) => timelineCommandSemanticCapabilities(command)));
          const authorizedCapabilities = new Set(decisions.filter((decision) => decision.outcome !== "block" && decision.outcome !== "bake").map((decision) => decision.outcome === "fallback" ? decision.detail! : decision.capability));
          const unattested = [...actualCapabilities].find((capability) => !compilerCapabilities.has(capability));
          const undeclared = [...actualCapabilities].find((capability) => !authorizedCapabilities.has(capability));
          if (unattested) diagnostics.push({ code: "PRESET_COMPILER_CAPABILITY_ATTESTATION_MISMATCH", message: `Compiler ${entry.definition.compiler_id} emitted unattested capability ${unattested}`, selection_id: candidate.selection_id });
          else if (undeclared) diagnostics.push({ code: "PRESET_COMPILER_UNDECLARED_EFFECT", message: `Compiler ${entry.definition.compiler_id} emitted undeclared capability ${undeclared}`, selection_id: candidate.selection_id });
          else commands.push(...compiled);
        }
      }
    } catch (error) { diagnostics.push({ code: error instanceof Error ? error.message.split(":", 1)[0] : "PRESET_SELECTION_INVALID", message: error instanceof Error ? error.message : "Preset selection failed", ...(selectionId ? { selection_id: selectionId } : {}) }); }
  }
  const blocked = diagnostics.length > 0;
  const selectionPayload = { schema_version: output.schema_version, application_id: output.application_id, skill_id: output.skill_id, skill_version: output.skill_version, base_timeline_version: output.base_timeline_version, composition_policy: output.composition_policy, selections: output.selections, resolved_selections: resolvedSelections };
  return Object.freeze({ status: blocked ? "blocked" : "ready", application_id: output.application_id, base_timeline_version: output.base_timeline_version, definition_pins: Object.freeze(definitionPins), resolved_selections: Object.freeze(resolvedSelections), routing_decisions: Object.freeze(routingDecisions), policy_decisions: Object.freeze(policyDecisions), commands: Object.freeze(blocked ? [] : commands), diagnostics: Object.freeze(diagnostics), selection_hash: presetDigest(selectionPayload), command_hash: presetDigest(blocked ? [] : commands), semantic_expectation_hash: presetDigest(resolvedSelections.map((selection) => ({ definition: selection.definition, semantic_nodes: registry.find(selection.definition.preset_id, selection.definition.preset_version)?.definition.semantic_nodes ?? [] }))) });
}

export function migratePresetSelection(selection: PresetSelection, target: Readonly<{ preset_id: string; preset_version: number }>, registry: PresetRegistry, migrate: (parameters: Readonly<Record<string, PresetScalar>>) => Readonly<Record<string, PresetScalar>>): PresetSelection {
  if (!registry.find(selection.preset_id, selection.preset_version) || !registry.find(target.preset_id, target.preset_version)) throw new Error("PRESET_MIGRATION_VERSION_UNAVAILABLE");
  const migrated = { ...selection, preset_id: target.preset_id, preset_version: target.preset_version, parameters: migrate(selection.parameters) };
  if (migrated.preset_id === selection.preset_id && migrated.preset_version === selection.preset_version) throw new Error("PRESET_MIGRATION_NOOP");
  return Object.freeze(migrated);
}

export function compileBasicVlogSelection(selection: Readonly<{ schema_version: 1; preset_id: "basic_vertical_vlog"; preset_version: 1; track_id: string; clip_id: string; reframe: StaticReframe; loudness: MasterLoudnessNormalization; ducking: DialogueMusicDucking; fades: ClipBoundaryFades }>): readonly TimelineCommand[] {
  const registry = createBuiltInPresetRegistry();
  const value = (duration: Readonly<{ value: bigint; timescale: bigint }> | undefined): number => duration ? Number(duration.value) : 0;
  const timescales = [selection.fades.video_fade_in, selection.fades.video_fade_out, selection.fades.audio_fade_in, selection.fades.audio_fade_out].filter((duration): duration is Readonly<{ value: bigint; timescale: bigint }> => duration !== undefined).map((duration) => duration.timescale);
  if (timescales.some((timescale) => timescale !== (timescales[0] ?? 30n))) throw new Error("BASIC_VLOG_PRESET_FADE_TIMESCALE_MISMATCH");
  const output: CreativeSkillOutput = { schema_version: 1, application_id: "basic-vlog-compatibility", skill_id: "skill.basic_vertical_vlog.compatibility", skill_version: 1, base_timeline_version: 0, composition_policy: "ordered", selections: [{ schema_version: 1, selection_id: "basic-vlog", preset_id: "basic_vertical_vlog", preset_version: 1, bindings: { track_id: selection.track_id, clip_id: selection.clip_id }, parameters: { reframe_mode: selection.reframe.mode, focal_x: selection.reframe.focal_x, focal_y: selection.reframe.focal_y, loudness_enabled: selection.loudness.enabled, target_lufs: selection.loudness.target_lufs, true_peak_db: selection.loudness.true_peak_db, tolerance_lufs: selection.loudness.tolerance_lufs, ducking_enabled: selection.ducking.enabled, threshold_db: selection.ducking.threshold_db, ratio: selection.ducking.ratio, attack_ms: selection.ducking.attack_ms, release_ms: selection.ducking.release_ms, max_reduction_db: selection.ducking.max_reduction_db, fade_timescale: Number(timescales[0] ?? 30n), video_fade_in: value(selection.fades.video_fade_in), video_fade_out: value(selection.fades.video_fade_out), audio_fade_in: value(selection.fades.audio_fade_in), audio_fade_out: value(selection.fades.audio_fade_out) } }] };
  const capabilities = new Map(builtInPresetDefinitions.flatMap((definition) => definition.semantic_nodes.map((node) => [node.capability, { preview: true, master: true }] as const)));
  const resolution = resolveCreativeSkill(output, registry, { trusted_definition_digests: new Set(), revoked_definition_digests: new Set(), license_statuses: new Map([["ave-built-in", "approved"]]), available_asset_ids: new Set(), trusted_bake_asset_ids: new Set(), capabilities, aspect_ratio: "9:16" });
  if (resolution.status !== "ready") throw new Error(resolution.diagnostics[0]?.code ?? "BASIC_VLOG_PRESET_INVALID");
  return resolution.commands;
}
