import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import standaloneCode from "ajv/dist/standalone/index.js";
import { GENERATOR_VERSION, classNameFor, generatedRelativePaths, loadSchemas, root, schemaRef } from "./schema-utils.mjs";

const marker = "GENERATED FILE - DO NOT EDIT";
const presetRuntimeSchemaIds = [
  "https://ai-vlog.local/contracts/common/rational-time.v1.json",
  "https://ai-vlog.local/contracts/preset/preset-selection.v1.json",
  "https://ai-vlog.local/contracts/preset/creative-skill-output.v1.json",
  "https://ai-vlog.local/contracts/preset/preset-definition.v1.json",
  "https://ai-vlog.local/contracts/preset/preset-application-record.v1.json",
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
if (process.argv.includes("--check")) {
  const expected = new Set(outputs.keys());
  for (const [relativePath, content] of outputs) {
    const path = resolve(root, relativePath);
    let actual;
    try { actual = await readFile(path, "utf8"); } catch { throw new Error(`generated file missing or stale: ${relativePath}`); }
    if (actual !== content) throw new Error(`generated file differs from schema output: ${relativePath}`);
  }
  console.log(`generated clean check passed (${outputs.size - 3} contracts and standalone runtime validators)`);
} else {
  for (const [relativePath, content] of outputs) { const path = resolve(root, relativePath); await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }
  console.log(`generated ${outputs.size - 3} contracts (TypeScript/Python) and standalone runtime validators`);
}
