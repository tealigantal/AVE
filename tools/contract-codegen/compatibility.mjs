import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../.."), schemaRoot = resolve(root, "contracts/schemas"), seen = new Set();
async function walk(dir) { const result = []; for (const entry of await readdir(dir, { withFileTypes: true })) { const path = resolve(dir, entry.name); if (entry.isDirectory()) result.push(...await walk(path)); else if (entry.name.endsWith(".schema.json")) result.push(path); } return result; }
for (const path of await walk(schemaRoot)) { const schema = JSON.parse(await readFile(path, "utf8")); if (seen.has(schema.$id)) throw new Error(`duplicate schema id: ${schema.$id}`); seen.add(schema.$id); if (!/\.v[1-9]\d*\./.test(schema.$id)) throw new Error(`schema lacks explicit major version: ${path}`); }
console.log(`compatibility check passed (${seen.size} unique versioned ids)`);
