import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
assert.equal(existsSync(resolve(root, "apps/desktop/src/project-host.ts")), false, "Desktop must not own Project Host implementation");
const main = await readFile(resolve(root, "apps/desktop/src/main/main.ts"), "utf8");
const composition = await readFile(resolve(root, "apps/desktop/src/main/composition-root.ts"), "utf8");
const cli = await readFile(resolve(root, "apps/dev-cli/src/main.ts"), "utf8");
assert.match(composition, /packages\/platform\/project-host\/src\/public\.js/);
assert.match(cli, /packages\/platform\/project-host\/src\/public\.js/);
const publicEntry = await readFile(resolve(root, "packages/platform/project-host/src/public.ts"), "utf8");
for (const required of ["ProjectHostSession", "CommandBus", "QueryBus", "UnitOfWork", "StageGateService", "Reconciler", "InvalidationPlanner"]) assert.match(publicEntry, new RegExp(required));
const hostSource = await readFile(resolve(root, "packages/platform/project-host/src/project-host.ts"), "utf8");
assert.doesNotMatch(hostSource, /readFileSync/, "Project Host must not synchronously load complete media files");
assert.match(hostSource, /listAssetLocationsForAssets/, "Preset media checks must be scoped to declared or Timeline-referenced assets");
console.log("project host boundary check passed");
