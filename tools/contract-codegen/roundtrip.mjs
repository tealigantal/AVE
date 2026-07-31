import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { exampleRoot, exampleSchemaRelativePath, generatedRoot, loadSchemas, root, walk } from "./schema-utils.mjs";

const context = await loadSchemas();
const ajv = new Ajv({ strict: true, allErrors: true });
addFormats(ajv);
for (const schemaInfo of context.schemas) ajv.addSchema(schemaInfo.value, schemaInfo.value.$id);
const validators = new Map(context.schemas.map((schemaInfo) => [schemaInfo.relativeSchemaPath, ajv.getSchema(schemaInfo.value.$id)]));
const manifest = JSON.parse(await readFile(resolve(generatedRoot, "manifest.json"), "utf8"));
if (manifest.generator_version !== "2.0.0" || manifest.schemas.length !== context.schemas.length) throw new Error("generated manifest does not match current schemas");
for (const file of await walk(generatedRoot, (path) => path.endsWith(".ts") || path.endsWith(".py"))) {
  const content = await readFile(file, "utf8");
  if (!content.includes("GENERATED FILE - DO NOT EDIT")) throw new Error(`missing generated marker: ${relative(root, file)}`);
}

const validPaths = await walk(resolve(exampleRoot, "valid"), (path) => path.endsWith(".json"));
for (const path of validPaths) {
  const input = JSON.parse(await readFile(path, "utf8"));
  const schemaPath = exampleSchemaRelativePath(path, "valid");
  const validate = validators.get(schemaPath);
  if (!validate || !validate(input)) throw new Error(`TypeScript parse/validation failed: ${relative(root, path)}`);
  const python = spawnSync("python", [resolve(root, "tools/contract-codegen/python-roundtrip.py")], { input: `${JSON.stringify(input)}\n`, encoding: "utf8" });
  if (python.status !== 0) throw new Error(`Python parse failed for ${relative(root, path)}: ${python.stderr || python.stdout}`);
  const returned = JSON.parse(python.stdout);
  if (JSON.stringify(returned) !== JSON.stringify(input)) throw new Error(`cross-language JSON changed: ${relative(root, path)}`);
  if (!validate(returned)) throw new Error(`Schema validation failed after Python parse: ${relative(root, path)}`);
}
console.log(`contract roundtrip passed (${validPaths.length} valid examples, TypeScript JSON parse -> Python JSON parse -> Schema validation)`);
