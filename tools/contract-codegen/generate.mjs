import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import standaloneCode from "ajv/dist/standalone/index.js";
import { GENERATOR_VERSION, classNameFor, generatedRelativePaths, loadSchemas, root, schemaRef } from "./schema-utils.mjs";

const marker = "GENERATED FILE - DO NOT EDIT";
const generatedRoots = [
  "contracts/generated/typescript",
  "contracts/generated/python",
  "packages/platform/contract-runtime/src/generated",
];

async function listGeneratedFiles(relativeRoot) {
  const files = [];
  const visit = async (absoluteDirectory) => {
    let entries;
    try { entries = await readdir(absoluteDirectory, { withFileTypes: true }); } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const absolutePath = resolve(absoluteDirectory, entry.name);
      if (entry.isDirectory()) await visit(absolutePath);
      else if (entry.isFile()) files.push(relative(root, absolutePath).replaceAll("\\", "/"));
    }
  };
  await visit(resolve(root, relativeRoot));
  return files;
}

async function findOrphanedGeneratedFiles(expected) {
  const actual = (await Promise.all(generatedRoots.map(listGeneratedFiles))).flat();
  return actual.filter((relativePath) => !expected.has(relativePath)).sort();
}
const structuralJsonEqualRuntime = 'const $1 = function structuralJsonEqual(left, right) { const activePairs = new WeakMap(); const compare = (a, b) => { if (a === b) return true; if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false; const aIsArray = Array.isArray(a); if (aIsArray !== Array.isArray(b)) return false; let activeRights = activePairs.get(a); if (activeRights?.has(b)) return false; if (!activeRights) { activeRights = new WeakSet(); activePairs.set(a, activeRights); } activeRights.add(b); try { if (aIsArray) { if (a.length !== b.length) return false; for (let index = 0; index < a.length; index += 1) if (!compare(a[index], b[index])) return false; return true; } const aKeys = Object.keys(a); if (aKeys.length !== Object.keys(b).length) return false; for (const key of aKeys) if (!Object.prototype.hasOwnProperty.call(b, key) || !compare(a[key], b[key])) return false; return true; } finally { activeRights.delete(b); } }; return compare(left, right); };';
const presetRuntimeSchemaIds = [
  "https://ai-vlog.local/contracts/common/rational-time.v1.json",
  "https://ai-vlog.local/contracts/preset/preset-selection.v1.json",
  "https://ai-vlog.local/contracts/preset/creative-skill-output.v1.json",
  "https://ai-vlog.local/contracts/preset/preset-definition.v1.json",
  "https://ai-vlog.local/contracts/preset/preset-application-record.v1.json",
];
const creativeContextRuntimeSchemaIds = [
  "https://ai-vlog.local/contracts/editorial/creation-observation.v2.json",
  "https://ai-vlog.local/contracts/common/rational-time.v1.json",
  "https://ai-vlog.local/contracts/editorial/creative-contract.v2.json",
  "https://ai-vlog.local/contracts/editorial/material-evidence-pack.v1.json",
  "https://ai-vlog.local/contracts/editorial/creative-skill-definition.v1.json",
  "https://ai-vlog.local/contracts/editorial/skill-evaluation.v2.json",
  "https://ai-vlog.local/contracts/editorial/duration-blueprint.v1.json",
  "https://ai-vlog.local/contracts/editorial/duration-feasibility.v1.json",
  "https://ai-vlog.local/contracts/editorial/direction-card.v1.json",
  "https://ai-vlog.local/contracts/editorial/story-proposal.v2.json",
  "https://ai-vlog.local/contracts/editorial/approved-story-plan.v2.json",
  "https://ai-vlog.local/contracts/editorial/decision-record.v1.json",
  "https://ai-vlog.local/contracts/editorial/editorial-edit-intent.v1.json",
  "https://ai-vlog.local/contracts/editorial/feedback-diagnosis.v2.json",
  "https://ai-vlog.local/contracts/editorial/stage2-permission-request.v1.json",
  "https://ai-vlog.local/contracts/editorial/stage2-permission-policy-snapshot.v1.json",
  "https://ai-vlog.local/contracts/editorial/stage2-permission-decision.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-session.v1.json",
  "https://ai-vlog.local/contracts/editorial/creator-profile-store.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-plan.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-material.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-render.v1.json",
  "https://ai-vlog.local/contracts/worker/media-sample-request.v1.json",
  "https://ai-vlog.local/contracts/worker/media-sample-result.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-observation-output.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-learning-event.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-learning-decision.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-learning-result.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-learning-attempt.v1.json",
  "https://ai-vlog.local/contracts/qc/qc-report.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-draft-execution.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-decision.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-planning-exchange.v3.json",
  "https://ai-vlog.local/contracts/editorial/creation-planning-resume.v1.json",
  "https://ai-vlog.local/contracts/editorial/audio-resource-pack.v1.json",
  "https://ai-vlog.local/contracts/editorial/audio-source-measurement.v1.json",
  "https://ai-vlog.local/contracts/editorial/precision-edit.v1.json",
  "https://ai-vlog.local/contracts/editorial/audio-library-operation.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-observation-output.v2.json",
  "https://ai-vlog.local/contracts/editorial/creation-render-adaptation.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-render.v2.json",
  "https://ai-vlog.local/contracts/worker/media-still-proxy-request.v1.json",
  "https://ai-vlog.local/contracts/worker/media-still-proxy-result.v1.json",
  "https://ai-vlog.local/contracts/worker/media-preview-proxy-request.v1.json",
  "https://ai-vlog.local/contracts/worker/media-preview-proxy-result.v1.json",
  "https://ai-vlog.local/contracts/worker/media-scene-request.v2.json",
  "https://ai-vlog.local/contracts/worker/media-scene-result.v2.json",
  "https://ai-vlog.local/contracts/worker/media-probe-request.v2.json",
  "https://ai-vlog.local/contracts/worker/media-probe-result.v2.json",
  "https://ai-vlog.local/contracts/editorial/creation-audio-stream-root.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-audio-stream-chunk.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-audio-stream-call.v1.json",
  "https://ai-vlog.local/contracts/editorial/creation-audio-stream-settlement.v1.json",
];
const timelineAnnotationRuntimeSchemaIds = [
  "https://ai-vlog.local/contracts/editorial/timeline-annotation.v1.json",
  "https://ai-vlog.local/contracts/editorial/timeline-annotation-submit.v1.json",
  "https://ai-vlog.local/contracts/editorial/timeline-annotation-message.v1.json",
  "https://ai-vlog.local/contracts/editorial/timeline-annotation.v2.json",
  "https://ai-vlog.local/contracts/editorial/timeline-annotation-submit.v2.json",
  "https://ai-vlog.local/contracts/editorial/timeline-annotation-message.v2.json",
  "https://ai-vlog.local/contracts/editorial/timeline-annotation-submit.v3.json",
  "https://ai-vlog.local/contracts/editorial/timeline-annotation-message.v3.json",
  "https://ai-vlog.local/contracts/editorial/timeline-annotation-processing.v1.json",
];
const renderRuntimeSchemaIds = [
  "https://ai-vlog.local/contracts/render/capability-snapshot.v1.json",
  "https://ai-vlog.local/contracts/render/resolver-decision.v1.json",
  "https://ai-vlog.local/contracts/render/render-diagnostic.v1.json",
  "https://ai-vlog.local/contracts/render/render-execution-plan.v2.json",
  "https://ai-vlog.local/contracts/render/render-output-manifest.v2.json",
  "https://ai-vlog.local/contracts/render/render-segment-plan.v1.json",
  "https://ai-vlog.local/contracts/render/render-segment-result.v1.json",
];
const tsLiteral = (value) => typeof value === "string" ? JSON.stringify(value) : String(value);
function propertyName(name) { return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name); }
function nullable(type, schema) { return schema?.type && Array.isArray(schema.type) && schema.type.includes("null") ? `${type} | null` : type; }
function localRef(schema, ref) {
  if (!ref.startsWith("#/")) return null;
  return ref.slice(2).split("/").reduce((value, part) => value?.[part.replaceAll("~1", "/").replaceAll("~0", "~")], schema);
}

