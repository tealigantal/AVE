import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { fingerprint } from "../../scripts/docs/fingerprint.mjs";
import { render } from "../../scripts/docs/sync.mjs";

const run = promisify(execFile);
const root = await mkdtemp(resolve(tmpdir(), "ave-fingerprint-"));
try {
  await run("git", ["init"], { cwd: root });
  await mkdir(resolve(root, "packages", "unicode space"), { recursive: true });
  const tracked = resolve(root, "packages", "unicode space", "文件.ts");
  await writeFile(tracked, "a\r\nb\r\n");
  await writeFile(resolve(root, ".gitignore"), "packages/ignored.ts\n");
  await run("git", ["add", "."], { cwd: root });
  const crlf = await fingerprint(root);
  await writeFile(tracked, "a\nb\n");
  assert.equal(await fingerprint(root), crlf, "CRLF and LF worktrees must hash identically");
  await writeFile(resolve(root, "packages", "untracked.ts"), "untracked");
  const withUntracked = await fingerprint(root);
  assert.notEqual(withUntracked, crlf, "untracked source files must invalidate the fingerprint");
  await writeFile(resolve(root, "packages", "ignored.ts"), "ignored");
  assert.equal(await fingerprint(root), withUntracked, "ignored files must not enter the source list");
  await unlink(tracked);
  await assert.rejects(fingerprint(root), /ENOENT/, "missing tracked files must fail closed");
  await assert.rejects(fingerprint(resolve(root, "not-a-repository")), /ENOENT|git/i, "git discovery failure must fail closed");
} finally {
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}

console.log("fail-closed repository fingerprint checks passed");

const rendered = render({
  manifest: { work_packages: [] },
  caps: [{ capability_id: "CAP-TEST", status: "blocked" }],
  accept: [],
  state: {
    active_work_package: null,
    next_ready_work_packages: [],
    code_fingerprint: "fingerprint",
    latest_evidence_id: "EVD-TEST",
    debts: [{ debt_id: "DEBT-TEST", summary: "Explicit blocker", status: "active", capability_ids: ["CAP-TEST"], acceptance_ids: ["ACC-TEST"], exit_condition: "Pass the missing test." }],
  },
});
assert.match(rendered["docs/current/DEBT.md"], /DEBT-TEST: Explicit blocker/);
assert.match(rendered["docs/current/DEBT.md"], /Pass the missing test\./);
assert.match(rendered["docs/current/STATUS.md"], /blocked.*CAP-TEST/);
console.log("machine-readable debt and capability status rendering passed");
