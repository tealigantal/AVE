import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { fingerprint } from "../../scripts/docs/fingerprint.mjs";

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