function tsType(schema, context, name) {
  if (!schema) return "unknown";
  if (schema.$ref) {
    const [document, fragment] = schema.$ref.split("#");
    const external = fragment && context.byId.get(document);
    if (external) {
      const target = localRef(external, `#${fragment}`);
      if (!target) throw new Error(`unresolved schema fragment: ${schema.$ref}`);
      return tsType(target, { ...context, currentSchema: external }, name);
    }
    const local = localRef(context.currentSchema, schema.$ref);
    return local ? tsType(local, context, name) : classNameFor(schemaRef(schema.$ref, context) ?? { title: schema.$ref.split("/").pop() });
  }
  if (schema.const !== undefined) return tsLiteral(schema.const);
  if (schema.enum) return schema.enum.map(tsLiteral).join(" | ");
  if (schema.oneOf || schema.anyOf) return (schema.oneOf ?? schema.anyOf).map((item, index) => tsType(item, context, `${name}Variant${index + 1}`)).join(" | ");
  if (Array.isArray(schema.type)) return schema.type.map((type) => tsType({ ...schema, type }, context, name)).join(" | ");
  if (schema.type === "string") return nullable("string", schema);
  if (schema.type === "integer" || schema.type === "number") return nullable("number", schema);
  if (schema.type === "boolean") return nullable("boolean", schema);
  if (schema.type === "null") return "null";
  if (schema.type === "array") return nullable(`Array<${tsType(schema.items ?? {}, context, `${name}Item`)}>`, schema);
  if (schema.type === "object" || schema.properties) {
    if (!schema.properties) return typeof schema.additionalProperties === "object" ? `Record<string, ${tsType(schema.additionalProperties, context, `${name}Value`)}>` : "Record<string, unknown>";
    return `{ ${Object.entries(schema.properties).map(([key, value]) => `${propertyName(key)}${(schema.required ?? []).includes(key) ? "" : "?"}: ${tsType(value, context, `${name}${classNameFor({ title: key })}`)};`).join(" ")} }`;
  }
  return "unknown";
}

function collectRefs(schema, result = new Set()) {
  if (!schema || typeof schema !== "object") return result;
  if (schema.$ref) result.add(schema.$ref);
  for (const value of Object.values(schema)) if (value && typeof value === "object") collectRefs(value, result);
  return result;
}
function expandSchemaReferences(value, context, document, fragmentsOnly = false, active = new Set()) {
  if (Array.isArray(value)) return value.map(item => expandSchemaReferences(item, context, document, fragmentsOnly, active));
  if (!value || typeof value !== "object") return value;
  if (value.$ref && (!fragmentsOnly || value.$ref.includes("#"))) {
    const [id, fragment] = value.$ref.split("#");
    const owner = id ? context.byId.get(id) : document;
    const target = fragment ? localRef(owner, `#${fragment}`) : owner;
    if (!target) throw new Error(`unresolved schema reference: ${value.$ref}`);
    const key = `${owner.$id ?? document.$id}#${fragment ?? ""}`;
    if (active.has(key)) throw new Error(`recursive schema expansion: ${key}`);
    const next = new Set(active); next.add(key);
    const { $ref: _ref, ...siblings } = value;
    return { ...expandSchemaReferences(target, context, owner, fragmentsOnly, next), ...expandSchemaReferences(siblings, context, document, fragmentsOnly, active) };
  }
  return Object.fromEntries(Object.entries(value).filter(([key]) => fragmentsOnly || (key !== "$id" && key !== "$schema")).map(([key, item]) => [key, expandSchemaReferences(item, context, document, fragmentsOnly, active)]));
}

