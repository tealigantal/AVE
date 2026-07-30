import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../.."), schemaRoot = resolve(root, "contracts/schemas"), exampleRoot = resolve(root, "contracts/examples"), ajv = new Ajv({ strict: true, allErrors: true }), schemas = new Map();
addFormats(ajv);
async function walk(dir, suffix) { const result = []; for (const entry of await readdir(dir, { withFileTypes: true })) { const path = resolve(dir, entry.name); if (entry.isDirectory()) result.push(...await walk(path, suffix)); else if (entry.name.endsWith(suffix)) result.push(path); } return result; }
for (const path of await walk(schemaRoot, ".schema.json")) { const schema = JSON.parse(await readFile(path, "utf8")); if (!schema.$id || !schema.title) throw new Error(`invalid contract metadata: ${path}`); ajv.addSchema(schema, path); schemas.set(schema.title, ajv.compile(schema)); }
for (const path of await walk(exampleRoot, ".valid.json")) { const example = JSON.parse(await readFile(path, "utf8")); const title = example.protocol_version ? "WorkerEnvelope" : "RationalTime"; const validate = schemas.get(title); if (!validate || !validate(example)) throw new Error(`invalid example ${path}: ${JSON.stringify(validate?.errors)}`); }
for (const path of await walk(exampleRoot, ".invalid.json")) { const example = JSON.parse(await readFile(path, "utf8")); const title = example.protocol_version ? "WorkerEnvelope" : "RationalTime"; const validate = schemas.get(title); if (!validate || validate(example)) throw new Error(`invalid example unexpectedly passed: ${path}`); }
console.log(`contract check passed (${schemas.size} schemas, invalid examples rejected)`);
