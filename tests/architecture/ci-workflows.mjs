import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../../", import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1));
const workflowDirectory = join(root, ".github", "workflows");
const expected = ["ci.yml", "contracts.yml", "architecture.yml", "worker.yml", "golden.yml", "acceptance.yml", "security.yml", "release.yml"];
const requiredMarkers = ["name:", "permissions:", "jobs:"];
const workflowMarkers = {
  "ci.yml": ["pnpm run check"],
  "contracts.yml": ["contracts:check", "contracts:compatibility", "contracts:clean"],
  "architecture.yml": ["architecture:test", "feature-boundary:test"],
  "worker.yml": ["ruff check", "mypy ", "qc_master_protocol_smoke.py"],
  "golden.yml": ["adapter:roundtrip:test", "timeline-render:test"],
  "acceptance.yml": ["p0:acceptance", "acceptance:final:synthetic", "electron:runtime:test"],
  "security.yml": ["pnpm audit"],
  "release.yml": ["electron:runtime:test", "timeline-render:test"],
};

for (const name of expected) {
  const source = await readFile(join(workflowDirectory, name), "utf8");
  for (const marker of requiredMarkers) if (!source.includes(marker)) throw new Error(`${name} missing ${marker}`);
  if (name !== "worker.yml" && !source.includes("pnpm")) throw new Error(`${name} must use pnpm`);
  if (name !== "worker.yml" && !source.includes("pnpm install --frozen-lockfile")) throw new Error(`${name} must use frozen pnpm install`);
  if (/(^|[^a-z])npm run\b/.test(source)) throw new Error(`${name} contains npm run`);
  for (const marker of workflowMarkers[name]) if (!source.includes(marker)) throw new Error(`${name} missing ${marker}`);
}

const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
if (packageJson.packageManager !== "pnpm@11.9.0") throw new Error("packageManager must pin pnpm@11.9.0");
console.log(`CI workflow contract passed (${expected.length} workflows)`);
