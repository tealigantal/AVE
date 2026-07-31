import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { exampleRoot, exampleSchemaRelativePath, loadSchemas, walk } from "./schema-utils.mjs";

const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
const context = await loadSchemas();
const validators = new Map();
for (const schemaInfo of context.schemas) {
  const schema = schemaInfo.value;
  if (!schema.$id || !schema.title || schema.type !== "object") throw new Error(`invalid contract metadata: ${schemaInfo.relativePath}`);
  ajv.addSchema(schema, schema.$id);
}
for (const schemaInfo of context.schemas) validators.set(schemaInfo.relativeSchemaPath, ajv.getSchema(schemaInfo.value.$id) ?? ajv.compile(schemaInfo.value));

async function validateExamples(kind) {
  const paths = await walk(`${exampleRoot}/${kind}`, (path) => path.endsWith(".json"));
  const seen = new Set();
  for (const path of paths) {
    const schemaPath = exampleSchemaRelativePath(path, kind);
    const validate = validators.get(schemaPath);
    if (!validate) throw new Error(`example is not bound to a schema: ${relative(exampleRoot, path)}`);
    const value = JSON.parse(await readFile(path, "utf8"));
    const valid = validate(value);
    if (kind === "valid" && !valid) throw new Error(`valid example rejected: ${relative(exampleRoot, path)}: ${JSON.stringify(validate.errors)}`);
    if (kind === "invalid" && valid) throw new Error(`invalid example accepted: ${relative(exampleRoot, path)}`);
    seen.add(schemaPath);
  }
  return { paths, seen };
}

const valid = await validateExamples("valid");
const invalid = await validateExamples("invalid");
for (const schemaInfo of context.schemas) {
  if (!valid.seen.has(schemaInfo.relativeSchemaPath)) throw new Error(`schema has no valid example: ${schemaInfo.relativeSchemaPath}`);
  if (!invalid.seen.has(schemaInfo.relativeSchemaPath)) throw new Error(`schema has no invalid example: ${schemaInfo.relativeSchemaPath}`);
}
console.log(`contract check passed (${context.schemas.length} schemas, ${valid.paths.length} valid and ${invalid.paths.length} invalid examples)`);
