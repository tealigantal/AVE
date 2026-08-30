import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { fingerprint } from "../../scripts/docs/fingerprint.mjs";
import { scopeFingerprint } from "../../scripts/docs/evidence-scope.mjs";
import { assertCurrentInterfaces } from "../../scripts/docs/interface-drift.mjs";
import { normalizeGeneratedText, render } from "../../scripts/docs/sync.mjs";

const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "ave-fingerprint-"));
try {
  await run("git", ["init"], { cwd: root });
  await mkdir(resolve(root, "packages", "unicode space"), { recursive: true });
  await mkdir(resolve(root, "scripts", "docs"), { recursive: true });
  const tracked = resolve(root, "packages", "unicode space", "文件.ts");
  await writeFile(tracked, "a\r\nb\r\n");
  const governedInputs = new Map([
    ["scripts/docs/check.mjs", "export const check = true;\n"],
    ["tsconfig.json", "{\"extends\":\"./tsconfig.base.json\"}\n"],
    ["tsconfig.base.json", "{\"compilerOptions\":{}}\n"],
    ["pnpm-workspace.yaml", "packages:\n  - packages/*\n"],
    ["dependency-cruiser.cjs", "module.exports = {};\n"],
    ["pyproject.toml", "[project]\nname = 'ave'\n"],
    ["uv.lock", "version = 1\n"],
  ]);
  for (const [path, contents] of governedInputs) await writeFile(resolve(root, path), contents);
  await writeFile(resolve(root, ".gitignore"), "packages/ignored.ts\n");
  await run("git", ["add", "."], { cwd: root });
  const crlf = await fingerprint(root);
  for (const [path, contents] of governedInputs) {
    await writeFile(resolve(root, path), `${contents}changed\n`);
    assert.notEqual(await fingerprint(root), crlf, `${path} must invalidate the fingerprint`);
    await writeFile(resolve(root, path), contents);
    assert.equal(await fingerprint(root), crlf, `${path} restoration must restore the fingerprint`);
  }
  await writeFile(tracked, "a\nb\n");
  assert.equal(await fingerprint(root), crlf, "CRLF and LF worktrees must hash identically");
  await writeFile(resolve(root, "packages", "untracked.ts"), "untracked");
  const withUntracked = await fingerprint(root);
  assert.notEqual(withUntracked, crlf, "untracked source files must invalidate the fingerprint");
  await writeFile(resolve(root, "packages", "ignored.ts"), "ignored");
  assert.equal(await fingerprint(root), withUntracked, "ignored files must not enter the source list");
  await unlink(tracked);
  assert.notEqual(await fingerprint(root), withUntracked, "an explicit worktree deletion must invalidate the fingerprint without requiring index staging");
  await assert.rejects(fingerprint(resolve(root, "not-a-repository")), /ENOENT|git/i, "git discovery failure must fail closed");
} finally {
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

console.log("fail-closed repository fingerprint checks passed");

assert.equal(normalizeGeneratedText("line one\r\nline two\r\n"), "line one\nline two\n", "generated-document comparison must ignore checkout line-ending conversion");

const rendered = render({
  registry: { active_program_id: "test-program" },
  programs: [{
    registration: { program_id: "test-program", specification_root: "docs/specifications/test" },
    manifest: { program_id: "test-program", work_packages: [] },
    capabilities: [{ capability_id: "CAP-TEST", status: "blocked" }],
    acceptances: [],
    state: {
      active_work_package: null,
      next_ready_work_packages: [],
      code_fingerprint: "fingerprint",
      latest_evidence_id: "EVD-TEST",
      debts: [{ debt_id: "DEBT-TEST", summary: "Explicit blocker", status: "active", capability_ids: ["CAP-TEST"], acceptance_ids: ["ACC-TEST"], exit_condition: "Pass the missing test." }],
    },
  }],
});
assert.match(rendered["docs/current/DEBT.md"], /DEBT-TEST: Explicit blocker/);
assert.match(rendered["docs/current/DEBT.md"], /Pass the missing test\./);
assert.match(rendered["docs/current/STATUS.md"], /blocked.*CAP-TEST/);
console.log("machine-readable debt and capability status rendering passed");

const scopeRoot = await mkdtemp(resolve(tmpdir(), "ave-evidence-scope-"));
try {
  await run("git", ["init"], { cwd: scopeRoot });
  await mkdir(resolve(scopeRoot, "packages", "feature"), { recursive: true });
  await mkdir(resolve(scopeRoot, "docs", "program"), { recursive: true });
  await writeFile(resolve(scopeRoot, "packages", "feature", "owned.ts"), "export const owned = 1;\n");
  await writeFile(resolve(scopeRoot, "docs", "program", "governance.json"), "{\"scope\":\"feature\"}\n");
  await writeFile(resolve(scopeRoot, "docs", "unrelated.md"), "governance one\n");
  await run("git", ["add", "."], { cwd: scopeRoot });
  const scope = { scope_id: "feature", include: ["packages/feature/**"], definition: { version: 1 } };
  const baseline = await scopeFingerprint(scopeRoot, scope);
  assert.equal(await scopeFingerprint(scopeRoot, { ...scope, include: ["packages\\feature\\**"] }), baseline, "Windows and POSIX scope paths must hash identically");
  await writeFile(resolve(scopeRoot, "docs", "unrelated.md"), "governance two\n");
  assert.equal(await scopeFingerprint(scopeRoot, scope), baseline, "unrelated governance must not invalidate feature Evidence");
  await writeFile(resolve(scopeRoot, "packages", "feature", "owned.ts"), "export const owned = 2;\n");
  assert.notEqual(await scopeFingerprint(scopeRoot, scope), baseline, "owned implementation must invalidate feature Evidence");
  await assert.rejects(scopeFingerprint(scopeRoot, { scope_id: "bypass", include: [], definition: { version: 1 } }), /scope include/i, "empty scope must fail closed");
} finally {
  await rm(scopeRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

console.log("impact-scoped Evidence fingerprint regression checks passed");

const interfaceRoot = await mkdtemp(resolve(tmpdir(), "ave-interface-drift-"));
try {
  for (const directory of ["contracts/schemas/editorial", "docs/product", "docs/architecture", "docs/program", "docs/archive", "docs/decisions"]) await mkdir(resolve(interfaceRoot, directory), { recursive: true });
  await writeFile(resolve(interfaceRoot, "AGENTS.md"), "Current authority.\n");
  await writeFile(resolve(interfaceRoot, "README.md"), "Current authority.\n");
  await writeFile(resolve(interfaceRoot, "contracts/README.md"), "Contract entry.\n");
  await writeFile(resolve(interfaceRoot, "contracts/schemas/editorial/story.v2.schema.json"), "{}\n");
  await writeFile(resolve(interfaceRoot, "docs/product/current.md"), "contracts/schemas/editorial/story.v2.schema.json\n");
  await assertCurrentInterfaces(interfaceRoot);
  await writeFile(resolve(interfaceRoot, "contracts/schemas/editorial/story.v1.schema.json"), "{}\n");
  await assert.rejects(assertCurrentInterfaces(interfaceRoot), /multiple current Contract majors/, "two majors in one family must fail");
  await rm(resolve(interfaceRoot, "contracts/schemas/editorial/story.v1.schema.json"));
  await writeFile(resolve(interfaceRoot, "docs/product/current.md"), "contracts/schemas/editorial/story.v1.schema.json\n");
  await assert.rejects(assertCurrentInterfaces(interfaceRoot), /references deleted Contract interface/, "current authority must not reference a deleted interface");
  await writeFile(resolve(interfaceRoot, "docs/product/current.md"), "contracts/schemas/editorial/story.v2.schema.json\n");
  await writeFile(resolve(interfaceRoot, "docs/archive/old.md"), "contracts/schemas/editorial/story.v1.schema.json\n");
  await assertCurrentInterfaces(interfaceRoot);
} finally {
  await rm(interfaceRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

console.log("current-interface drift regression checks passed");
