import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const adapters = ["desktop-filesystem-adapter", "edl-adapter", "fcpxml-adapter", "otio-adapter", "web-preview-adapter"];
for (const adapter of adapters) {
  const entry = resolve(root, "packages", "adapters", adapter, "src", "public.ts");
  const source = await readFile(entry, "utf8");
  assert.ok(source.length > 0, `${adapter} public entry is empty`);
  assert.doesNotMatch(source, /from\s+["'][^"']*\/src\/(?!public\.js)/, `${adapter} imports an adapter internal entry`);
  assert.doesNotMatch(source, /project-storage|project\.sqlite|from\s+["']electron["']|child_process/, `${adapter} crosses an authority boundary`);
}
assert.deepEqual((await readdir(resolve(root, "packages", "adapters"))).sort(), adapters);
console.log("adapter boundary check passed");
