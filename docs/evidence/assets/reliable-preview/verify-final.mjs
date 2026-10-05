import assert from "node:assert/strict";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fingerprint } from "../../../../scripts/docs/fingerprint.mjs";
const base = "docs/evidence/assets/reliable-preview/";
const fp = await fingerprint();
const json = async path => JSON.parse(await readFile(path, "utf8"));
const sha = async path => createHash("sha256").update(await readFile(path)).digest("hex");
const full = await json(base + "full-ledger-attempt03.json"), focused = await json(base + "focused-ledger-attempt04.json");
assert.equal(full.commands.length, 70); assert.equal(focused.commands.length, 14);
for (const ledger of [full, focused]) {
  assert.equal(ledger.code_fingerprint, fp); assert.equal(ledger.final_fingerprint, fp); assert(ledger.finished_at);
  for (const entry of ledger.commands) { assert.equal(entry.exit_code, 0, entry.command); assert.equal(await sha(entry.log.path), entry.log.sha256, entry.command); }
}
assert.match(await readFile(base + "closeout-docs-check-attempt02.log", "utf8"), /docs check passed/);
for (const path of [".dockerignore", "docker/Dockerfile", "docs/plans/2026-10-02-mixed-media-resource-packs.md", "tests/integration/docker-packaging.test.mjs"]) {
  assert.equal(await sha(path), (await json(base + "preservation-audit.json")).protected_files[path]);
}
const identity = await json(base + "current-inputs-after-docs-fix.json"); assert.equal(identity.code_fingerprint, fp);
const runtime = await json(base + "old-runtime-after-restoration.json"); assert(runtime.services.every(item => item.running && item.health === "healthy"));
const manifest = [];
for (const name of (await readdir(base)).sort()) {
  if (name === "final-verification.json") continue;
  manifest.push({ path: base + name, sha256: await sha(base + name) });
}
const result = { result: "passed", scope: "current engineering, docs integrity, compiled product identity and preservation; old P1 runtime retained, fresh human P2 unrun", code_fingerprint: fp, build_input_digest: identity.build_input_digest, verified_at: new Date().toISOString(), full_check_downstream_commands: 70, focused_commands: 14, artifacts: manifest };
await writeFile(base + "final-verification.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ result: result.result, code_fingerprint: fp, artifacts: manifest.length, pending: "save/close existing workbench, safe two-service update and fresh human WIN-01/03/08" }));
