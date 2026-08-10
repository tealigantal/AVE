import { createHash } from "node:crypto";
import { execFile as execFileCallback } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const roots = ["apps", "packages", "contracts", "database", "tools", "tests", "package.json", "pnpm-lock.yaml", ".github/workflows"];
const execFile = promisify(execFileCallback);
const inRoot = (path) => roots.some((root) => path === root || path.startsWith(`${root}/`));
const frame = (hash, kind, bytes) => { const prefix = Buffer.from(`${kind}:${bytes.byteLength}:`, "utf8"); hash.update(prefix); hash.update(bytes); hash.update(Buffer.from(";", "utf8")); };
const normalizedBytes = (bytes) => Buffer.from(bytes.toString("binary").replace(/\r\n/g, "\n"), "binary");

async function sourceFiles(root) {
  const [listed, unstagedDeleted, stagedDeleted] = await Promise.all([
    execFile("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--"], { cwd: root, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 }),
    execFile("git", ["diff", "--name-only", "-z", "--diff-filter=D"], { cwd: root, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 }),
    execFile("git", ["diff", "--cached", "--name-only", "-z", "--diff-filter=D"], { cwd: root, encoding: "buffer", maxBuffer: 16 * 1024 * 1024 }),
  ]);
  const deleted = new Set([unstagedDeleted.stdout, stagedDeleted.stdout].map((stdout) => stdout.toString("utf8").split("\0")).flat().filter(Boolean));
  const paths = listed.stdout.toString("utf8").split("\0").filter(Boolean).filter(inRoot).filter((path) => !deleted.has(path));
  if (new Set(paths).size !== paths.length) throw new Error("fingerprint source list contains duplicates");
  return paths.map((path) => resolve(root, path));
}

export async function fingerprint(root = process.cwd()) {
  const list = (await sourceFiles(root)).sort((left, right) => relative(root, left).localeCompare(relative(root, right), "en"));
  if (list.length === 0) throw new Error("fingerprint source list is empty");
  const hash = createHash("sha256");
  frame(hash, "format", Buffer.from("ave-code-fingerprint-v2", "utf8"));
  for (const file of list) {
    if (!(await stat(file)).isFile()) throw new Error(`fingerprint source is not a file: ${file}`);
    const path = relative(root, file).split(sep).join("/");
    frame(hash, "path", Buffer.from(path, "utf8"));
    frame(hash, "content", normalizedBytes(await readFile(file)));
  }
  return hash.digest("hex");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(await fingerprint());