function generateTs(schema, context, sourcePath, outputPath) {
  schema = expandSchemaReferences(schema, context, schema, true);
  const schemaContext = { ...context, currentSchema: schema };
  const className = classNameFor(schema);
  const imports = [];
  for (const ref of collectRefs(schema)) {
    const target = context.schemas.find((schemaInfo) => schemaInfo.value.$id === ref);
    if (!target) continue;
    const targetPath = generatedRelativePaths(target).ts;
    let importPath = targetPath.slice("contracts/generated/typescript/".length).replace(/\.ts$/, ".js");
    const currentPath = outputPath.slice("contracts/generated/typescript/".length);
    const currentDirectory = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/")) : ".";
    const depth = currentDirectory === "." ? 0 : currentDirectory.split("/").length;
    importPath = `${"../".repeat(depth)}${importPath}`;
    if (!importPath.startsWith(".")) importPath = `./${importPath}`;
    imports.push(`import type { ${classNameFor(target.value)} } from ${JSON.stringify(importPath)};`);
  }
  const lines = [`// ${marker}`, `// Source: ${sourcePath}`, `// Generator: ${GENERATOR_VERSION}`, ...imports, ""];
  if (!schema.properties && (schema.oneOf || schema.anyOf)) {
    lines.push(`export type ${className} = ${tsType(schema, schemaContext, className)};`, "");
    return lines.join("\n");
  }
  lines.push(`export interface ${className} {`);
  for (const [key, value] of Object.entries(schema.properties ?? {})) {
    const required = (schema.required ?? []).includes(key);
    lines.push(`  ${propertyName(key)}${required ? "" : "?"}: ${tsType(value, schemaContext, `${className}${classNameFor({ title: key })}`)};`);
  }
  lines.push("}", "");
  return lines.join("\n");
}

function pyLiteral(value) { return typeof value === "string" ? JSON.stringify(value) : value === null ? "None" : String(value).toLowerCase(); }
function pyType(schema, context, name) {
  if (!schema) return "Any";
  if (schema.$ref) {
    const [document, fragment] = schema.$ref.split("#");
    const external = fragment && context.byId.get(document);
    if (external) {
      const target = localRef(external, `#${fragment}`);
      if (!target) throw new Error(`unresolved schema fragment: ${schema.$ref}`);
      return pyType(target, { ...context, currentSchema: external }, name);
    }
    const local = localRef(context.currentSchema, schema.$ref);
    return local ? pyType(local, context, name) : classNameFor(schemaRef(schema.$ref, context) ?? { title: schema.$ref.split("/").pop() });
  }
  if (schema.const !== undefined) return `Literal[${pyLiteral(schema.const)}]`;
  if (schema.enum) return `Literal[${schema.enum.map(pyLiteral).join(", ")}]`;
  if (schema.oneOf || schema.anyOf) return `Union[${(schema.oneOf ?? schema.anyOf).map((item, index) => pyType(item, context, `${name}Variant${index + 1}`)).join(", ")}]`;
  if (Array.isArray(schema.type)) return `Union[${schema.type.map((type) => pyType({ ...schema, type }, context, name)).join(", ")}]`;
  if (schema.type === "string") return "str";
  if (schema.type === "integer") return "int";
  if (schema.type === "number") return "float";
  if (schema.type === "boolean") return "bool";
  if (schema.type === "null") return "None";
  if (schema.type === "array") return `list[${pyType(schema.items ?? {}, context, `${name}Item`)}]`;
  if (schema.type === "object" || schema.properties) {
    if (!schema.properties) return typeof schema.additionalProperties === "object" ? `dict[str, ${pyType(schema.additionalProperties, context, `${name}Value`)}]` : "dict[str, Any]";
    return `dict[str, Any]`;
  }
  return "Any";
}

function generatePy(schema, context, sourcePath) {
  if (!schema.properties && (schema.oneOf || schema.anyOf)) {
    const expanded = expandSchemaReferences(schema, context, schema, true), className = classNameFor(schema);
    const variants = (expanded.oneOf ?? expanded.anyOf).map((variant, index) => ({ ...variant, title: `${className}Variant${index + 1}` }));
    // One module header; later variants contribute declarations only.
    const modules = variants.map(variant => generatePy(variant, context, sourcePath));
    return modules[0] + modules.slice(1).map(module => module.slice(module.indexOf("class "))).join("\n") + `\n${className} = Union[${variants.map(classNameFor).join(", ")}]\n`;
  }
  const schemaContext = { ...context, currentSchema: schema };
  const className = classNameFor(schema);
  const lines = [`# ${marker}`, `# Source: ${sourcePath}`, `# Generator: ${GENERATOR_VERSION}`, "", "from __future__ import annotations", "from typing import Any, Literal, NotRequired, TypedDict, Union", "", `class ${className}(TypedDict):`];
  const properties = Object.entries(schema.properties ?? {});
  if (properties.length === 0) lines.push("    pass");
  else for (const [key, value] of properties) {
    const required = (schema.required ?? []).includes(key);
    const type = pyType(value, schemaContext, `${className}${classNameFor({ title: key })}`);
    lines.push(`    ${key}: ${required ? type : `NotRequired[${type}]`}`);
  }
  lines.push("");
  return lines.join("\n");
}

