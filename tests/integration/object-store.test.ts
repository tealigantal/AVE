import { strict as assert } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createProject, listOrphanObjects, openProject, putObject, putObjectAndRegister, readObject, registerObjectRef } from "../../packages/platform/project-storage/src/public.js";

const root = await mkdtemp(resolve(tmpdir(), "ai-vlog-object-store-"));
try {
  const session = await createProject(root);
  const projectId = session.manifest.project_id;
  const requiredTables = ["project_state", "asset_locations", "proxy_maps", "requirements", "decisions", "approvals", "locks", "artifact_versions", "artifact_edges", "artifact_heads", "jobs", "job_attempts", "model_runs", "qc_issues", "privacy_ledger", "rights_ledger", "object_store", "object_refs"];
  const tables = new Set(session.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((entry: any) => entry.name));
  for (const table of requiredTables) assert.equal(tables.has(table), true, `missing blueprint table ${table}`);
  const bytes = Buffer.from("timeline snapshot object");
  const stored = await putObjectAndRegister(session, projectId, bytes, { object_ref_id: `${projectId}:timeline:1`, object_type: "timeline_snapshot", version: 1, relation_key: "timeline:v1" });
  const row = session.db.prepare("SELECT object_hash, byte_length FROM object_store WHERE object_hash = ?").get(stored.hash) as { object_hash: string; byte_length: number };
  assert.equal(row.object_hash, stored.hash); assert.equal(row.byte_length, bytes.byteLength);
  assert.deepEqual(await readObject(root, stored.hash), bytes);
  await writeFile(stored.path, "tampered");
  await assert.rejects(() => readObject(root, stored.hash), /object hash mismatch/);
  await writeFile(stored.path, bytes);
  const broken = { hash: "f".repeat(64), path: resolve(root, "objects", "sha256", "ff", "f".repeat(64)) };
  assert.throws(() => registerObjectRef(session, projectId, broken, { object_type: "broken" }), /object file missing/);
  assert.equal((session.db.prepare("SELECT COUNT(*) AS count FROM object_refs WHERE object_type = 'broken'").get() as { count: number }).count, 0);
  await assert.rejects(() => putObjectAndRegister(session, projectId, Buffer.from("transaction failure orphan"), { object_ref_id: `${projectId}:timeline:1`, object_type: "duplicate" }), /UNIQUE|constraint/i);
  assert.equal((session.db.prepare("SELECT COUNT(*) AS count FROM object_refs WHERE object_ref_id = ?").get(`${projectId}:timeline:1`) as { count: number }).count, 1);
  const orphan = await putObject(root, Buffer.from("orphan object"));
  const candidates = await listOrphanObjects(session, root);
  assert.ok(candidates.includes(orphan.path));
  await listOrphanObjects(session, root, { deleteOrphans: true });
  await assert.rejects(() => readFile(orphan.path));
  await session.close();
  const reopened = await openProject(root);
  assert.equal((reopened.db.prepare("SELECT COUNT(*) AS count FROM object_refs WHERE object_hash = ?").get(stored.hash) as { count: number }).count, 1);
  assert.deepEqual(await readObject(root, stored.hash), bytes);
  await reopened.close();
} finally {
  if (typeof global.gc === "function") global.gc();
  await new Promise((resolve) => setTimeout(resolve, 50));
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
console.log("object store transaction/hash/GC check passed");
