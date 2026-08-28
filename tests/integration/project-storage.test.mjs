import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createProject, openProject, putObject } from "../../packages/platform/project-storage/src/project-storage.mjs";

const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-project-"));
const missingDatabaseRoot = await mkdtemp(resolve(tmpdir(), "ai-vlog-project-missing-"));
try {
  const first = await createProject(root); const manifest = JSON.parse(await readFile(resolve(root, "project.json"), "utf8")); assert.equal(manifest.project_format_version, 2); assert.equal(first.db.prepare("SELECT format_version FROM project_format").get().format_version, 2); assert.equal(first.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get(), undefined);
  await assert.rejects(() => openProject(root), /already locked/);
  const object = await putObject(root, Buffer.from("stable-object")); assert.equal(object.hash.length, 64);
  await first.close();
  const reopened = await openProject(root); assert.equal(reopened.db.prepare("SELECT COUNT(*) AS count FROM projects").get().count, 1); await reopened.close(); await writeFile(resolve(root, "project.lock"), "999999999\n"); const recovered = await openProject(root); await recovered.close();
  const manifestBeforeDuplicateCreate = await readFile(resolve(root, "project.json")); const databaseBeforeDuplicateCreate = await readFile(resolve(root, "project.sqlite"));
  await assert.rejects(() => createProject(root), /project already exists/);
  assert.deepEqual(await readFile(resolve(root, "project.json")), manifestBeforeDuplicateCreate, "duplicate create must not replace the manifest"); assert.deepEqual(await readFile(resolve(root, "project.sqlite")), databaseBeforeDuplicateCreate, "duplicate create must not alter the database");
  const databaseBefore = await readFile(resolve(root, "project.sqlite"));
  await writeFile(resolve(root, "project.json"), JSON.stringify({ ...manifest, project_format_version: 1 }, null, 2) + "\n");
  await assert.rejects(() => openProject(root), /unsupported project format: expected v2/);
  assert.deepEqual(await readFile(resolve(root, "project.sqlite")), databaseBefore, "rejected old manifest must not alter the database");
  await writeFile(resolve(root, "project.json"), JSON.stringify(manifest, null, 2) + "\n");
  const invalidDatabase = new DatabaseSync(resolve(root, "project.sqlite")); invalidDatabase.exec("DELETE FROM project_format"); invalidDatabase.close();
  const invalidDatabaseBeforeOpen = await readFile(resolve(root, "project.sqlite"));
  await assert.rejects(() => openProject(root), /unsupported project database format: expected v2/);
  assert.deepEqual(await readFile(resolve(root, "project.sqlite")), invalidDatabaseBeforeOpen, "rejected database identity must not be changed while opening");
  await writeFile(resolve(missingDatabaseRoot, "project.json"), JSON.stringify(manifest, null, 2) + "\n");
  await assert.rejects(() => openProject(missingDatabaseRoot), /project database is missing/);
  await assert.rejects(() => readFile(resolve(missingDatabaseRoot, "project.sqlite")), /ENOENT/, "open must not create a missing database");
} finally { await rm(root, { recursive: true, force: true }); await rm(missingDatabaseRoot, { recursive: true, force: true }); }
console.log("project storage lifecycle check passed");
