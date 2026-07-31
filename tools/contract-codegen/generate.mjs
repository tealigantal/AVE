import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { GENERATOR_VERSION, classNameFor, generatedRelativePaths, loadSchemas, root, schemaRef } from "./schema-utils.mjs";

const marker = "GENERATED FILE - DO NOT EDIT";
const tsLiteral = (value) => typeof value === "string" ? JSON.stringify(value) : String(value);
function propertyName(name) { return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name); }
function nullable(type, schema) { return schema?.type && Array.isArray(schema.type) && schema.type.includes("null") ? `${type} | null` : type; }

function tsType(schema, context, name) {
  if (!schema) return "unknown";
  if (schema.$ref) return classNameFor(schemaRef(schema.$ref, context) ?? { title: schema.$ref.split("/").pop() });
  if (schema.const !== undefined) return tsLiteral(schema.const);
  if (schema.enum) return schema.enum.map(tsLiteral).join(" | ");
  if (schema.oneOf || schema.anyOf) return (schema.oneOf ?? schema.anyOf).map((item, index) => tsType(item, context, `${name}Variant${index + 1}`)).join(" | ");
  if (Array.isArray(schema.type)) return schema.type.map((type) => tsType({ ...schema, type }, context, name)).join(" | ");
  if (schema.type === "string") return nullable("string", schema);
  if (schema.type === "integer" || schema.type === "number") return nullable("number", schema);
  if (schema.type === "boolean") return nullable("boolean", schema);
  if (schema.type === "array") return nullable(`${tsType(schema.items ?? {}, context, `${name}Item`)}[]`, schema);
  if (schema.type === "object" || schema.properties) {
    if (!schema.properties) return "Record<string, unknown>";
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
    lines.push(`  ${propertyName(key)}${required ? "" : "?"}: ${tsType(value, context, `${className}${classNameFor({ title: key })}`)};`);
  }
  lines.push("}", "");
  return lines.join("\n");
}

function pyLiteral(value) { return typeof value === "string" ? JSON.stringify(value) : value === null ? "None" : String(value).toLowerCase(); }
function pyType(schema, context, name) {
  if (!schema) return "Any";
  if (schema.$ref) return classNameFor(schemaRef(schema.$ref, context) ?? { title: schema.$ref.split("/").pop() });
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
    if (!schema.properties) return "dict[str, Any]";
    return `dict[str, Any]`;
  }
  return "Any";
}

function generatePy(schema, context, sourcePath) {
  const className = classNameFor(schema);
  const lines = [`# ${marker}`, `# Source: ${sourcePath}`, `# Generator: ${GENERATOR_VERSION}`, "", "from __future__ import annotations", "from typing import Any, Literal, NotRequired, TypedDict, Union", "", `class ${className}(TypedDict):`];
  const properties = Object.entries(schema.properties ?? {});
  if (properties.length === 0) lines.push("    pass");
  else for (const [key, value] of properties) {
    const required = (schema.required ?? []).includes(key);
    const type = pyType(value, context, `${className}{key}`);
    lines.push(`    ${key}: ${required ? type : `NotRequired[${type}]`}`);
  }
  lines.push("");
  return lines.join("\n");
}

async function buildOutputs() {
  const context = await loadSchemas();
  const outputs = new Map();
  for (const schemaInfo of context.schemas) {
    const paths = generatedRelativePaths(schemaInfo);
    outputs.set(paths.ts, generateTs(schemaInfo.value, context, schemaInfo.relativePath, paths.ts));
    outputs.set(paths.py, generatePy(schemaInfo.value, context, schemaInfo.relativePath));
  }
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
  console.log(`generated clean check passed (${outputs.size - 1} contracts)`);
} else {
  for (const [relativePath, content] of outputs) { const path = resolve(root, relativePath); await mkdir(dirname(path), { recursive: true }); await writeFile(path, content); }
  console.log(`generated ${outputs.size - 1} contracts (TypeScript/Python)`);
}
