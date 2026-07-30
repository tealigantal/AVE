import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { closeSync, fsyncSync, openSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";

const migration = await readFile(resolve(import.meta.dirname, "../../../../database/migrations/0001_project_core.sql"), "utf8");
const root = resolve(process.env.TEMP ?? ".", "ai-vlog-storage-smoke");
await rm(root, { recursive: true, force: true }); await mkdir(root, { recursive: true });
const dbPath = resolve(root, "project.sqlite"), db = new DatabaseSync(dbPath); db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
db.exec(migration); db.prepare("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)").run(1, new Date().toISOString());
const projectId = randomUUID(); db.prepare("INSERT INTO projects VALUES (?, ?, ?, ?)").run(projectId, 1, new Date().toISOString(), 0);
db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "project.created", "{}", new Date().toISOString());
const objectDir = resolve(root, "objects", "sha256", "aa"); await mkdir(objectDir, { recursive: true }); const bytes = Buffer.from("object-store-smoke"); const hash = createHash("sha256").update(bytes).digest("hex"); const temp = resolve(root, "temp-object"); const final = resolve(root, "objects", "sha256", hash.slice(0, 2), hash); await mkdir(dirname(final), { recursive: true }); await writeFile(temp, bytes); const fd = openSync(temp, "r+"); fsyncSync(fd); closeSync(fd); await rename(temp, final);
const integrity = db.prepare("PRAGMA integrity_check").get(); if (integrity.integrity_check !== "ok") throw new Error("SQLite integrity check failed");
db.close(); await rm(root, { recursive: true, force: true }); console.log("storage check passed (migration, WAL, object atomic write, integrity)");
