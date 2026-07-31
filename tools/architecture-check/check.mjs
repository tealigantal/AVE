import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"]);
const SKIP_DIRS = new Set(["node_modules", ".git", "contracts/generated", "docs/archive"]);
const PRODUCTION_ROOTS = ["packages", "apps"];

function normalize(value) { return value.replaceAll("\\", "/"); }
function isSkipped(path, root) {
  const rel = normalize(relative(root, path));
  return [...SKIP_DIRS].some((entry) => rel === entry || rel.startsWith(`${entry}/`));
}
async function walk(directory, root, result = []) {
  if (isSkipped(directory, root)) return result;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path, root, result);
    else if (SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) result.push(path);
  }
  return result;
}
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\"\"\"[\s\S]*?\"\"\"/g, "").replace(/'''[\s\S]*?'''/g, "").replace(/(^|\s)\/\/.*$/gm, "$1").replace(/(^|\s)#.*$/gm, "$1");
}
function importsFrom(source) {
  const imports = [];
  const patterns = [
    /\bimport\s+(?:type\s+)?[\s\S]*?\sfrom\s*["']([^"']+)["']/g,
    /\bimport\s*[(:]\s*["']([^"']+)["']/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) for (const match of source.matchAll(pattern)) imports.push(match[1]);
  return [...new Set(imports)];
}
function packageRoot(path, root) {
  const rel = normalize(relative(root, path));
  const match = rel.match(/^packages\/(core|platform|features|adapters)\/([^/]+)/);
  return match ? `packages/${match[1]}/${match[2]}` : null;
}
function isProductionFile(path, root) {
  const rel = normalize(relative(root, path));
  return PRODUCTION_ROOTS.some((entry) => rel === entry || rel.startsWith(`${entry}/`));
}
function resolveImport(importer, specifier) {
  if (!specifier.startsWith(".")) return null;
  return resolve(dirname(importer), specifier);
}
function add(violations, file, message) { violations.push(`${normalize(file)}: ${message}`); }

export async function checkRepository(root) {
  const files = await walk(root, root);
  const productionFiles = files.filter((file) => isProductionFile(file, root));
  const violations = [];
  const packageDirectories = new Set(["packages/shared", "packages/common", "packages/utils"]);

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const code = stripComments(source);
    const rel = normalize(relative(root, file));
    const core = rel.startsWith("packages/core/");
    const renderer = rel.startsWith("apps/desktop/src/renderer/");
    const worker = rel.startsWith("apps/worker-host/");
    const nodePlatform = rel.startsWith("packages/platform/") && !rel.startsWith("packages/platform/worker-client/");

    if (packageDirectories.has(rel) || [...packageDirectories].some((entry) => rel.startsWith(`${entry}/`))) add(violations, rel, "forbidden shared/common/utils package");
    if (core && /(?:node:fs|node:child_process|from\s+["']electron["']|from\s+["']react["']|sqlite|ffmpeg|ffprobe)/i.test(code)) add(violations, rel, "Core imports or references infrastructure/runtime dependency");
    if (renderer && /(?:^|["' ])node:[^"' ]+|from\s+["'](?:electron|react|sqlite)["']|project-storage|worker-host|project\.sqlite/i.test(code)) add(violations, rel, "Renderer crosses Node, SQLite, Worker Host, or Project Storage boundary");
    if (worker && /(?:sqlite3|better-sqlite3|DatabaseSync|project\.sqlite|from\s+sqlite|import\s+sqlite)/i.test(code)) add(violations, rel, "Worker Host accesses SQLite");
    if (nodePlatform && /(?:node:child_process|(?:ffmpeg|ffprobe)\s*["'-])/i.test(code)) add(violations, rel, "Node Platform starts or references media subprocesses; Worker Host must own them");
    if ((rel.startsWith("apps/desktop/") || rel.startsWith("apps/dev-cli/")) && /(?:ffmpeg|ffprobe|node:child_process)/i.test(code)) add(violations, rel, "Application directly starts media subprocesses");
    if (isProductionFile(file, root) && /\b(?:start|end|duration)_(?:seconds|second)\b|\b(?:start|end|duration)Seconds\b/.test(code)) add(violations, rel, "floating seconds used as an authoritative time field");

    const importerPackage = packageRoot(file, root);
    if (!importerPackage) continue;
    for (const specifier of importsFrom(code)) {
      const target = resolveImport(file, specifier);
      if (!target) {
        if (/^packages\/(shared|common|utils)(?:\/|$)/.test(normalize(specifier))) add(violations, rel, `forbidden package import ${specifier}`);
        continue;
      }
      const targetPackage = packageRoot(target, root);
      if (targetPackage && targetPackage !== importerPackage) {
        const targetRel = normalize(relative(root, target));
        if (!/\/src\/(?:public|index)\.(?:ts|tsx|js|mjs|cjs)$/.test(targetRel)) add(violations, rel, `cross-package import must use public entrypoint: ${specifier}`);
        if (importerPackage.startsWith("packages/core/") && targetPackage.startsWith("packages/platform/")) add(violations, rel, `Core cannot depend on Platform: ${specifier}`);
      }
      if (importerPackage.startsWith("packages/core/") && /(?:features|apps|electron|react|sqlite|ffmpeg)/i.test(normalize(specifier))) add(violations, rel, `Core cannot depend on ${specifier}`);
    }
  }

  const sqliteAccess = [];
  const ffmpegEntrypoints = new Set();
  for (const file of productionFiles) {
    const code = stripComments(await readFile(file, "utf8"));
    const rel = normalize(relative(root, file));
    if (/(?:DatabaseSync|better-sqlite3|sqlite3|CREATE\s+TABLE|PRAGMA\s+foreign_keys|project\.sqlite)/i.test(code) && !rel.startsWith("packages/platform/project-storage/")) sqliteAccess.push(rel);
    if (/(?:run|execFile|spawn)\s*\(\s*["']ffmpeg["']/i.test(code)) ffmpegEntrypoints.add(rel);
  }
  if (sqliteAccess.length > 0) violations.push(`SQLite access outside Project Storage owner: ${sqliteAccess.join(", ")}`);
  if (ffmpegEntrypoints.size > 1) violations.push(`multiple FFmpeg command construction entrypoints: ${[...ffmpegEntrypoints].join(", ")}`);
  if (violations.length) throw new Error(`architecture check failed:\n${violations.map((entry) => `- ${entry}`).join("\n")}`);
  return { files: files.length, productionFiles: productionFiles.length };
}

const entry = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (entry === import.meta.url) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const result = await checkRepository(root);
  console.log(`architecture check passed (${result.files} source files scanned)`);
}
