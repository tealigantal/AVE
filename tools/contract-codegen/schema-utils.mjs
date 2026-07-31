import { readdir, readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

export const root = resolve(import.meta.dirname, "../..");
export const schemaRoot = resolve(root, "contracts/schemas");
export const exampleRoot = resolve(root, "contracts/examples");
export const generatedRoot = resolve(root, "contracts/generated");
export const GENERATOR_VERSION = "2.0.0";

export async function walk(directory, predicate = () => true) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path, predicate));
    else if (predicate(path)) result.push(path);
  }
  return result.sort();
}

export async function loadSchemas() {
  const paths = await walk(schemaRoot, (path) => path.endsWith(".schema.json"));
  const schemas = paths.map((path) => ({ path, relativePath: relative(root, path).replaceAll("\\", "/"), relativeSchemaPath: relative(schemaRoot, path).replaceAll("\\", "/"), value: null }));
  for (const schema of schemas) schema.value = JSON.parse(await readFile(schema.path, "utf8"));
  const byId = new Map(schemas.map((schema) => [schema.value.$id, schema.value]));
  const byTitle = new Map(schemas.map((schema) => [schema.value.title, schema.value]));
  return { schemas, byId, byTitle };
}

export function classNameFor(schema) {
  return schema.title.replaceAll(/[^A-Za-z0-9]/g, "") || "Contract";
}

export function generatedRelativePaths(schemaInfo) {
  const base = schemaInfo.relativeSchemaPath.replace(/\.schema\.json$/, "");
  return { ts: `contracts/generated/typescript/${base}.ts`, py: `contracts/generated/python/${base}.py` };
}

export function exampleSchemaRelativePath(examplePath, kind) {
  const rel = relative(exampleRoot, examplePath).replaceAll("\\", "/");
  if (!rel.startsWith(`${kind}/`)) return null;
  return rel.slice(kind.length + 1).replace(/\.json$/, ".schema.json");
}

export function schemaRef(ref, context) {
  return context.byId.get(ref) ?? context.byTitle.get(ref) ?? null;
}
