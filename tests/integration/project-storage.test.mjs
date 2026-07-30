import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, openProject, putObject } from "../../packages/platform/project-storage/src/project-storage.mjs";

const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-project-"));
try {
  const first = await createProject(root); const manifest = JSON.parse(await readFile(resolve(root, "project.json"), "utf8")); assert.equal(manifest.project_format_version, 1);
  await assert.rejects(() => openProject(root), /already locked/);
  const object = await putObject(root, Buffer.from("stable-object")); assert.equal(object.hash.length, 64);
  await first.close();
  const reopened = await openProject(root); assert.equal(reopened.db.prepare("SELECT COUNT(*) AS count FROM projects").get().count, 1); await reopened.close(); await writeFile(resolve(root, "project.lock"), "999999999\n"); const recovered = await openProject(root); await recovered.close();
} finally { await rm(root, { recursive: true, force: true }); }
console.log("project storage lifecycle check passed");
