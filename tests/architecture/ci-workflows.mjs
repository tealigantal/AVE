import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  ":!docs/evidence/runs/EVD-20260805-WP-VLOG-002-PRECHECK.md",
  ":!docs/evidence/runs/EVD-20260805-WP-VLOG-002-COMPLETE.md",
]);
requireMarkers("ci.yml", ["pull_request:", "branches: [main]", "concurrency:", "cancel-in-progress: true", "uses: ./.github/workflows/verify.yml"]);
requireMarkers("release.yml", ["tags: ['v*']", "workflow_dispatch:", "concurrency:", "cancel-in-progress: false", "uses: ./.github/workflows/verify.yml", "git describe --exact-match --tags"]);

for (const [name, contents] of Object.entries(source)) {
  if (/(^|[^a-z])npm run\b/.test(contents)) throw new Error(`${name} contains npm run`);
}
if (source["verify.yml"].includes("pnpm run p0:acceptance")) throw new Error("synthetic final acceptance must own the P0 invocation");
if ((source["verify.yml"].match(/pnpm run acceptance:final:synthetic/g) ?? []).length !== 1) throw new Error("synthetic final acceptance must run exactly once");
const immutableEvidenceExclusions = [
  ":!docs/evidence/runs/EVD-20260805-WP-VLOG-002-COMPLETE.md",
  ":!docs/evidence/runs/EVD-20260805-WP-VLOG-002-PRECHECK.md",
  ":!docs/evidence/runs/EVD-20260823-WP-KF-002-PRECHECK.md",
  ":!docs/evidence/runs/EVD-20260823-WP-KF-002-R2-PRECHECK.md",
  ":!docs/evidence/runs/EVD-20260823-WP-KF-002-R3-VISUAL-PRECHECK.md",
  ":!docs/evidence/runs/EVD-20260823-WP-KF-002-R4-VISUAL-PRECHECK.md",
  ":!docs/evidence/runs/EVD-20260823-WP-KF-002-R5-120FPS-VISUAL-PRECHECK.md",
  ":!docs/evidence/runs/EVD-20260823-WP-KF-002-R6-FRACTIONAL-VISUAL-PRECHECK.md",
];
const evidenceExclusions = [...new Set(source["verify.yml"].match(/:!docs\/evidence\/[^'"\s]+/g) ?? [])].sort();
assert.deepEqual(evidenceExclusions, immutableEvidenceExclusions, "machine-path scan must exclude exactly the approved immutable Evidence files");

const immutableEvidenceHashes = {
  "docs/evidence/runs/EVD-20260805-WP-VLOG-002-COMPLETE.md": "7d9726dfbc161eeb966e85f598d081c2793263690aa7d88595c063ffa334e4a1",
  "docs/evidence/runs/EVD-20260805-WP-VLOG-002-PRECHECK.md": "f3ace4c03ec46ef31cc65376581a02c8ef5e44ceb67226544241287c5be8a4ef",
  "docs/evidence/runs/EVD-20260823-WP-KF-002-PRECHECK.md": "011b601d0951fb2815d09faecd658949238a02565f7661017446f8f45c491be9",
  "docs/evidence/runs/EVD-20260823-WP-KF-002-R2-PRECHECK.md": "cc5da13ffeb810a90cad0ae0319b68a04b0c6443765e77de53f2f85f6b299382",
  "docs/evidence/runs/EVD-20260823-WP-KF-002-R3-VISUAL-PRECHECK.md": "4df458f99a7964d4d1f84932bbdbc331247fd1c0051649353b43b17dc3774bd9",
  "docs/evidence/runs/EVD-20260823-WP-KF-002-R4-VISUAL-PRECHECK.md": "2c4b0eba7725f7761462dfa9ec879f156934b66b57140b121109ba259bfad08c",
  "docs/evidence/runs/EVD-20260823-WP-KF-002-R5-120FPS-VISUAL-PRECHECK.md": "5cf52528500c7edd0fec68584b71ba0595805795e6cb2336e9e09d4bc76b5cba",
  "docs/evidence/runs/EVD-20260823-WP-KF-002-R6-FRACTIONAL-VISUAL-PRECHECK.md": "683b7a54c28fd3c3d36f668402053ce303640e41ab3ea0c10909a70b17d55c75",
};
for (const [path, expectedHash] of Object.entries(immutableEvidenceHashes)) {
  const normalized = (await readFile(join(root, path), "utf8")).replace(/\r\n/g, "\n");
  assert.equal(createHash("sha256").update(normalized).digest("hex"), expectedHash, `immutable Evidence changed: ${path}`);
}

const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
if (packageJson.packageManager !== "pnpm@11.9.0") throw new Error("packageManager must pin pnpm@11.9.0");
const stage2Checks = [
  "creative-context:test",
  "creative-skill-knowledge:test",
  "duration-blueprint:test",
  "story-intelligence:test",
  "permission-matrix:test",
  "intelligence-pipeline:test",
  "feedback-revision:test",
  "stage2-product-workspace:test",
];
if (!packageJson.scripts.check.includes("pnpm run stage2:check")) throw new Error("default check chain must invoke stage2:check");
for (const script of stage2Checks) {
  if (!packageJson.scripts["stage2:check"].includes(`pnpm run ${script}`)) throw new Error(`stage2:check missing ${script}`);
}
if (packageJson.scripts.check.includes("pnpm run permission-matrix:test")) throw new Error("Stage 2 suites must enter the default chain through stage2:check");
if (/intelligence-pipeline-real|pnpm run [^ ]+:real/.test(packageJson.scripts["stage2:check"])) throw new Error("stage2:check must exclude private real-media lanes");
if (packageJson.scripts["intelligence-pipeline:test"].includes("intelligence-pipeline-real.test.ts")) throw new Error("deterministic intelligence-pipeline:test must exclude private real media");
if (!packageJson.scripts["intelligence-pipeline:real"].includes("intelligence-pipeline-real.test.ts")) throw new Error("real intelligence pipeline acceptance must remain available locally");
console.log("CI workflow topology contract passed (PR/main/release reuse with no duplicate specialty workflows)");
