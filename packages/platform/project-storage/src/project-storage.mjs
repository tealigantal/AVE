import { DatabaseSync } from "node:sqlite";
import { closeSync, constants, createReadStream, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync, renameSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { renderExecutionPlanV2Validator, renderOutputManifestV2Validator } from "../../contract-runtime/src/public.mjs";

const PROJECT_FORMAT_VERSION = 2;
const PROJECT_FORMAT_BASELINE = readFileSync(resolve(import.meta.dirname, "../../../../database/project-format-v2.sql"), "utf8");
function databaseSchemaIdentity(db) { return createHash("sha256").update(JSON.stringify(db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").all())).digest("hex"); }
const PROJECT_FORMAT_SCHEMA_IDENTITY = (() => { const db = new DatabaseSync(":memory:"); try { db.exec(PROJECT_FORMAT_BASELINE); return databaseSchemaIdentity(db); } finally { db.close(); } })();

export async function createProject(projectDirectory, { portable = false } = {}) {
  await mkdir(projectDirectory, { recursive: true });
  const lock = acquireProjectLock(projectDirectory);
  const projectId = randomUUID();
  const createdAt = new Date().toISOString();
  const manifest = { project_id: projectId, project_format_version: PROJECT_FORMAT_VERSION, database: "project.sqlite", created_at: createdAt, portable };
  const manifestPath = resolve(projectDirectory, "project.json");
  const databasePath = resolve(projectDirectory, manifest.database);
  let db;
  let ownsManifest = false;
  let ownsDatabase = false;
  try {
    if (existsSync(manifestPath) || existsSync(databasePath)) throw new Error("project already exists");
    await writeAtomic(manifestPath, JSON.stringify(manifest, null, 2) + "\n"); ownsManifest = true;
    for (const directory of ["originals", "links", "derived", "objects/sha256", "previews", "renders", "exports", "licenses", "logs", "crash", "temp"]) await mkdir(resolve(projectDirectory, directory), { recursive: true });
    db = new DatabaseSync(databasePath); ownsDatabase = true;
    db.exec("PRAGMA foreign_keys=ON; BEGIN IMMEDIATE");
    try {
      db.exec(PROJECT_FORMAT_BASELINE);
      db.prepare("INSERT INTO projects VALUES (?, ?, ?, ?)").run(projectId, PROJECT_FORMAT_VERSION, createdAt, portable ? 1 : 0);
      db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "project.created", "{}", createdAt);
      db.exec("COMMIT");
    } catch (error) { try { db.exec("ROLLBACK"); } catch {} throw error; }
    return prepareProjectSession(manifest, projectDirectory, db, lock);
  } catch (error) {
    try { db?.close(); } catch {}
    if (ownsDatabase) { rmSync(databasePath, { force: true }); rmSync(`${databasePath}-wal`, { force: true }); rmSync(`${databasePath}-shm`, { force: true }); }
    if (ownsManifest) rmSync(manifestPath, { force: true });
    await releaseProjectLock(lock);
    throw error;
  }
}

export async function openProject(projectDirectory) {
  const manifest = JSON.parse(await readFile(resolve(projectDirectory, "project.json"), "utf8"));
  if (manifest.database !== "project.sqlite" || manifest.project_format_version !== PROJECT_FORMAT_VERSION) throw new Error("unsupported project format: expected v2");
  const databasePath = resolve(projectDirectory, manifest.database);
  if (!existsSync(databasePath)) throw new Error("project database is missing");
  const lock = acquireProjectLock(projectDirectory);
  let db;
  try {
    if (!existsSync(databasePath)) throw new Error("project database is missing");
    db = new DatabaseSync(databasePath);
    const formatTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'project_format'").get();
    const format = formatTable ? db.prepare("SELECT format_version FROM project_format").get() : null;
    if (!format || Number(format.format_version) !== PROJECT_FORMAT_VERSION) throw new Error("unsupported project database format: expected v2");
    if (databaseSchemaIdentity(db) !== PROJECT_FORMAT_SCHEMA_IDENTITY) throw new Error("unsupported project database schema: expected current v2 baseline");
    const projectCount = Number(db.prepare("SELECT COUNT(*) AS count FROM projects").get().count);
    const project = db.prepare("SELECT project_format_version FROM projects WHERE project_id = ?").get(manifest.project_id);
    if (projectCount !== 1 || Number(project?.project_format_version) !== PROJECT_FORMAT_VERSION) throw new Error("project manifest and database identity mismatch");
    return prepareProjectSession(manifest, projectDirectory, db, lock);
  } catch (error) { try { db?.close(); } catch {} await releaseProjectLock(lock); throw error; }
}

function prepareProjectSession(manifest, projectDirectory, db, lock) {
  db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  const result = db.prepare("PRAGMA integrity_check").get();
  if (result.integrity_check !== "ok") throw new Error("project integrity check failed");
  return { manifest, projectDirectory, db, lock, integrity: result.integrity_check, async close() { db.exec("PRAGMA wal_checkpoint(TRUNCATE)"); db.close(); await releaseProjectLock(lock); } };
}

function acquireProjectLock(projectDirectory) {
  const path = resolve(projectDirectory, "project.lock");
  const owner = { pid: process.pid, token: randomUUID(), created_at: new Date().toISOString() };
  let fd;
  try { fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY); writeFileSync(fd, JSON.stringify(owner), "utf8"); fsyncSync(fd); closeSync(fd); return { path, token: owner.token }; }
  catch (error) { if (fd !== undefined) closeSync(fd); if (error.code === "EEXIST") { let existing; try { const text = readFileSync(path, "utf8").trim(); existing = text.startsWith("{") ? JSON.parse(text) : { pid: Number(text) }; } catch { existing = {}; } if (!Number.isInteger(existing.pid) || existing.pid <= 0) { rmSync(path, { force: true }); return acquireProjectLock(projectDirectory); } try { process.kill(existing.pid, 0); } catch { rmSync(path, { force: true }); return acquireProjectLock(projectDirectory); } throw new Error("project is already locked"); } throw error; }
}

function releaseProjectLock(lock) { if (!existsSync(lock.path)) return; let current; try { current = JSON.parse(readFileSync(lock.path, "utf8")); } catch { return; } if (current.token !== lock.token) throw new Error("project lock ownership changed"); return rm(lock.path, { force: true }); }

function fsyncDirectory(path) { let fd; try { fd = openSync(path, constants.O_RDONLY); fsyncSync(fd); } catch (error) { if (process.platform !== "win32" || !["EPERM", "EACCES", "EISDIR"].includes(error.code)) throw error; } finally { if (fd !== undefined) closeSync(fd); } }
async function writeAtomic(path, contents) { const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`; await writeFile(temporary, contents, "utf8"); const fd = openSync(temporary, "r+"); fsyncSync(fd); closeSync(fd); await rename(temporary, path); fsyncDirectory(dirname(path)); }
function writeAtomicSync(path, contents) { const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`; writeFileSync(temporary, contents); const fd = openSync(temporary, "r+"); fsyncSync(fd); closeSync(fd); renameSync(temporary, path); fsyncDirectory(dirname(path)); }

export async function putObject(projectDirectory, bytes) { const hash = createHash("sha256").update(bytes).digest("hex"); const path = resolve(projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); await mkdir(dirname(path), { recursive: true }); if (!existsSync(path)) await writeAtomic(path, bytes); return { hash, path }; }
export function putObjectSync(projectDirectory, bytes) { const hash = createHash("sha256").update(bytes).digest("hex"); const path = resolve(projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); mkdirSync(dirname(path), { recursive: true }); if (!existsSync(path)) writeAtomicSync(path, bytes); return { hash, path }; }
export async function putObjectAndRegister(session, projectId, bytes, metadata = {}) { const hash = createHash("sha256").update(bytes).digest("hex"); const path = resolve(session.projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); const existed = existsSync(path); const stored = await putObject(session.projectDirectory, bytes); try { registerObjectRef(session, projectId, stored, { ...metadata, byte_length: metadata.byte_length ?? bytes.byteLength }); return stored; } catch (error) { if (!existed && !session.db.prepare("SELECT 1 FROM object_refs WHERE object_hash = ?").get(stored.hash)) await rm(stored.path, { force: true }); throw error; } }
function assertStoredObject(stored) { if (!/^[0-9a-f]{64}$/.test(stored.hash) || !existsSync(stored.path)) throw new Error("object file missing"); const actual = createHash("sha256").update(readFileSync(stored.path)).digest("hex"); if (actual !== stored.hash) throw new Error("object hash mismatch"); }
function insertObjectRefRows(session, projectId, stored, metadata, now) { const reference = { object_ref_id: metadata.object_ref_id ?? randomUUID(), object_type: metadata.object_type ?? "opaque", version: metadata.version ?? null, relation_key: metadata.relation_key ?? null, metadata_json: json(metadata) }; session.db.prepare("INSERT OR IGNORE INTO object_store(object_hash,object_path,byte_length,created_at) VALUES (?, ?, ?, ?)").run(stored.hash, stored.path, Number(metadata.byte_length ?? readFileSync(stored.path).byteLength), now); session.db.prepare("INSERT INTO object_refs(object_ref_id,project_id,object_hash,object_type,version,relation_key,metadata_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(reference.object_ref_id, projectId, stored.hash, reference.object_type, reference.version, reference.relation_key, reference.metadata_json, now); return { ...reference, object_hash: stored.hash, path: stored.path }; }
export function registerObjectRef(session, projectId, stored, metadata = {}) { assertStoredObject(stored); const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE"); try { const reference = insertObjectRefRows(session, projectId, stored, metadata, now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "object.ref.registered", json(reference), now); session.db.exec("COMMIT"); return reference; } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export async function readObject(projectDirectory, hash) { const path = resolve(projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); const bytes = await readFile(path); const actual = createHash("sha256").update(bytes).digest("hex"); if (actual !== hash) throw new Error("object hash mismatch"); return bytes; }
export function readObjectSync(projectDirectory, hash) { const path = resolve(projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); const bytes = readFileSync(path); const actual = createHash("sha256").update(bytes).digest("hex"); if (actual !== hash) throw new Error("object hash mismatch"); return bytes; }
export async function listOrphanObjects(session, projectDirectory, { deleteOrphans = false } = {}) { const referenced = new Set(session.db.prepare("SELECT object_hash FROM object_refs").all().map((row) => row.object_hash)); const root = resolve(projectDirectory, "objects", "sha256"); const candidates = []; for (const shard of await readdir(root, { withFileTypes: true }).catch(() => [])) { if (!shard.isDirectory() || !/^[0-9a-f]{2}$/.test(shard.name)) continue; for (const entry of await readdir(resolve(root, shard.name), { withFileTypes: true })) { if (!entry.isFile() || !/^[0-9a-f]{64}$/.test(entry.name) || referenced.has(entry.name)) continue; const path = resolve(root, shard.name, entry.name); candidates.push(path); if (deleteOrphans) await rm(path, { force: true }); } } if (deleteOrphans) { session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("DELETE FROM object_store WHERE object_hash NOT IN (SELECT object_hash FROM object_refs)").run(); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } } return candidates; }

export async function auditObjectStore(session) { const rows = session.db.prepare("SELECT object_hash, object_path, byte_length FROM object_store ORDER BY object_hash").all(); for (const row of rows) { if (!existsSync(row.object_path)) throw new Error(`object file missing: ${row.object_hash}`); const hash = createHash("sha256"); let length = 0; for await (const chunk of createReadStream(row.object_path, { highWaterMark: 1024 * 1024 })) { hash.update(chunk); length += chunk.byteLength; } if (hash.digest("hex") !== row.object_hash || length !== row.byte_length) throw new Error(`object hash mismatch: ${row.object_hash}`); } return { checked: rows.length }; }

export function commitTimeline(session, projectId, timeline, command, baseVersion) { const snapshot = JSON.stringify(timeline, (_, value) => typeof value === "bigint" ? `${value}n` : value); const commandJson = JSON.stringify(command, (_, value) => typeof value === "bigint" ? `${value}n` : value); const stored = putObjectSync(session.projectDirectory, Buffer.from(snapshot)); const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE"); try { insertObjectRefRows(session, projectId, stored, { object_ref_id: `${projectId}:timeline:${timeline.version}`, object_type: "timeline_snapshot", version: timeline.version, relation_key: `timeline:${timeline.version}`, byte_length: Buffer.byteLength(snapshot) }, now); session.db.prepare("INSERT INTO timeline_versions(timeline_version, project_id, created_at) VALUES (?, ?, ?)").run(timeline.version, projectId, now); session.db.prepare("INSERT INTO timeline_commands(project_id, base_version, command_json, created_at) VALUES (?, ?, ?, ?)").run(projectId, baseVersion, commandJson, now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "timeline.committed", json({ ...command, snapshot_object_hash: stored.hash }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }

export function commitTimelinePlan(session, projectId, timeline, plan, redo = null, atomicArtifacts = []) {
  const stringify = (value) => JSON.stringify(value, (_, item) => typeof item === "bigint" ? `${item}n` : item);
  const storeForCommit = (payload) => { const bytes = Buffer.from(payload), hash = createHash("sha256").update(bytes).digest("hex"), path = resolve(session.projectDirectory, "objects", "sha256", hash.slice(0, 2), hash), existed = existsSync(path), stored = putObjectSync(session.projectDirectory, bytes); trackStage2ObjectWrite(session, stored.path, existed); return { ...stored, existed }; };
  const reservedMetadataKeys = new Set(["object_ref_id", "object_type", "version", "relation_key", "byte_length"]);
  for (const artifact of atomicArtifacts) {
    const reserved = Object.keys(artifact.metadata ?? {}).find((key) => reservedMetadataKeys.has(key));
    if (reserved) throw new Error(`atomic artifact metadata field is reserved: ${reserved}`);
  }
  let snapshot, planJson, stored;
  const preparedArtifacts = [];
  let transactionStarted = false;
  try {
    snapshot = stringify(timeline);
    planJson = stringify(plan);
    stored = storeForCommit(snapshot);
    for (const artifact of atomicArtifacts) {
      const payload = stringify(artifact.value);
      preparedArtifacts.push({ ...artifact, payload, stored: storeForCommit(payload) });
    }
    const now = new Date().toISOString();
    session.db.exec("BEGIN IMMEDIATE");
    transactionStarted = true;
    const latest = session.db.prepare("SELECT timeline_version FROM timeline_versions WHERE project_id = ? ORDER BY timeline_version DESC LIMIT 1").get(projectId);
    const currentVersion = latest?.timeline_version ?? null;
    if (currentVersion !== plan.base_version) throw new Error(`timeline version conflict: expected ${currentVersion}, received ${plan.base_version}`);
    if (timeline.version !== plan.expected_final_version) throw new Error("commit plan final version mismatch");
    for (const artifact of preparedArtifacts) {
      if (session.db.prepare("SELECT 1 FROM object_refs WHERE object_ref_id = ?").get(artifact.object_ref_id)) throw new Error(`atomic artifact id conflict: ${artifact.object_ref_id}`);
    }
    insertObjectRefRows(session, projectId, stored, { object_ref_id: `${projectId}:timeline:${timeline.version}`, object_type: "timeline_snapshot", version: timeline.version, relation_key: `timeline:${timeline.version}`, byte_length: Buffer.byteLength(snapshot) }, now);
    const insertedArtifactRefs = [];
    for (const artifact of preparedArtifacts) insertedArtifactRefs.push(insertObjectRefRows(session, projectId, artifact.stored, { ...(artifact.metadata ?? {}), object_ref_id: artifact.object_ref_id, object_type: artifact.object_type, version: artifact.version ?? null, relation_key: artifact.relation_key ?? null, byte_length: Buffer.byteLength(artifact.payload) }, now));
    session.db.prepare("INSERT INTO timeline_versions(timeline_version, project_id, created_at) VALUES (?, ?, ?)").run(timeline.version, projectId, now);
    session.db.prepare("INSERT INTO timeline_commands(project_id, base_version, command_json, created_at) VALUES (?, ?, ?, ?)").run(projectId, plan.base_version, planJson, now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "timeline.commit_plan.committed", json({ ...plan, snapshot_object_hash: stored.hash, atomic_artifact_refs: insertedArtifactRefs.map((reference) => reference.object_ref_id) }), now);
    session.db.prepare("DELETE FROM timeline_redo WHERE project_id = ?").run(projectId);
    if (redo) { const redoJson = stringify(redo); session.db.prepare("INSERT INTO timeline_redo(project_id, base_version, commands_json, created_at) VALUES (?, ?, ?, ?)").run(projectId, redo.baseVersion, redoJson, new Date().toISOString()); }
    session.db.exec("COMMIT");
  } catch (error) {
    if (transactionStarted && session.db.isTransaction) session.db.exec("ROLLBACK");
    for (const candidate of [stored, ...preparedArtifacts.map((artifact) => artifact.stored)].filter(Boolean)) {
      if (!candidate.existed && !session.db.prepare("SELECT 1 FROM object_refs WHERE object_hash = ?").get(candidate.hash)) rmSync(candidate.path, { force: true });
    }
    throw error;
  }
}

export function readPresetApplication(session, projectId, applicationId) {
  const reference = session.db.prepare("SELECT object_hash, created_at FROM object_refs WHERE project_id = ? AND object_type IN ('preset_application', 'preset_application_blocker') AND relation_key = ? ORDER BY created_at DESC LIMIT 1").get(projectId, applicationId);
  if (!reference) return null;
  return { value: JSON.parse(readObjectSync(session.projectDirectory, reference.object_hash).toString("utf8")), created_at: reference.created_at, object_hash: reference.object_hash };
}

export function listPresetApplications(session, projectId) {
  return session.db.prepare("SELECT relation_key, object_type, object_hash, created_at FROM object_refs WHERE project_id = ? AND object_type IN ('preset_application', 'preset_application_blocker') ORDER BY created_at ASC").all(projectId).map((row) => ({ application_id: row.relation_key, record_type: row.object_type, value: JSON.parse(readObjectSync(session.projectDirectory, row.object_hash).toString("utf8")), created_at: row.created_at, object_hash: row.object_hash }));
}

export function registerPresetApplicationBlocker(session, projectId, record) {
  const objectRefId = `${projectId}:preset-application:${record.application_id}`;
  const existing = readPresetApplication(session, projectId, record.application_id);
  if (existing) return existing.value.selection_hash === record.selection_hash && existing.value.status === "blocked" && JSON.stringify(existing.value.application_context ?? {}) === JSON.stringify(record.application_context ?? {}) ? existing : (() => { throw new Error(`preset application id conflict: ${record.application_id}`); })();
  const payload = JSON.stringify(record, (_, item) => typeof item === "bigint" ? `${item}n` : item);
  const stored = putObjectSync(session.projectDirectory, Buffer.from(payload));
  const now = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try {
    insertObjectRefRows(session, projectId, stored, { object_ref_id: objectRefId, object_type: "preset_application_blocker", version: record.base_timeline_version, relation_key: record.application_id, byte_length: Buffer.byteLength(payload) }, now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "preset.application.blocked", json({ application_id: record.application_id, selection_hash: record.selection_hash, diagnostics: record.diagnostics }), now);
    session.db.exec("COMMIT");
    return { value: record, created_at: now, object_hash: stored.hash };
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

function timelineSnapshot(session, projectId, version) { const reference = session.db.prepare("SELECT object_hash FROM object_refs WHERE project_id = ? AND object_type = 'timeline_snapshot' AND relation_key = ? ORDER BY created_at DESC LIMIT 1").get(projectId, `timeline:${version}`); if (!reference?.object_hash) throw new Error("current Timeline snapshot object reference is missing"); return readObjectSync(session.projectDirectory, reference.object_hash).toString("utf8"); }
export function readLatestTimeline(session, projectId) { const row = session.db.prepare("SELECT timeline_version FROM timeline_versions WHERE project_id = ? ORDER BY timeline_version DESC LIMIT 1").get(projectId); return row ? timelineSnapshot(session, projectId, row.timeline_version) : null; }
export function readTimelineAtVersion(session, projectId, version) { const row = session.db.prepare("SELECT timeline_version FROM timeline_versions WHERE project_id = ? AND timeline_version = ?").get(projectId, version); return row ? timelineSnapshot(session, projectId, row.timeline_version) : null; }
function trackStage2ObjectWrite(session, path, existed) { if (!existed && session.__stage2NewObjectPaths instanceof Set) session.__stage2NewObjectPaths.add(path); }
function storeJsonInTransaction(session, projectId, value, metadata, now) { const bytes = Buffer.from(json(value)); const hash = createHash("sha256").update(bytes).digest("hex"), path = resolve(session.projectDirectory, "objects", "sha256", hash.slice(0, 2), hash), existed = existsSync(path); const stored = putObjectSync(session.projectDirectory, bytes); trackStage2ObjectWrite(session, stored.path, existed); return insertObjectRefRows(session, projectId, stored, { ...metadata, byte_length: bytes.byteLength }, now); }
export function readLatestTimelineCommand(session, projectId) { return session.db.prepare("SELECT command_json, base_version FROM timeline_commands WHERE project_id = ? ORDER BY command_id DESC LIMIT 1").get(projectId) ?? null; }
export function readTimelineRedo(session, projectId) { const row = session.db.prepare("SELECT base_version, commands_json FROM timeline_redo WHERE project_id = ?").get(projectId); if (!row) return null; const payload = JSON.parse(row.commands_json); if (!payload || typeof payload !== "object" || payload.baseVersion !== row.base_version || !Array.isArray(payload.commands)) throw new Error("current Timeline redo payload is invalid"); return { baseVersion: row.base_version, commands: payload.commands }; }

export async function registerExport(session, projectId, registration) { const bytes = await readFile(registration.path); const sha256 = createHash("sha256").update(bytes).digest("hex"); if (sha256 !== registration.sha256) throw new Error("export hash mismatch"); session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("INSERT INTO render_outputs(export_id,project_id,delivery_id,path,sha256,media_type,qc_report_id,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(registration.export_id, projectId, registration.delivery_id, registration.path, registration.sha256, registration.media_type, registration.qc_report_id, new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "export.registered", JSON.stringify(registration), new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }

export function readExport(session, exportId) { return session.db.prepare("SELECT * FROM render_outputs WHERE export_id = ?").get(exportId) ?? null; }
export function listExports(session, projectId) { return session.db.prepare("SELECT * FROM render_outputs WHERE project_id = ? ORDER BY created_at ASC").all(projectId); }
export function registerModelRun(session, projectId, record) {
  if (!record?.model_run_id || !record.input_object_hash || !record.output_object_hash || !record.status || !record.metadata) throw new Error("invalid model run");
  const now = new Date().toISOString();
  session.db.prepare("INSERT INTO model_runs(model_run_id,project_id,input_object_hash,output_object_hash,status,metadata_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(record.model_run_id, projectId, record.input_object_hash, record.output_object_hash, record.status, JSON.stringify(record.metadata), now);
  session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "model.run.registered", json({ model_run_id: record.model_run_id, status: record.status }), now);
  return readModelRun(session, record.model_run_id);
}
export function listModelRuns(session, projectId) { return session.db.prepare("SELECT model_run_id, project_id, input_object_hash, output_object_hash, status, metadata_json, created_at FROM model_runs WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => ({ ...row, metadata: JSON.parse(row.metadata_json) })); }
export function readModelRun(session, modelRunId) { const row = session.db.prepare("SELECT model_run_id, project_id, input_object_hash, output_object_hash, status, metadata_json, created_at FROM model_runs WHERE model_run_id = ?").get(modelRunId); return row ? { ...row, metadata: JSON.parse(row.metadata_json) } : null; }

export function registerAssetLocation(session, projectId, location) {
  const now = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try { session.db.prepare("INSERT OR REPLACE INTO asset_locations(asset_location_id,project_id,asset_id,location_type,location_ref,verified_at,metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)").run(location.asset_location_id, projectId, location.asset_id, location.location_type, location.location_ref, location.verified_at ?? now, json(location.metadata ?? {})); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'asset.location.registered', ?, ?)").run(projectId, json({ ...location, verified_at: location.verified_at ?? now }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function listAssetLocations(session, projectId) { return session.db.prepare("SELECT asset_location_id, project_id, asset_id, location_type, location_ref, verified_at, metadata_json FROM asset_locations WHERE project_id = ? ORDER BY asset_location_id ASC").all(projectId).map((row) => ({ ...row, metadata: JSON.parse(row.metadata_json) })); }
export function listAssetLocationsForAssets(session, projectId, assetIds) {
  const unique = [...new Set(assetIds)];
  if (unique.length === 0) return [];
  const placeholders = unique.map(() => "?").join(", ");
  return session.db.prepare(`SELECT asset_location_id, project_id, asset_id, location_type, location_ref, verified_at, metadata_json FROM asset_locations WHERE project_id = ? AND asset_id IN (${placeholders}) ORDER BY asset_location_id ASC`).all(projectId, ...unique).map((row) => ({ ...row, metadata: JSON.parse(row.metadata_json) }));
}

export function registerMediaAsset(session, projectId, asset) {
  if (!/^asset:sha256:[0-9a-f]{64}$/.test(asset.asset_id) || asset.algorithm !== "sha256" || asset.asset_id !== `asset:sha256:${asset.digest}` || !Number.isSafeInteger(asset.byte_length) || asset.byte_length < 0) throw new Error("invalid media asset identity");
  const now = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try {
    const existing = session.db.prepare("SELECT digest, byte_length, stream_facts_json FROM media_assets WHERE project_id = ? AND asset_id = ?").get(projectId, asset.asset_id);
    const sanitizeFacts = (value) => Array.isArray(value) ? value.map(sanitizeFacts) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([key]) => !["filename", "path", "input_path"].includes(key)).map(([key, item]) => [key, sanitizeFacts(item)])) : value;
    const facts = json(sanitizeFacts(asset.stream_facts ?? {}));
    if (existing && (existing.digest !== asset.digest || existing.byte_length !== asset.byte_length || existing.stream_facts_json !== facts)) throw new Error("media asset identity conflict");
    session.db.prepare("INSERT OR IGNORE INTO media_assets(project_id,asset_id,algorithm,digest,byte_length,stream_facts_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(projectId, asset.asset_id, asset.algorithm, asset.digest, asset.byte_length, facts, now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'media.asset.verified', ?, ?)").run(projectId, json({ asset_id: asset.asset_id, digest: asset.digest, byte_length: asset.byte_length }), now);
    session.db.exec("COMMIT");
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function registerMediaRelation(session, projectId, relation) {
  if (relation.original_asset_id === relation.proxy_asset_id) throw new Error("Proxy cannot share Original content identity");
  const now = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try {
    session.db.prepare("INSERT OR REPLACE INTO media_relations(relation_id,project_id,original_asset_id,proxy_asset_id,proxy_location_id,proxy_map_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(relation.relation_id, projectId, relation.original_asset_id, relation.proxy_asset_id, relation.proxy_location_id, json(relation.proxy_map), now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'media.proxy.related', ?, ?)").run(projectId, json({ relation_id: relation.relation_id, original_asset_id: relation.original_asset_id, proxy_asset_id: relation.proxy_asset_id }), now);
    session.db.exec("COMMIT");
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function registerMediaDependency(session, projectId, dependency) {
  const now = new Date().toISOString();
  session.db.prepare("INSERT OR REPLACE INTO media_dependencies(dependency_id,project_id,asset_id,artifact_ref_id,state,stale_reason,updated_at) VALUES (?, ?, ?, ?, 'fresh', NULL, ?)").run(dependency.dependency_id, projectId, dependency.asset_id, dependency.artifact_ref_id, now);
}

export function markMediaDependenciesStale(session, projectId, assetId, reason) {
  const now = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try {
    const result = session.db.prepare("UPDATE media_dependencies SET state = 'stale', stale_reason = ?, updated_at = ? WHERE project_id = ? AND asset_id = ? AND state = 'fresh'").run(reason, now, projectId, assetId);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'media.dependencies.stale', ?, ?)").run(projectId, json({ asset_id: assetId, reason, count: Number(result.changes ?? 0) }), now);
    session.db.exec("COMMIT");
    return Number(result.changes ?? 0);
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function listMediaDependencies(session, projectId) { return session.db.prepare("SELECT * FROM media_dependencies WHERE project_id = ? ORDER BY dependency_id").all(projectId); }

export function readLatestRender(session, projectId) { return session.db.prepare("SELECT * FROM render_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT 1").get(projectId) ?? null; }
export function listRenderResults(session, projectId) { return session.db.prepare("SELECT * FROM render_results WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => ({ ...row, original_refs: JSON.parse(row.original_refs_json), proxy_refs: JSON.parse(row.proxy_refs_json), profile: JSON.parse(row.profile_json) })); }
export function readLatestRenderResult(session, projectId, target) { const row = target ? session.db.prepare("SELECT * FROM render_results WHERE project_id = ? AND target = ? ORDER BY created_at DESC LIMIT 1").get(projectId, target) : session.db.prepare("SELECT * FROM render_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 1").get(projectId); if (!row) return null; return { ...row, original_refs: JSON.parse(row.original_refs_json), proxy_refs: JSON.parse(row.proxy_refs_json), profile: JSON.parse(row.profile_json) }; }

function canonicalStorageValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") { if (!Number.isFinite(value)) throw new Error("render bundle contains a non-finite number"); return Object.is(value, -0) ? 0 : value; }
  if (typeof value === "bigint") return { $ave_bigint: value.toString(10) };
  if (Array.isArray(value)) return value.map(canonicalStorageValue);
  if (typeof value === "object") return Object.fromEntries(Object.keys(value).filter((key) => value[key] !== undefined).sort().map((key) => [key, canonicalStorageValue(value[key])]));
  throw new Error(`render bundle contains unsupported value: ${typeof value}`);
}
function canonicalStorageJson(value) { return JSON.stringify(canonicalStorageValue(value)); }
function storeCanonicalJsonInTransaction(session, projectId, value, metadata, now) {
  const bytes = Buffer.from(canonicalStorageJson(value));
  const hash = createHash("sha256").update(bytes).digest("hex"), path = resolve(session.projectDirectory, "objects", "sha256", hash.slice(0, 2), hash), existed = existsSync(path);
  const stored = putObjectSync(session.projectDirectory, bytes);
  trackStage2ObjectWrite(session, stored.path, existed);
  return insertObjectRefRows(session, projectId, stored, { ...metadata, byte_length: bytes.byteLength }, now);
}

export function readIntelligenceEditExecution(session, projectId, executionId) {
  const reference = session.db.prepare("SELECT object_hash, created_at FROM object_refs WHERE project_id = ? AND object_type = 'intelligence_edit_execution' AND relation_key = ? ORDER BY created_at DESC LIMIT 1").get(projectId, executionId);
  if (!reference) return null;
  return { value: JSON.parse(readObjectSync(session.projectDirectory, reference.object_hash).toString("utf8")), object_hash: reference.object_hash, created_at: reference.created_at };
}

function beginOwnedTransaction(session) { if (session.db.isTransaction) return false; session.db.exec("BEGIN IMMEDIATE"); return true; }
function commitOwnedTransaction(session, owned) { if (owned) session.db.exec("COMMIT"); }
function rollbackOwnedTransaction(session, owned) { if (owned) session.db.exec("ROLLBACK"); }

export function runStage2AtomicMutation(session, operation) {
  if (session.__stage2NewObjectPaths) throw new Error("nested Stage 2 atomic mutation is forbidden");
  const newObjectPaths = new Set(), originalExec = session.db.exec.bind(session.db); session.__stage2NewObjectPaths = newObjectPaths; originalExec("BEGIN IMMEDIATE");
  session.db.exec = (sql) => {
    const normalized = String(sql).trim().replace(/;$/, "").toUpperCase();
    if (["BEGIN", "BEGIN IMMEDIATE", "COMMIT", "ROLLBACK"].includes(normalized)) return;
    return originalExec(sql);
  };
  try {
    const result = operation();
    if (result && typeof result.then === "function") throw new Error("Stage 2 atomic mutation callback must be synchronous");
    session.db.exec = originalExec; originalExec("COMMIT"); return result;
  } catch (error) {
    session.db.exec = originalExec; try { originalExec("ROLLBACK"); } catch {}
    for (const path of newObjectPaths) { const hash = path.split(/[\\/]/).at(-1); if (!session.db.prepare("SELECT 1 FROM object_refs WHERE object_hash = ?").get(hash)) rmSync(path, { force: true }); }
    throw error;
  } finally { session.db.exec = originalExec; delete session.__stage2NewObjectPaths; }
}

function feedbackDiagnosisRow(session, row) {
  return row ? { ...row, value: JSON.parse(readObjectSync(session.projectDirectory, row.object_hash).toString("utf8")) } : null;
}

export function readFeedbackDiagnosis(session, projectId, diagnosisId, objectVersion = 1) {
  return feedbackDiagnosisRow(session, session.db.prepare("SELECT * FROM feedback_diagnoses WHERE project_id = ? AND diagnosis_id = ? AND object_version = ?").get(projectId, diagnosisId, objectVersion));
}

export function readFeedbackDiagnosisByInput(session, projectId, inputFingerprint) {
  return feedbackDiagnosisRow(session, session.db.prepare("SELECT * FROM feedback_diagnoses WHERE project_id = ? AND input_fingerprint = ?").get(projectId, inputFingerprint));
}

export function listFeedbackDiagnoses(session, projectId) {
  return session.db.prepare("SELECT * FROM feedback_diagnoses WHERE project_id = ? ORDER BY created_at,diagnosis_id").all(projectId).map((row) => feedbackDiagnosisRow(session, row));
}

export function listFeedbackDiagnosisEdges(session, projectId, diagnosisId, objectVersion = 1) {
  return session.db.prepare("SELECT edge_kind,edge_ordinal,target_id,target_version,target_digest FROM feedback_diagnosis_edges WHERE project_id = ? AND diagnosis_id = ? AND object_version = ? ORDER BY edge_kind,edge_ordinal").all(projectId, diagnosisId, objectVersion);
}

export function registerFeedbackDiagnosis(session, projectId, value) {
  if (!value || value.schema_version !== 2 || value.object_version !== 1 || value.status !== "reviewed" || !value.diagnosis_id || !/^[0-9a-f]{64}$/.test(value.input_fingerprint) || !/^[0-9a-f]{64}$/.test(value.feedback?.digest) || !Number.isInteger(value.base_timeline_ref?.version) || value.base_timeline_ref.version < 1 || !/^[0-9a-f]{64}$/.test(value.base_timeline_ref?.digest)) throw new Error("feedback diagnosis is invalid");
  const payload = canonicalStorageJson(value), objectHash = createHash("sha256").update(payload).digest("hex"), byInput = readFeedbackDiagnosisByInput(session, projectId, value.input_fingerprint), existing = readFeedbackDiagnosis(session, projectId, value.diagnosis_id, value.object_version);
  if (byInput) { if (byInput.object_hash === objectHash) return byInput; throw new Error("feedback diagnosis input fingerprint conflict"); }
  if (existing) { if (existing.object_hash === objectHash) return existing; throw new Error("feedback diagnosis version conflict"); }
  const execution = readIntelligenceEditExecution(session, projectId, value.base_execution_ref.object_id);
  if (!execution || execution.object_hash !== value.base_execution_ref.digest || value.base_execution_ref.object_version !== 1) throw new Error("feedback diagnosis execution is missing or rebound");
  const sameRef = (left, right) => left?.object_id === right?.object_id && left?.object_version === right?.object_version && left?.digest === right?.digest;
  if (!sameRef(execution.value?.story_ref, value.authority_refs?.approved_story_ref) || !sameRef(execution.value?.contract_ref, value.authority_refs?.contract_ref) || !sameRef(execution.value?.capability_snapshot_ref, value.authority_refs?.capability_snapshot_ref) || execution.value?.final_timeline_version !== value.base_timeline_ref.version || execution.value?.decision_refs?.length !== value.authority_refs?.decision_refs?.length || execution.value?.decision_refs?.some((reference, index) => !sameRef(reference, value.authority_refs.decision_refs[index])) || execution.value?.evidence_refs?.length !== value.authority_refs?.evidence_refs?.length || execution.value?.evidence_refs?.some((reference, index) => !sameRef(reference, value.authority_refs.evidence_refs[index]))) throw new Error("feedback diagnosis authority is rebound from execution");
  const story = readEditorialArtifact(session, projectId, "approved_story_plan_v2", value.authority_refs.approved_story_ref.object_id, value.authority_refs.approved_story_ref.object_version), contract = readCreativeContractVersion(session, projectId, value.authority_refs.contract_ref.object_id, value.authority_refs.contract_ref.object_version), capability = readEditorialArtifact(session, projectId, "capability_snapshot", value.authority_refs.capability_snapshot_ref.object_id, value.authority_refs.capability_snapshot_ref.object_version);
  if (story?.object_hash !== value.authority_refs.approved_story_ref.digest || story.lifecycle_status !== "approved" || contract?.object_hash !== value.authority_refs.contract_ref.digest || contract.lifecycle_status !== "approved" || capability?.object_hash !== value.authority_refs.capability_snapshot_ref.digest) throw new Error("feedback diagnosis authority object is unavailable or stale");
  for (const reference of value.authority_refs.decision_refs) { const decision = readEditorialArtifact(session, projectId, "decision_record", reference.object_id, reference.object_version); if (decision?.object_hash !== reference.digest || !["approved", "overridden"].includes(decision.lifecycle_status)) throw new Error("feedback diagnosis Decision is unavailable or stale"); }
  for (const reference of value.authority_refs.evidence_refs) { const evidence = readEvidenceObject(session, reference.object_id); if (evidence?.object_hash !== reference.digest || Number(evidence.value?.evidence_version ?? 1) !== reference.object_version || evidence.value?.review_status !== "approved") throw new Error("feedback diagnosis Evidence is unavailable or stale"); }
  const edges = [
    ["base_execution", 0, value.base_execution_ref],
    ["approved_story", 0, value.authority_refs.approved_story_ref],
    ...value.authority_refs.decision_refs.map((reference, index) => ["decision", index, reference]),
    ...value.authority_refs.evidence_refs.map((reference, index) => ["evidence", index, reference]),
    ["contract", 0, value.authority_refs.contract_ref],
    ["capability_snapshot", 0, value.authority_refs.capability_snapshot_ref],
  ];
  const owned = beginOwnedTransaction(session);
  try {
    const now = new Date().toISOString(), object = storeCanonicalJsonInTransaction(session, projectId, value, { object_ref_id: `${projectId}:feedback-diagnosis:${value.diagnosis_id}:v${value.object_version}`, object_type: "feedback_diagnosis", version: value.object_version, relation_key: value.diagnosis_id }, now);
    session.db.prepare("INSERT INTO feedback_diagnoses(project_id,diagnosis_id,object_version,lifecycle_status,object_hash,input_fingerprint,feedback_digest,base_execution_id,base_execution_digest,base_timeline_version,base_timeline_digest,target_track_id,target_clip_id,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(projectId, value.diagnosis_id, value.object_version, value.status, object.object_hash, value.input_fingerprint, value.feedback.digest, value.base_execution_ref.object_id, value.base_execution_ref.digest, value.base_timeline_ref.version, value.base_timeline_ref.digest, value.target.track_id, value.target.clip_id, now);
    const insert = session.db.prepare("INSERT INTO feedback_diagnosis_edges(project_id,diagnosis_id,object_version,edge_kind,edge_ordinal,target_id,target_version,target_digest) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    for (const [kind, ordinal, reference] of edges) insert.run(projectId, value.diagnosis_id, value.object_version, kind, ordinal, reference.object_id, reference.object_version, reference.digest);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'feedback.diagnosis.registered', ?, ?)").run(projectId, json({ diagnosis_id: value.diagnosis_id, object_version: value.object_version, object_hash: object.object_hash, input_fingerprint: value.input_fingerprint }), now);
    commitOwnedTransaction(session, owned);
    return readFeedbackDiagnosis(session, projectId, value.diagnosis_id, value.object_version);
  } catch (error) { rollbackOwnedTransaction(session, owned); throw error; }
}

export function setAssetLocationPermission(session, projectId, assetId, assetLocationId, decision) {
  if (!['authorized', 'denied'].includes(decision?.permission_state) || typeof decision?.actor_id !== "string" || !decision.actor_id.trim() || typeof decision?.decided_at !== "string" || !Number.isFinite(Date.parse(decision.decided_at)) || typeof decision?.policy_ref?.object_id !== "string" || !decision.policy_ref.object_id || !Number.isSafeInteger(decision.policy_ref.object_version) || decision.policy_ref.object_version < 1 || typeof decision.policy_ref.digest !== "string" || !/^[0-9a-f]{64}$/.test(decision.policy_ref.digest)) throw new Error("invalid asset location permission decision");
  const row = session.db.prepare("SELECT asset_id, metadata_json FROM asset_locations WHERE project_id = ? AND asset_location_id = ?").get(projectId, assetLocationId);
  if (!row || row.asset_id !== assetId) throw new Error("asset location permission target is unknown or rebound");
  const metadata = JSON.parse(row.metadata_json);
  const permission = { permission_state: decision.permission_state, actor_id: decision.actor_id, decided_at: decision.decided_at, policy_ref: decision.policy_ref };
  if (metadata.permission_decision && canonicalStorageJson(metadata.permission_decision) === canonicalStorageJson(permission)) return listAssetLocationsForAssets(session, projectId, [assetId]).find((location) => location.asset_location_id === assetLocationId);
  const now = new Date().toISOString();
  const ownsTransaction = beginOwnedTransaction(session);
  try {
    session.db.prepare("UPDATE asset_locations SET metadata_json = ? WHERE project_id = ? AND asset_location_id = ?").run(json({ ...metadata, permission_state: decision.permission_state, permission_decision: permission }), projectId, assetLocationId);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'asset.permission.recorded', ?, ?)").run(projectId, json({ asset_id: assetId, asset_location_id: assetLocationId, ...permission }), now);
    commitOwnedTransaction(session, ownsTransaction);
    return listAssetLocationsForAssets(session, projectId, [assetId]).find((location) => location.asset_location_id === assetLocationId);
  } catch (error) { rollbackOwnedTransaction(session, ownsTransaction); throw error; }
}
function readRenderBundleRow(session, row) { if (!row) return null; return { ...JSON.parse(readObjectSync(session.projectDirectory, row.bundle_object_hash).toString("utf8")), bundle_object_hash: row.bundle_object_hash, content_hash: row.content_hash, created_at: row.created_at }; }
export function readRenderBundle(session, bundleId) { return readRenderBundleRow(session, session.db.prepare("SELECT * FROM render_bundles WHERE bundle_id = ?").get(bundleId)); }
export function readRenderBundleByIdempotency(session, projectId, idempotencyKey) { return readRenderBundleRow(session, session.db.prepare("SELECT * FROM render_bundles WHERE project_id = ? AND idempotency_key = ?").get(projectId, idempotencyKey)); }

export function registerRenderBundle(session, projectId, bundle, { fail_at: failAt = null } = {}) {
  if (!bundle || bundle.schema_version !== 1 || !bundle.bundle_id || !bundle.idempotency_key || !["completed", "blocked"].includes(bundle.state) || !Array.isArray(bundle.manifests)) throw new Error("invalid render bundle");
  if (bundle.state === "completed" && (!bundle.render?.render_id || !Array.isArray(bundle.results) || bundle.results.length !== 2 || new Set(bundle.results.map((result) => result.target)).size !== 2 || !bundle.results.every((result) => ["preview", "master"].includes(result.target)))) throw new Error("completed render bundle needs Preview and Master results");
  if (bundle.state === "blocked" && (bundle.render || (bundle.results?.length ?? 0) !== 0)) throw new Error("blocked render bundle cannot contain outputs");
  const manifestIds = new Set();
  for (const manifest of bundle.manifests) {
    if (!manifest?.manifest_id || manifestIds.has(manifest.manifest_id) || !["execution_plan", "output_manifest", "blocker_manifest"].includes(manifest.manifest_type)) throw new Error("invalid render bundle manifest");
    manifestIds.add(manifest.manifest_id);
  }
  const manifestCounts = (kind) => bundle.manifests.filter((manifest) => manifest.manifest_type === kind).length;
  if (bundle.state === "completed" && (bundle.manifests.length !== 4 || manifestCounts("execution_plan") !== 2 || manifestCounts("output_manifest") !== 2)) throw new Error("completed render bundle needs two plans and two output manifests");
  if (bundle.state === "blocked" && (bundle.manifests.length !== 3 || manifestCounts("execution_plan") !== 2 || manifestCounts("blocker_manifest") !== 1 || manifestCounts("output_manifest") !== 0)) throw new Error("blocked render bundle needs exactly two plans and one blocker manifest, with no outputs");
  const plans = new Map(bundle.manifests.filter((manifest) => manifest.manifest_type === "execution_plan").map((manifest) => [manifest.value?.target, manifest.value]));
  const hash64 = (value) => typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
  for (const target of ["preview", "master"]) {
    const plan = plans.get(target);
    const semanticHash = typeof plan?.semantic_graph_payload === "string" ? createHash("sha256").update(plan.semantic_graph_payload).digest("hex") : null;
    const cacheKey = typeof plan?.cache_key_payload === "string" ? createHash("sha256").update(plan.cache_key_payload).digest("hex") : null;
    if (!renderExecutionPlanV2Validator(plan) || plan.target !== target || plan.semantic_graph_hash !== semanticHash || plan.cache_key !== cacheKey || plan.plan_id !== `plan-${target}-${cacheKey?.slice(0, 24)}`) throw new Error("render bundle requires schema-exact content-addressed current worker-media@v4 ExecutionPlans");
  }
  if (plans.get("preview").semantic_graph_hash !== plans.get("master").semantic_graph_hash) throw new Error("render bundle Preview and Master semantic identity diverges");
  if (bundle.state === "completed") {
    const outputs = new Map(bundle.manifests.filter((manifest) => manifest.manifest_type === "output_manifest").map((manifest) => [manifest.value?.target, manifest.value]));
    const results = new Map(bundle.results.map((result) => [result.target, result]));
    const expectedPresetLink = (timelineVersion) => ({ semantic_graph_hash: plans.get("preview").semantic_graph_hash, actual_preview_plan_id: plans.get("preview").plan_id, actual_master_plan_id: plans.get("master").plan_id, actual_preview_cache_key: plans.get("preview").cache_key, actual_master_cache_key: plans.get("master").cache_key, timeline_version: timelineVersion });
    for (const target of ["preview", "master"]) {
      const plan = plans.get(target), output = outputs.get(target), result = results.get(target);
      if (!renderOutputManifestV2Validator(output) || output.target !== target || output.render_id !== bundle.render.render_id || output.execution_plan_id !== plan.plan_id || output.semantic_graph_hash !== plan.semantic_graph_hash || output.cache_key !== plan.cache_key || output.output_hash !== result?.output_hash || output.backend_version !== result?.ffmpeg_version || canonicalStorageJson(output.diagnostics) !== canonicalStorageJson(plan.diagnostics)) throw new Error("render bundle output manifest is not schema-exact or bound to the current ExecutionPlan and result");
      if (!result || result.render_result_id !== `${bundle.render.render_id}-${target}` || result.worker_version !== "ave-worker-host-r14" || result.render_id !== bundle.render.render_id || !Number.isSafeInteger(result.timeline_version) || result.timeline_version < 0 || !hash64(result.graph_hash) || !Array.isArray(result.original_refs) || !Array.isArray(result.proxy_refs) || !result.profile || typeof result.profile !== "object" || typeof result.ffmpeg_version !== "string" || !result.ffmpeg_version || typeof result.output_path !== "string" || !hash64(result.output_hash)) throw new Error("render bundle result is not complete current ave-worker-host-r14 output");
      if (output.preset_application_link && Object.entries(expectedPresetLink(result.timeline_version)).some(([key, value]) => output.preset_application_link[key] !== value)) throw new Error("render bundle Preset provenance is not bound to the current plans and result");
    }
    if (results.get("preview").timeline_version !== results.get("master").timeline_version) throw new Error("render bundle Preview and Master Timeline versions diverge");
    const previewPresetLink = outputs.get("preview").preset_application_link ?? null, masterPresetLink = outputs.get("master").preset_application_link ?? null;
    if (canonicalStorageJson(previewPresetLink) !== canonicalStorageJson(masterPresetLink)) throw new Error("render bundle Preview and Master Preset provenance diverges");
  }
  const staged = [];
  const stage = (bytes) => {
    const hash = createHash("sha256").update(bytes).digest("hex"); const path = resolve(session.projectDirectory, "objects", "sha256", hash.slice(0, 2), hash); const existed = existsSync(path); const stored = { ...putObjectSync(session.projectDirectory, bytes), existed, byte_length: bytes.byteLength }; staged.push(stored); return stored;
  };
  let transactionStarted = false;
  try {
    const normalizedResults = (bundle.results ?? []).map((result) => {
      if (!result.output_path || !existsSync(result.output_path) || !/^[0-9a-f]{64}$/.test(result.output_hash)) throw new Error("render bundle output is missing or unhashed");
      const bytes = readFileSync(result.output_path); const actual = createHash("sha256").update(bytes).digest("hex"); if (actual !== result.output_hash) throw new Error("render bundle output hash mismatch"); const stored = stage(bytes); return { ...result, output_path: stored.path, output_object_hash: stored.hash };
    });
    const normalizedRender = bundle.render ? { ...bundle.render, preview_path: normalizedResults.find((result) => result.target === "preview")?.output_path, master_path: normalizedResults.find((result) => result.target === "master")?.output_path } : null;
    const normalized = { ...bundle, ...(normalizedRender ? { render: normalizedRender } : {}), results: normalizedResults };
    const identity = { ...normalized, results: normalizedResults.map(({ output_path: _path, ...result }) => result) };
    const identityPayload = canonicalStorageJson(identity); const contentHash = createHash("sha256").update(identityPayload).digest("hex");
    const existing = session.db.prepare("SELECT * FROM render_bundles WHERE project_id = ? AND idempotency_key = ?").get(projectId, bundle.idempotency_key);
    if (existing) {
      if (existing.content_hash !== contentHash) throw new Error("RENDER_BUNDLE_IDEMPOTENCY_CONFLICT");
      for (const item of staged.filter((item) => !item.existed)) if (!session.db.prepare("SELECT 1 FROM object_store WHERE object_hash = ?").get(item.hash)) rmSync(item.path, { force: true });
      return { ...readRenderBundleRow(session, existing), idempotent: true };
    }
    const bundleObject = stage(Buffer.from(canonicalStorageJson(normalized)));
    const resultObjects = normalizedResults.map((result) => stage(Buffer.from(canonicalStorageJson(result))));
    const manifestObjects = bundle.manifests.map((manifest) => stage(Buffer.from(canonicalStorageJson(manifest.value))));
    const now = new Date().toISOString();
    session.db.exec("BEGIN IMMEDIATE");
    transactionStarted = true;
    if (normalizedRender) {
      session.db.prepare("INSERT INTO render_runs(render_id,project_id,original_path,proxy_path,preview_path,master_path,qc_status,qc_report_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(normalizedRender.render_id, projectId, normalizedRender.original_path, normalizedRender.proxy_path, normalizedRender.preview_path, normalizedRender.master_path, normalizedRender.qc_report.status, json(normalizedRender.qc_report), now);
      if (failAt === "render") throw new Error("RENDER_BUNDLE_FAULT_RENDER");
      for (let index = 0; index < normalizedResults.length; index += 1) {
        const result = normalizedResults[index]; const media = staged[index];
        insertObjectRefRows(session, projectId, media, { object_ref_id: `${projectId}:render-output:${result.render_result_id}`, object_type: "render_output", relation_key: result.render_result_id, byte_length: media.byte_length }, now);
        insertObjectRefRows(session, projectId, resultObjects[index], { object_ref_id: `${projectId}:render-result:${result.render_result_id}`, object_type: "render_result", relation_key: result.render_result_id, byte_length: resultObjects[index].byte_length }, now);
        session.db.prepare("INSERT INTO render_results(render_result_id,render_id,project_id,target,timeline_version,graph_hash,original_refs_json,proxy_refs_json,profile_json,worker_version,ffmpeg_version,output_path,output_hash,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(result.render_result_id, result.render_id, projectId, result.target, result.timeline_version, result.graph_hash, json(result.original_refs), json(result.proxy_refs), json(result.profile), result.worker_version, result.ffmpeg_version, result.output_path, result.output_hash, now);
      }
      if (failAt === "results") throw new Error("RENDER_BUNDLE_FAULT_RESULTS");
    }
    for (let index = 0; index < bundle.manifests.length; index += 1) { const manifest = bundle.manifests[index]; insertObjectRefRows(session, projectId, manifestObjects[index], { object_ref_id: `${projectId}:render-manifest:${manifest.manifest_id}`, object_type: `render_${manifest.manifest_type}`, relation_key: manifest.manifest_id, byte_length: manifestObjects[index].byte_length }, now); }
    if (failAt === "manifests") throw new Error("RENDER_BUNDLE_FAULT_MANIFESTS");
    insertObjectRefRows(session, projectId, bundleObject, { object_ref_id: `${projectId}:render-bundle:${bundle.bundle_id}`, object_type: "render_bundle", relation_key: bundle.bundle_id, byte_length: bundleObject.byte_length }, now);
    session.db.prepare("INSERT INTO render_bundles(bundle_id,project_id,idempotency_key,content_hash,bundle_object_hash,render_id,state,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(bundle.bundle_id, projectId, bundle.idempotency_key, contentHash, bundleObject.hash, normalizedRender?.render_id ?? null, bundle.state, now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `render.bundle.${bundle.state}`, json({ bundle_id: bundle.bundle_id, render_id: normalizedRender?.render_id ?? null, content_hash: contentHash, bundle_object_hash: bundleObject.hash }), now);
    session.db.exec("COMMIT");
    transactionStarted = false;
    return { ...normalized, bundle_object_hash: bundleObject.hash, content_hash: contentHash, created_at: now, idempotent: false };
  } catch (error) {
    if (transactionStarted) session.db.exec("ROLLBACK");
    for (const item of staged.filter((item) => !item.existed)) if (!session.db.prepare("SELECT 1 FROM object_store WHERE object_hash = ?").get(item.hash)) rmSync(item.path, { force: true });
    throw error;
  }
}

function json(value) { return JSON.stringify(value, (_, item) => typeof item === "bigint" ? `${item}n` : item); }
function parseJob(row) { if (!row) return null; return { ...row, input: JSON.parse(row.input_json), output_refs: JSON.parse(row.output_refs_json) }; }
function parseAttempt(row) { if (!row) return null; return { ...row, output_refs: JSON.parse(row.output_refs_json) }; }

export function createPersistentJob(session, projectId, record) {
  const existing = session.db.prepare("SELECT * FROM jobs WHERE project_id = ? AND idempotency_key = ?").get(projectId, record.idempotency_key);
  if (existing) return parseJob(existing);
  const createdAt = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try { session.db.prepare("INSERT INTO jobs(job_id,project_id,task_type,idempotency_key,input_hash,input_json,state,idempotent,attempt,progress,error_class,error_message,output_refs_json,created_at,started_at,completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(record.job_id, projectId, record.task_type, record.idempotency_key, record.input_hash, json(record.input), record.state ?? "PENDING", record.idempotent === false ? 0 : 1, 0, 0, null, null, "[]", createdAt, null, null); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "job.created", json({ job_id: record.job_id, task_type: record.task_type, idempotency_key: record.idempotency_key, input_hash: record.input_hash }), createdAt); session.db.exec("COMMIT"); return parseJob(session.db.prepare("SELECT * FROM jobs WHERE job_id = ?").get(record.job_id)); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readPersistentJob(session, jobId) { return parseJob(session.db.prepare("SELECT * FROM jobs WHERE job_id = ?").get(jobId)); }
export function readPersistentJobByIdempotency(session, projectId, idempotencyKey) { return parseJob(session.db.prepare("SELECT * FROM jobs WHERE project_id = ? AND idempotency_key = ?").get(projectId, idempotencyKey)); }
export function listPersistentJobs(session, projectId) { return session.db.prepare("SELECT * FROM jobs WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map(parseJob); }
export function readPersistentJobAttempts(session, jobId) { return session.db.prepare("SELECT * FROM job_attempts WHERE job_id = ? ORDER BY attempt ASC").all(jobId).map(parseAttempt); }

export function startPersistentJob(session, jobId) {
  const current = readPersistentJob(session, jobId); if (!current) throw new Error("job not found");
  if (!["PENDING", "READY", "RECOVERING", "RETRYABLE_FAILED"].includes(current.state)) throw new Error(`job cannot start from ${current.state}`);
  const now = new Date().toISOString(); const attempt = current.attempt + 1;
  session.db.exec("BEGIN IMMEDIATE");
  try { session.db.prepare("UPDATE jobs SET state = 'RUNNING', attempt = ?, progress = 0, error_class = NULL, error_message = NULL, started_at = ?, completed_at = NULL WHERE job_id = ?").run(attempt, now, jobId); session.db.prepare("INSERT INTO job_attempts(job_id,attempt,state,progress,error_class,error_message,output_refs_json,created_at,started_at,completed_at) VALUES (?, ?, 'RUNNING', 0, NULL, NULL, '[]', ?, ?, NULL)").run(jobId, attempt, now, now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) SELECT project_id, 'job.started', ?, ? FROM jobs WHERE job_id = ?").run(json({ job_id: jobId, attempt }), now, jobId); session.db.exec("COMMIT"); return readPersistentJob(session, jobId); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function updatePersistentJobProgress(session, jobId, progress) { const value = Math.max(0, Math.min(1, Number(progress))); session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("UPDATE jobs SET progress = ? WHERE job_id = ? AND state = 'RUNNING'").run(value, jobId); session.db.prepare("UPDATE job_attempts SET progress = ? WHERE job_id = (SELECT job_id FROM jobs WHERE job_id = ?) AND state = 'RUNNING'").run(value, jobId); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }

export function finishPersistentJob(session, jobId, result) {
  const current = readPersistentJob(session, jobId); if (!current) throw new Error("job not found");
  const now = new Date().toISOString(); const outputs = result.output_refs ?? [];
  session.db.exec("BEGIN IMMEDIATE");
  try { session.db.prepare("UPDATE jobs SET state = ?, progress = ?, error_class = ?, error_message = ?, output_refs_json = ?, completed_at = ? WHERE job_id = ?").run(result.state, result.state === "SUCCEEDED" ? 1 : current.progress, result.error_class ?? null, result.error_message ?? null, json(outputs), now, jobId); session.db.prepare("UPDATE job_attempts SET state = ?, progress = ?, error_class = ?, error_message = ?, output_refs_json = ?, completed_at = ? WHERE job_id = ? AND attempt = ?").run(result.state, result.state === "SUCCEEDED" ? 1 : current.progress, result.error_class ?? null, result.error_message ?? null, json(outputs), now, jobId, current.attempt); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) SELECT project_id, ?, ?, ? FROM jobs WHERE job_id = ?").run(`job.${String(result.state).toLowerCase()}`, json({ job_id: jobId, state: result.state, error_class: result.error_class ?? null }), now, jobId); session.db.exec("COMMIT"); return readPersistentJob(session, jobId); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function recoverPersistentJobs(session, projectId) {
  const rows = session.db.prepare("SELECT job_id FROM jobs WHERE project_id = ? AND state = 'RUNNING'").all(projectId); if (!rows.length) return [];
  const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE");
  try { for (const row of rows) { session.db.prepare("UPDATE jobs SET state = 'RECOVERING', error_class = 'WORKER_CRASH', error_message = 'host restart recovered an active job' WHERE job_id = ?").run(row.job_id); session.db.prepare("UPDATE job_attempts SET state = 'RECOVERING', error_class = 'WORKER_CRASH', error_message = 'host restart recovered an active job' WHERE job_id = ? AND state = 'RUNNING'").run(row.job_id); } session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'jobs.recovered', ?, ?)").run(projectId, json({ job_ids: rows.map((row) => row.job_id) }), now); session.db.exec("COMMIT"); return listPersistentJobs(session, projectId).filter((job) => rows.some((row) => row.job_id === job.job_id)); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function registerEvidence(session, projectId, evidence) {
  const contentField = evidence.analysis_type === "scene" ? evidence.label : evidence.text;
  if (!["asr", "ocr", "scene"].includes(evidence.analysis_type)) throw new Error("unsupported analysis type");
  if (!/^asset:sha256:[0-9a-f]{64}$/.test(evidence.asset_id)) throw new Error("invalid asset id");
  if (!Number.isInteger(evidence.start_pts) || !Number.isInteger(evidence.end_pts) || evidence.start_pts < 0 || evidence.end_pts <= evidence.start_pts) throw new Error("invalid evidence range");
  if (typeof contentField !== "string" || !contentField.trim()) throw new Error("empty evidence");
  const ownsTransaction = beginOwnedTransaction(session);
  try {
    const now = new Date().toISOString(); const object = storeCanonicalJsonInTransaction(session, projectId, evidence, { object_ref_id: `${projectId}:evidence:${evidence.evidence_id}`, object_type: "evidence_graph", relation_key: evidence.evidence_id }, now);
    session.db.prepare("INSERT INTO evidence_records(evidence_id,project_id,analysis_type,asset_id,start_pts,end_pts,content,source_json,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(evidence.evidence_id, projectId, evidence.analysis_type, evidence.asset_id, evidence.start_pts, evidence.end_pts, contentField, JSON.stringify({ object_hash: object.object_hash }), now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "evidence.registered", json({ evidence_id: evidence.evidence_id, object_hash: object.object_hash }), now);
    commitOwnedTransaction(session, ownsTransaction);
  } catch (error) { rollbackOwnedTransaction(session, ownsTransaction); throw error; }
}

export function approveEvidence(session, projectId, evidenceId, candidateDigest, review) {
  const candidate = readEvidenceObject(session, evidenceId);
  if (!candidate || candidate.project_id !== projectId || candidate.object_hash !== candidateDigest || candidate.value?.review_status !== "candidate" || !review?.approval_id || !review?.actor_id || !Number.isFinite(Date.parse(review.approved_at)) || !review?.reason?.trim()) throw new Error("Evidence approval target is unavailable or stale");
  const approved = { ...candidate.value, review_status: "approved", review: { approval_id: review.approval_id, actor_id: review.actor_id, approved_at: review.approved_at, review_digest: candidateDigest, reason: review.reason } };
  const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE");
  try {
    const object = storeCanonicalJsonInTransaction(session, projectId, approved, { object_ref_id: `${projectId}:evidence:${evidenceId}:approval:${review.approval_id}`, object_type: "evidence_graph", version: Number(approved.evidence_version ?? 1), relation_key: evidenceId }, now);
    session.db.prepare("UPDATE evidence_records SET source_json = ? WHERE project_id = ? AND evidence_id = ?").run(JSON.stringify({ object_hash: object.object_hash }), projectId, evidenceId);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'evidence.approved', ?, ?)").run(projectId, json({ evidence_id: evidenceId, candidate_digest: candidateDigest, approved_digest: object.object_hash, approval_id: review.approval_id }), now);
    session.db.exec("COMMIT"); return readEvidenceObject(session, evidenceId);
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readEvidence(session, evidenceId) { return session.db.prepare("SELECT * FROM evidence_records WHERE evidence_id = ?").get(evidenceId) ?? null; }
export function readEvidenceObject(session, evidenceId) { const row = readEvidence(session, evidenceId); if (!row) return null; const source = JSON.parse(row.source_json); if (!source.object_hash) throw new Error("evidence object reference is missing"); return { ...row, object_hash: source.object_hash, value: JSON.parse(readObjectSync(session.projectDirectory, source.object_hash).toString("utf8")) }; }
export function listEvidenceObjects(session, projectId) { return session.db.prepare("SELECT evidence_id FROM evidence_records WHERE project_id = ? ORDER BY created_at,evidence_id").all(projectId).map((row) => readEvidenceObject(session, row.evidence_id)); }

function creativeContextRow(session, row) { if (!row) return null; return { ...row, value: JSON.parse(readObjectSync(session.projectDirectory, row.object_hash).toString("utf8")) }; }
export function readCreativeContractVersion(session, projectId, contractId, objectVersion) { return creativeContextRow(session, session.db.prepare("SELECT * FROM creative_contract_versions WHERE project_id = ? AND contract_id = ? AND object_version = ?").get(projectId, contractId, objectVersion)); }
export function readCreativeContractHead(session, projectId, contractId) { return creativeContextRow(session, session.db.prepare("SELECT versions.* FROM creative_contract_heads heads JOIN creative_contract_versions versions ON versions.project_id = heads.project_id AND versions.contract_id = heads.contract_id AND versions.object_version = heads.object_version WHERE heads.project_id = ? AND heads.contract_id = ?").get(projectId, contractId)); }
export function listCreativeContractVersions(session, projectId, contractId) { return session.db.prepare("SELECT * FROM creative_contract_versions WHERE project_id = ? AND contract_id = ? ORDER BY object_version ASC").all(projectId, contractId).map((row) => creativeContextRow(session, row)); }
export function listCreativeContractHeads(session, projectId) { return session.db.prepare("SELECT versions.* FROM creative_contract_heads heads JOIN creative_contract_versions versions ON versions.project_id = heads.project_id AND versions.contract_id = heads.contract_id AND versions.object_version = heads.object_version WHERE heads.project_id = ? ORDER BY versions.created_at,versions.contract_id").all(projectId).map((row) => creativeContextRow(session, row)); }
export function registerCreativeContractVersion(session, projectId, contract) {
  const payload = canonicalStorageJson(contract); const objectHash = createHash("sha256").update(payload).digest("hex");
  const contentDigest = objectHash;
  const existing = readCreativeContractVersion(session, projectId, contract.contract_id, contract.object_version);
  if (existing) { if (existing.object_hash === objectHash && existing.content_digest === contentDigest) return existing; throw new Error("creative contract version conflict"); }
  const now = new Date().toISOString();
  const ownsTransaction = beginOwnedTransaction(session);
  try {
    const object = storeCanonicalJsonInTransaction(session, projectId, contract, { object_ref_id: `${projectId}:creative-contract:${contract.contract_id}:v${contract.object_version}`, object_type: "creative_contract", version: contract.object_version, relation_key: contract.contract_id }, now);
    session.db.prepare("INSERT INTO creative_contract_versions(project_id,contract_id,object_version,lifecycle_status,object_hash,content_digest,approval_review_digest,approved_by,approved_at,supersedes_id,supersedes_version,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(projectId, contract.contract_id, contract.object_version, contract.status, object.object_hash, contentDigest, contract.approval?.review_digest ?? null, contract.approval?.actor_id ?? null, contract.approval?.approved_at ?? null, contract.supersedes_ref?.object_id ?? null, contract.supersedes_ref?.object_version ?? null, now);
    const headChange = session.db.prepare("INSERT INTO creative_contract_heads(project_id,contract_id,object_version,object_hash,updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(project_id,contract_id) DO UPDATE SET object_version=excluded.object_version, object_hash=excluded.object_hash, updated_at=excluded.updated_at WHERE excluded.object_version > creative_contract_heads.object_version").run(projectId, contract.contract_id, contract.object_version, object.object_hash, now);
    if (headChange.changes === 1) {
      session.db.prepare("UPDATE material_evidence_packs SET lifecycle_status = 'stale' WHERE project_id = ? AND contract_id = ? AND contract_digest <> ? AND lifecycle_status NOT IN ('stale', 'superseded')").run(projectId, contract.contract_id, object.object_hash);
      session.db.prepare("UPDATE skill_evaluations SET lifecycle_status = 'stale' WHERE project_id = ? AND contract_id = ? AND contract_digest <> ? AND lifecycle_status <> 'stale'").run(projectId, contract.contract_id, object.object_hash);
      session.db.prepare("UPDATE duration_feasibilities SET lifecycle_status = 'stale' WHERE project_id = ? AND contract_id = ? AND contract_digest <> ? AND lifecycle_status <> 'stale'").run(projectId, contract.contract_id, object.object_hash);
    }
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `creative.contract.${contract.status}`, json({ contract_id: contract.contract_id, object_version: contract.object_version, object_hash: object.object_hash, content_digest: contentDigest }), now);
    commitOwnedTransaction(session, ownsTransaction);
    return readCreativeContractVersion(session, projectId, contract.contract_id, contract.object_version);
  } catch (error) { rollbackOwnedTransaction(session, ownsTransaction); throw error; }
}
export function readCreativeContractDecision(session, projectId, decisionId) { const row = session.db.prepare("SELECT decision_id,project_id,object_hash,status,metadata_json,created_at FROM decisions WHERE project_id = ? AND decision_id = ?").get(projectId, decisionId); return row ? { ...row, metadata: JSON.parse(row.metadata_json), value: row.object_hash ? JSON.parse(readObjectSync(session.projectDirectory, row.object_hash).toString("utf8")) : null } : null; }
export function registerCreativeContractDecision(session, projectId, decision) {
  const payload = canonicalStorageJson(decision); const objectHash = createHash("sha256").update(payload).digest("hex");
  const existing = readCreativeContractDecision(session, projectId, decision.decision_id);
  if (existing) { if (existing.object_hash === objectHash) return existing; throw new Error("creative contract decision conflict"); }
  const now = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try {
    const object = storeCanonicalJsonInTransaction(session, projectId, decision, { object_ref_id: `${projectId}:creative-contract-decision:${decision.decision_id}`, object_type: "creative_contract_decision", relation_key: decision.contract_id }, now);
    session.db.prepare("INSERT INTO decisions(decision_id,project_id,object_hash,status,metadata_json,created_at) VALUES (?, ?, ?, ?, ?, ?)").run(decision.decision_id, projectId, object.object_hash, decision.outcome, json({ contract_id: decision.contract_id, object_version: decision.object_version, actor_id: decision.actor_id }), now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `creative.contract.${decision.outcome}`, json({ decision_id: decision.decision_id, contract_id: decision.contract_id, object_version: decision.object_version, object_hash: object.object_hash }), now);
    session.db.exec("COMMIT");
    return readCreativeContractDecision(session, projectId, decision.decision_id);
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}
export function readMediaAsset(session, projectId, assetId) { const row = session.db.prepare("SELECT project_id,asset_id,algorithm,digest,byte_length,stream_facts_json,created_at FROM media_assets WHERE project_id = ? AND asset_id = ?").get(projectId, assetId); return row ? { ...row, stream_facts: JSON.parse(row.stream_facts_json) } : null; }

export function readMaterialEvidencePack(session, projectId, packId, objectVersion = null) { const row = objectVersion === null ? session.db.prepare("SELECT * FROM material_evidence_packs WHERE project_id = ? AND pack_id = ? ORDER BY object_version DESC LIMIT 1").get(projectId, packId) : session.db.prepare("SELECT * FROM material_evidence_packs WHERE project_id = ? AND pack_id = ? AND object_version = ?").get(projectId, packId, objectVersion); return creativeContextRow(session, row); }
export function readMaterialEvidencePackByInput(session, projectId, inputFingerprint) { return creativeContextRow(session, session.db.prepare("SELECT * FROM material_evidence_packs WHERE project_id = ? AND input_fingerprint = ?").get(projectId, inputFingerprint)); }
export function listMaterialEvidencePacks(session, projectId) { return session.db.prepare("SELECT * FROM material_evidence_packs WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => creativeContextRow(session, row)); }
export function readStage2WorkspaceSnapshot(session, projectId) {
  const ownsTransaction = !session.db.isTransaction;
  if (ownsTransaction) session.db.exec("BEGIN");
  try {
    const result = {
      project_id: projectId,
      contracts: listCreativeContractHeads(session, projectId),
      evidence: listEvidenceObjects(session, projectId),
      material_packs: listMaterialEvidencePacks(session, projectId),
      artifacts: Object.fromEntries([...EDITORIAL_ARTIFACT_TYPES].map((artifactType) => [artifactType, listEditorialArtifacts(session, projectId, artifactType)])),
      feedback_diagnoses: listFeedbackDiagnoses(session, projectId),
      permission_decisions: listStage2PermissionDecisions(session, projectId),
      executions: session.db.prepare("SELECT relation_key,object_hash,created_at FROM object_refs WHERE project_id = ? AND object_type = 'intelligence_edit_execution' ORDER BY created_at,relation_key").all(projectId).map((row) => ({ execution_id: row.relation_key, object_hash: row.object_hash, created_at: row.created_at, value: JSON.parse(readObjectSync(session.projectDirectory, row.object_hash).toString("utf8")) })),
      timeline_json: readLatestTimeline(session, projectId),
      render: readLatestRender(session, projectId),
      render_results: listRenderResults(session, projectId),
    };
    if (ownsTransaction) session.db.exec("COMMIT");
    return result;
  } catch (error) {
    if (ownsTransaction) session.db.exec("ROLLBACK");
    throw error;
  }
}
export function registerMaterialEvidencePack(session, projectId, pack, support = {}) {
  const payload = canonicalStorageJson(pack); const objectHash = createHash("sha256").update(payload).digest("hex");
  const byInput = readMaterialEvidencePackByInput(session, projectId, pack.input_fingerprint);
  if (byInput) { if (byInput.object_hash === objectHash) return byInput; throw new Error("material evidence input fingerprint conflict"); }
  const existing = readMaterialEvidencePack(session, projectId, pack.pack_id, pack.object_version);
  if (existing) { if (existing.object_hash === objectHash) return existing; throw new Error("material evidence pack version conflict"); }
  const now = new Date().toISOString();
  session.db.exec("BEGIN IMMEDIATE");
  try {
    if (support.coverage_matrix) {
      const coveragePayload = canonicalStorageJson(support.coverage_matrix); const coverageDigest = createHash("sha256").update(coveragePayload).digest("hex");
      if (coverageDigest !== pack.coverage_matrix_ref.digest || support.coverage_matrix.matrix_id !== pack.coverage_matrix_ref.object_id) throw new Error("coverage matrix reference mismatch");
      storeCanonicalJsonInTransaction(session, projectId, support.coverage_matrix, { object_ref_id: `${projectId}:coverage-matrix:${pack.pack_id}:v${pack.object_version}`, object_type: "coverage_matrix", version: pack.coverage_matrix_ref.object_version, relation_key: support.coverage_matrix.matrix_id }, now);
    }
    const object = storeCanonicalJsonInTransaction(session, projectId, pack, { object_ref_id: `${projectId}:material-evidence-pack:${pack.pack_id}:v${pack.object_version}`, object_type: "material_evidence_pack", version: pack.object_version, relation_key: pack.pack_id }, now);
    session.db.prepare("INSERT INTO material_evidence_packs(project_id,pack_id,object_version,lifecycle_status,object_hash,input_fingerprint,contract_id,contract_version,contract_digest,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(projectId, pack.pack_id, pack.object_version, pack.status, object.object_hash, pack.input_fingerprint, pack.contract_ref.object_id, pack.contract_ref.object_version, pack.contract_ref.digest, now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'material.evidence-pack.registered', ?, ?)").run(projectId, json({ pack_id: pack.pack_id, object_version: pack.object_version, status: pack.status, object_hash: object.object_hash, input_fingerprint: pack.input_fingerprint }), now);
    session.db.exec("COMMIT");
    return readMaterialEvidencePack(session, projectId, pack.pack_id, pack.object_version);
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readCreativeSkillDefinition(session, projectId, skillId, skillVersion) { return creativeContextRow(session, session.db.prepare("SELECT * FROM creative_skill_definitions WHERE project_id = ? AND skill_id = ? AND skill_version = ?").get(projectId, skillId, skillVersion)); }
export function listCreativeSkillDefinitions(session, projectId) { return session.db.prepare("SELECT * FROM creative_skill_definitions WHERE project_id = ? ORDER BY skill_id ASC, skill_version ASC").all(projectId).map((row) => creativeContextRow(session, row)); }
export function readCreativeSkillDefinitionControl(session, projectId, skillId, skillVersion) { return session.db.prepare("SELECT project_id,skill_id,skill_version,availability,reason,updated_at FROM creative_skill_definition_controls WHERE project_id = ? AND skill_id = ? AND skill_version = ?").get(projectId, skillId, skillVersion) ?? null; }
export function setCreativeSkillDefinitionAvailability(session, projectId, skillId, skillVersion, availability, reason) {
  if (!['retired', 'revoked'].includes(availability) || typeof reason !== 'string' || !reason.trim()) throw new Error("creative skill withdrawal is invalid");
  const definition = readCreativeSkillDefinition(session, projectId, skillId, skillVersion);
  if (!definition) throw new Error("creative skill definition is not pinned");
  const current = readCreativeSkillDefinitionControl(session, projectId, skillId, skillVersion);
  if (current?.availability !== 'active') {
    if (current?.availability === availability && current.reason === reason) return current;
    throw new Error("creative skill definition withdrawal conflict");
  }
  const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE");
  try {
    session.db.prepare("UPDATE creative_skill_definition_controls SET availability = ?, reason = ?, updated_at = ? WHERE project_id = ? AND skill_id = ? AND skill_version = ? AND availability = 'active'").run(availability, reason, now, projectId, skillId, skillVersion);
    session.db.prepare("UPDATE skill_evaluations SET lifecycle_status = 'stale' WHERE project_id = ? AND skill_id = ? AND skill_version = ? AND lifecycle_status <> 'stale'").run(projectId, skillId, skillVersion);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'creative.skill-definition.withdrawn', ?, ?)").run(projectId, json({ skill_id: skillId, skill_version: skillVersion, availability, reason }), now);
    session.db.exec("COMMIT"); return readCreativeSkillDefinitionControl(session, projectId, skillId, skillVersion);
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}
export function registerCreativeSkillDefinition(session, projectId, definition) {
  const payload = canonicalStorageJson(definition); const objectHash = createHash("sha256").update(payload).digest("hex");
  const existing = readCreativeSkillDefinition(session, projectId, definition.skill_id, definition.skill_version);
  if (existing) { if (existing.object_hash === objectHash && existing.definition_digest === definition.definition_digest) return existing; throw new Error("creative skill definition version conflict"); }
  const digestOwner = session.db.prepare("SELECT skill_id,skill_version FROM creative_skill_definitions WHERE project_id = ? AND definition_digest = ?").get(projectId, definition.definition_digest);
  if (digestOwner) throw new Error("creative skill definition digest is already bound");
  const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE");
  try {
    const object = storeCanonicalJsonInTransaction(session, projectId, definition, { object_ref_id: `${projectId}:creative-skill-definition:${definition.skill_id}:v${definition.skill_version}`, object_type: "creative_skill_definition", version: definition.skill_version, relation_key: definition.skill_id }, now);
    session.db.prepare("INSERT INTO creative_skill_definitions(project_id,skill_id,skill_version,lifecycle_status,definition_digest,object_hash,trust_status,license_status,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(projectId, definition.skill_id, definition.skill_version, definition.status, definition.definition_digest, object.object_hash, definition.governance.trust_status, definition.governance.license_status, now);
    session.db.prepare("INSERT INTO creative_skill_definition_controls(project_id,skill_id,skill_version,availability,reason,updated_at) VALUES (?, ?, ?, 'active', 'pinned from current trusted built-in catalog', ?)").run(projectId, definition.skill_id, definition.skill_version, now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'creative.skill-definition.registered', ?, ?)").run(projectId, json({ skill_id: definition.skill_id, skill_version: definition.skill_version, definition_digest: definition.definition_digest, object_hash: object.object_hash }), now);
    session.db.exec("COMMIT"); return readCreativeSkillDefinition(session, projectId, definition.skill_id, definition.skill_version);
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

export function readSkillEvaluation(session, projectId, evaluationId, objectVersion = null) { const row = objectVersion === null ? session.db.prepare("SELECT * FROM skill_evaluations WHERE project_id = ? AND evaluation_id = ? ORDER BY object_version DESC LIMIT 1").get(projectId, evaluationId) : session.db.prepare("SELECT * FROM skill_evaluations WHERE project_id = ? AND evaluation_id = ? AND object_version = ?").get(projectId, evaluationId, objectVersion); return creativeContextRow(session, row); }
export function readSkillEvaluationByInput(session, projectId, inputFingerprint) { return creativeContextRow(session, session.db.prepare("SELECT * FROM skill_evaluations WHERE project_id = ? AND input_fingerprint = ?").get(projectId, inputFingerprint)); }
export function listSkillEvaluations(session, projectId) { return session.db.prepare("SELECT * FROM skill_evaluations WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => creativeContextRow(session, row)); }
export function registerSkillEvaluation(session, projectId, evaluation) {
  const payload = canonicalStorageJson(evaluation); const objectHash = createHash("sha256").update(payload).digest("hex");
  const byInput = readSkillEvaluationByInput(session, projectId, evaluation.input_fingerprint);
  if (byInput) { if (byInput.object_hash === objectHash) return byInput; throw new Error("skill evaluation input fingerprint conflict"); }
  const existing = readSkillEvaluation(session, projectId, evaluation.evaluation_id, evaluation.object_version);
  if (existing) { if (existing.object_hash === objectHash) return existing; throw new Error("skill evaluation version conflict"); }
  const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE");
  try {
    const object = storeCanonicalJsonInTransaction(session, projectId, evaluation, { object_ref_id: `${projectId}:skill-evaluation:${evaluation.evaluation_id}:v${evaluation.object_version}`, object_type: "skill_evaluation", version: evaluation.object_version, relation_key: evaluation.evaluation_id }, now);
    session.db.prepare("INSERT INTO skill_evaluations(project_id,evaluation_id,object_version,lifecycle_status,object_hash,input_fingerprint,skill_id,skill_version,definition_digest,contract_id,contract_version,contract_digest,material_pack_id,material_pack_version,material_pack_digest,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(projectId, evaluation.evaluation_id, evaluation.object_version, evaluation.result, object.object_hash, evaluation.input_fingerprint, evaluation.definition_ref.object_id, evaluation.definition_ref.object_version, evaluation.definition_ref.digest, evaluation.contract_ref.object_id, evaluation.contract_ref.object_version, evaluation.contract_ref.digest, evaluation.material_pack_ref.object_id, evaluation.material_pack_ref.object_version, evaluation.material_pack_ref.digest, now);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'creative.skill-evaluation.registered', ?, ?)").run(projectId, json({ evaluation_id: evaluation.evaluation_id, object_version: evaluation.object_version, result: evaluation.result, input_fingerprint: evaluation.input_fingerprint, object_hash: object.object_hash }), now);
    session.db.exec("COMMIT"); return readSkillEvaluation(session, projectId, evaluation.evaluation_id, evaluation.object_version);
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}
export function readDurationBlueprint(session, projectId, blueprintId, blueprintVersion) { return creativeContextRow(session, session.db.prepare("SELECT * FROM duration_blueprints WHERE project_id = ? AND blueprint_id = ? AND blueprint_version = ?").get(projectId, blueprintId, blueprintVersion)); }
export function listDurationBlueprints(session, projectId) { return session.db.prepare("SELECT * FROM duration_blueprints WHERE project_id = ? ORDER BY blueprint_id,blueprint_version").all(projectId).map((row) => creativeContextRow(session, row)); }
export function registerDurationBlueprint(session, projectId, blueprint) {
  const payload = canonicalStorageJson(blueprint), objectHash = createHash("sha256").update(payload).digest("hex"), existing = readDurationBlueprint(session, projectId, blueprint.blueprint_id, blueprint.blueprint_version);
  if (existing) { if (existing.object_hash === objectHash && existing.definition_digest === blueprint.definition_digest) return existing; throw new Error("duration blueprint version conflict"); }
  const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE");
  try { const object = storeCanonicalJsonInTransaction(session, projectId, blueprint, { object_ref_id: `${projectId}:duration-blueprint:${blueprint.blueprint_id}:v${blueprint.blueprint_version}`, object_type: "duration_blueprint", version: blueprint.blueprint_version, relation_key: blueprint.blueprint_id }, now); session.db.prepare("INSERT INTO duration_blueprints(project_id,blueprint_id,blueprint_version,lifecycle_status,definition_digest,object_hash,created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(projectId, blueprint.blueprint_id, blueprint.blueprint_version, blueprint.status, blueprint.definition_digest, object.object_hash, now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'duration.blueprint.registered', ?, ?)").run(projectId, json({ blueprint_id: blueprint.blueprint_id, blueprint_version: blueprint.blueprint_version, definition_digest: blueprint.definition_digest }), now); session.db.exec("COMMIT"); return readDurationBlueprint(session, projectId, blueprint.blueprint_id, blueprint.blueprint_version); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}
export function readDurationFeasibility(session, projectId, feasibilityId) { return creativeContextRow(session, session.db.prepare("SELECT * FROM duration_feasibilities WHERE project_id = ? AND feasibility_id = ? AND object_version = 1").get(projectId, feasibilityId)); }
export function readDurationFeasibilityByInput(session, projectId, inputFingerprint) { return creativeContextRow(session, session.db.prepare("SELECT * FROM duration_feasibilities WHERE project_id = ? AND input_fingerprint = ?").get(projectId, inputFingerprint)); }
export function listDurationFeasibilities(session, projectId) { return session.db.prepare("SELECT * FROM duration_feasibilities WHERE project_id = ? ORDER BY created_at").all(projectId).map((row) => creativeContextRow(session, row)); }
export function registerDurationFeasibility(session, projectId, value) {
  const payload = canonicalStorageJson(value), objectHash = createHash("sha256").update(payload).digest("hex"), byInput = readDurationFeasibilityByInput(session, projectId, value.input_fingerprint);
  if (byInput) { if (byInput.object_hash === objectHash) return byInput; throw new Error("duration feasibility input fingerprint conflict"); }
  const existing = readDurationFeasibility(session, projectId, value.feasibility_id); if (existing) { if (existing.object_hash === objectHash) return existing; throw new Error("duration feasibility id conflict"); }
  const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE");
  try { const object = storeCanonicalJsonInTransaction(session, projectId, value, { object_ref_id: `${projectId}:duration-feasibility:${value.feasibility_id}:v1`, object_type: "duration_feasibility", version: 1, relation_key: value.feasibility_id }, now); session.db.prepare("INSERT INTO duration_feasibilities(project_id,feasibility_id,object_version,lifecycle_status,object_hash,input_fingerprint,blueprint_id,blueprint_version,blueprint_digest,contract_id,contract_version,contract_digest,material_pack_id,material_pack_version,material_pack_digest,created_at) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(projectId, value.feasibility_id, value.result, object.object_hash, value.input_fingerprint, value.blueprint_ref.object_id, value.blueprint_ref.object_version, value.blueprint_ref.digest, value.contract_ref.object_id, value.contract_ref.object_version, value.contract_ref.digest, value.material_pack_ref.object_id, value.material_pack_ref.object_version, value.material_pack_ref.digest, now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'duration.feasibility.registered', ?, ?)").run(projectId, json({ feasibility_id: value.feasibility_id, result: value.result, input_fingerprint: value.input_fingerprint }), now); session.db.exec("COMMIT"); return readDurationFeasibility(session, projectId, value.feasibility_id); } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

const EDITORIAL_ARTIFACT_TYPES = new Set(["direction_card", "story_proposal_v2", "approved_story_plan_v2", "decision_record", "editorial_edit_intent", "capability_snapshot"]);
function editorialArtifactSpec(artifactType, value) {
  if (!EDITORIAL_ARTIFACT_TYPES.has(artifactType) || !value || typeof value !== "object" || !Number.isInteger(value.object_version) || value.object_version < 1) throw new Error("editorial artifact is invalid");
  const add = (edges, edgeKind, references, targetType) => { for (const [index, reference] of references.entries()) { if (!reference?.object_id || !Number.isInteger(reference.object_version) || reference.object_version < 1 || !/^[0-9a-f]{64}$/.test(reference.digest)) throw new Error(`editorial artifact ${edgeKind} reference is invalid`); edges.push({ edge_kind: edgeKind, edge_ordinal: index, target_id: reference.object_id, target_version: reference.object_version, target_digest: reference.digest, target_type: targetType }); } };
  const edges = []; let artifactId; let lifecycleStatus; let inputFingerprint = value.input_fingerprint ?? null;
  if (artifactType === "direction_card") { if (value.schema_version !== 1) throw new Error("direction card schema is invalid"); artifactId = value.direction_id; lifecycleStatus = value.status; add(edges, "contract", [value.contract_ref], "creative_contract"); add(edges, "material_pack", [value.material_pack_ref], "material_pack"); add(edges, "skill_evaluation", value.skill_evaluation_refs ?? [], "skill_evaluation"); add(edges, "duration_feasibility", [value.duration_feasibility_ref], "duration_feasibility"); add(edges, "alternative_direction", value.alternatives ?? [], "direction_card"); add(edges, "selection_decision", value.selection_decision_ref ? [value.selection_decision_ref] : [], "decision_record"); }
  else if (artifactType === "story_proposal_v2") { if (value.schema_version !== 2) throw new Error("story proposal schema is invalid"); artifactId = value.proposal_id; lifecycleStatus = value.status; add(edges, "direction", [value.direction_ref], "direction_card"); add(edges, "contract", [value.contract_ref], "creative_contract"); add(edges, "material_pack", [value.material_pack_ref], "material_pack"); add(edges, "skill_evaluation", value.skill_evaluation_refs ?? [], "skill_evaluation"); add(edges, "duration_feasibility", [value.duration_feasibility_ref], "duration_feasibility"); add(edges, "alternative_story", value.alternatives ?? [], "story_proposal_v2"); add(edges, "evidence", (value.beats ?? []).flatMap((beat) => beat.evidence_refs ?? []), "evidence"); }
  else if (artifactType === "approved_story_plan_v2") { if (value.schema_version !== 2) throw new Error("approved Story Plan schema is invalid"); artifactId = value.plan_id; lifecycleStatus = value.status; inputFingerprint = null; add(edges, "proposal", [value.proposal_ref], "story_proposal_v2"); add(edges, "direction", [value.direction_ref], "direction_card"); add(edges, "contract", [value.contract_ref], "creative_contract"); add(edges, "material_pack", [value.material_pack_ref], "material_pack"); add(edges, "duration_feasibility", [value.duration_feasibility_ref], "duration_feasibility"); add(edges, "decision", [value.decision_ref], "decision_record"); add(edges, "evidence", (value.beats ?? []).flatMap((beat) => beat.evidence_refs ?? []), "evidence"); }
  else if (artifactType === "decision_record") { if (value.schema_version !== 1) throw new Error("Decision Record schema is invalid"); artifactId = value.decision_id; lifecycleStatus = value.status; inputFingerprint = null; const candidateType = value.decision_type === "direction_selection" ? "direction_card" : "story_proposal_v2"; add(edges, "subject", [value.subject_ref], "creative_contract"); add(edges, "candidate", value.candidate_refs ?? [], candidateType); add(edges, "selected", value.selected_refs ?? [], candidateType); add(edges, "rejected", value.rejected_refs ?? [], candidateType); const decisionEvidence = value.evidence_refs ?? []; if (decisionEvidence.length !== 2) throw new Error("Decision Record evidence refs are incomplete"); add(edges, "material_pack", [decisionEvidence[0]], "material_pack"); add(edges, "duration_feasibility", [decisionEvidence[1]], "duration_feasibility"); add(edges, "supersedes", value.supersedes_ref ? [value.supersedes_ref] : [], "decision_record"); }
  else if (artifactType === "editorial_edit_intent") { if (value.schema_version !== 1) throw new Error("Editorial Edit Intent schema is invalid"); artifactId = value.intent_id; lifecycleStatus = value.status; add(edges, "approved_story", [value.approved_story_ref], "approved_story_plan_v2"); add(edges, "decision", value.decision_refs ?? [], "decision_record"); add(edges, "evidence", value.evidence_refs ?? [], "evidence"); add(edges, "contract", [value.contract_ref], "creative_contract"); add(edges, "capability_snapshot", [value.capability_snapshot_ref], "capability_snapshot"); add(edges, "feedback_diagnosis", value.feedback_diagnosis_ref ? [value.feedback_diagnosis_ref] : [], "feedback_diagnosis"); }
  else { if (value.schema_version !== 1 || !Array.isArray(value.capabilities) || value.capabilities.some((capability) => typeof capability !== "string" || !capability)) throw new Error("capability snapshot is invalid"); artifactId = value.snapshot_id; lifecycleStatus = "approved"; inputFingerprint = value.input_fingerprint; }
  if (typeof artifactId !== "string" || !artifactId || typeof lifecycleStatus !== "string" || inputFingerprint !== null && !/^[0-9a-f]{64}$/.test(inputFingerprint)) throw new Error("editorial artifact identity is invalid");
  return { artifactId, lifecycleStatus, inputFingerprint, edges };
}
function assertEditorialEdgeTargets(session, projectId, prepared) {
  const pending = new Map(prepared.map((record) => [`${record.artifact_type}:${record.spec.artifactId}:v${record.value.object_version}`, record.objectHash]));
  for (const record of prepared) for (const edge of record.spec.edges) {
    let target = null;
    if (EDITORIAL_ARTIFACT_TYPES.has(edge.target_type)) target = pending.get(`${edge.target_type}:${edge.target_id}:v${edge.target_version}`) ?? readEditorialArtifact(session, projectId, edge.target_type, edge.target_id, edge.target_version)?.object_hash;
    else if (edge.target_type === "creative_contract") target = readCreativeContractVersion(session, projectId, edge.target_id, edge.target_version)?.object_hash;
    else if (edge.target_type === "material_pack") target = readMaterialEvidencePack(session, projectId, edge.target_id, edge.target_version)?.object_hash;
    else if (edge.target_type === "skill_evaluation") target = readSkillEvaluation(session, projectId, edge.target_id, edge.target_version)?.object_hash;
    else if (edge.target_type === "duration_feasibility") { const row = readDurationFeasibility(session, projectId, edge.target_id); target = row?.value?.object_version === edge.target_version ? row.object_hash : null; }
    else if (edge.target_type === "evidence") { const row = readEvidenceObject(session, edge.target_id); target = row?.value?.evidence_version === edge.target_version ? row.object_hash : null; }
    else if (edge.target_type === "feedback_diagnosis") target = readFeedbackDiagnosis(session, projectId, edge.target_id, edge.target_version)?.object_hash;
    if (target !== edge.target_digest) throw new Error(`editorial artifact ${edge.edge_kind} target is missing or rebound`);
  }
}
export function readEditorialArtifact(session, projectId, artifactType, artifactId, objectVersion = 1) { return creativeContextRow(session, session.db.prepare("SELECT * FROM editorial_artifacts WHERE project_id = ? AND artifact_type = ? AND artifact_id = ? AND object_version = ?").get(projectId, artifactType, artifactId, objectVersion)); }
export function readEditorialArtifactByInput(session, projectId, artifactType, inputFingerprint) { return creativeContextRow(session, session.db.prepare("SELECT * FROM editorial_artifacts WHERE project_id = ? AND artifact_type = ? AND input_fingerprint = ?").get(projectId, artifactType, inputFingerprint)); }
export function listEditorialArtifacts(session, projectId, artifactType) { if (!EDITORIAL_ARTIFACT_TYPES.has(artifactType)) throw new Error("editorial artifact type is invalid"); return session.db.prepare("SELECT * FROM editorial_artifacts WHERE project_id = ? AND artifact_type = ? ORDER BY created_at,artifact_id").all(projectId, artifactType).map((row) => creativeContextRow(session, row)); }
export function listEditorialArtifactEdges(session, projectId, artifactType, artifactId, objectVersion = 1) { return session.db.prepare("SELECT edge_kind,edge_ordinal,target_id,target_version,target_digest FROM editorial_artifact_edges WHERE project_id = ? AND artifact_type = ? AND artifact_id = ? AND object_version = ? ORDER BY edge_kind,edge_ordinal").all(projectId, artifactType, artifactId, objectVersion); }
export function readCoverageMatrix(session, projectId, reference) {
  if (!reference?.object_id || !Number.isInteger(reference.object_version) || !/^[0-9a-f]{64}$/.test(reference.digest)) throw new Error("coverage matrix reference is invalid");
  const row = session.db.prepare("SELECT object_hash FROM object_refs WHERE project_id = ? AND object_type = 'coverage_matrix' AND relation_key = ? AND version = ? AND object_hash = ?").get(projectId, reference.object_id, reference.object_version, reference.digest);
  return row ? JSON.parse(readObjectSync(session.projectDirectory, row.object_hash).toString("utf8")) : null;
}
export function registerEditorialArtifact(session, projectId, artifactType, value) {
  const spec = editorialArtifactSpec(artifactType, value), payload = canonicalStorageJson(value), objectHash = createHash("sha256").update(payload).digest("hex");
  if (spec.inputFingerprint) { const byInput = readEditorialArtifactByInput(session, projectId, artifactType, spec.inputFingerprint); if (byInput) { if (byInput.object_hash === objectHash) return byInput; throw new Error(`${artifactType} input fingerprint conflict`); } }
  const existing = readEditorialArtifact(session, projectId, artifactType, spec.artifactId, value.object_version); if (existing) { if (existing.object_hash === objectHash) return existing; throw new Error(`${artifactType} version conflict`); }
  assertEditorialEdgeTargets(session, projectId, [{ artifact_type: artifactType, value, spec, objectHash }]);
  const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE");
  try {
    const object = storeCanonicalJsonInTransaction(session, projectId, value, { object_ref_id: `${projectId}:editorial:${artifactType}:${spec.artifactId}:v${value.object_version}`, object_type: artifactType, version: value.object_version, relation_key: spec.artifactId }, now);
    session.db.prepare("INSERT INTO editorial_artifacts(project_id,artifact_type,artifact_id,object_version,lifecycle_status,object_hash,input_fingerprint,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(projectId, artifactType, spec.artifactId, value.object_version, spec.lifecycleStatus, object.object_hash, spec.inputFingerprint, now);
    const insertEdge = session.db.prepare("INSERT INTO editorial_artifact_edges(project_id,artifact_type,artifact_id,object_version,edge_kind,edge_ordinal,target_id,target_version,target_digest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (const edge of spec.edges) insertEdge.run(projectId, artifactType, spec.artifactId, value.object_version, edge.edge_kind, edge.edge_ordinal, edge.target_id, edge.target_version, edge.target_digest);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'editorial.artifact.registered', ?, ?)").run(projectId, json({ artifact_type: artifactType, artifact_id: spec.artifactId, object_version: value.object_version, lifecycle_status: spec.lifecycleStatus, object_hash: object.object_hash, input_fingerprint: spec.inputFingerprint }), now);
    session.db.exec("COMMIT"); return readEditorialArtifact(session, projectId, artifactType, spec.artifactId, value.object_version);
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}
export function registerEditorialArtifactBatch(session, projectId, records) {
  if (!Array.isArray(records) || records.length < 2) throw new Error("editorial artifact batch requires multiple records");
  const prepared = records.map((record) => { const spec = editorialArtifactSpec(record.artifact_type, record.value), payload = canonicalStorageJson(record.value), objectHash = createHash("sha256").update(payload).digest("hex"); return { ...record, spec, objectHash }; });
  const identities = prepared.map((record) => `${record.artifact_type}:${record.spec.artifactId}:v${record.value.object_version}`); if (new Set(identities).size !== identities.length) throw new Error("editorial artifact batch contains duplicate identities");
  for (const record of prepared) {
    if (record.spec.inputFingerprint) { const byInput = readEditorialArtifactByInput(session, projectId, record.artifact_type, record.spec.inputFingerprint); if (byInput && byInput.object_hash !== record.objectHash) throw new Error(`${record.artifact_type} input fingerprint conflict`); }
    const existing = readEditorialArtifact(session, projectId, record.artifact_type, record.spec.artifactId, record.value.object_version); if (existing && existing.object_hash !== record.objectHash) throw new Error(`${record.artifact_type} version conflict`);
  }
  assertEditorialEdgeTargets(session, projectId, prepared);
  const missing = prepared.filter((record) => !readEditorialArtifact(session, projectId, record.artifact_type, record.spec.artifactId, record.value.object_version));
  if (!missing.length) return prepared.map((record) => readEditorialArtifact(session, projectId, record.artifact_type, record.spec.artifactId, record.value.object_version));
  const now = new Date().toISOString(); session.db.exec("BEGIN IMMEDIATE");
  try {
    const insertArtifact = session.db.prepare("INSERT INTO editorial_artifacts(project_id,artifact_type,artifact_id,object_version,lifecycle_status,object_hash,input_fingerprint,created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const insertEdge = session.db.prepare("INSERT INTO editorial_artifact_edges(project_id,artifact_type,artifact_id,object_version,edge_kind,edge_ordinal,target_id,target_version,target_digest) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (const record of missing) {
      const object = storeCanonicalJsonInTransaction(session, projectId, record.value, { object_ref_id: `${projectId}:editorial:${record.artifact_type}:${record.spec.artifactId}:v${record.value.object_version}`, object_type: record.artifact_type, version: record.value.object_version, relation_key: record.spec.artifactId }, now);
      insertArtifact.run(projectId, record.artifact_type, record.spec.artifactId, record.value.object_version, record.spec.lifecycleStatus, object.object_hash, record.spec.inputFingerprint, now);
      for (const edge of record.spec.edges) insertEdge.run(projectId, record.artifact_type, record.spec.artifactId, record.value.object_version, edge.edge_kind, edge.edge_ordinal, edge.target_id, edge.target_version, edge.target_digest);
      session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'editorial.artifact.registered', ?, ?)").run(projectId, json({ artifact_type: record.artifact_type, artifact_id: record.spec.artifactId, object_version: record.value.object_version, lifecycle_status: record.spec.lifecycleStatus, object_hash: object.object_hash, input_fingerprint: record.spec.inputFingerprint }), now);
    }
    session.db.exec("COMMIT"); return prepared.map((record) => readEditorialArtifact(session, projectId, record.artifact_type, record.spec.artifactId, record.value.object_version));
  } catch (error) { session.db.exec("ROLLBACK"); throw error; }
}

function permissionRow(session, row) { return creativeContextRow(session, row); }
export function readStage2PermissionPolicySnapshot(session, projectId, snapshotId, objectVersion = 1) { return permissionRow(session, session.db.prepare("SELECT * FROM permission_policy_snapshots WHERE project_id = ? AND snapshot_id = ? AND object_version = ?").get(projectId, snapshotId, objectVersion)); }
export function readStage2PermissionDecision(session, projectId, decisionId, objectVersion = 1) { return permissionRow(session, session.db.prepare("SELECT * FROM permission_decisions WHERE project_id = ? AND decision_id = ? AND object_version = ?").get(projectId, decisionId, objectVersion)); }
export function readStage2PermissionDecisionByInput(session, projectId, inputFingerprint) { return permissionRow(session, session.db.prepare("SELECT * FROM permission_decisions WHERE project_id = ? AND input_fingerprint = ?").get(projectId, inputFingerprint)); }
export function listStage2PermissionDecisions(session, projectId) { return session.db.prepare("SELECT * FROM permission_decisions WHERE project_id = ? ORDER BY created_at,decision_id").all(projectId).map((item) => permissionRow(session, item)); }
export function listStage2PermissionDecisionEdges(session, projectId, decisionId, objectVersion = 1) { return session.db.prepare("SELECT edge_kind,edge_ordinal,target_type,target_id,target_version,target_digest FROM permission_decision_edges WHERE project_id = ? AND decision_id = ? AND object_version = ? ORDER BY edge_kind,edge_ordinal").all(projectId, decisionId, objectVersion); }
export function readStage2HumanApproval(session, projectId, approvalId) { const row = session.db.prepare("SELECT approval_json FROM permission_human_approvals WHERE project_id = ? AND approval_id = ?").get(projectId, approvalId); return row ? JSON.parse(row.approval_json) : null; }
export function registerStage2HumanApproval(session, projectId, approval) {
  if (!approval || approval.actor_kind !== "human_user" || !approval.approval_id || !approval.actor_id || !approval.action || !approval.subject_ref || !approval.policy_snapshot_ref || !/^[0-9a-f]{64}$/.test(approval.subject_ref.digest) || !/^[0-9a-f]{64}$/.test(approval.policy_snapshot_ref.digest) || !/^[0-9a-f]{64}$/.test(approval.effect_digest) || approval.review_digest !== approval.effect_digest || !/^[0-9a-f]{64}$/.test(approval.request_fingerprint) || !Number.isFinite(Date.parse(approval.approved_at)) || !Number.isFinite(Date.parse(approval.expires_at)) || Date.parse(approval.approved_at) >= Date.parse(approval.expires_at)) throw new Error("Stage 2 human approval is invalid");
  const payload = canonicalStorageJson(approval), existing = readStage2HumanApproval(session, projectId, approval.approval_id);
  if (existing) { if (canonicalStorageJson(existing) === payload) return existing; throw new Error("Stage 2 human approval conflict"); }
  session.db.prepare("INSERT INTO permission_human_approvals(project_id,approval_id,actor_id,action,subject_type,subject_id,subject_version,subject_digest,policy_snapshot_id,policy_snapshot_version,policy_snapshot_digest,effect_digest,request_fingerprint,approval_json,approved_at,expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(projectId, approval.approval_id, approval.actor_id, approval.action, approval.subject_ref.object_type, approval.subject_ref.object_id, approval.subject_ref.object_version, approval.subject_ref.digest, approval.policy_snapshot_ref.object_id, approval.policy_snapshot_ref.object_version, approval.policy_snapshot_ref.digest, approval.effect_digest, approval.request_fingerprint, payload, approval.approved_at, approval.expires_at);
  return approval;
}

function stage2PermissionRequestFingerprintFromDecision(decision) {
  const payload = { schema_version: 1, actor: decision.actor, action: decision.action, subject_ref: decision.subject_ref, context_refs: [...(decision.context_refs ?? [])].sort((left, right) => `${left.object_type}:${left.object_id}@${left.object_version}#${left.digest}`.localeCompare(`${right.object_type}:${right.object_id}@${right.object_version}#${right.digest}`)), policy_snapshot_ref: decision.policy_snapshot_ref, effect_digest: decision.effect_digest, requested_data_fields: [...(decision.allowed_data_fields ?? [])].sort(), affected_scope: [...(decision.affected_scope ?? [])].sort(), reason: decision.request_reason };
  const semanticFingerprint = createHash("sha256").update(canonicalStorageJson(payload)).digest("hex");
  return decision.approval ? createHash("sha256").update(canonicalStorageJson({ semantic_request_fingerprint: semanticFingerprint, approval_id: decision.approval.approval_id, approved_at: decision.approval.approved_at })).digest("hex") : semanticFingerprint;
}

function stage2PermissionTargetHash(session, projectId, reference) {
  if (reference.object_type === "evidence_object") { const row = readEvidenceObject(session, reference.object_id); return row?.project_id === projectId && Number(row?.value?.evidence_version ?? 1) === reference.object_version ? row.object_hash : null; }
  if (reference.object_type === "creative_contract") return readCreativeContractVersion(session, projectId, reference.object_id, reference.object_version)?.object_hash;
  if (reference.object_type === "material_evidence_pack") return readMaterialEvidencePack(session, projectId, reference.object_id, reference.object_version)?.object_hash;
  if (reference.object_type === "creative_skill_definition") return readCreativeSkillDefinition(session, projectId, reference.object_id, reference.object_version)?.definition_digest;
  if (reference.object_type === "skill_evaluation") return readSkillEvaluation(session, projectId, reference.object_id, reference.object_version)?.object_hash;
  if (reference.object_type === "duration_blueprint") return readDurationBlueprint(session, projectId, reference.object_id, reference.object_version)?.definition_digest;
  if (reference.object_type === "duration_feasibility") { const row = readDurationFeasibility(session, projectId, reference.object_id); return row?.value?.object_version === reference.object_version ? row.object_hash : null; }
  if (reference.object_type === "permission_decision") return readStage2PermissionDecision(session, projectId, reference.object_id, reference.object_version)?.object_hash;
  if (["direction_card", "story_proposal_v2", "approved_story_plan_v2", "decision_record", "editorial_edit_intent", "capability_snapshot"].includes(reference.object_type)) return readEditorialArtifact(session, projectId, reference.object_type, reference.object_id, reference.object_version)?.object_hash;
  if (reference.object_type === "feedback_diagnosis") return readFeedbackDiagnosis(session, projectId, reference.object_id, reference.object_version)?.object_hash;
  if (reference.object_type === "intelligence_edit_execution") return reference.object_version === 1 ? readIntelligenceEditExecution(session, projectId, reference.object_id)?.object_hash : null;
  return null;
}

export function registerStage2PermissionAuthorization(session, projectId, snapshot, decision) {
  if (!snapshot || snapshot.schema_version !== 1 || snapshot.status !== "approved" || snapshot.object_version !== 3 || !snapshot.snapshot_id || !snapshot.policy_version || !/^[0-9a-f]{64}$/.test(snapshot.input_fingerprint) || !decision || decision.schema_version !== 1 || decision.object_version !== 1 || decision.status !== "approved" || !["allowed_autonomous", "exact_human_approved"].includes(decision.classification) || !decision.decision_id || !/^[0-9a-f]{64}$/.test(decision.input_fingerprint)) throw new Error("Stage 2 permission authorization is invalid");
  const snapshotPayload = canonicalStorageJson(snapshot), snapshotHash = createHash("sha256").update(snapshotPayload).digest("hex"), decisionPayload = canonicalStorageJson(decision), decisionHash = createHash("sha256").update(decisionPayload).digest("hex");
  const { input_fingerprint: _snapshotFingerprint, ...snapshotBase } = snapshot;
  const policyRow = snapshot.rows?.find((row) => row.action === decision.action), contextTypes = (decision.context_refs ?? []).map((reference) => reference.object_type), autonomous = policyRow?.allowed_autonomous_actor_kinds?.includes(decision.actor?.actor_kind), human = policyRow?.exact_approval_actor_kinds?.includes(decision.actor?.actor_kind);
  const semanticRequestFingerprint = createHash("sha256").update(canonicalStorageJson({ schema_version: 1, actor: decision.actor, action: decision.action, subject_ref: decision.subject_ref, context_refs: [...(decision.context_refs ?? [])].sort((left, right) => `${left.object_type}:${left.object_id}@${left.object_version}#${left.digest}`.localeCompare(`${right.object_type}:${right.object_id}@${right.object_version}#${right.digest}`)), policy_snapshot_ref: decision.policy_snapshot_ref, effect_digest: decision.effect_digest, requested_data_fields: [...(decision.allowed_data_fields ?? [])].sort(), affected_scope: [...(decision.affected_scope ?? [])].sort(), reason: decision.request_reason })).digest("hex");
  if (snapshot.input_fingerprint !== createHash("sha256").update(canonicalStorageJson(snapshotBase)).digest("hex") || snapshot.snapshot_id !== "stage2-permission-policy" || snapshot.provenance?.producer !== "project-host" || snapshot.provenance?.source_version !== "permission-enforcement-v3" || !policyRow || !policyRow.subject_types.includes(decision.subject_ref?.object_type) || policyRow.required_context_types.some((type) => !contextTypes.includes(type)) || contextTypes.some((type) => !policyRow.allowed_context_types.includes(type)) || decision.allowed_data_fields.some((field) => !policyRow.allowed_data_fields.includes(field)) || decision.failure_result !== policyRow.failure_result || decision.reason_code !== policyRow.reason_code || decision.input_fingerprint !== stage2PermissionRequestFingerprintFromDecision(decision) || !/^[0-9a-f]{64}$/.test(decision.effect_digest) || (decision.classification === "allowed_autonomous" && (!autonomous || decision.approval || decision.approval_requirement !== "none")) || (decision.classification === "exact_human_approved" && (!human || decision.approval_requirement !== "exact_human" || !decision.approval || decision.approval.actor_kind !== "human_user" || decision.approval.request_fingerprint !== semanticRequestFingerprint || decision.approval.effect_digest !== decision.effect_digest || decision.approval.review_digest !== decision.effect_digest || decision.approval.policy_snapshot_ref.digest !== decision.policy_snapshot_ref.digest))) throw new Error("Stage 2 permission authorization is internally inconsistent");
  if (snapshotHash !== "334fad69d42d32f90a0e70c7d64d2abb06f8cb4e6f1682f06f7a56f4ba790eb9" || snapshot.input_fingerprint !== "da5e6f6473a38bfd8df2dbb6414faf5fa37c8ca100dbdf964b6a1b29d900e048" || snapshot.policy_version !== "stage2-permission-policy-v3" || snapshot.rows.length !== 28) throw new Error("Stage 2 permission policy is not the pinned built-in snapshot");
  if (decision.classification === "exact_human_approved") {
    const approval = decision.approval, refKey = (reference) => `${reference.object_type}:${reference.object_id}@${reference.object_version}#${reference.digest}`, storedApproval = approval ? readStage2HumanApproval(session, projectId, approval.approval_id) : null;
    const storedEmbeddedApproval = storedApproval ? (({ action: _action, ...embedded }) => embedded)(storedApproval) : null;
    if (!approval || !storedApproval || storedApproval.action !== decision.action || canonicalStorageJson(storedEmbeddedApproval) !== canonicalStorageJson(approval) || approval.actor_id !== decision.actor.actor_id || approval.actor_kind !== decision.actor.actor_kind || canonicalStorageJson(approval.subject_ref) !== canonicalStorageJson(decision.subject_ref) || canonicalStorageJson([...approval.context_refs].sort((left, right) => refKey(left).localeCompare(refKey(right)))) !== canonicalStorageJson([...decision.context_refs].sort((left, right) => refKey(left).localeCompare(refKey(right)))) || canonicalStorageJson([...approval.affected_scope].sort()) !== canonicalStorageJson([...decision.affected_scope].sort()) || canonicalStorageJson(approval.policy_snapshot_ref) !== canonicalStorageJson(decision.policy_snapshot_ref)) throw new Error("Stage 2 permission embedded approval is missing or rebound");
  }
  if (decision.policy_snapshot_ref.object_id !== snapshot.snapshot_id || decision.policy_snapshot_ref.object_version !== snapshot.object_version || decision.policy_snapshot_ref.digest !== snapshotHash) throw new Error("Stage 2 permission policy snapshot is rebound");
  const refs = [decision.subject_ref, ...(decision.context_refs ?? [])];
  if (refs.some((reference) => stage2PermissionTargetHash(session, projectId, reference) !== reference.digest)) throw new Error("Stage 2 permission target is missing or rebound");
  const existingSnapshot = readStage2PermissionPolicySnapshot(session, projectId, snapshot.snapshot_id, snapshot.object_version); if (existingSnapshot && existingSnapshot.object_hash !== snapshotHash) throw new Error("Stage 2 permission policy snapshot conflict");
  const policyVersionOwner = session.db.prepare("SELECT snapshot_id,object_version,object_hash FROM permission_policy_snapshots WHERE project_id = ? AND policy_version = ?").get(projectId, snapshot.policy_version); if (policyVersionOwner && (policyVersionOwner.snapshot_id !== snapshot.snapshot_id || policyVersionOwner.object_version !== snapshot.object_version || policyVersionOwner.object_hash !== snapshotHash)) throw new Error("Stage 2 permission policy version conflict");
  const byInput = readStage2PermissionDecisionByInput(session, projectId, decision.input_fingerprint); if (byInput) { if (byInput.object_hash === decisionHash && existingSnapshot?.object_hash === snapshotHash) return byInput; throw new Error("Stage 2 permission input fingerprint conflict"); }
  const existingDecision = readStage2PermissionDecision(session, projectId, decision.decision_id, decision.object_version); if (existingDecision) { if (existingDecision.object_hash === decisionHash && existingSnapshot?.object_hash === snapshotHash) return existingDecision; throw new Error("Stage 2 permission decision conflict"); }
  const now = new Date().toISOString(), snapshotPath = resolve(session.projectDirectory, "objects", "sha256", snapshotHash.slice(0, 2), snapshotHash), decisionPath = resolve(session.projectDirectory, "objects", "sha256", decisionHash.slice(0, 2), decisionHash), snapshotExisted = existsSync(snapshotPath), decisionExisted = existsSync(decisionPath); session.db.exec("BEGIN IMMEDIATE");
  try {
    if (!existingSnapshot) {
      const object = storeCanonicalJsonInTransaction(session, projectId, snapshot, { object_ref_id: `${projectId}:permission-policy:${snapshot.snapshot_id}:v${snapshot.object_version}`, object_type: "permission_policy_snapshot", version: snapshot.object_version, relation_key: snapshot.snapshot_id }, now);
      session.db.prepare("INSERT INTO permission_policy_snapshots(project_id,snapshot_id,object_version,policy_version,lifecycle_status,object_hash,input_fingerprint,created_at) VALUES (?, ?, ?, ?, 'approved', ?, ?, ?)").run(projectId, snapshot.snapshot_id, snapshot.object_version, snapshot.policy_version, object.object_hash, snapshot.input_fingerprint, now);
      session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'permission.policy_snapshot.registered', ?, ?)").run(projectId, json({ snapshot_id: snapshot.snapshot_id, object_version: snapshot.object_version, object_hash: object.object_hash }), now);
    }
    const object = storeCanonicalJsonInTransaction(session, projectId, decision, { object_ref_id: `${projectId}:permission-decision:${decision.decision_id}:v1`, object_type: "permission_decision", version: 1, relation_key: decision.decision_id }, now);
    session.db.prepare("INSERT INTO permission_decisions(project_id,decision_id,object_version,lifecycle_status,classification,action,actor_id,actor_kind,subject_type,subject_id,subject_version,subject_digest,policy_snapshot_id,policy_snapshot_version,policy_snapshot_digest,object_hash,input_fingerprint,created_at) VALUES (?, ?, 1, 'approved', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(projectId, decision.decision_id, decision.classification, decision.action, decision.actor.actor_id, decision.actor.actor_kind, decision.subject_ref.object_type, decision.subject_ref.object_id, decision.subject_ref.object_version, decision.subject_ref.digest, decision.policy_snapshot_ref.object_id, decision.policy_snapshot_ref.object_version, decision.policy_snapshot_ref.digest, object.object_hash, decision.input_fingerprint, now);
    const insertEdge = session.db.prepare("INSERT INTO permission_decision_edges(project_id,decision_id,object_version,edge_kind,edge_ordinal,target_type,target_id,target_version,target_digest) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?)");
    insertEdge.run(projectId, decision.decision_id, "policy_snapshot", 0, "permission_policy_snapshot", snapshot.snapshot_id, snapshot.object_version, snapshotHash);
    insertEdge.run(projectId, decision.decision_id, "subject", 0, decision.subject_ref.object_type, decision.subject_ref.object_id, decision.subject_ref.object_version, decision.subject_ref.digest);
    for (const [index, reference] of (decision.context_refs ?? []).entries()) insertEdge.run(projectId, decision.decision_id, "context", index, reference.object_type, reference.object_id, reference.object_version, reference.digest);
    session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, 'permission.decision.registered', ?, ?)").run(projectId, json({ decision_id: decision.decision_id, action: decision.action, classification: decision.classification, object_hash: object.object_hash, input_fingerprint: decision.input_fingerprint }), now);
    session.db.exec("COMMIT"); return readStage2PermissionDecision(session, projectId, decision.decision_id, 1);
  } catch (error) { session.db.exec("ROLLBACK"); for (const [path, hash, existed] of [[snapshotPath, snapshotHash, snapshotExisted], [decisionPath, decisionHash, decisionExisted]]) if (!existed && !session.db.prepare("SELECT 1 FROM object_refs WHERE object_hash = ?").get(hash)) rmSync(path, { force: true }); throw error; }
}
export function registerReviewArtifact(session, projectId, artifact) { session.db.exec("BEGIN IMMEDIATE"); try { const now = new Date().toISOString(); const object = storeJsonInTransaction(session, projectId, artifact.value, { object_ref_id: `${projectId}:review:${artifact.artifact_id}`, object_type: "review_artifact", relation_key: artifact.artifact_id }, now); session.db.prepare("INSERT INTO review_artifacts(artifact_id,project_id,artifact_type,artifact_json,created_at) VALUES (?, ?, ?, ?, ?)").run(artifact.artifact_id, projectId, artifact.artifact_type, JSON.stringify({ object_hash: object.object_hash }), now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `review.${artifact.artifact_type}.registered`, json({ artifact_id: artifact.artifact_id, object_hash: object.object_hash }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
function currentObjectPayload(session, stored, label) { if (!stored || typeof stored.object_hash !== "string" || !stored.object_hash) throw new Error(`current ${label} object reference is missing`); return JSON.parse(readObjectSync(session.projectDirectory, stored.object_hash).toString("utf8")); }
export function readReviewArtifact(session, artifactId) { const row = session.db.prepare("SELECT artifact_type, artifact_json FROM review_artifacts WHERE artifact_id = ?").get(artifactId); if (!row) return null; const stored = JSON.parse(row.artifact_json); return { artifact_type: row.artifact_type, value: currentObjectPayload(session, stored, "review artifact") }; }
export function listReviewArtifacts(session, projectId) { return session.db.prepare("SELECT artifact_id, artifact_type, artifact_json, created_at FROM review_artifacts WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => { const stored = JSON.parse(row.artifact_json); return { artifact_id: row.artifact_id, artifact_type: row.artifact_type, value: currentObjectPayload(session, stored, "review artifact"), created_at: row.created_at }; }); }
export function listRenderManifests(session, projectId) { return session.db.prepare("SELECT relation_key, object_type, object_hash, created_at FROM object_refs WHERE project_id = ? AND object_type IN ('render_execution_plan', 'render_output_manifest', 'render_blocker_manifest') ORDER BY created_at ASC").all(projectId).map((row) => ({ manifest_id: row.relation_key, manifest_type: row.object_type.replace(/^render_/, ""), value: JSON.parse(readObjectSync(session.projectDirectory, row.object_hash).toString("utf8")), created_at: row.created_at })); }
export function registerReactionTiming(session, projectId, reaction) { const json = JSON.stringify(reaction, (_, value) => typeof value === "bigint" ? `${value}n` : value); session.db.exec("BEGIN IMMEDIATE"); try { session.db.prepare("INSERT INTO reaction_timings(reaction_id,project_id,compare_id,timeline_pts,reaction_json,created_at) VALUES (?, ?, ?, ?, ?, ?)").run(reaction.reaction_id, projectId, reaction.compare_id, reaction.timeline_pts, json, new Date().toISOString()); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, "review.reaction_timing.registered", json, new Date().toISOString()); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readReactionTiming(session, reactionId) { const row = session.db.prepare("SELECT reaction_json FROM reaction_timings WHERE reaction_id = ?").get(reactionId); return row ? JSON.parse(row.reaction_json) : null; }
export function registerDeliveryRecord(session, projectId, record) { session.db.exec("BEGIN IMMEDIATE"); try { const now = new Date().toISOString(); const object = storeJsonInTransaction(session, projectId, record.value, { object_ref_id: `${projectId}:delivery:${record.record_id}`, object_type: record.record_type === "privacy" ? "privacy_ledger" : record.record_type === "rights" ? "rights_ledger" : "delivery_record", relation_key: record.record_id }, now); session.db.prepare("INSERT INTO delivery_records(record_id,project_id,record_type,record_json,created_at) VALUES (?, ?, ?, ?, ?)").run(record.record_id, projectId, record.record_type, JSON.stringify({ object_hash: object.object_hash }), now); session.db.prepare("INSERT INTO project_events(project_id,event_type,payload_json,created_at) VALUES (?, ?, ?, ?)").run(projectId, `delivery.${record.record_type}.registered`, json({ record_id: record.record_id, object_hash: object.object_hash }), now); session.db.exec("COMMIT"); } catch (error) { session.db.exec("ROLLBACK"); throw error; } }
export function readDeliveryRecord(session, recordId) { const row = session.db.prepare("SELECT record_type, record_json FROM delivery_records WHERE record_id = ?").get(recordId); if (!row) return null; const stored = JSON.parse(row.record_json); return { record_type: row.record_type, value: currentObjectPayload(session, stored, "delivery record") }; }
export function listDeliveryRecords(session, projectId) { return session.db.prepare("SELECT record_id, record_type, record_json, created_at FROM delivery_records WHERE project_id = ? ORDER BY created_at ASC").all(projectId).map((row) => { const stored = JSON.parse(row.record_json); return { record_id: row.record_id, record_type: row.record_type, value: currentObjectPayload(session, stored, "delivery record"), created_at: row.created_at }; }); }
