import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const featuresRoot = resolve(root, "packages/features");
const editorialCoreSource = await readFile(resolve(root, "packages/core/editorial-core/src/public.ts"), "utf8");
assert.doesNotMatch(editorialCoreSource, /export\s+(?:async\s+)?function\s+/);
assert.doesNotMatch(editorialCoreSource, /export\s+const\s+exportCapabilities/);
const requiredLayers = ["commands", "queries", "use-cases", "policies", "validators", "prompts", "ports"];
const features = (await readdir(featuresRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
assert.deepEqual(features, ["assembly-cut", "delivery", "evidence-building", "feedback", "fine-cut", "material-sufficiency", "media-ingestion", "privacy", "project-interview", "reference-analysis", "rough-cut", "sponsor", "story-planning"]);
for (const feature of features) {
  const publicPath = resolve(featuresRoot, feature, "src", "public.ts");
  const source = await readFile(publicPath, "utf8");
  assert.match(source, /export const featureId/);
  assert.doesNotMatch(source, /packages\/features\/|\.\.\/\.\.\/[^./]+\/src/);
  for (const layer of requiredLayers) assert.equal((await readdir(resolve(featuresRoot, feature, "src", layer))).length > 0, true, `${feature}/${layer} is empty`);
}
const allPublic = await Promise.all(features.map((feature) => readFile(resolve(featuresRoot, feature, "src", "public.ts"), "utf8")));
for (const source of allPublic) assert.doesNotMatch(source, /from ["'][^"']*features["']/);
console.log("feature package boundary check passed");
