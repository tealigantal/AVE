import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const normalizedBytes = (bytes) => Buffer.from(bytes.toString("binary").replace(/\r\n/g, "\n"), "binary");
const frame = (hash, kind, bytes) => {
  hash.update(Buffer.from(`${kind}:${bytes.byteLength}:`, "utf8"));
  hash.update(bytes);
  hash.update(Buffer.from(";", "utf8"));
};

const normalizedPath = (value) => value.split(sep).join("/");
const globExpression = (glob) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("**", "§§").replaceAll("*", "[^/]*").replaceAll("§§", ".*")}$`);

export function normalizeScope(scope) {
  if (!scope || typeof scope.scope_id !== "string" || !/^[a-z0-9][a-z0-9._-]*$/i.test(scope.scope_id)) throw new Error("scope id is invalid");
  if (!Array.isArray(scope.include) || scope.include.length === 0) throw new Error("scope include is required");
  const include = scope.include.map((entry) => typeof entry === "string" ? entry.replaceAll("\\", "/") : entry);
  if (include.some((entry) => typeof entry !== "string" || !entry || entry.startsWith("/") || entry.includes(".."))) throw new Error("scope include is invalid");
  if (new Set(include).size !== include.length) throw new Error("scope include contains duplicates");
  if (include.some((entry) => entry === "**" || entry === "*")) throw new Error("scope include is too broad");
  if (!scope.definition || typeof scope.definition !== "object" || Array.isArray(scope.definition)) throw new Error("scope definition is required");
  return { scope_id: scope.scope_id, include: [...include].sort(), definition: scope.definition };
}

async function governedFiles(root) {
  const { stdout } = await execFile("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--"], { cwd: root, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 });
  return stdout.toString("utf8").split("\0").filter(Boolean).map((path) => path.replaceAll("\\", "/"));
}

export async function scopeFingerprint(root = process.cwd(), input) {
  const scope = normalizeScope(input);
  const expressions = scope.include.map(globExpression);
  const files = (await governedFiles(root)).filter((path) => expressions.some((expression) => expression.test(path))).sort((left, right) => left.localeCompare(right, "en"));
  if (files.length === 0) throw new Error(`scope include matches no governed files: ${scope.scope_id}`);
  const hash = createHash("sha256");
  frame(hash, "format", Buffer.from("ave-evidence-scope-v1", "utf8"));
  frame(hash, "definition", Buffer.from(JSON.stringify(scope), "utf8"));
  for (const file of files) {
    const absolute = resolve(root, file);
    if (!(await stat(absolute)).isFile()) throw new Error(`scope source is not a file: ${normalizedPath(relative(root, absolute))}`);
    frame(hash, "path", Buffer.from(file, "utf8"));
    frame(hash, "content", normalizedBytes(await readFile(absolute)));
  }
  return hash.digest("hex");
}

export function capabilityScope(program, capability) {
  const owned = program.manifest.work_packages.filter((workPackage) => capability.work_package_ids.includes(workPackage.work_package_id));
  if (owned.length !== capability.work_package_ids.length) throw new Error(`capability scope has unknown work package: ${capability.capability_id}`);
  const implementationPaths = owned.flatMap((workPackage) => workPackage.allowed_paths)
    .filter((path) => !path.startsWith("docs/") && path !== "package.json");
  const packageDefinitions = owned.map((workPackage) => `${program.registration.directory}/work-packages/${workPackage.work_package_id}.md`);
  const include = [...new Set([...implementationPaths, ...packageDefinitions])].sort();
  const fallback = ["scripts/docs/**", "tests/architecture/**", ...packageDefinitions];
  return normalizeScope({
    scope_id: `${program.manifest.program_id}.${capability.capability_id}`,
    include: include.length ? include : fallback,
    definition: {
      programme_id: program.manifest.program_id,
      capability_id: capability.capability_id,
      work_package_ids: [...capability.work_package_ids].sort(),
      include: include.length ? include : fallback,
      version: 1,
    },
  });
}
