import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "../.."), schemaRoot = resolve(root, "contracts/schemas"), seen = new Set();
async function walk(dir) { const result = []; for (const entry of await readdir(dir, { withFileTypes: true })) { const path = resolve(dir, entry.name); if (entry.isDirectory()) result.push(...await walk(path)); else if (entry.name.endsWith(".schema.json")) result.push(path); } return result; }
for (const path of await walk(schemaRoot)) {
  const schema = JSON.parse(await readFile(path, "utf8"));
  const relativePath = path.slice(schemaRoot.length + 1).replaceAll("\\", "/");
  const versionMatch = /\.v([1-9]\d*)\.schema\.json$/.exec(relativePath);
  if (!versionMatch) throw new Error(`schema filename lacks explicit major version: ${relativePath}`);
  const expectedId = `https://ai-vlog.local/contracts/${relativePath.replace(/\.schema\.json$/, ".json")}`;
  if (schema.$id !== expectedId) throw new Error(`schema id does not match filename: ${relativePath}`);
  const declaredVersion = schema.properties?.schema_version?.const;
  if (declaredVersion !== undefined && declaredVersion !== Number(versionMatch[1])) throw new Error(`schema_version does not match filename: ${relativePath}`);
  const titleVersion = /V([1-9]\d*)$/.exec(schema.title ?? "");
  if (relativePath.startsWith("render/") && !titleVersion) throw new Error(`render schema title lacks explicit matching version: ${relativePath}`);
  if (titleVersion && titleVersion[1] !== versionMatch[1]) throw new Error(`schema title does not match filename: ${relativePath}`);
  if (seen.has(schema.$id)) throw new Error(`duplicate schema id: ${schema.$id}`);
  seen.add(schema.$id);
}
console.log(`contract identity check passed (${seen.size} filename/id/version-aligned schemas)`);
