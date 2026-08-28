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
  "https://ai-vlog.local/contracts/common/rational-time.v1.json",
  "https://ai-vlog.local/contracts/editorial/creative-contract.v2.json",
  "https://ai-vlog.local/contracts/editorial/material-evidence-pack.v1.json",
  "https://ai-vlog.local/contracts/editorial/creative-skill-definition.v1.json",
  "https://ai-vlog.local/contracts/editorial/skill-evaluation.v1.json",
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
function generateTs(schema, context, sourcePath, outputPath) {
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
  if (schema.type === "array") return `list[${pyType(schema.items ?? {}, context, `${name}Item`)}]`;
  if (schema.type === "object" || schema.properties) {
    if (!schema.properties) return typeof schema.additionalProperties === "object" ? `dict[str, ${pyType(schema.additionalProperties, context, `${name}Value`)}]` : "dict[str, Any]";
    return `dict[str, Any]`;
  }
  return "Any";
}

function generatePy(schema, context, sourcePath) {
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

function generateCreativeContextRuntimeValidators(context) {
  const ajv = new Ajv2020({ strict: true, allErrors: true, code: { source: true, esm: true } });
  addFormats(ajv);
  for (const schemaId of creativeContextRuntimeSchemaIds) {
    const schema = context.byId.get(schemaId);
    if (!schema) throw new Error(`Creative context runtime schema is unavailable: ${schemaId}`);
    ajv.addSchema(schema, schema.$id);
  }
  const module = standaloneCode(ajv, {
    creativeContractV2Validator: creativeContextRuntimeSchemaIds[1],
    materialEvidencePackV1Validator: creativeContextRuntimeSchemaIds[2],
    creativeSkillDefinitionV1Validator: creativeContextRuntimeSchemaIds[3],
    skillEvaluationV1Validator: creativeContextRuntimeSchemaIds[4],
    durationBlueprintV1Validator: creativeContextRuntimeSchemaIds[5],
    durationFeasibilityV1Validator: creativeContextRuntimeSchemaIds[6],
    directionCardV1Validator: creativeContextRuntimeSchemaIds[7],
    storyProposalV2Validator: creativeContextRuntimeSchemaIds[8],
    approvedStoryPlanV2Validator: creativeContextRuntimeSchemaIds[9],
    decisionRecordV1Validator: creativeContextRuntimeSchemaIds[10],
    editorialEditIntentV1Validator: creativeContextRuntimeSchemaIds[11],
    feedbackDiagnosisV2Validator: creativeContextRuntimeSchemaIds[12],
    stage2PermissionRequestV1Validator: creativeContextRuntimeSchemaIds[13],
    stage2PermissionPolicySnapshotV1Validator: creativeContextRuntimeSchemaIds[14],
    stage2PermissionDecisionV1Validator: creativeContextRuntimeSchemaIds[15],
  }).replace(/const (func\d+) = require\("ajv\/dist\/runtime\/ucs2length"\)\.default;/g, "const $1 = (value) => [...value].length;")
    .replace(/const (func\d+) = require\("ajv\/dist\/runtime\/equal"\)\.default;/g, structuralJsonEqualRuntime)
    .replace(/const (formats\d+) = require\("ajv-formats\/dist\/formats"\)\.fullFormats\["date-time"\];/g, 'const $1 = { validate: (value) => { const match = /^(\\d{4})-(\\d{2})-(\\d{2})[Tt](\\d{2}):(\\d{2}):(\\d{2})(?:\\.\\d+)?(?:[Zz]|([+-])(\\d{2}):(\\d{2}))$/.exec(value); if (!match) return false; const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]), hour = Number(match[4]), minute = Number(match[5]), second = Number(match[6]), offsetHour = match[8] === undefined ? 0 : Number(match[8]), offsetMinute = match[9] === undefined ? 0 : Number(match[9]); const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] && hour <= 23 && minute <= 59 && second <= 60 && offsetHour <= 23 && offsetMinute <= 59; } };');
  if (/\brequire\s*\(/.test(module)) throw new Error("Creative context standalone validators retain a runtime dependency");
  return [`// ${marker}`, "// Sources: Creative Context, Skill knowledge, Duration, Story intelligence, Editorial Edit Intent and RationalTime v1", `// Generator: ${GENERATOR_VERSION}`, module, ""].join("\n");
}

async function buildOutputs() {
  const context = await loadSchemas();
  const outputs = new Map();
  for (const schemaInfo of context.schemas) {
    const paths = generatedRelativePaths(schemaInfo);
    outputs.set(paths.ts, generateTs(schemaInfo.value, context, schemaInfo.relativePath, paths.ts));
    outputs.set(paths.py, generatePy(schemaInfo.value, context, schemaInfo.relativePath));
  }
  outputs.set("packages/platform/contract-runtime/src/generated/preset-validators.mjs", generatePresetRuntimeValidators(context));
  outputs.set("packages/platform/contract-runtime/src/generated/preset-validators.d.mts", [`// ${marker}`, `// Generator: ${GENERATOR_VERSION}`, 'import type { ValidateFunction } from "ajv";', "export const presetDefinitionValidator: ValidateFunction;", "export const presetSelectionValidator: ValidateFunction;", "export const creativeSkillOutputValidator: ValidateFunction;", "export const presetApplicationRecordValidator: ValidateFunction;", ""].join("\n"));
  outputs.set("packages/platform/contract-runtime/src/generated/creative-context-validators.mjs", generateCreativeContextRuntimeValidators(context));
  outputs.set("packages/platform/contract-runtime/src/generated/creative-context-validators.d.mts", [`// ${marker}`, `// Generator: ${GENERATOR_VERSION}`, 'import type { ValidateFunction } from "ajv";', "export const creativeContractV2Validator: ValidateFunction;", "export const materialEvidencePackV1Validator: ValidateFunction;", "export const creativeSkillDefinitionV1Validator: ValidateFunction;", "export const skillEvaluationV1Validator: ValidateFunction;", "export const durationBlueprintV1Validator: ValidateFunction;", "export const durationFeasibilityV1Validator: ValidateFunction;", "export const directionCardV1Validator: ValidateFunction;", "export const storyProposalV2Validator: ValidateFunction;", "export const approvedStoryPlanV2Validator: ValidateFunction;", "export const decisionRecordV1Validator: ValidateFunction;", "export const editorialEditIntentV1Validator: ValidateFunction;", "export const feedbackDiagnosisV2Validator: ValidateFunction;", "export const stage2PermissionRequestV1Validator: ValidateFunction;", "export const stage2PermissionPolicySnapshotV1Validator: ValidateFunction;", "export const stage2PermissionDecisionV1Validator: ValidateFunction;", ""].join("\n"));
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