function presetRuntimeSchemas(context) {
  return presetRuntimeSchemaIds.map((schemaId) => {
    const schema = context.byId.get(schemaId);
    if (!schema) throw new Error(`Preset runtime schema is unavailable: ${schemaId}`);
    return schema;
  });
}

function generatePresetRuntimeValidators(context) {
  const ajv = new Ajv2020({ strict: true, allErrors: true, code: { source: true, esm: true } });
  addFormats(ajv);
  for (const schema of presetRuntimeSchemas(context)) ajv.addSchema(schema, schema.$id);
  const module = standaloneCode(ajv, {
    presetDefinitionValidator: presetRuntimeSchemaIds[3],
    presetSelectionValidator: presetRuntimeSchemaIds[1],
    creativeSkillOutputValidator: presetRuntimeSchemaIds[2],
    presetApplicationRecordValidator: presetRuntimeSchemaIds[4],
  }).replace('const func2 = require("ajv/dist/runtime/ucs2length").default;', "const func2 = (value) => [...value].length;");
  if (/\brequire\s*\(/.test(module)) throw new Error("Preset standalone validators retain a runtime dependency");
  return [`// ${marker}`, "// Sources: contracts/schemas/common/rational-time.v1.schema.json and contracts/schemas/preset/*.schema.json", `// Generator: ${GENERATOR_VERSION}`, module, ""].join("\n");
}

function inlineStandaloneDateTimeFormats(module) {
  return module.replace(/const (formats\d+) = require\("ajv-formats\/dist\/formats"\)\.fullFormats\["date-time"\];/g, 'const $1 = { validate: (value) => { const match = /^(\\d{4})-(\\d{2})-(\\d{2})[Tt](\\d{2}):(\\d{2}):(\\d{2})(?:\\.\\d+)?(?:[Zz]|([+-])(\\d{2}):(\\d{2}))$/.exec(value); if (!match) return false; const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]), hour = Number(match[4]), minute = Number(match[5]), second = Number(match[6]), offsetHour = match[8] === undefined ? 0 : Number(match[8]), offsetMinute = match[9] === undefined ? 0 : Number(match[9]); const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && hour <= 23 && minute <= 59 && second <= 60 && offsetHour <= 23 && offsetMinute <= 59; } };');
}

function generateCreativeContextRuntimeValidators(context) {
  const ajv = new Ajv2020({ strict: true, allErrors: true, code: { source: true, esm: true } });
  addFormats(ajv);
  for (const schemaId of creativeContextRuntimeSchemaIds) {
    const schema = context.byId.get(schemaId);
    if (!schema) throw new Error(`Creative context runtime schema is unavailable: ${schemaId}`);
    ajv.addSchema(schema, schema.$id);
  }
  let module = standaloneCode(ajv, {
    creativeContractV2Validator: "https://ai-vlog.local/contracts/editorial/creative-contract.v2.json",
    materialEvidencePackV1Validator: "https://ai-vlog.local/contracts/editorial/material-evidence-pack.v1.json",
    creativeSkillDefinitionV1Validator: "https://ai-vlog.local/contracts/editorial/creative-skill-definition.v1.json",
    skillEvaluationV2Validator: "https://ai-vlog.local/contracts/editorial/skill-evaluation.v2.json",

    durationBlueprintV1Validator: "https://ai-vlog.local/contracts/editorial/duration-blueprint.v1.json",
    durationFeasibilityV1Validator: "https://ai-vlog.local/contracts/editorial/duration-feasibility.v1.json",
    directionCardV1Validator: "https://ai-vlog.local/contracts/editorial/direction-card.v1.json",
    storyProposalV2Validator: "https://ai-vlog.local/contracts/editorial/story-proposal.v2.json",
    approvedStoryPlanV2Validator: "https://ai-vlog.local/contracts/editorial/approved-story-plan.v2.json",
    decisionRecordV1Validator: "https://ai-vlog.local/contracts/editorial/decision-record.v1.json",
    editorialEditIntentV1Validator: "https://ai-vlog.local/contracts/editorial/editorial-edit-intent.v1.json",
    feedbackDiagnosisV2Validator: "https://ai-vlog.local/contracts/editorial/feedback-diagnosis.v2.json",
    stage2PermissionRequestV1Validator: "https://ai-vlog.local/contracts/editorial/stage2-permission-request.v1.json",
    stage2PermissionPolicySnapshotV1Validator: "https://ai-vlog.local/contracts/editorial/stage2-permission-policy-snapshot.v1.json",
    stage2PermissionDecisionV1Validator: "https://ai-vlog.local/contracts/editorial/stage2-permission-decision.v1.json",
    audioLibraryOperationV1Validator: "https://ai-vlog.local/contracts/editorial/audio-library-operation.v1.json",
    audioSourceMeasurementV1Validator: "https://ai-vlog.local/contracts/editorial/audio-source-measurement.v1.json",
    precisionEditV1Validator: "https://ai-vlog.local/contracts/editorial/precision-edit.v1.json",
    audioResourcePackV1Validator: "https://ai-vlog.local/contracts/editorial/audio-resource-pack.v1.json",
    creationSessionV1Validator: "https://ai-vlog.local/contracts/editorial/creation-session.v1.json",
    creatorProfileStoreV1Validator: "https://ai-vlog.local/contracts/editorial/creator-profile-store.v1.json",
    creationPlanV1Validator: "https://ai-vlog.local/contracts/editorial/creation-plan.v1.json",
    creationDecisionV1Validator: "https://ai-vlog.local/contracts/editorial/creation-decision.v1.json",
    creationMaterialV1Validator: "https://ai-vlog.local/contracts/editorial/creation-material.v1.json",
    creationRenderV1Validator: "https://ai-vlog.local/contracts/editorial/creation-render.v1.json",
    creationRenderAdaptationV1Validator: "https://ai-vlog.local/contracts/editorial/creation-render-adaptation.v1.json",
    creationRenderV2Validator: "https://ai-vlog.local/contracts/editorial/creation-render.v2.json",
    mediaStillProxyRequestV1Validator: "https://ai-vlog.local/contracts/worker/media-still-proxy-request.v1.json",
    mediaStillProxyResultV1Validator: "https://ai-vlog.local/contracts/worker/media-still-proxy-result.v1.json",
    mediaPreviewProxyRequestV1Validator: "https://ai-vlog.local/contracts/worker/media-preview-proxy-request.v1.json",
    mediaPreviewProxyResultV1Validator: "https://ai-vlog.local/contracts/worker/media-preview-proxy-result.v1.json",
    creationPlanningExchangeV3Validator: "https://ai-vlog.local/contracts/editorial/creation-planning-exchange.v3.json",
    creationPlanningResumeV1Validator: "https://ai-vlog.local/contracts/editorial/creation-planning-resume.v1.json",
    creationDraftExecutionV1Validator: "https://ai-vlog.local/contracts/editorial/creation-draft-execution.v1.json",
    mediaSampleRequestV1Validator: "https://ai-vlog.local/contracts/worker/media-sample-request.v1.json",
    mediaSampleResultV1Validator: "https://ai-vlog.local/contracts/worker/media-sample-result.v1.json",
    mediaSceneRequestV2Validator: "https://ai-vlog.local/contracts/worker/media-scene-request.v2.json",
    mediaSceneResultV2Validator: "https://ai-vlog.local/contracts/worker/media-scene-result.v2.json",
    mediaProbeRequestV2Validator: "https://ai-vlog.local/contracts/worker/media-probe-request.v2.json",
    mediaProbeResultV2Validator: "https://ai-vlog.local/contracts/worker/media-probe-result.v2.json",
    creationObservationOutputV1Validator: "https://ai-vlog.local/contracts/editorial/creation-observation-output.v1.json",
    creationObservationOutputV2Validator: "https://ai-vlog.local/contracts/editorial/creation-observation-output.v2.json",
    creationObservationV2Validator: "https://ai-vlog.local/contracts/editorial/creation-observation.v2.json",
    creationAudioStreamRootV1Validator: "https://ai-vlog.local/contracts/editorial/creation-audio-stream-root.v1.json",
    creationAudioStreamChunkV1Validator: "https://ai-vlog.local/contracts/editorial/creation-audio-stream-chunk.v1.json",
    creationAudioStreamCallV1Validator: "https://ai-vlog.local/contracts/editorial/creation-audio-stream-call.v1.json",
    creationAudioStreamSettlementV1Validator: "https://ai-vlog.local/contracts/editorial/creation-audio-stream-settlement.v1.json",
    creationLearningEventV1Validator: "https://ai-vlog.local/contracts/editorial/creation-learning-event.v1.json",
    creationLearningDecisionV1Validator: "https://ai-vlog.local/contracts/editorial/creation-learning-decision.v1.json",
    creationLearningResultV1Validator: "https://ai-vlog.local/contracts/editorial/creation-learning-result.v1.json",
    creationLearningAttemptV1Validator: "https://ai-vlog.local/contracts/editorial/creation-learning-attempt.v1.json",
  }).replace(/const (func\d+) = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/g, "const $1 = (value) => [...value].length;")
    .replace(/const (func\d+) = require\("ajv\/dist\/runtime\/equal"\)\.default;/g, structuralJsonEqualRuntime);
  module = inlineStandaloneDateTimeFormats(module);
  module = module.replace(/const (formats\d+) = require\("ajv-formats\/dist\/formats"\)\.fullFormats(?:\["date"\]|\.date);/g, 'const $1 = {validate:(value)=>{const m=/^(\\d{4})-(\\d{2})-(\\d{2})$/.exec(value);if(!m)return false;const y=Number(m[1]),month=Number(m[2]),day=Number(m[3]),days=[31,y%4===0&&(y%100!==0||y%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];return month>=1&&month<=12&&day>=1&&day<=days[month-1];}};');
  if (/\brequire\s*\(/.test(module)) throw new Error("Creative context standalone validators retain a runtime dependency: "+module.match(/const \w+\s*=\s*require\([^;]+;/g));
  // Current model boundary is canonical and distinct from the compiled plan.
  // Fully expand references so providers need no local AVE schema registry.
  const decision = context.byId.get("https://ai-vlog.local/contracts/editorial/creation-decision.v1.json");
  const decisionShape = expandSchemaReferences(decision, context, decision);
  delete decisionShape.$schema; delete decisionShape.$id;
  const decisionJson = JSON.stringify(decisionShape);
  return [`// ${marker}`, "// Sources: Creative Context, Skill knowledge, Duration, Story intelligence, Editorial Edit Intent and RationalTime v1", `// Generator: ${GENERATOR_VERSION}`, module, `export const skillEvaluationV2Schema = ${JSON.stringify(context.byId.get("https://ai-vlog.local/contracts/editorial/skill-evaluation.v2.json").$defs.creation_planning)};`, `export const creationDecisionSchema = ${decisionJson};`, `export const creationLearningDecisionSchema = ${JSON.stringify(context.byId.get("https://ai-vlog.local/contracts/editorial/creation-learning-decision.v1.json"))};`, ""].join("\n");
}

function generateRenderRuntimeValidators(context) {
  const ajv = new Ajv2020({ strict: true, allErrors: true, code: { source: true, esm: true } });
  addFormats(ajv);
  for (const schemaId of renderRuntimeSchemaIds) {
    const schema = context.byId.get(schemaId);
    if (!schema) throw new Error(`Render runtime schema is unavailable: ${schemaId}`);
    ajv.addSchema(schema, schema.$id);
  }
  const module = standaloneCode(ajv, {
    renderExecutionPlanV2Validator: renderRuntimeSchemaIds[3],
    renderOutputManifestV2Validator: renderRuntimeSchemaIds[4],
    renderSegmentPlanV1Validator: renderRuntimeSchemaIds[5],
    renderSegmentResultV1Validator: renderRuntimeSchemaIds[6],
  }).replace(/const (func\d+) = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/g, "const $1 = (value) => [...value].length;");
  if (/\brequire\s*\(/.test(module)) throw new Error("Render standalone validators retain a runtime dependency");
  return [`// ${marker}`, "// Sources: contracts/schemas/render/*.schema.json", `// Generator: ${GENERATOR_VERSION}`, module, ""].join("\n");
}

function generateTimelineAnnotationRuntimeValidators(context) {
  const ajv = new Ajv2020({ strict: true, allErrors: true, code: { source: true, esm: true } });
  addFormats(ajv);
  const rationalTimeId = "https://ai-vlog.local/contracts/common/rational-time.v1.json";
  const rationalTime = context.byId.get(rationalTimeId);
  if (!rationalTime) throw new Error(`Timeline annotation dependency is unavailable: ${rationalTimeId}`);
  ajv.addSchema(rationalTime, rationalTimeId);
  for (const schemaId of timelineAnnotationRuntimeSchemaIds) {
    const schema = context.byId.get(schemaId);
    if (!schema) throw new Error(`Timeline annotation runtime schema is unavailable: ${schemaId}`);
    ajv.addSchema(schema, schema.$id);
  }
  let module = standaloneCode(ajv, {
    timelineAnnotationV1Validator: timelineAnnotationRuntimeSchemaIds[0],
    timelineAnnotationSubmitV1Validator: timelineAnnotationRuntimeSchemaIds[1],
    timelineAnnotationMessageV1Validator: timelineAnnotationRuntimeSchemaIds[2],
    timelineAnnotationV2Validator: timelineAnnotationRuntimeSchemaIds[3],
    timelineAnnotationSubmitV2Validator: timelineAnnotationRuntimeSchemaIds[4],
    timelineAnnotationMessageV2Validator: timelineAnnotationRuntimeSchemaIds[5],
    timelineAnnotationSubmitV3Validator: timelineAnnotationRuntimeSchemaIds[6],
    timelineAnnotationMessageV3Validator: timelineAnnotationRuntimeSchemaIds[7],
    timelineAnnotationProcessingV1Validator: timelineAnnotationRuntimeSchemaIds[8],
  }).replace(/const (func\d+) = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/g, "const $1 = (value) => [...value].length;")
    .replace(/const (func\d+) = require\("ajv\/dist\/runtime\/equal"\)\.default;/g, structuralJsonEqualRuntime);
  module = inlineStandaloneDateTimeFormats(module);
  if (/\brequire\s*\(/.test(module)) throw new Error("Timeline annotation standalone validators retain a runtime dependency");
  return [`// ${marker}`, "// Sources: timeline annotation contracts and RationalTime v1", `// Generator: ${GENERATOR_VERSION}`, module, ""].join("\n");
}

async function buildOutputs() {
  const context = await loadSchemas();
  const outputs = new Map();
  const mediaAjv = new Ajv2020({ strict: true, allErrors: true, code: { source: true, esm: true } });
  addFormats(mediaAjv);
  const mediaSchemaId = "https://ai-vlog.local/contracts/media/import-batch.v1.json";
  const mediaSchema = context.byId.get(mediaSchemaId);
  if (!mediaSchema) throw new Error("Media import contract is unavailable");
  mediaAjv.addSchema(mediaSchema, mediaSchemaId);
  let mediaModule = standaloneCode(mediaAjv, { mediaImportBatchV1Validator: mediaSchemaId }).replace(/const (func\d+) = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/g, "const $1 = (value) => [...value].length;");
  mediaModule = inlineStandaloneDateTimeFormats(mediaModule);
  if (/\brequire\s*\(/.test(mediaModule)) throw new Error("Media import validator retains a runtime dependency");
  outputs.set("packages/platform/contract-runtime/src/generated/media-import-validators.mjs", `// ${marker}\n// Generator: ${GENERATOR_VERSION}\n${mediaModule}\n`);
  outputs.set("packages/platform/contract-runtime/src/generated/media-import-validators.d.mts", `// ${marker}\nimport type { ValidateFunction } from "ajv";\nexport const mediaImportBatchV1Validator: ValidateFunction;\n`);
  const browseAjv = new Ajv2020({ strict: true, allErrors: true, code: { source: true, esm: true } });
  const browseExports = {};
  for (const [name, file] of [["mediaBrowseRequestV1Validator", "media-browse-request"], ["mediaBrowseResultV1Validator", "media-browse-result"]]) {
    const id = `https://ai-vlog.local/contracts/worker/${file}.v1.json`;
    const schema = context.byId.get(id);
    if (!schema) throw new Error(`Browse contract missing: ${id}`);
    browseAjv.addSchema(schema, id); browseExports[name] = id;
  }
  const browseModule = standaloneCode(browseAjv, browseExports).replace(/const (func\d+) = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/g, "const $1 = (value) => [...value].length;");
  if (/\brequire\s*\(/.test(browseModule)) throw new Error("Browse validator retains a runtime dependency");
  outputs.set("packages/platform/contract-runtime/src/generated/media-browse-validators.mjs", `// ${marker}\n${browseModule}\n`);
  outputs.set("packages/platform/contract-runtime/src/generated/media-browse-validators.d.mts", `// ${marker}\nimport type { ValidateFunction } from "ajv";\nexport const mediaBrowseRequestV1Validator: ValidateFunction;\nexport const mediaBrowseResultV1Validator: ValidateFunction;\n`);
  const issueAjv = new Ajv2020({ strict: true, allErrors: true, code: { source: true, esm: true } });
  const issueId = "https://ai-vlog.local/contracts/project/workspace-issue.v1.json";
  const issueSchema = context.byId.get(issueId);
  if (!issueSchema) throw new Error("Workspace issue contract is unavailable");
  issueAjv.addSchema(issueSchema, issueId);
  const exportId = "https://ai-vlog.local/contracts/project/creation-export.v1.json";
  const exportSchema = context.byId.get(exportId);
  if (!exportSchema) throw new Error("Creation export contract is unavailable");
  issueAjv.addSchema(exportSchema, exportId);
  const issueModule = standaloneCode(issueAjv, { workspaceIssueV1Validator: issueId, creationExportV1Validator: exportId }).replace(/const (func\d+) = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/g, "const $1 = (value) => [...value].length;");
  if (/\brequire\s*\(/.test(issueModule)) throw new Error("Workspace issue validator retains a runtime dependency");
  outputs.set("packages/platform/contract-runtime/src/generated/workspace-issue-validators.mjs", `// ${marker}\n${issueModule}\n`);
  outputs.set("packages/platform/contract-runtime/src/generated/workspace-issue-validators.d.mts", `// ${marker}\nimport type { ValidateFunction } from "ajv";\nexport const workspaceIssueV1Validator: ValidateFunction;\nexport const creationExportV1Validator: ValidateFunction;\n`);
  for (const schemaInfo of context.schemas) {
    const paths = generatedRelativePaths(schemaInfo);
    outputs.set(paths.ts, generateTs(schemaInfo.value, context, schemaInfo.relativePath, paths.ts));
    outputs.set(paths.py, generatePy(schemaInfo.value, context, schemaInfo.relativePath));
  }
  outputs.set("packages/platform/contract-runtime/src/generated/preset-validators.mjs", generatePresetRuntimeValidators(context));
  outputs.set("packages/platform/contract-runtime/src/generated/preset-validators.d.mts", [`// ${marker}`, `// Generator: ${GENERATOR_VERSION}`, 'import type { ValidateFunction } from "ajv";', "export const presetDefinitionValidator: ValidateFunction;", "export const presetSelectionValidator: ValidateFunction;", "export const creativeSkillOutputValidator: ValidateFunction;", "export const presetApplicationRecordValidator: ValidateFunction;", ""].join("\n"));
  outputs.set("packages/platform/contract-runtime/src/generated/creative-context-validators.mjs", generateCreativeContextRuntimeValidators(context));
  outputs.set("packages/platform/contract-runtime/src/generated/creative-context-validators.d.mts", [`// ${marker}`, `// Generator: ${GENERATOR_VERSION}`, 'import type { ValidateFunction } from "ajv";', "export const creativeContractV2Validator: ValidateFunction;", "export const materialEvidencePackV1Validator: ValidateFunction;", "export const creativeSkillDefinitionV1Validator: ValidateFunction;", "export const skillEvaluationV2Validator: ValidateFunction;", "export const skillEvaluationV2Schema: { readonly properties: { readonly result: { readonly enum: readonly string[] } } };", "export const durationBlueprintV1Validator: ValidateFunction;", "export const durationFeasibilityV1Validator: ValidateFunction;", "export const directionCardV1Validator: ValidateFunction;", "export const storyProposalV2Validator: ValidateFunction;", "export const approvedStoryPlanV2Validator: ValidateFunction;", "export const decisionRecordV1Validator: ValidateFunction;", "export const editorialEditIntentV1Validator: ValidateFunction;", "export const feedbackDiagnosisV2Validator: ValidateFunction;", "export const stage2PermissionRequestV1Validator: ValidateFunction;", "export const stage2PermissionPolicySnapshotV1Validator: ValidateFunction;", "export const stage2PermissionDecisionV1Validator: ValidateFunction;", "export const audioLibraryOperationV1Validator: ValidateFunction;", "export const audioSourceMeasurementV1Validator: ValidateFunction;", "export const precisionEditV1Validator: ValidateFunction;", "export const audioResourcePackV1Validator: ValidateFunction;", "export const creationSessionV1Validator: ValidateFunction;", "export const creatorProfileStoreV1Validator: ValidateFunction;", "export const creationPlanV1Validator: ValidateFunction;", "export const creationDecisionV1Validator: ValidateFunction;", "export const creationPlanningExchangeV3Validator: ValidateFunction;", "export const creationPlanningResumeV1Validator: ValidateFunction;", "export const creationMaterialV1Validator: ValidateFunction;", "export const creationRenderV1Validator: ValidateFunction;", "export const creationRenderAdaptationV1Validator: ValidateFunction;", "export const creationRenderV2Validator: ValidateFunction;", "export const mediaStillProxyRequestV1Validator: ValidateFunction;", "export const mediaStillProxyResultV1Validator: ValidateFunction;", "export const mediaPreviewProxyRequestV1Validator: ValidateFunction;", "export const mediaPreviewProxyResultV1Validator: ValidateFunction;", "export const creationDraftExecutionV1Validator: ValidateFunction;", "export const mediaSampleRequestV1Validator: ValidateFunction;", "export const mediaSampleResultV1Validator: ValidateFunction;", "export const mediaSceneRequestV2Validator: ValidateFunction;", "export const mediaSceneResultV2Validator: ValidateFunction;", "export const mediaProbeRequestV2Validator: ValidateFunction;", "export const mediaProbeResultV2Validator: ValidateFunction;", "export const creationObservationOutputV1Validator: ValidateFunction;", "export const creationObservationOutputV2Validator: ValidateFunction;", "export const creationObservationV2Validator: ValidateFunction;", "export const creationAudioStreamRootV1Validator: ValidateFunction;", "export const creationAudioStreamChunkV1Validator: ValidateFunction;", "export const creationAudioStreamCallV1Validator: ValidateFunction;", "export const creationAudioStreamSettlementV1Validator: ValidateFunction;", "export const creationLearningEventV1Validator: ValidateFunction;", "export const creationLearningDecisionV1Validator: ValidateFunction;", "export const creationLearningResultV1Validator: ValidateFunction;", "export const creationLearningAttemptV1Validator: ValidateFunction;", "export const creationLearningDecisionSchema: Readonly<Record<string, unknown>>;", "export const creationDecisionSchema: { readonly properties: Readonly<Record<string, unknown>>; readonly [key: string]: unknown };", ""].join("\n"));
  outputs.set("packages/platform/contract-runtime/src/generated/timeline-annotation-validators.mjs", generateTimelineAnnotationRuntimeValidators(context));
  outputs.set("packages/platform/contract-runtime/src/generated/timeline-annotation-validators.d.mts", [
    `// ${marker}`,
    `// Generator: ${GENERATOR_VERSION}`,
    'import type { ValidateFunction } from "ajv";',
    "export const timelineAnnotationV1Validator: ValidateFunction;",
    "export const timelineAnnotationSubmitV1Validator: ValidateFunction;",
    "export const timelineAnnotationMessageV1Validator: ValidateFunction;",
    "export const timelineAnnotationV2Validator: ValidateFunction;",
    "export const timelineAnnotationSubmitV2Validator: ValidateFunction;",
    "export const timelineAnnotationMessageV2Validator: ValidateFunction;",
    "export const timelineAnnotationSubmitV3Validator: ValidateFunction;",
    "export const timelineAnnotationMessageV3Validator: ValidateFunction;",
    "export const timelineAnnotationProcessingV1Validator: ValidateFunction;",
    "",
  ].join("\n"));
  outputs.set("packages/platform/contract-runtime/src/generated/render-validators.mjs", generateRenderRuntimeValidators(context));
  outputs.set("packages/platform/contract-runtime/src/generated/render-validators.d.mts", [`// ${marker}`, `// Generator: ${GENERATOR_VERSION}`, 'import type { ValidateFunction } from "ajv";', "export const renderExecutionPlanV2Validator: ValidateFunction;", "export const renderOutputManifestV2Validator: ValidateFunction;", "export const renderSegmentPlanV1Validator: ValidateFunction;", "export const renderSegmentResultV1Validator: ValidateFunction;", ""].join("\n"));
  const manifest = {
    generator_version: GENERATOR_VERSION,
    schemas: context.schemas.map((schemaInfo) => {
      const paths = generatedRelativePaths(schemaInfo);
      return {
        schema_path: schemaInfo.relativePath,
        schema_id: schemaInfo.value.$id,
        generated_files: [paths.ts, paths.py],
        content_sha256: {
          typescript: createHash("sha256").update(outputs.get(paths.ts)).digest("hex"),
          python: createHash("sha256").update(outputs.get(paths.py)).digest("hex"),
        },
      };
    }),
  };
  outputs.set("contracts/generated/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  return outputs;
}

const outputs = await buildOutputs();
const contractCount = JSON.parse(outputs.get("contracts/generated/manifest.json")).schemas.length;
if (process.argv.includes("--check")) {
  const expected = new Set(outputs.keys());
  for (const [relativePath, content] of outputs) {
    const path = resolve(root, relativePath);
    let actual;
    try { actual = await readFile(path, "utf8"); } catch { throw new Error(`generated file missing or stale: ${relativePath}`); }
    if (actual !== content) throw new Error(`generated file differs from schema output: ${relativePath}`);
  }
  const orphans = await findOrphanedGeneratedFiles(expected);
  if (orphans.length > 0) throw new Error(`orphaned generated files:\n${orphans.join("\n")}`);
  console.log(`generated clean check passed (${contractCount} contracts and standalone runtime validators)`);
} else {
  const expected = new Set(outputs.keys());
  for (const [relativePath, content] of outputs) { const path = resolve(root, relativePath); await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }
  const orphans = await findOrphanedGeneratedFiles(expected);
  for (const relativePath of orphans) await unlink(resolve(root, relativePath));
  console.log(`generated ${contractCount} contracts (TypeScript/Python) and standalone runtime validators`);
}
