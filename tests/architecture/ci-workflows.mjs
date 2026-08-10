import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1));
const workflowDirectory = join(root, ".github", "workflows");
const expected = ["ci.yml", "release.yml", "verify.yml"];
const actual = (await readdir(workflowDirectory)).filter((name) => name.endsWith(".yml")).sort();
assert.deepEqual(actual, expected, "workflow topology must contain only the CI, release, and reusable verification workflows");

const source = Object.fromEntries(await Promise.all(expected.map(async (name) => [name, await readFile(join(workflowDirectory, name), "utf8")])));
const requireMarkers = (name, markers) => {
  for (const marker of markers) if (!source[name].includes(marker)) throw new Error(`${name} missing ${marker}`);
};

requireMarkers("verify.yml", [
  "workflow_call:",
  "permissions:",
  "contents: read",
  "security:",
  "check:",
  "timeout-minutes:",
  "pnpm install --frozen-lockfile",
  "pnpm audit --audit-level high",
  "pnpm run media:vfr",
  "xvfb-run -a pnpm run check",
  "pnpm run acceptance:final:synthetic",
]);
requireMarkers("ci.yml", ["pull_request:", "branches: [main]", "concurrency:", "cancel-in-progress: true", "uses: ./.github/workflows/verify.yml"]);
requireMarkers("release.yml", ["tags: ['v*']", "workflow_dispatch:", "concurrency:", "cancel-in-progress: false", "uses: ./.github/workflows/verify.yml", "git describe --exact-match --tags"]);

for (const [name, contents] of Object.entries(source)) {
  if (/(^|[^a-z])npm run\b/.test(contents)) throw new Error(`${name} contains npm run`);
}
if (source["verify.yml"].includes("pnpm run p0:acceptance")) throw new Error("synthetic final acceptance must own the P0 invocation");
if ((source["verify.yml"].match(/pnpm run acceptance:final:synthetic/g) ?? []).length !== 1) throw new Error("synthetic final acceptance must run exactly once");

const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
if (packageJson.packageManager !== "pnpm@11.9.0") throw new Error("packageManager must pin pnpm@11.9.0");
console.log("CI workflow topology contract passed (PR/main/release reuse with no duplicate specialty workflows)");
