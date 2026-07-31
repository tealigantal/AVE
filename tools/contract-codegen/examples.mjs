import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { exampleRoot, loadSchemas, root, schemaRef } from "./schema-utils.mjs";

function sample(schema, context) {
  if (!schema) return null;
  if (schema.$ref) return sample(schemaRef(schema.$ref, context), context);
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.oneOf?.length || schema.anyOf?.length) return sample((schema.oneOf ?? schema.anyOf)[0], context);
  if (Array.isArray(schema.type)) return sample({ ...schema, type: schema.type.find((type) => type !== "null") ?? schema.type[0] }, context);
  if (schema.type === "object" || schema.properties) return Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, property]) => [key, sample(property, context)]));
  if (schema.type === "array") { const count = Math.max(1, schema.minItems ?? 0); return Array.from({ length: count }, () => sample(schema.items ?? {}, context)); }
  if (schema.type === "boolean") return true;
  if (schema.type === "integer") return Math.max(1, schema.minimum ?? 0);
  if (schema.type === "number") return Math.max(0.5, schema.exclusiveMinimum ?? schema.minimum ?? 0);
  if (schema.type === "string") {
    if (schema.format === "uuid") return "00000000-0000-4000-8000-000000000001";
    if (schema.format === "date-time") return "2026-01-01T00:00:00.000Z";
    if (schema.pattern === "^[0-9a-f]{64}$") return "a".repeat(64);
    if (schema.pattern === "^asset:sha256:[0-9a-f]{64}$") return `asset:sha256:${"a".repeat(64)}`;
    if (schema.pattern) return schema.pattern.includes("[0-9a-f]") ? "a".repeat(64) : "example";
    return "example".repeat(Math.max(1, Math.ceil((schema.minLength ?? 1) / 7))).slice(0, Math.max(1, schema.minLength ?? 1));
  }
  return null;
}

const context = await loadSchemas();
let count = 0;
for (const schemaInfo of context.schemas) {
  const value = sample(schemaInfo.value, context);
  const relative = schemaInfo.relativeSchemaPath.replace(/\.schema\.json$/, ".json");
  const validPath = resolve(exampleRoot, "valid", relative);
  const invalid = structuredClone(value);
  const required = schemaInfo.value.required ?? [];
  if (!required.length) throw new Error(`cannot derive invalid example without required field: ${schemaInfo.relativePath}`);
  delete invalid[required[0]];
  const invalidPath = resolve(exampleRoot, "invalid", relative);
  await mkdir(dirname(validPath), { recursive: true });
  await mkdir(dirname(invalidPath), { recursive: true });
  await writeFile(validPath, `${JSON.stringify(value, null, 2)}\n`);
  await writeFile(invalidPath, `${JSON.stringify(invalid, null, 2)}\n`);
  count += 1;
}
console.log(`generated ${count} valid and ${count} invalid contract examples`);
